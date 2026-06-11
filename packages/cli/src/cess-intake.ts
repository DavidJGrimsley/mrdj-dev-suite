import path from 'node:path';

import {
  AGENT_DERIVED_CORE_FLOWS,
  CUSTOM_BACKEND_EXPLANATION,
  DATA_NEED_OPTIONS,
  DATA_START_EXPLANATION,
  EAS_EXPLANATION,
  EAS_USE_OPTIONS,
  EXPO_SERVER_ADAPTER_EXPLANATION,
  OTHER_DATA_NEEDS,
  PLATFORM_OPTIONS,
  TEST_TO_MAIN_EXPLANATION,
  defaultOnboardPlan,
  deriveDeployedServer,
  formatDataNeedsSelection,
} from './commands/onboard.js';

import type { OnboardArgv } from './commands/onboard.js';
import type { ExpoServerAdapter, OnboardAnswers } from './project-memory.js';

export type CessScriptLanguage = 'typescript' | 'javascript';
export type CessPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type CessNavigationLibrary = 'expo-router' | 'react-navigation';
export type CessReactNavigationLayout = 'stack' | 'tabs' | 'drawer';
export type CessStylingSystem =
  | 'uniwind'
  | 'nativewind'
  | 'nativewindui'
  | 'tamagui'
  | 'restyle'
  | 'stylesheet';
export type CessStateManagement = 'zustand' | 'none';
export type CessAuthBackend = 'none' | 'supabase' | 'firebase';
export type CessIntakeStatus = 'question' | 'confirm' | 'ready' | 'blocked';

export interface CessIntakeAnswers {
  confirmed?: boolean;
  scriptLanguage?: CessScriptLanguage;
  packageManager?: CessPackageManager;
  navigationLibrary?: CessNavigationLibrary;
  reactNavigationLayout?: CessReactNavigationLayout;
  stylingSystem?: CessStylingSystem;
  stateManagement?: CessStateManagement;
  authBackend?: CessAuthBackend;
  easSetup?: boolean;
  displayAppName?: string;
  audience?: string;
  coreFlows?: string;
  screens?: string;
  dataNeedSelections?: string[];
  dataNeedsOther?: string;
  targetPlatforms?: string[];
  firstTargetPlatform?: string;
  platformStrategy?: OnboardAnswers['platformFileStrategy'];
  appDirectory?: OnboardAnswers['appDirectory'];
  platformLayouts?: OnboardAnswers['platformLayoutMode'];
  webOutput?: OnboardAnswers['webOutput'];
  expoServerAdapter?: ExpoServerAdapter;
  customBackend?: boolean;
  customBackendEntry?: string;
  deploymentTarget?: string;
  includeCreateExpoComponents?: boolean;
  usesExpoUi?: boolean;
  usesExpoUiUniversalComponents?: boolean;
  usesExpoNativeTabs?: boolean;
  easUses?: string[];
  guidelinesTemplate?: boolean;
  dataStart?: OnboardAnswers['dataStart'];
  testToMainSafeguards?: boolean;
  saveDefaults?: boolean;
}

export interface CessIntakeOption {
  value: string | boolean;
  label: string;
  hint?: string;
}

export interface CessIntakeQuestion {
  id: string;
  prompt: string;
  kind: 'text' | 'single-select' | 'multi-select';
  options?: CessIntakeOption[];
  defaultValue?: string | boolean | string[];
  explanation?: string;
}

export interface CessIntakeStepResult {
  status: CessIntakeStatus;
  nextQuestion?: CessIntakeQuestion;
  options?: CessIntakeOption[];
  defaultValue?: string | boolean | string[];
  updatedAnswers: Partial<CessIntakeAnswers>;
  missingRequirements: string[];
  summaryLines?: string[];
  projectPath?: string;
  parentDir?: string;
  appName?: string;
}

export interface CessResolvedPlan {
  projectPath: string;
  parentDir: string;
  appName: string;
  answers: CessIntakeAnswers;
  onboardArgv: OnboardArgv;
  onboardAnswers: OnboardAnswers;
  createExpoStackFlags: string[];
  mdsFlags: string[];
  summaryLines: string[];
}

export interface CessExtractInfoResult {
  prefilledAnswers: Partial<CessIntakeAnswers>;
  derivedDisplayName?: string;
  derivedFolderSlug?: string;
  missingQuestionIds: string[];
  ambiguousQuestionIds: string[];
  evidence: Record<string, string[]>;
  preservedNotes: string[];
}

interface CessQuestionContext {
  parentDir: string;
  appName: string;
  appDisplayName: string;
  currentAnswers: Partial<CessIntakeAnswers>;
  resolvedAnswers: CessIntakeAnswers;
  onboardAnswers: OnboardAnswers;
}

interface CessQuestionDefinition {
  id: keyof CessIntakeAnswers | 'parentDir' | 'appName';
  prompt: string;
  kind: 'text' | 'single-select' | 'multi-select';
  options?: (context: CessQuestionContext) => CessIntakeOption[];
  defaultValue?: (context: CessQuestionContext) => string | boolean | string[];
  explanation?: string;
  shouldAsk?: (context: CessQuestionContext) => boolean;
}

const DEFAULT_PROJECT_NAME = 'my-expo-app';
const DEFAULT_DISPLAY_APP_NAME = 'My Expo App';
const STACK_DEFAULTS = {
  scriptLanguage: 'typescript' as const,
  packageManager: 'npm' as const,
  navigationLibrary: 'expo-router' as const,
  reactNavigationLayout: 'stack' as const,
  stylingSystem: 'uniwind' as const,
  stateManagement: 'zustand' as const,
  authBackend: 'none' as const,
  easSetup: false,
};

