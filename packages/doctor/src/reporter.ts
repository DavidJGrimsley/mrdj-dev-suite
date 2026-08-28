import type {
  DoctorCheckResult,
  DoctorMode,
  DoctorReport,
  DoctorScoreBreakdown,
} from './types.js';
import { createModeSelection } from './modes.js';

const EXTERNAL_SCORE_CHECKS = new Set(['react doctor', 'expo doctor']);

function computeNativeScore(summary: { errors: number; warnings: number }): number {
  return Math.max(0, 100 - summary.errors * 25 - summary.warnings * 5);
}

function computeScoreBreakdown(checks: DoctorCheckResult[]): DoctorScoreBreakdown {
  const nativeChecks = checks.filter((check) => !EXTERNAL_SCORE_CHECKS.has(check.name));
  const nativeSummary = {
    errors: nativeChecks.filter((check) => check.status === 'error').length,
    warnings: nativeChecks.filter((check) => check.status === 'warn').length,
  };
  const candidates = [
    {
      name: 'mds' as const,
      label: 'MDS native checks',
      score: computeNativeScore(nativeSummary),
      desiredWeight: 50,
    },
    reactDoctorScoreComponent(checks),
    expoDoctorScoreComponent(checks),
  ].filter((component): component is Omit<DoctorScoreBreakdown['components'][number], 'weight'> => {
    return component !== null;
  });

  const totalDesiredWeight = candidates.reduce((sum, component) => sum + component.desiredWeight, 0);
  const components = candidates.map((component) => ({
    ...component,
    weight: totalDesiredWeight > 0 ? component.desiredWeight / totalDesiredWeight : 0,
  }));

  return { components };
}

function computeCompositeScore(breakdown: DoctorScoreBreakdown): number {
  return Math.round(
    breakdown.components.reduce((sum, component) => sum + component.score * component.weight, 0)
  );
}

function reactDoctorScoreComponent(
  checks: DoctorCheckResult[]
): Omit<DoctorScoreBreakdown['components'][number], 'weight'> | null {
  const check = checks.find((entry) => entry.name === 'react doctor');
  if (!check || check.status === 'skip') {
    return null;
  }
  const score = readNumber(check.details?.score);
  if (score === undefined) {
    return null;
  }
  return {
    name: 'react-doctor',
    label: 'React Doctor',
    score,
    desiredWeight: 35,
  };
}

function expoDoctorScoreComponent(
  checks: DoctorCheckResult[]
): Omit<DoctorScoreBreakdown['components'][number], 'weight'> | null {
  const check = checks.find((entry) => entry.name === 'expo doctor');
  if (!check || check.status === 'skip') {
    return null;
  }

  return {
    name: 'expo-doctor',
    label: 'Expo Doctor',
    score: check.status === 'pass' ? 100 : check.status === 'warn' ? 75 : 0,
    desiredWeight: 15,
  };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function createReport(
  projectPath: string,
  mode: DoctorMode,
  checks: DoctorCheckResult[],
  runScripts = true,
  selectionDefaultMode: DoctorMode = 'fast'
): DoctorReport {
  const summary = {
    errors: checks.filter((check) => check.status === 'error').length,
    warnings: checks.filter((check) => check.status === 'warn').length,
    passed: checks.filter((check) => check.status === 'pass').length,
    skipped: checks.filter((check) => check.status === 'skip').length,
  };
  const scoreBreakdown = computeScoreBreakdown(checks);

  return {
    projectPath,
    timestamp: new Date().toISOString(),
    mode,
    selection: createModeSelection(mode, runScripts, selectionDefaultMode),
    checks,
    summary: {
      score: computeCompositeScore(scoreBreakdown),
      scoreBreakdown,
      ...summary,
    },
  };
}

export function formatJsonReport(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatHumanReport(report: DoctorReport): string {
  const selection = report.selection ?? createModeSelection(report.mode, true);
  const lines = [`mds doctor (${report.mode})`, report.projectPath, ''];
  lines.push(`mode: ${selection.description}`);
  lines.push(`default: ${selection.defaultMode}`);
  lines.push(`scripts: ${selection.runScripts ? 'enabled' : 'disabled'}`);
  lines.push(`full mode: ${selection.fullModeGuidance}`);
  lines.push('');

  for (const check of report.checks) {
    lines.push(`${label(check)} ${check.name}: ${check.message}`);
    if (check.status !== 'pass' && check.details) {
      const detailText = JSON.stringify(check.details, null, 2);
      for (const line of detailText.split('\n')) {
        lines.push(`  ${line}`);
      }
    }
  }

  lines.push('');
  lines.push(
    `score ${report.summary.score}/100 | ` +
    `${report.summary.errors} errors | ${report.summary.warnings} warnings | ` +
      `${report.summary.passed} passed | ${report.summary.skipped} skipped`
  );

  return lines.join('\n');
}

function label(check: DoctorCheckResult): string {
  return {
    pass: 'PASS',
    warn: 'WARN',
    error: 'FAIL',
    skip: 'SKIP',
  }[check.status];
}
