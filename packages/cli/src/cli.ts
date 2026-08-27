#!/usr/bin/env node

import chalk from 'chalk';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import {
  DEFAULT_DOCTOR_MODE,
  FULL_MODE_GUIDANCE,
  fixDoctor,
  formatModeHelp,
  runDoctor,
} from '@mr.dj2u/doctor';
import { runAgentCommand } from './commands/agent.js';
import { runContinueCommand } from './commands/continue.js';
import { runClearExpoStartCommand, runKillPortCommand } from './commands/dev-tools.js';
import { runEjectExpositionCommand } from './commands/eject.js';
import { runExplainCommand } from './commands/explain.js';
import {
  runLibraryAddCommand,
  runLibraryListCommand,
  runLibraryShowCommand,
} from './commands/library.js';
import { runMcpInstallCommand } from './commands/mcp-install.js';
import { runOnboardCommand } from './commands/onboard.js';
import { runRoadmapCommand } from './commands/roadmap.js';
import { runReportCommand } from './commands/report.js';
import { runSkillsListCommand, runSkillsShowCommand } from './commands/skills.js';
import {
  runStylistEjectCommand,
  runStylistSyncCommand,
} from './commands/stylist.js';
import { runRunCommand } from './commands/run.js';
import { runShipCommand } from './commands/test-and-iterate.js';
import { runWorkspaceCommand } from './commands/workspace.js';

