import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLibraryListResult, getLibraryShowResult } from '../src/commands/library.js';
import { runEjectExpositionCommand } from '../src/commands/eject.js';
import { applyLibraryAdd, inspectLibraryProject, planLibraryAdd } from '../src/library.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('MDS Library CLI services', () => {
  it('searches and resolves catalog details', async () => {
    const matches = await getLibraryListResult({
      query: 'themed text',
      source: 'create-expo-app',
    });
    const details = await getLibraryShowResult('expo/themed-text');

    expect(matches.some((item) => item.id === 'expo/themed-text')).toBe(true);
    expect(details.item.id).toBe('expo/themed-text');
    expect(details.items.map((item) => item.id)).toEqual([
      'expo/theme-support',
      'expo/themed-text',
    ]);
  });

  it('detects Expo project conventions and normalizes wildcard aliases', async () => {
    const projectPath = await createExpoProject({ mdsRootLayout: true });
    const inspection = await inspectLibraryProject(projectPath);

    expect(inspection.expoSdk).toBe('~56.0.0');
    expect(inspection.appDirectory).toBe('src/app');
    expect(inspection.componentsDirectory).toBe('src/components');
    expect(inspection.navigation).toBe('expo-router');
    expect(inspection.navigationLayout).toBe('stack');
    expect(inspection.aliases).toMatchObject({
      '@/*': './src/*',
      '@': './src',
      '@/assets/*': './assets/*',
      '@/assets': './assets',
    });
    expect(inspection.packageManager).toBe('pnpm');
  });

  it('detects a custom tab shell rendered from the root layout', async () => {
    const projectPath = await createExpoProject();
    await writeFile(
      path.join(projectPath, 'src', 'app', '_layout.tsx'),
      "import AppTabs from '@/components/app-tabs';\nexport default function Layout() { return <AppTabs />; }\n",
      'utf8'
    );

    const inspection = await inspectLibraryProject(projectPath);

    expect(inspection.navigationLayout).toBe('tabs');
  });

  it('reads project name and platforms from a static app.config.ts without executing it', async () => {
    const projectPath = await createExpoProject({ appConfig: 'ts', includeProjectInfo: false });
    const inspection = await inspectLibraryProject(projectPath);

    expect(inspection.projectName).toBe('Library Test Config App');
    expect(inspection.platforms).toEqual(['ios', 'web']);
  });

  it('recursively plans composed items and selects a compatible route variant', async () => {
    const projectPath = await createExpoProject();
    const componentPlan = await planLibraryAdd(projectPath, 'expo/themed-text');
    const flowPlan = await planLibraryAdd(projectPath, 'mds/stylist');

    expect(componentPlan.canApply).toBe(true);
    expect(componentPlan.items.map((item) => item.id)).toEqual([
      'expo/theme-support',
      'expo/themed-text',
    ]);
    expect(componentPlan.files.some((file) => file.destination === 'src/components/themed-text.tsx')).toBe(true);
    expect(flowPlan.variant).toBe('stack');
    expect(flowPlan.conflicts.some((conflict) => conflict.message.includes('path alias'))).toBe(false);
  });

  it('adds legal documents with public routes, token rendering, idempotency, and route protection', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'mds/legal-documents');

    expect(plan.canApply).toBe(true);
    expect(plan.variant).toBe('public-routes');
    expect(plan.commands).toEqual([
      expect.objectContaining({
        display: 'pnpm exec expo install react-native-safe-area-context@~5.7.0',
        dependencies: ['react-native-safe-area-context@~5.7.0'],
      }),
    ]);
    expect(plan.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: 'src/app/terms.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/app/privacy.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/features/legal/legal-documents.ts' }),
        expect.objectContaining({ destination: 'src/features/legal/legal-document-modal.tsx' }),
      ])
    );

    const result = await applyLibraryAdd(projectPath, 'mds/legal-documents', {
      confirmed: true,
      planHash: plan.planHash,
      installDependencies: false,
    });
    expect(result.writtenFiles).toEqual(
      expect.arrayContaining([
        'src/app/terms.tsx',
        'src/app/privacy.tsx',
        'src/features/legal/legal-documents.ts',
      ])
    );
    const legalSourcePath = path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts');
    const renderedLegalSource = await readFile(legalSourcePath, 'utf8');
    expect(renderedLegalSource).toContain('Library Test App');
    expect(renderedLegalSource).toContain('not legal advice');
    expect(renderedLegalSource).not.toContain('__MDS_APP_NAME__');

    const secondPlan = await planLibraryAdd(projectPath, 'mds/legal-documents');
    expect(secondPlan.canApply).toBe(true);
    expect(secondPlan.files.every((file) => file.action === 'skip-identical')).toBe(true);

    const customTermsRoute = path.join(projectPath, 'src', 'app', 'terms.tsx');
    const customizedSource = '// app-specific legal route customization\n';
    await writeFile(customTermsRoute, customizedSource, 'utf8');
    const blockedPlan = await planLibraryAdd(projectPath, 'mds/legal-documents');
    expect(blockedPlan.canApply).toBe(false);
    expect(blockedPlan.conflicts).toContainEqual(
      expect.objectContaining({
        code: 'integration-conflict',
        path: 'src/app/terms.tsx',
      })
    );
    await expect(
      applyLibraryAdd(projectPath, 'mds/legal-documents', {
        confirmed: true,
        planHash: blockedPlan.planHash,
        installDependencies: false,
      })
    ).rejects.toThrow('blocked');
    expect(await readFile(customTermsRoute, 'utf8')).toBe(customizedSource);
  });

  it('adds the auth library with provider variants and idempotent generated files', async () => {
    const projectPath = await createExpoProject({ mdsRootLayout: true });
    const plan = await planLibraryAdd(projectPath, 'mds/auth', {
      variant: 'with-supabase',
    });

    expect(plan.canApply).toBe(true);
    expect(plan.variant).toBe('with-supabase');
    expect(plan.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dependencies: expect.arrayContaining(['@supabase/supabase-js@^2.112.3']),
        }),
        expect.objectContaining({
          dependencies: expect.arrayContaining([
            '@react-native-async-storage/async-storage@2.2.0',
          ]),
        }),
      ])
    );
    expect(plan.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: 'src/app/(auth)/sign-in.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/app/(auth)/sign-up.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/features/auth/auth-adapter.tsx' }),
        expect.objectContaining({ destination: 'src/features/auth/auth-provider.tsx' }),
        expect.objectContaining({ destination: 'src/services/supabase.ts' }),
        expect.objectContaining({ destination: '.env.example' }),
        expect.objectContaining({ destination: 'project/auth.md' }),
      ])
    );

    const result = await applyLibraryAdd(projectPath, 'mds/auth', {
      confirmed: true,
      installDependencies: false,
      planHash: plan.planHash,
      variant: 'with-supabase',
    });

    expect(result.writtenFiles).toEqual(
      expect.arrayContaining([
        'src/app/(auth)/sign-in.tsx',
        'src/features/auth/auth-adapter.tsx',
        'src/features/auth/auth-provider.tsx',
        'src/features/auth/auth-types.ts',
        'src/services/supabase.ts',
        '.env.example',
        'project/auth.md',
      ])
    );
    expect(result.repairedFiles).toEqual(['src/app/_layout.tsx']);
    const rootLayout = await readFile(path.join(projectPath, 'src', 'app', '_layout.tsx'), 'utf8');
    expect(rootLayout).toContain('AuthProvider');
    expect(rootLayout).toContain('useAuth');
    expect(rootLayout).toContain('<Stack.Protected guard={!auth.isAuthenticated}>');
    expect(rootLayout).toContain('<Stack.Protected guard={auth.isAuthenticated}>');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'auth', 'auth-adapter.tsx'), 'utf8')
    ).resolves.toContain('signInWithPassword');
    await expect(
      readFile(path.join(projectPath, 'project', 'auth.md'), 'utf8')
    ).resolves.toContain('Supabase Auth');
    await expect(readFile(path.join(projectPath, '.env.example'), 'utf8')).resolves.toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );

    const secondPlan = await planLibraryAdd(projectPath, 'mds/auth', {
      variant: 'with-supabase',
    });
    expect(secondPlan.files.every((file) => file.action === 'skip-identical')).toBe(true);
  });

  it('adds the legal update gate variant with route and adapter assets', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'mds/legal-documents', {
      variant: 'legal-update-gate',
    });

    expect(plan.canApply).toBe(true);
    expect(plan.variant).toBe('legal-update-gate');
    expect(plan.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ destination: 'src/app/legal/updates.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/app/terms.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/app/privacy.tsx', role: 'route' }),
        expect.objectContaining({ destination: 'src/features/legal/legal-acceptance-adapter.ts' }),
        expect.objectContaining({ destination: 'src/features/legal/legal-update-screen.tsx' }),
      ])
    );

    const result = await applyLibraryAdd(projectPath, 'mds/legal-documents', {
      confirmed: true,
      installDependencies: false,
      planHash: plan.planHash,
      variant: 'legal-update-gate',
    });
    expect(result.writtenFiles).toEqual(
      expect.arrayContaining([
        'src/app/legal/updates.tsx',
        'src/features/legal/legal-acceptance-adapter.ts',
        'src/features/legal/legal-update-screen.tsx',
      ])
    );
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'legal', 'legal-acceptance-adapter.ts'), 'utf8')
    ).resolves.toContain('LegalAcceptanceAdapter');
    await expect(
      readFile(path.join(projectPath, 'src', 'features', 'legal', 'legal-documents.ts'), 'utf8')
    ).resolves.toContain('requiresReacceptance');

    const secondPlan = await planLibraryAdd(projectPath, 'mds/legal-documents', {
      variant: 'legal-update-gate',
    });
    expect(secondPlan.files.every((file) => file.action === 'skip-identical')).toBe(true);
  });

  it('produces deterministic plans and exact dependency commands', async () => {
    const projectPath = await createExpoProject();
    const first = await planLibraryAdd(projectPath, 'swmansion/svg-mark');
    const second = await planLibraryAdd(projectPath, 'swmansion/svg-mark');

    expect(first.planHash).toBe(second.planHash);
    expect(first.placementGuidance).toContainEqual(
      expect.stringContaining('ask the developer where they want to see or use it')
    );
    expect(first.placementGuidance).toContainEqual(
      expect.stringContaining('src/components/swmansion/svg-mark.tsx')
    );
    expect(first.commands).toHaveLength(1);
    expect(first.commands[0]).toMatchObject({
      command: 'pnpm',
      installer: 'expo',
      dependencies: ['react-native-svg@15.15.4'],
    });
    expect(first.commands[0]?.display).toContain('pnpm exec expo install react-native-svg@15.15.4');
  });

  it('includes placement guidance for integration items too', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'mds/theme-support');

    expect(plan.placementGuidance).toContainEqual(
      expect.stringContaining('ask the developer where or how they want it wired')
    );
    expect(plan.placementGuidance).toContainEqual(
      expect.stringContaining('provider boundary')
    );
    expect(plan.placementGuidance).toContainEqual(
      expect.stringContaining('src/theme/tokens.ts')
    );
  });

  it('copies source without running dependencies when installation is disabled', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'swmansion/svg-mark');
    const runner = vi.fn();
    const result = await applyLibraryAdd(projectPath, 'swmansion/svg-mark', {
      confirmed: true,
      planHash: plan.planHash,
      installDependencies: false,
      runner,
    });

    expect(result.writtenFiles).toEqual(['src/components/swmansion/svg-mark.tsx']);
    expect(result.executedCommands).toEqual([]);
    expect(result.pendingCommands).toEqual([
      'pnpm exec expo install react-native-svg@15.15.4',
    ]);
    expect(result.dependenciesInstalled).toBe(false);
    expect(runner).not.toHaveBeenCalled();
    await expect(
      access(path.join(projectPath, 'src', 'components', 'swmansion', 'svg-mark.tsx'))
    ).resolves.toBeUndefined();
  });

  it('preserves bundled binary assets byte-for-byte', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'expo/animated-icon');
    expect(plan.canApply).toBe(true);
    expect(plan.files.some((file) => file.encoding === 'binary')).toBe(true);

    await applyLibraryAdd(projectPath, 'expo/animated-icon', {
      confirmed: true,
      planHash: plan.planHash,
      installDependencies: false,
    });
    const png = await readFile(path.join(projectPath, 'assets', 'images', 'expo-logo.png'));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('keeps apply dry runs completely non-mutating', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'ces/button');
    const result = await applyLibraryAdd(projectPath, 'ces/button', {
      confirmed: true,
      planHash: plan.planHash,
      dryRun: true,
      installDependencies: false,
    });

    expect(result.applied).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.writtenFiles).toEqual([]);
    await expect(access(path.join(projectPath, 'src', 'components', 'Button.tsx'))).rejects.toThrow();
  });

  it('groups Expo and ordinary runtime/development dependency commands', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'mds/stylist');

    expect(plan.canApply).toBe(true);
    expect(plan.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ installer: 'expo', kind: 'runtime' }),
        expect.objectContaining({ installer: 'package-manager', kind: 'runtime' }),
        expect.objectContaining({ installer: 'package-manager', kind: 'development' }),
      ])
    );
  });

  it('blocks runtime dependencies that only exist in dev, optional, peer, or local-link sections', async () => {
    const projectPath = await createExpoProject({
      dependencies: {
        'react-native-svg': 'workspace:*',
      },
      devDependencies: {
        '@react-native-async-storage/async-storage': '2.2.0',
      },
      optionalDependencies: {
        'react-native-safe-area-context': '~5.7.0',
      },
      peerDependencies: {
        'reanimated-color-picker': '^4.2.0',
      },
    });
    const plan = await planLibraryAdd(projectPath, 'mds/stylist');

    expect(plan.canApply).toBe(false);
    expect(plan.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '@react-native-async-storage/async-storage',
          action: 'conflict',
          currentVersion: '2.2.0',
        }),
        expect.objectContaining({
          name: 'react-native-safe-area-context',
          action: 'conflict',
          currentVersion: '~5.7.0',
        }),
        expect.objectContaining({
          name: 'reanimated-color-picker',
          action: 'conflict',
          currentVersion: '^4.2.0',
        }),
      ])
    );

    const svgPlan = await planLibraryAdd(projectPath, 'swmansion/svg-mark');
    expect(svgPlan.canApply).toBe(false);
    expect(svgPlan.dependencies).toContainEqual(
      expect.objectContaining({
        name: 'react-native-svg',
        action: 'conflict',
        currentVersion: 'workspace:*',
      })
    );
  });

  it('is idempotent and skips byte-identical files', async () => {
    const projectPath = await createExpoProject();
    const firstPlan = await planLibraryAdd(projectPath, 'ces/button');
    await applyLibraryAdd(projectPath, 'ces/button', {
      confirmed: true,
      planHash: firstPlan.planHash,
      installDependencies: false,
    });

    const secondPlan = await planLibraryAdd(projectPath, 'ces/button');
    expect(secondPlan.canApply).toBe(true);
    expect(secondPlan.files).toHaveLength(1);
    expect(secondPlan.files[0]?.action).toBe('skip-identical');

    const secondResult = await applyLibraryAdd(projectPath, 'ces/button', {
      confirmed: true,
      planHash: secondPlan.planHash,
      installDependencies: false,
    });
    expect(secondResult.writtenFiles).toEqual([]);
    expect(secondResult.skippedFiles).toEqual(['src/components/Button.tsx']);
  });

  it('skips text files with matching content across line endings', async () => {
    const projectPath = await createExpoProject();
    const firstPlan = await planLibraryAdd(projectPath, 'ces/button');
    await applyLibraryAdd(projectPath, 'ces/button', {
      confirmed: true,
      planHash: firstPlan.planHash,
      installDependencies: false,
    });

    const buttonPath = path.join(projectPath, 'src', 'components', 'Button.tsx');
    const originalSource = await readFile(buttonPath, 'utf8');
    const sourceWithCrlf = originalSource.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
    await writeFile(buttonPath, sourceWithCrlf, 'utf8');

    const secondPlan = await planLibraryAdd(projectPath, 'ces/button');
    expect(secondPlan.canApply).toBe(true);
    expect(secondPlan.conflicts).toEqual([]);
    expect(secondPlan.files).toHaveLength(1);
    expect(secondPlan.files[0]).toMatchObject({
      destination: 'src/components/Button.tsx',
      action: 'skip-identical',
    });
    expect(secondPlan.files[0]?.existingHash).toBe(secondPlan.files[0]?.contentHash);
  });

  it('blocks a whole multi-file plan when one destination is customized', async () => {
    const projectPath = await createExpoProject();
    const customizedPath = path.join(projectPath, 'src', 'theme', 'tokens.ts');
    await mkdir(path.dirname(customizedPath), { recursive: true });
    await writeFile(customizedPath, '// user customization\n', 'utf8');

    const plan = await planLibraryAdd(projectPath, 'mds/theme-support');
    expect(plan.canApply).toBe(false);
    expect(plan.conflicts).toContainEqual(
      expect.objectContaining({ code: 'file-conflict', path: 'src/theme/tokens.ts' })
    );
    expect(plan.files.some((file) => file.action === 'create')).toBe(true);

    await expect(
      applyLibraryAdd(projectPath, 'mds/theme-support', {
        confirmed: true,
        planHash: plan.planHash,
        installDependencies: false,
      })
    ).rejects.toThrow('blocked');
    expect(await readFile(customizedPath, 'utf8')).toBe('// user customization\n');
    await expect(access(path.join(projectPath, 'src', 'theme', 'provider.tsx'))).rejects.toThrow();
    await expect(access(path.join(projectPath, 'src', 'theme', 'font-assets.ts'))).rejects.toThrow();
  });

  it('requires confirmation and rejects a stale plan hash without writing', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'ces/button');

    await expect(
      applyLibraryAdd(projectPath, 'ces/button', {
        confirmed: false,
        planHash: plan.planHash,
        installDependencies: false,
      })
    ).rejects.toThrow('explicit confirmation');

    const destination = path.join(projectPath, 'src', 'components', 'Button.tsx');
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, '// appeared after planning\n', 'utf8');
    await expect(
      applyLibraryAdd(projectPath, 'ces/button', {
        confirmed: true,
        planHash: plan.planHash,
        installDependencies: false,
      })
    ).rejects.toThrow('stale');
    expect(await readFile(destination, 'utf8')).toBe('// appeared after planning\n');
  });

  it('blocks an explicitly unsupported variant', async () => {
    const projectPath = await createExpoProject();
    const plan = await planLibraryAdd(projectPath, 'mds/stylist', {
      variant: 'does-not-exist',
    });

    expect(plan.canApply).toBe(false);
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: 'unknown-variant' }));
  });

  it('rejects destinations that resolve through a symlink outside the project', async () => {
    const projectPath = await createExpoProject();
    const outsidePath = await mkdtemp(path.join(os.tmpdir(), 'mds-library-outside-'));
    tempDirs.push(outsidePath);
    const componentsPath = path.join(projectPath, 'src', 'components');
    await symlink(outsidePath, componentsPath, process.platform === 'win32' ? 'junction' : 'dir');

    const plan = await planLibraryAdd(projectPath, 'ces/button');
    expect(plan.canApply).toBe(false);
    expect(plan.conflicts).toContainEqual(
      expect.objectContaining({
        code: 'unsafe-destination',
        path: 'src/components/Button.tsx',
      })
    );
    await expect(access(path.join(outsidePath, 'Button.tsx'))).rejects.toThrow();
  });

  it('restores a stack onboarding flow below src/app after exposition ejection', async () => {
    const projectPath = await createExpoProject();
    const initialPlan = await planLibraryAdd(projectPath, 'mds/onboarding');
    await applyLibraryAdd(projectPath, 'mds/onboarding', {
      confirmed: true,
      planHash: initialPlan.planHash,
      installDependencies: false,
    });
    const routePath = path.join(projectPath, 'src', 'app', 'onboarding.tsx');
    const featuresRoutePath = path.join(projectPath, 'src', 'app', 'onboarding', 'features.tsx');
    await expect(access(routePath)).resolves.toBeUndefined();
    await expect(access(featuresRoutePath)).resolves.toBeUndefined();

    await ejectAll(projectPath);
    await expect(access(routePath)).rejects.toThrow();
    await expect(access(featuresRoutePath)).rejects.toThrow();

    const restorePlan = await planLibraryAdd(projectPath, 'mds/onboarding');
    expect(restorePlan.canApply).toBe(true);
    await applyLibraryAdd(projectPath, 'mds/onboarding', {
      confirmed: true,
      planHash: restorePlan.planHash,
      installDependencies: false,
    });
    await expect(access(routePath)).resolves.toBeUndefined();
    await expect(access(featuresRoutePath)).resolves.toBeUndefined();
  });

  it('restores a tabs data flow below app after exposition ejection', async () => {
    const projectPath = await createExpoProject({ appDirectory: 'app', layout: 'tabs' });
    const initialPlan = await planLibraryAdd(projectPath, 'mds/data-local');
    expect(initialPlan.variant).toBe('tabs');
    await applyLibraryAdd(projectPath, 'mds/data-local', {
      confirmed: true,
      planHash: initialPlan.planHash,
      installDependencies: false,
    });
    const routePath = path.join(projectPath, 'app', '(tabs)', 'data.tsx');
    await expect(access(routePath)).resolves.toBeUndefined();

    await ejectAll(projectPath);
    await expect(access(routePath)).rejects.toThrow();

    const restorePlan = await planLibraryAdd(projectPath, 'mds/data-local');
    expect(restorePlan.canApply).toBe(true);
    expect(restorePlan.variant).toBe('tabs');
    await applyLibraryAdd(projectPath, 'mds/data-local', {
      confirmed: true,
      planHash: restorePlan.planHash,
      installDependencies: false,
    });
    await expect(access(routePath)).resolves.toBeUndefined();
  });
});

