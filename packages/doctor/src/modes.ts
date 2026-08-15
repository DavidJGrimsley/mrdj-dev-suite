import type { DoctorCheckResult, DoctorMode, DoctorModeSelection } from './types.js';

export const DEFAULT_DOCTOR_MODE: DoctorMode = 'fast';

export const FULL_MODE_GUIDANCE =
  'Use --full when release approval needs the broadest available build profile, including preview or development build scripts.';

const MODE_INCLUDES: Record<DoctorMode, string[]> = {
  fast: [
    'static project checks',
    'lint script when scripts are enabled',
    'typecheck script when scripts are enabled',
  ],
  ci: [
    'static project checks',
    'lint and typecheck scripts when scripts are enabled',
    'tests, Expo Doctor, and release build scripts when available',
  ],
  full: [
    'static project checks',
    'all CI script checks when scripts are enabled',
    'the broadest available build script, including preview or development builds',
  ],
};

const MODE_SKIPS: Record<DoctorMode, string[]> = {
  fast: [
    'tests',
    'Expo Doctor',
    'production build',
    'full build profile',
  ],
  ci: ['full build profile'],
  full: [],
};

const MODE_DESCRIPTIONS: Record<DoctorMode, string> = {
  fast: 'Fast profile for local iteration and pre-commit checks.',
  ci: 'CI-equivalent profile for pull requests and release gates.',
  full: 'Full profile for broad pre-release verification.',
};

export function normalizeDoctorMode(value: DoctorMode | undefined): DoctorMode {
  return value === 'ci' || value === 'full' || value === 'fast' ? value : DEFAULT_DOCTOR_MODE;
}

export function createModeSelection(
  mode: DoctorMode,
  runScripts: boolean,
  defaultMode: DoctorMode = DEFAULT_DOCTOR_MODE
): DoctorModeSelection {
  return {
    defaultMode,
    mode,
    runScripts,
    description: MODE_DESCRIPTIONS[mode],
    includes: MODE_INCLUDES[mode],
    skips: runScripts
      ? MODE_SKIPS[mode]
      : ['all package script checks because script execution is disabled'],
    fullModeGuidance: FULL_MODE_GUIDANCE,
  };
}

export function createSkippedCheck(
  name: string,
  message: string,
  details?: Record<string, unknown>
): DoctorCheckResult {
  return {
    name,
    status: 'skip',
    message,
    ...(details ? { details } : {}),
  };
}

export function formatModeHelp(defaultMode: DoctorMode = DEFAULT_DOCTOR_MODE): string {
  return [
    `Default mode: ${defaultMode}`,
    '',
    'Modes:',
    '  --fast  Static checks plus lint/typecheck scripts. Skips tests, Expo Doctor, and builds.',
    '  --ci    CI-equivalent checks: lint, typecheck, tests, Expo Doctor, and release build.',
    '  --full  CI checks plus the broadest available build script candidates.',
    '',
    FULL_MODE_GUIDANCE,
  ].join('\n');
}
