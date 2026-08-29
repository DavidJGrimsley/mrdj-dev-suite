export type DoctorCheckStatus = 'pass' | 'warn' | 'error' | 'skip';
export type DoctorMode = 'fast' | 'ci' | 'full';

export interface DoctorCheckResult {
  name: string;
  status: DoctorCheckStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorModeSelection {
  defaultMode: DoctorMode;
  mode: DoctorMode;
  runScripts: boolean;
  description: string;
  includes: string[];
  skips: string[];
  fullModeGuidance: string;
}

export interface DoctorScoreComponent {
  name: 'mds' | 'react-doctor' | 'expo-doctor';
  label: string;
  score: number;
  weight: number;
  desiredWeight: number;
}

export interface DoctorScoreBreakdown {
  components: DoctorScoreComponent[];
}

export interface DoctorReport {
  projectPath: string;
  timestamp: string;
  mode: DoctorMode;
  selection?: DoctorModeSelection;
  checks: DoctorCheckResult[];
  summary: {
    score: number;
    errors: number;
    warnings: number;
    passed: number;
    skipped: number;
    scoreBreakdown: DoctorScoreBreakdown;
  };
}

export interface DoctorOptions {
  mode?: DoctorMode;
  fix?: boolean;
  runScripts?: boolean;
  timeoutMs?: number;
  selectionDefaultMode?: DoctorMode;
  reactDoctorRunner?: ReactDoctorRunner;
}

export interface ReactDoctorRunnerArgs {
  projectPath: string;
  reportPath: string;
  monorepo: boolean;
  timeoutMs: number;
}

export type ReactDoctorRunner = (args: ReactDoctorRunnerArgs) => Promise<CommandResult>;

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
  mds?: Record<string, unknown>;
  reactDoctor?: unknown;
  workspaces?: unknown;
}
