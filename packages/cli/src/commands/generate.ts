/**
 * CLI command: mds generate
 *
 * Implements plan -> validate -> execute generation workflow with approval validation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import {
  ApprovalRequiredError,
  DEFAULT_FRAMEWORK_ID,
  FrameworkError,
  getFrameworkAdapterRegistry,
  type FrameworkId,
  type GenerationPlan,
  type PlatformTarget,
} from '../generator.js';

export interface GeneratePlanArgv {
  framework?: string;
  name?: string;
  target?: string;
  template?: string;
  bundleId?: string;
  out?: string;
  optionsFile?: string;
  projectIdentity?: string;
  platforms?: string;
  json?: boolean;
}

export interface GenerateValidateArgv {
  planFile: string;
  json?: boolean;
}

export interface GenerateRunArgv {
  planFile: string;
  approvedDigest?: string;
  dryRun?: boolean;
  json?: boolean;
}

export async function runGeneratePlanCommand(argv: GeneratePlanArgv): Promise<void> {
  const registry = getFrameworkAdapterRegistry();
  const frameworkId = (argv.framework || DEFAULT_FRAMEWORK_ID) as FrameworkId;
  const fileOptions = argv.optionsFile ? JSON.parse(readFileSync(path.resolve(argv.optionsFile),'utf8')) as Record<string, unknown> : {};
  // `standalone` is the user-facing name of the explicit distinct-project opt-out.
  const flagIdentity = argv.projectIdentity === 'standalone' ? 'distinct-project' : argv.projectIdentity;
  if (flagIdentity && fileOptions.projectIdentity && fileOptions.projectIdentity !== flagIdentity) {
    throw new Error('--project-identity conflicts with projectIdentity in --options-file');
  }
  const options = flagIdentity || Object.keys(fileOptions).length > 0 ? { ...fileOptions, ...(flagIdentity ? { projectIdentity: flagIdentity } : {}) } : undefined;
  const targetDirectory = argv.target || '.';
  // The default identity creates a new i2 workspace whose root is `<app>-i2Workspace`.
  const newWorkspace = (options?.projectIdentity ?? 'new-workspace') === 'new-workspace';
  const targetName = path.basename(path.resolve(targetDirectory));
  const appName = argv.name || (newWorkspace ? targetName.replace(/-i2Workspace$/i, '') : targetName);

  const plan = await registry.planGeneration({
    frameworkId,
    appName,
    targetDirectory,
    templateId: argv.template,
    bundleId: argv.bundleId,
    platforms: argv.platforms ? argv.platforms.split(',').map(p => p.trim()).filter(Boolean) as PlatformTarget[] : undefined,
    options,
  });

  if (argv.out) {
    const outPath = path.resolve(argv.out);
    const outDir = path.dirname(outPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n', {encoding:'utf8',flag:'wx'});
    if (!argv.json) console.log(chalk.green(`\nGeneration plan written to: ${argv.out}`));
  }

  if (argv.json) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  console.log(chalk.bold('\nGeneration Plan Created:\n'));
  console.log(`• Framework: ${chalk.cyan(plan.frameworkId)}`);
  console.log(`• Template: ${chalk.cyan(plan.templateId)}`);
  console.log(`• App Name: ${chalk.cyan(plan.appName)}`);
  console.log(`• Target Directory: ${chalk.cyan(plan.targetDirectory)}`);
  console.log(`• Platforms: ${plan.targetPlatforms.join(', ')}`);
  console.log(`• Pinned Commit: ${plan.pinnedRevision.commit}`);
  console.log(`• Project identity: ${chalk.cyan(plan.projectMemory?.mode ?? 'unknown')}`);
  if (plan.workspace) {
    console.log(`• New workspace root: ${chalk.cyan(plan.workspace.root)}`);
    console.log(`• Source main checkout: ${plan.workspace.sourcePath}`);
    console.log(`• Control repository (canonical memory): ${plan.workspace.projectPath}`);
    console.log(chalk.dim('  Remotes are local bare repositories under temp/local-remotes; nothing is published.'));
  }
  console.log(`\n${chalk.bold.yellow('Approval Plan Digest:')} ${chalk.bold.green(plan.planDigest)}\n`);
  console.log(
    chalk.dim(
      `To execute generation, run:\n  mds generate run ${argv.out || '<plan-file>'} --approved-digest ${plan.planDigest}\n`
    )
  );
}

export async function runGenerateValidateCommand(argv: GenerateValidateArgv): Promise<void> {
  const planPath = path.resolve(argv.planFile);
  if (!existsSync(planPath)) {
    throw new FrameworkError({
      code: 'EXECUTION_FAILED',
      message: `Plan file "${planPath}" does not exist.`,
      actionableFix: 'Create a plan first with `mds generate plan`.',
    });
  }

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as GenerationPlan;
  const registry = getFrameworkAdapterRegistry();
  const validation = await registry.validatePlan(plan);

  if (argv.json) {
    console.log(JSON.stringify(validation, null, 2));
    return;
  }

  console.log(chalk.bold(`\nPlan Validation: ${validation.valid ? chalk.green('VALID') : chalk.red('INVALID')}\n`));
  console.log(`Plan Digest: ${validation.planDigest}\n`);

  if (validation.errors.length > 0) {
    console.log(chalk.red('Errors:'));
    for (const err of validation.errors) {
      console.log(`  ✗ ${err}`);
    }
  }
  if (validation.warnings.length > 0) {
    console.log(chalk.yellow('Warnings:'));
    for (const warn of validation.warnings) {
      console.log(`  ! ${warn}`);
    }
  }
  console.log();
}

export async function runGenerateRunCommand(argv: GenerateRunArgv): Promise<void> {
  const planPath = path.resolve(argv.planFile);
  if (!existsSync(planPath)) {
    throw new FrameworkError({
      code: 'EXECUTION_FAILED',
      message: `Plan file "${planPath}" does not exist.`,
      actionableFix: 'Provide a valid generation plan file.',
    });
  }

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as GenerationPlan;
  const registry = getFrameworkAdapterRegistry();

  if (!argv.approvedDigest) {
    throw new ApprovalRequiredError(plan.planDigest, { planFile: planPath });
  }

  if (!argv.json) console.log(chalk.dim(`Executing generation for ${plan.appName} (${plan.frameworkId})…`));

  const result = await registry.generate(plan, {
    approvedPlanDigest: argv.approvedDigest,
    dryRun: argv.dryRun,
    ...(argv.json ? {} : { progressReporter: (event) => {
      console.log(`  [${event.type}] ${event.message}`);
    } }),
  });

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.bold.green(`\nGeneration completed successfully!\n`));
  console.log(`Target: ${result.targetDirectory}`);
  console.log(`Created files: ${result.createdPaths.length}`);
  console.log(`Verification: ${result.handoff.verificationStatus}`);
  console.log(`Next step: ${result.handoff.recommendedNextSession}\n`);
}