const CESS_QUESTIONS: CessQuestionDefinition[] = [
  {
    id: 'parentDir',
    prompt: 'Which parent folder should contain the new app folder?',
    kind: 'text',
    defaultValue: (context) => context.parentDir,
  },
  {
    id: 'appName',
    prompt: 'What is the name of your app?',
    kind: 'text',
    defaultValue: (context) => context.appDisplayName,
  },
  {
    id: 'scriptLanguage',
    prompt: 'TypeScript or JavaScript?',
    kind: 'single-select',
    options: () => [
      { value: 'typescript', label: 'TypeScript', hint: 'Default and strongly recommended' },
      { value: 'javascript', label: 'JavaScript' },
    ],
    defaultValue: () => STACK_DEFAULTS.scriptLanguage,
  },
  {
    id: 'packageManager',
    prompt: 'Which package manager should the app use?',
    kind: 'single-select',
    options: () => [
      { value: 'npm', label: 'npm' },
      { value: 'pnpm', label: 'pnpm' },
      { value: 'yarn', label: 'yarn' },
      { value: 'bun', label: 'bun' },
    ],
    defaultValue: () => STACK_DEFAULTS.packageManager,
  },
  {
    id: 'navigationLibrary',
    prompt: 'Which navigation library should the app use?',
    kind: 'single-select',
    options: () => [
      { value: 'expo-router', label: 'Expo Router', hint: 'Default and recommended' },
      { value: 'react-navigation', label: 'React Navigation' },
    ],
    defaultValue: () => STACK_DEFAULTS.navigationLibrary,
  },
  {
    id: 'reactNavigationLayout',
    prompt: 'Which React Navigation layout should the starter use?',
    kind: 'single-select',
    options: () => [
      { value: 'stack', label: 'Stack' },
      { value: 'tabs', label: 'Tabs' },
      { value: 'drawer', label: 'Drawer + Tabs' },
    ],
    defaultValue: () => STACK_DEFAULTS.reactNavigationLayout,
    shouldAsk: (context) => context.resolvedAnswers.navigationLibrary === 'react-navigation',
  },
  {
    id: 'stylingSystem',
    prompt: 'Which styling system should the starter use?',
    kind: 'single-select',
    options: () => [
      { value: 'uniwind', label: 'Uniwind', hint: 'Default and MDS preference' },
      { value: 'nativewind', label: 'NativeWind' },
      { value: 'nativewindui', label: 'NativeWindUI' },
      { value: 'tamagui', label: 'Tamagui' },
      { value: 'restyle', label: 'Restyle' },
      { value: 'stylesheet', label: 'StyleSheet only' },
    ],
    defaultValue: () => STACK_DEFAULTS.stylingSystem,
  },
  {
    id: 'stateManagement',
    prompt: 'What shared state approach should the starter use?',
    kind: 'single-select',
    options: () => [
      { value: 'zustand', label: 'Zustand', hint: 'Default' },
      { value: 'none', label: 'None / decide later' },
    ],
    defaultValue: () => STACK_DEFAULTS.stateManagement,
  },
  {
    id: 'authBackend',
    prompt: 'Which auth/backend starter should the app use?',
    kind: 'single-select',
    options: () => [
      { value: 'none', label: 'None', hint: 'Default' },
      { value: 'supabase', label: 'Supabase' },
      { value: 'firebase', label: 'Firebase' },
    ],
    defaultValue: () => STACK_DEFAULTS.authBackend,
  },
  {
    id: 'easSetup',
    prompt:
      'Will this project use EAS later? MDS will remember it and add a Phase 0 setup step, but it will not sign in during generation.',
    kind: 'single-select',
    options: () => [
      { value: false, label: 'No', hint: 'Default' },
      { value: true, label: 'Yes' },
    ],
    defaultValue: () => STACK_DEFAULTS.easSetup,
  },
  {
    id: 'audience',
    prompt: 'Who is this app for?',
    kind: 'text',
    defaultValue: (context) => context.onboardAnswers.audience,
  },
  {
    id: 'coreFlows',
    prompt: 'What should users be able to do first?',
    kind: 'text',
    defaultValue: (context) => context.onboardAnswers.coreFlows || AGENT_DERIVED_CORE_FLOWS,
  },
  {
    id: 'screens',
    prompt: 'What screens do you already know the app needs? Reply with "defer" to leave this for later.',
    kind: 'text',
    defaultValue: () => 'defer',
  },
  {
    id: 'dataNeedSelections',
    prompt: 'Which data categories does the app need?',
    kind: 'multi-select',
    options: () => [
      ...DATA_NEED_OPTIONS.map((item) => ({ value: item, label: item })),
      { value: OTHER_DATA_NEEDS, label: 'Other / custom notes' },
    ],
    defaultValue: () => ['Local UI/app state'],
  },
  {
    id: 'dataNeedsOther',
    prompt: 'What other data needs should MDS remember?',
    kind: 'text',
    shouldAsk: (context) =>
      Array.isArray(context.currentAnswers.dataNeedSelections) &&
      context.currentAnswers.dataNeedSelections.includes(OTHER_DATA_NEEDS),
  },
  {
    id: 'targetPlatforms',
    prompt: 'Which platforms will this app target?',
    kind: 'multi-select',
    options: () => PLATFORM_OPTIONS.map((item) => ({ value: item, label: formatPlatformLabel(item) })),
    defaultValue: () => ['web', 'ios', 'android'],
  },
  {
    id: 'firstTargetPlatform',
    prompt: 'Which selected platform should be the first MVP target?',
    kind: 'single-select',
    options: (context) =>
      (context.resolvedAnswers.targetPlatforms ?? []).map((item) => ({
        value: item,
        label: formatPlatformLabel(item),
      })),
    defaultValue: (context) => context.onboardAnswers.firstTargetPlatform,
    shouldAsk: (context) => (context.resolvedAnswers.targetPlatforms?.length ?? 0) > 1,
  },
  {
    id: 'platformStrategy',
    prompt: 'When platforms diverge, how should platform-specific code be organized?',
    kind: 'single-select',
    options: () => [
      { value: 'files-only', label: 'File suffixes only', hint: 'Default' },
      { value: 'folders', label: 'Platform folders' },
    ],
    defaultValue: (context) => context.onboardAnswers.platformFileStrategy,
    shouldAsk: (context) => (context.resolvedAnswers.targetPlatforms?.length ?? 0) > 1,
  },
  {
    id: 'appDirectory',
    prompt: 'Where should Expo Router route files live?',
    kind: 'single-select',
    options: () => [
      { value: 'src', label: 'src/app', hint: 'Default for new Super Stack apps' },
      { value: 'root', label: 'app' },
    ],
    defaultValue: (context) => context.onboardAnswers.appDirectory,
  },
  {
    id: 'platformLayouts',
    prompt: 'Do selected platforms need their own layouts?',
    kind: 'single-select',
    options: () => [
      { value: 'shared', label: 'Shared layouts', hint: 'Default' },
      { value: 'platform-specific', label: 'Platform-specific layouts' },
    ],
    defaultValue: (context) => context.onboardAnswers.platformLayoutMode,
    shouldAsk: (context) => (context.resolvedAnswers.targetPlatforms?.length ?? 0) > 1,
  },
  {
    id: 'webOutput',
    prompt: 'Which Expo web output mode fits the app?',
    kind: 'single-select',
    options: () => [
      { value: 'static', label: 'Static', hint: 'Default' },
      { value: 'server', label: 'Server' },
      { value: 'spa', label: 'SPA' },
    ],
    defaultValue: (context) =>
      context.onboardAnswers.webOutput === 'none' ? 'static' : context.onboardAnswers.webOutput,
    shouldAsk: (context) => (context.resolvedAnswers.targetPlatforms ?? []).includes('web'),
  },
  {
    id: 'expoServerAdapter',
    prompt: 'How will the Expo Router server be hosted in production?',
    kind: 'single-select',
    options: () => [
      { value: 'eas', label: 'EAS hosting', hint: 'Default for server output' },
      { value: 'express', label: 'Express adapter' },
      { value: 'bun', label: 'Bun adapter' },
      { value: 'other', label: 'Other / not sure yet' },
    ],
    defaultValue: (context) =>
      context.onboardAnswers.expoServerAdapter === 'none'
        ? 'eas'
        : context.onboardAnswers.expoServerAdapter,
    explanation: EXPO_SERVER_ADAPTER_EXPLANATION,
    shouldAsk: (context) => context.resolvedAnswers.webOutput === 'server',
  },
  {
    id: 'customBackend',
    prompt: 'Does this project need a separate backend API server running alongside Expo?',
    kind: 'single-select',
    options: () => [
      { value: false, label: 'No', hint: 'Default' },
      { value: true, label: 'Yes' },
    ],
    defaultValue: (context) => context.onboardAnswers.customBackend,
    explanation: CUSTOM_BACKEND_EXPLANATION,
    shouldAsk: (context) =>
      context.resolvedAnswers.webOutput !== 'none' ||
      (context.resolvedAnswers.targetPlatforms ?? []).some((item) => item !== 'web'),
  },
  {
    id: 'customBackendEntry',
    prompt: 'What is the backend server entry point?',
    kind: 'text',
    defaultValue: (context) => context.onboardAnswers.customBackendEntry,
    shouldAsk: (context) => context.resolvedAnswers.customBackend === true,
  },
  {
    id: 'deploymentTarget',
    prompt: 'How will the first version reach its users?',
    kind: 'text',
    defaultValue: (context) => context.onboardAnswers.deploymentTarget,
  },
  {
    id: 'includeCreateExpoComponents',
    prompt: 'Keep or generate the starter components that come with create-expo-app?',
    kind: 'single-select',
    options: () => [
      { value: false, label: 'No', hint: 'Default' },
      { value: true, label: 'Yes' },
    ],
    defaultValue: (context) => context.onboardAnswers.includeCreateExpoComponents,
  },
  {
    id: 'usesExpoUi',
    prompt: 'Use Expo UI for native-feeling screens?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default' },
      { value: false, label: 'No' },
    ],
    defaultValue: (context) => context.onboardAnswers.usesExpoUi,
    shouldAsk: (context) => hasMobileTarget(context.resolvedAnswers.targetPlatforms),
  },
  {
    id: 'usesExpoUiUniversalComponents',
    prompt: 'Use Expo UI Universal components?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default' },
      { value: false, label: 'No' },
    ],
    defaultValue: (context) => context.onboardAnswers.usesExpoUiUniversalComponents,
    shouldAsk: (context) =>
      hasMobileTarget(context.resolvedAnswers.targetPlatforms) &&
      context.resolvedAnswers.usesExpoUi === true,
  },
  {
    id: 'usesExpoNativeTabs',
    prompt: 'Use Expo Native Tabs?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default' },
      { value: false, label: 'No' },
    ],
    defaultValue: (context) => context.onboardAnswers.usesExpoNativeTabs,
    shouldAsk: (context) => hasMobileTarget(context.resolvedAnswers.targetPlatforms),
  },
  {
    id: 'easUses',
    prompt: 'Which EAS uses should the roadmap remember?',
    kind: 'multi-select',
    options: () => EAS_USE_OPTIONS.map((item) => ({ value: item, label: item })),
    defaultValue: (context) => context.onboardAnswers.easUses,
    explanation: EAS_EXPLANATION,
    shouldAsk: (context) => context.resolvedAnswers.easSetup === true,
  },
  {
    id: 'guidelinesTemplate',
    prompt: 'Use the bundled MDS project/guidelines.md template?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default and recommended' },
      { value: false, label: 'No' },
    ],
    defaultValue: () => true,
  },
  {
    id: 'dataStart',
    prompt: 'Would you like to start with local dummy data or go straight to Supabase?',
    kind: 'single-select',
    options: () => [
      { value: 'local', label: 'Local dummy data', hint: 'Default' },
      { value: 'supabase', label: 'Supabase' },
    ],
    defaultValue: (context) => context.onboardAnswers.dataStart,
    explanation: DATA_START_EXPLANATION,
  },
  {
    id: 'testToMainSafeguards',
    prompt: 'Use test-to-main safeguards for this project?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default' },
      { value: false, label: 'No' },
    ],
    defaultValue: (context) => context.onboardAnswers.testToMainSafeguards,
    explanation: TEST_TO_MAIN_EXPLANATION,
  },
  {
    id: 'saveDefaults',
    prompt: 'Save this configuration as your personal default for future app generation?',
    kind: 'single-select',
    options: () => [
      { value: false, label: 'No', hint: 'Default' },
      { value: true, label: 'Yes' },
    ],
    defaultValue: () => false,
  },
];

const CESS_SNAPSHOT_START = '<!-- MDS_CESS_SNAPSHOT_START -->';
const CESS_SNAPSHOT_END = '<!-- MDS_CESS_SNAPSHOT_END -->';
const SNAPSHOT_PRIORITY = 10;
const TECH_STACK_PRIORITY = 20;
const VISIBLE_SECTION_PRIORITY = 30;
const DERIVED_TITLE_PRIORITY = 40;
const EXPLICIT_INPUT_PRIORITY = 50;

