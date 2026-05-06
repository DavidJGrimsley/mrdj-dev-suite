import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

export type DoctorCheckStatus = 'pass' | 'warn' | 'error' | 'skip';
export type DoctorMode = 'fast' | 'ci' | 'full';

export interface DoctorCheckResult {
  name: string;
  status: DoctorCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorReport {
  projectPath: string;
  timestamp: string;
  mode: DoctorMode;
  checks: DoctorCheckResult[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
    skipped: number;
  };
}

export interface DoctorOptions {
  mode?: DoctorMode;
  fix?: boolean;
  runScripts?: boolean;
  timeoutMs?: number;
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

interface PackageJson {
  name?: string;
  packageManager?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const EXCLUDED_DIRS = new Set([
  '.git',
  '.expo',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'temp',
]);

export async function runDoctor(
  projectPath: string,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const resolvedProjectPath = path.resolve(projectPath);
  const mode = options.mode ?? 'fast';
  const checks: DoctorCheckResult[] = [];

  if (!(await pathExists(resolvedProjectPath))) {
    checks.push({
      name: 'project path',
      status: 'error',
      message: `Project path does not exist: ${resolvedProjectPath}`,
    });
    return createReport(resolvedProjectPath, mode, checks);
  }

  const packageJsonPath = path.join(resolvedProjectPath, 'package.json');
  const packageJson = await readPackageJson(packageJsonPath);

  checks.push(await checkProjectDocs(resolvedProjectPath));
  checks.push(await checkGitignoreEnv(resolvedProjectPath));

  if (!packageJson) {
    checks.push({
      name: 'package.json',
      status: 'warn',
      message: 'No package.json found; package scripts and dependency checks were skipped.',
    });
    return createReport(resolvedProjectPath, mode, checks);
  }

  checks.push(checkPackageScripts(packageJson, resolvedProjectPath));
  checks.push(checkStylingDependencies(packageJson));
  checks.push(await checkExpoConfiguration(packageJson, resolvedProjectPath));
  checks.push(await checkEnvHygiene(resolvedProjectPath));
  checks.push(await checkAppArchitecture(resolvedProjectPath));

  if (options.runScripts !== false) {
    checks.push(
      ...(await runScriptChecks({
        packageJson,
        projectPath: resolvedProjectPath,
        mode,
        fix: options.fix ?? false,
        timeoutMs: options.timeoutMs ?? 120_000,
      }))
    );
  }

  return createReport(resolvedProjectPath, mode, checks);
}

export async function fixDoctor(
  projectPath: string,
  options: Omit<DoctorOptions, 'fix'> = {}
): Promise<DoctorReport> {
  return runDoctor(projectPath, { ...options, fix: true });
}

async function readPackageJson(filePath: string): Promise<PackageJson | null> {
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
    };
  } catch {
    return null;
  }
}

async function checkProjectDocs(projectPath: string): Promise<DoctorCheckResult> {
  const projectDir = path.join(projectPath, 'project');
  const docs = [
    { label: 'info.md', paths: [path.join(projectDir, 'info.md')], required: true },
    {
      label: 'todo.md',
      paths: [path.join(projectDir, 'todo.md'), path.join(projectDir, 'TODO.md')],
      required: true,
    },
    { label: 'style.md', paths: [path.join(projectDir, 'style.md')], required: false },
  ];

  const missing: string[] = [];
  const empty: string[] = [];

  for (const doc of docs) {
    const filePath = await firstExistingPath(doc.paths);
    if (!filePath) {
      if (doc.required) {
        missing.push(doc.label);
      }
      continue;
    }

    const contents = await readFile(filePath, 'utf8');
    if (contents.trim().length === 0) {
      empty.push(doc.label);
    }
  }

  if (missing.length > 0 || empty.length > 0) {
    return {
      name: 'project docs',
      status: 'warn',
      message: 'Project memory files need attention.',
      details: { missing, empty },
    };
  }

  return {
    name: 'project docs',
    status: 'pass',
    message: 'project/info.md and project/todo.md are present and non-empty.',
  };
}

async function checkGitignoreEnv(projectPath: string): Promise<DoctorCheckResult> {
  const gitignorePath = path.join(projectPath, '.gitignore');
  const envPath = path.join(projectPath, '.env');

  if (!(await pathExists(envPath))) {
    return {
      name: 'gitignore env safety',
      status: 'pass',
      message: 'No root .env file found.',
    };
  }

  const gitignore = (await readOptionalText(gitignorePath)) ?? '';
  const ignoresEnv = gitignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === '.env' || line === '.env.*' || line === '*.env');

