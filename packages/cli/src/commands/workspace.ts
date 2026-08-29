import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

import {
  applyWorkspaceAdoption,
  planWorkspaceAdoption,
  workspaceInitializationRequiresSafeWorkingDirectory,
} from '../workspace/adopt.js';
import {
  applyWorkspaceRelocation,
  planWorkspaceRelocation,
  workspaceRelocationRequiresSafeWorkingDirectory,
} from '../workspace/relocate.js';
import { discoverWorkspace } from '../workspace/discover.js';
import { getWorkspaceStatus, workspaceHasUnsafeState } from '../workspace/status.js';

export interface WorkspaceArgv {
  action?: 'discover' | 'status' | 'doctor' | 'adopt' | 'init' | 'relocate';
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
  workspaceParent?: string;
  includeAuxiliary?: string[];
  consolidateLegacyProject?: boolean;
  handoffChild?: boolean;
}

const HANDOFF_BOOTSTRAP = String.raw`
const [parentPidRaw, entry, payload] = process.argv.slice(1);
const parentPid = Number(parentPidRaw);
const config = JSON.parse(payload);
const parentAlive = () => {
  try { process.kill(parentPid, 0); return true; } catch { return false; }
};
const start = () => {
  const child = require('node:child_process').spawn(process.execPath, [entry, ...config.args], {
    cwd: config.cwd,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code ?? 1));
};
const deadline = Date.now() + 15000;
const waitForParent = () => {
  if (!parentAlive() || Date.now() >= deadline) return start();
  setTimeout(waitForParent, 50);
};
waitForParent();
`;

function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function handoffArguments(argv: WorkspaceArgv, sourcePath: string): string[] {
  const args = ['workspace', 'init', sourcePath, '--apply', '--yes', '--handoff-child'];
  if (argv.stash) args.push('--stash');
  if (argv.projectRemote) args.push('--project-remote', argv.projectRemote);
  if (argv.workspaceName) args.push('--workspace-name', argv.workspaceName);
  if (argv.workspaceRoot) args.push('--workspace-root', argv.workspaceRoot);
  if (argv.workspaceParent) args.push('--workspace-parent', argv.workspaceParent);
  for (const auxiliary of argv.includeAuxiliary ?? []) args.push('--include-auxiliary', auxiliary);
  if (argv.consolidateLegacyProject) args.push('--consolidate-legacy-project');
  if (argv.json) args.push('--json');
  return args;
}

function relocationHandoffArguments(argv: WorkspaceArgv, sourcePath: string): string[] {
  const args = ['workspace', 'relocate', sourcePath, '--apply', '--yes', '--handoff-child'];
  if (argv.workspaceParent) args.push('--workspace-parent', argv.workspaceParent);
  for (const auxiliary of argv.includeAuxiliary ?? []) args.push('--include-auxiliary', auxiliary);
  if (argv.json) args.push('--json');
  return args;
}

function launchWorkspaceInitHandoff(argv: WorkspaceArgv, plan: ReturnType<typeof planWorkspaceAdoption>): number {
  const runtimeEntry = process.argv[1];
  if (!runtimeEntry) {
    throw new Error('Cannot start workspace initialization handoff because the CLI runtime is unavailable. Use an installed MDS CLI outside the repository.');
  }
  const entry = path.resolve(runtimeEntry);
  if (!fs.existsSync(entry)) throw new Error('Cannot start workspace initialization handoff because the CLI runtime is unavailable. Use an installed MDS CLI outside the repository.');
  if (plan.worktrees.some((worktree) => !isSamePath(worktree.sourcePath, worktree.targetPath) && isPathInside(entry, worktree.sourcePath))) {
    throw new Error('Cannot start workspace initialization handoff from a CLI runtime inside a worktree that will move. Use an installed MDS CLI or an isolated runner outside the repository.');
  }
  const child = spawn(process.execPath, [
    '-e',
    HANDOFF_BOOTSTRAP,
    String(process.pid),
    entry,
    JSON.stringify({ cwd: path.dirname(plan.workspaceRoot), args: handoffArguments(argv, plan.sourcePath) }),
  ], {
    cwd: path.dirname(plan.workspaceRoot),
    detached: true,
    stdio: 'inherit',
  });
  child.unref();
  if (!child.pid) throw new Error('Unable to start the workspace initialization handoff.');
  return child.pid;
}

