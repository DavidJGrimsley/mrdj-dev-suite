import type { DoctorCheckResult, DoctorMode, DoctorReport } from './types.js';
import { createModeSelection } from './modes.js';

function computeScore(summary: { errors: number; warnings: number }): number {
  return Math.max(0, 100 - summary.errors * 25 - summary.warnings * 5);
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

  return {
    projectPath,
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
