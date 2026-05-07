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

export interface ScanFileOptions {
  projectPath?: string;
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface CommandResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface PackageJson {
  name?: string;
  packageManager?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

