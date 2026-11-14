import { describe, expect, it } from 'vitest';
import type { GenerationPlan } from '@mr.dj2u/framework-registry';
import { buildExactProjectMemory } from '../src/generator/exact-memory.js';

const base = {
  appName: 'budget-tracker', bundleId: 'com.example.budgettracker', templateId: 'blank',
  targetPlatforms: ['web'], pinnedRevision: { commit: '1234567890abcdef' }, options: {},
} as unknown as GenerationPlan;

describe('Exact project memory', () => {
  it('records supplied product requirements without inventing an experiment app', () => {
    const files = buildExactProjectMemory({ ...base, options: { answers: {
      overview: 'A household budget tracker.', audience: 'Families', coreFlows: 'Track household spending',
    } } });
    expect(files['info.md']).toContain('A household budget tracker.');
    expect(files['info.md']).toContain('Families');
    expect(files['info.md']).toContain('Track household spending');
    expect(files['info.md']).not.toMatch(/scientist|experiment/i);
    expect(files['todo.md']).not.toMatch(/experiment/i);
  });
  it('leaves missing requirements unresolved', () => {
    const files = buildExactProjectMemory(base);
    expect(files['info.md']).toContain('TodoForContext(optional)');
    expect(files['info.md']).not.toMatch(/scientist|experiment/i);
    expect(files['todo.md']).not.toMatch(/experiment/i);
  });
});
