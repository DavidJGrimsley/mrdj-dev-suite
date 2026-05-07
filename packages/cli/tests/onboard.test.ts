import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runOnboardCommand } from '../src/commands/onboard.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('runOnboardCommand', () => {
  it('creates project memory files in non-interactive mode', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-onboard-'));
    tempDirs.push(projectPath);

    await runOnboardCommand({
      project: projectPath,
      yes: true,
      appName: 'Sample App',
      defaults: 'project-docs,uniwind,doctor',
    });

    await expect(readFile(path.join(projectPath, 'project', 'info.md'), 'utf8')).resolves.toContain(
      'Sample App'
    );
    await expect(readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8')).resolves.toContain(
      'Run `mrdj doctor --ci`'
    );
    await expect(readFile(path.join(projectPath, 'project', 'style.md'), 'utf8')).resolves.toContain(
      'Uniwind'
    );
  });
});

