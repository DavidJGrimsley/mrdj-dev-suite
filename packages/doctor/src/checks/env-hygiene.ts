import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import {
  findFiles,
  isToolingOrTestPath,
  readOptionalText,
  relative,
  SOURCE_EXTENSIONS,
} from '../utils.js';

const PUBLIC_SECRET_PATTERN =
  /\bEXPO_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN|STRIPE_SECRET)[A-Z0-9_]*\b/g;
const PUBLIC_ENV_KEY_PATTERN = /\bEXPO_PUBLIC_[A-Z0-9_]+\b/g;
const CONFIG_EXTENSIONS = new Set(['.json', '.jsonc', '.yml', '.yaml']);
const MAX_FINDINGS = 25;

export type EnvHygieneFindingKind =
  | 'public-secret-name'
  | 'hardcoded-credential-value'
  | 'undocumented-public-env';

export interface EnvHygieneFinding {
  file: string;
  line: number;
  kind: EnvHygieneFindingKind;
  severity: 'error' | 'warn';
  identifier?: string;
  detector: string;
  remediation: string;
}

export async function checkEnvHygiene(projectPath: string): Promise<DoctorCheckResult> {
  const envFiles = await findFiles(projectPath, (filePath) => isEnvBasename(path.basename(filePath)));
  const scannableFiles = await findFiles(projectPath, (filePath) =>
    isScannableCredentialFile(filePath)
  );

  const findings = await findEnvHygieneFindings(projectPath, [...envFiles, ...scannableFiles]);
  findings.push(...(await findUndocumentedPublicEnv(projectPath)));
  return toEnvHygieneResult(findings);
}

export async function scanFileEnvHygiene(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const findings = await findEnvHygieneFindings(projectPath, [filePath]);
  if (isLocalEnvFile(path.basename(filePath))) {
    findings.push(...(await findUndocumentedPublicEnv(projectPath, filePath)));
  }
  return toEnvHygieneResult(findings);
}

function toEnvHygieneResult(findings: EnvHygieneFinding[]): DoctorCheckResult {
  if (findings.length === 0) {
    return {
      name: 'env hygiene',
      status: 'pass',
      message: 'No secret-looking EXPO_PUBLIC variables or hardcoded credential values found.',
    };
  }

  const hasError = findings.some((finding) => finding.severity === 'error');
  return {
    name: 'env hygiene',
    status: hasError ? 'error' : 'warn',
    message: hasError
      ? 'Unsafe environment or credential patterns were found.'
      : 'Environment template or public-key documentation issues were found.',
    details: {
      findings: findings.slice(0, MAX_FINDINGS),
      truncated: findings.length > MAX_FINDINGS,
    },
  };
}

async function findEnvHygieneFindings(
  projectPath: string,
  filePaths: string[]
): Promise<EnvHygieneFinding[]> {
  const findings: EnvHygieneFinding[] = [];
  const seenFiles = new Set<string>();

  for (const filePath of filePaths) {
    if (seenFiles.has(filePath)) {
      continue;
    }
    seenFiles.add(filePath);

    const contents = await readOptionalText(filePath);
    if (!contents) {
      continue;
    }

    findings.push(...findPublicSecretNames(projectPath, filePath, contents));

    if (shouldScanCredentialValues(projectPath, filePath)) {
      findings.push(...findHardcodedCredentialValues(projectPath, filePath, contents));
    }
  }
  return findings;
}

