import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { findFiles, readOptionalText, relative, SOURCE_EXTENSIONS } from '../utils.js';

const PUBLIC_SECRET_PATTERN =
  /\bEXPO_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN|STRIPE_SECRET)[A-Z0-9_]*\b/g;
const CONFIG_EXTENSIONS = new Set(['.json', '.jsonc', '.yml', '.yaml']);
const MAX_FINDINGS = 25;

interface EnvHygieneFinding {
  file: string;
  line: number;
  kind: 'public-secret-name' | 'hardcoded-credential-value';
  identifier?: string;
  detector: string;
  remediation: string;
}

export async function checkEnvHygiene(projectPath: string): Promise<DoctorCheckResult> {
  const envFiles = await findFiles(projectPath, (filePath) => {
    const basename = path.basename(filePath);
    return isRealEnvFile(basename);
  });
  const scannableFiles = await findFiles(projectPath, (filePath) =>
    isScannableCredentialFile(filePath)
  );

  const findings = await findEnvHygieneFindings(projectPath, [...envFiles, ...scannableFiles]);
  if (findings.length > 0) {
    return {
      name: 'env hygiene',
      status: 'error',
      message: 'Unsafe environment or credential patterns were found.',
      details: {
        findings: findings.slice(0, MAX_FINDINGS),
        truncated: findings.length > MAX_FINDINGS,
      },
    };
  }

  return {
    name: 'env hygiene',
    status: 'pass',
    message: 'No secret-looking EXPO_PUBLIC variables or hardcoded credential values found.',
  };
}

export async function scanFileEnvHygiene(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const findings = await findEnvHygieneFindings(projectPath, [filePath]);
  return findings.length > 0
    ? {
        name: 'env hygiene',
        status: 'error',
        message: 'Unsafe environment or credential patterns were found.',
        details: { findings: findings.slice(0, MAX_FINDINGS), truncated: findings.length > MAX_FINDINGS },
      }
    : {
        name: 'env hygiene',
        status: 'pass',
        message: 'No secret-looking EXPO_PUBLIC variables or hardcoded credential values found.',
      };
}

async function findEnvHygieneFindings(
  projectPath: string,
  filePaths: string[]
): Promise<EnvHygieneFinding[]> {
  const findings: EnvHygieneFinding[] = [];
  for (const filePath of filePaths) {
    const contents = await readOptionalText(filePath);
    if (!contents) {
      continue;
    }

    findings.push(...findPublicSecretNames(projectPath, filePath, contents));

    if (isScannableCredentialFile(filePath)) {
      findings.push(...findHardcodedCredentialValues(projectPath, filePath, contents));
    }
  }
  return findings;
}