export function extractCessInfoFromMarkdown(input: {
  infoMarkdown: string;
  styleMarkdown?: string;
  parentDir?: string;
  appName?: string;
  cwd?: string;
}): CessExtractInfoResult {
  const infoMarkdown = normalizeLineEndings(input.infoMarkdown);
  const sections = parseMarkdownSections(infoMarkdown);
  const evidence: Record<string, string[]> = {};
  const prefilledAnswers: Partial<CessIntakeAnswers> = {};
  const ambiguousQuestionIds = new Set<string>();
  const assignedAnswerSources = new Map<keyof CessIntakeAnswers, { priority: number; note: string }>();
  const usedSections = new Set<string>();
  const explicitAppName = normalizeText(input.appName);
  let derivedDisplayName = explicitAppName;
  let derivedDisplayNamePriority = explicitAppName ? EXPLICIT_INPUT_PRIORITY : undefined;
  let derivedDisplayNameNote = explicitAppName ? 'Explicit app name input' : undefined;
  let derivedFolderSlug = explicitAppName ? slugifyAppName(explicitAppName) : undefined;

  const recordEvidence = (key: string, note: string): void => {
    evidence[key] = [...(evidence[key] ?? []), note];
  };

  const assignValue = (
    id: keyof CessIntakeAnswers,
    value: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority = VISIBLE_SECTION_PRIORITY
  ): void => {
    const normalized = normalizeExtractedAnswerValue(id, value);
    if (normalized === undefined) {
      return;
    }
    if (isGenericExtractedAnswerValue(id, normalized)) {
      recordEvidence(id, `${note} ignored because it looked like scaffold/default placeholder data`);
      return;
    }
    if (ambiguousQuestionIds.has(id)) {
      const ambiguousSource = assignedAnswerSources.get(id);
      if (priority > (ambiguousSource?.priority ?? -1)) {
        ambiguousQuestionIds.delete(id);
        prefilledAnswers[id] = normalized as never;
        assignedAnswerSources.set(id, { priority, note });
        recordEvidence(id, `${note} selected over earlier lower-priority ambiguous values`);
        return;
      }
      recordEvidence(id, `${note} ignored because ${ambiguousSource?.note ?? 'another visible source'} already made this field ambiguous`);
      return;
    }

    const current = prefilledAnswers[id];
    const currentSource = assignedAnswerSources.get(id);
    if (current !== undefined && !areAnswerValuesEquivalent(id, current, normalized)) {
      if (priority > (currentSource?.priority ?? -1)) {
        prefilledAnswers[id] = normalized as never;
        assignedAnswerSources.set(id, { priority, note });
        recordEvidence(id, `${note} selected over lower-priority value from ${currentSource?.note ?? 'earlier extraction'}`);
        return;
      }
      if (priority < (currentSource?.priority ?? -1)) {
        recordEvidence(id, `${note} ignored because ${currentSource?.note ?? 'an earlier source'} had a higher-priority value`);
        return;
      }
      delete prefilledAnswers[id];
      ambiguousQuestionIds.add(id);
      assignedAnswerSources.set(id, {
        priority,
        note: `${currentSource?.note ?? 'earlier extraction'} and ${note}`,
      });
      recordEvidence(id, `${note} (conflicts with earlier extracted value)`);
      return;
    }

    prefilledAnswers[id] = normalized as never;
    assignedAnswerSources.set(id, { priority, note });
    recordEvidence(id, note);
  };

  const snapshot = parseCessSnapshot(infoMarkdown);
  if (snapshot) {
    recordEvidence('snapshot', 'Parsed machine-readable MDS snapshot block.');
  }

  const appNameSection = getMarkdownSection(sections, 'App Name');
  if (!derivedDisplayName && appNameSection) {
    const appNameFromSection = normalizeSectionText(appNameSection);
    if (appNameFromSection && !isGenericTextValue(appNameFromSection)) {
      derivedDisplayName = appNameFromSection;
      derivedDisplayNamePriority = VISIBLE_SECTION_PRIORITY;
      derivedDisplayNameNote = 'App Name section';
      derivedFolderSlug = slugifyAppName(appNameFromSection);
      recordEvidence('appName', `Derived app name from App Name section: ${appNameFromSection}`);
    }
    usedSections.add('App Name');
  }

  const title = extractProjectTitle(infoMarkdown);
  if (!derivedDisplayName && title) {
    derivedDisplayName = title;
    derivedDisplayNamePriority = DERIVED_TITLE_PRIORITY;
    derivedDisplayNameNote = `Derived app name from title: ${title}`;
    recordEvidence('appName', `Derived app name from title: ${title}`);
  }
  if (!derivedFolderSlug && derivedDisplayName) {
    derivedFolderSlug = slugifyAppName(derivedDisplayName);
  }

  const targetUsers = getMarkdownSection(sections, 'Target Users');
  if (targetUsers) {
    usedSections.add('Target Users');
    assignValue('audience', normalizeSectionText(targetUsers), 'Target Users section', VISIBLE_SECTION_PRIORITY);
  } else {
    const overview = getMarkdownSection(sections, 'Overview');
    const overviewAudience = extractAudienceFromOverview(overview);
    if (overviewAudience) {
      usedSections.add('Overview');
      assignValue('audience', overviewAudience, 'Overview section', VISIBLE_SECTION_PRIORITY);
    }
  }

  const firstUserFlow = getMarkdownSection(sections, 'First User Flow');
  const coreFlowsAndFeatures = getMarkdownSection(sections, 'Core Flows and Features');
  const coreUserFlows = getMarkdownSection(sections, 'Core User Flows');
  if (firstUserFlow || coreFlowsAndFeatures) {
    const combinedFlows = [normalizeListSection(firstUserFlow), normalizeListSection(coreFlowsAndFeatures)]
      .filter(Boolean)
      .join('\n');
    if (combinedFlows) {
      assignValue('coreFlows', combinedFlows, 'First User Flow and Core Flows and Features sections', VISIBLE_SECTION_PRIORITY);
    }
    if (firstUserFlow) {
      usedSections.add('First User Flow');
    }
    if (coreFlowsAndFeatures) {
      usedSections.add('Core Flows and Features');
    }
  } else if (coreUserFlows) {
    usedSections.add('Core User Flows');
    assignValue('coreFlows', normalizeListSection(coreUserFlows), 'Core User Flows section', VISIBLE_SECTION_PRIORITY);
  }

  const mustIncludeScreens = getMarkdownSection(sections, 'Screens', 'Must-Include Screens Or Flows');
  if (mustIncludeScreens) {
    usedSections.add(sections.has('Screens') ? 'Screens' : 'Must-Include Screens Or Flows');
    assignValue('screens', normalizeListSection(mustIncludeScreens), 'Screens section', VISIBLE_SECTION_PRIORITY);
  }

  const dataAndBackend = getMarkdownSection(sections, 'Data And Backend');
  if (dataAndBackend) {
    usedSections.add('Data And Backend');
    const inferredDataNeeds = inferDataNeedSelections(dataAndBackend);
    if (inferredDataNeeds.length > 0) {
      assignValue('dataNeedSelections', inferredDataNeeds, 'Data And Backend section', VISIBLE_SECTION_PRIORITY);
    }
    const dataStart = inferDataStart(dataAndBackend);
    if (dataStart) {
      assignValue('dataStart', dataStart, 'Data And Backend section', VISIBLE_SECTION_PRIORITY);
    }
    const authBackend = inferAuthBackend(dataAndBackend);
    if (authBackend) {
      assignValue('authBackend', authBackend, 'Data And Backend section', VISIBLE_SECTION_PRIORITY);
    }
  }

  const platforms = getMarkdownSection(sections, 'Platforms');
  if (platforms) {
    usedSections.add('Platforms');
    extractPlatformDecisions(platforms, assignValue, VISIBLE_SECTION_PRIORITY);
  }

  const packageChoices = getMarkdownSection(sections, 'Package Choices');
  if (packageChoices) {
    usedSections.add('Package Choices');
    extractPackageChoices(packageChoices, assignValue, VISIBLE_SECTION_PRIORITY);
  }

  const releaseStrategy = getMarkdownSection(sections, 'Release Strategy');
  if (releaseStrategy) {
    usedSections.add('Release Strategy');
    const deploymentTarget = extractBulletValue(releaseStrategy, 'Deployment plan');
    if (deploymentTarget) {
      assignValue('deploymentTarget', deploymentTarget, 'Release Strategy section', VISIBLE_SECTION_PRIORITY);
    }
    const easUses = inferEasUses(extractBulletValue(releaseStrategy, 'EAS usage') ?? releaseStrategy);
    if (easUses.length > 0) {
      assignValue('easUses', easUses, 'Release Strategy section', VISIBLE_SECTION_PRIORITY);
      assignValue('easSetup', true, 'Release Strategy section', VISIBLE_SECTION_PRIORITY);
    }
    const testToMain = parseBooleanValue(extractBulletValue(releaseStrategy, 'Test-to-main safeguards'));
    if (typeof testToMain === 'boolean') {
      assignValue('testToMainSafeguards', testToMain, 'Release Strategy section', VISIBLE_SECTION_PRIORITY);
    }
  }

  const techStackSection = getMarkdownSection(sections, 'Tech Stack & CESS Onboarding', 'Tech Stack & MDS Onboarding');
  if (techStackSection) {
    usedSections.add(sections.has('Tech Stack & CESS Onboarding') ? 'Tech Stack & CESS Onboarding' : 'Tech Stack & MDS Onboarding');
    extractTechStackDecisions(techStackSection, assignValue, TECH_STACK_PRIORITY);
  }

  const onboardingDecisionsSection = sections.get('Onboarding Decisions');
  if (onboardingDecisionsSection) {
    usedSections.add('Onboarding Decisions');
    extractOnboardingDecisionLines(onboardingDecisionsSection, assignValue, VISIBLE_SECTION_PRIORITY);
  }

  if (!derivedDisplayName && snapshot?.displayAppName && !isGenericTextValue(snapshot.displayAppName)) {
    derivedDisplayName = snapshot.displayAppName;
    derivedDisplayNamePriority = SNAPSHOT_PRIORITY;
    derivedDisplayNameNote = 'MDS snapshot metadata';
  } else if (!derivedDisplayName && snapshot?.displayAppName) {
    recordEvidence('displayAppName', 'MDS snapshot metadata ignored because it looked like scaffold/default placeholder data');
  }
  if (!derivedFolderSlug && snapshot?.folderSlug && !isGenericTextValue(snapshot.folderSlug)) {
    derivedFolderSlug = snapshot.folderSlug;
  } else if (!derivedFolderSlug && snapshot?.displayAppName && !isGenericTextValue(snapshot.displayAppName)) {
    derivedFolderSlug = slugifyAppName(snapshot.displayAppName);
  }

  if (derivedDisplayName) {
    assignValue(
      'displayAppName',
      derivedDisplayName,
      derivedDisplayNameNote ?? 'Derived app name',
      derivedDisplayNamePriority ?? DERIVED_TITLE_PRIORITY
    );
  }

  if (snapshot) {
    const snapshotAnswers = normalizeCessIntakeAnswers(snapshot.answers);
    for (const [key, value] of Object.entries(snapshotAnswers)) {
      assignValue(key as keyof CessIntakeAnswers, value as never, 'MDS snapshot', SNAPSHOT_PRIORITY);
    }
  }

  const preservedNotes = [...sections.entries()]
    .filter(([heading, body]) => !usedSections.has(heading) && normalizeSectionText(body))
    .map(([heading, body]) => `## ${heading}\n\n${normalizeSectionText(body)}`);

  const missingQuestionIds = validateCessGenerationReadiness({
    parentDir: input.parentDir,
    appName: derivedFolderSlug,
    answers: prefilledAnswers,
    cwd: input.cwd,
  });

  return {
    prefilledAnswers,
    derivedDisplayName,
    derivedFolderSlug,
    missingQuestionIds,
    ambiguousQuestionIds: Array.from(ambiguousQuestionIds),
    evidence,
    preservedNotes,
  };
}

function parseCessSnapshot(infoMarkdown: string):
  | { displayAppName?: string; folderSlug?: string; answers?: Partial<CessIntakeAnswers> }
  | null {
  const match = new RegExp(
    `${escapeRegExp(CESS_SNAPSHOT_START)}([\\s\\S]*?)${escapeRegExp(CESS_SNAPSHOT_END)}`,
    'u'
  ).exec(infoMarkdown);
  if (!match?.[1]) {
    return null;
  }

  const rawBlock = match[1].trim();
  const jsonMatch = /```json\s*([\s\S]*?)```/u.exec(rawBlock);
  const jsonText = (jsonMatch?.[1] ?? rawBlock).trim();
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const answers =
      typeof parsed.answers === 'object' && parsed.answers && !Array.isArray(parsed.answers)
        ? (parsed.answers as Partial<CessIntakeAnswers>)
        : undefined;

    return {
      displayAppName: normalizeText(parsed.displayAppName),
      folderSlug: normalizeText(parsed.folderSlug),
      answers,
    };
  } catch {
    return null;
  }
}

function extractProjectTitle(infoMarkdown: string): string | undefined {
  const match = /^#\s+(.+?)\s*$/mu.exec(infoMarkdown);
  if (!match?.[1]) {
    return undefined;
  }
  return normalizeProjectTitle(match[1]);
}

function parseMarkdownSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const matches = [...markdown.matchAll(/^(#{1,2})\s+(.+?)\s*$/gmu)].filter((match) => {
    return !(match.index === 0 && match[1] === '#');
  });
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    if (!match) {
      continue;
    }
    const heading = match?.[2]?.trim();
    if (!heading || match.index === undefined) {
      continue;
    }
    const start = match.index + match[0].length;
    const end = next?.index ?? markdown.length;
    sections.set(heading, markdown.slice(start, end).trim());
  }
  return sections;
}

function getMarkdownSection(sections: Map<string, string>, ...headings: string[]): string | undefined {
  for (const heading of headings) {
    const exact = sections.get(heading);
    if (exact !== undefined) {
      return exact;
    }
    const normalizedHeading = normalizeHeadingKey(heading);
    for (const [candidate, body] of sections.entries()) {
      if (normalizeHeadingKey(candidate) === normalizedHeading) {
        return body;
      }
    }
  }
  return undefined;
}

function normalizeHeadingKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, ' ');
}

function extractAudienceFromOverview(overview: string | undefined): string | undefined {
  const text = normalizeSectionText(overview);
  if (!text) {
    return undefined;
  }
  const match = /^Build an Expo app for\s+(.+?)[.]\s*$/iu.exec(text);
  return normalizeText(match?.[1] ?? text);
}

function normalizeSectionText(value: string | undefined): string | undefined {
  const normalized = normalizeLineEndings(value ?? '')
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/^\s*>/gmu, '')
    .trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeListSection(value: string | undefined): string | undefined {
  const text = normalizeSectionText(value);
  if (!text) {
    return undefined;
  }

  const bulletLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/u, ''))
    .filter((line) => !line.startsWith('# TodoForContext'));

  return bulletLines.length > 0 ? bulletLines.join('\n') : text;
}

