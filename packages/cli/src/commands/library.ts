import { confirm, isCancel } from '@clack/prompts';
import chalk from 'chalk';

import {
  getLibraryItem,
  listLibraryItems,
  resolveLibraryItem,
  searchLibraryItems,
} from '@mr.dj2u/library-registry';
import { applyLibraryAdd, inspectLibraryProject, planLibraryAdd } from '../library.js';

import type {
  LibraryFilter,
  LibraryItemKind,
  LibraryItemSummary,
  LibraryResolution,
  LibrarySourceName,
} from '@mr.dj2u/library-registry';
import type { LibraryAddPlan, LibraryAddResult } from '../library.js';

export interface LibraryListArgv {
  query?: string;
  kind?: LibraryItemKind;
  source?: LibrarySourceName;
  compatible?: boolean;
  json?: boolean;
}

export interface LibraryShowArgv {
  id?: string;
  variant?: string;
  json?: boolean;
}

export interface LibraryAddArgv {
  id?: string;
  path?: string;
  dryRun?: boolean;
  yes?: boolean;
  noInstall?: boolean;
  install?: boolean;
  variant?: string;
  json?: boolean;
}

export async function getLibraryListResult(
  argv: LibraryListArgv
): Promise<LibraryItemSummary[]> {
  const compatibleWith = argv.compatible ? await inspectLibraryProject('.') : undefined;
  if (argv.compatible && !compatibleWith?.dependencies.expo) {
    throw new Error('The --compatible filter requires an Expo project in the current directory.');
  }
  const filter: LibraryFilter = {
    kind: argv.kind,
    source: argv.source,
    compatibleWith,
  };
  const query = argv.query?.trim();
  return query ? searchLibraryItems(query, filter) : listLibraryItems(filter);
}

export async function getLibraryShowResult(id: string, variant?: string): Promise<LibraryResolution> {
  if (!getLibraryItem(id)) {
    throw new Error(`Unknown library item: ${id}`);
  }
  try {
    const context = await inspectLibraryProject('.');
    return resolveLibraryItem(id, context, { variant });
  } catch {
    return resolveLibraryItem(id, {}, { variant });
  }
}

export async function runLibraryListCommand(argv: LibraryListArgv): Promise<void> {
  const items = await getLibraryListResult(argv);
  if (argv.json) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  console.log(chalk.bold('mds library list'));
  const filters = [
    argv.query ? `query=${argv.query}` : null,
    argv.kind ? `kind=${argv.kind}` : null,
    argv.source ? `source=${argv.source}` : null,
    argv.compatible ? 'compatible=current project' : null,
  ].filter((value): value is string => Boolean(value));
  if (filters.length > 0) console.log(chalk.dim(filters.join(' | ')));
  console.log();

  if (items.length === 0) {
    console.log(chalk.yellow('No library items matched.'));
    return;
  }

  for (const item of items) {
    console.log(`${chalk.cyan(item.id)} ${chalk.bold(item.name)}`);
    console.log(`  ${item.description}`);
    console.log(
      chalk.dim(
        `  ${item.kind} | ${item.source.displayName} ${item.source.version} | ${item.tags.join(', ')}`
      )
    );
    if (item.variants.length > 0) {
      console.log(chalk.dim(`  variants: ${item.variants.map((variant) => variant.id).join(', ')}`));
    }
  }
}

export async function runLibraryShowCommand(argv: LibraryShowArgv): Promise<void> {
  if (!argv.id) {
    throw new Error('mds library show requires an item id.');
  }
  const resolution = await getLibraryShowResult(argv.id, argv.variant);
  if (argv.json) {
    console.log(JSON.stringify(resolution, null, 2));
    return;
  }

  const { item } = resolution;
  console.log(chalk.bold(item.name));
  console.log(chalk.cyan(item.id));
  console.log(item.description);
  console.log();
  console.log(`Kind: ${item.kind}`);
  console.log(
    `Source: ${item.source.displayName} ${item.source.version} (${item.source.license})`
  );
  console.log(`Repository: ${item.source.repository}`);
  if (item.source.sourcePath) console.log(`Upstream path: ${item.source.sourcePath}`);
  console.log(`Tags: ${item.tags.join(', ') || 'none'}`);
  console.log(`Compatible with current project: ${resolution.compatible ? 'yes' : 'no'}`);

  if (item.variants.length > 0) {
    console.log();
    console.log(chalk.bold('Variants'));
    for (const variant of item.variants) {
      console.log(`- ${variant.id}: ${variant.name}${variant.description ? ` — ${variant.description}` : ''}`);
    }
  }
  if (resolution.dependencies.length > 0) {
    console.log();
    console.log(chalk.bold('Dependencies'));
    for (const dependency of resolution.dependencies) {
      console.log(
        `- ${dependency.name}@${dependency.version} (${dependency.kind}, ${dependency.installer})`
      );
    }
  }
  if (resolution.assets.length > 0) {
    console.log();
    console.log(chalk.bold('Files'));
    for (const asset of resolution.assets) {
      console.log(`- ${asset.destination} ← ${asset.path}`);
    }
  }
  if (resolution.integration.length > 0) {
    console.log();
    console.log(chalk.bold('Integration'));
    for (const instruction of resolution.integration) console.log(`- ${instruction}`);
  }
  if (resolution.issues.length > 0) {
    console.log();
    console.log(chalk.bold('Compatibility notes'));
    for (const issue of resolution.issues) {
      const color = issue.severity === 'error' ? chalk.red : issue.severity === 'warning' ? chalk.yellow : chalk.gray;
      console.log(color(`- ${issue.message}`));
    }
  }
}

