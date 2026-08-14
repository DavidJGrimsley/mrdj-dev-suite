import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildContinueProjectPromptText,
  buildCreateExpoSuperStackPromptText,
  buildReviewMotionPromptText,
  buildWrapUpPromptText,
  classifyMcpServerRuntimeMode,
  executeTool,
  finalizeGeneratedSuperStackProject,
  listTools,
  listResources,
  readResource,
  resolveSuperStackInvocationSpec,
} from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createLibraryTestProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-library-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'components'), { recursive: true });
  await writeFile(
    path.join(projectPath, 'src', 'app', '_layout.tsx'),
    "import { Stack } from 'expo-router';\nexport default function Layout() { return <Stack />; }\n",
    'utf8'
  );
  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(
      {
        name: 'mds-library-mcp-test',
        private: true,
        dependencies: {
          expo: '~56.0.0',
          'expo-router': '~56.2.6',
          react: '19.1.0',
          'react-native': '0.81.0',
        },
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['./src/*'] },
        },
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    path.join(projectPath, 'app.json'),
    JSON.stringify({ expo: { name: 'MDS Library Test', slug: 'mds-library-test' } }, null, 2),
    'utf8'
  );
  return projectPath;
}

describe('mds MCP helpers', () => {
  it('lists generated knowledge resources', async () => {
    const resources = await listResources();

    expect(resources.some((resource) => resource.uri === 'mds://guides/animation-performance')).toBe(
      true
    );
    expect(resources.some((resource) => resource.uri === 'mds://skills/animation-motion')).toBe(
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
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_extract_info')).toBe(true);
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_intake_step')).toBe(true);
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_resolve_info')).toBe(true);
    expect(tools.some((tool) => tool.name === 'create_expo_super_stack_generate')).toBe(true);
    expect(tools.some((tool) => tool.name === 'generate_project_roadmap')).toBe(true);
    expect(tools.some((tool) => tool.name === 'mds_runtime_versions')).toBe(true);

    const result = (await executeTool('list_skills', { query: 'deployment' })) as Array<{
      id: string;
      uri: string;
    }>;

    expect(result.some((skill) => skill.id === 'deployment')).toBe(true);
    expect(result.every((skill) => skill.uri.startsWith('mds://skills/'))).toBe(true);
  });

  it('lists all MDS Library tools with confirmation-safe schemas', () => {
    const tools = listTools();
    const toolNames = new Set(tools.map((tool) => tool.name));
    expect(toolNames.has('library_search')).toBe(true);
    expect(toolNames.has('library_get')).toBe(true);
    expect(toolNames.has('library_plan_add')).toBe(true);
    expect(toolNames.has('library_add')).toBe(true);

    const planTool = tools.find((tool) => tool.name === 'library_plan_add');
    expect(planTool?.description).toContain('placement guidance');
    expect(planTool?.description).toContain('Before applying any library item');
    const addTool = tools.find((tool) => tool.name === 'library_add');
    expect(addTool?.description).toContain('named the app placement/integration point');
    const addSchema = addTool?.inputSchema as {
      properties?: Record<string, { const?: unknown; type?: string }>;
      required?: string[];
    };
    expect(addSchema.required).toEqual(
      expect.arrayContaining(['id', 'projectPath', 'planHash', 'confirmed'])
    );
    expect(addSchema.properties?.confirmed).toMatchObject({
      type: 'boolean',
      const: true,
    });
    expect(addSchema.properties?.installDependencies).toMatchObject({
      type: 'boolean',
    });
  });

  it('searches and resolves MDS Library items with optional project compatibility context', async () => {
    const projectPath = await createLibraryTestProject();
    const search = (await executeTool('library_search', {
      query: 'svg',
      kind: 'component',
      source: 'swmansion',
      projectPath,
    })) as Array<{ id: string }>;

    expect(search.some((item) => item.id === 'swmansion/svg-mark')).toBe(true);

    const resolution = (await executeTool('library_get', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as {
      item: { id: string };
      compatible: boolean;
      issues: unknown[];
    };
    expect(resolution.item.id).toBe('swmansion/svg-mark');
    expect(resolution.compatible).toBe(true);
    expect(Array.isArray(resolution.issues)).toBe(true);

    const legalSearch = (await executeTool('library_search', {
      query: 'privacy terms',
      projectPath,
    })) as Array<{ id: string }>;
    expect(legalSearch.some((item) => item.id === 'mds/legal-documents')).toBe(true);

    const legalResolution = (await executeTool('library_get', {
      id: 'mds/legal-documents',
      projectPath,
    })) as {
      item: { id: string };
      variant?: { id: string };
      compatible: boolean;
      assets: Array<{ destination: string }>;
    };
    expect(legalResolution.item.id).toBe('mds/legal-documents');
    expect(legalResolution.compatible).toBe(true);
    expect(legalResolution.variant?.id).toBe('public-routes');
    expect(legalResolution.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: 'src/app/terms.tsx' }),
        expect.objectContaining({ destination: 'src/app/privacy.tsx' }),
      ])
    );
  });

  it('throws the same unknown-item error as the CLI for library_get', async () => {
    await expect(
      executeTool('library_get', {
        id: 'missing/item',
      })
    ).rejects.toThrow('Unknown library item: missing/item');
  });

  it('returns a deterministic MDS Library add plan hash', async () => {
    const projectPath = await createLibraryTestProject();
    const first = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as { planHash: string; placementGuidance: string[] };
    const second = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as { planHash: string };

    expect(first.planHash.length).toBeGreaterThan(0);
    expect(second.planHash).toBe(first.planHash);
    expect(first.placementGuidance).toContainEqual(
      expect.stringContaining('ask the developer where they want to see or use it')
    );
    expect(first.placementGuidance).toContainEqual(
      expect.stringContaining('src/components/swmansion/svg-mark.tsx')
    );
  });

  it('requires explicit confirmation before applying an MDS Library add plan', async () => {
    const projectPath = await createLibraryTestProject();
    const input = {
      id: 'swmansion/svg-mark',
      projectPath,
      planHash: 'not-confirmed',
      installDependencies: false,
    };

    await expect(executeTool('library_add', input)).rejects.toThrow('confirmed=true');
    await expect(executeTool('library_add', { ...input, confirmed: false })).rejects.toThrow(
      'confirmed=true'
    );
  });

  it('rejects a stale MDS Library plan hash', async () => {
    const projectPath = await createLibraryTestProject();
    const plan = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as { planHash: string };
    const destinationDirectory = path.join(projectPath, 'src', 'components', 'swmansion');
    await mkdir(destinationDirectory, { recursive: true });
    await writeFile(
      path.join(destinationDirectory, 'svg-mark.tsx'),
      '// project changed after planning\n',
      'utf8'
    );

    await expect(
      executeTool('library_add', {
        id: 'swmansion/svg-mark',
        projectPath,
        planHash: plan.planHash,
        confirmed: true,
        installDependencies: false,
      })
    ).rejects.toThrow('stale planHash');
  });

  it('applies a confirmed safe MDS Library plan without installing dependencies', async () => {
    const projectPath = await createLibraryTestProject();
    const plan = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as { planHash: string };

    const result = (await executeTool('library_add', {
      id: 'swmansion/svg-mark',
      projectPath,
      planHash: plan.planHash,
      confirmed: true,
      installDependencies: false,
    })) as {
      dependenciesInstalled: boolean;
      executedCommands: string[];
      pendingCommands: string[];
      writtenFiles: string[];
    };
    const installedSource = await readFile(
      path.join(projectPath, 'src', 'components', 'swmansion', 'svg-mark.tsx'),
      'utf8'
    );

    expect(result.dependenciesInstalled).toBe(false);
    expect(result.executedCommands).toEqual([]);
    expect(result.pendingCommands.some((command) => command.includes('react-native-svg'))).toBe(
      true
    );
    expect(result.writtenFiles).toContain('src/components/swmansion/svg-mark.tsx');
    expect(installedSource).toContain('SvgMark');
  });

  it('does not overwrite a customized MDS Library destination', async () => {
    const projectPath = await createLibraryTestProject();
    const initialPlan = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as { planHash: string };
    await executeTool('library_add', {
      id: 'swmansion/svg-mark',
      projectPath,
      planHash: initialPlan.planHash,
      confirmed: true,
      installDependencies: false,
    });

    const destination = path.join(projectPath, 'src', 'components', 'swmansion', 'svg-mark.tsx');
    const customizedSource = '// user customization must survive\nexport const custom = true;\n';
    await writeFile(destination, customizedSource, 'utf8');
    const blockedPlan = (await executeTool('library_plan_add', {
      id: 'swmansion/svg-mark',
      projectPath,
    })) as {
      canApply: boolean;
      conflicts: Array<{ code: string; path: string }>;
      planHash: string;
    };

    expect(blockedPlan.canApply).toBe(false);
    expect(blockedPlan.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'file-conflict',
          path: 'src/components/swmansion/svg-mark.tsx',
        }),
      ])
    );

    await expect(
      executeTool('library_add', {
        id: 'swmansion/svg-mark',
        projectPath,
        planHash: blockedPlan.planHash,
        confirmed: true,
        installDependencies: false,
      })
    ).rejects.toThrow();
    expect(await readFile(destination, 'utf8')).toBe(customizedSource);
  });

  it('starts through the packaged mds-mcp-server entrypoint and exposes Super Stack tools', async () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const mcpServerEntrypoint = path.resolve(testDir, '..', 'dist', 'stdio.js');
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpServerEntrypoint],
    });
    const client = new Client(
      {
        name: 'mds-mcp-server-launcher-test',
        version: '0.0.0',
      },
      {
        capabilities: {},
      }
    );

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      const toolNames = new Set(tools.tools.map((tool) => tool.name));
      const prompts = await client.listPrompts();
      const promptNames = new Set(prompts.prompts.map((prompt) => prompt.name));
      expect(toolNames.has('mds_runtime_versions')).toBe(true);
      expect(toolNames.has('create_expo_super_stack_resolve_info')).toBe(true);
      expect(toolNames.has('create_expo_super_stack_generate')).toBe(true);
      expect(toolNames.has('library_search')).toBe(true);
      expect(toolNames.has('library_get')).toBe(true);
      expect(toolNames.has('library_plan_add')).toBe(true);
      expect(toolNames.has('library_add')).toBe(true);
      expect(promptNames.has('review_motion')).toBe(true);

      const librarySearch = await client.callTool({
        name: 'library_search',
        arguments: { query: 'svg', source: 'swmansion' },
      });
      const serializedSearch = librarySearch.content[0];
      if (!serializedSearch || serializedSearch.type !== 'text') {
        throw new Error('library_search did not return JSON text content.');
      }
      const searchItems = JSON.parse(serializedSearch.text) as Array<{
        id: string;
      }>;
      expect(searchItems.some((item) => item.id === 'swmansion/svg-mark')).toBe(true);
    } finally {
      await client.close().catch(() => undefined);
    }
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

  it('routes animation warnings to motion skill, guide, and pattern resources', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-motion-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'components'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    await writeFile(
      path.join(projectPath, 'src', 'components', 'landing-motion.tsx'),
      [
        "import { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, interpolate } from 'react-native-reanimated';",
        'export function LandingMotion() {',
        '  const scrollY = useSharedValue(0);',
        '  const onScroll = useAnimatedScrollHandler(() => {});',
        '  const heroLayer = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -20]) }] }));',
        '  const midLayer = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -12]) }] }));',
        '  const backLayer = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, -8]) }] }));',
        '  const pinnedLayer = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 100], [1, 0]) }));',
        '  const depthLayer = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(scrollY.value, [0, 100], [1, 1.05]) }] }));',
        '  return { onScroll, heroLayer, midLayer, backLayer, pinnedLayer, depthLayer, mode: "parallax layered hero pinned depth scroll-linked" };',
        '}',
      ].join('\n'),
      'utf8'
    );

    const result = (await executeTool('generate_refactor_plan', {
      projectPath,
      mode: 'fast',
      runScripts: false,
      focus: 'animation',
    })) as {
      priorities: Array<{ check: string; relatedResources: string[]; nextStep: string }>;
    };

    const animationPriority = result.priorities.find((item) => item.check === 'animation performance');
    expect(animationPriority).toBeDefined();
    expect(animationPriority?.relatedResources).toContain('mds://skills/animation-motion');
    expect(animationPriority?.relatedResources).toContain('mds://guides/animation-performance');
    expect(animationPriority?.relatedResources).toContain('mds://patterns/animation-motion-selection');
    expect(animationPriority?.nextStep).toContain('Classify the motion first');
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

  it('previews a derived project roadmap through MCP without writing by default', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-roadmap-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Freelancers managing client projects.',
        '',
        '## Product Goals',
        '',
        '- Help freelancers onboard clients faster.',
        '',
        '## Core User Flows',
        '',
        '- sign up',
        '- create a project',
        '',
        '## Must-Include Screens Or Flows',
        '',
        '- Home',
        '- Project detail',
        '',
        '## Release Strategy',
        '',
        '- TestFlight beta',
      ].join('\n'),
      'utf8'
    );

    const result = (await executeTool('generate_project_roadmap', {
      projectPath,
    })) as {
      kind: string;
      blockedByMarkers: boolean;
      needsClarification: boolean;
      write: boolean;
      wrote: boolean;
      phases: Array<{ id: string; tasks: Array<{ text: string }> }>;
    };

    expect(result.kind).toBe('project-roadmap');
    expect(result.blockedByMarkers).toBe(false);
    expect(result.needsClarification).toBe(false);
    expect(result.write).toBe(false);
    expect(result.wrote).toBe(false);
    expect(result.phases.some((phase) => phase.id === 'phase-1')).toBe(true);
    expect(result.phases.some((phase) => phase.tasks.some((task) => task.text.includes('sign up')))).toBe(true);
  });

  it('returns clarification metadata through MCP when project info is still generic', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-roadmap-generic-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Demo Project Info',
        '',
        '## Target Users',
        '',
        'Expo app users',
        '',
        '## Product Goals',
        '',
        'Help users.',
        '',
        '## Core User Flows',
        '',
        'Agent should derive the first core user flows from project/info.md during intake.',
        '',
        '## Release Strategy',
        '',
        '- Deployment plan: Expo web/native deployment',
      ].join('\n'),
      'utf8'
    );

    const result = (await executeTool('generate_project_roadmap', {
      projectPath,
    })) as {
      needsClarification: boolean;
      clarificationQuestions: Array<{ id: string }>;
    };

    expect(result.needsClarification).toBe(true);
    expect(result.clarificationQuestions.some((question) => question.id === 'core-user-flows')).toBe(
      true
    );
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

    expect(prompt).toContain('create_expo_super_stack_resolve_info');
    expect(prompt).toContain('create_expo_super_stack_intake_step');
    expect(prompt).toContain('create_expo_super_stack_generate');
    expect(prompt).toContain('mds_runtime_versions');
    expect(prompt).toContain('inspect the active runtime and invocation path');
    expect(prompt).toContain('Generating now. This typically takes 2-5 minutes.');
    expect(prompt).toContain("While we wait, let's shout out and recognize how this is working.");
    expect(prompt).toContain('Warn only when `mds_runtime_versions.warnings` is non-empty');
    expect(prompt).toContain('Do not fall back to `--mds-yes`');
    expect(prompt).toContain('treat generation as a failure or partial scaffold');
    expect(prompt).not.toContain('warn if the MCP server, CLI, or wrapper looks stale');
    expect(prompt).not.toContain('falling back to npm exec');
  });

  it('extracts intake answers from attached project info through MCP', async () => {
    const extracted = (await executeTool('create_expo_super_stack_extract_info', {
      parentDir: 'F:/ReactNativeApps',
      infoMarkdown: [
        '# Experiment Tracker Project Info',
        '',
        '## Target Users',
        '',
        'Scientists',
        '',
        '## Core User Flows',
        '',
        '- Create an experiment',
        '',
        '## Platforms',
        '',
        '- Target platforms: ios',
        '- First MVP platform: ios',
        '- Expo Router app directory: `src/app`',
        '- Web output: none',
      ].join('\n'),
    })) as {
      derivedFolderSlug?: string;
      prefilledAnswers: { audience?: string; targetPlatforms?: string[] };
    };

    expect(extracted.derivedFolderSlug).toBe('experiment-tracker');
    expect(extracted.prefilledAnswers.audience).toBe('Scientists');
    expect(extracted.prefilledAnswers.targetPlatforms).toEqual(['ios']);
  });

  it('resolves complete project info into a ready generate payload through MCP', async () => {
    const resolved = (await executeTool('create_expo_super_stack_resolve_info', {
      parentDir: 'F:/ReactNativeApps',
      appName: 'experimental2',
      infoMarkdown: [
        '# Experiment-Tracker Project Info',
        '',
        '## App Name',
        'Experimental',
        '',
        '## Target Users',
        'Scientists and people learning how to conduct experiments',
        '',
        '## First User Flow',
        '- Create an experiment',
        '',
        '## Core Flows and Features',
        '- Track experiments',
        '',
        '## Screens',
        '- New',
        '- Track',
        '',
        '## Platforms',
        '- Target platforms: ios, android',
        '- First MVP platform: ios',
        '',
        '# Tech Stack & CESS Onboarding',
        '',
        '- TypeScript: Yes',
        '- Package Manager: npm',
        '- Navigation: Expo Router',
        '- Type of Navigation: Drawer + Tabs',
        '- Expo Router app directory: src/app',
        '- Platform-specific organization: platform-specific files only',
        '- Platform layout mode: shared layouts',
        '- Web output: none',
        '- Style Library: NativeWindUI',
        '- Components from create-expo-app: Yes',
        '- Expo UI: Yes',
        '- Expo UI Universal components: Yes',
        '- Expo Native Tabs: Yes',
        '- State management library: None',
        '- Auth: None',
        '- Onboarding Flow: Multi-screen onboarding',
        '- Legal Documents: None',
        '- Onboarding Completion: Enter app shell',
        '- Data Categories: Local UI/app state / File/image uploads or storage',
        '- Starting Data mode: local dummy data with Expo SQLite',
        '- EAS: Yes',
        '- EAS Usage: Building mobile apps',
        '- Deployed server: no deployed server planned',
        '- Initial Deployment plan: App Store',
        '- Start with MDS project guidelines template: Yes',
        '- Use test-to-main safeguards: Yes',
      ].join('\n'),
    })) as {
      status: string;
      appName?: string;
      answers: { stylingSystem?: string; scriptLanguage?: string; displayAppName?: string };
      missingQuestionIds: string[];
      ambiguousQuestionIds: string[];
      generateInput?: {
        appName: string;
        confirmed: boolean;
        answers: Record<string, unknown>;
        canonicalProjectInfoMarkdown: string;
      };
    };

    expect(resolved.status).toBe('confirm');
    expect(resolved.appName).toBe('experimental2');
    expect(resolved.answers.displayAppName).toBe('Experimental');
    expect(resolved.answers.scriptLanguage).toBe('typescript');
    expect(resolved.answers.stylingSystem).toBe('nativewindui');
    expect(resolved.missingQuestionIds).toEqual([]);
    expect(resolved.ambiguousQuestionIds).toEqual([]);
    expect(resolved.generateInput?.appName).toBe('experimental2');
    expect(resolved.generateInput?.confirmed).toBe(true);
    expect(resolved.generateInput?.answers.displayAppName).toBe('Experimental');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).toContain('## Core Flows and Features');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).toContain('Track experiments');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).toContain('- Initial Deployment plan: App Store');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).toContain('# Experimental Project Info');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).not.toContain('## Imported Notes');
    expect(resolved.generateInput?.canonicalProjectInfoMarkdown).not.toContain('Source project:');
  });

  it('finalizes generated super-stack project memory from canonical info markdown', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-generate-finalize-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }), 'utf8');
    await writeFile(path.join(projectPath, 'src', 'app', 'exposition', 'stylist.tsx'), 'export default null;\n', 'utf8');
    await writeFile(path.join(projectPath, 'project', 'info.md'), '# Old Info\n', 'utf8');

    const canonicalProjectInfoMarkdown = [
      '# Experimental Project Info',
      '',
      '## App Name',
      'Experimental',
      '',
      '## Target Users',
      'Scientists and people learning how to conduct experiments',
      '',
      '## Product Goals',
      'Provide a way for scientists to track and manage experiments effectively.',
      '',
      '## First User Flow',
      'Create an experiment',
      '',
      '## Core Flows and Features',
      '- Track experiments',
      '- Add notes and images',
      '',
      '## Screens',
      '- New',
      '- Track',
      '',
      '# Tech Stack & CESS Onboarding',
      '',
      '- TypeScript: Yes',
      '- Package Manager: npm',
      '- Navigation: Expo Router',
      '- Type of Navigation: Drawer + Tabs',
      '- Expo Router app directory: src/app',
      '- Platform-specific organization: platform-specific files only',
      '- Platform layout mode: shared layouts',
      '- Web output: none',
      '- Style Library: NativeWindUI',
      '- Components from create-expo-app: Yes',
      '- Expo UI: Yes',
      '- Expo UI Universal components: Yes',
      '- Expo Native Tabs: Yes',
      '- State management library: None',
      '- Auth: None',
      '- Onboarding Flow: Multi-screen onboarding',
      '- Legal Documents: None',
      '- Onboarding Completion: Enter app shell',
      '- Data Categories: Local UI/app state, File/image uploads or storage',
      '- Starting Data mode: local dummy data with Expo SQLite',
      '- EAS: Yes',
      '- EAS Usage: Building mobile apps',
      '- Deployed server: no deployed server planned',
      '- Initial Deployment plan: App Store',
      '- Start with MDS project guidelines template: Yes',
      '- Use test-to-main safeguards: Yes',
      '',
    ].join('\n');

    const roadmap = await finalizeGeneratedSuperStackProject({
      projectPath,
      appDirectory: 'src',
      canonicalProjectInfoMarkdown,
    });

    const info = await readFile(path.join(projectPath, 'project', 'info.md'), 'utf8');
    const todo = await readFile(path.join(projectPath, 'project', 'todo.md'), 'utf8');
    expect(info).toContain('Experimental Project Info');
    expect(info).toContain('- Initial Deployment plan: App Store');
    expect(roadmap.write).toBe(true);
    expect(roadmap.wrote).toBe(true);
    expect(roadmap.needsClarification).toBe(false);
    expect(todo).toContain('Implement the first core user flow: Create an experiment');
    expect(todo).toContain('Prepare store/distribution packaging, review notes, and release validation');
  });

  it('rejects non-canonical create-expo-super-stack answer aliases', async () => {
    await expect(
      executeTool('create_expo_super_stack_generate', {
        parentDir: 'F:/ReactNativeApps',
        appName: 'demo-app',
        confirmed: true,
        answers: {
          language: 'typescript',
          routing: 'expo-router',
          style: 'nativewindui',
        },
      })
    ).rejects.toThrow('Unsupported Create Expo Super Stack answer keys');
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
      runtimeMode: 'local-node' | 'published-npx';
      versionVisibility: 'direct' | 'isolated';
      versionVisibilityReason: string;
      cliVersion: string | null;
      createExpoStackVersion: string | null;
      createExpoSuperStack: { invocation: string; version: string | null };
      warnings: string[];
    };

    expect(runtime.intakeToolsAvailable).toBe(true);
    expect(runtime.createExpoSuperStack.invocation.length).toBeGreaterThan(0);
    expect(runtime.runtimeMode).toBe('local-node');
    expect(runtime.createExpoSuperStack.source).toBe('local-build');
    expect(['direct', 'isolated']).toContain(runtime.versionVisibility);
    expect(runtime.versionVisibilityReason.length).toBeGreaterThan(0);
    expect(runtime).toHaveProperty('cliVersion');
    expect(runtime.createExpoSuperStack.version).not.toBe('latest');
    expect(runtime.warnings).toEqual([]);
  });

  it('prefers the local create-expo-super-stack build in repo-backed MCP sessions', () => {
    const spec = resolveSuperStackInvocationSpec();
    expect(spec.command).toBe(process.execPath);
    expect(spec.args[0]?.replace(/\\/gu, '/')).toContain('/packages/create-expo-super-stack/dist/cli.js');
    expect(spec.source).toBe('local-build');
  });

  it('prefers process.execPath plus npm-cli for published super-stack invocation', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'mds-npm-cli-'));
    tempDirs.push(tempDir);
    const fakeNpmCli = path.join(tempDir, 'npm-cli.js');
    await writeFile(fakeNpmCli, '// fake npm cli\n', 'utf8');
    const spec = resolveSuperStackInvocationSpec({
      packageJsonPath:
        'C:/Users/DJLeg/AppData/Local/npm-cache/_npx/abc123/node_modules/@mr.dj2u/mcp-server/package.json',
      npmCliPath: fakeNpmCli,
    });
    expect(spec.command).toBe(process.execPath);
    expect(spec.args[0]).toBe(fakeNpmCli);
    expect(spec.source).toBe('npm-exec');
  });

  it('classifies published npx runtime paths as published sessions', () => {
    expect(
      classifyMcpServerRuntimeMode(
        'C:/Users/DJLeg/AppData/Local/npm-cache/_npx/abc123/node_modules/@mr.dj2u/mcp-server/package.json'
      )
    ).toBe('published-npx');
  });

  it('builds a continue slash prompt that calls continue_project first', () => {
    const prompt = buildContinueProjectPromptText('F:/ReactNativeApps/Experimental4');

    expect(prompt).toContain('continue_project');
    expect(prompt).toContain('F:/ReactNativeApps/Experimental4');
    expect(prompt).toContain('Do not offer "skip markers and implement anyway."');
    expect(prompt).toContain('Ask EXACTLY ONE question per message');
    expect(prompt).toContain('write the answer into the file under the marker and delete the marker line');
    expect(prompt).toContain('expo-sdk-upgrade');
    expect(prompt).toContain('upgrading-expo');
    expect(prompt).toContain('Do not call MDS `get_skill` for an upgrade skill');
  });

  it('builds a motion review prompt that requires the motion skill and guide', () => {
    const prompt = buildReviewMotionPromptText(
      'F:/ReactNativeApps/time2pay',
      'src/components/landing/landing-page.tsx',
      'fast'
    );

    expect(prompt).toContain('review-motion');
    expect(prompt).toContain('doctor_scan_project');
    expect(prompt).toContain('doctor_scan_file');
    expect(prompt).toContain('animation-motion');
    expect(prompt).toContain('animation-performance');
    expect(prompt).toContain('parallax or scroll-linked motion');
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
