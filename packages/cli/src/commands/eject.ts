import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { cancel, isCancel, multiselect } from '@clack/prompts';
import chalk from 'chalk';

import { runStylistEjectCommand, type StylistEjectArgv } from './stylist.js';

export type ExpositionKeepKey = 'onboarding' | 'settings' | 'data' | 'stylist';

export interface EjectExpositionArgv {
  path?: string;
  keep?: string;
  all?: boolean;
  json?: boolean;
  styleLibrary?: StylistEjectArgv['styleLibrary'];
  writePolicy?: StylistEjectArgv['writePolicy'];
}

interface EjectExpositionResult {
  projectPath: string;
  interactive: boolean;
  keep: ExpositionKeepKey[];
  keepRequested: ExpositionKeepKey[];
  keepApplied: ExpositionKeepKey[];
  autoSkipped: ExpositionKeepKey[];
  removedFiles: string[];
  stylistEjected: boolean;
}

const KEEP_KEY_LABEL: Record<ExpositionKeepKey, string> = {
  onboarding: 'Onboarding Setup',
  settings: 'Settings Page',
  data: 'Data Adapter',
  stylist: 'Stylist',
};

const ALL_KEEP_KEYS: ExpositionKeepKey[] = ['onboarding', 'settings', 'data', 'stylist'];

export async function runEjectExpositionCommand(argv: EjectExpositionArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const stylistPresent = await hasStylistArtifacts(projectPath);

  const keepRequested = await resolveKeepSelection(argv, interactive, stylistPresent);
  const keep = keepRequested.filter((item) => item !== 'stylist' || stylistPresent);
  const autoSkipped = keepRequested.filter((item) => item === 'stylist' && !stylistPresent);

  const removedFiles: string[] = [];

  if (!keep.includes('stylist') && stylistPresent) {
    await runStylistEjectCommand({
      path: projectPath,
      json: false,
      styleLibrary: argv.styleLibrary,
      writePolicy: argv.writePolicy,
    });
  }

  if (!keep.includes('onboarding')) {
    removedFiles.push(...(await removeOnboardingSetup(projectPath)));
  }

  if (!keep.includes('settings')) {
    removedFiles.push(...(await removeSettingsSetup(projectPath)));
  }

  if (!keep.includes('data')) {
    removedFiles.push(...(await removeDataAdapterSetup(projectPath)));
  }

  removedFiles.push(...(await removeSharedExpositionArtifacts(projectPath, keep)));

  await removeReferencesForRemovedGroups(projectPath, keep);

  const dedupedRemoved = Array.from(new Set(removedFiles));

  const result: EjectExpositionResult = {
    projectPath,
    interactive,
    keep,
    keepRequested,
    keepApplied: keep,
    autoSkipped,
    removedFiles: dedupedRemoved,
    stylistEjected: !keep.includes('stylist') && stylistPresent,
  };

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds eject exposition'));
  console.log(chalk.dim(projectPath));
  console.log(`Keeping: ${keep.map((item) => KEEP_KEY_LABEL[item]).join(', ') || 'nothing'}`);
  if (autoSkipped.length > 0) {
    console.log(
      chalk.yellow(
        `Auto-skipped unavailable keep options: ${autoSkipped.map((item) => KEEP_KEY_LABEL[item]).join(', ')}`
      )
    );
  }
  if (result.stylistEjected) {
    console.log(chalk.green('Ejected Stylist artifacts and reconciled project settings.'));
  }
  console.log(chalk.green(`Removed ${dedupedRemoved.length} files.`));
  for (const filePath of dedupedRemoved) {
    console.log(`- removed ${path.relative(process.cwd(), filePath)}`);
  }
}

