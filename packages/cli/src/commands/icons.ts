import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
  masterIcon?: string;
  package?: {
    directory: string;
    publicIconDirectories?: string[];
    faviconIcoOutput?: string | null;
  } | null;
  outputs?: {
    icon?: string;
    favicon?: string;
  };
  adaptiveIcon?: {
    foreground: string;
    monochrome?: string;
    backgroundColor: string;
  } | null;
}

interface ResolvedIconOutputs {
  icon: string;
  favicon: string;
  adaptiveForeground: string;
  adaptiveMonochrome: string;
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
const PACKAGE_MASTER_ICON_PATH = path.join('ios', 'AppIcon-1024x1024.png');
const PACKAGE_FAVICON_PATH = path.join('web', 'favicon-48x48.png');
const DEFAULT_PACKAGE_PUBLIC_ICON_DIRECTORIES = [path.join('public', 'icons')];
const DEFAULT_PACKAGE_FAVICON_ICO_OUTPUT = path.join('public', 'favicon.ico');
const PACKAGE_ICON_EXTENSIONS = new Set(['.png', '.ico']);

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
  const packagePath = config.package
    ? resolveProjectPath(projectPath, config.package.directory, 'package.directory')
    : null;
  const masterPath = packagePath
    ? path.join(packagePath, PACKAGE_MASTER_ICON_PATH)
    : resolveProjectPath(projectPath, config.masterIcon!, 'masterIcon');
  const packageFaviconPath = packagePath ? path.join(packagePath, PACKAGE_FAVICON_PATH) : null;
  const outputs = resolveIconOutputs(projectPath, config);
  const adaptiveForegroundPath = config.adaptiveIcon
    ? resolveProjectPath(projectPath, config.adaptiveIcon.foreground, 'adaptiveIcon.foreground')
    : null;
  const adaptiveMonochromePath = config.adaptiveIcon?.monochrome
    ? resolveProjectPath(projectPath, config.adaptiveIcon.monochrome, 'adaptiveIcon.monochrome')
    : null;

  const masterIcon = await validatePng(masterPath, 'masterIcon', 1024, 1024);
  if (packageFaviconPath) {
    await validatePng(packageFaviconPath, 'package web favicon', 48, 48);
  }
  if (adaptiveForegroundPath) {
    await validatePng(adaptiveForegroundPath, 'adaptiveIcon.foreground', 1024, 1024);
  }
  if (adaptiveMonochromePath) {
    await validatePng(adaptiveMonochromePath, 'adaptiveIcon.monochrome', 1024, 1024);
  }

  const favicon = resizePng(masterIcon, 48, 48);
  const preparedAppConfig = await prepareAppConfig(projectPath, config, outputs);
  const outputPaths = [outputs.icon, outputs.favicon];

  await mkdir(path.dirname(outputs.icon), { recursive: true });
  await mkdir(path.dirname(outputs.favicon), { recursive: true });
  await copyFile(masterPath, outputs.icon);
  if (packageFaviconPath) {
    await copyFile(packageFaviconPath, outputs.favicon);
  } else {
    await writeFile(outputs.favicon, favicon);
  }

