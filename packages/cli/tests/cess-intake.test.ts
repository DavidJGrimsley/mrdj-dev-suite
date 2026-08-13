import { describe, expect, it } from 'vitest';
import path from 'node:path';

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
    expect(step.defaultValue).toBe(path.resolve('F:/ReactNativeApps'));
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
        onboardingFlow: 'multi-screen',
        legalDocumentMode: 'none',
        onboardingCompletionMode: 'enter-app',
        legalUpdateGate: 'none',
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
      '## Overview',
      '',
      'Build an Expo app for Scientists and people learning how to conduct experiments.',
      '',
      '## Target Users',
      '',
      'Scientists and people learning how to conduct experiments',
      '',
      '## Problem this app solves',
      '',
      "There's no good way to track experiment data on the go.",
      '',
      '## Product Goals',
      '',
      'Provide a way for scientists to track and manage experiments effectively.',
      '',
      '## Non-Goals',
      '',
      'Ways to actually conduct experiments, analyze data, or collaborate with other scientists.',
      '',
      '## Core User Flows',
      '',
      '- Create an experiment',
      '- View and edit existing experiments',
      '',
      '## Monetization Strategy',
      '',
      'No monetization planned for the MVP.',
      '',
      '## Team Context',
      '',
      'Solo dev',
      '',
      '## Later Scope & Possibilities',
      '',
      'Voice notes transcribed into text for hands free documenting.',
      '',
      '## Research, Notes, and References',
      '',
      'There are a lot of science students wanting to conduct experiments.',
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
      '- Onboarding flow: multi-screen',
      '- Legal documents: onboarding-agreement',
      '- Onboarding completion: auth',
      '- Legal update gate: material-required',
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
    expect(extracted.prefilledAnswers.onboardingFlow).toBe('multi-screen');
    expect(extracted.prefilledAnswers.legalDocumentMode).toBe('onboarding-agreement');
    expect(extracted.prefilledAnswers.onboardingCompletionMode).toBe('auth');
    expect(extracted.prefilledAnswers.legalUpdateGate).toBe('material-required');
    expect(extracted.missingQuestionIds).not.toContain('audience');
    expect(extracted.ambiguousQuestionIds).toEqual([]);
  });

  it('extracts complete CESS answers from the golden info template shape', () => {
    const infoMarkdown = [
      '# Experiment-Tracker Project Info',
      '',
      '## App Name',
      'Experimental',
      '',
      '## Overview',
      'Build an Expo app for Scientists and people learning how to conduct experiments.',
      '',
      '## Target Users',
      'Scientists and people learning how to conduct experiments',
      '',
      '## Problem this app solves',
      "There's no good way to track experiment data on the go.",
      '',
      '## First User Flow',
      '- Create an experiment',
      '',
      '## Core Flows and Features',
      '- Track multiple experiments, each with its own hypothesis, procedure, data collection, and results.',
      '- View and edit existing experiments',
      '- Add pictures and notes to experiments',
      '',
      '## Screens',
      '- New (create new experiment)',
      '- Track (list of past experiments)',
      '- Settings',
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
      '- Expo Router app directory: `src/app`',
      '- Platform-specific organization: platform-specific files only',
      '- Platform layout mode: shared layouts',
      '- Web output: none',
      '',
      '- Style Library: NativeWindUI',
      '- Which NativeWindUI components: All',
      '- Components from create-expo-app: Yes',
      '- Expo UI: yes',
      '- Expo UI Universal components: yes',
      '- Expo Native Tabs: yes',
      '',
      '- Which Software Mansion packages: All',
      '- State management library: None',
      '- Auth: None',
      '- Onboarding Flow: multi-screen',
      '- Legal Documents: public-routes',
      '- Onboarding Completion: account-setup',
      '- Legal Update Gate: material-required',
      '- Data Categories: Local UI/app state, image uploads',
      '- Starting Data mode: local dummy data with Expo SQLite.',
      '',
      '- Internationalization: None',
      '- Analytics: None',
      '- EAS: Yes',
      '- EAS Usage: Building mobile apps',
      '- Deployed server: no deployed server planned',
      '- Initial Deployment plan: App Store',
      '',
      '- Start with MDS project guidelines template: Yes',
      '- Use test-to-main safeguards: Yes',
    ].join('\n');

    const extracted = extractCessInfoFromMarkdown({
      infoMarkdown,
      parentDir: 'F:/ReactNativeApps',
    });

    expect(extracted.derivedDisplayName).toBe('Experimental');
    expect(extracted.derivedFolderSlug).toBe('experimental');
    expect(extracted.prefilledAnswers.displayAppName).toBe('Experimental');
    expect(extracted.prefilledAnswers.audience).toContain('Scientists');
    expect(extracted.prefilledAnswers.coreFlows).toContain('Create an experiment');
    expect(extracted.prefilledAnswers.screens).toContain('Track (list of past experiments)');
    expect(extracted.prefilledAnswers.scriptLanguage).toBe('typescript');
    expect(extracted.prefilledAnswers.packageManager).toBe('npm');
    expect(extracted.prefilledAnswers.navigationLibrary).toBe('expo-router');
    expect(extracted.prefilledAnswers.reactNavigationLayout).toBe('drawer');
    expect(extracted.prefilledAnswers.appDirectory).toBe('src');
    expect(extracted.prefilledAnswers.platformStrategy).toBe('files-only');
    expect(extracted.prefilledAnswers.platformLayouts).toBe('shared');
    expect(extracted.prefilledAnswers.webOutput).toBe('none');
    expect(extracted.prefilledAnswers.stylingSystem).toBe('nativewindui');
    expect(extracted.prefilledAnswers.includeCreateExpoComponents).toBe(true);
    expect(extracted.prefilledAnswers.usesExpoUi).toBe(true);
    expect(extracted.prefilledAnswers.usesExpoUiUniversalComponents).toBe(true);
    expect(extracted.prefilledAnswers.usesExpoNativeTabs).toBe(true);
    expect(extracted.prefilledAnswers.stateManagement).toBe('none');
    expect(extracted.prefilledAnswers.authBackend).toBe('none');
    expect(extracted.prefilledAnswers.onboardingFlow).toBe('multi-screen');
    expect(extracted.prefilledAnswers.legalDocumentMode).toBe('public-routes');
    expect(extracted.prefilledAnswers.onboardingCompletionMode).toBe('account-setup');
    expect(extracted.prefilledAnswers.legalUpdateGate).toBe('material-required');
    expect(extracted.prefilledAnswers.dataNeedSelections).toEqual([
      'Local UI/app state',
      'File/image uploads or storage',
    ]);
    expect(extracted.prefilledAnswers.dataStart).toBe('local');
    expect(extracted.prefilledAnswers.easSetup).toBe(true);
    expect(extracted.prefilledAnswers.easUses).toEqual(['building mobile applications']);
    expect(extracted.prefilledAnswers.expoServerAdapter).toBe('none');
    expect(extracted.prefilledAnswers.customBackend).toBe(false);
    expect(extracted.prefilledAnswers.deploymentTarget).toBe('App Store');
    expect(extracted.prefilledAnswers.guidelinesTemplate).toBe(true);
    expect(extracted.prefilledAnswers.testToMainSafeguards).toBe(true);
    expect(extracted.prefilledAnswers.targetPlatforms).toEqual(['ios', 'android']);
    expect(extracted.prefilledAnswers.firstTargetPlatform).toBe('ios');
    expect(extracted.missingQuestionIds).not.toContain('scriptLanguage');
    expect(extracted.ambiguousQuestionIds).toEqual([]);
  });

  it('uses explicit appName input as the folder slug without overriding visible App Name', () => {
    const extracted = extractCessInfoFromMarkdown({
      appName: 'experimental2',
      parentDir: 'F:/ReactNativeApps',
      infoMarkdown: [
        '# Experiment-Tracker Project Info',
        '',
        '## App Name',
        'Experimental',
        '',
        '## Target Users',
        'Scientists',
      ].join('\n'),
    });

    expect(extracted.derivedDisplayName).toBe('Experimental');
    expect(extracted.derivedFolderSlug).toBe('experimental2');
    expect(extracted.prefilledAnswers.displayAppName).toBe('Experimental');
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

  it('uses visible project info over stale scaffold snapshot values', () => {
    const infoMarkdown = [
      '# Experiment-Tracker Project Info',
      '',
      '## Overview',
      '',
      'Build an Expo app for Scientists and people learning how to conduct experiments.',
      '',
      '## Target Users',
      '',
      'Scientists and people learning how to conduct experiments',
      '',
      '## Problem this app solves',
      '',
      "There's no good way to track experiment data on the go.",
      '',
      '## Product Goals',
      '',
      'Provide a way for scientists to track and manage experiments effectively.',
      '',
      '## Non-Goals',
      '',
      'Ways to actually conduct experiments, analyze data, or collaborate with other scientists.',
      '',
      '## Core User Flows',
      '',
      '- Create an experiment',
      '- View and edit existing experiments',
      '',
      '## Monetization Strategy',
      '',
      'No monetization planned for the MVP.',
      '',
      '## Team Context',
      '',
      'Solo dev',
      '',
      '## Later Scope & Possibilities',
      '',
      'Voice notes transcribed into text for hands free documenting.',
      '',
      '## Research, Notes, and References',
      '',
      'There are a lot of science students wanting to conduct experiments.',
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
      '## Tech Stack & MDS Onboarding',
      '',
      '<!-- MDS_CESS_SNAPSHOT_START -->',
      '```json',
      JSON.stringify(
        {
          version: 1,
          displayAppName: 'template',
          folderSlug: 'template',
          answers: {
            displayAppName: 'template',
            audience: 'Expo app users',
            coreFlows:
              'Let the agent derive the first real core user flows later from the fully clarified `project/info.md`.',
            targetPlatforms: ['web', 'ios', 'android', 'apple-tv', 'android-tv'],
            firstTargetPlatform: 'apple-tv',
            platformStrategy: 'files-only',
            appDirectory: 'src',
            platformLayouts: 'platform-specific',
            webOutput: 'server',
            expoServerAdapter: 'eas',
            customBackend: false,
            customBackendEntry: 'server.js',
            deploymentTarget: 'Expo web/native deployment',
            includeCreateExpoComponents: true,
            usesExpoUi: true,
            usesExpoUiUniversalComponents: true,
            usesExpoNativeTabs: true,
            easUses: [],
            guidelinesTemplate: true,
            dataStart: 'local',
            testToMainSafeguards: true,
          },
        },
        null,
        2,
      ),
      '```',
      '<!-- MDS_CESS_SNAPSHOT_END -->',
      '',
      '- **App:** template — Expo app users',
      '- **Platforms:** web, ios, android, apple-tv, android-tv, first MVP target: apple-tv',
      '- **Code organization:** platform-specific files only, `src/app` routes, platform-specific layouts, web: server',
      '- **Deployed server:** EAS hosting',
      '- **Distribution:** Expo web/native deployment',
      '- **EAS:** not planned yet',
      '',
      '## Onboarding Decisions',
      '',
      '- Create Expo starter components: no',
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
      appName: 'Experiment-Tracker',
      parentDir: 'F:/ReactNativeApps',
    });

    expect(extracted.derivedDisplayName).toBe('Experiment Tracker');
    expect(extracted.derivedFolderSlug).toBe('experiment-tracker');
    expect(extracted.prefilledAnswers.displayAppName).toBe('Experiment Tracker');
    expect(extracted.prefilledAnswers.overview).toContain('Build an Expo app');
    expect(extracted.prefilledAnswers.audience).toContain('Scientists');
    expect(extracted.prefilledAnswers.problemStatement).toContain('track experiment data');
    expect(extracted.prefilledAnswers.productGoals).toContain('track and manage');
    expect(extracted.prefilledAnswers.nonGoals).toContain('actually conduct experiments');
    expect(extracted.prefilledAnswers.coreFlows).toContain('Create an experiment');
    expect(extracted.prefilledAnswers.monetizationStrategy).toContain('No monetization planned');
    expect(extracted.prefilledAnswers.teamContext).toBe('Solo dev');
    expect(extracted.prefilledAnswers.laterScope).toContain('Voice notes');
    expect(extracted.prefilledAnswers.researchNotes).toContain('science students');
    expect(extracted.prefilledAnswers.targetPlatforms).toEqual(['ios']);
    expect(extracted.prefilledAnswers.firstTargetPlatform).toBe('ios');
    expect(extracted.prefilledAnswers.platformLayouts).toBe('shared');
    expect(extracted.prefilledAnswers.webOutput).toBe('none');
    expect(extracted.prefilledAnswers.expoServerAdapter).toBe('none');
    expect(extracted.prefilledAnswers.customBackend).toBe(false);
    expect(extracted.prefilledAnswers.deploymentTarget).toBe('App Store');
    expect(extracted.prefilledAnswers.includeCreateExpoComponents).toBe(false);
    expect(extracted.ambiguousQuestionIds).toEqual([]);
    expect(extracted.evidence.platformLayouts?.some((item) =>
      item.startsWith('MDS snapshot ignored because ') &&
      item.endsWith(' had a higher-priority value')
    )).toBe(true);
  });

  it('marks real visible section conflicts as ambiguous', () => {
    const extracted = extractCessInfoFromMarkdown({
      parentDir: 'F:/ReactNativeApps',
      infoMarkdown: [
        '# Demo App Project Info',
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
        '',
        '## Onboarding Decisions',
        '',
        '- Target platforms: android',
      ].join('\n'),
    });

    expect(extracted.prefilledAnswers.targetPlatforms).toBeUndefined();
    expect(extracted.ambiguousQuestionIds).toContain('targetPlatforms');
  });

  it('reaches confirm and ready states without inventing missing answers', () => {
    const answers = {
      scriptLanguage: 'typescript',
      packageManager: 'pnpm',
      navigationLibrary: 'expo-router',
      stylingSystem: 'uniwind',
      stateManagement: 'zustand',
      authBackend: 'supabase',
      onboardingFlow: 'multi-screen',
      legalDocumentMode: 'onboarding-agreement',
      onboardingCompletionMode: 'auth',
      legalUpdateGate: 'material-required',
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
    expect(confirmStep.summaryLines).toContain(
      'onboarding: multi-screen, legal documents: onboarding-agreement, completion: auth, legal update gate: material-required'
    );

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
        stylingSystem: 'nativewindui',
        stateManagement: 'zustand',
        authBackend: 'firebase',
        onboardingFlow: 'multi-screen',
        legalDocumentMode: 'public-routes',
        onboardingCompletionMode: 'account-setup',
        legalUpdateGate: 'material-required',
        easSetup: false,
        displayAppName: 'Demo App',
        overview: 'Demo overview\nwith a second line',
        audience: 'People',
        problemStatement: 'People need a better hat workflow.',
        productGoals: 'Make hat design calmer.',
        nonGoals: 'Do not build manufacturing.',
        coreFlows: 'Sign in and design hats\nPreview the finished design',
        screens: 'Home\nProfile',
        monetizationStrategy: 'Internal tool first.',
        teamContext: 'Solo designer.',
        laterScope: 'Marketplace later.',
        researchNotes: 'Customer notes live in Drive.',
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
      '--nativewindui',
      '--zustand',
    ]);

    const argv = buildCreateExpoSuperStackArgv(plan);
    expect(plan.onboardAnswers.defaults).toContain('nativewindui');
    expect(plan.onboardAnswers.defaults).not.toContain('uniwind');
    expect(plan.onboardAnswers.onboardingFlow).toBe('multi-screen');
    expect(plan.onboardAnswers.legalDocumentMode).toBe('public-routes');
    expect(plan.onboardAnswers.onboardingCompletionMode).toBe('account-setup');
    expect(plan.onboardAnswers.legalUpdateGate).toBe('material-required');
    expect(plan.onboardAnswers.authProvider).toBe('firebase');
    expect(argv).toContain('--mds-no-guidelines-template');
    expect(argv).toContain('--mds-no-expo-ui');
    expect(argv).toContain('--mds-no-test-to-main');
    expect(argv).toContain('--mds-save-defaults');
    expect(argv).toContain('--mds-yes');
    expect(argv).toContain('--mds-overview=Demo overview; with a second line');
    expect(argv).toContain('--mds-problem-statement=People need a better hat workflow.');
    expect(argv).toContain('--mds-product-goals=Make hat design calmer.');
    expect(argv).toContain('--mds-non-goals=Do not build manufacturing.');
    expect(argv).toContain('--mds-core-flows=Sign in and design hats; Preview the finished design');
    expect(argv).toContain('--mds-screens=Home; Profile');
    expect(argv).toContain('--mds-monetization-strategy=Internal tool first.');
    expect(argv).toContain('--mds-team-context=Solo designer.');
    expect(argv).toContain('--mds-later-scope=Marketplace later.');
    expect(argv).toContain('--mds-research-notes=Customer notes live in Drive.');
    expect(argv).toContain('--mds-deployment-target=Internal preview');
    expect(argv).toContain('--mds-onboarding-flow=multi-screen');
    expect(argv).toContain('--mds-auth-provider=firebase');
    expect(argv).toContain('--mds-legal-documents=public-routes');
    expect(argv).toContain('--mds-onboarding-completion=account-setup');
    expect(argv).toContain('--mds-legal-update-gate=material-required');
    expect(argv).not.toContain('--firebase');
    expect(argv.every((arg) => !arg.includes('\n') && !arg.includes('\r'))).toBe(true);
  });

  it('routes Convex auth through the MDS auth provider instead of upstream flags', () => {
    const plan = resolveCessPlan({
      parentDir: 'F:/ReactNativeApps',
      appName: 'convex-auth-app',
      answers: {
        scriptLanguage: 'typescript',
        packageManager: 'pnpm',
        navigationLibrary: 'expo-router',
        stylingSystem: 'uniwind',
        stateManagement: 'zustand',
        authBackend: 'convex',
        audience: 'People',
        coreFlows: 'Sign in and use the app',
        targetPlatforms: ['ios'],
        dataStart: 'local',
      },
    });

    expect(buildCreateExpoStackFlags(plan.answers)).toEqual([
      '--typescript',
      '--pnpm',
      '--expo-router',
      '--uniwind',
      '--zustand',
    ]);
    expect(plan.onboardAnswers.authProvider).toBe('convex');
    expect(plan.onboardAnswers.generatorAuthBackend).toBe('none');
    expect(plan.onboardAnswers.defaults).toContain('convex');
    expect(buildCreateExpoSuperStackArgv(plan)).toContain('--mds-auth-provider=convex');
  });

  it('records planned EAS intent without forwarding the interactive --eas generator flag', () => {
    const flags = buildCreateExpoStackFlags({
      scriptLanguage: 'typescript',
      packageManager: 'npm',
      navigationLibrary: 'expo-router',
      reactNavigationLayout: 'stack',
      stylingSystem: 'uniwind',
      stateManagement: 'zustand',
      authBackend: 'none',
      easSetup: true,
    });

    expect(flags).not.toContain('--eas');
  });
});
