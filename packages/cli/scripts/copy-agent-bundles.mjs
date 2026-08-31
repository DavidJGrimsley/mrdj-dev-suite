import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const checkOnly = process.argv.includes('--check');

const bundleMap = [
  ['vscode-copilot', 'vscode-copilot'],
  ['claude-code', 'claude-code'],
  ['codex', 'codex'],
];

let mismatchCount = 0;
for (const [sourceName, bundleName] of bundleMap) {
  const sourceDir = path.join(repoRoot, 'plugins', sourceName);
  const destinationDir = path.join(packageRoot, 'bundles', bundleName);

  if (checkOnly) {
    const mismatches = await compareDirectories(sourceDir, destinationDir);
    if (mismatches.length > 0) {
      mismatchCount += mismatches.length;
      console.error(
        `[copy-agent-bundles] bundle mismatch for ${bundleName}. ` +
          `Run "node packages/cli/scripts/copy-agent-bundles.mjs" and commit the updated bundle files.`
      );
      for (const mismatch of mismatches.slice(0, 10)) {
        console.error(`  - ${mismatch}`);
      }
      if (mismatches.length > 10) {
        console.error(`  - ...and ${mismatches.length - 10} more`);
      }
    }
    continue;
  }

  await rm(destinationDir, { recursive: true, force: true });
  await mkdir(path.dirname(destinationDir), { recursive: true });
  await cp(sourceDir, destinationDir, { recursive: true, force: true });
  console.log(`[copy-agent-bundles] copied ${sourceDir} -> ${destinationDir}`);
}

if (checkOnly) {
  if (mismatchCount > 0) {
    process.exitCode = 1;
  } else {
    console.log('[copy-agent-bundles] bundles are in sync');
  }
}

async function compareDirectories(sourceDir, destinationDir) {
  const [sourceFiles, destinationFiles] = await Promise.all([
    listFiles(sourceDir),
    listFiles(destinationDir),
  ]);

  const mismatches = [];
  const allRelativePaths = new Set([...sourceFiles.keys(), ...destinationFiles.keys()]);
  for (const relativePath of Array.from(allRelativePaths).sort()) {
    const sourcePath = sourceFiles.get(relativePath);
    const destinationPath = destinationFiles.get(relativePath);

    if (!sourcePath) {
      mismatches.push(`extra file in bundle: ${relativePath}`);
      continue;
    }
    if (!destinationPath) {
      mismatches.push(`missing file in bundle: ${relativePath}`);
      continue;
    }

    const [sourceContents, destinationContents] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(destinationPath, 'utf8'),
    ]);
    if (normalizeText(sourceContents) !== normalizeText(destinationContents)) {
      mismatches.push(`different content: ${relativePath}`);
    }
  }

  return mismatches;
}

function normalizeText(contents) {
  return contents.replace(/\r\n?/g, '\n');
}

async function listFiles(rootDir) {
  const files = new Map();
  await walk(rootDir, rootDir, files);
  return files;
}

async function walk(rootDir, currentDir, files) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walk(rootDir, absolutePath, files);
      continue;
    }
    if (entry.isFile()) {
      files.set(path.relative(rootDir, absolutePath).replace(/\\/g, '/'), absolutePath);
    }
  }
}
