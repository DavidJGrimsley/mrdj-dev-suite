import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import {
  appRelativePath,
  findExpoRouterAppDirs,
  isExpoRouterLayoutFile,
  isExpoRouterSpecialFile,
  isRootLayoutPath,
  isRouteGroupDirName,
  isTestLikeFile,
  routeGroupSegments,
} from '../expo-router.js';
import {
  findFiles,
  pathExists,
  readOptionalText,
  relative,
  SOURCE_EXTENSIONS,
  stripJsComments,
} from '../utils.js';

const MAX_FINDINGS = 50;
const CONVENTIONAL_GROUPS = new Set(['auth', 'tabs', 'drawer', 'modal']);
const MAX_GROUP_DEPTH = 2;
const MIXED_CONCERN_LINE_THRESHOLD = 180;
const API_THIN_WRAPPER_LINE_THRESHOLD = 150;
const API_NOT_THIN_LINE_THRESHOLD = 250;
const ROOT_LAYOUT_HEAVY_LINES = 300;
const ROOT_LAYOUT_MIXED_LINES = 180;

const AUTH_SIGNAL_RE =
  /\b(useAuth|useAuthStore|useAuthUiStore|getSession|getSupabaseSession|getUser|isLoggedIn|isAuthenticated|Redirect|Stack\.Protected|Protected)\b/;
