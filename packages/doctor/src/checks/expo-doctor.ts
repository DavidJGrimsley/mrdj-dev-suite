import type { DoctorCheckResult, DoctorMode, PackageJson } from '../types.js';
import {
  buildRunScriptCommand,
  commandResultToCheck,
  detectPackageManager,
  runShellCommand,
} from '../utils.js';
import { findScript } from './eslint.js';

export async function runExpoDoctorCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  timeoutMs: number;
}): Promise<DoctorCheckResult | null> {
  const hasExpo = Boolean(
    args.packageJson.dependencies?.expo ?? args.packageJson.devDependencies?.expo
  );
  if (!hasExpo || args.mode === 'fast') {
    return null;
  }

  const candidates = ['expo-doctor', 'doctor'];
  const scriptName = findScript(args.packageJson, candidates);
  if (!scriptName) {
    return {
      name: 'expo doctor',
      status: 'warn',
      message: 'No package script found for expo doctor.',
      details: { candidates },
    };
  }

  const packageManager = await detectPackageManager(args.projectPath, args.packageJson);
  const command = buildRunScriptCommand(packageManager, scriptName);
  return commandResultToCheck(
    'expo doctor',
    command,
    await runShellCommand(command, args.projectPath, args.timeoutMs)
  );
}
