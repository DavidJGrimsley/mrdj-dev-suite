import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type DataStart = 'local' | 'supabase';

export interface OnboardAnswers {
  appName: string;
  audience: string;
  coreFlows: string;
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
  usesExpoUi: boolean;
  usesExpoNativeTabs: boolean;
  easUses: string[];
  projectInfoReady: boolean;
  projectStyleReady: boolean;
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

const EXPOSITION_NOTICE =
  'These exposition pages are temporary developer and client-research scaffolds. Use them to evaluate styling, base packages, and data direction, then delete or prune them before production once the app direction is settled.';

const UNIWIND_DEV_DEPENDENCIES = {
  tailwindcss: '^4.2.4',
} as const;

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  'Data And Backend',
  'Platforms',
  'Package Choices',
  'Monetization Strategy',
  'Team Context',
  'Release Strategy',
  'Open Questions',
  'Resources',
] as const;

const STYLE_HEADINGS = [
  'Visual Direction',
  'Brand/References',
  'Colors',
  'Typography',
  'Layout/Spacing',
  'Motion Tone',
  'Accessibility Notes',
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

  results.push(
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
      path.join(projectPath, 'src', 'features', 'exposition', 'style-guide-screen.tsx'),
      renderStyleGuideScreen(answers),
      force
    ),
    await writeIfAllowed(
      path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
      renderDataScreen(answers),
      force
    )
  );

  const appDir = path.join(projectPath, 'app');
  if (await pathExists(appDir)) {
    await mkdir(path.join(appDir, 'exposition'), { recursive: true });
    results.push(
      await writeIfAllowed(
        path.join(appDir, 'exposition', 'index.tsx'),
        "export { default } from '../../src/features/exposition/exposition-screen';\n",
        force
      ),
      await writeIfAllowed(
        path.join(appDir, 'exposition', 'style-guide.tsx'),
        "export { default } from '../../src/features/exposition/style-guide-screen';\n",
        force
      ),
      await writeIfAllowed(
        path.join(appDir, 'exposition', 'data.tsx'),
        "export { default } from '../../src/features/exposition/data-screen';\n",
        force
      )
    );
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
        path.join(projectPath, '.github', 'workflows', 'mrdj-pr-checks.yml'),
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
  await ensureGlobalCssImport(projectPath);

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
    `- Platform-specific organization: ${formatPlatformStrategy(answers.platformFileStrategy)}`,
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
    '## Open Questions',
    '',
    ...(hasThinOnboardingAnswers(answers)
      ? [
          '- Replace generic onboarding defaults with app-specific decisions.',
          '- Confirm the exact first user flow before production buildout starts.',
        ]
      : ['# TodoForContext(optional): Add unresolved product, business, data, or release questions.']),
    '',
    '## Resources',
    '',
    `- Source project: ${projectPath}`,
    '- # TodoForContext(optional): Add designs, repos, docs, client notes, analytics, credentials process, or research links.',
    '',
    ...importedNotes,
    '',
    '## Onboarding Decisions',
    '',
    `- Advanced package setup: ${formatBoolean(answers.advancedPackageSetup)}`,
    `- Create Expo starter components: ${formatBoolean(answers.includeCreateExpoComponents)}`,
    `- Latest Expo SDK preference: ${formatBoolean(answers.useLatestExpoSdk)}`,
    `- Target platforms: ${answers.targetPlatforms.join(', ') || 'none selected'}`,
    `- First MVP platform: ${answers.firstTargetPlatform}`,
    `- Platform-specific organization: ${formatPlatformStrategy(answers.platformFileStrategy)}`,
    `- Web output: ${answers.webOutput}`,
    `- Deployed server: ${formatServerChoice(answers.deployedServer)}`,
    `- Expo UI: ${formatBoolean(answers.usesExpoUi)}`,
    `- Expo Native Tabs: ${formatBoolean(answers.usesExpoNativeTabs)}`,
    `- EAS usage: ${answers.easUses.length > 0 ? answers.easUses.join(', ') : 'not planned yet'}`,
    `- Data start: ${formatDataStart(answers.dataStart)}`,
    `- Test-to-main safeguards: ${formatBoolean(answers.testToMainSafeguards)}`,
    '',
  ].join('\n');
}

