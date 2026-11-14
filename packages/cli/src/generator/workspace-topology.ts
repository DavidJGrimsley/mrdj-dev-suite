/**
 * New i2 workspace topology for generated apps.
 *
 * A `new-workspace` generation creates a complete, functional workspace around the official generator output:
 *
 *   <app>-i2Workspace/
 *     project/               control repository: canonical project memory + mds.workspace.json (branch main)
 *     <app>-main/            source main checkout: the generated app (branch main), `.mds/workspace.json` link
 *                            (the official generator creates <root>/<app>, renamed here so package names stay <app>)
 *     temp/                  scratch; local bare remotes live in temp/local-remotes
 *     generated/             non-app artifacts
 *
 * Everything here is local. No GitHub repository is created, no network remote is contacted and nothing is pushed
 * anywhere except to the two local bare repositories inside the new workspace root. Existing `mds workspace init`
 * (which moves worktrees and may create GitHub repositories) is deliberately not used.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalizeJson } from '@mr.dj2u/framework-registry';
import type { CancellationTokenLike, NewWorkspaceTopology, VerificationCheck, VerificationReport } from './adapter-types.js';
import { DestinationNotEmptyError } from './adapter-types.js';
import { discoverWorkspace } from '../workspace/discover.js';
import { WORKSPACE_MANIFEST_FILENAME, WORKSPACE_MANIFEST_VERSION, SOURCE_WORKSPACE_LINK_PATH, parseSourceWorkspaceLink } from '../workspace/schema.js';
import type { WorkspaceManifest } from '../workspace/schema.js';
import { ensureControlPlaneGuidelines, writeSourceLink } from '../workspace/init.js';
import { getWorkspaceStatus } from '../workspace/status.js';
import { assertNoSymlinks, controlledEnvironment, fileDigest, identifyExecutable } from './runner.js';

export const WORKSPACE_ROOT_SUFFIX = '-i2Workspace';
export const GENERATION_STATE_FILENAME = '.mds-generation.json';
export const REQUIRED_CONTROL_MEMORY = ['info.md', 'todo.md', 'style.md', 'guidelines.md'] as const;
const LOCAL_REMOTES_DIRECTORY = path.join('temp', 'local-remotes');
/** Workspace entries an app name may not shadow. */
const RESERVED_ENTRY_NAMES = new Set(['project', 'temp', 'generated', 'remotes']);
/** Generator-made commits use a fixed, reviewed identity; the user's Git config is never written. */
export const GENERATOR_COMMIT_AUTHOR = { name: 'MDS Generator', email: 'mds-generator@localhost' } as const;

function isInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function samePath(a: string, b: string): boolean {
  const left = path.resolve(a), right = path.resolve(b);
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

type GitIdentity = Pick<NewWorkspaceTopology, 'git' | 'commitAuthor'>;
const NO_HOOKS = process.platform === 'win32' ? 'NUL' : '/dev/null';
/**
 * Every repository operation runs the planned Git binary without a shell, with prompts, signing, credential helpers
 * and hooks disabled, and with the planned author. Nothing is written to any Git config.
 */
function git(identity: GitIdentity, cwd: string, args: readonly string[]): string {
  const author = identity.commitAuthor;
  try {
    return execFileSync(identity.git.executable, ['-C', cwd, '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', '-c', 'credential.helper=', '-c', `core.hooksPath=${NO_HOOKS}`, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 180000, maxBuffer: 64 * 1024 * 1024,
      env: { ...controlledEnvironment(), GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: author.name, GIT_AUTHOR_EMAIL: author.email, GIT_COMMITTER_NAME: author.name, GIT_COMMITTER_EMAIL: author.email },
    }).trim();
  } catch (error) {
    const detail = error && typeof error === 'object' && 'stderr' in error ? String((error as { stderr: unknown }).stderr).trim() : (error instanceof Error ? error.message : String(error));
    throw new Error(`git ${args.slice(0, 2).join(' ')} failed in ${cwd}: ${detail}`);
  }
}
function gitMaybe(identity: GitIdentity, cwd: string, args: readonly string[]): string | undefined {
  try { return git(identity, cwd, args); } catch { return undefined; }
}

/** Renames with bounded retries for transient Windows locks (indexers, antivirus) on a freshly installed tree. */
function renameWithRetry(from: string, to: string): void {
  for (let attempt = 0; ; attempt += 1) {
    try { fs.renameSync(from, to); return; }
    catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(code ?? '')) throw new Error(`Could not rename ${from} to ${to} (${code ?? 'error'}); close editors or watchers holding files there and resume from the retained output`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250 * (attempt + 1));
    }
  }
}

