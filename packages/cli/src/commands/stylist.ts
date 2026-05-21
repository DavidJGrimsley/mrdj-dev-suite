import path from 'node:path';

import chalk from 'chalk';

import { loadStylistTheme, syncStylistTheme } from '../stylist-theme.js';

export interface StylistSyncArgv {
  path?: string;
  inputFile?: string;
  inputJson?: string;
  json?: boolean;
}

export async function runStylistSyncCommand(argv: StylistSyncArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const payload = await resolvePayload(argv, projectPath);
  const result = await syncStylistTheme(projectPath, payload);

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds stylist sync'));
  console.log(chalk.dim(result.projectPath));
  console.log(chalk.green(`Synced ${result.updatedFiles.length} files.`));
  for (const filePath of result.updatedFiles) {
    console.log(`- ${path.relative(process.cwd(), filePath)}`);
  }
}

async function resolvePayload(argv: StylistSyncArgv, projectPath: string): Promise<unknown> {
  if (argv.inputJson && argv.inputFile) {
    throw new Error('Choose either --input-json or --input-file, not both.');
  }

  if (argv.inputJson) {
    return parseJson(argv.inputJson, '--input-json');
  }

  if (argv.inputFile) {
    const { readFile } = await import('node:fs/promises');
    const filePath = path.resolve(projectPath, argv.inputFile);
    const text = await readFile(filePath, 'utf8');
    return parseJson(text, '--input-file');
  }

  return loadStylistTheme(projectPath);
}

function parseJson(raw: string, source: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Failed to parse ${source} JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
