import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  scanFileAnimationPerformance,
  scanFileAppArchitecture,
  scanFileEnvHygiene,
  scanFileSsrSafety,
} from './checks/index.js';
import { createReport } from './reporter.js';
import type { DoctorReport, ScanFileOptions } from './types.js';
import { pathExists, readPackageJson } from './utils.js';

export async function scanFile(
  filePath: string,
  options: ScanFileOptions = {}
): Promise<DoctorReport> {
  const resolvedFilePath = path.resolve(filePath);
  const projectPath = path.resolve(options.projectPath ?? findProjectRoot(resolvedFilePath));

  if (!(await pathExists(resolvedFilePath))) {
    return createReport(projectPath, 'fast', [
      {
        name: 'file path',
        status: 'error',
        message: `File path does not exist: ${resolvedFilePath}`,
      },
    ]);
  }

  const packageJson = await readPackageJson(path.join(projectPath, 'package.json'));
  const checks = await Promise.all([
    scanFileEnvHygiene(projectPath, resolvedFilePath),
    scanFileSsrSafety(projectPath, resolvedFilePath),
    scanFileAppArchitecture(projectPath, resolvedFilePath, packageJson ?? undefined),
    scanFileAnimationPerformance(projectPath, resolvedFilePath),
  ]);

  return createReport(projectPath, 'fast', checks, false);
}

function findProjectRoot(filePath: string): string {
  let current = path.dirname(filePath);
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return path.dirname(filePath);
}
