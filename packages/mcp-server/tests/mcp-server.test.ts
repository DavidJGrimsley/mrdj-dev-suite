import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildContinueProjectPromptText,
  buildCreateExpoSuperStackPromptText,
  buildWrapUpPromptText,
  executeTool,
  listTools,
  listResources,
  readResource,
} from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('mds MCP helpers', () => {
  it('lists generated knowledge resources', async () => {
    const resources = await listResources();

    expect(resources.some((resource) => resource.uri === 'mds://guides/animation-performance')).toBe(
      true
    );
    expect(resources.some((resource) => resource.uri === 'mds://reference/mcp-sdk-transport')).toBe(
      true
    );
  });

  it('reads generated knowledge resource content', async () => {
    const resource = await readResource('mds://guides/animation-performance');

    expect(resource?.content).toContain('Expo blog');
  });

  it('executes focused Doctor file scans through tool helper', async () => {
    const result = await executeTool('knowledge_list_resources', { kind: 'skill' });

    expect(Array.isArray(result)).toBe(true);
    const skills = result as Array<{ uri: string }>;
    expect(skills.some((resource) => resource.uri === 'mds://skills/dev-server-management')).toBe(
      true
    );
    expect(
      skills.some((resource) => resource.uri === 'mds://skills/production-server-patterns')
    ).toBe(true);
    expect(skills.some((resource) => resource.uri === 'mds://skills/seo-metadata')).toBe(true);
    expect(skills.some((resource) => resource.uri === 'mds://skills/debugging')).toBe(true);
    expect(skills.some((resource) => resource.uri === 'mds://skills/project-onboarding')).toBe(
      true
    );
  });

  it('lists skills with the Phase 8 list_skills alias', async () => {
    const tools = listTools();
    expect(tools.some((tool) => tool.name === 'list_skills')).toBe(true);
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_intake_step')).toBe(true);
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_generate')).toBe(true);
    expect(tools.some((tool) => tool.name === 'mds_runtime_versions')).toBe(true);

    const result = (await executeTool('list_skills', { query: 'deployment' })) as Array<{
      id: string;
      uri: string;
    }>;

    expect(result.some((skill) => skill.id === 'deployment')).toBe(true);
    expect(result.every((skill) => skill.uri.startsWith('mds://skills/'))).toBe(true);
  });

  it('generates a Doctor-backed refactor plan with related resources', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-refactor-'));
    tempDirs.push(projectPath);
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    const unsafeName = 'EXPO_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY';
    await writeFile(path.join(projectPath, '.env'), `${unsafeName}=bad\n`, 'utf8');

    const result = (await executeTool('generate_refactor_plan', {
      projectPath,
      mode: 'fast',
      runScripts: false,
      focus: 'env',
    })) as {
      kind: string;
      priorities: Array<{ check: string; relatedResources: string[] }>;
    };

    expect(result.kind).toBe('refactor-plan');
    expect(result.priorities.some((item) => item.check === 'env hygiene')).toBe(true);
    expect(result.priorities[0]?.relatedResources).toContain('mds://rules/env-hygiene');
  });

  it('generates a target-aware deployment checklist', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-deploy-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'app'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');

    const result = (await executeTool('generate_deploy_checklist', {
      projectPath,
      target: 'web',
      mode: 'fast',
      runScripts: false,
    })) as {
      kind: string;
      target: string;
      checklist: Array<{ id: string }>;
    };

    expect(result.kind).toBe('deploy-checklist');
    expect(result.target).toBe('web');
    expect(result.checklist.some((item) => item.id === 'web-metadata')).toBe(true);
    expect(result.checklist.some((item) => item.id === 'web-ssr-safety')).toBe(true);
  });

  it('builds a continue brief through the MCP continue_project tool', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-continue-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'style.md'), '# Style\n', 'utf8');

    const result = (await executeTool('continue_project', { projectPath })) as {
      projectPath: string;
      recommendation: { priority: string };
    };

    expect(result.projectPath).toBe(path.resolve(projectPath));
    expect(result.recommendation.priority).toBe('ci-ready');
  });

  it('tells generated app users to start a fresh app-folder session for MDS Continue', () => {
    const prompt = buildCreateExpoSuperStackPromptText('F:/ReactNativeApps', 'demo-app');

    expect(prompt).toContain('create_expo_super_stack_intake_step');
    expect(prompt).toContain('create_expo_super_stack_generate');
    expect(prompt).toContain('mds_runtime_versions');
    expect(prompt).toContain('Do not fall back to `--mds-yes`');
  });

  it('returns shared intake-step guidance and runtime versions through MCP tools', async () => {
    const intake = (await executeTool('create_expo_super_stack_intake_step', {
      parentDir: 'F:/ReactNativeApps',
      appName: 'demo-app',
      answers: {},
    })) as {
      status: string;
      nextQuestion?: { id: string };
    };

    expect(intake.status).toBe('question');
    expect(intake.nextQuestion?.id).toBe('scriptLanguage');

    const runtime = (await executeTool('mds_runtime_versions', {})) as {
      intakeToolsAvailable: boolean;
      createExpoSuperStack: { invocation: string };
    };

    expect(runtime.intakeToolsAvailable).toBe(true);
    expect(runtime.createExpoSuperStack.invocation.length).toBeGreaterThan(0);
  });

  it('builds a continue slash prompt that calls continue_project first', () => {
    const prompt = buildContinueProjectPromptText('F:/ReactNativeApps/Experimental4');

    expect(prompt).toContain('continue_project');
    expect(prompt).toContain('F:/ReactNativeApps/Experimental4');
    expect(prompt).toContain('Do not offer "skip markers and implement anyway."');
    expect(prompt).toContain('Ask EXACTLY ONE question per message');
    expect(prompt).toContain('write the answer into the file under the marker and delete the marker line');
  });

  it('builds a wrap-up prompt with doctor, file-confirmation, and merge guardrails', () => {
    const prompt = buildWrapUpPromptText(
      'F:/ReactNativeApps/Experimental4',
      'feature/wrap-up-flow',
      'test',
      'auto-test'
    );

    expect(prompt).toContain('Run the MDS wrap-up release workflow');
    expect(prompt).toContain('Run `mds doctor --ci` before any git mutation.');
    expect(prompt).toContain('confirm intentionally omitted files');
    expect(prompt).toContain('gh-fix-ci');
    expect(prompt).toContain('gh-address-comments');
    expect(prompt).toContain('Repeat the fix/poll loop up to 5 total cycles');
    expect(prompt).toContain('Never auto-merge to `main`.');
    expect(prompt).toContain('project/release-policy.json');
  });
});