function parseKeepCsv(input: string): ExpositionKeepKey[] {
  const tokens = input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const invalid = tokens.filter((item) => !ALL_KEEP_KEYS.includes(item as ExpositionKeepKey));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid --keep value(s): ${invalid.join(', ')}. Valid values: ${ALL_KEEP_KEYS.join(', ')}.`
    );
  }

  return Array.from(new Set(tokens as ExpositionKeepKey[]));
}

async function resolveKeepSelection(
  argv: EjectExpositionArgv,
  interactive: boolean,
  stylistPresent: boolean
): Promise<ExpositionKeepKey[]> {
  if (argv.all) {
    return [];
  }

  if (argv.keep?.trim()) {
    return parseKeepCsv(argv.keep);
  }

  if (!interactive) {
    throw new Error('Non-interactive mode requires --keep or --all. Example: mds eject exposition . --keep onboarding,settings');
  }

  const options = [
    {
      value: 'onboarding' as const,
      label: KEEP_KEY_LABEL.onboarding,
      hint: 'Keep generated onboarding route/screens.',
    },
    {
      value: 'settings' as const,
      label: KEEP_KEY_LABEL.settings,
      hint: 'Keep modal settings route/screen.',
    },
    {
      value: 'data' as const,
      label: KEEP_KEY_LABEL.data,
      hint: 'Keep data adapter exposition page.',
    },
    ...(stylistPresent
      ? [
          {
            value: 'stylist' as const,
            label: KEEP_KEY_LABEL.stylist,
            hint: 'Keep stylist page and sync API route.',
          },
        ]
      : []),
  ];

  const answer = await multiselect<ExpositionKeepKey>({
    message: 'Choose which generated sections to keep before ejecting exposition artifacts.',
    options,
    required: false,
  });

  if (isCancel(answer)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  return Array.from(answer);
}

async function hasStylistArtifacts(projectPath: string): Promise<boolean> {
  const candidates = [
    path.join(projectPath, 'src', 'features', 'exposition', 'stylist-screen.tsx'),
    path.join(projectPath, 'app', 'exposition', 'stylist-sync+api.ts'),
    path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
    path.join(projectPath, 'project', 'stylist.config.json'),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return true;
    }
  }
  return false;
}

async function removeOnboardingSetup(projectPath: string): Promise<string[]> {
  const files = [
    path.join(projectPath, 'src', 'features', 'onboarding', 'onboarding-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'onboarding', 'agreement-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'onboarding', 'terms-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'onboarding', 'account-setup-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'onboarding', 'legal-documents.ts'),
    path.join(projectPath, 'src', 'features', 'onboarding', 'components', 'legal-document-view.tsx'),
    path.join(projectPath, 'src', 'app', 'onboarding.tsx'),
    path.join(projectPath, 'app', 'onboarding.tsx'),
    path.join(projectPath, 'src', 'app', 'onboarding', 'agreement.tsx'),
    path.join(projectPath, 'src', 'app', 'onboarding', 'terms.tsx'),
    path.join(projectPath, 'src', 'app', 'onboarding', 'account-setup.tsx'),
    path.join(projectPath, 'app', 'onboarding', 'agreement.tsx'),
    path.join(projectPath, 'app', 'onboarding', 'terms.tsx'),
    path.join(projectPath, 'app', 'onboarding', 'account-setup.tsx'),
  ];

  return removeExistingFiles(files);
}

async function removeSettingsSetup(projectPath: string): Promise<string[]> {
  const files = [
    path.join(projectPath, 'src', 'features', 'settings', 'settings-screen.tsx'),
    path.join(projectPath, 'src', 'app', 'settings.tsx'),
    path.join(projectPath, 'app', 'settings.tsx'),
  ];
  return removeExistingFiles(files);
}

async function removeDataAdapterSetup(projectPath: string): Promise<string[]> {
  const files = [
    path.join(projectPath, 'src', 'features', 'exposition', 'data-screen.tsx'),
    path.join(projectPath, 'src', 'app', 'exposition', 'data.tsx'),
    path.join(projectPath, 'app', 'exposition', 'data.tsx'),
    path.join(projectPath, 'src', 'app', '(tabs)', 'data.tsx'),
    path.join(projectPath, 'app', '(tabs)', 'data.tsx'),
    path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'data.tsx'),
    path.join(projectPath, 'app', '(drawer)', '(tabs)', 'data.tsx'),
  ];
  return removeExistingFiles(files);
}

async function removeSharedExpositionArtifacts(
  projectPath: string,
  keep: ExpositionKeepKey[]
): Promise<string[]> {
  const removeData = !keep.includes('data');
  const removeStylist = !keep.includes('stylist');
  const keepAnyExpositionFeature = keep.includes('data') || keep.includes('stylist');

  const files = [
    path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'exposition', 'expo-sdk-56-screen.tsx'),
    path.join(projectPath, 'src', 'features', 'exposition', 'nativewindui-screen.tsx'),
    path.join(projectPath, 'src', 'app', 'exposition', 'index.tsx'),
    path.join(projectPath, 'src', 'app', 'exposition', 'sdk-56.tsx'),
    path.join(projectPath, 'src', 'app', 'exposition', 'nativewindui.tsx'),
    path.join(projectPath, 'app', 'exposition', 'index.tsx'),
    path.join(projectPath, 'app', 'exposition', 'sdk-56.tsx'),
    path.join(projectPath, 'app', 'exposition', 'nativewindui.tsx'),
    path.join(projectPath, 'src', 'app', '(tabs)', 'exposition.tsx'),
    path.join(projectPath, 'src', 'app', '(tabs)', 'sdk-56.tsx'),
    path.join(projectPath, 'src', 'app', '(tabs)', 'nativewindui.tsx'),
    path.join(projectPath, 'app', '(tabs)', 'exposition.tsx'),
    path.join(projectPath, 'app', '(tabs)', 'sdk-56.tsx'),
    path.join(projectPath, 'app', '(tabs)', 'nativewindui.tsx'),
    path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'index.tsx'),
    path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'sdk-56.tsx'),
    path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'nativewindui.tsx'),
    path.join(projectPath, 'app', '(drawer)', '(tabs)', 'index.tsx'),
    path.join(projectPath, 'app', '(drawer)', '(tabs)', 'sdk-56.tsx'),
    path.join(projectPath, 'app', '(drawer)', '(tabs)', 'nativewindui.tsx'),
  ];

  if (removeData) {
    files.push(
      path.join(projectPath, 'src', 'app', '(tabs)', 'data.tsx'),
      path.join(projectPath, 'app', '(tabs)', 'data.tsx'),
      path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'data.tsx'),
      path.join(projectPath, 'app', '(drawer)', '(tabs)', 'data.tsx')
    );
  }

  if (removeStylist) {
    files.push(
      path.join(projectPath, 'src', 'app', '(tabs)', 'stylist.tsx'),
      path.join(projectPath, 'app', '(tabs)', 'stylist.tsx'),
      path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', 'stylist.tsx'),
      path.join(projectPath, 'app', '(drawer)', '(tabs)', 'stylist.tsx')
    );
  }

  if (!keepAnyExpositionFeature) {
    files.push(
      path.join(projectPath, 'src', 'components', 'exposition', 'animated-pressable.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'gesture-card.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'keyboard-form.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'svg-mark.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'software-mansion-logo.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'screens-card.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'notice.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'package-card.tsx'),
      path.join(projectPath, 'src', 'components', 'exposition', 'index.ts')
    );
  }

  return removeExistingFiles(files);
}

async function removeReferencesForRemovedGroups(
  projectPath: string,
  keep: ExpositionKeepKey[]
): Promise<void> {
  const layoutFiles = [
    path.join(projectPath, 'src', 'app', '_layout.tsx'),
    path.join(projectPath, 'app', '_layout.tsx'),
    path.join(projectPath, 'src', 'app', '(tabs)', '_layout.tsx'),
    path.join(projectPath, 'app', '(tabs)', '_layout.tsx'),
    path.join(projectPath, 'src', 'app', '(drawer)', '(tabs)', '_layout.tsx'),
    path.join(projectPath, 'app', '(drawer)', '(tabs)', '_layout.tsx'),
  ];
  const homeFiles = [
    path.join(projectPath, 'src', 'features', 'home', 'home-screen.tsx'),
  ];
  const expositionScreenFiles = [
    path.join(projectPath, 'src', 'features', 'exposition', 'exposition-screen.tsx'),
  ];

  for (const filePath of layoutFiles) {
    if (!keep.includes('onboarding')) {
      await removeLineContaining(filePath, 'name="onboarding"');
      await removeLineContaining(filePath, 'name="onboarding/agreement"');
      await removeLineContaining(filePath, 'name="onboarding/terms"');
      await removeLineContaining(filePath, 'name="onboarding/account-setup"');
    }

    if (!keep.includes('settings')) {
      await removeLineContaining(filePath, 'name="settings"');
      await removeRegexBlock(
        filePath,
        /\{Platform\.OS !== 'web'[\s\S]*?<Link href="\/settings" asChild>[\s\S]*?<\/Link>[\s\S]*?\}/g
      );
    }

    await removeLineContaining(filePath, 'name="exposition/index"');
    if (!keep.includes('stylist')) {
      await removeLineContaining(filePath, 'name="exposition/stylist"');
    }
    if (!keep.includes('data')) {
      await removeLineContaining(filePath, 'name="exposition/data"');
    }
    await removeLineContaining(filePath, 'name="exposition/sdk-56"');
    await removeLineContaining(filePath, 'name="exposition/nativewindui"');
  }

  for (const filePath of homeFiles) {
    if (!keep.includes('onboarding')) {
      await removeRegexBlock(
        filePath,
        /\s*<Link href="\/onboarding" asChild>[\s\S]*?<\/Link>\n/g
      );
    }

    if (!keep.includes('settings')) {
      await removeRegexBlock(
        filePath,
        /\{Platform\.OS === "web" \? \([\s\S]*?<Link href="\/settings" asChild>[\s\S]*?<\/Link>[\s\S]*?\) : null\}/g
      );
    }

    await removeLineContaining(filePath, "'/exposition'");
    if (!keep.includes('stylist')) {
      await removeLineContaining(filePath, "'/exposition/stylist'");
    }
    if (!keep.includes('data')) {
      await removeLineContaining(filePath, "'/exposition/data'");
    }
    await removeLineContaining(filePath, "'/exposition/sdk-56'");
    await removeLineContaining(filePath, "'/exposition/nativewindui'");
  }

  for (const filePath of expositionScreenFiles) {
    await removeLineContaining(filePath, "href=\"/exposition/nativewindui\"");
    if (!keep.includes('stylist')) {
      await removeLineContaining(filePath, 'Stylist color editing');
      await removeLineContaining(filePath, 'Stylist local preferences');
      await removeLineContaining(filePath, 'Stylist safe spacing');
      await removeLineContaining(filePath, 'Stylist palette families');
      await removeLineContaining(filePath, 'Stylist sync endpoint');
      await removeLineContaining(filePath, '/exposition/stylist-sync');
    }
  }
}

async function removeExistingFiles(candidates: string[]): Promise<string[]> {
  const removed: string[] = [];
  for (const filePath of candidates) {
    if (await pathExists(filePath)) {
      await rm(filePath, { force: true, recursive: true });
      removed.push(filePath);
    }
  }
  return removed;
}

async function removeRegexBlock(filePath: string, pattern: RegExp): Promise<void> {
  const raw = await readOptionalText(filePath);
  if (!raw) {
    return;
  }
  const next = raw.replace(pattern, '');
  if (next !== raw) {
    await writeFile(filePath, `${next.replace(/\s+$/, '')}\n`, 'utf8');
  }
}

async function removeLineContaining(filePath: string, token: string): Promise<void> {
  const raw = await readOptionalText(filePath);
  if (!raw || !raw.includes(token)) {
    return;
  }
  const lines = raw.split(/\r?\n/).filter((line) => !line.includes(token));
  await writeFile(filePath, `${lines.join('\n').replace(/\s+$/, '')}\n`, 'utf8');
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
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
