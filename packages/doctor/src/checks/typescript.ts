import type { DoctorCheckResult, PackageJson } from '../types.js';
import {
  buildRunScriptCommand,
  commandResultToCheck,
  detectPackageManager,
  runShellCommand,
} from '../utils.js';
import { findScript } from './eslint.js';

export async function runTypeScriptCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const candidates = ['typecheck', 'type-check', 'check'];
  const scriptName = findScript(args.packageJson, candidates);
  if (!scriptName) {
    return {
      name: 'typecheck',
      status: 'warn',
      message: 'No package script found for typecheck.',
      details: { candidates },
    };
  }

  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const command = buildRunScriptCommand(packageManager, scriptName);
  return commandResultToCheck(
    'typecheck',
    command,
    await runShellCommand(command, args.projectPath, args.timeoutMs)
  );
}

