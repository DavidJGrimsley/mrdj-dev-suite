import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCommandFiles, generateCodexPluginBundleFromKnowledge } from './generate-codex-plugin.mjs';
import { generateVscodeCopilotBundleFromKnowledge } from './generate-vscode-copilot.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const source = path.join(packageRoot, 'src', 'content');
const destination = path.join(packageRoot, 'dist', 'content');

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
await writeFile(
  path.join(repoRoot, 'plugins', 'claude-code', 'settings.json'),
  `${JSON.stringify({ agent: 'mds' }, null, 2)}\n`,
  'utf8'
);

console.log(`  generated ${skillFiles.length} knowledge + ${commandFiles.length} command skill dirs -> ${path.relative(repoRoot, claudeCodeSkillsDir)}`);

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

function renderClaudeMdsAgent() {
  return [
    '---',
    'name: mds',
    "description: Use for Mr. DJ's Dev Suite Expo project work: Doctor scans, project review, onboarding, deployment readiness, and phase-based continuation.",
    'model: inherit',
    'skills:',
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
    "You are the Mr. DJ's Dev Suite agent for Expo projects. Prefer MDS MCP tools first, then CLI fallbacks.",
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
    '## Guardrails',
    '',
    '- Treat `project/` as the source of truth for product intent, style, roadmap, and technical rules.',
    '- Keep route files thin, env secrets server-only, and release work gated by Doctor checks.',
    '- Prefer official Expo/React Native guidance for framework mechanics; MDS adds project memory, checks, defaults, and workflows.',
    '- Do not skip unresolved `# TodoForContext(optional):` markers before implementation.',
    '- When MCP is unavailable, use CLI fallbacks such as `mds doctor`, `mds continue`, and `mds report`.',
    '',
  ].join('\n');
}
