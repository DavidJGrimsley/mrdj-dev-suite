import { access } from 'node:fs/promises';
import path from 'node:path';

import { cancel, intro, isCancel, log, multiselect, note, outro, select, text } from '@clack/prompts';
import chalk from 'chalk';

import { scaffoldProjectMemory } from '../project-memory.js';

import type { OnboardAnswers } from '../project-memory.js';
import type { Option } from '@clack/prompts';

export interface OnboardArgv {
  project?: string;
  yes?: boolean;
  force?: boolean;
  guidelinesTemplate?: boolean;
  guidelinesTemplatePath?: string;
  rich?: boolean;
  appName?: string;
  audience?: string;
  coreFlows?: string;
  dataNeeds?: string;
  deploymentTarget?: string;
  defaults?: string | string[];
  advancedSetup?: boolean;
  createExpoComponents?: boolean;
  latestExpoSdk?: boolean;
  platforms?: string | string[];
  firstPlatform?: string;
  platformStrategy?: 'folders' | 'files-only';
  webOutput?: 'static' | 'server' | 'spa' | 'none';
  deployedServer?: 'standard-expo' | 'custom' | 'none';
  expoUi?: boolean;
  expoNativeTabs?: boolean;
  easSelected?: boolean;
  easUses?: string | string[];
  dataStart?: 'local' | 'supabase';
  testToMain?: boolean;
}

export interface OnboardPlan {
  answers: OnboardAnswers;
  guidelinesTemplate: boolean;
  guidelinesTemplatePath?: string;
  richBoilerplate: boolean;
}

type ExplainChoice = typeof EXPLAIN_CHOICE;
type ServerChoice = OnboardAnswers['deployedServer'];

export interface ServerPromptPlan {
  message: string;
  defaultValue: ServerChoice;
  shouldAsk: boolean;
  choices: ServerChoice[];
  explanation: string;
}

const EXPLAIN_CHOICE = '__mrdj_explain__';
const PLATFORM_OPTIONS = ['web', 'android', 'ios', 'apple-tv'] as const;
const EAS_USE_OPTIONS = [
  'building mobile applications',
  'hosting a deployed server',
  'hosting web apps',
  'publishing mobile applications',
] as const;
export const OTHER_DATA_NEEDS = '__mrdj_other_data_needs__';
export const DATA_NEED_OPTIONS = [
  'Local UI/app state',
  'User accounts/authentication',
  'Backend database records',
  'File/image uploads or storage',
  'External APIs/integrations',
  'Analytics/events',
  'Payments/subscriptions',
  'Realtime/collaboration',
  'Push/email notifications',
  'Offline sync/cache',
  'Admin/moderation tools',
] as const;

type DataNeedChoice = (typeof DATA_NEED_OPTIONS)[number];

export const PROJECT_INFO_EXPLANATION =
  'project/info.md is the product brief for the app: purpose, users, goals, features, data, platforms, monetization, team context, release plan, and open questions. Agents use it to avoid guessing what to build.';
export const PROJECT_STYLE_EXPLANATION =
  'project/style.md is only for visual direction: brand references, colors, typography, spacing, motion, accessibility, and style questions. Technical rules belong in project/guidelines.md.';
export const DATA_START_EXPLANATION =
  'Local dummy data is fastest for early UI work. Supabase from the start is better when auth, synced data, storage, or real backend tables are already central to the product.';
export const EAS_EXPLANATION =
  'EAS is Expo Application Services. You might use it for cloud native builds, app store submission, update channels, or hosting. This question records future intent; it does not set EAS up.';
export const TEST_TO_MAIN_EXPLANATION =
  'Test-to-main means feature branches merge into a test branch first, using staging data and PR checks. Only validated work is promoted from test to main/production.';
export const SERVER_OUTPUT_EXPLANATION =
  'Expo Router API routes require Expo web output set to server. Static and SPA exports can still call Supabase, external APIs, serverless functions, or a separate custom backend, but they cannot host Expo Router API routes inside the static export.';
export const AGENT_DERIVED_CORE_FLOWS =
  'Agent should derive the first core user flows from project/info.md during intake.';
