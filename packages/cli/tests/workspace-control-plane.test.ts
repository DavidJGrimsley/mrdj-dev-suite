import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyWorkspaceInitialization, planWorkspaceAdoption, planWorkspaceInitialization } from '../src/workspace/index.js';
import { runWorkspaceCommand } from '../src/commands/workspace.js';
import { discoverWorkspace, resolveWorkspaceProjectMemoryPath } from '../src/workspace/discover.js';
import { deriveGitFreshness, inspectGitRepository, parseGitWorktreeList } from '../src/workspace/git.js';
import { parseWorkspaceManifest, parseWorkspaceWorktreeRegistry } from '../src/workspace/schema.js';
import { getWorkspaceStatus } from '../src/workspace/status.js';

const created: string[] = [];

function tempDir(): string {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-workspace-'));
  created.push(value);
  return value;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeWorkspaceManifest(root: string, projectPath = 'project'): void {
  writeJson(path.join(root, 'project', 'mds.workspace.json'), {
    schemaVersion: 1,
    workspaceId: 'example',
    name: 'Example Project',
    repositories: [
      {
        id: 'source',
        remote: 'https://github.com/example/example.git',
        defaultBranch: 'main',
        mainFolder: 'example-main',
        worktreePrefix: 'example-',
      },
    ],
    project: { path: projectPath },
    temp: { path: 'temp' },
  });
}

function initializeGitRepository(repoPath: string, remotePath: string, remoteName = 'origin'): void {
  execFileSync('git', ['init', '--bare', remotePath], { stdio: 'ignore' });
  execFileSync('git', ['init', repoPath], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'config', 'user.name', 'MDS Test'], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'add', '.'], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'commit', '--allow-empty', '-m', 'initial'], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'branch', '-M', 'main'], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'remote', 'add', remoteName, remotePath], { stdio: 'ignore' });
  execFileSync('git', ['-C', repoPath, 'push', '-u', remoteName, 'main'], { stdio: 'ignore' });
}

async function captureConsole(action: () => Promise<void>): Promise<string> {
  const originalLog = console.log;
  let output = '';
  console.log = (value?: unknown) => {
    output += `${String(value ?? '')}\n`;
  };

  try {
    await action();
    return output.trim();
  } finally {
    console.log = originalLog;
  }
}

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  process.exitCode = undefined;
});