  return ignoresEnv
    ? {
        name: 'gitignore env safety',
        status: 'pass',
        message: '.env is ignored by git.',
      }
    : {
        name: 'gitignore env safety',
        status: 'error',
        message: 'Root .env exists but .gitignore does not ignore it.',
      };
}

function checkPackageScripts(
  packageJson: PackageJson,
  projectPath: string
): DoctorCheckResult {
  const scripts = packageJson.scripts ?? {};
  const expectedScriptGroups = {
    lint: ['lint'],
    typecheck: ['typecheck', 'type-check', 'check'],
    test: ['test', 'test:ci'],
    doctor: ['doctor'],
    build: ['build:web:deploy', 'build:web', 'build'],
  };

  const missing = Object.entries(expectedScriptGroups)
    .filter(([, candidates]) => !candidates.some((script) => script in scripts))
    .map(([label]) => label);

  const missingScriptTargets = findMissingNodeScriptTargets(scripts, projectPath);

  if (missingScriptTargets.length > 0) {
    return {
      name: 'package scripts',
      status: 'error',
      message: 'One or more package scripts reference files that do not exist.',
      details: { missing, missingScriptTargets },
    };
  }

  if (missing.length > 0) {
    return {
      name: 'package scripts',
      status: 'warn',
      message: 'Some recommended scripts are missing.',
      details: { missing },
    };
  }

  return {
    name: 'package scripts',
    status: 'pass',
    message: 'Recommended package scripts are present.',
  };
}

