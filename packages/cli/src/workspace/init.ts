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
import {
  applyRetrospectiveProjectOnboarding,
  planRetrospectiveProjectOnboarding,
} from '../retrospective-onboarding.js';
import { applyLegacyProjectConsolidation, planLegacyProjectConsolidation } from './legacy-project.js';

import type { GitWorktreeInfo } from './git.js';
import type { WorkspaceManifest, WorkspaceWorktreeRegistry, WorkspaceWorktreeRegistryEntry } from './schema.js';

export interface WorkspaceInitOptions {
  workspaceName?: string;
  workspaceRoot?: string;
  workspaceParent?: string;
  projectRemote?: string;
  consolidateLegacyProject?: boolean;
  includeAuxiliary?: string[];
}

type ProjectRemoteSource = 'provided' | 'inferred';

export interface WorkspaceInitWorktree {
  sourcePath: string;
  targetPath: string;
  branch?: string;
  head?: string;
  role: WorkspaceWorktreeRegistryEntry['role'];
  primary: boolean;
  dirty: boolean;
  unmerged: boolean;
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
  projectRemoteSource?: ProjectRemoteSource;
  projectRemoteRepository?: string;
  defaultBranch: string;
  worktrees: WorkspaceInitWorktree[];
  prunableWorktrees: GitWorktreeInfo[];
  existingProjectMemory: string[];
  legacyProjectMigration: ReturnType<typeof planLegacyProjectConsolidation>;
  retrospectiveOnboarding: {
    mode: 'generate' | 'fill-missing';
    evidenceSources: string[];
  };
  warnings: string[];
  errors: string[];
  manifest: WorkspaceManifest;
}

interface WorkspaceMoveJournal {
  schemaVersion: 1;
  workspaceRoot: string;
  moves: Array<{ sourcePath: string; targetPath: string; primary: boolean }>;
}

const WORKSPACE_INIT_JOURNAL_FILENAME = '.mds-workspace-init.json';

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

