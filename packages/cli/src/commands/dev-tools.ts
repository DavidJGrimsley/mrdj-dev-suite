import { execFile } from 'node:child_process';
import { rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import chalk from 'chalk';

const execFileAsync = promisify(execFile);

export interface KillPortArgv {
  ports?: Array<string | number>;
  port?: Array<string | number>;
}

export interface ClearExpoStartArgv {
  path?: string;
  ports?: string;
  start?: boolean;
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export async function runKillPortCommand(argv: KillPortArgv): Promise<void> {
  const ports = normalizePorts([...(argv.ports ?? []), ...(argv.port ?? [])], [8081]);
  const killed = await killPorts(ports);

  console.log(chalk.bold('mrdj kill-port'));
  for (const port of ports) {
    const pids = killed.get(port) ?? [];
    if (pids.length === 0) {
      console.log(chalk.gray(`port ${port}: no listening process found`));
    } else {
      console.log(chalk.green(`port ${port}: killed ${pids.join(', ')}`));
    }
  }
}

export async function runClearExpoStartCommand(argv: ClearExpoStartArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const autoPorts = await shouldIncludeServerPort(projectPath) ? [8081, 3000] : [8081];
  const ports = normalizePorts(argv.ports ? argv.ports.split(',') : [], autoPorts);

  console.log(chalk.bold('mrdj clear-expo-start'));
  console.log(chalk.dim(projectPath));
  console.log();

  const killed = await killPorts(ports);
  for (const port of ports) {
    const pids = killed.get(port) ?? [];
    console.log(
      pids.length > 0
        ? chalk.green(`port ${port}: killed ${pids.join(', ')}`)
        : chalk.gray(`port ${port}: no listening process found`)
    );
  }

  await clearExpoCaches(projectPath);
  console.log(chalk.green('Expo/Metro project caches cleared.'));

  if (argv.start === false) {
    console.log(chalk.gray('Skipping Expo start because --no-start was passed.'));
    return;
  }

  const command = buildExpoStartCommand(await detectPackageManager(projectPath));
  console.log(chalk.cyan(`Starting: ${command}`));
  await runInheritedShellCommand(command, projectPath);
}

async function killPorts(ports: number[]): Promise<Map<number, number[]>> {
  const results = new Map<number, number[]>();
  for (const port of ports) {
    const pids = await findPidsForPort(port);
    const killed: number[] = [];
    for (const pid of pids) {
      if (await killPid(pid)) {
        killed.push(pid);
      }
    }
    results.set(port, killed);
  }
  return results;
}

function normalizePorts(values: Array<string | number>, fallback: number[]): number[] {
  const ports = values
    .flatMap((value) => String(value).split(','))
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0 && value < 65536);

  return Array.from(new Set(ports.length > 0 ? ports : fallback));
}

async function findPidsForPort(port: number): Promise<number[]> {
  if (process.platform === 'win32') {
    return findWindowsPidsForPort(port);
  }

  try {
    const { stdout } = await execFileAsync('lsof', ['-ti', `tcp:${port}`], {
      windowsHide: true,
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((pid) => Number.isInteger(pid));
  } catch {
    return [];
  }
}

async function findWindowsPidsForPort(port: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp'], {
      windowsHide: true,
    });
    const pids = new Set<number>();
    for (const line of stdout.split(/\r?\n/)) {
      const normalized = line.trim().replace(/\s+/g, ' ');
      const parts = normalized.split(' ');
      if (parts.length < 5 || parts[0] !== 'TCP') {
        continue;
      }

      const localAddress = parts[1] ?? '';
      const state = parts[3] ?? '';
      const pid = Number.parseInt(parts[4] ?? '', 10);
      if (state === 'LISTENING' && localAddress.endsWith(`:${port}`) && Number.isInteger(pid)) {
        pids.add(pid);
      }
    }
    return [...pids];
  } catch {
    return [];
  }
}

async function killPid(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await execFileAsync('taskkill', ['/PID', String(pid), '/F'], { windowsHide: true });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

async function clearExpoCaches(projectPath: string): Promise<void> {
  const cachePaths = [
    '.expo',
    '.cache',
    path.join('node_modules', '.cache', 'metro'),
    path.join('node_modules', '.cache', 'babel-loader'),
  ];

  await Promise.all(
    cachePaths.map((cachePath) => rm(path.join(projectPath, cachePath), { recursive: true, force: true }))
  );
}

async function shouldIncludeServerPort(projectPath: string): Promise<boolean> {
  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  const scripts = isRecord(packageJson?.scripts) ? packageJson.scripts : {};
  const hasServerScript = Object.keys(scripts).some((name) =>
    ['server', 'serve', 'web:server', 'dev:server', 'api'].includes(name)
  );
  if (hasServerScript) {
    return true;
  }

  const appJson = await readJson(path.join(projectPath, 'app.json'));
  const output = readNestedString(appJson, ['expo', 'web', 'output']);
  return output === 'server';
}

async function detectPackageManager(projectPath: string): Promise<PackageManager> {
  const packageJson = await readJson(path.join(projectPath, 'package.json'));
  const declared = readString(packageJson?.packageManager);
  if (declared?.startsWith('pnpm@')) return 'pnpm';
  if (declared?.startsWith('yarn@')) return 'yarn';
  if (declared?.startsWith('bun@')) return 'bun';
  if (await fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fileExists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (await fileExists(path.join(projectPath, 'bun.lockb')) || await fileExists(path.join(projectPath, 'bun.lock'))) {
    return 'bun';
  }
  return 'npm';
}

function buildExpoStartCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case 'pnpm':
      return 'pnpm exec expo start --clear';
    case 'yarn':
      return 'yarn expo start --clear';
    case 'bun':
      return 'bunx expo start --clear';
    case 'npm':
      return 'npx expo start --clear';
  }
}

async function runInheritedShellCommand(command: string, cwd: string): Promise<void> {
  const { spawn } = await import('node:child_process');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code ?? 'unknown'}.`));
      }
    });
  });
}

async function readJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function readNestedString(value: Record<string, unknown> | null, keys: string[]): string | undefined {
  let current: unknown = value;
  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }
  return readString(current);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
