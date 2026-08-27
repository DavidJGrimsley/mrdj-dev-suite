import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const REACT_DOCTOR_PACKAGE = 'react-doctor';
export const REACT_DOCTOR_VERSION = '^0.9.12';
export const REACT_DOCTOR_CONFIG_FILE = 'doctor.config.json';
export const REACT_DOCTOR_SCRIPT_NAME = 'react-doctor';
export const MDS_REACT_DOCTOR_SCRIPT_NAME = 'mds:react-doctor';

export const REACT_DOCTOR_DISABLE_ENV_VARS = [
  'MDS_REACT_DOCTOR',
  'MDS_DISABLE_REACT_DOCTOR',
  'REACT_DOCTOR_DISABLED',
] as const;

export interface ReactDoctorDisableDecision {
  disabled: boolean;
  reason?: string;
}

export interface ReactDoctorCommandInvocation {
  command: string;
  args: string[];
  display: string;
}

export interface BuildReactDoctorCommandOptions {
  directory?: string;
  monorepo?: boolean;
  json?: boolean;
  verbose?: boolean;
  project?: string;
  blocking?: 'error' | 'warning' | 'none';
  extraArgs?: string[];
  noTelemetry?: boolean;
}

export function renderReactDoctorConfig(): string {
  const config = {
    $schema: 'https://react.doctor/schema/config.json',
    ignore: {
      files: [
        '**/node_modules/**',
        '**/.expo/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/android/**',
        '**/ios/**',
        '**/.turbo/**',
      ],
    },
    warnings: true,
    // Advisory by default so quality scans do not block local workflows.
    blocking: 'none',
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}

export function renderReactDoctorReadmeSection(): string {
  return [
    '## React Doctor (code quality checks)',
    '',
    'MDS includes [React Doctor](https://github.com/millionco/react-doctor) by default.',
    'It scans React/React Native code for hooks, performance, architecture, security, and a11y issues.',
    'It is **not** wired into Expo/Metro startup, so it does not slow down `expo start`.',
    '',
    '### Run it',
    '',
    '```bash',
    'mds run react-doctor',
    'npm run react-doctor',
    '```',
    '',
    'In monorepos, `mds run react-doctor` auto-detects workspaces and scans them with `react-doctor -y`.',
    '',
    '### Disable it',
    '',
    'Pick any one:',
    '',
    '1. Environment variable:',
    '   - `MDS_REACT_DOCTOR=0`',
    '   - `MDS_DISABLE_REACT_DOCTOR=1`',
    '   - `REACT_DOCTOR_DISABLED=1`',
    '2. Project config in `package.json`:',
    '   ```json',
    '   {',
    '     "mds": { "reactDoctor": false }',
    '   }',
    '   ```',
    '3. Or:',
    '   ```json',
    '   {',
    '     "reactDoctor": { "enabled": false }',
    '   }',
    '   ```',
    '',
    'Pass `--force` to `mds run react-doctor` to run once even when disabled.',
    '',
  ].join('\n');
}

export function isFalsyEnvFlag(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '0' ||
    normalized === 'false' ||
    normalized === 'off' ||
    normalized === 'no' ||
    normalized === 'disabled' ||
    normalized === 'disable'
  );
}

export function isTruthyEnvFlag(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'on' ||
    normalized === 'yes' ||
    normalized === 'enabled' ||
    normalized === 'enable'
  );
}

export function resolveReactDoctorDisabledFromEnv(
  env: Record<string, string | undefined> = process.env
): ReactDoctorDisableDecision {
  const mdsReactDoctor = env.MDS_REACT_DOCTOR;
  if (isFalsyEnvFlag(mdsReactDoctor)) {
    return { disabled: true, reason: 'MDS_REACT_DOCTOR is set to a falsy value' };
  }

  if (isTruthyEnvFlag(env.MDS_DISABLE_REACT_DOCTOR)) {
    return { disabled: true, reason: 'MDS_DISABLE_REACT_DOCTOR is enabled' };
  }

  if (isTruthyEnvFlag(env.REACT_DOCTOR_DISABLED)) {
    return { disabled: true, reason: 'REACT_DOCTOR_DISABLED is enabled' };
  }

  return { disabled: false };
}

