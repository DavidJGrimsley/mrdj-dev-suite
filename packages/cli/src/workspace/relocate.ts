import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { discoverWorkspace } from './discover.js';
import { listGitWorktrees } from './git.js';

export interface WorkspaceRelocateOptions {
  workspaceParent?: string;
  includeAuxiliary?: string[];
}

export interface WorkspaceRelocateMove {
  sourcePath: string;
  targetPath: string;
  kind: 'worktree' | 'directory';
  primary?: boolean;
  gitRoot?: string;
}

export interface WorkspaceRelocationPlan {
  sourceRoot: string;
  targetRoot: string;
  moves: WorkspaceRelocateMove[];
  auxiliaryDirectories: string[];
  errors: string[];
  warnings: string[];
}

const JOURNAL = '.mds-workspace-relocate.json';

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function inside(candidate: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function git(repoPath: string, args: string[]): string {
  return execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function isPrimary(worktreePath: string): boolean {
  try { return fs.statSync(path.join(worktreePath, '.git')).isDirectory(); } catch { return false; }
}

function clean(repoPath: string): boolean {
  try {
    return git(repoPath, ['status', '--porcelain']).length === 0
      && git(repoPath, ['diff', '--name-only', '--diff-filter=U']).length === 0;
  } catch {
    return false;
  }
}

function moveDirectory(sourcePath: string, targetPath: string): void {
  if (path.parse(sourcePath).root.toLowerCase() !== path.parse(targetPath).root.toLowerCase()) {
    throw new Error(`Workspace relocation requires the same filesystem volume: ${sourcePath}`);
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(sourcePath, targetPath);
}

function writeJournal(plan: WorkspaceRelocationPlan, completed: WorkspaceRelocateMove[]): void {
  fs.writeFileSync(path.join(plan.sourceRoot, JOURNAL), `${JSON.stringify({ schemaVersion: 1, sourceRoot: plan.sourceRoot, targetRoot: plan.targetRoot, moves: completed }, null, 2)}\n`);
}

export function workspaceRelocationRequiresSafeWorkingDirectory(plan: WorkspaceRelocationPlan, workingDirectory = process.cwd()): boolean {
  return !samePath(plan.sourceRoot, plan.targetRoot) && inside(workingDirectory, plan.sourceRoot);
}

export function planWorkspaceRelocation(startPath: string, options: WorkspaceRelocateOptions = {}): WorkspaceRelocationPlan {
  const workspace = discoverWorkspace(startPath);
  if (!workspace) throw new Error(`No MDS workspace found from ${path.resolve(startPath)}.`);
  if (!options.workspaceParent?.trim()) throw new Error('Workspace relocation requires --workspace-parent.');

  const sourceRoot = workspace.workspaceRoot;
  const targetRoot = path.resolve(options.workspaceParent, path.basename(sourceRoot));
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!fs.existsSync(options.workspaceParent) || !fs.statSync(options.workspaceParent).isDirectory()) {
    errors.push(`Workspace parent does not exist or is not a directory: ${path.resolve(options.workspaceParent)}`);
  }
  const auxiliaryDirectories = [...new Set((options.includeAuxiliary ?? []).map((value) => value.trim()).filter(Boolean))];
  if (auxiliaryDirectories.some((value) => path.basename(value) !== value || value === '.' || value === '..')) {
    errors.push('Auxiliary directories must be direct child folder names.');
  }
  if (samePath(sourceRoot, targetRoot)) errors.push('Workspace relocation target is the current workspace root.');
  if (inside(targetRoot, sourceRoot) || inside(sourceRoot, targetRoot)) errors.push('Workspace relocation roots must not be nested.');
  if (fs.existsSync(targetRoot)) {
    if (!fs.statSync(targetRoot).isDirectory() || fs.readdirSync(targetRoot).length > 0) errors.push(`Workspace relocation target is not empty: ${targetRoot}`);
  }

  const moves: WorkspaceRelocateMove[] = [];
  const expected = new Set<string>(['project', 'temp', 'generated', JOURNAL, ...auxiliaryDirectories].map((value) => value.toLowerCase()));
  for (const repository of workspace.manifest.repositories) {
    const primaryPath = path.join(sourceRoot, repository.mainFolder);
    const worktrees = listGitWorktrees(primaryPath);
    if (worktrees.length === 0) errors.push(`No readable Git worktrees for ${repository.id}: ${primaryPath}`);
    for (const worktree of worktrees) {
      const sourcePath = path.resolve(worktree.path);
      if (!inside(sourcePath, sourceRoot)) {
        errors.push(`Registered worktree is outside the workspace root: ${sourcePath}`);
        continue;
      }
      if (!clean(sourcePath)) errors.push(`Worktree must be clean before relocation: ${sourcePath}`);
      const targetPath = path.join(targetRoot, path.relative(sourceRoot, sourcePath));
      moves.push({ sourcePath, targetPath, kind: 'worktree', primary: isPrimary(sourcePath), gitRoot: primaryPath });
      expected.add(path.relative(sourceRoot, sourcePath).split(path.sep)[0]!.toLowerCase());
    }
  }

  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (expected.has(entry.name.toLowerCase())) continue;
    errors.push(`Workspace root contains an unselected entry: ${entry.name}. Pass it with --include-auxiliary or remove it first.`);
  }
  for (const name of ['project', 'temp', 'generated', ...auxiliaryDirectories]) {
    const sourcePath = path.join(sourceRoot, name);
    if (!fs.existsSync(sourcePath)) continue;
    const targetPath = path.join(targetRoot, name);
    if (fs.existsSync(targetPath)) errors.push(`Workspace relocation destination already exists: ${targetPath}`);
    moves.push({ sourcePath, targetPath, kind: 'directory' });
  }
  for (const move of moves) {
    if (fs.existsSync(move.targetPath) && !samePath(move.sourcePath, move.targetPath)) errors.push(`Workspace relocation destination already exists: ${move.targetPath}`);
  }
  if (fs.existsSync(path.join(sourceRoot, JOURNAL))) warnings.push(`A previous relocation journal exists: ${path.join(sourceRoot, JOURNAL)}`);
  return { sourceRoot, targetRoot, moves, auxiliaryDirectories, errors, warnings };
}

export function applyWorkspaceRelocation(plan: WorkspaceRelocationPlan, options: { yes?: boolean } = {}): WorkspaceRelocationPlan {
  if (!options.yes) throw new Error('Refusing to relocate without --yes.');
  if (plan.errors.length > 0) throw new Error(`Cannot relocate workspace:\n${plan.errors.join('\n')}`);
  if (workspaceRelocationRequiresSafeWorkingDirectory(plan)) throw new Error('Workspace relocation must run from outside the workspace being moved.');
  const targetRootExisted = fs.existsSync(plan.targetRoot);
  fs.mkdirSync(plan.targetRoot, { recursive: true });
  const completed: WorkspaceRelocateMove[] = [];
  writeJournal(plan, completed);
  try {
    for (const move of plan.moves.filter((item) => item.kind === 'worktree' && !item.primary)) {
      git(move.gitRoot!, ['worktree', 'move', move.sourcePath, move.targetPath]);
      completed.push(move); writeJournal(plan, completed);
    }
    for (const move of plan.moves.filter((item) => item.kind === 'directory')) {
      moveDirectory(move.sourcePath, move.targetPath);
      completed.push(move); writeJournal(plan, completed);
    }
    for (const move of plan.moves.filter((item) => item.kind === 'worktree' && item.primary)) {
      moveDirectory(move.sourcePath, move.targetPath);
      git(move.targetPath, ['worktree', 'repair']);
      completed.push(move); writeJournal(plan, completed);
    }
    fs.rmSync(path.join(plan.sourceRoot, JOURNAL), { force: true });
    if (fs.readdirSync(plan.sourceRoot).length === 0) fs.rmdirSync(plan.sourceRoot);
    return plan;
  } catch (error) {
    const failures: string[] = [];
    for (const move of [...completed].reverse()) {
      try {
        if (move.kind === 'worktree' && !move.primary) git(move.gitRoot!, ['worktree', 'move', move.targetPath, move.sourcePath]);
        else {
          moveDirectory(move.targetPath, move.sourcePath);
          if (move.kind === 'worktree' && move.primary) git(move.sourcePath, ['worktree', 'repair']);
        }
      } catch (rollbackError) {
        failures.push(`${move.targetPath} -> ${move.sourcePath}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    if (failures.length === 0) {
      fs.rmSync(path.join(plan.sourceRoot, JOURNAL), { force: true });
      if (!targetRootExisted && fs.existsSync(plan.targetRoot) && fs.readdirSync(plan.targetRoot).length === 0) {
        fs.rmdirSync(plan.targetRoot);
      }
      throw new Error(`Workspace relocation failed and completed moves were rolled back: ${error instanceof Error ? error.message : String(error)}`);
    }
    writeJournal(plan, completed);
    throw new Error(`Workspace relocation failed; rollback also failed. Recovery journal: ${path.join(plan.sourceRoot, JOURNAL)}\n${failures.join('\n')}`);
  }
}