/** Derives the complete reviewed topology. Pure path math plus read-only discovery of an enclosing workspace. */
export function planNewWorkspaceTopology(appName: string, targetDirectory: string): NewWorkspaceTopology {
  const root = path.resolve(targetDirectory);
  if (RESERVED_ENTRY_NAMES.has(appName)) throw new Error(`App name "${appName}" would shadow the workspace ${appName}/ entry`);
  if (path.basename(root) !== `${appName}${WORKSPACE_ROOT_SUFFIX}`) {
    throw new Error(`A new workspace root must be named "${appName}${WORKSPACE_ROOT_SUFFIX}" (got "${path.basename(root)}"). The target directory of a new-workspace generation is the workspace root.`);
  }
  let enclosing: ReturnType<typeof discoverWorkspace>;
  try { enclosing = discoverWorkspace(path.dirname(root)); }
  catch (error) { throw new Error(`An enclosing workspace manifest is invalid; refusing to nest a new workspace in it: ${error instanceof Error ? error.message : String(error)}`); }
  if (enclosing && enclosing.manifest.workspaceId === appName) {
    throw new Error(`Workspace id "${appName}" collides with the enclosing workspace at ${enclosing.workspaceRoot}; choose another app name.`);
  }
  const remotes = path.join(root, LOCAL_REMOTES_DIRECTORY);
  const gitExecutable = identifyExecutable('git');
  return {
    workspaceId: appName, name: appName, root,
    projectPath: path.join(root, 'project'), manifestPath: path.join(root, 'project', WORKSPACE_MANIFEST_FILENAME),
    tempPath: path.join(root, 'temp'), generatedPath: path.join(root, 'generated'),
    sourcePath: path.join(root, `${appName}-main`), generatorOutputPath: path.join(root, appName), defaultBranch: 'main',
    sourceRemote: path.join(remotes, `${appName}-source.git`), projectRemote: path.join(remotes, `${appName}-project.git`),
    git: { executable: gitExecutable, digest: fileDigest(gitExecutable) }, commitAuthor: { ...GENERATOR_COMMIT_AUTHOR },
    logPath: path.join(root, 'temp', 'generation.log'),
    ...(enclosing ? { enclosingWorkspace: { root: enclosing.workspaceRoot, workspaceId: enclosing.manifest.workspaceId } } : {}),
  };
}

export function newWorkspaceReservationPaths(topology: NewWorkspaceTopology): string[] {
  return [topology.root, topology.projectPath, topology.generatorOutputPath, topology.sourcePath, topology.tempPath, topology.generatedPath, topology.sourceRemote, topology.projectRemote];
}

export function buildWorkspaceManifest(topology: NewWorkspaceTopology): WorkspaceManifest {
  return {
    schemaVersion: WORKSPACE_MANIFEST_VERSION, workspaceId: topology.workspaceId, name: topology.name,
    repositories: [{ id: 'source', remote: topology.sourceRemote, defaultBranch: topology.defaultBranch, mainFolder: path.basename(topology.sourcePath), worktreePrefix: `${topology.name}-` }],
    project: { path: 'project' }, temp: { path: 'temp' },
  };
}