async function createExpoProject(
  options: {
    appDirectory?: 'app' | 'src/app';
    layout?: 'stack' | 'tabs';
    appConfig?: 'json' | 'ts';
    includeProjectInfo?: boolean;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    mdsRootLayout?: boolean;
  } = {}
): Promise<string> {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-library-cli-'));
  tempDirs.push(projectPath);
  const appDirectory = options.appDirectory ?? 'src/app';
  const layout = options.layout ?? 'stack';
  await mkdir(path.join(projectPath, appDirectory), { recursive: true });
  await mkdir(path.join(projectPath, 'src'), { recursive: true });
  await mkdir(path.join(projectPath, 'project'), { recursive: true });
  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(
      {
        name: 'library-test-app',
        packageManager: 'pnpm@10.0.0',
        dependencies: {
          expo: '~56.0.0',
          'expo-router': '~56.2.6',
          react: '19.2.0',
          'react-native': '0.83.2',
          ...options.dependencies,
        },
        ...(options.devDependencies ? { devDependencies: options.devDependencies } : {}),
        ...(options.optionalDependencies
          ? { optionalDependencies: options.optionalDependencies }
          : {}),
        ...(options.peerDependencies ? { peerDependencies: options.peerDependencies } : {}),
      },
      null,
      2
    ),
    'utf8'
  );
  await writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          paths: { '@/*': ['./src/*'], '@/assets/*': ['./assets/*'] },
        },
      },
      null,
      2
    ),
    'utf8'
  );
  if (options.appConfig === 'ts') {
    await writeFile(
      path.join(projectPath, 'app.config.ts'),
      [
        'export default {',
        '  expo: {',
        "    name: 'Library Test Config App',",
        "    platforms: ['ios', 'web'],",
        '    android: undefined,',
        '  },',
        '};',
        '',
      ].join('\n'),
      'utf8'
    );
  } else {
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({ expo: { name: 'Library Test App', platforms: ['ios', 'android', 'web'] } }),
      'utf8'
    );
  }
  if (options.includeProjectInfo ?? true) {
    await writeFile(
      path.join(projectPath, 'project', 'info.md'),
      '# Library Test App Project Info\n\n## App Name\n\nLibrary Test App\n\n## Target Users\n\nLibrary maintainers\n',
      'utf8'
    );
  }
  await writeFile(
    path.join(projectPath, appDirectory, '_layout.tsx'),
    options.mdsRootLayout ? renderMdsRootLayoutFixture() : "import { Stack } from 'expo-router';\nexport default function Layout() { return <Stack />; }\n",
    'utf8'
  );
  if (layout === 'tabs') {
    await mkdir(path.join(projectPath, appDirectory, '(tabs)'), { recursive: true });
    await writeFile(
      path.join(projectPath, appDirectory, '(tabs)', '_layout.tsx'),
      "import { Tabs } from 'expo-router';\nexport default function Layout() { return <Tabs />; }\n",
      'utf8'
    );
  }
  return projectPath;
}

