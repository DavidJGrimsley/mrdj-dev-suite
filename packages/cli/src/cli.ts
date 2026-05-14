#!/usr/bin/env node

import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { fixDoctor, runDoctor } from '@mrdj/doctor';
import { runContinueCommand } from './commands/continue.js';
import { runClearExpoStartCommand, runKillPortCommand } from './commands/dev-tools.js';
import { runExplainCommand } from './commands/explain.js';
import { runMcpInstallCommand } from './commands/mcp-install.js';
import { runOnboardCommand } from './commands/onboard.js';
import { runReportCommand } from './commands/report.js';
import { runSkillsListCommand, runSkillsShowCommand } from './commands/skills.js';
import { runShipCommand } from './commands/test-and-iterate.js';

import type { DoctorCheckResult, DoctorMode, DoctorReport } from '@mrdj/doctor';
import type { ContinueArgv } from './commands/continue.js';
import type { ClearExpoStartArgv, KillPortArgv } from './commands/dev-tools.js';
import type { ExplainArgv } from './commands/explain.js';
import type { McpInstallArgv } from './commands/mcp-install.js';
import type { OnboardArgv } from './commands/onboard.js';
import type { ReportArgv } from './commands/report.js';
import type { SkillsListArgv, SkillsShowArgv } from './commands/skills.js';
import type { ShipArgv } from './commands/test-and-iterate.js';

