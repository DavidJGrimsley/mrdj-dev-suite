import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MCP_SERVER_KEY,
  MDS_MCP_SERVER_BIN,
  buildCommandFiles,
  generateCodexPluginBundleFromKnowledge,
} from './generate-codex-plugin.mjs';
import { generateVscodeCopilotBundleFromKnowledge } from './generate-vscode-copilot.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const source = path.join(packageRoot, 'src', 'content');
const destination = path.join(packageRoot, 'dist', 'content');

export async function runCopyContent() {
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  const markdownFiles = await listMarkdownFiles(source);
  for (const filePath of markdownFiles) {
    const contents = await readFile(filePath, 'utf8');
    if (contents.trim().length === 0) {
      throw new Error(`Knowledge markdown file is empty: ${path.relative(packageRoot, filePath)}`);
    }
  }
  await cp(source, destination, { recursive: true });
  await writeFile(
    path.join(destination, 'resource-index.json'),
    `${JSON.stringify(
      markdownFiles.map((filePath) => path.relative(source, filePath).replace(/\\/g, '/')).sort(),
      null,
      2
    )}\n`,
    'utf8'
  );

  if (process.env.MRDJ_SKIP_CODEX_PLUGIN_GENERATION !== '1') {
    try {
      await generateCodexPluginBundleFromKnowledge({ packageRoot });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[copy-content] Failed while generating the Codex plugin bundle. ` +
          `If you are intentionally running content copy only, rerun with ` +
          `MRDJ_SKIP_CODEX_PLUGIN_GENERATION=1.\n${detail}`
      );
    }
  }

  if (process.env.MRDJ_SKIP_VSCODE_COPILOT_GENERATION !== '1') {
    try {
      await generateVscodeCopilotBundleFromKnowledge({ packageRoot });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[copy-content] Failed while generating the VS Code Copilot bundle. ` +
          `If you are intentionally running content copy only, rerun with ` +
          `MRDJ_SKIP_VSCODE_COPILOT_GENERATION=1.\n${detail}`
      );
    }
  }

  // Generate plugin skill files in the Claude Code plugin format:
  // skills/<skill-id>/SKILL.md with YAML frontmatter extracted from the skill body.
  const claudeCodeSkillsDir = path.join(repoRoot, 'plugins', 'claude-code', 'skills');
  const claudeCodeCommandsDir = path.join(repoRoot, 'plugins', 'claude-code', 'commands');
  const claudeCodeAgentsDir = path.join(repoRoot, 'plugins', 'claude-code', 'agents');
  const claudeCodePluginDir = path.join(repoRoot, 'plugins', 'claude-code');
  const skillSource = path.join(source, 'skills');
  const skillFiles = await listMarkdownFiles(skillSource);

  await rm(claudeCodeSkillsDir, { recursive: true, force: true });
  await rm(claudeCodeAgentsDir, { recursive: true, force: true });

  // Generate agent skills from the knowledge package (auto-invoked by Claude).
  for (const filePath of skillFiles) {
    const content = await readFile(filePath, 'utf8');
    const id = path.basename(filePath, '.md');

    // Extract the first non-heading, non-empty line as the SKILL.md description.
    // Skill files consistently follow: "# Skill: Name\n\n<description>\n\n## ..."
    const description = content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? id;

    const skillDir = path.join(claudeCodeSkillsDir, id);
    await mkdir(skillDir, { recursive: true });

    const skillMd = `---\ndescription: ${description}\n---\n\n${content}`;
    await writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
  }

  // Generate user-invoked command skills from the canonical knowledge prompt content.
  // These are generated after knowledge skills so command versions win any name collision.
  const commandFiles = Object.entries(buildCommandFiles()).map(([fileName, content]) => ({
    fileName,
    content,
  }));

  await rm(claudeCodeCommandsDir, { recursive: true, force: true });
  await mkdir(claudeCodeCommandsDir, { recursive: true });
  for (const { fileName, content } of commandFiles) {
    const id = path.basename(fileName, '.md');
    const description = content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? id;

    await writeFile(path.join(claudeCodeCommandsDir, fileName), content, 'utf8');

    const skillDir = path.join(claudeCodeSkillsDir, id);
    await mkdir(skillDir, { recursive: true });

    const skillMd = `---\ndescription: ${description}\ndisable-model-invocation: true\n---\n\n${content}`;
    await writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
  }

  await mkdir(claudeCodeAgentsDir, { recursive: true });
  await writeFile(path.join(claudeCodeAgentsDir, 'mds.md'), renderClaudeMdsAgent(), 'utf8');
  await mkdir(path.join(claudeCodePluginDir, '.claude-plugin'), { recursive: true });
  await writeFile(
    path.join(claudeCodePluginDir, '.claude-plugin', 'plugin.json'),
    `${JSON.stringify(buildClaudePluginManifest(await readWorkspaceVersion()), null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    path.join(claudeCodePluginDir, '.mcp.json'),
    `${JSON.stringify(buildClaudeMcpConfig(), null, 2)}\n`,
    'utf8'
  );
  await writeFile(
    path.join(claudeCodePluginDir, 'settings.json'),
    `${JSON.stringify({ agent: 'mds' }, null, 2)}\n`,
    'utf8'
  );

  console.log(
    `  generated ${skillFiles.length} knowledge + ${commandFiles.length} command skill dirs -> ${path.relative(repoRoot, claudeCodeSkillsDir)}`
  );
}

async function listMarkdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listMarkdownFiles(filePath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

export function renderClaudeMdsAgent() {
  return [
    '---',
    'name: mds',
    "description: Use for Mr. DJ's Dev Suite Expo project work: Doctor scans, motion review, project review, onboarding, deployment readiness, and phase-based continuation.",
    'model: inherit',
    'skills:',
    '  - animation-motion',
    '  - deployment',
    '  - debugging',
    '  - continue-development',
    '  - project-onboarding',
    '  - expo-router-architecture',
    '  - expo-ssr-safety',
    '  - env-vars',
    '  - seo-metadata',
    '---',
    '',
    '# MDS Agent',
    '',
    "You are the Mr. DJ's Dev Suite agent for Expo projects. Treat callable MDS MCP tools as the runtime behavior surface and plugin markdown as guidance only.",
    '',
    '## Tool Routing',
    '',
    '- Use `continue_project` before choosing phase work from `project/todo.md`.',
    '- Use `doctor_scan_project` before release, broad refactors, or git handoff.',
    '- Use `doctor_scan_file` for focused route, env, SSR, or API changes.',
    '- Use `generate_refactor_plan` before moving architecture across folders.',
    '- Use `generate_deploy_checklist` before release or client handoff.',
    '- Use `list_skills`, `get_skill`, and `get_guide` before giving MDS-specific guidance.',
    '',
    '## Motion Routing',
    '',
    '- If the user asks about animation, motion, smoothness, jank, Reanimated, Lottie, parallax, scroll-linked motion, layered scroll, hero motion, depth effects, pinned scenes, or layout transitions, pull `get_skill` with `id: "animation-motion"` and `get_guide` with `id: "animation-performance"` before broad motion edits.',
    '- Use `review_motion` or `/review-motion` for motion audits, inventories, and classification requests.',
    '- Use direct `get_skill` plus `get_guide` before focused motion fixes.',
    '- Prefer the MDS motion classification flow before broad refactors; do not rely on generic framework guidance first for motion tasks.',
    '',
    '## Guardrails',
    '',
    '- Treat `project/` as the source of truth for product intent, style, roadmap, and technical rules.',
    '- Keep route files thin, env secrets server-only, and release work gated by Doctor checks.',
    '- Prefer official Expo/React Native guidance for framework mechanics; MDS adds project memory, checks, defaults, and workflows.',
    '- Do not skip unresolved `# TodoForContext(optional):` markers before implementation.',
    '- When a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.',
    '- For ordinary CLI workflows that do allow fallback, use commands such as `mds doctor`, `mds continue`, and `mds report`.',
    '',
  ].join('\n');
}

async function readWorkspaceVersion() {
  const raw = await readFile(path.join(repoRoot, 'package.json'), 'utf8');
  const parsed = JSON.parse(raw);
  return typeof parsed.version === 'string' && parsed.version.length > 0 ? parsed.version : '0.1.0';
}

function buildClaudePluginManifest(version) {
  return {
    name: 'mr-djs-dev-suite',
    displayName: "Mr. DJ's Dev Suite",
    version,
    description:
      'Expo review, motion audits, Doctor, onboarding, deployment readiness, and project continuation workflows for Claude Code, backed by callable MDS MCP tools.',
    author: {
      name: 'DJ Grimsley',
      url: 'https://davidjgrimsley.com',
    },
    homepage: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
    repository: 'https://github.com/DavidJGrimsley/mrdj-dev-suite',
    license: 'MIT',
    keywords: ['expo', 'react-native', 'mcp', 'doctor', 'claude-code'],
  };
}

function buildClaudeMcpConfig() {
  return {
    mcpServers: {
      [MCP_SERVER_KEY]: {
        command: MDS_MCP_SERVER_BIN,
        args: [],
      },
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCopyContent().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
