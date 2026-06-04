import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_STYLIST_THEME,
  renderGlobalCssThemeBlock,
  renderThemeTokensFile,
} from './stylist-theme.js';

export type DataStart = 'local' | 'supabase';
export type AppDirectory = 'src' | 'root';
export type PlatformLayoutMode = 'shared' | 'platform-specific';
export type ExpoServerAdapter = 'eas' | 'express' | 'bun' | 'other' | 'none';

export interface OnboardAnswers {
  appName: string;
  audience: string;
  coreFlows: string;
  screens?: string;
  dataNeeds: string;
  deploymentTarget: string;
  advancedPackageSetup: boolean;
  includeCreateExpoComponents: boolean;
  useLatestExpoSdk: boolean;
  targetPlatforms: string[];
  firstTargetPlatform: string;
  platformFileStrategy: 'folders' | 'files-only';
  webOutput: 'static' | 'server' | 'spa' | 'none';
  deployedServer: 'standard-expo' | 'custom' | 'none';
  expoServerAdapter: ExpoServerAdapter;
  customBackend: boolean;
  customBackendEntry: string;
  usesExpoUi: boolean;
  usesExpoUiUniversalComponents: boolean;
  usesExpoNativeTabs: boolean;
  easUses: string[];
  projectInfoReady: boolean;
  projectStyleReady: boolean;
  appDirectory: AppDirectory;
  platformLayoutMode: PlatformLayoutMode;
  dataStart: DataStart;
  testToMainSafeguards: boolean;
  defaults: string[];
}

export interface ProjectScaffoldOptions {
  force?: boolean;
  guidelinesTemplate?: boolean;
  guidelinesTemplatePath?: string;
  manageUniwind?: boolean;
  richBoilerplate?: boolean;
}

export interface WriteResult {
  filePath: string;
  wrote: boolean;
}

interface PackageJson {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface RichBoilerplateOptions {
  manageUniwind: boolean;
}
type NavigationLibrary = 'expo-router' | 'react-navigation';
type NavigationLayout = 'stack' | 'tabs' | 'drawer + tabs';

interface NavigationShell {
  library: NavigationLibrary;
  layout: NavigationLayout;
}

const SOFTWARE_MANSION_CORE_DEPENDENCIES = {
  'react-native-gesture-handler': '~2.30.0',
  'react-native-reanimated': '4.3.1',
  'react-native-screens': '~4.25.2',
  'react-native-svg': '15.15.4',
  'react-native-keyboard-controller': '1.21.6',
  'react-native-worklets': '0.8.3',
} as const;

const LOCAL_DATA_DEPENDENCIES = {
  'expo-sqlite': '~56.0.4',
} as const;

const SUPABASE_DEPENDENCIES = {
  '@react-native-async-storage/async-storage': '2.2.0',
  '@supabase/supabase-js': '^2.105.4',
} as const;

const UNIWIND_DEPENDENCIES = {
  uniwind: '^1.6.4',
} as const;

const STYLIST_DEPENDENCIES = {
  '@react-native-async-storage/async-storage': '2.2.0',
  'reanimated-color-picker': '^4.2.0',
} as const;

const EXPO_UI_DEPENDENCIES = {
  '@expo/ui': '~56.0.14',
} as const;

const ANDROID_NAVIGATION_BAR_DEPENDENCIES = {
  'expo-navigation-bar': '~56.0.3',
} as const;

const UNIWIND_DEV_DEPENDENCIES = {
  tailwindcss: '^4.2.4',
} as const;

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MDS_CLI_VERSION = '0.1.9';
const MDS_NPX_COMMAND = 'npx mds';
const DEFAULT_GUIDELINES_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'project',
  'guidelines.md'
);
const STYLIST_SCREEN_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'stylist-screen.template.tsx'
);
const EMBEDDED_FONTS_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'embedded-fonts.template.ts'
);
const EXPO_SDK_56_SCREEN_UNIVERSAL_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'expo-sdk-56-screen-universal.template.tsx'
);
const INFO_HEADINGS = [
  'Overview',
  'Target Users',
  'Product Goals',
  'Non-Goals',
  'Core Features',
  'Core User Flows',
  'Must-Include Screens Or Flows',
  'Data And Backend',
  'Platforms',
  'Package Choices',
  'Monetization Strategy',
  'Team Context',
  'Release Strategy',
  'Questions To Revisit',
  'Open Questions',
  'Resources',
  'Tech Stack & MDS Onboarding',
] as const;

const STYLE_HEADINGS = [
  'Visual Direction',
  'Brand/References',
  'Colors',
  'Typography',
  'Layout/Spacing',
  'Motion Tone',
  'Accessibility Notes',
  'Style Questions To Revisit',
  'Open Style Questions',
] as const;

export async function scaffoldProjectMemory(
  projectPath: string,
  answers: OnboardAnswers,
  options: ProjectScaffoldOptions = {}
): Promise<WriteResult[]> {
  const projectDir = path.join(projectPath, 'project');
  await mkdir(projectDir, { recursive: true });

  const force = Boolean(options.force);
  const infoPath = path.join(projectDir, 'info.md');
  const stylePath = path.join(projectDir, 'style.md');
  const existingInfo = await readOptionalText(infoPath);
  const existingStyle = await readOptionalText(stylePath);
  const guidelines = await resolveGuidelines(answers, options);
  const results = await Promise.all([
    writeProjectMemoryFile(infoPath, renderInfo(projectPath, answers, existingInfo), force, true),
    writeIfAllowed(path.join(projectDir, 'todo.md'), renderTodo(answers), force),
    writeProjectMemoryFile(stylePath, renderStyle(answers, existingStyle), force, true),
    writeIfAllowed(path.join(projectDir, 'guidelines.md'), guidelines, force),
    writeIfAllowed(path.join(projectPath, 'AGENTS.md'), renderAgentInstructions(answers), force),
    writeIfAllowed(path.join(projectPath, 'CLAUDE.md'), renderClaudeMd(answers), force),
  ]);

  if (shouldGenerateIntakeAgentHandoff(answers, existingInfo, existingStyle)) {
    results.push(
      await writeIfAllowed(
        path.join(projectDir, 'intake-agent.md'),
        renderIntakeAgentHandoff(answers),
        force
      )
    );
  }

  if (options.richBoilerplate ?? true) {
    results.push(
      ...(await scaffoldRichBoilerplate(projectPath, answers, force, {
        manageUniwind: options.manageUniwind ?? true,
      }))
    );
  }

  return results;
}

