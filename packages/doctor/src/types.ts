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

export interface DoctorTargetMetadata {
  workspacePath: string;
  target: string;
  targetPath: string;
  appId?: string;
  packageName?: string;
  kind?: 'expo' | 'non-expo' | 'shared';
}

export interface DoctorWorkspaceAppReport {
  id: string;
  displayName: string;
  path: string;
  kind: 'expo' | 'non-expo';
  status: 'pass' | 'warn' | 'error' | 'registered';
  report?: DoctorReport;
}

export interface DoctorWorkspaceMetadata {
  name: string;
  displayName: string;
  packageManager: string;
  taskRunner: string;
  apps: DoctorWorkspaceAppReport[];
  sharedPackages: DoctorWorkspacePackageReport[];
}

export interface DoctorWorkspacePackageReport {
  name: string;
  packageName: string;
  path: string;
  role: DoctorSharedWorkspacePackageRole;
}

export type DoctorWorkspacePackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type DoctorWorkspaceAppKind = 'expo' | 'non-expo';
export type DoctorSharedWorkspacePackageRole =
  | 'config'
  | 'ui-theme'
  | 'hooks-state'
  | 'sdk-client'
  | 'database-schema';

export interface DoctorWorkspaceApp {
  id: string;
  displayName: string;
  packageName?: string;
  path: string;
  kind: DoctorWorkspaceAppKind;
  purpose: string;
  platforms?: string[];
  port?: number;
  category?: 'website' | 'backend' | 'worker' | 'other';
  intendedStack?: string;
}

export interface DoctorSharedWorkspacePackage {
  name: string;
  packageName: string;
  path: string;
  role: DoctorSharedWorkspacePackageRole;
}

export interface DoctorWorkspaceManifest {
  schemaVersion: 1;
  name: string;
  displayName: string;
  packageScope: string;
  packageManager: DoctorWorkspacePackageManager;
  expoVersion: string;
  stylingSystem: 'uniwind' | 'nativewind' | 'nativewindui' | 'tamagui' | 'restyle' | 'stylesheet';
  sharedDesignDirection: string;
  taskRunner: 'turbo';
  apps: DoctorWorkspaceApp[];
  sharedPackages: DoctorSharedWorkspacePackage[];
}

export interface DoctorReport {
  projectPath: string;
  scope?: 'project' | 'workspace';
  target?: DoctorTargetMetadata;
  workspace?: DoctorWorkspaceMetadata;
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
  target?: string;
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
