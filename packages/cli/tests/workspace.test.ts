import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createWorkspaceManifest,
  derivePackageScope,
  discoverWorkspace,
  resolveWorkspacePath,
  scaffoldWorkspaceMemory,
  slugifyWorkspaceName,
  validateWorkspaceManifest,
} from '../src/workspace.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirs.length = 0;
});

function createTestManifest() {
  return createWorkspaceManifest({
    displayName: 'Creatisphere',
    packageManager: 'pnpm',
    apps: [
      { displayName: 'Studio', kind: 'expo', purpose: 'Create experiences.' },
      { displayName: 'Companion', kind: 'expo', purpose: 'Review experiences.' },
    ],
  });
}

describe('workspace manifest model', () => {
  it('derives product naming, scoped packages, and stable ports', () => {
    const manifest = createWorkspaceManifest({
      displayName: "DJ's Creative Suite",
      apps: [
        { displayName: 'Studio', kind: 'expo', purpose: 'Create content.' },
        { displayName: 'Companion', kind: 'expo', purpose: 'Review content.' },
      ],
    });

    expect(slugifyWorkspaceName("DJ's Creative Suite")).toBe('djs-creative-suite');
    expect(derivePackageScope('Creatisphere')).toBe('@creatisphere');
    expect(manifest.apps.map((app) => app.path)).toEqual(['apps/studio', 'apps/companion']);
    expect(manifest.apps.map((app) => app.port)).toEqual([8081, 8082]);
    expect(manifest.sharedPackages.map((item) => item.name)).toEqual(['config', 'ui']);
  });

  it('rejects insufficient, duplicate, unsafe, and malformed plans', () => {
    expect(() =>
      createWorkspaceManifest({
        displayName: 'Solo',
        apps: [{ displayName: 'Solo', kind: 'expo', purpose: 'One app.' }],
      })
    ).toThrow('at least two registered apps');

    expect(() =>
      createWorkspaceManifest({
        displayName: 'Backend Only',
        apps: [
          { displayName: 'API', kind: 'non-expo', purpose: 'Serve data.' },
          { displayName: 'Worker', kind: 'non-expo', purpose: 'Process jobs.' },
        ],
      })
    ).toThrow('at least one Expo app');

    expect(() =>
      createWorkspaceManifest({
        displayName: 'Duplicates',
        apps: [
          { displayName: 'App', kind: 'expo', purpose: 'First.' },
          { displayName: 'App', kind: 'expo', purpose: 'Second.' },
        ],
      })
    ).toThrow('Duplicate workspace app id');
    expect(() => resolveWorkspacePath('C:/workspace', '../outside')).toThrow('escapes the workspace');
    expect(() =>
      createWorkspaceManifest({
        displayName: 'Invalid Scope',
        packageScope: 'not-scoped',
        apps: [
          { displayName: 'App', kind: 'expo', purpose: 'First.' },
          { displayName: 'Site', kind: 'non-expo', purpose: 'Second.' },
        ],
      })
    ).toThrow('packageScope');

    const duplicatePorts = createTestManifest();
    duplicatePorts.apps[1]!.port = duplicatePorts.apps[0]!.port;
    expect(() => validateWorkspaceManifest(duplicatePorts)).toThrow('Duplicate Expo development port');
  });
});

describe('existing workspace intake', () => {
  it('discovers apps without moving or renaming existing files', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'mds-discover-workspace-'));
    tempDirs.push(workspacePath);
    await mkdir(path.join(workspacePath, 'apps', 'mobile'), { recursive: true });
    await mkdir(path.join(workspacePath, 'apps', 'api'), { recursive: true });
    await mkdir(path.join(workspacePath, 'packages', 'ui'), { recursive: true });
    await writeFile(path.join(workspacePath, 'package.json'), JSON.stringify({ name: '@creative/tools', packageManager: 'pnpm@9.0.0' }));
    await writeFile(path.join(workspacePath, 'apps', 'mobile', 'package.json'), JSON.stringify({ name: '@creative/mobile', dependencies: { expo: '^56.0.0' } }));
    await writeFile(path.join(workspacePath, 'apps', 'api', 'package.json'), JSON.stringify({ name: '@creative/api', dependencies: { fastify: '^5.0.0' } }));
    await writeFile(path.join(workspacePath, 'apps', 'mobile', 'keep.txt'), 'unchanged');

    const discovery = await discoverWorkspace(workspacePath);
    expect(discovery?.manifest.packageScope).toBe('@creative');
    expect(discovery?.manifest.apps).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mobile', kind: 'expo', path: 'apps/mobile' }),
      expect.objectContaining({ id: 'api', kind: 'non-expo', path: 'apps/api' }),
    ]));

    await scaffoldWorkspaceMemory(workspacePath, discovery!.manifest);
    await expect(readFile(path.join(workspacePath, 'apps', 'mobile', 'keep.txt'), 'utf8')).resolves.toBe('unchanged');
    await expect(readFile(path.join(workspacePath, 'project', 'workspace.json'), 'utf8')).resolves.toContain('apps/mobile');
    await expect(readFile(path.join(workspacePath, 'apps', 'mobile', 'project', 'info.md'), 'utf8')).resolves.toContain('Workspace path: apps/mobile');
    await expect(readFile(path.join(workspacePath, 'apps', 'api', 'project', 'todo.md'), 'utf8')).resolves.toContain('Api TODO');
  });

  it('keeps existing memory when force is false', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'mds-memory-workspace-'));
    tempDirs.push(workspacePath);
    const manifest = createTestManifest();
    await mkdir(path.join(workspacePath, 'apps', 'studio', 'project'), { recursive: true });
    await mkdir(path.join(workspacePath, 'apps', 'companion'), { recursive: true });
    await writeFile(path.join(workspacePath, 'apps', 'studio', 'project', 'info.md'), 'USER MEMORY\n');

    await scaffoldWorkspaceMemory(workspacePath, manifest);
    await expect(readFile(path.join(workspacePath, 'apps', 'studio', 'project', 'info.md'), 'utf8')).resolves.toBe('USER MEMORY\n');
  });
});
