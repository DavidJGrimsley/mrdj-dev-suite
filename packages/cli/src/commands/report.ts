import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import { runDoctor } from '@mr.dj2u/doctor';

import type { DoctorCheckResult, DoctorMode, DoctorReport } from '@mr.dj2u/doctor';

export interface ReportArgv {
  path?: string;
  mode?: DoctorMode;
  scripts?: boolean;
  json?: boolean;
  output?: string;
  timeoutMs?: number;
}

export async function runReportCommand(argv: ReportArgv): Promise<void> {
  const mode = normalizeMode(argv.mode);
  const projectPath = path.resolve(argv.path ?? '.');
  const report = await runDoctor(projectPath, {
    mode,
    runScripts: argv.scripts,
    timeoutMs: argv.timeoutMs,
  });
  const rendered = argv.json ? JSON.stringify(report, null, 2) : renderMarkdownReport(report);

  if (argv.output) {
    const outputPath = path.resolve(argv.output);
    await writeFile(outputPath, `${rendered}\n`, 'utf8');
    console.log(chalk.green(`wrote ${outputPath}`));
  } else {
    console.log(rendered);
  }

  if (report.summary.errors > 0) {
    process.exitCode = 1;
  }
}

export function renderMarkdownReport(report: DoctorReport): string {
  const selection = report.selection ?? {
    defaultMode: 'fast',
    runScripts: false,
    description: 'No selection metadata available.',
    fullModeGuidance: '',
  };

  return [
    '# MDS Doctor Report',
    '',
    `- Project: ${report.projectPath}`,
    `- Mode: ${report.mode}`,
    `- Default mode: ${selection.defaultMode}`,
    `- Script checks: ${selection.runScripts ? 'enabled' : 'disabled'}`,
    `- Mode description: ${selection.description}`,
    `- Full mode guidance: ${selection.fullModeGuidance}`,
    `- Timestamp: ${report.timestamp}`,
    `- Summary: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.passed} passed, ${report.summary.skipped} skipped`,
    '',
    '## Findings',
    '',
    ...renderFindings(report.checks),
  ].join('\n');
}

function renderFindings(checks: DoctorCheckResult[]): string[] {
  if (checks.length === 0) {
    return ['No checks ran.'];
  }

  const lines: string[] = [];
  for (const check of checks) {
    lines.push(`### ${label(check)} ${check.name}`);
    lines.push('');
    lines.push(check.message);
    if (check.details) {
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(check.details, null, 2));
      lines.push('```');
    }
    lines.push('');
  }

  return lines;
}

function label(check: DoctorCheckResult): string {
  return {
    pass: 'PASS',
    warn: 'WARN',
    error: 'FAIL',
    skip: 'SKIP',
  }[check.status];
}

function normalizeMode(value: DoctorMode | undefined): DoctorMode {
  return value === 'ci' || value === 'full' || value === 'fast' ? value : 'fast';
}
