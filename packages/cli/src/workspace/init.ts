import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  SOURCE_WORKSPACE_LINK_PATH,
  WORKSPACE_MANIFEST_FILENAME,
  WORKSPACE_MANIFEST_VERSION,
  WORKSPACE_WORKTREE_REGISTRY_FILENAME,
} from './schema.js';
import { listGitWorktrees } from './git.js';

import type { GitWorktreeInfo } from './git.js';
import type { WorkspaceManifest, WorkspaceWorktreeRegistry, WorkspaceWorktreeRegistryEntry } from './schema.js';

export interface WorkspaceInitOptions {
  workspaceName?: string;
  workspaceRoot?: string;
  projectRemote?: string;
}

export interface WorkspaceInitWorktree {
  sourcePath: string;
  targetPath: string;
  branch?: string;
  head?: string;
  role: WorkspaceWorktreeRegistryEntry['role'];
  primary: boolean;
  dirty: boolean;
}

export interface WorkspaceInitializationPlan {
  sourcePath: string;
  sourceName: string;
  workspaceName: string;
  folderPrefix: string;
  workspaceRoot: string;
  projectPath: string;
  normalizedMainPath: string;
  tempPath: string;
  generatedPath: string;
  projectRemote?: string;
  defaultBranch: string;
  worktrees: WorkspaceInitWorktree[];
  prunableWorktrees: GitWorktreeInfo[];
  existingProjectMemory: string[];
  warnings: string[];
  errors: string[];
  manifest: WorkspaceManifest;
}

function runGit(repoPath: string, args: string[]): string | undefined {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return undefined;
  }
}

