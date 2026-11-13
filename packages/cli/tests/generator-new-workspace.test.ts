import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CancellationToken,
  ExactAdapter,
  ExpoReactNativeAdapter,
  GENERATION_STATE_FILENAME,
  computePlanDigest,
  parseGenerationPlan,
  type GenerationPlan,
} from '../src/generator.js';
import { discoverWorkspace, getWorkspaceStatus } from '../src/workspace/index.js';

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const satisfied = { frameworkId: 'expo-react-native' as const, satisfied: true, prerequisites: [], summary: 'mocked prerequisites', notes: [] };

/** Stands in for create-expo-super-stack: creates <cwd>/<app> with app-local project/, a master branch and ignored node_modules. */
function fakeCess(options: { code?: number; skipApp?: boolean; conflictingMemory?: boolean } = {}) {
  const calls: { cwd: string; args: readonly string[] }[] = [];
  const runner = async (spec: { cwd: string; args: readonly string[] }) => {
    calls.push({ cwd: spec.cwd, args: spec.args });
    if (options.code) return { code: options.code, stdout: '', stderr: 'simulated generator failure' };
    if (options.skipApp) return { code: 0, stdout: '', stderr: '' };
    const appName = spec.args[1]!;
    const app = path.join(spec.cwd, appName);
    mkdirSync(path.join(app, 'src', 'app'), { recursive: true });
    mkdirSync(path.join(app, 'node_modules', 'expo'), { recursive: true });
    writeFileSync(path.join(app, 'node_modules', 'expo', 'index.js'), '');
    writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: appName, dependencies: { expo: '~56.0.19' } }));
    writeFileSync(path.join(app, 'app.json'), JSON.stringify({ expo: { name: 'Demo', slug: appName, platforms: ['ios', 'android'] } }));
    writeFileSync(path.join(app, '.gitignore'), 'node_modules/\n');
    writeFileSync(path.join(app, 'src', 'app', 'index.tsx'), 'export default function Index() { return null; }\n');
    execFileSync('git', ['init', '-b', 'master', app], { stdio: 'ignore' });
    execFileSync('git', ['-C', app, 'add', '-A'], { stdio: 'ignore' });
    execFileSync('git', ['-C', app, '-c', 'user.name=cess', '-c', 'user.email=cess@example.test', 'commit', '-m', 'Initial commit'], { stdio: 'ignore' });
    // MDS onboarding runs after the stack commit, so project memory is untracked and app-local.
    mkdirSync(path.join(app, 'project'));
    for (const file of ['info.md', 'todo.md', 'style.md', 'guidelines.md']) writeFileSync(path.join(app, 'project', file), `# ${file} for ${appName}\n`);
    writeFileSync(path.join(app, 'project', 'theme.json'), '{"theme":"generated"}\n');
    if (options.conflictingMemory) writeFileSync(path.join(app, 'project', 'mds.workspace.json'), '{}');
    return { code: 0, stdout: 'ok', stderr: '' };
  };
  return { runner, calls };
}
class MockedExpo extends ExpoReactNativeAdapter {
  override async checkPrerequisites() { return satisfied; }
}
const snapshot = (directory: string): Record<string, string> => {
  const out: Record<string, string> = {};
  const visit = (dir: string) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) visit(full); else out[path.relative(directory, full)] = readFileSync(full, 'utf8'); } };
  visit(directory); return out;
};
/** A stand-in for an existing workspace such as the one that contains test-apps: manifest + memory, no source repos. */
function makeOuterWorkspace(base: string, id = 'outer'): { root: string; project: string } {
  const root = path.join(base, `${id}-i2Workspace`), project = path.join(root, 'project');
  mkdirSync(path.join(root, 'test-apps'), { recursive: true }); mkdirSync(project);
  writeFileSync(path.join(project, 'mds.workspace.json'), JSON.stringify({ schemaVersion: 1, workspaceId: id, name: id, repositories: [{ id: 'source', remote: 'https://example.invalid/outer.git', defaultBranch: 'main', mainFolder: `${id}-main`, worktreePrefix: `${id}-` }], project: { path: 'project' }, temp: { path: 'temp' } }));
  for (const file of ['info.md', 'todo.md', 'style.md', 'guidelines.md']) writeFileSync(path.join(project, file), `OUTER ${file}\n`);
  return { root, project };
}

