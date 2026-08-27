import type { DoctorCheckResult, DoctorMode, PackageJson } from '../types.js';
import { createSkippedCheck } from '../modes.js';
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
  if (!hasExpo) {
    return createSkippedCheck('expo doctor', 'Skipped because no Expo dependency was detected.', {
      reason: 'non-expo project',
    });
  }
  if (args.mode === 'fast') {
    return createSkippedCheck(
      'expo doctor',
      'Skipped in fast mode; run --ci or --full to include Expo Doctor.',
      { reason: 'fast mode' }
    );
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
  const result = await runShellCommand(command, args.projectPath, args.timeoutMs);
  const check = commandResultToCheck('expo doctor', command, result);
  if (check.status === 'error' && isKnownSdk56HermesRegression(result.stdout, result.stderr)) {
    return {
      ...check,
      status: 'warn',
      message:
        'Expo Doctor reported the known Expo SDK 56 Hermes regression; upgrade to SDK 57 to resolve it.',
    };
  }
  return check;
}

function isKnownSdk56HermesRegression(stdout: string, stderr: string): boolean {
  const output = `${stdout}\n${stderr}`;
  return (
    output.includes('Hermes V1') &&
    output.includes('known memory regression') &&
    !output.includes('duplicate dependencies')
  );
}
