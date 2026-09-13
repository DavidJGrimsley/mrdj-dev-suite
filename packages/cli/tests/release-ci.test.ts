import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  isReleaseCiEligible,
  mergeReleaseCiEasConfig,
  scaffoldReleaseCi,
} from '../src/release-ci.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('release CI generation', () => {
  const readyAnswers = {
    targetPlatforms: ['ios', 'android'],
    easUses: ['building mobile applications', 'publishing mobile applications'],
    testToMainSafeguards: true,
    releaseCiReady: true,
  };

  it('requires every explicit release gate', () => {
    expect(isReleaseCiEligible(readyAnswers)).toBe(true);
    expect(isReleaseCiEligible({ ...readyAnswers, releaseCiReady: false })).toBe(false);
    expect(isReleaseCiEligible({ ...readyAnswers, testToMainSafeguards: false })).toBe(false);
    expect(isReleaseCiEligible({ ...readyAnswers, targetPlatforms: ['android'] })).toBe(false);
    expect(isReleaseCiEligible({ ...readyAnswers, easUses: ['building mobile applications'] })).toBe(false);
  });

  it('creates branch-specific EAS workflows and a non-secret production config', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-release-ci-'));
    tempDirs.push(projectPath);

    await scaffoldReleaseCi(projectPath, readyAnswers);

    const testflight = await readFile(
      path.join(projectPath, '.eas', 'workflows', 'mds-testflight.yml'),
      'utf8',
    );
    const production = await readFile(
      path.join(projectPath, '.eas', 'workflows', 'mds-production.yml'),
      'utf8',
    );
    const easConfig = JSON.parse(await readFile(path.join(projectPath, 'eas.json'), 'utf8'));

    expect(testflight).toContain('branches: [test]');
    expect(testflight).toContain('type: testflight');
    expect(testflight).toContain('environment: preview');
    expect(testflight).toContain('build_id: ${{ needs.build_ios.outputs.build_id }}');
    expect(production).toContain('branches: [main]');
    expect(production).toContain('type: submit');
    expect(production).toContain('environment: production');
    expect(`${testflight}\n${production}\n${JSON.stringify(easConfig)}`).not.toMatch(
      /EXPO_TOKEN|APPLE_|secrets:/i,
    );
    expect(easConfig).toMatchObject({
      cli: { appVersionSource: 'remote' },
      build: { production: { autoIncrement: true } },
      submit: { production: {} },
    });
  });

  it('preserves an existing workflow unless force is explicit', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-release-ci-preserve-'));
    tempDirs.push(projectPath);
    const workflowPath = path.join(projectPath, '.eas', 'workflows', 'mds-testflight.yml');

    await scaffoldReleaseCi(projectPath, readyAnswers);
    await writeFile(workflowPath, 'name: User owned workflow\n', 'utf8');
    await scaffoldReleaseCi(projectPath, readyAnswers);
    await expect(readFile(workflowPath, 'utf8')).resolves.toBe('name: User owned workflow\n');

    await scaffoldReleaseCi(projectPath, readyAnswers, { force: true });
    await expect(readFile(workflowPath, 'utf8')).resolves.toContain('type: testflight');
  });

  it('refuses conflicting EAS version configuration', () => {
    expect(() => mergeReleaseCiEasConfig({ cli: { appVersionSource: 'local' } })).toThrow(
      /appVersionSource/,
    );
    expect(() => mergeReleaseCiEasConfig({ build: { production: { autoIncrement: false } } })).toThrow(
      /autoIncrement/,
    );
  });
});
