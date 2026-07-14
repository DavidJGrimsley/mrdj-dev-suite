import { describe, expect, it } from 'vitest';

import {
  listKnowledgeResources,
  listPatterns,
  listPromptSpecs,
  readPromptSpec,
} from '../src/index.js';

describe('knowledge catalog expansion', () => {
  it('lists checklist/example/prompt resources', async () => {
    const checklists = listKnowledgeResources('checklist');
    const examples = listKnowledgeResources('example');
    const prompts = listKnowledgeResources('prompt');
    const skills = listKnowledgeResources('skill');
    const guides = listKnowledgeResources('guide');
    const animationPatterns = await listPatterns('animation');

    expect(checklists.some((resource) => resource.id === 'push-merge-loop')).toBe(true);
    expect(examples.some((resource) => resource.id === 'unified-agent-bundle-bootstrap')).toBe(true);
    expect(prompts.some((resource) => resource.id === 'push-merge-loop')).toBe(true);
    expect(prompts.some((resource) => resource.id === 'wrap-up')).toBe(true);
    expect(skills.some((resource) => resource.id === 'animation-motion')).toBe(true);
    expect(
      guides.some(
        (resource) =>
          resource.id === 'animation-performance' && resource.keywords.includes('parallax')
      )
    ).toBe(true);
    expect(animationPatterns.some((pattern) => pattern.id === 'animation-motion-selection')).toBe(
      true
    );
  });

  it('exposes canonical prompt specs for codex, claude, and mcp surfaces', () => {
    const codex = listPromptSpecs('codex-command');
    const claude = listPromptSpecs('claude-command');
    const mcp = listPromptSpecs('mcp-prompt');

    expect(codex.some((spec) => spec.id === 'run-doctor')).toBe(true);
    expect(codex.some((spec) => spec.id === 'review-motion')).toBe(true);
    expect(codex.some((spec) => spec.id === 'push-merge-loop')).toBe(true);
    expect(codex.some((spec) => spec.id === 'wrap-up')).toBe(true);
    expect(claude.some((spec) => spec.id === 'project-research-plan')).toBe(true);
    expect(claude.some((spec) => spec.id === 'review-motion')).toBe(true);
    expect(claude.some((spec) => spec.id === 'wrap-up')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'review_motion')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'push_merge_loop')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'wrap_up_release')).toBe(true);
  });

  it('reads prompt spec content', async () => {
    const prompt = await readPromptSpec('push-merge-loop');
    const legacyPrompt = await readPromptSpec('ship-test-loop');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('## Loop Rules');
    expect(prompt?.content).toContain('Repeat polling/fix cycles up to 5 total iterations.');
    expect(legacyPrompt?.id).toBe('push-merge-loop');
  });

  it('reads wrap-up prompt guardrails and routing content', async () => {
    const prompt = await readPromptSpec('wrap-up');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('## Required Flow Order');
    expect(prompt?.content).toContain('Never auto-merge to `main`');
    expect(prompt?.content).toContain('Repeat up to 5 cycles total.');
    expect(prompt?.content).toContain('gh-fix-ci');
    expect(prompt?.content).toContain('gh-address-comments');
    expect(prompt?.content).toContain('intentionally omitted files');
  });

  it('reads the review-motion prompt with tool-first motion guidance', async () => {
    const prompt = await readPromptSpec('review-motion');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('get_skill');
    expect(prompt?.content).toContain('animation-motion');
    expect(prompt?.content).toContain('get_guide');
    expect(prompt?.content).toContain('animation-performance');
    expect(prompt?.content).toContain('parallax or scroll-linked motion');
  });

  it('reads the create-expo-super-stack tool-first prompt content', async () => {
    const prompt = await readPromptSpec('create-expo-super-stack');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('create_expo_super_stack_resolve_info');
    expect(prompt?.content).toContain('create_expo_super_stack_intake_step');
    expect(prompt?.content).toContain('create_expo_super_stack_generate');
    expect(prompt?.content).toContain('mds_runtime_versions');
    expect(prompt?.content).toContain('Generating now. This typically takes 2-5 minutes.');
    expect(prompt?.content).toContain("While we wait, let's shout out and recognize how this is working.");
    expect(prompt?.content).toContain('Do not fall back to `--mds-yes`');
    expect(prompt?.content).not.toContain('warn if the MCP server, CLI, or wrapper looks stale');
    expect(prompt?.content).not.toContain('falling back to npm exec');
  });
});