  if (adaptiveForegroundPath) {
    await copyFile(adaptiveForegroundPath, outputs.adaptiveForeground);
    outputPaths.push(outputs.adaptiveForeground);
  }
  if (adaptiveMonochromePath) {
    await copyFile(adaptiveMonochromePath, outputs.adaptiveMonochrome);
    outputPaths.push(outputs.adaptiveMonochrome);
  }
  if (packagePath && config.package) {
    outputPaths.push(
      ...(await copyPackageWebIcons(
        packagePath,
        projectPath,
        config.package.publicIconDirectories,
        config.package.faviconIcoOutput
      ))
    );
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
  if (!isRecord(parsed)) {
    throw new Error('Icon release config must be a JSON object.');
  }

  const masterIcon = isNonEmptyString(parsed.masterIcon) ? parsed.masterIcon : undefined;
  const packageConfig = parseIconPackageConfig(parsed.package);
  if (!masterIcon && !packageConfig) {
    throw new Error('Icon release config must include a masterIcon path or a package directory.');
  }
  const outputs = parseIconOutputConfig(parsed.outputs);

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
    ...(masterIcon ? { masterIcon } : {}),
    ...(packageConfig ? { package: packageConfig } : {}),
    ...(outputs ? { outputs } : {}),
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

function parseIconPackageConfig(value: unknown): IconReleaseConfig['package'] {
  if (value === undefined || value === null) return null;
  if (!isRecord(value) || !isNonEmptyString(value.directory)) {
    throw new Error('Icon release config package requires a non-empty directory path.');
  }
  if (
    value.publicIconDirectories !== undefined &&
    (!Array.isArray(value.publicIconDirectories) ||
      value.publicIconDirectories.some((directory) => !isNonEmptyString(directory)))
  ) {
    throw new Error('Icon release config package.publicIconDirectories must be an array of paths.');
  }
  if (
    value.faviconIcoOutput !== undefined &&
    value.faviconIcoOutput !== null &&
    !isNonEmptyString(value.faviconIcoOutput)
  ) {
    throw new Error('Icon release config package.faviconIcoOutput must be a path or null.');
  }
  return {
    directory: value.directory,
    ...(Array.isArray(value.publicIconDirectories)
      ? { publicIconDirectories: value.publicIconDirectories as string[] }
      : {}),
    ...(isNonEmptyString(value.faviconIcoOutput)
      ? { faviconIcoOutput: value.faviconIcoOutput }
      : value.faviconIcoOutput === null
        ? { faviconIcoOutput: null }
        : {}),
  };
}

function parseIconOutputConfig(value: unknown): IconReleaseConfig['outputs'] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw new Error('Icon release config outputs must be an object.');
  }
  if (value.icon !== undefined && !isNonEmptyString(value.icon)) {
    throw new Error('Icon release config outputs.icon must be a non-empty path.');
  }
  if (value.favicon !== undefined && !isNonEmptyString(value.favicon)) {
    throw new Error('Icon release config outputs.favicon must be a non-empty path.');
  }
  return {
    ...(isNonEmptyString(value.icon) ? { icon: value.icon } : {}),
    ...(isNonEmptyString(value.favicon) ? { favicon: value.favicon } : {}),
  };
}

