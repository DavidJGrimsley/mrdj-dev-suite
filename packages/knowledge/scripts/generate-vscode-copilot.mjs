import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildCommandFiles, normalizeLineEndings } from './generate-codex-plugin.mjs';

export const VSCODE_COPILOT_DIRECTORY = path.join('plugins', 'vscode-copilot');
export const VSCODE_MCP_SERVER_KEY = 'mds';
export const PUBLISHED_MCP_SERVER_PACKAGE = '@mr.dj2u/mcp-server';
export const PUBLISHED_MCP_SERVER_VERSION = '0.1.5';
export const PUBLISHED_MCP_SERVER_SPEC = `${PUBLISHED_MCP_SERVER_PACKAGE}@${PUBLISHED_MCP_SERVER_VERSION}`;
export const PUBLISHED_MCP_SERVER_BIN = 'mds-mcp-server';
export const PUBLISHED_MCP_SERVER_ARGS = ['-y', PUBLISHED_MCP_SERVER_SPEC];

export async function generateVscodeCopilotBundleFromKnowledge(options = {}) {
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

  return generateVscodeCopilotBundle({
    repoRoot,
    contentRoot: path.join(packageRoot, 'src', 'content'),
    skills,
  });
}

export async function generateVscodeCopilotBundle(options) {
  const { repoRoot, contentRoot, skills } = options;
  const bundleRoot = path.join(repoRoot, VSCODE_COPILOT_DIRECTORY);
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
          `[vscode-copilot] Missing skill content for "${skill.id}" at "${resourcePath}".`
        );
      }
      throw error;
    }

    const content = normalizeLineEndings(rawContent);
    if (content.trim().length === 0) {
      throw new Error(`[vscode-copilot] Skill content is empty for "${skill.id}" at "${resourcePath}".`);
    }

    skillContents.push({
      ...skill,
      resourcePath,
      content,
    });
  }

  await rm(bundleRoot, { recursive: true, force: true });
  await mkdir(bundleRoot, { recursive: true });

  const files = [];
  files.push({
    relativePath: '.vscode/mcp.json',
    content: renderJson(buildVscodeMcpConfig()),
  });
  files.push({
    relativePath: '.vscode/settings.json',
    content: renderJson(buildVscodeSettings()),
  });
  files.push({
    relativePath: '.github/copilot-instructions.md',
    content: renderCopilotInstructions(),
  });
  files.push({
    relativePath: '.github/agents/mds.agent.md',
    content: renderMdsAgent(),
  });
  files.push({
    relativePath: 'README.md',
    content: renderVscodeReadme(),
  });
  files.push({
    relativePath: 'user/.copilot/instructions.md',
    content: renderCopilotInstructions(),
  });
  files.push({
    relativePath: 'user/.copilot/agents/mds.agent.md',
    content: renderMdsAgent(),
  });

  for (const [fileName, content] of Object.entries(buildVscodePromptFiles()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    files.push({
      relativePath: path.posix.join('.github', 'prompts', fileName),
      content,
    });
  }

  for (const skill of skillContents) {
    files.push({
      relativePath: path.posix.join('.github', 'skills', skill.id, 'SKILL.md'),
      content: renderVscodeSkill(skill),
    });
    files.push({
      relativePath: path.posix.join('user', '.copilot', 'skills', skill.id, 'SKILL.md'),
      content: renderVscodeSkill(skill),
    });
  }

  for (const [fileName, content] of Object.entries(buildVscodeWorkflowSkills()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    files.push({
      relativePath: path.posix.join('user', '.copilot', 'skills', fileName, 'SKILL.md'),
      content,
    });
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const file of files) {
    const absolutePath = path.join(bundleRoot, file.relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, ensureTrailingNewline(file.content), 'utf8');
  }

  return {
    bundleRoot,
    skillIds: skillContents.map((skill) => skill.id),
    promptFiles: Object.keys(buildVscodePromptFiles()).sort(),
  };
}

export function buildVscodeMcpConfig() {
  return {
    servers: {
      [VSCODE_MCP_SERVER_KEY]: {
        command: 'npx',
        args: PUBLISHED_MCP_SERVER_ARGS,
      },
    },
  };
}

export function buildVscodeSettings() {
  return {
    'github.copilot.chat.codeGeneration.useInstructionFiles': true,
    'chat.promptFilesLocations': {
      '.github/prompts': true,
    },
    'chat.agentFilesLocations': {
      '.github/agents': true,
    },
    'chat.useAgentSkills': true,
    'chat.agentSkillsLocations': {
      '.github/skills': true,
      '~/.copilot/skills': true,
    },
  };
}

export function buildVscodePromptFiles() {
  const commandFiles = buildCommandFiles();
  return Object.fromEntries(
    Object.entries(commandFiles).map(([fileName, content]) => [
      fileName.replace(/\.md$/, '.prompt.md'),
      renderVscodePrompt(fileName, content),
    ])
  );
}

export function buildVscodeWorkflowSkills() {
  const commandFiles = buildCommandFiles();
  return Object.fromEntries(
    Object.entries(commandFiles).map(([fileName, content]) => {
      const id = `workflow-${fileName.replace(/\.md$/, '')}`;
      const title = titleFromCommandFile(fileName);
      return [
        id,
        [
          renderFrontmatter({
            name: `MDS ${title}`,
            description: `Run the MDS ${title} workflow in VS Code Copilot user scope.`,
          }),
          '',
          content.replaceAll('mr-djs-dev-suite', VSCODE_MCP_SERVER_KEY),
        ].join('\n'),
      ];
    })
  );
}

function renderVscodeSkill(skill) {
  return [
    renderFrontmatter({
      name: skill.name,
      description: skill.description,
    }),
    '',
    skill.content,
  ].join('\n');
}

function renderVscodePrompt(fileName, content) {
  const title = titleFromCommandFile(fileName);
  return [
    renderFrontmatter({
      mode: 'agent',
      description: `Run the MDS ${title} workflow with callable MDS MCP diagnostics and explicit fallback rules.`,
    }),
    '',
    content.replaceAll('mr-djs-dev-suite', VSCODE_MCP_SERVER_KEY),
  ].join('\n');
}

function renderMdsAgent() {
  return [
    renderFrontmatter({
      name: 'MDS',
      description: 'MDS Expo project intelligence agent for Doctor, onboarding, deploy checks, and phase continuation.',
    }),
    '',
    '# MDS Agent',
    '',
    "You are the Mr. DJ's Dev Suite agent for Expo projects. Treat callable MDS MCP tools as the runtime behavior surface and prompt markdown as guidance only.",
    '',
    '## Tool Routing',
    '',
    '- Use `doctor_scan_project` before release or broad refactors.',
    '- Use `doctor_scan_file` for focused route, env, SSR, or API changes.',
    '- Use `generate_refactor_plan` before moving architecture across folders.',
    '- Use `generate_deploy_checklist` before release or client handoff.',
    '- Use `list_skills`, `get_skill`, and `get_guide` before giving framework-specific guidance.',
    '',
    '## Guardrails',
    '',
    '- Keep project intent in `project/info.md` and technical rules in `project/guidelines.md`.',
    '- Prefer Expo-owned guidance for framework mechanics; MDS adds project memory, checks, defaults, and workflows.',
    '- Do not skip unresolved `# TodoForContext(optional):` markers before implementation.',
  ].join('\n');
}

function renderCopilotInstructions() {
  return [
    '<!-- BEGIN MDS COPILOT INSTRUCTIONS -->',
    "# Mr. DJ's Dev Suite Copilot Instructions",
    '',
    '- Treat `project/` as the source of truth for product intent, roadmap, style, and technical rules.',
    '- Prefer callable MDS MCP tools before broad edits: `doctor_scan_project`, `doctor_scan_file`, `generate_refactor_plan`, and `generate_deploy_checklist`.',
    '- Use `list_skills`, `get_skill`, and `get_guide` for MDS guidance, while delegating framework mechanics to official Expo/React Native guidance when available.',
    '- Keep route files thin, env secrets server-only, and release work gated by Doctor checks.',
    '<!-- END MDS COPILOT INSTRUCTIONS -->',
  ].join('\n');
}

function renderVscodeReadme() {
  return `# Mr. DJ's Dev Suite VS Code Copilot Bundle

This bundle is generated from \`packages/knowledge\` and targets native VS Code Copilot customization surfaces:

- \`.vscode/mcp.json\` for the MDS MCP server.
- \`.vscode/settings.json\` for Copilot customization discovery settings.
- \`.github/copilot-instructions.md\` for workspace instructions.
- \`.github/agents/mds.agent.md\` for a custom Copilot agent.
- \`.github/prompts/*.prompt.md\` for reusable prompt workflows.
- \`.github/skills/*/SKILL.md\` for generated MDS skills.

## Project Install

\`\`\`bash
mds agent install --client vscode --scope project --target .
\`\`\`

## User Install

\`\`\`bash
mds agent install --client vscode --scope user
\`\`\`

User-scope setup copies the generated assets into \`~/.copilot\` and uses VS Code's \`code --add-mcp\` flow for the MCP server when the \`code\` command is available. If it is not available, the CLI prints the exact manual command.

## Verify

\`\`\`bash
mds agent verify --client vscode --target .
\`\`\`

Skills and prompt workflows are generated from the knowledge package. Do not edit generated copies by hand; update \`packages/knowledge/src/content\` or the generator scripts instead.
`;
}

function titleFromCommandFile(fileName) {
  return fileName
    .replace(/\.prompt\.md$/, '')
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

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureTrailingNewline(value) {
  const normalized = normalizeLineEndings(value);
  return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
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
      `[vscode-copilot] Could not load knowledge catalog at "${distEntry}". Run "pnpm --filter @mr.dj2u/knowledge build" first.\n${detail}`
    );
  }
}

function isDirectRun() {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  generateVscodeCopilotBundleFromKnowledge()
    .then((result) => {
      console.log(`[vscode-copilot] Generated ${result.skillIds.length} skills into ${result.bundleRoot}`);
      console.log(`[vscode-copilot] Prompts: ${result.promptFiles.join(', ')}`);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    });
}