function findPublicSecretNames(
  projectPath: string,
  filePath: string,
  contents: string
): EnvHygieneFinding[] {
  const findings: EnvHygieneFinding[] = [];
  const seen = new Set<string>();
  const lines = contents.split(/\r?\n/);
  for (const [lineIndex, line] of lines.entries()) {
    for (const match of line.matchAll(PUBLIC_SECRET_PATTERN)) {
      const identifier = match[0];
      const key = `${lineIndex}:${identifier}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      findings.push({
        file: relative(projectPath, filePath),
        line: lineIndex + 1,
        kind: 'public-secret-name',
        identifier,
        detector: 'expo-public-secret-name',
        remediation: 'Move private values to a server-only environment variable without the EXPO_PUBLIC_ prefix.',
      });
    }
  }
  return findings;
}

function findHardcodedCredentialValues(
  projectPath: string,
  filePath: string,
  contents: string
): EnvHygieneFinding[] {
  const findings: EnvHygieneFinding[] = [];
  const lines = contents.split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    if (isCommentOnlyLine(line)) {
      continue;
    }

    const assignment = readSensitiveAssignment(line);
    if (!assignment) {
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) {
        findings.push(createCredentialFinding(projectPath, filePath, lineIndex, {
          identifier: 'private key',
          detector: 'private-key-literal',
        }));
      }
      continue;
    }

    const providerDetector = detectKnownCredentialShape(assignment.value);
    const genericDetector =
      providerDetector ?? (looksLikeCredentialValue(assignment.value) ? 'sensitive-assignment-literal' : null);
    if (!genericDetector || isPlaceholderValue(assignment.value)) {
      continue;
    }

    findings.push(
      createCredentialFinding(projectPath, filePath, lineIndex, {
        identifier: sanitizeIdentifier(assignment.identifier),
        detector: genericDetector,
      })
    );
  }

  return findings;
}

function createCredentialFinding(
  projectPath: string,
  filePath: string,
  lineIndex: number,
  options: { identifier?: string; detector: string }
): EnvHygieneFinding {
  return {
    file: relative(projectPath, filePath),
    line: lineIndex + 1,
    kind: 'hardcoded-credential-value',
    ...(options.identifier ? { identifier: options.identifier } : {}),
    detector: options.detector,
    remediation: 'Move the literal credential into an ignored local env file or secret manager and read it through process.env.',
  };
}

function readSensitiveAssignment(line: string): { identifier: string; value: string } | null {
  const envMatch = line.match(/^\s*([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASS|KEY|SERVICE_ROLE|PRIVATE)[A-Z0-9_]*)\s*=\s*['"]?([^'"\s#]+)['"]?/);
  if (envMatch?.[1] && envMatch[2]) {
    return { identifier: envMatch[1], value: envMatch[2] };
  }

  const codeMatch = line.match(
    /(?:^|[{\s,.;])\s*["']?([A-Za-z0-9_$.-]*(?:apiKey|api_key|secret|token|password|passwd|serviceRole|service_role|privateKey|private_key|clientSecret|client_secret|webhookSecret|webhook_secret|jwtSecret|jwt_secret|databaseUrl|database_url|connectionString|connection_string|authorization)[A-Za-z0-9_$.-]*)["']?\s*[:=]\s*(['"`])([^'"`]+)\2/i
  );
  if (codeMatch?.[1] && codeMatch[3]) {
    return { identifier: codeMatch[1], value: stripBearerPrefix(codeMatch[3].trim()) };
  }

  return null;
}

function detectKnownCredentialShape(value: string): string | null {
  const trimmed = stripBearerPrefix(value.trim());
  if (/^(sk|rk)_(live|test)_[A-Za-z0-9]{16,}$/.test(trimmed)) return 'stripe-key-shape';
  if (/^sk-proj-[A-Za-z0-9_-]{20,}$/.test(trimmed)) return 'openai-project-key-shape';
  if (/^xox[baprs]-[A-Za-z0-9-]{20,}$/.test(trimmed)) return 'slack-token-shape';
  if (/^gh[pousr]_[A-Za-z0-9_]{20,}$/.test(trimmed)) return 'github-token-shape';
  if (/^github_pat_[A-Za-z0-9_]{30,}$/.test(trimmed)) return 'github-token-shape';
  if (/^SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(trimmed)) return 'sendgrid-key-shape';
  if (/^whsec_[A-Za-z0-9]{16,}$/.test(trimmed)) return 'webhook-secret-shape';
  if (/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(trimmed)) return 'supabase-secret-shape';
  return null;
}

function looksLikeCredentialValue(value: string): boolean {
  const trimmed = stripBearerPrefix(value.trim());
  if (trimmed.length < 16 || isPlaceholderValue(trimmed)) {
    return false;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(trimmed)) {
    return false;
  }
  if (/^[a-z]+:\/\/[^:\s]+:[^@\s]+@/.test(trimmed)) {
    return true;
  }

  const classes = [
    /[a-z]/.test(trimmed),
    /[A-Z]/.test(trimmed),
    /\d/.test(trimmed),
    /[_/+=.-]/.test(trimmed),
  ].filter(Boolean).length;
  return classes >= 3 && /[A-Za-z0-9]/.test(trimmed);
}

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (
    normalized.includes('your-') ||
    normalized.includes('replace-me') ||
    normalized.includes('changeme') ||
    normalized.includes('change-me') ||
    normalized.includes('example') ||
    normalized.includes('dummy') ||
    normalized.includes('placeholder') ||
    normalized.includes('from-secure-vault') ||
    normalized.includes('secure-vault') ||
    normalized.includes('test-only')
  ) {
    return true;
  }
  const compact = normalized.replace(/[._\-\s]/g, '');
  return compact.length >= 6 && /^x+$/.test(compact);
}

function isCommentOnlyLine(line: string): boolean {
  return /^\s*(#|\/\/|\*|\*\/|<!--)/.test(line);
}

function stripBearerPrefix(value: string): string {
  return value.replace(/^Bearer\s+/i, '');
}

function sanitizeIdentifier(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9_$.-]/g, '').slice(0, 80);
}

function isScannableCredentialFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (isExampleEnvFile(basename) || isLockfile(basename)) {
    return false;
  }
  const extension = path.extname(filePath);
  return SOURCE_EXTENSIONS.has(extension) || CONFIG_EXTENSIONS.has(extension) || isRealEnvFile(basename);
}

function isRealEnvFile(basename: string): boolean {
  return (basename === '.env' || basename.startsWith('.env.')) && !isExampleEnvFile(basename);
}

function isExampleEnvFile(basename: string): boolean {
  return /\.(example|sample|template)$/i.test(basename) || /(^|[.-])(example|sample|template)([.-]|$)/i.test(basename);
}

function isLockfile(basename: string): boolean {
  return basename === 'package-lock.json' || basename === 'pnpm-lock.yaml' || basename === 'yarn.lock';
}
