import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  PHASE0_EJECTION_INVENTORY_TODO,
  applyInventoryDecisions,
  buildEjectionInventory,
  defaultKeepIds,
  defaultRetainFromMemory,
  generateEjectionCleanupTasks,
  isEjectionInventoryResolved,
  parseEjectionInventory,
  parseProjectMemorySelections,
  renderEjectionInventorySection,
  resolveEjectionInventoryForRender,
  shouldSkipGeneratedSubstitute,
} from '../src/ejection-inventory.js';
import { renderInfo, renderTodo } from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

function sampleAnswers(overrides: Partial<OnboardAnswers> = {}): OnboardAnswers {
  return {
    appName: 'Inventory App',
    audience: 'Field technicians',
    coreFlows: 'Log a site visit and review history',
    screens: 'Home, visit log',
    dataNeeds: 'Local visit records',
    deploymentTarget: 'TestFlight',
    advancedPackageSetup: true,
    includeCreateExpoComponents: true,
    targetPlatforms: ['ios'],
    firstTargetPlatform: 'ios',
    platformFileStrategy: 'files-only',
    webOutput: 'none',
    deployedServer: 'none',
    expoServerAdapter: 'none',
    customBackend: false,
    customBackendEntry: 'server.js',
    usesExpoUi: false,
    usesExpoUiUniversalComponents: false,
    usesExpoNativeTabs: false,
    easUses: [],
    projectInfoReady: false,
    projectStyleReady: false,
    appDirectory: 'src',
    platformLayoutMode: 'shared',
    dataStart: 'local',
    onboardingFlow: 'multi-screen',
    legalDocumentMode: 'none',
    onboardingCompletionMode: 'enter-app',
    legalUpdateGate: 'none',
    testToMainSafeguards: false,
    defaults: ['project-docs'],
    generatorStylingSystem: 'stylesheet',
    ...overrides,
  };
}

