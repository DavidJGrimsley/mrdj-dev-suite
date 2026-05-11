import path from 'node:path';

import {
  checkAppArchitecture,
  checkEnvHygiene,
  checkExpoConfiguration,
  checkGitignoreEnv,
  checkPackageScripts,
  checkProjectDocs,
  checkSeoMetadata,
  checkStylingDependencies,
  checkTodoForContextMarkers,
  runScriptChecks,
} from './checks/index.js';
import { createReport } from './reporter.js';
import type { DoctorOptions, DoctorReport } from './types.js';
import { pathExists, readPackageJson } from './utils.js';

export type {
  DoctorCheckResult,
  DoctorCheckStatus,
  DoctorMode,
  DoctorOptions,
  DoctorReport,
  PackageJson,
  ScanFileOptions,
} from './types.js';

export { createReport, formatHumanReport, formatJsonReport } from './reporter.js';
export { scanFile } from './scan-file.js';

export async function runDoctor(
  projectPath: string,
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const resolvedProjectPath = path.resolve(projectPath);
  const mode = options.mode ?? 'fast';
  const checks = [];

  if (!(await pathExists(resolvedProjectPath))) {
    checks.push({
      name: 'project path',
      status: 'error' as const,
      message: `Project path does not exist: ${resolvedProjectPath}`,
    });
    return createReport(resolvedProjectPath, mode, checks);
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
    return createReport(resolvedProjectPath, mode, checks);
  }

  checks.push(checkPackageScripts(packageJson, resolvedProjectPath));
  checks.push(checkStylingDependencies(packageJson));
  checks.push(await checkExpoConfiguration(packageJson, resolvedProjectPath));
  checks.push(await checkEnvHygiene(resolvedProjectPath));
  checks.push(await checkAppArchitecture(resolvedProjectPath));
  checks.push(await checkSeoMetadata(resolvedProjectPath));

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
