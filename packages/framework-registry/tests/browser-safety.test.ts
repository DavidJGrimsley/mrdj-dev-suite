import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ApprovalRequiredError,
  CancellationToken,
  JENNY_OPENING_GREETING,
  PlanDigestMismatchError,
  PlanValidationError,
  createInitialDiscoveryState,
  createProgressEvent,
  recordRequirement,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

describe('browser-safety and error contracts', () => {
  it('ensures compiled dist modules do not contain node: runtime imports', () => {
    const files = readdirSync(distDir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(path.join(distDir, file), 'utf8');
      expect(content).not.toMatch(/from\s+['"]node:/);
      expect(content).not.toMatch(/require\(['"]node:/);
    }
  });

  it('exposes Jenny greeting and discovery state primitives', () => {
    expect(JENNY_OPENING_GREETING).toBe(
      "Hello I'm Jenny. I'm ready to help you create a new project. What's the idea?"
    );

    const initial = createInitialDiscoveryState({
      projectName: 'field-journal',
      initialIdea: 'Offline note taking',
    });
    expect(initial.agentName).toBe('Jenny');
    expect(initial.frameworkId).toBe('exact');
    expect(initial.projectName).toBe('field-journal');

    const updated = recordRequirement(
      initial,
      'auth',
      'Does the application require user authentication?',
      'answered',
      false,
      'user-stated'
    );
    expect(updated.requirements['auth']?.status).toBe('answered');
    expect(updated.requirements['auth']?.value).toBe(false);
  });

  it('creates structured error instances with actionable fixes', () => {
    const approvalErr = new ApprovalRequiredError('abc123digest');
    expect(approvalErr.code).toBe('APPROVAL_REQUIRED');
    expect(approvalErr.actionableFix).toContain('abc123digest');

    const mismatchErr = new PlanDigestMismatchError('digestA', 'digestB');
    expect(mismatchErr.code).toBe('PLAN_DIGEST_MISMATCH');
    expect(mismatchErr.message).toContain('digestA');

    const validationErr = new PlanValidationError('Validation failed', ['Target path invalid']);
    expect(validationErr.code).toBe('PLAN_VALIDATION_FAILED');
  });

  it('manages cancellation tokens and progress events', () => {
    const token = new CancellationToken();
    expect(token.isCancelled).toBe(false);
    expect(() => token.throwIfCancelled()).not.toThrow();

    token.cancel('User requested stop');
    expect(token.isCancelled).toBe(true);
    expect(() => token.throwIfCancelled()).toThrowError(/User requested stop/);

    const event = createProgressEvent('scaffold:step', 'Writing files', {
      step: 3,
      totalSteps: 10,
    });
    expect(event.percent).toBe(30);
    expect(event.type).toBe('scaffold:step');
  });
});
