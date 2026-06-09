import path from 'node:path';

import type { DoctorCheckResult, PackageJson } from '../types.js';
import { findFiles, isRecord, readNestedString, readOptionalText } from '../utils.js';

export async function checkExpoConfiguration(
  packageJson: PackageJson,
  projectPath: string
): Promise<DoctorCheckResult> {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const hasExpoRouter = 'expo-router' in deps;
  const errors: string[] = [];
  const warnings: string[] = [];
  const appJson = await readAppJson(projectPath);
  const platformList = readNestedStringArray(appJson, ['expo', 'platforms']);
  const invalidPlatforms = platformList.filter((platform) => !['ios', 'android', 'web'].includes(platform));

  if (invalidPlatforms.length > 0) {
    errors.push(
      `app.json contains unsupported expo.platforms entries: ${invalidPlatforms.join(
        ', '
      )}. Use only ios, android, and web in Expo config.`
    );
  }

  if (hasExpoRouter && packageJson.main !== 'expo-router/entry') {
    warnings.push('expo-router is installed but package.json main is not expo-router/entry.');
  }

  const apiRouteFiles = await findFiles(projectPath, (filePath) => filePath.endsWith('+api.ts'));
  if (apiRouteFiles.length > 0) {
    const webOutput = readNestedString(appJson, ['expo', 'web', 'output']);
    const targetsWeb = platformList.length === 0 || platformList.includes('web');
    if (targetsWeb && webOutput !== 'server') {
      warnings.push('Expo API routes found, but app.json does not set expo.web.output to "server".');
    }
  }

  if (errors.length > 0) {
    return {
      name: 'expo configuration',
      status: 'error',
      message: 'Expo configuration has schema errors.',
      details: { errors },
    };
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

function readNestedStringArray(
  value: Record<string, unknown> | null,
  pathKeys: string[]
): string[] {
  let current: unknown = value;
  for (const key of pathKeys) {
    if (!isRecord(current) || !(key in current)) {
      return [];
    }
    current = current[key];
  }

  return Array.isArray(current)
    ? current.filter((item): item is string => typeof item === 'string')
    : [];
}