async function findUndocumentedPublicEnv(
  projectPath: string,
  onlyLocalFile?: string
): Promise<EnvHygieneFinding[]> {
  const envFiles = await findFiles(projectPath, (filePath) => isEnvBasename(path.basename(filePath)));
  const localFiles = envFiles.filter((filePath) =>
    onlyLocalFile ? filePath === onlyLocalFile : isLocalEnvFile(path.basename(filePath))
  );
  const exampleFiles = envFiles.filter((filePath) => isExampleEnvFile(path.basename(filePath)));

  if (localFiles.length === 0) {
    return [];
  }

  const exampleKeys = new Set<string>();
  for (const exampleFile of exampleFiles) {
    const contents = (await readOptionalText(exampleFile)) ?? '';
    for (const key of readPublicEnvKeys(contents)) {
      exampleKeys.add(key);
    }
  }

  const findings: EnvHygieneFinding[] = [];
  const seen = new Set<string>();

  for (const localFile of localFiles) {
    const contents = (await readOptionalText(localFile)) ?? '';
    const keys = collectPublicEnvKeyLines(contents);
    if (keys.length === 0) {
      continue;
    }

    if (exampleFiles.length === 0) {
      const marker = `${relative(projectPath, localFile)}:missing-example`;
      if (seen.has(marker)) {
        continue;
      }
      seen.add(marker);
      findings.push({
        file: relative(projectPath, localFile),
        line: keys[0]?.line ?? 1,
        kind: 'undocumented-public-env',
        severity: 'warn',
        identifier: keys[0]?.key,
        detector: 'missing-env-example',
        remediation:
          'Add a committed .env.example that documents EXPO_PUBLIC_* keys with empty or placeholder values.',
      });
      continue;
    }

    for (const entry of keys) {
      if (exampleKeys.has(entry.key)) {
        continue;
      }
      const marker = `${relative(projectPath, localFile)}:${entry.key}`;
      if (seen.has(marker)) {
        continue;
      }
      seen.add(marker);
      findings.push({
        file: relative(projectPath, localFile),
        line: entry.line,
        kind: 'undocumented-public-env',
        severity: 'warn',
        identifier: entry.key,
        detector: 'undocumented-expo-public-env',
        remediation: `Document ${entry.key} in .env.example so public client config is not local-only.`,
      });
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
    if (isCommentOnlyLine(line)) {
      continue;
    }
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
        severity: 'error',
        identifier,
        detector: 'expo-public-secret-name',
        remediation:
          'Move private values to a server-only environment variable without the EXPO_PUBLIC_ prefix.',
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
  const seen = new Set<string>();

  for (const [lineIndex, line] of lines.entries()) {
    if (isCommentOnlyLine(line)) {
      continue;
    }

    const assignment = readSensitiveAssignment(line);
    if (assignment && !isDynamicOrInterpolatedValue(assignment.value)) {
      const providerDetector = detectKnownCredentialShape(assignment.value);
      const genericDetector =
        providerDetector ??
        (looksLikeCredentialValue(assignment.value) ? 'sensitive-assignment-literal' : null);
      if (genericDetector && !isPlaceholderValue(assignment.value)) {
        const findingKey = `${lineIndex}:${genericDetector}:${assignment.identifier}`;
        if (!seen.has(findingKey)) {
          seen.add(findingKey);
          findings.push(
            createCredentialFinding(projectPath, filePath, lineIndex, {
              identifier: sanitizeIdentifier(assignment.identifier),
              detector: genericDetector,
            })
          );
        }
      }
    }

    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line)) {
      const findingKey = `${lineIndex}:private-key-literal`;
      if (!seen.has(findingKey)) {
        seen.add(findingKey);
        findings.push(
          createCredentialFinding(projectPath, filePath, lineIndex, {
            identifier: 'private key',
            detector: 'private-key-literal',
          })
        );
      }
    }

    for (const literal of readQuotedOrEnvValues(line)) {
      if (isDynamicOrInterpolatedValue(literal) || isPlaceholderValue(literal)) {
        continue;
      }
      const detector = detectKnownCredentialShape(literal);
      if (!detector) {
        continue;
      }
      const findingKey = `${lineIndex}:${detector}`;
      if (seen.has(findingKey)) {
        continue;
      }
      seen.add(findingKey);
      findings.push(
        createCredentialFinding(projectPath, filePath, lineIndex, {
          identifier: sanitizeIdentifier(assignment?.identifier ?? detector),
          detector,
        })
      );
    }
  }

  return findings;
}

function createCredentialFinding(
  projectPath: string,
  filePath: string,
  lineIndex: number,
  options: { identifier?: string; detector: string }
): EnvHygieneFinding {
  const severity = credentialSeverityForDetector(options.detector);
  return {
    file: relative(projectPath, filePath),
    line: lineIndex + 1,
    kind: 'hardcoded-credential-value',
    severity,
    ...(options.identifier ? { identifier: options.identifier } : {}),
    detector: options.detector,
    remediation:
      severity === 'warn'
        ? 'Move publishable client keys to an EXPO_PUBLIC_* environment variable instead of hardcoding them.'
        : 'Move the literal credential into an ignored local env file or secret manager and read it through process.env.',
  };
}

