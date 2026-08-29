import fs from 'node:fs';
import path from 'node:path';

import { discoverWorkspace } from './discover.js';
import { inspectGitRepository, listGitWorktrees } from './git.js';

import type { GitRepositoryStatus, GitWorktreeInfo } from './git.js';
import type { WorkspaceRepositoryConfig } from './schema.js';

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
}

export interface WorkspaceNotFoundStatus {
  found: false;
  startedFrom: string;
}

export type WorkspaceStatusResult = WorkspaceStatus | WorkspaceNotFoundStatus;

export function getWorkspaceStatus(
  startPath = '.',
  options: { fetch?: boolean } = {}
): WorkspaceStatusResult {
  const workspace = discoverWorkspace(startPath);
  if (!workspace) {
    return { found: false, startedFrom: path.resolve(startPath) };
  }

  const repositories = workspace.manifest.repositories.map((config) => {
    const mainPath = path.resolve(workspace.workspaceRoot, config.mainFolder);
    return {
      config,
      mainPath,
      git: inspectGitRepository(mainPath, { fetch: options.fetch }),
      worktrees: listGitWorktrees(mainPath),
    };
  });

  const tempPath = path.resolve(
    workspace.workspaceRoot,
    workspace.manifest.temp?.path ?? 'temp'
  );

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
  };
}

function isUnsafeGitFreshness(freshness: GitRepositoryStatus['freshness']): boolean {
  return ['DIRTY', 'AHEAD', 'DIVERGED', 'OFFLINE_OR_UNKNOWN', 'NOT_GIT'].includes(freshness);
}

export function workspaceHasUnsafeState(status: WorkspaceStatus): boolean {
  return (
    isUnsafeGitFreshness(status.projectGit.freshness) ||
    status.repositories.some((repository) => isUnsafeGitFreshness(repository.git.freshness))
  );
}

export function workspaceHasUnsafeProjectState(status: WorkspaceStatus): boolean {
  return workspaceHasUnsafeState(status);
}
