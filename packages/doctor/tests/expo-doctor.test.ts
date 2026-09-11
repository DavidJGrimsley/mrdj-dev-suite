import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runExpoDoctorCheck } from '../src/checks/expo-doctor.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('Expo Doctor integration', () => {
  it('downgrades only the known SDK 56 Hermes regression to a warning', async () => {
    const projectPath = await createTempProject(
      "node -e \"console.error('Hermes V1 known memory regression'); process.exit(1)\""
    );

    const result = await runExpoDoctorCheck({
      packageJson: {
        name: 'hermes-regression',
        packageManager: 'pnpm@8.14.0',
        dependencies: { expo: '^56.0.0' },
        scripts: { doctor: 'node -e "console.error(\'Hermes V1 known memory regression\'); process.exit(1)"' },
      },
      projectPath,
      mode: 'ci',
      timeoutMs: 30_000,
    });

    expect(result?.status).toBe('warn');
    expect(result?.message).toContain('known Expo SDK 56 Hermes regression');
  });

  it('keeps unrelated Expo Doctor failures as errors', async () => {
    const projectPath = await createTempProject(
      "node -e \"console.error('duplicate dependencies'); process.exit(1)\""
    );

    const result = await runExpoDoctorCheck({
      packageJson: {
        name: 'real-expo-failure',
        packageManager: 'pnpm@8.14.0',
        dependencies: { expo: '^56.0.0' },
        scripts: { doctor: 'node -e "console.error(\'duplicate dependencies\'); process.exit(1)"' },
      },
      projectPath,
      mode: 'ci',
      timeoutMs: 30_000,
    });

    expect(result?.status).toBe('error');
    expect(result?.message).toContain('failed with exit code');
  });
});

async function createTempProject(script: string): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-expo-doctor-'));
  tempDirs.push(projectPath);
  await writeFile(
    path.join(projectPath, 'package.json'),
    `${JSON.stringify({ name: 'expo-doctor-fixture', scripts: { doctor: script } }, null, 2)}\n`,
    'utf8'
  );
  return projectPath;
}
