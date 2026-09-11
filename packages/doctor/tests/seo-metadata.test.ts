import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkSeoMetadata } from '../src/checks/seo-metadata.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('seo metadata depth', () => {
  it('preserves the native-only skip behavior', async () => {
    const projectPath = await createProject({ platforms: ['ios', 'android'], output: 'server' });

    const result = await checkSeoMetadata(projectPath);

    expect(result).toMatchObject({
      status: 'skip',
      message: 'Web is not a target platform for this app.',
    });
  });

  it('warns when an SSR-only root component omits the loader route tree', async () => {
    const projectPath = await createProject();
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      `import { Stack } from 'expo-router';
function AppStack() { return <Stack />; }
function RootLayoutWebSSR() { return <div>Getting things ready for you...</div>; }
export default function RootLayout() {
  if (Platform.OS === 'web' && typeof window === 'undefined') return <RootLayoutWebSSR />;
  return <AppStack />;
}
`
    );
    await writeHealthyDynamicRoute(projectPath);

    const result = await checkSeoMetadata(projectPath);

    expect(result.status).toBe('warn');
    expect(result.details?.serverRenderingGaps).toEqual([
      {
        layout: 'src/app/_layout.tsx',
        component: 'RootLayoutWebSSR',
        issue: 'root-layout-omits-route-tree',
      },
    ]);
  });

  it('reports dynamic metadata and structured-data gaps without treating +api handlers as pages', async () => {
    const projectPath = await createProject();
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      `import { Stack } from 'expo-router';
export default function RootLayout() { return <Stack />; }
`
    );
    await writeSource(
      projectPath,
      'src/app/public-facing/mcp/[id].tsx',
      `import { useLoaderData } from 'expo-router';
export async function loader(_request, params) { return { id: params.id }; }
export default function Detail() { return <div>{useLoaderData().id}</div>; }
`
    );
    await writeSource(
      projectPath,
      'src/app/public-facing/mcp/[id]+api.ts',
      `export function GET() { return Response.json({ ok: true }); }
`
    );

    const result = await checkSeoMetadata(projectPath);

    expect(result.status).toBe('warn');
    expect(result.details?.routeGaps).toEqual([
      {
        route: '/public-facing/mcp/[id]',
        file: 'src/app/public-facing/mcp/[id].tsx',
        missing: ['dynamic-metadata', 'structured-data'],
      },
    ]);
  });

  it('passes a server-rendered loader route with deterministic metadata and JSON-LD', async () => {
    const projectPath = await createProject();
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      `import { Stack } from 'expo-router';
function AppStack() { return <Stack />; }
function RootLayoutWebSSR() { return <AppStack />; }
export default function RootLayout() {
  if (Platform.OS === 'web' && typeof window === 'undefined') return <RootLayoutWebSSR />;
  return <AppStack />;
}
`
    );
    await writeHealthyDynamicRoute(projectPath);

    const result = await checkSeoMetadata(projectPath);

    expect(result).toMatchObject({
      status: 'pass',
      message: 'Web metadata and route-level SSR signals are present.',
    });
  });

  it('checks Open Graph separately from basic title and description metadata', async () => {
    const projectPath = await createProject({ includeOpenGraph: false });
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      `import { Stack } from 'expo-router';
export default function RootLayout() { return <Stack />; }
`
    );

    const result = await checkSeoMetadata(projectPath);

    expect(result.status).toBe('warn');
    expect(result.details?.missing).toContain('openGraph');
  });
});

async function createProject(
  options: {
    platforms?: string[];
    output?: 'server' | 'static';
    includeOpenGraph?: boolean;
  } = {}
): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-seo-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
  await writeJson(projectPath, 'app.json', {
    expo: {
      platforms: options.platforms ?? ['ios', 'android', 'web'],
      web: { output: options.output ?? 'server' },
    },
  });
  await writeSource(
    projectPath,
    'src/components/SEO/SeoHead.tsx',
    `export function SeoHead() {
  return <head>
    <title>Example</title>
    <meta name="description" content="Example description" />
    <link rel="canonical" href="https://example.com" />
    ${options.includeOpenGraph === false ? '' : '<meta property="og:title" content="Example" />'}
  </head>;
}
`
  );
  await writeText(projectPath, 'public/sitemap.xml', '<urlset />\n');
  await writeText(projectPath, 'public/robots.txt', 'User-agent: *\nAllow: /\n');
  return projectPath;
}

async function writeHealthyDynamicRoute(projectPath: string): Promise<void> {
  await writeSource(
    projectPath,
    'src/app/public-facing/api/[id].tsx',
    `import { useLoaderData } from 'expo-router';
import { StructuredDataScript } from '../../../components/SEO/SeoHead';
export async function generateMetadata(_request, params) { return {
  title: params.id,
  description: 'API detail',
  canonical: 'https://example.com/public-facing/api/' + params.id,
  openGraph: { title: params.id, url: 'https://example.com/public-facing/api/' + params.id },
}; }
export async function loader(_request, params) { return { id: params.id }; }
export default function Detail() {
  const data = useLoaderData();
  return <><StructuredDataScript structuredData={{ '@type': 'WebAPI', name: data.id }} /><div>{data.id}</div></>;
}
`
  );
}

async function writeJson(
  projectPath: string,
  relativePath: string,
  value: Record<string, unknown>
): Promise<void> {
  await writeText(projectPath, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeSource(
  projectPath: string,
  relativePath: string,
  contents: string
): Promise<void> {
  await writeText(projectPath, relativePath, contents);
}

async function writeText(
  projectPath: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}
