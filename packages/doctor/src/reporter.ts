import type {
  DoctorCheckResult,
  DoctorMode,
  DoctorReport,
  DoctorTargetMetadata,
  DoctorWorkspaceMetadata,
} from './types.js';
import { createModeSelection } from './modes.js';

function computeScore(summary: { errors: number; warnings: number }): number {
  return Math.max(0, 100 - summary.errors * 25 - summary.warnings * 5);
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
      score: computeScore(summary),
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