const IMPORT_FROM_RE = /\bfrom\s+['"]([^'"]+)['"]/g;
const DATA_LAYER_IMPORT_RE = /\b(from|require\()\s*['"][^'"]*(supabase|drizzle|postgres)/;
const QUERY_RE = /\b(useQuery|useMutation)\b/;
const NAVIGATOR_RE = /\b(Stack|Tabs|Drawer|Slot)\b/;
const INLINE_DB_RE = /\b(from\s+['"]drizzle-orm['"]|supabase\.from\s*\(|sql\s*`)/;
const DYNAMIC_ROUTER_CONCAT_RE = /\brouter\.(push|replace|navigate)\s*\(\s*(['"])\/\2\s*\+/;
const DYNAMIC_HREF_CONCAT_RE = /\bhref=\{\s*(['"])\/\1\s*\+/;
const DYNAMIC_ROUTER_TEMPLATE_RE = /\brouter\.(push|replace|navigate)\s*\(\s*`[^`]*\$\{/;
const DYNAMIC_HREF_TEMPLATE_RE = /\bhref=\{\s*`[^`]*\$\{/;
const ROUTER_PATH_JOIN_RE = /\brouter\.(push|replace|navigate)\s*\(\s*path\.join\b/;

export interface RouterSafetyFinding {
  file: string;
  kind: string;
  message: string;
}

export async function checkRouterSafety(projectPath: string): Promise<DoctorCheckResult> {
  const appDirs = await findExpoRouterAppDirs(projectPath);
  if (appDirs.length === 0) {
    return {
      name: 'router safety',
      status: 'skip',
      message: 'No Expo Router app directory found.',
    };
  }

  const findings = [...(await checkRouteGroups(projectPath)), ...(await checkLayouts(projectPath))];

  const routeFiles = await collectRouteSourceFiles(projectPath, appDirs);
  for (const filePath of routeFiles) {
    if (findings.length >= MAX_FINDINGS) {
      break;
    }
    const contents = (await readOptionalText(filePath)) ?? '';
    findings.push(...checkNavigationPatterns(projectPath, filePath, contents));
    findings.push(...checkMixedConcerns(projectPath, filePath, contents));
  }

  return toRouterResult(findings);
}

export async function scanFileRouterSafety(
  projectPath: string,
  filePath: string
): Promise<DoctorCheckResult> {
  const appDirs = await findExpoRouterAppDirs(projectPath);
  if (appDirs.length === 0) {
    return {
      name: 'router safety',
      status: 'skip',
      message: 'No Expo Router app directory found.',
    };
  }

  const shortPath = relative(projectPath, filePath);
  const inAppRoot = shortPath.startsWith('app/') || shortPath.startsWith('src/app/');
  if (!inAppRoot || !SOURCE_EXTENSIONS.has(path.extname(filePath))) {
    return {
      name: 'router safety',
      status: 'skip',
      message: 'File is not an Expo Router route file.',
    };
  }

  const contents = (await readOptionalText(filePath)) ?? '';
  const findings = [
    ...checkNavigationPatterns(projectPath, filePath, contents),
    ...checkMixedConcerns(projectPath, filePath, contents),
  ];

  if (isRootLayoutPath(shortPath)) {
    findings.push(...findOverloadedRootLayout(projectPath, filePath, contents));
  }

  const appDir = appDirs.find((dir) => filePath.startsWith(dir));
  if (appDir) {
    const appRel = appRelativePath(appDir, filePath);
    const parentGroup = parentGroupPath(appRel);
    if (parentGroup) {
      const groupFindings = await checkRouteGroups(projectPath);
      findings.push(
        ...groupFindings.filter(
          (finding) =>
            finding.file.endsWith(parentGroup) || finding.file.includes(`${parentGroup}/`)
        )
      );
    }
  }

  return toRouterResult(findings, true);
}

export async function checkRouteGroups(projectPath: string): Promise<RouterSafetyFinding[]> {
  const appDirs = await findExpoRouterAppDirs(projectPath);
  const findings: RouterSafetyFinding[] = [];
  const seen = new Set<string>();

  for (const appDir of appDirs) {
    const files = await collectRouteSourceFiles(projectPath, [appDir]);
    const groups = collectGroupInfo(appDir, files);

    for (const group of groups.values()) {
      const key = `${group.relPath}:${group.hasLayout}:${group.depth}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      if (group.depth > MAX_GROUP_DEPTH) {
        findings.push({
          file: relative(projectPath, path.join(appDir, group.relPath)),
          kind: 'nested-groups',
          message: `${relative(projectPath, path.join(appDir, group.relPath))}: nested route groups are ${group.depth} deep; flatten groups beyond ${MAX_GROUP_DEPTH} levels.`,
        });
      }

      if (!group.hasLayout) {
        const conventional = CONVENTIONAL_GROUPS.has(group.name);
        findings.push({
          file: relative(projectPath, path.join(appDir, group.relPath)),
          kind: conventional ? 'missing-conventional-layout' : 'group-without-layout',
          message: conventional
            ? `${relative(projectPath, path.join(appDir, group.relPath))}: (${group.name}) group has no _layout file.`
            : `${relative(projectPath, path.join(appDir, group.relPath))}: route group has no _layout file; confirm the group has a purpose.`,
        });
      }
    }
  }

  return findings;
}

export async function checkLayouts(projectPath: string): Promise<RouterSafetyFinding[]> {
  const appDirs = await findExpoRouterAppDirs(projectPath);
  const findings: RouterSafetyFinding[] = [];

  for (const appDir of appDirs) {
    const files = await collectRouteSourceFiles(projectPath, [appDir]);

    const rootLayoutFiles = files.filter((filePath) =>
      isRootLayoutPath(relative(projectPath, filePath))
    );
    for (const layoutPath of rootLayoutFiles) {
      const contents = (await readOptionalText(layoutPath)) ?? '';
      findings.push(...findOverloadedRootLayout(projectPath, layoutPath, contents));
    }

    const hasAuthShapedRoutes = files.some((filePath) =>
      isAuthShapedRoute(appRelativePath(appDir, filePath))
    );
    if (hasAuthShapedRoutes) {
      const layoutContents: string[] = [];
      for (const filePath of files) {
        const appRel = appRelativePath(appDir, filePath);
        if (
          isExpoRouterLayoutFile(filePath) &&
          (isRootLayoutPath(relative(projectPath, filePath)) || isAuthGroupPath(appRel))
        ) {
          layoutContents.push(...(await collectLayoutAuthSources(projectPath, filePath)));
        }
      }
      const scanned = layoutContents.join('\n');
      if (!AUTH_SIGNAL_RE.test(scanned)) {
        findings.push({
          file: relative(projectPath, appDir),
          kind: 'missing-auth-layout',
          message: `${relative(projectPath, appDir)}: auth-shaped routes exist without an auth-aware layout (session check, Redirect, or Protected).`,
        });
      }
    }
  }

  return findings;
}

export function checkNavigationPatterns(
  projectPath: string,
  filePath: string,
  contents: string
): RouterSafetyFinding[] {
  if (isTestLikeFile(filePath) || path.basename(filePath).includes('+api')) {
    return [];
  }

  const scanned = stripJsComments(contents);
  const shortPath = relative(projectPath, filePath);
  const findings: RouterSafetyFinding[] = [];

  if (
    DYNAMIC_ROUTER_CONCAT_RE.test(scanned) ||
    DYNAMIC_HREF_CONCAT_RE.test(scanned) ||
    DYNAMIC_ROUTER_TEMPLATE_RE.test(scanned) ||
    DYNAMIC_HREF_TEMPLATE_RE.test(scanned) ||
    ROUTER_PATH_JOIN_RE.test(scanned)
  ) {
    findings.push({
      file: shortPath,
      kind: 'dynamic-navigation',
      message: `${shortPath}: builds a route path by concatenation or interpolation; use a typed pathname object instead of string assembly.`,
    });
  }

  return findings;
}

export function checkMixedConcerns(
  projectPath: string,
  filePath: string,
  contents: string
): RouterSafetyFinding[] {
  if (isTestLikeFile(filePath)) {
    return [];
  }

  const shortPath = relative(projectPath, filePath);
  const scanned = stripJsComments(contents);
  const lineCount = contents.split(/\r?\n/).length;
  const findings: RouterSafetyFinding[] = [];

  if (path.basename(filePath).includes('+api')) {
    const hasInlineDb = INLINE_DB_RE.test(scanned);
    if (
      lineCount > API_NOT_THIN_LINE_THRESHOLD ||
      (lineCount > API_THIN_WRAPPER_LINE_THRESHOLD && hasInlineDb)
    ) {
      findings.push({
        file: shortPath,
        kind: 'api-business-logic',
        message: `${shortPath}: ${lineCount} lines; keep API routes as thin wrappers around services instead of inlining business logic.`,
      });
    }
    return findings;
  }

  if (isExpoRouterSpecialFile(filePath) || isExpoRouterLayoutFile(filePath)) {
    return findings;
  }

  const hasAuth = AUTH_SIGNAL_RE.test(scanned);
  const hasData = DATA_LAYER_IMPORT_RE.test(scanned) || QUERY_RE.test(scanned);
  const helperCount = countHelperFunctions(scanned);
  const concernCount = [hasAuth, hasData, helperCount >= 3].filter(Boolean).length;

  if (lineCount > MIXED_CONCERN_LINE_THRESHOLD && concernCount >= 2) {
    findings.push({
      file: shortPath,
      kind: 'mixed-concerns',
      message: `${shortPath}: mixes auth, data, and helper logic in a ${lineCount}-line route file; split into features/services.`,
    });
  }

  return findings;
}

function findOverloadedRootLayout(
  projectPath: string,
  filePath: string,
  contents: string
): RouterSafetyFinding[] {
  const shortPath = relative(projectPath, filePath);
  const scanned = stripJsComments(contents);
  const lineCount = contents.split(/\r?\n/).length;
  const hasData = DATA_LAYER_IMPORT_RE.test(scanned) || QUERY_RE.test(scanned);
  const hasNavigator = NAVIGATOR_RE.test(scanned);

  if (
    lineCount > ROOT_LAYOUT_HEAVY_LINES ||
    (lineCount > ROOT_LAYOUT_MIXED_LINES && hasData && hasNavigator)
  ) {
    return [
      {
        file: shortPath,
        kind: 'overloaded-root-layout',
        message: `${shortPath}: ${lineCount} lines; split providers, data loading, and navigation out of the root layout.`,
      },
    ];
  }

  return [];
}

function toRouterResult(findings: RouterSafetyFinding[], fileScan = false): DoctorCheckResult {
  if (findings.length > 0) {
    return {
      name: 'router safety',
      status: 'warn',
      message: fileScan
        ? 'File has Expo Router safety warnings.'
        : 'Expo Router groups, layouts, or navigation have safety warnings.',
      details: {
        findings: findings.slice(0, MAX_FINDINGS),
        truncated: findings.length > MAX_FINDINGS,
      },
    };
  }

  return {
    name: 'router safety',
    status: 'pass',
    message: fileScan
      ? 'File passed the router safety scan.'
      : 'Route groups, layouts, and navigation passed the safety scan.',
  };
}

async function collectRouteSourceFiles(projectPath: string, appDirs: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const appDir of appDirs) {
    if (!(await pathExists(appDir))) {
      continue;
    }
    files.push(
      ...(await findFiles(appDir, (filePath) => {
        return SOURCE_EXTENSIONS.has(path.extname(filePath)) && !isTestLikeFile(filePath);
      }))
    );
  }
  return files;
}

interface GroupInfo {
  relPath: string;
  name: string;
  depth: number;
  hasLayout: boolean;
}

function collectGroupInfo(appDir: string, files: string[]): Map<string, GroupInfo> {
  const groups = new Map<string, GroupInfo>();

  for (const filePath of files) {
    const appRel = appRelativePath(appDir, filePath);
    const segments = appRel.split('/');
    const prefixes: string[] = [];

    for (const segment of segments.slice(0, -1)) {
      prefixes.push(segment);
      if (!isRouteGroupDirName(segment)) {
        continue;
      }
      const relPath = prefixes.join('/');
      const existing = groups.get(relPath) ?? {
        relPath,
        name: segment.slice(1, -1),
        depth: routeGroupSegments(relPath).length,
        hasLayout: false,
      };
      if (isLayoutInGroup(appRel, relPath)) {
        existing.hasLayout = true;
      }
      groups.set(relPath, existing);
    }
  }

  return groups;
}

function isLayoutInGroup(appRel: string, groupRel: string): boolean {
  const expectedPrefix = `${groupRel}/`;
  if (!appRel.startsWith(expectedPrefix)) {
    return false;
  }
  const rest = appRel.slice(expectedPrefix.length);
  return isExpoRouterLayoutFile(rest) && !rest.includes('/');
}

function parentGroupPath(appRel: string): string | null {
  const dir = appRel.split('/').slice(0, -1);
  for (let index = dir.length - 1; index >= 0; index -= 1) {
    const segment = dir[index];
    if (segment && isRouteGroupDirName(segment)) {
      return dir.slice(0, index + 1).join('/');
    }
  }
  return null;
}

function isAuthShapedRoute(appRel: string): boolean {
  return isAuthGroupPath(appRel) || /(^|\/)(sign-in|sign-up|login)\.(tsx|ts|jsx|js)$/.test(appRel);
}

function isAuthGroupPath(appRel: string): boolean {
  return /(^|\/)\(auth\)(\/|$)/.test(appRel) || /(^|\/)auth(\/|$)/.test(appRel);
}

async function collectLayoutAuthSources(
  projectPath: string,
  layoutPath: string
): Promise<string[]> {
  const contents = (await readOptionalText(layoutPath)) ?? '';
  const sources = [contents];
  if (contents.split(/\r?\n/).length > 80) {
    return sources;
  }

  for (const match of contents.matchAll(IMPORT_FROM_RE)) {
    const spec = match[1];
    if (!spec) {
      continue;
    }
    const resolved = await resolveLayoutImport(projectPath, layoutPath, spec);
    if (!resolved) {
      continue;
    }
    const imported = await readOptionalText(resolved);
    if (imported) {
      sources.push(imported);
    }
  }

  return sources;
}

async function resolveLayoutImport(
  projectPath: string,
  fromFile: string,
  spec: string
): Promise<string | null> {
  let base: string;
  if (spec.startsWith('@/') || spec.startsWith('~/')) {
    base = path.join(projectPath, 'src', spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, 'index.tsx'),
    path.join(base, 'index.ts'),
  ];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function countHelperFunctions(contents: string): number {
  const functionMatches = contents.match(/\bfunction\s+[A-Za-z_][\w]*/g) ?? [];
  const arrowMatches = contents.match(/\bconst\s+[A-Za-z_][\w]*\s*=\s*(async\s*)?\(/g) ?? [];
  return functionMatches.length + arrowMatches.length;
}
