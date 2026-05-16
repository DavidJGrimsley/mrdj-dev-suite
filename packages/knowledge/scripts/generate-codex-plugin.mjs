import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PLUGIN_ID = 'mrdj-dev-suite';
export const PLUGIN_DIRECTORY = path.join('plugins', 'codex');
export const MCP_SERVER_KEY = 'mrdj-dev-suite';

export const COMMAND_FILES = [
  'continue-development.md',
  'create-expo-super-stack.md',
  'fix-seo.md',
  'prepare-deploy.md',
  'project-research-plan.md',
  'review-expo-project.md',
  'run-doctor.md',
  'ship-test-loop.md',
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
  const commandSpecs = knowledgeModule.listPromptSpecs('codex-command');
  const commands = await Promise.all(
    commandSpecs.map(async (spec) => {
      const full = await knowledgeModule.readPromptSpec(spec.id);
      if (!full) {
        throw new Error(`[codex-plugin] Missing prompt spec content for "${spec.id}".`);
      }
      const fileName = spec.codexCommandFile;
      if (!fileName) {
        throw new Error(`[codex-plugin] Missing codexCommandFile for prompt spec "${spec.id}".`);
      }
      return {
        id: spec.id,
        fileName,
        content: normalizeLineEndings(full.content),
      };
    })
  );

  const pluginVersion = await readWorkspaceVersion(repoRoot);

  return generateCodexPluginBundle({
    repoRoot,
    contentRoot: path.join(packageRoot, 'src', 'content'),
    skills,
    commands,
    pluginVersion,
  });
}

export async function generateCodexPluginBundle(options) {
  const { repoRoot, contentRoot, skills, commands, pluginVersion } = options;
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

  const commandFiles = Array.isArray(commands)
    ? [...commands].sort((a, b) => a.fileName.localeCompare(b.fileName))
    : [];
  for (const command of commandFiles) {
    files.push({
      relativePath: path.posix.join('commands', command.fileName),
      content: ensureTrailingNewline(command.content),
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
    commandFiles: commandFiles.map((command) => command.fileName),
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
      displayName: 'MrDJ Dev Suite',
      shortDescription: 'MCP-first Expo review, doctor, onboarding, and deploy workflows',
      longDescription:
        'Generate and use MDS skills plus command playbooks for Expo project review, onboarding, deployment prep, SEO fixes, and phase-based continuation with reliable MCP and CLI fallback paths.',
      developerName: 'DJ Grimsley',
      category: 'Coding',
      capabilities: ['Interactive', 'Read', 'Write'],
      websiteURL: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
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
        args: ['-y', '@mrdj/mcp-server'],
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
    manifest.name = 'mrdj-local';
  }

  const existingInterface = isRecord(manifest.interface) ? { ...manifest.interface } : {};
  if (
    typeof existingInterface.displayName !== 'string' ||
    existingInterface.displayName.trim().length === 0
  ) {
    existingInterface.displayName = 'MrDJ Local Plugins';
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

export function renderPluginReadme() {
  return `# MDS Codex Plugin

The MrDJ Dev Suite plugin bundle is generated from \`packages/knowledge\` and ships:

- Codex plugin manifest: \`.codex-plugin/plugin.json\`
- MCP server config: \`.mcp.json\`
- Generated skills: \`skills/<skill-id>/SKILL.md\`
- Command prompt files in \`commands/\`

The source of truth for skills remains \`packages/knowledge/src/content/skills\`.
Command prompt markdown is sourced from \`packages/knowledge/src/content/prompts\` via canonical prompt specs.

## Install In Codex (Plugin Path)

1. Build knowledge outputs (this also regenerates the plugin bundle):
   - \`pnpm --filter @mrdj/knowledge build\`
2. Ensure the local marketplace includes this plugin:
   - \`.agents/plugins/marketplace.json\` -> \`./plugins/codex\`
3. Install the plugin from the local marketplace in Codex.

## Install MCP Via CLI (Reliable Fallback)

Use manual MCP install when you want predictable behavior across clients or CI:

- \`mrdj mcp install --client codex --scope project\`
- \`mrdj mcp install --client codex\` (user scope)

This path does not depend on plugin installation and remains fully supported.

## When To Prefer CLI Fallback

- You need a fast/project-scoped setup in a fresh repo.
- Plugin discovery or install is unavailable in your Codex environment.
- You need deterministic local or CI setup without UI/plugin prerequisites.
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
  const normalized = normalizeLineEndings(value);
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
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
      `[codex-plugin] Could not load knowledge catalog at "${distEntry}". Run "pnpm --filter @mrdj/knowledge build" first.\n${detail}`
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
