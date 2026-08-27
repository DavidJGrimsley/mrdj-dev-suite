import path from 'node:path';

import {
  findExpoRouterApiRouteFiles,
  hasExpoRouterSignal,
  isExpoRouterApiRouteFile,
} from '../expo-router.js';
import type { DoctorCheckResult, PackageJson } from '../types.js';
import {
  findFiles,
  firstExistingPath,
  isToolingOrTestPath,
  pathExists,
  readOptionalText,
  readPackageJson,
  relative,
  SOURCE_EXTENSIONS,
} from '../utils.js';
import {
  credentialSeverityForDetector,
  detectKnownCredentialShape,
  isCommentOnlyLine,
  isDynamicOrInterpolatedValue,
  isPlaceholderValue,
  looksLikeCredentialValue,
} from './env-hygiene.js';

const MAX_FINDINGS = 25;
const IMPORT_FOLLOW_DEPTH = 2;
const SERVER_PACKAGES = new Set([
  'prisma',
  '@prisma/client',
  'drizzle-orm',
  'pg',
  'postgres',
  'mysql2',
  'better-sqlite3',
  'sqlite3',
  'mongodb',
  'mongoose',
  'express',
  'koa',
  'fastify',
  'hono',
  'firebase-admin',
  'jsonwebtoken',
  'bcrypt',
  'bcryptjs',
  'argon2',
  'nodemailer',
  'ioredis',
  'redis',
]);
const SERVER_NODE_BUILTINS = new Set([
  'node:fs',
  'node:child_process',
  'node:http',
  'node:https',
  'node:net',
  'node:cluster',
]);
const CLIENT_ENV_ALLOWLIST = new Set([
  'NODE_ENV',
  'EXPO_OS',
  'JEST_WORKER_ID',
  'VITEST',
  'VITEST_POOL_ID',
]);
const TOOLING_CONFIG_BASENAME =
  /^(metro|babel|drizzle|tailwind|eslint|prettier|vitest|jest|webpack|app)\.config\.(js|cjs|mjs|ts)$/;
const EXPO_CONFIG_BASENAMES = new Set([
  'app.json',
  'app.config.js',
  'app.config.ts',
  'app.config.mjs',
  'app.config.cjs',
]);
const METRO_CONFIG_BASENAMES = [
  'metro.config.js',
  'metro.config.cjs',
  'metro.config.mjs',
  'metro.config.ts',
];
const SERVER_PATH_SEGMENTS = new Set([
  'server',
  'servers',
  'api-server',
  'database',
  'drizzle',
  'db',
  'scripts',
  'middlewares',
  'middleware',
]);
const CLIENT_BUNDLE_SEGMENTS = new Set(['components', 'features', 'screens', 'hooks', 'services']);
const SENSITIVE_EXTRA_KEY =
  /(apiKey|api_key|secret|token|password|serviceRole|service_role|privateKey|private_key|clientSecret|client_secret)/i;
const IMPORT_SPECIFIER_PATTERN =
  /(?:(?:^|[^\w.$])(?:import(?:\s+type)?(?:[\s\w{},*$]*from)?|export(?:\s+\*(?:\s+as\s+\w+)?|{[\s\w,]*})?\s+from)\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const PROCESS_ENV_PATTERN =
  /process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\])/g;
