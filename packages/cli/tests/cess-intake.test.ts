import { describe, expect, it } from 'vitest';

import {
  buildCessIntakeStep,
  buildCreateExpoStackFlags,
  buildCreateExpoSuperStackArgv,
  extractCessInfoFromMarkdown,
  resolveCessPlan,
} from '../src/cess-intake.js';

describe('CESS intake contract', () => {
  it('asks for the parent directory before anything else when it is not provided', () => {
    const step = buildCessIntakeStep({
      appName: 'demo-app',
      answers: {},
      cwd: 'F:/ReactNativeApps',
    });

    expect(step.status).toBe('question');
    expect(step.nextQuestion?.id).toBe('parentDir');
    expect(step.defaultValue).toBe('F:\\ReactNativeApps');
  });

  it('asks for the app name in natural language and derives a slugged folder name', () => {
    const step = buildCessIntakeStep({
      parentDir: 'F:/ReactNativeApps',
      answers: {},
    });

    expect(step.status).toBe('question');
    expect(step.nextQuestion?.id).toBe('appName');
    expect(step.nextQuestion?.prompt).toBe('What is the name of your app?');
    expect(step.defaultValue).toBe('My Expo App');

    const resolved = resolveCessPlan({
      parentDir: 'F:/ReactNativeApps',
      appName: 'My Demo App',
      answers: {
        scriptLanguage: 'typescript',
        packageManager: 'npm',
        navigationLibrary: 'expo-router',
        stylingSystem: 'uniwind',
        stateManagement: 'zustand',
        authBackend: 'none',
        easSetup: false,
        audience: 'People',
        coreFlows: 'Try the app',
        screens: 'Home',
        dataNeedSelections: ['Local UI/app state'],
        targetPlatforms: ['ios'],
        appDirectory: 'src',
        webOutput: 'none',
        customBackend: false,
        deploymentTarget: 'TestFlight',
        includeCreateExpoComponents: false,
        usesExpoUi: true,
        usesExpoUiUniversalComponents: true,
        usesExpoNativeTabs: true,
        guidelinesTemplate: true,
        dataStart: 'local',
        testToMainSafeguards: true,
        saveDefaults: false,
      },
    });

    expect(resolved.appName).toBe('my-demo-app');
    expect(resolved.onboardAnswers.appName).toBe('My Demo App');
  });

  it('extracts reusable intake answers from project info markdown', () => {
    const infoMarkdown = [
      '# Experiment-Tracker Project Info',
      '',
      '## Target Users',
      '',
      'Scientists and people learning how to conduct experiments',
      '',
      '## Core User Flows',
      '',
      '- Create an experiment',
      '- View and edit existing experiments',
      '',
      '## Data And Backend',
      '',
      'Local UI/app state',
      '',
      'Starting mode: local dummy data with Expo SQLite.',
      '',
      '## Platforms',
      '',
      '- Target platforms: ios',
      '- First MVP platform: ios',
      '- Expo Router app directory: `src/app`',
      '- Platform-specific organization: platform-specific files only',
      '- Platform layout mode: shared layouts',
      '- Web output: none',
      '- Deployed server: no deployed server planned',
      '- Expo UI: yes',
      '- Expo Native Tabs: yes',
      '',
      '## Package Choices',
      '',
      '- project-docs',
      '- guidelines',
      '- uniwind',
      '- doctor',
      '- test-to-main',
      '',
      '## Release Strategy',
      '',
      '- Deployment plan: App Store',
      '- EAS usage: building mobile applications',
      '- Test-to-main safeguards: yes',
      '',
      '## Onboarding Decisions',
      '',
      '- Create Expo starter components: no',
      '- Latest Expo SDK preference: yes',
      '- Target platforms: ios',
      '- First MVP platform: ios',
      '- Expo Router app directory: `src/app`',
      '- Platform-specific organization: platform-specific files only',
      '- Platform layout mode: shared layouts',
      '- Web output: none',
      '- Deployed server: no deployed server planned',
      '- Expo UI: yes',
      '- Expo Native Tabs: yes',
      '- EAS usage: building mobile applications',
      '- Data start: local dummy data with Expo SQLite',
      '- Test-to-main safeguards: yes',
    ].join('\n');

    const extracted = extractCessInfoFromMarkdown({
      infoMarkdown,
      parentDir: 'F:/ReactNativeApps',
    });

    expect(extracted.derivedDisplayName).toBe('Experiment Tracker');
    expect(extracted.derivedFolderSlug).toBe('experiment-tracker');
    expect(extracted.prefilledAnswers.audience).toContain('Scientists');
    expect(extracted.prefilledAnswers.targetPlatforms).toEqual(['ios']);
    expect(extracted.prefilledAnswers.dataStart).toBe('local');
    expect(extracted.prefilledAnswers.stylingSystem).toBe('uniwind');
    expect(extracted.prefilledAnswers.usesExpoUi).toBe(true);
    expect(extracted.prefilledAnswers.includeCreateExpoComponents).toBe(false);
    expect(extracted.missingQuestionIds).not.toContain('audience');
    expect(extracted.ambiguousQuestionIds).toEqual([]);
  });

  it('prefers the machine-readable snapshot when generated info includes one', () => {
    const extracted = extractCessInfoFromMarkdown({
      infoMarkdown: [
        '# Demo App Project Info',
        '',
        '## Tech Stack & MDS Onboarding',
        '',
        '<!-- MDS_CESS_SNAPSHOT_START -->',
        '```json',
        JSON.stringify(
          {
            version: 1,
            displayAppName: 'Demo App',
            folderSlug: 'demo-app',
            answers: {
              scriptLanguage: 'typescript',
              packageManager: 'pnpm',
              navigationLibrary: 'expo-router',
              stylingSystem: 'uniwind',
              stateManagement: 'zustand',
              targetPlatforms: ['ios'],
              appDirectory: 'src',
              webOutput: 'none',
              audience: 'Scientists',
              coreFlows: 'Create an experiment',
            },
          },
          null,
          2,
        ),
        '```',
        '<!-- MDS_CESS_SNAPSHOT_END -->',
      ].join('\n'),
      parentDir: 'F:/ReactNativeApps',
    });

    expect(extracted.prefilledAnswers.packageManager).toBe('pnpm');
    expect(extracted.prefilledAnswers.navigationLibrary).toBe('expo-router');
    expect(extracted.prefilledAnswers.audience).toBe('Scientists');
    expect(extracted.derivedFolderSlug).toBe('demo-app');
  });

  it('reaches confirm and ready states without inventing missing answers', () => {
    const answers = {
      scriptLanguage: 'typescript',
      packageManager: 'pnpm',
      navigationLibrary: 'expo-router',
      stylingSystem: 'uniwind',
      stateManagement: 'zustand',
      authBackend: 'supabase',
      easSetup: true,
      displayAppName: 'Demo App',
      audience: 'Designers making hats',
      coreFlows: 'Design a hat, preview it, and export the mockup',
      screens: 'Home, Designer, Export',
      dataNeedSelections: ['Local UI/app state', 'File/image uploads or storage'],
      targetPlatforms: ['web', 'ios', 'android'],
      firstTargetPlatform: 'ios',
      platformStrategy: 'files-only',
      appDirectory: 'src',
      platformLayouts: 'shared',
      webOutput: 'static',
      customBackend: false,
      deploymentTarget: 'TestFlight to friends',
      includeCreateExpoComponents: false,
      usesExpoUi: true,
      usesExpoUiUniversalComponents: true,
      usesExpoNativeTabs: true,
      easUses: ['building mobile applications'],
      guidelinesTemplate: false,
      dataStart: 'local',
      testToMainSafeguards: true,
      saveDefaults: false,
    } as const;

    const confirmStep = buildCessIntakeStep({
      parentDir: 'F:/ReactNativeApps',
      appName: 'demo-app',
      answers,
    });

    expect(confirmStep.status).toBe('confirm');
    expect(confirmStep.summaryLines?.[0]).toContain('demo-app');

    const readyStep = buildCessIntakeStep({
      parentDir: 'F:/ReactNativeApps',
      appName: 'demo-app',
      answers: {
        ...answers,
        confirmed: true,
      },
    });

    expect(readyStep.status).toBe('ready');
    expect(readyStep.missingRequirements).toEqual([]);
  });

  it('builds create-expo-stack and mds flags from the shared contract', () => {
    const plan = resolveCessPlan({
      parentDir: 'F:/ReactNativeApps',
      appName: 'demo-app',
      answers: {
        scriptLanguage: 'typescript',
        packageManager: 'pnpm',
        navigationLibrary: 'react-navigation',
        reactNavigationLayout: 'tabs',
        stylingSystem: 'uniwind',
        stateManagement: 'zustand',
        authBackend: 'firebase',
        easSetup: false,
        displayAppName: 'Demo App',
        audience: 'People',
        coreFlows: 'Sign in and design hats',
        screens: 'Home, Profile',
        dataNeedSelections: ['Local UI/app state', 'Analytics/events'],
        targetPlatforms: ['web', 'ios'],
        firstTargetPlatform: 'ios',
        platformStrategy: 'folders',
        appDirectory: 'src',
        platformLayouts: 'shared',
        webOutput: 'server',
        expoServerAdapter: 'express',
        customBackend: true,
        customBackendEntry: 'server/index.js',
        deploymentTarget: 'Internal preview',
        includeCreateExpoComponents: true,
        usesExpoUi: false,
        usesExpoUiUniversalComponents: false,
        usesExpoNativeTabs: false,
        easUses: [],
        guidelinesTemplate: false,
        dataStart: 'supabase',
        testToMainSafeguards: false,
        saveDefaults: true,
        confirmed: true,
      },
    });

    expect(buildCreateExpoStackFlags(plan.answers)).toEqual([
      '--typescript',
      '--pnpm',
      '--react-navigation',
      '--tabs',
      '--uniwind',
      '--zustand',
      '--firebase',
    ]);

    const argv = buildCreateExpoSuperStackArgv(plan);
    expect(argv).toContain('--mds-no-guidelines-template');
    expect(argv).toContain('--mds-no-expo-ui');
    expect(argv).toContain('--mds-no-test-to-main');
    expect(argv).toContain('--mds-save-defaults');
    expect(argv).toContain('--mds-yes');
  });
});
