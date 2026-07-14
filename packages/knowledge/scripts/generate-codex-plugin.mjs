import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

export const PLUGIN_ID = 'mr-djs-dev-suite';
export const PLUGIN_DIRECTORY = path.join('plugins', 'codex');
export const MCP_SERVER_KEY = 'mr-djs-dev-suite';
export const MDS_MCP_SERVER_BIN = 'mds-mcp-server';

export const COMMAND_FILES = [
  'review-expo-project.md',
  'review-motion.md',
  'run-doctor.md',
  'prepare-deploy.md',
  'fix-seo.md',
  'push-merge-loop.md',
  'create-expo-super-stack.md',
  'continue-development.md',
  'project-research-plan.md',
  'wrap-up.md',
];

export const CODEX_WORKFLOW_SKILL_PREFIX = 'workflow-';

const WORKFLOW_SKILL_DESCRIPTIONS = {
  'review-motion.md':
    "Use when the user asks Mr. DJ's Dev Suite to review animation smoothness, diagnose jank, classify motion, or inspect parallax and scroll-linked scenes.",
  'run-doctor.md':
    "Use when the user asks Mr. DJ's Dev Suite to run Doctor, run a health check, run CI checks, diagnose project status, or explain MDS Doctor findings.",
  'continue-development.md':
    "Use when the user asks Mr. DJ's Dev Suite to continue development, pick the next phase task, resume work, or inspect project/todo.md.",
  'push-merge-loop.md':
    "Use when the user asks Mr. DJ's Dev Suite to run the PR iteration loop: doctor, commit, push, poll checks, fix, and merge to test.",
  'wrap-up.md':
    "Use when the user has finished testing and wants Mr. DJ's Dev Suite to run the final wrap-up workflow (Doctor, git inclusion checks, PR loop, CI fix retries, and merge policy guardrails).",
};

export async function generateCodexPluginBundleFromKnowledge(options = {}) {
  const packageRoot = options.packageRoot
    ? path.resolve(options.packageRoot)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = options.repoRoot
    ? path.resolve(options.repoRoot)
    : path.resolve(packageRoot, '..', '..');

  const knowledgeModule = await loadKnowledgeModule(packageRoot);
  const resources = knowledgeModule.listKnowledgeResources('skill');
  const skills = resources
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      description: resource.description,
      resourcePath: normalizePath(resource.resourcePath),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const pluginVersion = await readWorkspaceVersion(repoRoot);

  return generateCodexPluginBundle({
    repoRoot,
    contentRoot: path.join(packageRoot, 'src', 'content'),
    skills,
    pluginVersion,
  });
}

