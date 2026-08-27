import path from 'node:path';

import type { DoctorCheckResult, PackageJson } from '../types.js';
import {
  findExpoRouterApiRouteFiles,
  hasExpoRouterSignal,
  isExpoRouterApiRouteFile,
  isTestLikeFile,
} from '../expo-router.js';
import { readOptionalText, relative, stripJsComments } from '../utils.js';

const MAX_FINDINGS = 50;

const NAMED_METHOD_RE =
  /\bexport\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b|\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*=/;
const DEFAULT_EXPORT_RE = /\bexport\s+default\b/;
const REQUEST_METHOD_RE = /\brequest\.method\b/;
const BODY_READ_RE = /\brequest\.(json|formData)\s*\(/;
const GET_EXPORT_RE = /\bexport\s+(async\s+)?function\s+GET\b|\bexport\s+const\s+GET\s*=/;
const WRITE_METHOD_EXPORT_RE =
  /\bexport\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b|\bexport\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/;
const VALIDATION_RE =
  /\b(z\.object|z\.string|z\.enum|\.safeParse\s*\(|\.parse\s*\(|parseBillingJson|handleDbWrite\s*\(|zod)\b/;
const AUTH_SIGNAL_RE =
  /\b(requireAuth|requireAuthUserId|requireBillingAuth|requireBillingAuthUserId|handleDbWrite|getSession|getUser|getClaims|request\.auth|createServerClient|Authorization|Bearer|requireHostedAccess)\b/;
const WEBHOOK_SIGNATURE_RE =
  /\b(stripe-signature|svix-signature|webhook-signature|x-hub-signature|x-signature)\b/i;
const SERVICE_ROLE_USE_RE =
  /\bprocess\.env\.[A-Z0-9_]*SERVICE_ROLE[A-Z0-9_]*\b|\bcreate(?:Client|SupabaseClient)\s*\([\s\S]{0,300}\b(SERVICE_ROLE|serviceRole|service_role)\b/;
const RATE_LIMIT_RE = /\b(rateLimit|rate-limit|ratelimit|quota|upstash)\b|\bstatus:\s*429\b/;
const STACK_JSON_RE = /\bstack\s*:\s*(error|err|e)\.stack\b/;
const STACK_VALUE_RE = /\b(error|err|e)\.stack\b/;
const STRINGIFY_ERROR_RE = /\bJSON\.stringify\s*\(\s*(error|err|e)\s*\)/;
const CORS_STAR_RE = /Access-Control-Allow-Origin['"`]\s*,\s*['"`]\s*\*/i;
const CORS_HEADER_RE = /Access-Control-Allow-Origin/i;
const ORIGIN_REFLECT_RE = /\b(origin|requestOrigin|allowedOrigin)\b/;
const CORS_ALLOWLIST_RE = /\b(ALLOWED_ORIGINS|allowedOrigins|allowedOrigin|normalizeOrigin)\b/;
const ARRAY_BUFFER_RE = /\brequest\.arrayBuffer\s*\(/;
const CATCH_ALL_RE = /\[\.\.\./;

const SENSITIVE_PATH_RE =
  /(auth|sign-in|sign-up|login|billing|payment|checkout|subscription|webhook|admin|account|credential|mercury-credentials|\/db\/)/i;
const RATE_LIMIT_PATH_RE =
  /(auth|sign-in|sign-up|login|billing|payment|checkout|subscription|webhook|credential|mercury-credentials)/i;
const PUBLIC_PATH_RE = /(public|health|content)/i;

export interface ApiSafetyFinding {
  file: string;
  kind: string;
  message: string;
  severity: 'warn' | 'error';
}

export async function checkApiSafety(
  packageJson: PackageJson,
  projectPath: string
): Promise<DoctorCheckResult> {
  if (!hasExpoRouterSignal(packageJson)) {
    return {
      name: 'api safety',
      status: 'skip',
      message: 'No Expo Router API route files found.',
    };
  }

  const apiFiles = await findExpoRouterApiRouteFiles(projectPath, packageJson);
  if (apiFiles.length === 0) {
    return {
      name: 'api safety',
      status: 'skip',
      message: 'No Expo Router API route files found.',
    };
  }

  const findings: ApiSafetyFinding[] = [];
  for (const filePath of apiFiles) {
    if (isTestLikeFile(filePath)) {
      continue;
    }
    const contents = (await readOptionalText(filePath)) ?? '';
    findings.push(...scanApiFile(projectPath, filePath, contents));
  }

  return toApiResult(findings);
}

export async function scanFileApiSafety(
  projectPath: string,
  filePath: string,
  packageJson?: PackageJson
): Promise<DoctorCheckResult> {
  if (!packageJson || !isExpoRouterApiRouteFile(projectPath, filePath, packageJson)) {
    return {
      name: 'api safety',
      status: 'skip',
      message: 'File is not an Expo Router API route.',
    };
  }

  if (isTestLikeFile(filePath)) {
    return {
      name: 'api safety',
      status: 'skip',
      message: 'Test files are excluded from API safety checks.',
    };
  }

  const contents = (await readOptionalText(filePath)) ?? '';
  return toApiResult(scanApiFile(projectPath, filePath, contents), true);
}

export function checkAuthChecks(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const classification = classifyApiFile(projectPath, filePath, contents);
  if (!classification.sensitive || classification.webhook || classification.publicOrProxy) {
    return [];
  }
  if (hasAuthSignal(contents)) {
    return [];
  }

  const shortPath = relative(projectPath, filePath);
  return [
    {
      file: shortPath,
      kind: 'missing-auth',
      severity: 'warn',
      message: `${shortPath}: sensitive API route does not verify auth (request.auth, session helper, or handleDbWrite).`,
    },
  ];
}

export function checkMethodValidation(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const scanned = stripJsComments(contents);
  const shortPath = relative(projectPath, filePath);
  const findings: ApiSafetyFinding[] = [];

  const hasNamedMethod = NAMED_METHOD_RE.test(scanned);
  if (!hasNamedMethod && DEFAULT_EXPORT_RE.test(scanned) && !REQUEST_METHOD_RE.test(scanned)) {
    findings.push({
      file: shortPath,
      kind: 'missing-method-guard',
      severity: 'warn',
      message: `${shortPath}: default API handler does not inspect request.method or export named HTTP methods.`,
    });
  }

  if (
    GET_EXPORT_RE.test(scanned) &&
    !WRITE_METHOD_EXPORT_RE.test(scanned) &&
    BODY_READ_RE.test(scanned)
  ) {
    findings.push({
      file: shortPath,
      kind: 'get-reads-body',
      severity: 'warn',
      message: `${shortPath}: GET handler reads a request body; add a named POST/PUT/PATCH export or stop parsing JSON on GET.`,
    });
  }

  return findings;
}

export function checkInputValidation(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const classification = classifyApiFile(projectPath, filePath, contents);
  const scanned = stripJsComments(contents);
  if (!BODY_READ_RE.test(scanned)) {
    return [];
  }
  if (classification.webhook || ARRAY_BUFFER_RE.test(scanned)) {
    return [];
  }
  if (VALIDATION_RE.test(scanned)) {
    return [];
  }

  const shortPath = relative(projectPath, filePath);
  return [
    {
      file: shortPath,
      kind: 'missing-validation',
      severity: 'warn',
      message: `${shortPath}: request body is read without a Zod/schema parse; validate input before business logic.`,
    },
  ];
}

export function checkServiceRole(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const scanned = stripJsComments(contents);
  if (!SERVICE_ROLE_USE_RE.test(scanned)) {
    return [];
  }
  if (hasAuthSignal(contents)) {
    return [];
  }

  const shortPath = relative(projectPath, filePath);
  return [
    {
      file: shortPath,
      kind: 'service-role-without-auth',
      severity: 'warn',
      message: `${shortPath}: uses a service-role token without an auth check; prefer the user/anon client or gate the privileged client.`,
    },
  ];
}

export function checkRateLimiting(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const classification = classifyApiFile(projectPath, filePath, contents);
  if (!classification.rateLimitSensitive) {
    return [];
  }
  const scanned = stripJsComments(contents);
  if (RATE_LIMIT_RE.test(scanned)) {
    return [];
  }

  const shortPath = relative(projectPath, filePath);
  return [
    {
      file: shortPath,
      kind: 'missing-rate-limit',
      severity: 'warn',
      message: `${shortPath}: sensitive endpoint has no rate-limit or quota signal (rateLimit, 429, quota).`,
    },
  ];
}

export function checkErrorExposure(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const scanned = stripJsComments(contents);
  const shortPath = relative(projectPath, filePath);
  const findings: ApiSafetyFinding[] = [];

  if (STACK_JSON_RE.test(scanned)) {
    findings.push({
      file: shortPath,
      kind: 'stack-in-json',
      severity: 'error',
      message: `${shortPath}: returns error.stack in a JSON body; clients must not receive stack traces.`,
    });
    return findings;
  }

  if (STACK_VALUE_RE.test(scanned)) {
    findings.push({
      file: shortPath,
      kind: 'stack-exposure',
      severity: 'warn',
      message: `${shortPath}: interpolates error.stack into a response path; return a generic error instead.`,
    });
  }

  if (STRINGIFY_ERROR_RE.test(scanned)) {
    findings.push({
      file: shortPath,
      kind: 'stringify-error',
      severity: 'warn',
      message: `${shortPath}: JSON.stringify(error) may leak internals; return a safe error envelope.`,
    });
  }

  return findings;
}

export function checkCors(
  projectPath: string,
  filePath: string,
  contents: string
): ApiSafetyFinding[] {
  const scanned = stripJsComments(contents);
  const shortPath = relative(projectPath, filePath);
  const findings: ApiSafetyFinding[] = [];

  if (CORS_STAR_RE.test(scanned) || /Access-Control-Allow-Origin['":\s]*\*/.test(scanned)) {
    findings.push({
      file: shortPath,
      kind: 'cors-wildcard',
      severity: 'warn',
      message: `${shortPath}: Access-Control-Allow-Origin is '*'; restrict CORS to an explicit origin allowlist.`,
    });
    return findings;
  }

  if (
    CORS_HEADER_RE.test(scanned) &&
    ORIGIN_REFLECT_RE.test(scanned) &&
    !CORS_ALLOWLIST_RE.test(scanned)
  ) {
    findings.push({
      file: shortPath,
      kind: 'cors-reflect',
      severity: 'warn',
      message: `${shortPath}: reflects request Origin without an allowlist; validate origin before echoing it.`,
    });
  }

  return findings;
}

function scanApiFile(projectPath: string, filePath: string, contents: string): ApiSafetyFinding[] {
  return [
    ...checkAuthChecks(projectPath, filePath, contents),
    ...checkMethodValidation(projectPath, filePath, contents),
    ...checkInputValidation(projectPath, filePath, contents),
    ...checkServiceRole(projectPath, filePath, contents),
    ...checkRateLimiting(projectPath, filePath, contents),
    ...checkErrorExposure(projectPath, filePath, contents),
    ...checkCors(projectPath, filePath, contents),
  ];
}

function classifyApiFile(
  projectPath: string,
  filePath: string,
  contents: string
): { sensitive: boolean; rateLimitSensitive: boolean; webhook: boolean; publicOrProxy: boolean } {
  const shortPath = relative(projectPath, filePath);
  const scanned = stripJsComments(contents);
  const webhook = /webhook/i.test(shortPath) || WEBHOOK_SIGNATURE_RE.test(scanned);
  const publicOrProxy =
    PUBLIC_PATH_RE.test(shortPath) ||
    (CATCH_ALL_RE.test(path.basename(filePath)) && CORS_ALLOWLIST_RE.test(scanned));
  const sensitive = SENSITIVE_PATH_RE.test(shortPath);
  const rateLimitSensitive = RATE_LIMIT_PATH_RE.test(shortPath);
  return { sensitive, rateLimitSensitive, webhook, publicOrProxy };
}

function hasAuthSignal(contents: string): boolean {
  return AUTH_SIGNAL_RE.test(stripJsComments(contents)) || WEBHOOK_SIGNATURE_RE.test(contents);
}

function toApiResult(findings: ApiSafetyFinding[], fileScan = false): DoctorCheckResult {
  if (findings.length === 0) {
    return {
      name: 'api safety',
      status: 'pass',
      message: fileScan
        ? 'File passed the API safety scan.'
        : 'API routes passed auth, validation, method, and exposure checks.',
    };
  }

  const hasError = findings.some((finding) => finding.severity === 'error');
  return {
    name: 'api safety',
    status: hasError ? 'error' : 'warn',
    message: hasError
      ? fileScan
        ? 'File leaks internals in an API error response.'
        : 'API routes leak internals in error responses.'
      : fileScan
        ? 'File has API safety warnings.'
        : 'API routes have auth, validation, method, or exposure warnings.',
    details: {
      findings: findings.slice(0, MAX_FINDINGS),
      truncated: findings.length > MAX_FINDINGS,
    },
  };
}
