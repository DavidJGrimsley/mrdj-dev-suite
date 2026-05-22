import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import { loadStylistTheme, syncStylistTheme } from '../stylist-theme.js';

export interface StylistSyncArgv {
  path?: string;
  inputFile?: string;
  inputJson?: string;
  json?: boolean;
}

export interface StylistReconcileOutputArgv {
  path?: string;
  json?: boolean;
  preferred?: 'static' | 'server' | 'spa' | 'none';
}

interface ReconcileStylistWebOutputResult {
  projectPath: string;
  appJsonPath: string | null;
  hasStylistSyncApiRoute: boolean;
  preferredWebOutput: 'static' | 'server' | 'spa' | 'none';
  desiredWebOutput: 'single' | 'static' | 'server';
  previousWebOutput: string | null;
  updated: boolean;
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

export async function runStylistReconcileOutputCommand(argv: StylistReconcileOutputArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const result = await reconcileStylistWebOutput(projectPath, argv.preferred);

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds stylist reconcile-output'));
  console.log(chalk.dim(result.projectPath));
  if (!result.appJsonPath) {
    console.log(chalk.yellow('No app.json found. Skipped web.output reconciliation.'));
    return;
  }

  const action = result.updated ? chalk.green('UPDATED') : chalk.gray('KEPT');
  console.log(`${action} ${path.relative(process.cwd(), result.appJsonPath)}`);
  console.log(
    `web.output ${result.previousWebOutput ?? '(unset)'} -> ${result.desiredWebOutput} (${result.hasStylistSyncApiRoute ? 'Stylist API route present' : 'Stylist API route missing'})`
  );
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

async function reconcileStylistWebOutput(
  projectPath: string,
  preferredOverride?: 'static' | 'server' | 'spa' | 'none'
): Promise<ReconcileStylistWebOutputResult> {
  const appJsonPath = path.join(projectPath, 'app.json');
  const appJsonRaw = await readOptionalText(appJsonPath);
  const preferredWebOutput = preferredOverride ?? (await readPreferredWebOutputFromProjectInfo(projectPath));
  const hasStylistSyncApiRoute = await detectStylistSyncApiRoute(projectPath);
  const desiredWebOutput = hasStylistSyncApiRoute ? 'server' : normalizeExpoWebOutput(preferredWebOutput);

  if (!appJsonRaw) {
    return {
      projectPath,
      appJsonPath: null,
      hasStylistSyncApiRoute,
      preferredWebOutput,
      desiredWebOutput,
      previousWebOutput: null,
      updated: false,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(appJsonRaw) as unknown;
    parsed = isRecord(value) ? value : {};
  } catch {
    return {
      projectPath,
      appJsonPath,
      hasStylistSyncApiRoute,
      preferredWebOutput,
      desiredWebOutput,
      previousWebOutput: null,
      updated: false,
    };
  }

  const expo = isRecord(parsed.expo) ? parsed.expo : undefined;
  if (!expo) {
    return {
      projectPath,
      appJsonPath,
      hasStylistSyncApiRoute,
      preferredWebOutput,
      desiredWebOutput,
      previousWebOutput: null,
      updated: false,
    };
  }

  const web = isRecord(expo.web) ? expo.web : {};
  const previousWebOutput = readString(web.output) ?? null;
  if (previousWebOutput === desiredWebOutput) {
    return {
      projectPath,
      appJsonPath,
      hasStylistSyncApiRoute,
      preferredWebOutput,
      desiredWebOutput,
      previousWebOutput,
      updated: false,
    };
  }

  expo.web = {
    ...web,
    output: desiredWebOutput,
  };

  await writeFile(appJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');

  return {
    projectPath,
    appJsonPath,
    hasStylistSyncApiRoute,
    preferredWebOutput,
    desiredWebOutput,
    previousWebOutput,
    updated: true,
  };
}

async function readPreferredWebOutputFromProjectInfo(
  projectPath: string
): Promise<'static' | 'server' | 'spa' | 'none'> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const raw = await readOptionalText(infoPath);
  if (!raw) {
    return 'static';
  }

  const matched = raw.match(/-\s*Web output:\s*(static|server|spa|none)\b/i);
  const value = matched?.[1]?.toLowerCase();
  if (value === 'server' || value === 'spa' || value === 'none' || value === 'static') {
    return value;
  }

  return 'static';
}

function normalizeExpoWebOutput(value: 'static' | 'server' | 'spa' | 'none'): 'single' | 'static' | 'server' {
  switch (value) {
    case 'server':
      return 'server';
    case 'spa':
      return 'single';
    case 'none':
      return 'static';
    case 'static':
    default:
      return 'static';
  }
}

async function detectStylistSyncApiRoute(projectPath: string): Promise<boolean> {
  const candidates = [
    path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'),
    path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return true;
    }
  }

  return false;
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