function resolveIconOutputs(projectPath: string, config: IconReleaseConfig): ResolvedIconOutputs {
  const icon = resolveProjectPath(projectPath, config.outputs?.icon ?? MASTER_OUTPUT_PATH, 'outputs.icon');
  const favicon = resolveProjectPath(
    projectPath,
    config.outputs?.favicon ?? FAVICON_OUTPUT_PATH,
    'outputs.favicon'
  );
  const iconDirectory = path.dirname(icon);
  return {
    icon,
    favicon,
    adaptiveForeground: path.join(iconDirectory, path.basename(ADAPTIVE_FOREGROUND_OUTPUT_PATH)),
    adaptiveMonochrome: path.join(iconDirectory, path.basename(ADAPTIVE_MONOCHROME_OUTPUT_PATH)),
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

async function validatePng(
  sourcePath: string,
  label: string,
  expectedWidth: number,
  expectedHeight: number
): Promise<PNG> {
  let source: PNG;
  try {
    source = PNG.sync.read(await readFile(sourcePath));
  } catch (error) {
    const errorCode = isErrnoException(error) ? error.code : undefined;
    const reason = errorCode === 'ENOENT' ? 'source file does not exist' : 'must be a PNG file';
    throw new Error(`${label} ${reason}: ${sourcePath}`);
  }
  if (source.width !== expectedWidth || source.height !== expectedHeight) {
    throw new Error(
      `${label} must be exactly ${expectedWidth}x${expectedHeight} pixels: ${sourcePath}`
    );
  }
  return source;
}

async function copyPackageWebIcons(
  packagePath: string,
  projectPath: string,
  configuredDirectories: string[] | undefined,
  configuredFaviconIcoOutput: string | null | undefined
): Promise<string[]> {
  const sourceFiles = await collectPackageIconFiles(packagePath);
  const outputPaths: string[] = [];
  const publicDirectories = configuredDirectories ?? DEFAULT_PACKAGE_PUBLIC_ICON_DIRECTORIES;
  for (const directory of publicDirectories) {
    const destinationDirectory = resolveProjectPath(
      projectPath,
      directory,
      'package.publicIconDirectories'
    );
    for (const sourceFile of sourceFiles) {
      const destinationPath = path.join(destinationDirectory, sourceFile.fileName);
      await mkdir(path.dirname(destinationPath), { recursive: true });
      await copyFile(sourceFile.path, destinationPath);
      outputPaths.push(destinationPath);
    }
  }

  const faviconIcoOutput =
    configuredFaviconIcoOutput === null
      ? null
      : resolveProjectPath(
          projectPath,
          configuredFaviconIcoOutput ?? DEFAULT_PACKAGE_FAVICON_ICO_OUTPUT,
          'package.faviconIcoOutput'
        );
  if (faviconIcoOutput) {
    const faviconIcoSource = path.join(packagePath, 'web', 'favicon.ico');
    try {
      await mkdir(path.dirname(faviconIcoOutput), { recursive: true });
      await copyFile(faviconIcoSource, faviconIcoOutput);
      outputPaths.push(faviconIcoOutput);
    } catch (error) {
      const errorCode = isErrnoException(error) ? error.code : undefined;
      if (errorCode !== 'ENOENT') throw error;
    }
  }
  return [...new Set(outputPaths)];
}

async function collectPackageIconFiles(
  packagePath: string
): Promise<Array<{ path: string; fileName: string }>> {
  const result: Array<{ path: string; fileName: string }> = [];
  for (const directoryName of ['pwa', 'web']) {
    const directoryPath = path.join(packagePath, directoryName);
    try {
      const entries = await readdir(directoryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !PACKAGE_ICON_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          continue;
        }
        result.push({ path: path.join(directoryPath, entry.name), fileName: entry.name });
      }
    } catch (error) {
      const errorCode = isErrnoException(error) ? error.code : undefined;
      if (errorCode === 'ENOENT') continue;
      throw error;
    }
  }
  return result;
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
  config: IconReleaseConfig,
  outputs: ResolvedIconOutputs
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
  let changed = setMissingString(expo, 'icon', toExpoAssetPath(projectPath, outputs.icon));
  const web = isRecord(expo.web) ? expo.web : expo.web === undefined ? {} : null;
  if (!web) {
    return { path: null, status: 'incompatible', content: null };
  }
  if (expo.web === undefined) {
    expo.web = web;
    changed = true;
  }
  changed = setMissingString(web, 'favicon', toExpoAssetPath(projectPath, outputs.favicon)) || changed;

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
      setMissingString(
        adaptiveIcon,
        'foregroundImage',
        toExpoAssetPath(projectPath, outputs.adaptiveForeground)
      ) ||
      changed;
    changed =
      setMissingString(adaptiveIcon, 'backgroundColor', config.adaptiveIcon.backgroundColor) ||
      changed;
    if (config.adaptiveIcon.monochrome) {
      changed =
        setMissingString(
          adaptiveIcon,
          'monochromeImage',
          toExpoAssetPath(projectPath, outputs.adaptiveMonochrome)
        ) || changed;
    }
  }

  return {
    path: changed ? appJsonPath : null,
    status: changed ? 'updated' : 'unchanged',
    content: changed ? `${JSON.stringify(parsed, null, 2)}\n` : null,
  };
}

function toExpoAssetPath(projectPath: string, assetPath: string): string {
  return `./${path.relative(projectPath, assetPath).split(path.sep).join('/')}`;
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
