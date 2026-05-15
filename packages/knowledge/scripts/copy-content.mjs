import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCodexPluginBundleFromKnowledge } from './generate-codex-plugin.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
await generateCodexPluginBundleFromKnowledge({ packageRoot });

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
