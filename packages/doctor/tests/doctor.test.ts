import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { checkSeoMetadata, checkStylingDependencies } from '../src/checks/index.js';
import { runDoctor, scanFile } from '../src/index.js';
import { parseCommandLine, resolveShellCommandInvocation } from '../src/utils.js';

const tempDirs: string[] = [];
const FIXTURE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('command parsing', () => {
  it('splits package manager commands into explicit executable and argument lists', () => {
    expect(parseCommandLine('pnpm run lint -- --fix')).toEqual({
      command: 'pnpm',
      args: ['run', 'lint', '--', '--fix'],
    });
    expect(parseCommandLine('npx -y -p @mr.dj2u/cli@latest mds doctor')).toEqual({
      command: 'npx',
      args: ['-y', '-p', '@mr.dj2u/cli@latest', 'mds', 'doctor'],
    });
    expect(parseCommandLine('"node" --eval "console.log(\'hi\')"')).toEqual({
      command: 'node',
      args: ['--eval', "console.log('hi')"],
    });
  });

  it('uses an explicit cmd.exe wrapper for Windows package-manager shims', () => {
    expect(
      resolveShellCommandInvocation(
        'pnpm run lint -- --fix',
        'win32',
        'C:\\Windows\\System32\\cmd.exe'
      )
    ).toEqual({
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm run lint -- --fix'],
    });
    expect(resolveShellCommandInvocation('pnpm run lint -- --fix', 'linux')).toEqual({
      command: 'pnpm',
      args: ['run', 'lint', '--', '--fix'],
    });
    expect(resolveShellCommandInvocation('pnpm run lint -- --fix', 'win32', '')).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm run lint -- --fix'],
    });
  });
});

describe('runDoctor', () => {
  it('reports passing project memory and package script checks for a minimal project', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'sample',
      packageManager: 'pnpm@8.14.0',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });

    const report = await runDoctor(projectPath, { runScripts: false });

    expect(report.summary.errors).toBe(0);
    expect(report.summary.score).toBe(100);
    expect(report.checks.find((check) => check.name === 'project docs')?.status).toBe('pass');
    expect(report.checks.find((check) => check.name === 'package scripts')?.status).toBe('pass');
  });

  it('defaults to fast mode and reports script checks skipped by mode', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'fast-default',
      dependencies: {
        expo: '^56.0.0',
      },
      scripts: {},
    });

    const report = await runDoctor(projectPath, { runScripts: true });

    expect(report.mode).toBe('fast');
    expect(report.selection.defaultMode).toBe('fast');
    expect(report.checks.find((check) => check.name === 'tests')?.status).toBe('skip');
    expect(report.checks.find((check) => check.name === 'expo doctor')?.status).toBe('skip');
    expect(report.checks.find((check) => check.name === 'production build')?.status).toBe('skip');
    expect(report.checks.find((check) => check.name === 'full build profile')?.status).toBe(
      'skip'
    );
  });

  it('reports package script checks skipped when scripts are disabled', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'no-scripts',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
      },
    });

    const report = await runDoctor(projectPath, { mode: 'ci', runScripts: false });

    expect(report.selection.runScripts).toBe(false);
    expect(report.checks.find((check) => check.name === 'lint')?.status).toBe('skip');
    expect(report.checks.find((check) => check.name === 'typecheck')?.status).toBe('skip');
    expect(report.checks.find((check) => check.name === 'tests')?.status).toBe('skip');
  });

  it('preserves disabled scripts in a report without package.json', async () => {
    const projectPath = await createTempProject();

    const report = await runDoctor(projectPath, { runScripts: false });

    expect(report.selection?.runScripts).toBe(false);
  });

  it('accepts MDS script aliases for Doctor and production builds', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'mds-scripts',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        'mds:doctor': 'npx -y -p @mr.dj2u/cli@latest mds doctor',
        'build:prod': 'eas build --profile production',
      },
    });

    const report = await runDoctor(projectPath, { runScripts: false });

    expect(report.checks.find((check) => check.name === 'package scripts')?.status).toBe('pass');
  });

  it('computes score from warning count', async () => {
    const projectPath = await createTempProject();
    await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '', 'utf8');
    await writeProjectFile(projectPath, 'package.json', {
      name: 'warn-score',
      main: 'index.js',
      dependencies: {
        'expo-router': '^5.0.0',
      },
    });

    const report = await runDoctor(projectPath, { runScripts: false });

    expect(report.summary.errors).toBe(0);
    expect(report.summary.warnings).toBe(3);
    expect(report.summary.score).toBe(85);
  });

  it('errors on unsupported expo.platforms entries before expo doctor does', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'bad-platforms',
      main: 'expo-router/entry',
      dependencies: {
        expo: '^56.0.0',
        'expo-router': '^6.0.0',
      },
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });
    await writeProjectFile(projectPath, 'app.json', {
      expo: {
        platforms: ['web', 'ios', 'android', 'apple-tv', 'android-tv'],
      },
    });

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'expo configuration');

    expect(check?.status).toBe('error');
    expect(check?.details).toMatchObject({
      errors: [
        expect.stringContaining('apple-tv'),
      ],
    });
  });
});

