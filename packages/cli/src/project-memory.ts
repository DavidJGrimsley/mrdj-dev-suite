import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STYLIST_THEME, renderGlobalCssThemeBlock, renderThemeTokensFile } from './stylist-theme.js';

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

const SOFTWARE_MANSION_CORE_DEPENDENCIES = {
  'react-native-gesture-handler': '~2.30.0',
  'react-native-reanimated': '4.2.1',
  'react-native-screens': '~4.23.0',
  'react-native-svg': '15.15.3',
  'react-native-keyboard-controller': '1.20.7',
  'react-native-worklets': '0.7.4',
} as const;

const LOCAL_DATA_DEPENDENCIES = {
  'expo-sqlite': '~55.0.15',
} as const;

const SUPABASE_DEPENDENCIES = {
  '@react-native-async-storage/async-storage': '2.2.0',
  '@supabase/supabase-js': '^2.105.4',
} as const;

const UNIWIND_DEPENDENCIES = {
  uniwind: '^1.6.4',
} as const;

const STYLIST_DEPENDENCIES = {
  'reanimated-color-picker': '^4.2.0',
} as const;

const EXPOSITION_NOTICE =
  'These exposition pages are temporary developer and client-research scaffolds. Use them to evaluate styling, base packages, and data direction, then delete or prune them before production once the app direction is settled.';