export function resolveReactDoctorDisabledFromPackageJson(
  packageJson: Record<string, unknown> | null | undefined
): ReactDoctorDisableDecision {
  if (!packageJson) {
    return { disabled: false };
  }

  const mds = isRecord(packageJson.mds) ? packageJson.mds : null;
  if (mds && Object.prototype.hasOwnProperty.call(mds, 'reactDoctor')) {
    const value = mds.reactDoctor;
    if (value === false) {
      return { disabled: true, reason: 'package.json mds.reactDoctor is false' };
    }
    if (isRecord(value) && value.enabled === false) {
      return { disabled: true, reason: 'package.json mds.reactDoctor.enabled is false' };
    }
  }

  const reactDoctor = packageJson.reactDoctor;
  if (reactDoctor === false) {
    return { disabled: true, reason: 'package.json reactDoctor is false' };
  }
  if (isRecord(reactDoctor) && reactDoctor.enabled === false) {
    return { disabled: true, reason: 'package.json reactDoctor.enabled is false' };
  }

  return { disabled: false };
}

export async function resolveReactDoctorDisabled(
  projectPath: string,
  env: Record<string, string | undefined> = process.env
): Promise<ReactDoctorDisableDecision> {
  const fromEnv = resolveReactDoctorDisabledFromEnv(env);
  if (fromEnv.disabled) {
    return fromEnv;
  }

  const packageJson = await readOptionalJson(path.join(projectPath, 'package.json'));
  return resolveReactDoctorDisabledFromPackageJson(packageJson);
}

export async function isMonorepoWorkspaceRoot(projectPath: string): Promise<boolean> {
  if (await pathExists(path.join(projectPath, 'pnpm-workspace.yaml'))) {
    return true;
  }

  const packageJson = await readOptionalJson(path.join(projectPath, 'package.json'));
  if (!packageJson) {
    return false;
  }

  const workspaces = packageJson.workspaces;
  if (Array.isArray(workspaces) && workspaces.length > 0) {
    return true;
  }
  if (isRecord(workspaces) && Array.isArray(workspaces.packages) && workspaces.packages.length > 0) {
    return true;
  }

  return false;
}

export function buildReactDoctorCommandInvocation(
  options: BuildReactDoctorCommandOptions = {}
): ReactDoctorCommandInvocation {
  const args = ['react-doctor'];
  const directory = options.directory?.trim();
  if (directory && directory !== '.' && directory !== './') {
    args.push(directory);
  }

  // Non-interactive + monorepo-safe defaults. Does not attach to Expo startup.
  args.push('-y', '--no-telemetry');

  if (options.json) {
    args.push('--json');
  }
  if (options.verbose) {
    args.push('--verbose');
  }
  if (options.project?.trim()) {
    args.push('--project', options.project.trim());
  }
  if (options.blocking) {
    args.push('--blocking', options.blocking);
  }
  if (options.extraArgs?.length) {
    args.push(...options.extraArgs);
  }

  // Prefer local package bin via package manager when available; npx is the portable fallback.
  return {
    command: 'npx',
    args,
    display: ['npx', ...args].join(' '),
  };
}

export function buildReactDoctorPackageScript(): string {
  return 'npx mds run react-doctor';
}

export function buildDirectReactDoctorPackageScript(): string {
  return 'npx react-doctor -y --no-telemetry';
}

export async function ensureReactDoctorConfig(
  projectPath: string,
  force = false
): Promise<{ filePath: string; wrote: boolean }> {
  const filePath = path.join(projectPath, REACT_DOCTOR_CONFIG_FILE);
  if (!force && (await pathExists(filePath))) {
    return { filePath, wrote: false };
  }

  await writeFile(filePath, renderReactDoctorConfig(), 'utf8');
  return { filePath, wrote: true };
}

export async function ensureReactDoctorReadmeSection(
  projectPath: string
): Promise<{ filePath: string; wrote: boolean }> {
  const filePath = path.join(projectPath, 'README.md');
  const existing = await readOptionalText(filePath);
  const section = renderReactDoctorReadmeSection().trimEnd();
  const marker = '## React Doctor (code quality checks)';

  if (!existing) {
    const content = `# App\n\n${section}\n`;
    await writeFile(filePath, content, 'utf8');
    return { filePath, wrote: true };
  }

  if (existing.includes(marker)) {
    return { filePath, wrote: false };
  }

  const next = `${existing.replace(/\s*$/u, '')}\n\n${section}\n`;
  await writeFile(filePath, next, 'utf8');
  return { filePath, wrote: true };
}

async function readOptionalJson(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
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
