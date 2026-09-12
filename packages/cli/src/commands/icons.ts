import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import { PNG } from 'pngjs';

import { discoverWorkspace } from '../workspace/discover.js';

export interface IconsSyncArgv {
  path?: string;
  json?: boolean;
}

export interface IconReleaseSyncResult {
  projectPath: string;
  configPath: string;
  outputPaths: string[];
  appConfigStatus: 'updated' | 'unchanged' | 'missing' | 'dynamic' | 'invalid' | 'incompatible';
}

interface IconReleaseConfig {
  masterIcon: string;
  adaptiveIcon?: {
    foreground: string;
    monochrome?: string;
    backgroundColor: string;
  } | null;
}

interface PreparedAppConfig {
  path: string | null;
  status: IconReleaseSyncResult['appConfigStatus'];
  content: string | null;
}

const ICON_RELEASE_CONFIG_PATH = path.join('project', 'icon-release.json');
const MASTER_OUTPUT_PATH = path.join('assets', 'images', 'icon.png');
const FAVICON_OUTPUT_PATH = path.join('assets', 'images', 'favicon.png');
const ADAPTIVE_FOREGROUND_OUTPUT_PATH = path.join('assets', 'images', 'adaptive-icon.png');
const ADAPTIVE_MONOCHROME_OUTPUT_PATH = path.join(
  'assets',
  'images',
  'adaptive-icon-monochrome.png'
);

export async function runIconsSyncCommand(argv: IconsSyncArgv): Promise<void> {
  const result = await syncIconAssets(path.resolve(argv.path ?? '.'));

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds icons sync'));
  console.log(chalk.dim(result.projectPath));
  for (const outputPath of result.outputPaths) {
    console.log(chalk.green(`Wrote ${path.relative(result.projectPath, outputPath)}`));
  }

  switch (result.appConfigStatus) {
    case 'updated':
      console.log(chalk.green('Updated missing icon references in app.json.'));
      break;
    case 'dynamic':
      console.log(
        chalk.yellow(
          'Detected app.config.*; assets were written, but icon references were not edited automatically.'
        )
      );
      break;
    case 'missing':
      console.log(
        chalk.yellow('No app.json found; assets were written without Expo config changes.')
      );
      break;
    case 'invalid':
      console.log(
        chalk.yellow('app.json is invalid; assets were written without Expo config changes.')
      );
      break;
    case 'incompatible':
      console.log(
        chalk.yellow(
          'app.json has an incompatible Expo config shape; assets were written without config changes.'
        )
      );
      break;
    case 'unchanged':
      console.log(chalk.dim('Existing app.json icon references were kept.'));
      break;
  }
}

export async function syncIconAssets(projectPath: string): Promise<IconReleaseSyncResult> {
  const configPath = await resolveIconReleaseConfigPath(projectPath);
  const config = await readIconReleaseConfig(configPath);
  const masterPath = resolveProjectPath(projectPath, config.masterIcon, 'masterIcon');
  const adaptiveForegroundPath = config.adaptiveIcon
    ? resolveProjectPath(projectPath, config.adaptiveIcon.foreground, 'adaptiveIcon.foreground')
    : null;
  const adaptiveMonochromePath = config.adaptiveIcon?.monochrome
    ? resolveProjectPath(projectPath, config.adaptiveIcon.monochrome, 'adaptiveIcon.monochrome')
    : null;

  const masterIcon = await validateIconSource(masterPath, 'masterIcon');
  if (adaptiveForegroundPath) {
    await validateIconSource(adaptiveForegroundPath, 'adaptiveIcon.foreground');
  }
  if (adaptiveMonochromePath) {
    await validateIconSource(adaptiveMonochromePath, 'adaptiveIcon.monochrome');
  }

  const favicon = resizePng(masterIcon, 48, 48);
  const preparedAppConfig = await prepareAppConfig(projectPath, config);
  const masterOutputPath = path.join(projectPath, MASTER_OUTPUT_PATH);
  const faviconOutputPath = path.join(projectPath, FAVICON_OUTPUT_PATH);
  const outputPaths = [masterOutputPath, faviconOutputPath];

  await mkdir(path.dirname(masterOutputPath), { recursive: true });
  await copyFile(masterPath, masterOutputPath);
  await writeFile(faviconOutputPath, favicon);

  if (adaptiveForegroundPath) {
    const outputPath = path.join(projectPath, ADAPTIVE_FOREGROUND_OUTPUT_PATH);
    await copyFile(adaptiveForegroundPath, outputPath);
    outputPaths.push(outputPath);
  }
  if (adaptiveMonochromePath) {
    const outputPath = path.join(projectPath, ADAPTIVE_MONOCHROME_OUTPUT_PATH);
    await copyFile(adaptiveMonochromePath, outputPath);
    outputPaths.push(outputPath);
  }
  if (preparedAppConfig.path && preparedAppConfig.content) {
    await writeFile(preparedAppConfig.path, preparedAppConfig.content, 'utf8');
  }

  return {
    projectPath,
    configPath,
    outputPaths,
    appConfigStatus: preparedAppConfig.status,
  };
}