function renderMdsRootLayoutFixture(): string {
  return [
    "import type { ReactNode } from 'react';",
    "import { Stack, ThemeProvider } from 'expo-router';",
    "import { AppThemeProvider, useAppTheme } from '../theme/provider';",
    '',
    'function RouterThemeBridge({ children }: { children: ReactNode }) {',
    '  return <ThemeProvider value={{ dark: false, colors: {} as never }}>{children}</ThemeProvider>;',
    '}',
    '',
    'function LayoutInner() {',
    '  const theme = useAppTheme();',
    '  const shellColor = theme.activeColors.background;',
    '  return (',
    '    <RouterThemeBridge>',
    '            <Stack',
    '              screenOptions={{',
    '                contentStyle: { backgroundColor: shellColor },',
    '              }}>',
    '        <Stack.Screen name="onboarding" options={{ title: \'Onboarding\' }} />',
    '        <Stack.Screen name="terms" options={{ title: \'Terms Of Service\' }} />',
    '        <Stack.Screen name="privacy" options={{ title: \'Privacy Policy\' }} />',
    '        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />',
    '        <Stack.Screen name="settings" options={{ presentation: \'modal\', title: \'Settings\' }} />',
    '            </Stack>',
    '    </RouterThemeBridge>',
    '  );',
    '}',
    '',
    'export default function Layout() {',
    '  return (',
    '    <AppThemeProvider>',
    '      <LayoutInner />',
    '    </AppThemeProvider>',
    '  );',
    '}',
    '',
  ].join('\n');
}

async function ejectAll(projectPath: string): Promise<void> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    await runEjectExpositionCommand({ path: projectPath, all: true });
  } finally {
    log.mockRestore();
  }
}
