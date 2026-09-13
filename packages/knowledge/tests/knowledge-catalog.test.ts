import { describe, expect, it } from 'vitest';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  listKnowledgeResources,
  listPatterns,
  listPromptSpecs,
  readKnowledgeResource,
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
    expect(prompts.some((resource) => resource.id === 'sync-main-into-test')).toBe(true);
    expect(prompts.some((resource) => resource.id === 'wrap-up')).toBe(true);
    expect(guides.some((resource) => resource.id === 'github-setup')).toBe(true);
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
    expect(codex.some((spec) => spec.id === 'sync-main-into-test')).toBe(true);
    expect(codex.some((spec) => spec.id === 'wrap-up')).toBe(true);
    expect(codex.some((spec) => spec.id === 'github-setup-guidance')).toBe(true);
    expect(claude.some((spec) => spec.id === 'project-research-plan')).toBe(true);
    expect(claude.some((spec) => spec.id === 'review-motion')).toBe(true);
    expect(claude.some((spec) => spec.id === 'wrap-up')).toBe(true);
    expect(claude.some((spec) => spec.id === 'github-setup-guidance')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'review_motion')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'push_merge_loop')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'sync_main_into_test')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'wrap_up_release')).toBe(true);
    expect(mcp.some((spec) => spec.mcpPromptName === 'github_setup_guidance')).toBe(true);
  });

  it('reads the main-to-test synchronization prompt guardrails', async () => {
    const prompt = await readPromptSpec('sync-main-into-test');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('mds sync-main-into-test');
    expect(prompt?.content).toContain('never merges it');
    expect(prompt?.content).toContain('isolated temporary clone');
  });

  it('reads prompt spec content', async () => {
    const prompt = await readPromptSpec('push-merge-loop');
    const legacyPrompt = await readPromptSpec('ship-test-loop');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('## Loop Rules');
    expect(prompt?.content).toContain('no more than 5 total cycles');
    expect(prompt?.content).toContain('GitHub Copilot and Codex reviews');
    expect(prompt?.content).toContain('gh api graphql');
    expect(prompt?.content).toContain('reviewThreads(first: 100, after: $cursor)');
    expect(prompt?.content).toContain('actionable/blocking');
    expect(prompt?.content).toContain('informational');
    expect(prompt?.content).toContain('resolved');
    expect(prompt?.content).toContain('outdated');
    expect(prompt?.content).toContain('final fresh snapshot');
    expect(prompt?.content).toContain('head did not change');
    expect(prompt?.content).toContain('## Evidence Report');
    expect(prompt?.content).toContain('resulting state: `repoll`, `ready`, or `blocked`');
    expect(prompt?.content).toContain('incomplete review-thread pagination');
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

  it('reads GitHub setup guidance with read-only and ruleset procedures', async () => {
    const guide = await readKnowledgeResource('mds://guides/github-setup');
    const prompt = await readPromptSpec('github-setup-guidance');

    expect(guide).not.toBeNull();
    expect(guide?.content).toContain('mds github setup');
    expect(guide?.content).toContain('gh api repos/<owner>/<repo>/rulesets');
    expect(guide?.content).toContain('Settings` → `Rules` → `Rulesets');
    expect(guide?.content).toContain('Do not paste tokens into shell history');
    expect(guide?.content).toContain('Read the recommendations');
    expect(guide?.content).toContain('A dynamic Copilot workflow is automation, not project CI');
    expect(prompt?.content).toContain('Do not create branches, push, open or edit PRs');
    expect(prompt?.content).toContain('structured recommendations');
    expect(prompt?.content).toContain('Do not treat a dynamic Copilot workflow as project CI readiness');
  });

  it('keeps generated GitHub setup command surfaces in sync', async () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const generatedPaths = [
      'plugins/codex/commands/github-setup-guidance.md',
      'plugins/claude-code/commands/github-setup-guidance.md',
      'plugins/vscode-copilot/.github/prompts/github-setup-guidance.prompt.md',
      'plugins/codex/skills/workflow-github-setup-guidance/SKILL.md',
      'plugins/vscode-copilot/user/.copilot/skills/workflow-github-setup-guidance/SKILL.md',
    ];

    const generatedContent = await Promise.all(
      generatedPaths.map((relativePath) => readFile(path.join(repoRoot, relativePath), 'utf8'))
    );

    for (const content of generatedContent) {
      expect(content).toContain('mds github setup');
      expect(content).toContain('Do not create branches, push, open or edit PRs');
    }
  });

  it('routes continue-development to the official Expo upgrade skill when continue reports SDK lag', async () => {
    const prompt = await readPromptSpec('continue-development');

    expect(prompt).not.toBeNull();
    expect(prompt?.content).toContain('expo-sdk-upgrade');
    expect(prompt?.content).toContain('upgrading-expo');
    expect(prompt?.content).toContain('Do not call MDS `get_skill` for an upgrade skill');
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
    expect(prompt?.content).toContain('Before asking for an app name');
    expect(prompt?.content).toContain('Choose `minimal` or `cess` for every Expo app');
    expect(prompt?.content).toContain("each Expo app's profile");
    expect(prompt?.content).toContain('projectShape: "multi-app-workspace"');
    expect(prompt?.content).toContain('Do not call a generation tool while inventory or app answers are incomplete');
    expect(prompt?.content).toContain('Generating now. This typically takes 2-5 minutes.');
    expect(prompt?.content).toContain("While we wait, let's shout out and recognize how this is working.");
    expect(prompt?.content).toContain('Do not fall back to `--mds-yes`');
    expect(prompt?.content).not.toContain('warn if the MCP server, CLI, or wrapper looks stale');
    expect(prompt?.content).not.toContain('falling back to npm exec');
  });
});