describe('todo-for-context check', () => {
  it('passes when no TodoForContext markers remain', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, 'project', 'guidelines.md'),
      '# Guidelines\n\n- The string `# TodoForContext(optional):` documents unresolved markers.\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'project', 'todo.md'),
      '# Todo\n\n- [ ] Resolve every `# TodoForContext(optional):` marker.\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    expect(
      report.checks.find((check) => check.name === 'todo-for-context markers')?.status
    ).toBe('pass');
  });

  it('errors when project memory still contains TodoForContext markers', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'marker-project',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n## Monetization Strategy\n\n# TodoForContext(optional): Add notes.\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'todo-for-context markers');

    expect(check?.status).toBe('error');
    expect(report.summary.score).toBe(75);
    expect(check?.details).toMatchObject({
      hits: [
        expect.objectContaining({ file: 'project/info.md', line: 5 }),
      ],
    });
  });
});

describe('styling stack check', () => {
  it('accepts NativeWind as an intentional styling choice', () => {
    const result = checkStylingDependencies({
      dependencies: {
        nativewind: 'latest',
      },
    });

    expect(result.status).toBe('pass');
    expect(result.message).toBe('NativeWind detected.');
  });
});

describe('seo metadata check', () => {
  it('skips SEO warnings when web is only enabled for MDS tooling', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      [
        '# Native App Info',
        '',
        '## Platforms',
        '',
        '- Target platforms: ios, android',
        '- Web output: none',
        '',
      ].join('\n'),
      'utf8'
    );
    await writeProjectFile(projectPath, 'app.json', {
      expo: {
        platforms: ['ios', 'android', 'web'],
        web: { output: 'server' },
      },
    });

    const result = await checkSeoMetadata(projectPath);

    expect(result.status).toBe('skip');
    expect(result.message).toBe('Web is not a target platform for this app.');
  });
});

