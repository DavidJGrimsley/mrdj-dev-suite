import type { DoctorCheckResult, DoctorMode, DoctorReport } from './types.js';

export function createReport(
  projectPath: string,
  mode: DoctorMode,
  checks: DoctorCheckResult[]
): DoctorReport {
  return {
    projectPath,
    timestamp: new Date().toISOString(),
    mode,
    checks,
    summary: {
      errors: checks.filter((check) => check.status === 'error').length,
      warnings: checks.filter((check) => check.status === 'warn').length,
      passed: checks.filter((check) => check.status === 'pass').length,
      skipped: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

export function formatJsonReport(report: DoctorReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatHumanReport(report: DoctorReport): string {
  const lines = [`mrdj doctor (${report.mode})`, report.projectPath, ''];

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