describe('ejection inventory', () => {
  it('defaults retain from project-memory selections, not a fixed keep list', () => {
    const memory = {
      includeCreateExpoComponents: true,
      onboardingFlow: 'multi-screen' as const,
      dataStart: 'local' as const,
      authProvider: 'none',
      legalDocumentMode: 'none' as const,
    };

    expect(defaultRetainFromMemory('onboarding', memory)).toBe(true);
    expect(defaultRetainFromMemory('create-expo-app', memory)).toBe(true);
    expect(defaultRetainFromMemory('settings', memory)).toBe(true);
    expect(defaultRetainFromMemory('data', memory)).toBe(true);
    expect(defaultRetainFromMemory('stylist', memory)).toBe(false);
    expect(defaultRetainFromMemory('exposition', memory)).toBe(false);
  });

  it('round-trips the persisted markdown shape', () => {
    const rendered = renderEjectionInventorySection({
      decision: 'pending',
      items: [
        {
          id: 'onboarding',
          label: 'Onboarding Setup',
          description: 'Generated onboarding',
          source: 'mds',
          kind: 'product',
          present: true,
          selectedInMemory: true,
          defaultDecision: 'retain',
          decision: 'retain',
          libraryItemIds: ['mds/onboarding'],
          destinations: [],
        },
        {
          id: 'stylist',
          label: 'Stylist',
          description: 'Developer stylist',
          source: 'mds',
          kind: 'developer-tool',
          present: true,
          selectedInMemory: false,
          defaultDecision: 'eject',
          decision: 'eject',
          libraryItemIds: ['mds/stylist'],
          destinations: [],
        },
      ],
    });
    const parsed = parseEjectionInventory(`# App Info\n\n${rendered}`);

    expect(parsed?.decision).toBe('pending');
    expect(parsed?.items.map((item) => [item.id, item.decision])).toEqual([
      ['onboarding', 'retain'],
      ['stylist', 'eject'],
    ]);
    expect(isEjectionInventoryResolved(parsed)).toBe(false);
  });

  it('enumerates present generated groups from the project tree and memory', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-inventory-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'onboarding'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'features', 'settings'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'components'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'components', 'themed-text.tsx'),
      'export {};\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Info',
        '',
        '- Components from create-expo-app: Yes',
        '- Onboarding Flow: Multi-screen',
        '- Starting Data mode: local dummy data with Expo SQLite.',
        '',
      ].join('\n'),
      'utf8'
    );

    const inventory = await buildEjectionInventory(projectPath);
    const presentIds = inventory.items.filter((item) => item.present).map((item) => item.id);

    expect(presentIds).toEqual(expect.arrayContaining(['onboarding', 'settings', 'create-expo-app']));
    expect(defaultKeepIds(inventory)).toEqual(
      expect.arrayContaining(['onboarding', 'settings', 'create-expo-app'])
    );
    expect(defaultKeepIds(inventory)).not.toContain('stylist');
  });

  it('writes a pending inventory and Phase 0 ejection task into generated project memory', () => {
    const answers = sampleAnswers();
    const info = renderInfo('/tmp/inventory-app', answers);
    const todo = renderTodo(answers);
    const parsed = parseEjectionInventory(info);
    const memory = parseProjectMemorySelections(info);

    expect(info).toContain('## Ejection Inventory');
    expect(info).toContain('- Decision: pending');
    expect(parsed?.items.some((item) => item.id === 'onboarding')).toBe(true);
    expect(parsed?.items.some((item) => item.id === 'create-expo-app')).toBe(true);
    expect(memory.includeCreateExpoComponents).toBe(true);
    expect(todo).toContain(`- [ ] ${PHASE0_EJECTION_INVENTORY_TODO}`);
    expect(
      resolveEjectionInventoryForRender(
        {
          includeCreateExpoComponents: true,
          onboardingFlow: 'multi-screen',
          dataStart: 'local',
        },
        info
      ).decision
    ).toBe('pending');
  });

  it('generates cleanup tasks for leftover imports after an eject decision', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-cleanup-'));
    tempDirs.push(projectPath);
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await mkdir(path.join(projectPath, 'project'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      '<Stack.Screen name="onboarding" />\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'guidelines.md'),
      '- Onboarding Setup is generated by MDS.\n',
      'utf8'
    );

    const inventory = applyInventoryDecisions(
      {
        decision: 'confirmed',
        items: [
          {
            id: 'onboarding',
            label: 'Onboarding Setup',
            description: 'Generated onboarding',
            source: 'mds',
            kind: 'product',
            present: false,
            selectedInMemory: true,
            defaultDecision: 'retain',
            decision: 'eject',
            libraryItemIds: ['mds/onboarding'],
            destinations: ['{{featuresDir}}/onboarding/welcome-screen.tsx'],
          },
        ],
      },
      [],
      { confirm: true }
    );
    const tasks = await generateEjectionCleanupTasks(
      projectPath,
      inventory.items,
      [path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx')]
    );

    expect(tasks.some((task) => task.text.includes('dangling imports'))).toBe(true);
    expect(tasks.some((task) => task.text.includes('guidelines.md'))).toBe(true);
  });

  it('blocks generated substitutes for retained destinations after a confirmed inventory', () => {
    const inventory = {
      decision: 'confirmed' as const,
      items: [
        {
          id: 'create-expo-app',
          label: 'create-expo-app Components',
          description: 'Starter components',
          source: 'create-expo-app' as const,
          kind: 'starter-component' as const,
          present: true,
          selectedInMemory: true,
          defaultDecision: 'retain' as const,
          decision: 'retain' as const,
          libraryItemIds: ['expo/themed-text'],
          destinations: ['{{componentsDir}}/themed-text.tsx'],
        },
        {
          id: 'expo-sdk-56',
          label: 'Expo SDK 56 Exposition',
          description: 'Expo starter screens',
          source: 'mds' as const,
          kind: 'exposition' as const,
          present: false,
          selectedInMemory: false,
          defaultDecision: 'eject' as const,
          decision: 'eject' as const,
          libraryItemIds: [],
          destinations: ['{{componentsDir}}/legacy-ejected.tsx'],
        },
      ],
    };

    expect(
      shouldSkipGeneratedSubstitute(
        inventory,
        '/tmp/app',
        path.join('/tmp/app', 'src', 'components', 'themed-text.tsx')
      )
    ).toBe(true);
    expect(
      shouldSkipGeneratedSubstitute(inventory, '/tmp/app', path.join('/tmp/app', 'src', 'theme', 'provider.tsx'))
    ).toBe(false);
    expect(
      shouldSkipGeneratedSubstitute(
        inventory,
        '/tmp/app',
        path.join('/tmp/app', 'src', 'components', 'legacy-ejected.tsx')
      )
    ).toBe(false);
  });
});
