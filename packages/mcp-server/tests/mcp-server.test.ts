import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildContinueProjectPromptText,
  buildCreateExpoSuperStackPromptText,
  executeTool,
  listResources,
  readResource,
} from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('mrdj MCP helpers', () => {
  it('lists generated knowledge resources', async () => {
    const resources = await listResources();

    expect(resources.some((resource) => resource.uri === 'mrdj://guides/animation-performance')).toBe(
      true
    );
    expect(resources.some((resource) => resource.uri === 'mrdj://reference/mcp-sdk-transport')).toBe(
      true
    );
  });

  it('reads generated knowledge resource content', async () => {
    const resource = await readResource('mrdj://guides/animation-performance');

    expect(resource?.content).toContain('Expo blog');
  });

  it('executes focused Doctor file scans through tool helper', async () => {
    const result = await executeTool('knowledge_list_resources', { kind: 'skill' });

    expect(Array.isArray(result)).toBe(true);
  });

  it('builds a continue brief through the MCP continue_project tool', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mrdj-mcp-continue-'));
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

    expect(prompt).toContain('mrdj continue');
    expect(prompt).toContain('For lower token usage and lower cost');
    expect(prompt).toContain('open this generated app folder in a new agent session');
    expect(prompt).toContain('scope every command, search, and file read/write to the generated app folder');
  });

  it('builds a continue slash prompt that calls continue_project first', () => {
    const prompt = buildContinueProjectPromptText('F:/ReactNativeApps/Experimental4');

    expect(prompt).toContain('continue_project');
    expect(prompt).toContain('F:/ReactNativeApps/Experimental4');
    expect(prompt).toContain('Do not offer "skip markers and implement anyway."');
    expect(prompt).toContain('Wait for user approval before making any file edits');
  });
});