export async function generateCodexPluginBundle(options) {
  const { repoRoot, contentRoot, skills, pluginVersion } = options;
  const pluginRoot = path.join(repoRoot, PLUGIN_DIRECTORY);
  const marketplacePath = path.join(repoRoot, '.agents', 'plugins', 'marketplace.json');

  const normalizedSkills = [...skills].sort((a, b) => a.id.localeCompare(b.id));
  const skillContents = [];
  for (const skill of normalizedSkills) {
    const resourcePath = normalizePath(skill.resourcePath);
    const absoluteSkillPath = path.join(contentRoot, resourcePath);
    let rawContent;
    try {
      rawContent = await readFile(absoluteSkillPath, 'utf8');
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new Error(
          `[codex-plugin] Missing skill content for "${skill.id}" at "${resourcePath}".`
        );
      }
      throw error;
    }

    const content = normalizeLineEndings(rawContent);
    if (content.trim().length === 0) {
      throw new Error(`[codex-plugin] Skill content is empty for "${skill.id}" at "${resourcePath}".`);
    }

    skillContents.push({
      ...skill,
      resourcePath,
      content,
    });
  }

  await rm(pluginRoot, { recursive: true, force: true });
  await mkdir(pluginRoot, { recursive: true });

  const files = [];
  files.push({
    relativePath: '.codex-plugin/plugin.json',
    content: renderJson(
      buildPluginManifest({
        version: pluginVersion,
      })
    ),
  });
  files.push({
    relativePath: '.mcp.json',
    content: renderJson(buildMcpConfig()),
  });
  files.push({
    relativePath: 'README.md',
    content: ensureTrailingNewline(renderPluginReadme()),
  });

  for (const [fileName, fileContent] of Object.entries(buildCommandFiles()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    files.push({
      relativePath: path.posix.join('commands', fileName),
      content: ensureTrailingNewline(fileContent),
    });
  }

  const workflowSkillContents = buildCodexWorkflowSkills();

  for (const skill of [...skillContents, ...workflowSkillContents]) {
    files.push({
      relativePath: path.posix.join('skills', skill.id, 'SKILL.md'),
      content: ensureTrailingNewline(skill.content),
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const file of files) {
    const absolutePath = path.join(pluginRoot, file.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, normalizeLineEndings(file.content), 'utf8');
  }

  await mkdir(path.dirname(marketplacePath), { recursive: true });
  const marketplaceManifest = await readMergedMarketplaceManifest(marketplacePath);
  await writeFile(marketplacePath, renderJson(marketplaceManifest), 'utf8');

  return {
    pluginRoot,
    marketplacePath,
    skillIds: [...skillContents, ...workflowSkillContents].map((skill) => skill.id).sort(),
    commandFiles: COMMAND_FILES,
  };
}

export function buildPluginManifest(options) {
  return {
    name: PLUGIN_ID,
    version: options.version,
    description:
      'MDS Expo development workflows for motion review, onboarding, deployment readiness, and project continuation.',
    author: {
      name: 'DJ Grimsley',
      url: 'https://davidjgrimsley.com',
    },
    homepage: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
    repository: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
    license: 'MIT',
    keywords: [
      'expo',
      'react-native',
      'mcp',
      'doctor',
      'onboarding',
      'codex-plugin',
    ],
    skills: './skills/',
    mcpServers: './.mcp.json',
    interface: {
      displayName: "Mr. DJ's Dev Suite",
      shortDescription: 'Expo review, motion, doctor, onboarding, and deploy workflows powered by MDS MCP tools',
      longDescription:
        'Generate and use MDS skills plus command playbooks for Expo project review, motion audits, onboarding, deployment prep, SEO fixes, and phase-based continuation, with callable MDS MCP tools for runtime behavior.',
      developerName: 'MDS',
      category: 'Coding',
      capabilities: ['Interactive', 'Read', 'Write'],
      websiteURL: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
      defaultPrompt: [
        'Review my Expo project and give me the next safe implementation steps.',
        'Review the animations in my app and tell me what should be parallax, Reanimated, or simpler motion.',
        'Run a deployment-readiness check with Doctor and fix blockers first.',
        'Continue the next task from my project/todo.md using MDS phase order.',
      ],
      brandColor: '#0A6A6A',
      screenshots: [],
    },
  };
}

export function buildMcpConfig() {
  return {
    mcpServers: {
      [MCP_SERVER_KEY]: {
        command: MDS_MCP_SERVER_BIN,
        args: [],
      },
    },
  };
}

export function buildMarketplaceManifest(options = {}) {
  const existingManifest = isRecord(options.existingManifest) ? options.existingManifest : null;
  const existingPlugins = Array.isArray(existingManifest?.plugins)
    ? existingManifest.plugins.filter((plugin) => isRecord(plugin))
    : [];
  const existingSuiteEntry = existingPlugins.find((plugin) => plugin.name === PLUGIN_ID);
  const mergedSuiteEntry = buildMarketplacePluginEntry(existingSuiteEntry);
  const retainedPlugins = existingPlugins.filter((plugin) => plugin.name !== PLUGIN_ID);
  const mergedPlugins = [...retainedPlugins, mergedSuiteEntry].sort((a, b) =>
    getSortName(a).localeCompare(getSortName(b))
  );

  const manifest = existingManifest ? { ...existingManifest } : {};
  if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
    manifest.name = 'mds-local';
  }

  const existingInterface = isRecord(manifest.interface) ? { ...manifest.interface } : {};
  if (
    typeof existingInterface.displayName !== 'string' ||
    existingInterface.displayName.trim().length === 0
  ) {
    existingInterface.displayName = 'MDS Local Plugins';
  }
  manifest.interface = existingInterface;
  manifest.plugins = mergedPlugins;
  return manifest;
}

function buildMarketplacePluginEntry(existingPlugin = null) {
  const merged = isRecord(existingPlugin) ? { ...existingPlugin } : {};
  merged.name = PLUGIN_ID;
  merged.source = {
    ...(isRecord(existingPlugin?.source) ? existingPlugin.source : {}),
    source: 'local',
    path: './plugins/codex',
  };
  merged.policy = {
    ...(isRecord(existingPlugin?.policy) ? existingPlugin.policy : {}),
    installation: 'AVAILABLE',
    authentication: 'ON_INSTALL',
  };
  merged.category = 'Coding';
  return merged;
}

async function readMergedMarketplaceManifest(marketplacePath) {
  try {
    const raw = await readFile(marketplacePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error('[codex-plugin] Marketplace JSON root must be an object.');
    }
    return buildMarketplaceManifest({
      existingManifest: parsed,
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return buildMarketplaceManifest();
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        `[codex-plugin] Invalid JSON in marketplace file "${marketplacePath}". ${error.message}`
      );
    }

    throw error;
  }
}

function getSortName(value) {
  return typeof value?.name === 'string' ? value.name : '';
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildCommandFiles() {
  return Object.fromEntries(COMMAND_FILES.map((fileName) => [fileName, readCanonicalPromptMarkdown(fileName)]));
}

export function buildCodexWorkflowSkills() {
  return Object.entries(buildCommandFiles()).map(([fileName, content]) => {
    const id = `${CODEX_WORKFLOW_SKILL_PREFIX}${fileName.replace(/\.md$/, '')}`;
    const title = titleFromCommandFile(fileName);
    const description =
      WORKFLOW_SKILL_DESCRIPTIONS[fileName] ??
      `Use when the user asks Mr. DJ's Dev Suite to run the ${title} workflow.`;

    return {
      id,
      content: [
        renderFrontmatter({
          name: `MDS ${title}`,
          description,
        }),
        '',
        '# Codex Workflow Routing',
        '',
        '- This is a Mr. DJ\'s Dev Suite plugin workflow. Plugin skills and command markdown are guidance only.',
        '- Prefer callable MDS MCP tools exposed by `@mr.dj2u/mcp-server` when this workflow names them.',
        '- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.',
        '- If a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.',
        '- For ordinary CLI workflows that do allow fallback, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.',
        '',
        content,
      ].join('\n'),
    };
  });
}

export function renderPluginReadme() {
  return `# Mr. DJ's Dev Suite Codex Plugin

The Mr. DJ's Dev Suite Codex plugin bundle is generated from \`packages/knowledge\` and ships the Codex-native MDS surface: plugin manifest, MCP server config, generated skills, and command prompts.

## What's Included

- Codex plugin manifest: \`.codex-plugin/plugin.json\`
- MCP server config: \`.mcp.json\`
- Generated skills: \`skills/<skill-id>/SKILL.md\`
- Command prompt files: \`commands/*.md\`

The source of truth for skills remains \`packages/knowledge/src/content/skills\`.
Runtime behavior comes from callable MDS MCP tools exposed by \`@mr.dj2u/mcp-server\`.

## One-Command Install

Project scope installs MCP plus the local marketplace/plugin enable blocks into \`.codex/config.toml\`, copies this plugin into \`plugins/mr-djs-dev-suite\`, and registers it in \`.agents/plugins/marketplace.json\`:

\`\`\`sh
mds agent install --client codex --scope project --target /path/to/your/expo-app
mds agent verify --client codex --scope project --target /path/to/your/expo-app
\`\`\`

User scope installs MCP plus the local marketplace/plugin enable blocks into \`~/.codex/config.toml\`, copies the plugin into \`~/plugins/mr-djs-dev-suite\`, and registers it in \`~/.agents/plugins/marketplace.json\`:

\`\`\`sh
mds agent install --client codex --scope user
mds agent verify --client codex --scope user
mds agent install --client codex --scope user --dry-run
\`\`\`

After install, restart Codex so it picks up the local marketplace. Then type \`@Mr. DJ's Dev Suite\` in chat to get the install pop-up, hit Install, and use \`@Mr. DJ's Dev Suite\` in Codex Desktop or the Codex extension for VS Code.

If Codex keeps using stale behavior after reinstall, do a full cleanup and reinstall:

1. Remove the installed local plugin copy for the scope you used:
   - project scope: \`<target>/plugins/mr-djs-dev-suite\`
   - user scope: \`~/plugins/mr-djs-dev-suite\`
2. Remove the local Codex cache copy:
   - \`~/.codex/plugins/cache/mds-local/mr-djs-dev-suite\`
3. Reinstall:
   - \`mds agent install --client codex --scope project --target /path/to/your/expo-app\`
   - or \`mds agent install --client codex --scope user\`
4. Run verify again:
   - \`mds agent verify --client codex --scope project --target /path/to/your/expo-app\`
   - or \`mds agent verify --client codex --scope user\`
5. Restart Codex, then run \`mds_runtime_versions\` from the host surface to confirm which runtime is active.

## MCP-Only Fallback

Use this when you only want the callable MDS MCP tools/prompts and not the plugin/skills bundle:

\`\`\`sh
mds mcp install --client codex --scope project --target /path/to/your/expo-app
mds mcp install --client codex --scope user
\`\`\`

## Regenerate

\`\`\`sh
pnpm --filter @mr.dj2u/knowledge build
\`\`\`

Do not edit generated plugin skills directly; update \`packages/knowledge\` and rebuild.
`;
}

export function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function titleFromCommandFile(fileName) {
  return fileName
    .replace(/\.md$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderFrontmatter(fields) {
  return [
    '---',
    ...Object.entries(fields).map(([key, value]) => `${key}: ${quoteYaml(value)}`),
    '---',
  ].join('\n');
}

function quoteYaml(value) {
  return JSON.stringify(String(value).replace(/\s+/g, ' ').trim());
}

function ensureTrailingNewline(value) {
  const normalized = normalizeLineEndings(value).trimEnd();
  return `${normalized}\n`;
}

function readCanonicalPromptMarkdown(fileName) {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const promptPath = path.join(packageRoot, 'src', 'content', 'prompts', fileName);
  return normalizeLineEndings(readFileSync(promptPath, 'utf8'));
}

function isMissingFileError(error) {
  return typeof error === 'object' && error !== null && error.code === 'ENOENT';
}

async function loadKnowledgeModule(packageRoot) {
  const distEntry = path.join(packageRoot, 'dist', 'index.js');
  try {
    return await import(pathToFileURL(distEntry).href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[codex-plugin] Could not load knowledge catalog at "${distEntry}". Run "pnpm --filter @mr.dj2u/knowledge build" first.\n${detail}`
    );
  }
}

async function readWorkspaceVersion(repoRoot) {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  return typeof parsed.version === 'string' && parsed.version.length > 0 ? parsed.version : '0.1.0';
}

function isDirectRun() {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  generateCodexPluginBundleFromKnowledge()
    .then((result) => {
      console.log(`[codex-plugin] Generated ${result.skillIds.length} skills into ${result.pluginRoot}`);
      console.log(`[codex-plugin] Commands: ${result.commandFiles.join(', ')}`);
      console.log(`[codex-plugin] Marketplace: ${result.marketplacePath}`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    });
}
