import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STYLIST_THEME, renderGlobalCssThemeBlock } from './stylist-theme.js';
import { loadLibraryTextAssets, requireLibraryTextAsset } from './library-generation.js';
import { generateProjectRoadmap } from './roadmap.js';

import type { LibraryProjectContext, LibraryStyling } from '@mr.dj2u/library-registry';

export type DataStart = 'local' | 'supabase';
export type AppDirectory = 'src' | 'root';
export type PlatformLayoutMode = 'shared' | 'platform-specific';
export type ExpoServerAdapter = 'eas' | 'express' | 'bun' | 'other' | 'none';
export type OnboardingFlow = 'none' | 'multi-screen';
export type LegalDocumentMode = 'none' | 'public-routes' | 'onboarding-agreement';
export type OnboardingCompletionMode = 'enter-app' | 'auth' | 'account-setup' | 'custom';
export type LegalUpdateGate = 'none' | 'material-required';
export type AuthProviderChoice = 'none' | 'base' | 'supabase' | 'firebase' | 'convex';

export interface OnboardAnswers {
  appName: string;
  generatorScriptLanguage?: 'typescript' | 'javascript';
  generatorPackageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  generatorNavigationLibrary?: 'expo-router' | 'react-navigation';
  generatorReactNavigationLayout?: 'stack' | 'tabs' | 'drawer';
  generatorStylingSystem?:
    | 'uniwind'
    | 'nativewind'
    | 'nativewindui'
    | 'tamagui'
    | 'restyle'
    | 'stylesheet';
  generatorStateManagement?: 'zustand' | 'none';
  generatorAuthBackend?: 'none' | 'supabase' | 'firebase';
  authProvider?: AuthProviderChoice;
  generatorEasSetup?: boolean;
  overview?: string;
  audience: string;
  problemStatement?: string;
  productGoals?: string;
  nonGoals?: string;
  coreFlows: string;
  screens?: string;
  monetizationStrategy?: string;
  teamContext?: string;
  laterScope?: string;
  researchNotes?: string;
  dataNeeds: string;
  deploymentTarget: string;
  advancedPackageSetup: boolean;
  includeCreateExpoComponents: boolean;
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
  onboardingFlow: OnboardingFlow;
  legalDocumentMode: LegalDocumentMode;
  onboardingCompletionMode: OnboardingCompletionMode;
  legalUpdateGate: LegalUpdateGate;
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

export interface RenderInfoOptions {
  preserveImportedNotes?: boolean;
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

interface GeneratedLibraryRouteAssets {
  auth?: ReadonlyMap<string, string>;
  onboarding?: ReadonlyMap<string, string>;
  legal?: ReadonlyMap<string, string>;
  settings?: ReadonlyMap<string, string>;
  stylist?: ReadonlyMap<string, string>;
  expoSdk56?: ReadonlyMap<string, string>;
}

function buildGeneratedLibraryContext(
  answers: OnboardAnswers,
  navigationShell: NavigationShell,
  manageUniwind: boolean
): LibraryProjectContext {
  const platformSet = new Set<'android' | 'ios' | 'web'>();
  for (const platform of answers.targetPlatforms) {
    if (platform === 'web') {
      platformSet.add('web');
    } else if (platform === 'android' || platform === 'android-tv') {
      platformSet.add('android');
    } else if (platform === 'ios' || platform === 'apple-tv') {
      platformSet.add('ios');
    }
  }

  const generatedStyling = answers.generatorStylingSystem;
  const styling: LibraryStyling = generatedStyling
    ? generatedStyling === 'stylesheet'
      ? 'stylesheet'
      : generatedStyling
    : answers.defaults.includes('nativewindui')
      ? 'nativewindui'
      : manageUniwind
        ? 'uniwind'
        : 'stylesheet';

  return {
    projectName: answers.appName,
    expoSdk: 56,
    styling,
    appDirectory: answers.appDirectory === 'src' ? 'src/app' : 'app',
    navigation: navigationShell.library,
    navigationLayout:
      navigationShell.layout === 'drawer + tabs' ? 'drawer+tabs' : navigationShell.layout,
    platforms: [...platformSet],
    aliases: { '@': './src' },
    componentsDirectory: 'src/components',
    featuresDirectory: 'src/features',
  };
}

function shouldGenerateOnboarding(answers: OnboardAnswers): boolean {
  return answers.onboardingFlow === 'multi-screen';
}

function shouldGenerateAuth(answers: OnboardAnswers): boolean {
  return (answers.authProvider ?? 'none') !== 'none';
}

function authLibraryVariant(
  answers: OnboardAnswers
): 'base' | 'with-supabase' | 'with-firebase' | 'with-convex' {
  switch (answers.authProvider ?? 'base') {
    case 'supabase':
      return 'with-supabase';
    case 'firebase':
      return 'with-firebase';
    case 'convex':
      return 'with-convex';
    case 'base':
    case 'none':
      return 'base';
  }
}

function onboardingLibraryVariant(
  answers: OnboardAnswers
): 'multi-screen' | 'multi-screen-with-legal' {
  return answers.legalDocumentMode === 'onboarding-agreement'
    ? 'multi-screen-with-legal'
    : 'multi-screen';
}

function shouldGenerateStandaloneLegalDocuments(answers: OnboardAnswers): boolean {
  return answers.legalDocumentMode === 'public-routes';
}

function shouldGenerateLegalUpdateGate(answers: OnboardAnswers): boolean {
  return answers.legalUpdateGate === 'material-required';
}

function legalDocumentsLibraryVariant(
  answers: OnboardAnswers
): 'public-routes' | 'legal-update-gate' {
  return shouldGenerateLegalUpdateGate(answers) ? 'legal-update-gate' : 'public-routes';
}

function onboardingCompletionConfig(answers: OnboardAnswers): {
  mode: OnboardingCompletionMode;
  route: string;
  label: string;
  helperText: string;
} {
  switch (answers.onboardingCompletionMode) {
    case 'auth':
      return {
        mode: 'auth',
        route: '/',
        label: 'Continue to app',
        helperText:
          'Auth handoff selected. Signed-out users are routed to sign in by the protected app layout.',
      };
    case 'account-setup':
      return {
        mode: 'account-setup',
        route: '/account-setup',
        label: 'Continue to account setup',
        helperText:
          'Account setup handoff selected. Add that route or edit this route when profile setup exists.',
      };
    case 'custom':
      return {
        mode: 'custom',
        route: '/',
        label: 'Continue',
        helperText: 'Custom handoff selected. Edit route and label in this config before release.',
      };
    case 'enter-app':
      return {
        mode: 'enter-app',
        route: '/',
        label: "Let's begin",
        helperText: 'Default mode: enter the app shell.',
      };
  }
}

function renderGeneratedOnboardingConfig(source: string, answers: OnboardAnswers): string {
  const completion = onboardingCompletionConfig(answers);
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const replacement = [
    '  completion: {',
    `    mode: '${completion.mode}',`,
    `    route: '${completion.route}' as Href,`,
    `    label: ${JSON.stringify(completion.label)},`,
    `    helperText: ${JSON.stringify(completion.helperText)},`,
    '  },',
  ].join(lineEnding);

  const completionPattern = new RegExp(
    String.raw`[ \t]{2}completion: \{\r?\n[ \t]{4}mode: ['"][^'"]+['"],\r?\n[ \t]{4}route: ['"][^'"]+['"] as Href,\r?\n[ \t]{4}label: [^\r\n]+,\r?\n[ \t]{4}helperText: [^\r\n]+,\r?\n[ \t]{2}\},`,
    'u'
  );

  if (!completionPattern.test(source)) {
    throw new Error(
      'Unable to update onboarding completion config; template did not match the expected completion block.'
    );
  }

  return source.replace(completionPattern, replacement);
}

const SOFTWARE_MANSION_CORE_DEPENDENCIES = {
  'react-native-gesture-handler': '~2.31.1',
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
  '@supabase/supabase-js': '^2.112.3',
  '@react-native-async-storage/async-storage': '2.2.0',
} as const;

const FIREBASE_AUTH_DEPENDENCIES = {
  '@react-native-async-storage/async-storage': '2.2.0',
  firebase: '^12.17.1',
} as const;

const CONVEX_AUTH_DEPENDENCIES = {
  '@auth/core': '0.41.1',
  '@convex-dev/auth': '^0.0.95',
  convex: '^1.43.0',
  'expo-secure-store': '~56.0.4',
} as const;

const UNIWIND_DEPENDENCIES = {
  uniwind: '^1.6.4',
} as const;

const STYLIST_DEPENDENCIES = {
  '@react-native-async-storage/async-storage': '2.2.0',
  'reanimated-color-picker': '^4.2.0',
} as const;

const STYLIST_DEV_DEPENDENCIES = {
  '@types/node': '^25.9.1',
  tailwindcss: '^4.2.4',
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
const require = createRequire(import.meta.url);
const MDS_CLI_VERSION = readOwnPackageVersion();
const MDS_NPX_COMMAND = 'npx mds';
const DEFAULT_GUIDELINES_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'project',
  'guidelines.md'
);

function readOwnPackageVersion(): string {
  try {
    const packageJson = require('../package.json') as { version?: unknown };
    if (typeof packageJson.version === 'string' && packageJson.version.trim()) {
      return packageJson.version;
    }
  } catch {
    // Keep generated apps installable even in local harnesses without package metadata.
  }
  return '0.1.20';
}

const INFO_HEADINGS = [
  'App Name',
  'Overview',
  'Target Users',
  'Problem this app solves',
  'Product Goals',
  'Non-Goals',
  'First User Flow',
  'Core Flows and Features',
  'Screens',
  'Platforms',
  'Monetization Strategy',
  'Team Context',
  'Later Scope & Possibilities',
  'Research, Notes, and References',
  'Tech Stack & CESS Onboarding',
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
  const todoPath = path.join(projectDir, 'todo.md');
  const stylePath = path.join(projectDir, 'style.md');
  const existingInfo = await readOptionalText(infoPath);
  const existingStyle = await readOptionalText(stylePath);
  const guidelines = await resolveGuidelines(answers, options);
  const results = await Promise.all([
    writeProjectMemoryFile(infoPath, renderInfo(projectPath, answers, existingInfo), force, true),
    writeIfAllowed(todoPath, renderTodo(answers), force),
    writeProjectMemoryFile(stylePath, renderStyle(answers, existingStyle), force, true),
    writeIfAllowed(path.join(projectDir, 'guidelines.md'), guidelines, force),
    writeIfAllowed(path.join(projectPath, 'AGENTS.md'), renderAgentInstructions(answers), force),
    writeIfAllowed(path.join(projectPath, 'CLAUDE.md'), renderClaudeMd(answers), force),
  ]);
  const roadmapResult = await generateProjectRoadmap(projectPath, {
    write: true,
    preserveStatus: true,
  });
  const todoResultIndex = results.findIndex((result) => result.filePath === todoPath);
  if (todoResultIndex >= 0) {
    const todoResult = results[todoResultIndex];
    if (todoResult) {
      results[todoResultIndex] = {
        filePath: todoResult.filePath,
        wrote: todoResult.wrote || roadmapResult.wrote,
      };
    }
  } else {
    results.push({
      filePath: todoPath,
      wrote: roadmapResult.wrote,
    });
  }

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
  const libraryContext = buildGeneratedLibraryContext(
    answers,
    navigationShell,
    options.manageUniwind
  );
  const [themeAssets, expositionComponentAssets, stylistSyncAssets] = await Promise.all([
    loadLibraryTextAssets('mds/theme-support', libraryContext),
    loadLibraryTextAssets('mds/exposition-components', libraryContext),
    loadLibraryTextAssets('mds/stylist-sync-support', libraryContext),
  ]);
  const authAssets =
    navigationShell.library === 'expo-router' && shouldGenerateAuth(answers)
      ? await loadLibraryTextAssets('mds/auth', libraryContext, authLibraryVariant(answers))
      : undefined;
  const onboardingAssets =
    navigationShell.library === 'expo-router' && shouldGenerateOnboarding(answers)
      ? await loadLibraryTextAssets(
          'mds/onboarding',
          libraryContext,
          onboardingLibraryVariant(answers)
        )
      : undefined;
  const legalAssets =
    navigationShell.library === 'expo-router' &&
    (shouldGenerateStandaloneLegalDocuments(answers) || shouldGenerateLegalUpdateGate(answers))
      ? await loadLibraryTextAssets(
          'mds/legal-documents',
          libraryContext,
          legalDocumentsLibraryVariant(answers)
        )
      : undefined;
  const settingsAssets =
    navigationShell.library === 'expo-router'
      ? await loadLibraryTextAssets('mds/settings', libraryContext)
      : undefined;
  const stylistAssets =
    navigationShell.library === 'expo-router'
      ? await loadLibraryTextAssets('mds/stylist', libraryContext)
      : undefined;
  const expoSdk56Assets =
    navigationShell.library === 'expo-router' && answers.usesExpoUiUniversalComponents
      ? await loadLibraryTextAssets('mds/expo-sdk-56', libraryContext)
      : undefined;
  const nativeWindUiAssets = includeNativeWindUiExposition
    ? await loadLibraryTextAssets(
        'nativewindui/exposition',
        navigationShell.library === 'react-navigation'
          ? { ...libraryContext, navigation: 'expo-router' }
          : libraryContext
      )
    : undefined;
  const libraryAssetOrFallback = (
    itemId: string,
    assets: ReadonlyMap<string, string> | undefined,
    destination: string,
    fallback: () => string
  ): string => (assets ? requireLibraryTextAsset(itemId, assets, destination) : fallback());
  const legalLibraryAssetsFor = (destination: string): ReadonlyMap<string, string> | undefined =>
    onboardingAssets?.has(destination)
      ? onboardingAssets
      : legalAssets?.has(destination)
        ? legalAssets
        : undefined;

  await mkdir(path.join(projectPath, 'src', 'features', 'home'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'onboarding'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'legal'), {
    recursive: true,
  });
  await mkdir(path.join(projectPath, 'src', 'features', 'auth'), {
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
  await mkdir(path.join(projectPath, 'src', 'components', 'swmansion'), {
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
      requireLibraryTextAsset(
        'mds/stylist-sync-support',
        stylistSyncAssets,
        'scripts/stylist-sync-android.mjs'
      ),
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
      requireLibraryTextAsset('mds/theme-support', themeAssets, 'src/theme/tokens.ts'),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'font-assets.ts'),
      requireLibraryTextAsset('mds/theme-support', themeAssets, 'src/theme/font-assets.ts'),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'provider.tsx'),
      requireLibraryTextAsset('mds/theme-support', themeAssets, 'src/theme/provider.tsx'),
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
    ...(await Promise.all(
      [
        'animated-pressable.tsx',
        'gesture-card.tsx',
        'keyboard-form.tsx',
        'svg-mark.tsx',
        'software-mansion-logo.tsx',
        'screens-card.tsx',
      ].map((fileName) =>
        writeIfAllowed(
          path.join(projectPath, 'src', 'components', 'swmansion', fileName),
          requireLibraryTextAsset(
            'mds/exposition-components',
            expositionComponentAssets,
            `src/components/swmansion/${fileName}`
          ),
          force
        )
      )
    )),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'),
      requireLibraryTextAsset(
        'mds/exposition-components',
        expositionComponentAssets,
        'src/components/exposition/notice.tsx'
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'package-card.tsx'),
      requireLibraryTextAsset(
        'mds/exposition-components',
        expositionComponentAssets,
        'src/components/exposition/package-card.tsx'
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'components', 'exposition', 'index.ts'),
      requireLibraryTextAsset(
        'mds/exposition-components',
        expositionComponentAssets,
        'src/components/exposition/index.ts'
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
      renderHomeScreen(answers, navigationShell),
      force
    ),
    ...(onboardingAssets
      ? [
          await writeIfAllowed(
            path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-config.ts'),
            renderGeneratedOnboardingConfig(
              requireLibraryTextAsset(
                'mds/onboarding',
                onboardingAssets,
                'src/features/onboarding/onboarding-config.ts'
              ),
              answers
            ),
            force
          ),
          await writeIfAllowed(
            path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen.tsx'),
            requireLibraryTextAsset(
              'mds/onboarding',
              onboardingAssets,
              'src/features/onboarding/welcome-screen.tsx'
            ),
            force
          ),
          await writeIfAllowed(
            path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen.tsx'),
            requireLibraryTextAsset(
              'mds/onboarding',
              onboardingAssets,
              'src/features/onboarding/features-screen.tsx'
            ),
            force
          ),
          ...(onboardingAssets.has('src/features/onboarding/complete-screen.tsx')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen.tsx'),
                  requireLibraryTextAsset(
                    'mds/onboarding',
                    onboardingAssets,
                    'src/features/onboarding/complete-screen.tsx'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets.has('src/features/onboarding/legal-review-screen.tsx')
            ? [
                await writeIfAllowed(
                  path.join(
                    projectPath,
                    'src',
                    'features',
                    'onboarding',
                    'legal-review-screen.tsx'
                  ),
                  requireLibraryTextAsset(
                    'mds/onboarding',
                    onboardingAssets,
                    'src/features/onboarding/legal-review-screen.tsx'
                  ),
                  force
                ),
              ]
            : []),
        ]
      : []),
    ...((onboardingAssets ?? legalAssets)
      ? [
          ...(onboardingAssets?.has('src/features/legal/legal-documents.ts') ||
          legalAssets?.has('src/features/legal/legal-documents.ts')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-documents.ts')!,
                    'src/features/legal/legal-documents.ts'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/legal-document-view.tsx') ||
          legalAssets?.has('src/features/legal/legal-document-view.tsx')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-document-view.tsx'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-document-view.tsx')!,
                    'src/features/legal/legal-document-view.tsx'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/legal-page-route.tsx') ||
          legalAssets?.has('src/features/legal/legal-page-route.tsx')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-page-route.tsx'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-page-route.tsx')!,
                    'src/features/legal/legal-page-route.tsx'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/legal-document-modal.tsx') ||
          legalAssets?.has('src/features/legal/legal-document-modal.tsx')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-document-modal.tsx'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-document-modal.tsx')!,
                    'src/features/legal/legal-document-modal.tsx'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/use-legal-acceptance.ts') ||
          legalAssets?.has('src/features/legal/use-legal-acceptance.ts')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'use-legal-acceptance.ts'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/use-legal-acceptance.ts')!,
                    'src/features/legal/use-legal-acceptance.ts'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/legal-acceptance-adapter.ts') ||
          legalAssets?.has('src/features/legal/legal-acceptance-adapter.ts')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter.ts'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-acceptance-adapter.ts')!,
                    'src/features/legal/legal-acceptance-adapter.ts'
                  ),
                  force
                ),
              ]
            : []),
          ...(onboardingAssets?.has('src/features/legal/legal-update-screen.tsx') ||
          legalAssets?.has('src/features/legal/legal-update-screen.tsx')
            ? [
                await writeIfAllowed(
                  path.join(projectPath, 'src', 'features', 'legal', 'legal-update-screen.tsx'),
                  requireLibraryTextAsset(
                    'mds/legal-documents',
                    legalLibraryAssetsFor('src/features/legal/legal-update-screen.tsx')!,
                    'src/features/legal/legal-update-screen.tsx'
                  ),
                  force
                ),
              ]
            : []),
        ]
      : []),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'),
      libraryAssetOrFallback(
        'mds/settings',
        settingsAssets,
        'src/features/settings/settings-screen.tsx',
        renderSettingsScreen
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
      renderExpositionScreen(includeNativeWindUiExposition),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'embedded-fonts.ts'),
      libraryAssetOrFallback(
        'mds/stylist',
        stylistAssets,
        'src/features/exposition/embedded-fonts.ts',
        renderEmbeddedFonts
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
      libraryAssetOrFallback(
        'mds/stylist',
        stylistAssets,
        'src/features/exposition/stylist-screen.tsx',
        () => renderStylistScreen(answers)
      ),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
      renderDataScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
      libraryAssetOrFallback(
        'mds/expo-sdk-56',
        expoSdk56Assets,
        'src/features/exposition/expo-sdk-56-screen.tsx',
        () => renderExpoSdk56Screen(answers)
      ),
      force
    )
  );

  if (includeNativeWindUiExposition) {
    if (nativeWindUiAssets) {
      const generatedNativeWindUiAssets = [...nativeWindUiAssets].filter(
        ([destination]) =>
          destination === 'src/features/exposition/nativewindui-screen.tsx' ||
          destination.startsWith('src/components/nativewindui/') ||
          destination.startsWith('src/lib/') ||
          destination === 'src/theme/colors.ts' ||
          destination === 'src/theme/with-opacity.ts' ||
          destination === 'src/theme/index.ts'
      );
      results.push(
        ...(await Promise.all(
          generatedNativeWindUiAssets.map(([destination, contents]) =>
            writeIfAllowed(path.join(projectPath, ...destination.split('/')), contents, force)
          )
        ))
      );
    } else {
      results.push(
        await writeIfAllowed(
          path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
          renderNativeWindUiScreen(),
          force
        )
      );
    }
  } else {
    await removeOptionalFile(
      path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx')
    );
  }

  if (authAssets) {
    results.push(...(await writeLibraryAssetMap(projectPath, authAssets, force)));
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
      ...(await scaffoldNavigationRoutes(
        projectPath,
        appDir,
        navigationShell,
        answers,
        routeForce,
        {
          onboarding: onboardingAssets,
          auth: authAssets,
          legal: legalAssets,
          settings: settingsAssets,
          stylist: stylistAssets,
          expoSdk56: expoSdk56Assets,
        }
      ))
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
    await mkdir(path.join(projectPath, 'supabase', 'migrations'), {
      recursive: true,
    });
    results.push(
      await writeIfAllowed(
        path.join(projectPath, 'src', 'services', 'supabase.ts'),
        renderSupabaseClient(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'src', 'services', 'supabase-demo-data.ts'),
        renderSupabaseDemoDataService(),
        force
      ),
      await writeIfAllowed(
        path.join(projectPath, 'supabase', 'migrations', '0002_mds_data_exposition.sql'),
        renderSupabaseDataExpositionMigration(),
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
  existingInfo?: string | null,
  options: RenderInfoOptions = {}
): string {
  void projectPath;
  const importedNotes =
    options.preserveImportedNotes === false ? [] : renderImportedNotes(existingInfo, INFO_HEADINGS);
  const hasConcreteCoreFlows = !isGenericCoreFlowsText(answers.coreFlows);
  const firstFlow = hasConcreteCoreFlows
    ? extractFirstNonEmptyLine(answers.coreFlows)
    : '# TodoForContext(optional): Describe the first real end-to-end user flow the MVP should support.';
  return [
    `# ${answers.appName} Project Info`,
    '',
    '## App Name',
    answers.appName,
    '',
    '## Overview',
    '',
    answers.overview?.trim() || `Build an Expo app for ${answers.audience}.`,
    '',
    '## Target Users',
    '',
    answers.audience,
    '',
    '## Problem this app solves',
    answers.problemStatement?.trim() ||
      '# TodoForContext(optional): Explain the user problem or pain this app exists to solve.',
    '',
    '## Product Goals',
    '',
    answers.productGoals?.trim() ||
      '# TodoForContext(optional): Add the business/product outcomes that would make this app successful.',
    '',
    '## Non-Goals',
    '',
    answers.nonGoals?.trim() ||
      '# TodoForContext(optional): Add anything this app should intentionally avoid for the MVP.',
    '',
    '## First User Flow',
    '',
    firstFlow,
    '',
    '## Core Flows and Features',
    '',
    hasConcreteCoreFlows
      ? formatMarkdownListBlock(answers.coreFlows)
      : '# TodoForContext(optional): List the first core flows and features the MVP should deliver.',
    '',
    '## Screens',
    '',
    answers.screens?.trim()
      ? formatMarkdownListBlock(answers.screens)
      : '# TodoForContext(optional): List any known screens that must be included in planning and implementation.',
    '',
    '## Platforms',
    '',
    `- Target platforms: ${answers.targetPlatforms.join(', ') || 'none selected'}`,
    `- First MVP platform: ${answers.firstTargetPlatform}`,
    '',
    '## Monetization Strategy',
    '',
    answers.monetizationStrategy?.trim() ||
      '# TodoForContext(optional): Add monetization notes when relevant. Include pricing, subscriptions, ads, sponsorship, lead-gen, internal ROI, or note that monetization is not planned.',
    '',
    '## Team Context',
    '',
    answers.teamContext?.trim() ||
      '# TodoForContext(optional): Add team size, roles, delegated responsibilities, stakeholders, and client contacts if useful.',
    '',
    '## Later Scope & Possibilities',
    '',
    answers.laterScope?.trim() ||
      '# TodoForContext(optional): Add future ideas or enhancements outside the first MVP.',
    '',
    '## Research, Notes, and References',
    '',
    answers.researchNotes?.trim() ||
      '- # TodoForContext(optional): Add designs, repos, docs, client notes, analytics, credentials process, or research links.',
    '',
    ...importedNotes,
    '',
    '# Tech Stack & CESS Onboarding',
    '',
    `- TypeScript: ${formatYesNo(answers.generatorScriptLanguage !== 'javascript')}`,
    `- Package Manager: ${answers.generatorPackageManager ?? 'npm'}`,
    `- Navigation: ${formatGeneratorNavigation(answers.generatorNavigationLibrary)}`,
    `- Type of Navigation: ${formatGeneratorNavigationType(answers.generatorReactNavigationLayout)}`,
    `- Expo Router app directory: ${formatAppDirectory(answers.appDirectory)}`,
    `- Platform-specific organization: ${formatPlatformStrategy(answers.platformFileStrategy)}`,
    `- Platform layout mode: ${formatPlatformLayoutMode(answers.platformLayoutMode)}`,
    `- Web output: ${answers.webOutput}`,
    '',
    `- Style Library: ${formatCessStyleLibrary(answers)}`,
    '- Which NativeWindUI components: All',
    `- Components from create-expo-app: ${formatYesNo(answers.includeCreateExpoComponents)}`,
    `- Expo UI: ${formatYesNo(answers.usesExpoUi)}`,
    `- Expo UI Universal components: ${formatYesNo(answers.usesExpoUiUniversalComponents)}`,
    `- Expo Native Tabs: ${formatYesNo(answers.usesExpoNativeTabs)}`,
    '',
    '- Which Software Mansion packages: All',
    `- State management library: ${formatGeneratorStateManagement(answers.generatorStateManagement)}`,
    `- Auth: ${formatAuthProvider(answers)}`,
    `- Onboarding Flow: ${formatOnboardingFlow(answers.onboardingFlow)}`,
    `- Legal Documents: ${formatLegalDocumentMode(answers.legalDocumentMode)}`,
    `- Onboarding Completion: ${formatOnboardingCompletionMode(answers.onboardingCompletionMode)}`,
    `- Legal Update Gate: ${formatLegalUpdateGate(answers.legalUpdateGate)}`,
    `- Data Categories: ${answers.dataNeeds}`,
    `- Starting Data mode: ${formatDataStart(answers.dataStart)}.`,
    '',
    '- Internationalization: None',
    '- Analytics: None',
    `- EAS: ${formatYesNo(answers.generatorEasSetup ?? answers.easUses.length > 0)}`,
    `- EAS Usage: ${answers.easUses.length > 0 ? answers.easUses.join(', ') : 'not planned yet'}`,
    `- Deployed server: ${formatServerChoice(answers.deployedServer)}`,
    `- Initial Deployment plan: ${answers.deploymentTarget}`,
    '',
    `- Start with MDS project guidelines template: ${formatYesNo(true)}`,
    `- Use test-to-main safeguards: ${formatYesNo(answers.testToMainSafeguards)}`,
    '',
  ].join('\n');
}

export function renderTodo(answers: OnboardAnswers): string {
  return [
    `# ${answers.appName} TODO`,
    '',
    '## Phase 0: Orientation And Planning',
    '',
    '- [ ] Browse exposition pages to understand included base packages.',
    "- [ ] Review styling in the 'Stylist' page.",
    '- [ ] Review `project/` files for accuracy and planning adjustments.',
    '- [ ] Run or defer `eject-stylist`; mark this todo done after ejection or deciding to defer (if you want to keep the stylist around for tinkering).',
    '- [ ] Run `mds eject exposition` and keep only the generated sections you want to retain.',
    ...((answers.generatorEasSetup ?? answers.easUses.length > 0)
      ? ['- [ ] Sign in and set up EAS in the terminal.']
      : []),
    '- [ ] Resolve every `# TodoForContext(optional):` marker in `project/info.md` by filling the section underneath or deleting the marker line to acknowledge no extra context is needed.',
    '- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.',
    '- [ ] After the `project/info.md` markers are resolved, refresh the agent-derived roadmap from `project/info.md` and review it for accuracy.',
    '- [ ] Keep or prune included package examples after reviewing `/exposition`.',
    '- [ ] Remove exposition pages before production once their lessons are absorbed.',
    ...((answers.authProvider ?? 'none') !== 'none'
      ? ['- [ ] Review `project/auth.md` and finish provider-specific auth setup.']
      : []),
    '',
    '## Phase 1: App Shell And First Flow',
    '',
    `- [ ] Establish the app shell and first implementation-ready route in ${formatAppDirectory(answers.appDirectory)}.`,
    '- [ ] Implement the first concrete product flow from `project/info.md` and the roadmap.',
    '',
    '## Phase 2: Data Layer',
    '',
    `- [ ] Implement the initial data layer using ${formatDataStart(answers.dataStart)}.`,
    ...(answers.dataStart === 'supabase' || answers.authProvider === 'supabase'
      ? ['- [ ] Create separate Supabase projects for test/staging and production.']
      : []),
    ...(answers.authProvider === 'firebase'
      ? [
          '- [ ] Enable Firebase Email/Password auth and set the generated EXPO_PUBLIC_FIREBASE_* values.',
        ]
      : []),
    ...(answers.authProvider === 'convex'
      ? [
          '- [ ] Run `npx convex dev` and initialize Convex Auth before using the generated auth routes.',
        ]
      : []),
    '',
    '## Phase 3: Complete Product Flows',
    '',
    '- [ ] Build the remaining core flows from `project/info.md` phase by phase.',
    ...(answers.targetPlatforms.length > 1
      ? [
          '- [ ] Adapt the working MVP flow for the remaining target platforms after the primary flow is stable.',
        ]
      : []),
    ...(answers.easUses.length > 0
      ? answers.easUses.map((item) => `- [ ] Configure EAS for ${item}.`)
      : []),
    '',
    '## Phase 4: Polish, Safeguards, And Release',
    '',
    '- [ ] Run `mds doctor --ci` and address errors.',
    ...(answers.testToMainSafeguards
      ? [
          '- [ ] Follow `project/release-flow.md` for test-to-main development.',
          '- [ ] Complete the one-time GitHub repo setup from `project/release-flow.md` so `test` and `main` are protected correctly.',
          '- [ ] Add GitHub branch protection so PR checks pass before merging into `test` or `main`.',
        ]
      : ['- [ ] Decide on release safeguards before production work begins.']),
    ...(answers.webOutput !== 'none'
      ? [`- [ ] Confirm Expo web output mode: ${answers.webOutput}.`]
      : []),
    ...(answers.deployedServer !== 'none'
      ? [`- [ ] Plan deployed server work: ${formatServerChoice(answers.deployedServer)}.`]
      : []),
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
    `- Auth provider: ${formatAuthProvider(answers)}.`,
    ...(answers.dataStart === 'supabase' || answers.authProvider === 'supabase'
      ? [
          '- Use separate Supabase projects for test/staging and production.',
          '- Never expose Supabase service-role or secret keys in client code.',
        ]
      : ['- Keep local dummy data behind an adapter so Supabase can replace it later.']),
    ...(answers.authProvider === 'firebase'
      ? [
          '- The generated Firebase auth variant uses Firebase JS SDK for Expo compatibility.',
          '- Add Firestore or another backend before relying on Firebase for production legal acceptance audit records.',
        ]
      : []),
    ...(answers.authProvider === 'convex'
      ? [
          '- The generated Convex auth variant is experimental; run Convex initialization before typechecking provider-specific backend work.',
        ]
      : []),
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
    'Before any intake, planning, scaffolding, or phase work, scan `project/info.md` for the marker `# TodoForContext(optional):`. If any remain, stop and tell the user to fill the section underneath OR delete the marker line to acknowledge they do not want to add that context. Only proceed when zero `project/info.md` markers remain.',
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
    'mds:eject': packageJson.scripts?.['mds:eject'] ?? `${MDS_NPX_COMMAND} eject .`,
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
    test: packageJson.scripts?.test ?? 'npm run lint && npm run typecheck',
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

  if (answers.dataStart === 'supabase' || answers.authProvider === 'supabase') {
    packageJson.dependencies = {
      ...SUPABASE_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.authProvider === 'firebase') {
    packageJson.dependencies = {
      ...FIREBASE_AUTH_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.authProvider === 'convex') {
    packageJson.dependencies = {
      ...CONVEX_AUTH_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  if (answers.usesExpoUi) {
    packageJson.dependencies = {
      ...EXPO_UI_DEPENDENCIES,
      ...packageJson.dependencies,
    };
  }

  packageJson.dependencies = {
    ...ANDROID_NAVIGATION_BAR_DEPENDENCIES,
    ...packageJson.dependencies,
  };

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
    ...STYLIST_DEV_DEPENDENCIES,
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

function formatOnboardingFlow(value: OnboardingFlow): string {
  return value === 'multi-screen' ? 'multi-screen' : 'none';
}

function formatLegalDocumentMode(value: LegalDocumentMode): string {
  switch (value) {
    case 'public-routes':
      return 'public-routes';
    case 'onboarding-agreement':
      return 'onboarding-agreement';
    case 'none':
      return 'none';
  }
}

function formatOnboardingCompletionMode(value: OnboardingCompletionMode): string {
  switch (value) {
    case 'auth':
      return 'auth';
    case 'account-setup':
      return 'account-setup';
    case 'custom':
      return 'custom';
    case 'enter-app':
      return 'enter-app';
  }
}

function formatLegalUpdateGate(value: LegalUpdateGate): string {
  return value === 'material-required' ? 'material-required' : 'none';
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

function extractFirstNonEmptyLine(value: string): string {
  return (
    value
      .split(/\r?\n/u)
      .map((line) => line.replace(/^[-*]\s+/u, '').trim())
      .find(Boolean) ?? value.trim()
  );
}

function formatMarkdownListBlock(value: string): string {
  const items = value
    .split(/\r?\n/u)
    .map((line) => line.replace(/^[-*]\s+/u, '').trim())
    .filter(Boolean);
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : value.trim();
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatGeneratorNavigation(value: OnboardAnswers['generatorNavigationLibrary']): string {
  return value === 'react-navigation' ? 'React Navigation' : 'Expo Router';
}

function formatGeneratorNavigationType(
  value: OnboardAnswers['generatorReactNavigationLayout']
): string {
  if (value === 'tabs') {
    return 'Tabs';
  }
  if (value === 'drawer') {
    return 'Drawer + Tabs';
  }
  return 'Stack';
}

function formatCessStyleLibrary(answers: OnboardAnswers): string {
  if (
    answers.generatorStylingSystem === 'nativewindui' ||
    answers.defaults.includes('nativewindui')
  ) {
    return 'NativeWindUI';
  }
  if (answers.generatorStylingSystem === 'nativewind' || answers.defaults.includes('nativewind')) {
    return 'NativeWind';
  }
  if (answers.generatorStylingSystem === 'tamagui' || answers.defaults.includes('tamagui')) {
    return 'Tamagui';
  }
  if (answers.generatorStylingSystem === 'restyle' || answers.defaults.includes('restyle')) {
    return 'Restyle';
  }
  if (answers.generatorStylingSystem === 'stylesheet') {
    return 'StyleSheet';
  }
  return 'Uniwind';
}

function formatGeneratorAuth(value: OnboardAnswers['generatorAuthBackend']): string {
  if (value === 'supabase') {
    return 'Supabase';
  }
  if (value === 'firebase') {
    return 'Firebase';
  }
  return 'None';
}

function formatAuthProvider(answers: OnboardAnswers): string {
  switch (answers.authProvider ?? 'none') {
    case 'base':
      return 'MDS base auth adapter';
    case 'supabase':
      return 'Supabase via MDS auth library';
    case 'firebase':
      return 'Firebase via MDS auth library';
    case 'convex':
      return 'Convex via MDS auth library (experimental)';
    case 'none':
      return formatGeneratorAuth(answers.generatorAuthBackend);
  }
}

function formatGeneratorStateManagement(value: OnboardAnswers['generatorStateManagement']): string {
  if (value === 'zustand') {
    return 'Zustand';
  }
  if (value === 'none') {
    return 'None';
  }
  return '# TodoForContext(optional): Zustand / Jotai / React context / none';
}

function hasThinOnboardingAnswers(answers: OnboardAnswers): boolean {
  const genericValues = new Set([
    'Expo app users',
    'Onboarding, primary app workflow, settings',
    'Local state first; add backend only when needed',
    'Expo web/native deployment',
  ]);

  if (!answers.screens?.trim()) {
    return true;
  }

  return (
    [answers.audience, answers.dataNeeds, answers.deploymentTarget].some((value) =>
      genericValues.has(value.trim())
    ) || isGenericCoreFlowsText(answers.coreFlows)
  );
}

function isGenericCoreFlowsText(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    trimmed ===
      'Let the agent derive the first real core user flows later from the fully clarified `project/info.md`.' ||
    trimmed === 'Agent should derive the first core user flows from project/info.md during intake.'
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
  const globalCssPath = path.join(projectPath, 'global.css');
  const hasGlobalCss = await pathExists(globalCssPath);
  const layout = await readOptionalText(layoutPath);
  if (layout) {
    const globalCssImportPattern = /^\s*import\s+['"][^'"]*global\.css['"];?\r?\n/m;
    const updated = hasGlobalCss
      ? layout.match(globalCssImportPattern)
        ? layout.replace(
            globalCssImportPattern,
            `${renderGlobalCssImport(layoutPath, projectPath)}\n`
          )
        : `${renderGlobalCssImport(layoutPath, projectPath)}\n${layout}`
      : layout.replace(globalCssImportPattern, '');
    if (updated !== layout) {
      await writeFile(layoutPath, updated, 'utf8');
    }
    return;
  }

  const app = await readOptionalText(appPath);
  if (!app) {
    return;
  }

  const globalCssImportPattern = /^\s*import\s+['"][^'"]*global\.css['"];?\r?\n/m;
  if (hasGlobalCss) {
    if (!app.match(globalCssImportPattern)) {
      await writeFile(appPath, `import './global.css';\n${app}`, 'utf8');
    }
    return;
  }

  const updated = app.replace(globalCssImportPattern, '');
  if (updated !== app) {
    await writeFile(appPath, updated, 'utf8');
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
  routeForce: boolean,
  libraryAssets: GeneratedLibraryRouteAssets = {}
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];
  const homeScreen = path.join(projectPath, 'src', 'features', 'home', 'home-screen');
  const welcomeScreen = path.join(projectPath, 'src', 'features', 'onboarding', 'welcome-screen');
  const featuresScreen = path.join(projectPath, 'src', 'features', 'onboarding', 'features-screen');
  const completeScreen = path.join(projectPath, 'src', 'features', 'onboarding', 'complete-screen');
  const legalReviewScreen = path.join(
    projectPath,
    'src',
    'features',
    'onboarding',
    'legal-review-screen'
  );
  const legalPageRoute = path.join(projectPath, 'src', 'features', 'legal', 'legal-page-route');
  const legalUpdateScreen = path.join(
    projectPath,
    'src',
    'features',
    'legal',
    'legal-update-screen'
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
  const appDirectory = path.relative(projectPath, appDir).split(path.sep).join('/');
  const routeAssetOrFallback = (
    itemId: string,
    assets: ReadonlyMap<string, string> | undefined,
    destination: string,
    fallback: () => string
  ): string => (assets ? requireLibraryTextAsset(itemId, assets, destination) : fallback());

  const rootExpositionDir = path.join(appDir, 'exposition');
  const onboardingDir = path.join(appDir, 'onboarding');
  const legalDir = path.join(appDir, 'legal');
  await mkdir(rootExpositionDir, { recursive: true });
  await mkdir(onboardingDir, { recursive: true });
  await mkdir(legalDir, { recursive: true });

  results.push(
    ...(libraryAssets.onboarding
      ? [
          await writeIfAllowed(
            path.join(appDir, 'onboarding.tsx'),
            routeAssetOrFallback(
              'mds/onboarding',
              libraryAssets.onboarding,
              `${appDirectory}/onboarding.tsx`,
              () => renderRouteExport(appDir, welcomeScreen)
            ),
            routeForce
          ),
          await writeIfAllowed(
            path.join(onboardingDir, 'features.tsx'),
            routeAssetOrFallback(
              'mds/onboarding',
              libraryAssets.onboarding,
              `${appDirectory}/onboarding/features.tsx`,
              () => renderRouteExport(onboardingDir, featuresScreen)
            ),
            routeForce
          ),
          ...(libraryAssets.onboarding.has(`${appDirectory}/onboarding/complete.tsx`)
            ? [
                await writeIfAllowed(
                  path.join(onboardingDir, 'complete.tsx'),
                  routeAssetOrFallback(
                    'mds/onboarding',
                    libraryAssets.onboarding,
                    `${appDirectory}/onboarding/complete.tsx`,
                    () => renderRouteExport(onboardingDir, completeScreen)
                  ),
                  routeForce
                ),
              ]
            : []),
          ...(libraryAssets.onboarding.has(`${appDirectory}/onboarding/legal.tsx`)
            ? [
                await writeIfAllowed(
                  path.join(onboardingDir, 'legal.tsx'),
                  routeAssetOrFallback(
                    'mds/onboarding',
                    libraryAssets.onboarding,
                    `${appDirectory}/onboarding/legal.tsx`,
                    () => renderRouteExport(onboardingDir, legalReviewScreen)
                  ),
                  routeForce
                ),
              ]
            : []),
        ]
      : []),
    ...(libraryAssets.onboarding?.has(`${appDirectory}/terms.tsx`) ||
    libraryAssets.legal?.has(`${appDirectory}/terms.tsx`)
      ? [
          await writeIfAllowed(
            path.join(appDir, 'terms.tsx'),
            routeAssetOrFallback(
              'mds/legal-documents',
              libraryAssets.onboarding?.has(`${appDirectory}/terms.tsx`)
                ? libraryAssets.onboarding
                : libraryAssets.legal,
              `${appDirectory}/terms.tsx`,
              () => renderRouteExport(appDir, legalPageRoute)
            ),
            routeForce
          ),
        ]
      : []),
    ...(libraryAssets.onboarding?.has(`${appDirectory}/privacy.tsx`) ||
    libraryAssets.legal?.has(`${appDirectory}/privacy.tsx`)
      ? [
          await writeIfAllowed(
            path.join(appDir, 'privacy.tsx'),
            routeAssetOrFallback(
              'mds/legal-documents',
              libraryAssets.onboarding?.has(`${appDirectory}/privacy.tsx`)
                ? libraryAssets.onboarding
                : libraryAssets.legal,
              `${appDirectory}/privacy.tsx`,
              () => renderRouteExport(appDir, legalPageRoute)
            ),
            routeForce
          ),
        ]
      : []),
    ...(libraryAssets.legal?.has(`${appDirectory}/legal/updates.tsx`)
      ? [
          await writeIfAllowed(
            path.join(legalDir, 'updates.tsx'),
            routeAssetOrFallback(
              'mds/legal-documents',
              libraryAssets.legal,
              `${appDirectory}/legal/updates.tsx`,
              () => renderRouteExport(legalDir, legalUpdateScreen)
            ),
            routeForce
          ),
        ]
      : []),
    await writeIfAllowed(
      path.join(appDir, 'settings.tsx'),
      routeAssetOrFallback(
        'mds/settings',
        libraryAssets.settings,
        `${appDirectory}/settings.tsx`,
        () => renderRouteExport(appDir, settingsScreen)
      ),
      routeForce
    ),
    await writeIfAllowed(
      path.join(rootExpositionDir, 'stylist-sync+api.ts'),
      routeAssetOrFallback(
        'mds/stylist',
        libraryAssets.stylist,
        `${appDirectory}/exposition/stylist-sync+api.ts`,
        renderStylistSyncApiRoute
      ),
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
        routeAssetOrFallback(
          'mds/stylist',
          libraryAssets.stylist,
          `${appDirectory}/exposition/stylist.tsx`,
          () => renderRouteExport(rootExpositionDir, stylistScreen)
        ),
        routeForce
      ),
      await writeIfAllowed(
        path.join(rootExpositionDir, 'data.tsx'),
        renderRouteExport(rootExpositionDir, dataScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(rootExpositionDir, 'sdk-56.tsx'),
        routeAssetOrFallback(
          'mds/expo-sdk-56',
          libraryAssets.expoSdk56,
          `${appDirectory}/exposition/sdk-56.tsx`,
          () => renderRouteExport(rootExpositionDir, expoSdk56Screen)
        ),
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
        routeAssetOrFallback(
          'mds/stylist',
          libraryAssets.stylist,
          `${appDirectory}/(tabs)/stylist.tsx`,
          () => renderRouteExport(tabsDir, stylistScreen)
        ),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'data.tsx'),
        renderRouteExport(tabsDir, dataScreen),
        routeForce
      ),
      await writeIfAllowed(
        path.join(tabsDir, 'sdk-56.tsx'),
        routeAssetOrFallback(
          'mds/expo-sdk-56',
          libraryAssets.expoSdk56,
          `${appDirectory}/(tabs)/sdk-56.tsx`,
          () => renderRouteExport(tabsDir, expoSdk56Screen)
        ),
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
      routeAssetOrFallback(
        'mds/stylist',
        libraryAssets.stylist,
        `${appDirectory}/(drawer)/(tabs)/stylist.tsx`,
        () => renderRouteExport(drawerTabsDir, stylistScreen)
      ),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'data.tsx'),
      renderRouteExport(drawerTabsDir, dataScreen),
      routeForce
    ),
    await writeIfAllowed(
      path.join(drawerTabsDir, 'sdk-56.tsx'),
      routeAssetOrFallback(
        'mds/expo-sdk-56',
        libraryAssets.expoSdk56,
        `${appDirectory}/(drawer)/(tabs)/sdk-56.tsx`,
        () => renderRouteExport(drawerTabsDir, expoSdk56Screen)
      ),
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
    "import defaultThemeTokens from '../../theme/tokens';",
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
    '  const resolvedTheme = themeFromStyle ?? themeFromJson ?? defaultThemeTokens;',
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

async function writeLibraryAssetMap(
  projectPath: string,
  assets: ReadonlyMap<string, string>,
  force: boolean
): Promise<WriteResult[]> {
  return Promise.all(
    [...assets].map(([destination, contents]) =>
      writeIfAllowed(path.join(projectPath, ...destination.split('/')), contents, force)
    )
  );
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
  const legalAcceptanceAdapterImport = toRelativeImportPath(
    appDir,
    path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter')
  );
  const authProviderImport = toRelativeImportPath(
    appDir,
    path.join(projectPath, 'src', 'features', 'auth', 'auth-provider')
  );
  const legalGateEnabled =
    navigationShell.library === 'expo-router' && shouldGenerateLegalUpdateGate(answers);
  const authEnabled = navigationShell.library === 'expo-router' && shouldGenerateAuth(answers);
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
  const onboardingScreens = shouldGenerateOnboarding(answers)
    ? [
        '        <Stack.Screen name="onboarding" options={{ title: \'Onboarding\' }} />',
        '        <Stack.Screen name="onboarding/features" options={{ title: \'Features\' }} />',
        ...(answers.legalDocumentMode === 'onboarding-agreement'
          ? [
              '        <Stack.Screen name="onboarding/legal" options={{ title: \'Legal Documents\' }} />',
            ]
          : []),
        ...(answers.legalDocumentMode === 'onboarding-agreement'
          ? []
          : [
              '        <Stack.Screen name="onboarding/complete" options={{ title: \'Complete\' }} />',
            ]),
      ]
    : [];
  const legalScreens =
    answers.legalDocumentMode === 'public-routes' ||
    answers.legalDocumentMode === 'onboarding-agreement' ||
    legalGateEnabled
      ? [
          ...(legalGateEnabled
            ? [
                '        <Stack.Screen name="legal/updates" options={{ title: \'Legal Updates\' }} />',
              ]
            : []),
          '        <Stack.Screen name="terms" options={{ title: \'Terms Of Service\' }} />',
          '        <Stack.Screen name="privacy" options={{ title: \'Privacy Policy\' }} />',
        ]
      : [];
  const shellScreen =
    navigationShell.layout === 'tabs'
      ? '        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />'
      : navigationShell.layout === 'drawer + tabs'
        ? '        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />'
        : '        <Stack.Screen name="index" options={{ title: \'Home\' }} />';
  const appScreens = [shellScreen, ...expositionScreens, ...nativeWindUiScreen];
  const appGuardExpression = authEnabled
    ? legalGateEnabled
      ? 'auth.isAuthenticated && legalGateStatus === "complete"'
      : 'auth.isAuthenticated'
    : legalGateEnabled
      ? 'legalGateStatus === "complete"'
      : null;
  const publicAuthScreens = authEnabled
    ? [
        '        <Stack.Protected guard={!auth.isAuthenticated}>',
        '          <Stack.Screen name="(auth)/sign-in" options={{ title: \'Sign In\' }} />',
        '          <Stack.Screen name="(auth)/sign-up" options={{ title: \'Sign Up\' }} />',
        '          <Stack.Screen name="(auth)/reset-password" options={{ title: \'Reset Password\' }} />',
        '        </Stack.Protected>',
      ]
    : [];
  const protectedAppScreens = appGuardExpression
    ? [
        `        <Stack.Protected guard={${appGuardExpression}}>`,
        ...appScreens.map((screen) => screen.replace(/^ {8}/u, '          ')),
        "          <Stack.Screen name=\"settings\" options={{ presentation: 'modal', title: 'Settings' }} />",
        '        </Stack.Protected>',
      ]
    : [
        ...appScreens,
        "        <Stack.Screen name=\"settings\" options={{ presentation: 'modal', title: 'Settings' }} />",
      ];

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
    `import themeFontAssets from '${themeFontAssetsImport}';`,
    `import { AppThemeProvider, useAppTheme } from '${themeProviderImport}';`,
    ...(legalGateEnabled
      ? [`import { useLegalUpdateGateStatus } from '${legalAcceptanceAdapterImport}';`]
      : []),
    ...(authEnabled ? [`import { AuthProvider, useAuth } from '${authProviderImport}';`] : []),
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
    ...(authEnabled ? ['  const auth = useAuth();'] : []),
    ...(legalGateEnabled ? ['  const legalGateStatus = useLegalUpdateGateStatus();'] : []),
    ...(authEnabled ? ['', '  if (auth.isLoading) {', '    return null;', '  }'] : []),
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
    ...publicAuthScreens,
    ...onboardingScreens,
    ...legalScreens,
    ...protectedAppScreens,
    '            </Stack>',
    '          </RouterThemeBridge>',
    '        </SafeAreaProvider>',
    '      </KeyboardProvider>',
    '    </GestureHandlerRootView>',
    '  );',
    '}',
    '',
    'export default function Layout() {',
    '  const hasFontAssets = Object.keys(themeFontAssets).length > 0;',
    '  const [fontsLoaded, fontsError] = useFonts(themeFontAssets);',
    '',
    '  if (hasFontAssets && !fontsLoaded && !fontsError) {',
    '    return null;',
    '  }',
    '',
    '  return (',
    '    <AppThemeProvider>',
    ...(authEnabled
      ? ['      <AuthProvider>', '        <LayoutInner />', '      </AuthProvider>']
      : ['      <LayoutInner />']),
    '    </AppThemeProvider>',
    '  );',
    '}',
    '',
  ].join('\n');
}

function renderSupabaseClient(): string {
  return [
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    "import { AppState } from 'react-native';",
    "import { createClient } from '@supabase/supabase-js';",
    '',
    'const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;',
    'const supabasePublishableKey =',
    '  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??',
    '  process.env.EXPO_PUBLIC_SUPABASE_KEY ??',
    '  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;',
    'const isServerRender = typeof window === "undefined";',
    'const supabaseStorage = {',
    '  getItem: (key: string) => (isServerRender ? Promise.resolve(null) : AsyncStorage.getItem(key)),',
    '  setItem: (key: string, value: string) =>',
    '    isServerRender ? Promise.resolve() : AsyncStorage.setItem(key, value),',
    '  removeItem: (key: string) =>',
    '    isServerRender ? Promise.resolve() : AsyncStorage.removeItem(key),',
    '};',
    'export const supabase = supabaseUrl && supabasePublishableKey',
    '  ? createClient(supabaseUrl, supabasePublishableKey, {',
    '      auth: {',
    '        storage: supabaseStorage,',
    '        autoRefreshToken: !isServerRender,',
    '        persistSession: !isServerRender,',
    '        detectSessionInUrl: false,',
    '      },',
    '    })',
    '  : null;',
    '',
    'if (supabase) {',
    "  AppState.addEventListener('change', (state) => {",
    "    if (state === 'active') {",
    '      supabase.auth.startAutoRefresh();',
    '    } else {',
    '      supabase.auth.stopAutoRefresh();',
    '    }',
    '  });',
    '}',
    '',
    'export function getSupabaseClient(): NonNullable<typeof supabase> {',
    '  if (!supabase) {',
    "    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using Supabase. EXPO_PUBLIC_SUPABASE_KEY and EXPO_PUBLIC_SUPABASE_ANON_KEY are accepted as fallbacks for older projects.');",
    '  }',
    '  return supabase;',
    '}',
    '',
    'export function assertSupabaseConfigured(): void {',
    '  void getSupabaseClient();',
    '}',
    '',
  ].join('\n');
}

function renderSupabaseDemoDataService(): string {
  return [
    "import { getSupabaseClient } from './supabase';",
    '',
    'export interface GuestbookComment {',
    '  id: number;',
    '  displayName: string;',
    '  message: string;',
    '  createdAt: string;',
    '}',
    '',
    'export interface SupabaseDataOverview {',
    '  signupCount: number;',
    '  guestbook: GuestbookComment[];',
    '  isSignedIn: boolean;',
    '}',
    '',
    'export interface GuestbookInput {',
    '  displayName: string;',
    '  message: string;',
    '}',
    '',
    'function isRecord(value: unknown): value is Record<string, unknown> {',
    "  return typeof value === 'object' && value !== null;",
    '}',
    '',
    'function normalizeGuestbookRow(row: unknown): GuestbookComment | null {',
    '  if (!isRecord(row)) {',
    '    return null;',
    '  }',
    '',
    '  const id = Number(row.id);',
    '  const displayName = row.display_name;',
    '  const message = row.message;',
    '  const createdAt = row.created_at;',
    '  if (',
    '    !Number.isFinite(id) ||',
    "    typeof displayName !== 'string' ||",
    "    typeof message !== 'string' ||",
    "    typeof createdAt !== 'string'",
    '  ) {',
    '    return null;',
    '  }',
    '',
    '  return {',
    '    id,',
    '    displayName,',
    '    message,',
    '    createdAt,',
    '  };',
    '}',
    '',
    'function normalizeGuestbookRows(data: unknown): GuestbookComment[] {',
    '  if (!Array.isArray(data)) {',
    '    return [];',
    '  }',
    '',
    '  return data',
    '    .map((row) => normalizeGuestbookRow(row))',
    '    .filter((row): row is GuestbookComment => Boolean(row));',
    '}',
    '',
    'function toErrorMessage(error: unknown): string {',
    '  if (error instanceof Error) {',
    '    return error.message;',
    '  }',
    "  return 'Unable to load Supabase demo data.';",
    '}',
    '',
    'export async function getSupabaseDataOverview(): Promise<SupabaseDataOverview> {',
    '  const client = getSupabaseClient();',
    '  const [sessionResult, signupCountResult, guestbookResult] = await Promise.all([',
    '    client.auth.getSession(),',
    "    client.rpc('mds_demo_signup_count'),",
    "    client.rpc('mds_guestbook_recent', { limit_count: 10 }),",
    '  ]);',
    '',
    '  if (sessionResult.error) {',
    '    throw new Error(sessionResult.error.message);',
    '  }',
    '  if (signupCountResult.error) {',
    '    throw new Error(signupCountResult.error.message);',
    '  }',
    '  if (guestbookResult.error) {',
    '    throw new Error(guestbookResult.error.message);',
    '  }',
    '',
    '  const signupCount = Number(signupCountResult.data ?? 0);',
    '',
    '  return {',
    '    signupCount: Number.isFinite(signupCount) ? signupCount : 0,',
    '    guestbook: normalizeGuestbookRows(guestbookResult.data),',
    '    isSignedIn: Boolean(sessionResult.data.session),',
    '  };',
    '}',
    '',
    'export async function signGuestbook(input: GuestbookInput): Promise<GuestbookComment> {',
    '  const displayName = input.displayName.trim();',
    '  const message = input.message.trim();',
    '',
    '  if (!displayName) {',
    "    throw new Error('Enter your name before signing the guestbook.');",
    '  }',
    '  if (!message) {',
    "    throw new Error('Enter a message before signing the guestbook.');",
    '  }',
    '  if (displayName.length > 80) {',
    "    throw new Error('Keep your name to 80 characters or fewer.');",
    '  }',
    '  if (message.length > 280) {',
    "    throw new Error('Keep your message to 280 characters or fewer.');",
    '  }',
    '',
    '  const client = getSupabaseClient();',
    '  const sessionResult = await client.auth.getSession();',
    '  if (sessionResult.error) {',
    '    throw new Error(sessionResult.error.message);',
    '  }',
    '  if (!sessionResult.data.session) {',
    "    throw new Error('Sign in with Supabase Auth before signing the guestbook.');",
    '  }',
    '',
    "  const { data, error } = await client.rpc('mds_guestbook_sign', {",
    '    comment_display_name: displayName,',
    '    comment_message: message,',
    '  });',
    '',
    '  if (error) {',
    '    throw new Error(error.message);',
    '  }',
    '',
    '  const [comment] = normalizeGuestbookRows(data);',
    '  if (!comment) {',
    "    throw new Error('The guestbook entry was saved but could not be loaded.');",
    '  }',
    '',
    '  return comment;',
    '}',
    '',
    'export function getSupabaseDemoErrorMessage(error: unknown): string {',
    '  return toErrorMessage(error);',
    '}',
    '',
  ].join('\n');
}

function renderSupabaseDataExpositionMigration(): string {
  return [
    'create table if not exists public.mds_demo_auth_signups (',
    '  user_id uuid primary key references auth.users(id) on delete cascade,',
    '  signed_up_at timestamptz not null default now()',
    ');',
    '',
    'alter table public.mds_demo_auth_signups enable row level security;',
    'revoke all on public.mds_demo_auth_signups from anon, authenticated;',
    '',
    'insert into public.mds_demo_auth_signups (user_id, signed_up_at)',
    'select id, coalesce(created_at, now())',
    'from auth.users',
    'on conflict (user_id) do nothing;',
    '',
    'create or replace function public.mds_demo_track_auth_signup()',
    'returns trigger',
    'language plpgsql',
    'security definer',
    'set search_path = public, auth',
    'as $$',
    'begin',
    '  insert into public.mds_demo_auth_signups (user_id, signed_up_at)',
    '  values (new.id, coalesce(new.created_at, now()))',
    '  on conflict (user_id) do nothing;',
    '  return new;',
    'end;',
    '$$;',
    '',
    'drop trigger if exists mds_demo_track_auth_signup on auth.users;',
    'create trigger mds_demo_track_auth_signup',
    'after insert on auth.users',
    'for each row',
    'execute function public.mds_demo_track_auth_signup();',
    '',
    'create table if not exists public.mds_demo_guestbook_comments (',
    '  id bigint generated always as identity primary key,',
    '  user_id uuid not null references auth.users(id) on delete cascade,',
    '  display_name text not null,',
    '  message text not null,',
    '  created_at timestamptz not null default now(),',
    '  constraint mds_demo_guestbook_display_name_length',
    '    check (char_length(btrim(display_name)) between 1 and 80),',
    '  constraint mds_demo_guestbook_message_length',
    '    check (char_length(btrim(message)) between 1 and 280)',
    ');',
    '',
    'alter table public.mds_demo_guestbook_comments enable row level security;',
    'revoke all on public.mds_demo_guestbook_comments from anon, authenticated;',
    '',
    'drop policy if exists "Anyone can read guestbook comments" on public.mds_demo_guestbook_comments;',
    'create policy "Anyone can read guestbook comments"',
    'on public.mds_demo_guestbook_comments',
    'for select',
    'to anon, authenticated',
    'using (true);',
    '',
    'drop policy if exists "Signed-in users can sign the guestbook" on public.mds_demo_guestbook_comments;',
    'create policy "Signed-in users can sign the guestbook"',
    'on public.mds_demo_guestbook_comments',
    'for insert',
    'to authenticated',
    'with check (auth.uid() = user_id);',
    '',
    'create or replace function public.mds_demo_signup_count()',
    'returns integer',
    'language sql',
    'stable',
    'security definer',
    'set search_path = public',
    'as $$',
    '  select count(*)::integer from public.mds_demo_auth_signups;',
    '$$;',
    '',
    'create or replace function public.mds_guestbook_recent(limit_count integer default 10)',
    'returns table (',
    '  id bigint,',
    '  display_name text,',
    '  message text,',
    '  created_at timestamptz',
    ')',
    'language sql',
    'stable',
    'security definer',
    'set search_path = public',
    'as $$',
    '  select',
    '    comments.id,',
    '    comments.display_name,',
    '    comments.message,',
    '    comments.created_at',
    '  from public.mds_demo_guestbook_comments as comments',
    '  order by comments.created_at desc, comments.id desc',
    '  limit greatest(1, least(coalesce(limit_count, 10), 50));',
    '$$;',
    '',
    'create or replace function public.mds_guestbook_sign(',
    '  comment_display_name text,',
    '  comment_message text',
    ')',
    'returns table (',
    '  id bigint,',
    '  display_name text,',
    '  message text,',
    '  created_at timestamptz',
    ')',
    'language plpgsql',
    'security definer',
    'set search_path = public',
    'as $$',
    'declare',
    '  current_user_id uuid := auth.uid();',
    "  trimmed_display_name text := nullif(btrim(comment_display_name), '');",
    "  trimmed_message text := nullif(btrim(comment_message), '');",
    '  inserted_id bigint;',
    'begin',
    '  if current_user_id is null then',
    "    raise exception 'Sign in before signing the guestbook.' using errcode = '28000';",
    '  end if;',
    '',
    '  if trimmed_display_name is null or char_length(trimmed_display_name) > 80 then',
    "    raise exception 'Display name must be 1 to 80 characters.' using errcode = '22023';",
    '  end if;',
    '',
    '  if trimmed_message is null or char_length(trimmed_message) > 280 then',
    "    raise exception 'Message must be 1 to 280 characters.' using errcode = '22023';",
    '  end if;',
    '',
    '  insert into public.mds_demo_guestbook_comments (user_id, display_name, message)',
    '  values (current_user_id, trimmed_display_name, trimmed_message)',
    '  returning public.mds_demo_guestbook_comments.id into inserted_id;',
    '',
    '  return query',
    '  select',
    '    comments.id,',
    '    comments.display_name,',
    '    comments.message,',
    '    comments.created_at',
    '  from public.mds_demo_guestbook_comments as comments',
    '  where comments.id = inserted_id;',
    'end;',
    '$$;',
    '',
    'grant execute on function public.mds_demo_signup_count() to anon, authenticated;',
    'grant execute on function public.mds_guestbook_recent(integer) to anon, authenticated;',
    'grant execute on function public.mds_guestbook_sign(text, text) to authenticated;',
    'revoke execute on function public.mds_guestbook_sign(text, text) from anon;',
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
    ...(answers.dataStart === 'supabase' || answers.authProvider === 'supabase'
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
    '- Confirm GitHub Actions is enabled for the repo and that the generated workflow is allowed to run.',
    '- In GitHub branch protection, require pull requests and status checks for `test` and `main`.',
    '- Require the generated `MDS PR Checks` workflow before merge.',
    '- If the agent has GitHub access with enough permissions, let it apply these repo settings for you; otherwise do this one-time setup in the GitHub UI.',
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
  const onboardingLinks = shouldGenerateOnboarding(answers)
    ? [
        '        <Link href="/onboarding" asChild>',
        '          <Pressable style={StyleSheet.flatten([styles.primaryCard, { backgroundColor: colors.primary, borderRadius: theme.layout.radius }])}>',
        '            <Text style={styles.primaryTitle}>Onboarding</Text>',
        '            <Text style={styles.primaryBody}>Open the generated onboarding flow before the main product flow replaces it.</Text>',
        '          </Pressable>',
        '        </Link>',
      ]
    : [];
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
    'const expositionLinks: { href: Href; title: string; body: string }[] = [',
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
    ...onboardingLinks,
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
    "import defaultThemeTokens from '../../theme/tokens';",
    '',
    'type StylistTheme = typeof defaultThemeTokens;',
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
    "const spacingKeys: (keyof StylistTheme['layout']['spacing'])[] = ['xs', 'sm', 'md', 'lg', 'xl'];",
    "const NATIVE_SAVE_COMMAND = 'npm run stylist:sync:android';",
    '',
    'export default function StylistScreen() {',
    '  const [theme, setTheme] = useState<StylistTheme>(defaultThemeTokens);',
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
    "import { useCallback, useEffect, useState } from 'react';",
    "import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
    '',
    "import { ExpositionNotice } from '../../components/exposition';",
    "import { getSupabaseDataOverview, getSupabaseDemoErrorMessage, signGuestbook, type SupabaseDataOverview } from '../../services/supabase-demo-data';",
    "import { useAppTheme } from '../../theme/provider';",
    '',
    'function formatCommentDate(value: string): string {',
    '  const date = new Date(value);',
    '  if (Number.isNaN(date.getTime())) {',
    '    return value;',
    '  }',
    '',
    "  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });",
    '}',
    '',
    'export default function DataScreen() {',
    '  const theme = useAppTheme();',
    '  const colors = theme.activeColors;',
    '  const [overview, setOverview] = useState<SupabaseDataOverview | null>(null);',
    '  const [isLoading, setIsLoading] = useState(true);',
    '  const [isSubmitting, setIsSubmitting] = useState(false);',
    "  const [displayName, setDisplayName] = useState('');",
    "  const [message, setMessage] = useState('');",
    '  const [errorMessage, setErrorMessage] = useState<string | null>(null);',
    '  const [successMessage, setSuccessMessage] = useState<string | null>(null);',
    '',
    '  const loadOverview = useCallback(async () => {',
    '    setIsLoading(true);',
    '    setErrorMessage(null);',
    '    try {',
    '      setOverview(await getSupabaseDataOverview());',
    '    } catch (error) {',
    '      setErrorMessage(getSupabaseDemoErrorMessage(error));',
    '    } finally {',
    '      setIsLoading(false);',
    '    }',
    '  }, []);',
    '',
    '  useEffect(() => {',
    '    const timer = setTimeout(() => {',
    '      void loadOverview();',
    '    }, 0);',
    '    return () => clearTimeout(timer);',
    '  }, [loadOverview]);',
    '',
    '  async function submitGuestbook() {',
    '    setErrorMessage(null);',
    '    setSuccessMessage(null);',
    '    setIsSubmitting(true);',
    '    try {',
    '      await signGuestbook({ displayName, message });',
    "      setMessage('');",
    "      setSuccessMessage('Guestbook signed. Thanks for testing the live data path.');",
    '      setOverview(await getSupabaseDataOverview());',
    '    } catch (error) {',
    '      setErrorMessage(getSupabaseDemoErrorMessage(error));',
    '    } finally {',
    '      setIsSubmitting(false);',
    '    }',
    '  }',
    '',
    '  const guestbook = overview?.guestbook ?? [];',
    '  const submitDisabled =',
    '    !overview?.isSignedIn || !displayName.trim() || !message.trim() || isSubmitting;',
    '',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>',
    `      <Text style={[styles.title, { color: colors.text, fontFamily: theme.typography.fontFamily, fontWeight: theme.typography.fontFamily === "System" || theme.typography.fontFamily === "monospace" ? "800" : "normal" }]}>Data Exposition</Text>`,
    `      <Text style={[styles.intro, { color: colors.text }]}>${answers.appName} is set to start with Supabase. This page reads and writes through the service adapter so screens stay independent from backend details.</Text>`,
    '      <ExpositionNotice />',
    '      <View style={styles.statGrid}>',
    '        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '          <Text style={[styles.sectionTitle, { color: colors.text }]}>Users signed up</Text>',
    '          <Text style={[styles.statValue, { color: colors.primary }]}>',
    "            {isLoading ? '...' : overview?.signupCount ?? 0}",
    '          </Text>',
    '          <Text style={[styles.body, { color: colors.text }]}>Tracked from Supabase Auth through a server-side trigger.</Text>',
    '        </View>',
    '        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '          <Text style={[styles.sectionTitle, { color: colors.text }]}>Session</Text>',
    '          <Text style={[styles.statValue, { color: colors.primary }]}>',
    "            {overview?.isSignedIn ? 'Signed in' : 'Read only'}",
    '          </Text>',
    '          <Text style={[styles.body, { color: colors.text }]}>Guestbook writes require Supabase Auth.</Text>',
    '        </View>',
    '      </View>',
    '      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}',
    '      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}',
    '      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '        <View style={styles.panelHeader}>',
    '          <Text style={[styles.sectionTitle, { color: colors.text }]}>Guestbook</Text>',
    '          <Pressable onPress={loadOverview} style={[styles.secondaryButton, { borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Refresh</Text>',
    '          </Pressable>',
    '        </View>',
    '        {isLoading ? <ActivityIndicator color={colors.primary} /> : null}',
    '        {!isLoading && guestbook.length === 0 ? <Text style={[styles.body, { color: colors.text }]}>No comments yet.</Text> : null}',
    '        {guestbook.map((comment) => (',
    '          <View key={comment.id} style={styles.guestbookRow}>',
    '            <Text style={[styles.taskTitle, { color: colors.text }]}>{comment.displayName}</Text>',
    '            <Text style={[styles.body, { color: colors.text }]}>{comment.message}</Text>',
    '            <Text style={styles.commentMeta}>{formatCommentDate(comment.createdAt)}</Text>',
    '          </View>',
    '        ))}',
    '      </View>',
    '      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: theme.layout.radius }]}>',
    '        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sign the guestbook</Text>',
    '        {!overview?.isSignedIn ? (',
    '          <Text style={[styles.body, { color: colors.text }]}>Sign in with Supabase Auth to add your name and message.</Text>',
    '        ) : (',
    '          <>',
    '            <TextInput',
    '              autoCapitalize="words"',
    '              maxLength={80}',
    '              onChangeText={setDisplayName}',
    '              placeholder="Name"',
    '              placeholderTextColor="#6b7280"',
    '              style={[styles.input, { borderColor: colors.primary }]}',
    '              value={displayName}',
    '            />',
    '            <TextInput',
    '              maxLength={280}',
    '              multiline',
    '              onChangeText={setMessage}',
    '              placeholder="Message"',
    '              placeholderTextColor="#6b7280"',
    '              style={[styles.input, styles.messageInput, { borderColor: colors.primary }]}',
    '              value={message}',
    '            />',
    '            <Pressable',
    '              disabled={submitDisabled}',
    '              onPress={submitGuestbook}',
    '              style={[',
    '                styles.button,',
    '                { backgroundColor: colors.primary, borderRadius: theme.layout.radius },',
    '                submitDisabled ? styles.buttonDisabled : null,',
    '              ]}>',
    '              <Text style={styles.buttonText}>{isSubmitting ? "Signing..." : "Sign guestbook"}</Text>',
    '            </Pressable>',
    '          </>',
    '        )}',
    '      </View>',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Supabase environments and branches</Text>',
    '        <Text style={styles.body}>Supabase branches are separate environments with their own API credentials. Use preview branches for focused pull-request testing and persistent branches for staging, QA, or development.</Text>',
    '      </View>',
    '      <View style={styles.guidance}>',
    '        <Text style={styles.sectionTitle}>Client setup</Text>',
    '        <Text style={styles.body}>Use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY for client access. Never put service-role or secret keys in Expo client code.</Text>',
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
    '  statGrid: {',
    '    gap: 12,',
    '  },',
    '  statCard: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 16,',
    '  },',
    '  statValue: {',
    "    color: '#111827',",
    '    fontSize: 34,',
    '    fontWeight: "900",',
    '  },',
    '  panel: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    gap: 12,',
    '    padding: 16,',
    '  },',
    '  panelHeader: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    justifyContent: "space-between",',
    '    gap: 12,',
    '  },',
    '  secondaryButton: {',
    '    borderWidth: 1,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 8,',
    '  },',
    '  secondaryButtonText: {',
    '    fontSize: 13,',
    '    fontWeight: "800",',
    '  },',
    '  guestbookRow: {',
    "    borderTopColor: '#e5e7eb',",
    '    borderTopWidth: 1,',
    '    gap: 4,',
    '    paddingTop: 12,',
    '  },',
    '  commentMeta: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '    fontWeight: "800",',
    '    textTransform: "uppercase",',
    '  },',
    '  input: {',
    "    backgroundColor: '#ffffff',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    "    color: '#111827',",
    '    fontSize: 15,',
    '    paddingHorizontal: 12,',
    '    paddingVertical: 10,',
    '  },',
    '  messageInput: {',
    '    minHeight: 96,',
    '    textAlignVertical: "top",',
    '  },',
    '  buttonDisabled: {',
    '    opacity: 0.5,',
    '  },',
    '  errorText: {',
    "    color: '#b91c1c',",
    '    fontSize: 14,',
    '    fontWeight: "800",',
    '  },',
    '  successText: {',
    "    color: '#047857',",
    '    fontSize: 14,',
    '    fontWeight: "800",',
    '  },',
    '});',
    '',
  ];
}