function canReadGitRepository(repoPath: string): boolean {
  return runGit(repoPath, ['rev-parse', '--is-inside-work-tree']) === 'true';
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

function isSamePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
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

function hasUnmergedChanges(repoPath: string): boolean {
  return (runGit(repoPath, ['diff', '--name-only', '--diff-filter=U']) ?? '').length > 0;
}

function defaultWorkspaceRoot(primaryPath: string, workspaceName: string): string {
  const parent = path.dirname(primaryPath);
  const groupedMain = /^(.*)-main$/i.exec(path.basename(primaryPath));
  // A partially initialized workspace may use an old display name. Keep the
  // replacement root alongside it instead of nesting another workspace.
  if (/-i2workspace$/i.test(path.basename(parent))) {
    return path.join(path.dirname(parent), `${workspaceName}-i2Workspace`);
  }
  if (groupedMain?.[1] && slugify(path.basename(parent)) === slugify(groupedMain[1])) {
    return path.join(path.dirname(parent), `${workspaceName}-i2Workspace`);
  }
  return path.join(parent, `${workspaceName}-i2Workspace`);
}

function getDefaultBranch(sourcePath: string): string {
  return runGit(sourcePath, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(/^origin\//, '') ?? 'main';
}

interface GitHubRemote {
  owner: string;
  repo: string;
  fullName: string;
  sshUrl: string;
}

function parseGitHubRemote(remote: string | undefined): GitHubRemote | undefined {
  if (!remote) return undefined;
  const trimmed = remote.trim();
  const ssh = /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i.exec(trimmed);
  const https = /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/i.exec(trimmed);
  const sshUrl = /^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/i.exec(trimmed);
  const match = ssh ?? https ?? sshUrl;
  if (!match?.[1] || !match[2]) return undefined;
  const owner = match[1];
  const repo = match[2];
  return { owner, repo, fullName: `${owner}/${repo}`, sshUrl: `git@github.com:${owner}/${repo}.git` };
}

function getRemoteRepositoryName(remote: string | undefined): string | undefined {
  const github = parseGitHubRemote(remote);
  if (github?.repo) return github.repo;
  if (!remote) return undefined;
  // Local filesystem remotes describe a storage location, not a stable
  // repository identity. Fall back to the primary checkout in that case.
  if (!/^(?:[a-z][a-z0-9+.-]*:\/\/|[^@\s]+@[^:\s]+:)/i.test(remote.trim())) return undefined;
  const normalized = remote.trim().replace(/[\\/]$/, '').replace(/\.git$/i, '');
  const match = /(?:[:/])([^/:]+)$/.exec(normalized);
  return match?.[1] || undefined;
}

function inferProjectRemote(sourceRemote: string | undefined): Pick<WorkspaceInitializationPlan, 'projectRemote' | 'projectRemoteSource' | 'projectRemoteRepository'> {
  const parsed = parseGitHubRemote(sourceRemote);
  if (!parsed) return {};
  const projectRepo = `${parsed.owner}/${parsed.repo}-project`;
  return {
    projectRemote: `git@github.com:${projectRepo}.git`,
    projectRemoteSource: 'inferred',
    projectRemoteRepository: projectRepo,
  };
}

function normalizeRemoteUrl(remote: string | undefined): string | undefined {
  const parsed = parseGitHubRemote(remote);
  if (parsed) return `github:${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}`;
  return remote?.trim().replace(/\.git$/i, '').toLowerCase();
}

function runGh(args: string[]): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runGhOrUndefined(args: string[]): string | undefined {
  try {
    return runGh(args);
  } catch {
    return undefined;
  }
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

function validateExistingWorkspaceRoot(workspaceRoot: string, worktrees: WorkspaceInitWorktree[], errors: string[], warnings: string[], auxiliaryDirectories: string[] = []): void {
  if (!fs.existsSync(workspaceRoot)) return;

  const knownEntries = new Set([
    'project',
    'temp',
    'generated',
    WORKSPACE_INIT_JOURNAL_FILENAME,
    ...auxiliaryDirectories,
    ...worktrees.map((worktree) => path.basename(worktree.targetPath)),
  ].map((entry) => entry.toLowerCase()));
  const unexpected = fs.readdirSync(workspaceRoot)
    .filter((entry) => !knownEntries.has(entry.toLowerCase()));
  if (unexpected.length > 0) {
    errors.push(`Workspace root contains unrecognized entries: ${unexpected.join(', ')}.`);
  }

  for (const worktree of worktrees) {
    if (!isSamePath(worktree.sourcePath, worktree.targetPath) && fs.existsSync(worktree.targetPath)) {
      errors.push(`Workspace target already exists for ${worktree.sourcePath}: ${worktree.targetPath}`);
    }
  }
  if (fs.existsSync(path.join(workspaceRoot, WORKSPACE_INIT_JOURNAL_FILENAME))) {
    warnings.push('An interrupted workspace initialization journal is present; apply will resume only the recognized layout.');
  }
}

export function workspaceInitializationRequiresSafeWorkingDirectory(
  plan: WorkspaceInitializationPlan,
  workingDirectory = process.cwd(),
): boolean {
  return plan.worktrees.some((worktree) =>
    !isSamePath(worktree.sourcePath, worktree.targetPath)
      && isPathInside(workingDirectory, worktree.sourcePath)
  );
}

export function planWorkspaceInitialization(sourcePath: string, options: WorkspaceInitOptions = {}): WorkspaceInitializationPlan {
  const source = path.resolve(sourcePath);
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error(`Cannot initialize missing directory: ${source}`);
  if (!runGit(source, ['rev-parse', '--is-inside-work-tree'])) throw new Error(`Cannot initialize non-Git directory: ${source}`);

  const listed = listGitWorktrees(source);
  const primaryPath = listed.find((worktree) => isPrimaryWorktree(worktree.path))?.path ?? source;
  const sourceName = path.basename(primaryPath);
  const remote = runGit(primaryPath, ['remote', 'get-url', 'origin']) ?? runGit(source, ['remote', 'get-url', 'origin']);
  const groupedMain = /^(.*)-main$/i.exec(sourceName);
  const groupedParentName = path.basename(path.dirname(primaryPath));
  const localWorkspaceName = groupedMain?.[1] && slugify(groupedParentName) === slugify(groupedMain[1])
    ? groupedParentName
    : sourceName.replace(/-main$/i, '');
  const remoteRepositoryName = getRemoteRepositoryName(remote);
  const workspaceName = options.workspaceName?.trim()
    || remoteRepositoryName
    || localWorkspaceName
    || 'project';
  const folderPrefix = options.workspaceName?.trim() || remoteRepositoryName || groupedMain?.[1] || workspaceName;
  if (options.workspaceRoot && options.workspaceParent) {
    throw new Error('Use either --workspace-root or --workspace-parent, not both.');
  }
  const workspaceRoot = path.resolve(
    options.workspaceRoot
      ?? (options.workspaceParent ? path.join(options.workspaceParent, `${workspaceName}-i2Workspace`) : defaultWorkspaceRoot(primaryPath, workspaceName)),
  );
  const defaultBranch = getDefaultBranch(primaryPath);
  const inferredProjectRemote = inferProjectRemote(remote);
  const projectRemote = options.projectRemote?.trim() || inferredProjectRemote.projectRemote;
  const projectRemoteSource: ProjectRemoteSource | undefined = options.projectRemote?.trim()
    ? 'provided'
    : inferredProjectRemote.projectRemoteSource;
  const projectRemoteRepository = projectRemoteSource === 'inferred' ? inferredProjectRemote.projectRemoteRepository : undefined;
  const prunableWorktrees = listed.filter((worktree) => Boolean(worktree.prunable) || !canReadGitRepository(worktree.path));
  const warnings: string[] = [];
  const errors: string[] = [];
  const active = listed.filter((worktree) => !worktree.prunable && fs.existsSync(worktree.path) && canReadGitRepository(worktree.path));
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
      unmerged: hasUnmergedChanges(worktree.path),
    };
  });

  if (worktrees.length === 0) errors.push('No healthy Git worktrees were found.');
  if (!projectRemote) errors.push('A project control-repository remote is required when the source origin is not a GitHub remote (--project-remote).');
  if (prunableWorktrees.length > 0) warnings.push(`${prunableWorktrees.length} prunable worktree registration(s) will be repaired during apply.`);
  if (worktrees.some((worktree) => worktree.dirty)) warnings.push('One or more worktrees are dirty; apply requires --stash.');
  for (const worktree of worktrees.filter((item) => item.unmerged)) {
    errors.push(`Worktree has unresolved merge conflicts: ${worktree.sourcePath}`);
  }

  const targets = new Set<string>();
  for (const worktree of worktrees) {
    const normalized = path.resolve(worktree.targetPath).toLowerCase();
    if (targets.has(normalized)) errors.push(`Multiple worktrees normalize to ${worktree.targetPath}.`);
    targets.add(normalized);
  }
  validateExistingWorkspaceRoot(workspaceRoot, worktrees, errors, warnings, options.includeAuxiliary ?? []);

  const legacyProjectPath = path.join(primaryPath, 'project');
  const existingProjectMemory = fs.existsSync(legacyProjectPath)
    ? fs.readdirSync(legacyProjectPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join('project', entry.name)).sort()
    : [];
  const retrospectivePlan = planRetrospectiveProjectOnboarding(primaryPath, {
    projectPath: path.join(workspaceRoot, 'project'),
    legacyProjectMemoryFound: existingProjectMemory.length > 0,
  });
  const legacyProjectMigration = planLegacyProjectConsolidation(
    worktrees.map((worktree) => ({ worktreePath: worktree.sourcePath, primary: worktree.primary })),
    path.join(workspaceRoot, 'project'),
  );
  if (options.consolidateLegacyProject && legacyProjectMigration.conflicts.length > 0) {
    errors.push(`Legacy project consolidation has conflicts: ${legacyProjectMigration.conflicts.join(', ')}`);
  }
  if (options.projectRemote && remote && normalizeRemoteUrl(options.projectRemote) === normalizeRemoteUrl(remote)) {
    errors.push('The project control-repository remote must be separate from the source app remote.');
  }
  if (projectRemoteSource === 'inferred' && projectRemoteRepository) {
    warnings.push(`Project control repository will be created during apply if needed: ${projectRemoteRepository}.`);
  }
  if (!remote) warnings.push('Source repository has no origin remote; workspace status will flag it until one is configured.');

  return {
    sourcePath: source, sourceName, workspaceName, folderPrefix, workspaceRoot,
    projectPath: path.join(workspaceRoot, 'project'), normalizedMainPath: path.join(workspaceRoot, `${folderPrefix}-main`), tempPath: path.join(workspaceRoot, 'temp'), generatedPath: path.join(workspaceRoot, 'generated'),
    ...(projectRemote ? { projectRemote } : {}),
    ...(projectRemoteSource ? { projectRemoteSource } : {}),
    ...(projectRemoteRepository ? { projectRemoteRepository } : {}),
    defaultBranch, worktrees, prunableWorktrees, existingProjectMemory, legacyProjectMigration,
    retrospectiveOnboarding: {
      mode: existingProjectMemory.length > 0 ? 'fill-missing' : 'generate',
      evidenceSources: retrospectivePlan.evidenceSources,
    },
    warnings, errors,
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

function writeMoveJournal(workspaceRoot: string, moves: WorkspaceMoveJournal['moves']): void {
  const journal: WorkspaceMoveJournal = { schemaVersion: 1, workspaceRoot, moves };
  fs.writeFileSync(
    path.join(workspaceRoot, WORKSPACE_INIT_JOURNAL_FILENAME),
    `${JSON.stringify(journal, null, 2)}\n`,
    'utf8',
  );
}

function movePrimaryWorktree(sourcePath: string, targetPath: string): void {
  if (path.parse(sourcePath).root.toLowerCase() !== path.parse(targetPath).root.toLowerCase()) {
    throw new Error('The primary worktree must move within the same filesystem volume.');
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  try {
    fs.renameSync(sourcePath, targetPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EXDEV') {
      throw new Error('The primary worktree must move within the same filesystem volume.');
    }
    throw error;
  }
  runGitOrThrow(targetPath, ['worktree', 'repair']);
}

function rollbackWorktreeMoves(completed: WorkspaceMoveJournal['moves'], primaryPath: string): string[] {
  const failures: string[] = [];
  for (const move of [...completed].reverse()) {
    try {
      if (move.primary) {
        fs.renameSync(move.targetPath, move.sourcePath);
        runGitOrThrow(move.sourcePath, ['worktree', 'repair']);
      } else {
        runGitOrThrow(primaryPath, ['worktree', 'move', move.targetPath, move.sourcePath]);
      }
    } catch (error) {
      failures.push(`${move.targetPath} -> ${move.sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}

function moveWorktrees(plan: WorkspaceInitializationPlan): void {
  const primary = plan.worktrees.find((worktree) => worktree.primary);
  const gitWorktreeCommandPath = primary?.sourcePath ?? plan.sourcePath;
  const completed: WorkspaceMoveJournal['moves'] = [];
  writeMoveJournal(plan.workspaceRoot, completed);
  try {
    for (const worktree of plan.worktrees.filter((item) => !item.primary)) {
      if (!isSamePath(worktree.sourcePath, worktree.targetPath)) {
        fs.mkdirSync(path.dirname(worktree.targetPath), { recursive: true });
        runGitOrThrow(gitWorktreeCommandPath, ['worktree', 'move', worktree.sourcePath, worktree.targetPath]);
        completed.push({ sourcePath: worktree.sourcePath, targetPath: worktree.targetPath, primary: false });
        writeMoveJournal(plan.workspaceRoot, completed);
      }
    }
    if (primary && !isSamePath(primary.sourcePath, primary.targetPath)) {
      movePrimaryWorktree(primary.sourcePath, primary.targetPath);
      completed.push({ sourcePath: primary.sourcePath, targetPath: primary.targetPath, primary: true });
      writeMoveJournal(plan.workspaceRoot, completed);
    }
    fs.rmSync(path.join(plan.workspaceRoot, WORKSPACE_INIT_JOURNAL_FILENAME), { force: true });
  } catch (error) {
    const rollbackFailures = rollbackWorktreeMoves(completed, gitWorktreeCommandPath);
    if (rollbackFailures.length === 0) {
      fs.rmSync(path.join(plan.workspaceRoot, WORKSPACE_INIT_JOURNAL_FILENAME), { force: true });
      throw new Error(`Workspace move failed and completed moves were rolled back: ${error instanceof Error ? error.message : String(error)}`);
    }
    writeMoveJournal(plan.workspaceRoot, completed);
    throw new Error(`Workspace move failed; rollback also failed. Recovery journal: ${path.join(plan.workspaceRoot, WORKSPACE_INIT_JOURNAL_FILENAME)}\n${rollbackFailures.join('\n')}`);
  }
}

function ensureMainCheckout(plan: WorkspaceInitializationPlan): WorkspaceInitWorktree | undefined {
  if (plan.worktrees.some((worktree) => worktree.role === 'main')) return undefined;
  const primary = plan.worktrees.find((worktree) => worktree.primary) ?? plan.worktrees[0];
  if (!primary) throw new Error('Cannot create a main checkout without a source worktree.');
  const targetPath = path.join(plan.workspaceRoot, `${plan.folderPrefix}-main`);
  runGitOrThrow(primary.targetPath, ['worktree', 'add', targetPath, plan.defaultBranch]);
  const head = runGitOrThrow(targetPath, ['rev-parse', 'HEAD']);
  return { sourcePath: targetPath, targetPath, branch: plan.defaultBranch, head, role: 'main', primary: false, dirty: false, unmerged: false };
}

function copyLegacyProjectMemory(plan: WorkspaceInitializationPlan, legacyProjectPath: string): void {
  for (const memoryPath of plan.existingProjectMemory) {
    const fileName = path.basename(memoryPath);
    fs.copyFileSync(path.join(legacyProjectPath, fileName), path.join(plan.projectPath, fileName));
  }
}

function ensureInferredProjectRemote(plan: WorkspaceInitializationPlan): void {
  if (plan.projectRemoteSource !== 'inferred' || !plan.projectRemoteRepository) return;
  if (runGhOrUndefined(['repo', 'view', plan.projectRemoteRepository, '--json', 'nameWithOwner'])) return;

  try {
    runGh([
      'repo',
      'create',
      plan.projectRemoteRepository,
      '--private',
      '--description',
      `MDS workspace control repository for ${plan.workspaceName}`,
    ]);
  } catch (error) {
    if (runGhOrUndefined(['repo', 'view', plan.projectRemoteRepository, '--json', 'nameWithOwner'])) return;
    throw error;
  }
}

function createProjectControlRepo(plan: WorkspaceInitializationPlan, worktrees: WorkspaceInitWorktree[], consolidateLegacyProject = false): void {
  if (!plan.projectRemote) throw new Error('A project control-repository remote is required.');
  const legacySource = worktrees.find((worktree) => worktree.primary) ?? worktrees[0];
  if (!legacySource) throw new Error('Cannot initialize a project control repository without a source worktree.');
  ensureInferredProjectRemote(plan);
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
    copyLegacyProjectMemory(plan, legacyProjectPath);
  }
  if (consolidateLegacyProject) applyLegacyProjectConsolidation(plan.legacyProjectMigration, plan.projectPath);
  applyRetrospectiveProjectOnboarding(planRetrospectiveProjectOnboarding(legacySource.targetPath, {
    projectPath: plan.projectPath,
    legacyProjectMemoryFound: plan.existingProjectMemory.length > 0,
  }));
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

function createLegacyProjectCleanupPullRequest(plan: WorkspaceInitializationPlan, worktrees: WorkspaceInitWorktree[]): void {
  const primary = worktrees.find((worktree) => worktree.primary) ?? worktrees.find((worktree) => worktree.role === 'main');
  if (!primary || primary.branch !== plan.defaultBranch) throw new Error('Legacy project cleanup requires the primary checkout on the default branch.');
  const remote = plan.manifest.repositories[0]?.remote;
  const repository = parseGitHubRemote(remote)?.fullName;
  if (!repository) throw new Error('Legacy project cleanup PR requires a GitHub source remote.');
  runGitOrThrow(primary.targetPath, ['fetch', '--prune', 'origin']);
  const [aheadText, behindText] = runGitOrThrow(primary.targetPath, ['rev-list', '--left-right', '--count', `HEAD...origin/${plan.defaultBranch}`]).split(/\s+/);
  if (Number(aheadText) !== 0 || Number(behindText) !== 0) {
    throw new Error(`Legacy project cleanup requires an up-to-date ${plan.defaultBranch}; ask the UD to fast-forward first.`);
  }
  const branch = 'chore/consolidate-project-control-plane';
  const checkout = path.join(plan.tempPath, 'legacy-project-cleanup');
  if (fs.existsSync(checkout)) throw new Error(`Legacy project cleanup checkout already exists: ${checkout}`);
  runGitOrThrow(primary.targetPath, ['worktree', 'add', '-b', branch, checkout, plan.defaultBranch]);
  try {
    runGitOrThrow(checkout, ['rm', '-r', '--', 'project']);
    runGitOrThrow(checkout, ['commit', '-m', 'chore: consolidate project control plane']);
    runGitOrThrow(checkout, ['push', '-u', 'origin', branch]);
    runGh(['pr', 'create', '--repo', repository, '--base', plan.defaultBranch, '--head', branch, '--title', 'chore: consolidate project control plane', '--body', 'Moves canonical project memory to the workspace control repository.']);
  } finally {
    runGitOrThrow(primary.targetPath, ['worktree', 'remove', checkout]);
  }
}

export function applyWorkspaceInitialization(plan: WorkspaceInitializationPlan, options: { stash?: boolean; yes?: boolean; consolidateLegacyProject?: boolean } = {}): WorkspaceInitializationPlan {
  if (!options.yes) throw new Error('Refusing to apply without --yes.');
  if (plan.errors.length > 0) throw new Error(`Cannot initialize workspace:\n${plan.errors.join('\n')}`);
  if (workspaceInitializationRequiresSafeWorkingDirectory(plan)) {
    throw new Error('Workspace initialization must run from outside any worktree that will move. Re-run through the workspace init handoff.');
  }
  const unmerged = plan.worktrees.filter((worktree) => worktree.unmerged);
  if (unmerged.length > 0) {
    throw new Error(
      `Cannot initialize workspace while worktrees have unresolved merge conflicts:\n${unmerged.map((worktree) => worktree.sourcePath).join('\n')}`
    );
  }
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
  createProjectControlRepo(plan, finalWorktrees, options.consolidateLegacyProject);
  for (const worktree of finalWorktrees) writeSourceLink(worktree.targetPath, plan.manifest.workspaceId, plan.projectRemote!);
  if (options.consolidateLegacyProject) createLegacyProjectCleanupPullRequest(plan, finalWorktrees);
  return { ...plan, worktrees: finalWorktrees };
}