function readSensitiveAssignment(line: string): { identifier: string; value: string } | null {
  const envMatch = line.match(
    /^\s*([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASS|KEY|SERVICE_ROLE|PRIVATE)[A-Z0-9_]*)\s*=\s*['"]?([^'"\s#]+)['"]?/
  );
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

export function detectKnownCredentialShape(value: string): string | null {
  const trimmed = stripBearerPrefix(value.trim());
  if (/^(sk|rk)_(live|test)_[A-Za-z0-9]{16,}$/.test(trimmed)) return 'stripe-key-shape';
  if (/^pk_(live|test)_[A-Za-z0-9]{16,}$/.test(trimmed)) return 'stripe-publishable-key-shape';
  if (/^sk-proj-[A-Za-z0-9_-]{20,}$/.test(trimmed)) return 'openai-project-key-shape';
  if (/^sk-[A-Za-z0-9]{20,}$/.test(trimmed)) return 'openai-key-shape';
  if (/^AKIA[0-9A-Z]{16}$/.test(trimmed)) return 'aws-access-key-shape';
  if (/^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+$/.test(trimmed)) return 'jwt-shape';
  if (/^xox[baprs]-[A-Za-z0-9-]{20,}$/.test(trimmed)) return 'slack-token-shape';
  if (/^gh[pousr]_[A-Za-z0-9_]{20,}$/.test(trimmed)) return 'github-token-shape';
  if (/^github_pat_[A-Za-z0-9_]{30,}$/.test(trimmed)) return 'github-token-shape';
  if (/^SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(trimmed)) return 'sendgrid-key-shape';
  if (/^whsec_[A-Za-z0-9]{16,}$/.test(trimmed)) return 'webhook-secret-shape';
  if (/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(trimmed)) return 'supabase-secret-shape';
  if (/^Bearer\s+\S{20,}/i.test(value.trim()) && looksLikeCredentialValue(trimmed)) {
    return 'bearer-token-shape';
  }
  return null;
}

export function credentialSeverityForDetector(detector: string): 'error' | 'warn' {
  return detector === 'stripe-publishable-key-shape' ? 'warn' : 'error';
}

export function looksLikeCredentialValue(value: string): boolean {
  const trimmed = stripBearerPrefix(value.trim());
  if (trimmed.length < 16 || isPlaceholderValue(trimmed) || isDynamicOrInterpolatedValue(trimmed)) {
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

export function isDynamicOrInterpolatedValue(value: string): boolean {
  return value.includes('process.env') || value.includes('${') || value.includes('{{');
}

export function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (
    normalized.includes('your-') ||
    normalized.includes('replace') ||
    normalized.includes('changeme') ||
    normalized.includes('change-me') ||
    normalized.includes('example') ||
    normalized.includes('dummy') ||
    normalized.includes('placeholder') ||
    normalized.includes('from-secure-vault') ||
    normalized.includes('secure-vault') ||
    normalized.includes('test-only') ||
    normalized.includes('todo')
  ) {
    return true;
  }
  const compact = normalized.replace(/[._\-\s]/g, '');
  return compact.length >= 6 && /^x+$/.test(compact);
}

export function isCommentOnlyLine(line: string): boolean {
  return /^\s*(#|\/\/|\*|\*\/|<!--)/.test(line);
}

export function stripBearerPrefix(value: string): string {
  return value.replace(/^Bearer\s+/i, '');
}

function sanitizeIdentifier(identifier: string): string {
  return identifier.replace(/[^A-Za-z0-9_$.-]/g, '').slice(0, 80);
}

function readQuotedOrEnvValues(line: string): string[] {
  const values: string[] = [];
  for (const match of line.matchAll(/(['"`])([^'"`]+)\1/g)) {
    if (match[2]) {
      values.push(match[2]);
    }
  }

  const envValue = line.match(/^\s*[A-Z0-9_]+\s*=\s*['"]?([^'"\s#]+)['"]?/);
  if (envValue?.[1]) {
    values.push(envValue[1]);
  }

  const bearer = line.match(/\bBearer\s+(\S+)/i);
  if (bearer?.[0]) {
    values.push(bearer[0].replace(/[,'"]+$/, ''));
  }

  return values;
}

function shouldScanCredentialValues(projectPath: string, filePath: string): boolean {
  const basename = path.basename(filePath);
  if (isLockfile(basename) || isRealEnvFile(basename) || isToolingOrTestPath(projectPath, filePath)) {
    return false;
  }
  return isScannableCredentialFile(filePath) || isExampleEnvFile(basename);
}

function isScannableCredentialFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (isExampleEnvFile(basename) || isLockfile(basename) || isRealEnvFile(basename)) {
    return false;
  }
  const extension = path.extname(filePath);
  return SOURCE_EXTENSIONS.has(extension) || CONFIG_EXTENSIONS.has(extension);
}

function isEnvBasename(basename: string): boolean {
  return basename === '.env' || basename.startsWith('.env.');
}

function isRealEnvFile(basename: string): boolean {
  return isEnvBasename(basename) && !isExampleEnvFile(basename);
}

function isLocalEnvFile(basename: string): boolean {
  return isRealEnvFile(basename) && basename.endsWith('.local');
}

function isExampleEnvFile(basename: string): boolean {
  return (
    /\.(example|sample|template)$/i.test(basename) ||
    /(^|[.-])(example|sample|template)([.-]|$)/i.test(basename)
  );
}

function isLockfile(basename: string): boolean {
  return basename === 'package-lock.json' || basename === 'pnpm-lock.yaml' || basename === 'yarn.lock';
}

function readPublicEnvKeys(contents: string): string[] {
  return collectPublicEnvKeyLines(contents).map((entry) => entry.key);
}

function collectPublicEnvKeyLines(contents: string): Array<{ key: string; line: number }> {
  const entries: Array<{ key: string; line: number }> = [];
  const seen = new Set<string>();
  for (const [lineIndex, line] of contents.split(/\r?\n/).entries()) {
    if (isCommentOnlyLine(line) || !/^\s*EXPO_PUBLIC_[A-Z0-9_]+\s*=/.test(line)) {
      continue;
    }
    const match = line.match(/^\s*(EXPO_PUBLIC_[A-Z0-9_]+)\s*=/);
    const key = match?.[1];
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({ key, line: lineIndex + 1 });
  }

  if (entries.length === 0) {
    for (const [lineIndex, line] of contents.split(/\r?\n/).entries()) {
      if (isCommentOnlyLine(line)) {
        continue;
      }
      for (const match of line.matchAll(PUBLIC_ENV_KEY_PATTERN)) {
        const key = match[0];
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        entries.push({ key, line: lineIndex + 1 });
      }
    }
  }

  return entries;
}