export const SUPER_STACK_ONBOARDING_INTRO = 'Super Stack onboarding by Mr. DJ';
export const SUPER_STACK_ONBOARDING_NOTE_TITLE = "Let's plan the app";
export const SUPER_STACK_ONBOARDING_NOTE =
  'We will spend time defining the application and business now so the generated project memory gives agents real context.';
export const SUPER_STACK_SUCCESS_MESSAGE =
  "You did it! You and your app are set up for success by completing this extensive onboarding. You're amazing. Mr. DJ thanks you for using this tool and any feedback can be given at MrDJ@DavidJGrimsley.com or by raising an issue on Github at github.com/mrdj-dev-suite/issues.";
const CHECKBOX_PROMPT_HINT = 'Use Space to select options, then Enter to continue.';

export async function runOnboardCommand(argv: OnboardArgv): Promise<void> {
  const projectPath = path.resolve(argv.project ?? '.');
  const plan = argv.yes
    ? defaultOnboardPlan(argv, projectPath)
    : await collectOnboardPlan(argv, projectPath);
  const written = await scaffoldProjectMemory(projectPath, plan.answers, {
    force: Boolean(argv.force),
    guidelinesTemplate: plan.guidelinesTemplate,
    guidelinesTemplatePath: plan.guidelinesTemplatePath,
    richBoilerplate: plan.richBoilerplate,
  });

  console.log(chalk.bold('mrdj onboard'));
  console.log(chalk.dim(projectPath));
  console.log();
  for (const result of written) {
    console.log(`${result.wrote ? chalk.green('CREATED') : chalk.gray('KEPT')} ${result.filePath}`);
  }
  console.log();
  console.log('Selected defaults:', plan.answers.defaults.join(', '));
  printOnboardingNextSteps();
}

