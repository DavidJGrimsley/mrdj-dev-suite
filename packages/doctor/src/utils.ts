import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { CommandResult, PackageJson, PackageManager } from './types.js';

export const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const EXCLUDED_DIRS = new Set([
  '.git',
  '.expo',
  '.turbo',
  'mds',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'temp',
]);

export async function readPackageJson(filePath: string): Promise<PackageJson | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    return {
      name: readString(parsed.name),
      packageManager: readString(parsed.packageManager),
      main: readString(parsed.main),
      scripts: readStringRecord(parsed.scripts),
      dependencies: readStringRecord(parsed.dependencies),
      devDependencies: readStringRecord(parsed.devDependencies),
      mds: isRecord(parsed.mds) ? parsed.mds : undefined,
      reactDoctor: parsed.reactDoctor,
      workspaces: parsed.workspaces,
    };
  } catch {
    return null;
  }
}

export async function findFiles(
  rootPath: string,
  predicate: (filePath: string) => boolean
): Promise<string[]> {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const results: string[] = [];
  const entries = await readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...(await findFiles(filePath, predicate)));
      }
      continue;
    }

    if (entry.isFile() && predicate(filePath)) {
      results.push(filePath);
    }
  }

  return results;
}

export async function firstExistingPath(paths: string[]): Promise<string | null> {
  for (const filePath of paths) {
    if (await pathExists(filePath)) {
      return filePath;
    }
  }
  return null;
}

export async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function pathExistsSyncLike(filePath: string): boolean {
  return existsSync(filePath);
}

export async function detectPackageManager(
  projectPath: string,
  packageJson: PackageJson
): Promise<PackageManager> {
  const declared = packageJson.packageManager ?? '';
  if (declared.startsWith('pnpm@')) return 'pnpm';
  if (declared.startsWith('yarn@')) return 'yarn';
  if (declared.startsWith('bun@')) return 'bun';
  if (declared.startsWith('npm@')) return 'npm';
  if (await pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await pathExists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (await pathExists(path.join(projectPath, 'bun.lockb'))) return 'bun';
  return 'npm';
}

export function parseCommandLine(command: string): { command: string; args: string[] } {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (char === undefined) {
      continue;
    }

    if (quote) {
      if (char === '\\' && index + 1 < command.length) {
        const next = command[index + 1];
        if (next === quote || next === '\\') {
          current += next;
          index += 1;
          continue;
        }
      }

      if (char === quote) {
        quote = null;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/u.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  const executable = tokens[0];
  if (!executable) {
    throw new Error('Command string was empty.');
  }

  return { command: executable, args: tokens.slice(1) };
}

export function resolveShellCommandInvocation(
  command: string,
  platform: typeof process.platform = process.platform,
  commandShell = process.env.ComSpec
): { command: string; args: string[] } {
  if (platform === 'win32') {
    // Package-manager executables are Windows .cmd shims, so invoke cmd.exe explicitly.
    return {
      command: commandShell || 'cmd.exe',
      args: ['/d', '/s', '/c', command],
    };
  }

  return parseCommandLine(command);
}

export async function runShellCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  const { command: executable, args } = resolveShellCommandInvocation(command);

  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, CI: 'true' },
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: CommandResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      finish({ code: null, stdout, stderr, timedOut: true });
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      finish({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim(), timedOut: false });
    });
    child.on('close', (code) => {
      finish({ code, stdout, stderr, timedOut: false });
    });
  });
}

export function buildRunScriptCommand(
  packageManager: PackageManager,
  scriptName: string,
  extraArgs: string[] = []
): string {
  const suffix = extraArgs.length > 0 ? ` ${extraArgs.join(' ')}` : '';

  switch (packageManager) {
    case 'pnpm':
      return `pnpm run ${scriptName}${suffix}`;
    case 'yarn':
      return `yarn ${scriptName}${suffix}`;
    case 'bun':
      return `bun run ${scriptName}${suffix}`;
    case 'npm':
      return `npm run ${scriptName}${suffix}`;
  }
}

export function commandResultToCheck(
  name: string,
  command: string,
  result: CommandResult
): {
  name: string;
  status: 'pass' | 'error';
  message: string;
  details: Record<string, unknown>;
} {
  if (result.code === 0) {
    return {
      name,
      status: 'pass',
      message: `${command} passed.`,
      details: compactCommandOutput(result),
    };
  }

  return {
    name,
    status: 'error',
    message: result.timedOut
      ? `${command} timed out.`
      : `${command} failed with exit code ${result.code ?? 'unknown'}.`,
    details: compactCommandOutput(result),
  };
}

export function compactCommandOutput(result: CommandResult): Record<string, unknown> {
  return {
    code: result.code,
    timedOut: result.timedOut,
    stdout: tail(result.stdout),
    stderr: tail(result.stderr),
  };
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    return typeof entry[1] === 'string';
  });
  return Object.fromEntries(entries);
}

export function readNestedString(
  value: Record<string, unknown> | null,
  keys: string[]
): string | undefined {
  let current: unknown = value;
  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return readString(current);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function tail(output: string, maxLines = 30): string {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

export function relative(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).replace(/\\/g, '/');
}

export function isToolingOrTestPath(projectPath: string, filePath: string): boolean {
  const rel = relative(projectPath, filePath);
  if (/(^|\/)(\.claude|tests|__tests__|fixtures|worktrees|copilotInstructions|\.github|\.vscode)(\/|$)/.test(rel)) {
    return true;
  }
  return /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel);
}
