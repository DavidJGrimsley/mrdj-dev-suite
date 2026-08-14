import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  PackageInstallError,
  buildAddCommand,
  buildExpoInstallCommand,
  buildLockfileInstallCommand,
  collectDeclaredPackageNames,
  detectPackageManager,
  diffDeclaredPackageNames,
  parseDependencyName,
  prepareCommandForSpawn,
  runProjectCommand,
  shouldInstallProjectDependencies,
  validateInstalledPackages,
} from '../src/package-install.js';

describe('package-install helper', () => {
  it('treats omitted and true install flags as install, and false as skip', () => {
    expect(shouldInstallProjectDependencies(undefined)).toBe(true);
    expect(shouldInstallProjectDependencies(true)).toBe(true);
    expect(shouldInstallProjectDependencies(false)).toBe(false);
  });

  it('detects the package manager from package.json, then lockfiles', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-pkg-detect-'));

    await writeFile(path.join(projectPath, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
    expect(await detectPackageManager(projectPath)).toBe('npm');

    await writeFile(path.join(projectPath, 'bun.lock'), '', 'utf8');
    expect(await detectPackageManager(projectPath)).toBe('bun');

    await writeFile(path.join(projectPath, 'yarn.lock'), '', 'utf8');
    expect(await detectPackageManager(projectPath)).toBe('yarn');

    await writeFile(path.join(projectPath, 'pnpm-lock.yaml'), '', 'utf8');
    expect(await detectPackageManager(projectPath)).toBe('pnpm');

    expect(
      await detectPackageManager(projectPath, { packageManager: 'yarn@4.0.0' })
    ).toBe('yarn');
  });

  it('builds lockfile install commands, including pnpm workspace-safe flags', () => {
    expect(buildLockfileInstallCommand('npm')).toMatchObject({
      command: 'npm',
      args: ['install'],
      display: 'npm install',
    });
    expect(buildLockfileInstallCommand('yarn').display).toBe('yarn install');
    expect(buildLockfileInstallCommand('bun').display).toBe('bun install');

    const pnpm = buildLockfileInstallCommand('pnpm');
    expect(pnpm.display).toBe('pnpm install --config.strict-dep-builds=false --ignore-workspace');
    expect(pnpm.args).toEqual([
      'install',
      '--config.strict-dep-builds=false',
      '--ignore-workspace',
    ]);
    expect(pnpm.env).toEqual({ PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' });
  });

  it('builds expo and ordinary add commands for every package manager', () => {
    const specs = ['react-native-svg@15.15.4'];
    const expoRuntime = {
      npm: 'npx expo install react-native-svg@15.15.4',
      pnpm: 'pnpm exec expo install react-native-svg@15.15.4',
      yarn: 'yarn expo install react-native-svg@15.15.4',
      bun: 'bunx expo install react-native-svg@15.15.4',
    };
    const expoDev = {
      npm: 'npx expo install --dev react-native-svg@15.15.4',
      pnpm: 'pnpm exec expo install --dev react-native-svg@15.15.4',
      yarn: 'yarn expo install --dev react-native-svg@15.15.4',
      bun: 'bunx expo install --dev react-native-svg@15.15.4',
    };
    const ordinaryRuntime = {
      npm: 'npm install react-native-svg@15.15.4',
      pnpm: 'pnpm add react-native-svg@15.15.4',
      yarn: 'yarn add react-native-svg@15.15.4',
      bun: 'bun add react-native-svg@15.15.4',
    };
    const ordinaryDev = {
      npm: 'npm install --save-dev react-native-svg@15.15.4',
      pnpm: 'pnpm add --save-dev react-native-svg@15.15.4',
      yarn: 'yarn add --dev react-native-svg@15.15.4',
      bun: 'bun add --dev react-native-svg@15.15.4',
    };

    for (const manager of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
      expect(buildExpoInstallCommand(manager, 'runtime', specs).display).toBe(expoRuntime[manager]);
      expect(buildExpoInstallCommand(manager, 'development', specs).display).toBe(expoDev[manager]);
      expect(buildAddCommand(manager, 'runtime', specs).display).toBe(ordinaryRuntime[manager]);
      expect(buildAddCommand(manager, 'development', specs).display).toBe(ordinaryDev[manager]);
    }
  });

  it('parses dependency specifications including scoped names', () => {
    expect(parseDependencyName('react-native-svg@15.15.4')).toBe('react-native-svg');
    expect(parseDependencyName('@react-native-async-storage/async-storage@2.2.0')).toBe(
      '@react-native-async-storage/async-storage'
    );
  });

  it('diffs newly declared package names across dependency sections', () => {
    expect(
      collectDeclaredPackageNames({
        dependencies: { expo: '~56.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      })
    ).toEqual(['expo', 'typescript']);

    expect(
      diffDeclaredPackageNames(
        { dependencies: { expo: '~56.0.0' } },
        {
          dependencies: { expo: '~56.0.0', uniwind: '^1.6.4' },
          devDependencies: { tailwindcss: '^4.2.4' },
        }
      )
    ).toEqual(['tailwindcss', 'uniwind']);
  });

  it('wraps Windows shell commands without using child_process shell mode', () => {
    const spec = prepareCommandForSpawn(
      {
        command: 'npx',
        args: ['expo', 'install', 'expo@~56.0.19'],
        display: 'npx expo install expo@~56.0.19',
      },
      { platform: 'win32', comSpec: 'C:\\Windows\\System32\\cmd.exe' }
    );

    expect(spec.command).toBe('C:\\Windows\\System32\\cmd.exe');
    expect(spec.args).toEqual(['/d', '/s', '/c', 'npx expo install expo@~56.0.19']);
    expect(spec.shell).toBe(false);
  });

  it('wraps runner failures in PackageInstallError', async () => {
    const runner = vi.fn(async () => {
      throw new Error('spawn exploded');
    });

    await expect(
      runProjectCommand(
        { command: 'npm', args: ['install'], display: 'npm install' },
        { cwd: '/tmp/demo', runner }
      )
    ).rejects.toMatchObject({
      name: 'PackageInstallError',
      display: 'npm install',
      cwd: '/tmp/demo',
    });
    expect(runner).toHaveBeenCalledWith('npm', ['install'], {
      cwd: '/tmp/demo',
      env: undefined,
    });
  });

  it('validates installed package presence including scoped names', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-pkg-validate-'));
    await mkdir(
      path.join(projectPath, 'node_modules', '@react-native-async-storage', 'async-storage'),
      { recursive: true }
    );
    await mkdir(path.join(projectPath, 'node_modules', 'uniwind'), { recursive: true });

    await expect(
      validateInstalledPackages(projectPath, [
        'uniwind',
        '@react-native-async-storage/async-storage',
      ])
    ).resolves.toBeUndefined();

    await expect(validateInstalledPackages(projectPath, ['uniwind', 'missing-lib'])).rejects.toThrow(
      /missing from node_modules[\s\S]*- missing-lib/u
    );
  });
});