function runGitOrThrow(repoPath: string, args: string[]): string {
  return execFileSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function safeBranchName(branch: string): string {
  return slugify(branch.replace(/^refs\/heads\//, ''));
}

function isPrimaryWorktree(worktreePath: string): boolean {
  try {
    return fs.statSync(path.join(worktreePath, '.git')).isDirectory();
  } catch {
    return false;
  }
}

function isDirty(repoPath: string): boolean {
  return (runGit(repoPath, ['status', '--porcelain']) ?? 'UNREADABLE').length > 0;
}

function defaultWorkspaceRoot(sourcePath: string, workspaceName: string): string {
  const sourceName = path.basename(sourcePath);
  const groupedMain = /^(.*)-main$/i.exec(sourceName);
  const parent = path.dirname(sourcePath);
  if (groupedMain?.[1] && slugify(path.basename(parent)) === slugify(`${groupedMain[1]}-i2Workspace`)) {
    return parent;
  }
  if (groupedMain?.[1] && slugify(path.basename(parent)) === slugify(groupedMain[1])) {
    return path.join(path.dirname(parent), `${path.basename(parent)}-i2Workspace`);
  }
  return path.join(path.dirname(sourcePath), `${workspaceName}-i2Workspace`);
}

function getDefaultBranch(sourcePath: string): string {
  return runGit(sourcePath, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(/^origin\//, '') ?? 'main';
}

function toRegistryEntry(worktree: WorkspaceInitWorktree): WorkspaceWorktreeRegistryEntry {
  return {
    repositoryId: 'source',
    path: path.basename(worktree.targetPath),
    ...(worktree.branch ? { branch: worktree.branch } : {}),
    ...(worktree.head ? { head: worktree.head } : {}),
    role: worktree.role,
  };
}

export function planWorkspaceInitialization(sourcePath: string, options: WorkspaceInitOptions = {}): WorkspaceInitializationPlan {
  const source = path.resolve(sourcePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error(`Cannot initialize missing directory: ${source}`);
  if (!runGit(source, ['rev-parse', '--is-inside-work-tree'])) throw new Error(`Cannot initialize non-Git directory: ${source}`);

  const sourceName = path.basename(source);
  const groupedMain = /^(.*)-main$/i.exec(sourceName);
  const groupedMainName = groupedMain?.[1];
  const workspaceName = options.workspaceName?.trim()
    || (groupedMainName && slugify(path.basename(path.dirname(source))) === slugify(groupedMainName) ? path.basename(path.dirname(source)) : undefined)
    || sourceName.replace(/-main$/i, '') || 'project';
  const folderPrefix = options.workspaceName?.trim() || groupedMainName || workspaceName;
  const workspaceRoot = path.resolve(options.workspaceRoot ?? defaultWorkspaceRoot(source, workspaceName));
  const defaultBranch = getDefaultBranch(source);
  const listed = listGitWorktrees(source);
  const prunableWorktrees = listed.filter((worktree) => Boolean(worktree.prunable));
  const warnings: string[] = [];
  const errors: string[] = [];
  const active = listed.filter((worktree) => !worktree.prunable && fs.existsSync(worktree.path));
  const worktrees = active.map((worktree) => {
    const role: WorkspaceInitWorktree['role'] = worktree.branch === defaultBranch ? 'main' : worktree.branch ? 'feature' : 'detached';
    const suffix = role === 'main'
      ? 'main'
      : worktree.branch
        ? safeBranchName(worktree.branch)
        : `detached-${(worktree.head ?? 'unknown').slice(0, 8)}`;
    return {
      sourcePath: path.resolve(worktree.path),
      targetPath: path.join(workspaceRoot, `${folderPrefix}-${suffix}`),
      ...(worktree.branch ? { branch: worktree.branch } : {}),
      ...(worktree.head ? { head: worktree.head } : {}),
      role,
      primary: isPrimaryWorktree(worktree.path),
      dirty: isDirty(worktree.path),
    };
  });

  if (worktrees.length === 0) errors.push('No healthy Git worktrees were found.');
  if (!options.projectRemote) errors.push('A project control-repository remote is required (--project-remote).');
  if (prunableWorktrees.length > 0) warnings.push(`${prunableWorktrees.length} prunable worktree registration(s) will be repaired during apply.`);
  if (worktrees.some((worktree) => worktree.dirty)) warnings.push('One or more worktrees are dirty; apply requires --stash.');

  const targets = new Set<string>();
  for (const worktree of worktrees) {
    const normalized = path.resolve(worktree.targetPath).toLowerCase();
    if (targets.has(normalized)) errors.push(`Multiple worktrees normalize to ${worktree.targetPath}.`);
    targets.add(normalized);
  }
  const sourceIsAlreadyTarget = worktrees.every((worktree) => path.resolve(worktree.sourcePath) === path.resolve(worktree.targetPath));
  if (fs.existsSync(workspaceRoot) && !sourceIsAlreadyTarget) errors.push(`Workspace root already exists: ${workspaceRoot}`);

  const legacyProjectPath = path.join(source, 'project');
  const existingProjectMemory = fs.existsSync(legacyProjectPath)
    ? fs.readdirSync(legacyProjectPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join('project', entry.name)).sort()
    : [];
  const remote = runGit(source, ['remote', 'get-url', 'origin']);
  if (!remote) warnings.push('Source repository has no origin remote; workspace status will flag it until one is configured.');

  return {
    sourcePath: source, sourceName, workspaceName, folderPrefix, workspaceRoot,
    projectPath: path.join(workspaceRoot, 'project'), normalizedMainPath: path.join(workspaceRoot, `${folderPrefix}-main`), tempPath: path.join(workspaceRoot, 'temp'), generatedPath: path.join(workspaceRoot, 'generated'),
    ...(options.projectRemote ? { projectRemote: options.projectRemote } : {}), defaultBranch, worktrees, prunableWorktrees, existingProjectMemory, warnings, errors,
    manifest: {
      schemaVersion: WORKSPACE_MANIFEST_VERSION,
      workspaceId: slugify(workspaceName), name: workspaceName,
      repositories: [{ id: 'source', remote: remote ?? 'REQUIRED', defaultBranch, mainFolder: `${folderPrefix}-main`, worktreePrefix: `${folderPrefix}-` }],
      project: { path: 'project' }, temp: { path: 'temp' },
    },
  };
}

function ensureIgnoredWorkspaceLink(repoPath: string): void {
  const commonDir = runGitOrThrow(repoPath, ['rev-parse', '--git-common-dir']);
  const absoluteCommonDir = path.resolve(repoPath, commonDir);
  const excludePath = path.join(absoluteCommonDir, 'info', 'exclude');
  const content = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
  if (!content.split(/\r?\n/).includes('/.mds/')) {
    fs.mkdirSync(path.dirname(excludePath), { recursive: true });
    fs.appendFileSync(excludePath, `${content.endsWith('\n') || !content ? '' : '\n'}/.mds/\n`, 'utf8');
  }
}

function writeSourceLink(repoPath: string, workspaceId: string, projectRemote: string): void {
  ensureIgnoredWorkspaceLink(repoPath);
  const linkPath = path.join(repoPath, SOURCE_WORKSPACE_LINK_PATH);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.writeFileSync(linkPath, `${JSON.stringify({ schemaVersion: WORKSPACE_MANIFEST_VERSION, workspaceId, projectRepository: projectRemote }, null, 2)}\n`, 'utf8');
}

function moveWorktrees(plan: WorkspaceInitializationPlan): void {
  const primary = plan.worktrees.find((worktree) => worktree.primary);
  for (const worktree of plan.worktrees.filter((item) => !item.primary)) {
    if (path.resolve(worktree.sourcePath) !== path.resolve(worktree.targetPath)) {
      fs.mkdirSync(path.dirname(worktree.targetPath), { recursive: true });
      runGitOrThrow(plan.sourcePath, ['worktree', 'move', worktree.sourcePath, worktree.targetPath]);
    }
  }
  if (primary && path.resolve(primary.sourcePath) !== path.resolve(primary.targetPath)) {
    if (path.parse(primary.sourcePath).root.toLowerCase() !== path.parse(primary.targetPath).root.toLowerCase()) {
      throw new Error('The primary worktree must move within the same filesystem volume.');
    }
    fs.mkdirSync(path.dirname(primary.targetPath), { recursive: true });
    fs.renameSync(primary.sourcePath, primary.targetPath);
    runGitOrThrow(primary.targetPath, ['worktree', 'repair']);
  }
}

function ensureMainCheckout(plan: WorkspaceInitializationPlan): WorkspaceInitWorktree | undefined {
  if (plan.worktrees.some((worktree) => worktree.role === 'main')) return undefined;
  const primary = plan.worktrees.find((worktree) => worktree.primary) ?? plan.worktrees[0];
  if (!primary) throw new Error('Cannot create a main checkout without a source worktree.');
  const targetPath = path.join(plan.workspaceRoot, `${plan.folderPrefix}-main`);
  runGitOrThrow(primary.targetPath, ['worktree', 'add', targetPath, plan.defaultBranch]);
  const head = runGitOrThrow(targetPath, ['rev-parse', 'HEAD']);
  return { sourcePath: targetPath, targetPath, branch: plan.defaultBranch, head, role: 'main', primary: false, dirty: false };
}

function createProjectControlRepo(plan: WorkspaceInitializationPlan, worktrees: WorkspaceInitWorktree[]): void {
  if (!plan.projectRemote) throw new Error('A project control-repository remote is required.');
  const legacySource = worktrees.find((worktree) => worktree.primary) ?? worktrees[0];
  if (!legacySource) throw new Error('Cannot initialize a project control repository without a source worktree.');
  // A freshly created bare control remote has no refs yet; reachability is enough.
  runGitOrThrow(legacySource.targetPath, ['ls-remote', plan.projectRemote]);
  if (fs.existsSync(plan.projectPath)) {
    const existingRemote = runGit(plan.projectPath, ['remote', 'get-url', 'origin']);
    if (!existingRemote) throw new Error(`Existing project control repository has no origin: ${plan.projectPath}`);
    if (existingRemote !== plan.projectRemote) throw new Error(`Existing project control repository remote does not match --project-remote: ${plan.projectPath}`);
  } else {
    execFileSync('git', ['clone', plan.projectRemote, plan.projectPath], { stdio: ['ignore', 'pipe', 'pipe'] });
  }
  const legacyProjectPath = legacySource ? path.join(legacySource.targetPath, 'project') : undefined;
  if (legacyProjectPath && fs.existsSync(legacyProjectPath)) {
    fs.cpSync(legacyProjectPath, plan.projectPath, { recursive: true, force: false, errorOnExist: false });
  }
  const registry: WorkspaceWorktreeRegistry = {
    schemaVersion: WORKSPACE_MANIFEST_VERSION, workspaceId: plan.manifest.workspaceId,
    worktrees: worktrees.map(toRegistryEntry),
  };
  fs.writeFileSync(path.join(plan.projectPath, WORKSPACE_MANIFEST_FILENAME), `${JSON.stringify(plan.manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(plan.projectPath, WORKSPACE_WORKTREE_REGISTRY_FILENAME), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  const name = runGit(legacySource.targetPath, ['config', 'user.name']) ?? 'MDS Workspace';
  const email = runGit(legacySource.targetPath, ['config', 'user.email']) ?? 'workspace@mds.local';
  runGitOrThrow(plan.projectPath, ['config', 'user.name', name]);
  runGitOrThrow(plan.projectPath, ['config', 'user.email', email]);
  runGitOrThrow(plan.projectPath, ['add', '.']);
  if (runGitOrThrow(plan.projectPath, ['status', '--porcelain']).length > 0) {
    runGitOrThrow(plan.projectPath, ['commit', '-m', `feat(workspace): initialize ${plan.workspaceName} control plane`]);
    runGitOrThrow(plan.projectPath, ['push', '-u', 'origin', `HEAD:${plan.defaultBranch}`]);
  }
}

export function applyWorkspaceInitialization(plan: WorkspaceInitializationPlan, options: { stash?: boolean; yes?: boolean } = {}): WorkspaceInitializationPlan {
  if (!options.yes) throw new Error('Refusing to apply without --yes.');
  if (plan.errors.length > 0) throw new Error(`Cannot initialize workspace:\n${plan.errors.join('\n')}`);
  const dirty = plan.worktrees.filter((worktree) => worktree.dirty);
  if (dirty.length > 0 && !options.stash) throw new Error('Dirty worktrees require --stash before initialization can apply.');
  if (dirty.length > 0) {
    for (const worktree of dirty) runGitOrThrow(worktree.sourcePath, ['stash', 'push', '--include-untracked', '-m', `mds workspace init ${plan.workspaceName}`]);
  }
  if (plan.prunableWorktrees.length > 0) runGitOrThrow(plan.sourcePath, ['worktree', 'prune']);
  fs.mkdirSync(plan.workspaceRoot, { recursive: true });
  moveWorktrees(plan);
  const createdMain = ensureMainCheckout(plan);
  const finalWorktrees = createdMain ? [...plan.worktrees, createdMain] : plan.worktrees;
  fs.mkdirSync(plan.tempPath, { recursive: true });
  fs.mkdirSync(plan.generatedPath, { recursive: true });
  createProjectControlRepo(plan, finalWorktrees);
  for (const worktree of finalWorktrees) writeSourceLink(worktree.targetPath, plan.manifest.workspaceId, plan.projectRemote!);
  return { ...plan, worktrees: finalWorktrees };
}
