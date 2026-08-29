import path from 'node:path';

import chalk from 'chalk';

import { applyWorkspaceAdoption, planWorkspaceAdoption } from '../workspace/adopt.js';
import { discoverWorkspace } from '../workspace/discover.js';
import { getWorkspaceStatus, workspaceHasUnsafeState } from '../workspace/status.js';

export interface WorkspaceArgv {
  action?: 'discover' | 'status' | 'doctor' | 'adopt' | 'init';
  path?: string;
  fetch?: boolean;
  json?: boolean;
  dryRun?: boolean;
  apply?: boolean;
  yes?: boolean;
  stash?: boolean;
  projectRemote?: string;
  workspaceName?: string;
  workspaceRoot?: string;
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
  console.log(`Generated: ${result.generatedPath}${result.generatedExists ? '' : ' (not created)'}`);
  if (result.integrityIssues.length > 0) {
    console.log();
    for (const issue of result.integrityIssues) console.log(chalk.red(`  integrity: ${issue}`));
  }
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

  if (action === 'adopt' || action === 'init') {
    const plan = planWorkspaceAdoption(target, {
      projectRemote: argv.projectRemote,
      workspaceName: argv.workspaceName,
      workspaceRoot: argv.workspaceRoot,
    });
    const applied = argv.apply === true
      ? applyWorkspaceAdoption(plan, { stash: argv.stash, yes: argv.yes })
      : plan;
    if (argv.json) {
      console.log(JSON.stringify({ ...applied, applied: argv.apply === true }, null, 2));
      return;
    }

    console.log(chalk.bold(`MDS workspace ${argv.apply ? 'initialization' : 'initialization plan'}`));
    console.log(`Source: ${applied.sourcePath}`);
    console.log(`Workspace: ${applied.workspaceRoot}`);
    console.log(`Project control repo: ${applied.projectPath}`);
    if (applied.projectRemote) {
      const source = applied.projectRemoteSource === 'inferred' ? 'inferred' : 'provided';
      console.log(`Project remote: ${applied.projectRemote} (${source})`);
    }
    console.log(`Normalized main checkout: ${applied.normalizedMainPath}`);
    console.log(`Temp: ${applied.tempPath}`);
    console.log(`Generated: ${applied.generatedPath}`);
    console.log(`Worktrees: ${applied.worktrees.length}`);
    if (applied.existingProjectMemory.length > 0) {
      console.log();
      console.log('Existing project memory to migrate:');
      for (const file of applied.existingProjectMemory) console.log(`  - ${file}`);
    }
    if (applied.warnings.length > 0) {
      console.log();
      for (const warning of applied.warnings) console.log(chalk.yellow(`WARNING ${warning}`));
    }
    if (applied.errors.length > 0) {
      console.log();
      for (const error of applied.errors) console.log(chalk.red(`BLOCKED ${error}`));
    }
    console.log();
    console.log(argv.apply
      ? chalk.green('Workspace initialization applied.')
      : chalk.dim('Planning only. Re-run with --apply --yes to make changes. Use --project-remote <url> to override the inferred control repo.'));
    return;
  }

  const result = getWorkspaceStatus(target, { fetch: argv.fetch ?? false });
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
    if (workspaceHasUnsafeState(result)) {
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
