import type { DoctorCheckResult, PackageJson } from '../types.js';

export function checkStylingDependencies(packageJson: PackageJson): DoctorCheckResult {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const hasUniwind = 'uniwind' in deps;
  const hasNativeWind = 'nativewind' in deps;

  if (hasUniwind && hasNativeWind) {
    return {
      name: 'styling stack',
      status: 'warn',
      message: 'Both Uniwind and NativeWind are installed; prefer one styling adapter.',
    };
  }

  if (hasNativeWind && !hasUniwind) {
    return {
      name: 'styling stack',
      status: 'warn',
      message: 'NativeWind detected. MDS suite defaults new projects to Uniwind.',
    };
  }

  if (hasUniwind) {
    return {
      name: 'styling stack',
      status: 'pass',
      message: 'Uniwind detected.',
    };
  }

  return {
    name: 'styling stack',
    status: 'skip',
    message: 'No Uniwind or NativeWind dependency detected.',
  };
}

