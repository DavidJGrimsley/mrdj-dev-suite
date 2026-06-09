import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDoctor, scanFile } from '../src/index.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
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
