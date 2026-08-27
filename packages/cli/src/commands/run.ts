import { spawn } from 'node:child_process';
import path from 'node:path';

import chalk from 'chalk';

import {
  buildReactDoctorCommandInvocation,
  isMonorepoWorkspaceRoot,
  resolveReactDoctorDisabled,
  type ReactDoctorCommandInvocation,
} from '../react-doctor.js';
import { resolveStructuredCommandInvocation } from './dev-tools.js';

export interface RunArgv {
  tool?: string;
  path?: string;
  force?: boolean;
  json?: boolean;
  verbose?: boolean;
  project?: string;
  blocking?: 'error' | 'warning' | 'none';
  yes?: boolean;
}

const SUPPORTED_RUN_TOOLS = ['react-doctor'] as const;
type SupportedRunTool = (typeof SUPPORTED_RUN_TOOLS)[number];

export async function runRunCommand(argv: RunArgv): Promise<void> {
  const tool = String(argv.tool ?? '').trim().toLowerCase();
  if (!isSupportedRunTool(tool)) {
    const supported = SUPPORTED_RUN_TOOLS.join(', ');
    throw new Error(
      `Unknown mds run tool "${argv.tool ?? ''}". Supported tools: ${supported}.`
    );
  }

  if (tool === 'react-doctor') {
    await runReactDoctorTool(argv);
  }
}

export function isSupportedRunTool(value: string): value is SupportedRunTool {
  return (SUPPORTED_RUN_TOOLS as readonly string[]).includes(value);
}

export async function runReactDoctorTool(argv: RunArgv): Promise<void> {
  const projectPath = path.resolve(argv.path ?? '.');
  const disabled = await resolveReactDoctorDisabled(projectPath);

  console.log(chalk.bold('mds run react-doctor'));
  console.log(chalk.dim(projectPath));
  console.log();

  if (disabled.disabled && !argv.force) {
    console.log(chalk.yellow('React Doctor is disabled for this project.'));
    if (disabled.reason) {
      console.log(chalk.gray(disabled.reason));
    }
    console.log(
      chalk.gray(
        'Enable it by unsetting MDS_REACT_DOCTOR / MDS_DISABLE_REACT_DOCTOR / REACT_DOCTOR_DISABLED, or set package.json mds.reactDoctor back to true. Pass --force to run once.'
      )
    );
    return;
  }

  if (disabled.disabled && argv.force) {
    console.log(chalk.gray(`Running with --force even though disabled (${disabled.reason}).`));
  }

  const monorepo = await isMonorepoWorkspaceRoot(projectPath);
  if (monorepo) {
    console.log(chalk.gray('Detected monorepo workspace root; scanning with react-doctor -y.'));
  }

  const invocation = buildReactDoctorCommandInvocation({
    directory: '.',
    monorepo,
    json: Boolean(argv.json),
    verbose: Boolean(argv.verbose),
    project: argv.project,
    blocking: argv.blocking,
  });

  console.log(chalk.cyan(`Starting: ${invocation.display}`));
  await runStructuredCommand(invocation, projectPath);
}

async function runStructuredCommand(
  invocation: ReactDoctorCommandInvocation,
  cwd: string
): Promise<void> {
  const resolvedInvocation = resolveStructuredCommandInvocation(invocation);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvedInvocation.command, resolvedInvocation.args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${invocation.display} exited with code ${code ?? 'unknown'}.`));
      }
    });
  });
}
