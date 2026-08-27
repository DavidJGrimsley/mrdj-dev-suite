import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDoctorCli } from '../src/cli-main.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('doctor CLI', () => {
  it('prints parseable JSON with score when --json is set', async () => {
    const projectPath = await createTempProject();
    await writePackageJson(projectPath, {
      name: 'cli-json',
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
        test: 'node -e "process.exit(0)"',
        doctor: 'node -e "process.exit(0)"',
        build: 'node -e "process.exit(0)"',
      },
    });

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      summary?: { score?: number };
    };

    expect(result.exitCode).toBe(0);
    expect(typeof parsed.summary?.score).toBe('number');
  });

  it('returns exit code 1 when Doctor reports errors', async () => {
    const projectPath = await createTempProject();
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Info\n\n# TodoForContext(optional): Add notes.\n',
      'utf8'
    );

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    expect(result.exitCode).toBe(1);
  });

  it('preserves CI as the standalone Doctor CLI default', async () => {
    const projectPath = await createTempProject();
    const result = await runDoctorCli([projectPath, '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      mode?: string;
      selection?: { defaultMode?: string };
    };

    expect(parsed.mode).toBe('ci');
    expect(parsed.selection?.defaultMode).toBe('ci');
  });

  it('scans a target package and includes target metadata', async () => {
    const projectPath = await createTempProject();
    const targetPath = path.join(projectPath, 'packages', 'my-app');
    await mkdir(targetPath, { recursive: true });
    await writePackageJson(targetPath, {
      name: 'my-app',
      dependencies: { expo: '^56.0.0' },
      scripts: {
        lint: 'node -e "process.exit(0)"',
        typecheck: 'node -e "process.exit(0)"',
      },
    });

    const textResult = await runDoctorCli([
      projectPath,
      '--target',
      'packages/my-app',
      '--ci',
      '--no-scripts',
    ]);
    expect(textResult.output).toContain('Scanned packages/my-app for issues');

    const jsonResult = await runDoctorCli([
      projectPath,
      '--target',
      'packages/my-app',
      '--ci',
      '--json',
      '--no-scripts',
    ]);
    const parsed = JSON.parse(jsonResult.output) as {
      projectPath?: string;
      target?: { workspacePath?: string; target?: string; targetPath?: string };
    };
    expect(parsed.projectPath).toBe(path.resolve(targetPath));
    expect(parsed.target?.workspacePath).toBe(path.resolve(projectPath));
    expect(parsed.target?.target).toBe('packages/my-app');
    expect(parsed.target?.targetPath).toBe(path.resolve(targetPath));
  });

  it('rejects target paths that escape the project', async () => {
    const projectPath = await createTempProject();

    await expect(runDoctorCli([projectPath, '--target', '../outside'])).rejects.toThrow(
      'Workspace path escapes the workspace'
    );
  });

  it('reports aggregate workspace and per-app metadata', async () => {
    const projectPath = await createWorkspaceProject();

    const human = await runDoctorCli([projectPath, '--ci', '--no-scripts']);
    expect(human.output).toContain('Workspace: Creative Suite (2 apps)');
    expect(human.output).toContain('apps/mobile [expo]');
    expect(human.output).toContain('REGISTERED apps/site [non-expo]');

    const json = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(json.output) as {
      scope?: string;
      summary?: { errors?: number };
      workspace?: {
        name?: string;
        apps?: Array<{ id?: string; status?: string; report?: unknown }>;
      };
    };
    expect(parsed.scope).toBe('workspace');
    expect(typeof parsed.summary?.errors).toBe('number');
    expect(parsed.workspace?.name).toBe('creative-suite');
    expect(parsed.workspace?.apps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'mobile', report: expect.any(Object) }),
        expect.objectContaining({ id: 'site', status: 'registered' }),
      ])
    );
  });

  it('keeps root script checks out of nested Expo app reports', async () => {
    const projectPath = await createWorkspaceProject();
    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      checks?: Array<{ name?: string }>;
      workspace?: { apps?: Array<{ id?: string; report?: { checks?: Array<{ name?: string }> } }> };
    };
    expect(parsed.checks).toContainEqual(expect.objectContaining({ name: 'lint' }));
    const mobileChecks = parsed.workspace?.apps?.find((app) => app.id === 'mobile')?.report?.checks;
    expect(mobileChecks).not.toContainEqual(expect.objectContaining({ name: 'lint' }));
    expect(mobileChecks).not.toContainEqual(expect.objectContaining({ name: 'tests' }));
  });

  it('includes nested app failures in the aggregate summary', async () => {
    const projectPath = await createWorkspaceProject();
    await writeFile(
      path.join(projectPath, 'apps', 'mobile', 'project', 'info.md'),
      '# Mobile\n# TodoForContext(optional): Add app context.\n',
      'utf8'
    );

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      summary?: { errors?: number };
      workspace?: {
        apps?: Array<{ id?: string; report?: { summary?: { errors?: number } } }>;
      };
    };
    const mobileErrors = parsed.workspace?.apps?.find((app) => app.id === 'mobile')?.report?.summary?.errors;
    expect(mobileErrors).toBeGreaterThan(0);
    expect(parsed.summary?.errors).toBeGreaterThanOrEqual(mobileErrors ?? 0);
  });

  it('validates focused targets against the workspace registry', async () => {
    const projectPath = await createWorkspaceProject();

    const result = await runDoctorCli([
      projectPath,
      '--target',
      'apps/mobile',
      '--ci',
      '--json',
      '--no-scripts',
    ]);
    const parsed = JSON.parse(result.output) as {
      scope?: string;
      target?: { target?: string; appId?: string; kind?: string };
    };
    expect(parsed.scope).toBe('project');
    expect(parsed.target).toEqual(
      expect.objectContaining({
        target: 'apps/mobile',
        appId: 'mobile',
        kind: 'expo',
      })
    );

    await expect(
      runDoctorCli([projectPath, '--target', 'apps/unregistered', '--ci', '--no-scripts'])
    ).rejects.toThrow('not registered in project/workspace.json');
  });

  it('allows registered shared packages as focused targets', async () => {
    const projectPath = await createWorkspaceProject();

    const result = await runDoctorCli([
      projectPath,
      '--target',
      'packages/ui',
      '--ci',
      '--json',
      '--no-scripts',
    ]);
    const parsed = JSON.parse(result.output) as {
      target?: { target?: string; packageName?: string; kind?: string };
    };
    expect(parsed.target).toEqual(
      expect.objectContaining({
        target: 'packages/ui',
        packageName: '@creative/ui',
        kind: 'shared',
      })
    );
  });

  it('accepts the app-local public Supabase environment contract', async () => {
    const projectPath = await createTempProject();
    await writeFile(path.join(projectPath, '.gitignore'), '.env.local\n', 'utf8');
    await writeFile(
      path.join(projectPath, '.env.local'),
      'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example\n',
      'utf8'
    );
    await writeFile(
      path.join(projectPath, '.env.example'),
      'EXPO_PUBLIC_SUPABASE_URL=\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\n',
      'utf8'
    );
    await writePackageJson(projectPath, {
      name: 'supabase-app',
      dependencies: { '@supabase/supabase-js': '^2.0.0' },
    });

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      checks?: Array<{ name?: string; status?: string }>;
    };
    expect(parsed.checks).toContainEqual(
      expect.objectContaining({ name: 'Supabase environment', status: 'pass' })
    );
  });

  it('rejects private Supabase credentials in an Expo environment', async () => {
    const projectPath = await createTempProject();
    await writeFile(path.join(projectPath, '.gitignore'), '.env.local\n', 'utf8');
    await writeFile(
      path.join(projectPath, '.env.local'),
      'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=sb_secret_example\n',
      'utf8'
    );
    await writeFile(path.join(projectPath, '.env.example'), 'EXPO_PUBLIC_SUPABASE_URL=\n', 'utf8');
    await writePackageJson(projectPath, {
      name: 'unsafe-supabase-app',
      dependencies: { '@supabase/supabase-js': '^2.0.0' },
    });

    const result = await runDoctorCli([projectPath, '--ci', '--json', '--no-scripts']);
    const parsed = JSON.parse(result.output) as {
      checks?: Array<{
        name?: string;
        status?: string;
        details?: { problems?: string[] };
      }>;
    };
    expect(parsed.checks).toContainEqual(
      expect.objectContaining({
        name: 'Supabase environment',
        status: 'error',
        details: expect.objectContaining({
          problems: expect.arrayContaining([expect.stringContaining('SUPABASE_SERVICE_ROLE_KEY')]),
        }),
      })
    );
  });

  it('rejects unsafe paths in a hand-edited workspace manifest', async () => {
    const projectPath = await createWorkspaceProject();
    const manifestPath = path.join(projectPath, 'project', 'workspace.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      apps: Array<{ path: string }>;
    };
    manifest.apps[0]!.path = '../outside';
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    await expect(runDoctorCli([projectPath, '--ci', '--no-scripts'])).rejects.toThrow(
      'Workspace path escapes the workspace'
    );
  });

  it('prints mode help for standalone Doctor CLI', async () => {
    const result = await runDoctorCli(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Default mode: ci');
    expect(result.output).toContain('--full');
  });

  it('rejects multiple mode flags', async () => {
    await expect(runDoctorCli(['--fast', '--ci'])).rejects.toThrow(
      'Choose only one Doctor mode flag'
    );
  });
});

