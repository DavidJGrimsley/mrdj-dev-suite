#!/usr/bin/env node

import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { fixDoctor, runDoctor } from '@mrdj/doctor';

import type { DoctorCheckResult, DoctorMode, DoctorReport } from '@mrdj/doctor';

interface DoctorArgv {
  path?: string;
  fix?: boolean;
  json?: boolean;
  ci?: boolean;
  full?: boolean;
  fast?: boolean;
  scripts?: boolean;
  timeoutMs?: number;
}

interface ShipArgv {
  branch?: string;
  base?: string;
  feature?: string;
  prTitle?: string;
  execute?: boolean;
}

async function main(): Promise<void> {
  await yargs(hideBin(process.argv))
    .scriptName('mrdj')
    .command(
      'doctor [path]',
      'Run production doctor checks on an Expo project',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Project path to scan',
            type: 'string',
            default: '.',
          })
          .option('fix', {
            describe: 'Pass auto-fix flags to supported project scripts, such as lint --fix',
            type: 'boolean',
            default: false,
          })
          .option('json', {
            describe: 'Print the structured Doctor report as JSON',
            type: 'boolean',
            default: false,
          })
          .option('ci', {
            describe: 'Run the CI-equivalent profile: lint, typecheck, tests, doctor, build',
            type: 'boolean',
            default: false,
          })
          .option('full', {
            describe: 'Run the full profile, including the broadest available build script',
            type: 'boolean',
            default: false,
          })
          .option('fast', {
            describe: 'Run the fast profile: static checks, lint, typecheck',
            type: 'boolean',
            default: false,
          })
          .option('scripts', {
            describe: 'Run package scripts in addition to static checks',
            type: 'boolean',
            default: true,
          })
          .option('timeout-ms', {
            describe: 'Timeout per package script check',
            type: 'number',
            default: 120000,
          }),
      async (argv) => {
        await handleDoctor(argv as DoctorArgv);
      }
    )
    .command(
      'onboard',
      'Print the planned post-create onboarding conversation for new Expo projects',
      () => {},
      async () => {
        printOnboardPlan();
      }
    )
    .command(
      ['test-and-iterate [branch]', 'ship [branch]'],
      'Plan the push, PR, CI polling, fix, and merge-to-test workflow',
      (builder) =>
        builder
          .positional('branch', {
            describe: 'Feature branch to push',
            type: 'string',
          })
          .option('base', {
            describe: 'PR base branch',
            type: 'string',
            default: 'test',
          })
          .option('feature', {
            describe: 'Feature name for generated titles/messages',
            type: 'string',
          })
          .option('pr-title', {
            describe: 'Pull request title',
            type: 'string',
          })
          .option('execute', {
            describe: 'Reserved for the future mutating implementation',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        printShipPlan(argv as ShipArgv);
      }
    )
    .demandCommand()
    .strict()
    .help()
    .parseAsync();
}

async function handleDoctor(argv: DoctorArgv): Promise<void> {
  const mode = resolveDoctorMode(argv);
  const report = argv.fix
    ? await fixDoctor(argv.path ?? '.', {
        mode,
        runScripts: argv.scripts,
        timeoutMs: argv.timeoutMs,
      })
    : await runDoctor(argv.path ?? '.', {
        mode,
        runScripts: argv.scripts,
        timeoutMs: argv.timeoutMs,
      });

  if (argv.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printDoctorReport(report);
  }

  if (report.summary.errors > 0) {
    process.exitCode = 1;
  }
}

function resolveDoctorMode(argv: DoctorArgv): DoctorMode {
  if (argv.full) return 'full';
  if (argv.ci) return 'ci';
  if (argv.fast) return 'fast';
  return 'fast';
}

function printDoctorReport(report: DoctorReport): void {
  console.log(chalk.bold(`mrdj doctor (${report.mode})`));
  console.log(chalk.dim(report.projectPath));
  console.log();

  for (const check of report.checks) {
    printCheck(check);
  }

  console.log();
  console.log(
    [
      chalk.red(`${report.summary.errors} errors`),
      chalk.yellow(`${report.summary.warnings} warnings`),
      chalk.green(`${report.summary.passed} passed`),
      chalk.gray(`${report.summary.skipped} skipped`),
    ].join(' | ')
  );
}

function printCheck(check: DoctorCheckResult): void {
  const label = {
    pass: chalk.green('PASS'),
    warn: chalk.yellow('WARN'),
    error: chalk.red('FAIL'),
    skip: chalk.gray('SKIP'),
  }[check.status];

  console.log(`${label} ${chalk.bold(check.name)}: ${check.message}`);

  if (check.status !== 'pass' && check.details) {
    const detailText = JSON.stringify(check.details, null, 2);
    for (const line of detailText.split('\n')) {
      console.log(chalk.dim(`  ${line}`));
    }
  }
}

function printOnboardPlan(): void {
  console.log(chalk.bold('mrdj onboard'));
  console.log('Post-create onboarding is intentionally agent-led, not a replacement for rn-new.');
  console.log();
  console.log('Planned conversation:');
  console.log('1. Learn the app goal, audience, primary flows, and deployment target.');
  console.log('2. Detect the existing Expo app shape, package manager, router, and styling setup.');
  console.log('3. Ask which MrDJ defaults to add: Uniwind, Zustand, Supabase, Drizzle, API routes.');
  console.log('4. Create project/info.md, project/todo.md, and project/style.md.');
  console.log('5. Add .env.example, CI checks, MCP/Codex/Claude instructions, and starter code only when selected.');
}

function printShipPlan(argv: ShipArgv): void {
  if (argv.execute) {
    console.log(
      chalk.yellow(
        'Mutating ship execution is not implemented yet. This command currently prints the locked workflow.'
      )
    );
    console.log();
  }

  const branch = argv.branch ?? '<current-branch>';
  const base = argv.base ?? 'test';
  const title = argv.prTitle ?? argv.feature ?? '<feature title>';

  console.log(chalk.bold('mrdj ship/test-and-iterate workflow'));
  console.log(`Branch: ${branch}`);
  console.log(`Base: ${base}`);
  console.log(`PR title: ${title}`);
  console.log();
  console.log('1. Run mrdj doctor --ci before touching git.');
  console.log('2. Confirm git status and commit only intentional changes.');
  console.log(`3. Push ${branch} and open or update a PR into ${base} with gh CLI.`);
  console.log('4. Poll PR checks until success or failure.');
  console.log('5. On failure, fetch logs, fix locally, rerun mrdj doctor --ci, push again, and keep polling.');
  console.log(`6. On success, merge into ${base} using the repo's configured strategy.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exit(1);
});
