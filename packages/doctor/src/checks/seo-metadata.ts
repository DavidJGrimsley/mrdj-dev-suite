import path from 'node:path';

import type { DoctorCheckResult } from '../types.js';
import { findFiles, isRecord, pathExists, readOptionalText, SOURCE_EXTENSIONS } from '../utils.js';

type RouteGap = {
  route: string;
  file: string;
  missing: Array<'dynamic-metadata' | 'structured-data'>;
};

type ServerRenderingGap = {
  layout: string;
  component: string;
  issue: 'root-layout-omits-route-tree';
};

export async function checkSeoMetadata(projectPath: string): Promise<DoctorCheckResult> {
  const appDirs = [path.join(projectPath, 'app'), path.join(projectPath, 'src', 'app')];
  const existingAppDirs = (
    await Promise.all(
      appDirs.map(async (appDir) => ((await pathExists(appDir)) ? appDir : null))
    )
  ).filter((appDir): appDir is string => Boolean(appDir));

  if (existingAppDirs.length === 0) {
    return {
      name: 'seo metadata',
      status: 'skip',
      message: 'No Expo Router app directory found.',
    };
  }

  const targetsWeb = await projectTargetsWeb(projectPath);
  if (!targetsWeb) {
    return {
      name: 'seo metadata',
      status: 'skip',
      message: 'Web is not a target platform for this app.',
    };
  }

  const appFiles = (
    await Promise.all(
      existingAppDirs.map((appDir) =>
        findFiles(appDir, (filePath) => SOURCE_EXTENSIONS.has(path.extname(filePath)))
      )
    )
  ).flat();
  const seoSupportFiles = await findFiles(path.join(projectPath, 'src'), (filePath) => {
    if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) return false;
    return /(?:^|[-_.])(head|meta(?:data)?|seo)(?:[-_.]|$)/iu.test(path.basename(filePath));
  });
  const relevantFiles = Array.from(new Set([...appFiles, ...seoSupportFiles])).sort();
  const fileContents = new Map<string, string>();

  await Promise.all(
    relevantFiles.map(async (filePath) => {
      const contents = await readOptionalText(filePath);
      if (contents) fileContents.set(filePath, contents);
    })
  );

  const searchableText = Array.from(fileContents.values()).join('\n');
  const signals = {
    title: /(?:<title\b|\btitle\s*[:=]|\bSeoHead\b|\bgenerateMetadata\b)/iu.test(searchableText),
    description:
      /(?:name=["']description["']|\bdescription\s*[:=]|og:description|twitter:description)/iu.test(
        searchableText
      ),
    canonical:
      /(?:rel=["']canonical["']|\bcanonicalUrl\b|\bcanonical\s*[:=]|og:url)/iu.test(
        searchableText
      ),
    openGraph: /(?:\bopenGraph\b|og:(?:title|description|url|image))/iu.test(searchableText),
    sitemap: await pathExists(path.join(projectPath, 'public', 'sitemap.xml')),
    robots: await pathExists(path.join(projectPath, 'public', 'robots.txt')),
  };

  const missing = Object.entries(signals)
    .filter(([, present]) => !present)
    .map(([key]) => key);
  const routeGaps = findRouteGaps(projectPath, existingAppDirs, fileContents);
  const serverRenderingGaps = (await projectUsesServerRendering(projectPath))
    ? findServerRenderingGaps(projectPath, existingAppDirs, fileContents)
    : [];

  if (missing.length > 0 || routeGaps.length > 0 || serverRenderingGaps.length > 0) {
    return {
      name: 'seo metadata',
      status: 'warn',
      message: 'Web metadata strategy has gaps.',
      details: {
        missing,
        ...(routeGaps.length > 0 ? { routeGaps } : {}),
        ...(serverRenderingGaps.length > 0 ? { serverRenderingGaps } : {}),
      },
    };
  }

  return {
    name: 'seo metadata',
    status: 'pass',
    message: 'Web metadata and route-level SSR signals are present.',
  };
}

function findRouteGaps(
  projectPath: string,
  appDirs: string[],
  fileContents: Map<string, string>
): RouteGap[] {
  const gaps: RouteGap[] = [];

  for (const [filePath, contents] of fileContents) {
    const appDir = appDirs.find((candidate) => isInside(candidate, filePath));
    if (!appDir || !isDynamicPageRoute(appDir, filePath)) continue;
    if (!/(?:export\s+(?:async\s+)?function\s+loader\b|export\s+const\s+loader\b|\buseLoaderData\b)/u.test(contents)) {
      continue;
    }

    const missing: RouteGap['missing'] = [];
    const hasDynamicMetadata =
      /\bexport\s+(?:(?:async\s+)?function|const)\s+generateMetadata\b/u.test(contents) ||
      /(?:<Head\b|\bSeoHead\b|\bseo\s*=\s*\{)/u.test(contents);
    const hasStructuredData =
      /(?:application\/ld\+json|\bStructuredDataScript\b|\bstructuredData\b)/iu.test(contents);

    if (!hasDynamicMetadata) missing.push('dynamic-metadata');
    if (!hasStructuredData) missing.push('structured-data');

    if (missing.length > 0) {
      gaps.push({
        route: routePathForFile(appDir, filePath),
        file: path.relative(projectPath, filePath).replace(/\\/gu, '/'),
        missing,
      });
    }
  }

  return gaps.sort((left, right) => left.file.localeCompare(right.file));
}

function findServerRenderingGaps(
  projectPath: string,
  appDirs: string[],
  fileContents: Map<string, string>
): ServerRenderingGap[] {
  const gaps: ServerRenderingGap[] = [];
  const hasLoaderRoute = Array.from(fileContents.entries()).some(([filePath, contents]) => {
    const appDir = appDirs.find((candidate) => isInside(candidate, filePath));
    return Boolean(
      appDir &&
        !isApiRoute(filePath) &&
        /(?:export\s+(?:async\s+)?function\s+loader\b|export\s+const\s+loader\b|\buseLoaderData\b)/u.test(
          contents
        )
    );
  });

  if (!hasLoaderRoute) return gaps;

  for (const appDir of appDirs) {
    const layoutPath = Array.from(fileContents.keys()).find(
      (filePath) =>
        path.dirname(filePath) === appDir &&
        path.basename(filePath, path.extname(filePath)) === '_layout'
    );
    if (!layoutPath) continue;

    const contents = fileContents.get(layoutPath) ?? '';
    const serverReturnPattern =
      /if\s*\([^)]*typeof\s+(?:window|document)\s*===?\s*["']undefined["'][^)]*\)\s*(?:\{\s*)?return\s*<([A-Z][A-Za-z0-9_]*)\b/gu;

    for (const match of contents.matchAll(serverReturnPattern)) {
      const component = match[1];
      if (!component || componentRendersRouteOutlet(contents, component, new Set())) continue;
      gaps.push({
        layout: path.relative(projectPath, layoutPath).replace(/\\/gu, '/'),
        component,
        issue: 'root-layout-omits-route-tree',
      });
    }
  }

  return gaps;
}

function componentRendersRouteOutlet(
  source: string,
  componentName: string,
  visited: Set<string>
): boolean {
  if (visited.has(componentName)) return false;
  visited.add(componentName);

  if (['Stack', 'Slot', 'Tabs'].includes(componentName)) return true;
  const body = findNamedFunctionBody(source, componentName);
  if (!body) return false;
  if (/<(?:Stack|Slot|Tabs)\b/u.test(body)) return true;

  const childNames = Array.from(body.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/gu))
    .map((match) => match[1])
    .filter((name): name is string => Boolean(name));
  return childNames.some((name) => componentRendersRouteOutlet(source, name, visited));
}

function findNamedFunctionBody(source: string, componentName: string): string | null {
  const escapedName = componentName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const patterns = [
    new RegExp(`function\\s+${escapedName}\\s*\\([^)]*\\)\\s*\\{`, 'u'),
    new RegExp(`(?:const|let)\\s+${escapedName}\\s*=.*?=>\\s*\\{`, 'u'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (!match) continue;
    const openingBrace = source.indexOf('{', match.index + match[0].length - 1);
    if (openingBrace === -1) continue;

    let depth = 0;
    for (let index = openingBrace; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }

  return null;
}

function isDynamicPageRoute(appDir: string, filePath: string): boolean {
  const relativePath = path.relative(appDir, filePath);
  const baseName = path.basename(relativePath, path.extname(relativePath));
  return (
    relativePath.includes('[') &&
    !baseName.startsWith('+') &&
    baseName !== '_layout' &&
    !isApiRoute(filePath)
  );
}

function isApiRoute(filePath: string): boolean {
  return /\+api\.[cm]?[jt]sx?$/iu.test(filePath);
}

function routePathForFile(appDir: string, filePath: string): string {
  const segments = path
    .relative(appDir, filePath)
    .replace(/\.[^.]+$/u, '')
    .split(path.sep)
    .filter((segment) => !/^\(.+\)$/u.test(segment) && segment !== 'index');
  return `/${segments.join('/')}`;
}

function isInside(parentPath: string, filePath: string): boolean {
  const relativePath = path.relative(parentPath, filePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

async function projectUsesServerRendering(projectPath: string): Promise<boolean> {
  const raw = await readOptionalText(path.join(projectPath, 'app.json'));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) {
        const expo = isRecord(parsed.expo) ? parsed.expo : null;
        const web = expo && isRecord(expo.web) ? expo.web : null;
        if (web?.output === 'server') return true;
      }
    } catch {
      // Fall through to deterministic inspection of dynamic config files.
    }
  }

  const dynamicConfig = await readDynamicExpoConfig(projectPath);
  return /\boutput\s*:\s*["']server["']/u.test(dynamicConfig);
}

async function projectTargetsWeb(projectPath: string): Promise<boolean> {
  const projectInfoTargetsWeb = await readProjectInfoWebTarget(projectPath);
  if (typeof projectInfoTargetsWeb === 'boolean') {
    return projectInfoTargetsWeb;
  }

  const raw = await readOptionalText(path.join(projectPath, 'app.json'));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) {
        const expo = isRecord(parsed.expo) ? parsed.expo : null;
        if (expo) {
          const platforms = Array.isArray(expo.platforms)
            ? expo.platforms.filter((item): item is string => typeof item === 'string')
            : [];
          if (platforms.length > 0) return platforms.includes('web');
        }
      }
    } catch {
      // Fall through to deterministic inspection of dynamic config files.
    }
  }

  const dynamicConfig = await readDynamicExpoConfig(projectPath);
  const platformsMatch = dynamicConfig.match(/\bplatforms\s*:\s*\[([^\]]*)\]/u);
  if (!platformsMatch?.[1]) return true;
  const platforms = Array.from(platformsMatch[1].matchAll(/["']([^"']+)["']/gu)).map(
    (match) => match[1]
  );
  return platforms.length === 0 || platforms.includes('web');
}

async function readDynamicExpoConfig(projectPath: string): Promise<string> {
  const candidates = ['app.config.ts', 'app.config.js', 'app.config.mjs', 'app.config.cjs'];
  const contents = await Promise.all(
    candidates.map((candidate) => readOptionalText(path.join(projectPath, candidate)))
  );
  return contents.filter((value): value is string => Boolean(value)).join('\n');
}

async function readProjectInfoWebTarget(projectPath: string): Promise<boolean | null> {
  const infoRaw = await readOptionalText(path.join(projectPath, 'project', 'info.md'));
  if (!infoRaw) {
    return null;
  }

  const targetPlatformsMatch = infoRaw.match(/-\s*Target platforms:\s*([^\n\r]+)/i);
  if (!targetPlatformsMatch?.[1]) {
    return null;
  }

  return targetPlatformsMatch[1]
    .split(/,|\band\b/iu)
    .map((item) => item.trim().toLowerCase())
    .includes('web');
}