/** Semantic validation run both at plan time and again immediately before execution. */
export function validateNewWorkspacePlan(appName: string, targetDirectory: string, topology: NewWorkspaceTopology): void {
  const expected = planNewWorkspaceTopology(appName, targetDirectory);
  if (canonicalizeJson(expected) !== canonicalizeJson(topology)) throw new Error('Workspace topology does not match the root and current enclosing workspace; replan');
  const root = expected.root, parent = path.dirname(root);
  if (root === path.parse(root).root) throw new Error('Cannot create a workspace at the filesystem root');
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) throw new Error('Workspace parent directory must already exist');
  assertNoSymlinks(root);
  if (fs.existsSync(root)) {
    if (!fs.statSync(root).isDirectory() || fs.readdirSync(root).length > 0) throw new DestinationNotEmptyError(root);
  }
  const insideRepository = gitMaybe(expected, parent, ['rev-parse', '--show-toplevel']);
  if (insideRepository) throw new Error(`A new workspace cannot be created inside the Git work tree ${insideRepository}; choose a directory outside every repository (nesting in a workspace folder that is not itself a repository is fine).`);
}

function writeState(root: string, state: Record<string, unknown>): void {
  fs.writeFileSync(path.join(root, GENERATION_STATE_FILENAME), `${JSON.stringify({ schemaVersion: 1, ...state }, null, 2)}\n`, 'utf8');
}

function walkFiles(directory: string, base = directory): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory).sort()) {
    const full = path.join(directory, entry), stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`Refusing to migrate a symlink: ${full}`);
    if (stat.isDirectory()) files.push(...walkFiles(full, base));
    else if (stat.isFile()) files.push(path.relative(base, full));
    else throw new Error(`Refusing to migrate a non-file entry: ${full}`);
  }
  return files;
}

/**
 * Generator-owned app `project/` memory becomes the canonical control-repository memory. Files are copied without
 * overwriting, byte-verified, and only then is the freshly generated app-local copy removed, so no competing
 * canonical memory remains in the source checkout.
 */
export function migrateGeneratedMemory(sourcePath: string, projectPath: string): string[] {
  const legacy = path.join(sourcePath, 'project');
  if (!fs.existsSync(legacy)) return [];
  assertNoSymlinks(legacy); assertNoSymlinks(projectPath);
  const files = walkFiles(legacy);
  for (const file of files) if (fs.existsSync(path.join(projectPath, file))) throw new Error(`Control repository already contains project/${file}; refusing to overwrite`);
  const created: string[] = [];
  try {
    for (const file of files) {
      const to = path.join(projectPath, file);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(path.join(legacy, file), to, fs.constants.COPYFILE_EXCL); created.push(to);
    }
    for (const file of files) if (fileDigest(path.join(legacy, file)) !== fileDigest(path.join(projectPath, file))) throw new Error(`Migrated memory differs from source: project/${file}`);
  } catch (error) {
    for (const to of created.reverse()) { try { fs.unlinkSync(to); } catch { /* retained for review */ } }
    throw error;
  }
  fs.rmSync(legacy, { recursive: true });
  return files;
}

function remoteUrl(id: GitIdentity, repo: string): string | undefined { return gitMaybe(id, repo, ['remote', 'get-url', 'origin']); }

function pushLocal(id: GitIdentity, repo: string, remote: string, root: string, branch: string): void {
  // The only push this generator performs: to a bare repository inside the new workspace root.
  if (!isInside(path.join(root, LOCAL_REMOTES_DIRECTORY), remote) || !fs.existsSync(path.join(remote, 'HEAD'))) throw new Error(`Refusing to push to anything but the planned local bare remote under ${LOCAL_REMOTES_DIRECTORY}: ${remote}`);
  const origin = remoteUrl(id, repo);
  if (!origin || !samePath(origin, remote)) throw new Error(`origin of ${repo} is not the planned local remote`);
  git(id, repo, ['push', '--no-verify', '-u', 'origin', `HEAD:refs/heads/${branch}`]);
}

function commitAll(id: GitIdentity, repo: string, message: string): boolean {
  git(id, repo, ['add', '-A']);
  if (!git(id, repo, ['status', '--porcelain'])) return false;
  git(id, repo, ['commit', '--no-verify', '-m', message]);
  return true;
}

