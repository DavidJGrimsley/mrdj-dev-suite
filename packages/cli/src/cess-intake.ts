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
  useLatestExpoSdk?: boolean;
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

interface CessQuestionContext {
  parentDir: string;
  appName: string;
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
    prompt: 'What should the new Expo app folder be named?',
    kind: 'text',
    defaultValue: (context) => context.appName,
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
    prompt: 'Set up EAS in the generated starter now?',
    kind: 'single-select',
    options: () => [
      { value: false, label: 'No', hint: 'Default' },
      { value: true, label: 'Yes' },
    ],
    defaultValue: () => STACK_DEFAULTS.easSetup,
  },
  {
    id: 'displayAppName',
    prompt: 'What display app name should MDS use in project memory?',
    kind: 'text',
    defaultValue: (context) => context.onboardAnswers.appName,
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
    id: 'useLatestExpoSdk',
    prompt: 'Use the latest Expo SDK even if Expo Go availability may lag?',
    kind: 'single-select',
    options: () => [
      { value: true, label: 'Yes', hint: 'Default' },
      { value: false, label: 'No' },
    ],
    defaultValue: (context) => context.onboardAnswers.useLatestExpoSdk,
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
  const currentAnswers = normalizeCessIntakeAnswers(input.answers);
  const resolvedPlan = resolveCessPlan({
    parentDir,
    appName,
    answers: currentAnswers,
    cwd,
  });
  const context: CessQuestionContext = {
    parentDir,
    appName,
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
  const projectPath = path.resolve(parentDir, appName);
  const currentAnswers = normalizeCessIntakeAnswers(input.answers);
  const onboardArgv = buildOnboardArgvFromCess(parentDir, appName, currentAnswers);
  const onboardPlan = defaultOnboardPlan(onboardArgv, projectPath);
  const answers = buildResolvedCessAnswers(currentAnswers, parentDir, appName, onboardPlan.answers);
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
  normalized.platformStrategy = normalizeEnum(answers.platformStrategy, ['folders', 'files-only']);
  normalized.appDirectory = normalizeEnum(answers.appDirectory, ['src', 'root']);
  normalized.platformLayouts = normalizeEnum(answers.platformLayouts, ['shared', 'platform-specific']);
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
  normalized.useLatestExpoSdk = normalizeBoolean(answers.useLatestExpoSdk);
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
  if (answers.easSetup) {
    flags.push('--eas');
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
  if (onboardAnswers.useLatestExpoSdk) {
    flags.push('--mds-latest-expo-sdk');
  } else {
    flags.push('--mds-no-latest-expo-sdk');
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
    answers.easSetup ? 'EAS starter enabled' : 'No EAS starter',
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
    `app: ${appName} at ${parentDir}`,
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
    displayAppName: currentAnswers.displayAppName ?? onboardAnswers.appName ?? appName,
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
    useLatestExpoSdk: currentAnswers.useLatestExpoSdk ?? onboardAnswers.useLatestExpoSdk,
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
    appName: normalizeText(answers.displayAppName) ?? appName,
    audience: normalizeText(answers.audience),
    coreFlows: normalizeText(answers.coreFlows),
    screens,
    dataNeeds,
    deploymentTarget: normalizeText(answers.deploymentTarget),
    createExpoComponents: answers.includeCreateExpoComponents,
    latestExpoSdk: answers.useLatestExpoSdk,
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
  };
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
  return normalizeText(appName) ?? DEFAULT_PROJECT_NAME;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeEnum<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : undefined;
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