export async function runLibraryAddCommand(argv: LibraryAddArgv): Promise<void> {
  if (!argv.id) {
    throw new Error('mds library add requires an item id.');
  }
  const projectPath = argv.path ?? '.';
  const plan = await planLibraryAdd(projectPath, argv.id, { variant: argv.variant });

  if (argv.dryRun) {
    printLibraryAddPlan(plan, argv.json);
    if (!plan.canApply) process.exitCode = 1;
    return;
  }
  if (!plan.canApply) {
    printLibraryAddPlan(plan, argv.json);
    process.exitCode = 1;
    return;
  }

  const confirmed = argv.yes || (await confirmLibraryAdd(plan));
  if (!confirmed) {
    if (argv.json) {
      console.log(JSON.stringify({ cancelled: true, planHash: plan.planHash }, null, 2));
    } else {
      console.log(chalk.yellow('Library add cancelled. No files were written.'));
    }
    return;
  }

  const result = await applyLibraryAdd(projectPath, argv.id, {
    confirmed: true,
    planHash: plan.planHash,
    variant: argv.variant,
    installDependencies: argv.install !== false && !argv.noInstall,
  });
  printLibraryAddResult(result, argv.json);
}

function printLibraryAddPlan(plan: LibraryAddPlan, json = false): void {
  if (json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }
  console.log(chalk.bold(`mds library add ${plan.id} (dry run)`));
  console.log(chalk.dim(plan.projectPath));
  console.log(`Plan hash: ${plan.planHash}`);
  console.log();
  for (const file of plan.files) {
    const marker =
      file.action === 'create'
        ? chalk.green('CREATE')
        : file.action === 'skip-identical'
          ? chalk.gray('SKIP')
          : chalk.red('BLOCK');
    console.log(`${marker} ${file.destination}`);
  }
  for (const command of plan.commands) console.log(`${chalk.cyan('RUN')} ${command.display}`);
  for (const conflict of plan.conflicts) console.log(chalk.red(`BLOCK ${conflict.message}`));
  if (plan.integration.length > 0) {
    console.log();
    console.log(chalk.bold('After copying'));
    for (const instruction of plan.integration) console.log(`- ${instruction}`);
  }
  if (plan.placementGuidance.length > 0) {
    console.log();
    console.log(chalk.bold('Placement guidance'));
    for (const instruction of plan.placementGuidance) console.log(`- ${instruction}`);
  }
}

function printLibraryAddResult(result: LibraryAddResult, json = false): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(chalk.bold(`mds library add ${result.id}`));
  console.log(chalk.dim(result.projectPath));
  for (const file of result.writtenFiles) console.log(`${chalk.green('CREATED')} ${file}`);
  for (const file of result.skippedFiles) console.log(`${chalk.gray('SKIPPED')} ${file} (identical)`);
  for (const command of result.executedCommands) console.log(`${chalk.green('RAN')} ${command}`);
  for (const command of result.pendingCommands) console.log(`${chalk.yellow('RUN')} ${command}`);
  if (result.pendingCommands.length > 0) {
    console.log(chalk.yellow('Dependencies were not installed. Run the commands above from the project root.'));
  }
  if (result.plan.integration.length > 0) {
    console.log();
    console.log(chalk.bold('Integration'));
    for (const instruction of result.plan.integration) console.log(`- ${instruction}`);
  }
  if (result.plan.placementGuidance.length > 0) {
    console.log();
    console.log(chalk.bold('Placement guidance'));
    for (const instruction of result.plan.placementGuidance) console.log(`- ${instruction}`);
  }
}

async function confirmLibraryAdd(plan: LibraryAddPlan): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Non-interactive library add requires --yes. Use --dry-run to inspect first.');
  }
  const answer = await confirm({
    message: `Copy ${plan.files.filter((file) => file.action === 'create').length} file(s) and run ${plan.commands.length} dependency command(s)?`,
    initialValue: false,
  });
  return !isCancel(answer) && answer;
}
