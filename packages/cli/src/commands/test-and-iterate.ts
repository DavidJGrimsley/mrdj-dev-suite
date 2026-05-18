import { spawn } from 'node:child_process';

import chalk from 'chalk';

import { runDoctor } from '@mds/doctor';

export interface ShipArgv {
  branch?: string;
  base?: string;
  feature?: string;
  prTitle?: string;
  execute?: boolean;
}

interface CommandOutput {
  code: number | null;
  stdout: string;
  stderr: string;
}

export async function runShipCommand(argv: ShipArgv): Promise<void> {
  const base = argv.base ?? 'test';
  const branch = argv.branch ?? (await detectCurrentBranch()) ?? '<current-branch>';
  const title = argv.prTitle ?? argv.feature ?? branch;

  console.log(chalk.bold('mds ship/test-and-iterate workflow'));
  console.log(`Branch: ${branch}`);
  console.log(`Base: ${base}`);
  console.log(`PR title: ${title}`);
  console.log();

  const status = await runCommand('git', ['status', '--short']);
  const remote = await runCommand('git', ['remote', 'get-url', 'origin']);
  const existingPr = await findExistingPr(branch);

  console.log(chalk.bold('Repository snapshot'));
  console.log(status.stdout.trim() ? status.stdout.trim() : 'Working tree is clean.');
  console.log(`origin: ${remote.stdout.trim() || 'not detected'}`);
  console.log(`existing PR: ${existingPr || 'not detected'}`);
  console.log();

  if (!argv.execute) {
    printDryRun(branch, base, title);
    return;
  }

  console.log(chalk.bold('Execute gate enabled'));
  console.log('Running mds doctor --ci before any git mutation.');
  const report = await runDoctor('.', { mode: 'ci' });
  console.log(
    `${report.summary.errors} errors | ${report.summary.warnings} warnings | ` +
      `${report.summary.passed} passed | ${report.summary.skipped} skipped`
  );

  if (report.summary.errors > 0) {
    process.exitCode = 1;
    console.log(chalk.red('Doctor failed. Fix errors before staging, pushing, or opening a PR.'));
    return;
  }

  console.log();
  console.log('Doctor passed. Mutating git steps remain intentionally manual in Phase 1:');
  printDryRun(branch, base, title);
}

function printDryRun(branch: string, base: string, title: string): void {
  console.log(chalk.bold('Planned steps'));
  console.log('1. Run mds doctor --ci.');
  console.log('2. Review git status and stage only intentional changes.');
  console.log(`3. Commit changes for "${title}".`);
  console.log(`4. Push ${branch}.`);
  console.log(`5. Open or update a PR into ${base} with gh CLI.`);
  console.log('6. Poll statusCheckRollup, fix failures, rerun Doctor, and push again.');
  console.log(`7. Merge into ${base} only after checks pass.`);
}

async function detectCurrentBranch(): Promise<string | null> {
  const result = await runCommand('git', ['branch', '--show-current']);
  return result.code === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

async function findExistingPr(branch: string): Promise<string | null> {
  if (branch.startsWith('<')) {
    return null;
  }

  const result = await runCommand('gh', [
    'pr',
    'view',
    branch,
    '--json',
    'number,url,state',
    '--template',
    '{{.number}} {{.state}} {{.url}}',
  ]);

  return result.code === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

function runCommand(command: string, args: string[]): Promise<CommandOutput> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