const LOCALHOST_FETCH_PATTERN =
  /\b(?:fetch|axios)(?:\.(?:get|post|put|patch|delete))?\s*\(\s*['"`]https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2)(?::\d+)?/gi;
const USE_SERVER_PATTERN = /^['"]use server['"]\s*;?$/;

export type RuntimeSecurityFindingKind =
  | 'server-package-import'
  | 'server-file-import'
  | 'server-builtin-import'
  | 'metro-node-runtime'
  | 'expo-config-hardcoded-credential'
  | 'client-private-env'
  | 'localhost-fetch';

export interface RuntimeSecurityFinding {
  file: string;
  line: number;
  kind: RuntimeSecurityFindingKind;
  severity: 'error' | 'warn';
  detector: string;
  remediation: string;
  identifier?: string;
}

export async function checkRuntimeSecurity(projectPath: string): Promise<DoctorCheckResult> {
  const packageJson = await readPackageJson(path.join(projectPath, 'package.json'));
  if (!(await hasExpoAppSignal(projectPath, packageJson))) {
    return {
      name: 'runtime security',
      status: 'skip',
      message: 'No Expo app signals; runtime security scan skipped.',
    };
  }

  const findings = [
    ...(await checkServerImports(projectPath, packageJson)),
    ...(await checkSSRSafety(projectPath, packageJson)),
    ...(await checkCredentialExposure(projectPath, packageJson)),
  ];
  return toRuntimeSecurityResult(findings, true);
}

export async function scanFileRuntimeSecurity(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const packageJson = await readPackageJson(path.join(projectPath, 'package.json'));
  const expo = await hasExpoAppSignal(projectPath, packageJson);
  if (!expo) {
    return {
      name: 'runtime security',
      status: 'skip',
      message: 'No Expo app signals; runtime security scan skipped.',
    };
  }

  const findings = await scanRuntimeSecurityFile(projectPath, filePath, packageJson ?? {});
  const basename = path.basename(filePath);
  if (METRO_CONFIG_BASENAMES.includes(basename)) {
    findings.push(...(await checkSSRSafety(projectPath, packageJson)));
  }
  return toRuntimeSecurityResult(findings, true);
}

export async function checkServerImports(
  projectPath: string,
  packageJson?: PackageJson | null
): Promise<RuntimeSecurityFinding[]> {
  const pkg = packageJson ?? (await readPackageJson(path.join(projectPath, 'package.json'))) ?? {};
  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  const findings: RuntimeSecurityFinding[] = [];

  for (const filePath of sourceFiles) {
    if (isIgnoredRuntimeFile(projectPath, filePath) || !isClientBundleRoot(projectPath, filePath)) {
      continue;
    }
    findings.push(...(await findServerImportFindings(projectPath, filePath, pkg)));
    if (findings.length >= MAX_FINDINGS) {
      break;
    }
  }

  return findings;
}

export async function checkSSRSafety(
  projectPath: string,
  packageJson?: PackageJson | null
): Promise<RuntimeSecurityFinding[]> {
  const pkg = packageJson ?? (await readPackageJson(path.join(projectPath, 'package.json'))) ?? {};
  if (!(await projectUsesServerRuntime(projectPath, pkg))) {
    return [];
  }

  const metroPath = await firstExistingPath(
    METRO_CONFIG_BASENAMES.map((basename) => path.join(projectPath, basename))
  );
  if (!metroPath) {
    return [];
  }

  const contents = (await readOptionalText(metroPath)) ?? '';
  if (!contents.trim()) {
    return [];
  }

  const usesExpoDefault = /getDefaultConfig\s*\(/.test(contents) && /expo\/metro-config/.test(contents);
  const overwritesConditions =
    /unstable_conditionNames\s*=/.test(contents) || /unstable_conditionsByPlatform\s*=/.test(contents);
  const mentionsNodeCondition = /['"]node['"]/.test(contents);

  if (usesExpoDefault && !overwritesConditions) {
    return [];
  }

  if (overwritesConditions && mentionsNodeCondition) {
    return [];
  }

  if (!usesExpoDefault || (overwritesConditions && !mentionsNodeCondition)) {
    return [
      {
        file: relative(projectPath, metroPath),
        line: lineNumberOf(contents, /unstable_conditionNames|getDefaultConfig|module\.exports/),
        kind: 'metro-node-runtime',
        severity: 'warn',
        detector: 'metro-missing-node-condition',
        identifier: 'node',
        remediation:
          'Keep expo/metro-config getDefaultConfig and include "node" in resolver.unstable_conditionNames (or conditionsByPlatform) so API routes and server modules resolve the Node runtime target.',
      },
    ];
  }

  return [];
}

export async function checkCredentialExposure(
  projectPath: string,
  packageJson?: PackageJson | null
): Promise<RuntimeSecurityFinding[]> {
  const pkg = packageJson ?? (await readPackageJson(path.join(projectPath, 'package.json'))) ?? {};
  const findings: RuntimeSecurityFinding[] = [];

  const configFiles = await findFiles(projectPath, (filePath) =>
    EXPO_CONFIG_BASENAMES.has(path.basename(filePath))
  );
  for (const filePath of configFiles) {
    const contents = (await readOptionalText(filePath)) ?? '';
    if (contents) {
      findings.push(...findExpoConfigCredentialFindings(projectPath, filePath, contents));
    }
  }

  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  for (const filePath of sourceFiles) {
    if (isIgnoredRuntimeFile(projectPath, filePath) || !isClientBundleRoot(projectPath, filePath)) {
      continue;
    }
    findings.push(...(await findClientCredentialFindings(projectPath, filePath, pkg)));
    if (findings.length >= MAX_FINDINGS) {
      break;
    }
  }

  return findings;
}

async function scanRuntimeSecurityFile(
  projectPath: string,
  filePath: string,
  packageJson: PackageJson
): Promise<RuntimeSecurityFinding[]> {
  if (isIgnoredRuntimeFile(projectPath, filePath)) {
    return [];
  }

  const findings: RuntimeSecurityFinding[] = [];
  const basename = path.basename(filePath);
  const contents = (await readOptionalText(filePath)) ?? '';

  if (EXPO_CONFIG_BASENAMES.has(basename) && contents) {
    findings.push(...findExpoConfigCredentialFindings(projectPath, filePath, contents));
  }

  if (SOURCE_EXTENSIONS.has(path.extname(filePath))) {
    findings.push(...(await findServerImportFindings(projectPath, filePath, packageJson)));
    findings.push(...(await findClientCredentialFindings(projectPath, filePath, packageJson)));
  }

  return findings;
}

async function findServerImportFindings(
  projectPath: string,
  filePath: string,
  packageJson: PackageJson
): Promise<RuntimeSecurityFinding[]> {
  const contents = (await readOptionalText(filePath)) ?? '';
  if (!contents || (await isServerRuntimeFile(projectPath, filePath, packageJson, contents))) {
    return [];
  }

  const findings: RuntimeSecurityFinding[] = [];
  const seen = new Set<string>();
  const queue: Array<{ filePath: string; contents: string; depth: number; originLine: number }> = [
    { filePath, contents, depth: 0, originLine: 1 },
  ];
  const visited = new Set<string>([filePath]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const imported of readImportSpecifiers(current.contents)) {
      const reportLine = current.depth === 0 ? imported.line : current.originLine;
      const packageName = packageNameFromSpecifier(imported.specifier);
      if (packageName && SERVER_PACKAGES.has(packageName)) {
        const key = `${reportLine}:${packageName}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        findings.push({
          file: relative(projectPath, filePath),
          line: reportLine,
          kind: 'server-package-import',
          severity: 'error',
          detector: 'server-package-on-client',
          identifier: packageName,
          remediation: `Move ${packageName} usage behind an Expo Router API route, a *.server.* module, or a 'use server' file that the client does not import.`,
        });
        continue;
      }

      if (SERVER_NODE_BUILTINS.has(imported.specifier)) {
        const key = `${reportLine}:${imported.specifier}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        findings.push({
          file: relative(projectPath, filePath),
          line: reportLine,
          kind: 'server-builtin-import',
          severity: 'error',
          detector: 'node-builtin-on-client',
          identifier: imported.specifier,
          remediation: `Keep ${imported.specifier} on the server. Use an API route or server module instead of importing it from client code.`,
        });
        continue;
      }

      if (current.depth >= IMPORT_FOLLOW_DEPTH) {
        continue;
      }

      const resolved = await resolveRelativeImport(current.filePath, imported.specifier);
      if (!resolved || visited.has(resolved)) {
        continue;
      }
      visited.add(resolved);

      const resolvedContents = (await readOptionalText(resolved)) ?? '';
      const resolvedIsServer = await isServerRuntimeFile(
        projectPath,
        resolved,
        packageJson,
        resolvedContents
      );
      if (resolvedIsServer) {
        const key = `${reportLine}:${imported.specifier}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        findings.push({
          file: relative(projectPath, filePath),
          line: reportLine,
          kind: 'server-file-import',
          severity: 'error',
          detector: 'server-module-on-client',
          identifier: imported.specifier,
          remediation:
            'Do not import server-only modules (*.server.*, +api routes, or "use server" files) from client components.',
        });
        continue;
      }

      queue.push({
        filePath: resolved,
        contents: resolvedContents,
        depth: current.depth + 1,
        originLine: reportLine,
      });
    }
  }

  return findings;
}

async function findClientCredentialFindings(
  projectPath: string,
  filePath: string,
  packageJson: PackageJson
): Promise<RuntimeSecurityFinding[]> {
  const contents = (await readOptionalText(filePath)) ?? '';
  if (!contents || (await isServerRuntimeFile(projectPath, filePath, packageJson, contents))) {
    return [];
  }

  const findings: RuntimeSecurityFinding[] = [];
  const searchable = stripCommentsPreservingLines(contents);
  const lines = searchable.split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    if (isCommentOnlyLine(line)) {
      continue;
    }

    PROCESS_ENV_PATTERN.lastIndex = 0;
    for (const match of line.matchAll(PROCESS_ENV_PATTERN)) {
      const identifier = match[1] ?? match[2];
      if (!identifier || isAllowedClientEnvName(identifier)) {
        continue;
      }
      findings.push({
        file: relative(projectPath, filePath),
        line: lineIndex + 1,
        kind: 'client-private-env',
        severity: 'error',
        detector: 'client-process-env',
        identifier,
        remediation:
          'Client bundles can only read EXPO_PUBLIC_* variables (plus NODE_ENV and EXPO_OS). Move private env access to an API route or server module.',
      });
    }

    LOCALHOST_FETCH_PATTERN.lastIndex = 0;
    if (LOCALHOST_FETCH_PATTERN.test(line)) {
      findings.push({
        file: relative(projectPath, filePath),
        line: lineIndex + 1,
        kind: 'localhost-fetch',
        severity: 'warn',
        detector: 'hardcoded-localhost-fetch',
        identifier: 'localhost',
        remediation:
          'Replace hardcoded localhost/dev-server URLs with an EXPO_PUBLIC_* base URL so production builds do not call the local machine.',
      });
    }
  }

  return findings;
}

function findExpoConfigCredentialFindings(
  projectPath: string,
  filePath: string,
  contents: string
): RuntimeSecurityFinding[] {
  const findings: RuntimeSecurityFinding[] = [];
  const lines = stripCommentsPreservingLines(contents).split(/\r?\n/);

  for (const [lineIndex, line] of lines.entries()) {
    if (isCommentOnlyLine(line)) {
      continue;
    }

    for (const value of readQuotedValues(line)) {
      if (
        isDynamicOrInterpolatedValue(value) ||
        isPlaceholderValue(value) ||
        looksLikeNonSecretConfigValue(value)
      ) {
        continue;
      }
      const detector = detectKnownCredentialShape(value);
      if (detector) {
        findings.push({
          file: relative(projectPath, filePath),
          line: lineIndex + 1,
          kind: 'expo-config-hardcoded-credential',
          severity: credentialSeverityForDetector(detector),
          detector,
          identifier: detector,
          remediation:
            'Do not hardcode credentials in Expo config. Read publishable values from EXPO_PUBLIC_* and keep secrets on the server.',
        });
        continue;
      }
    }

    const assignment = line.match(
      /['"]?([A-Za-z0-9_$.-]*(?:apiKey|api_key|secret|token|password|serviceRole|service_role|privateKey|private_key)[A-Za-z0-9_$.-]*)['"]?\s*[:=]\s*(['"`])([^'"`]+)\2/i
    );
    if (!assignment?.[1] || !assignment[3] || /process\.env/.test(assignment[3])) {
      continue;
    }
    if (
      isDynamicOrInterpolatedValue(assignment[3]) ||
      isPlaceholderValue(assignment[3]) ||
      looksLikeNonSecretConfigValue(assignment[3])
    ) {
      continue;
    }
    if (SENSITIVE_EXTRA_KEY.test(assignment[1]) && looksLikeCredentialValue(assignment[3])) {
      findings.push({
        file: relative(projectPath, filePath),
        line: lineIndex + 1,
        kind: 'expo-config-hardcoded-credential',
        severity: 'error',
        detector: 'expo-extra-literal',
        identifier: assignment[1].slice(0, 80),
        remediation:
          'Move Expo extra credentials out of app config literals and into environment variables. Only EXPO_PUBLIC_* values may ship in the client extra config.',
      });
    }
  }

  return findings;
}

async function isServerRuntimeFile(
  projectPath: string,
  filePath: string,
  packageJson: PackageJson,
  contents?: string
): Promise<boolean> {
  const rel = relative(projectPath, filePath);
  const basename = path.basename(filePath);
  const extension = path.extname(filePath);
  const stem = basename.slice(0, basename.length - extension.length);

  if (EXPO_CONFIG_BASENAMES.has(basename) || METRO_CONFIG_BASENAMES.includes(basename)) {
    return true;
  }
  if (/^(babel|eslint)\.config\.(js|cjs|mjs|ts)$/.test(basename)) {
    return true;
  }
  const pathSegments = rel.split('/');
  if (pathSegments.some((segment) => SERVER_PATH_SEGMENTS.has(segment))) {
    return true;
  }
  if (/^(server|api-server)(\.|$)/i.test(stem)) {
    return true;
  }
  if (TOOLING_CONFIG_BASENAME.test(basename) || extension === '.cjs') {
    return true;
  }
  if (!rel.includes('/') && /\.(js|mjs|cjs)$/.test(basename) && !EXPO_CONFIG_BASENAMES.has(basename)) {
    return true;
  }
  if (stem === '+html' || stem.endsWith('.server') || /\.server$/.test(stem)) {
    return true;
  }
  if (isExpoRouterApiRouteFile(projectPath, filePath, packageJson)) {
    return true;
  }

  const fileContents = contents ?? (await readOptionalText(filePath)) ?? '';
  return hasUseServerDirective(fileContents);
}

function isIgnoredRuntimeFile(projectPath: string, filePath: string): boolean {
  return isToolingOrTestPath(projectPath, filePath);
}

function isClientBundleRoot(projectPath: string, filePath: string): boolean {
  const rel = relative(projectPath, filePath);
  if (rel.startsWith('app/') || rel.startsWith('src/app/')) {
    return true;
  }
  return rel.split('/').some((segment) => CLIENT_BUNDLE_SEGMENTS.has(segment));
}

function hasUseServerDirective(contents: string): boolean {
  for (const line of stripCommentsPreservingLines(contents).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    return USE_SERVER_PATTERN.test(trimmed);
  }
  return false;
}

function readImportSpecifiers(contents: string): Array<{ specifier: string; line: number }> {
  const searchable = stripCommentsPreservingLines(contents);
  const results: Array<{ specifier: string; line: number }> = [];
  IMPORT_SPECIFIER_PATTERN.lastIndex = 0;
  for (const match of searchable.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const specifier = match[1];
    if (!specifier || match[0].includes('import type')) {
      continue;
    }
    results.push({
      specifier,
      line: lineNumberAt(searchable, match.index ?? 0),
    });
  }
  return results;
}

async function resolveRelativeImport(fromFile: string, specifier: string): Promise<string | null> {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function packageNameFromSpecifier(specifier: string): string | null {
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:') ||
    specifier.startsWith('#')
  ) {
    return null;
  }
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0] ?? null;
}

async function hasExpoAppSignal(
  projectPath: string,
  packageJson: PackageJson | null
): Promise<boolean> {
  if (packageJson && (hasExpoRouterSignal(packageJson) || hasExpoDependency(packageJson))) {
    return true;
  }

  const configPath = await firstExistingPath(
    [...EXPO_CONFIG_BASENAMES].map((basename) => path.join(projectPath, basename))
  );
  return configPath !== null;
}

function hasExpoDependency(packageJson: PackageJson): boolean {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return 'expo' in deps;
}

async function projectUsesServerRuntime(
  projectPath: string,
  packageJson: PackageJson
): Promise<boolean> {
  const apiRoutes = await findExpoRouterApiRouteFiles(projectPath, packageJson);
  if (apiRoutes.length > 0) {
    return true;
  }

  const appJsonPath = path.join(projectPath, 'app.json');
  const appJson = await readOptionalText(appJsonPath);
  if (appJson && /"output"\s*:\s*"server"/.test(appJson)) {
    return true;
  }

  const sourceFiles = await findFiles(projectPath, (filePath) =>
    SOURCE_EXTENSIONS.has(path.extname(filePath))
  );
  for (const filePath of sourceFiles) {
    const contents = await readOptionalText(filePath);
    if (contents && hasUseServerDirective(contents)) {
      return true;
    }
  }
  return false;
}

function isAllowedClientEnvName(name: string): boolean {
  return name.startsWith('EXPO_PUBLIC_') || CLIENT_ENV_ALLOWLIST.has(name);
}

function looksLikeNonSecretConfigValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 8) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed) && !/\/\/[^/\s]+:[^@\s]+@/.test(trimmed)) {
    return true;
  }
  if (/^[a-z0-9-]+$/i.test(trimmed)) {
    return true;
  }
  return false;
}