describe('workspace control plane', () => {
  it('discovers a generic project control repo from a sibling source checkout', () => {
    const root = tempDir();
    const projectPath = path.join(root, 'project');
    const sourcePath = path.join(root, 'example-main');
    const worktreePath = path.join(root, 'example-feature');
    fs.mkdirSync(sourcePath, { recursive: true });
    fs.mkdirSync(worktreePath, { recursive: true });
    writeWorkspaceManifest(root);
    writeJson(path.join(sourcePath, '.mds', 'workspace.json'), {
      schemaVersion: 1,
      workspaceId: 'example',
      projectRepository: 'https://github.com/example/example-project.git',
    });

    for (const startPath of [root, projectPath, sourcePath, worktreePath]) {
      const discovered = discoverWorkspace(startPath);
      expect(discovered?.workspaceRoot).toBe(root);
      expect(discovered?.projectPath).toBe(projectPath);
      expect(discovered?.manifest.workspaceId).toBe('example');
    }
  });

  it('honors a configured project path from a root-level workspace manifest', () => {
    const root = tempDir();
    const controlPath = path.join(root, 'control');
    fs.mkdirSync(controlPath, { recursive: true });
    writeJson(path.join(root, 'mds.workspace.json'), {
      schemaVersion: 1,
      workspaceId: 'example',
      name: 'Example Project',
      repositories: [
        {
          id: 'source',
          remote: 'https://github.com/example/example.git',
          defaultBranch: 'main',
          mainFolder: 'example-main',
          worktreePrefix: 'example-',
        },
      ],
      project: { path: 'control' },
    });

    const discovered = discoverWorkspace(root);

    expect(discovered?.workspaceRoot).toBe(root);
    expect(discovered?.projectPath).toBe(controlPath);
  });

  it('falls back to repo-local project memory for legacy projects', () => {
    const root = tempDir();
    const legacyProject = path.join(root, 'project');
    fs.mkdirSync(legacyProject, { recursive: true });

    expect(resolveWorkspaceProjectMemoryPath(root)).toBe(legacyProject);
  });

  it('plans an explicit i2Workspace directory rather than assuming test-apps', () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, 'project'), { recursive: true });
    initializeGitRepository(path.join(root, 'example'), path.join(root, 'example.git'));

    const plan = planWorkspaceAdoption(path.join(root, 'example'));
    const workspaceRoot = path.join(root, 'example-i2Workspace');

    expect(plan.workspaceRoot).toBe(workspaceRoot);
    expect(plan.projectPath).toBe(path.join(workspaceRoot, 'project'));
    expect(plan.tempPath).toBe(path.join(workspaceRoot, 'temp'));
    expect(plan.manifest.temp?.path).toBe('temp');
    expect(plan.manifest.repositories[0]?.mainFolder).toBe('example-main');
    expect(plan.normalizedMainPath).toBe(path.join(workspaceRoot, 'example-main'));
    expect(fs.existsSync(plan.tempPath)).toBe(false);
  });

  it('plans every healthy worktree and requires an explicit project remote for non-GitHub sources', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    initializeGitRepository(sourcePath, sourceRemote);
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', path.join(root, 'feature'), '-b', 'feature/test'], { stdio: 'ignore' });

    const missingRemote = planWorkspaceInitialization(sourcePath);
    expect(missingRemote.errors).toContainEqual(expect.stringContaining('--project-remote'));

    const plan = planWorkspaceInitialization(sourcePath, {
      projectRemote: path.join(root, 'project.git'),
      workspaceName: 'sample',
    });
    expect(plan.worktrees).toHaveLength(2);
    expect(plan.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-main'));
    expect(plan.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-feature-test'));
  });

  it('infers a creatable project control remote from a GitHub source origin', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    initializeGitRepository(sourcePath, path.join(root, 'source.git'));
    execFileSync('git', ['-C', sourcePath, 'remote', 'set-url', 'origin', 'git@github.com:ExampleOrg/example-app.git'], { stdio: 'ignore' });

    const plan = planWorkspaceInitialization(sourcePath);

    expect(plan.errors).not.toContainEqual(expect.stringContaining('--project-remote'));
    expect(plan.projectRemote).toBe('git@github.com:ExampleOrg/example-app-project.git');
    expect(plan.projectRemoteSource).toBe('inferred');
    expect(plan.projectRemoteRepository).toBe('ExampleOrg/example-app-project');
    expect(plan.warnings).toContain('Project control repository will be created during apply if needed: ExampleOrg/example-app-project.');
  });

  it('rejects using the source app remote as the project control remote', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    initializeGitRepository(sourcePath, sourceRemote);

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote: sourceRemote });

    expect(plan.errors).toContain('The project control-repository remote must be separate from the source app remote.');
  });

  it('moves clean worktrees, seeds and pushes a remote control repo, and is discoverable', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, sourceRemote);
    fs.mkdirSync(path.join(sourcePath, 'project'), { recursive: true });
    fs.writeFileSync(path.join(sourcePath, 'project', 'info.md'), '# App\n', 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'project', 'todo.md'), '# Todo\n\n- [ ] Keep building.\n', 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'project', 'style.md'), '# Style\n\nExisting style.\n', 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'project', 'guidelines.md'), '# Guidelines\n\nExisting guidelines.\n', 'utf8');
    fs.mkdirSync(path.join(sourcePath, 'project', 'keys'), { recursive: true });
    fs.writeFileSync(path.join(sourcePath, 'project', 'keys', 'private.txt'), 'do not copy\n', 'utf8');
    execFileSync('git', ['-C', sourcePath, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'commit', '-m', 'add project memory'], { stdio: 'ignore' });
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', path.join(root, 'feature'), '-b', 'feature/test'], { stdio: 'ignore' });
    const stalePath = path.join(root, 'stale');
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', stalePath, '-b', 'feature/stale'], { stdio: 'ignore' });
    fs.rmSync(stalePath, { recursive: true, force: true });

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote, workspaceName: 'sample' });
    expect(plan.prunableWorktrees).toHaveLength(1);
    const applied = applyWorkspaceInitialization(plan, { yes: true });
    const workspaceRoot = path.join(root, 'sample-i2Workspace');
    expect(fs.existsSync(path.join(workspaceRoot, 'sample-main'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'sample-feature-test'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'temp'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'generated'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'project', 'keys'))).toBe(false);
    expect(applied.worktrees).toHaveLength(2);
    const registry = parseWorkspaceWorktreeRegistry(JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'project', 'mds.worktrees.json'), 'utf8')) as unknown);
    expect(registry.worktrees).toHaveLength(2);
    expect(execFileSync('git', ['--git-dir', projectRemote, 'rev-parse', 'refs/heads/main'], { encoding: 'utf8' }).trim()).toMatch(/^[a-f0-9]{40}$/);
    const status = getWorkspaceStatus(workspaceRoot);
    expect(status.found).toBe(true);
    if (status.found) expect(status.integrityIssues).toEqual([]);

    const rerunPlan = planWorkspaceInitialization(path.join(workspaceRoot, 'sample-main'), { projectRemote, workspaceName: 'sample' });
    expect(() => applyWorkspaceInitialization(rerunPlan, { yes: true })).not.toThrow();
  });

  it('generates retrospective project memory when no legacy project folder exists', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, sourceRemote);
    fs.writeFileSync(path.join(sourcePath, 'README.md'), '# Poke-ish Pages\n\nA web and mobile guide app for Pokemon events.\n', 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'package.json'), JSON.stringify({
      name: 'poke-ish-pages',
      scripts: { build: 'expo export', start: 'expo start' },
      dependencies: { expo: '^56.0.0', 'expo-router': '^6.0.0', '@supabase/supabase-js': '^2.0.0' },
      devDependencies: {},
    }, null, 2), 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'package-lock.json'), '{}\n', 'utf8');
    fs.mkdirSync(path.join(sourcePath, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(sourcePath, 'src', 'app', 'index.tsx'), 'export default function Home() { return null; }\n', 'utf8');
    fs.writeFileSync(path.join(sourcePath, 'drizzle.config.ts'), 'export default {};\n', 'utf8');
    execFileSync('git', ['-C', sourcePath, 'add', '.'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'commit', '-m', 'add app evidence'], { stdio: 'ignore' });
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote, workspaceName: 'sample' });
    expect(plan.existingProjectMemory).toEqual([]);
    expect(plan.retrospectiveOnboarding.mode).toBe('generate');
    const applied = applyWorkspaceInitialization(plan, { yes: true });
    const workspaceRoot = path.join(root, 'sample-i2Workspace');
    const projectPath = path.join(workspaceRoot, 'project');

    expect(applied.worktrees).toHaveLength(1);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(false);
    expect(fs.readFileSync(path.join(projectPath, 'info.md'), 'utf8')).toContain('# TodoForContext(optional): Confirm who this app is for');
    expect(fs.readFileSync(path.join(projectPath, 'info.md'), 'utf8')).toContain('src/app/index.tsx');
    expect(fs.readFileSync(path.join(projectPath, 'todo.md'), 'utf8')).toContain('Review generated `project/info.md`');
    expect(fs.readFileSync(path.join(projectPath, 'onboarding-evidence.md'), 'utf8')).toContain('@supabase/supabase-js');
    expect(fs.readFileSync(path.join(projectPath, 'onboarding-evidence.md'), 'utf8')).toContain('drizzle.config.ts');
    expect(fs.readFileSync(path.join(projectPath, 'intake-agent.md'), 'utf8')).toContain('High-Priority UD Confirmations');

    const status = getWorkspaceStatus(workspaceRoot);
    expect(status.found).toBe(true);
    if (!status.found) return;
    expect(status.integrityIssues).toContainEqual(expect.stringContaining('Unresolved TodoForContext marker: project/info.md'));
  });

  it('flags active Git worktrees that are missing from the workspace registry', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, sourceRemote);
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote, workspaceName: 'sample' });
    applyWorkspaceInitialization(plan, { yes: true });

    const workspaceRoot = path.join(root, 'sample-i2Workspace');
    const unregisteredPath = path.join(root, 'unregistered');
    execFileSync('git', ['-C', path.join(workspaceRoot, 'sample-main'), 'worktree', 'add', unregisteredPath, '-b', 'feature/unregistered'], { stdio: 'ignore' });

    const status = getWorkspaceStatus(workspaceRoot);

    expect(status.found).toBe(true);
    if (!status.found) return;
    expect(status.integrityIssues).toContainEqual(expect.stringContaining('Active Git worktree is missing from the registry:'));
    expect(status.integrityIssues).toContainEqual(expect.stringContaining('unregistered'));
  });

  it('treats unreadable worktree registrations as repair targets instead of stash targets', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, sourceRemote);
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });
    const brokenPath = path.join(root, 'broken');
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', brokenPath, '-b', 'feature/broken'], { stdio: 'ignore' });
    fs.unlinkSync(path.join(brokenPath, '.git'));

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote, workspaceName: 'sample' });
    expect(plan.prunableWorktrees.length).toBeGreaterThan(0);
    expect(() => applyWorkspaceInitialization(plan, { yes: true })).not.toThrow();
  });

  it('can initialize when the source path is a linked worktree that will be moved', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const sourceRemote = path.join(root, 'source.git');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, sourceRemote);
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });
    const featureOnePath = path.join(root, 'feature-one');
    const featureTwoPath = path.join(root, 'feature-two');
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', featureOnePath, '-b', 'feature/one'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'worktree', 'add', featureTwoPath, '-b', 'feature/two'], { stdio: 'ignore' });

    const plan = planWorkspaceInitialization(featureOnePath, { projectRemote, workspaceName: 'sample' });
    const applied = applyWorkspaceInitialization(plan, { yes: true });

    expect(applied.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-feature-one'));
    expect(applied.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-feature-two'));
  });

  it('preserves a feature source checkout and creates a clean default-branch main checkout', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, path.join(root, 'source.git'));
    execFileSync('git', ['-C', sourcePath, 'checkout', '-b', 'feature/onboarding'], { stdio: 'ignore' });
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote, workspaceName: 'sample' });
    expect(plan.worktrees).toHaveLength(1);
    expect(plan.worktrees[0]?.role).toBe('feature');
    const applied = applyWorkspaceInitialization(plan, { yes: true });
    expect(applied.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-feature-onboarding'));
    expect(applied.worktrees.map((worktree) => worktree.targetPath)).toContain(path.join(root, 'sample-i2Workspace', 'sample-main'));
    expect(execFileSync('git', ['-C', path.join(root, 'sample-i2Workspace', 'sample-main'), 'branch', '--show-current'], { encoding: 'utf8' }).trim()).toBe('main');
  });

  it('requires an explicit stash before migrating dirty worktrees', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    initializeGitRepository(sourcePath, path.join(root, 'source.git'));
    fs.writeFileSync(path.join(sourcePath, 'dirty.txt'), 'dirty\n', 'utf8');
    execFileSync('git', ['init', '--bare', path.join(root, 'project.git')], { stdio: 'ignore' });
    const plan = planWorkspaceInitialization(sourcePath, { projectRemote: path.join(root, 'project.git') });
    expect(() => applyWorkspaceInitialization(plan, { yes: true })).toThrow(/--stash/);
  });

  it('refuses unresolved merge conflicts before attempting a stash', () => {
    const root = tempDir();
    const sourcePath = path.join(root, 'app');
    const projectRemote = path.join(root, 'project.git');
    initializeGitRepository(sourcePath, path.join(root, 'source.git'));
    execFileSync('git', ['init', '--bare', projectRemote], { stdio: 'ignore' });
    fs.writeFileSync(path.join(sourcePath, 'conflict.txt'), 'base\n', 'utf8');
    execFileSync('git', ['-C', sourcePath, 'add', 'conflict.txt'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'commit', '-m', 'add conflict fixture'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'checkout', '-b', 'feature/conflict'], { stdio: 'ignore' });
    fs.writeFileSync(path.join(sourcePath, 'conflict.txt'), 'feature\n', 'utf8');
    execFileSync('git', ['-C', sourcePath, 'commit', '-am', 'feature edit'], { stdio: 'ignore' });
    execFileSync('git', ['-C', sourcePath, 'checkout', 'main'], { stdio: 'ignore' });
    fs.writeFileSync(path.join(sourcePath, 'conflict.txt'), 'main\n', 'utf8');
    execFileSync('git', ['-C', sourcePath, 'commit', '-am', 'main edit'], { stdio: 'ignore' });

    expect(() => execFileSync('git', ['-C', sourcePath, 'merge', 'feature/conflict'], { stdio: 'ignore' })).toThrow();

    const plan = planWorkspaceInitialization(sourcePath, { projectRemote });
    expect(plan.errors).toContain(`Worktree has unresolved merge conflicts: ${sourcePath}`);
    expect(() => applyWorkspaceInitialization(plan, { yes: true, stash: true })).toThrow(/unresolved merge conflicts/);
    expect(execFileSync('git', ['-C', sourcePath, 'stash', 'list'], { encoding: 'utf8' }).trim()).toBe('');
  });

  it('plans an i2Workspace sibling for a legacy grouped main checkout', () => {
    const parent = tempDir();
    const legacyWorkspaceRoot = path.join(parent, 'Time2Pay');
    const workspaceRoot = path.join(parent, 'Time2Pay-i2Workspace');
    const sourcePath = path.join(legacyWorkspaceRoot, 'time2pay-main');
    initializeGitRepository(sourcePath, path.join(parent, 'time2pay.git'));

    const plan = planWorkspaceAdoption(sourcePath);

    expect(plan.workspaceRoot).toBe(workspaceRoot);
    expect(plan.normalizedMainPath).toBe(path.join(workspaceRoot, 'time2pay-main'));
    expect(plan.manifest.workspaceId).toBe('time2pay');
    expect(plan.manifest.name).toBe('Time2Pay');
    expect(plan.manifest.repositories[0]).toMatchObject({
      mainFolder: 'time2pay-main',
      worktreePrefix: 'time2pay-',
    });
    expect(plan.worktrees[0]?.targetPath).toBe(path.join(workspaceRoot, 'time2pay-main'));
  });

  it('does not nest an i2Workspace directory when planning from its normalized main checkout', () => {
    const workspaceRoot = path.join(tempDir(), 'PokePages-i2Workspace');
    const sourcePath = path.join(workspaceRoot, 'PokePages-main');
    initializeGitRepository(sourcePath, path.join(path.dirname(workspaceRoot), 'pokepages.git'));

    const plan = planWorkspaceAdoption(sourcePath);

    expect(plan.workspaceRoot).toBe(workspaceRoot);
    expect(plan.normalizedMainPath).toBe(sourcePath);
    expect(plan.manifest.workspaceId).toBe('pokepages');
    expect(plan.worktrees[0]?.targetPath).toBe(sourcePath);
  });

  it('does not fetch by default and records an explicit fetch request', () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, 'project'), { recursive: true });
    fs.mkdirSync(path.join(root, 'example-main'), { recursive: true });
    writeWorkspaceManifest(root);

    const localStatus = getWorkspaceStatus(root);
    const fetchedStatus = getWorkspaceStatus(root, { fetch: true });

    expect(localStatus.found).toBe(true);
    expect(fetchedStatus.found).toBe(true);
    if (!localStatus.found || !fetchedStatus.found) return;
    expect(localStatus.projectGit.fetchAttempted).toBe(false);
    expect(localStatus.repositories[0]?.git.fetchAttempted).toBe(false);
    expect(fetchedStatus.projectGit.fetchAttempted).toBe(true);
    expect(fetchedStatus.repositories[0]?.git.fetchAttempted).toBe(true);
  });

  it('fetches through a configured upstream remote rather than assuming origin', () => {
    const root = tempDir();
    const repoPath = path.join(root, 'repo');
    const remotePath = path.join(root, 'upstream.git');
    fs.mkdirSync(repoPath, { recursive: true });
    initializeGitRepository(repoPath, remotePath, 'upstream');

    const status = inspectGitRepository(repoPath, { fetch: true });

    expect(status).toMatchObject({
      freshness: 'CURRENT',
      upstream: 'upstream/main',
      fetchAttempted: true,
      fetchSucceeded: true,
    });
  });

  it('covers workspace command JSON/text output and blocks unsafe managed repositories', async () => {
    const root = tempDir();
    const projectPath = path.join(root, 'project');
    const sourcePath = path.join(root, 'example-main');
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(sourcePath, { recursive: true });
    writeWorkspaceManifest(root);
    initializeGitRepository(projectPath, path.join(root, 'project.git'));
    initializeGitRepository(sourcePath, path.join(root, 'source.git'));
    fs.writeFileSync(path.join(sourcePath, 'uncommitted.txt'), 'unsafe\n', 'utf8');

    const discoverOutput = await captureConsole(() =>
      runWorkspaceCommand({ action: 'discover', path: root, json: true })
    );
    expect(JSON.parse(discoverOutput)).toMatchObject({ workspaceRoot: root, projectPath });

    const statusOutput = await captureConsole(() =>
      runWorkspaceCommand({ action: 'status', path: root, json: true })
    );
    expect(JSON.parse(statusOutput)).toMatchObject({
      found: true,
      projectGit: { freshness: 'CURRENT', fetchAttempted: false },
      repositories: [{ git: { freshness: 'DIRTY', fetchAttempted: false } }],
    });

    const doctorOutput = await captureConsole(() =>
      runWorkspaceCommand({ action: 'doctor', path: root, json: true })
    );
    expect(JSON.parse(doctorOutput)).toMatchObject({
      found: true,
      repositories: [{ git: { freshness: 'DIRTY' } }],
    });
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;

    const adoptOutput = await captureConsole(() =>
      runWorkspaceCommand({ action: 'adopt', path: sourcePath, dryRun: true })
    );
    expect(adoptOutput).toContain('MDS workspace initialization plan');
    expect(adoptOutput).toContain('Planning only');
  });

  it('classifies every synchronization state without mutating Git state', () => {
    expect(deriveGitFreshness({ dirty: false, ahead: 0, behind: 0 })).toBe('CURRENT');
    expect(deriveGitFreshness({ dirty: false, ahead: 0, behind: 1 })).toBe('BEHIND_SAFE_TO_FF');
    expect(deriveGitFreshness({ dirty: true, ahead: 0, behind: 0 })).toBe('DIRTY');
    expect(deriveGitFreshness({ dirty: false, ahead: 1, behind: 0 })).toBe('AHEAD');
    expect(deriveGitFreshness({ dirty: false, ahead: 1, behind: 1 })).toBe('DIVERGED');
    expect(
      deriveGitFreshness({ dirty: false, ahead: 0, behind: 0, fetchAttempted: true, fetchSucceeded: false })
    ).toBe('OFFLINE_OR_UNKNOWN');
  });

  it('parses Git worktree porcelain output, including Windows line endings', () => {
    expect(
      parseGitWorktreeList(
        'worktree C:/workspace/example-main\r\nHEAD abc123\r\nbranch refs/heads/main\r\n\r\nworktree C:/workspace/example-feature\r\nHEAD def456\r\ndetached\r\nlocked maintenance\r\n'
      )
    ).toEqual([
      { path: 'C:/workspace/example-main', head: 'abc123', branch: 'main' },
      { path: 'C:/workspace/example-feature', head: 'def456', detached: true, locked: 'maintenance' },
    ]);
  });

  it('rejects duplicate repository ids in a workspace manifest', () => {
    expect(() =>
      parseWorkspaceManifest({
        schemaVersion: 1,
        workspaceId: 'example',
        name: 'Example',
        repositories: [
          {
            id: 'source',
            remote: 'https://example.com/a.git',
            defaultBranch: 'main',
            mainFolder: 'a-main',
            worktreePrefix: 'a-',
          },
          {
            id: 'source',
            remote: 'https://example.com/b.git',
            defaultBranch: 'main',
            mainFolder: 'b-main',
            worktreePrefix: 'b-',
          },
        ],
      })
    ).toThrow(/duplicate repository id/i);
  });
});
