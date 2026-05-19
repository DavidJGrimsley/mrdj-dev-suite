import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PLUGIN_ID = 'mr-djs-dev-suite';
export const PLUGIN_DIRECTORY = path.join('plugins', 'codex');
export const MCP_SERVER_KEY = 'mr-djs-dev-suite';

export const COMMAND_FILES = [
  'review-expo-project.md',
  'run-doctor.md',
  'prepare-deploy.md',
  'fix-seo.md',
  'create-expo-super-stack.md',
  'continue-development.md',
  'project-research-plan.md',
];

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

  for (const skill of skillContents) {
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
    skillIds: skillContents.map((skill) => skill.id),
    commandFiles: COMMAND_FILES,
  };
}

export function buildPluginManifest(options) {
  return {
    name: PLUGIN_ID,
    version: options.version,
    description:
      'MDS Expo development workflows for review, onboarding, deployment readiness, and project continuation.',
    author: {
      name: 'DJ Grimsley',
      url: 'https://davidjgrimsley.com',
    },
    homepage: 'https://github.com/DavidJGrimsley/mr-djs-dev-suite',
    repository: 'https://github.com/DavidJGrimsley/mr-djs-dev-suite',
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
      shortDescription: 'MCP-first Expo review, doctor, onboarding, and deploy workflows',
      longDescription:
        'Generate and use MDS skills plus command playbooks for Expo project review, onboarding, deployment prep, SEO fixes, and phase-based continuation with reliable MCP and CLI fallback paths.',
      developerName: 'MDS',
      category: 'Coding',
      capabilities: ['Interactive', 'Read', 'Write'],
      websiteURL: 'https://github.com/DavidJGrimsley/mr-djs-dev-suite',
      defaultPrompt: [
        'Review my Expo project and give me the next safe implementation steps.',
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
        command: 'npx',
        args: ['-y', '@mr.dj2u/mcp-server'],
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
  return {
    'review-expo-project.md': `# /review-expo-project

Review an Expo project with MCP-first diagnostics and skill-guided remediation.

## Arguments

- \`projectPath\`: absolute or relative project path (default: current directory).
- \`mode\`: Doctor mode (\`fast\`, \`ci\`, or \`full\`; default: \`ci\`).

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Call \`continue_project\` to summarize current project state and blockers.
3. Call \`doctor_scan_project\` with \`projectPath\` and \`mode\`.
4. For each warning/error, call \`doctor_explain_result\`, then pull targeted guidance with \`get_skill\` (for example: \`project-onboarding\`, \`debugging\`, \`deployment\`).
5. If the findings affect release readiness, call \`generate_deploy_checklist\` so the next steps stay checklist-driven instead of PR-driven.
6. Call \`knowledge_list_resources\` with \`kind: "guide"\` if extra reference context is needed.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. If MCP still cannot run, use direct CLI flows:
   - \`mds continue <projectPath>\`
   - \`mds doctor <projectPath> --ci\`

## Verification And Output

- Keep the response user-facing: summarize findings and next steps without echoing internal tool chatter or file-read noise.
- Re-run \`doctor_scan_project\` (or \`mds doctor --ci\`) after fixes.
- If the user is validating an installed agent bundle, include \`mds agent verify --client <client> --target <path>\` in the follow-up commands.
- Output: blocker summary, failing checks, recommended next task, and concrete follow-up commands. Avoid proposing a PR unless the user explicitly asks for a GitHub workflow.
`,
    'run-doctor.md': `# /run-doctor

Run MDS Doctor as the primary health check for an Expo project.

## Arguments

- \`projectPath\`: project root path (default: current directory).
- \`mode\`: \`fast\`, \`ci\`, or \`full\` (default: \`ci\`).
- \`runScripts\`: whether Doctor should execute project scripts (default: \`true\` for \`ci\` mode).

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Call \`doctor_scan_project\` with selected arguments.
3. For each non-pass result, call \`doctor_explain_result\`.
4. If the check is release-related or web-facing, call \`generate_deploy_checklist\` before giving next steps.
5. Pull targeted implementation guidance with \`get_skill\` (typically \`deployment\`, \`debugging\`, or \`dev-server-management\`).

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI alternatives:
   - \`mds doctor <projectPath>\`
   - \`mds doctor <projectPath> --ci\`
   - \`mds doctor <projectPath> --json\`

## Verification And Output

- Re-run Doctor after each fix batch.
- Keep the response concise and user-facing; do not surface internal tool chatter or intermediate file reads.
- Output: check summary, blocking errors first, and the exact command used for re-check.
`,
    'prepare-deploy.md': `# /prepare-deploy

Prepare an Expo project for release using deployment-focused skills plus Doctor parity checks.

## Arguments

- \`projectPath\`: release candidate project path (default: current directory).
- \`includeSeo\`: whether to include web metadata/indexing checks (default: \`true\` when web is targeted).

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Run \`doctor_scan_project\` in \`ci\` mode for release parity.
3. Pull \`get_skill\` for \`deployment\`; if web is involved also pull \`seo-metadata\`.
4. Use \`knowledge_list_resources\` (\`kind: "rule"\`) to confirm env hygiene, SSR safety, and metadata requirements.
5. Call \`generate_deploy_checklist\` so SEO, scripts, and release-readiness gaps are reflected in the next steps.
6. Produce a release checklist mapped to current failing checks.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI path:
   - \`mds doctor <projectPath> --ci\`
   - Run project scripts: \`lint\`, \`type-check\`, \`test\`, and production build/profile scripts.

## Verification And Output

- Re-run \`doctor_scan_project\` (or CLI equivalent) until blockers are cleared.
- Keep the response user-facing and checklist-driven; avoid internal tool chatter and avoid asking for a PR unless the user requested GitHub workflow.
- Output: release readiness status, unresolved blockers, and rollback/readiness notes.
`,
    'fix-seo.md': `# /fix-seo

Apply SEO metadata fixes for Expo web routes with MCP guidance and post-fix verification.

## Arguments

- \`projectPath\`: Expo project path (default: current directory).
- \`routeOrFile\`: optional route/file focus for targeted checks.

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Pull \`get_skill\` for \`seo-metadata\`.
3. Optionally run \`doctor_scan_file\` for focused route files, then \`doctor_scan_project\` for full checks.
4. Use \`knowledge_list_resources\` (\`kind: "rule"\`) to ensure canonical/indexing strategy is complete.
5. Implement metadata, canonical, robots, and sitemap corrections in route ownership boundaries.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI checks:
   - \`mds doctor <projectPath> --ci\`
   - Run project-specific web build/preview commands to verify metadata output.

## Verification And Output

- Confirm canonical tags, social metadata, and sitemap/robots behavior on affected routes.
- Output: changed files, resolved SEO gaps, and any remaining manual verification steps.
`,
    'create-expo-super-stack.md': `# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, then hand off to phase-based continuation.

## Arguments

- \`parentDir\`: folder where the new app directory should be created.
- \`appName\`: app folder name.

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Invoke the MCP prompt \`create_expo_super_stack\` from a parent directory.
3. Follow the prompt intake flow and keep one question per turn until generation completes.
4. After generation, move into the new app folder and invoke \`continue_project\` (or prompt \`continue_mds_project\`) for the first implementation session.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI generation:
   - \`npx -y create-expo-super-stack <appName>\`
3. Then onboard/continue from inside the generated app:
   - \`mds continue <new-app-path>\`

## Verification And Output

- Confirm generated app has \`project/info.md\`, \`project/todo.md\`, \`project/style.md\`, and \`project/guidelines.md\`.
- Output: generated app path, onboarding status, and immediate next command.
`,
    'continue-development.md': `# /continue-development

Resume work on an onboarded project by following MDS phase order from \`project/todo.md\`.

## Arguments

- \`projectPath\`: onboarded app path (default: current directory).

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Call \`continue_project\` first to get the active-phase brief.
3. Pull \`get_skill\` for \`continue-development\` to enforce phase-first sequencing.
4. If blockers appear, use \`doctor_scan_project\` and \`doctor_explain_result\` for targeted remediation before feature work.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI flow:
   - \`mds continue <projectPath>\`
   - \`mds doctor <projectPath>\` when blockers are unclear.

## Verification And Output

- Confirm the chosen task belongs to the active phase or has an explicit deferral note.
- Output: selected next task, blockers, and validation commands to run after implementation.
`,
    'project-research-plan.md': `# /project-research-plan

Turn rough product notes/research into actionable MDS project memory and next-phase plan.

## Arguments

- \`projectPath\`: target project path (default: current directory).
- \`inputs\`: attached notes/docs to normalize into canonical memory files.

## MCP-First Workflow

1. Confirm the \`mr-djs-dev-suite\` MCP server is available.
2. Pull \`get_skill\` for \`research-plan-intake\` (and \`project-onboarding\` when onboarding context is mixed in).
3. Call \`knowledge_list_resources\` for \`guide\` and \`reference\` resources as needed for structure and validation.
4. Normalize clear context directly; ask focused follow-up only where ambiguity changes implementation direction.
5. Update project memory files and produce an implementation-ready next-phase plan.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - \`mds mcp install --client codex --scope project\`
2. Direct CLI fallback:
   - Use \`mds onboard <projectPath>\` for structured intake when memory files are missing.
   - Use \`mds continue <projectPath>\` after memory normalization to select the next task.

## Verification And Output

- Confirm \`project/info.md\`, \`project/style.md\`, and \`project/todo.md\` align with extracted research context.
- Output: resolved unknowns, outstanding questions, and the recommended next implementation slice.
`,
  };
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

## One-Command Install

Project scope installs MCP into \`.codex/config.toml\`, copies this plugin into \`plugins/mr-djs-dev-suite\`, and registers it in \`.agents/plugins/marketplace.json\`:

\`\`\`sh
mds agent install --client codex --scope project --target /path/to/your/expo-app
mds agent verify --client codex --target /path/to/your/expo-app
\`\`\`

User scope installs MCP into \`~/.codex/config.toml\`, copies the plugin into \`~/plugins/mr-djs-dev-suite\`, and registers it in \`~/.agents/plugins/marketplace.json\`:

\`\`\`sh
mds agent install --client codex --scope user
mds agent install --client codex --scope user --dry-run
\`\`\`

After install, restart Codex if needed and enable/install \`mr-djs-dev-suite\` from the local marketplace.

## MCP-Only Fallback

Use this when you only want predictable MCP tools/prompts and not the plugin/skills bundle:

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

function ensureTrailingNewline(value) {
  const normalized = normalizeLineEndings(value).trimEnd();
  return `${normalized}\n`;
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