describe('new-workspace generation (default identity)', () => {
  let base: string;
  beforeEach(() => { base = mkdtempSync(path.join(os.tmpdir(), 'mds-new-workspace-')); });
  afterEach(() => { rmSync(base, { recursive: true, force: true }); });

  it('plans a complete new workspace by default; CESS runs in the root so package names stay <app>', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const plan = await new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    expect(plan.projectMemory).toEqual({ mode: 'new-workspace', location: path.join(root, 'project'), coordinatorOwned: true });
    expect(plan.workspace).toMatchObject({ workspaceId: 'demo', root, sourcePath: path.join(root, 'demo-main'), generatorOutputPath: path.join(root, 'demo'), projectPath: path.join(root, 'project'), defaultBranch: 'main', logPath: path.join(root, 'temp', 'generation.log'), commitAuthor: { name: 'MDS Generator', email: 'mds-generator@localhost' } });
    expect(plan.workspace?.git.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.workspace?.enclosingWorkspace).toBeUndefined();
    expect(plan.execution?.args).not.toContain('--mds-workspace');
    expect(plan.execution?.args[1]).toBe('demo');
    expect(plan.execution?.args.some(arg => /^--mds-create-expo-stack-bin=.*create-expo-stack\.js$/.test(arg))).toBe(true);
    expect(plan.execution?.localSources?.some(source => source.directory.endsWith(path.join('create-expo-stack', 'build')))).toBe(true);
    expect(plan.execution?.cwd).toBe(root);
    expect(plan.generatorIdentity.adapterVersion).toBe('0.4.0');
    expect(plan.reservationPaths).toContain(plan.workspace!.sourceRemote);
    expect(plan.planDigest).toBe(computePlanDigest(plan));
    expect(parseGenerationPlan(JSON.parse(JSON.stringify(plan)))).toBeTruthy();
    expect((await new MockedExpo().validatePlan(plan)).valid).toBe(true);
  });

  it('keeps user-supplied intake answers: platforms, display name and stack flags reach the official command', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const answers = { displayAppName: 'Experimemo', targetPlatforms: ['ios', 'android'], packageManager: 'npm', navigationLibrary: 'expo-router', stylingSystem: 'nativewindui', webOutput: 'none' };
    const plan = await new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, options: { answers } });
    expect(plan.targetPlatforms).toEqual(['ios', 'android']);
    const args = plan.execution!.args.join(' ');
    expect(args).toContain('Experimemo');
    expect(args).toContain('--nativewindui');
    expect(args).toContain('--npm');
    expect(args).toContain('--mds-platforms=ios,android');
    expect(args).not.toContain('--mds-skip-expo-fix');
    const skipped = await new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, options: { answers, skipExpoProjectChecks: true } });
    expect(skipped.execution!.args).toContain('--mds-skip-expo-fix');
    expect(skipped.planDigest).not.toBe(plan.planDigest);
    await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, options: { skipExpoProjectChecks: 'yes' } })).rejects.toThrow(/must be a boolean/);
    // Without a supplied display name CESS derives one; the app slug is never forced into the display name.
    const derived = await new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    expect(derived.execution!.args).toContain('--mds-app-name=Demo');
    await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, platforms: ['web'], options: { answers } })).rejects.toThrow(/conflicts with the requested platforms/);
  });

  it('creates the functional topology, migrates memory, and never touches an enclosing workspace', async () => {
    const outer = makeOuterWorkspace(base);
    const outerBefore = snapshot(outer.project);
    const outerEntries = readdirSync(outer.root).sort();
    const root = path.join(outer.root, 'test-apps', 'demo-i2Workspace');
    const { runner, calls } = fakeCess();
    const adapter = new MockedExpo(runner as never);
    const openDecisions = ['Navigation: info.md lists both "Native tabs + modal stack" and "Drawer + Tabs".'];
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, platforms: ['ios', 'android'], options: { answers: { displayAppName: 'Demo' }, openDecisions, sourceInfo: { path: 'X:/original/info.md', sha256: 'a'.repeat(64) } } });
    expect(plan.projectMemory?.mode).toBe('new-workspace');
    expect(plan.workspace?.enclosingWorkspace).toEqual({ root: outer.root, workspaceId: 'outer' });
    const validation = await adapter.validatePlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.warnings.join(' ')).toContain('outer');

    const result = await adapter.generate(plan, { approvedPlanDigest: plan.planDigest });
    expect(calls).toHaveLength(1);
    expect(result.success).toBe(true);
    expect(result.topologyReport?.passed).toBe(true);
    expect(result.topologyReport?.checks.map(c => c.name)).toContain('workspace:enclosing-memory-not-selected');
    // Honest verification: Expo build/runtime was not verified by the adapter.
    expect(result.verificationReport?.passed).toBe(false);
    expect(result.handoff.verificationStatus).toBe('unverified');
    expect(result.handoff.deferredDecisions).toEqual(expect.arrayContaining(openDecisions));
    for (const name of ['package name', 'Expo slug', 'display name', 'platforms']) expect(result.verificationReport?.checks.find(c => c.name === name)?.passed).toBe(true);
    expect(result.handoff.workspace).toEqual({ root, sourceCheckout: path.join(root, 'demo-main'), controlRepository: path.join(root, 'project'), publication: 'local-only' });

    const source = path.join(root, 'demo-main'), control = path.join(root, 'project');
    expect(readdirSync(root).sort()).toEqual(['demo-main', 'generated', 'project', 'temp']);
    expect(existsSync(path.join(root, GENERATION_STATE_FILENAME))).toBe(false);
    // Control repository: canonical memory + manifest, committed, pushed to the local bare remote.
    const manifest = JSON.parse(readFileSync(path.join(control, 'mds.workspace.json'), 'utf8'));
    expect(manifest).toMatchObject({ workspaceId: 'demo', repositories: [{ id: 'source', mainFolder: 'demo-main', defaultBranch: 'main', remote: plan.workspace!.sourceRemote }] });
    expect(readFileSync(path.join(control, 'info.md'), 'utf8')).toBe('# info.md for demo\n');
    expect(readFileSync(path.join(control, 'theme.json'), 'utf8')).toContain('generated');
    expect(readFileSync(path.join(control, 'guidelines.md'), 'utf8')).toContain('MDS_CONTROL_PLANE_CONTRACT');
    expect(readFileSync(path.join(control, 'open-decisions.md'), 'utf8')).toContain('Drawer + Tabs');
    expect(readFileSync(path.join(control, 'open-decisions.md'), 'utf8')).toContain('X:/original/info.md');
    expect(git(control, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
    expect(git(control, 'status', '--porcelain')).toBe('');
    expect(git(plan.workspace!.projectRemote, 'rev-parse', 'refs/heads/main')).toBe(git(control, 'rev-parse', 'HEAD'));
    expect(git(control, 'ls-files').split('\n')).toEqual(expect.arrayContaining(['info.md', 'mds.workspace.json']));
    // Source main checkout: generator history preserved, branch renamed to main, no app-local project/, link ignored.
    expect(git(source, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
    // Memory moved out and the link is excluded, so nothing needed committing on top of the generator history.
    expect(git(source, 'log', '--format=%s').split('\n')).toEqual(['Initial commit']);
    expect(git(control, 'log', '-1', '--format=%an <%ae>')).toBe('MDS Generator <mds-generator@localhost>');
    expect(() => git(source, 'config', '--local', '--get-regexp', '^user\\.')).toThrow();
    expect(git(source, 'ls-files').split('\n').some(file => file.startsWith('node_modules'))).toBe(false);
    expect(git(source, 'rev-parse', '--abbrev-ref', '@{upstream}')).toBe('origin/main');
    expect(JSON.parse(readFileSync(path.join(source, 'package.json'), 'utf8')).name).toBe('demo');
    expect(existsSync(path.join(source, 'project'))).toBe(false);
    expect(git(source, 'ls-files').split('\n')).not.toContain('.mds/workspace.json');
    expect(existsSync(path.join(source, '.mds', 'workspace.json'))).toBe(true);
    expect(git(source, 'status', '--porcelain')).toBe('');
    expect(git(plan.workspace!.sourceRemote, 'rev-parse', 'refs/heads/main')).toBe(git(source, 'rev-parse', 'HEAD'));
    expect(git(source, 'remote', 'get-url', 'origin')).toBe(plan.workspace!.sourceRemote);
    // Discovery picks the nearest (new) workspace even though test-apps sits inside the outer one.
    const found = discoverWorkspace(source);
    expect(found?.workspaceRoot).toBe(root);
    expect(found?.projectPath).toBe(control);
    const status = getWorkspaceStatus(source);
    expect(status.found && status.integrityIssues).toEqual([]);
    // The enclosing workspace memory is byte-for-byte untouched; only test-apps/ gained the new root.
    expect(snapshot(outer.project)).toEqual(outerBefore);
    expect(readdirSync(outer.root).sort()).toEqual(outerEntries);
    expect(readdirSync(path.join(outer.root, 'test-apps'))).toEqual(['demo-i2Workspace']);
  });

  it('retains partial output with a failed-state marker when the official generator fails, and refuses to reuse the root', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const adapter = new MockedExpo(fakeCess({ code: 3 }).runner as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    await expect(adapter.generate(plan, { approvedPlanDigest: plan.planDigest })).rejects.toThrow(/Generator exited 3/);
    const state = JSON.parse(readFileSync(path.join(root, GENERATION_STATE_FILENAME), 'utf8'));
    expect(state).toMatchObject({ state: 'failed', step: 'official-generator', planDigest: plan.planDigest });
    expect(existsSync(path.join(root, 'project', 'mds.workspace.json'))).toBe(true);
    expect(existsSync(`${root}.mds-generation.lock`)).toBe(false);
    const again = await new MockedExpo().validatePlan(plan);
    expect(again.valid).toBe(false);
    expect(again.errors.join(' ')).toMatch(/not empty|DestinationNotEmpty|already exists/i);
    await expect(new MockedExpo(fakeCess().runner as never).generate(plan, { approvedPlanDigest: plan.planDigest })).rejects.toThrow(/already exists and contains files/);
  });

  it('fails without a fake success when the generator produced no source checkout', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const adapter = new MockedExpo(fakeCess({ skipApp: true }).runner as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    await expect(adapter.generate(plan, { approvedPlanDigest: plan.planDigest })).rejects.toThrow(/did not create/);
    expect(JSON.parse(readFileSync(path.join(root, GENERATION_STATE_FILENAME), 'utf8')).state).toBe('failed');
  });

  it('never overwrites control files or deletes app memory when migration conflicts', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const adapter = new MockedExpo(fakeCess({ conflictingMemory: true }).runner as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    await expect(adapter.generate(plan, { approvedPlanDigest: plan.planDigest })).rejects.toThrow(/refusing to overwrite/);
    expect(existsSync(path.join(root, 'demo-main', 'project', 'info.md'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(root, 'project', 'mds.workspace.json'), 'utf8')).workspaceId).toBe('demo');
    expect(existsSync(path.join(root, 'project', 'info.md'))).toBe(false);
  });

  it('stops at cancellation checkpoints without deleting anything', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const token = new CancellationToken();
    const adapter = new MockedExpo(((spec: never) => { token.cancel('stop'); return fakeCess().runner(spec); }) as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    await expect(adapter.generate(plan, { approvedPlanDigest: plan.planDigest, cancellationToken: token })).rejects.toThrow(/stop/);
    expect(existsSync(path.join(root, 'demo', 'project', 'info.md'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(root, GENERATION_STATE_FILENAME), 'utf8')).state).toBe('failed');
  });

  it('reports a held or stale lock clearly and never removes it', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const adapter = new MockedExpo(fakeCess().runner as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    writeFileSync(`${root}.mds-generation.lock`, '{"pid":1}');
    await expect(adapter.generate(plan, { approvedPlanDigest: plan.planDigest })).rejects.toThrow(/holds .*mds-generation\.lock.*delete that lock file/);
    expect(existsSync(`${root}.mds-generation.lock`)).toBe(true);
    expect(existsSync(root)).toBe(false);
  });

  it('rejects plans from an older adapter version and malformed open decisions', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const adapter = new MockedExpo();
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
    const old = { ...plan, generatorIdentity: { ...plan.generatorIdentity, adapterVersion: '0.3.0' } } as GenerationPlan;
    expect((await adapter.validatePlan({ ...old, planDigest: computePlanDigest(old) })).errors.join(' ')).toMatch(/replan with 0\.4\.0/);
    const bad = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root, options: { openDecisions: [''] } });
    expect((await adapter.validatePlan(bad)).errors.join(' ')).toMatch(/openDecisions/);
  });

  describe('path safety', () => {
    it('requires the root to be named after the app', async () => {
      await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: path.join(base, 'demo') })).rejects.toThrow(/must be named "demo-i2Workspace"|target directory must be named/);
    });
    it('rejects a workspace id that collides with the enclosing workspace', async () => {
      const outer = makeOuterWorkspace(base, 'demo');
      await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: path.join(outer.root, 'test-apps', 'demo-i2Workspace') })).rejects.toThrow(/collides with the enclosing workspace/);
    });
    it('rejects an invalid enclosing workspace manifest instead of guessing', async () => {
      const outer = makeOuterWorkspace(base);
      writeFileSync(path.join(outer.project, 'mds.workspace.json'), '{not json');
      await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: path.join(outer.root, 'test-apps', 'demo-i2Workspace') })).rejects.toThrow(/enclosing workspace manifest is invalid/);
    });
    it('rejects roots inside a Git work tree and non-empty existing roots', async () => {
      const repo = path.join(base, 'repo'); mkdirSync(repo); execFileSync('git', ['init', repo], { stdio: 'ignore' });
      const adapter = new MockedExpo();
      const inside = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: path.join(repo, 'demo-i2Workspace') });
      expect((await adapter.validatePlan(inside)).errors.join(' ')).toMatch(/inside the Git work tree/);
      const occupied = path.join(base, 'occupied-i2Workspace'); mkdirSync(occupied); writeFileSync(path.join(occupied, 'keep.txt'), 'x');
      const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'occupied', targetDirectory: occupied });
      expect((await adapter.validatePlan(plan)).valid).toBe(false);
      rmSync(path.join(occupied, 'keep.txt'));
      expect((await adapter.validatePlan(plan)).valid).toBe(true);
    });
    it('detects a plan whose topology was edited even with a recomputed digest', async () => {
      const root = path.join(base, 'demo-i2Workspace');
      const adapter = new MockedExpo();
      const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: root });
      const forged = { ...plan, workspace: { ...plan.workspace!, projectRemote: path.join(base, 'elsewhere.git') } } as GenerationPlan;
      const resigned = { ...forged, planDigest: computePlanDigest(forged) };
      const validation = await adapter.validatePlan(resigned);
      expect(validation.valid).toBe(false);
      expect(validation.errors.join(' ')).toMatch(/topology does not match/);
      const noTopology = { ...plan, workspace: undefined } as unknown as GenerationPlan;
      expect((await adapter.validatePlan({ ...noTopology, planDigest: computePlanDigest(noTopology) })).valid).toBe(false);
    });
    it('rejects app names that shadow workspace entries', async () => {
      await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'project', targetDirectory: path.join(base, 'project-i2Workspace') })).rejects.toThrow(/shadow the workspace/);
    });
    it('rejects unknown project identities', async () => {
      await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'demo', targetDirectory: path.join(base, 'demo-i2Workspace'), options: { projectIdentity: 'nested' } })).rejects.toThrow(/must select new-workspace, workspace-member or distinct-project/);
    });
  });
});

