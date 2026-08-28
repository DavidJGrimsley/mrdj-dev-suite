import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planWorkspaceAdoption } from '../src/workspace/adopt.js';
import { discoverWorkspace, resolveWorkspaceProjectMemoryPath } from '../src/workspace/discover.js';
import { deriveGitFreshness, parseGitWorktreeList } from '../src/workspace/git.js';
import { parseWorkspaceManifest } from '../src/workspace/schema.js';
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

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
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

  it('uses a generic temp directory rather than assuming test-apps', () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, 'project'), { recursive: true });
    fs.mkdirSync(path.join(root, 'example'), { recursive: true });

    const plan = planWorkspaceAdoption(path.join(root, 'example'));

    expect(plan.tempPath).toBe(path.join(root, 'temp'));
    expect(plan.manifest.temp?.path).toBe('temp');
    expect(plan.manifest.repositories[0]?.mainFolder).toBe('example');
    expect(plan.normalizedMainPath).toBe(path.join(root, 'example-main'));
    expect(fs.readdirSync(root).sort()).toEqual(['example', 'project']);
    expect(fs.existsSync(plan.tempPath)).toBe(false);
  });

  it('keeps an already-normalized main checkout stable during adoption planning', () => {
    const workspaceRoot = path.join(tempDir(), 'Time2Pay');
    const sourcePath = path.join(workspaceRoot, 'time2pay-main');
    fs.mkdirSync(sourcePath, { recursive: true });

    const plan = planWorkspaceAdoption(sourcePath);

    expect(plan.workspaceRoot).toBe(workspaceRoot);
    expect(plan.normalizedMainPath).toBe(sourcePath);
    expect(plan.manifest.workspaceId).toBe('time2pay');
    expect(plan.manifest.name).toBe('Time2Pay');
    expect(plan.manifest.repositories[0]).toMatchObject({
      mainFolder: 'time2pay-main',
      worktreePrefix: 'Time2Pay-',
    });
    expect(plan.warnings).not.toContainEqual(expect.stringContaining('not normalized'));
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
