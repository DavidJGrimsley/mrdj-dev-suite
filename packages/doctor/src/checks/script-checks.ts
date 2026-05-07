import type { DoctorCheckResult, DoctorMode, PackageJson } from '../types.js';
import {
  buildRunScriptCommand,
  commandResultToCheck,
  detectPackageManager,
  runShellCommand,
} from '../utils.js';
import { runEslintCheck, findScript } from './eslint.js';
import { runExpoDoctorCheck } from './expo-doctor.js';
import { runTypeScriptCheck } from './typescript.js';

export async function runScriptChecks(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  fix: boolean;
  timeoutMs: number;
}): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];
  for (const check of [
    await runEslintCheck(args),
    await runTypeScriptCheck(args),
    await runTestsCheck(args),
    await runExpoDoctorCheck(args),
    await runProductionBuildCheck(args),
  ]) {
    if (check) {
      checks.push(check);
    }
  }

  return checks;
}

async function runTestsCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const candidates = ['test', 'test:ci'];
  const scriptName = findScript(args.packageJson, candidates);
  if (!scriptName) {
    return args.mode === 'fast'
      ? null
      : {
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
      ? ['build:web:deploy', 'build:web', 'build']
      : args.mode === 'ci'
        ? ['build:web:deploy', 'build']
        : [];
  if (candidates.length === 0) {
    return null;
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
