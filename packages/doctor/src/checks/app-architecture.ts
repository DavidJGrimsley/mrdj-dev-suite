import path from 'node:path';

import type { DoctorCheckResult, PackageJson } from '../types.js';
import {
  findExpoRouterAppDirs,
  isExpoRouterApiRouteFile,
} from '../expo-router.js';
import { findSsrFindings } from './ssr-safety.js';
import { findFiles, readOptionalText, relative, SOURCE_EXTENSIONS } from '../utils.js';

export async function checkAppArchitecture(
  packageJson: PackageJson,
  projectPath: string
): Promise<DoctorCheckResult> {
  const existingAppDirs = await findExpoRouterAppDirs(projectPath);

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
      return (
        SOURCE_EXTENSIONS.has(extension) &&
        !isExpoRouterApiRouteFile(projectPath, filePath, packageJson)
      );
    });

    for (const filePath of routeFiles) {
      findings.push(...(await scanRouteFileArchitecture(projectPath, filePath)));
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

export async function scanFileAppArchitecture(
  projectPath: string,
  filePath: string,
  packageJson?: PackageJson
): Promise<DoctorCheckResult> {
  if (packageJson && isExpoRouterApiRouteFile(projectPath, filePath, packageJson)) {
    return {
      name: 'app architecture',
      status: 'skip',
      message: 'Expo Router API route files are excluded from route-component architecture checks.',
    };
  }

  const findings = await scanRouteFileArchitecture(projectPath, filePath);
  return findings.length > 0
    ? {
        name: 'app architecture',
        status: 'warn',
        message: 'File has architecture warnings.',
        details: { findings },
      }
    : {
        name: 'app architecture',
        status: 'pass',
        message: 'File passed the architecture scan.',
      };
}

async function scanRouteFileArchitecture(projectPath: string, filePath: string): Promise<string[]> {
  const contents = (await readOptionalText(filePath)) ?? '';
  const findings: string[] = [];
  const lineCount = contents.split(/\r?\n/).length;
  const shortPath = relative(projectPath, filePath);

  if (lineCount > 300) {
    findings.push(`${shortPath}: ${lineCount} lines; consider moving logic into features/services.`);
  }

  if (/\b(from|require\()\s*['"][^'"]*(supabase|drizzle|postgres)/.test(contents)) {
    findings.push(`${shortPath}: imports data-layer code directly from a route component.`);
  }

  findings.push(...findSsrFindings(projectPath, filePath, contents));

  if (/\b(useMutation|useQuery|z\.object|schema\.parse)\b/.test(contents) && lineCount > 180) {
    findings.push(`${shortPath}: mixes heavy data/form logic with a large route file.`);
  }

  return findings;
}