export async function collectOnboardPlan(
  argv: OnboardArgv,
  projectPath = path.resolve(argv.project ?? '.')
): Promise<OnboardPlan> {
  const seed = defaultAnswers(argv, projectPath);

  intro(SUPER_STACK_ONBOARDING_INTRO);
  note(SUPER_STACK_ONBOARDING_NOTE, SUPER_STACK_ONBOARDING_NOTE_TITLE);

  const projectInfoReady = await askProjectMemoryReadiness(projectPath, 'info.md');
  const projectStyleReady = await askProjectMemoryReadiness(projectPath, 'style.md');
  log.success('Project memory is queued up. Nice start.');

  const appName = argv.appName ?? (await askText('What is the app name?', seed.appName));
  const audience =
    argv.audience ??
    (await askText(
      'Who is this app for? Include user type, demographic, role, or context if you know it.',
      seed.audience
    ));
  log.success('Great, the agent has a real audience now. Halfway there soon.');

  const coreFlows =
    argv.coreFlows ??
    (await askText(
      'If you know it already, what should users be able to do first? Examples: sign up, create a project, invite teammates, checkout. Press Enter to let the agent derive this later.',
      seed.coreFlows
    ));
  const dataNeeds =
    argv.dataNeeds ??
    (await askDataNeeds(seed.dataNeeds));

  const targetPlatforms = await askTargetPlatforms(argv, seed.targetPlatforms);
  const firstTargetPlatform =
    argv.firstPlatform && targetPlatforms.includes(argv.firstPlatform)
      ? argv.firstPlatform
      : await askChoice('Which selected platform should be the first MVP target?', toOptions(targetPlatforms), seed.firstTargetPlatform);
  const platformFileStrategy =
    targetPlatforms.length > 1
      ? await askChoice(
          'When platforms diverge, how should platform-specific code be organized?',
          [
            { value: 'files-only' as const, label: 'File suffixes only', hint: 'Example: screen.web.tsx' },
            { value: 'folders' as const, label: 'Platform folders', hint: 'Use when platform code gets larger' },
          ],
          seed.platformFileStrategy
        )
      : seed.platformFileStrategy;
  const webOutput = targetPlatforms.includes('web')
    ? await askChoice(
        'For web output, choose the mode that fits the app.',
        [
          { value: 'static' as const, label: 'Static', hint: 'Best for most marketing/content/app-shell web exports' },
          { value: 'server' as const, label: 'Server', hint: 'Use Expo Router server output/API routes' },
          { value: 'spa' as const, label: 'SPA', hint: 'Single-page web app behavior' },
        ],
        seed.webOutput === 'none' ? 'static' : seed.webOutput
      )
    : 'none';

  const serverPrompt = getServerPrompt(webOutput, targetPlatforms.some((platform) => platform !== 'web'), seed.deployedServer);
  const deployedServer = serverPrompt.shouldAsk
    ? await askExplainedChoice(
        serverPrompt.message,
        toServerOptions(serverPrompt.choices),
        serverPrompt.defaultValue,
        serverPrompt.explanation
      )
    : 'none';

  const deploymentTarget =
    argv.deploymentTarget ??
    (await askText(
      'How will the first version reach its users? Examples: TestFlight to friends, internal client demo, App Store / Play Store launch, web hosting, side-loaded APK, internal-only.',
      seed.deploymentTarget
    ));
  log.success('Product context captured. Just a few more questions.');

  const hasMobileTarget = targetPlatforms.some((platform) => ['android', 'ios'].includes(platform));
  const includeCreateExpoComponents =
    argv.createExpoComponents ??
    (await askYesNo(
      'Keep or generate the starter components that come with create-expo-app?',
      seed.includeCreateExpoComponents
    ));
  const useLatestExpoSdk =
    argv.latestExpoSdk ??
    (await askYesNo(
      'Use the latest Expo SDK even if Expo Go availability may lag?',
      seed.useLatestExpoSdk
    ));
  const usesExpoUi =
    hasMobileTarget &&
    (argv.expoUi ?? (await askYesNo('Will you use Expo UI for native-feeling screens?', seed.usesExpoUi)));
  const usesExpoNativeTabs =
    hasMobileTarget &&
    (argv.expoNativeTabs ??
      (await askYesNo('Will you use Expo Native Tabs?', seed.usesExpoNativeTabs)));

  const easSelected = await askEasIntent(argv, seed.easUses.length > 0);
  const easUses = easSelected
    ? parseList(
        argv.easUses,
        await askMultiSelect('Which EAS uses should the roadmap remember?', EAS_USE_OPTIONS, seed.easUses)
      )
    : [];
  log.success('Platform and release context are in place. Almost done.');

  const guidelinesTemplate =
    argv.guidelinesTemplate ??
    (await askYesNo('Use the bundled MrDJ project/guidelines.md template?', true));
  const dataStart =
    argv.dataStart ??
    (await askExplainedChoice(
      'Would you like to start with local dummy data or go straight to Supabase?',
      [
        { value: 'local' as const, label: 'Local dummy data', hint: 'Fastest for early UI and flow work' },
        { value: 'supabase' as const, label: 'Supabase', hint: 'Use when backend/auth is already central' },
      ],
      seed.dataStart,
      DATA_START_EXPLANATION
    ));
  const testToMainSafeguards =
    argv.testToMain ??
    (await askYesNoWithExplain(
      'Use test-to-main safeguards for this project?',
      seed.testToMainSafeguards,
      TEST_TO_MAIN_EXPLANATION
    ));
  const defaults = deriveDefaults(argv.defaults, seed.defaults, dataStart, testToMainSafeguards);
  const advancedPackageSetup = argv.advancedSetup ?? true;

  outro(SUPER_STACK_SUCCESS_MESSAGE);

  return {
    answers: {
      appName,
      audience,
      coreFlows,
      dataNeeds,
      deploymentTarget,
      advancedPackageSetup,
      includeCreateExpoComponents,
      useLatestExpoSdk,
      targetPlatforms,
      firstTargetPlatform,
      platformFileStrategy,
      webOutput,
      deployedServer,
      usesExpoUi,
      usesExpoNativeTabs,
      easUses,
      projectInfoReady,
      projectStyleReady,
      dataStart,
      testToMainSafeguards,
      defaults,
    },
    guidelinesTemplate,
    guidelinesTemplatePath: argv.guidelinesTemplatePath,
    richBoilerplate: argv.rich ?? advancedPackageSetup,
  };
}

export function defaultOnboardPlan(argv: OnboardArgv, projectPath = path.resolve(argv.project ?? '.')): OnboardPlan {
  const answers = defaultAnswers(argv, projectPath);
  return {
    answers,
    guidelinesTemplate: argv.guidelinesTemplate ?? true,
    guidelinesTemplatePath: argv.guidelinesTemplatePath,
    richBoilerplate: argv.rich ?? answers.advancedPackageSetup,
  };
}

