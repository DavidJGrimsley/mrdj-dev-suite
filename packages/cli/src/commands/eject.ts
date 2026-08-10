import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { cancel, isCancel, multiselect } from '@clack/prompts';
import chalk from 'chalk';

import {
  listLibraryDestinationsByTag,
  listLibraryDestinationsForItems,
} from '../library-generation.js';
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
  return removeExistingFiles(libraryFilesForTag(projectPath, 'eject:onboarding'));
}

async function removeSettingsSetup(projectPath: string): Promise<string[]> {
  return removeExistingFiles(libraryFilesForTag(projectPath, 'eject:settings'));
}

async function removeDataAdapterSetup(projectPath: string): Promise<string[]> {
  return removeExistingFiles(libraryFilesForTag(projectPath, 'eject:data'));
}

async function removeSharedExpositionArtifacts(
  projectPath: string,
  keep: ExpositionKeepKey[]
): Promise<string[]> {
  const removeData = !keep.includes('data');
  const removeStylist = !keep.includes('stylist');

  const expositionFiles = new Set(libraryFilesForTag(projectPath, 'eject:exposition'));
  const retainedRecipeIds = [
    ...(keep.includes('settings') ? ['mds/settings'] : []),
    ...(keep.includes('data') ? ['mds/data-local'] : []),
    ...(keep.includes('stylist') ? ['mds/stylist'] : []),
  ];
  for (const retainedFile of libraryFilesForItems(projectPath, retainedRecipeIds)) {
    expositionFiles.delete(retainedFile);
  }
  const files = [...expositionFiles];

  if (removeData) {
    files.push(...libraryFilesForTag(projectPath, 'eject:data'));
  }

  if (removeStylist) {
    files.push(...libraryFilesForTag(projectPath, 'eject:stylist'));
  }

  return removeExistingFiles(files);
}

function libraryFilesForTag(projectPath: string, tag: string): string[] {
  return libraryFilesForDestinations(projectPath, listLibraryDestinationsByTag(tag));
}

function libraryFilesForItems(projectPath: string, itemIds: readonly string[]): string[] {
  return libraryFilesForDestinations(projectPath, listLibraryDestinationsForItems(itemIds));
}

function libraryFilesForDestinations(
  projectPath: string,
  destinations: readonly string[]
): string[] {
  const files = new Set<string>();
  for (const destination of destinations) {
    const appDirectories = destination.includes('{{appDir}}') ? ['app', 'src/app'] : [null];
    const componentDirectories = destination.includes('{{componentsDir}}')
      ? ['components', 'src/components']
      : [null];
    const featureDirectories = destination.includes('{{featuresDir}}')
      ? ['features', 'src/features']
      : [null];
    for (const appDirectory of appDirectories) {
      for (const componentsDirectory of componentDirectories) {
        for (const featuresDirectory of featureDirectories) {
          const relativePath = destination
            .split('{{appDir}}')
            .join(appDirectory ?? '')
            .split('{{componentsDir}}')
            .join(componentsDirectory ?? '')
            .split('{{featuresDir}}')
            .join(featuresDirectory ?? '');
          if (relativePath.includes('{{') || path.isAbsolute(relativePath)) {
            throw new Error(`Unsafe MDS Library ejection destination: ${destination}`);
          }
          const resolved = path.resolve(projectPath, relativePath);
          const relative = path.relative(projectPath, resolved);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Unsafe MDS Library ejection destination: ${destination}`);
          }
          files.add(resolved);
        }
      }
    }
  }
  return [...files];
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
