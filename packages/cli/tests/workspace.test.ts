import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planWorkspaceAdoption } from '../src/workspace/adopt.js';
import { discoverWorkspace, resolveWorkspaceProjectMemoryPath } from '../src/workspace/discover.js';
import { parseWorkspaceManifest } from '../src/workspace/schema.js';

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
    fs.mkdirSync(sourcePath, { recursive: true });
    writeJson(path.join(projectPath, 'mds.workspace.json'), {
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
      temp: { path: 'temp' },
    });
    writeJson(path.join(sourcePath, '.mds', 'workspace.json'), {
      schemaVersion: 1,
      workspaceId: 'example',
      projectRepository: 'https://github.com/example/example-project.git',
    });

    const discovered = discoverWorkspace(sourcePath);

    expect(discovered?.workspaceRoot).toBe(root);
    expect(discovered?.projectPath).toBe(projectPath);
    expect(discovered?.manifest.workspaceId).toBe('example');
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
