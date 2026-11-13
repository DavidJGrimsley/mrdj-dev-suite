import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ApprovalRequiredError,
  CancellationToken,
  DEFAULT_FRAMEWORK_ID,
  DestinationNotEmptyError,
  ExactAdapter,
  ExpoReactNativeAdapter,
  FrameworkAdapterRegistry,
  PlanDigestMismatchError,
  ReservationJournal,
  checkExactPrerequisites,
  checkExpoPrerequisites,
  computePlanDigest,
  getFrameworkAdapterRegistry,
} from '../src/generator.js';

/** Explicit standalone opt-out: these tests exercise the legacy app-owned-memory behavior. */
const STANDALONE = { projectIdentity: 'distinct-project' } as const;

describe('Framework-Agnostic Generator & Exact Adapter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'mds-framework-test-'));
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('ReservationJournal', () => {
    it('prevents directory traversal outside target directory', () => {
      const journal = new ReservationJournal(tempDir);
      journal.validateTarget();

      expect(() => {
        journal.assertContained('../escaped.txt');
      }).toThrowError(/Path traversal detected/);
    });

    it('refuses non-empty directories unless explicitly permitted', () => {
      writeFileSync(path.join(tempDir, 'existing.txt'), 'pre-existing file');
      const journal = new ReservationJournal(tempDir);

      expect(() => {
        journal.validateTarget();
      }).toThrow(DestinationNotEmptyError);
    });

    it('rolls back newly created files on cancellation or failure', () => {
      const journal = new ReservationJournal(tempDir, { allowNonEmptyTarget: true });
      journal.validateTarget();

      const createdFile = journal.writeFile('subdir/created.txt', 'hello world');
      expect(existsSync(createdFile)).toBe(true);

      // Rollback without commit
      journal.rollback();
      expect(existsSync(createdFile)).toBe(false);
    });

    it('preserves files after commit', () => {
      const journal = new ReservationJournal(tempDir, { allowNonEmptyTarget: true });
      journal.validateTarget();

      const createdFile = journal.writeFile('file.txt', 'permanent content');
      journal.commit();

      // Rollback does nothing after commit
      journal.rollback();
      expect(existsSync(createdFile)).toBe(true);
    });
  });

  describe('Prerequisite Checks', () => {
    it('checks Exact prerequisites non-mutatingly', () => {
      const report = checkExactPrerequisites();
      expect(report.frameworkId).toBe('exact');
      expect(Array.isArray(report.prerequisites)).toBe(true);

      const bun = report.prerequisites.find((p) => p.name === 'Bun');
      expect(bun).toBeDefined();
      expect(bun?.required).toBe(true);

      const rust = report.prerequisites.find((p) => p.name === 'Rust & Cargo');
      expect(rust).toBeDefined();
      expect(rust?.required).toBe(true);
    });

    it('checks Expo React Native prerequisites', () => {
      const report = checkExpoPrerequisites();
      expect(report.frameworkId).toBe('expo-react-native');
      const node = report.prerequisites.find((p) => p.name === 'Node.js');
      expect(node).toBeDefined();
      expect(node?.installed).toBe(true);
    });
  });

  describe('ExactAdapter', () => {
    const adapter = new ExactAdapter();

    it('detects Exact projects by presence of app.contract and exact.mjs', async () => {
      writeFileSync(path.join(tempDir, 'app.contract'), 'title: "Test"');
      writeFileSync(path.join(tempDir, 'exact.mjs'), '// runner');

      const detection = await adapter.detect(tempDir);
      expect(detection.frameworkId).toBe('exact');
      expect(detection.confidence).toBe('high');
      expect(detection.matchedSignals).toContain('app.contract');
    });

    it('creates a deterministic generation plan with planDigest', async () => {
      const target = path.join(tempDir, 'sample-exact');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'sample-exact',
        targetDirectory: target,
        options: STANDALONE,
        templateId: 'blank',
      });

      expect(plan.frameworkId).toBe('exact');
      expect(plan.templateId).toBe('blank');
      expect(plan.appName).toBe('sample-exact');
      expect(plan.bundleId).toBe('com.example.sampleexact');
      expect(plan.pinnedRevision.commit).toBe('9398d982e02a6ba08e4c78d0db27624c3153c1c6');
      expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(plan.planDigest).toBe(computePlanDigest(plan));
    });

    it('rejects app names ending with reserved host suffixes', async () => {
      await expect(
        adapter.planGeneration({
          frameworkId: 'exact',
          appName: 'my-app-web',
          targetDirectory: path.join(tempDir, 'my-app-web'),
          options: STANDALONE,
        })
      ).rejects.toThrowError(/ends with a reserved host suffix/);
    });

    it('refuses generation without approvedPlanDigest', async () => {
      const target = path.join(tempDir, 'refusal-test');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'refusal-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      await expect(
        adapter.generate(plan, { approvedPlanDigest: '' })
      ).rejects.toThrow(ApprovalRequiredError);
    });

    it('refuses generation when approval digest does not match', async () => {
      const target = path.join(tempDir, 'mismatch-test');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'mismatch-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      await expect(
        adapter.generate(plan, { approvedPlanDigest: 'incorrect-digest-hex' })
      ).rejects.toThrow(PlanDigestMismatchError);
    });

    it('generates Exact application in dryRun mode', async () => {
      const target = path.join(tempDir, 'dryrun-test');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'dryrun-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      const result = await adapter.generate(plan, {
        approvedPlanDigest: plan.planDigest,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe('exact');
      expect(existsSync(target)).toBe(false); // Dry run does not write to disk
    });

    it('blocks execution when prerequisites are not satisfied locally', async () => {
      const target = path.join(tempDir, 'blocked-exact-app');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'blocked-exact-app',
        targetDirectory: target,
        options: STANDALONE,
        templateId: 'blank',
      });

      // Without Bun >=1.4.2 and Rust, generation is truthfully blocked
      const prereqs = await adapter.checkPrerequisites();
      if (!prereqs.satisfied) {
        await expect(
          adapter.generate(plan, { approvedPlanDigest: plan.planDigest })
        ).rejects.toThrow(/Exact prerequisites missing or incompatible/);
      }
    });

    it('generates blank Exact project memory with mock runner when prerequisites satisfied', async () => {
      class TestExactAdapter extends ExactAdapter {
        protected override async verifyWebStartup() {
          return { name: 'web startup', passed: false, message: 'Synthetic scaffold: startup is covered by generator-startup.test.ts.' };
        }
        override async checkPrerequisites() {
          return {
            frameworkId: 'exact' as const,
            satisfied: true,
            prerequisites: [],
            summary: 'Mocked prerequisites satisfied',
            notes: [],
          };
        }
      }

      const mockRunner = async (spec: { executable: string; args: readonly string[]; cwd: string }) => {
        // Mock runner creates target dir and sample contract file
        mkdirSync(path.join(tempDir, 'real-exact-app'), { recursive: true });
        writeFileSync(path.join(tempDir, 'real-exact-app', 'app.contract'), 'title: "Test"');
        return { code: 0, stdout: 'Created app', stderr: '' };
      };

      const testAdapter = new TestExactAdapter(mockRunner as any);
      const target = path.join(tempDir, 'real-exact-app');
      const plan = await testAdapter.planGeneration({
        frameworkId: 'exact',
        appName: 'real-exact-app',
        targetDirectory: target,
        options: STANDALONE,
        templateId: 'blank',
      });

      const events: string[] = [];
      const result = await testAdapter.generate(plan, {
        approvedPlanDigest: plan.planDigest,
        progressReporter: (event) => events.push(event.type),
      });

      expect(result.success).toBe(true);
      expect(existsSync(path.join(target, 'project', 'info.md'))).toBe(true);
      expect(existsSync(path.join(target, 'project', 'style.md'))).toBe(true);
      expect(existsSync(path.join(target, 'project', 'guidelines.md'))).toBe(true);
      expect(existsSync(path.join(target, 'project', 'todo.md'))).toBe(true);

      const guidelines = readFileSync(path.join(target, 'project', 'guidelines.md'), 'utf8');
      expect(guidelines).toContain('bun exact.mjs web');
      expect(guidelines).toContain('Never run Expo Doctor on an Exact project');

      expect(events).toContain('scaffold:started');
    }, 15000);

    it('honors cancellation token during generation', async () => {
      const target = path.join(tempDir, 'cancel-exact-app');
      const plan = await adapter.planGeneration({
        frameworkId: 'exact',
        appName: 'cancel-exact-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      const token = new CancellationToken();
      token.cancel('User aborted');

      await expect(
        adapter.generate(plan, {
          approvedPlanDigest: plan.planDigest,
          cancellationToken: token,
        })
      ).rejects.toThrowError(/User aborted/);

      expect(existsSync(target)).toBe(false);
    });

    it('onboards an existing Exact repository non-destructively', async () => {
      const target = path.join(tempDir, 'existing-exact');
      mkdirSync(target, { recursive: true });
      writeFileSync(path.join(target, 'app.contract'), 'title: "Existing"');
      writeFileSync(path.join(target, 'exact.mjs'), '// runner');

      const proposal = await adapter.onboardExisting(target);
      expect(proposal.success).toBe(false);
      expect(proposal.proposedFiles).toContain('info.md');
      expect(proposal.planDigest).toBeDefined();

      const onboardResult = await adapter.onboardExisting(target, { approvedPlanDigest: proposal.planDigest });
      expect(onboardResult.success).toBe(true);
      expect(existsSync(path.join(target, 'project', 'info.md'))).toBe(true);
      expect(existsSync(path.join(target, 'project', 'guidelines.md'))).toBe(true);

      // Original contract is preserved unchanged
      expect(readFileSync(path.join(target, 'app.contract'), 'utf8')).toBe('title: "Existing"');
    });
  });

  describe('ExpoReactNativeAdapter', () => {
    const adapter = new ExpoReactNativeAdapter();

    it('plans and validates an Expo React Native application', async () => {
      const target = path.join(tempDir, 'expo-app');
      const plan = await adapter.planGeneration({
        frameworkId: 'expo-react-native',
        appName: 'expo-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      expect(plan.frameworkId).toBe('expo-react-native');
      const validation = await adapter.validatePlan(plan);
      expect(validation.valid).toBe(true);
    });

    it('executes Expo generation with approval digest check in dry-run', async () => {
      const target = path.join(tempDir, 'dryrun-expo-app');
      const plan = await adapter.planGeneration({
        frameworkId: 'expo-react-native',
        appName: 'dryrun-expo-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      const result = await adapter.generate(plan, {
        approvedPlanDigest: plan.planDigest,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe('expo-react-native');
    });

    it('refuses Expo generation without valid approval digest', async () => {
      const target = path.join(tempDir, 'unapproved-expo-app');
      const plan = await adapter.planGeneration({
        frameworkId: 'expo-react-native',
        appName: 'unapproved-expo-app',
        targetDirectory: target,
        options: STANDALONE,
      });

      await expect(
        adapter.generate(plan, { approvedPlanDigest: 'bad-digest' })
      ).rejects.toThrow(/does not match/);
    });
  });

  describe('FrameworkAdapterRegistry', () => {
    it('sets Exact as default framework and adapter', () => {
      const registry = getFrameworkAdapterRegistry();
      const defaultAdapter = registry.getDefaultAdapter();
      expect(defaultAdapter.descriptor.id).toBe('exact');
      expect(defaultAdapter.descriptor.isDefault).toBe(true);
    });

    it('detects Exact vs Expo vs Unknown correctly', async () => {
      const registry = getFrameworkAdapterRegistry();

      // Exact folder
      const exactDir = path.join(tempDir, 'detect-exact');
      mkdirSync(exactDir, { recursive: true });
      writeFileSync(path.join(exactDir, 'app.contract'), 'title: "Detect"');
      writeFileSync(path.join(exactDir, 'exact.mjs'), '// runner');
      expect((await registry.detectFramework(exactDir)).frameworkId).toBe('exact');

      // Expo folder
      const expoDir = path.join(tempDir, 'detect-expo');
      mkdirSync(expoDir, { recursive: true });
      writeFileSync(path.join(expoDir, 'package.json'), '{"dependencies":{"expo":"52"}}');
      writeFileSync(path.join(expoDir, 'expo-env.d.ts'), '/// <reference types="expo" />');
      expect((await registry.detectFramework(expoDir)).frameworkId).toBe('expo-react-native');

      // Unknown folder
      const unknownDir = path.join(tempDir, 'detect-unknown');
      mkdirSync(unknownDir, { recursive: true });
      writeFileSync(path.join(unknownDir, 'notes.txt'), 'random notes');
      expect((await registry.detectFramework(unknownDir)).frameworkId).toBe('unknown');
    });
  });
});
