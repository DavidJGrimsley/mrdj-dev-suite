import { describe, expect, it } from 'vitest';

import {
  listKnowledgeResources,
  listPromptSpecs,
  readPromptSpec,
} from '../src/index.js';

describe('knowledge catalog expansion', () => {
  it('lists checklist/example/prompt resources', () => {
    const checklists = listKnowledgeResources('checklist');
    const examples = listKnowledgeResources('example');
    const prompts = listKnowledgeResources('prompt');

    expect(checklists.some((resource) => resource.id === 'ship-test-loop')).toBe(true);
    expect(examples.some((resource) => resource.id === 'unified-agent-bundle-bootstrap')).toBe(true);
    expect(prompts.some((resource) => resource.id === 'ship-test-loop')).toBe(true);
  });

  it('exposes canonical prompt specs for codex, claude, and mcp surfaces', () => {
    const codex = listPromptSpecs('codex-command');
    const claude = listPromptSpecs('claude-command');
    const mcp = listPromptSpecs('mcp-prompt');

    expect(codex.some((spec) => spec.id === 'run-doctor')).toBe(true);
    expect(codex.some((spec) => spec.id === 'ship-test-loop')).toBe(true);
    expect(claude.some((spec) => spec.id === 'project-research-plan')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'ship_test_loop')).toBe(true);
  });

  it('reads prompt spec content', async () => {
    const prompt = await readPromptSpec('ship-test-loop');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('## Loop Rules');
    expect(prompt?.content).toContain('Repeat polling/fix cycles up to 5 total iterations.');
  });
});
