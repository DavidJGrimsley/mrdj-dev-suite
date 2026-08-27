import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkLayouts,
  checkMixedConcerns,
  checkNavigationPatterns,
  checkRouteGroups,
  checkRouterSafety,
  scanFileRouterSafety,
} from '../src/checks/router-safety.js';
import { runDoctor, scanFile } from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('router safety', () => {
  it('skips when no Expo Router app directory exists', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);

    const result = await checkRouterSafety(projectPath);
    expect(result.status).toBe('skip');
  });

  it('warns when a route group has no layout', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(
      projectPath,
      'src/app/(shop)/index.tsx',
      'export default function Shop() { return null; }\n'
    );

    const findings = await checkRouteGroups(projectPath);
    expect(findings.some((finding) => finding.kind === 'group-without-layout')).toBe(true);

    const result = await checkRouterSafety(projectPath);
    expect(result.status).toBe('warn');
  });

  it('passes nested (drawer)/(tabs) groups that each have layouts', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(
      projectPath,
      'src/app/(drawer)/_layout.tsx',
      "import { Drawer } from 'expo-router/drawer';\nexport default function DrawerLayout() { return <Drawer />; }\n"
    );
    await writeSource(
      projectPath,
      'src/app/(drawer)/(tabs)/_layout.tsx',
      "import { Tabs } from 'expo-router';\nexport default function TabLayout() { return <Tabs />; }\n"
    );
    await writeSource(
      projectPath,
      'src/app/(drawer)/(tabs)/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const groups = await checkRouteGroups(projectPath);
    expect(groups.filter((finding) => finding.kind === 'nested-groups')).toHaveLength(0);
    expect(groups.filter((finding) => finding.kind === 'group-without-layout')).toHaveLength(0);

    const result = await checkRouterSafety(projectPath);
    expect(result.status).toBe('pass');
  });

  it('warns when route groups nest more than two levels', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(projectPath, 'src/app/(a)/_layout.tsx', stackLayout());
    await writeSource(projectPath, 'src/app/(a)/(b)/_layout.tsx', stackLayout());
    await writeSource(projectPath, 'src/app/(a)/(b)/(c)/_layout.tsx', stackLayout());
    await writeSource(
      projectPath,
      'src/app/(a)/(b)/(c)/index.tsx',
      'export default function Page() { return null; }\n'
    );

    const findings = await checkRouteGroups(projectPath);
    expect(findings.some((finding) => finding.kind === 'nested-groups')).toBe(true);
  });

  it('warns when (tabs) is missing a layout file', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(
      projectPath,
      'src/app/(tabs)/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const findings = await checkRouteGroups(projectPath);
    expect(findings.some((finding) => finding.kind === 'missing-conventional-layout')).toBe(true);
  });

  it('warns when auth-shaped routes have no auth-aware layout', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(projectPath, 'src/app/(auth)/_layout.tsx', stackLayout());
    await writeSource(
      projectPath,
      'src/app/(auth)/sign-in.tsx',
      'export default function SignIn() { return null; }\n'
    );

    const findings = await checkLayouts(projectPath);
    expect(findings.some((finding) => finding.kind === 'missing-auth-layout')).toBe(true);
  });

  it('passes a thin root layout re-export', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      "export { default } from '@/features/app/root-layout-screen';\n"
    );
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const result = await checkRouterSafety(projectPath);
    expect(result.status).toBe('pass');
  });

  it('follows a thin root layout re-export when checking auth-aware layouts', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(
      projectPath,
      'src/app/_layout.tsx',
      "import RootLayoutScreen from '@/features/app/root-layout-screen';\nexport default RootLayoutScreen;\n"
    );
    await writeSource(
      projectPath,
      'src/features/app/root-layout-screen.tsx',
      [
        "import { Stack } from 'expo-router';",
        'export default function RootLayoutScreen() {',
        '  const isAuthenticated = false;',
        '  return <Stack />;',
        '}',
        '',
      ].join('\n')
    );
    await writeSource(
      projectPath,
      'src/app/sign-in.tsx',
      'export default function SignIn() { return null; }\n'
    );

    const findings = await checkLayouts(projectPath);
    expect(findings.filter((finding) => finding.kind === 'missing-auth-layout')).toHaveLength(0);
  });

  it('warns on an overloaded root layout that mixes data fetching with navigation', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', overloadedRootLayout());
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const result = await checkRouterSafety(projectPath);
    expect(result.status).toBe('warn');
    const findings = (result.details?.findings as Array<{ kind: string }>) ?? [];
    expect(findings.some((finding) => finding.kind === 'overloaded-root-layout')).toBe(true);
  });

  it('warns on concatenated router.push paths and passes static hrefs', async () => {
    const projectPath = await createTempProject();
    const unsafePath = path.join(projectPath, 'src/app/profile.tsx');
    await writeSource(
      projectPath,
      'src/app/profile.tsx',
      [
        "import { router } from 'expo-router';",
        'export default function Profile() {',
        "  router.push('/' + id);",
        '  return null;',
        '}',
        '',
      ].join('\n')
    );

    const unsafe = checkNavigationPatterns(projectPath, unsafePath, await readWritten(unsafePath));
    expect(unsafe.some((finding) => finding.kind === 'dynamic-navigation')).toBe(true);

    const safeContents = [
      "import { Link } from 'expo-router';",
      'export default function Dashboard() {',
      '  return <Link href="/dashboard">Go</Link>;',
      '}',
      '',
    ].join('\n');
    const safeFindings = checkNavigationPatterns(
      projectPath,
      path.join(projectPath, 'src/app/index.tsx'),
      safeContents
    );
    expect(safeFindings).toHaveLength(0);
  });

  it('warns when a large route file mixes auth, data, and helpers', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/account.tsx');
    await writeSource(projectPath, 'src/app/account.tsx', mixedConcernScreen());

    const findings = checkMixedConcerns(projectPath, filePath, mixedConcernScreen());
    expect(findings.some((finding) => finding.kind === 'mixed-concerns')).toBe(true);
  });

  it('warns when a large API route inlines business logic', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src/app/api/items+api.ts');
    const contents = thickApiRoute();
    await writeSource(projectPath, 'src/app/api/items+api.ts', contents);

    const findings = checkMixedConcerns(projectPath, filePath, contents);
    expect(findings.some((finding) => finding.kind === 'api-business-logic')).toBe(true);
  });

  it('includes router safety in runDoctor and scanFile', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/app/_layout.tsx', thinRootLayout());
    await writeSource(
      projectPath,
      'src/app/index.tsx',
      'export default function Home() { return null; }\n'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    expect(report.checks.find((check) => check.name === 'router safety')?.status).toBe('pass');

    const fileReport = await scanFile(path.join(projectPath, 'src/app/index.tsx'), { projectPath });
    expect(fileReport.checks.find((check) => check.name === 'router safety')?.status).toBe('pass');
  });

  it('scanFile skips non-route files', async () => {
    const projectPath = await createTempProject();
    await writeExpoPackage(projectPath);
    await writeSource(projectPath, 'src/lib/util.ts', 'export const n = 1;\n');

    const result = await scanFileRouterSafety(
      projectPath,
      path.join(projectPath, 'src/lib/util.ts')
    );
    expect(result.status).toBe('skip');
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-router-safety-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
  return projectPath;
}

async function writeExpoPackage(projectPath: string): Promise<void> {
  await writeFile(
    path.join(projectPath, 'package.json'),
    `${JSON.stringify(
      {
        name: 'router-safety-fixture',
        main: 'expo-router/entry',
        dependencies: { 'expo-router': '^6.0.0' },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function writeSource(
  projectPath: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}

async function readWritten(filePath: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(filePath, 'utf8');
}

function thinRootLayout(): string {
  return [
    "import { Stack } from 'expo-router';",
    'export default function RootLayout() {',
    '  return <Stack />;',
    '}',
    '',
  ].join('\n');
}

function stackLayout(): string {
  return [
    "import { Stack } from 'expo-router';",
    'export default function Layout() {',
    '  return <Stack />;',
    '}',
    '',
  ].join('\n');
}

function overloadedRootLayout(): string {
  const padding = Array.from(
    { length: 200 },
    (_, index) => `const provider${index} = ${index};`
  ).join('\n');
  return [
    "import { Stack } from 'expo-router';",
    "import { useQuery } from '@tanstack/react-query';",
    "import { supabase } from '@/utils/supabase';",
    padding,
    'export default function RootLayout() {',
    '  useQuery({ queryKey: ["boot"], queryFn: async () => supabase.from("profiles").select() });',
    '  return <Stack />;',
    '}',
    '',
  ].join('\n');
}

function mixedConcernScreen(): string {
  const padding = Array.from({ length: 200 }, (_, index) => `const row${index} = ${index};`).join(
    '\n'
  );
  return [
    "import { supabase } from '@/utils/supabase';",
    "import { useAuthStore } from '@/store/auth';",
    padding,
    'export default function Account() {',
    '  const isLoggedIn = useAuthStore();',
    '  if (!isLoggedIn) return null;',
    '  void supabase.from("profiles").select();',
    '  return null;',
    '}',
    '',
  ].join('\n');
}

function thickApiRoute(): string {
  const padding = Array.from({ length: 260 }, (_, index) => `const step${index} = ${index};`).join(
    '\n'
  );
  return [
    'export async function GET() {',
    padding,
    '  return Response.json({ ok: true });',
    '}',
    '',
  ].join('\n');
}