describe('Expo API route detection', () => {
  it('warns for real Expo Router API routes when web output is not server', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'src', 'app', 'exposition'), { recursive: true });
    await writeProjectFile(projectPath, 'package.json', {
      name: 'api-output-warning',
      main: 'expo-router/entry',
      dependencies: {
        expo: '^56.0.0',
        'expo-router': '^6.0.0',
      },
      scripts: {},
    });
    await writeProjectFile(projectPath, 'app.json', {
      expo: {
        platforms: ['web'],
        web: { output: 'static' },
      },
    });
    await writeFile(
      path.join(projectPath, 'src', 'app', 'exposition', 'stylist-sync+api.ts'),
      'export function GET() { return Response.json({ ok: true }); }\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'expo configuration');

    expect(check?.status).toBe('warn');
    expect(check?.details).toMatchObject({
      warnings: [expect.stringContaining('Expo API routes found')],
    });
  });

  it('passes for real Expo Router API routes when web output is server', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'src', 'app', 'api'), { recursive: true });
    await writeProjectFile(projectPath, 'package.json', {
      name: 'api-output-server',
      main: 'expo-router/entry',
      dependencies: {
        expo: '^56.0.0',
        'expo-router': '^6.0.0',
      },
      scripts: {},
    });
    await writeProjectFile(projectPath, 'app.json', {
      expo: {
        platforms: ['web'],
        web: { output: 'server' },
      },
    });
    await writeFile(
      path.join(projectPath, 'src', 'app', 'api', '[...segments]+api.ts'),
      'export function GET() { return Response.json({ ok: true }); }\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'expo configuration');

    expect(check?.status).toBe('pass');
  });

  it('does not warn for +api files outside real Expo Router projects', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'server'), { recursive: true });
    await mkdir(path.join(projectPath, 'src', 'app'), { recursive: true });
    await writeProjectFile(projectPath, 'package.json', {
      name: 'not-expo-router',
      scripts: {},
    });
    await writeFile(
      path.join(projectPath, 'server', 'health+api.ts'),
      'export function GET() { return null; }\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, 'src', 'app', 'mock+api.ts'),
      'export function GET() { return null; }\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'expo configuration');

    expect(check?.status).toBe('skip');
    expect(check?.message).toBe('No Expo Router signals detected.');
  });

  it('does not treat TSX files as Expo Router API routes', async () => {
    const projectPath = await createTempProject();
    await mkdir(path.join(projectPath, 'app', 'api'), { recursive: true });
    await writeProjectFile(projectPath, 'package.json', {
      name: 'tsx-api-file',
      main: 'expo-router/entry',
      dependencies: {
        'expo-router': '^6.0.0',
      },
      scripts: {},
    });
    await writeFile(
      path.join(projectPath, 'app', 'api', 'foo+api.tsx'),
      'export default function ApiLike() { return null; }\n',
      'utf8'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'expo configuration');

    expect(check?.status).toBe('pass');
  });
});

describe('scanFile', () => {
  it('detects public secret-looking env names in a focused file scan', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'app', 'settings.tsx');
    await mkdir(path.dirname(filePath), { recursive: true });
    const unsafeName = 'EXPO_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY';
    await writeFile(filePath, `export const key = process.env.${unsafeName};`, 'utf8');

    const report = await scanFile(filePath, { projectPath });

    expect(report.summary.errors).toBe(1);
    expect(report.checks.find((check) => check.name === 'env hygiene')?.status).toBe('error');
  });

  it('detects hardcoded credential values without reporting the secret value', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'config.ts');
    await mkdir(path.dirname(filePath), { recursive: true });
    const secretValue = 'sk_live_' + 'A'.repeat(24);
    await writeFile(filePath, `export const stripeSecretKey = "${secretValue}";\n`, 'utf8');

    const report = await scanFile(filePath, { projectPath });
    const check = report.checks.find((entry) => entry.name === 'env hygiene');
    const serializedDetails = JSON.stringify(check?.details);

    expect(check?.status).toBe('error');
    expect(serializedDetails).toContain('stripeSecretKey');
    expect(serializedDetails).toContain('stripe-key-shape');
    expect(serializedDetails).not.toContain(secretValue);
  });

  it('detects quoted JSON credential fields and private-key headers without leaking values', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'config.json');
    const secretValue = 'sk_live_' + 'B'.repeat(24);
    await writeFile(
      filePath,
      `{"apiKey":"${secretValue}"}\n-----BEGIN PRIVATE KEY-----\n`,
      'utf8'
    );

    const report = await scanFile(filePath, { projectPath });
    const check = report.checks.find((entry) => entry.name === 'env hygiene');
    const serializedDetails = JSON.stringify(check?.details);

    expect(check?.status).toBe('error');
    expect(serializedDetails).toContain('apiKey');
    expect(serializedDetails).toContain('private key');
    expect(serializedDetails).not.toContain(secretValue);
  });

  it('ignores placeholder credential examples', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, '.env.example');
    await writeFile(filePath, 'STRIPE_SECRET_KEY=sk_test_your-secret-here\n', 'utf8');

    const report = await scanFile(filePath, { projectPath });
    const check = report.checks.find((entry) => entry.name === 'env hygiene');

    expect(check?.status).toBe('pass');
  });

  it('skips animation warnings for files without animation-heavy code', async () => {
    const projectPath = await createTempProject();
    const filePath = path.join(projectPath, 'src', 'app', 'settings.tsx');
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, 'export default function Settings() { return null; }\n', 'utf8');

    const report = await scanFile(filePath, { projectPath });

    expect(report.checks.find((check) => check.name === 'animation performance')?.status).toBe(
      'skip'
    );
  });
});

