import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import {
  detectStyleLibrary,
  loadStylistThemeWithDiagnostics,
  resolveStylistContext,
  syncStylistTheme,
  type StyleLibrary,
  type WritePolicy,
} from '../stylist-theme.js';

export interface StylistSyncArgv {
  path?: string;
  inputFile?: string;
  inputJson?: string;
  json?: boolean;
  styleLibrary?: StyleLibrary | 'auto';
  writePolicy?: WritePolicy;
}

export interface StylistReconcileOutputArgv {
  path?: string;
  json?: boolean;
  preferred?: 'static' | 'server' | 'spa' | 'none';
}

export interface StylistEjectArgv {
  path?: string;
  json?: boolean;
  styleLibrary?: StyleLibrary | 'auto';
  writePolicy?: WritePolicy;
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

interface StylistEjectResult {
  projectPath: string;
  styleLibrary: StyleLibrary;
  writePolicy: WritePolicy;
  syncedFiles: string[];
  removedFiles: string[];
  packageJsonUpdated: boolean;
  projectInfoUpdated: boolean;
  webOutputResult: ReconcileStylistWebOutputResult;
  platformsUpdated: boolean;
}

export async function runStylistSyncCommand(argv: StylistSyncArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const payload = await resolvePayload(argv, projectPath);
  const result = await syncStylistTheme(projectPath, payload, {
    styleLibrary: argv.styleLibrary ?? 'auto',
    writePolicy: argv.writePolicy,
  });

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds stylist sync'));
  console.log(chalk.dim(result.projectPath));
  console.log(chalk.green(`Synced ${result.updatedFiles.length} files.`));
  console.log(chalk.dim(`style-library=${result.styleLibrary} write-policy=${result.writePolicy}`));
  for (const filePath of result.updatedFiles) {
    console.log(`- ${path.relative(process.cwd(), filePath)}`);
  }
}

export async function runStylistEjectCommand(argv: StylistEjectArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const loaded = await loadStylistThemeWithDiagnostics(projectPath);
  const theme = loaded.theme;
  const context = await resolveStylistContext(projectPath, {
    styleLibrary: argv.styleLibrary ?? 'auto',
    writePolicy: argv.writePolicy,
  });
  const syncResult = await syncStylistTheme(projectPath, theme, {
    styleLibrary: context.styleLibrary,
    writePolicy: context.writePolicy,
  });

  const removedFiles = await removeStylistArtifacts(projectPath);
  const packageJsonUpdated = await removeStylistOnlyDependencies(projectPath);
  const webOutputResult = await reconcileStylistWebOutput(projectPath);
  const platformsUpdated = await reconcileExpoPlatformsFromProjectInfo(projectPath);
  const projectInfoUpdated = await removeStylistMentionsFromProjectInfo(projectPath);

  const result: StylistEjectResult = {
    projectPath,
    styleLibrary: context.styleLibrary,
    writePolicy: context.writePolicy,
    syncedFiles: syncResult.updatedFiles,
    removedFiles,
    packageJsonUpdated,
    projectInfoUpdated,
    webOutputResult,
    platformsUpdated,
  };

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds stylist eject'));
  console.log(chalk.dim(projectPath));
  console.log(chalk.green(`Synced ${result.syncedFiles.length} files before eject.`));
  if (loaded.diagnostics.source !== 'theme.json') {
    console.log(chalk.yellow(`Theme source fallback used: ${loaded.diagnostics.source}`));
  }
  if (loaded.diagnostics.mismatchDetected) {
    console.log(chalk.yellow('Detected mismatch between project/theme.json and managed block in project/style.md.'));
  }
  console.log(chalk.green(`Removed ${result.removedFiles.length} stylist artifacts.`));
  console.log(chalk.dim(`style-library=${result.styleLibrary} write-policy=${result.writePolicy}`));
  for (const filePath of result.removedFiles) {
    console.log(`- removed ${path.relative(process.cwd(), filePath)}`);
  }
  if (result.packageJsonUpdated) {
    console.log(chalk.green('Updated package.json to remove stylist-only dependencies.'));
  }
  if (result.platformsUpdated) {
    console.log(chalk.green('Updated expo.platforms from project/info.md.'));
  }
  if (result.projectInfoUpdated) {
    console.log(chalk.green('Updated project/info.md to remove Stylist-specific guidance.'));
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
    const filePath = path.resolve(projectPath, argv.inputFile);
    const text = await readFile(filePath, 'utf8');
    return parseJson(text, '--input-file');
  }

  const loaded = await loadStylistThemeWithDiagnostics(projectPath);
  return loaded.theme;
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

async function reconcileExpoPlatformsFromProjectInfo(projectPath: string): Promise<boolean> {
  const appJsonPath = path.join(projectPath, 'app.json');
  const appJsonRaw = await readOptionalText(appJsonPath);
  if (!appJsonRaw) {
    return false;
  }
  const infoRaw = await readOptionalText(path.join(projectPath, 'project', 'info.md'));
  if (!infoRaw) {
    return false;
  }

  const match = infoRaw.match(/-\s*Target platforms:\s*([^\n\r]+)/i);
  if (!match?.[1]) {
    return false;
  }

  const parsedPlatforms = match[1]
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => normalizePlatform(item))
    .filter((item): item is string => Boolean(item));

  if (parsedPlatforms.length === 0) {
    return false;
  }

  let appJson = JSON.parse(appJsonRaw) as unknown;
  if (!isRecord(appJson)) {
    appJson = {};
  }

  const root = appJson as Record<string, unknown>;
  const expo = isRecord(root.expo) ? root.expo : {};
  const existing = Array.isArray(expo.platforms)
    ? expo.platforms.filter((value): value is string => typeof value === 'string')
    : [];

  const deduped = Array.from(new Set(parsedPlatforms));
  if (existing.length === deduped.length && existing.every((value, index) => value === deduped[index])) {
    return false;
  }

  expo.platforms = deduped;
  root.expo = expo;
  await writeFile(appJsonPath, `${JSON.stringify(root, null, 2)}\n`, 'utf8');
  return true;
}

async function removeStylistArtifacts(projectPath: string): Promise<string[]> {
  const candidates = [
    path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'),
    path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'),
    path.join(projectPath, 'app', 'exposition', 'stylist.tsx'),
    path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
    path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'),
    path.join(projectPath, 'project', 'stylist.config.json'),
  ];
  const removed: string[] = [];
  for (const filePath of candidates) {
    if (await pathExists(filePath)) {
      await rm(filePath, { force: true });
      removed.push(filePath);
    }
  }

  await removeLineContaining(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'exposition/stylist');
  await removeLineContaining(path.join(projectPath, 'app', '_layout.tsx'), 'exposition/stylist');
  await removeLineContaining(path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'), '/exposition/stylist');
  await removeLineContaining(path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'), '/exposition/stylist');

  return removed;
}

async function removeStylistOnlyDependencies(projectPath: string): Promise<boolean> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const raw = await readOptionalText(packageJsonPath);
  if (!raw) {
    return false;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    return false;
  }
  let changed = false;

  const deps = isRecord(parsed.dependencies) ? parsed.dependencies : {};
  const stylistOnlyDependencyKeys = new Set(['reanimated-color-picker']);
  for (const key of stylistOnlyDependencyKeys) {
    if (deps[key]) {
      delete deps[key];
      changed = true;
    }
  }
  parsed.dependencies = deps;
  const scripts = isRecord(parsed.scripts) ? parsed.scripts : {};
  for (const scriptKey of ['mds:stylist:sync', 'mds:stylist:reconcile-output']) {
    if (scripts[scriptKey]) {
      delete scripts[scriptKey];
      changed = true;
    }
  }
  parsed.scripts = scripts;

  if (!changed) {
    return false;
  }
  await writeFile(packageJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return true;
}

async function removeStylistMentionsFromProjectInfo(projectPath: string): Promise<boolean> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const raw = await readOptionalText(infoPath);
  if (!raw) {
    return false;
  }
  const lines = raw.split(/\r?\n/);
  const nextLines = lines.filter((line) => !/stylist/i.test(line));
  const next = `${nextLines.join('\n').replace(/\s+$/, '')}\n`;
  if (next === raw) {
    return false;
  }
  await writeFile(infoPath, next, 'utf8');
  return true;
}

async function removeLineContaining(filePath: string, token: string): Promise<void> {
  const raw = await readOptionalText(filePath);
  if (!raw || !raw.includes(token)) {
    return;
  }
  const lines = raw.split(/\r?\n/).filter((line) => !line.includes(token));
  await writeFile(filePath, `${lines.join('\n').replace(/\s+$/, '')}\n`, 'utf8');
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

function normalizePlatform(value: string): string | null {
  switch (value) {
    case 'ios':
    case 'android':
    case 'web':
      return value;
    case 'apple-tv':
    case 'appletv':
      return 'apple-tv';
    default:
      return null;
  }
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

export async function detectProjectStyleLibrary(projectPathInput: string): Promise<StyleLibrary> {
  const projectPath = path.resolve(projectPathInput);
  return detectStyleLibrary(projectPath);
}
