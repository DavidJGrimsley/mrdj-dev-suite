import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type GitFreshness =
  | 'CURRENT'
  | 'BEHIND_SAFE_TO_FF'
  | 'DIRTY'
  | 'AHEAD'
  | 'DIVERGED'
  | 'OFFLINE_OR_UNKNOWN'
  | 'NOT_GIT';

export interface GitRepositoryStatus {
  path: string;
  freshness: GitFreshness;
  branch?: string;
  head?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  dirty: boolean;
  fetchAttempted: boolean;
  fetchSucceeded?: boolean;
  warning?: string;
}

export interface GitWorktreeInfo {
  path: string;
  head?: string;
  branch?: string;
  bare?: boolean;
  detached?: boolean;
  locked?: string | boolean;
  prunable?: string;
}

export function deriveGitFreshness(options: {
  dirty: boolean;
  ahead: number;
  behind: number;
  fetchAttempted?: boolean;
  fetchSucceeded?: boolean;
}): GitFreshness {
  if (options.dirty) return 'DIRTY';
  if (options.ahead > 0 && options.behind > 0) return 'DIVERGED';
  if (options.ahead > 0) return 'AHEAD';
  if (options.behind > 0) return 'BEHIND_SAFE_TO_FF';
  return options.fetchAttempted && options.fetchSucceeded === false
    ? 'OFFLINE_OR_UNKNOWN'
    : 'CURRENT';
}

function git(repoPath: string, args: string[]): string {
  return execFileSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function isGitRepository(repoPath: string): boolean {
  if (!fs.existsSync(repoPath)) return false;
  try {
    return git(repoPath, ['rev-parse', '--is-inside-work-tree']) === 'true';
  } catch {
    return false;
  }
}

export function inspectGitRepository(
  repoPath: string,
  options: { fetch?: boolean } = {}
): GitRepositoryStatus {
  const resolved = path.resolve(repoPath);
  if (!isGitRepository(resolved)) {
    return {
      path: resolved,
      freshness: 'NOT_GIT',
      dirty: false,
      fetchAttempted: Boolean(options.fetch),
    };
  }

  const fetchAttempted = Boolean(options.fetch);
  let fetchSucceeded: boolean | undefined;
  let fetchWarning: string | undefined;
  if (options.fetch) {
    try {
      git(resolved, ['fetch', '--prune', 'origin']);
      fetchSucceeded = true;
    } catch (error) {
      fetchSucceeded = false;
      fetchWarning = error instanceof Error ? error.message : String(error);
    }
  }

  const porcelain = git(resolved, ['status', '--porcelain']);
  const dirty = porcelain.length > 0;
  const branch = git(resolved, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(resolved, ['rev-parse', 'HEAD']);

  let upstream: string | undefined;
  try {
    upstream = git(resolved, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    upstream = undefined;
  }

  if (!upstream) {
    return {
      path: resolved,
      freshness: dirty ? 'DIRTY' : 'OFFLINE_OR_UNKNOWN',
      branch,
      head,
      dirty,
      fetchAttempted,
      ...(fetchSucceeded === undefined ? {} : { fetchSucceeded }),
      warning: fetchWarning ?? 'No upstream branch is configured.',
    };
  }

  try {
    const counts = git(resolved, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`]);
    const [aheadText, behindText] = counts.split(/\s+/);
    const ahead = Number.parseInt(aheadText ?? '0', 10);
    const behind = Number.parseInt(behindText ?? '0', 10);

    const freshness = deriveGitFreshness({
      dirty,
      ahead,
      behind,
      fetchAttempted,
      fetchSucceeded,
    });

    return {
      path: resolved,
      freshness,
      branch,
      head,
      upstream,
      ahead,
      behind,
      dirty,
      fetchAttempted,
      ...(fetchSucceeded === undefined ? {} : { fetchSucceeded }),
      ...(fetchWarning ? { warning: fetchWarning } : {}),
    };
  } catch (error) {
    return {
      path: resolved,
      freshness: dirty ? 'DIRTY' : 'OFFLINE_OR_UNKNOWN',
      branch,
      head,
      upstream,
      dirty,
      fetchAttempted,
      ...(fetchSucceeded === undefined ? {} : { fetchSucceeded }),
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}

export function listGitWorktrees(repoPath: string): GitWorktreeInfo[] {
  const resolved = path.resolve(repoPath);
  if (!isGitRepository(resolved)) return [];

  const output = git(resolved, ['worktree', 'list', '--porcelain']);
  if (!output) return [];

  return parseGitWorktreeList(output);
}

export function parseGitWorktreeList(output: string): GitWorktreeInfo[] {
  return output
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const result: GitWorktreeInfo = { path: '' };
      for (const line of block.split(/\r?\n/)) {
        const [key, ...rest] = line.split(' ');
        const value = rest.join(' ').trim();
        if (key === 'worktree') result.path = value;
        else if (key === 'HEAD') result.head = value;
        else if (key === 'branch') result.branch = value.replace(/^refs\/heads\//, '');
        else if (key === 'bare') result.bare = true;
        else if (key === 'detached') result.detached = true;
        else if (key === 'locked') result.locked = value || true;
        else if (key === 'prunable') result.prunable = value;
      }
      return result;
    })
    .filter((item) => item.path.length > 0);
}