import type { DoctorCheckResult, DoctorMode, DoctorReport } from '@mr.dj2u/doctor';
import type { AgentArgv } from './commands/agent.js';
import type { ContinueArgv } from './commands/continue.js';
import type { ClearExpoStartArgv, KillPortArgv } from './commands/dev-tools.js';
import type { EjectExpositionArgv } from './commands/eject.js';
import type { ExplainArgv } from './commands/explain.js';
import type {
  LibraryAddArgv,
  LibraryListArgv,
  LibraryShowArgv,
} from './commands/library.js';
import type { McpInstallArgv } from './commands/mcp-install.js';
import type { OnboardArgv } from './commands/onboard.js';
import type { RoadmapArgv } from './commands/roadmap.js';
import type { ReportArgv } from './commands/report.js';
import type { RunArgv } from './commands/run.js';
import type { SkillsListArgv, SkillsShowArgv } from './commands/skills.js';
import type { StylistEjectArgv, StylistSyncArgv } from './commands/stylist.js';
import type { ShipArgv } from './commands/test-and-iterate.js';
import type { WorkspaceArgv } from './commands/workspace.js';

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
    .scriptName('mds')
    .command(
      'doctor [path]',
      `Run production doctor checks on an Expo project (default: ${DEFAULT_DOCTOR_MODE})`,
      (builder) =>
        builder
          .epilog(formatModeHelp())
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
            describe: 'Run the CI-equivalent profile: lint, typecheck, tests, Expo Doctor, release build',
            type: 'boolean',
            default: false,
          })
          .option('full', {
            describe: `Run the full profile. ${FULL_MODE_GUIDANCE}`,
            type: 'boolean',
            default: false,
          })
          .option('fast', {
            describe: 'Run the fast profile: static checks plus lint/typecheck; skips tests, Expo Doctor, and builds',
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
          .option('project-shape', {
            describe: 'Onboard one Expo app or discover/register a multi-app workspace',
            choices: ['single-expo-app', 'multi-app-workspace'] as const,
          })
          .option('yes', {
            describe: 'Use default answers and scaffold project memory without prompts',
            type: 'boolean',
            default: false,
          })
          .option('retrospective', {
            describe: 'Create project memory from an existing initialized workspace without app scaffolding',
            type: 'boolean',
            default: false,
          })
          .option('project-only', {
            describe: 'Limit retrospective onboarding to the workspace control repository project memory files',
            type: 'boolean',
            default: false,
          })
          .option('force', {
            describe: 'Overwrite existing project memory files',
            type: 'boolean',
            default: false,
          })
          .option('guidelines-template', {
            describe: 'Copy the bundled MDS project/guidelines.md template',
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
          .option('expo-ui-universal', {
            describe: 'Track Expo UI Universal component usage when Expo UI is selected',
            type: 'boolean',
          })
          .option('expo-native-tabs', {
            describe: 'Track Expo Native Tabs usage for mobile targets',
            type: 'boolean',
          })
          .option('component-strategy-decision', {
            describe:
              'Phase 0 component-strategy decision: leave pending for first-run review or confirm now',
            choices: ['pending', 'confirmed'] as const,
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
          .option('auth-provider', {
            describe: 'Generated MDS auth provider',
            choices: ['none', 'base', 'supabase', 'firebase', 'convex'] as const,
          })
          .option('onboarding-flow', {
            describe: 'Generated onboarding flow',
            choices: ['none', 'multi-screen'] as const,
          })
          .option('legal-document-mode', {
            describe: 'Generated legal document surface',
            choices: ['none', 'public-routes', 'onboarding-agreement'] as const,
          })
          .option('onboarding-completion-mode', {
            describe: 'Where generated onboarding completion should hand off',
            choices: ['enter-app', 'auth', 'account-setup', 'custom'] as const,
          })
          .option('legal-update-gate', {
            describe: 'Gate protected app routes on material legal document updates',
            choices: ['none', 'material-required'] as const,
          })
          .option('test-to-main', {
            describe: 'Generate test-to-main release safeguards and PR checks',
            type: 'boolean',
          })
          .option('app-name', {
            describe: 'App display name',
            type: 'string',
          })
          .option('legal-business-name', {
            describe: 'Business name to personalize generated legal documents',
            type: 'string',
          })
          .option('legal-contact-email', {
            describe: 'Contact email to personalize generated legal documents',
            type: 'string',
          })
          .option('legal-address-or-region-note', {
            describe: 'Address or region note to personalize generated legal documents',
            type: 'string',
          })
          .option('audience', {
            describe: 'Who the app serves',
            type: 'string',
          })
          .option('overview', {
            describe: 'Product overview for project/info.md',
            type: 'string',
          })
          .option('problem-statement', {
            describe: 'Problem statement for project/info.md',
            type: 'string',
          })
          .option('product-goals', {
            describe: 'Product goals for project/info.md',
            type: 'string',
          })
          .option('non-goals', {
            describe: 'Non-goals for project/info.md',
            type: 'string',
          })
          .option('core-flows', {
            describe: 'Primary user flows',
            type: 'string',
          })
          .option('screens', {
            describe: 'Known screens that must be included in planning/implementation',
            type: 'string',
          })
          .option('monetization-strategy', {
            describe: 'Monetization notes for project/info.md',
            type: 'string',
          })
          .option('team-context', {
            describe: 'Team context for project/info.md',
            type: 'string',
          })
          .option('later-scope', {
            describe: 'Later-scope ideas for project/info.md',
            type: 'string',
          })
          .option('research-notes', {
            describe: 'Research and references for project/info.md',
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
          })
          .option('save-defaults', {
            describe:
              'Persist selected onboarding defaults globally for future app generation (interactive runs ask unless this is set)',
            type: 'boolean',
          })
          .option('install', {
            describe:
              'Install newly declared dependencies immediately (disable with --no-install)',
            type: 'boolean',
            default: true,
          }),
      async (argv) => {
        await runOnboardCommand(argv as OnboardArgv);
      }
    )
    .command(
      'workspace <action> [path]',
      'Inspect, validate, or plan adoption of an MDS/I² workspace',
      (builder) =>
        builder
          .positional('action', {
            describe: 'Workspace action',
            choices: ['discover', 'status', 'doctor', 'adopt', 'init', 'relocate'] as const,
          })
          .positional('path', {
            describe: 'Workspace, project, source checkout, or existing repository path',
            type: 'string',
            default: '.',
          })
          .option('fetch', {
            describe: 'Fetch and prune remotes before evaluating freshness',
            type: 'boolean',
            default: false,
          })
          .option('json', {
            describe: 'Print structured JSON output',
            type: 'boolean',
            default: false,
          })
          .option('dry-run', {
            describe: 'Print the workspace migration plan without changing files (default)',
            type: 'boolean',
            default: true,
          })
          .option('apply', {
            describe: 'Apply a workspace initialization plan',
            type: 'boolean',
            default: false,
          })
          .option('yes', {
            describe: 'Confirm the destructive filesystem and Git operations required by --apply',
            type: 'boolean',
            default: false,
          })
          .option('stash', {
            describe: 'Stash dirty worktrees before applying initialization',
            type: 'boolean',
            default: false,
          })
          .option('project-remote', {
            describe: 'Override the workspace project control repository remote; omitted GitHub sources infer/create <repo>-project',
            type: 'string',
          })
          .option('workspace-name', {
            describe: 'Override the name used for normalized worktree folders',
            type: 'string',
          })
          .option('workspace-root', {
            describe: 'Override the target *-i2Workspace directory',
            type: 'string',
          })
          .option('workspace-parent', {
            describe: 'Place the new <repository>-i2Workspace directory in this parent folder',
            type: 'string',
          })
          .option('include-auxiliary', {
            describe: 'Include a direct child auxiliary directory when relocating; repeat for more than one',
            type: 'array',
            string: true,
          })
          .option('consolidate-legacy-project', {
            describe: 'Merge legacy source project files into the control repo and open a source cleanup PR; requires --apply --yes',
            type: 'boolean',
            default: false,
          })
          .option('handoff-child', {
            type: 'boolean',
            default: false,
            hidden: true,
          }),
      async (argv) => {
        await runWorkspaceCommand(argv as WorkspaceArgv);
      }
    )
    .command(
      'roadmap [path]',
      'Propose roadmap additions from normalized project/info.md without rewriting existing TODO items',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Onboarded app path',
            type: 'string',
            default: '.',
          })
          .option('json', {
            describe: 'Print the structured roadmap proposal as JSON',
            type: 'boolean',
            default: false,
          })
          .option('append', {
            describe: 'Append only new, reviewed roadmap checkbox rows to --phase; never rebuild or reorder the existing TODO',
            type: 'boolean',
            default: false,
          })
          .option('phase', {
            describe: 'Existing Phase number required with --append, such as --phase 2',
            type: 'number',
          }),
      async (argv) => {
        await runRoadmapCommand(argv as RoadmapArgv);
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
      'run <tool> [path]',
      'Run an MDS-integrated developer tool (react-doctor)',
      (builder) =>
        builder
          .positional('tool', {
            describe: 'Tool to run',
            choices: ['react-doctor'] as const,
          })
          .positional('path', {
            describe: 'Project path',
            type: 'string',
            default: '.',
          })
          .option('force', {
            describe: 'Run even when React Doctor is disabled via env or package.json',
            type: 'boolean',
            default: false,
          })
          .option('json', {
            describe: 'Pass --json through to react-doctor',
            type: 'boolean',
            default: false,
          })
          .option('json-out', {
            describe: 'Pass --json-out through to react-doctor',
            type: 'string',
          })
          .option('verbose', {
            describe: 'Pass --verbose through to react-doctor',
            type: 'boolean',
            default: false,
          })
          .option('project', {
            describe: 'Workspace package name(s) or directories for react-doctor --project',
            type: 'string',
          })
          .option('blocking', {
            describe: 'Pass --blocking through to react-doctor',
            choices: ['error', 'warning', 'none'] as const,
          }),
      async (argv) => {
        await runRunCommand(argv as RunArgv);
      }
    )
    .command(
      'free-port [ports..]',
      'Free one or more local ports by stopping listening processes',
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
      'clear-expo-start [path]',
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
      'stylist sync [path]',
      'Sync canonical stylist tokens and style-library-specific outputs',
      (builder) =>
        builder
          .positional('path', {
            describe: 'Project path',
            type: 'string',
            default: '.',
          })
          .option('input-file', {
            describe: 'Path to a JSON theme payload',
            type: 'string',
          })
          .option('input-json', {
            describe: 'Inline JSON theme payload',
            type: 'string',
          })
          .option('json', {
            describe: 'Print sync result as JSON',
            type: 'boolean',
            default: false,
          })
          .option('style-library', {
            describe: 'Style library adapter (auto-detected by default)',
            choices: [
              'auto',
              'uniwind',
              'nativewind',
              'nativewindui',
              'unistyles',
              'restyle',
              'tamagui',
              'stylesheet',
            ] as const,
            default: 'auto' as const,
          })
          .option('write-policy', {
            describe: 'How stylist manages style-library files',
            choices: ['managed', 'overwrite'] as const,
          }),
      async (argv) => {
        await runStylistSyncCommand(argv as StylistSyncArgv);
      }
    )
    .command(
      'eject [targetOrPath] [path]',
      'Review and eject generated artifacts that should not ship',
      (builder) =>
        builder
          .positional('targetOrPath', {
            describe: 'Ejection target (exposition or stylist) or project path',
            type: 'string',
          })
          .positional('path', {
            describe: 'Project path when target is exposition or stylist',
            type: 'string',
          })
          .option('keep', {
            describe:
              'Comma-separated inventory items to retain (for example onboarding,settings,create-expo-app)',
            type: 'string',
          })
          .option('from-memory', {
            describe: 'Retain items selected in project memory and eject the rest',
            type: 'boolean',
            default: false,
          })
          .option('all', {
            describe: 'Remove all generated sections and keep nothing',
            type: 'boolean',
            default: false,
          })
          .option('json', {
            describe: 'Print eject result as JSON',
            type: 'boolean',
            default: false,
          })
          .option('style-library', {
            describe: 'Style library adapter for stylist ejection',
            choices: [
              'auto',
              'uniwind',
              'nativewind',
              'nativewindui',
              'unistyles',
              'restyle',
              'tamagui',
              'stylesheet',
            ] as const,
            default: 'auto' as const,
          })
          .option('write-policy', {
            describe: 'How stylist manages style-library files',
            choices: ['managed', 'overwrite'] as const,
          }),
      async (argv) => {
        const targetOrPath = typeof argv.targetOrPath === 'string' ? argv.targetOrPath : undefined;
        const target =
          targetOrPath === 'stylist' || targetOrPath === 'exposition' ? targetOrPath : 'exposition';
        const projectPath = targetOrPath === target ? argv.path : (targetOrPath ?? argv.path);

        if (target === 'stylist') {
          await runStylistEjectCommand({
            ...(argv as StylistEjectArgv),
            path: projectPath,
          });
          return;
        }

        await runEjectExpositionCommand({
          ...(argv as EjectExpositionArgv),
          path: projectPath,
        });
      }
    )
    .command(
      'stylist eject [path]',
      false,
      () => undefined,
      async () => {
        throw new Error('`mds stylist eject` was removed. Use `mds eject stylist [path]`.');
      }
    )
    .command(
      'stylist reconcile-output [path]',
      false,
      () => undefined,
      async () => {
        throw new Error(
          '`mds stylist reconcile-output` was removed. Use `mds eject stylist [path]` or `mds eject exposition [path]`.'
        );
      }
    )
    .command(
      'mcp install',
      'Register the MDS MCP server with Claude Code, Codex, or Cursor',
      (builder) =>
        builder
          .option('client', {
            describe: 'MCP host to configure',
            choices: ['claude', 'codex', 'cursor', 'vscode'] as const,
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
            describe: 'Absolute path to a built MCP server entry (explicit local development override)',
            type: 'string',
          })
          .option('command', {
            describe: 'Full command to launch the server (explicit local development override)',
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
      'agent <action>',
      'Install or verify MDS agent assets for VS Code Copilot, Claude Code, or Codex',
      (builder) =>
        builder
          .positional('action', {
            describe: 'Agent command',
            choices: ['install', 'verify'] as const,
          })
          .option('client', {
            describe: 'Agent host to configure',
            choices: ['vscode', 'claude', 'codex'] as const,
            default: 'vscode' as const,
          })
          .option('scope', {
            describe: 'Install for the current user or just the target project',
            choices: ['user', 'project'] as const,
          })
          .option('target', {
            describe: 'Project directory for project-scope install or verify',
            type: 'string',
            default: '.',
          })
          .option('server-path', {
            describe: 'Absolute path to a built MCP server entry (explicit local development override)',
            type: 'string',
          })
          .option('command', {
            describe: 'Full command to launch the server (explicit local development override)',
            type: 'string',
          })
          .option('bundle-path', {
            describe: 'Path to the generated client bundle',
            type: 'string',
          })
          .option('dry-run', {
            describe: 'Print the files/commands that would be written instead of writing them',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        await runAgentCommand(argv as AgentArgv);
      }
    )
    .command(
      'library <action> [id] [path]',
      'Browse or safely restore reusable MDS Library source',
      (builder) =>
        builder
          .positional('action', {
            describe: 'Library command',
            choices: ['list', 'show', 'add'] as const,
          })
          .positional('id', {
            describe: 'Namespaced library item id',
            type: 'string',
          })
          .positional('path', {
            describe: 'Target Expo project path',
            type: 'string',
            default: '.',
          })
          .option('query', {
            alias: 'q',
            describe: 'Search ids, names, descriptions, tags, and categories',
            type: 'string',
          })
          .option('kind', {
            describe: 'Filter list results by library item kind',
            choices: ['component', 'animation', 'screen', 'flow', 'integration'] as const,
          })
          .option('source', {
            describe: 'Filter list results by source catalog',
            choices: ['mds', 'create-expo-app', 'create-expo-stack', 'nativewindui', 'swmansion'] as const,
          })
          .option('compatible', {
            describe: 'Show only list results compatible with the current Expo project',
            type: 'boolean',
            default: false,
          })
          .option('dry-run', {
            describe: 'Preflight and print the add plan without writing files',
            type: 'boolean',
            default: false,
          })
          .option('variant', {
            describe: 'Resolve a specific library item variant',
            type: 'string',
          })
          .option('placement', {
            describe: 'Record where this library item should be surfaced or wired in',
            type: 'string',
          })
          .option('target', {
            describe: 'Relative registered app path to receive generated library files',
            type: 'string',
          })
          .option('yes', {
            alias: 'y',
            describe: 'Confirm the preflighted add without prompting',
            type: 'boolean',
            default: false,
          })
          .option('install', {
            describe: 'Install missing dependencies (disable with --no-install)',
            type: 'boolean',
            default: true,
          })
          .option('json', {
            describe: 'Print the add plan or result as JSON',
            type: 'boolean',
            default: false,
          }),
      async (argv) => {
        const action = String(argv.action);
        if (action === 'list') {
          await runLibraryListCommand(argv as LibraryListArgv);
          return;
        }
        if (action === 'show') {
          await runLibraryShowCommand(argv as LibraryShowArgv);
          return;
        }
        await runLibraryAddCommand(argv as LibraryAddArgv);
      }
    )
    .command(
      'skills <action> [id]',
      'List or show bundled MDS agent skills',
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
      'Generate a local Doctor-backed project report or pre-release developer-copy report',
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
          .option('kind', {
            describe: 'doctor for health checks, content for leftover placeholder copy, or all',
            choices: ['doctor', 'content', 'all'] as const,
            default: 'doctor' as const,
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
      ['test-and-iterate [branch]', 'ship [branch]', 'push-merge-loop [branch]'],
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
  const selectedModes = [argv.full, argv.ci, argv.fast].filter(Boolean).length;
  if (selectedModes > 1) {
    throw new Error('Choose only one Doctor mode flag: --fast, --ci, or --full.');
  }
  if (argv.full) return 'full';
  if (argv.ci) return 'ci';
  if (argv.fast) return 'fast';
  return DEFAULT_DOCTOR_MODE;
}

function printDoctorReport(report: DoctorReport): void {
  const selection = report.selection ?? {
    defaultMode: 'fast',
    runScripts: false,
    description: 'No selection metadata available.',
    fullModeGuidance: '',
  };

  console.log(chalk.bold(`mds doctor (${report.mode})`));
  console.log(chalk.dim(report.projectPath));
  console.log(chalk.dim(`mode: ${selection.description}`));
  console.log(chalk.dim(`default: ${selection.defaultMode}`));
  console.log(chalk.dim(`scripts: ${selection.runScripts ? 'enabled' : 'disabled'}`));
  console.log(chalk.dim(`full mode: ${selection.fullModeGuidance}`));
  console.log();

  for (const check of report.checks) {
    printCheck(check);
  }

  console.log();
  console.log(
    [
      chalk.cyan(`score ${report.summary.score}/100`),
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
