#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleCandidates = [
  path.resolve(projectRoot, '..', '..', 'packages', 'cli', 'dist', 'stylist-theme.js'),
  path.resolve(projectRoot, '..', 'packages', 'cli', 'dist', 'stylist-theme.js'),
  path.resolve(projectRoot, 'packages', 'cli', 'dist', 'stylist-theme.js'),
  path.resolve(projectRoot, 'node_modules', '@mr.dj2u', 'cli', 'dist', 'stylist-theme.js'),
];

try {
  const modulePath = moduleCandidates.find((candidate) => existsSync(candidate));
  if (!modulePath) {
    console.error('Could not find @mr.dj2u/cli stylist sync module. Run npm install, then retry.');
    process.exit(1);
  }
  const require = createRequire(import.meta.url);
  const inputFile = process.env.MDS_STYLIST_INPUT_FILE
    ? path.resolve(projectRoot, process.env.MDS_STYLIST_INPUT_FILE)
    : path.join(projectRoot, 'project', 'theme.json');
  const styleLibrary = process.env.MDS_STYLIST_STYLE_LIBRARY || 'auto';
  const writePolicy =
    process.env.MDS_STYLIST_WRITE_POLICY === 'overwrite' ? 'overwrite' : 'managed';
  const theme = JSON.parse(await readFile(inputFile, 'utf8'));
  const loaded = require(modulePath);
  const result = await loaded.syncStylistTheme(projectRoot, theme, {
    styleLibrary,
    writePolicy,
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
