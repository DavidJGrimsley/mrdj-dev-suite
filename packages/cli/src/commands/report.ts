import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';

import { runDoctor } from '@mr.dj2u/doctor';

import type { DoctorCheckResult, DoctorMode, DoctorReport } from '@mr.dj2u/doctor';

import {
  renderDeveloperCopyMarkdown,
  scanDeveloperCopy,
  type DeveloperCopyReport,
} from '../developer-copy.js';
import {
  buildEjectionInventory,
  formatEjectionInventorySummary,
  inventoryStatusFrom,
  type EjectionInventoryStatus,
} from '../ejection-inventory.js';

export type ReportKind = 'doctor' | 'content' | 'all';

export interface CombinedProjectReport {
  kind: 'project-report';
  projectPath: string;
  timestamp: string;
  ejectionStatus: EjectionInventoryStatus;
  ejectionSummary: string;
  doctor: DoctorReport | null;
  content: DeveloperCopyReport | null;
}

export interface ReportArgv {
  path?: string;
  mode?: DoctorMode;
  kind?: ReportKind;
  scripts?: boolean;
  json?: boolean;
  output?: string;
  timeoutMs?: number;
}

export async function runReportCommand(argv: ReportArgv): Promise<void> {
  const kind = normalizeKind(argv.kind);
  const mode = normalizeMode(argv.mode);
  const projectPath = path.resolve(argv.path ?? '.');
  const inventory = await buildEjectionInventory(projectPath);
  const ejectionStatus = inventoryStatusFrom(inventory);
  const doctor =
    kind === 'content'
      ? null
      : await runDoctor(projectPath, {
          mode,
          runScripts: argv.scripts,
          timeoutMs: argv.timeoutMs,
        });
  const content = kind === 'doctor' ? null : await scanDeveloperCopy(projectPath);

  const payload: CombinedProjectReport = {
    kind: 'project-report',
    projectPath,
    timestamp: content?.timestamp ?? doctor?.timestamp ?? new Date().toISOString(),
    ejectionStatus,
    ejectionSummary: formatEjectionInventorySummary(inventory),
    doctor,
    content,
  };

  const rendered = argv.json
    ? JSON.stringify(kind === 'doctor' && doctor ? doctor : kind === 'content' && content ? content : payload, null, 2)
    : renderSelectedReport(kind, payload, doctor, content);

  if (argv.output) {
    const outputPath = path.resolve(argv.output);
    await writeFile(outputPath, `${rendered}\n`, 'utf8');
    console.log(chalk.green(`wrote ${outputPath}`));
  } else {
    console.log(rendered);
  }

  const doctorErrors = doctor?.summary.errors ?? 0;
  const contentErrors = content?.summary.errors ?? 0;
  if (doctorErrors > 0 || contentErrors > 0) {
    process.exitCode = 1;
  }
}

function renderSelectedReport(
  kind: ReportKind,
  payload: CombinedProjectReport,
  doctor: DoctorReport | null,
  content: DeveloperCopyReport | null
): string {
  const ejectionLines = [
    '## Phase 0 ejection status',
    '',
    `- Decision: ${payload.ejectionStatus.decision}`,
    `- Present inventory items: ${payload.ejectionStatus.presentCount}`,
    `- Retained: ${payload.ejectionStatus.retained.join(', ') || 'none'}`,
    `- Ejected: ${payload.ejectionStatus.ejected.join(', ') || 'none'}`,
    '',
  ];

  if (kind === 'content' && content) {
    return [renderDeveloperCopyMarkdown(content), '', ...ejectionLines].join('\n');
  }

  if (kind === 'doctor' && doctor) {
    return [renderMarkdownReport(doctor), '', ...ejectionLines].join('\n');
  }

  return [
    doctor ? renderMarkdownReport(doctor) : '# MDS Project Report',
    '',
    ...ejectionLines,
    content ? renderDeveloperCopyMarkdown(content) : '',
  ]
    .filter((section, index, all) => section !== '' || all[index - 1] !== '')
    .join('\n');
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

function normalizeKind(value: ReportKind | undefined): ReportKind {
  return value === 'content' || value === 'all' || value === 'doctor' ? value : 'doctor';
}
