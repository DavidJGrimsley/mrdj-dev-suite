import { describe, expect, it } from 'vitest';

import { buildShipPlan } from '../src/commands/test-and-iterate.js';

describe('push-merge-loop dry-run plan', () => {
  it('keeps mutations manual while describing complete review evidence handling', () => {
    const steps = buildShipPlan('feature/review-polling', 'test', 'Review polling');
    const plan = steps.join('\n');

    expect(plan).toContain('Push feature/review-polling');
    expect(plan).toContain('PR into test');
    expect(plan).toContain('Copilot and Codex feedback');
    expect(plan).toContain('actionable/blocking, informational, resolved, and outdated');
    expect(plan).toContain('no more than 5 total evidence cycles');
    expect(plan).toContain('fresh same-head snapshot');
    expect(plan).not.toContain('Automatically fix');
    expect(plan).not.toContain('Automatically merge');
  });
});
