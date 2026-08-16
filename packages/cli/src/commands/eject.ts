import { access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { cancel, isCancel, multiselect } from '@clack/prompts';
import chalk from 'chalk';

import {
  applyInventoryDecisions,
  buildEjectionInventory,
  defaultKeepIds,
  expandLibraryDestinations,
  generateEjectionCleanupTasks,
  knownEjectionItemIds,
  persistEjectionCleanup,
  persistEjectionInventory,
  type EjectionCleanupTask,
  type EjectionInventory,
  type EjectionInventoryStatus,
  type ExpositionKeepKey,
  inventoryStatusFrom,
} from '../ejection-inventory.js';
import {
  listLibraryDestinationsByTag,
  listLibraryDestinationsForItems,
} from '../library-generation.js';
import { runStylistEjectCommand, type StylistEjectArgv } from './stylist.js';

export type { ExpositionKeepKey };

export interface EjectExpositionArgv {
  path?: string;
  keep?: string;
  all?: boolean;
  fromMemory?: boolean;
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
  inventory: EjectionInventory;
  ejectionStatus: EjectionInventoryStatus;
  cleanupTasks: EjectionCleanupTask[];
  cleanupPath: string | null;
}

const KEEP_KEY_LABEL: Record<string, string> = {
  onboarding: 'Onboarding Setup',
  settings: 'Settings Page',
  data: 'Data Adapter',
  stylist: 'Stylist',
  auth: 'Auth Flow',
  legal: 'Legal Documents',
  exposition: 'Exposition Pages',
  'expo-sdk-56': 'Expo SDK 56 Exposition',
  nativewindui: 'NativeWindUI Exposition',
  swmansion: 'Software Mansion Demos',
  'create-expo-app': 'create-expo-app Components',
  'create-expo-stack': 'create-expo-stack Starter Components',
};

const LEGACY_KEEP_KEYS: ExpositionKeepKey[] = ['onboarding', 'settings', 'data', 'stylist'];
const LEGACY_ONBOARDING_PREVIEW_DESTINATIONS = [
  '{{featuresDir}}/onboarding/onboarding-screen.tsx',
  '{{featuresDir}}/onboarding/agreement-screen.tsx',
  '{{featuresDir}}/onboarding/terms-screen.tsx',
  '{{featuresDir}}/onboarding/account-setup-screen.tsx',
  '{{featuresDir}}/onboarding/legal-documents.ts',
  '{{featuresDir}}/onboarding/components/legal-document-view.tsx',
  '{{featuresDir}}/onboarding/preferences-screen.tsx',
  '{{appDir}}/onboarding.tsx',
  '{{appDir}}/onboarding/agreement.tsx',
  '{{appDir}}/onboarding/terms.tsx',
  '{{appDir}}/onboarding/account-setup.tsx',
  '{{appDir}}/onboarding/preferences.tsx',
] as const;

export async function runEjectExpositionCommand(argv: EjectExpositionArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const inventory = await buildEjectionInventory(projectPath);
  const stylistPresent =
    inventory.items.find((item) => item.id === 'stylist')?.present ??
    (await hasStylistArtifacts(projectPath));

  const keepRequested = await resolveKeepSelection(argv, interactive, inventory);
  const presentIds = new Set(
    inventory.items.filter((item) => item.present || (item.id === 'stylist' && stylistPresent)).map((item) => item.id)
  );
  if (stylistPresent) {
    presentIds.add('stylist');
  }
  const keep = keepRequested.filter((item) => item !== 'stylist' || stylistPresent).filter((item) => {
    if (LEGACY_KEEP_KEYS.includes(item)) {
      return item !== 'stylist' || stylistPresent;
    }
    return presentIds.has(item);
  });
  const autoSkipped = keepRequested.filter((item) => !keep.includes(item));

  const decided = applyInventoryDecisions(inventory, keep, { confirm: true });
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

  for (const extraId of ['auth', 'legal', 'create-expo-app', 'create-expo-stack'] as const) {
    if (!keep.includes(extraId)) {
      const extraItem = decided.items.find((item) => item.id === extraId);
      if (extraItem && (extraItem.present || extraItem.destinations.length > 0)) {
        removedFiles.push(
          ...(await removeExistingFiles(expandLibraryDestinations(projectPath, extraItem.destinations)))
        );
      }
    }
  }

  removedFiles.push(...(await removeSharedExpositionArtifacts(projectPath, keep)));

  await removeReferencesForRemovedGroups(projectPath, keep);

  const dedupedRemoved = Array.from(new Set(removedFiles));
  const ejectedItems = decided.items.filter((item) => item.decision === 'eject');
  const cleanupTasks = await generateEjectionCleanupTasks(projectPath, ejectedItems, dedupedRemoved);
  await persistEjectionInventory(projectPath, decided);
  const persistedCleanup = await persistEjectionCleanup(projectPath, decided, cleanupTasks);

  const result: EjectExpositionResult = {
    projectPath,
    interactive,
    keep,
    keepRequested,
    keepApplied: keep,
    autoSkipped,
    removedFiles: dedupedRemoved,
    stylistEjected: !keep.includes('stylist') && stylistPresent,
    inventory: decided,
    ejectionStatus: inventoryStatusFrom(decided),
    cleanupTasks,
    cleanupPath: persistedCleanup.cleanupPath,
  };

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold('mds eject'));
  console.log(chalk.dim(projectPath));
  console.log(`Phase 0 ejection status: ${result.ejectionStatus.decision}`);
  console.log(
    `Keeping: ${keep.map((item) => KEEP_KEY_LABEL[item] ?? item).join(', ') || 'nothing'}`
  );
  if (autoSkipped.length > 0) {
    console.log(
      chalk.yellow(
        `Auto-skipped unavailable keep options: ${autoSkipped
          .map((item) => KEEP_KEY_LABEL[item] ?? item)
          .join(', ')}`
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
  if (cleanupTasks.length > 0) {
    console.log(chalk.yellow(`Generated ${cleanupTasks.length} cleanup follow-up(s).`));
    if (persistedCleanup.cleanupPath) {
      console.log(`- wrote ${path.relative(process.cwd(), persistedCleanup.cleanupPath)}`);
    }
  }
}

function parseKeepCsv(input: string, inventory: EjectionInventory): ExpositionKeepKey[] {
  const tokens = input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const valid = new Set(knownEjectionItemIds(inventory));
  const invalid = tokens.filter((item) => !valid.has(item));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid --keep value(s): ${invalid.join(', ')}. Valid values: ${[...valid].sort().join(', ')}.`
    );
  }

  return Array.from(new Set(tokens));
}

async function resolveKeepSelection(
  argv: EjectExpositionArgv,
  interactive: boolean,
  inventory: EjectionInventory
): Promise<ExpositionKeepKey[]> {
  if (argv.all) {
    return [];
  }

  if (argv.fromMemory) {
    return defaultKeepIds(inventory);
  }

  if (argv.keep?.trim()) {
    return parseKeepCsv(argv.keep, inventory);
  }

  if (!interactive) {
    throw new Error(
      'Non-interactive mode requires --keep, --from-memory, or --all. Example: mds eject . --keep onboarding,settings'
    );
  }

  const presentItems = inventory.items.filter((item) => item.present || item.id === 'stylist');
  const options = (presentItems.length > 0 ? presentItems : inventory.items).map((item) => ({
    value: item.id,
    label: item.label,
    hint: item.selectedInMemory
      ? `Selected in project memory; default ${item.defaultDecision}.`
      : item.description,
  }));

  const initialValues = defaultKeepIds(
    presentItems.length > 0 ? { ...inventory, items: presentItems } : inventory
  );

  const answer = await multiselect<ExpositionKeepKey>({
    message:
      'Choose which generated components to retain. Items selected in project memory are checked by default.',
    options: options.length > 0 ? options : [{ value: 'settings', label: 'Settings Page', hint: 'No generated inventory was found.' }],
    initialValues,
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
  return removeExistingFiles([
    ...libraryFilesForTag(projectPath, 'eject:onboarding'),
    ...libraryFilesForDestinations(projectPath, LEGACY_ONBOARDING_PREVIEW_DESTINATIONS),
  ]);
}

async function removeSettingsSetup(projectPath: string): Promise<string[]> {
  return removeExistingFiles(libraryFilesForTag(projectPath, 'eject:settings'));
}

async function removeDataAdapterSetup(projectPath: string): Promise<string[]> {
  return removeExistingFiles(libraryFilesForTag(projectPath, 'eject:data'));
}

async function removeSharedExpositionArtifacts(
  projectPath: string,
  keep: readonly string[]
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
  return expandLibraryDestinations(projectPath, destinations);
}

async function removeReferencesForRemovedGroups(
  projectPath: string,
  keep: readonly string[]
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
      await removeLineContaining(filePath, 'name="onboarding/legal"');
      await removeLineContaining(filePath, 'name="onboarding/features"');
      await removeLineContaining(filePath, 'name="onboarding/preferences"');
      await removeLineContaining(filePath, 'name="onboarding/complete"');
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