describe('explicit opt-outs and legacy Expo behavior', () => {
  let base: string;
  beforeEach(() => { base = mkdtempSync(path.join(os.tmpdir(), 'mds-legacy-expo-')); });
  afterEach(() => { rmSync(base, { recursive: true, force: true }); });

  it('standalone Expo keeps the legacy CESS command and app-owned memory, and warns inside a workspace folder', async () => {
    const outer = makeOuterWorkspace(base);
    const target = path.join(outer.root, 'test-apps', 'legacy');
    const { runner, calls } = fakeCess();
    const adapter = new MockedExpo(runner as never);
    const plan = await adapter.planGeneration({ frameworkId: 'expo-react-native', appName: 'legacy', targetDirectory: target, options: { projectIdentity: 'distinct-project' } });
    expect(plan.workspace).toBeUndefined();
    expect(plan.execution?.args).not.toContain('--mds-workspace');
    expect(plan.execution?.args[1]).toBe('legacy');
    expect(plan.execution?.cwd).toBe(path.dirname(target));
    expect(plan.projectMemory).toEqual({ mode: 'distinct-project', location: path.join(target, 'project'), coordinatorOwned: false });
    const validation = await adapter.validatePlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.warnings.join(' ')).toMatch(/Standalone app is inside the outer workspace folder/);
    const result = await adapter.generate(plan, { approvedPlanDigest: plan.planDigest });
    expect(result.topologyReport).toBeUndefined();
    expect(calls[0]!.args).not.toContain('--mds-workspace');
    expect(existsSync(path.join(target, 'project', 'info.md'))).toBe(true);
    expect(existsSync(path.join(target, '..', 'legacy-i2Workspace'))).toBe(false);
  });

  it('standalone Expo requires the target to be the app folder CESS will create', async () => {
    await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'legacy', targetDirectory: path.join(base, 'other'), options: { projectIdentity: 'distinct-project' } })).rejects.toThrow(/target directory must be named "legacy"/);
  });

  it('workspace-member Expo is refused because CESS would write app-owned memory next to coordinator memory', async () => {
    const outer = makeOuterWorkspace(base);
    await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'member', targetDirectory: path.join(outer.root, 'test-apps', 'member'), options: { projectIdentity: 'workspace-member' } })).rejects.toThrow(/cannot join an initialized workspace/);
  });

  it('workspace-member never targets the workspace project, temp or generated folders', async () => {
    const outer = makeOuterWorkspace(base);
    await expect(new ExactAdapter().planGeneration({ frameworkId: 'exact', appName: 'member', targetDirectory: path.join(outer.project, 'member'), options: { projectIdentity: 'workspace-member' } })).rejects.toThrow(/cannot be generated inside the workspace project/);
  });

  it('workspace-member requires an actually initialized workspace', async () => {
    await expect(new MockedExpo().planGeneration({ frameworkId: 'expo-react-native', appName: 'member', targetDirectory: path.join(base, 'member'), options: { projectIdentity: 'workspace-member' } })).rejects.toThrow(/requires an initialized workspace/);
  });

  it('Exact plans create <root>/<app> (renamed to the source checkout) and are not Expo-specific', async () => {
    const root = path.join(base, 'demo-i2Workspace');
    const plan = await new ExactAdapter().planGeneration({ frameworkId: 'exact', appName: 'demo', targetDirectory: root, templateId: 'blank' });
    expect(plan.workspace?.sourcePath).toBe(path.join(root, 'demo-main'));
    expect(plan.execution?.args[2]).toBe(path.join(root, 'demo'));
    expect(plan.projectMemory?.mode).toBe('new-workspace');
  });

  it('Exact workspace-member and standalone plans still target the requested directory', async () => {
    const outer = makeOuterWorkspace(base);
    const adapter = new ExactAdapter();
    const member = path.join(outer.root, 'test-apps', 'member');
    const memberPlan = await adapter.planGeneration({ frameworkId: 'exact', appName: 'member', targetDirectory: member, options: { projectIdentity: 'workspace-member' } });
    expect(memberPlan.execution?.args[2]).toBe(member);
    expect(memberPlan.projectMemory).toEqual({ mode: 'workspace-member', location: outer.project, coordinatorOwned: true });
    const alone = path.join(base, 'alone');
    const alonePlan = await adapter.planGeneration({ frameworkId: 'exact', appName: 'alone', targetDirectory: alone, options: { projectIdentity: 'distinct-project' } });
    expect(alonePlan.execution?.args[2]).toBe(alone);
    expect(lstatSync(base).isDirectory()).toBe(true);
  });
});

describe('runner output handling', () => {
  it('streams complete output to the log file and keeps only a bounded tail in memory', async () => {
    const { runCommand, OUTPUT_TAIL_LIMIT } = await import('../src/generator/runner.js');
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mds-runner-'));
    try {
      const logFile = path.join(dir, 'generation.log');
      const total = OUTPUT_TAIL_LIMIT * 6;
      const result = await runCommand({ executable: process.execPath, args: ['-e', `process.stdout.write('x'.repeat(${total - 3}) + 'END')`], cwd: dir, timeoutMs: 60000, logFile });
      expect(result.code).toBe(0);
      expect(result.stdout.length).toBeLessThanOrEqual(OUTPUT_TAIL_LIMIT);
      expect(result.stdout.endsWith('END')).toBe(true);
      expect(readFileSync(logFile, 'utf8').length).toBe(total);
      await expect(runCommand({ executable: process.execPath, args: ['-e', '0'], cwd: dir, timeoutMs: 60000, logFile })).rejects.toThrow(/EEXIST/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
