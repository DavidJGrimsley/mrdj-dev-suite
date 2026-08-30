import fs from 'node:fs';
import path from 'node:path';

import { discoverWorkspace } from './discover.js';
import { inspectGitRepository, listGitWorktrees } from './git.js';
import { SOURCE_WORKSPACE_LINK_PATH, parseSourceWorkspaceLink } from './schema.js';

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
  generatedPath: string;
  generatedExists: boolean;
  integrityIssues: string[];
}

export interface WorkspaceNotFoundStatus {
  found: false;
  startedFrom: string;
}

export type WorkspaceStatusResult = WorkspaceStatus | WorkspaceNotFoundStatus;

function listMarkdownFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const result: string[] = [];
  const visit = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.name.toLowerCase().endsWith('.md')) {
        result.push(absolute);
      }
    }
  };
  visit(root);
  return result;
}

function addProjectMemoryIssues(projectPath: string, integrityIssues: string[]): void {
  for (const file of ['info.md', 'todo.md', 'style.md', 'guidelines.md']) {
    const filePath = path.join(projectPath, file);
    if (!fs.existsSync(filePath)) {
      integrityIssues.push(`Missing project memory file: project/${file}`);
    }
  }

  for (const file of listMarkdownFiles(projectPath)) {
    const relative = path.relative(projectPath, file).replace(/\\/g, '/');
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/^\s*-?\s*# TodoForContext\(optional\):/u.test(line)) {
        integrityIssues.push(`Unresolved TodoForContext marker: project/${relative}:${index + 1}`);
      }
    });
  }
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
  addProjectMemoryIssues(workspace.projectPath, integrityIssues);

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
