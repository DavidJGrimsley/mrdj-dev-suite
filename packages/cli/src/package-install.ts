import { spawn } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type PackageDependencyKind = 'runtime' | 'development';
export type PackageInstaller = 'expo' | 'package-manager';

export interface PackageCommandSpec {
  command: string;
  args: string[];
  display: string;
  env?: Record<string, string>;
  shell?: boolean;
  installer?: PackageInstaller;
  kind?: PackageDependencyKind;
  dependencies?: string[];
}

export interface PackageCommandRunnerOptions {
  cwd: string;
  env?: Record<string, string>;
}

export type PackageCommandRunner = (
  command: string,
  args: readonly string[],
  options: PackageCommandRunnerOptions
) => Promise<void>;

export interface InstallOutcome {
  executedCommands: string[];
  pendingCommands: string[];
  skipped: boolean;
}

export interface PackageJsonSubset {
  packageManager?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
}

export class PackageInstallError extends Error {
  readonly display: string;
  readonly cwd: string;
  readonly code: number | null;
  readonly signal: string | null;
  readonly cause?: unknown;

  constructor(input: {
    display: string;
    cwd: string;
    message?: string;
    code?: number | null;
    signal?: string | null;
    cause?: unknown;
  }) {
    const suffix = input.signal
      ? ` with signal ${input.signal}`
      : ` with exit code ${input.code ?? 'unknown'}`;
    super(input.message ?? `${input.display} failed${suffix} in ${input.cwd}.`);
    this.name = 'PackageInstallError';
    this.display = input.display;
    this.cwd = input.cwd;
    this.code = input.code ?? null;
    this.signal = input.signal ?? null;
    this.cause = input.cause;
  }
}

export function shouldInstallProjectDependencies(installDependencies?: boolean): boolean {
  return installDependencies !== false;
}

export function isPackageManager(value: string | undefined): value is PackageManager {
  return value === 'npm' || value === 'pnpm' || value === 'yarn' || value === 'bun';
}