export interface WorkspaceCompletionOptions {
  /** Canonical memory to create in the control repository when the official generator produced none (never overwrites). */
  readonly memoryFiles?: Readonly<Record<string, string>>;
}

export interface TopologyOutcome { readonly report: VerificationReport; readonly deferred: readonly string[]; readonly migratedMemory: readonly string[] }

/** Stateful, non-destructive bootstrap of one new workspace. Partial output is retained, never recursively deleted. */
export class NewWorkspaceBootstrap {
  private step = 'created';
  constructor(private readonly plan: { readonly planDigest: string; readonly appName: string; readonly frameworkId: string }, private readonly topology: NewWorkspaceTopology, private readonly cancellation?: CancellationTokenLike) {}
  private at(step: string): void { this.cancellation?.throwIfCancelled(); this.step = step; writeState(this.topology.root, { state: 'in-progress', step, planDigest: this.plan.planDigest, frameworkId: this.plan.frameworkId, updatedAt: new Date().toISOString() }); }

  /** Creates the root, control repository, local bare remotes, temp and generated before the official generator runs. */
  createSkeleton(): void {
    const t = this.topology;
    validateNewWorkspacePlan(this.plan.appName, t.root, t);
    if (!fs.existsSync(t.root)) fs.mkdirSync(t.root);
    this.at('skeleton');
    for (const directory of [t.tempPath, t.generatedPath, path.join(t.root, LOCAL_REMOTES_DIRECTORY)]) fs.mkdirSync(directory, { recursive: true });
    for (const remote of [t.sourceRemote, t.projectRemote]) git(t, t.root, ['init', '--bare', `--initial-branch=${t.defaultBranch}`, remote]);
    git(t, t.root, ['init', `--initial-branch=${t.defaultBranch}`, t.projectPath]);
    // The manifest exists before the generator runs, so any workspace discovery during generation selects the new
    // workspace instead of an enclosing one.
    fs.writeFileSync(t.manifestPath, `${JSON.stringify(buildWorkspaceManifest(t), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    git(t, t.projectPath, ['remote', 'add', 'origin', t.projectRemote]);
  }

  /** Records that the official generator is running, so a crash or failure names the right step. */
  beginGenerator(): void { this.at('official-generator'); }

  /** Runs after the official generator succeeded. */
  complete(options: WorkspaceCompletionOptions = {}): TopologyOutcome {
    const t = this.topology;
    this.at('verify-generator-output');
    assertNoSymlinks(t.generatorOutputPath);
    if (!fs.existsSync(t.generatorOutputPath) || !fs.lstatSync(t.generatorOutputPath).isDirectory()) throw new Error(`The official generator did not create ${t.generatorOutputPath}`);
    const unexpected = fs.readdirSync(t.root).filter(entry => ![path.basename(t.generatorOutputPath), 'project', 'temp', 'generated', GENERATION_STATE_FILENAME].includes(entry));
    if (unexpected.length) throw new Error(`The generator wrote unexpected workspace entries: ${unexpected.join(', ')}`);
    this.at('rename-source-checkout');
    if (fs.existsSync(t.sourcePath)) throw new Error(`Source checkout path already exists: ${t.sourcePath}`);
    renameWithRetry(t.generatorOutputPath, t.sourcePath);
    this.at('migrate-memory');
    const migrated = migrateGeneratedMemory(t.sourcePath, t.projectPath);
    for (const [file, content] of Object.entries(options.memoryFiles ?? {})) {
      const target = path.join(t.projectPath, file);
      if (!fs.existsSync(target)) fs.writeFileSync(target, content, { encoding: 'utf8', flag: 'wx' });
    }
    ensureControlPlaneGuidelines(t.projectPath);
    this.at('source-repository');
    const hasRepo = fs.existsSync(path.join(t.sourcePath, '.git'));
    if (!hasRepo) git(t, t.sourcePath, ['init', `--initial-branch=${t.defaultBranch}`]);
    else {
      if (remoteUrl(t, t.sourcePath)) throw new Error('The generated source checkout already has an origin remote; refusing to rewire it');
      const head = gitMaybe(t, t.sourcePath, ['symbolic-ref', '--short', 'HEAD']);
      if (head !== t.defaultBranch) {
        // Rename a generator-created branch in place; an unborn branch is only re-pointed so no commit is orphaned.
        if (gitMaybe(t, t.sourcePath, ['rev-parse', '--verify', 'HEAD'])) git(t, t.sourcePath, ['branch', '-m', t.defaultBranch]);
        else git(t, t.sourcePath, ['symbolic-ref', 'HEAD', `refs/heads/${t.defaultBranch}`]);
      }
    }
    // The ignored link is written first so it can never be committed.
    writeSourceLink(t.sourcePath, t.workspaceId, t.projectRemote);
    if (fs.existsSync(path.join(t.sourcePath, 'node_modules')) && gitMaybe(t, t.sourcePath, ['check-ignore', '-q', 'node_modules']) === undefined) {
      throw new Error('node_modules is not ignored by the generated source repository; refusing to commit dependencies');
    }
    commitAll(t, t.sourcePath, hasRepo ? 'chore: apply MDS onboarding to generated scaffold' : 'chore: initial generated scaffold');
    this.at('source-remote');
    git(t, t.sourcePath, ['remote', 'add', 'origin', t.sourceRemote]);
    pushLocal(t, t.sourcePath, t.sourceRemote, t.root, t.defaultBranch);
    this.at('control-repository');
    commitAll(t, t.projectPath, `feat(workspace): initialize ${t.name} control plane`);
    pushLocal(t, t.projectPath, t.projectRemote, t.root, t.defaultBranch);
    this.at('verify-topology');
    const outcome = { ...this.verifyTopology(), migratedMemory: migrated };
    if (!outcome.report.passed) throw new Error(`Workspace topology verification failed: ${outcome.report.checks.filter(c => !c.passed).map(c => `${c.name}: ${c.message}`).join('; ')}`);
    fs.rmSync(path.join(t.root, GENERATION_STATE_FILENAME), { force: true });
    return outcome;
  }

  fail(error: unknown): void {
    try { writeState(this.topology.root, { state: 'failed', step: this.step, planDigest: this.plan.planDigest, error: error instanceof Error ? error.message : String(error), note: 'Partial workspace retained for review; nothing was deleted or published.', updatedAt: new Date().toISOString() }); }
    catch { /* The root may not exist yet. */ }
  }

  /** Topology completion does not mean that the app starts. Retain failed framework evidence outside Git. */
  recordFrameworkVerification(report: VerificationReport): void {
    if (report.passed) return;
    writeState(this.topology.root, {
      state: 'partial', step: 'framework-verification', planDigest: this.plan.planDigest,
      frameworkId: this.plan.frameworkId, verification: report,
      note: 'Scaffold retained. Resolve the reported failures and rerun verification before treating this app as ready.',
      updatedAt: new Date().toISOString(),
    });
  }

  verifyTopology(): { report: VerificationReport; deferred: string[] } {
    const t = this.topology;
    const checks: VerificationCheck[] = [];
    const check = (name: string, passed: boolean, message: string) => checks.push({ name, passed, message });
    const guard = (name: string, fn: () => [boolean, string]) => { try { const [passed, message] = fn(); check(name, passed, message); } catch (error) { check(name, false, error instanceof Error ? error.message : String(error)); } };
    let deferred: string[] = [];
    guard('workspace:discovery', () => {
      const found = discoverWorkspace(t.sourcePath);
      const ok = found !== undefined && samePath(found.workspaceRoot, t.root) && found.manifest.workspaceId === t.workspaceId && samePath(found.projectPath, t.projectPath);
      return [ok, ok ? 'Source checkout resolves the new workspace and its control repository' : `Source checkout resolved ${found?.workspaceRoot ?? 'no workspace'}`];
    });
    guard('workspace:enclosing-memory-not-selected', () => {
      const found = discoverWorkspace(t.sourcePath);
      const ok = !t.enclosingWorkspace || (found !== undefined && !samePath(found.workspaceRoot, t.enclosingWorkspace.root));
      return [ok, t.enclosingWorkspace ? `Enclosing workspace ${t.enclosingWorkspace.root} is not selected` : 'No enclosing workspace'];
    });
    guard('workspace:no-app-local-memory', () => [!fs.existsSync(path.join(t.sourcePath, 'project')), 'No app-local project/ directory competes with the control repository']);
    guard('workspace:source-link', () => {
      const link = parseSourceWorkspaceLink(JSON.parse(fs.readFileSync(path.join(t.sourcePath, SOURCE_WORKSPACE_LINK_PATH), 'utf8')));
      const ignored = gitMaybe(t, t.sourcePath, ['check-ignore', '-q', SOURCE_WORKSPACE_LINK_PATH]) !== undefined;
      return [link.workspaceId === t.workspaceId && ignored, 'Ignored .mds/workspace.json link matches the manifest'];
    });
    guard('workspace:required-memory', () => {
      const missing = REQUIRED_CONTROL_MEMORY.filter(file => !fs.existsSync(path.join(t.projectPath, file)));
      return [missing.length === 0, missing.length ? `Missing control memory: ${missing.join(', ')}` : 'info.md, todo.md, style.md and guidelines.md exist only in the control repository'];
    });
    for (const [label, repo, remote] of [['control', t.projectPath, t.projectRemote], ['source', t.sourcePath, t.sourceRemote]] as const) {
      guard(`workspace:${label}-repository`, () => {
        const branch = git(t, repo, ['symbolic-ref', '--short', 'HEAD']), head = git(t, repo, ['rev-parse', 'HEAD']);
        const clean = git(t, repo, ['status', '--porcelain']) === '';
        const remoteHead = git(t, remote, ['rev-parse', `refs/heads/${t.defaultBranch}`]);
        const upstream = gitMaybe(t, repo, ['rev-parse', '--abbrev-ref', '@{upstream}']);
        const remotes = git(t, repo, ['remote']).split(/\r?\n/).filter(Boolean);
        const ok = branch === t.defaultBranch && clean && remoteHead === head && samePath(remoteUrl(t, repo) ?? '', remote) && upstream === `origin/${t.defaultBranch}` && remotes.length === 1;
        return [ok, `branch ${branch}, ${clean ? 'clean' : 'dirty'}, upstream ${upstream ?? 'none'}, remotes [${remotes.join(', ')}], local remote ${remoteHead === head ? 'matches' : 'differs from'} HEAD`];
      });
    }
    guard('workspace:generator-output-renamed', () => [!fs.existsSync(t.generatorOutputPath) && fs.existsSync(path.join(t.sourcePath, '.git')), `Generator output was moved to ${path.basename(t.sourcePath)}`]);
    guard('workspace:layout', () => {
      const missing = [t.tempPath, t.generatedPath, t.manifestPath].filter(p => !fs.existsSync(p));
      return [missing.length === 0, missing.length ? `Missing ${missing.join(', ')}` : 'Manifest, temp and generated exist'];
    });
    guard('workspace:status', () => {
      const status = getWorkspaceStatus(t.sourcePath);
      if (!status.found) return [false, 'mds workspace status found no workspace'];
      const markers = status.integrityIssues.filter(issue => issue.startsWith('Unresolved TodoForContext marker'));
      deferred = markers;
      const blocking = status.integrityIssues.filter(issue => !markers.includes(issue));
      return [blocking.length === 0 && samePath(status.workspaceRoot, t.root), blocking.length ? blocking.join('; ') : `Workspace status has no integrity issues (${markers.length} deferred TodoForContext marker(s))`];
    });
    return { report: { frameworkId: this.plan.frameworkId, passed: checks.every(c => c.passed), checks, unverifiedPlatforms: [] }, deferred };
  }
}