function findMissingNodeScriptTargets(
  scripts: Record<string, string>,
  projectPath: string
): string[] {
  const missingTargets: string[] = [];
  const nodeFilePattern = /\bnode\s+(?!-e\b)(["']?)([^\s"'&|;]+)\1/g;

  for (const [scriptName, command] of Object.entries(scripts)) {
    for (const match of command.matchAll(nodeFilePattern)) {
      const target = match[2];
      if (!target || target.startsWith('-') || target.includes('$')) {
        continue;
      }

      const normalizedTarget = target.replace(/\\/g, path.sep);
      const targetPath = path.resolve(projectPath, normalizedTarget);
      if (!pathExistsSyncLike(targetPath)) {
        missingTargets.push(`${scriptName}: ${target}`);
      }
    }
  }

  return missingTargets;
}

function checkStylingDependencies(packageJson: PackageJson): DoctorCheckResult {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const hasUniwind = 'uniwind' in deps;
  const hasNativeWind = 'nativewind' in deps;

  if (hasUniwind && hasNativeWind) {
    return {
      name: 'styling stack',
      status: 'warn',
      message: 'Both Uniwind and NativeWind are installed; prefer one styling adapter.',
    };
  }

  if (hasNativeWind && !hasUniwind) {
    return {
      name: 'styling stack',
      status: 'warn',
      message: 'NativeWind detected. MrDJ suite defaults new projects to Uniwind.',
    };
  }

  if (hasUniwind) {
    return {
      name: 'styling stack',
      status: 'pass',
      message: 'Uniwind detected.',
    };
  }

  return {
    name: 'styling stack',
    status: 'skip',
    message: 'No Uniwind or NativeWind dependency detected.',
  };
}

async function checkExpoConfiguration(
  packageJson: PackageJson,
  projectPath: string
): Promise<DoctorCheckResult> {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const hasExpoRouter = 'expo-router' in deps;
  const warnings: string[] = [];

  if (hasExpoRouter && packageJson.main !== 'expo-router/entry') {
    warnings.push('expo-router is installed but package.json main is not expo-router/entry.');
  }

  const apiRouteFiles = await findFiles(projectPath, (filePath) => filePath.endsWith('+api.ts'));
  if (apiRouteFiles.length > 0) {
    const appJson = await readAppJson(projectPath);
    const webOutput = readNestedString(appJson, ['expo', 'web', 'output']);
    if (webOutput !== 'server') {
      warnings.push('Expo API routes found, but app.json does not set expo.web.output to "server".');
    }
  }

  if (warnings.length > 0) {
    return {
      name: 'expo configuration',
      status: 'warn',
      message: 'Expo configuration has production-readiness warnings.',
      details: { warnings },
    };
  }

  return {
    name: 'expo configuration',
    status: hasExpoRouter || apiRouteFiles.length > 0 ? 'pass' : 'skip',
    message:
      hasExpoRouter || apiRouteFiles.length > 0
        ? 'Expo Router configuration looks consistent.'
        : 'No Expo Router signals detected.',
  };
}

async function checkEnvHygiene(projectPath: string): Promise<DoctorCheckResult> {
  const envFiles = await findFiles(projectPath, (filePath) => {
    const basename = path.basename(filePath);
    return basename === '.env' || basename.startsWith('.env.');
  });
  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  const publicSecretPattern =
    /\bEXPO_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN|STRIPE_SECRET)[A-Z0-9_]*\b/g;
  const findings: string[] = [];

  for (const filePath of [...envFiles, ...sourceFiles]) {
    const contents = await readOptionalText(filePath);
    if (!contents) {
      continue;
    }

    const matches = [...new Set([...contents.matchAll(publicSecretPattern)].map((m) => m[0]))];
    for (const match of matches) {
      findings.push(`${relative(projectPath, filePath)}: ${match}`);
    }
  }

  if (findings.length > 0) {
    return {
      name: 'env hygiene',
      status: 'error',
      message: 'Secret-looking EXPO_PUBLIC variables were found.',
      details: { findings: findings.slice(0, 25), truncated: findings.length > 25 },
    };
  }

  return {
    name: 'env hygiene',
    status: 'pass',
    message: 'No secret-looking EXPO_PUBLIC variables found.',
  };
}

async function checkAppArchitecture(projectPath: string): Promise<DoctorCheckResult> {
  const appDirs = [path.join(projectPath, 'app'), path.join(projectPath, 'src', 'app')];
  const existingAppDirs = [];

  for (const appDir of appDirs) {
    if (await pathExists(appDir)) {
      existingAppDirs.push(appDir);
    }
  }

  if (existingAppDirs.length === 0) {
    return {
      name: 'app architecture',
      status: 'skip',
      message: 'No Expo Router app directory found.',
    };
  }

  const findings: string[] = [];
  for (const appDir of existingAppDirs) {
    const routeFiles = await findFiles(appDir, (filePath) => {
      const extension = path.extname(filePath);
      return SOURCE_EXTENSIONS.has(extension) && !filePath.endsWith('+api.ts');
    });

    for (const filePath of routeFiles) {
      const contents = (await readOptionalText(filePath)) ?? '';
      const lineCount = contents.split(/\r?\n/).length;
      const shortPath = relative(projectPath, filePath);

      if (lineCount > 300) {
        findings.push(`${shortPath}: ${lineCount} lines; consider moving logic into features/services.`);
      }

      if (/\b(from|require\()\s*['"][^'"]*(supabase|drizzle|postgres)/.test(contents)) {
        findings.push(`${shortPath}: imports data-layer code directly from a route component.`);
      }

      if (/\b(window|document|localStorage|sessionStorage|navigator)\b/.test(contents)) {
        findings.push(`${shortPath}: uses browser globals; verify SSR/client-only guards.`);
      }
    }
  }

  if (findings.length > 0) {
    return {
      name: 'app architecture',
      status: 'warn',
      message: 'Expo Router route files have architecture warnings.',
      details: { findings: findings.slice(0, 50), truncated: findings.length > 50 },
    };
  }

  return {
    name: 'app architecture',
    status: 'pass',
    message: 'Route files passed the first-pass architecture scan.',
  };
}

async function runScriptChecks(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  fix: boolean;
  timeoutMs: number;
}): Promise<DoctorCheckResult[]> {
  const scripts = args.packageJson.scripts ?? {};
  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const hasExpo = Boolean(args.packageJson.dependencies?.expo ?? args.packageJson.devDependencies?.expo);
  const checks: DoctorCheckResult[] = [];

  const scriptPlan = [
    {
      label: 'lint',
      candidates: ['lint'],
      required: true,
      extraArgs: args.fix ? ['--', '--fix'] : [],
    },
    {
      label: 'typecheck',
      candidates: ['typecheck', 'type-check', 'check'],
      required: true,
      extraArgs: [],
    },
    {
      label: 'tests',
      candidates: ['test', 'test:ci'],
      required: args.mode !== 'fast',
      extraArgs: [],
    },
    {
      label: 'expo doctor',
      candidates: hasExpo && args.mode !== 'fast' ? ['doctor'] : [],
      required: hasExpo && args.mode !== 'fast',
      extraArgs: [],
    },
    {
      label: 'production build',
      candidates:
        args.mode === 'full'
          ? ['build:web:deploy', 'build:web', 'build']
          : args.mode === 'ci'
            ? ['build:web:deploy', 'build']
            : [],
      required: args.mode !== 'fast',
      extraArgs: [],
    },
  ];

  for (const item of scriptPlan) {
    if (item.candidates.length === 0) {
      continue;
    }

    const scriptName = item.candidates.find((candidate) => candidate in scripts);
    if (!scriptName) {
      if (item.required) {
        checks.push({
          name: item.label,
          status: 'warn',
          message: `No package script found for ${item.label}.`,
          details: { candidates: item.candidates },
        });
      }
      continue;
    }

    const command = buildRunScriptCommand(packageManager, scriptName, item.extraArgs);
    const result = await runShellCommand(command, args.projectPath, args.timeoutMs);
    checks.push(commandResultToCheck(item.label, command, result));
  }

  return checks;
}

function commandResultToCheck(
  name: string,
  command: string,
  result: CommandResult
): DoctorCheckResult {
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

function compactCommandOutput(result: CommandResult): Record<string, unknown> {
  return {
    code: result.code,
    timedOut: result.timedOut,
    stdout: tail(result.stdout),
    stderr: tail(result.stderr),
  };
}

function buildRunScriptCommand(
  packageManager: PackageManager,
  scriptName: string,
  extraArgs: string[]
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

async function runShellCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
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

async function detectPackageManager(
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

async function readAppJson(projectPath: string): Promise<Record<string, unknown> | null> {
  const appJsonPath = path.join(projectPath, 'app.json');
  const raw = await readOptionalText(appJsonPath);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function findFiles(
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

async function firstExistingPath(paths: string[]): Promise<string | null> {
  for (const filePath of paths) {
    if (await pathExists(filePath)) {
      return filePath;
    }
  }
  return null;
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

function pathExistsSyncLike(filePath: string): boolean {
  return existsSync(filePath);
}

function createReport(
  projectPath: string,
  mode: DoctorMode,
  checks: DoctorCheckResult[]
): DoctorReport {
  return {
    projectPath,
    timestamp: new Date().toISOString(),
    mode,
    checks,
    summary: {
      errors: checks.filter((check) => check.status === 'error').length,
      warnings: checks.filter((check) => check.status === 'warn').length,
      passed: checks.filter((check) => check.status === 'pass').length,
      skipped: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    return typeof entry[1] === 'string';
  });
  return Object.fromEntries(entries);
}

function readNestedString(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tail(output: string, maxLines = 30): string {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

function relative(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).replace(/\\/g, '/');
}