function inferDataNeedSelections(value: string): string[] {
  const normalized = value.toLowerCase();
  const selected = new Set<string>();

  for (const option of DATA_NEED_OPTIONS) {
    if (normalized.includes(option.toLowerCase())) {
      selected.add(option);
    }
  }

  if (/\blocal\b|\bsqlite\b/u.test(normalized)) {
    selected.add('Local UI/app state');
  }
  if (/\bauth\b|\buser account\b|\bsign in\b|\bsign-up\b|\bsign up\b/u.test(normalized)) {
    selected.add('User accounts/authentication');
  }
  if (/\bdatabase\b|\bsupabase\b|\brecords\b/u.test(normalized)) {
    selected.add('Backend database records');
  }
  if (/\bfile\b|\bimage\b|\bphoto\b|\bupload\b|\bstorage\b/u.test(normalized)) {
    selected.add('File/image uploads or storage');
  }
  if (/\bapi\b|\bintegration\b/u.test(normalized)) {
    selected.add('External APIs/integrations');
  }
  if (/\banalytics\b|\bevents\b/u.test(normalized)) {
    selected.add('Analytics/events');
  }
  if (/\bpayments?\b|\bsubscription\b/u.test(normalized)) {
    selected.add('Payments/subscriptions');
  }
  if (/\brealtime\b|\bcollaboration\b/u.test(normalized)) {
    selected.add('Realtime/collaboration');
  }
  if (/\bpush\b|\bemail\b|\bnotification\b/u.test(normalized)) {
    selected.add('Push/email notifications');
  }
  if (/\boffline\b|\bcache\b|\bsync\b/u.test(normalized)) {
    selected.add('Offline sync/cache');
  }
  if (/\badmin\b|\bmoderation\b/u.test(normalized)) {
    selected.add('Admin/moderation tools');
  }

  return Array.from(selected);
}

function inferDataStart(value: string): OnboardAnswers['dataStart'] | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes('supabase')) {
    return 'supabase';
  }
  if (normalized.includes('local dummy data') || normalized.includes('sqlite') || normalized.includes('local ui/app state')) {
    return 'local';
  }
  return undefined;
}

function inferAuthBackend(value: string): CessAuthBackend | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes('supabase')) {
    return 'supabase';
  }
  if (normalized.includes('firebase')) {
    return 'firebase';
  }
  return undefined;
}

function extractPlatformDecisions(
  value: string,
  assignValue: (
    id: keyof CessIntakeAnswers,
    nextValue: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority?: number
  ) => void,
  priority = VISIBLE_SECTION_PRIORITY
): void {
  const targetPlatforms = parsePlatformList(extractBulletValue(value, 'Target platforms'));
  if (targetPlatforms.length > 0) {
    assignValue('targetPlatforms', targetPlatforms, 'Platforms section', priority);
  }

  const firstTargetPlatform = normalizeChoice(extractBulletValue(value, 'First MVP platform'), PLATFORM_OPTIONS);
  if (firstTargetPlatform) {
    assignValue('firstTargetPlatform', firstTargetPlatform, 'Platforms section', priority);
  }

  const appDirectoryValue = extractBulletValue(value, 'Expo Router app directory');
  if (appDirectoryValue?.includes('src/app')) {
    assignValue('appDirectory', 'src', 'Platforms section', priority);
  } else if (appDirectoryValue?.includes('app')) {
    assignValue('appDirectory', 'root', 'Platforms section', priority);
  }

  const organization = extractBulletValue(value, 'Platform-specific organization') ?? '';
  if (organization.toLowerCase().includes('folder')) {
    assignValue('platformStrategy', 'folders', 'Platforms section', priority);
  } else if (organization.toLowerCase().includes('file')) {
    assignValue('platformStrategy', 'files-only', 'Platforms section', priority);
  }

  const layoutMode = extractBulletValue(value, 'Platform layout mode');
  if (layoutMode?.toLowerCase().includes('platform-specific')) {
    assignValue('platformLayouts', 'platform-specific', 'Platforms section', priority);
  } else if (layoutMode?.toLowerCase().includes('shared')) {
    assignValue('platformLayouts', 'shared', 'Platforms section', priority);
  }

  const webOutput = normalizeChoice(extractBulletValue(value, 'Web output'), ['static', 'server', 'spa', 'none'] as const);
  if (webOutput) {
    assignValue('webOutput', webOutput, 'Platforms section', priority);
  }

  const deployedServer = (extractBulletValue(value, 'Deployed server') ?? '').toLowerCase();
  if (deployedServer.includes('no deployed server') || deployedServer === 'none') {
    assignValue('expoServerAdapter', 'none', 'Platforms section', priority);
    assignValue('customBackend', false, 'Platforms section', priority);
  } else if (deployedServer.includes('eas')) {
    assignValue('expoServerAdapter', 'eas', 'Platforms section', priority);
  } else if (deployedServer.includes('express')) {
    assignValue('expoServerAdapter', 'express', 'Platforms section', priority);
  } else if (deployedServer.includes('bun')) {
    assignValue('expoServerAdapter', 'bun', 'Platforms section', priority);
  } else if (deployedServer.includes('custom')) {
    assignValue('expoServerAdapter', 'other', 'Platforms section', priority);
    assignValue('customBackend', true, 'Platforms section', priority);
  }

  const expoUi = parseBooleanValue(extractBulletValue(value, 'Expo UI'));
  if (typeof expoUi === 'boolean') {
    assignValue('usesExpoUi', expoUi, 'Platforms section', priority);
  }
  const expoUiUniversal = parseBooleanValue(extractBulletValue(value, 'Expo UI Universal components'));
  if (typeof expoUiUniversal === 'boolean') {
    assignValue('usesExpoUiUniversalComponents', expoUiUniversal, 'Platforms section', priority);
  }
  const expoNativeTabs = parseBooleanValue(extractBulletValue(value, 'Expo Native Tabs'));
  if (typeof expoNativeTabs === 'boolean') {
    assignValue('usesExpoNativeTabs', expoNativeTabs, 'Platforms section', priority);
  }
}

function extractPackageChoices(
  value: string,
  assignValue: (
    id: keyof CessIntakeAnswers,
    nextValue: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority?: number
  ) => void,
  priority = VISIBLE_SECTION_PRIORITY
): void {
  const entries = normalizeListSection(value)
    ?.split('\n')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) ?? [];

  for (const entry of entries) {
    if (entry === 'uniwind') {
      assignValue('stylingSystem', 'uniwind', 'Package Choices section', priority);
    } else if (entry === 'nativewind') {
      assignValue('stylingSystem', 'nativewind', 'Package Choices section', priority);
    } else if (entry === 'nativewindui') {
      assignValue('stylingSystem', 'nativewindui', 'Package Choices section', priority);
    } else if (entry === 'tamagui') {
      assignValue('stylingSystem', 'tamagui', 'Package Choices section', priority);
    } else if (entry === 'restyle') {
      assignValue('stylingSystem', 'restyle', 'Package Choices section', priority);
    } else if (entry === 'supabase') {
      assignValue('authBackend', 'supabase', 'Package Choices section', priority);
    } else if (entry === 'firebase') {
      assignValue('authBackend', 'firebase', 'Package Choices section', priority);
    }
  }
}

