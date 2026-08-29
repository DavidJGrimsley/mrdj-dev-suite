import type { DoctorCheckResult, DoctorMode, PackageJson } from '../types.js';
import { createSkippedCheck } from '../modes.js';
import {
  buildRunScriptCommand,
  commandResultToCheck,
  detectPackageManager,
  runShellCommand,
} from '../utils.js';
import { runEslintCheck, findScript } from './eslint.js';
import { runExpoDoctorCheck } from './expo-doctor.js';
import { runReactDoctorCheck } from './react-doctor.js';
import { runTypeScriptCheck } from './typescript.js';

export async function runScriptChecks(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  fix: boolean;
  runScripts: boolean;
  timeoutMs: number;
  reactDoctorRunner?: import('../types.js').ReactDoctorRunner;
}): Promise<DoctorCheckResult[]> {
  if (!args.runScripts) {
    return [
      createScriptDisabledSkip('lint'),
      createScriptDisabledSkip('typecheck'),
      createScriptDisabledSkip('tests'),
      createScriptDisabledSkip('expo doctor'),
      createScriptDisabledSkip('react doctor'),
      createScriptDisabledSkip('production build'),
    ];
  }

  const checks: DoctorCheckResult[] = [];
  for (const check of [
    await runEslintCheck(args),
    await runTypeScriptCheck(args),
    await runTestsCheck(args),
    await runExpoDoctorCheck(args),
    await runReactDoctorCheck({ ...args, runner: args.reactDoctorRunner }),
    await runProductionBuildCheck(args),
    runFullBuildProfileSkip(args),
  ]) {
    if (check) {
      checks.push(check);
    }
  }

  return checks;
}

function createScriptDisabledSkip(name: string): DoctorCheckResult {
  return createSkippedCheck(
    name,
    'Skipped because package script execution is disabled.',
    { reason: 'runScripts=false' }
  );
}

async function runTestsCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const candidates = ['test', 'test:ci'];
  if (args.mode === 'fast') {
    return createSkippedCheck(
      'tests',
      'Skipped in fast mode; run --ci or --full to include tests.',
      { reason: 'fast mode', candidates }
    );
  }

  const scriptName = findScript(args.packageJson, candidates);
  if (!scriptName) {
    return {
      name: 'tests',
      status: 'warn',
      message: 'No package script found for tests.',
      details: { candidates },
    };
  }

  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const command = buildRunScriptCommand(packageManager, scriptName);
  return commandResultToCheck(
    'tests',
    command,
    await runShellCommand(command, args.projectPath, args.timeoutMs)
  );
}

async function runProductionBuildCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const candidates =
    args.mode === 'full'
      ? ['build:web:deploy', 'build:web', 'build:prod', 'build:preview', 'build:dev', 'build']
      : args.mode === 'ci'
        ? ['build:web:deploy', 'build:web', 'build:prod', 'build']
        : [];
  if (candidates.length === 0) {
    return createSkippedCheck(
      'production build',
      'Skipped in fast mode; run --ci to include release build checks or --full for the broadest build profile.',
      { reason: 'fast mode', fullModeGuidance: 'Run --full to include preview/development build candidates.' }
    );
  }

  const scriptName = findScript(args.packageJson, candidates);
  if (!scriptName) {
    return {
      name: 'production build',
      status: 'warn',
      message: 'No package script found for production build.',
      details: { candidates },
    };
  }

  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const command = buildRunScriptCommand(packageManager, scriptName);
  return commandResultToCheck(
    'production build',
    command,
    await runShellCommand(command, args.projectPath, args.timeoutMs)
  );
}

function runFullBuildProfileSkip(args: { mode: DoctorMode }): DoctorCheckResult | null {
  if (args.mode === 'full') {
    return null;
  }

  return createSkippedCheck(
    'full build profile',
    'Skipped because this mode does not include preview/development build candidates; run --full when release approval needs the broadest build profile.',
    { reason: `${args.mode} mode`, requiredMode: 'full' }
  );
}
