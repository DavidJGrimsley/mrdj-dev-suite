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