function launchWorkspaceRelocationHandoff(argv: WorkspaceArgv, plan: ReturnType<typeof planWorkspaceRelocation>): number {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
  if (!entry || !fs.existsSync(entry) || isPathInside(entry, plan.sourceRoot)) {
    throw new Error('Cannot start workspace relocation handoff from a CLI runtime inside the workspace. Use an installed MDS CLI or an isolated runner.');
  }
  const child = spawn(process.execPath, ['-e', HANDOFF_BOOTSTRAP, String(process.pid), entry, JSON.stringify({
    cwd: path.dirname(plan.targetRoot), args: relocationHandoffArguments(argv, plan.sourceRoot),
  })], { cwd: path.dirname(plan.targetRoot), detached: true, stdio: 'inherit' });
  child.unref();
  if (!child.pid) throw new Error('Unable to start the workspace relocation handoff.');
  return child.pid;
}

function isSamePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
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
      workspaceParent: argv.workspaceParent,
      consolidateLegacyProject: argv.consolidateLegacyProject,
      includeAuxiliary: argv.includeAuxiliary,
    });
    if (argv.apply === true && argv.yes === true && !argv.handoffChild && workspaceInitializationRequiresSafeWorkingDirectory(plan)) {
      const pid = launchWorkspaceInitHandoff(argv, plan);
      console.log(chalk.yellow(`Workspace initialization handed off to a safe helper process (PID ${pid}).`));
      return;
    }
    const applied = argv.apply === true
      ? applyWorkspaceAdoption(plan, { stash: argv.stash, yes: argv.yes, consolidateLegacyProject: argv.consolidateLegacyProject })
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
    console.log(`Retrospective onboarding: ${applied.retrospectiveOnboarding.mode === 'generate' ? 'generate project memory' : 'fill missing project memory'}`);
    console.log(`Evidence: ${applied.retrospectiveOnboarding.evidenceSources.join(', ')}`);
    if (applied.existingProjectMemory.length > 0) {
      console.log();
      console.log('Existing project memory to migrate:');
      for (const file of applied.existingProjectMemory) console.log(`  - ${file}`);
    }
    if (applied.legacyProjectMigration.files.length > 0) {
      console.log();
      console.log('Legacy project consolidation:');
      for (const file of applied.legacyProjectMigration.files) console.log(`  - ${file.status}: ${file.path}`);
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

  if (action === 'relocate') {
    const plan = planWorkspaceRelocation(target, {
      workspaceParent: argv.workspaceParent,
      includeAuxiliary: argv.includeAuxiliary,
    });
    if (argv.apply === true && argv.yes === true && !argv.handoffChild && workspaceRelocationRequiresSafeWorkingDirectory(plan)) {
      const pid = launchWorkspaceRelocationHandoff(argv, plan);
      console.log(chalk.yellow(`Workspace relocation handed off to a safe helper process (PID ${pid}).`));
      return;
    }
    const applied = argv.apply === true ? applyWorkspaceRelocation(plan, { yes: argv.yes }) : plan;
    if (argv.json) { console.log(JSON.stringify({ ...applied, applied: argv.apply === true }, null, 2)); return; }
    console.log(chalk.bold(`MDS workspace ${argv.apply ? 'relocation' : 'relocation plan'}`));
    console.log(`Source: ${applied.sourceRoot}`);
    console.log(`Target: ${applied.targetRoot}`);
    console.log(`Auxiliary directories: ${applied.auxiliaryDirectories.join(', ') || 'none'}`);
    console.log(`Moves: ${applied.moves.length}`);
    for (const warning of applied.warnings) console.log(chalk.yellow(`WARNING ${warning}`));
    for (const error of applied.errors) console.log(chalk.red(`BLOCKED ${error}`));
    console.log(argv.apply ? chalk.green('Workspace relocation applied.') : chalk.dim('Planning only. Re-run with --apply --yes to relocate.'));
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
