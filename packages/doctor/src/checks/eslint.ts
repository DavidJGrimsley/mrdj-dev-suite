import type { DoctorCheckResult, DoctorMode, PackageJson } from '../types.js';
import {
  buildRunScriptCommand,
  commandResultToCheck,
  detectPackageManager,
  runShellCommand,
} from '../utils.js';

export async function runEslintCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  fix: boolean;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const scriptName = findScript(args.packageJson, ['lint']);
  if (!scriptName) {
    return {
      name: 'lint',
      status: 'warn',
      message: 'No package script found for lint.',
      details: { candidates: ['lint'] },
    };
  }

  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const command = buildRunScriptCommand(packageManager, scriptName, args.fix ? ['--', '--fix'] : []);
  return commandResultToCheck(
    'lint',
    command,
    await runShellCommand(command, args.projectPath, args.timeoutMs)
  );
}

export function findScript(packageJson: PackageJson, candidates: string[]): string | null {
  const scripts = packageJson.scripts ?? {};
  return candidates.find((candidate) => candidate in scripts) ?? null;
}

export function shouldRunScript(_mode: DoctorMode): boolean {
  return true;
}

