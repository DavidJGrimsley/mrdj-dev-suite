import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export type DeveloperCopySeverity = 'error' | 'warning';

export type DeveloperCopyCode =
  | 'mock-data'
  | 'placeholder-legal'
  | 'placeholder-copy'
  | 'developer-todo'
  | 'example-identity'
  | 'leftover-exposition';

export interface DeveloperCopyFinding {
  severity: DeveloperCopySeverity;
  code: DeveloperCopyCode;
  file: string;
  line: number;
  excerpt: string;
  message: string;
}

export interface DeveloperCopyReport {
  kind: 'developer-copy';
  projectPath: string;
  timestamp: string;
  summary: {
    findings: number;
    errors: number;
    warnings: number;
  };
  findings: DeveloperCopyFinding[];
}

export interface ScanDeveloperCopyOptions {
  now?: () => Date;
}

const USER_FACING_ROOTS = [
  'app',
  'src/app',
  'src/features',
  'src/data',
  'src/components',
  'src/services',
  'components',
  'features',
] as const;

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'coverage',
  '.turbo',
]);

const SKIP_FILE_NAMES = new Set(['ejection-cleanup.md']);

interface CopyPattern {
  code: DeveloperCopyCode;
  severity: DeveloperCopySeverity;
  pattern: RegExp;
  message: string;
}

const COPY_PATTERNS: CopyPattern[] = [
  {
    code: 'placeholder-legal',
    severity: 'error',
    pattern: /placeholder legal text|not legal advice|replace this placeholder|replace it with documents reviewed/iu,
    message: 'Placeholder legal copy is still in a user-facing file and must be replaced before release.',
  },
  {
    code: 'mock-data',
    severity: 'error',
    pattern: /mock-app|dummy data|guestbook|fixture app snapshot/iu,
    message: 'Example or mock data is still referenced from a user-facing surface.',
  },
  {
    code: 'placeholder-copy',
    severity: 'warning',
    pattern: /lorem ipsum|your company|your app name|replace this copy|edit this screen|welcome to expo|open up the code/iu,
    message: 'Starter or placeholder copy is still visible to users.',
  },
  {
    code: 'developer-todo',
    severity: 'warning',
    pattern: /\bTODO\b|\bFIXME\b|\bXXX\b|# TodoForContext\(optional\):/u,
    message: 'A developer note or todo is still in a user-facing route or screen.',
  },
  {
    code: 'example-identity',
    severity: 'warning',
    pattern: /jane doe|john doe|user@example\.com|acme corp|example\.com\/privacy/iu,
    message: 'Example names or contact details are still in user-facing copy.',
  },
  {
    code: 'leftover-exposition',
    severity: 'warning',
    pattern: /\/exposition|exposition-screen|package exposition/iu,
    message: 'Exposition or developer-demo copy is still reachable from user-facing files.',
  },
];

const FILE_NAME_FINDINGS: Array<{
  match: RegExp;
  code: DeveloperCopyCode;
  severity: DeveloperCopySeverity;
  message: string;
}> = [
  {
    match: /(^|\/)mock-app\.tsx?$/u,
    code: 'mock-data',
    severity: 'error',
    message: 'Generated mock snapshot data is still in the project and should be replaced before shipping.',
  },
];

export async function scanDeveloperCopy(
  projectPathInput = '.',
  options: ScanDeveloperCopyOptions = {}
): Promise<DeveloperCopyReport> {
  const projectPath = path.resolve(projectPathInput);
  const timestamp = (options.now ? options.now() : new Date()).toISOString();
  const findings: DeveloperCopyFinding[] = [];

  for (const relativeRoot of USER_FACING_ROOTS) {
    const root = path.join(projectPath, ...relativeRoot.split('/'));
    await walkFiles(root, async (filePath) => {
      const relative = normalizeRelative(path.relative(projectPath, filePath));
      if (SKIP_FILE_NAMES.has(path.basename(filePath))) {
        return;
      }
      if (!/\.(tsx?|jsx?|md)$/iu.test(filePath)) {
        return;
      }

      for (const fileFinding of FILE_NAME_FINDINGS) {
        if (fileFinding.match.test(relative)) {
          findings.push({
            severity: fileFinding.severity,
            code: fileFinding.code,
            file: relative,
            line: 1,
            excerpt: path.basename(filePath),
            message: fileFinding.message,
          });
        }
      }

      let raw: string;
      try {
        raw = await readFile(filePath, 'utf8');
      } catch {
        return;
      }

      const lines = raw.split(/\r?\n/u);
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? '';
        if (isUiPlaceholderProp(line)) {
          continue;
        }
        for (const rule of COPY_PATTERNS) {
          if (rule.code === 'leftover-exposition' && isExpositionFile(relative)) {
            continue;
          }
          if (rule.pattern.test(line)) {
            findings.push({
              severity: rule.severity,
              code: rule.code,
              file: relative,
              line: index + 1,
              excerpt: line.trim().slice(0, 160),
              message: rule.message,
            });
          }
        }
      }

      if (isExpositionFile(relative)) {
        findings.push({
          severity: 'warning',
          code: 'leftover-exposition',
          file: relative,
          line: 1,
          excerpt: relative,
          message: 'An exposition or developer-demo file is still in the app tree and should be ejected or removed before release.',
        });
      }
    });
  }

  const uniqueFindings = dedupeFindings(findings);
  const errors = uniqueFindings.filter((finding) => finding.severity === 'error').length;
  const warnings = uniqueFindings.filter((finding) => finding.severity === 'warning').length;

  return {
    kind: 'developer-copy',
    projectPath,
    timestamp,
    summary: {
      findings: uniqueFindings.length,
      errors,
      warnings,
    },
    findings: uniqueFindings,
  };
}

export function renderDeveloperCopyMarkdown(report: DeveloperCopyReport): string {
  return [
    '# MDS Developer Copy Report',
    '',
    `- Project: ${report.projectPath}`,
    `- Timestamp: ${report.timestamp}`,
    `- Summary: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.findings} findings`,
    '',
    'This pre-release pass flags leftover placeholder, mock, and developer-facing copy in user routes and screens.',
    '',
    '## Findings',
    '',
    ...(report.findings.length === 0
      ? ['No placeholder or example copy was found in scanned user-facing files.']
      : report.findings.flatMap((finding) => [
          `### ${finding.severity.toUpperCase()} ${finding.code}`,
          '',
          `- File: \`${finding.file}:${finding.line}\``,
          `- ${finding.message}`,
          '',
          '```',
          finding.excerpt,
          '```',
          '',
        ])),
  ].join('\n');
}

function isUiPlaceholderProp(line: string): boolean {
  return /placeholder(TextColor)?\s*=/.test(line) && !/placeholder legal|replace this placeholder/iu.test(line);
}

function isExpositionFile(relativePath: string): boolean {
  return /(^|\/)exposition(\/|$)/u.test(relativePath);
}

function normalizeRelative(value: string): string {
  return value.split(path.sep).join('/');
}

function dedupeFindings(findings: DeveloperCopyFinding[]): DeveloperCopyFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.file}:${finding.line}:${finding.excerpt}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function walkFiles(root: string, visit: (filePath: string) => Promise<void>): Promise<void> {
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch {
    return;
  }
  if (!rootStat.isDirectory()) {
    return;
  }

  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }
      if (entry.isFile()) {
        await visit(fullPath);
      }
    }
  }
}