export function validateRequiredInput(value: string, visibleDefault?: string): string | undefined {
  if (value.trim() || visibleDefault) {
    return undefined;
  }

  return 'Please enter a value, or choose an option with a visible default.';
}

export function getServerPrompt(
  webOutput: OnboardAnswers['webOutput'],
  hasNativeTarget: boolean,
  fallback: ServerChoice
): ServerPromptPlan {
  if (webOutput === 'server') {
    return {
      message: 'What type of server will this app be using?',
      defaultValue: fallback === 'none' ? 'standard-expo' : fallback,
      shouldAsk: true,
      choices: ['standard-expo', 'custom', 'none'],
      explanation:
        'A deployed server means something beyond static app files: Expo Router API routes, server rendering, background jobs, custom backend services, or hosted logic.',
    };
  }

  if (hasNativeTarget) {
    return {
      message: 'Will this app require a separate deployed backend?',
      defaultValue: fallback === 'custom' ? 'custom' : 'none',
      shouldAsk: true,
      choices: ['custom', 'none'],
      explanation: SERVER_OUTPUT_EXPLANATION,
    };
  }

  return {
    message: 'No deployed server question needed.',
    defaultValue: 'none',
    shouldAsk: false,
    choices: ['none'],
    explanation: SERVER_OUTPUT_EXPLANATION,
  };
}

export function deriveDefaults(
  rawDefaults: string | string[] | undefined,
  fallback: string[],
  dataStart: OnboardAnswers['dataStart'],
  testToMainSafeguards: boolean
): string[] {
  const selected = new Set(parseDefaults(rawDefaults, fallback));
  selected.add('project-docs');
  selected.add('guidelines');
  selected.add('doctor');
  if (dataStart === 'supabase') {
    selected.add('supabase');
  }
  if (testToMainSafeguards) {
    selected.add('test-to-main');
  }
  return Array.from(selected);
}

export function formatDataNeedsSelection(selected: string[], customNotes?: string): string {
  const needs = selected.filter((item) => item !== OTHER_DATA_NEEDS);
  const lines = needs.map((item) => `- ${item}`);
  const trimmedCustomNotes = customNotes?.trim();
  if (trimmedCustomNotes) {
    lines.push(`- Other/custom notes: ${trimmedCustomNotes}`);
  }

  return lines.length > 0 ? lines.join('\n') : '- Local UI/app state';
}

function defaultAnswers(argv: OnboardArgv, projectPath = path.resolve(argv.project ?? '.')): OnboardAnswers {
  const targetPlatforms = parsePlatforms(argv.platforms, ['web', 'ios', 'android']);
  const firstTargetPlatform =
    argv.firstPlatform && targetPlatforms.includes(argv.firstPlatform) ? argv.firstPlatform : targetPlatforms[0] ?? 'web';
  const easUses = parseList(argv.easUses, []);
  const dataStart = argv.dataStart ?? 'local';
  const testToMainSafeguards = argv.testToMain ?? true;
  const webOutput = argv.webOutput ?? (targetPlatforms.includes('web') ? 'static' : 'none');
  const deployedServer = normalizeDeployedServerChoice(
    argv.deployedServer,
    webOutput,
    targetPlatforms.some((platform) => platform !== 'web')
  );

  return {
    appName: argv.appName ?? path.basename(projectPath),
    audience: argv.audience ?? 'Expo app users',
    coreFlows: argv.coreFlows ?? AGENT_DERIVED_CORE_FLOWS,
    dataNeeds: argv.dataNeeds ?? 'Local state first; add backend only when needed',
    deploymentTarget: argv.deploymentTarget ?? 'Expo web/native deployment',
    advancedPackageSetup: argv.advancedSetup ?? true,
    includeCreateExpoComponents: argv.createExpoComponents ?? false,
    useLatestExpoSdk: argv.latestExpoSdk ?? true,
    targetPlatforms,
    firstTargetPlatform,
    platformFileStrategy: argv.platformStrategy ?? 'files-only',
    webOutput,
    deployedServer,
    usesExpoUi: argv.expoUi ?? true,
    usesExpoNativeTabs: argv.expoNativeTabs ?? true,
    easUses,
    projectInfoReady: false,
    projectStyleReady: false,
    dataStart,
    testToMainSafeguards,
    defaults: deriveDefaults(argv.defaults, ['project-docs', 'guidelines', 'uniwind', 'doctor'], dataStart, testToMainSafeguards),
  };
}