export function quoteCommandArgument(value: string): string {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

export function formatCommandDisplay(command: string, args: readonly string[]): string {
  return [command, ...args].map(quoteCommandArgument).join(' ');
}

export async function detectPackageManager(
  projectPath: string,
  packageJson?: PackageJsonSubset | null
): Promise<PackageManager> {
  const declared = readPackageManagerField(
    packageJson?.packageManager ?? (await readPackageManagerFieldFromDisk(projectPath))
  );
  if (isPackageManager(declared)) {
    return declared;
  }
  if (await pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await pathExists(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (
    (await pathExists(path.join(projectPath, 'bun.lock'))) ||
    (await pathExists(path.join(projectPath, 'bun.lockb')))
  ) {
    return 'bun';
  }
  return 'npm';
}

export function buildLockfileInstallCommand(packageManager: PackageManager): PackageCommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return {
        command: 'pnpm',
        args: ['install', '--config.strict-dep-builds=false', '--ignore-workspace'],
        display: 'pnpm install --config.strict-dep-builds=false --ignore-workspace',
        env: { PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' },
      };
    case 'yarn':
      return {
        command: 'yarn',
        args: ['install'],
        display: 'yarn install',
      };
    case 'bun':
      return {
        command: 'bun',
        args: ['install'],
        display: 'bun install',
      };
    case 'npm':
      return {
        command: 'npm',
        args: ['install'],
        display: 'npm install',
      };
  }
}

export function buildExpoInstallCommand(
  packageManager: PackageManager,
  kind: PackageDependencyKind,
  dependencies: string[]
): PackageCommandSpec {
  const devFlag = kind === 'development' ? ['--dev'] : [];
  switch (packageManager) {
    case 'pnpm':
      return commandSpec(
        'pnpm',
        ['exec', 'expo', 'install', ...devFlag, ...dependencies],
        'expo',
        kind,
        dependencies
      );
    case 'yarn':
      return commandSpec(
        'yarn',
        ['expo', 'install', ...devFlag, ...dependencies],
        'expo',
        kind,
        dependencies
      );
    case 'bun':
      return commandSpec(
        'bunx',
        ['expo', 'install', ...devFlag, ...dependencies],
        'expo',
        kind,
        dependencies
      );
    case 'npm':
      return commandSpec(
        'npx',
        ['expo', 'install', ...devFlag, ...dependencies],
        'expo',
        kind,
        dependencies
      );
  }
}

export function buildAddCommand(
  packageManager: PackageManager,
  kind: PackageDependencyKind,
  dependencies: string[]
): PackageCommandSpec {
  switch (packageManager) {
    case 'pnpm':
      return commandSpec(
        'pnpm',
        ['add', ...(kind === 'development' ? ['--save-dev'] : []), ...dependencies],
        'package-manager',
        kind,
        dependencies
      );
    case 'yarn':
      return commandSpec(
        'yarn',
        ['add', ...(kind === 'development' ? ['--dev'] : []), ...dependencies],
        'package-manager',
        kind,
        dependencies
      );
    case 'bun':
      return commandSpec(
        'bun',
        ['add', ...(kind === 'development' ? ['--dev'] : []), ...dependencies],
        'package-manager',
        kind,
        dependencies
      );
    case 'npm':
      return commandSpec(
        'npm',
        ['install', ...(kind === 'development' ? ['--save-dev'] : []), ...dependencies],
        'package-manager',
        kind,
        dependencies
      );
  }
}

export function parseDependencyName(specification: string): string {
  const trimmed = specification.trim();
  if (trimmed.startsWith('@')) {
    const scoped = /^(@[^/]+\/[^@]+)/u.exec(trimmed);
    return scoped?.[1] ?? trimmed;
  }
  return trimmed.split('@')[0] ?? trimmed;
}

export function collectDeclaredPackageNames(packageJson: PackageJsonSubset | null | undefined): string[] {
  if (!packageJson) {
    return [];
  }
  return [
    ...Object.keys(readDependencyRecord(packageJson.dependencies)),
    ...Object.keys(readDependencyRecord(packageJson.devDependencies)),
  ].sort((left, right) => left.localeCompare(right));
}

export function diffDeclaredPackageNames(
  before: PackageJsonSubset | null | undefined,
  after: PackageJsonSubset | null | undefined
): string[] {
  const previous = new Set(collectDeclaredPackageNames(before));
  return collectDeclaredPackageNames(after).filter((name) => !previous.has(name));
}

export function packageModulePath(projectPath: string, packageName: string): string {
  return path.join(projectPath, 'node_modules', ...packageName.split('/'));
}

export async function validateInstalledPackages(
  projectPath: string,
  packageNames: readonly string[]
): Promise<void> {
  const missing: string[] = [];
  for (const packageName of packageNames) {
    if (!(await pathExists(packageModulePath(projectPath, packageName)))) {
      missing.push(packageName);
    }
  }
  if (missing.length === 0) {
    return;
  }
  throw new PackageInstallError({
    display: `validate installed packages (${missing.join(', ')})`,
    cwd: projectPath,
    code: 1,
    message: [
      `Package install reported success, but these packages are missing from node_modules in ${projectPath}:`,
      missing.map((name) => `- ${name}`).join('\n'),
      'The task is not complete until those packages are installed.',
    ].join('\n'),
  });
}

export function prepareCommandForSpawn(
  spec: PackageCommandSpec,
  {
    platform = process.platform,
    comSpec = process.env.ComSpec,
  }: { platform?: typeof process.platform; comSpec?: string | undefined } = {}
): PackageCommandSpec {
  if (platform !== 'win32' || spec.shell === false) {
    return { ...spec, shell: spec.shell ?? false };
  }

  return {
    ...spec,
    command: comSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', buildWindowsShellCommand(spec.command, spec.args)],
    shell: false,
  };
}

export async function runProjectCommand(
  spec: PackageCommandSpec,
  options: { cwd: string; runner?: PackageCommandRunner }
): Promise<void> {
  const runner = options.runner ?? defaultPackageCommandRunner;
  try {
    await runner(spec.command, spec.args, {
      cwd: options.cwd,
      env: spec.env,
    });
  } catch (error) {
    if (error instanceof PackageInstallError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new PackageInstallError({
      display: spec.display,
      cwd: options.cwd,
      message: `${spec.display} failed in ${options.cwd}: ${message}`,
      cause: error,
    });
  }
}

async function defaultPackageCommandRunner(
  command: string,
  args: readonly string[],
  options: PackageCommandRunnerOptions
): Promise<void> {
  const display = formatCommandDisplay(command, args);
  const spawnSpec = prepareCommandForSpawn({
    command,
    args: [...args],
    display,
    env: options.env,
  });
  await new Promise<void>((resolve, reject) => {
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd: options.cwd,
      shell: spawnSpec.shell ?? false,
      stdio: 'inherit',
      env: spawnSpec.env ? { ...process.env, ...spawnSpec.env } : process.env,
      windowsHide: true,
    });
    child.once('error', (error) => {
      reject(
        new PackageInstallError({
          display,
          cwd: options.cwd,
          cause: error,
          message: `${display} failed in ${options.cwd}: ${error.message}`,
        })
      );
    });
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new PackageInstallError({
          display,
          cwd: options.cwd,
          code,
          signal,
        })
      );
    });
  });
}

function commandSpec(
  command: string,
  args: string[],
  installer: PackageInstaller,
  kind: PackageDependencyKind,
  dependencies: string[]
): PackageCommandSpec {
  return {
    command,
    args,
    display: formatCommandDisplay(command, args),
    installer,
    kind,
    dependencies,
  };
}

function readPackageManagerField(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  return value.trim().split('@')[0];
}

async function readPackageManagerFieldFromDisk(projectPath: string): Promise<unknown> {
  try {
    const raw = await readFile(path.join(projectPath, 'package.json'), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return (parsed as PackageJsonSubset).packageManager;
  } catch {
    return undefined;
  }
}

function readDependencyRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildWindowsShellCommand(command: string, args: string[]): string {
  return [command, ...args].map(quoteWindowsShellArg).join(' ');
}

function quoteWindowsShellArg(value: string): string {
  if (value.length === 0) {
    return '""';
  }
  if (/\r|\n/u.test(value)) {
    throw new Error('Windows shell arguments cannot contain line breaks.');
  }
  const escaped = value.replace(/([()%!^&|<>])/gu, '^$1');
  if (/^[A-Za-z0-9_./:@+=,~-]+$/u.test(escaped)) {
    return escaped;
  }
  return `"${escaped.replace(/"/gu, '""')}"`;
}
