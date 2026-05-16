import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCodexPluginBundleFromKnowledge } from './generate-codex-plugin.mjs';

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

// Generate plugin skill files in the Claude Code plugin format:
// skills/<skill-id>/SKILL.md with YAML frontmatter extracted from the skill body.
const claudeCodeSkillsDir = path.join(repoRoot, 'plugins', 'claude-code', 'skills');
const skillSource = path.join(source, 'skills');
const skillFiles = await listMarkdownFiles(skillSource);

await rm(claudeCodeSkillsDir, { recursive: true, force: true });

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

// Generate user-invoked command skills from commands-src/ (disable auto-invocation).
// These are generated after knowledge skills so command versions win any name collision.
const commandsSrcDir = path.join(repoRoot, 'plugins', 'claude-code', 'commands-src');
const commandFiles = await listMarkdownFiles(commandsSrcDir).catch(() => []);

for (const filePath of commandFiles) {
  const content = await readFile(filePath, 'utf8');
  const id = path.basename(filePath, '.md');
  const description = content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? id;

  const skillDir = path.join(claudeCodeSkillsDir, id);
  await mkdir(skillDir, { recursive: true });

  const skillMd = `---\ndescription: ${description}\ndisable-model-invocation: true\n---\n\n${content}`;
  await writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
}

console.log(`  generated ${skillFiles.length} knowledge + ${commandFiles.length} command skill dirs → ${path.relative(repoRoot, claudeCodeSkillsDir)}`);

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