function normalizeDeployedServerChoice(
  value: ServerChoice | undefined,
  webOutput: OnboardAnswers['webOutput'],
  hasNativeTarget: boolean
): ServerChoice {
  if (webOutput === 'server') {
    return value ?? 'standard-expo';
  }

  if (hasNativeTarget && value === 'custom') {
    return 'custom';
  }

  return 'none';
}

async function askProjectMemoryReadiness(
  projectPath: string,
  fileName: 'info.md' | 'style.md'
): Promise<boolean> {
  const filePath = path.join(projectPath, 'project', fileName);
  const exists = await fileExists(filePath);
  const explanation = fileName === 'info.md' ? PROJECT_INFO_EXPLANATION : PROJECT_STYLE_EXPLANATION;

  if (!exists) {
    for (;;) {
      const answer = await askChoice(
        `project/${fileName} is missing. How should we handle it?`,
        [
          { value: 'create' as const, label: 'Create a starter file for me' },
          { value: 'recheck' as const, label: 'I added it; check again' },
          { value: EXPLAIN_CHOICE, label: 'Explain this' },
        ],
        'create'
      );

      if (answer === 'create') {
        log.success(`No problem, Mr. DJ's Super-Stack will create project/${fileName} from a template.`);
        return false;
      }
      if (answer === 'recheck' && (await fileExists(filePath))) {
        log.success(`Found project/${fileName}. We will normalize it safely.`);
        return true;
      }
      if (answer === 'recheck') {
        log.warn(`Still cannot find project/${fileName}.`);
      }
      note(explanation, `What is project/${fileName}?`);
    }
  }

  return askYesNoWithExplain(
    `Use existing project/${fileName} as intake context and normalize it?`,
    true,
    explanation
  );
}

async function askTargetPlatforms(argv: OnboardArgv, fallback: string[]): Promise<string[]> {
  if (argv.platforms) {
    return parsePlatforms(argv.platforms, fallback);
  }

  const selected = await askMultiSelect(
    'Which platforms will this app target?',
    PLATFORM_OPTIONS,
    fallback
  );
  return selected.length > 0 ? selected : ['web'];
}

async function askDataNeeds(fallback: string): Promise<string> {
  const selected = await multiselect<DataNeedChoice | typeof OTHER_DATA_NEEDS>({
    message: checkboxPromptMessage('Which data categories does the app need?'),
    options: [
      ...DATA_NEED_OPTIONS.map((need) => ({ value: need, label: need })),
      {
        value: OTHER_DATA_NEEDS,
        label: 'Other/custom notes',
        hint: 'Add something this list missed',
      },
    ] as Option<DataNeedChoice | typeof OTHER_DATA_NEEDS>[],
    initialValues: ['Local UI/app state'],
    required: true,
  });
  const selectedNeeds = Array.from(handleCancel(selected));
  const customNotes = selectedNeeds.includes(OTHER_DATA_NEEDS)
    ? await askText('What other data needs should MrDJ remember?', fallback)
    : undefined;
  return formatDataNeedsSelection(selectedNeeds, customNotes);
}

async function askEasIntent(argv: OnboardArgv, fallback: boolean): Promise<boolean> {
  if (argv.easSelected === true) {
    log.success("EAS setup was detected, so Mr. DJ's Super-Stack will remember EAS in the roadmap.");
    return true;
  }

  if (argv.easSelected === false) {
    return askYesNoWithExplain('Will you use EAS for this project? (not setup yet)', fallback, EAS_EXPLANATION);
  }

  return askYesNoWithExplain('Will you use EAS for this project? (not setup yet)', fallback, EAS_EXPLANATION);
}

async function askText(message: string, fallback: string): Promise<string> {
  const answer = await text({
    message,
    placeholder: fallback,
    defaultValue: fallback,
    validate: (value) => validateRequiredInput(value, fallback),
  });
  return handleCancel(answer).trim() || fallback;
}