function extractTechStackDecisions(
  value: string,
  assignValue: (
    id: keyof CessIntakeAnswers,
    nextValue: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority?: number
  ) => void,
  priority = TECH_STACK_PRIORITY
): void {
  const typeScriptChoice = parseBooleanValue(extractKeyValue(value, 'TypeScript'));
  if (typeof typeScriptChoice === 'boolean') {
    assignValue('scriptLanguage', typeScriptChoice ? 'typescript' : 'javascript', 'Tech Stack & CESS Onboarding section', priority);
  }

  const packageManagerChoice = normalizeChoiceLabel(
    extractKeyValue(value, 'Package Manager'),
    ['npm', 'pnpm', 'yarn', 'bun'] as const
  );
  if (packageManagerChoice) {
    assignValue('packageManager', packageManagerChoice, 'Tech Stack & CESS Onboarding section', priority);
  }

  const navigationChoice = (extractKeyValue(value, 'Navigation') ?? '').toLowerCase();
  if (isConcreteChoiceValue(navigationChoice)) {
    if (navigationChoice.includes('react navigation')) {
      assignValue('navigationLibrary', 'react-navigation', 'Tech Stack & CESS Onboarding section', priority);
    } else if (navigationChoice.includes('expo router')) {
      assignValue('navigationLibrary', 'expo-router', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const navigationType = (extractKeyValue(value, 'Type of Navigation') ?? '').toLowerCase();
  if (isConcreteChoiceValue(navigationType)) {
    if (navigationType.includes('drawer')) {
      assignValue('reactNavigationLayout', 'drawer', 'Tech Stack & CESS Onboarding section', priority);
    } else if (navigationType.includes('tabs')) {
      assignValue('reactNavigationLayout', 'tabs', 'Tech Stack & CESS Onboarding section', priority);
    } else if (navigationType.includes('stack')) {
      assignValue('reactNavigationLayout', 'stack', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const appDirectoryValue = extractKeyValue(value, 'Expo Router app directory');
  if (appDirectoryValue?.includes('src/app')) {
    assignValue('appDirectory', 'src', 'Tech Stack & CESS Onboarding section', priority);
  } else if (appDirectoryValue === 'app' || appDirectoryValue?.includes('`app`')) {
    assignValue('appDirectory', 'root', 'Tech Stack & CESS Onboarding section', priority);
  }

  const organization = (extractKeyValue(value, 'Platform-specific organization (folders, files, or inline)') ?? '').toLowerCase();
  if (isConcreteChoiceValue(organization)) {
    if (organization.includes('folder')) {
      assignValue('platformStrategy', 'folders', 'Tech Stack & CESS Onboarding section', priority);
    } else if (organization.includes('file')) {
      assignValue('platformStrategy', 'files-only', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const layoutMode = (extractKeyValue(value, 'Platform layout mode') ?? '').toLowerCase();
  if (isConcreteChoiceValue(layoutMode)) {
    if (layoutMode.includes('platform-specific')) {
      assignValue('platformLayouts', 'platform-specific', 'Tech Stack & CESS Onboarding section', priority);
    } else if (layoutMode.includes('shared')) {
      assignValue('platformLayouts', 'shared', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const webOutput = normalizeChoiceLabel(extractKeyValue(value, 'Web output'), ['static', 'server', 'spa', 'none'] as const);
  if (webOutput) {
    assignValue('webOutput', webOutput, 'Tech Stack & CESS Onboarding section', priority);
  }

  const styleLibrary = (extractKeyValue(value, 'Style Library') ?? '').toLowerCase();
  if (isConcreteChoiceValue(styleLibrary)) {
    if (styleLibrary.includes('nativewindui')) {
      assignValue('stylingSystem', 'nativewindui', 'Tech Stack & CESS Onboarding section', priority);
    } else if (styleLibrary.includes('nativewind')) {
      assignValue('stylingSystem', 'nativewind', 'Tech Stack & CESS Onboarding section', priority);
    } else if (styleLibrary.includes('uniwind')) {
      assignValue('stylingSystem', 'uniwind', 'Tech Stack & CESS Onboarding section', priority);
    } else if (styleLibrary.includes('tamagui')) {
      assignValue('stylingSystem', 'tamagui', 'Tech Stack & CESS Onboarding section', priority);
    } else if (styleLibrary.includes('restyle')) {
      assignValue('stylingSystem', 'restyle', 'Tech Stack & CESS Onboarding section', priority);
    } else if (styleLibrary.includes('stylesheet')) {
      assignValue('stylingSystem', 'stylesheet', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  assignBooleanKey(value, 'Components from create-expo-app', 'includeCreateExpoComponents', assignValue, priority);
  assignBooleanKey(value, 'Expo UI', 'usesExpoUi', assignValue, priority);
  assignBooleanKey(value, 'Expo UI Universal components', 'usesExpoUiUniversalComponents', assignValue, priority);
  assignBooleanKey(value, 'Expo Native Tabs', 'usesExpoNativeTabs', assignValue, priority);

  const stateManagementChoice = (extractKeyValue(value, 'State management library') ?? '').toLowerCase();
  if (isConcreteChoiceValue(stateManagementChoice)) {
    if (stateManagementChoice.includes('zustand')) {
      assignValue('stateManagement', 'zustand', 'Tech Stack & CESS Onboarding section', priority);
    } else if (stateManagementChoice.includes('none')) {
      assignValue('stateManagement', 'none', 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const authChoice = inferAuthBackend(extractKeyValue(value, 'Auth') ?? '');
  if (authChoice) {
    assignValue('authBackend', authChoice, 'Tech Stack & CESS Onboarding section', priority);
  } else if ((extractKeyValue(value, 'Auth') ?? '').toLowerCase().includes('none')) {
    assignValue('authBackend', 'none', 'Tech Stack & CESS Onboarding section', priority);
  }

  const dataCategories = extractKeyValue(value, 'Data Categories');
  if (dataCategories) {
    const inferredDataNeeds = inferDataNeedSelections(dataCategories);
    if (inferredDataNeeds.length > 0) {
      assignValue('dataNeedSelections', inferredDataNeeds, 'Tech Stack & CESS Onboarding section', priority);
    }
  }

  const startingDataMode = inferDataStart(extractKeyValue(value, 'Starting Data mode') ?? '');
  if (startingDataMode) {
    assignValue('dataStart', startingDataMode, 'Tech Stack & CESS Onboarding section', priority);
  }

  const easChoice = parseBooleanValue(extractKeyValue(value, 'EAS'));
  if (typeof easChoice === 'boolean') {
    assignValue('easSetup', easChoice, 'Tech Stack & CESS Onboarding section', priority);
  }

  const newEasUses = inferEasUses(extractKeyValue(value, 'EAS Usage') ?? '');
  if (newEasUses.length > 0) {
    assignValue('easUses', newEasUses, 'Tech Stack & CESS Onboarding section', priority);
    assignValue('easSetup', true, 'Tech Stack & CESS Onboarding section', priority);
  }

  extractPlatformDecisions(`- Deployed server: ${extractKeyValue(value, 'Deployed server') ?? ''}`, assignValue, priority);

  const initialDeploymentPlan = extractKeyValue(value, 'Initial Deployment plan');
  if (initialDeploymentPlan && isConcreteChoiceValue(initialDeploymentPlan)) {
    assignValue('deploymentTarget', initialDeploymentPlan, 'Tech Stack & CESS Onboarding section', priority);
  }

  assignBooleanKey(value, 'Start with MDS project guidelines template', 'guidelinesTemplate', assignValue, priority);
  assignBooleanKey(value, 'Use test-to-main safeguards', 'testToMainSafeguards', assignValue, priority);

  const language = normalizeChoice(extractKeyValue(value, 'Language'), ['typescript', 'javascript'] as const);
  if (language) {
    assignValue('scriptLanguage', language, 'Tech Stack & MDS Onboarding section', priority);
  }

  const packageManager = normalizeChoice(extractKeyValue(value, 'Package manager'), ['npm', 'pnpm', 'yarn', 'bun'] as const);
  if (packageManager) {
    assignValue('packageManager', packageManager, 'Tech Stack & MDS Onboarding section', priority);
  }

  const routing = (extractKeyValue(value, 'Routing') ?? '').toLowerCase();
  if (routing.includes('react navigation')) {
    assignValue('navigationLibrary', 'react-navigation', 'Tech Stack & MDS Onboarding section', priority);
    if (routing.includes('tabs')) {
      assignValue('reactNavigationLayout', 'tabs', 'Tech Stack & MDS Onboarding section', priority);
    } else if (routing.includes('drawer')) {
      assignValue('reactNavigationLayout', 'drawer', 'Tech Stack & MDS Onboarding section', priority);
    } else {
      assignValue('reactNavigationLayout', 'stack', 'Tech Stack & MDS Onboarding section', priority);
    }
  } else if (routing.includes('expo router')) {
    assignValue('navigationLibrary', 'expo-router', 'Tech Stack & MDS Onboarding section', priority);
  }

  const styling = (extractKeyValue(value, 'Styling') ?? '').toLowerCase();
  if (styling.includes('uniwind')) {
    assignValue('stylingSystem', 'uniwind', 'Tech Stack & MDS Onboarding section', priority);
  } else if (styling.includes('nativewind')) {
    assignValue('stylingSystem', 'nativewind', 'Tech Stack & MDS Onboarding section', priority);
  } else if (styling.includes('tamagui')) {
    assignValue('stylingSystem', 'tamagui', 'Tech Stack & MDS Onboarding section', priority);
  } else if (styling.includes('restyle')) {
    assignValue('stylingSystem', 'restyle', 'Tech Stack & MDS Onboarding section', priority);
  } else if (styling.includes('stylesheet')) {
    assignValue('stylingSystem', 'stylesheet', 'Tech Stack & MDS Onboarding section', priority);
  }

  const stateManagement = (extractKeyValue(value, 'State management') ?? '').toLowerCase();
  if (stateManagement.includes('zustand')) {
    assignValue('stateManagement', 'zustand', 'Tech Stack & MDS Onboarding section', priority);
  } else if (stateManagement.includes('none')) {
    assignValue('stateManagement', 'none', 'Tech Stack & MDS Onboarding section', priority);
  }

  const auth = inferAuthBackend(extractKeyValue(value, 'Auth') ?? '');
  if (auth) {
    assignValue('authBackend', auth, 'Tech Stack & MDS Onboarding section', priority);
  }

  const distribution = extractKeyValue(value, 'Distribution');
  if (distribution) {
    assignValue('deploymentTarget', distribution, 'Tech Stack & MDS Onboarding section', priority);
  }

  const easUses = inferEasUses(extractKeyValue(value, 'EAS') ?? '');
  if (easUses.length > 0) {
    assignValue('easUses', easUses, 'Tech Stack & MDS Onboarding section', priority);
    assignValue('easSetup', true, 'Tech Stack & MDS Onboarding section', priority);
  }

  extractOnboardingDecisionLines(value, assignValue, priority);
}

function extractOnboardingDecisionLines(
  value: string,
  assignValue: (
    id: keyof CessIntakeAnswers,
    nextValue: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority?: number
  ) => void,
  priority = VISIBLE_SECTION_PRIORITY
): void {
  const lines = normalizeLineEndings(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const rawKeyValue = /^-\s+(.+?):\s+(.+)$/u.exec(line);
    const key = normalizeText(rawKeyValue?.[1]);
    const rawValue = normalizeText(rawKeyValue?.[2]);
    if (!key || !rawValue) {
      continue;
    }

    const loweredKey = key.toLowerCase();
    if (loweredKey === 'advanced package setup') {
      continue;
    }
    if (loweredKey === 'create expo starter components') {
      assignValue('includeCreateExpoComponents', parseBooleanValue(rawValue), 'Onboarding decisions', priority);
    } else if (loweredKey === 'latest expo sdk preference') {
      // Captured for human context only; SDK targeting is enforced by the generator.
      continue;
    } else if (loweredKey === 'expo ui') {
      assignValue('usesExpoUi', parseBooleanValue(rawValue), 'Onboarding decisions', priority);
    } else if (loweredKey === 'expo ui universal components') {
      assignValue('usesExpoUiUniversalComponents', parseBooleanValue(rawValue), 'Onboarding decisions', priority);
    } else if (loweredKey === 'expo native tabs') {
      assignValue('usesExpoNativeTabs', parseBooleanValue(rawValue), 'Onboarding decisions', priority);
    } else if (loweredKey === 'target platforms') {
      const targetPlatforms = parsePlatformList(rawValue);
      if (targetPlatforms.length > 0) {
        assignValue('targetPlatforms', targetPlatforms, 'Onboarding decisions', priority);
      }
    } else if (loweredKey === 'first mvp platform') {
      assignValue('firstTargetPlatform', normalizeChoice(rawValue, PLATFORM_OPTIONS), 'Onboarding decisions', priority);
    } else if (loweredKey === 'expo router app directory') {
      assignValue('appDirectory', rawValue.includes('src/app') ? 'src' : 'root', 'Onboarding decisions', priority);
    } else if (loweredKey === 'platform-specific organization') {
      assignValue(
        'platformStrategy',
        rawValue.toLowerCase().includes('folder') ? 'folders' : 'files-only',
        'Onboarding decisions',
        priority
      );
    } else if (loweredKey === 'platform layout mode') {
      assignValue(
        'platformLayouts',
        rawValue.toLowerCase().includes('platform-specific') ? 'platform-specific' : 'shared',
        'Onboarding decisions',
        priority
      );
    } else if (loweredKey === 'web output') {
      assignValue('webOutput', normalizeChoice(rawValue, ['static', 'server', 'spa', 'none'] as const), 'Onboarding decisions', priority);
    } else if (loweredKey === 'deployed server') {
      extractPlatformDecisions(`- Deployed server: ${rawValue}`, assignValue, priority);
    } else if (loweredKey === 'eas usage') {
      const easUses = inferEasUses(rawValue);
      if (easUses.length > 0) {
        assignValue('easUses', easUses, 'Onboarding decisions', priority);
        assignValue('easSetup', true, 'Onboarding decisions', priority);
      }
    } else if (loweredKey === 'data start') {
      assignValue('dataStart', inferDataStart(rawValue), 'Onboarding decisions', priority);
    } else if (loweredKey === 'test-to-main safeguards') {
      assignValue('testToMainSafeguards', parseBooleanValue(rawValue), 'Onboarding decisions', priority);
    }
  }
}

function extractBulletValue(value: string, label: string): string | undefined {
  const match = new RegExp(`^-\\s+${escapeRegExp(label)}:\\s+(.+)$`, 'imu').exec(value);
  return normalizeText(match?.[1]);
}

function extractKeyValue(value: string, label: string): string | undefined {
  const match = new RegExp(`^-\\s+(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?:\\s+(.+)$`, 'imu').exec(value);
  return normalizeText(match?.[1]);
}

function assignBooleanKey(
  value: string,
  label: string,
  id: keyof CessIntakeAnswers,
  assignValue: (
    id: keyof CessIntakeAnswers,
    nextValue: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined,
    note: string,
    priority?: number
  ) => void,
  priority: number
): void {
  const bool = parseBooleanValue(extractKeyValue(value, label));
  if (typeof bool === 'boolean') {
    assignValue(id, bool, 'Tech Stack & CESS Onboarding section', priority);
  }
}

function normalizeChoiceLabel<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  const normalized = normalizeText(value)?.toLowerCase().replace(/[`]/gu, '').trim();
  if (!normalized || !isConcreteChoiceValue(normalized)) {
    return undefined;
  }
  return choices.find((choice) => choice.toLowerCase() === normalized);
}

function isConcreteChoiceValue(value: string): boolean {
  return !/\s\/\s/u.test(value);
}

function inferEasUses(value: string): string[] {
  const normalized = value.toLowerCase();
  const selected = EAS_USE_OPTIONS.filter((item) => normalized.includes(item.toLowerCase()));
  if (/\bbuilding mobile apps?\b/u.test(normalized) && !selected.includes('building mobile applications')) {
    selected.push('building mobile applications');
  }
  return selected;
}

function parsePlatformList(value: string | undefined): string[] {
  const normalized = value
    ?.split(',')
    .map((item) => item.replace(/[`]/gu, '').trim().toLowerCase())
    .filter(Boolean) ?? [];

  return normalized
    .map((item) => {
      if (item === 'ios' || item === 'android' || item === 'web' || item === 'apple-tv' || item === 'android-tv') {
        return item;
      }
      return item.replace(/\s+/gu, '-');
    })
    .filter((item): item is string => PLATFORM_OPTIONS.includes(item as (typeof PLATFORM_OPTIONS)[number]));
}

function parseBooleanValue(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (['yes', 'true', 'on'].includes(normalized)) {
    return true;
  }
  if (['no', 'false', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function normalizeExtractedAnswerValue(
  id: keyof CessIntakeAnswers,
  value: CessIntakeAnswers[keyof CessIntakeAnswers] | undefined
): CessIntakeAnswers[keyof CessIntakeAnswers] | undefined {
  switch (id) {
    case 'confirmed':
    case 'easSetup':
    case 'customBackend':
    case 'includeCreateExpoComponents':
    case 'usesExpoUi':
    case 'usesExpoUiUniversalComponents':
    case 'usesExpoNativeTabs':
    case 'guidelinesTemplate':
    case 'testToMainSafeguards':
    case 'saveDefaults':
      return typeof value === 'boolean' ? value : undefined;
    case 'dataNeedSelections':
    case 'targetPlatforms':
    case 'easUses':
      return normalizeStringArray(value) ?? undefined;
    case 'scriptLanguage':
      return normalizeEnum(value, ['typescript', 'javascript']);
    case 'packageManager':
      return normalizeEnum(value, ['npm', 'pnpm', 'yarn', 'bun']);
    case 'navigationLibrary':
      return normalizeEnum(value, ['expo-router', 'react-navigation']);
    case 'reactNavigationLayout':
      return normalizeEnum(value, ['stack', 'tabs', 'drawer']);
    case 'stylingSystem':
      return normalizeEnum(value, ['uniwind', 'nativewind', 'nativewindui', 'tamagui', 'restyle', 'stylesheet']);
    case 'stateManagement':
      return normalizeEnum(value, ['zustand', 'none']);
    case 'authBackend':
      return normalizeEnum(value, ['none', 'supabase', 'firebase']);
    case 'platformStrategy':
      return normalizePlatformStrategyValue(value);
    case 'appDirectory':
      return normalizeAppDirectoryValue(value);
    case 'platformLayouts':
      return normalizePlatformLayoutsValue(value);
    case 'webOutput':
      return normalizeEnum(value, ['static', 'server', 'spa', 'none']);
    case 'expoServerAdapter':
      return normalizeEnum(value, ['eas', 'express', 'bun', 'other', 'none']);
    case 'dataStart':
      return normalizeEnum(value, ['local', 'supabase']);
    case 'screens':
      return normalizeOptionalDeferText(value);
    default:
      return normalizeText(value);
  }
}

function isGenericExtractedAnswerValue(
  id: keyof CessIntakeAnswers,
  value: CessIntakeAnswers[keyof CessIntakeAnswers]
): boolean {
  if (id === 'displayAppName') {
    return isGenericTextValue(value);
  }
  if (id === 'audience') {
    return normalizeText(value)?.toLowerCase() === 'expo app users';
  }
  if (id === 'coreFlows') {
    const normalized = normalizeText(value)?.toLowerCase();
    return (
      !normalized ||
      normalized === AGENT_DERIVED_CORE_FLOWS.toLowerCase() ||
      normalized.includes('let the agent derive') ||
      normalized.startsWith('# todoforcontext')
    );
  }
  if (id === 'screens') {
    const normalized = normalizeText(value)?.toLowerCase();
    return !normalized || normalized === 'defer' || normalized.startsWith('# todoforcontext');
  }
  if (id === 'targetPlatforms') {
    const platforms = normalizeStringArray(value);
    return (
      platforms?.length === PLATFORM_OPTIONS.length &&
      PLATFORM_OPTIONS.every((platform) => platforms.includes(platform))
    );
  }
  if (id === 'deploymentTarget') {
    return normalizeText(value)?.toLowerCase() === 'expo web/native deployment';
  }
  return false;
}

function isGenericTextValue(value: unknown): boolean {
  const normalized = normalizeText(value)
    ?.toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
  return !normalized || normalized === 'template' || normalized === 'my expo app' || normalized === 'my-expo-app';
}

function areAnswerValuesEquivalent(
  id: keyof CessIntakeAnswers,
  left: CessIntakeAnswers[keyof CessIntakeAnswers],
  right: CessIntakeAnswers[keyof CessIntakeAnswers]
): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(normalizeStringArray(left) ?? []) === JSON.stringify(normalizeStringArray(right) ?? []);
  }
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return left === right;
  }
  return normalizeExtractedAnswerValue(id, left) === normalizeExtractedAnswerValue(id, right);
}

function normalizeProjectTitle(value: string): string | undefined {
  const trimmed = value.replace(/\s+project info$/iu, '').trim();
  const normalized = normalizeText(trimmed);
  return normalized ? displayNameFromProjectName(normalized) : undefined;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/gu, '\n');
}

function slugifyAppName(value: string | undefined): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return slug || DEFAULT_PROJECT_NAME;
}

function displayNameFromProjectName(value: string | undefined): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    return DEFAULT_DISPLAY_APP_NAME;
  }
  if (normalized.includes(' ')) {
    return normalized;
  }
  return normalized
    .replace(/[-_]+/gu, ' ')
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function buildCessIntakeStep(input: {
  parentDir?: string;
  appName?: string;
  answers?: Partial<CessIntakeAnswers>;
  cwd?: string;
}): CessIntakeStepResult {
  const cwd = input.cwd ? path.resolve(input.cwd) : process.cwd();
  const parentDirProvided = normalizeText(input.parentDir);
  const appNameProvided = normalizeText(input.appName);
  const parentDir = normalizeParentDir(input.parentDir, cwd);
  const appName = normalizeProjectName(input.appName);
  const appDisplayName = displayNameFromProjectName(input.appName);
  const currentAnswers = normalizeCessIntakeAnswers(input.answers);
  const resolvedPlan = resolveCessPlan({
    parentDir,
    appName: input.appName,
    answers: currentAnswers,
    cwd,
  });
  const context: CessQuestionContext = {
    parentDir,
    appName,
    appDisplayName,
    currentAnswers,
    resolvedAnswers: resolvedPlan.answers,
    onboardAnswers: resolvedPlan.onboardAnswers,
  };
  const projectPath = resolvedPlan.projectPath;
  const nextQuestion = findNextQuestion(context, currentAnswers, {
    parentDirProvided,
    appNameProvided,
  });
  const missingRequirements = nextQuestion ? [nextQuestion.id] : [];

  if (nextQuestion) {
    return {
      status: 'question',
      nextQuestion,
      options: nextQuestion.options,
      defaultValue: nextQuestion.defaultValue,
      updatedAnswers: currentAnswers,
      missingRequirements,
      projectPath,
      parentDir,
      appName,
    };
  }

  if (missingRequirements.length > 0) {
    return {
      status: 'blocked',
      updatedAnswers: currentAnswers,
      missingRequirements,
      summaryLines: resolvedPlan.summaryLines,
      projectPath,
      parentDir,
      appName,
    };
  }

  if (currentAnswers.confirmed === true) {
    return {
      status: 'ready',
      updatedAnswers: currentAnswers,
      missingRequirements: [],
      summaryLines: resolvedPlan.summaryLines,
      projectPath,
      parentDir,
      appName,
    };
  }

  return {
    status: 'confirm',
    updatedAnswers: currentAnswers,
    missingRequirements: [],
    summaryLines: resolvedPlan.summaryLines,
    projectPath,
    parentDir,
    appName,
  };
}

export function resolveCessPlan(input: {
  parentDir?: string;
  appName?: string;
  answers?: Partial<CessIntakeAnswers>;
  cwd?: string;
}): CessResolvedPlan {
  const cwd = input.cwd ? path.resolve(input.cwd) : process.cwd();
  const parentDir = normalizeParentDir(input.parentDir, cwd);
  const appName = normalizeProjectName(input.appName);
  const appDisplayName = displayNameFromProjectName(input.appName);
  const projectPath = path.resolve(parentDir, appName);
  const currentAnswers = normalizeCessIntakeAnswers(input.answers);
  const onboardArgv = buildOnboardArgvFromCess(parentDir, appName, currentAnswers);
  const onboardPlan = defaultOnboardPlan(onboardArgv, projectPath);
  const answers = buildResolvedCessAnswers(
    currentAnswers,
    parentDir,
    appName,
    appDisplayName,
    onboardPlan.answers
  );
  const finalOnboardArgv = buildOnboardArgvFromCess(parentDir, appName, answers);
  const finalOnboardPlan = defaultOnboardPlan(finalOnboardArgv, projectPath);
  const createExpoStackFlags = buildCreateExpoStackFlags(answers);
  const mdsFlags = buildMdsFlags(appName, finalOnboardPlan.answers, answers);

  return {
    projectPath,
    parentDir,
    appName,
    answers,
    onboardArgv: finalOnboardArgv,
    onboardAnswers: finalOnboardPlan.answers,
    createExpoStackFlags,
    mdsFlags,
    summaryLines: buildCessSummaryLines(parentDir, appName, answers, finalOnboardPlan.answers),
  };
}

export function validateCessGenerationReadiness(input: {
  parentDir?: string;
  appName?: string;
  answers?: Partial<CessIntakeAnswers>;
  cwd?: string;
}): string[] {
  const cwd = input.cwd ? path.resolve(input.cwd) : process.cwd();
  const parentDir = normalizeParentDir(input.parentDir, cwd);
  const appName = normalizeProjectName(input.appName);
  const currentAnswers = normalizeCessIntakeAnswers({
    ...input.answers,
    confirmed: undefined,
  });
  const resolvedPlan = resolveCessPlan({
    parentDir,
    appName,
    answers: currentAnswers,
    cwd,
  });
  const nextQuestion = findNextQuestion(
    {
      parentDir,
      appName,
      appDisplayName: displayNameFromProjectName(input.appName),
      currentAnswers,
      resolvedAnswers: resolvedPlan.answers,
      onboardAnswers: resolvedPlan.onboardAnswers,
    },
    currentAnswers,
    {
      parentDirProvided: normalizeText(input.parentDir),
      appNameProvided: normalizeText(input.appName),
    }
  );

  return nextQuestion ? [nextQuestion.id] : [];
}

export function normalizeCessIntakeAnswers(
  answers: Partial<CessIntakeAnswers> | undefined
): Partial<CessIntakeAnswers> {
  if (!answers) {
    return {};
  }

  const normalized: Partial<CessIntakeAnswers> = {};

  normalized.confirmed = normalizeBoolean(answers.confirmed);
  normalized.scriptLanguage = normalizeEnum(answers.scriptLanguage, ['typescript', 'javascript']);
  normalized.packageManager = normalizeEnum(answers.packageManager, ['npm', 'pnpm', 'yarn', 'bun']);
  normalized.navigationLibrary = normalizeEnum(answers.navigationLibrary, [
    'expo-router',
    'react-navigation',
  ]);
  normalized.reactNavigationLayout = normalizeEnum(answers.reactNavigationLayout, [
    'stack',
    'tabs',
    'drawer',
  ]);
  normalized.stylingSystem = normalizeEnum(answers.stylingSystem, [
    'uniwind',
    'nativewind',
    'nativewindui',
    'tamagui',
    'restyle',
    'stylesheet',
  ]);
  normalized.stateManagement = normalizeEnum(answers.stateManagement, ['zustand', 'none']);
  normalized.authBackend = normalizeEnum(answers.authBackend, ['none', 'supabase', 'firebase']);
  normalized.easSetup = normalizeBoolean(answers.easSetup);
  normalized.displayAppName = normalizeText(answers.displayAppName);
  normalized.audience = normalizeText(answers.audience);
  normalized.coreFlows = normalizeText(answers.coreFlows);
  normalized.screens = normalizeOptionalDeferText(answers.screens);
  normalized.dataNeedSelections = normalizeStringArray(answers.dataNeedSelections);
  normalized.dataNeedsOther = normalizeText(answers.dataNeedsOther);
  normalized.targetPlatforms = normalizePlatforms(answers.targetPlatforms);
  normalized.firstTargetPlatform = normalizeText(answers.firstTargetPlatform);
  normalized.platformStrategy = normalizePlatformStrategyValue(answers.platformStrategy);
  normalized.appDirectory = normalizeAppDirectoryValue(answers.appDirectory);
  normalized.platformLayouts = normalizePlatformLayoutsValue(answers.platformLayouts);
  normalized.webOutput = normalizeEnum(answers.webOutput, ['static', 'server', 'spa', 'none']);
  normalized.expoServerAdapter = normalizeEnum(answers.expoServerAdapter, [
    'eas',
    'express',
    'bun',
    'other',
    'none',
  ]);
  normalized.customBackend = normalizeBoolean(answers.customBackend);
  normalized.customBackendEntry = normalizeText(answers.customBackendEntry);
  normalized.deploymentTarget = normalizeText(answers.deploymentTarget);
  normalized.includeCreateExpoComponents = normalizeBoolean(answers.includeCreateExpoComponents);
  normalized.usesExpoUi = normalizeBoolean(answers.usesExpoUi);
  normalized.usesExpoUiUniversalComponents = normalizeBoolean(
    answers.usesExpoUiUniversalComponents
  );
  normalized.usesExpoNativeTabs = normalizeBoolean(answers.usesExpoNativeTabs);
  normalized.easUses = normalizeStringArray(answers.easUses);
  normalized.guidelinesTemplate = normalizeBoolean(answers.guidelinesTemplate);
  normalized.dataStart = normalizeEnum(answers.dataStart, ['local', 'supabase']);
  normalized.testToMainSafeguards = normalizeBoolean(answers.testToMainSafeguards);
  normalized.saveDefaults = normalizeBoolean(answers.saveDefaults);

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  ) as Partial<CessIntakeAnswers>;
}

export function buildCreateExpoStackFlags(answers: CessIntakeAnswers): string[] {
  const flags: string[] = [];

  flags.push(answers.scriptLanguage === 'javascript' ? '--javascript' : '--typescript');
  flags.push(`--${answers.packageManager}`);
  flags.push(answers.navigationLibrary === 'react-navigation' ? '--react-navigation' : '--expo-router');

  if (answers.navigationLibrary === 'react-navigation') {
    if (answers.reactNavigationLayout === 'tabs') {
      flags.push('--tabs');
    } else if (answers.reactNavigationLayout === 'drawer') {
      flags.push('--drawer+tabs');
    }
  }

  switch (answers.stylingSystem) {
    case 'uniwind':
      flags.push('--uniwind');
      break;
    case 'nativewind':
      flags.push('--nativewind');
      break;
    case 'nativewindui':
      flags.push('--nativewindui');
      break;
    case 'tamagui':
      flags.push('--tamagui');
      break;
    case 'restyle':
      flags.push('--restyle');
      break;
    case 'stylesheet':
      break;
  }

  if (answers.stateManagement === 'zustand') {
    flags.push('--zustand');
  }
  if (answers.authBackend === 'supabase') {
    flags.push('--supabase');
  } else if (answers.authBackend === 'firebase') {
    flags.push('--firebase');
  }
  return flags;
}

export function buildMdsFlags(
  appName: string,
  onboardAnswers: OnboardAnswers,
  intakeAnswers: CessIntakeAnswers
): string[] {
  const flags = [
    `--mds-app-name=${quoteFlagValue(onboardAnswers.appName)}`,
    `--mds-audience=${quoteFlagValue(onboardAnswers.audience)}`,
    `--mds-core-flows=${quoteFlagValue(onboardAnswers.coreFlows)}`,
    `--mds-data-needs=${quoteFlagValue(buildDataNeedsFlagValue(intakeAnswers))}`,
    `--mds-platforms=${onboardAnswers.targetPlatforms.join(',')}`,
    `--mds-first-platform=${onboardAnswers.firstTargetPlatform}`,
    `--mds-platform-strategy=${onboardAnswers.platformFileStrategy}`,
    `--mds-app-directory=${onboardAnswers.appDirectory}`,
    `--mds-platform-layouts=${onboardAnswers.platformLayoutMode}`,
    `--mds-web-output=${onboardAnswers.webOutput}`,
    `--mds-deployed-server=${onboardAnswers.deployedServer}`,
    `--mds-data-start=${onboardAnswers.dataStart}`,
    '--mds-yes',
  ];

  if (intakeAnswers.screens && intakeAnswers.screens !== 'defer') {
    flags.push(`--mds-screens=${quoteFlagValue(intakeAnswers.screens)}`);
  }
  if (onboardAnswers.includeCreateExpoComponents) {
    flags.push('--mds-create-expo-components');
  } else {
    flags.push('--mds-no-create-expo-components');
  }
  if (onboardAnswers.usesExpoUi) {
    flags.push('--mds-expo-ui');
  } else {
    flags.push('--mds-no-expo-ui');
  }
  if (onboardAnswers.usesExpoUiUniversalComponents) {
    flags.push('--mds-expo-ui-universal');
  } else {
    flags.push('--mds-no-expo-ui-universal');
  }
  if (onboardAnswers.usesExpoNativeTabs) {
    flags.push('--mds-expo-native-tabs');
  } else {
    flags.push('--mds-no-expo-native-tabs');
  }
  if (onboardAnswers.easUses.length > 0) {
    flags.push(`--mds-eas-uses=${quoteFlagValue(onboardAnswers.easUses.join(','))}`);
  }
  if (intakeAnswers.guidelinesTemplate === false) {
    flags.push('--mds-no-guidelines-template');
  } else {
    flags.push('--mds-guidelines-template');
  }
  if (onboardAnswers.testToMainSafeguards) {
    flags.push('--mds-test-to-main');
  } else {
    flags.push('--mds-no-test-to-main');
  }
  if (intakeAnswers.saveDefaults) {
    flags.push('--mds-save-defaults');
  } else {
    flags.push('--mds-no-save-defaults');
  }
  if (path.basename(appName) !== onboardAnswers.appName) {
    flags.push(`--mds-app-name=${quoteFlagValue(onboardAnswers.appName)}`);
  }

  return dedupe(flags);
}

export function buildCreateExpoSuperStackArgv(plan: CessResolvedPlan): string[] {
  return [plan.appName, ...plan.createExpoStackFlags, ...plan.mdsFlags];
}

export function buildCessSummaryLines(
  parentDir: string,
  appName: string,
  answers: CessIntakeAnswers,
  onboardAnswers: OnboardAnswers
): string[] {
  const stackLine = [
    answers.scriptLanguage === 'javascript' ? 'JavaScript' : 'TypeScript',
    answers.packageManager,
    answers.navigationLibrary === 'react-navigation'
      ? `React Navigation${answers.reactNavigationLayout === 'tabs' ? ' Tabs' : answers.reactNavigationLayout === 'drawer' ? ' Drawer + Tabs' : ' Stack'}`
      : 'Expo Router',
    formatStylingLabel(answers.stylingSystem ?? STACK_DEFAULTS.stylingSystem),
    answers.stateManagement === 'zustand' ? 'Zustand' : 'No shared state starter',
    answers.authBackend === 'none'
      ? 'No auth starter'
      : formatTitle(answers.authBackend ?? STACK_DEFAULTS.authBackend),
    answers.easSetup
      ? 'EAS planned; sign in and set it up manually in Phase 0'
      : 'No EAS planned',
  ].join(', ');

  const platformLine = [
    `platforms: ${onboardAnswers.targetPlatforms.map(formatPlatformLabel).join(', ')}`,
    `first MVP: ${formatPlatformLabel(onboardAnswers.firstTargetPlatform)}`,
    `routes: ${onboardAnswers.appDirectory === 'src' ? 'src/app' : 'app'}`,
    `platform strategy: ${onboardAnswers.platformFileStrategy}`,
    `layouts: ${onboardAnswers.platformLayoutMode}`,
  ].join(', ');

  const serverLine =
    onboardAnswers.webOutput === 'none'
      ? 'web output: none'
      : `web output: ${onboardAnswers.webOutput}, deployed server: ${onboardAnswers.deployedServer}`;

  return [
    `app: ${onboardAnswers.appName} (folder: ${appName}) at ${parentDir}`,
    `stack: ${stackLine}`,
    `audience: ${onboardAnswers.audience}`,
    `core flows: ${onboardAnswers.coreFlows}`,
    platformLine,
    serverLine,
    `data start: ${onboardAnswers.dataStart}, test-to-main: ${onboardAnswers.testToMainSafeguards ? 'on' : 'off'}, guidelines template: ${answers.guidelinesTemplate === false ? 'off' : 'on'}, save defaults: ${answers.saveDefaults ? 'on' : 'off'}`,
  ];
}

function buildResolvedCessAnswers(
  currentAnswers: Partial<CessIntakeAnswers>,
  parentDir: string,
  appName: string,
  appDisplayName: string,
  onboardAnswers: OnboardAnswers
): CessIntakeAnswers {
  const targetPlatforms = currentAnswers.targetPlatforms ?? onboardAnswers.targetPlatforms;
  const usesExpoUi = currentAnswers.usesExpoUi ?? onboardAnswers.usesExpoUi;
  const screens = currentAnswers.screens === 'defer' ? '' : currentAnswers.screens;

  return {
    confirmed: currentAnswers.confirmed === true,
    scriptLanguage: currentAnswers.scriptLanguage ?? STACK_DEFAULTS.scriptLanguage,
    packageManager: currentAnswers.packageManager ?? STACK_DEFAULTS.packageManager,
    navigationLibrary: currentAnswers.navigationLibrary ?? STACK_DEFAULTS.navigationLibrary,
    reactNavigationLayout:
      currentAnswers.reactNavigationLayout ?? STACK_DEFAULTS.reactNavigationLayout,
    stylingSystem: currentAnswers.stylingSystem ?? STACK_DEFAULTS.stylingSystem,
    stateManagement: currentAnswers.stateManagement ?? STACK_DEFAULTS.stateManagement,
    authBackend: currentAnswers.authBackend ?? STACK_DEFAULTS.authBackend,
    easSetup: currentAnswers.easSetup ?? STACK_DEFAULTS.easSetup,
    displayAppName: currentAnswers.displayAppName ?? appDisplayName ?? onboardAnswers.appName ?? appName,
    audience: currentAnswers.audience ?? onboardAnswers.audience,
    coreFlows: currentAnswers.coreFlows ?? onboardAnswers.coreFlows ?? AGENT_DERIVED_CORE_FLOWS,
    screens,
    dataNeedSelections: normalizeStringArray(currentAnswers.dataNeedSelections) ?? ['Local UI/app state'],
    dataNeedsOther: currentAnswers.dataNeedsOther,
    targetPlatforms,
    firstTargetPlatform:
      currentAnswers.firstTargetPlatform ?? onboardAnswers.firstTargetPlatform ?? targetPlatforms[0] ?? 'web',
    platformStrategy: currentAnswers.platformStrategy ?? onboardAnswers.platformFileStrategy,
    appDirectory: currentAnswers.appDirectory ?? onboardAnswers.appDirectory,
    platformLayouts: currentAnswers.platformLayouts ?? onboardAnswers.platformLayoutMode,
    webOutput: currentAnswers.webOutput ?? onboardAnswers.webOutput,
    expoServerAdapter: currentAnswers.expoServerAdapter ?? onboardAnswers.expoServerAdapter,
    customBackend: currentAnswers.customBackend ?? onboardAnswers.customBackend,
    customBackendEntry: currentAnswers.customBackendEntry ?? onboardAnswers.customBackendEntry,
    deploymentTarget: currentAnswers.deploymentTarget ?? onboardAnswers.deploymentTarget,
    includeCreateExpoComponents:
      currentAnswers.includeCreateExpoComponents ?? onboardAnswers.includeCreateExpoComponents,
    usesExpoUi,
    usesExpoUiUniversalComponents:
      currentAnswers.usesExpoUiUniversalComponents ??
      (usesExpoUi ? onboardAnswers.usesExpoUiUniversalComponents : false),
    usesExpoNativeTabs: currentAnswers.usesExpoNativeTabs ?? onboardAnswers.usesExpoNativeTabs,
    easUses: currentAnswers.easUses ?? onboardAnswers.easUses,
    guidelinesTemplate: currentAnswers.guidelinesTemplate ?? true,
    dataStart: currentAnswers.dataStart ?? onboardAnswers.dataStart,
    testToMainSafeguards:
      currentAnswers.testToMainSafeguards ?? onboardAnswers.testToMainSafeguards,
    saveDefaults: currentAnswers.saveDefaults ?? false,
  };
}

function buildOnboardArgvFromCess(
  parentDir: string,
  appName: string,
  answers: Partial<CessIntakeAnswers> | CessIntakeAnswers
): OnboardArgv {
  const screens = normalizeOptionalDeferText(answers.screens);
  const dataNeeds = formatDataNeedsSelection(
    answers.dataNeedSelections ?? ['Local UI/app state'],
    normalizeText(answers.dataNeedsOther)
  );
  const targetPlatforms = normalizePlatforms(answers.targetPlatforms) ?? ['web', 'ios', 'android'];
  const webOutput =
    answers.webOutput ?? ((targetPlatforms.includes('web') ? 'static' : 'none') as OnboardAnswers['webOutput']);
  const expoServerAdapter = answers.expoServerAdapter ?? 'none';
  const customBackend = answers.customBackend ?? false;

  return {
    project: path.resolve(parentDir, appName),
    yes: true,
    appName: normalizeText(answers.displayAppName) ?? displayNameFromProjectName(appName),
    generatorScriptLanguage: answers.scriptLanguage,
    generatorPackageManager: answers.packageManager,
    generatorNavigationLibrary: answers.navigationLibrary,
    generatorReactNavigationLayout: answers.reactNavigationLayout,
    generatorStylingSystem: answers.stylingSystem,
    generatorStateManagement: answers.stateManagement,
    generatorAuthBackend: answers.authBackend,
    generatorEasSetup: answers.easSetup,
    audience: normalizeText(answers.audience),
    coreFlows: normalizeText(answers.coreFlows),
    screens,
    dataNeeds,
    deploymentTarget: normalizeText(answers.deploymentTarget),
    createExpoComponents: answers.includeCreateExpoComponents,
    platforms: targetPlatforms,
    firstPlatform: normalizeText(answers.firstTargetPlatform),
    platformStrategy: answers.platformStrategy,
    appDirectory: answers.appDirectory,
    platformLayouts: answers.platformLayouts,
    webOutput,
    expoServerAdapter,
    customBackend,
    customBackendEntry: normalizeText(answers.customBackendEntry),
    deployedServer: deriveDeployedServer(
      webOutput,
      expoServerAdapter,
      customBackend,
      undefined
    ),
    expoUi: answers.usesExpoUi,
    expoUiUniversal: answers.usesExpoUiUniversalComponents,
    expoNativeTabs: answers.usesExpoNativeTabs,
    easSelected: answers.easSetup,
    easUses: answers.easUses,
    guidelinesTemplate: answers.guidelinesTemplate,
    dataStart: answers.dataStart,
    testToMain: answers.testToMainSafeguards,
    saveDefaults: answers.saveDefaults,
    defaults: buildOnboardDefaultsFromCessAnswers(answers),
  };
}

function buildOnboardDefaultsFromCessAnswers(
  answers: Partial<CessIntakeAnswers> | CessIntakeAnswers
): string {
  const defaults = new Set<string>(['project-docs', 'guidelines']);
  switch (answers.stylingSystem) {
    case 'nativewindui':
      defaults.add('nativewindui');
      break;
    case 'nativewind':
      defaults.add('nativewind');
      break;
    case 'tamagui':
      defaults.add('tamagui');
      break;
    case 'restyle':
      defaults.add('restyle');
      break;
    case 'stylesheet':
      break;
    case 'uniwind':
    default:
      defaults.add('uniwind');
      break;
  }
  if (answers.dataStart === 'supabase' || answers.authBackend === 'supabase') {
    defaults.add('supabase');
  }
  defaults.add('doctor');
  if (answers.testToMainSafeguards ?? true) {
    defaults.add('test-to-main');
  }
  return [...defaults].join(',');
}

function materializeQuestion(
  definition: CessQuestionDefinition,
  context: CessQuestionContext
): CessIntakeQuestion {
  return {
    id: definition.id,
    prompt: definition.prompt,
    kind: definition.kind,
    options: definition.options?.(context),
    defaultValue: definition.defaultValue?.(context),
    explanation: definition.explanation,
  };
}

function findNextQuestion(
  context: CessQuestionContext,
  answers: Partial<CessIntakeAnswers>,
  root: { parentDirProvided?: string; appNameProvided?: string }
): CessIntakeQuestion | null {
  for (const definition of CESS_QUESTIONS) {
    if (definition.shouldAsk && !definition.shouldAsk(context)) {
      continue;
    }
    if (!isQuestionMissing(definition.id, answers, root)) {
      continue;
    }
    return materializeQuestion(definition, context);
  }
  return null;
}

function isQuestionMissing(
  id: keyof CessIntakeAnswers | 'parentDir' | 'appName',
  answers: Partial<CessIntakeAnswers>,
  root: { parentDirProvided?: string; appNameProvided?: string }
): boolean {
  if (id === 'parentDir') {
    return !root.parentDirProvided;
  }
  if (id === 'appName') {
    return !root.appNameProvided;
  }

  const value = answers[id];
  if (typeof value === 'boolean') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return typeof value !== 'string' || value.trim().length === 0;
}

function normalizeParentDir(parentDir: string | undefined, cwd: string): string {
  return path.resolve(cwd, normalizeText(parentDir) ?? '.');
}

function normalizeProjectName(appName: string | undefined): string {
  return slugifyAppName(appName) ?? DEFAULT_PROJECT_NAME;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeEnum<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : undefined;
}

function normalizeChoice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return normalizeEnum(value, choices);
}

function normalizePlatformStrategyValue(value: unknown): OnboardAnswers['platformFileStrategy'] | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'folders' || normalized.includes('folder')) {
    return 'folders';
  }
  if (normalized === 'files-only' || normalized.includes('file')) {
    return 'files-only';
  }
  return undefined;
}

function normalizeAppDirectoryValue(value: unknown): OnboardAnswers['appDirectory'] | undefined {
  const normalized = normalizeText(value)?.toLowerCase().replace(/[`]/gu, '').trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'src' || normalized === 'src/app') {
    return 'src';
  }
  if (normalized === 'root' || normalized === 'app') {
    return 'root';
  }
  return undefined;
}

function normalizePlatformLayoutsValue(value: unknown): OnboardAnswers['platformLayoutMode'] | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'shared' || normalized.includes('shared')) {
    return 'shared';
  }
  if (normalized === 'platform-specific' || normalized.includes('platform-specific')) {
    return 'platform-specific';
  }
  return undefined;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalDeferText(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized || normalized.toLowerCase() === 'defer') {
    return undefined;
  }
  return normalized;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizePlatforms(value: unknown): string[] | undefined {
  const platforms = normalizeStringArray(value);
  if (!platforms) {
    return undefined;
  }
  const normalized = platforms.filter((item) =>
    PLATFORM_OPTIONS.includes(item as (typeof PLATFORM_OPTIONS)[number])
  );
  return normalized.length > 0 ? normalized : undefined;
}

function formatPlatformLabel(value: string): string {
  if (value === 'ios') {
    return 'iOS';
  }
  if (value === 'apple-tv') {
    return 'Apple TV';
  }
  if (value === 'android-tv') {
    return 'Android TV';
  }
  return formatTitle(value);
}

function formatTitle(value: string): string {
  return value
    .split(/[\s-]+/u)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
}

function formatStylingLabel(value: CessStylingSystem): string {
  switch (value) {
    case 'uniwind':
      return 'Uniwind';
    case 'nativewind':
      return 'NativeWind';
    case 'nativewindui':
      return 'NativeWindUI';
    case 'tamagui':
      return 'Tamagui';
    case 'restyle':
      return 'Restyle';
    case 'stylesheet':
      return 'StyleSheet only';
  }
}

function quoteFlagValue(value: string): string {
  return value;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function hasMobileTarget(platforms: string[] | undefined): boolean {
  return (platforms ?? []).some((platform) => platform === 'ios' || platform === 'android');
}

function buildDataNeedsFlagValue(answers: CessIntakeAnswers): string {
  const selections = (answers.dataNeedSelections ?? ['Local UI/app state']).filter(
    (item) => item !== OTHER_DATA_NEEDS
  );
  const custom = normalizeText(answers.dataNeedsOther);
  if (custom) {
    return [...selections, custom].join(', ');
  }
  return selections.join(', ');
}
