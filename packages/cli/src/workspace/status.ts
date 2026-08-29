import fs from 'node:fs';
import path from 'node:path';

import { discoverWorkspace } from './discover.js';
import { inspectGitRepository, listGitWorktrees } from './git.js';
import { SOURCE_WORKSPACE_LINK_PATH, WORKSPACE_WORKTREE_REGISTRY_FILENAME, parseSourceWorkspaceLink, parseWorkspaceWorktreeRegistry } from './schema.js';

import type { GitRepositoryStatus, GitWorktreeInfo } from './git.js';
import type { WorkspaceRepositoryConfig, WorkspaceWorktreeRegistry } from './schema.js';

export interface WorkspaceRepositoryStatus {
  config: WorkspaceRepositoryConfig;
  mainPath: string;
  git: GitRepositoryStatus;
  worktrees: GitWorktreeInfo[];
}

export interface WorkspaceStatus {
  found: true;
  workspaceId: string;
  name: string;
  workspaceRoot: string;
  projectPath: string;
  manifestPath: string;
  projectGit: GitRepositoryStatus;
  repositories: WorkspaceRepositoryStatus[];
  tempPath: string;
  tempExists: boolean;
  generatedPath: string;
  generatedExists: boolean;
  registry?: WorkspaceWorktreeRegistry;
  integrityIssues: string[];
}

export interface WorkspaceNotFoundStatus {
  found: false;
  startedFrom: string;
}

export type WorkspaceStatusResult = WorkspaceStatus | WorkspaceNotFoundStatus;

function resolveRegistryPath(workspaceRoot: string, entryPath: string): string {
  return path.resolve(path.isAbsolute(entryPath) ? entryPath : path.join(workspaceRoot, entryPath));
}

function pathKey(value: string): string {
  return path.resolve(value).toLowerCase();
}

export function getWorkspaceStatus(
  startPath = '.',
  options: { fetch?: boolean } = {}
): WorkspaceStatusResult {
  const workspace = discoverWorkspace(startPath);
  if (!workspace) {
    return { found: false, startedFrom: path.resolve(startPath) };
  }

  const integrityIssues: string[] = [];
  const registryPath = path.join(workspace.projectPath, WORKSPACE_WORKTREE_REGISTRY_FILENAME);
  let registry: WorkspaceWorktreeRegistry | undefined;
  if (!fs.existsSync(registryPath)) {
    integrityIssues.push(`Missing worktree registry: ${registryPath}`);
  } else {
    try {
      registry = parseWorkspaceWorktreeRegistry(JSON.parse(fs.readFileSync(registryPath, 'utf8')) as unknown);
      if (registry.workspaceId !== workspace.manifest.workspaceId) {
        integrityIssues.push('Worktree registry workspaceId does not match the manifest.');
      }
    } catch (error) {
      integrityIssues.push(error instanceof Error ? error.message : String(error));
    }
  }

  const repositories = workspace.manifest.repositories.map((config) => {
    const mainPath = path.resolve(workspace.workspaceRoot, config.mainFolder);
    const worktrees = listGitWorktrees(mainPath);
    if (!worktrees.some((worktree) => path.resolve(worktree.path) === mainPath)) {
      integrityIssues.push(`Missing normalized main checkout: ${mainPath}`);
    }
    for (const worktree of worktrees) {
      if (worktree.prunable) integrityIssues.push(`Prunable worktree registration: ${worktree.path}`);
      if (!fs.existsSync(worktree.path)) integrityIssues.push(`Missing registered worktree path: ${worktree.path}`);
      const linkPath = path.join(worktree.path, SOURCE_WORKSPACE_LINK_PATH);
      if (!fs.existsSync(linkPath)) {
        integrityIssues.push(`Missing workspace link: ${linkPath}`);
      } else {
        try {
          const link = parseSourceWorkspaceLink(JSON.parse(fs.readFileSync(linkPath, 'utf8')) as unknown);
          if (link.workspaceId !== workspace.manifest.workspaceId) integrityIssues.push(`Workspace link mismatch: ${linkPath}`);
        } catch {
          integrityIssues.push(`Invalid workspace link: ${linkPath}`);
        }
      }
    }
    if (registry) {
      const registryEntries = registry.worktrees.filter((entry) => entry.repositoryId === config.id);
      const registryPaths = new Set(registryEntries.map((entry) => pathKey(resolveRegistryPath(workspace.workspaceRoot, entry.path))));
      for (const entry of registryEntries) {
        const entryPath = resolveRegistryPath(workspace.workspaceRoot, entry.path);
        if (!fs.existsSync(entryPath) || !worktrees.some((worktree) => pathKey(worktree.path) === pathKey(entryPath))) {
          integrityIssues.push(`Registry entry is not an active Git worktree: ${entry.path}`);
        }
      }
      for (const worktree of worktrees.filter((item) => !item.prunable && fs.existsSync(item.path))) {
        if (!registryPaths.has(pathKey(worktree.path))) {
          integrityIssues.push(`Active Git worktree is missing from the registry: ${worktree.path}`);
        }
      }
    }
    return {
      config,
      mainPath,
      git: inspectGitRepository(mainPath, { fetch: options.fetch }),
      worktrees,
    };
  });

  const tempPath = path.resolve(
    workspace.workspaceRoot,
    workspace.manifest.temp?.path ?? 'temp'
  );
  const generatedPath = path.resolve(workspace.workspaceRoot, 'generated');

  return {
    found: true,
    workspaceId: workspace.manifest.workspaceId,
    name: workspace.manifest.name,
    workspaceRoot: workspace.workspaceRoot,
    projectPath: workspace.projectPath,
    manifestPath: workspace.manifestPath,
    projectGit: inspectGitRepository(workspace.projectPath, { fetch: options.fetch }),
    repositories,
    tempPath,
    tempExists: fs.existsSync(tempPath),
    generatedPath,
    generatedExists: fs.existsSync(generatedPath),
    ...(registry ? { registry } : {}),
    integrityIssues,
  };
}

function isUnsafeGitFreshness(freshness: GitRepositoryStatus['freshness']): boolean {
  return ['DIRTY', 'AHEAD', 'DIVERGED', 'OFFLINE_OR_UNKNOWN', 'NOT_GIT'].includes(freshness);
}

export function workspaceHasUnsafeState(status: WorkspaceStatus): boolean {
  return (
    status.integrityIssues.length > 0 ||
    isUnsafeGitFreshness(status.projectGit.freshness) ||
    status.repositories.some((repository) => isUnsafeGitFreshness(repository.git.freshness))
  );
}

export function workspaceHasUnsafeProjectState(status: WorkspaceStatus): boolean {
  return workspaceHasUnsafeState(status);
}
