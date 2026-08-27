import type {
  DoctorCheckResult,
  DoctorMode,
  DoctorReport,
  DoctorScoreBreakdown,
  DoctorTargetMetadata,
  DoctorWorkspaceMetadata,
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
  selectionDefaultMode: DoctorMode = 'fast',
  target?: DoctorTargetMetadata,
  workspace?: DoctorWorkspaceMetadata,
  childReports: DoctorReport[] = []
): DoctorReport {
  const ownSummary = {
    errors: checks.filter((check) => check.status === 'error').length,
    warnings: checks.filter((check) => check.status === 'warn').length,
    passed: checks.filter((check) => check.status === 'pass').length,
    skipped: checks.filter((check) => check.status === 'skip').length,
  };
  const summary = childReports.reduce(
    (total, report) => ({
      errors: total.errors + report.summary.errors,
      warnings: total.warnings + report.summary.warnings,
      passed: total.passed + report.summary.passed,
      skipped: total.skipped + report.summary.skipped,
    }),
    ownSummary
  );
  const scoreBreakdown = computeScoreBreakdown([
    ...checks,
    ...childReports.flatMap((report) => report.checks),
  ]);

  return {
    projectPath,
    scope: workspace ? 'workspace' : 'project',
    ...(target ? { target } : {}),
    ...(workspace ? { workspace } : {}),
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
  if (report.target) {
    lines.push(`Scanned ${report.target.target} for issues`);
  }
  if (report.workspace) {
    lines.push(`Workspace: ${report.workspace.displayName} (${report.workspace.apps.length} apps)`);
  }
  lines.push(`mode: ${selection.description}`);
  lines.push(`default: ${selection.defaultMode}`);
  lines.push(`scripts: ${selection.runScripts ? 'enabled' : 'disabled'}`);
  lines.push(`full mode: ${selection.fullModeGuidance}`);
  lines.push('');
  if (report.workspace) lines.push('Workspace findings');

  for (const check of report.checks) {
    lines.push(`${label(check)} ${check.name}: ${check.message}`);
    if (check.status !== 'pass' && check.details) {
      const detailText = JSON.stringify(check.details, null, 2);
      for (const line of detailText.split('\n')) {
        lines.push(`  ${line}`);
      }
    }
  }

  if (report.workspace) {
    lines.push('');
    lines.push('Applications');
    for (const app of report.workspace.apps) {
      const score = app.report ? `, score ${app.report.summary.score}/100` : '';
      lines.push(`${app.status.toUpperCase()} ${app.path} [${app.kind}]${score}`);
      if (app.report) {
        lines.push(`  Scanned ${app.path} for issues`);
        for (const check of app.report.checks.filter((item) => item.status !== 'pass')) {
          lines.push(`  ${label(check)} ${check.name}: ${check.message}`);
        }
      }
    }
    lines.push('');
    lines.push('Shared packages');
    for (const sharedPackage of report.workspace.sharedPackages) {
      lines.push(`${sharedPackage.path} [${sharedPackage.role}]`);
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