async function readIconReleaseConfig(configPath: string): Promise<IconReleaseConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf8');
  } catch {
    throw new Error(
      `Missing icon release config: ${configPath}. Run MDS onboarding or create it with a masterIcon path.`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid icon release config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (!isRecord(parsed) || !isNonEmptyString(parsed.masterIcon)) {
    throw new Error('Icon release config must include a non-empty masterIcon path.');
  }

  const adaptiveIcon = parsed.adaptiveIcon;
  if (adaptiveIcon !== undefined && adaptiveIcon !== null) {
    if (!isRecord(adaptiveIcon) || !isNonEmptyString(adaptiveIcon.foreground)) {
      throw new Error(
        'Icon release config adaptiveIcon requires a non-empty foreground path.'
      );
    }
    if (
      !isNonEmptyString(adaptiveIcon.backgroundColor) ||
      !/^#[0-9a-fA-F]{6}$/u.test(adaptiveIcon.backgroundColor)
    ) {
      throw new Error(
        'Icon release config adaptiveIcon.backgroundColor must be a #RRGGBB color.'
      );
    }
    if (adaptiveIcon.monochrome !== undefined && !isNonEmptyString(adaptiveIcon.monochrome)) {
      throw new Error(
        'Icon release config adaptiveIcon.monochrome must be a non-empty path when supplied.'
      );
    }
  }

  return {
    masterIcon: parsed.masterIcon,
    adaptiveIcon:
      adaptiveIcon && isRecord(adaptiveIcon)
        ? {
            foreground: adaptiveIcon.foreground as string,
            ...(isNonEmptyString(adaptiveIcon.monochrome)
              ? { monochrome: adaptiveIcon.monochrome }
              : {}),
            backgroundColor: adaptiveIcon.backgroundColor as string,
          }
        : null,
  };
}

async function resolveIconReleaseConfigPath(projectPath: string): Promise<string> {
  const workspace = discoverWorkspace(projectPath);
  const workspaceConfigPath = workspace
    ? path.join(workspace.projectPath, 'icon-release.json')
    : null;

  if (workspaceConfigPath && (await pathExists(workspaceConfigPath))) {
    return workspaceConfigPath;
  }

  const standaloneConfigPath = path.join(projectPath, ICON_RELEASE_CONFIG_PATH);
  if (await pathExists(standaloneConfigPath)) {
    return standaloneConfigPath;
  }

  return workspaceConfigPath ?? standaloneConfigPath;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateIconSource(sourcePath: string, label: string): Promise<PNG> {
  let source: PNG;
  try {
    source = PNG.sync.read(await readFile(sourcePath));
  } catch (error) {
    const errorCode = isErrnoException(error) ? error.code : undefined;
    const reason = errorCode === 'ENOENT' ? 'source file does not exist' : 'must be a PNG file';
    throw new Error(`${label} ${reason}: ${sourcePath}`);
  }
  if (source.width !== 1024 || source.height !== 1024) {
    throw new Error(`${label} must be exactly 1024x1024 pixels: ${sourcePath}`);
  }
  return source;
}

function resizePng(source: PNG, width: number, height: number): Buffer {
  const resized = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.floor((y * source.height) / height);
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.floor((x * source.width) / width);
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      source.data.copy(resized.data, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return PNG.sync.write(resized);
}

async function prepareAppConfig(
  projectPath: string,
  config: IconReleaseConfig
): Promise<PreparedAppConfig> {
  const appJsonPath = path.join(projectPath, 'app.json');
  let raw: string;
  try {
    raw = await readFile(appJsonPath, 'utf8');
  } catch {
    return {
      path: null,
      status: (await hasDynamicAppConfig(projectPath)) ? 'dynamic' : 'missing',
      content: null,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { path: null, status: 'invalid', content: null };
  }
  if (!isRecord(parsed) || !isRecord(parsed.expo)) {
    return { path: null, status: 'incompatible', content: null };
  }

  const expo = parsed.expo;
  let changed = setMissingString(expo, 'icon', './assets/images/icon.png');
  const web = isRecord(expo.web) ? expo.web : expo.web === undefined ? {} : null;
  if (!web) {
    return { path: null, status: 'incompatible', content: null };
  }
  if (expo.web === undefined) {
    expo.web = web;
    changed = true;
  }
  changed = setMissingString(web, 'favicon', './assets/images/favicon.png') || changed;

  if (config.adaptiveIcon) {
    const android = isRecord(expo.android) ? expo.android : expo.android === undefined ? {} : null;
    if (!android) {
      return { path: null, status: 'incompatible', content: null };
    }
    if (expo.android === undefined) {
      expo.android = android;
      changed = true;
    }
    const adaptiveIcon = isRecord(android.adaptiveIcon)
      ? android.adaptiveIcon
      : android.adaptiveIcon === undefined
        ? {}
        : null;
    if (!adaptiveIcon) {
      return { path: null, status: 'incompatible', content: null };
    }
    if (android.adaptiveIcon === undefined) {
      android.adaptiveIcon = adaptiveIcon;
      changed = true;
    }
    changed =
      setMissingString(adaptiveIcon, 'foregroundImage', './assets/images/adaptive-icon.png') ||
      changed;
    changed =
      setMissingString(adaptiveIcon, 'backgroundColor', config.adaptiveIcon.backgroundColor) ||
      changed;
    if (config.adaptiveIcon.monochrome) {
      changed =
        setMissingString(
          adaptiveIcon,
          'monochromeImage',
          './assets/images/adaptive-icon-monochrome.png'
        ) || changed;
    }
  }

  return {
    path: changed ? appJsonPath : null,
    status: changed ? 'updated' : 'unchanged',
    content: changed ? `${JSON.stringify(parsed, null, 2)}\n` : null,
  };
}

async function hasDynamicAppConfig(projectPath: string): Promise<boolean> {
  for (const fileName of [
    'app.config.js',
    'app.config.cjs',
    'app.config.mjs',
    'app.config.ts',
    'app.config.json',
  ]) {
    try {
      await access(path.join(projectPath, fileName));
      return true;
    } catch {
      // Try the next supported dynamic config filename.
    }
  }
  return false;
}

function resolveProjectPath(projectPath: string, configuredPath: string, label: string): string {
  if (path.isAbsolute(configuredPath)) {
    throw new Error(`${label} must be relative to the project root.`);
  }
  const resolved = path.resolve(projectPath, configuredPath);
  const relative = path.relative(projectPath, resolved);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the project root.`);
  }
  return resolved;
}

function setMissingString(target: Record<string, unknown>, key: string, value: string): boolean {
  if (target[key] !== undefined) {
    return false;
  }
  target[key] = value;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isErrnoException(value: unknown): value is { code?: string } {
  return isRecord(value) && (value.code === undefined || typeof value.code === 'string');
}
