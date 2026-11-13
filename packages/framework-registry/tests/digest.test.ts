import { describe, expect, it } from 'vitest';
import {
  canonicalizeJson,
  computePlanDigest,
  computeSha256,
  verifyPlanApproval,
} from '../src/digest.js';
import type { GenerationPlan } from '../src/types.js';

describe('digest utilities', () => {
  it('computes standard SHA-256 test vectors', () => {
    expect(computeSha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
    expect(computeSha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('canonicalizes JSON with deterministic key order', () => {
    const objA = { b: 2, a: 1, c: { y: 20, x: 10 } };
    const objB = { a: 1, c: { x: 10, y: 20 }, b: 2 };
    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
    expect(canonicalizeJson(objA)).toBe('{"a":1,"b":2,"c":{"x":10,"y":20}}');
  });

  it('computes deterministic plan digest', () => {
    const plan: GenerationPlan = {
      schemaVersion: 1,
      planId: 'plan-123',
      frameworkId: 'exact',
      templateId: 'blank',
      appName: 'my-exact-app',
      bundleId: 'com.example.myexactapp',
      targetDirectory: '/projects/my-exact-app',
      targetPlatforms: ['web', 'macos'],
      pinnedRevision: {
        repository: 'https://github.com/expo/exact.git',
        branch: 'main',
        commit: '9398d982e02a6ba08e4c78d0db27624c3153c1c6',
      },
      reservationPaths: ['app.contract', 'app.ts', 'app.json'],
      planDigest: '',
      createdAt: '2026-11-10T00:00:00.000Z',
      generatorIdentity: {
        adapterId: 'exact',
        adapterVersion: '0.1.0',
        frameworkCommit: '9398d982e02a6ba08e4c78d0db27624c3153c1c6',
      },
    };

    const digest1 = computePlanDigest(plan);
    const digest2 = computePlanDigest({ ...plan, targetPlatforms: ['macos', 'web'] });
    expect(digest1).toBe(digest2);
    expect(digest1).toMatch(/^[a-f0-9]{64}$/);

    // Any modification changes digest
    const alteredPlan = { ...plan, appName: 'altered-app' };
    expect(computePlanDigest(alteredPlan)).not.toBe(digest1);
  });

  it('verifies approval matches plan digest', () => {
    const plan: GenerationPlan = {
      schemaVersion: 1,
      planId: 'plan-1',
      frameworkId: 'exact',
      templateId: 'blank',
      appName: 'test-app',
      bundleId: 'com.test.app',
      targetDirectory: '/tmp/test',
      targetPlatforms: ['web'],
      pinnedRevision: {
        repository: 'https://github.com/expo/exact.git',
        commit: '9398d982e02a6ba08e4c78d0db27624c3153c1c6',
      },
      reservationPaths: ['app.contract'],
      planDigest: '',
      createdAt: '2026-11-10T00:00:00.000Z',
      generatorIdentity: {
        adapterId: 'exact',
        adapterVersion: '0.1.0',
        frameworkCommit: '9398d982e02a6ba08e4c78d0db27624c3153c1c6',
      },
    };

    const digest = computePlanDigest(plan);
    const populatedPlan = { ...plan, planDigest: digest };

    expect(verifyPlanApproval(populatedPlan, digest).approved).toBe(true);
    expect(verifyPlanApproval(populatedPlan, 'invalid-digest').approved).toBe(false);
  });
});