export interface DoctorArgv {
  path?: string;
  fix?: boolean;
  json?: boolean;
  ci?: boolean;
  full?: boolean;
  fast?: boolean;
  scripts?: boolean;
  timeoutMs?: number;
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
      ['onboard', 'init'],
      'Run post-create onboarding for a new Expo project',
      (builder) =>
        builder
          .option('project', {
            describe: 'Project path to onboard',
            type: 'string',
            default: '.',
          })
          .option('yes', {
            describe: 'Use default answers and scaffold project memory without prompts',
            type: 'boolean',
            default: false,
          })
          .option('force', {
            describe: 'Overwrite existing project memory files',
            type: 'boolean',
            default: false,
          })
          .option('guidelines-template', {
            describe: 'Copy the bundled MrDJ project/guidelines.md template',
            type: 'boolean',
            default: false,
          })
          .option('guidelines-template-path', {
            describe: 'Copy a custom guidelines.md template file',
            type: 'string',
          })
          .option('rich', {
            describe: 'Add rich boilerplate, package examples, scripts, and agent instructions',
            type: 'boolean',
          })
          .option('advanced-setup', {
            describe: 'Add advanced setup for installed packages',
            type: 'boolean',
          })
          .option('create-expo-components', {
            describe: 'Track whether starter create-expo-app components should be kept',
            type: 'boolean',
          })
          .option('latest-expo-sdk', {
            describe: 'Track whether the project should prefer the latest Expo SDK',
            type: 'boolean',
          })
          .option('platforms', {
            describe: 'Comma-separated target platforms: web, android, ios, apple-tv',
            type: 'string',
          })
          .option('first-platform', {
            describe: 'First MVP platform',
            type: 'string',
          })
          .option('platform-strategy', {
            describe: 'Platform-specific organization style',
            choices: ['folders', 'files-only'] as const,
          })
          .option('app-directory', {
            describe: 'Where Expo Router app routes should live',
            choices: ['src', 'root'] as const,
          })
          .option('platform-layouts', {
            describe: 'Whether selected platforms share layouts or need platform-specific layouts',
            choices: ['shared', 'platform-specific'] as const,
          })
          .option('web-output', {
            describe: 'Expo web output mode',
            choices: ['static', 'server', 'spa', 'none'] as const,
          })
          .option('deployed-server', {
            describe: 'Deployed server expectation',
            choices: ['standard-expo', 'custom', 'none'] as const,
          })
          .option('expo-ui', {
            describe: 'Track Expo UI usage for mobile targets',
            type: 'boolean',
          })
          .option('expo-native-tabs', {
            describe: 'Track Expo Native Tabs usage for mobile targets',
            type: 'boolean',
          })
          .option('eas-selected', {
            describe: 'Ask/store EAS usage choices',
            type: 'boolean',
          })
          .option('eas-uses', {
            describe: 'Comma-separated EAS uses',
            type: 'string',
          })
          .option('data-start', {
            describe: 'Initial data mode',
            choices: ['local', 'supabase'] as const,
          })
          .option('test-to-main', {
            describe: 'Generate test-to-main release safeguards and PR checks',
            type: 'boolean',
          })
          .option('app-name', {
            describe: 'App display name',
            type: 'string',
          })
          .option('audience', {
            describe: 'Who the app serves',
            type: 'string',
          })
          .option('core-flows', {
            describe: 'Primary user flows',
            type: 'string',
          })
          .option('data-needs', {
            describe: 'Expected data/backend needs',
            type: 'string',
          })
          .option('deployment-target', {
            describe: 'Deployment target',
            type: 'string',
          })
          .option('defaults', {
            describe: 'Comma-separated defaults to include',
            type: 'string',
          })
          .option('expo-server-adapter', {
            describe: 'How the Expo Router server is hosted: eas, express, bun, other, none',
            choices: ['eas', 'express', 'bun', 'other', 'none'] as const,
          })
          .option('custom-backend', {
            describe: 'Project has a separate backend API server alongside Expo',
            type: 'boolean',
          })
          .option('custom-backend-entry', {
            describe: 'Entry point for the custom backend server (e.g. server.js, api-server.ts)',
            type: 'string',
          }),
      async (argv) => {
        await runOnboardCommand(argv as OnboardArgv);
      }
    )
    .command(
      'continue [path]',
      'Inspect an onboarded app and propose the next MDS session plan',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Onboarded app path',
            type: 'string',
            default: '.',
          })
          .option('json', {
            describe: 'Print the MDS Continue session brief as JSON',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        await runContinueCommand(argv as ContinueArgv);
      }
    )
    .command(
      ['kill-port [ports..]', 'killport [ports..]', 'Kill-Port [ports..]'],
      'Kill processes listening on one or more local ports',
      (builder) =>
        builder
          .positional('ports', {
            describe: 'Ports to kill',
            type: 'string',
            array: true,
            default: ['8081'],
          })
          .option('port', {
            describe: 'Additional port values',
            type: 'string',
            array: true,
          }),
      async (argv) => {
        await runKillPortCommand(argv as KillPortArgv);
      }
    )
    .command(
      ['clear-expo-start [path]', 'clean-start [path]'],
      'Kill Expo/server ports, clear local caches, and start Expo with --clear',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Project path',
            type: 'string',
            default: '.',
          })
          .option('ports', {
            describe: 'Comma-separated ports to kill before starting',
            type: 'string',
          })
          .option('start', {
            describe: 'Start Expo after clearing caches',
            type: 'boolean',
            default: true,
          }),
      async (argv) => {
        await runClearExpoStartCommand(argv as ClearExpoStartArgv);
      }
    )
    .command(
      'mcp install',
      'Register the MrDJ MCP server with Claude Code, Codex, or Cursor',
      (builder) =>
        builder
          .option('client', {
            describe: 'MCP host to configure',
            choices: ['claude', 'codex', 'cursor'] as const,
            default: 'claude' as const,
          })
          .option('scope', {
            describe: 'Install for the current user (every workspace) or just the target project',
            choices: ['user', 'project'] as const,
            default: 'user' as const,
          })
          .option('target', {
            describe: 'Project directory for --scope project (ignored for --scope user)',
            type: 'string',
            default: '.',
          })
          .option('server-path', {
            describe: 'Absolute path to the built MCP server entry (overrides auto-detect)',
            type: 'string',
          })
          .option('command', {
            describe: 'Full command to launch the server (overrides server-path and npx fallback)',
            type: 'string',
          })
          .option('dry-run', {
            describe: 'Print the config that would be written instead of writing it',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        await runMcpInstallCommand(argv as McpInstallArgv);
      }
    )
    .command(
      'skills <action> [id]',
      'List or show bundled MrDJ agent skills',
      (builder) =>
        builder
          .positional('action', {
            describe: 'Skill command',
            choices: ['list', 'show'] as const,
          })
          .positional('id', {
            describe: 'Skill id',
            type: 'string',
          })
          .option('query', {
            alias: 'q',
            describe: 'Filter skills by id, name, description, or tag',
            type: 'string',
          })
          .option('json', {
            describe: 'Print JSON output',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        const action = String(argv.action);
        if (action === 'list') {
          await runSkillsListCommand(argv as SkillsListArgv);
          return;
        }
        await runSkillsShowCommand(argv as SkillsShowArgv);
      }
    )
    .command(
      'explain <topic>',
      'Explain a Doctor check or bundled knowledge topic',
      (builder) =>
        builder
          .positional('topic', {
            describe: 'Doctor check name, knowledge id, or keyword',
            type: 'string',
          })
          .option('json', {
            describe: 'Print the explanation result as JSON',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        await runExplainCommand(argv as ExplainArgv);
      }
    )
    .command(
      'report [path]',
      'Generate a local Doctor-backed project report',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Project path to scan',
            type: 'string',
            default: '.',
          })
          .option('mode', {
            describe: 'Doctor mode',
            choices: ['fast', 'ci', 'full'] as const,
            default: 'fast' as const,
          })
          .option('scripts', {
            describe: 'Run package scripts in addition to static checks',
            type: 'boolean',
            default: true,
          })
          .option('json', {
            describe: 'Print the structured Doctor report as JSON instead of Markdown',
            type: 'boolean',
            default: false,
          })
          .option('output', {
            alias: 'o',
            describe: 'Write the report to a file instead of stdout',
            type: 'string',
          })
          .option('timeout-ms', {
            describe: 'Timeout per package script check',
            type: 'number',
            default: 120000,
          }),
      async (argv) => {
        await runReportCommand(argv as ReportArgv);
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
        await runShipCommand(argv as ShipArgv);
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

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(message));
  process.exit(1);
});
