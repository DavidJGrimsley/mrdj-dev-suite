import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const bundleMap = [
  ['vscode-copilot', 'vscode-copilot'],
  ['claude-code', 'claude-code'],
  ['codex', 'codex'],
];

for (const [sourceName, bundleName] of bundleMap) {
  const sourceDir = path.join(repoRoot, 'plugins', sourceName);
  const destinationDir = path.join(packageRoot, 'bundles', bundleName);

  await rm(destinationDir, { recursive: true, force: true });
  await mkdir(path.dirname(destinationDir), { recursive: true });
  await cp(sourceDir, destinationDir, { recursive: true, force: true });
  console.log(`[copy-agent-bundles] copied ${sourceDir} -> ${destinationDir}`);
}
