import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createSkippedCheck } from '../modes.js';
import type {
  CommandResult,
  DoctorCheckResult,
  DoctorMode,
  PackageJson,
  ReactDoctorRunner,
} from '../types.js';
import { isRecord, pathExists, readOptionalText, runShellCommand } from '../utils.js';

const TODO_START = '<!-- mds-doctor:react-doctor:start -->';
const TODO_END = '<!-- mds-doctor:react-doctor:end -->';

interface ReactDoctorSummary {
  errorCount: number;
  warningCount: number;
  totalDiagnosticCount: number;
  affectedFileCount: number;
  sourceFileCount: number;
  score: number;
  scoreSource: 'react-doctor' | 'mds-local';
}

interface ReactDoctorDiagnosticSample {
  file: string;
  line?: number;
  severity: string;
  rule: string;
  category?: string;
  message: string;
}

export async function runReactDoctorCheck(args: {
  packageJson: PackageJson;
  projectPath: string;
  mode: DoctorMode;
  fix: boolean;
  timeoutMs: number;
  runner?: ReactDoctorRunner;
}): Promise<DoctorCheckResult> {
  if (!isReactProject(args.packageJson) && !(await isMonorepoWorkspaceRoot(args.projectPath, args.packageJson))) {
    return createSkippedCheck(
      'react doctor',
      'Skipped because no React, React Native, Expo, or workspace signal was detected.',
      { reason: 'non-react project' }
    );
  }

  const disabled = resolveReactDoctorDisabled(args.packageJson);
  if (disabled) {
    return createSkippedCheck('react doctor', `Skipped because ${disabled}.`, { reason: disabled });
  }

  if (args.mode === 'fast') {
    return createSkippedCheck(
      'react doctor',
      'Skipped in fast mode; run --ci or --full to include React Doctor.',
      { reason: 'fast mode' }
    );
  }

  const monorepo = await isMonorepoWorkspaceRoot(args.projectPath, args.packageJson);
  const reportPath = path.join(
    os.tmpdir(),
    `mds-react-doctor-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
  const runner = args.runner ?? defaultReactDoctorRunner;
  const command = buildReactDoctorCommandDisplay(reportPath);
  const result = await runner({
    projectPath: args.projectPath,
    reportPath,
    monorepo,
    timeoutMs: args.timeoutMs,
  });
  const parsed = await readReactDoctorReport(reportPath);

  if (!parsed) {
    return {
      name: 'react doctor',
      status: 'error',
      message: result.timedOut
        ? 'React Doctor timed out before it wrote a JSON report.'
        : `React Doctor failed before it wrote a JSON report (exit ${result.code ?? 'unknown'}).`,
      details: {
        command,
        code: result.code,
        timedOut: result.timedOut,
        stdout: tailLines(result.stdout),
        stderr: tailLines(result.stderr),
      },
    };
  }

  const summary = summarizeReactDoctorReport(parsed);
  const diagnostics = readArray(parsed.diagnostics);
  const projects = readArray(parsed.projects);
  const todoRecommendation = createTodoRecommendation(summary, parsed);
  const todoUpdate =
    args.fix && todoRecommendation ? await writeTodoRecommendation(args.projectPath, todoRecommendation) : null;

  const details = {
    command,
    version: readString(parsed.version),
    reactDetected: parsed.reactDetected === true,
    monorepo,
    score: summary.score,
    scoreSource: summary.scoreSource,
    diagnostics: {
      errors: summary.errorCount,
      warnings: summary.warningCount,
      total: summary.totalDiagnosticCount,
      affectedFiles: summary.affectedFileCount,
      sourceFiles: summary.sourceFileCount,
      categories: topCounts(diagnostics, diagnosticCategory, 8),
      topRules: topCounts(diagnostics, diagnosticRule, 10),
      samples: diagnosticSamples(diagnostics, 8),
    },
    projects: projectSummaries(projects),
    todoRecommendation,
    todoUpdate,
    stdout: tailLines(result.stdout),
    stderr: tailLines(result.stderr),
  };

  if (result.code !== 0 && summary.totalDiagnosticCount === 0) {
    return {
      name: 'react doctor',
      status: 'error',
      message: `React Doctor failed with exit code ${result.code ?? 'unknown'}.`,
      details,
    };
  }

  if (summary.totalDiagnosticCount === 0) {
    return {
      name: 'react doctor',
      status: 'pass',
      message: 'React Doctor found no diagnostics.',
      details,
    };
  }

  return {
    name: 'react doctor',
    status: 'warn',
    message: `React Doctor found ${summary.errorCount} errors and ${summary.warningCount} warnings.`,
    details,
  };
}

export function isReactProject(packageJson: PackageJson): boolean {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
  ].some((dependencies) => {
    return Boolean(
      dependencies?.react ??
        dependencies?.['react-native'] ??
        dependencies?.expo ??
        dependencies?.['expo-router'] ??
        dependencies?.['react-doctor']
    );
  });
}

export function summarizeReactDoctorReport(report: Record<string, unknown>): ReactDoctorSummary {
  const diagnostics = readArray(report.diagnostics);
  const summary = isRecord(report.summary) ? report.summary : null;
  const projects = readArray(report.projects);
  const sourceFileCount =
    readNumberFromRecord(summary, 'sourceFileCount') ??
    projects.reduce<number>((sum, project) => sum + readProjectSourceFileCount(project), 0);
  const errorCount =
    readNumberFromRecord(summary, 'errorCount') ??
    diagnostics.filter((diagnostic) => diagnosticSeverity(diagnostic) === 'error').length;
  const warningCount =
    readNumberFromRecord(summary, 'warningCount') ??
    diagnostics.filter((diagnostic) => diagnosticSeverity(diagnostic) === 'warning').length;
  const totalDiagnosticCount =
    readNumberFromRecord(summary, 'totalDiagnosticCount') ?? diagnostics.length;
  const affectedFileCount =
    readNumberFromRecord(summary, 'affectedFileCount') ??
    new Set(diagnostics.map((diagnostic) => readStringFromRecord(diagnostic, 'filePath')).filter(Boolean)).size;
  const reactDoctorScore = readNumberFromRecord(summary, 'score');

  return {
    errorCount,
    warningCount,
    totalDiagnosticCount,
    affectedFileCount,
    sourceFileCount,
    score: reactDoctorScore ?? computeLocalReactDoctorScore({
      errorCount,
      warningCount,
      affectedFileCount,
      sourceFileCount,
    }),
    scoreSource: reactDoctorScore === undefined ? 'mds-local' : 'react-doctor',
  };
}

export function computeLocalReactDoctorScore(args: {
  errorCount: number;
  warningCount: number;
  affectedFileCount: number;
  sourceFileCount: number;
}): number {
  const sourceFileCount = Math.max(1, args.sourceFileCount);
  const affectedFilePenalty = Math.min(10, (args.affectedFileCount / sourceFileCount) * 10);
  const errorPenalty = Math.min(60, args.errorCount * 3);
  const warningPenalty = Math.min(30, args.warningCount * 0.1);
  return Math.max(0, Math.round(100 - errorPenalty - warningPenalty - affectedFilePenalty));
}

async function defaultReactDoctorRunner(args: {
  projectPath: string;
  reportPath: string;
  timeoutMs: number;
}): Promise<CommandResult> {
  return runShellCommand(buildReactDoctorCommand(args.reportPath), args.projectPath, args.timeoutMs);
}

function buildReactDoctorCommand(reportPath: string): string {
  return [
    'npx',
    '-y',
    'react-doctor@latest',
    '-y',
    '--no-telemetry',
    '--json',
    '--json-out',
    quoteCommandArg(reportPath),
    '--blocking',
    'none',
  ].join(' ');
}

function buildReactDoctorCommandDisplay(reportPath: string): string {
  return buildReactDoctorCommand(reportPath);
}

function quoteCommandArg(value: string): string {
  if (/^[\w@./:\\-]+$/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

async function isMonorepoWorkspaceRoot(
  projectPath: string,
  packageJson: PackageJson
): Promise<boolean> {
  if (await pathExists(path.join(projectPath, 'pnpm-workspace.yaml'))) {
    return true;
  }
  const workspaces = packageJson.workspaces;
  return (
    (Array.isArray(workspaces) && workspaces.length > 0) ||
    (isRecord(workspaces) && Array.isArray(workspaces.packages) && workspaces.packages.length > 0)
  );
}

function resolveReactDoctorDisabled(packageJson: PackageJson): string | null {
  if (isFalsyEnvFlag(process.env.MDS_REACT_DOCTOR)) {
    return 'MDS_REACT_DOCTOR is set to a falsy value';
  }
  if (isTruthyEnvFlag(process.env.MDS_DISABLE_REACT_DOCTOR)) {
    return 'MDS_DISABLE_REACT_DOCTOR is enabled';
  }
  if (isTruthyEnvFlag(process.env.REACT_DOCTOR_DISABLED)) {
    return 'REACT_DOCTOR_DISABLED is enabled';
  }

  const mdsReactDoctor = packageJson.mds?.reactDoctor;
  if (mdsReactDoctor === false) {
    return 'package.json mds.reactDoctor is false';
  }
  if (isRecord(mdsReactDoctor) && mdsReactDoctor.enabled === false) {
    return 'package.json mds.reactDoctor.enabled is false';
  }
  if (packageJson.reactDoctor === false) {
    return 'package.json reactDoctor is false';
  }
  if (isRecord(packageJson.reactDoctor) && packageJson.reactDoctor.enabled === false) {
    return 'package.json reactDoctor.enabled is false';
  }

  return null;
}

function isFalsyEnvFlag(value: string | undefined): boolean {
  return ['0', 'false', 'off', 'no', 'disabled', 'disable'].includes(
    value?.trim().toLowerCase() ?? ''
  );
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  return ['1', 'true', 'on', 'yes', 'enabled', 'enable'].includes(
    value?.trim().toLowerCase() ?? ''
  );
}

async function readReactDoctorReport(reportPath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(reportPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function createTodoRecommendation(
  summary: ReactDoctorSummary,
  report: Record<string, unknown>
): string | null {
  if (summary.errorCount <= 3 && summary.totalDiagnosticCount <= 25) {
    return null;
  }

  const topRules = topCounts(readArray(report.diagnostics), diagnosticRule, 8)
    .map((entry) => `- [ ] ${entry.name}: ${entry.count}`)
    .join('\n');
  return [
    TODO_START,
    '## High Priority: React Doctor Findings',
    '',
    `React Doctor found ${summary.errorCount} errors and ${summary.warningCount} warnings across ${summary.affectedFileCount} files.`,
    '',
    'Top rules to triage:',
    topRules || '- [ ] Review React Doctor diagnostics.',
    '',
    'Suggested follow-up:',
    '- [ ] Fix React Doctor errors first, then reduce the highest-count warning rules.',
    '- [ ] Re-run `mds doctor --ci` and confirm the React Doctor score improves.',
    TODO_END,
  ].join('\n');
}

async function writeTodoRecommendation(
  projectPath: string,
  recommendation: string
): Promise<{ path: string; wrote: boolean }> {
  const todoPath = path.join(projectPath, 'project', 'todo.md');
  await mkdir(path.dirname(todoPath), { recursive: true });
  const existing = (await readOptionalText(todoPath)) ?? '# Todo\n';
  const next = upsertManagedBlock(existing, recommendation);
  await writeFile(todoPath, next, 'utf8');
  return { path: todoPath, wrote: next !== existing };
}

function upsertManagedBlock(existing: string, block: string): string {
  const start = existing.indexOf(TODO_START);
  const end = existing.indexOf(TODO_END);
  if (start !== -1 && end !== -1 && end > start) {
    return `${existing.slice(0, start).replace(/\s*$/u, '\n\n')}${block}\n${existing
      .slice(end + TODO_END.length)
      .replace(/^\s*/u, '\n')}`;
  }
  return `${existing.replace(/\s*$/u, '')}\n\n${block}\n`;
}

function topCounts(
  diagnostics: unknown[],
  select: (diagnostic: unknown) => string | undefined,
  limit: number
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    const name = select(diagnostic);
    if (name) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function diagnosticSamples(diagnostics: unknown[], limit: number): ReactDoctorDiagnosticSample[] {
  return diagnostics.slice(0, limit).map((diagnostic) => {
    const rule = diagnosticRule(diagnostic) ?? 'unknown';
    const message = readStringFromRecord(diagnostic, 'message') ?? '';
    const sample: ReactDoctorDiagnosticSample = {
      file: readStringFromRecord(diagnostic, 'normalizedFilePath') ?? readStringFromRecord(diagnostic, 'filePath') ?? '',
      severity: diagnosticSeverity(diagnostic),
      rule,
      message,
    };
    const line = readNumberFromRecord(diagnostic, 'line');
    const category = diagnosticCategory(diagnostic);
    if (line !== undefined) {
      sample.line = line;
    }
    if (category) {
      sample.category = category;
    }
    return sample;
  });
}

function projectSummaries(projects: unknown[]): Array<{
  directory?: string;
  framework?: string;
  diagnostics: number;
  sourceFiles: number;
}> {
  return projects.map((project) => {
    const diagnostics = readArrayFromRecord(project, 'diagnostics');
    const summary = {
      diagnostics: diagnostics.length,
      sourceFiles: readProjectSourceFileCount(project),
    };
    const directory = readStringFromRecord(project, 'directory');
    const framework = readStringFromRecord(project, 'framework');
    return {
      ...(directory ? { directory } : {}),
      ...(framework ? { framework } : {}),
      ...summary,
    };
  });
}

function diagnosticRule(diagnostic: unknown): string | undefined {
  const plugin = readStringFromRecord(diagnostic, 'plugin');
  const rule = readStringFromRecord(diagnostic, 'rule');
  if (plugin && rule) {
    return `${plugin}/${rule}`;
  }
  return rule;
}

function diagnosticCategory(diagnostic: unknown): string | undefined {
  return readStringFromRecord(diagnostic, 'category');
}

function diagnosticSeverity(diagnostic: unknown): string {
  return readStringFromRecord(diagnostic, 'severity') ?? 'warning';
}

function readProjectSourceFileCount(project: unknown): number {
  return (
    readNumberFromRecord(project, 'analyzedFileCount') ??
    readNumberFromRecord(project, 'scannedFileCount') ??
    0
  );
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readArrayFromRecord(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }
  return readArray(value[key]);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readStringFromRecord(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return readString(value[key]);
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readNumberFromRecord(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return readNumber(value[key]);
}

function tailLines(output: string, maxLines = 30): string {
  const lines = output.trim().split(/\r?\n/u).filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}