export function renderTodo(answers: OnboardAnswers): string {
  const needsReview = hasThinOnboardingAnswers(answers);
  return [
    `# ${answers.appName} TODO`,
    '',
    '## Next Steps After Onboarding',
    '',
    '- [ ] Play with styling in the style-guide page.',
    '- [ ] Browse exposition pages to understand included base packages.',
    '- [ ] Review `project/` files for accuracy and planning adjustments.',
    '- [ ] Tell the agent to commence development phase by phase.',
    '',
    '## Phase 0: Orientation And Planning',
    '',
    '- [ ] Confirm app purpose, audience, and primary flows in `project/info.md`.',
    '- [ ] Confirm visual direction in `project/style.md` after using the style-guide page.',
    '- [ ] Keep or prune included package examples after reviewing `/exposition`.',
    '- [ ] Remove exposition pages before production once their lessons are absorbed.',
    ...(needsReview
      ? ['- [ ] Replace generic onboarding placeholders with real app decisions before full implementation.']
      : []),
    '',
    '## Phase 1: App Shell And First Flow',
    '',
    `- [ ] Build the MVP first for ${answers.firstTargetPlatform}.`,
    '- [ ] Establish app shell, navigation, layouts, and route groups.',
    `- [ ] Implement the first core flow from project info: ${answers.coreFlows}.`,
    '- [ ] Keep route files thin and move real UI into feature screens.',
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
    '- [ ] Run `mrdj doctor --ci` and address errors.',
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
    '## Open Style Questions',
    '',
    '# TodoForContext(optional): Add unresolved visual decisions to review in `/exposition/style-guide`.',
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
    '## Expo Architecture',
    '',
    '- Keep Expo Router route files thin; route files should import feature screens or layouts.',
    '- Put reusable business logic in `src/features`, `src/services`, `src/data`, or shared hooks.',
    '- Prefer Uniwind with Tailwind v4 for new styling work.',
    '- Use Zustand only when state is shared across screens or features.',
    '- Keep private environment variables server-side and never expose secrets with `EXPO_PUBLIC_`.',
    `- Use ${formatPlatformStrategy(answers.platformFileStrategy)} for platform-specific code when the selected targets diverge.`,
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
    '- Run `mrdj doctor --ci` before pushing.',
    '- Use `mrdj clear-expo-start` when Metro or server ports get wedged.',
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
    'Then build from `project/todo.md` in phase order. Do not make changes that conflict with project memory. If the files are unclear or generic, update the project memory first or ask the user.',
    '',
  ].join('\n');
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
    'kill-port': packageJson.scripts?.['kill-port'] ?? 'npx @mrdj/cli kill-port',
    'clear-expo-start':
      packageJson.scripts?.['clear-expo-start'] ?? 'npx @mrdj/cli clear-expo-start',
    'clean-start': packageJson.scripts?.['clean-start'] ?? 'npx @mrdj/cli clean-start',
    'expo-install-fix':
      packageJson.scripts?.['expo-install-fix'] ?? 'npx expo install --fix',
    'expo-doctor': packageJson.scripts?.['expo-doctor'] ?? 'npx expo-doctor',
    'post-create-check':
      packageJson.scripts?.['post-create-check'] ?? 'npx expo install --fix && npx expo-doctor',
    'ci:verify': packageJson.scripts?.['ci:verify'] ?? 'npx @mrdj/cli doctor --ci',
  };

  packageJson.dependencies = {
    ...SOFTWARE_MANSION_CORE_DEPENDENCIES,
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
    dataNeeds: answers.dataNeeds,
    deploymentTarget: answers.deploymentTarget,
    advancedPackageSetup: formatBoolean(answers.advancedPackageSetup),
    includeCreateExpoComponents: formatBoolean(answers.includeCreateExpoComponents),
    useLatestExpoSdk: formatBoolean(answers.useLatestExpoSdk),
    targetPlatforms: answers.targetPlatforms.map((item) => `- ${item}`).join('\n'),
    firstTargetPlatform: answers.firstTargetPlatform,
    platformFileStrategy: formatPlatformStrategy(answers.platformFileStrategy),
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

function hasThinOnboardingAnswers(answers: OnboardAnswers): boolean {
  const genericValues = new Set([
    'Expo app users',
    'Onboarding, primary app workflow, settings',
    'Agent should derive the first core user flows from project/info.md during intake.',
    'Local state first; add backend only when needed',
    'Expo web/native deployment',
  ]);

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

async function ensureGlobalCssImport(projectPath: string): Promise<void> {
  const layoutPath = path.join(projectPath, 'app', '_layout.tsx');
  const appPath = path.join(projectPath, 'App.tsx');
  const layout = await readOptionalText(layoutPath);
  if (layout && !layout.includes('global.css')) {
    await writeFile(layoutPath, `import '../global.css';\n${layout}`, 'utf8');
    return;
  }

  const app = await readOptionalText(appPath);
  if (app && !app.includes('global.css')) {
    await writeFile(appPath, `import './global.css';\n${app}`, 'utf8');
  }
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
    'The following notes existed before MrDJ normalized this file. An agent should move useful details into the correct sections during project intake.',
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
  return ["@import 'tailwindcss';", "@import 'uniwind';", ''].join('\n');
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
    'export const appSnapshot = {',
    `  name: ${JSON.stringify(answers.appName)},`,
    `  audience: ${JSON.stringify(answers.audience)},`,
    '  tasks: [',
    "    { id: 'task-1', title: 'Shape the first user flow', status: 'doing' },",
    "    { id: 'task-2', title: 'Replace mock data with the real data layer', status: 'todo' },",
    "    { id: 'task-3', title: 'Run mrdj doctor before pushing', status: 'todo' },",
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
    'name: MrDJ PR Checks',
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
    '- Require the `MrDJ PR Checks` workflow to pass before merging into `test`.',
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
    '- Require the generated `MrDJ PR Checks` workflow before merge.',
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
    "import { useEffect, useState } from 'react';",
    "import { StyleSheet, Text, View } from 'react-native';",
    '',
    "import { GestureCard, SvgMark } from '../../components/exposition';",
    "import { getLocalAppSnapshot } from '../../services/local-data';",
    '',
    "import type { appSnapshot } from '../../data/mock-app';",
    '',
    'type Snapshot = typeof appSnapshot;',
    '',
    'export default function HomeScreen() {',
    '  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);',
    '',
    '  useEffect(() => {',
    '    void getLocalAppSnapshot().then(setSnapshot);',
    '  }, []);',
    '',
    '  return (',
    '    <View style={styles.screen}>',
    '      <View style={styles.header}>',
    '        <SvgMark />',
    '        <View style={styles.headerText}>',
    `          <Text style={styles.title}>${answers.appName}</Text>`,
    '          <Text style={styles.subtitle}>{snapshot?.audience ?? "Loading project context..."}</Text>',
    '        </View>',
    '      </View>',
    '      <GestureCard',
    '        title="Rich boilerplate is wired"',
    '        body="Routes stay thin, feature screens hold UI, and mock data can be swapped for the real service later."',
    '      />',
    '      {snapshot?.tasks.map((task) => (',
    '        <View key={task.id} style={styles.taskCard}>',
    '          <Text style={styles.taskTitle}>{task.title}</Text>',
    '          <Text style={styles.taskStatus}>{task.status}</Text>',
    '        </View>',
    '      ))}',
    '    </View>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#f9fafb',",
    '    flex: 1,',
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
    '      <AnimatedPressable label="Continue" />',
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

function renderStyleGuideScreen(answers: OnboardAnswers): string {
  return [
    "import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';",
    '',
    "import { AnimatedPressable, ExpositionNotice } from '../../components/exposition';",
    '',
    'const colors = [',
    "  ['Ink', '#111827'],",
    "  ['Cloud', '#f9fafb'],",
    "  ['Accent', '#2563eb'],",
    "  ['Success', '#16a34a'],",
    "  ['Warning', '#f97316'],",
    '];',
    '',
    'export default function StyleGuideScreen() {',
    '  return (',
    '    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>',
    `      <Text style={styles.title}>${answers.appName} Style Guide</Text>`,
    '      <Text style={styles.intro}>Use this page to explore type, spacing, color, and component tone with the client before the production UI hardens.</Text>',
    '      <ExpositionNotice />',
    '      <View style={styles.section}>',
    '        <Text style={styles.sectionTitle}>Color Palette</Text>',
    '        <View style={styles.swatchGrid}>',
    '          {colors.map(([name, color]) => (',
    '            <View key={name} style={styles.swatchItem}>',
    '              <View style={[styles.swatch, { backgroundColor: color }]} />',
    '              <Text style={styles.swatchLabel}>{name}</Text>',
    '              <Text style={styles.swatchValue}>{color}</Text>',
    '            </View>',
    '          ))}',
    '        </View>',
    '      </View>',
    '      <View style={styles.section}>',
    '        <Text style={styles.sectionTitle}>Typography</Text>',
    '        <Text style={styles.display}>Display headline</Text>',
    '        <Text style={styles.heading}>Section heading</Text>',
    '        <Text style={styles.body}>Readable body copy for product screens, onboarding, settings, and forms.</Text>',
    '        <Text style={styles.caption}>Caption and metadata text</Text>',
    '      </View>',
    '      <View style={styles.section}>',
    '        <Text style={styles.sectionTitle}>Controls</Text>',
    '        <AnimatedPressable label="Primary action" />',
    '        <TextInput placeholder="Input state" style={styles.input} />',
    '      </View>',
    '      <View style={styles.section}>',
    '        <Text style={styles.sectionTitle}>Card Language</Text>',
    '        <View style={styles.card}>',
    '          <Text style={styles.heading}>Decision card</Text>',
    '          <Text style={styles.body}>Use cards like this to compare concepts during research, then promote only the useful patterns into production components.</Text>',
    '        </View>',
    '      </View>',
    '    </ScrollView>',
    '  );',
    '}',
    '',
    'const styles = StyleSheet.create({',
    '  screen: {',
    "    backgroundColor: '#ffffff',",
    '    flex: 1,',
    '  },',
    '  content: {',
    '    gap: 18,',
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
    '  section: {',
    "    backgroundColor: '#f9fafb',",
    '    borderRadius: 12,',
    '    gap: 12,',
    '    padding: 16,',
    '  },',
    '  sectionTitle: {',
    "    color: '#111827',",
    '    fontSize: 18,',
    '    fontWeight: "800",',
    '  },',
    '  swatchGrid: {',
    '    flexDirection: "row",',
    '    flexWrap: "wrap",',
    '    gap: 12,',
    '  },',
    '  swatchItem: {',
    '    minWidth: 92,',
    '  },',
    '  swatch: {',
    '    borderRadius: 10,',
    '    height: 44,',
    '  },',
    '  swatchLabel: {',
    "    color: '#111827',",
    '    fontWeight: "700",',
    '    marginTop: 6,',
    '  },',
    '  swatchValue: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '  },',
    '  display: {',
    "    color: '#111827',",
    '    fontSize: 32,',
    '    fontWeight: "900",',
    '  },',
    '  heading: {',
    "    color: '#111827',",
    '    fontSize: 20,',
    '    fontWeight: "800",',
    '  },',
    '  body: {',
    "    color: '#4b5563',",
    '    fontSize: 15,',
    '    lineHeight: 22,',
    '  },',
    '  caption: {',
    "    color: '#6b7280',",
    '    fontSize: 12,',
    '    fontWeight: "700",',
    '    textTransform: "uppercase",',
    '  },',
    '  input: {',
    "    borderColor: '#d1d5db',",
    '    borderRadius: 10,',
    '    borderWidth: 1,',
    '    minHeight: 44,',
    '    paddingHorizontal: 12,',
    '  },',
    '  card: {',
    "    backgroundColor: '#ffffff',",
    "    borderColor: '#e5e7eb',",
    '    borderRadius: 12,',
    '    borderWidth: 1,',
    '    gap: 8,',
    '    padding: 16,',
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
    '      <Text style={styles.intro}>This app starts with local dummy data backed by Expo SQLite. Keep the adapter boundary, then swap implementation details when Supabase is ready.</Text>',
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
