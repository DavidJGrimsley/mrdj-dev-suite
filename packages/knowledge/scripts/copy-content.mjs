import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const claudeCodeCommandsDir = path.join(repoRoot, 'plugins', 'claude-code', 'commands');
const skillSource = path.join(source, 'skills');
const skillFiles = await listMarkdownFiles(skillSource);
const knowledgeModule = await loadKnowledgeModule(packageRoot);
const claudePromptSpecs = knowledgeModule.listPromptSpecs('claude-command');

await rm(claudeCodeSkillsDir, { recursive: true, force: true });
await rm(claudeCodeCommandsDir, { recursive: true, force: true });
await mkdir(claudeCodeCommandsDir, { recursive: true });

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

// Generate user-invoked command skills and command docs from canonical prompt specs.
for (const spec of claudePromptSpecs) {
  const prompt = await knowledgeModule.readPromptSpec(spec.id);
  if (!prompt) {
    throw new Error(`[copy-content] Missing prompt content for "${spec.id}".`);
  }

  const fileName = spec.claudeCommandFile;
  if (!fileName) {
    throw new Error(`[copy-content] Missing claudeCommandFile for prompt spec "${spec.id}".`);
  }

  await writeFile(path.join(claudeCodeCommandsDir, fileName), prompt.content, 'utf8');

  const id = path.basename(fileName, '.md');
  const description = prompt.content.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.trim() ?? id;

  const skillDir = path.join(claudeCodeSkillsDir, id);
  await mkdir(skillDir, { recursive: true });

  const skillMd = `---\ndescription: ${description}\ndisable-model-invocation: true\n---\n\n${prompt.content}`;
  await writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');
}

console.log(
  `  generated ${skillFiles.length} knowledge skill dirs and ${claudePromptSpecs.length} command specs`
);

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

async function loadKnowledgeModule(packageRootPath) {
  const distEntry = path.join(packageRootPath, 'dist', 'index.js');
  try {
    return await import(pathToFileURL(distEntry).href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[copy-content] Could not load knowledge catalog at "${distEntry}". Run "pnpm --filter @mrdj/knowledge build" first.\n${detail}`
    );
  }
}