async function askYesNo(message: string, fallback: boolean): Promise<boolean> {
  const answer = await select<boolean>({
    message,
    options: [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ] satisfies Option<boolean>[],
    initialValue: fallback,
  });
  return handleCancel(answer);
}

async function askYesNoWithExplain(message: string, fallback: boolean, explanation: string): Promise<boolean> {
  for (;;) {
    const answer = await select<boolean | ExplainChoice>({
      message,
      options: [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
        { value: EXPLAIN_CHOICE, label: 'Explain this' },
      ] satisfies Option<boolean | ExplainChoice>[],
      initialValue: fallback,
    });
    const selected = handleCancel(answer);
    if (selected !== EXPLAIN_CHOICE) {
      return selected;
    }
    note(explanation, 'Explanation');
  }
}

async function askChoice<T extends string | boolean>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>,
  fallback: T
): Promise<T> {
  const answer = await select<T>({
    message,
    options: options as Option<T>[],
    initialValue: fallback,
  });
  return handleCancel(answer);
}

async function askExplainedChoice<T extends string>(
  message: string,
  options: Array<{ value: T; label: string; hint?: string }>,
  fallback: T,
  explanation: string
): Promise<T> {
  for (;;) {
    const answer = await select<T | ExplainChoice>({
      message,
      options: [...options, { value: EXPLAIN_CHOICE, label: 'Explain this' }] as Option<T | ExplainChoice>[],
      initialValue: fallback,
    });
    const selected = handleCancel(answer);
    if (selected !== EXPLAIN_CHOICE) {
      return selected;
    }
    note(explanation, 'Explanation');
  }
}

async function askMultiSelect<T extends string>(
  message: string,
  choices: readonly T[],
  fallback: string[]
): Promise<string[]> {
  const initialValues = fallback.filter((item): item is T => choices.includes(item as T));
  const answer = await multiselect<T>({
    message: checkboxPromptMessage(message),
    options: choices.map((choice) => ({ value: choice, label: formatOptionLabel(choice) })) as Option<T>[],
    initialValues,
    required: true,
  });
  return Array.from(handleCancel(answer));
}

function checkboxPromptMessage(message: string): string {
  return `${message} ${CHECKBOX_PROMPT_HINT}`;
}

function handleCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Cancelled. You can rerun onboarding whenever you are ready.');
    process.exit(0);
  }

  return value;
}

function printOnboardingNextSteps(): void {
  console.log('Onboarding next steps:');
  console.log('1. Play with styling in the style-guide page.');
  console.log('2. Browse exposition pages to understand included base packages.');
  console.log('3. Review project/ files for accuracy and planning adjustments.');
  console.log('4. Tell the agent to commence development phase by phase.');
  console.log('Then run mrdj doctor --ci, or use mrdj clear-expo-start when Metro gets stuck.');
}

function toOptions(values: string[]): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: formatOptionLabel(value) }));
}

function toServerOptions(values: ServerChoice[]): Array<{ value: ServerChoice; label: string; hint?: string }> {
  return values.map((value) => {
    switch (value) {
      case 'standard-expo':
        return {
          value,
          label: 'Standard Expo server/API routes',
          hint: 'Requires Expo web output set to Server',
        };
      case 'custom':
        return {
          value,
          label: 'Separate custom backend',
          hint: 'Supabase, serverless functions, Node server, Rails, etc.',
        };
      case 'none':
        return {
          value,
          label: 'No deployed server',
        };
    }
  });
}

function formatOptionLabel(value: string): string {
  if (value === 'ios') {
    return 'iOS';
  }
  if (value === 'apple-tv') {
    return 'Apple TV';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseDefaults(value: string | string[] | undefined, fallback: string[]): string[] {
  return parseList(value, fallback);
}

function parseList(value: string | string[] | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  const raw = Array.isArray(value) ? value : value.split(',');
  const parsed = raw.map((item) => item.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function parsePlatforms(value: string | string[] | undefined, fallback: string[]): string[] {
  const parsed = parseList(value, fallback);
  return parsed.filter((platform) => PLATFORM_OPTIONS.includes(platform as (typeof PLATFORM_OPTIONS)[number]));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
