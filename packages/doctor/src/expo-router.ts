import path from 'node:path';

import type { PackageJson } from './types.js';
import { findFiles, pathExists, relative } from './utils.js';

const API_ROUTE_EXTENSIONS = new Set(['.ts', '.js']);

export function hasExpoRouterSignal(packageJson: PackageJson): boolean {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return packageJson.main === 'expo-router/entry' || 'expo-router' in deps;
}

export async function findExpoRouterAppDirs(projectPath: string): Promise<string[]> {
  const candidates = [path.join(projectPath, 'app'), path.join(projectPath, 'src', 'app')];
  const existing: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      existing.push(candidate);
    }
  }
  return existing;
}

export function isExpoRouterApiRouteFile(
  projectPath: string,
  filePath: string,
  packageJson: PackageJson
): boolean {
  if (!hasExpoRouterSignal(packageJson)) {
    return false;
  }

  const normalized = relative(projectPath, filePath);
  const inAppRoot = normalized.startsWith('app/') || normalized.startsWith('src/app/');
  if (!inAppRoot) {
    return false;
  }

  const extension = path.extname(filePath);
  if (!API_ROUTE_EXTENSIONS.has(extension)) {
    return false;
  }

  return path.basename(filePath, extension).endsWith('+api');
}

export async function findExpoRouterApiRouteFiles(
  projectPath: string,
  packageJson: PackageJson
): Promise<string[]> {
  if (!hasExpoRouterSignal(packageJson)) {
    return [];
  }

  const appDirs = await findExpoRouterAppDirs(projectPath);
  const files: string[] = [];
  for (const appDir of appDirs) {
    files.push(
      ...(await findFiles(appDir, (filePath) =>
        isExpoRouterApiRouteFile(projectPath, filePath, packageJson)
      ))
    );
  }
  return files;
}

export function isRouteGroupDirName(name: string): boolean {
  return name.startsWith('(') && name.endsWith(')') && name.length > 2;
}

export function isExpoRouterLayoutFile(filePath: string): boolean {
  return /^_layout(?:\.[^.]+)?\.(tsx|ts|jsx|js)$/.test(path.basename(filePath));
}

export function isExpoRouterSpecialFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return basename.startsWith('+') || isExpoRouterLayoutFile(filePath);
}

export function isTestLikeFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /\/__tests__\/|\.test\.|\.spec\./.test(normalized);
}

export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function appRelativePath(appDir: string, filePath: string): string {
  return relative(appDir, filePath);
}

export function routeGroupSegments(appRelative: string): string[] {
  return appRelative.split('/').filter((segment) => isRouteGroupDirName(segment));
}

export function isRootLayoutPath(projectRelative: string): boolean {
  return /^(src\/)?app\/_layout(?:\.[^./]+)?\.(tsx|ts|jsx|js)$/.test(projectRelative);
}