async function createTempProject(): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-doctor-cli-'));
  tempDirs.push(projectPath);
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(path.join(projectPath, 'project', 'info.md'), '# Info\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'todo.md'), '# Todo\n', 'utf8');
  await writeFile(path.join(projectPath, 'project', 'guidelines.md'), '# Guidelines\n', 'utf8');
  return projectPath;
}

async function writePackageJson(
  projectPath: string,
  value: Record<string, unknown>
): Promise<void> {
  await writeFile(
    path.join(projectPath, 'package.json'),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8'
  );
}

async function createWorkspaceProject(): Promise<string> {
  const projectPath = await createTempProject();
  await writeFile(path.join(projectPath, 'project', 'style.md'), '# Shared Style\n', 'utf8');
  await writeFile(
    path.join(projectPath, 'project', 'workspace.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        name: 'creative-suite',
        displayName: 'Creative Suite',
        packageScope: '@creative',
        packageManager: 'pnpm',
        expoVersion: '~56.0.19',
        stylingSystem: 'uniwind',
        sharedDesignDirection: 'A clear shared visual system.',
        taskRunner: 'turbo',
        apps: [
          {
            id: 'mobile',
            displayName: 'Mobile',
            packageName: '@creative/mobile',
            path: 'apps/mobile',
            kind: 'expo',
            purpose: 'Create content.',
            platforms: ['web', 'ios', 'android'],
            port: 8081,
          },
          {
            id: 'site',
            displayName: 'Site',
            packageName: '@creative/site',
            path: 'apps/site',
            kind: 'non-expo',
            purpose: 'Publish product information.',
            category: 'website',
          },
        ],
        sharedPackages: [
          {
            name: 'config',
            packageName: '@creative/config',
            path: 'packages/config',
            role: 'config',
          },
          {
            name: 'ui',
            packageName: '@creative/ui',
            path: 'packages/ui',
            role: 'ui-theme',
          },
        ],
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  await writePackageJson(projectPath, {
    name: 'creative-suite',
    private: true,
    packageManager: 'pnpm@9.0.0',
    workspaces: ['apps/*', 'packages/*'],
    scripts: {
      dev: 'turbo run dev',
      build: 'turbo run build',
      lint: 'turbo run lint',
      test: 'turbo run test',
      typecheck: 'turbo run typecheck',
      clean: 'turbo run clean',
      doctor: 'mds doctor .',
    },
  });
  await writeFile(
    path.join(projectPath, 'turbo.json'),
    JSON.stringify({
      tasks: {
        dev: { cache: false },
        build: {},
        lint: {},
        test: {},
        typecheck: {},
        clean: { cache: false },
      },
    }),
    'utf8'
  );
  await writeFile(path.join(projectPath, 'tsconfig.base.json'), '{}', 'utf8');
  await writeFile(
    path.join(projectPath, 'pnpm-workspace.yaml'),
    'packages:\n  - "apps/*"\n  - "packages/*"\n',
    'utf8'
  );
  await writeFile(path.join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n', 'utf8');
  await writeFile(path.join(projectPath, '.gitignore'), '.env\nnode_modules\n', 'utf8');

  for (const packageName of ['config', 'ui']) {
    const packagePath = path.join(projectPath, 'packages', packageName);
    await mkdir(path.join(packagePath, 'src'), { recursive: true });
    await writePackageJson(packagePath, {
      name: `@creative/${packageName}`,
      exports: { '.': './src/index.ts' },
    });
    await writeFile(path.join(packagePath, 'src', 'index.ts'), 'export {};\n', 'utf8');
  }

  const mobilePath = path.join(projectPath, 'apps', 'mobile');
  await mkdir(path.join(mobilePath, 'project'), { recursive: true });
  for (const file of ['info.md', 'todo.md', 'style.md', 'guidelines.md']) {
    await writeFile(path.join(mobilePath, 'project', file), `# Mobile ${file}\n`, 'utf8');
  }
  await writePackageJson(mobilePath, {
    name: '@creative/mobile',
    dependencies: {
      expo: '^56.0.0',
      '@creative/config': 'workspace:*',
      '@creative/ui': 'workspace:*',
    },
    scripts: {
      lint: 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
      test: 'node -e "process.exit(0)"',
    },
  });

  const sitePath = path.join(projectPath, 'apps', 'site', 'project');
  await mkdir(sitePath, { recursive: true });
  for (const file of ['info.md', 'todo.md', 'style.md', 'guidelines.md']) {
    await writeFile(path.join(sitePath, file), `# Site ${file}\n`, 'utf8');
  }
  return projectPath;
}
