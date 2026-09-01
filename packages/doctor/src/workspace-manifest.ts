import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { DoctorWorkspaceManifest } from './types.js';

export const WORKSPACE_MANIFEST_PATH = path.join('project', 'workspace.json');
const I2_WORKSPACE_MANIFEST_PATH = path.join('project', 'mds.workspace.json');

export interface DoctorWorkspaceContext {
  workspacePath: string;
  manifest: DoctorWorkspaceManifest;
  /** Absolute project-memory directory supplied by an initialized I² control plane. */
  controlPlanePath?: string;
}

interface I2WorkspaceManifest {
  projectPath: string;
  repositoryMainFolders: string[];
}

export function normalizeWorkspaceRelativePath(value: string): string {
  const input = value.trim().replace(/\\/gu, '/');
  if (
    !input ||
    input.includes('\0') ||
    path.posix.isAbsolute(input) ||
    path.win32.isAbsolute(input)
  ) {
    throw new Error(`Workspace path must be relative: ${value}`);
  }
  const normalized = path.posix.normalize(input).replace(/^\.\//u, '').replace(/\/$/u, '');
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Workspace path escapes the workspace: ${value}`);
  }
  return normalized;
}

export function resolveWorkspacePath(workspacePath: string, relativePath: string): string {
  const workspace = path.resolve(workspacePath);
  const target = path.resolve(workspace, normalizeWorkspaceRelativePath(relativePath));
  const relation = path.relative(workspace, target);
  if (relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) {
    throw new Error(`Workspace path escapes the workspace: ${relativePath}`);
  }
  return target;
}

export function validateWorkspaceManifest(
  value: unknown
): asserts value is DoctorWorkspaceManifest {
  if (!value || typeof value !== 'object') throw new Error('Workspace plan must be a JSON object.');
  const manifest = value as Partial<DoctorWorkspaceManifest>;
  if (manifest.schemaVersion !== 1) throw new Error('Workspace plan schemaVersion must be 1.');
  if (!manifest.name || slugify(manifest.name) !== manifest.name) {
    throw new Error('Workspace name must be a lowercase product slug.');
  }
  if (!manifest.displayName?.trim()) throw new Error('Workspace displayName is required.');
  const packageScope = normalizePackageScope(manifest.packageScope ?? '');
  if (manifest.packageScope !== packageScope) {
    throw new Error('Workspace packageScope must be lowercase and normalized.');
  }
  if (!['npm', 'pnpm', 'yarn', 'bun'].includes(manifest.packageManager ?? '')) {
    throw new Error('Workspace packageManager must be npm, pnpm, yarn, or bun.');
  }
  if (!manifest.expoVersion?.trim()) throw new Error('Workspace expoVersion is required.');
  if (
    !['uniwind', 'nativewind', 'nativewindui', 'tamagui', 'restyle', 'stylesheet'].includes(
      manifest.stylingSystem ?? ''
    )
  ) {
    throw new Error('Workspace stylingSystem is invalid.');
  }
  if (!manifest.sharedDesignDirection?.trim())
    throw new Error('Workspace sharedDesignDirection is required.');
  if (manifest.taskRunner !== 'turbo') throw new Error('Workspace taskRunner must be turbo.');
  if (!Array.isArray(manifest.apps) || manifest.apps.length < 2) {
    throw new Error('A CESS workspace requires at least two registered apps.');
  }
  if (!manifest.apps.some((app) => app.kind === 'expo')) {
    throw new Error('A CESS workspace requires at least one Expo app.');
  }

  const ids = new Set<string>();
  const paths = new Set<string>();
  const packageNames = new Set<string>();
  const ports = new Set<number>();
  for (const app of manifest.apps) {
    if (!app.displayName?.trim() || !app.purpose?.trim()) {
      throw new Error('Every workspace app requires a displayName and purpose.');
    }
    if (slugify(app.id) !== app.id)
      throw new Error(`Workspace app id must be a lowercase slug: ${app.id}`);
    const expectedPath = `apps/${app.id}`;
    if (normalizeWorkspaceRelativePath(app.path) !== expectedPath) {
      throw new Error(`Workspace app ${app.id} must live at ${expectedPath}.`);
    }
    if (ids.has(app.id) || paths.has(expectedPath))
      throw new Error(`Duplicate workspace app id or path: ${app.id}`);
    ids.add(app.id);
    paths.add(expectedPath);
    if (app.packageName) {
      validateScopedPackageName(app.packageName, manifest.packageScope!);
      if (packageNames.has(app.packageName))
        throw new Error(`Duplicate workspace package name: ${app.packageName}`);
      packageNames.add(app.packageName);
    }
    if (!['expo', 'non-expo'].includes(app.kind))
      throw new Error(`Workspace app ${app.id} has an invalid kind.`);
    if (app.kind === 'expo') {
      if (!Number.isInteger(app.port) || (app.port ?? 0) < 1024 || (app.port ?? 0) > 65535) {
        throw new Error(`Expo app ${app.id} requires a valid development port.`);
      }
      if (ports.has(app.port!)) throw new Error(`Duplicate Expo development port: ${app.port}`);
      ports.add(app.port!);
    }
  }

  if (!Array.isArray(manifest.sharedPackages))
    throw new Error('Workspace sharedPackages must be an array.');
  const roles = new Set(manifest.sharedPackages.map((entry) => entry.role));
  if (!roles.has('config') || !roles.has('ui-theme')) {
    throw new Error('Workspace sharedPackages must include config and ui-theme.');
  }
  const sharedNames = new Set<string>();
  const sharedPaths = new Set<string>();
  for (const sharedPackage of manifest.sharedPackages) {
    const expectedPath = `packages/${sharedPackage.name}`;
    if (
      slugify(sharedPackage.name) !== sharedPackage.name ||
      normalizeWorkspaceRelativePath(sharedPackage.path) !== expectedPath
    ) {
      throw new Error(`Shared package ${sharedPackage.name} must live at ${expectedPath}.`);
    }
    validateScopedPackageName(sharedPackage.packageName, manifest.packageScope!);
    if (sharedPackage.packageName !== `${manifest.packageScope}/${sharedPackage.name}`) {
      throw new Error(`Shared package ${sharedPackage.name} must use the workspace package scope.`);
    }
    if (
      sharedNames.has(sharedPackage.name) ||
      sharedPaths.has(expectedPath) ||
      packageNames.has(sharedPackage.packageName)
    ) {
      throw new Error(`Duplicate shared workspace package: ${sharedPackage.name}`);
    }
    sharedNames.add(sharedPackage.name);
    sharedPaths.add(expectedPath);
    packageNames.add(sharedPackage.packageName);
  }
}

export async function readWorkspaceManifest(
  workspacePath: string
): Promise<DoctorWorkspaceManifest | null> {
  try {
    const value: unknown = JSON.parse(
      await readFile(path.join(workspacePath, WORKSPACE_MANIFEST_PATH), 'utf8')
    );
    validateWorkspaceManifest(value);
    return value;
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Resolve a CESS workspace either from its monorepo checkout or from the root
 * of an initialized I² workspace that contains that checkout.
 */
export async function discoverDoctorWorkspace(
  startPath: string
): Promise<DoctorWorkspaceContext | null> {
  const resolvedStartPath = path.resolve(startPath);
  const directManifest = await readWorkspaceManifest(resolvedStartPath);
  if (directManifest) {
    const controlPlanePath = await findControlPlanePath(resolvedStartPath);
    return {
      workspacePath: resolvedStartPath,
      manifest: directManifest,
      ...(controlPlanePath ? { controlPlanePath } : {}),
    };
  }

  const controlPlane = await readI2WorkspaceManifest(resolvedStartPath);
  if (!controlPlane) return null;

  const candidates: DoctorWorkspaceContext[] = [];
  for (const mainFolder of controlPlane.repositoryMainFolders) {
    const workspacePath = resolveWorkspacePath(resolvedStartPath, mainFolder);
    const manifest = await readWorkspaceManifest(workspacePath);
    if (manifest) {
      candidates.push({
        workspacePath,
        manifest,
        controlPlanePath: resolveWorkspacePath(resolvedStartPath, controlPlane.projectPath),
      });
    }
  }

  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    throw new Error(
      `Multiple CESS monorepos were found in this I² workspace. Run Doctor from one checkout: ${candidates
        .map((candidate) => candidate.workspacePath)
        .join(', ')}`
    );
  }
  return candidates[0] ?? null;
}

async function findControlPlanePath(workspacePath: string): Promise<string | null> {
  for (const candidateRoot of ancestorPaths(path.dirname(path.resolve(workspacePath)))) {
    const manifest = await readI2WorkspaceManifest(candidateRoot);
    if (
      manifest &&
      manifest.repositoryMainFolders.some((mainFolder) =>
        samePath(resolveWorkspacePath(candidateRoot, mainFolder), workspacePath)
      )
    ) {
      return resolveWorkspacePath(candidateRoot, manifest.projectPath);
    }
  }
  return null;
}

async function readI2WorkspaceManifest(workspaceRoot: string): Promise<I2WorkspaceManifest | null> {
  let value: unknown;
  try {
    value = JSON.parse(
      await readFile(path.join(workspaceRoot, I2_WORKSPACE_MANIFEST_PATH), 'utf8')
    );
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return null;
    throw error;
  }

  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Invalid I² workspace manifest: schemaVersion must be 1.');
  }
  if (!Array.isArray(value.repositories) || value.repositories.length === 0) {
    throw new Error('Invalid I² workspace manifest: repositories must be a non-empty array.');
  }

  const repositoryMainFolders = value.repositories.map((repository, index) => {
    if (!isRecord(repository) || typeof repository.mainFolder !== 'string') {
      throw new Error(
        `Invalid I² workspace manifest: repositories[${index}].mainFolder must be a string.`
      );
    }
    return normalizeWorkspaceRelativePath(repository.mainFolder);
  });
  const project = isRecord(value.project) ? value.project : undefined;
  const projectPath = normalizeWorkspaceRelativePath(
    typeof project?.path === 'string' ? project.path : 'project'
  );

  return { projectPath, repositoryMainFolders };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function ancestorPaths(startPath: string): string[] {
  const ancestors: string[] = [];
  let current = path.resolve(startPath);
  let parent = path.dirname(current);
  let reachedFilesystemRoot = false;
  while (!reachedFilesystemRoot) {
    ancestors.push(current);
    reachedFilesystemRoot = parent === current;
    if (!reachedFilesystemRoot) {
      current = parent;
      parent = path.dirname(current);
    }
  }
  return ancestors;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['’]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-');
  if (!slug) throw new Error('Workspace and app names must contain at least one letter or number.');
  return slug;
}

function normalizePackageScope(value: string): string {
  const scope = value.trim().toLowerCase();
  if (!/^@[a-z0-9][a-z0-9._-]*$/u.test(scope))
    throw new Error(`Invalid workspace package scope: ${value}`);
  return scope;
}

function validateScopedPackageName(value: string, scope: string): void {
  if (
    !value.startsWith(`${scope}/`) ||
    !/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u.test(value)
  ) {
    throw new Error(`Workspace package name must use ${scope}: ${value}`);
  }
}