function readQuotedValues(line: string): string[] {
  const values: string[] = [];
  for (const match of line.matchAll(/(['"`])([^'"`]+)\1/g)) {
    if (match[2]) {
      values.push(match[2]);
    }
  }
  return values;
}

function stripCommentsPreservingLines(contents: string): string {
  const withoutBlock = contents.replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, ' ')
  );
  return withoutBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function lineNumberOf(contents: string, pattern: RegExp): number {
  const match = contents.match(pattern);
  if (!match || match.index === undefined) {
    return 1;
  }
  return lineNumberAt(contents, match.index);
}

function lineNumberAt(contents: string, index: number): number {
  return contents.slice(0, index).split(/\r?\n/).length;
}

function toRuntimeSecurityResult(
  findings: RuntimeSecurityFinding[],
  expoProject: boolean
): DoctorCheckResult {
  if (findings.length === 0) {
    return {
      name: 'runtime security',
      status: expoProject ? 'pass' : 'skip',
      message: expoProject
        ? 'No server-on-client imports, private client env access, or Expo config credential leaks found.'
        : 'No Expo app signals; runtime security scan skipped.',
    };
  }

  const hasError = findings.some((finding) => finding.severity === 'error');
  return {
    name: 'runtime security',
    status: hasError ? 'error' : 'warn',
    message: hasError
      ? 'Server-only code or private credentials may leak into the client bundle.'
      : 'Runtime security warnings were found.',
    details: {
      findings: findings.slice(0, MAX_FINDINGS),
      truncated: findings.length > MAX_FINDINGS,
    },
  };
}