export async function scaffoldRichBoilerplate(
  projectPath: string,
  answers: OnboardAnswers,
  force: boolean,
  options: RichBoilerplateOptions = { manageUniwind: true }
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const needsNativeWindMetroPatch = !options.manageUniwind;
  const navigationShell = await detectNavigationShell(projectPath);
  const includeNativeWindUiExposition = answers.defaults.includes('nativewindui');
  const stylistScreenTemplate = (
    await loadTemplateWithFallback(STYLIST_SCREEN_TEMPLATE_PATH, renderStylistScreen(answers))
  )
    .split('__MDS_APP_NAME__')
    .join(answers.appName);
  const embeddedFontsTemplate = await loadTemplateWithFallback(
    EMBEDDED_FONTS_TEMPLATE_PATH,
    renderEmbeddedFonts()
  );
  const expoSdk56ScreenTemplate = answers.usesExpoUiUniversalComponents
    ? await loadTemplateWithFallback(
        EXPO_SDK_56_SCREEN_UNIVERSAL_TEMPLATE_PATH,
        renderExpoSdk56Screen(answers)
      )
    : renderExpoSdk56Screen(answers);

  await mkdir(path.join(projectPath, 'src', 'features', 'home'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'onboarding'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'onboarding', 'components'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'settings'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'components', 'exposition'), {
    recursive: true,
  });
  if (includeNativeWindUiExposition) {
    await mkdir(path.join(projectPath, 'src', 'components', 'nativewindui'), {
      recursive: true,
    });
  }
  await mkdir(path.join(projectPath, 'src', 'data'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'services'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'theme'), { recursive: true });
  await mkdir(path.join(projectPath, 'scripts'), { recursive: true });

  results.push(
    await writeIfAllowed(
      path.join(projectPath, 'project', 'theme.json'),
      `${JSON.stringify(DEFAULT_STYLIST_THEME, null, 2)}\n`,
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'scripts', 'stylist-sync-android.mjs'),
      renderStylistSyncAndroidScript(),
      force
    ),
    ...(needsNativeWindMetroPatch
      ? [
          await writeIfAllowed(
            path.join(projectPath, 'scripts', 'patch-nativewind-metro.cjs'),
            renderNativeWindMetroPatchScript(),
            force
          ),
        ]
      : []),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'tokens.ts'),
      renderThemeTokensFile(DEFAULT_STYLIST_THEME),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'font-assets.ts'),
      renderThemeFontAssetsFile(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'provider.tsx'),
      renderThemeProvider(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'data', 'mock-app.ts'),
      renderMockData(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'services', 'local-data.ts'),
      renderLocalDataService(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'animated-pressable.tsx'),
      renderAnimatedPressable(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'gesture-card.tsx'),
      renderGestureCard(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'keyboard-form.tsx'),
      renderKeyboardForm(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'svg-mark.tsx'),
      renderSvgMark(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'software-mansion-logo.tsx'),
      renderSoftwareMansionLogo(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'screens-card.tsx'),
      renderScreensCard(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'),
      renderExpositionNotice(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'package-card.tsx'),
      renderPackageCard(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'index.ts'),
      renderExpositionComponentIndex(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      renderHomeScreen(answers, navigationShell),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
      renderOnboardingScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'agreement-screen.tsx'),
      renderAgreementScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen.tsx'),
      renderTermsScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
      renderAccountSetupScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'legal-documents.ts'),
      renderLegalDocuments(),
      force
    ),
    await writeIfAllowed(
      path.join(
        projectPath,
        'src',
        'features',
        'onboarding',
        'components',
        'legal-document-view.tsx'
      ),
      renderLegalDocumentView(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'),
      renderSettingsScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
      renderExpositionScreen(includeNativeWindUiExposition),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'),
      embeddedFontsTemplate,
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
      stylistScreenTemplate,
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
      renderDataScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
      expoSdk56ScreenTemplate,
      force
    )
  );

  if (includeNativeWindUiExposition) {
    results.push(
      await writeIfAllowed(
        path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
        renderNativeWindUiScreen(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ActivityIndicator.tsx'),
        renderNativeWindUiActivityIndicator(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Avatar.tsx'),
        renderNativeWindUiAvatar(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Button.tsx'),
        renderNativeWindUiButton(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'DatePicker.tsx'),
        renderNativeWindUiDatePicker(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Picker.tsx'),
        renderNativeWindUiPicker(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ProgressIndicator.tsx'),
        renderNativeWindUiProgressIndicator(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Slider.tsx'),
        renderNativeWindUiSlider(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Text.tsx'),
        renderNativeWindUiText(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'ThemeToggle.tsx'),
        renderNativeWindUiThemeToggle(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'components', 'nativewindui', 'Toggle.tsx'),
        renderNativeWindUiToggle(),
        force
      )
    );
  } else {
    await removeOptionalFile(
      path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx')
    );
  }

  if (answers.dataStart === 'local') {
    results.push(
      await writeIfAllowed(
        path.join(projectPath, 'src', 'services', 'local-data.native.ts'),
        renderNativeLocalDataService(),
        force
      )
    );
  }

  const appDir = getExpoRouterAppDir(projectPath, answers.appDirectory);
  const expositionRouteDir = path.join(appDir, 'exposition');
  await mkdir(expositionRouteDir, { recursive: true });
  if (await pathExists(appDir)) {
    const routeForce = true;
    const shouldWriteRootLayout =
      routeForce && (await canWriteRichRootLayout(path.join(appDir, '_layout.tsx')));
    results.push(
      ...(await scaffoldNavigationRoutes(projectPath, appDir, navigationShell, answers, routeForce))
    );

    if (shouldWriteRootLayout) {
      results.push(
        await writeIfAllowed(
          path.join(appDir, '_layout.tsx'),
          renderRichRootLayout(projectPath, appDir, navigationShell, answers),
          routeForce
        )
      );
    }

    if (!answers.includeCreateExpoComponents) {
      await removeOptionalFile(path.join(appDir, 'details.tsx'));
    }
  }

  if (answers.dataStart === 'supabase') {
    results.push(
      await writeIfAllowed(
        path.join(projectPath, 'src', 'services', 'supabase.ts'),
        renderSupabaseClient(),
        force
      )
    );
  }

  if (answers.testToMainSafeguards) {
    await mkdir(path.join(projectPath, '.github', 'workflows'), {
      recursive: true,
    });
    results.push(
      await writeIfAllowed(
        path.join(projectPath, '.github', 'workflows', 'mds-pr-checks.yml'),
        renderGitHubPrChecksWorkflow(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'project', 'release-flow.md'),
        renderReleaseFlow(answers),
        force
      )
    );
  }

  if (options.manageUniwind) {
    results.push(
      await writeIfAllowed(path.join(projectPath, 'global.css'), renderGlobalCss(), force)
    );
  }

  await ensurePackageJson(projectPath, answers, options.manageUniwind);
  if (options.manageUniwind) {
    await ensureUniwindGlobalCss(projectPath);
    await ensureUniwindMetroConfig(projectPath);
    await removeNativeWindArtifacts(projectPath);
  }
  await ensureGlobalCssImport(projectPath, answers.appDirectory);
  results.push(...(await ensureExpoRouterGroupLayouts(appDir, navigationShell, answers)));

  return results;
}

export function renderInfo(
  projectPath: string,
  answers: OnboardAnswers,
  existingInfo?: string | null
): string {
  const importedNotes = renderImportedNotes(existingInfo, INFO_HEADINGS);
  return [
    `# ${answers.appName} Project Info`,
    '',
    '## Overview',
    '',
    `Build an Expo app for ${answers.audience}.`,
    '',
    '## Target Users',
    '',
    answers.audience,
    '',
    '## Product Goals',
    '',
    '# TodoForContext(optional): Add the business/product outcomes that would make this app successful.',
    '',
    '## Non-Goals',
    '',
    '# TodoForContext(optional): Add anything this app should intentionally avoid for the MVP.',
    '',
    '## Core Features',
    '',
    `Derived from the first planned flows: ${answers.coreFlows}`,
    '',
    '## Core User Flows',
    '',
    answers.coreFlows,
    '',
    '## Must-Include Screens Or Flows',
    '',
    answers.screens?.trim()
      ? answers.screens
      : '# TodoForContext(optional): List any known screens or flows that must be included in planning and implementation.',
    '',
    '## Data And Backend',
    '',
    answers.dataNeeds,
    '',
    `Starting mode: ${formatDataStart(answers.dataStart)}.`,
    '',
    '## Platforms',
    '',
    `- Target platforms: ${answers.targetPlatforms.join(', ') || 'none selected'}`,
    `- First MVP platform: ${answers.firstTargetPlatform}`,
    `- Expo Router app directory: ${formatAppDirectory(answers.appDirectory)}`,
    `- Platform-specific organization: ${formatPlatformStrategy(answers.platformFileStrategy)}`,
    `- Platform layout mode: ${formatPlatformLayoutMode(answers.platformLayoutMode)}`,
    `- Web output: ${answers.webOutput}`,
    `- Deployed server: ${formatServerChoice(answers.deployedServer)}`,
    `- Expo UI: ${formatBoolean(answers.usesExpoUi)}`,
    `- Expo UI Universal components: ${formatBoolean(answers.usesExpoUiUniversalComponents)}`,
    `- Expo Native Tabs: ${formatBoolean(answers.usesExpoNativeTabs)}`,
    '',
    '## Package Choices',
    '',
    answers.defaults.map((item) => `- ${item}`).join('\n'),
    '',
    '- Software Mansion core examples are included for Reanimated/Worklets, Gesture Handler, Screens, SVG, and Keyboard Controller.',
    '- Prune package examples and dependencies after reviewing the exposition pages.',
    '',
    '## Monetization Strategy',
    '',
    '# TodoForContext(optional): Add monetization notes when relevant. Include pricing, subscriptions, ads, sponsorship, lead-gen, internal ROI, or note that monetization is not planned.',
    '',
    '## Team Context',
    '',
    '# TodoForContext(optional): Add team size, roles, delegated responsibilities, stakeholders, and client contacts if useful.',
    '',
    '## Release Strategy',
    '',
    `- Deployment plan: ${answers.deploymentTarget}`,
    `- EAS usage: ${answers.easUses.length > 0 ? answers.easUses.join(', ') : 'not planned yet'}`,
    `- Test-to-main safeguards: ${formatBoolean(answers.testToMainSafeguards)}`,
    '',
    '## Questions To Revisit',
    '',
    ...(hasThinOnboardingAnswers(answers)
      ? [
          '- Replace generic onboarding defaults with app-specific decisions.',
          '- Confirm the exact first user flow before production buildout starts.',
        ]
      : []),
    '',
    '## Resources',
    '',
    `- Source project: ${projectPath}`,
    '- # TodoForContext(optional): Add designs, repos, docs, client notes, analytics, credentials process, or research links.',
    '',
    ...importedNotes,
    '',
    '## Tech Stack & MDS Onboarding',
    '',
    '> Quick-reference stack summary for agents and collaborators. Fill in or correct any items marked below.',
    '',
    `- **App:** ${answers.appName} â€” ${answers.audience}`,
    '- **Language:** TypeScript',
    '- **Package manager:** # TodoForContext(optional): pnpm / npm / yarn / bun',
    `- **Routing:** Expo Router (${formatAppDirectory(answers.appDirectory)})`,
    `- **Styling:** ${formatStyleStack(answers)}`,
    '- **State management:** # TodoForContext(optional): Zustand / Jotai / React context / none',
    `- **Auth:** ${formatAuthSummary(answers)}`,
    `- **Data:** ${formatDataStart(answers.dataStart)}`,
    `- **Platforms:** ${answers.targetPlatforms.join(', ') || 'none selected'}, first MVP target: ${answers.firstTargetPlatform}`,
    `- **Code organization:** ${formatCodeOrg(answers)}`,
    `- **Deployed server:** ${formatServerAdapterSummary(answers)}`,
    `- **Distribution:** ${answers.deploymentTarget}`,
    `- **EAS:** ${answers.easUses.length > 0 ? answers.easUses.join(', ') : 'not planned yet'}`,
    '',
    '### MDS Onboarding Decisions',
    '',
    `- Advanced package setup: ${formatBoolean(answers.advancedPackageSetup)}`,
    `- Create Expo starter components: ${formatBoolean(answers.includeCreateExpoComponents)}`,
    `- Latest Expo SDK preference: ${formatBoolean(answers.useLatestExpoSdk)}`,
    `- MDS guidelines template: yes`,
    `- Expo UI: ${formatBoolean(answers.usesExpoUi)}`,
    `- Expo UI Universal components: ${formatBoolean(answers.usesExpoUiUniversalComponents)}`,
    `- Expo Native Tabs: ${formatBoolean(answers.usesExpoNativeTabs)}`,
    `- Test-to-main safeguards: ${formatBoolean(answers.testToMainSafeguards)}`,
    `- Data start: ${formatDataStart(answers.dataStart)}`,
    `- Defaults selected: ${answers.defaults.join(', ')}`,
    '',
  ].join('\n');
}

export function renderTodo(answers: OnboardAnswers): string {
  const needsReview = hasThinOnboardingAnswers(answers);
  return [
    `# ${answers.appName} TODO`,
    '',
    '## Phase 0: Orientation And Planning',
    '',
    '- [ ] Browse exposition pages to understand included base packages.',
    "- [ ] Review styling in the 'Stylist' page.",
    '- [ ] Review `project/` files for accuracy and planning adjustments.',
    '- [ ] Decide whether to keep or defer `eject-stylist`; mark the decision explicitly.',
    '- [ ] Run `mds eject exposition` and keep only the generated sections you want to retain.',
    '- [ ] Resolve every `# TodoForContext(optional):` marker by filling the section underneath or deleting the marker line to acknowledge no extra context is needed. (There may be none of these if the agent was thorough in onboarding, but if there are any, they should be resolved before development starts.)',
    '',
    '- [x] Confirm app purpose, audience, and primary flows in `project/info.md`.',
    '- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.',
    '- [ ] Keep or prune included package examples after reviewing `/exposition`.',
    '- [ ] Remove exposition pages before production once their lessons are absorbed.',
    ...(needsReview
      ? [
          '- [ ] Replace generic onboarding placeholders with real app decisions before full implementation.',
        ]
      : []),
    '',
    '## Phase 1: App Shell And First Flow',
    '',
    `- [ ] Build the MVP first for ${answers.firstTargetPlatform}.`,
    `- [ ] Establish app shell, navigation, layouts, and route groups in ${formatAppDirectory(answers.appDirectory)}.`,
    `- [ ] Use ${formatPlatformLayoutMode(answers.platformLayoutMode)} unless project memory is updated.`,
    `- [ ] Implement the first core flow from project info: ${answers.coreFlows}.`,
    '- [ ] Keep route files thin and move real UI into feature screens.',
    '- [ ] Apply Stylist synced theme tokens to production UI components and screens.',
    '',
    '## Phase 2: Data Layer',
    '',
    `- [ ] Start with ${formatDataStart(answers.dataStart)}.`,
    ...(answers.dataStart === 'local'
      ? [
          '- [ ] Use the local Expo SQLite demo as the first adapter.',
          '- [ ] Replace the local adapter with Supabase when the product needs synced/authenticated data.',
        ]
      : [
          '- [ ] Create separate Supabase projects for test/staging and production.',
          '- [ ] Wire publishable client keys through environment files, never service-role keys.',
        ]),
    '- [ ] Verify data requirements against `project/info.md` before adding tables or auth.',
    '',
    '## Phase 3: Complete Product Flows',
    '',
    '- [ ] Build the remaining core flows from `project/info.md` phase by phase.',
    '- [ ] Add shared state only when state crosses screens or features.',
    '- [ ] Verify each selected platform after the MVP flow works.',
    ...answers.targetPlatforms.map((platform) => `- [ ] Verify ${platform} behavior.`),
    ...(answers.usesExpoUi ? ['- [ ] Add Expo UI examples where they improve native feel.'] : []),
    ...(answers.usesExpoUiUniversalComponents
      ? ['- [ ] Review the Expo UI Universal examples before replacing generated exposition code.']
      : []),
    ...(answers.usesExpoNativeTabs
      ? ['- [ ] Prototype Expo Native Tabs for mobile navigation.']
      : []),
    ...(answers.easUses.length > 0
      ? answers.easUses.map((item) => `- [ ] Configure EAS for ${item}.`)
      : []),
    '',
    '## Phase 4: Polish, Safeguards, And Release',
    '',
    '- [ ] Prune unused Software Mansion examples and remove unneeded packages.',
    '- [ ] Run `mds doctor --ci` and address errors.',
    ...(answers.testToMainSafeguards
      ? [
          '- [ ] Follow `project/release-flow.md` for test-to-main development.',
          '- [ ] Add GitHub branch protection so PR checks pass before merging into `test` or `main`.',
        ]
      : ['- [ ] Decide on release safeguards before production work begins.']),
    ...(answers.webOutput !== 'none'
      ? [`- [ ] Confirm Expo web output mode: ${answers.webOutput}.`]
      : []),
    ...(answers.deployedServer !== 'none'
      ? [`- [ ] Plan deployed server work: ${formatServerChoice(answers.deployedServer)}.`]
      : []),
    '- [ ] Add monorepo support after the MVP is stable.',
    '',
  ].join('\n');
}

export function renderStyle(answers: OnboardAnswers, existingStyle?: string | null): string {
  const importedNotes = renderImportedNotes(existingStyle, STYLE_HEADINGS);
  return [
    `# ${answers.appName} Style`,
    '',
    '## Visual Direction',
    '',
    '- Define how the app should look and feel before building final screens.',
    '- Keep this file focused on visual/design direction only.',
    '',
    '## Brand/References',
    '',
    '# TodoForContext(optional): Add brand words, competitor references, client examples, screenshots, or links.',
    '',
    '## Colors',
    '',
    '- Canonical editable tokens live in `project/theme.json`.',
    '- Use `/exposition/stylist` and the Save button to sync style tokens into this file.',
    '',
    '# TodoForContext(optional): Add palette direction, semantic color meaning, and light/dark mode expectations.',
    '',
    '## Typography',
    '',
    '# TodoForContext(optional): Add font choices, type scale, readability constraints, and tone.',
    '',
    '## Layout/Spacing',
    '',
    '# TodoForContext(optional): Add density, spacing, border radius, information hierarchy, and platform layout notes.',
    '',
    '## Motion Tone',
    '',
    '# TodoForContext(optional): Add animation feel: playful, calm, utility-first, premium, minimal, etc.',
    '',
    '## Accessibility Notes',
    '',
    '- Prefer readable contrast, scalable type, clear focus/pressed states, and platform-appropriate interactions.',
    '- Add user-specific accessibility needs here when known.',
    '',
    '## Style Questions To Revisit',
    '',
    '# TodoForContext(optional): Add unresolved visual decisions to revisit later in `/exposition/stylist`; delete this marker if there are none.',
    '',
    '<!-- MDS_STYLIST_THEME_START -->',
    '## Canonical Theme Tokens (Managed by Stylist)',
    '',
    'The block below mirrors `project/theme.json` and is managed by `mds stylist sync`.',
    '',
    '```json',
    JSON.stringify(DEFAULT_STYLIST_THEME, null, 2),
    '```',
    '<!-- MDS_STYLIST_THEME_END -->',
    '',
    ...importedNotes,
    '',
  ].join('\n');
}

function renderThemeProvider(): string {
  return [
    "import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';",
    '',
    "import stylistThemeTokens, { type StylistColorPalette, type StylistColorScheme, type StylistThemeTokens } from './tokens';",
    '',
    'export type AppThemeValue = StylistThemeTokens & {',
    '  activeScheme: StylistColorScheme;',
    '  activeColors: StylistColorPalette;',
    '};',
    '',
    'const AppThemeContext = createContext<AppThemeValue>({',
    '  ...stylistThemeTokens,',
    '  activeScheme: stylistThemeTokens.colorSystem.previewScheme,',
    '  activeColors: stylistThemeTokens.colors[stylistThemeTokens.colorSystem.previewScheme],',
    '});',
    'const AppThemeSetterContext = createContext<Dispatch<SetStateAction<StylistThemeTokens>> | null>(null);',
    '',
    'export function AppThemeProvider({ children }: { children: ReactNode }) {',
    '  const [theme, setTheme] = useState<StylistThemeTokens>(stylistThemeTokens);',
    '  const value = useMemo<AppThemeValue>(() => {',
    '    const activeScheme = theme.colorSystem.previewScheme;',
    '    return {',
    '      ...theme,',
    '      activeScheme,',
    '      activeColors: theme.colors[activeScheme],',
    '    };',
    '  }, [theme]);',
    '',
    '  return (',
    '    <AppThemeSetterContext.Provider value={setTheme}>',
    '      <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>',
    '    </AppThemeSetterContext.Provider>',
    '  );',
    '}',
    '',
    'export function useAppTheme() {',
    '  return useContext(AppThemeContext);',
    '}',
    '',
    'export function useSetAppTheme() {',
    '  const setTheme = useContext(AppThemeSetterContext);',
    '  if (!setTheme) {',
    "    throw new Error('useSetAppTheme must be used inside AppThemeProvider.');",
    '  }',
    '  return setTheme;',
    '}',
    '',
  ].join('\n');
}

function renderThemeFontAssetsFile(): string {
  return [
    'export const THEME_FONT_ASSETS: Record<string, number> = {',
    '};',
    '',
    'export default THEME_FONT_ASSETS;',
    '',
  ].join('\n');
}

export function renderGuidelines(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Guidelines`,
    '',
    '## Source Of Truth',
    '',
    '- The `project/` folder is the golden source of truth for product intent, roadmap, visual style, and technical rules.',
    '- Agents and contributors must read `project/info.md`, `project/todo.md`, `project/style.md`, and this file before making product or architecture changes.',
    '- Never make a change that conflicts with the project memory files unless the user explicitly updates them first.',
    '',
    '## TodoForContext Markers Block Onboarding',
    '',
    '- The string `# TodoForContext(optional):` marks sections the user has not yet decided about.',
    '- Before agentic intake, planning, or scaffolding, scan every `project/` file for this marker.',
    '- If any marker is present: stop, list each file + line, and tell the user to fill the section underneath OR delete the marker line to acknowledge they do not want to add that context.',
    '- Only proceed when zero markers remain. `mds doctor --ci` treats unresolved markers as errors.',
    '',
    '## Expo Architecture',
    '',
    '- Keep Expo Router route files thin; route files should import feature screens or layouts.',
    '- Put reusable business logic in `src/features`, `src/services`, `src/data`, or shared hooks.',
    '- Prefer Uniwind with Tailwind v4 for new styling work.',
    '- Use Zustand only when state is shared across screens or features.',
    '- Keep private environment variables server-side and never expose secrets with `EXPO_PUBLIC_`.',
    `- Keep Expo Router routes in ${formatAppDirectory(answers.appDirectory)} unless the project memory changes.`,
    `- Use ${formatPlatformStrategy(answers.platformFileStrategy)} for platform-specific code when the selected targets diverge.`,
    `- Use ${formatPlatformLayoutMode(answers.platformLayoutMode)} for selected platform shells.`,
    `- Treat ${answers.firstTargetPlatform} as the first MVP platform until the roadmap says otherwise.`,
    '',
    '## Default Package Support',
    '',
    '- Software Mansion core support starts with Reanimated/Worklets, Gesture Handler, Screens, SVG, and Keyboard Controller.',
    '- Use the temporary `/exposition` pages to decide which package examples should stay, be replaced, or be removed.',
    '- Use `react-native-keyboard-controller` for real keyboard-heavy flows instead of piling up manual keyboard offsets.',
    '- Use Reanimated for meaningful motion, but avoid expensive animation loops in long lists.',
    `- Data starting point: ${formatDataStart(answers.dataStart)}.`,
    ...(answers.dataStart === 'supabase'
      ? [
          '- Use separate Supabase projects for test/staging and production.',
          '- Never expose Supabase service-role or secret keys in client code.',
        ]
      : ['- Keep local dummy data behind an adapter so Supabase can replace it later.']),
    ...(answers.usesExpoUi
      ? [
          '- Expo UI is stable in SDK 56 for native SwiftUI and Jetpack Compose surfaces.',
          answers.usesExpoUiUniversalComponents
            ? '- Prefer Expo UI Universal components when one shared Android, iOS, and web component tree fits.'
            : '- Use platform-specific Expo UI APIs only when they clearly improve native feel.',
        ]
      : []),
    '',
    '## Workflow',
    '',
    '- If the user says `mds continue` or `MDS Continue`, first run the MDS Continue command from the app root and use its session brief to propose a plan. Do not jump straight into intake or file edits.',
    '- Run `mds doctor --ci` before pushing.',
    '- Use `mds clear-expo-start` when Metro or server ports get wedged.',
    ...(answers.testToMainSafeguards
      ? [
          '- Develop through feature branches into `test`, then promote validated work from `test` to `main`.',
        ]
      : []),
    `- Latest Expo SDK preference captured during onboarding: ${formatBoolean(answers.useLatestExpoSdk)}.`,
    `- Expo UI Universal components preference captured during onboarding: ${formatBoolean(answers.usesExpoUiUniversalComponents)}.`,
    '- Treat monorepo scaffolding as future work until the single-app MVP is stable.',
    '',
  ].join('\n');
}

export async function renderGuidelinesTemplate(
  answers: OnboardAnswers,
  templatePath = DEFAULT_GUIDELINES_TEMPLATE_PATH
): Promise<string> {
  const template = await readFile(templatePath, 'utf8');
  return applyGuidelinesTemplate(template, answers);
}

export function renderAgentInstructions(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Agent Instructions`,
    '',
    'The `project/` folder is the source of truth. Before changing behavior, architecture, styling, or roadmap details, read:',
    '',
    '- `project/info.md`',
    '- `project/todo.md`',
    '- `project/style.md`',
    '- `project/guidelines.md`',
    '',
    `Expo Router routes belong in ${formatAppDirectory(answers.appDirectory)}. Platform layout mode: ${formatPlatformLayoutMode(answers.platformLayoutMode)}.`,
    '',
    'If the user says `mds continue` or `MDS Continue`, first run `mds continue` from the app root if available. Use the MDS Continue brief to propose the next plan and wait for approval before editing files. If the command is unavailable, manually inspect markers, Doctor status, git status, and `project/todo.md` in that order.',
    '',
    'Before any intake, planning, scaffolding, or phase work, scan every `project/` file for the marker `# TodoForContext(optional):`. If any are present, stop and tell the user to fill the section underneath OR delete the marker line to acknowledge they do not want to add that context. Only proceed when zero markers remain.',
    '',
    'Then build from `project/todo.md` in phase order. Do not make changes that conflict with project memory. If the files are unclear or generic, update the project memory first or ask the user.',
    '',
  ].join('\n');
}

export function renderClaudeMd(answers: OnboardAnswers): string {
  const spinUpDev = [
    '## Spin up dev',
    '',
    `Run \`npm run clear-expo-start\` (or \`${MDS_NPX_COMMAND} clear-expo-start .\`) instead of bare \`expo start\` or \`npx expo start\`.`,
    'Kills port 8081, clears all Metro and Expo caches (including the Windows system cache), and starts `expo start --clear`.',
    'Expo Router API routes work automatically in this mode.',
    'Never fall back to a non-default port â€” always free the default port first.',
    '',
  ];

  const backendAlongside = answers.customBackend
    ? [
        '## Also start the backend API server',
        '',
        `Run \`node ${answers.customBackendEntry}\` from the project root in a background process alongside Expo.`,
        'Both must be running for full local functionality â€” Expo on port 8081, backend on its own port.',
        '',
      ]
    : [];

  const spinUpProd = buildSpinUpProdSection(answers);

  return [
    `# ${answers.appName} â€” Agent Guidelines`,
    '',
    '## Before every git commit',
    '',
    `Run \`npm run mds:doctor\` (or \`${MDS_NPX_COMMAND} doctor --fast .\`) before committing. Fix all errors first; warnings are OK to proceed with.`,
    '',
    '## Before moving to the next phase',
    '',
    'Run doctor before beginning each new development phase. Resolve all errors before continuing.',
    '',
    ...spinUpDev,
    ...backendAlongside,
    ...spinUpProd,
  ].join('\n');
}

function buildSpinUpProdSection(answers: OnboardAnswers): string[] {
  if (answers.webOutput === 'none') return [];

  if (answers.customBackend) {
    return [
      '## Spin up prod',
      '',
      'Run `npm run serve:prod:fresh` for the Expo web server.',
      'Run `npm run serve:prod:api:fresh` for the backend API server.',
      'Both must be running for full prod-parity.',
      '# TodoForContext(optional): Confirm api-server port and build script name in package.json.',
      '',
    ];
  }

  if (answers.expoServerAdapter === 'express' || answers.expoServerAdapter === 'bun') {
    return [
      '## Spin up prod',
      '',
      'Run `npm run serve:prod:fresh` â€” kills port 3000, builds web dist, starts the Node server.',
      'Run `npm run serve:prod` to restart without rebuilding.',
      'Server runs on http://localhost:3000. Mirrors your self-hosted (Plesk/VPS) environment.',
      '',
    ];
  }

  if (answers.expoServerAdapter === 'eas') {
    return [
      '## Spin up prod',
      '',
      'Run `npm run serve:prod:fresh` â€” builds web dist and starts `npx expo serve`.',
      'The terminal will show the local URL when ready. Mirrors EAS hosting.',
      '',
    ];
  }

  return [
    '## Spin up prod',
    '',
    'Run `npm run serve:prod:fresh` to build and serve the production bundle.',
    '# TodoForContext(optional): Confirm this command matches your deployment environment.',
    '',
  ];
}

export function renderIntakeAgentHandoff(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Intake Agent Handoff`,
    '',
    'Use this file when the terminal intake was intentionally concise, generic, or included pre-existing notes that need a real agent conversation.',
    '',
    '## Agent Prompt',
    '',
    'Read `project/info.md`, `project/style.md`, `project/guidelines.md`, and `project/todo.md`.',
    'If the user said `mds continue`, run `mds continue` first when available and use its session brief as the starting point.',
    'First, search every `project/` file for `# TodoForContext(optional):`. If any markers remain, stop before intake and tell the user to fill the section underneath or delete the marker line to acknowledge no extra context is needed.',
    'Ask conversational follow-up questions until the app plan is clear enough to build phase by phase.',
    'Move any imported notes into the correct canonical sections, preserve useful context, and remove uncertainty only after the user confirms it.',
    'Update `project/todo.md` so Phase 0 through Phase 4 reflect the clarified app, business, data, style, package, and release plan.',
    '',
    '## Places To Clarify',
    '',
    ...(hasThinOnboardingAnswers(answers)
      ? [
          '- The current onboarding answers still include generic defaults.',
          '- Confirm the target users, first core flow, data model, deployment plan, monetization, and team context.',
        ]
      : ['- Review Imported Notes sections and optional TodoForContext markers.']),
    '',
    '## No API Keys Required',
    '',
    'The public CLI does not require OpenAI, Anthropic, or other provider keys. This handoff is for Codex, Claude, or another agent environment the developer already chose to use.',
    '',
  ].join('\n');
}

async function ensurePackageJson(
  projectPath: string,
  answers: OnboardAnswers,
  manageUniwind: boolean
): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const raw = await readOptionalText(packageJsonPath);
  if (!raw) {
    return;
  }

  const packageJson = JSON.parse(raw) as PackageJson;
  packageJson.scripts = {
    ...packageJson.scripts,
    typecheck: packageJson.scripts?.typecheck ?? 'tsc --noEmit',
    'build:web': packageJson.scripts?.['build:web'] ?? 'expo export --platform web',
    'mds:continue': packageJson.scripts?.['mds:continue'] ?? `${MDS_NPX_COMMAND} continue`,
    'mds:doctor': packageJson.scripts?.['mds:doctor'] ?? `${MDS_NPX_COMMAND} doctor`,
    'mds:doctor:ci': packageJson.scripts?.['mds:doctor:ci'] ?? `${MDS_NPX_COMMAND} doctor --ci`,
    'mds:stylist:sync':
      packageJson.scripts?.['mds:stylist:sync'] ?? `${MDS_NPX_COMMAND} stylist sync .`,
    'stylist:sync:android':
      packageJson.scripts?.['stylist:sync:android'] ?? 'node ./scripts/stylist-sync-android.mjs',
    'mds:eject':
      packageJson.scripts?.['mds:eject'] ?? `${MDS_NPX_COMMAND} eject .`,
    'mds:eject:exposition':
      packageJson.scripts?.['mds:eject:exposition'] ?? `${MDS_NPX_COMMAND} eject exposition .`,
    'mds:eject:stylist':
      packageJson.scripts?.['mds:eject:stylist'] ?? `${MDS_NPX_COMMAND} eject stylist .`,
    'free-port': packageJson.scripts?.['free-port'] ?? `${MDS_NPX_COMMAND} free-port`,
    'clear-expo-start':
      packageJson.scripts?.['clear-expo-start'] ?? `${MDS_NPX_COMMAND} clear-expo-start`,
    'expo-install-fix': packageJson.scripts?.['expo-install-fix'] ?? 'npx expo install --fix',
    'expo-doctor': packageJson.scripts?.['expo-doctor'] ?? 'npx expo-doctor',
    'post-create-check':
      packageJson.scripts?.['post-create-check'] ?? 'npx expo install --fix && npx expo-doctor',
    'ci:verify': packageJson.scripts?.['ci:verify'] ?? `${MDS_NPX_COMMAND} doctor --ci`,
  };

  if (!manageUniwind) {
    packageJson.scripts['patch:nativewind-metro'] =
      packageJson.scripts['patch:nativewind-metro'] ?? 'node ./scripts/patch-nativewind-metro.cjs';
    packageJson.scripts.prestart =
      packageJson.scripts.prestart ?? 'node ./scripts/patch-nativewind-metro.cjs';
    packageJson.scripts.preandroid =
      packageJson.scripts.preandroid ?? 'node ./scripts/patch-nativewind-metro.cjs';
    packageJson.scripts.preweb =
      packageJson.scripts.preweb ?? 'node ./scripts/patch-nativewind-metro.cjs';
    packageJson.scripts.postinstall = ensureNativeWindMetroPostinstall(
      packageJson.scripts.postinstall
    );
  }

  if (answers.webOutput !== 'none') {
    const serveProd = deriveServeProdScript(answers);
    const serveProdFresh = deriveServeProdFreshScript(answers);
    packageJson.scripts = {
      ...packageJson.scripts,
      'serve:prod': packageJson.scripts?.['serve:prod'] ?? serveProd,
      'serve:prod:fresh': packageJson.scripts?.['serve:prod:fresh'] ?? serveProdFresh,
    };

    if (answers.customBackend) {
      const entry = answers.customBackendEntry || 'server.js';
      packageJson.scripts = {
        ...packageJson.scripts,
        'serve:prod:api': packageJson.scripts?.['serve:prod:api'] ?? `node ${entry}`,
        'serve:prod:api:fresh':
          packageJson.scripts?.['serve:prod:api:fresh'] ??
          `npm run build:api-server && node ${entry}`,
      };
    }
  }

  packageJson.dependencies = {
    ...SOFTWARE_MANSION_CORE_DEPENDENCIES,
    ...STYLIST_DEPENDENCIES,
    ...packageJson.dependencies,
  };

  if (answers.dataStart === 'local') {
    packageJson.dependencies = {
      ...LOCAL_DATA_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.dataStart === 'supabase') {
    packageJson.dependencies = {
      ...SUPABASE_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.usesExpoUi) {
    packageJson.dependencies = {
      ...EXPO_UI_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.targetPlatforms.includes('android')) {
    packageJson.dependencies = {
      ...ANDROID_NAVIGATION_BAR_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (manageUniwind) {
    packageJson.dependencies = {
      ...UNIWIND_DEPENDENCIES,
      ...packageJson.dependencies,
    };
    delete packageJson.dependencies.nativewind;
    packageJson.dependencies.uniwind = UNIWIND_DEPENDENCIES.uniwind;

    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...UNIWIND_DEV_DEPENDENCIES,
    };
    delete packageJson.devDependencies.nativewind;
    delete packageJson.devDependencies['prettier-plugin-tailwindcss'];
  }

  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    '@mr.dj2u/cli': packageJson.devDependencies?.['@mr.dj2u/cli'] ?? `^${MDS_CLI_VERSION}`,
  };

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

async function resolveGuidelines(
  answers: OnboardAnswers,
  options: ProjectScaffoldOptions
): Promise<string> {
  if (!options.guidelinesTemplate && !options.guidelinesTemplatePath) {
    return renderGuidelines(answers);
  }

  return renderGuidelinesTemplate(answers, options.guidelinesTemplatePath);
}

function applyGuidelinesTemplate(template: string, answers: OnboardAnswers): string {
  const replacements: Record<string, string> = {
    appName: answers.appName,
    audience: answers.audience,
    coreFlows: answers.coreFlows,
    screens: answers.screens ?? '',
    dataNeeds: answers.dataNeeds,
    deploymentTarget: answers.deploymentTarget,
    advancedPackageSetup: formatBoolean(answers.advancedPackageSetup),
    includeCreateExpoComponents: formatBoolean(answers.includeCreateExpoComponents),
    useLatestExpoSdk: formatBoolean(answers.useLatestExpoSdk),
    targetPlatforms: answers.targetPlatforms.map((item) => `- ${item}`).join('\n'),
    firstTargetPlatform: answers.firstTargetPlatform,
    appDirectory: formatAppDirectory(answers.appDirectory),
    platformFileStrategy: formatPlatformStrategy(answers.platformFileStrategy),
    platformLayoutMode: formatPlatformLayoutMode(answers.platformLayoutMode),
    webOutput: answers.webOutput,
    deployedServer: formatServerChoice(answers.deployedServer),
    usesExpoUi: formatBoolean(answers.usesExpoUi),
    usesExpoUiUniversalComponents: formatBoolean(answers.usesExpoUiUniversalComponents),
    usesExpoNativeTabs: formatBoolean(answers.usesExpoNativeTabs),
    easUses: answers.easUses.map((item) => `- ${item}`).join('\n') || '- not planned yet',
    dataStart: formatDataStart(answers.dataStart),
    testToMainSafeguards: formatBoolean(answers.testToMainSafeguards),
    defaults: answers.defaults.map((item) => `- ${item}`).join('\n'),
  };

  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.split(`{{${key}}}`).join(value);
  }

  return output.endsWith('\n') ? output : `${output}\n`;
}

function formatBoolean(value: boolean): string {
  return value ? 'yes' : 'no';
}

function formatPlatformStrategy(value: OnboardAnswers['platformFileStrategy']): string {
  return value === 'folders' ? 'platform-specific folders' : 'platform-specific files only';
}

function formatAppDirectory(value: AppDirectory): string {
  return value === 'src' ? '`src/app`' : '`app`';
}

function formatPlatformLayoutMode(value: PlatformLayoutMode): string {
  return value === 'platform-specific' ? 'platform-specific layouts' : 'shared layouts';
}

function formatServerChoice(value: OnboardAnswers['deployedServer']): string {
  switch (value) {
    case 'standard-expo':
      return 'yes, standard Expo server/API routes';
    case 'custom':
      return 'yes, custom server/backend';
    case 'none':
      return 'no deployed server planned';
  }
}

function formatDataStart(value: DataStart): string {
  return value === 'supabase' ? 'Supabase from the start' : 'local dummy data with Expo SQLite';
}

function formatServerAdapterSummary(answers: OnboardAnswers): string {
  if (answers.webOutput === 'none') return 'none (native-only)';
  switch (answers.expoServerAdapter) {
    case 'eas':
      return 'EAS hosting';
    case 'express':
      return 'Express adapter (node server.js, port 3000)';
    case 'bun':
      return 'Bun adapter (node server.js)';
    case 'other':
      return 'custom (not yet specified)';
    default:
      return formatServerChoice(answers.deployedServer);
  }
}

function deriveServeProdScript(answers: OnboardAnswers): string {
  if (answers.expoServerAdapter === 'express' || answers.expoServerAdapter === 'bun') {
    return 'node server.js';
  }
  return 'npx expo serve';
}

function deriveServeProdFreshScript(answers: OnboardAnswers): string {
  if (answers.expoServerAdapter === 'express' || answers.expoServerAdapter === 'bun') {
    return `${MDS_NPX_COMMAND} free-port 3000 && npm run build:web && node server.js`;
  }
  return `${MDS_NPX_COMMAND} free-port 8081 && npm run build:web && npx expo serve`;
}

function formatStyleStack(answers: OnboardAnswers): string {
  if (answers.defaults.includes('uniwind')) {
    return 'Uniwind / Tailwind CSS v4';
  }
  if (answers.defaults.includes('nativewindui')) {
    return 'NativeWindUI / NativeWind';
  }
  if (answers.defaults.includes('nativewind')) {
    return 'NativeWind / Tailwind CSS';
  }
  if (answers.defaults.includes('unistyles')) {
    return 'Unistyles';
  }
  if (answers.defaults.includes('restyle')) {
    return 'Shopify Restyle';
  }
  if (answers.defaults.includes('tamagui')) {
    return 'Tamagui';
  }
  return 'standard React Native StyleSheet';
}

function formatAuthSummary(answers: OnboardAnswers): string {
  if (answers.dataStart === 'supabase' || answers.defaults.includes('supabase')) {
    return 'Supabase auth (available via supabase-js)';
  }
  return 'no auth planned yet';
}

function formatCodeOrg(answers: OnboardAnswers): string {
  const parts: string[] = [
    formatPlatformStrategy(answers.platformFileStrategy),
    `${formatAppDirectory(answers.appDirectory)} routes`,
    formatPlatformLayoutMode(answers.platformLayoutMode),
  ];
  if (answers.webOutput === 'none') {
    parts.push('no web');
  } else {
    parts.push(`web: ${answers.webOutput}`);
  }
  return parts.join(', ');
}

function hasThinOnboardingAnswers(answers: OnboardAnswers): boolean {
  const genericValues = new Set([
    'Expo app users',
    'Onboarding, primary app workflow, settings',
    'Agent should derive the first core user flows from project/info.md during intake.',
    'Local state first; add backend only when needed',
    'Expo web/native deployment',
  ]);

  if (!answers.screens?.trim()) {
    return true;
  }

  return [answers.audience, answers.coreFlows, answers.dataNeeds, answers.deploymentTarget].some(
    (value) => genericValues.has(value.trim())
  );
}

async function ensureUniwindMetroConfig(projectPath: string): Promise<void> {
  const metroPath = path.join(projectPath, 'metro.config.js');
  const existing = await readOptionalText(metroPath);
  if (!existing) {
    await writeFile(metroPath, renderUniwindMetroConfig(), 'utf8');
    return;
  }

  if (existing.includes('withUniwindConfig')) {
    return;
  }

  if (existing.includes('withNativeWind') || existing.includes("require('nativewind/metro')")) {
    await writeFile(metroPath, renderUniwindMetroConfig(), 'utf8');
    return;
  }

  const withImport = existing.includes("require('uniwind/metro')")
    ? existing
    : existing.replace(
        /const \{ getDefaultConfig \} = require\(['"]expo\/metro-config['"]\);\r?\n/,
        (match) => `${match}const { withUniwindConfig } = require('uniwind/metro');\n`
      );

  const updated = withImport.replace(
    /module\.exports\s*=\s*config;\s*$/m,
    [
      'module.exports = withUniwindConfig(config, {',
      "  cssEntryFile: './global.css',",
      "  dtsFile: './src/uniwind-types.d.ts',",
      '});',
      '',
    ].join('\n')
  );

  if (updated !== existing) {
    await writeFile(metroPath, updated, 'utf8');
  }
}

async function ensureUniwindGlobalCss(projectPath: string): Promise<void> {
  const globalCssPath = path.join(projectPath, 'global.css');
  const existing = await readOptionalText(globalCssPath);
  if (
    !existing ||
    existing.includes("@import 'uniwind'") ||
    existing.includes('@import "uniwind"')
  ) {
    return;
  }

  await writeFile(globalCssPath, renderGlobalCss(), 'utf8');
}

async function removeNativeWindArtifacts(projectPath: string): Promise<void> {
  await removeOptionalFile(path.join(projectPath, 'nativewind-env.d.ts'));
  await removeOptionalFileIfContains(path.join(projectPath, 'tailwind.config.js'), 'nativewind');
  await removeNativeWindFromBabelConfig(path.join(projectPath, 'babel.config.js'));
  await removeTailwindPrettierPluginConfig(path.join(projectPath, 'prettier.config.js'));
  await removeTailwindPrettierPluginConfig(path.join(projectPath, 'prettier.config.mjs'));
}

async function removeNativeWindFromBabelConfig(filePath: string): Promise<void> {
  const existing = await readOptionalText(filePath);
  if (!existing || !existing.includes('nativewind')) {
    return;
  }

  const updated = existing
    .replace(
      /\[\s*(['"])babel-preset-expo\1\s*,\s*\{\s*jsxImportSource:\s*(['"])nativewind\2\s*\}\s*\]/g,
      "'babel-preset-expo'"
    )
    .replace(/,\s*(['"])nativewind\/babel\1/g, '')
    .replace(/(['"])nativewind\/babel\1\s*,\s*/g, '')
    .replace(/,\s*,/g, ',');

  if (updated !== existing) {
    await writeFile(filePath, updated, 'utf8');
  }
}

async function removeTailwindPrettierPluginConfig(filePath: string): Promise<void> {
  const existing = await readOptionalText(filePath);
  if (!existing || !existing.includes('prettier-plugin-tailwindcss')) {
    return;
  }

  const updated = existing
    .replace(
      /^\s*plugins:\s*\[\s*require\.resolve\(['"]prettier-plugin-tailwindcss['"]\)\s*\],?\r?\n/m,
      ''
    )
    .replace(/^\s*tailwindAttributes:\s*\[[^\n]*\],?\r?\n/m, '')
    .replace(/^\s*tailwindFunctions:\s*\[[^\n]*\],?\r?\n/m, '')
    .replace(/\n{3,}/g, '\n\n');

  if (updated !== existing) {
    await writeFile(filePath, updated, 'utf8');
  }
}

async function ensureGlobalCssImport(
  projectPath: string,
  appDirectory: AppDirectory
): Promise<void> {
  const layoutPath = path.join(getExpoRouterAppDir(projectPath, appDirectory), '_layout.tsx');
  const appPath = path.join(projectPath, 'App.tsx');
  const layout = await readOptionalText(layoutPath);
  if (layout) {
    const importStatement = renderGlobalCssImport(layoutPath, projectPath);
    const updated = layout.match(/^\s*import\s+['"][^'"]*global\.css['"];?\r?\n/m)
      ? layout.replace(/^\s*import\s+['"][^'"]*global\.css['"];?\r?\n/m, `${importStatement}\n`)
      : `${importStatement}\n${layout}`;
    if (updated !== layout) {
      await writeFile(layoutPath, updated, 'utf8');
    }
    return;
  }

  const app = await readOptionalText(appPath);
  if (app && !app.includes('global.css')) {
    await writeFile(appPath, `import './global.css';\n${app}`, 'utf8');
  }
}

function getExpoRouterAppDir(projectPath: string, appDirectory: AppDirectory): string {
  return appDirectory === 'src'
    ? path.join(projectPath, 'src', 'app')
    : path.join(projectPath, 'app');
}

function renderRouteExport(routeDir: string, targetModulePath: string): string {
  return `export { default } from '${toRelativeImportPath(routeDir, targetModulePath)}';\n`;
}

async function scaffoldNavigationRoutes(
  projectPath: string,
  appDir: string,
  navigationShell: NavigationShell,
  answers: OnboardAnswers,
  routeForce: boolean
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const homeScreen = path.join(projectPath, 'src', 'features', 'home', 'home-screen');
  const onboardingScreen = path.join(
    projectPath,
    'src',
    'features',
    'onboarding',
    'onboarding-screen'
  );
  const agreementScreen = path.join(
    projectPath,
    'src',
    'features',
    'onboarding',
    'agreement-screen'
  );
  const termsScreen = path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen');
  const accountSetupScreen = path.join(
    projectPath,
    'src',
    'features',
    'onboarding',
    'account-setup-screen'
  );
  const settingsScreen = path.join(projectPath, 'src', 'features', 'settings', 'settings-screen');
  const expositionScreen = path.join(
    projectPath,
    'src',
    'features',
    'exposition',
    'exposition-screen'
  );
  const stylistScreen = path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen');
  const dataScreen = path.join(projectPath, 'src', 'features', 'exposition', 'data-screen');
  const expoSdk56Screen = path.join(
    projectPath,
    'src',
    'features',
    'exposition',
    'expo-sdk-56-screen'
  );
  const nativeWindUiScreen = path.join(
    projectPath,
    'src',
    'features',
    'exposition',
    'nativewindui-screen'
  );
  const includeNativeWindUiExposition = answers.defaults.includes('nativewindui');
  const shouldWriteExpositionRouteWrappers =
    navigationShell.library !== 'expo-router' || navigationShell.layout === 'stack';

  const rootExpositionDir = path.join(appDir, 'exposition');
  const onboardingDir = path.join(appDir, 'onboarding');
  await mkdir(rootExpositionDir, { recursive: true });
  await mkdir(onboardingDir, { recursive: true });

  results.push(
    await writeIfAllowed(
      path.join(appDir, 'onboarding.tsx'),
      renderRouteExport(appDir, onboardingScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(onboardingDir, 'agreement.tsx'),
      renderRouteExport(onboardingDir, agreementScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(onboardingDir, 'terms.tsx'),
      renderRouteExport(onboardingDir, termsScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(onboardingDir, 'account-setup.tsx'),
      renderRouteExport(onboardingDir, accountSetupScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(appDir, 'settings.tsx'),
      renderRouteExport(appDir, settingsScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(rootExpositionDir, 'stylist-sync+api.ts'),
      renderStylistSyncApiRoute(),
      routeForce
    )
  );
  if (shouldWriteExpositionRouteWrappers) {
    results.push(
      await writeIfAllowed(
        path.join(rootExpositionDir, 'index.tsx'),
        renderRouteExport(rootExpositionDir, expositionScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(rootExpositionDir, 'stylist.tsx'),
        renderRouteExport(rootExpositionDir, stylistScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(rootExpositionDir, 'data.tsx'),
        renderRouteExport(rootExpositionDir, dataScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(rootExpositionDir, 'sdk-56.tsx'),
        renderRouteExport(rootExpositionDir, expoSdk56Screen),
        routeForce
      )
    );
  } else {
    await removeOptionalFile(path.join(rootExpositionDir, 'index.tsx'));
    await removeOptionalFile(path.join(rootExpositionDir, 'stylist.tsx'));
    await removeOptionalFile(path.join(rootExpositionDir, 'data.tsx'));
    await removeOptionalFile(path.join(rootExpositionDir, 'sdk-56.tsx'));
  }
  if (includeNativeWindUiExposition) {
    results.push(
      await writeIfAllowed(
        path.join(rootExpositionDir, 'nativewindui.tsx'),
        renderRouteExport(rootExpositionDir, nativeWindUiScreen),
        routeForce
      )
    );
  } else {
    await removeOptionalFile(path.join(rootExpositionDir, 'nativewindui.tsx'));
  }

  if (navigationShell.library !== 'expo-router') {
    results.push(
      await writeIfAllowed(
        path.join(appDir, 'index.tsx'),
        renderRouteExport(appDir, homeScreen),
        routeForce
      )
    );
    return results;
  }

  if (navigationShell.layout === 'stack') {
    results.push(
      await writeIfAllowed(
        path.join(appDir, 'index.tsx'),
        renderRouteExport(appDir, homeScreen),
        routeForce
      )
    );
    return results;
  }

  if (navigationShell.layout === 'tabs') {
    const tabsDir = path.join(appDir, '(tabs)');
    await mkdir(tabsDir, { recursive: true });
    results.push(
      await writeIfAllowed(
        path.join(tabsDir, 'index.tsx'),
        renderRouteExport(tabsDir, homeScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'exposition.tsx'),
        renderRouteExport(tabsDir, expositionScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'stylist.tsx'),
        renderRouteExport(tabsDir, stylistScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'data.tsx'),
        renderRouteExport(tabsDir, dataScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'sdk-56.tsx'),
        renderRouteExport(tabsDir, expoSdk56Screen),
        routeForce
      )
    );
    await removeOptionalFile(path.join(tabsDir, 'two.tsx'));
    await removeOptionalFile(path.join(tabsDir, 'software-mansion.tsx'));
    await removeOptionalFile(path.join(tabsDir, 'nativewindui.tsx'));
    await removeOptionalFile(path.join(appDir, 'index.tsx'));
    return results;
  }

  const drawerDir = path.join(appDir, '(drawer)');
  const drawerTabsDir = path.join(drawerDir, '(tabs)');
  await mkdir(drawerTabsDir, { recursive: true });
  results.push(
    await writeIfAllowed(
      path.join(drawerDir, 'index.tsx'),
      renderRouteExport(drawerDir, homeScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'index.tsx'),
      renderRouteExport(drawerTabsDir, expositionScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'stylist.tsx'),
      renderRouteExport(drawerTabsDir, stylistScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'data.tsx'),
      renderRouteExport(drawerTabsDir, dataScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'sdk-56.tsx'),
      renderRouteExport(drawerTabsDir, expoSdk56Screen),
      routeForce
    )
  );
  await removeOptionalFile(path.join(drawerTabsDir, 'two.tsx'));
  await removeOptionalFile(path.join(drawerTabsDir, 'nativewindui.tsx'));
  await removeOptionalFile(path.join(appDir, 'index.tsx'));
  return results;
}

async function detectNavigationShell(projectPath: string): Promise<NavigationShell> {
  const cesRaw = await readOptionalText(path.join(projectPath, 'cesconfig.jsonc'));
  const fromCes = detectNavigationFromCesConfig(cesRaw);
  if (fromCes) {
    return fromCes;
  }

  const appLayout = await readOptionalText(path.join(projectPath, 'app', '_layout.tsx'));
  const srcLayout = await readOptionalText(path.join(projectPath, 'src', 'app', '_layout.tsx'));
  const layoutText = appLayout ?? srcLayout ?? '';
  if (layoutText.includes('Drawer')) {
    return { library: 'expo-router', layout: 'drawer + tabs' };
  }
  if (layoutText.includes('Tabs')) {
    return { library: 'expo-router', layout: 'tabs' };
  }

  const appTsx = await readOptionalText(path.join(projectPath, 'App.tsx'));
  if (appTsx?.includes('react-navigation')) {
    return { library: 'react-navigation', layout: 'stack' };
  }

  return { library: 'expo-router', layout: 'stack' };
}

function detectNavigationFromCesConfig(raw: string | null): NavigationShell | null {
  if (!raw) {
    return null;
  }
  try {
    const sanitized = raw.replace(/^\s*\/\/.*$/gmu, '');
    const parsed = JSON.parse(sanitized) as {
      packages?: Array<{
        name?: string;
        type?: string;
        options?: { type?: string };
      }>;
    };
    if (!Array.isArray(parsed.packages)) {
      return null;
    }
    const nav = parsed.packages.find((pkg) => pkg?.type === 'navigation');
    if (!nav?.name) {
      return null;
    }
    const layoutRaw = nav.options?.type;
    const layout: NavigationLayout =
      layoutRaw === 'tabs' || layoutRaw === 'drawer + tabs' || layoutRaw === 'stack'
        ? layoutRaw
        : 'stack';
    if (nav.name === 'react-navigation') {
      return { library: 'react-navigation', layout };
    }
    if (nav.name === 'expo-router') {
      return { library: 'expo-router', layout };
    }
    return null;
  } catch {
    return null;
  }
}

async function loadTemplateWithFallback(templatePath: string, fallback: string): Promise<string> {
  const template = await readOptionalText(templatePath);
  return template ?? fallback;
}

function ensureNativeWindMetroPostinstall(existing: string | undefined): string {
  const command = 'node ./scripts/patch-nativewind-metro.cjs';
  const trimmed = existing?.trim();
  if (!trimmed) {
    return command;
  }
  if (trimmed.includes(command)) {
    return trimmed;
  }
  if (trimmed === 'patch-package') {
    return command;
  }
  return `${trimmed} && ${command}`;
}

function renderStylistSyncAndroidScript(): string {
  return [
    '#!/usr/bin/env node',
    "import { existsSync } from 'node:fs';",
    "import { readFile } from 'node:fs/promises';",
    "import { createRequire } from 'node:module';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    "const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');",
    'const moduleCandidates = [',
    "  path.resolve(projectRoot, '..', '..', 'packages', 'cli', 'dist', 'stylist-theme.js'),",
    "  path.resolve(projectRoot, '..', 'packages', 'cli', 'dist', 'stylist-theme.js'),",
    "  path.resolve(projectRoot, 'packages', 'cli', 'dist', 'stylist-theme.js'),",
    "  path.resolve(projectRoot, 'node_modules', '@mr.dj2u', 'cli', 'dist', 'stylist-theme.js'),",
    '];',
    '',
    'try {',
    '  const modulePath = moduleCandidates.find((candidate) => existsSync(candidate));',
    '  if (!modulePath) {',
    "    console.error('Could not find @mr.dj2u/cli stylist sync module. Run npm install, then retry.');",
    '    process.exit(1);',
    '  }',
    '  const require = createRequire(import.meta.url);',
    "  const inputFile = process.env.MDS_STYLIST_INPUT_FILE",
    '    ? path.resolve(projectRoot, process.env.MDS_STYLIST_INPUT_FILE)',
    "    : path.join(projectRoot, 'project', 'theme.json');",
    "  const styleLibrary = process.env.MDS_STYLIST_STYLE_LIBRARY || 'auto';",
    '  const writePolicy =',
    "    process.env.MDS_STYLIST_WRITE_POLICY === 'overwrite' ? 'overwrite' : 'managed';",
    "  const theme = JSON.parse(await readFile(inputFile, 'utf8'));",
    '  const loaded = require(modulePath);',
    '  const result = await loaded.syncStylistTheme(projectRoot, theme, {',
    '    styleLibrary,',
    '    writePolicy,',
    '  });',
    '  console.log(JSON.stringify(result, null, 2));',
    '} catch (error) {',
    '  console.error(error instanceof Error ? error.message : String(error));',
    '  process.exit(1);',
    '}',
    '',
  ].join('\n');
}

function renderNativeWindMetroPatchScript(): string {
  return [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    '',
    'const targetPath = path.join(',
    '  __dirname,',
    "  '..',",
    "  'node_modules',",
    "  'react-native-css-interop',",
    "  'dist',",
    "  'metro',",
    "  'index.js'",
    ');',
    '',
    'const legacy = `            haste.emit("change", {',
    '                eventsQueue: [',
    '                    {',
    '                        filePath,',
    '                        metadata: {',
    '                            modifiedTime: Date.now(),',
    '                            size: 1,',
    '                            type: "virtual",',
    '                        },',
    '                        type: "change",',
    '                    },',
    '                ],',
    '            });`;',
    '',
    'const patched = `            haste.emit("change", {',
    '                changes: {',
    '                    addedFiles: new Map(),',
    '                    modifiedFiles: new Map([',
    '                        [',
    '                            filePath,',
    '                            {',
    '                                modifiedTime: Date.now(),',
    '                                isSymlink: false,',
    '                            },',
    '                        ],',
    '                    ]),',
    '                    removedFiles: new Map(),',
    '                },',
    '                rootDir: "",',
    '            });`;',
    '',
    'try {',
    '  if (!fs.existsSync(targetPath)) {',
    '    process.exit(0);',
    '  }',
    '',
    "  const current = fs.readFileSync(targetPath, 'utf8');",
    "  if (current.includes('addedFiles: new Map()')) {",
    '    process.exit(0);',
    '  }',
    '',
    '  if (!current.includes(legacy)) {',
    "    console.warn('[MDS] NativeWind Metro patch target did not match; leaving file unchanged.');",
    '    process.exit(0);',
    '  }',
    '',
    "  fs.writeFileSync(targetPath, current.replace(legacy, patched), 'utf8');",
    "  console.log('[MDS] Patched react-native-css-interop Metro change event for Metro 0.85.');",
    '} catch (error) {',
    '  console.warn(`[MDS] Could not patch NativeWind Metro integration: ${error.message}`);',
    '}',
    '',
  ].join('\n');
}

function renderStylistSyncApiRoute(): string {
  return [
    "import { spawn } from 'node:child_process';",
    "import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';",
    "import path from 'node:path';",
    '',
    "import stylistThemeTokens from '../../theme/tokens';",
    '',
    'interface SyncResponse {',
    '  projectPath: string;',
    '  updatedFiles: string[];',
    '}',
    '',
    'interface StylistSyncRequestBody {',
    '  theme: unknown;',
    '  metadata?: {',
    "    writePolicy?: 'managed' | 'overwrite';",
    "    styleLibrary?: 'auto' | 'uniwind' | 'nativewind' | 'nativewindui' | 'unistyles' | 'restyle' | 'tamagui' | 'stylesheet';",
    '  };',
    '}',
    '',
    'function parseSyncResponse(stdout: string): SyncResponse {',
    '  const trimmed = stdout.trim();',
    '  if (!trimmed) {',
    "    throw new Error('Stylist sync returned empty output.');",
    '  }',
    '  try {',
    '    return JSON.parse(trimmed) as SyncResponse;',
    '  } catch {',
    '    const match = trimmed.match(/\\{[\\s\\S]*\\}$/);',
    '    if (!match) {',
    "      throw new Error('Stylist sync returned non-JSON output.');",
    '    }',
    '    return JSON.parse(match[0]) as SyncResponse;',
    '  }',
    '}',
    '',
    'export async function POST(request: Request) {',
    '  try {',
    '    const payload = (await request.json()) as unknown;',
    '    const normalized = normalizeSyncPayload(payload);',
    '    const result = await runStylistSync(JSON.stringify(normalized.theme), normalized.metadata);',
    '    return Response.json(result);',
    '  } catch (error) {',
    '    return Response.json(',
    "      { error: error instanceof Error ? error.message : 'Unknown stylist sync error' },",
    '      { status: 400 }',
    '    );',
    '  }',
    '}',
    '',
    'export async function GET() {',
    "  const configPath = path.resolve(process.cwd(), 'project', 'stylist.config.json');",
    "  const themePath = path.resolve(process.cwd(), 'project', 'theme.json');",
    "  const stylePath = path.resolve(process.cwd(), 'project', 'style.md');",
    '',
    '  const themeFromJson = await readThemeJson(themePath);',
    '  const themeFromStyle = await readThemeFromStyleMarkdown(stylePath);',
    '  const resolvedTheme = themeFromStyle ?? themeFromJson ?? stylistThemeTokens;',
    "  const themeSource = themeFromStyle ? 'style.md' : themeFromJson ? 'theme.json' : 'default';",
    '  const mismatchDetected =',
    '    Boolean(themeFromJson) &&',
    '    Boolean(themeFromStyle) &&',
    '    JSON.stringify(themeFromJson) !== JSON.stringify(themeFromStyle);',
    '  try {',
    "    const raw = await readFile(configPath, 'utf8');",
    '    const parsed = JSON.parse(raw) as { writePolicy?: string; styleLibrary?: string };',
    '    return Response.json({',
    '      hasConfig: true,',
    '      writePolicy: parsed.writePolicy ?? null,',
    '      styleLibrary: parsed.styleLibrary ?? null,',
    '      theme: resolvedTheme,',
    '      themeSource,',
    '      mismatchDetected,',
    '    });',
    '  } catch {',
    '    return Response.json({',
    '      hasConfig: false,',
    '      writePolicy: null,',
    '      styleLibrary: null,',
    '      theme: resolvedTheme,',
    '      themeSource,',
    '      mismatchDetected,',
    '    });',
    '  }',
    '}',
    '',
    'function normalizeSyncPayload(value: unknown): StylistSyncRequestBody {',
    "  if (!value || typeof value !== 'object') {",
    "    throw new Error('Invalid stylist payload.');",
    '  }',
    '',
    '  const asRecord = value as Record<string, unknown>;',
    "  if ('theme' in asRecord && asRecord.theme) {",
    '    return {',
    '      theme: asRecord.theme,',
    '      metadata:',
    "        asRecord.metadata && typeof asRecord.metadata === 'object'",
    "          ? (asRecord.metadata as StylistSyncRequestBody['metadata'])",
    '          : undefined,',
    '    };',
    '  }',
    '',
    "  if ('metadata' in asRecord) {",
    "    throw new Error('Invalid stylist payload: missing theme.');",
    '  }',
    '',
    '  return { theme: value };',
    '}',
    '',
    'async function runStylistSync(',
    '  inputJson: string,',
    "  metadata?: StylistSyncRequestBody['metadata']",
    '): Promise<SyncResponse> {',
    "  const tempDir = path.resolve(process.cwd(), '.expo', 'stylist-sync');",
    '  await mkdir(tempDir, { recursive: true });',
    '  const tempInputPath = path.join(',
    '    tempDir,',
    '    `theme-${Date.now()}-${Math.random().toString(36).slice(2)}.json`',
    '  );',
    "  await writeFile(tempInputPath, inputJson, 'utf8');",
    '',
    '  const fileExists = async (filePath: string): Promise<boolean> => {',
    '    try {',
    '      await access(filePath);',
    '      return true;',
    '    } catch {',
    '      return false;',
    '    }',
    '  };',
    '',
    '  const runAttempt = async (',
    '    command: string,',
    '    args: string[],',
    '    env: NodeJS.ProcessEnv',
    '  ): Promise<SyncResponse> => {',
    '    return await new Promise<SyncResponse>((resolve, reject) => {',
    '      const child = spawn(command, args, {',
    '        cwd: process.cwd(),',
    "        stdio: ['ignore', 'pipe', 'pipe'],",
    '        windowsHide: true,',
    '        env,',
    '      });',
    '',
    "      let stdout = '';",
    "      let stderr = '';",
    "      child.stdout.on('data', (chunk) => {",
    '        stdout += String(chunk);',
    '      });',
    "      child.stderr.on('data', (chunk) => {",
    '        stderr += String(chunk);',
    '      });',
    '',
    "      child.on('error', (error) => {",
    '        reject(error);',
    '      });',
    '',
    '      const timeout = setTimeout(() => {',
    '        child.kill();',
    "        reject(new Error('Stylist sync timed out after 120 seconds.'));",
    '      }, 120000);',
    '',
    "      child.on('close', (code) => {",
    '        clearTimeout(timeout);',
    '        if (code !== 0) {',
    "          reject(new Error(stderr.trim() || `Stylist sync failed with exit code ${code ?? 'unknown'}.`));",
    '          return;',
    '        }',
    '',
    '        try {',
    '          resolve(parseSyncResponse(stdout));',
    '        } catch (error) {',
    '          reject(',
    '            new Error(',
    "              `Failed to parse stylist sync output: ${error instanceof Error ? error.message : String(error)}${stderr.trim() ? ` | stderr: ${stderr.trim()}` : ''}`",
    '            )',
    '          );',
    '        }',
    '      });',
    '    });',
    '  };',
    '',
    "  const scriptPath = path.resolve(process.cwd(), 'scripts', 'stylist-sync-android.mjs');",
    '  const env = {',
    '    ...process.env,',
    '    MDS_STYLIST_INPUT_FILE: path.relative(process.cwd(), tempInputPath),',
    "    MDS_STYLIST_WRITE_POLICY: metadata?.writePolicy ?? 'managed',",
    "    MDS_STYLIST_STYLE_LIBRARY: metadata?.styleLibrary ?? 'auto',",
    '  };',
    '',
    '  try {',
    '    if (!(await fileExists(scriptPath))) {',
    "      throw new Error('Stylist sync helper is missing. Run npm install, then retry.');",
    '    }',
    '    return await runAttempt(process.execPath, [scriptPath], env);',
    '  } finally {',
    '    try {',
    '      await unlink(tempInputPath);',
    '    } catch {',
    '      // no-op',
    '    }',
    '  }',
    '}',
    '',
    'async function readThemeJson(filePath: string): Promise<unknown | null> {',
    '  try {',
    "    const raw = await readFile(filePath, 'utf8');",
    '    return JSON.parse(raw) as unknown;',
    '  } catch {',
    '    return null;',
    '  }',
    '}',
    '',
    'async function readThemeFromStyleMarkdown(filePath: string): Promise<unknown | null> {',
    '  try {',
    "    const raw = await readFile(filePath, 'utf8');",
    "    const startToken = '<!-- MDS_STYLIST_THEME_START -->';",
    "    const endToken = '<!-- MDS_STYLIST_THEME_END -->';",
    '    const startIndex = raw.indexOf(startToken);',
    '    const endIndex = raw.indexOf(endToken);',
    '    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {',
    '      return null;',
    '    }',
    '    const block = raw.slice(startIndex, endIndex + endToken.length);',
    '    const match = block.match(/```json\\s*([\\s\\S]*?)\\s*```/i);',
    '    if (!match?.[1]) {',
    '      return null;',
    '    }',
    '    return JSON.parse(match[1]) as unknown;',
    '  } catch {',
    '    return null;',
    '  }',
    '}',
    '',
  ].join('\n');
}

function renderGlobalCssImport(layoutPath: string, projectPath: string): string {
  return `import '${toRelativeImportPath(path.dirname(layoutPath), path.join(projectPath, 'global.css'))}';`;
}

async function canWriteRichRootLayout(layoutPath: string): Promise<boolean> {
  const existing = await readOptionalText(layoutPath);
  if (!existing) {
    return true;
  }

  return !/\b(Tabs|Drawer)\b/.test(existing);
}

function toRelativeImportPath(fromDir: string, toPath: string): string {
  const normalized = path.relative(fromDir, toPath).replace(/\\/g, '/');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

async function writeIfAllowed(
  filePath: string,
  contents: string,
  force: boolean
): Promise<WriteResult> {
  if (!force && (await fileExists(filePath))) {
    return { filePath, wrote: false };
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
  return { filePath, wrote: true };
}

async function writeProjectMemoryFile(
  filePath: string,
  contents: string,
  force: boolean,
  normalizeExisting: boolean
): Promise<WriteResult> {
  if (force || !(await fileExists(filePath))) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, 'utf8');
    return { filePath, wrote: true };
  }

  const existing = await readOptionalText(filePath);
  if (existing === contents) {
    return { filePath, wrote: false };
  }

  if (!normalizeExisting) {
    return { filePath, wrote: false };
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
  return { filePath, wrote: true };
}

function shouldGenerateIntakeAgentHandoff(
  answers: OnboardAnswers,
  existingInfo: string | null,
  existingStyle: string | null
): boolean {
  return (
    hasThinOnboardingAnswers(answers) ||
    hasNonCanonicalContent(existingInfo, INFO_HEADINGS) ||
    hasNonCanonicalContent(existingStyle, STYLE_HEADINGS)
  );
}

function renderImportedNotes(
  existing: string | null | undefined,
  headings: readonly string[]
): string[] {
  const trimmed = existing?.trim();
  if (!trimmed || !hasNonCanonicalContent(trimmed, headings)) {
    return [];
  }

  return [
    '## Imported Notes',
    '',
    'The following notes existed before MDS normalized this file. An agent should move useful details into the correct sections during project intake.',
    '',
    '```md',
    trimmed,
    '```',
    '',
  ];
}

function hasNonCanonicalContent(
  existing: string | null | undefined,
  headings: readonly string[]
): boolean {
  const trimmed = existing?.trim();
  if (!trimmed) {
    return false;
  }

  return !headings.every((heading) => trimmed.includes(`## ${heading}`));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeOptionalFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // The NativeWind artifact is optional and may not exist.
  }
}

async function removeOptionalFileIfContains(filePath: string, token: string): Promise<void> {
  const existing = await readOptionalText(filePath);
  if (existing?.includes(token)) {
    await removeOptionalFile(filePath);
  }
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function renderGlobalCss(): string {
  return [
    "@import 'tailwindcss';",
    "@import 'uniwind';",
    '',
    renderGlobalCssThemeBlock(DEFAULT_STYLIST_THEME),
    '',
  ].join('\n');
}

function renderUniwindMetroConfig(): string {
  return [
    "const { getDefaultConfig } = require('expo/metro-config');",
    "const { withUniwindConfig } = require('uniwind/metro');",
    '',
    'const config = getDefaultConfig(__dirname);',
    '',
    'module.exports = withUniwindConfig(config, {',
    "  cssEntryFile: './global.css',",
    "  dtsFile: './src/uniwind-types.d.ts',",
    '});',
    '',
  ].join('\n');
}

function renderMockData(answers: OnboardAnswers): string {
  return [
    'export interface AppTask {',
    '  id: string;',
    '  title: string;',
    '  status: "todo" | "doing" | "done";',
    '}',
    '',
    'export interface AppSnapshot {',
    '  name: string;',
    '  audience: string;',
    '  tasks: AppTask[];',
    '}',
    '',
    'export const appSnapshot: AppSnapshot = {',
    `  name: ${JSON.stringify(answers.appName)},`,
    `  audience: ${JSON.stringify(answers.audience)},`,
    '  tasks: [',
    "    { id: 'task-1', title: 'Shape the first user flow', status: 'doing' },",
    "    { id: 'task-2', title: 'Replace mock data with the real data layer', status: 'todo' },",
    "    { id: 'task-3', title: 'Run mds doctor before pushing', status: 'todo' },",
    '  ] satisfies AppTask[],',
    '};',
    '',
  ].join('\n');
}

function renderLocalDataService(answers: OnboardAnswers): string {
  if (answers.dataStart === 'supabase') {
    return [
      "import { appSnapshot } from '../data/mock-app';",
      '',
      'export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {',
      '  return appSnapshot;',
      '}',
      '',
      'export const dataAdapterNotes = [',
      "  'This app is set to start with Supabase.',",
      "  'Use this adapter boundary for reads and writes so feature screens do not import Supabase directly.',",
      "  'Keep separate Supabase projects for test/staging and production.',",
      '];',
      '',
    ].join('\n');
  }

  return [
    "import { appSnapshot } from '../data/mock-app';",
    '',
    "import type { AppTask } from '../data/mock-app';",
    '',
    'let tasks: AppTask[] = [...appSnapshot.tasks];',
    '',
    'export async function ensureLocalDataReady(): Promise<void> {',
    '  tasks = tasks.length > 0 ? tasks : [...appSnapshot.tasks];',
    '}',
    '',
    'export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {',
    '  await ensureLocalDataReady();',
    '  return {',
    '    ...appSnapshot,',
    '    tasks,',
    '  };',
    '}',
    '',
    "export async function addLocalTask(title = 'Try the local data adapter'): Promise<typeof appSnapshot> {",
    '  await ensureLocalDataReady();',
    '  tasks = [',
    '    ...tasks,',
    '    {',
    '      id: `task-${Date.now()}`,',
    '      title,',
    "      status: 'todo',",
    '    },',
    '  ];',
    '  return getLocalAppSnapshot();',
    '}',
    '',
    'export const dataAdapterNotes = [',
    "  'This default adapter is web-safe and keeps generated apps runnable immediately.',",
    "  'Native builds use local-data.native.ts for the Expo SQLite demo.',",
    "  'Keep screens behind this adapter boundary so SQLite or Supabase can be swapped later.',",
    '];',
    '',
  ].join('\n');
}

function renderNativeLocalDataService(): string {
  return [
    "import * as SQLite from 'expo-sqlite';",
    '',
    "import { appSnapshot } from '../data/mock-app';",
    '',
    "import type { AppTask } from '../data/mock-app';",
    '',
    "const dbPromise = SQLite.openDatabaseAsync('exposition.db');",
    'let sqliteUnavailable = false;',
    'let memoryTasks: AppTask[] = [...appSnapshot.tasks];',
    '',
    'async function getDb() {',
    '  if (sqliteUnavailable) {',
    '    return null;',
    '  }',
    '',
    '  try {',
    '    return await dbPromise;',
    '  } catch {',
    '    sqliteUnavailable = true;',
    '    return null;',
    '  }',
    '}',
    '',
    'export async function ensureLocalDataReady(): Promise<void> {',
    '  const db = await getDb();',
    '  if (!db) {',
    '    return;',
    '  }',
    '',
    '  try {',
    '    await db.execAsync(`',
    '      CREATE TABLE IF NOT EXISTS exposition_tasks (',
    '        id TEXT PRIMARY KEY NOT NULL,',
    '        title TEXT NOT NULL,',
    '        status TEXT NOT NULL',
    '      );',
    '    `);',
    "    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exposition_tasks');",
    '    if ((row?.count ?? 0) > 0) {',
    '      return;',
    '    }',
    '',
    '    for (const task of appSnapshot.tasks) {',
    '      await db.runAsync(',
    "        'INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)',",
    '        task.id,',
    '        task.title,',
    '        task.status',
    '      );',
    '    }',
    '  } catch {',
    '    sqliteUnavailable = true;',
    '  }',
    '}',
    '',
    'export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {',
    '  await ensureLocalDataReady();',
    '  const db = await getDb();',
    '  if (!db) {',
    '    return { ...appSnapshot, tasks: memoryTasks };',
    '  }',
    '',
    '  try {',
    "    const tasks = await db.getAllAsync<AppTask>('SELECT id, title, status FROM exposition_tasks ORDER BY id');",
    '    return {',
    '      ...appSnapshot,',
    '      tasks,',
    '    };',
    '  } catch {',
    '    sqliteUnavailable = true;',
    '    return { ...appSnapshot, tasks: memoryTasks };',
    '  }',
    '}',
    '',
    "export async function addLocalTask(title = 'Try the local DB adapter'): Promise<typeof appSnapshot> {",
    '  await ensureLocalDataReady();',
    '  const db = await getDb();',
    '  const id = `task-${Date.now()}`;',
    '  if (!db) {',
    "    memoryTasks = [...memoryTasks, { id, title, status: 'todo' }];",
    '    return { ...appSnapshot, tasks: memoryTasks };',
    '  }',
    '',
    '  try {',
    "    await db.runAsync('INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)', id, title, 'todo');",
    '    return getLocalAppSnapshot();',
    '  } catch {',
    '    sqliteUnavailable = true;',
    "    memoryTasks = [...memoryTasks, { id, title, status: 'todo' }];",
    '    return { ...appSnapshot, tasks: memoryTasks };',
    '  }',
    '}',
    '',
  ].join('\n');
}

function renderRichRootLayout(
  projectPath: string,
  appDir: string,
  navigationShell: NavigationShell,
  answers: OnboardAnswers
): string {
  const themeProviderImport = toRelativeImportPath(
    appDir,
    path.join(projectPath, 'src', 'theme', 'provider')
  );
  const themeFontAssetsImport = toRelativeImportPath(
    appDir,
    path.join(projectPath, 'src', 'theme', 'font-assets')
  );
  const shouldRegisterExpositionRoutes =
    navigationShell.library !== 'expo-router' || navigationShell.layout === 'stack';
  const includeNativeWindUiExposition = answers.defaults.includes('nativewindui');
  const expositionScreens = shouldRegisterExpositionRoutes
    ? [
        '        <Stack.Screen name="exposition/index" options={{ title: \'Package Exposition\' }} />',
        '        <Stack.Screen name="exposition/stylist" options={{ title: \'Stylist\' }} />',
        '        <Stack.Screen name="exposition/data" options={{ title: \'Data\' }} />',
        '        <Stack.Screen name="exposition/sdk-56" options={{ title: \'Expo SDK 56\' }} />',
        ...(includeNativeWindUiExposition
          ? [
              '        <Stack.Screen name="exposition/nativewindui" options={{ title: \'NativeWindUI\' }} />',
            ]
          : []),
      ]
    : [];
  const nativeWindUiScreen: string[] = [];
  const shellScreen =
    navigationShell.layout === 'tabs'
      ? '        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />'
      : navigationShell.layout === 'drawer + tabs'
        ? '        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />'
        : '        <Stack.Screen name="index" options={{ title: \'Home\' }} />';

  return [
    renderGlobalCssImport(path.join(appDir, '_layout.tsx'), projectPath),
    "import type { ReactNode } from 'react';",
    "import { useEffect, useMemo } from 'react';",
    "import { DarkTheme, DefaultTheme, Link, Stack, ThemeProvider } from 'expo-router';",
    "import { useFonts } from 'expo-font';",
    "import { Platform, Pressable, StatusBar, Text, useColorScheme } from 'react-native';",
    "import { NavigationBar } from 'expo-navigation-bar';",
    "import * as SystemUI from 'expo-system-ui';",
    "import { GestureHandlerRootView } from 'react-native-gesture-handler';",
    "import { KeyboardProvider } from 'react-native-keyboard-controller';",
    "import { SafeAreaProvider } from 'react-native-safe-area-context';",
    `import THEME_FONT_ASSETS from '${themeFontAssetsImport}';`,
    `import { AppThemeProvider, useAppTheme } from '${themeProviderImport}';`,
    '',
    'function RouterThemeBridge({ children }: { children: ReactNode }) {',
    '  const theme = useAppTheme();',
    '  const systemScheme = useColorScheme();',
    '  const prefersDark =',
    "    theme.colorSystem.mode === 'automatic'",
    "      ? systemScheme === 'dark'",
    "      : theme.colorSystem.previewScheme === 'dark';",
    '  const base = prefersDark ? DarkTheme : DefaultTheme;',
    '  const shellColor = theme.activeColors.background;',
    '  const routerTheme = useMemo(',
    '    () => ({',
    '      ...base,',
    '      colors: {',
    '        ...base.colors,',
    '        background: shellColor,',
    '        border: theme.activeColors.surface,',
    '        card: shellColor,',
    '        notification: theme.activeColors.warning,',
    '        primary: theme.activeColors.primary,',
    '        text: theme.activeColors.text,',
    '      },',
    '    }),',
    '    [base, shellColor, theme.activeColors]',
    '  );',
    '',
    '  useEffect(() => {',
    '    void SystemUI.setBackgroundColorAsync?.(shellColor);',
    '  }, [shellColor]);',
    '',
    '  return <ThemeProvider value={routerTheme}>{children}</ThemeProvider>;',
    '}',
    '',
    'function LayoutInner() {',
    '  const theme = useAppTheme();',
    '  const shellColor = theme.activeColors.background;',
    '  return (',
    '    <GestureHandlerRootView style={{ flex: 1, backgroundColor: shellColor }}>',
    '      <KeyboardProvider>',
    '        <SafeAreaProvider>',
    '          <RouterThemeBridge>',
    '            <StatusBar',
    '              backgroundColor={shellColor}',
    '              barStyle={theme.colorSystem.previewScheme === "dark" ? "light-content" : "dark-content"}',
    '              translucent={false}',
    '            />',
    '            {Platform.OS === "android" ? (',
    '              <NavigationBar',
    '                style={theme.colorSystem.previewScheme === "dark" ? "dark" : "light"}',
    '              />',
    '            ) : null}',
    '            <Stack',
    '              screenOptions={{',
    '                contentStyle: { backgroundColor: shellColor },',
    "                headerShown: Platform.OS !== 'web',",
    '                headerRight: () => (',
    '                  <Link href="/settings" asChild>',
    "                    <Pressable accessibilityRole=\"button\" style={{ alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 }}>",
    "                      <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>i</Text>",
    '                    </Pressable>',
    '                  </Link>',
    '                ),',
    '              }}>',
    shellScreen,
    '        <Stack.Screen name="onboarding" options={{ title: \'Onboarding\' }} />',
    '        <Stack.Screen name="onboarding/agreement" options={{ title: \'Agreement\' }} />',
    '        <Stack.Screen name="onboarding/terms" options={{ title: \'Terms Of Service\' }} />',
    '        <Stack.Screen name="onboarding/account-setup" options={{ title: \'Account Setup\' }} />',
    ...expositionScreens,
    ...nativeWindUiScreen,
    "        <Stack.Screen name=\"settings\" options={{ presentation: 'modal', title: 'Settings' }} />",
    '            </Stack>',
    '          </RouterThemeBridge>',
    '        </SafeAreaProvider>',
    '      </KeyboardProvider>',
    '    </GestureHandlerRootView>',
    '  );',
    '}',
    '',
    'export default function Layout() {',
    '  const hasFontAssets = Object.keys(THEME_FONT_ASSETS).length > 0;',
    '  const [fontsLoaded, fontsError] = useFonts(THEME_FONT_ASSETS);',
    '',
    '  if (hasFontAssets && !fontsLoaded && !fontsError) {',
    '    return null;',
    '  }',
    '',
    '  return (',
    '    <AppThemeProvider>',
    '      <LayoutInner />',
    '    </AppThemeProvider>',
    '  );',
    '}',
    '',
  ].join('\n');
}

function renderSupabaseClient(): string {
  return [
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    "import { createClient } from '@supabase/supabase-js';",
    '',
    'const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;',
    'const supabasePublishableKey =',
    '  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;',
    '',
    'export const supabase = supabaseUrl && supabasePublishableKey',
    '  ? createClient(supabaseUrl, supabasePublishableKey, {',
    '      auth: {',
    '        storage: AsyncStorage,',
    '        autoRefreshToken: true,',
    '        persistSession: true,',
    '        detectSessionInUrl: false,',
    '      },',
    '    })',
    '  : null;',
    '',
    'export function assertSupabaseConfigured(): void {',
    '  if (!supabase) {',
    "    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using Supabase. EXPO_PUBLIC_SUPABASE_ANON_KEY is accepted as a fallback for older projects.');",
    '  }',
    '}',
    '',
  ].join('\n');
}

function renderGitHubPrChecksWorkflow(): string {
  return [
    'name: MDS PR Checks',
    '',
    'on:',
    '  pull_request:',
    '    branches: [test, main]',
    '  push:',
    '    branches: [test]',
    '',
    'jobs:',
    '  verify:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    '          node-version: 22',
    '      - name: Install dependencies',
    '        run: npm install',
    '      - name: Verify project',
    '        run: npm run ci:verify --if-present',
    '',
  ].join('\n');
}

function renderReleaseFlow(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} Release Flow`,
    '',
    '## Test-To-Main Safeguards',
    '',
    '- Build features on short-lived feature branches.',
    '- Open pull requests into `test` first.',
    '- Require the `MDS PR Checks` workflow to pass before merging into `test`.',
    '- Smoke test the app from `test` with staging data and staging Supabase keys when Supabase is used.',
    '- Promote from `test` to `main` only after validation.',
    '- Protect `main` so direct pushes are blocked and PR checks are required.',
    '',
    '## Supabase Environments',
    '',
    ...(answers.dataStart === 'supabase'
      ? [
          '- Use one Supabase project for test/staging and one Supabase project for production.',
          '- Keep publishable client keys in environment files for the matching branch/environment.',
          '- Never commit Supabase service-role or secret keys into the Expo app.',
        ]
      : [
          '- Local dummy data is the starting point.',
          '- When Supabase is introduced, create separate test/staging and production projects before wiring production data.',
        ]),
    '',
    '## GitHub Setup The User Still Needs To Do',
    '',
    '- Create `test` and `main` branches.',
    '- In GitHub branch protection, require pull requests and status checks for `test` and `main`.',
    '- Require the generated `MDS PR Checks` workflow before merge.',
    '',
  ].join('\n');
}

function renderAnimatedPressable(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { Pressable, StyleSheet, Text } from 'react-native';",
    "import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';",
    '',
    'const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);',
    '',
    'interface AnimatedPressableProps {',
    '  backgroundColor?: string;',
    '  children?: ReactNode;',
    '  label?: string;',
    '  onPress?: () => void;',
    '  textColor?: string;',
    '}',
    '',
    'export function AnimatedPressable({',
    "  backgroundColor = '#111827',",
    '  children,',
    "  label = 'Reanimated press demo',",
    '  onPress,',
    "  textColor = '#ffffff',",
    '}: AnimatedPressableProps) {',
    '  const pressed = useSharedValue(0);',
    '  const animatedStyle = useAnimatedStyle(() => ({',
    '    transform: [{ scale: withTiming(pressed.value ? 0.97 : 1, { duration: 120 }) }],',
    '  }));',
    '',
    '  return (',
    '    <AnimatedPressableBase',
    '      onPress={onPress}',
    '      onPressIn={() => {',
    '        pressed.value = 1;',
    '      }}',
    '      onPressOut={() => {',
    '        pressed.value = 0;',
    '      }}',
    '      style={[styles.button, { backgroundColor }, animatedStyle]}',
    '    >',
    '      {children ?? <Text style={[styles.label, { color: textColor }]}>{label}</Text>}',
    '    </AnimatedPressableBase>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  button: {',
    "    backgroundColor: '#111827',",
    '    borderRadius: 10,',
    '    paddingHorizontal: 16,',
    '    paddingVertical: 12,',
    '  },',
    '  label: {',
    '    fontSize: 15,',
    '    fontWeight: "700",',
    '    textAlign: "center",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderGestureCard(): string {
  return [
    "import { StyleSheet, Text } from 'react-native';",
    "import { Gesture, GestureDetector } from 'react-native-gesture-handler';",
    "import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';",
    '',
    'interface GestureCardProps {',
    '  title: string;',
    '  body: string;',
    '}',
    '',
    'export function GestureCard({ title, body }: GestureCardProps) {',
    '  const offset = useSharedValue(0);',
    '  const pan = Gesture.Pan()',
    '    .onChange((event) => {',
    '      offset.value = event.translationX;',
    '    })',
    '    .onFinalize(() => {',
    '      offset.value = withSpring(0);',
    '    });',
    '',
    '  const style = useAnimatedStyle(() => ({',
    '    transform: [{ translateX: offset.value }],',
    '  }));',
    '',
    '  return (',
    '    <GestureDetector gesture={pan}>',
    '      <Animated.View style={[styles.card, style]}>',
    '        <Text style={styles.title}>{title}</Text>',
    '        <Text style={styles.body}>{body}</Text>',
    '      </Animated.View>',
    '    </GestureDetector>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  card: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    padding: 16,',
    "    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.08)',",
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 16,',
    '    fontWeight: "700",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '    marginTop: 8,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderKeyboardForm(): string {
  return [
    "import { Keyboard, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';",
    '',
    'export function KeyboardForm() {',
    '  if (Platform.OS === "web") {',
    '    return (',
    '      <ScrollView contentContainerStyle={styles.form} style={styles.scroller}>',
    '        <TextInput blurOnSubmit onSubmitEditing={Keyboard.dismiss} placeholder="Project note" returnKeyType="done" style={styles.input} />',
    '        <TextInput blurOnSubmit multiline onSubmitEditing={Keyboard.dismiss} placeholder="Details" returnKeyType="done" style={[styles.input, styles.multiline]} />',
    '      </ScrollView>',
    '    );',
    '  }',
    '',
    "  const keyboardController = require('react-native-keyboard-controller') as {",
    '    KeyboardAwareScrollView: any;',
    '    KeyboardToolbar: any;',
    '  };',
    '  const KeyboardAwareScrollView = keyboardController.KeyboardAwareScrollView;',
    '  const KeyboardToolbar = keyboardController.KeyboardToolbar;',
    '',
    '  return (',
    '    <>',
    '      <KeyboardAwareScrollView bottomOffset={72} contentContainerStyle={styles.form} style={styles.scroller}>',
    '        <TextInput blurOnSubmit onSubmitEditing={Keyboard.dismiss} placeholder="Project note" returnKeyType="done" style={styles.input} />',
    '        <TextInput blurOnSubmit multiline onSubmitEditing={Keyboard.dismiss} placeholder="Details" returnKeyType="done" style={[styles.input, styles.multiline]} />',
    '      </KeyboardAwareScrollView>',
    '      <KeyboardToolbar onDoneCallback={Keyboard.dismiss} />',
    '    </>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  scroller: {',
    '    maxHeight: 220,',
    '  },',
    '  form: {',
    '    gap: 12,',
    '    paddingVertical: 8,',
    '  },',
    '  input: {',
    "    borderColor: '#d1d5db',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    minHeight: 44,',
    '    paddingHorizontal: 12,',
    '  },',
    '  multiline: {',
    '    minHeight: 88,',
    '    paddingTop: 10,',
    '    textAlignVertical: "top",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderSvgMark(): string {
  return [
    "import Svg, { Path } from 'react-native-svg';",
    '',
    'export function SvgMark({ size = 44 }: { size?: number }) {',
    '  return (',
    '    <Svg width={size} height={size} viewBox="0 0 2048 2048" accessibilityRole="image">',
    '      <Path fill="#5666ff" d="m146.9 1305.8l-14.4 30q0 32.2 89.9 62.1 91 28.9 198.6 28.9 108.8 0 238.6-32.2 129.8-32.2 225.2-78.8 96.6-46.6 158.7-97.6 63.3-51.1 63.3-88.8 0-47.7-111-88.8-111-41-322.9-89.8-210.8-50-309.6-125.4-97.6-75.5-97.6-183.1 0-108.8 77.6-207.5 77.7-98.8 202-175.3 125.4-76.6 273-136.5 305.1-123.2 565.9-123.2 99.9 0 176.4 17.8 146.5 34.4 146.5 90.9 0 56.6-10 77.7-10 20-16.6 26.7-5.6 6.6-15.6 13.3-8.9 6.6-13.3 10-48.8 41-267.4 51-75.5 3.3-82.1 7.8-6.7 4.4-12.2 4.4-4.5 0-11.1-8.9-6.7-8.9-6.7-28.8 0-20 43.3-73.3-135.4 7.8-289.6 62.2-153.2 54.4-266.3 123.1-113.2 67.7-188.7 134.3-75.4 65.5-75.4 93.2 0 26.7 16.6 44.4 46.6 49.9 258.6 104.3 219.7 56.6 292.9 91 73.2 34.4 120.9 65.5 48.9 31 77.7 63.2 67.7 77.7 67.7 157.6 0 79.9-43.3 149.8-42.1 69.9-128.7 135.4-85.4 65.4-201.9 116.5-255.3 114.3-608.1 114.3-257.5 0-328.5-136.5-18.8-34.4-18.8-71 0-37.8 16.6-67.7 17.8-30 42.2-45.5 47.7-30 67.7-30 19.9 0 19.9 13.3z" />',
    '      <Path fill="#f66d22" d="m486.9 1709.8l-14.4 30q0 32.2 89.9 62.1 91 28.9 198.6 28.9 108.8 0 238.6-32.2 129.8-32.2 225.2-78.8 96.6-46.6 158.7-97.6 63.3-51.1 63.3-88.8 0-47.7-111-88.8-111-41-322.9-89.8-210.8-50-309.6-125.4-97.6-75.5-97.6-183.1 0-108.8 77.6-207.5 77.7-98.8 202-175.3 125.4-76.6 273-136.5 305.1-123.2 565.9-123.2 99.9 0 176.4 17.8 146.5 34.4 146.5 90.9 0 56.6-10 77.7-10 20-16.6 26.7-5.6 6.6-15.6 13.3-8.9 6.6-13.3 10-48.8 41-267.4 51-75.5 3.3-82.1 7.8-6.7 4.4-12.2 4.4-4.5 0-11.1-8.9-6.7-8.9-6.7-28.8 0-20 43.3-73.3-135.4 7.8-289.6 62.2-153.2 54.4-266.3 123.1-113.2 67.7-188.7 134.3-75.4 65.5-75.4 93.2 0 26.7 16.6 44.4 46.6 49.9 258.6 104.3 219.7 56.6 292.9 91 73.2 34.4 120.9 65.5 48.9 31 77.7 63.2 67.7 77.7 67.7 157.6 0 79.9-43.3 149.8-42.1 69.9-128.7 135.4-85.4 65.4-201.9 116.5-255.3 114.3-608.1 114.3-257.5 0-328.5-136.5-18.8-34.4-18.8-71 0-37.8 16.6-67.7 17.8-30 42.2-45.5 47.7-30 67.7-30 19.9 0 19.9 13.3z" />',
    '    </Svg>',
    '  );',
    '}',
    '',
  ].join('\n');
}

function renderScreensCard(): string {
  return [
    "import { useEffect } from 'react';",
    "import { StyleSheet, Text, View } from 'react-native';",
    "import { enableScreens } from 'react-native-screens';",
    '',
    'export function ScreensCard() {',
    '  useEffect(() => {',
    '    enableScreens(true);',
    '  }, []);',
    '',
    '  return (',
    '    <View style={styles.card}>',
    '      <Text style={styles.title}>Native Screens</Text>',
    '      <Text style={styles.body}>react-native-screens is enabled so navigation can use native screen primitives for better memory and lifecycle behavior.</Text>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  card: {',
    "    backgroundColor: '#eef2ff',",
    "    borderColor: '#c7d2fe',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    padding: 16,',
    '  },',
    '  title: {',
    "    color: '#312e81',",
    '    fontSize: 16,',
    '    fontWeight: "700",',
    '  },',
    '  body: {',
    "    color: '#4338ca',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '    marginTop: 8,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderExpositionNotice(): string {
  return ['export function ExpositionNotice() {', '  return null;', '}', ''].join('\n');
}

function renderSoftwareMansionLogo(): string {
  return [
    "import { SvgXml } from 'react-native-svg';",
    '',
    'const softwareMansionLogoXml = `<svg fill="currentColor" viewBox="0 0 149.79 80" xmlns="http://www.w3.org/2000/svg" width="150" height="80" preserveAspectRatio="xMidYMid meet"><path d="M24.281 79.063h124.58V24.356L125.513.937H.933v54.707z" fill="#fff"></path><path d="M0 .001h125.9l23.894 23.967V80h-125.9L.002 56.033V0zm1.867 3.198v52.057l21.48 21.545V24.744zm1.321-1.324 21.48 21.545h121.94l-21.48-21.545zm144.74 23.418H25.218v52.833h122.71z"></path><path d="M47.255 46.215c0 1.873-1.246 3.496-4.234 3.496-1.308 0-2.367-.312-3.3-.686v-2.623c.996.5 2.179.812 3.237.812.997 0 1.494-.312 1.494-.875 0-1.748-4.731-1.187-4.731-4.746 0-2.185 1.744-3.498 4.172-3.498.995 0 1.929.251 2.926.813v2.685c-1.308-.812-2.242-1.062-2.989-1.062-.872 0-1.37.313-1.37.874-.062 1.625 4.794 1 4.794 4.81z"></path><path d="M49.62 43.903c0-3.184 2.614-5.807 5.79-5.807 3.175 0 5.79 2.623 5.79 5.808 0 3.185-2.615 5.807-5.79 5.807-3.176-.062-5.79-2.622-5.79-5.807zm8.716 0c0-1.748-1.307-3.06-2.927-3.06-1.618 0-2.925 1.312-2.925 3.061 0 1.748 1.307 3.06 2.925 3.06 1.62 0 2.927-1.312 2.927-3.061z"></path><path d="M67.675 37.408v.937h3.674l-1.246 2.623h-2.366v8.493H65.06v-8.556h-1.867v-2.622h1.867v-1.061c0-3.373 1.744-5.059 4.483-5.059.685 0 1.307.125 1.868.25v2.623c-.498-.187-1.058-.25-1.62-.25-1.494 0-2.116 1-2.116 2.623z"></path><path d="M76.952 40.906v4.434c0 1.187.685 1.687 1.743 1.687.685 0 1.37-.188 1.93-.562v2.747c-.747.312-1.431.5-2.427.5-2.43 0-3.923-1.312-3.923-3.998v-4.746h-1.619v-2.622h1.62v-2.873l2.676-.687v3.56h3.674v2.622h-3.674z"></path><path d="m99.988 38.346-3.549 11.115h-2.677l-2.428-7.619-2.49 7.619h-2.678l-3.549-11.115h3.051l1.992 7.432 2.367-7.432h2.676l2.367 7.432 1.992-7.432z"></path><path d="M101.36 43.903c0-3.184 2.303-5.807 5.48-5.807 1.244 0 2.24.375 2.987 1v-.75h2.678v11.115h-2.616v-.874c-.747.687-1.805 1.124-3.112 1.124-3.052-.062-5.417-2.622-5.417-5.807zm8.717 0c0-1.748-1.308-3.06-2.927-3.06s-2.926 1.312-2.926 3.061c0 1.748 1.307 3.06 2.926 3.06 1.619 0 2.927-1.312 2.927-3.061z"></path><path d="M116.3 38.346h2.615v1.498c.81-1.498 2.303-1.748 3.611-1.748v3.184c-1.868-.5-3.548.562-3.548 2.936v5.183H116.3z"></path><path d="M130.99 47.089a9.627 9.627 0 0 0 3.549-.687l-1.37 2.81a7.296 7.296 0 0 1-2.677.5c-3.923 0-6.288-2.436-6.288-5.808 0-3.185 2.365-5.808 5.79-5.808 2.303 0 4.171 1.187 4.918 2.685v4.06h-7.844c.373 1.31 1.68 2.248 3.922 2.248zm-3.985-4.371h5.79c-.373-1.313-1.494-2.124-2.926-2.124-1.37 0-2.428.874-2.864 2.124z"></path><path d="M55.223 58.83v7.306h-2.677v-6.869c0-1.187-.872-1.873-1.743-1.873-.934 0-1.744.686-1.744 1.873v6.869h-2.676v-6.869c0-1.187-.872-1.873-1.744-1.873-.934 0-1.743.686-1.743 1.873v6.869H40.22V55.02h2.615v.812c.622-.75 1.432-1 2.49-1 1.183 0 2.18.5 2.864 1.437.871-1 1.992-1.436 3.362-1.436 2.054 0 3.673 1.623 3.673 3.996z"></path><path d="M58.025 60.579c0-3.186 2.304-5.808 5.478-5.808 1.246 0 2.243.374 2.989.999v-.75h2.677v11.115h-2.615v-.874c-.747.687-1.805 1.124-3.112 1.124-3.052 0-5.417-2.622-5.417-5.807zm8.717 0c0-1.75-1.308-3.061-2.927-3.061s-2.926 1.312-2.926 3.061c0 1.748 1.308 3.06 2.926 3.06s2.927-1.312 2.927-3.061z"></path><path d="M72.843 55.02h2.614v.812c.81-.812 1.868-1.062 2.927-1.062 2.304 0 4.17 1.748 4.17 4.122v7.18h-2.676v-6.556a2.103 2.103 0 0 0-2.117-2.123 2.102 2.102 0 0 0-2.116 2.123v6.62h-2.678V55.02h-.124z"></path><path d="M93.326 62.889c0 1.873-1.245 3.496-4.234 3.496-1.307 0-2.366-.312-3.299-.686v-2.623c.996.5 2.179.812 3.238.812.996 0 1.493-.312 1.493-.874 0-1.75-4.73-1.188-4.73-4.747 0-2.186 1.742-3.497 4.17-3.497.996 0 1.93.25 2.927.812v2.685c-1.308-.812-2.242-1.062-2.989-1.062-.872 0-1.37.312-1.37.874-.062 1.687 4.794 1.063 4.794 4.81z"></path><path d="M99.116 55.02v11.115h-2.677V55.02z"></path><path d="M101.92 60.579c0-3.186 2.615-5.808 5.79-5.808s5.79 2.622 5.79 5.807-2.615 5.807-5.79 5.807-5.79-2.622-5.79-5.807zm8.717 0c0-1.75-1.307-3.061-2.927-3.061-1.618 0-2.926 1.312-2.926 3.061 0 1.748 1.308 3.06 2.926 3.06 1.62 0 2.927-1.312 2.927-3.061z"></path><path d="M116.24 55.02h2.615v.812c.81-.812 1.868-1.062 2.927-1.062 2.303 0 4.17 1.748 4.17 4.122v7.18h-2.676v-6.556a2.103 2.103 0 0 0-2.118-2.123 2.103 2.103 0 0 0-2.116 2.123v6.62h-2.677V55.02h-.125z"></path><path d="M131.24 63.076v.437h-.933v2.623h-.499v-2.623h-.933v-.437z"></path><path d="m132.3 63.076.997 2.435.933-2.435h.623v3.06h-.498v-2.248l-.934 2.248h-.436l-.934-2.248v2.248h-.498v-3.061h.747z"></path></svg>`;',
    '',
    'export function SoftwareMansionLogo({ width = 150, height = 80 }: { width?: number; height?: number }) {',
    '  return <SvgXml xml={softwareMansionLogoXml} width={width} height={height} accessibilityRole="image" />;',
    '}',
    '',
  ].join('\n');
}

function renderPackageCard(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'interface PackageCardProps {',
    '  title: string;',
    '  packageName: string;',
    '  body: string;',
    '  children?: ReactNode;',
    '}',
    '',
    'export function PackageCard({ title, packageName, body, children }: PackageCardProps) {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '',
    '  return (',
    '    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '      <Text style={[styles.packageName, { color: colors.text }]}>{packageName}</Text>',
    `      <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>{title}</Text>`,
    '      <Text style={[styles.body, { color: colors.text }]}>{body}</Text>',
    '      {children ? <View style={styles.demo}>{children}</View> : null}',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  card: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 16,',
    '  },',
    '  packageName: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 17,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '  demo: {',
    '    marginTop: 6,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderExpositionComponentIndex(): string {
  return [
    "export { AnimatedPressable } from './animated-pressable';",
    "export { ExpositionNotice } from './notice';",
    "export { GestureCard } from './gesture-card';",
    "export { KeyboardForm } from './keyboard-form';",
    "export { PackageCard } from './package-card';",
    "export { ScreensCard } from './screens-card';",
    "export { SoftwareMansionLogo } from './software-mansion-logo';",
    "export { SvgMark } from './svg-mark';",
    '',
  ].join('\n');
}

function renderNativeWindUiActivityIndicator(): string {
  return [
    "import type { ComponentProps } from 'react';",
    "import { ActivityIndicator as RNActivityIndicator } from 'react-native';",
    '',
    'export function ActivityIndicator(props: ComponentProps<typeof RNActivityIndicator>) {',
    '  return <RNActivityIndicator color="#2563eb" {...props} />;',
    '}',
    '',
  ].join('\n');
}

function renderNativeWindUiAvatar(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { StyleSheet, View, type ViewProps } from 'react-native';",
    '',
    'type AvatarProps = ViewProps & {',
    '  children?: ReactNode;',
    '  className?: string;',
    '};',
    '',
    'export function Avatar({ children, className: _className, style, ...props }: AvatarProps) {',
    '  return (',
    '    <View style={[styles.avatar, style]} {...props}>',
    '      {children}',
    '    </View>',
    '  );',
    '}',
    '',
    'export function AvatarFallback({ children, className: _className, style, ...props }: AvatarProps) {',
    '  return (',
    '    <View style={[styles.fallback, style]} {...props}>',
    '      {children}',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  avatar: {',
    "    alignItems: 'center',",
    "    backgroundColor: '#e2e8f0',",
    '    borderRadius: 999,',
    '    height: 48,',
    "    justifyContent: 'center',",
    '    width: 48,',
    '  },',
    '  fallback: {',
    "    alignItems: 'center',",
    "    justifyContent: 'center',",
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiButton(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { Pressable, StyleSheet, type PressableProps } from 'react-native';",
    '',
    "type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'plain';",
    '',
    'export interface ButtonProps extends PressableProps {',
    '  children?: ReactNode;',
    '  variant?: ButtonVariant;',
    '}',
    '',
    'export function Button({ children, style, variant = "primary", ...props }: ButtonProps) {',
    '  return (',
    '    <Pressable',
    '      {...props}',
    "      style={(state) => [styles.base, styles[variant], typeof style === 'function' ? style(state) : style]}",
    '      accessibilityRole="button">',
    '      {children}',
    '    </Pressable>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  base: {',
    "    alignItems: 'center',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    "    justifyContent: 'center',",
    '    minHeight: 40,',
    '    paddingHorizontal: 14,',
    '    paddingVertical: 10,',
    '  },',
    '  plain: {',
    "    backgroundColor: 'transparent',",
    "    borderColor: '#d1d5db',",
    '  },',
    '  primary: {',
    "    backgroundColor: '#2563eb',",
    "    borderColor: '#1d4ed8',",
    '  },',
    '  secondary: {',
    "    backgroundColor: '#f8fafc',",
    "    borderColor: '#94a3b8',",
    '  },',
    '  tonal: {',
    "    backgroundColor: '#dbeafe',",
    "    borderColor: '#93c5fd',",
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiDatePicker(): string {
  return [
    "import { Pressable, StyleSheet, Text, View } from 'react-native';",
    '',
    'export interface DatePickerProps {',
    "  mode?: 'date' | 'time' | 'datetime';",
    '  value: Date;',
    '  onChange?: (event: unknown, selectedDate?: Date) => void;',
    '}',
    '',
    'export function DatePicker({ value, onChange }: DatePickerProps) {',
    '  return (',
    '    <View style={styles.container}>',
    '      <Text style={styles.value}>{value.toDateString()}</Text>',
    '      <Pressable',
    '        onPress={() => onChange?.({ type: "set" }, new Date())}',
    '        style={styles.button}',
    '        accessibilityRole="button">',
    '        <Text style={styles.buttonText}>Use Today</Text>',
    '      </Pressable>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  button: {',
    "    backgroundColor: '#eff6ff',",
    '    borderRadius: 10,',
    "    borderColor: '#bfdbfe',",
    '    borderWidth: 1,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 8,',
    '  },',
    '  buttonText: {',
    "    color: '#1d4ed8',",
    '    fontWeight: "700",',
    '  },',
    '  container: {',
    "    alignItems: 'center',",
    "    flexDirection: 'row',",
    "    justifyContent: 'space-between',",
    '  },',
    '  value: {',
    "    color: '#334155',",
    '    fontSize: 14,',
    '    fontWeight: "600",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiPicker(): string {
  return [
    "import { Children, isValidElement, type ReactNode } from 'react';",
    "import { Pressable, StyleSheet, Text, View } from 'react-native';",
    '',
    'export interface PickerItemProps {',
    '  label: string;',
    '  value: string;',
    '}',
    '',
    'export interface PickerProps {',
    '  selectedValue: string;',
    '  onValueChange?: (value: string) => void;',
    '  children?: ReactNode;',
    '}',
    '',
    'export function Picker({ selectedValue, onValueChange, children }: PickerProps) {',
    '  const items = Children.toArray(children)',
    '    .filter(isValidElement)',
    '    .map((child) => child.props as PickerItemProps);',
    '',
    '  return (',
    '    <View style={styles.row}>',
    '      {items.map((item) => {',
    '        const active = item.value === selectedValue;',
    '        return (',
    '          <Pressable',
    '            key={item.value}',
    '            onPress={() => onValueChange?.(item.value)}',
    '            style={[styles.item, active ? styles.itemActive : styles.itemIdle]}',
    '            accessibilityRole="button">',
    '            <Text style={active ? styles.textActive : styles.textIdle}>{item.label}</Text>',
    '          </Pressable>',
    '        );',
    '      })}',
    '    </View>',
    '  );',
    '}',
    '',
    'export function PickerItem(_props: PickerItemProps) {',
    '  return null;',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  item: {',
    '    borderRadius: 999,',
    '    borderWidth: 1,',
    '    minHeight: 34,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 8,',
    '  },',
    '  itemActive: {',
    "    backgroundColor: '#2563eb',",
    "    borderColor: '#1d4ed8',",
    '  },',
    '  itemIdle: {',
    "    backgroundColor: '#f8fafc',",
    "    borderColor: '#cbd5e1',",
    '  },',
    '  row: {',
    "    flexDirection: 'row',",
    "    flexWrap: 'wrap',",
    '    gap: 8,',
    '  },',
    '  textActive: {',
    "    color: '#ffffff',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '  },',
    '  textIdle: {',
    "    color: '#334155',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiProgressIndicator(): string {
  return [
    "import { StyleSheet, View } from 'react-native';",
    '',
    'export interface ProgressIndicatorProps {',
    '  value: number;',
    '}',
    '',
    'export function ProgressIndicator({ value }: ProgressIndicatorProps) {',
    '  const clamped = Math.max(0, Math.min(100, Math.round(value)));',
    '  return (',
    '    <View style={styles.track}>',
    '      <View style={[styles.fill, { width: `${clamped}%` }]} />',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  fill: {',
    "    backgroundColor: '#2563eb',",
    '    borderRadius: 999,',
    "    height: '100%',",
    '  },',
    '  track: {',
    "    backgroundColor: '#dbeafe',",
    '    borderRadius: 999,',
    '    height: 10,',
    "    overflow: 'hidden',",
    '    width: "100%",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiSlider(): string {
  return [
    "import { Pressable, StyleSheet, Text, View } from 'react-native';",
    '',
    'export interface SliderProps {',
    '  value: number;',
    '  onValueChange?: (value: number) => void;',
    '  min?: number;',
    '  max?: number;',
    '  step?: number;',
    '  disabled?: boolean;',
    '}',
    '',
    'export function Slider({',
    '  value,',
    '  onValueChange,',
    '  min = 0,',
    '  max = 1,',
    '  step = 0.05,',
    '  disabled = false,',
    '}: SliderProps) {',
    '  const clamp = (next: number) => Math.max(min, Math.min(max, next));',
    '  const changeBy = (delta: number) => onValueChange?.(clamp(Number((value + delta).toFixed(3))));',
    '',
    '  return (',
    '    <View style={[styles.row, disabled && styles.disabled]}>',
    '      <Pressable disabled={disabled} onPress={() => changeBy(-step)} style={styles.button} accessibilityRole="button">',
    '        <Text style={styles.buttonLabel}>-</Text>',
    '      </Pressable>',
    '      <Text style={styles.value}>{value.toFixed(2)}</Text>',
    '      <Pressable disabled={disabled} onPress={() => changeBy(step)} style={styles.button} accessibilityRole="button">',
    '        <Text style={styles.buttonLabel}>+</Text>',
    '      </Pressable>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  button: {',
    "    alignItems: 'center',",
    "    backgroundColor: '#eff6ff',",
    '    borderRadius: 10,',
    "    borderColor: '#bfdbfe',",
    '    borderWidth: 1,',
    "    justifyContent: 'center',",
    '    minHeight: 36,',
    '    minWidth: 36,',
    '  },',
    '  buttonLabel: {',
    "    color: '#1d4ed8',",
    '    fontSize: 18,',
    '    fontWeight: "700",',
    '  },',
    '  disabled: {',
    '    opacity: 0.45,',
    '  },',
    '  row: {',
    "    alignItems: 'center',",
    "    flexDirection: 'row',",
    '    gap: 10,',
    '  },',
    '  value: {',
    "    color: '#334155',",
    '    fontSize: 14,',
    '    fontVariant: ["tabular-nums"],',
    '    fontWeight: "700",',
    '    minWidth: 52,',
    "    textAlign: 'center',",
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiText(): string {
  return [
    "import type { TextProps } from 'react-native';",
    "import { StyleSheet, Text as RNText } from 'react-native';",
    '',
    "type Variant = 'largeTitle' | 'heading' | 'body' | 'callout' | 'subhead' | 'footnote' | 'caption2';",
    "type Tone = 'primary' | 'secondary' | 'tertiary' | 'quarternary';",
    '',
    'export interface NativeWindUiTextProps extends TextProps {',
    '  variant?: Variant;',
    '  color?: Tone;',
    '  className?: string;',
    '}',
    '',
    'const variantStyles: Record<Variant, TextProps["style"]> = {',
    '  largeTitle: { fontSize: 30, fontWeight: "900", lineHeight: 36 },',
    '  heading: { fontSize: 18, fontWeight: "800", lineHeight: 24 },',
    '  body: { fontSize: 16, fontWeight: "500", lineHeight: 22 },',
    '  callout: { fontSize: 15, fontWeight: "600", lineHeight: 21 },',
    '  subhead: { fontSize: 14, fontWeight: "700", lineHeight: 20 },',
    '  footnote: { fontSize: 13, fontWeight: "500", lineHeight: 18 },',
    '  caption2: { fontSize: 12, fontWeight: "700", lineHeight: 16 },',
    '};',
    '',
    'const toneStyles: Record<Tone, TextProps["style"]> = {',
    '  primary: { color: "#0f172a" },',
    '  secondary: { color: "#334155" },',
    '  tertiary: { color: "#475569" },',
    '  quarternary: { color: "#64748b" },',
    '};',
    '',
    'export function Text({',
    '  variant = "body",',
    '  color = "primary",',
    '  className: _className,',
    '  style,',
    '  ...props',
    '}: NativeWindUiTextProps) {',
    '  return <RNText {...props} style={[styles.base, variantStyles[variant], toneStyles[color], style]} />;',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  base: {',
    "    color: '#0f172a',",
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiThemeToggle(): string {
  return [
    "import { useState } from 'react';",
    "import { Pressable, StyleSheet, Text } from 'react-native';",
    '',
    'export function ThemeToggle() {',
    '  const [darkPreview, setDarkPreview] = useState(false);',
    '  return (',
    '    <Pressable',
    '      onPress={() => setDarkPreview((current) => !current)}',
    '      style={[styles.button, darkPreview ? styles.dark : styles.light]}',
    '      accessibilityRole="button">',
    '      <Text style={[styles.label, darkPreview ? styles.darkLabel : styles.lightLabel]}>{darkPreview ? "Dark preview" : "Light preview"}</Text>',
    '    </Pressable>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  button: {',
    "    alignItems: 'center',",
    '    borderRadius: 999,',
    '    borderWidth: 1,',
    "    justifyContent: 'center',",
    '    minHeight: 34,',
    '    minWidth: 120,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 6,',
    '  },',
    '  dark: {',
    "    backgroundColor: '#0f172a',",
    "    borderColor: '#1e293b',",
    '  },',
    '  darkLabel: {',
    "    color: '#f8fafc',",
    '  },',
    '  label: {',
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '  },',
    '  light: {',
    "    backgroundColor: '#dbeafe',",
    "    borderColor: '#93c5fd',",
    '  },',
    '  lightLabel: {',
    "    color: '#0f172a',",
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderNativeWindUiToggle(): string {
  return [
    "import { Switch } from 'react-native';",
    '',
    'export interface ToggleProps {',
    '  value: boolean;',
    '  onValueChange?: (next: boolean) => void;',
    '}',
    '',
    'export function Toggle({ value, onValueChange }: ToggleProps) {',
    '  return (',
    '    <Switch',
    '      value={value}',
    '      onValueChange={onValueChange}',
    '      trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}',
    '      thumbColor={value ? "#2563eb" : "#f8fafc"}',
    '    />',
    '  );',
    '}',
    '',
  ].join('\n');
}

function renderNativeWindUiScreen(): string {
  return [
    "import { useMemo, useState } from 'react';",
    "import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';",
    '',
    "import { ActivityIndicator } from '../../components/nativewindui/ActivityIndicator';",
    "import { Avatar, AvatarFallback } from '../../components/nativewindui/Avatar';",
    "import { Button } from '../../components/nativewindui/Button';",
    "import { DatePicker } from '../../components/nativewindui/DatePicker';",
    "import { Picker, PickerItem } from '../../components/nativewindui/Picker';",
    "import { ProgressIndicator } from '../../components/nativewindui/ProgressIndicator';",
    "import { Slider } from '../../components/nativewindui/Slider';",
    "import { Text } from '../../components/nativewindui/Text';",
    "import { ThemeToggle } from '../../components/nativewindui/ThemeToggle';",
    "import { Toggle } from '../../components/nativewindui/Toggle';",
    "import { ExpositionNotice } from '../../components/exposition';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'export default function NativeWindUiScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '  const [enabled, setEnabled] = useState(true);',
    '  const [intensity, setIntensity] = useState(0.64);',
    "  const [density, setDensity] = useState('balanced');",
    '  const [appointmentDate, setAppointmentDate] = useState<Date>(new Date());',
    '  const progress = useMemo(() => Math.round(intensity * 100), [intensity]);',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    '      <View style={styles.header}>',
    '        <Text variant="largeTitle" className="font-black text-slate-950 dark:text-white">NativeWindUI Exposition</Text>',
    '        <Text variant="body" color="secondary">Generated when NativeWindUI is selected; this page exercises the local NativeWindUI primitives that create-expo-stack installs.</Text>',
    '      </View>',
    '      <ExpositionNotice />',
    '      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '        <Text variant="heading">Interactive primitives</Text>',
    '        <View style={styles.feedbackRow}>',
    '          <Avatar className="h-12 w-12">',
    '            <AvatarFallback>',
    '              <Text variant="caption2">NW</Text>',
    '            </AvatarFallback>',
    '          </Avatar>',
    '          <View style={styles.feedbackBody}>',
    '            <Text variant="subhead">Theme preview controls</Text>',
    '            <Text variant="footnote" color="secondary">Avatar and ThemeToggle are local NativeWindUI primitives.</Text>',
    '          </View>',
    '          <ThemeToggle />',
    '        </View>',
    '        <View style={styles.row}>',
    '          <Button onPress={() => Linking.openURL(\'https://nativewindui.com\')} variant="primary">',
    '            <Text>Open NativeWindUI docs</Text>',
    '          </Button>',
    '          <Button variant="tonal">',
    '            <Text>{density}</Text>',
    '          </Button>',
    '        </View>',
    '        <View style={styles.controlRow}>',
    '          <Text variant="callout">Enable generated theme bridge</Text>',
    '          <Toggle value={enabled} onValueChange={setEnabled} />',
    '        </View>',
    '        <Slider value={intensity} onValueChange={setIntensity} />',
    '        <ProgressIndicator value={progress} />',
    '        <Text variant="footnote" color="secondary">Progress {progress}% - Toggle {enabled ? \'on\' : \'off\'}</Text>',
    '      </View>',
    '      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '        <Text variant="heading">Picker, DatePicker, and feedback</Text>',
    '        <Picker selectedValue={density} onValueChange={(value) => setDensity(String(value))}>',
    '          <PickerItem label="Compact density" value="compact" />',
    '          <PickerItem label="Balanced density" value="balanced" />',
    '          <PickerItem label="Spacious density" value="spacious" />',
    '        </Picker>',
    '        {Platform.OS !== "web" ? (',
    '          <DatePicker mode="date" value={appointmentDate} onChange={(_event, selected) => selected && setAppointmentDate(selected)} />',
    '        ) : (',
    '          <Text variant="footnote" color="secondary">DatePicker preview appears on native targets.</Text>',
    '        )}',
    '        <View style={styles.feedbackRow}>',
    '          <ActivityIndicator />',
    '          <View style={styles.feedbackBody}>',
    '            <Text variant="subhead" color="secondary">NativeWind class tokens, generated theme colors, and Expo web are rendering together.</Text>',
    '            <Text variant="footnote" color="secondary">Date: {appointmentDate.toDateString()}</Text>',
    '          </View>',
    '        </View>',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f8fafc',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 16,',
    '    padding: 20,',
    '    paddingTop: 84,',
    '  },',
    '  header: {',
    '    gap: 8,',
    '  },',
    '  card: {',
    '    borderWidth: 1,',
    '    gap: 16,',
    '    padding: 16,',
    '  },',
    '  row: {',
    "    flexDirection: 'row',",
    "    flexWrap: 'wrap',",
    '    gap: 10,',
    '  },',
    '  controlRow: {',
    "    alignItems: 'center',",
    "    flexDirection: 'row',",
    '    gap: 12,',
    "    justifyContent: 'space-between',",
    '  },',
    '  feedbackRow: {',
    "    alignItems: 'center',",
    "    flexDirection: 'row',",
    '    gap: 12,',
    '  },',
    '  feedbackBody: {',
    '    flex: 1,',
    '    gap: 4,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderHomeScreen(answers: OnboardAnswers, navigationShell: NavigationShell): string {
  const includeNativeWindUiExposition = answers.defaults.includes('nativewindui');
  const expositionLinks =
    navigationShell.library === 'expo-router' && navigationShell.layout !== 'stack'
      ? includeNativeWindUiExposition
        ? [
            "  { href: '/exposition/nativewindui' as const, title: 'NativeWindUI', body: 'Explore the bundled NativeWindUI components.' },",
          ]
        : []
      : [
          "  { href: '/exposition' as const, title: 'Exposition', body: 'Review included Software Mansion packages and decide what stays.' },",
          "  { href: '/exposition/stylist' as const, title: 'Stylist', body: 'Test colors, type, motion, and component density.' },",
          "  { href: '/exposition/data' as const, title: 'Data adapter', body: 'Try the local data boundary before replacing it.' },",
          "  { href: '/exposition/sdk-56' as const, title: 'Expo SDK 56', body: 'Review the new Expo UI, Router, module, and performance changes.' },",
          ...(includeNativeWindUiExposition
            ? [
                "  { href: '/exposition/nativewindui' as const, title: 'NativeWindUI', body: 'Explore the bundled NativeWindUI components.' },",
              ]
            : []),
        ];

  return [
    "import { Link, type Href } from 'expo-router';",
    "import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { SvgMark } from '../../components/exposition';",
    "import { appSnapshot } from '../../data/mock-app';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'const expositionLinks: Array<{ href: Href; title: string; body: string }> = [',
    ...expositionLinks,
    '];',
    '',
    'export default function HomeScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    '      <View style={styles.header}>',
    '        <View style={styles.brandLockup}>',
    '          <SvgMark size={64} />',
    '          <View style={styles.brandText}>',
    '            <Text style={[styles.brandLine, { color: colors.text }]}>Super</Text>',
    '            <Text style={[styles.brandLine, { color: colors.text }]}>Stack</Text>',
    '          </View>',
    '        </View>',
    '        <View style={styles.headerText}>',
    `          <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === 'System' || theme.typography.fontFamily === 'monospace' ? '800' : 'normal' }]}>${answers.appName}</Text>`,
    '          <Text style={[styles.subtitle, { color: colors.text }]}>{appSnapshot.audience}</Text>',
    '        </View>',
    '        {Platform.OS === "web" ? (',
    '          <Link href="/settings" asChild>',
    '            <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.infoButton, { backgroundColor: colors.primary }])}>',
    '              <Text style={styles.infoButtonText}>i</Text>',
    '            </Pressable>',
    '          </Link>',
    '        ) : null}',
    '      </View>',
    '      <View style={styles.grid}>',
    '        <Link href="/onboarding" asChild>',
    '          <Pressable style={StyleSheet.flatten([styles.primaryCard, { backgroundColor: colors.primary, borderRadius: theme.layout.radius }])}>',
    '            <Text style={styles.primaryTitle}>Onboarding preview</Text>',
    '            <Text style={styles.primaryBody}>Open the generated onboarding screen before the main product flow replaces it.</Text>',
    '          </Pressable>',
    '        </Link>',
    '        {expositionLinks.map((item) => (',
    '          <Link key={String(item.href)} href={item.href} asChild>',
    '            <Pressable style={StyleSheet.flatten([styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }])}>',
    '              <Text style={[styles.linkTitle, { color: colors.text }]}>{item.title}</Text>',
    '              <Text style={[styles.linkBody, { color: colors.text }]}>{item.body}</Text>',
    '            </Pressable>',
    '          </Link>',
    '        ))}',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f9fafb',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    flexGrow: 1,',
    '    gap: 16,',
    '    justifyContent: "center",',
    '    padding: 20,',
    '    paddingTop: Platform.OS === "web" ? 84 : 20,',
    '  },',
    '  header: {',
    '    alignItems: "center",',
    '    gap: 10,',
    '    position: "relative",',
    '  },',
    '  brandLockup: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    gap: 14,',
    '    justifyContent: "center",',
    '  },',
    '  headerText: {',
    '    alignItems: "center",',
    '    width: "100%",',
    '  },',
    '  brandText: {',
    '    gap: 0,',
    '  },',
    '  brandLine: {',
    '    fontSize: 16,',
    '    fontWeight: "900",',
    '    lineHeight: 17,',
    '    textTransform: "uppercase",',
    '  },',
    '  infoButton: {',
    '    alignItems: "center",',
    "    backgroundColor: '#111827',",
    '    borderRadius: 18,',
    '    height: 36,',
    '    justifyContent: "center",',
    '    position: "absolute",',
    '    right: 0,',
    '    top: 0,',
    '    width: 36,',
    '  },',
    '  infoButtonText: {',
    "    color: '#ffffff',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 22,',
    '    fontWeight: "800",',
    '    textAlign: "center",',
    '  },',
    '  subtitle: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    marginTop: 3,',
    '    textAlign: "center",',
    '  },',
    '  grid: {',
    '    gap: 12,',
    '  },',
    '  primaryCard: {',
    "    backgroundColor: '#111827',",
    '    borderRadius: 12,',
    '    gap: 8,',
    '    padding: 16,',
    '  },',
    '  primaryTitle: {',
    "    color: '#ffffff',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  primaryBody: {',
    "    color: '#d1d5db',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '  linkCard: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 6,',
    '    padding: 16,',
    '  },',
    '  linkTitle: {',
    "    color: '#111827',",
    '    fontSize: 16,',
    '    fontWeight: "800",',
    '  },',
    '  linkBody: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderOnboardingScreen(): string {
  return [
    "import { Link, useRouter } from 'expo-router';",
    "import { useMemo, useState } from 'react';",
    "import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';",
    '',
    "import { onboardingLegalDocuments } from './legal-documents';",
    '',
    'export default function OnboardingScreen() {',
    '  const [acceptedAgreement, setAcceptedAgreement] = useState(false);',
    '  const [acceptedTerms, setAcceptedTerms] = useState(false);',
    '  const router = useRouter();',
    '  const canContinue = acceptedAgreement && acceptedTerms;',
    '  const agreementUpdated = useMemo(() => new Date(onboardingLegalDocuments.agreement.lastUpdated).toLocaleDateString(), []);',
    '  const termsUpdated = useMemo(() => new Date(onboardingLegalDocuments.terms.lastUpdated).toLocaleDateString(), []);',
    '',
    '  return (',
    '    <View style={styles.screen}>',
    '      <Text style={styles.title}>Legal onboarding</Text>',
    '      <Text style={styles.body}>Review and approve the Agreement and Terms before continuing in your real auth or profile flow.</Text>',
    '      <View style={styles.card}>',
    '        <View style={styles.rowTop}>',
    '          <Text style={styles.cardTitle}>Agreement</Text>',
    '          <Text style={styles.meta}>{agreementUpdated}</Text>',
    '        </View>',
    '        <Text style={styles.cardBody}>A compact starter agreement with fill-in fields your team can finalize.</Text>',
    '        <View style={styles.rowBottom}>',
    '          <Link href="/onboarding/agreement" asChild>',
    '            <Pressable accessibilityRole="button" style={styles.linkButton}>',
    '              <Text style={styles.linkButtonText}>View agreement</Text>',
    '            </Pressable>',
    '          </Link>',
    '          <View style={styles.acceptWrap}>',
    '            <Text style={styles.acceptText}>Accepted</Text>',
    '            <Switch value={acceptedAgreement} onValueChange={setAcceptedAgreement} />',
    '          </View>',
    '        </View>',
    '      </View>',
    '      <View style={styles.card}>',
    '        <View style={styles.rowTop}>',
    '          <Text style={styles.cardTitle}>Terms of service</Text>',
    '          <Text style={styles.meta}>{termsUpdated}</Text>',
    '        </View>',
    '        <Text style={styles.cardBody}>Production-safe baseline terms with placeholders for business specifics.</Text>',
    '        <View style={styles.rowBottom}>',
    '          <Link href="/onboarding/terms" asChild>',
    '            <Pressable accessibilityRole="button" style={styles.linkButton}>',
    '              <Text style={styles.linkButtonText}>View terms</Text>',
    '            </Pressable>',
    '          </Link>',
    '          <View style={styles.acceptWrap}>',
    '            <Text style={styles.acceptText}>Accepted</Text>',
    '            <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />',
    '          </View>',
    '        </View>',
    '      </View>',
    '      <Pressable',
    '        accessibilityRole="button"',
    '        disabled={!canContinue}',
    '        onPress={() => {',
    '          if (canContinue) router.push("/onboarding/account-setup");',
    '        }}',
    '        style={[styles.ctaButton, !canContinue && styles.ctaButtonDisabled]}',
    '      >',
    '        <Text style={styles.ctaButtonText}>Continue to account setup</Text>',
    '      </Pressable>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#ffffff',",
    '    flex: 1,',
    '    gap: 14,',
    '    padding: 20,',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 26,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 15,',
    '    lineHeight: 22,',
    '  },',
    '  card: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#d1d5db',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 14,',
    '  },',
    '  rowTop: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    justifyContent: "space-between",',
    '  },',
    '  rowBottom: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    justifyContent: "space-between",',
    '  },',
    '  cardTitle: {',
    "    color: '#111827',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  cardBody: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '  meta: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '  },',
    '  linkButton: {',
    "    backgroundColor: '#111827',",
    '    borderRadius: 9,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 8,',
    '  },',
    '  linkButtonText: {',
    "    color: '#ffffff',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '  },',
    '  acceptWrap: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    gap: 8,',
    '  },',
    '  acceptText: {',
    "    color: '#111827',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '  },',
    '  ctaButton: {',
    '    alignItems: "center",',
    "    backgroundColor: '#0f172a',",
    '    borderRadius: 12,',
    '    marginTop: "auto",',
    '    paddingVertical: 14,',
    '  },',
    '  ctaButtonDisabled: {',
    "    backgroundColor: '#9ca3af',",
    '  },',
    '  ctaButtonText: {',
    "    color: '#ffffff',",
    '    fontSize: 15,',
    '    fontWeight: "800",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderAccountSetupScreen(): string {
  return [
    "import { useRouter } from 'expo-router';",
    "import { Pressable, StyleSheet, Text, View } from 'react-native';",
    '',
    'export default function AccountSetupScreen() {',
    '  const router = useRouter();',
    '',
    '  return (',
    '    <View style={styles.screen}>',
    '      <Text style={styles.title}>Account setup</Text>',
    '      <Text style={styles.body}>This is the production-ready handoff point after legal acceptance. Replace this with your real auth and profile onboarding flow.</Text>',
    '      <Pressable',
    '        accessibilityRole="button"',
    "        onPress={() => router.replace('/')}",
    '        style={styles.homeButton}>',
    '        <Text style={styles.homeButtonText}>Continue to home</Text>',
    '      </Pressable>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#ffffff',",
    '    flex: 1,',
    '    gap: 12,',
    '    padding: 20,',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 26,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 15,',
    '    lineHeight: 22,',
    '  },',
    '  homeButton: {',
    "    alignItems: 'center',",
    "    backgroundColor: '#2563eb',",
    '    borderRadius: 12,',
    '    marginTop: 12,',
    '    paddingHorizontal: 18,',
    '    paddingVertical: 14,',
    '  },',
    '  homeButtonText: {',
    "    color: '#ffffff',",
    '    fontSize: 16,',
    '    fontWeight: "800",',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderLegalDocuments(): string {
  return [
    'export interface LegalDocumentSection {',
    '  id: string;',
    '  title: string;',
    '  body: string;',
    '}',
    '',
    'export interface LegalDocument {',
    '  id: "agreement" | "terms";',
    '  title: string;',
    '  summary: string;',
    '  effectiveDate: string;',
    '  lastUpdated: string;',
    '  sections: LegalDocumentSection[];',
    '}',
    '',
    'export const onboardingLegalDocuments: Record<"agreement" | "terms", LegalDocument> = {',
    '  agreement: {',
    '    id: "agreement",',
    '    title: "User Agreement",',
    '    summary: "Agreement template for onboarding consent and account usage.",',
    '    effectiveDate: "2026-05-24",',
    '    lastUpdated: "2026-05-24",',
    '    sections: [',
    '      { id: "scope", title: "Scope", body: "This agreement covers access to [APP NAME], account conduct, and baseline obligations between [COMPANY NAME] and each user." },',
    '      { id: "usage", title: "Acceptable Use", body: "Users agree not to misuse the service, attempt unauthorized access, or submit harmful content." },',
    '      { id: "privacy", title: "Privacy and Data", body: "User data is handled according to the published privacy notice. Replace this section with your final privacy commitments and retention policy." },',
    '      { id: "termination", title: "Termination", body: "Either party may terminate usage under the conditions described in this section. Add jurisdiction-specific language before production launch." },',
    '    ],',
    '  },',
    '  terms: {',
    '    id: "terms",',
    '    title: "Terms of Service",',
    '    summary: "Near-blank, production-oriented terms starter for legal review.",',
    '    effectiveDate: "2026-05-24",',
    '    lastUpdated: "2026-05-24",',
    '    sections: [',
    '      { id: "eligibility", title: "Eligibility", body: "Users must meet age and legal capacity requirements for their jurisdiction." },',
    '      { id: "accounts", title: "Accounts", body: "Users are responsible for account credentials and activity performed through their account." },',
    '      { id: "payments", title: "Payments and Billing", body: "If applicable, describe pricing, billing intervals, refunds, and failed payment handling." },',
    '      { id: "liability", title: "Disclaimers and Liability", body: "Define limitations of liability and service disclaimers with legal counsel." },',
    '      { id: "governing-law", title: "Governing Law", body: "Specify governing law, venue, and dispute resolution expectations." },',
    '    ],',
    '  },',
    '};',
    '',
  ].join('\n');
}

function renderLegalDocumentView(): string {
  return [
    "import { ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import type { LegalDocument } from '../legal-documents';",
    '',
    'interface LegalDocumentViewProps {',
    '  document: LegalDocument;',
    '}',
    '',
    'function LegalDocumentMeta({ label, value }: { label: string; value: string }) {',
    '  return (',
    '    <View style={styles.metaItem}>',
    '      <Text style={styles.metaLabel}>{label}</Text>',
    '      <Text style={styles.metaValue}>{value}</Text>',
    '    </View>',
    '  );',
    '}',
    '',
    'function LegalSectionItem({ title, body }: { title: string; body: string }) {',
    '  return (',
    '    <View style={styles.section}>',
    '      <Text style={styles.sectionTitle}>{title}</Text>',
    '      <Text style={styles.sectionBody}>{body}</Text>',
    '    </View>',
    '  );',
    '}',
    '',
    'export function LegalDocumentView({ document }: LegalDocumentViewProps) {',
    '  return (',
    '    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>',
    '      <Text style={styles.title}>{document.title}</Text>',
    '      <Text style={styles.summary}>{document.summary}</Text>',
    '      <View style={styles.metaRow}>',
    '        <LegalDocumentMeta label="Effective" value={document.effectiveDate} />',
    '        <LegalDocumentMeta label="Last updated" value={document.lastUpdated} />',
    '      </View>',
    '      {document.sections.map((section) => (',
    '        <LegalSectionItem key={section.id} title={section.title} body={section.body} />',
    '      ))}',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f8fafc',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 14,',
    '    padding: 20,',
    '    paddingTop: 84,',
    '  },',
    '  title: {',
    "    color: '#0f172a',",
    '    fontSize: 28,',
    '    fontWeight: "800",',
    '  },',
    '  summary: {',
    "    color: '#334155',",
    '    fontSize: 15,',
    '    lineHeight: 22,',
    '  },',
    '  metaRow: {',
    '    flexDirection: "row",',
    '    gap: 10,',
    '  },',
    '  metaItem: {',
    "    backgroundColor: '#e2e8f0',",
    '    borderRadius: 10,',
    '    gap: 2,',
    '    paddingHorizontal: 10,',
    '    paddingVertical: 8,',
    '  },',
    '  metaLabel: {',
    "    color: '#475569',",
    '    fontSize: 11,',
    '    fontWeight: "700",',
    '    textTransform: "uppercase",',
    '  },',
    '  metaValue: {',
    "    color: '#0f172a',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '  },',
    '  section: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e2e8f0',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 7,',
    '    padding: 14,',
    '  },',
    '  sectionTitle: {',
    "    color: '#0f172a',",
    '    fontSize: 17,',
    '    fontWeight: "800",',
    '  },',
    '  sectionBody: {',
    "    color: '#334155',",
    '    fontSize: 14,',
    '    lineHeight: 21,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderAgreementScreen(): string {
  return [
    "import { LegalDocumentView } from './components/legal-document-view';",
    "import { onboardingLegalDocuments } from './legal-documents';",
    '',
    'export default function AgreementScreen() {',
    '  return <LegalDocumentView document={onboardingLegalDocuments.agreement} />;',
    '}',
    '',
  ].join('\n');
}

function renderTermsScreen(): string {
  return [
    "import { LegalDocumentView } from './components/legal-document-view';",
    "import { onboardingLegalDocuments } from './legal-documents';",
    '',
    'export default function TermsScreen() {',
    '  return <LegalDocumentView document={onboardingLegalDocuments.terms} />;',
    '}',
    '',
  ].join('\n');
}

async function ensureExpoRouterGroupLayouts(
  appDir: string,
  navigationShell: NavigationShell,
  answers: OnboardAnswers
): Promise<WriteResult[]> {
  if (navigationShell.library !== 'expo-router') {
    return [];
  }
  const results: WriteResult[] = [];
  const includeNativeWindUiExposition = answers.defaults.includes('nativewindui');
  if (navigationShell.layout === 'tabs') {
    const tabsDir = path.join(appDir, '(tabs)');
    await mkdir(tabsDir, { recursive: true });
    const layoutPath = path.join(tabsDir, '_layout.tsx');
    await writeFile(
      layoutPath,
      renderTabsGroupLayout(answers.usesExpoNativeTabs, includeNativeWindUiExposition),
      'utf8'
    );
    results.push({ filePath: layoutPath, wrote: true });
    return results;
  }
  if (navigationShell.layout === 'drawer + tabs') {
    const drawerDir = path.join(appDir, '(drawer)');
    const drawerTabsDir = path.join(drawerDir, '(tabs)');
    await mkdir(drawerTabsDir, { recursive: true });
    const drawerLayoutPath = path.join(drawerDir, '_layout.tsx');
    const drawerTabsLayoutPath = path.join(drawerTabsDir, '_layout.tsx');
    await writeFile(drawerLayoutPath, renderDrawerGroupLayout(), 'utf8');
    await writeFile(
      drawerTabsLayoutPath,
      renderDrawerTabsGroupLayout(answers.usesExpoNativeTabs, includeNativeWindUiExposition),
      'utf8'
    );
    results.push(
      { filePath: drawerLayoutPath, wrote: true },
      { filePath: drawerTabsLayoutPath, wrote: true }
    );
  }
  return results;
}
function renderTabsGroupLayout(
  usesExpoNativeTabs: boolean,
  includeNativeWindUiExposition: boolean
): string {
  void includeNativeWindUiExposition;
  if (usesExpoNativeTabs) {
    return [
      "import { NativeTabs } from 'expo-router/unstable-native-tabs';",
      '',
      "import { useAppTheme } from '../../theme/provider';",
      '',
      'export default function TabsLayout() {',
      '  const theme = useAppTheme();',
      '  const colors = theme.activeColors;',
      '  const tabContentStyle = {',
      '    backgroundColor: colors.background,',
      '  };',
      '',
      '  return (',
      '    <NativeTabs backgroundColor={colors.background} disableTransparentOnScrollEdge minimizeBehavior="onScrollDown">',
      '      <NativeTabs.Trigger name="index" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"house.fill" as any} md={"home" as any} />',
      '        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="exposition" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"shippingbox.fill" as any} md={"deployed_code" as any} />',
      '        <NativeTabs.Trigger.Label>Exposition</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="stylist" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"paintpalette.fill" as any} md={"palette" as any} />',
      '        <NativeTabs.Trigger.Label>Stylist</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="data" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"externaldrive.fill" as any} md={"database" as any} />',
      '        <NativeTabs.Trigger.Label>Data</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="sdk-56" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"sparkles.rectangle.stack.fill" as any} md={"rocket_launch" as any} />',
      '        <NativeTabs.Trigger.Label>SDK 56</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '    </NativeTabs>',
      '  );',
      '}',
      '',
    ].join('\n');
  }
  return [
    "import { Tabs } from 'expo-router';",
    "import { Text } from 'react-native';",
    '',
    'export default function TabsLayout() {',
    '  return (',
    '    <Tabs>',
    '      <Tabs.Screen name="index" options={{ title: \'Home\', tabBarIcon: () => <Text>H</Text> }} />',
    '      <Tabs.Screen name="exposition" options={{ title: \'Exposition\', tabBarIcon: () => <Text>EX</Text> }} />',
    '      <Tabs.Screen name="stylist" options={{ title: \'Stylist\', tabBarIcon: () => <Text>SS</Text> }} />',
    '      <Tabs.Screen name="data" options={{ title: \'Data\', tabBarIcon: () => <Text>DB</Text> }} />',
    '      <Tabs.Screen name="sdk-56" options={{ title: \'SDK 56\', tabBarIcon: () => <Text>56</Text> }} />',
    '    </Tabs>',
    '  );',
    '}',
    '',
  ].join('\n');
}
function renderDrawerGroupLayout(): string {
  return [
    "import { Drawer } from 'expo-router/drawer';",
    '',
    'export default function DrawerLayout() {',
    '  return (',
    '    <Drawer>',
    "      <Drawer.Screen name=\"index\" options={{ title: 'Home', drawerLabel: 'Home' }} />",
    "      <Drawer.Screen name=\"(tabs)\" options={{ title: 'Exposition', drawerLabel: 'Exposition' }} />",
    '    </Drawer>',
    '  );',
    '}',
    '',
  ].join('\n');
}

function renderDrawerTabsGroupLayout(
  usesExpoNativeTabs: boolean,
  includeNativeWindUiExposition: boolean
): string {
  void includeNativeWindUiExposition;
  if (usesExpoNativeTabs) {
    return [
      "import { NativeTabs } from 'expo-router/unstable-native-tabs';",
      '',
      "import { useAppTheme } from '../../../theme/provider';",
      '',
      'export default function DrawerTabsLayout() {',
      '  const theme = useAppTheme();',
      '  const colors = theme.activeColors;',
      '  const tabContentStyle = {',
      '    backgroundColor: colors.background,',
      '  };',
      '',
      '  return (',
      '    <NativeTabs backgroundColor={colors.background} disableTransparentOnScrollEdge minimizeBehavior="onScrollDown">',
      '      <NativeTabs.Trigger name="index" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"shippingbox.fill" as any} md={"deployed_code" as any} />',
      '        <NativeTabs.Trigger.Label>Exposition</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="stylist" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"paintpalette.fill" as any} md={"palette" as any} />',
      '        <NativeTabs.Trigger.Label>Stylist</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="data" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"externaldrive.fill" as any} md={"database" as any} />',
      '        <NativeTabs.Trigger.Label>Data</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '      <NativeTabs.Trigger name="sdk-56" contentStyle={tabContentStyle} disableAutomaticContentInsets>',
      '        <NativeTabs.Trigger.Icon sf={"sparkles.rectangle.stack.fill" as any} md={"rocket_launch" as any} />',
      '        <NativeTabs.Trigger.Label>SDK 56</NativeTabs.Trigger.Label>',
      '      </NativeTabs.Trigger>',
      '    </NativeTabs>',
      '  );',
      '}',
      '',
    ].join('\n');
  }
  return [
    "import { Tabs } from 'expo-router';",
    "import { Text } from 'react-native';",
    '',
    'export default function DrawerTabsLayout() {',
    '  return (',
    '    <Tabs>',
    '      <Tabs.Screen name="index" options={{ title: \'Exposition\', tabBarIcon: () => <Text>EX</Text> }} />',
    '      <Tabs.Screen name="stylist" options={{ title: \'Stylist\', tabBarIcon: () => <Text>SS</Text> }} />',
    '      <Tabs.Screen name="data" options={{ title: \'Data\', tabBarIcon: () => <Text>DB</Text> }} />',
    '      <Tabs.Screen name="sdk-56" options={{ title: \'SDK 56\', tabBarIcon: () => <Text>56</Text> }} />',
    '    </Tabs>',
    '  );',
    '}',
    '',
  ].join('\n');
}
function renderSettingsScreen(): string {
  return [
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    "import { KeyboardForm } from '../../components/exposition';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'export default function SettingsScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '',
    '  return (',
    '    <View style={[styles.screen, { backgroundColor: colors.background }]}>',
    '      <View style={styles.header}>',
    `        <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>Settings</Text>`,
    '        <Text style={[styles.body, { color: colors.text }]}>Keyboard Controller is ready for form-heavy screens.</Text>',
    '      </View>',
    '      <KeyboardForm />',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#ffffff',",
    '    flex: 1,',
    '    padding: 20,',
    '  },',
    '  header: {',
    '    marginBottom: 12,',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 26,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '    marginTop: 4,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderExpositionScreen(includeNativeWindUiExposition = false): string {
  const nativeWindUiRouteCard = includeNativeWindUiExposition
    ? [
        '      <PackageCard',
        '        packageName="nativewindui route"',
        '        title="NativeWindUI route"',
        '        body="NativeWindUI examples stay in the app as a dedicated route, linked here instead of pinned in the bottom tabs.">',
        '        <Link href="/exposition/nativewindui" asChild>',
        '          <Text style={styles.link}>Open NativeWindUI screen</Text>',
        '        </Link>',
        '      </PackageCard>',
      ]
    : [];
  const linkImport = includeNativeWindUiExposition ? ["import { Link } from 'expo-router';"] : [];
  return [
    ...linkImport,
    "import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { AnimatedPressable, ExpositionNotice, GestureCard, KeyboardForm, PackageCard, ScreensCard, SoftwareMansionLogo } from '../../components/exposition';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'export default function ExpositionScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    `      <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>Package Exposition</Text>`,
    '      <Text style={[styles.intro, { color: colors.text }]}>Browse the included Software Mansion packages, then keep only what your app needs.</Text>',
    '      <ExpositionNotice />',
    '      <PackageCard',
    '        packageName="reanimated-color-picker"',
    '        title="Stylist color editing"',
    '        body="Stylist uses this package for the hue slider, color preview, and manual palette picker that writes theme tokens."',
    '      >',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://github.com/alabsi91/reanimated-color-picker')}>",
    '          Reanimated Color Picker',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="@react-native-async-storage/async-storage"',
    '        title="Stylist local preferences"',
    '        body="Stylist stores local-only preferences such as the Google Fonts API key, dismissed banners, and editor settings with Async Storage."',
    '      >',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://react-native-async-storage.github.io/async-storage/')}>",
    '          Async Storage Docs',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-safe-area-context"',
    '        title="Stylist safe spacing"',
    '        body="Stylist reads safe-area insets so editor controls stay clear of cutouts, native tabs, and device navigation areas."',
    '      >',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.expo.dev/versions/latest/sdk/safe-area-context/')}>",
    '          Expo SDK - SafeAreaContext',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="tailwindcss/colors"',
    '        title="Stylist palette families"',
    '        body="Stylist uses Tailwind color families and shade scales to drive the palette-family mode and accessible token previews."',
    '      >',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://tailwindcss.com/docs/customizing-colors')}>",
    '          Tailwind CSS - Colors',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="expo-router API routes"',
    '        title="Stylist sync endpoint"',
    '        body="Stylist uses an Expo Router +api route so both native and web can sync theme output files by calling /exposition/stylist-sync."',
    '      >',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.expo.dev/router/web/api-routes/')}>",
    '          Expo Router - API Routes',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-reanimated + react-native-worklets"',
    '        title="Motion that feels native"',
    '        body="Press the button to see the Reanimated timing demo. Worklets make this kind of UI-thread animation possible."',
    '      >',
    '        <AnimatedPressable label="Press and hold" />',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.swmansion.com/react-native-reanimated')}>",
    '          Software Mansion - Reanimated',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-gesture-handler"',
    '        title="Gesture-first interactions"',
    '        body="Drag the card below. If your product does not need touch-heavy interactions, this demo helps you decide what to remove."',
    '      >',
    '        <GestureCard title="Drag me" body="This card springs back when the gesture ends." />',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.swmansion.com/react-native-gesture-handler')}>",
    '          Software Mansion - Gesture Handler',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-screens"',
    '        title="Native navigation primitives"',
    '        body="Screens support the navigation layer with native lifecycle and memory behavior."',
    '      >',
    '        <ScreensCard />',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.swmansion.com/react-native-screens')}>",
    '          Software Mansion - Screens',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-svg"',
    '        title="Portable vector UI"',
    '        body="Use SVG for marks, badges, charts, and vector states that need to scale cleanly."',
    '      >',
    '        <View style={styles.svgDemo}><SoftwareMansionLogo width={150} height={80} /></View>',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://docs.expo.dev/versions/latest/sdk/svg')}>",
    '          Expo SDK - SVG',
    '        </Text>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-keyboard-controller"',
    '        title="Keyboard-heavy screens"',
    '        body="Use this when forms, chat, notes, or auth flows need better keyboard control than manual offsets."',
    '      >',
    '        <KeyboardForm />',
    "        <Text style={styles.link} onPress={() => Linking.openURL('https://kirillzyusko.github.io/react-native-keyboard-controller/')}>",
    '          Kirill Zyusko - Keyboard Controller',
    '        </Text>',
    '      </PackageCard>',
    ...nativeWindUiRouteCard,
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f9fafb',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 16,',
    '    padding: 20,',
    "    paddingTop: Platform.OS === 'web' ? 92 : 20,",
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 30,',
    '    fontWeight: "900",',
    '  },',
    '  intro: {',
    "    color: '#4b5563',",
    '    fontSize: 16,',
    '    lineHeight: 24,',
    '  },',
    '  link: {',
    "    color: '#1d4ed8',",
    '    fontSize: 14,',
    "    fontWeight: '800',",
    '    lineHeight: 20,',
    '  },',
    '  svgDemo: {',
    '    alignItems: "center",',
    '    paddingVertical: 8,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderExpoSdk56Screen(answers: OnboardAnswers): string {
  const expoUiDemo = answers.usesExpoUiUniversalComponents
    ? [
        'function UniversalPreview() {',
        '  const [enabled, setEnabled] = useState(true);',
        '  const [count, setCount] = useState(0);',
        '  return (',
        '    <View style={styles.exampleBox}>',
        '      <View style={styles.componentLabelGrid}>',
        '        <Text style={styles.componentLabel}>Host</Text>',
        '        <Text style={styles.componentLabel}>Column</Text>',
        '        <Text style={styles.componentLabel}>Text</Text>',
        '        <Text style={styles.componentLabel}>Button</Text>',
        '        <Text style={styles.componentLabel}>Switch</Text>',
        '      </View>',
        '      <Host matchContents>',
        '        <Column spacing={10}>',
        '          <ExpoUIText>{enabled ? "Feature enabled" : "Feature disabled"}</ExpoUIText>',
        '          <ExpoUIButton variant="filled" label={`Universal button (${count})`} onPress={() => setCount((value) => value + 1)} />',
        '          <ExpoUISwitch label="Universal switch" value={enabled} onValueChange={setEnabled} />',
        '        </Column>',
        '      </Host>',
        '    </View>',
        '  );',
        '}',
        '',
      ]
    : [
        'function UniversalPreview() {',
        '  return (',
        '    <View style={styles.exampleBox}>',
        '      <Text style={styles.exampleTitle}>Universal components are not enabled.</Text>',
        '      <Text style={styles.exampleBody}>Turn on Expo UI Universal in onboarding to generate a Host, Column, Text, Button, and Switch demo here.</Text>',
        '    </View>',
        '  );',
        '}',
        '',
      ];

  return [
    "import { useState } from 'react';",
    "import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';",
    ...(answers.usesExpoUiUniversalComponents
      ? [
          "import { Host, Column, Button as ExpoUIButton, Switch as ExpoUISwitch, Text as ExpoUIText } from '@expo/ui';",
        ]
      : []),
    '',
    "import { ExpositionNotice, PackageCard } from '../../components/exposition';",
    '',
    'const highlights = [',
    "  { kind: 'expo-ui', title: 'Expo UI is production-ready', packageName: '@expo/ui', body: 'SwiftUI and Jetpack Compose APIs are stable in SDK 56 with deeper native parity.', links: [{ label: 'Expo UI docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/' }] },",
    "  { kind: 'universal', title: 'Universal components', packageName: '@expo/ui', body: 'Host, Button, Switch, Text, layout primitives, lists, and controls can live in one source tree.', links: [{ label: 'Universal components docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/universal/' }] },",
    "  { kind: 'native-state', title: 'useNativeState', packageName: '@expo/ui/swift-ui', body: 'Native state can drive form controls and text entry without JS-thread controlled-input jitter.', links: [{ label: 'useNativeState docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate/' }] },",
    "  { kind: 'drop-in', title: 'Drop-in replacements', packageName: '@expo/ui', body: 'Expo UI maps common community UI primitives to native-backed replacements.', links: [{ label: 'Drop-in replacements docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/' }] },",
    "  { kind: 'inline-modules', title: 'Inline modules', packageName: 'expo-modules-core', body: 'Swift/Kotlin modules can be authored directly beside app code for project-local native features.', links: [{ label: 'Inline modules tutorial', href: 'https://docs.expo.dev/modules/inline-modules-tutorial/' }] },",
    "  { kind: 'native-tabs', title: 'Router and native tabs', packageName: 'expo-router', body: 'Expo Router absorbs more of its stack internals and ships stronger native tabs support.', links: [{ label: 'Native tabs docs', href: 'https://docs.expo.dev/versions/latest/sdk/router/native-tabs/' }] },",
    "  { kind: 'runtime', title: 'Runtime baseline', packageName: 'react-native + react', body: 'SDK 56 aligns to React Native 0.85, React 19.2, Hermes V1 defaults, and faster builds.', links: [] },",
    "  { kind: 'widgets', title: 'Widgets', packageName: 'expo-widgets', body: 'Expo widgets are stable, with strong iOS support for lock-screen and home-screen experiences.', links: [{ label: 'Widgets docs', href: 'https://docs.expo.dev/versions/latest/sdk/widgets/' }] },",
    "  { kind: 'audio', title: 'Audio and haptics updates', packageName: 'expo-audio + expo-haptics', body: 'Audio streaming primitives improved and haptics coverage keeps expanding.', links: [{ label: 'Expo Audio docs', href: 'https://docs.expo.dev/versions/latest/sdk/audio/' }] },",
    '];',
    '',
    ...expoUiDemo,
    'function TopicExample({ kind }: { kind: string }) {',
    '  if (kind === "universal") return <UniversalPreview />;',
    '  if (kind === "expo-ui") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <Text style={styles.exampleTitle}>Native controls from one React surface</Text>',
    '        <View style={styles.exampleRow}><Text style={styles.examplePill}>SwiftUI</Text><Text style={styles.exampleBody}>iOS controls render with native behavior.</Text></View>',
    '        <View style={styles.exampleRow}><Text style={styles.examplePill}>Compose</Text><Text style={styles.exampleBody}>Android controls stay platform-native.</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "native-state") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <Text style={styles.exampleTitle}>Text input owned by native state</Text>',
    '        <View style={styles.fakeInput}><Text style={styles.fakeInputText}>Display name</Text><Text style={styles.fakeInputValue}>Ada Lovelace</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "drop-in") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <Text style={styles.exampleTitle}>Replacement candidates</Text>',
    '        <View style={styles.exampleRow}><Text style={styles.examplePill}>Slider</Text><Text style={styles.exampleBody}>Use the Expo UI version where native fidelity matters.</Text></View>',
    '        <View style={styles.exampleRow}><Text style={styles.examplePill}>Picker</Text><Text style={styles.exampleBody}>Swap community picker screens one at a time.</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "inline-modules") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <Text style={styles.exampleTitle}>Project-local native module</Text>',
    '        <Text style={styles.codeLine}>modules/LocalGreeting/index.ts</Text>',
    '        <Text style={styles.codeLine}>modules/LocalGreeting/ios/LocalGreeting.swift</Text>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "native-tabs") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <View style={styles.tabStrip}><Text style={styles.tabActive}>Home</Text><Text style={styles.tabItem}>Search</Text><Text style={styles.tabItem}>Settings</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "runtime") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <Text style={styles.exampleTitle}>Runtime versions to verify</Text>',
    '        <View style={styles.componentLabelGrid}><Text style={styles.componentLabel}>RN 0.85</Text><Text style={styles.componentLabel}>React 19.2</Text><Text style={styles.componentLabel}>Hermes V1</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  if (kind === "widgets") {',
    '    return (',
    '      <View style={styles.exampleBox}>',
    '        <View style={styles.widgetTile}><Text style={styles.widgetTitle}>Today</Text><Text style={styles.widgetBody}>3 tasks ready</Text></View>',
    '      </View>',
    '    );',
    '  }',
    '  return (',
    '    <View style={styles.exampleBox}>',
    '      <Text style={styles.exampleTitle}>Audio control surface</Text>',
    '      <View style={styles.transportRow}><Text style={styles.transportButton}>Play</Text><Text style={styles.transportButton}>Pause</Text><Text style={styles.transportButton}>Haptic tap</Text></View>',
    '    </View>',
    '  );',
    '}',
    '',
    'export default function ExpoSdk56Screen() {',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    '      <Text style={styles.title}>Expo SDK 56 Exposition</Text>',
    '      <Text style={styles.intro}>Review the SDK 56 changes before deciding what belongs in the real app.</Text>',
    '      <ExpositionNotice />',
    '      {highlights.map((item) => (',
    '        <PackageCard key={item.title} packageName={item.packageName} title={item.title} body={item.body}>',
    '          <View style={styles.cardChildren}>',
    '            <TopicExample kind={item.kind} />',
    '            {item.links.length ? (',
    '              <View style={styles.linkList}>',
    '                {item.links.map((link) => (',
    '                  <Text key={link.href} accessibilityRole="link" onPress={() => Linking.openURL(link.href)} style={styles.link}>',
    '                    {link.label}',
    '                  </Text>',
    '                ))}',
    '              </View>',
    '            ) : null}',
    '          </View>',
    '        </PackageCard>',
    '      ))}',
    '      <View style={styles.linksCard}>',
    '        <Text style={styles.linksTitle}>Video sources</Text>',
    '        <Text accessibilityRole="link" onPress={() => Linking.openURL("https://www.youtube.com/watch?v=MKqGbv-Tssg&t")} style={styles.link}>What\'s New in Expo SDK 56: Expo UI, Inline Swift/Kotlin Modules, and Faster Builds by Expo</Text>',
    '        <Text accessibilityRole="link" onPress={() => Linking.openURL("https://www.youtube.com/watch?v=ywvywq0AGPM")} style={styles.link}>Everything new in Expo SDK 56 by Code with Beto</Text>',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f9fafb',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 16,',
    '    padding: 20,',
    "    paddingTop: Platform.OS === 'web' ? 92 : 20,",
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 30,',
    '    fontWeight: "900",',
    '    textAlign: "center",',
    '  },',
    '  intro: {',
    "    color: '#4b5563',",
    '    fontSize: 16,',
    '    lineHeight: 24,',
    '  },',
    '  linksWrap: {',
    '    gap: 8,',
    '  },',
    '  link: {',
    "    color: '#1d4ed8',",
    '    fontSize: 14,',
    "    fontWeight: '800',",
    '    lineHeight: 20,',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '  cardChildren: {',
    '    gap: 12,',
    '    marginTop: 4,',
    '  },',
    '  exampleBox: {',
    "    backgroundColor: '#eff6ff',",
    "    borderColor: '#bfdbfe',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    gap: 10,',
    '    padding: 10,',
    '  },',
    '  exampleTitle: {',
    "    color: '#1e3a8a',",
    '    fontSize: 13,',
    '    fontWeight: "800",',
    '  },',
    '  exampleBody: {',
    "    color: '#1e3a8a',",
    '    fontSize: 13,',
    '    fontWeight: "600",',
    '    lineHeight: 18,',
    '  },',
    '  exampleRow: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 8,',
    '  },',
    '  examplePill: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#bfdbfe',",
    '    borderRadius: 999,',
    '    borderWidth: 1,',
    "    color: '#1e3a8a',",
    '    fontSize: 12,',
    '    fontWeight: "800",',
    '    overflow: "hidden",',
    '    paddingHorizontal: 9,',
    '    paddingVertical: 4,',
    '  },',
    '  componentLabelGrid: {',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 8,',
    '  },',
    '  componentLabel: {',
    "    backgroundColor: '#dbeafe',",
    '    borderRadius: 999,',
    "    color: '#1e3a8a',",
    '    fontSize: 12,',
    '    fontWeight: "800",',
    '    overflow: "hidden",',
    '    paddingHorizontal: 9,',
    '    paddingVertical: 4,',
    '  },',
    '  fakeInput: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#bfdbfe',",
    '    borderRadius: 8,',
    '    borderWidth: 1,',
    '    gap: 3,',
    '    padding: 10,',
    '  },',
    '  fakeInputText: {',
    "    color: '#64748b',",
    '    fontSize: 11,',
    '    fontWeight: "700",',
    '    textTransform: "uppercase",',
    '  },',
    '  fakeInputValue: {',
    "    color: '#111827',",
    '    fontSize: 15,',
    '    fontWeight: "800",',
    '  },',
    '  codeLine: {',
    "    backgroundColor: '#0f172a',",
    '    borderRadius: 6,',
    "    color: '#e5e7eb',",
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '    paddingHorizontal: 10,',
    '    paddingVertical: 7,',
    '  },',
    '  tabStrip: {',
    "    backgroundColor: '#ffffff',",
    '    borderRadius: 8,',
    '    flexDirection: "row",',
    '    gap: 6,',
    '    padding: 6,',
    '  },',
    '  tabActive: {',
    "    backgroundColor: '#111827',",
    '    borderRadius: 7,',
    "    color: '#ffffff',",
    '    flex: 1,',
    '    fontSize: 13,',
    '    fontWeight: "800",',
    '    overflow: "hidden",',
    '    padding: 8,',
    '    textAlign: "center",',
    '  },',
    '  tabItem: {',
    "    backgroundColor: '#f1f5f9',",
    '    borderRadius: 7,',
    "    color: '#334155',",
    '    flex: 1,',
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '    overflow: "hidden",',
    '    padding: 8,',
    '    textAlign: "center",',
    '  },',
    '  widgetTile: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#bfdbfe',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    padding: 12,',
    '  },',
    '  widgetTitle: {',
    "    color: '#111827',",
    '    fontSize: 18,',
    '    fontWeight: "900",',
    '  },',
    '  widgetBody: {',
    "    color: '#475569',",
    '    fontSize: 13,',
    '    fontWeight: "700",',
    '    marginTop: 4,',
    '  },',
    '  transportRow: {',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 8,',
    '  },',
    '  transportButton: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#bfdbfe',",
    '    borderRadius: 8,',
    '    borderWidth: 1,',
    "    color: '#1e3a8a',",
    '    fontSize: 13,',
    '    fontWeight: "800",',
    '    overflow: "hidden",',
    '    paddingHorizontal: 10,',
    '    paddingVertical: 8,',
    '  },',
    '  linkList: {',
    '    gap: 8,',
    '    paddingTop: 2,',
    '  },',
    '  linksCard: {',
    "    backgroundColor: '#eef2ff',",
    "    borderColor: '#c7d2fe',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 16,',
    '  },',
    '  linksTitle: {',
    "    color: '#111827',",
    '    fontSize: 17,',
    '    fontWeight: "800",',
    '  },',
    '  link: {',
    "    color: '#1d4ed8',",
    '    fontSize: 14,',
    '    fontWeight: "700",',
    '    lineHeight: 21,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderStylistScreen(answers: OnboardAnswers): string {
  return [
    "import { useMemo, useState } from 'react';",
    "import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
    "import ColorPicker, { HueSlider, Panel1, Preview, Swatches } from 'reanimated-color-picker';",
    '',
    "import { AnimatedPressable, ExpositionNotice } from '../../components/exposition';",
    "import stylistThemeTokens from '../../theme/tokens';",
    '',
    'type StylistTheme = typeof stylistThemeTokens;',
    "type ColorKey = keyof StylistTheme['colors'];",
    '',
    'const colorKeys: ColorKey[] = [',
    "  'background',",
    "  'surface',",
    "  'text',",
    "  'primary',",
    "  'success',",
    "  'warning',",
    '];',
    '',
    "const spacingKeys: Array<keyof StylistTheme['layout']['spacing']> = ['xs', 'sm', 'md', 'lg', 'xl'];",
    "const NATIVE_SAVE_COMMAND = 'npm run stylist:sync:android';",
    '',
    'export default function StylistScreen() {',
    '  const [theme, setTheme] = useState<StylistTheme>(stylistThemeTokens);',
    "  const [selectedColor, setSelectedColor] = useState<ColorKey>('primary');",
    "  const [saveMessage, setSaveMessage] = useState('');",
    "  const [nativeDraft, setNativeDraft] = useState('');",
    '  const [saving, setSaving] = useState(false);',
    '',
    '  const previewCard = useMemo(',
    '    () => ({',
    '      backgroundColor: theme.colors.surface,',
    '      borderColor: theme.colors.primary,',
    '      borderRadius: theme.layout.radius,',
    '      borderWidth: 1,',
    '      padding: theme.layout.spacing.md,',
    '      gap: theme.layout.spacing.sm,',
    '    }),',
    '    [theme]',
    '  );',
    '',
    '  function updateNumeric(path: string, raw: string) {',
    '    const value = Number.parseFloat(raw);',
    '    if (!Number.isFinite(value)) return;',
    '',
    "    if (path === 'displaySize') {",
    '      setTheme((prev) => ({ ...prev, typography: { ...prev.typography, displaySize: value } }));',
    '      return;',
    '    }',
    "    if (path === 'headingSize') {",
    '      setTheme((prev) => ({ ...prev, typography: { ...prev.typography, headingSize: value } }));',
    '      return;',
    '    }',
    "    if (path === 'bodySize') {",
    '      setTheme((prev) => ({ ...prev, typography: { ...prev.typography, bodySize: value } }));',
    '      return;',
    '    }',
    "    if (path === 'captionSize') {",
    '      setTheme((prev) => ({ ...prev, typography: { ...prev.typography, captionSize: value } }));',
    '      return;',
    '    }',
    "    if (path === 'radius') {",
    '      setTheme((prev) => ({ ...prev, layout: { ...prev.layout, radius: value } }));',
    '      return;',
    '    }',
    '',
    '    setTheme((prev) => ({',
    '      ...prev,',
    '      layout: {',
    '        ...prev.layout,',
    '        spacing: { ...prev.layout.spacing, [path]: value },',
    '      },',
    '    }));',
    '  }',
    '',
    '  async function saveTheme() {',
    '    setSaving(true);',
    "    setSaveMessage('');",
    '    try {',
    "      if (Platform.OS === 'web') {",
    "        const response = await fetch('/exposition/stylist-sync', {",
    "          method: 'POST',",
    "          headers: { 'content-type': 'application/json' },",
    '          body: JSON.stringify(theme),',
    '        });',
    '        const payload = await response.json();',
    '        if (!response.ok) {',
    "          throw new Error(payload?.error ?? 'Stylist sync failed.');",
    '        }',
    '        setSaveMessage(`Synced ${payload.updatedFiles?.length ?? 0} files from Stylist.`);',
    '      } else {',
    '        const draft = JSON.stringify(theme, null, 2);',
    '        setNativeDraft(draft);',
    "        setSaveMessage('Draft saved in Stylist. Run the sync command from your project root terminal.');",
    '      }',
    '    } catch (error) {',
    "      const message = error instanceof Error ? error.message : 'Unknown save error.';",
    '      Alert.alert("Stylist save failed", message);',
    '      setSaveMessage(message);',
    '    } finally {',
    '      setSaving(false);',
    '    }',
    '  }',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: theme.colors.background }]}>',
    `      <Text style={[styles.title, { color: theme.colors.text }]}>{'${answers.appName} Stylist'}</Text>`,
    '      <Text style={[styles.intro, { color: theme.colors.text }]}>Adjust design tokens, then save to sync `project/theme.json`, `project/style.md`, and app theme files.</Text>',
    '      <ExpositionNotice />',
    '',
    '      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.layout.radius }]}>',
    '        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Color Picker</Text>',
    '        <View style={styles.colorRow}>',
    '          {colorKeys.map((key) => (',
    '            <Pressable',
    '              key={key}',
    '              onPress={() => setSelectedColor(key)}',
    '              style={[',
    '                styles.colorChip,',
    '                { backgroundColor: theme.colors[key], borderColor: selectedColor === key ? theme.colors.text : "#9ca3af" },',
    '              ]}',
    '            >',
    '              <Text style={styles.colorChipLabel}>{key}</Text>',
    '            </Pressable>',
    '          ))}',
    '        </View>',
    '        <ColorPicker',
    '          value={theme.colors[selectedColor]}',
    '          onCompleteJS={({ hex }: { hex: string }) => {',
    '            setTheme((prev) => ({',
    '              ...prev,',
    '              colors: { ...prev.colors, [selectedColor]: hex },',
    '            }));',
    '          }}',
    '          style={styles.picker}',
    '        >',
    '          <Preview hideInitialColor />',
    '          <Panel1 />',
    '          <HueSlider />',
    '          <Swatches />',
    '        </ColorPicker>',
    '      </View>',
    '',
    '      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.layout.radius }]}>',
    '        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Typography</Text>',
    '        <TextInput value={theme.typography.fontFamily} onChangeText={(fontFamily) => setTheme((prev) => ({ ...prev, typography: { ...prev.typography, fontFamily } }))} style={styles.input} placeholder="Font family" />',
    '        <View style={styles.grid}>',
    '          <NumberField label="Display" value={theme.typography.displaySize} onChange={(value) => updateNumeric("displaySize", value)} />',
    '          <NumberField label="Heading" value={theme.typography.headingSize} onChange={(value) => updateNumeric("headingSize", value)} />',
    '          <NumberField label="Body" value={theme.typography.bodySize} onChange={(value) => updateNumeric("bodySize", value)} />',
    '          <NumberField label="Caption" value={theme.typography.captionSize} onChange={(value) => updateNumeric("captionSize", value)} />',
    '        </View>',
    '      </View>',
    '',
    '      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderRadius: theme.layout.radius }]}>',
    '        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Layout Tokens</Text>',
    '        <NumberField label="Radius" value={theme.layout.radius} onChange={(value) => updateNumeric("radius", value)} />',
    '        <View style={styles.grid}>',
    '          {spacingKeys.map((key) => (',
    '            <NumberField',
    '              key={key}',
    '              label={`Spacing ${key}`}',
    '              value={theme.layout.spacing[key]}',
    '              onChange={(value) => updateNumeric(key, value)}',
    '            />',
    '          ))}',
    '        </View>',
    '      </View>',
    '',
    '      <View style={previewCard}>',
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.displaySize, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "900" : "normal" }}>Display headline</Text>',
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.headingSize, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }}>Section heading</Text>',
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.bodySize }}>Readable body copy for product screens, onboarding, settings, and forms.</Text>',
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.captionSize, textTransform: "uppercase" }}>Caption and metadata text</Text>',
    '        <AnimatedPressable label="Primary action" />',
    '      </View>',
    '',
    '      <Pressable onPress={saveTheme} disabled={saving} style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}>',
    '        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Theme"}</Text>',
    '      </Pressable>',
    '      {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}',
    '      {Platform.OS !== "web" ? (',
    '        <View style={styles.nativeHelp}>',
    '          <Text style={styles.nativeTitle}>Native fallback</Text>',
    '          <Text style={styles.nativeBody}>Run this command in your app root terminal:</Text>',
    '          <Text style={styles.command}>{NATIVE_SAVE_COMMAND}</Text>',
    '          {nativeDraft ? <Text style={styles.payload}>{nativeDraft}</Text> : null}',
    '        </View>',
    '      ) : null}',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'function NumberField(props: { label: string; value: number; onChange: (value: string) => void }) {',
    '  return (',
    '    <View style={styles.field}>',
    '      <Text style={styles.fieldLabel}>{props.label}</Text>',
    '      <TextInput',
    '        value={String(props.value)}',
    '        onChangeText={props.onChange}',
    '        keyboardType="numeric"',
    '        style={styles.input}',
    '      />',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 18,',
    '    padding: 20,',
    '  },',
    '  title: {',
    '    fontSize: 30,',
    '    fontWeight: "900",',
    '  },',
    '  intro: {',
    '    fontSize: 15,',
    '    lineHeight: 22,',
    '  },',
    '  section: {',
    '    gap: 12,',
    '    padding: 16,',
    '  },',
    '  sectionTitle: {',
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  colorRow: {',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 8,',
    '  },',
    '  colorChip: {',
    '    borderRadius: 999,',
    '    borderWidth: 2,',
    '    minWidth: 94,',
    '    paddingHorizontal: 10,',
    '    paddingVertical: 8,',
    '  },',
    '  colorChipLabel: {',
    '    color: "#ffffff",',
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '    textTransform: "capitalize",',
    '  },',
    '  picker: {',
    '    gap: 12,',
    '    width: "100%",',
    '  },',
    '  grid: {',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 10,',
    '  },',
    '  field: {',
    '    flexBasis: "48%",',
    '    flexGrow: 1,',
    '    gap: 6,',
    '  },',
    '  fieldLabel: {',
    '    color: "#374151",',
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '  },',
    '  input: {',
    '    backgroundColor: "#ffffff",',
    '    borderColor: "#d1d5db",',
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    minHeight: 42,',
    '    paddingHorizontal: 12,',
    '  },',
    '  saveButton: {',
    '    borderRadius: 12,',
    '    minHeight: 48,',
    '    alignItems: "center",',
    '    justifyContent: "center",',
    '  },',
    '  saveButtonText: {',
    '    color: "#ffffff",',
    '    fontSize: 16,',
    '    fontWeight: "800",',
    '  },',
    '  saveMessage: {',
    '    color: "#374151",',
    '    fontSize: 13,',
    '  },',
    '  nativeHelp: {',
    '    backgroundColor: "#ffffff",',
    '    borderColor: "#e5e7eb",',
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 12,',
    '  },',
    '  nativeTitle: {',
    '    color: "#111827",',
    '    fontSize: 14,',
    '    fontWeight: "800",',
    '  },',
    '  nativeBody: {',
    '    color: "#374151",',
    '    fontSize: 12,',
    '  },',
    '  command: {',
    '    backgroundColor: "#111827",',
    '    borderRadius: 8,',
    '    color: "#f9fafb",',
    '    fontFamily: "monospace",',
    '    fontSize: 12,',
    '    padding: 10,',
    '  },',
    '  payload: {',
    '    color: "#1f2937",',
    '    fontFamily: "monospace",',
    '    fontSize: 11,',
    '    lineHeight: 16,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderEmbeddedFonts(): string {
  return [
    'export const EMBEDDED_GOOGLE_FONTS: string[] = [',
    "  'Inter',",
    "  'DM Sans',",
    "  'DM Serif Display',",
    "  'Noto Sans',",
    "  'Noto Sans Display',",
    "  'Noto Sans Mono',",
    "  'Noto Serif',",
    "  'Noto Serif Display',",
    "  'Playfair Display',",
    "  'Roboto',",
    "  'Roboto Mono',",
    "  'Source Sans 3',",
    "  'Space Grotesk',",
    "  'Work Sans',",
    '];',
    '',
  ].join('\n');
}

function renderDataScreen(answers: OnboardAnswers): string {
  if (answers.dataStart === 'supabase') {
    return renderSupabaseDataScreen(answers);
  }

  return [
    "import { useEffect, useState } from 'react';",
    "import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { ExpositionNotice } from '../../components/exposition';",
    "import { addLocalTask, getLocalAppSnapshot } from '../../services/local-data';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    "import type { appSnapshot } from '../../data/mock-app';",
    '',
    'type Snapshot = typeof appSnapshot;',
    '',
    'export default function DataScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);',
    '',
    '  useEffect(() => {',
    '    void getLocalAppSnapshot().then(setSnapshot);',
    '  }, []);',
    '',
    '  async function addTask() {',
    '    setSnapshot(await addLocalTask());',
    '  }',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    `      <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>Data Exposition</Text>`,
    '      <Text style={[styles.intro, { color: colors.text }]}>This app starts with a web-safe local adapter and a native Expo SQLite adapter. Keep the boundary, then swap implementation details when Supabase is ready.</Text>',
    '      <ExpositionNotice />',
    '      <Pressable onPress={addTask} style={[styles.button, { backgroundColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '        <Text style={styles.buttonText}>Insert a local task</Text>',
    '      </Pressable>',
    '      {snapshot?.tasks.map((task) => (',
    '        <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '          <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>',
    '          <Text style={[styles.taskStatus, { color: colors.text }]}>{task.status}</Text>',
    '        </View>',
    '      ))}',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Later Supabase replacement</Text>',
    '        <Text style={styles.body}>Create matching tables, move reads/writes into this adapter, then keep screens unchanged. Use separate Supabase projects for test/staging and production so test-to-main promotion never writes directly into production data.</Text>',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    ...renderDataScreenStyles(),
  ].join('\n');
}

function renderSupabaseDataScreen(answers: OnboardAnswers): string {
  return [
    "import { ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { ExpositionNotice } from '../../components/exposition';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'export default function DataScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    `      <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>Data Exposition</Text>`,
    `      <Text style={[styles.intro, { color: colors.text }]}>${answers.appName} is set to start with Supabase. Keep the adapter boundary in src/services so screens stay independent from backend details.</Text>`,
    '      <ExpositionNotice />',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Two Supabase projects</Text>',
    '        <Text style={styles.body}>Create one Supabase project for test/staging and one for production. Point feature branches and the test branch at the test project, then only promote validated work to the production project from main.</Text>',
    '      </View>',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Client setup</Text>',
    '        <Text style={styles.body}>Use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for client access. Never put service-role or secret keys in Expo client code.</Text>',
    '      </View>',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Migration path</Text>',
    '        <Text style={styles.body}>Design tables from project/info.md, enable RLS on exposed schemas, and map local demo concepts into Supabase queries inside the service adapter.</Text>',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    ...renderDataScreenStyles(),
  ].join('\n');
}

function renderDataScreenStyles(): string[] {
  return [
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f9fafb',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 14,',
    '    padding: 20,',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 30,',
    '    fontWeight: "900",',
    '  },',
    '  intro: {',
    "    color: '#4b5563',",
    '    fontSize: 16,',
    '    lineHeight: 24,',
    '  },',
    '  button: {',
    "    backgroundColor: '#111827',",
    '    borderRadius: 10,',
    '    paddingHorizontal: 16,',
    '    paddingVertical: 12,',
    '  },',
    '  buttonText: {',
    "    color: '#ffffff',",
    '    fontSize: 15,',
    '    fontWeight: "800",',
    '    textAlign: "center",',
    '  },',
    '  taskCard: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    padding: 12,',
    '  },',
    '  taskTitle: {',
    "    color: '#111827',",
    '    fontWeight: "700",',
    '  },',
    '  taskStatus: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '    fontWeight: "800",',
    '    marginTop: 4,',
    '    textTransform: "uppercase",',
    '  },',
    '  guidance: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 16,',
    '  },',
    '  sectionTitle: {',
    "    color: '#111827',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    lineHeight: 21,',
    '  },',
    '});',
    '',
  ];
}
