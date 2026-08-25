import path from 'node:path';

import chalk from 'chalk';

import { planWorkspaceAdoption } from '../workspace/adopt.js';
import { discoverWorkspace } from '../workspace/discover.js';
import { getWorkspaceStatus, workspaceHasUnsafeProjectState } from '../workspace/status.js';

export interface WorkspaceArgv {
  action?: 'discover' | 'status' | 'doctor' | 'adopt';
  path?: string;
  fetch?: boolean;
  json?: boolean;
  dryRun?: boolean;
}

function printWorkspaceStatus(result: ReturnType<typeof getWorkspaceStatus>): void {
  if (!result.found) {
    console.log(chalk.yellow('No MDS workspace found.'));
    console.log(chalk.dim(result.startedFrom));
    return;
  }

  console.log(chalk.bold(`MDS workspace: ${result.name}`));
  console.log(chalk.dim(result.workspaceRoot));
  console.log();
  console.log(`Project: ${result.projectPath}`);
  console.log(`  freshness: ${result.projectGit.freshness}`);
  if (result.projectGit.branch) console.log(`  branch: ${result.projectGit.branch}`);
  if (result.projectGit.warning) console.log(chalk.yellow(`  warning: ${result.projectGit.warning}`));

  for (const repository of result.repositories) {
    console.log();
    console.log(`${repository.config.id}: ${repository.mainPath}`);
    console.log(`  freshness: ${repository.git.freshness}`);
    console.log(`  worktrees: ${repository.worktrees.length}`);
    for (const worktree of repository.worktrees) {
      const branch = worktree.branch ? ` [${worktree.branch}]` : '';
      console.log(`    - ${worktree.path}${branch}`);
    }
  }

  console.log();
  console.log(`Temp: ${result.tempPath}${result.tempExists ? '' : ' (not created)'}`);
}

export async function runWorkspaceCommand(argv: WorkspaceArgv): Promise<void> {
  const action = argv.action ?? 'status';
  const target = path.resolve(argv.path ?? '.');

  if (action === 'discover') {
    const result = discoverWorkspace(target);
    if (argv.json) {
      console.log(JSON.stringify(result ?? null, null, 2));
      return;
    }
    if (!result) {
      console.log(chalk.yellow(`No MDS workspace found from ${target}.`));
      return;
    }
    console.log(chalk.bold(result.manifest.name));
    console.log(`workspace: ${result.workspaceRoot}`);
    console.log(`project: ${result.projectPath}`);
    console.log(`manifest: ${result.manifestPath}`);
    return;
  }

  if (action === 'adopt') {
    const plan = planWorkspaceAdoption(target);
    if (argv.json) {
      console.log(JSON.stringify(plan, null, 2));
      return;
    }

    console.log(chalk.bold('MDS workspace adoption plan'));
    console.log(`Source: ${plan.sourcePath}`);
    console.log(`Workspace: ${plan.workspaceRoot}`);
    console.log(`Project control repo: ${plan.projectPath}`);
    console.log(`Normalized main checkout: ${plan.normalizedMainPath}`);
    console.log(`Temp: ${plan.tempPath}`);
    if (plan.existingProjectMemory.length > 0) {
      console.log();
      console.log('Existing project memory to migrate:');
      for (const file of plan.existingProjectMemory) console.log(`  - ${file}`);
    }
    if (plan.warnings.length > 0) {
      console.log();
      for (const warning of plan.warnings) console.log(chalk.yellow(`WARNING ${warning}`));
    }
    console.log();
    console.log(chalk.dim('Adoption is planning-only in this version; no files or Git repositories were changed.'));
    return;
  }

  const result = getWorkspaceStatus(target, { fetch: argv.fetch ?? true });
  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printWorkspaceStatus(result);
  }

  if (action === 'doctor') {
    if (!result.found) {
      process.exitCode = 1;
      return;
    }
    if (workspaceHasUnsafeProjectState(result)) {
      if (!argv.json) {
        console.log();
        console.log(chalk.red('BLOCKED: project truth is not in a safe synchronized state.'));
      }
      process.exitCode = 1;
      return;
    }
    if (!argv.json) {
      console.log();
      console.log(chalk.green('Workspace project truth is safe for coordination.'));
    }
  }
}
