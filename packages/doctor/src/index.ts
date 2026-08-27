import path from 'node:path';

import {
  checkAppArchitecture,
  checkAnimationPerformance,
  checkApiSafety,
  checkEnvHygiene,
  checkExpoConfiguration,
  checkGitignoreEnv,
  checkRuntimeSecurity,
  checkPackageScripts,
  checkProjectDocs,
  checkRouterSafety,
  checkSeoMetadata,
  checkStylingDependencies,
  checkTodoForContextMarkers,
  runScriptChecks,
} from './checks/index.js';
import { DEFAULT_DOCTOR_MODE, normalizeDoctorMode } from './modes.js';
import { createReport } from './reporter.js';
import type { DoctorOptions, DoctorReport } from './types.js';
import { pathExists, readPackageJson } from './utils.js';

export type {
  DoctorCheckResult,
  DoctorCheckStatus,
  DoctorMode,
  DoctorModeSelection,
  DoctorOptions,
  DoctorReport,
  PackageJson,
  ScanFileOptions,
} from './types.js';

export {
  DEFAULT_DOCTOR_MODE,
  FULL_MODE_GUIDANCE,
  createModeSelection,
  formatModeHelp,
  normalizeDoctorMode,
} from './modes.js';
export { createReport, formatHumanReport, formatJsonReport } from './reporter.js';
export { scanFile } from './scan-file.js';

export async function runDoctor(
  projectPath: string,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const resolvedProjectPath = path.resolve(projectPath);
  const mode = normalizeDoctorMode(options.mode);
  const runScripts = options.runScripts !== false;
  const selectionDefaultMode = options.selectionDefaultMode ?? DEFAULT_DOCTOR_MODE;
  const checks = [];

  if (!(await pathExists(resolvedProjectPath))) {
    checks.push({
      name: 'project path',
      status: 'error' as const,
      message: `Project path does not exist: ${resolvedProjectPath}`,
    });
    return createReport(resolvedProjectPath, mode, checks, runScripts, selectionDefaultMode);
  }

  const packageJsonPath = path.join(resolvedProjectPath, 'package.json');
  const packageJson = await readPackageJson(packageJsonPath);

  checks.push(await checkProjectDocs(resolvedProjectPath));
  checks.push(await checkTodoForContextMarkers(resolvedProjectPath));
  checks.push(await checkGitignoreEnv(resolvedProjectPath));

  if (!packageJson) {
    checks.push({
      name: 'package.json',
      status: 'warn' as const,
      message: 'No package.json found; package scripts and dependency checks were skipped.',
    });
    return createReport(resolvedProjectPath, mode, checks, runScripts, selectionDefaultMode);
  }

  checks.push(checkPackageScripts(packageJson, resolvedProjectPath));
  checks.push(checkStylingDependencies(packageJson));
  checks.push(await checkExpoConfiguration(packageJson, resolvedProjectPath));
  checks.push(await checkEnvHygiene(resolvedProjectPath));
  checks.push(await checkRuntimeSecurity(resolvedProjectPath));
  checks.push(await checkAppArchitecture(packageJson, resolvedProjectPath));
  checks.push(await checkRouterSafety(resolvedProjectPath));
  checks.push(await checkApiSafety(packageJson, resolvedProjectPath));
  checks.push(await checkAnimationPerformance(resolvedProjectPath));
  checks.push(await checkSeoMetadata(resolvedProjectPath));

  checks.push(
    ...(await runScriptChecks({
      packageJson,
      projectPath: resolvedProjectPath,
      mode,
      fix: options.fix ?? false,
      runScripts,
      timeoutMs: options.timeoutMs ?? 120_000,
      reactDoctorRunner: options.reactDoctorRunner,
    }))
  );

  return createReport(resolvedProjectPath, mode, checks, runScripts, selectionDefaultMode);
}

export async function fixDoctor(
  projectPath: string,
  options: Omit<DoctorOptions, 'fix'> = {}
): Promise<DoctorReport> {
  return runDoctor(projectPath, { ...options, fix: true });
}