const UNIWIND_DEV_DEPENDENCIES = {
  tailwindcss: '^4.2.4',
} as const;

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MDS_NPX_COMMAND = 'npx -y -p @mr.dj2u/cli@latest mds';
const DEFAULT_GUIDELINES_TEMPLATE_PATH = path.join(
  PACKAGE_ROOT,
  'templates',
  'project',
  'guidelines.md'
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
      await writeIfAllowed(path.join(projectDir, 'intake-agent.md'), renderIntakeAgentHandoff(answers), force)
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

  await mkdir(path.join(projectPath, 'src', 'features', 'home'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'features', 'onboarding'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'features', 'settings'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'features', 'exposition'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'components', 'exposition'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'data'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'services'), { recursive: true });
  await mkdir(path.join(projectPath, 'src', 'theme'), { recursive: true });

  results.push(
    await writeIfAllowed(
      path.join(projectPath, 'project', 'theme.json'),
      `${JSON.stringify(DEFAULT_STYLIST_THEME, null, 2)}\n`,
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'theme', 'tokens.ts'),
      renderThemeTokensFile(DEFAULT_STYLIST_THEME),
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
      renderHomeScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
      renderOnboardingScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'),
      renderSettingsScreen(),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
      renderExpositionScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
      renderStylistScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
      renderDataScreen(answers),
      force
    )
  );

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
    const routeForce = force || !answers.includeCreateExpoComponents;
    const shouldWriteRootLayout = routeForce && (await canWriteRichRootLayout(path.join(appDir, '_layout.tsx')));
    results.push(
      await writeIfAllowed(
        path.join(appDir, 'index.tsx'),
        renderRouteExport(appDir, path.join(projectPath, 'src', 'features', 'home', 'home-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(appDir, 'onboarding.tsx'),
        renderRouteExport(appDir, path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(appDir, 'settings.tsx'),
        renderRouteExport(appDir, path.join(projectPath, 'src', 'features', 'settings', 'settings-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(expositionRouteDir, 'index.tsx'),
        renderRouteExport(expositionRouteDir, path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(expositionRouteDir, 'stylist.tsx'),
        renderRouteExport(expositionRouteDir, path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(expositionRouteDir, 'data.tsx'),
        renderRouteExport(expositionRouteDir, path.join(projectPath, 'src', 'features', 'exposition', 'data-screen')),
        routeForce
      ),
      await writeIfAllowed(
        path.join(expositionRouteDir, 'stylist-sync+api.ts'),
        renderStylistSyncApiRoute(),
        routeForce
      )
    );

    if (shouldWriteRootLayout) {
      results.push(
        await writeIfAllowed(
          path.join(appDir, '_layout.tsx'),
          renderRichRootLayout(projectPath, appDir),
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
      await writeIfAllowed(path.join(projectPath, 'src', 'services', 'supabase.ts'), renderSupabaseClient(), force)
    );
  }

  if (answers.testToMainSafeguards) {
    await mkdir(path.join(projectPath, '.github', 'workflows'), { recursive: true });
    results.push(
      await writeIfAllowed(
        path.join(projectPath, '.github', 'workflows', 'mds-pr-checks.yml'),
        renderGitHubPrChecksWorkflow(),
        force
      ),
      await writeIfAllowed(path.join(projectPath, 'project', 'release-flow.md'), renderReleaseFlow(answers), force)
    );
  }

  if (options.manageUniwind) {
    results.push(await writeIfAllowed(path.join(projectPath, 'global.css'), renderGlobalCss(), force));
  }

  await ensurePackageJson(projectPath, answers, options.manageUniwind);
  if (options.manageUniwind) {
    await ensureUniwindGlobalCss(projectPath);
    await ensureUniwindMetroConfig(projectPath);
    await removeNativeWindArtifacts(projectPath);
  }
  await ensureGlobalCssImport(projectPath, answers.appDirectory);

  return results;
}

export function renderInfo(projectPath: string, answers: OnboardAnswers, existingInfo?: string | null): string {
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
    `- **App:** ${answers.appName} — ${answers.audience}`,
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
    '- [ ] Resolve every `# TodoForContext(optional):` marker by filling the section underneath or deleting the marker line to acknowledge no extra context is needed. (There may be none of these if the agent was thorough in onboarding, but if there are any, they should be resolved before development starts.)',
    '',
    '- [x] Confirm app purpose, audience, and primary flows in `project/info.md`.',
    '- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.',
    '- [ ] Keep or prune included package examples after reviewing `/exposition`.',
    '- [ ] Remove exposition pages before production once their lessons are absorbed.',
    ...(needsReview
      ? ['- [ ] Replace generic onboarding placeholders with real app decisions before full implementation.']
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
    ...(answers.usesExpoNativeTabs ? ['- [ ] Prototype Expo Native Tabs for mobile navigation.'] : []),
    ...(answers.easUses.length > 0 ? answers.easUses.map((item) => `- [ ] Configure EAS for ${item}.`) : []),
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
    ...(answers.webOutput !== 'none' ? [`- [ ] Confirm Expo web output mode: ${answers.webOutput}.`] : []),
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
    '',
    '## Workflow',
    '',
    '- If the user says `mds continue` or `MDS Continue`, first run the MDS Continue command from the app root and use its session brief to propose a plan. Do not jump straight into intake or file edits.',
    '- Run `mds doctor --ci` before pushing.',
    '- Use `mds clear-expo-start` when Metro or server ports get wedged.',
    ...(answers.testToMainSafeguards
      ? ['- Develop through feature branches into `test`, then promote validated work from `test` to `main`.']
      : []),
    `- Latest Expo SDK preference captured during onboarding: ${formatBoolean(answers.useLatestExpoSdk)}.`,
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
    'Never fall back to a non-default port — always free the default port first.',
    '',
  ];

  const backendAlongside = answers.customBackend
    ? [
        '## Also start the backend API server',
        '',
        `Run \`node ${answers.customBackendEntry}\` from the project root in a background process alongside Expo.`,
        'Both must be running for full local functionality — Expo on port 8081, backend on its own port.',
        '',
      ]
    : [];

  const spinUpProd = buildSpinUpProdSection(answers);

  return [
    `# ${answers.appName} — Agent Guidelines`,
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
      'Run `npm run serve:prod:fresh` — kills port 3000, builds web dist, starts the Node server.',
      'Run `npm run serve:prod` to restart without rebuilding.',
      'Server runs on http://localhost:3000. Mirrors your self-hosted (Plesk/VPS) environment.',
      '',
    ];
  }

  if (answers.expoServerAdapter === 'eas') {
    return [
      '## Spin up prod',
      '',
      'Run `npm run serve:prod:fresh` — builds web dist and starts `npx expo serve`.',
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
    'mds:doctor:ci':
      packageJson.scripts?.['mds:doctor:ci'] ?? `${MDS_NPX_COMMAND} doctor --ci`,
    'mds:stylist:sync':
      packageJson.scripts?.['mds:stylist:sync'] ?? `${MDS_NPX_COMMAND} stylist sync .`,
    'mds:stylist:reconcile-output':
      packageJson.scripts?.['mds:stylist:reconcile-output'] ??
      `${MDS_NPX_COMMAND} stylist reconcile-output .`,
    'free-port': packageJson.scripts?.['free-port'] ?? `${MDS_NPX_COMMAND} free-port`,
    'clear-expo-start':
      packageJson.scripts?.['clear-expo-start'] ?? `${MDS_NPX_COMMAND} clear-expo-start`,
    'expo-install-fix':
      packageJson.scripts?.['expo-install-fix'] ?? 'npx expo install --fix',
    'expo-doctor': packageJson.scripts?.['expo-doctor'] ?? 'npx expo-doctor',
    'post-create-check':
      packageJson.scripts?.['post-create-check'] ?? 'npx expo install --fix && npx expo-doctor',
    'ci:verify': packageJson.scripts?.['ci:verify'] ?? `${MDS_NPX_COMMAND} doctor --ci`,
  };

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
    case 'eas': return 'EAS hosting';
    case 'express': return 'Express adapter (node server.js, port 3000)';
    case 'bun': return 'Bun adapter (node server.js)';
    case 'other': return 'custom (not yet specified)';
    default: return formatServerChoice(answers.deployedServer);
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

  return [answers.audience, answers.coreFlows, answers.dataNeeds, answers.deploymentTarget].some((value) =>
    genericValues.has(value.trim())
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
  if (!existing || existing.includes("@import 'uniwind'") || existing.includes('@import "uniwind"')) {
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
    .replace(/^\s*plugins:\s*\[\s*require\.resolve\(['"]prettier-plugin-tailwindcss['"]\)\s*\],?\r?\n/m, '')
    .replace(/^\s*tailwindAttributes:\s*\[[^\n]*\],?\r?\n/m, '')
    .replace(/^\s*tailwindFunctions:\s*\[[^\n]*\],?\r?\n/m, '')
    .replace(/\n{3,}/g, '\n\n');

  if (updated !== existing) {
    await writeFile(filePath, updated, 'utf8');
  }
}

async function ensureGlobalCssImport(projectPath: string, appDirectory: AppDirectory): Promise<void> {
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
  return appDirectory === 'src' ? path.join(projectPath, 'src', 'app') : path.join(projectPath, 'app');
}

function renderRouteExport(routeDir: string, targetModulePath: string): string {
  return `export { default } from '${toRelativeImportPath(routeDir, targetModulePath)}';\n`;
}

function renderStylistSyncApiRoute(): string {
  return [
    "import { spawn } from 'node:child_process';",
    "import { readFile } from 'node:fs/promises';",
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
    '  const resolvedTheme = themeFromJson ?? themeFromStyle ?? stylistThemeTokens;',
    "  const themeSource = themeFromJson ? 'theme.json' : themeFromStyle ? 'style.md' : 'default';",
    '  const mismatchDetected =',
    '    Boolean(themeFromJson) &&',
    '    Boolean(themeFromStyle) &&',
    '    JSON.stringify(themeFromJson) !== JSON.stringify(themeFromStyle);',
    '  try {',
    "    const raw = await readFile(configPath, 'utf8');",
    "    const parsed = JSON.parse(raw) as { writePolicy?: string; styleLibrary?: string };",
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
    '  return { theme: value };',
    '}',
    '',
    'async function runStylistSync(',
    '  inputJson: string,',
    "  metadata?: StylistSyncRequestBody['metadata']",
    '): Promise<SyncResponse> {',
    "  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';",
    "  const args = ['-y', '-p', '@mr.dj2u/cli@latest', 'mds', 'stylist', 'sync', '.', '--input-json', inputJson, '--json'];",
    "  if (metadata?.writePolicy) args.push('--write-policy', metadata.writePolicy);",
    "  if (metadata?.styleLibrary) args.push('--style-library', metadata.styleLibrary);",
    '',
    '  return await new Promise<SyncResponse>((resolve, reject) => {',
    '    const child = spawn(command, args, {',
    '      cwd: process.cwd(),',
    '      stdio: [\'ignore\', \'pipe\', \'pipe\'],',
    '      windowsHide: true,',
    '    });',
    '',
    "    let stdout = '';",
    "    let stderr = '';",
    "    child.stdout.on('data', (chunk) => {",
    "      stdout += String(chunk);",
    '    });',
    "    child.stderr.on('data', (chunk) => {",
    "      stderr += String(chunk);",
    '    });',
    '',
    "    child.on('error', (error) => {",
    '      reject(error);',
    '    });',
    '',
    "    child.on('close', (code) => {",
    '      if (code !== 0) {',
    "        reject(new Error(stderr.trim() || `Stylist sync failed with exit code ${code ?? 'unknown'}.`));",
    '        return;',
    '      }',
    '',
    '      try {',
    '        resolve(JSON.parse(stdout) as SyncResponse);',
    '      } catch (error) {',
    "        reject(new Error(`Failed to parse stylist sync output: ${error instanceof Error ? error.message : String(error)}`));",
    '      }',
    '    });',
    '  });',
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

function hasNonCanonicalContent(existing: string | null | undefined, headings: readonly string[]): boolean {
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
    '',
    'async function getDb() {',
    '  return dbPromise;',
    '}',
    '',
    'export async function ensureLocalDataReady(): Promise<void> {',
    '  const db = await getDb();',
    '  await db.execAsync(`',
    '    CREATE TABLE IF NOT EXISTS exposition_tasks (',
    '      id TEXT PRIMARY KEY NOT NULL,',
    '      title TEXT NOT NULL,',
    '      status TEXT NOT NULL',
    '    );',
    '  `);',
    "  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exposition_tasks');",
    '  if ((row?.count ?? 0) > 0) {',
    '    return;',
    '  }',
    '',
    '  for (const task of appSnapshot.tasks) {',
    '    await db.runAsync(',
    "      'INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)',",
    '      task.id,',
    '      task.title,',
    '      task.status',
    '    );',
    '  }',
    '}',
    '',
    'export async function getLocalAppSnapshot(): Promise<typeof appSnapshot> {',
    '  await ensureLocalDataReady();',
    '  const db = await getDb();',
    "  const tasks = await db.getAllAsync<AppTask>('SELECT id, title, status FROM exposition_tasks ORDER BY id');",
    '  return {',
    '    ...appSnapshot,',
    '    tasks,',
    '  };',
    '}',
    '',
    "export async function addLocalTask(title = 'Try the local DB adapter'): Promise<typeof appSnapshot> {",
    '  await ensureLocalDataReady();',
    '  const db = await getDb();',
    '  const id = `task-${Date.now()}`;',
    "  await db.runAsync('INSERT INTO exposition_tasks (id, title, status) VALUES (?, ?, ?)', id, title, 'todo');",
    '  return getLocalAppSnapshot();',
    '}',
    '',
  ].join('\n');
}

function renderRichRootLayout(projectPath: string, appDir: string): string {
  return [
    renderGlobalCssImport(path.join(appDir, '_layout.tsx'), projectPath),
    "import { Stack } from 'expo-router';",
    "import { SafeAreaProvider } from 'react-native-safe-area-context';",
    '',
    'export default function Layout() {',
    '  return (',
    '    <SafeAreaProvider>',
    '      <Stack>',
    "        <Stack.Screen name=\"index\" options={{ title: 'Home' }} />",
    "        <Stack.Screen name=\"onboarding\" options={{ title: 'Onboarding' }} />",
    "        <Stack.Screen name=\"exposition/index\" options={{ title: 'Exposition' }} />",
    "        <Stack.Screen name=\"exposition/stylist\" options={{ title: 'Stylist' }} />",
    "        <Stack.Screen name=\"exposition/data\" options={{ title: 'Data' }} />",
    "        <Stack.Screen name=\"settings\" options={{ presentation: 'modal', title: 'Settings' }} />",
    '      </Stack>',
    '    </SafeAreaProvider>',
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
    '  children?: ReactNode;',
    '  label?: string;',
    '  onPress?: () => void;',
    '}',
    '',
    "export function AnimatedPressable({ children, label = 'Reanimated press demo', onPress }: AnimatedPressableProps) {",
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
    '      style={[styles.button, animatedStyle]}',
    '    >',
    '      {children ?? <Text style={styles.label}>{label}</Text>}',
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
    "    color: '#ffffff',",
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
    '    shadowColor: "#000000",',
    '    shadowOpacity: 0.08,',
    '    shadowRadius: 10,',
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
    "import { StyleSheet, TextInput } from 'react-native';",
    "import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';",
    '',
    'export function KeyboardForm() {',
    '  return (',
    '    <>',
    '      <KeyboardAwareScrollView bottomOffset={72} contentContainerStyle={styles.form} style={styles.scroller}>',
    '        <TextInput placeholder="Project note" style={styles.input} />',
    '        <TextInput multiline placeholder="Details" style={[styles.input, styles.multiline]} />',
    '      </KeyboardAwareScrollView>',
    '      <KeyboardToolbar />',
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
    "import Svg, { Circle, Path } from 'react-native-svg';",
    '',
    'export function SvgMark() {',
    '  return (',
    '    <Svg width={44} height={44} viewBox="0 0 44 44" accessibilityRole="image">',
    '      <Circle cx={22} cy={22} r={20} fill="#111827" />',
    '      <Path d="M14 23.5 19.5 29 31 15" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />',
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
  return [
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    'export function ExpositionNotice() {',
    '  return (',
    '    <View style={styles.notice}>',
    '      <Text style={styles.eyebrow}>Temporary exposition scaffold</Text>',
    `      <Text style={styles.body}>${EXPOSITION_NOTICE}</Text>`,
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  notice: {',
    "    backgroundColor: '#fff7ed',",
    "    borderColor: '#fed7aa',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 6,',
    '    padding: 14,',
    '  },',
    '  eyebrow: {',
    "    color: '#9a3412',",
    '    fontSize: 12,',
    '    fontWeight: "800",',
    '    letterSpacing: 0.4,',
    '    textTransform: "uppercase",',
    '  },',
    '  body: {',
    "    color: '#7c2d12',",
    '    fontSize: 14,',
    '    lineHeight: 20,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderPackageCard(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    'interface PackageCardProps {',
    '  title: string;',
    '  packageName: string;',
    '  body: string;',
    '  children?: ReactNode;',
    '}',
    '',
    'export function PackageCard({ title, packageName, body, children }: PackageCardProps) {',
    '  return (',
    '    <View style={styles.card}>',
    '      <Text style={styles.packageName}>{packageName}</Text>',
    '      <Text style={styles.title}>{title}</Text>',
    '      <Text style={styles.body}>{body}</Text>',
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
    "export { SvgMark } from './svg-mark';",
    '',
  ].join('\n');
}

function renderHomeScreen(answers: OnboardAnswers): string {
  return [
    "import { Link } from 'expo-router';",
    "import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { GestureCard, SvgMark } from '../../components/exposition';",
    "import { appSnapshot } from '../../data/mock-app';",
    '',
    'const expositionLinks = [',
    "  { href: '/exposition' as const, title: 'Package exposition', body: 'Review included base packages and decide what stays.' },",
    "  { href: '/exposition/stylist' as const, title: 'Stylist', body: 'Test colors, type, motion, and component density.' },",
    "  { href: '/exposition/data' as const, title: 'Data adapter', body: 'Try the local data boundary before replacing it.' },",
    '];',
    '',
    'export default function HomeScreen() {',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    '      <View style={styles.header}>',
    '        <SvgMark />',
    '        <View style={styles.headerText}>',
    `          <Text style={styles.title}>${answers.appName}</Text>`,
    '          <Text style={styles.subtitle}>{appSnapshot.audience}</Text>',
    '        </View>',
    '        <Link href="/settings" asChild>',
    '          <Pressable accessibilityRole="button" style={styles.infoButton}>',
    '            <Text style={styles.infoButtonText}>i</Text>',
    '          </Pressable>',
    '        </Link>',
    '      </View>',
    '      <GestureCard',
    '        title="Rich boilerplate is wired"',
    '        body="Routes stay thin, feature screens hold UI, and the temporary exposition pages are reachable from this home screen."',
    '      />',
    '      <View style={styles.grid}>',
    '        <Link href="/onboarding" asChild>',
    '          <Pressable style={styles.primaryCard}>',
    '            <Text style={styles.primaryTitle}>Onboarding preview</Text>',
    '            <Text style={styles.primaryBody}>Open the generated onboarding screen before the main product flow replaces it.</Text>',
    '          </Pressable>',
    '        </Link>',
    '        {expositionLinks.map((item) => (',
    '          <Link key={item.href} href={item.href} asChild>',
    '            <Pressable style={styles.linkCard}>',
    '              <Text style={styles.linkTitle}>{item.title}</Text>',
    '              <Text style={styles.linkBody}>{item.body}</Text>',
    '            </Pressable>',
    '          </Link>',
    '        ))}',
    '      </View>',
    '      <View style={styles.taskList}>',
    '        <Text style={styles.sectionTitle}>Generated next steps</Text>',
    '        {appSnapshot.tasks.map((task) => (',
    '          <View key={task.id} style={styles.taskCard}>',
    '            <Text style={styles.taskTitle}>{task.title}</Text>',
    '            <Text style={styles.taskStatus}>{task.status}</Text>',
    '          </View>',
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
    '    gap: 16,',
    '    padding: 20,',
    '  },',
    '  header: {',
    '    alignItems: "center",',
    '    flexDirection: "row",',
    '    gap: 12,',
    '  },',
    '  headerText: {',
    '    flex: 1,',
    '  },',
    '  infoButton: {',
    '    alignItems: "center",',
    "    backgroundColor: '#111827',",
    '    borderRadius: 18,',
    '    height: 36,',
    '    justifyContent: "center",',
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
    '  },',
    '  subtitle: {',
    "    color: '#4b5563',",
    '    fontSize: 14,',
    '    marginTop: 3,',
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
    '  taskList: {',
    '    gap: 10,',
    '  },',
    '  sectionTitle: {',
    "    color: '#111827',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
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
    '});',
    '',
  ].join('\n');
}

function renderOnboardingScreen(): string {
  return [
    "import { Link } from 'expo-router';",
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    "import { AnimatedPressable } from '../../components/exposition';",
    '',
    'export default function OnboardingScreen() {',
    '  return (',
    '    <View style={styles.screen}>',
    '      <Text style={styles.title}>Start with intent</Text>',
    '      <Text style={styles.body}>',
    '        Replace this screen with the first real onboarding step once the product flow is settled.',
    '      </Text>',
    '      <Link href="/" asChild>',
    '        <AnimatedPressable label="Continue to home" />',
    '      </Link>',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#ffffff',",
    '    flex: 1,',
    '    gap: 16,',
    '    justifyContent: "center",',
    '    padding: 20,',
    '  },',
    '  title: {',
    "    color: '#111827',",
    '    fontSize: 26,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 16,',
    '    lineHeight: 24,',
    '  },',
    '});',
    '',
  ].join('\n');
}

function renderSettingsScreen(): string {
  return [
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    "import { KeyboardForm } from '../../components/exposition';",
    '',
    'export default function SettingsScreen() {',
    '  return (',
    '    <View style={styles.screen}>',
    '      <View style={styles.header}>',
    '        <Text style={styles.title}>Settings</Text>',
    '        <Text style={styles.body}>Keyboard Controller is ready for form-heavy screens.</Text>',
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

function renderExpositionScreen(answers: OnboardAnswers): string {
  return [
    "import { ScrollView, StyleSheet, Text, View } from 'react-native';",
    '',
    "import { AnimatedPressable, ExpositionNotice, GestureCard, KeyboardForm, PackageCard, ScreensCard, SvgMark } from '../../components/exposition';",
    '',
    'export default function ExpositionScreen() {',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    `      <Text style={styles.title}>${answers.appName} Exposition</Text>`,
    '      <Text style={styles.intro}>Browse the included base packages, then delete what the app does not need.</Text>',
    '      <ExpositionNotice />',
    '      <PackageCard',
    '        packageName="react-native-reanimated + react-native-worklets"',
    '        title="Motion that feels native"',
    '        body="Press the button to see the Reanimated timing demo. Worklets make this kind of UI-thread animation possible."',
    '      >',
    '        <AnimatedPressable label="Press and hold" />',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-gesture-handler"',
    '        title="Gesture-first interactions"',
    '        body="Drag the card below. If your product does not need touch-heavy interactions, this demo helps you decide what to remove."',
    '      >',
    '        <GestureCard title="Drag me" body="This card springs back when the gesture ends." />',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-screens"',
    '        title="Native navigation primitives"',
    '        body="Screens support the navigation layer with native lifecycle and memory behavior."',
    '      >',
    '        <ScreensCard />',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-svg"',
    '        title="Portable vector UI"',
    '        body="Use SVG for marks, badges, charts, and vector states that need to scale cleanly."',
    '      >',
    '        <View style={styles.svgDemo}><SvgMark /></View>',
    '      </PackageCard>',
    '      <PackageCard',
    '        packageName="react-native-keyboard-controller"',
    '        title="Keyboard-heavy screens"',
    '        body="Use this when forms, chat, notes, or auth flows need better keyboard control than manual offsets."',
    '      >',
    '        <KeyboardForm />',
    '      </PackageCard>',
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
    '  svgDemo: {',
    '    alignItems: "center",',
    '    paddingVertical: 8,',
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
    "const NATIVE_SAVE_COMMAND = 'npm run mds:stylist:sync -- --input-file project/theme.json --write-policy managed';",
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
    "        spacing: { ...prev.layout.spacing, [path]: value },",
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
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.displaySize, fontWeight: "900" }}>Display headline</Text>',
    '        <Text style={{ color: theme.colors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.headingSize, fontWeight: "800" }}>Section heading</Text>',
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
    '',
    "import type { appSnapshot } from '../../data/mock-app';",
    '',
    'type Snapshot = typeof appSnapshot;',
    '',
    'export default function DataScreen() {',
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
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    '      <Text style={styles.title}>Data Exposition</Text>',
    '      <Text style={styles.intro}>This app starts with a web-safe local adapter and a native Expo SQLite adapter. Keep the boundary, then swap implementation details when Supabase is ready.</Text>',
    '      <ExpositionNotice />',
    '      <Pressable onPress={addTask} style={styles.button}>',
    '        <Text style={styles.buttonText}>Insert a local task</Text>',
    '      </Pressable>',
    '      {snapshot?.tasks.map((task) => (',
    '        <View key={task.id} style={styles.taskCard}>',
    '          <Text style={styles.taskTitle}>{task.title}</Text>',
    '          <Text style={styles.taskStatus}>{task.status}</Text>',
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
    '',
    'export default function DataScreen() {',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    '      <Text style={styles.title}>Data Exposition</Text>',
    `      <Text style={styles.intro}>${answers.appName} is set to start with Supabase. Keep the adapter boundary in src/services so screens stay independent from backend details.</Text>`,
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
