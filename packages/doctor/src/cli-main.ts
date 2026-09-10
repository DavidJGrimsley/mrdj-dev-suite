import { formatHumanReport, formatModeHelp, runDoctor } from './index.js';
import type { DoctorMode } from './types.js';

export interface DoctorCliRunResult {
  output: string;
  exitCode: number;
}

export interface DoctorCliArgs {
  projectPath: string;
  mode: DoctorMode;
  json: boolean;
  help: boolean;
  runScripts: boolean;
  timeoutMs: number;
  target?: string;
}

export function parseDoctorCliArgs(argv: string[]): DoctorCliArgs {
  let projectPath = '.';
  let mode: DoctorMode | null = null;
  let json = false;
  let help = false;
  let runScripts = true;
  let timeoutMs = 120_000;
  let target: string | undefined;
  let modeFlagCount = 0;

  const positionals: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? '';
    if (!arg) {
      continue;
    }

    if (!arg.startsWith('-')) {
      positionals.push(arg);
      continue;
    }

    if (arg === '--ci') {
      modeFlagCount += 1;
      mode = 'ci';
      continue;
    }
    if (arg === '--fast') {
      modeFlagCount += 1;
      mode = 'fast';
      continue;
    }
    if (arg === '--full') {
      modeFlagCount += 1;
      mode = 'full';
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--scripts') {
      runScripts = true;
      continue;
    }
    if (arg === '--no-scripts') {
      runScripts = false;
      continue;
    }
    if (arg === '--timeout-ms') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--timeout-ms requires a numeric value.');
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--timeout-ms must be a positive number; got ${value}.`);
      }
      timeoutMs = Math.floor(parsed);
      index += 1;
      continue;
    }
    if (arg === '--target') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--target requires a relative package path.');
      }
      target = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (positionals.length > 1) {
    throw new Error(`Unexpected extra arguments: ${positionals.slice(1).join(' ')}`);
  }
  if (modeFlagCount > 1) {
    throw new Error('Choose only one Doctor mode flag: --fast, --ci, or --full.');
  }
  if (positionals.length === 1) {
    projectPath = positionals[0] ?? '.';
  }

  return {
    projectPath,
    mode: mode ?? 'ci',
    json,
    help,
    runScripts,
    timeoutMs,
    target,
  };
}

export async function runDoctorCli(argv: string[]): Promise<DoctorCliRunResult> {
  const args = parseDoctorCliArgs(argv);
  if (args.help) {
    return {
      output: formatDoctorCliHelp(),
      exitCode: 0,
    };
  }

  const report = await runDoctor(args.projectPath, {
    mode: args.mode,
    runScripts: args.runScripts,
    timeoutMs: args.timeoutMs,
    selectionDefaultMode: 'ci',
    target: args.target,
  });

  return {
    output: args.json ? JSON.stringify(report, null, 2) : formatHumanReport(report),
    exitCode: report.summary.errors > 0 ? 1 : 0,
  };
}

function formatDoctorCliHelp(): string {
  return [
    'Usage: mds-doctor [projectPath] [--target packagePath] [--fast|--ci|--full] [--json] [--no-scripts] [--timeout-ms value]',
    '',
    formatModeHelp('ci'),
  ].join('\n');
}