describe('animation performance check', () => {
  it('ships generic motion fixtures for all supported motion classes', async () => {
    const fixtureReadme = await readFixture('motion/README.md');
    const fixtureFiles = await readdir(path.join(FIXTURE_ROOT, 'motion'));

    expect(fixtureReadme).toContain('A fixture is a small, repeatable sample input used in tests.');
    expect(fixtureFiles).toEqual(
      expect.arrayContaining([
        'marketing-hero-parallax.tsx',
        'marketing-hero-parallax-noted.tsx',
        'dense-animated-list.tsx',
        'simple-route-fades.tsx',
        'expanding-panel.tsx',
        'draggable-sheet.tsx',
        'branded-loader.tsx',
      ])
    );
  });

  it('skips or passes when the app has no animation-heavy source', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'plain-project',
      scripts: {},
    });
    await writeFile(path.join(projectPath, 'src.tsx'), 'export const App = () => null;\n', 'utf8');

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status === 'skip' || check?.status === 'pass').toBe(true);
  });

  it('warns on repeated animated list items without a motion note', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'animated-list',
      scripts: {},
    });
    await writeFixtureFile(
      projectPath,
      'src/components/animated-list.tsx',
      'motion/dense-animated-list.tsx'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status).toBe('warn');
    expect(check?.details).toMatchObject({
      findings: [expect.stringContaining('repeated animated rows or cards')],
    });
  });

  it('warns on dense parallax interpolation layers without a note', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'parallax-screen',
      scripts: {},
    });
    await writeFixtureFile(
      projectPath,
      'src/components/landing-motion.tsx',
      'motion/marketing-hero-parallax.tsx'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status).toBe('warn');
    expect(check?.details).toMatchObject({
      findings: [expect.stringContaining('dense parallax or scroll-linked layers')],
    });
  });

  it('avoids the warning when a borderline file has an explicit motion note', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'noted-parallax',
      scripts: {},
    });
    await writeFixtureFile(
      projectPath,
      'src/components/noted-motion.tsx',
      'motion/marketing-hero-parallax-noted.tsx'
    );

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status).toBe('pass');
  });

  it('passes on small one-shot route fades', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'route-fades',
      scripts: {},
    });
    await writeFixtureFile(projectPath, 'src/app/welcome.tsx', 'motion/simple-route-fades.tsx');

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status).toBe('pass');
  });

  it('passes on isolated gesture, layout, and loading fixtures', async () => {
    const projectPath = await createTempProject();
    await writeProjectFile(projectPath, 'package.json', {
      name: 'motion-samples',
      scripts: {},
    });
    await writeFixtureFile(projectPath, 'src/components/draggable-sheet.tsx', 'motion/draggable-sheet.tsx');
    await writeFixtureFile(projectPath, 'src/components/expanding-panel.tsx', 'motion/expanding-panel.tsx');
    await writeFixtureFile(projectPath, 'src/components/branded-loader.tsx', 'motion/branded-loader.tsx');

    const report = await runDoctor(projectPath, { runScripts: false });
    const check = report.checks.find((entry) => entry.name === 'animation performance');

    expect(check?.status).toBe('pass');
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-doctor-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
  return projectPath;
}

async function writeProjectFile(
  projectPath: string,
  fileName: string,
  value: Record<string, unknown>
): Promise<void> {
  await writeFile(path.join(projectPath, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeFixtureFile(
  projectPath: string,
  relativePath: string,
  fixtureRelativePath: string
): Promise<void> {
  const filePath = path.join(projectPath, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, await readFixture(fixtureRelativePath), 'utf8');
}

async function readFixture(fixtureRelativePath: string): Promise<string> {
  return readFile(path.join(FIXTURE_ROOT, fixtureRelativePath), 'utf8');
}
