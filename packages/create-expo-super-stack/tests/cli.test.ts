import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildExpoDoctorCommand,
  buildExpoFontInstallCommand,
  buildExpoInstallFixCommand,
  buildExpoLatestSdkCommand,
  buildInstallCommand,
  detectEasSetup,
  isCliEntryPoint,
  parseArgs,
  repairExpoProjectIdentifiers,
  resolveProjectTarget,
  shouldInstallExpoFontPeerFromPackageJson,
  shouldRunExpoLatestSdkCommandFromPackageJson,
  toExpoScheme,
  toExpoSlug,
  validateCreateExpoStackArgs,
  withResolvedProjectName,
} from '../src/cli.js';

describe('create-expo-super-stack CLI helpers', () => {
  it('builds install, latest SDK, expo repair, Expo font peer, and doctor commands in the required order', () => {
    const commands = [
      buildInstallCommand('npm').display,
      buildExpoLatestSdkCommand('npm').display,
      buildExpoInstallFixCommand('npm').display,
      buildExpoFontInstallCommand('npm').display,
      buildExpoDoctorCommand('npm').display,
    ];

    expect(commands).toEqual([
      'npm install',
      'npx expo install expo@latest',
      'npx expo install --fix',
      'npx expo install expo-font',
      'npx expo-doctor',
    ]);
  });

  it('uses non-failing pnpm strict dependency build settings during install', () => {
    const command = buildInstallCommand('pnpm');

    expect(command.display).toBe('pnpm install --config.strict-dep-builds=false');
    expect(command.args).toEqual(['install', '--config.strict-dep-builds=false']);
    expect(command.env).toEqual({ PNPM_CONFIG_STRICT_DEP_BUILDS: 'false' });
  });

  it('installs expo-font when vector icons are present without their peer dependency', () => {
    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          '@expo/vector-icons': '^15.0.0',
        },
      }),
    ).toBe(true);

    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          '@expo/vector-icons': '^15.0.0',
          'expo-font': '~14.0.0',
        },
      }),
    ).toBe(false);

    expect(
      shouldInstallExpoFontPeerFromPackageJson({
        dependencies: {
          expo: '~54.0.0',
        },
      }),
    ).toBe(false);
  });

  it('skips redundant expo@latest repair when the project already targets SDK 55', () => {
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: '~55.0.23' },
      }),
    ).toBe(false);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: { expo: '~54.0.0' },
      }),
    ).toBe(true);
    expect(
      shouldRunExpoLatestSdkCommandFromPackageJson({
        dependencies: {},
      }),
    ).toBe(true);
  });

  it('does not execute main when imported by tests', () => {
    expect(isCliEntryPoint(['node', 'not-the-cli.js'])).toBe(false);
  });

  it('does not force my-expo-app when no project name was provided', () => {
    const parsed = parseArgs(['--expo-router', '--no-install']);
    expect(parsed.projectName).toBeUndefined();
    expect(parsed.createExpoStackArgs).toEqual(['--expo-router', '--no-install']);

    const resolved = withResolvedProjectName(parsed, 'poop');
    expect(resolved.projectName).toBe('poop');
    expect(resolved.createExpoStackArgs).toEqual(['poop', '--expo-router', '--no-install']);
    expect(resolved.mrdj.appName).toBe('poop');
  });

  it('normalizes path-like project targets before delegating to create-expo-stack', () => {
    const cwd = path.join('F:', 'SoftwareDev', 'mrdj-dev-suite');
    const target = resolveProjectTarget(path.join('F:', 'SoftwareDev', 'Smoke Path App'), cwd);

    expect(target.projectName).toBe('Smoke Path App');
    expect(target.parentDir).toContain(path.join('F:', 'SoftwareDev'));

    const parsed = parseArgs([path.join('..', 'Smoke Relative App'), '--expo-router', '--no-install']);
    const resolved = withResolvedProjectName(parsed, 'ignored');

    expect(resolved.projectName).toBe('Smoke Relative App');
    expect(resolved.createExpoStackArgs).toEqual(['Smoke Relative App', '--expo-router', '--no-install']);
    expect(resolved.mrdj.appName).toBe('Smoke Relative App');
    expect(resolved.mrdj.projectParentDir).toBeDefined();
  });

  it('uses an explicit MrDJ app name instead of the project folder name', () => {
    const parsed = parseArgs(['folder-name', '--mrdj-app-name=Display Name']);
    const resolved = withResolvedProjectName(parsed, 'ignored');

    expect(resolved.projectName).toBe('folder-name');
    expect(resolved.mrdj.appName).toBe('Display Name');
  });

  it('rejects conflicting create-expo-stack auth provider flags', () => {
    expect(() => validateCreateExpoStackArgs(['App', '--supabase', '--firebase'])).toThrow(
      /Choose one create-expo-stack auth provider/,
    );
    expect(() => validateCreateExpoStackArgs(['App', '--supabase'])).not.toThrow();
    expect(() => validateCreateExpoStackArgs(['App', '--firebase'])).not.toThrow();
  });

  it('detects EAS setup from flags and generated project files', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'super-stack-eas-'));
    try {
      expect(await detectEasSetup(projectPath, ['App', '--eas'])).toBe(true);
      expect(await detectEasSetup(projectPath, ['App'])).toBeUndefined();

      await writeFile(path.join(projectPath, 'eas.json'), JSON.stringify({ build: {} }), 'utf8');
      expect(await detectEasSetup(projectPath, ['App'])).toBe(true);

      await rm(path.join(projectPath, 'eas.json'), { force: true });
      await writeFile(
        path.join(projectPath, 'app.json'),
        JSON.stringify({ expo: { extra: { eas: { projectId: '20850e64-94ba-462d-a00c-bd0b4ff351c6' } } } }),
        'utf8',
      );
      expect(await detectEasSetup(projectPath, ['App'])).toBe(true);
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });

  it('sanitizes Expo slug and scheme values from display names', async () => {
    expect(toExpoSlug('Bandana Designer')).toBe('bandana-designer');
    expect(toExpoScheme('Bandana Designer')).toBe('bandana-designer');
    expect(toExpoScheme('2026 Bandana Designer')).toBe('bandana-designer');

    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'super-stack-app-json-'));
    try {
      await mkdir(projectPath, { recursive: true });
      await writeFile(
        path.join(projectPath, 'app.json'),
        JSON.stringify({
          expo: {
            name: 'Bandana Designer',
            slug: 'Bandana Designer',
            scheme: 'Bandana Designer',
          },
        }),
        'utf8',
      );

      await expect(repairExpoProjectIdentifiers(projectPath, 'Bandana Designer')).resolves.toEqual([
        path.join(projectPath, 'app.json'),
      ]);

      const repaired = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
        expo: { slug: string; scheme: string };
      };
      expect(repaired.expo.slug).toBe('bandana-designer');
      expect(repaired.expo.scheme).toBe('bandana-designer');
    } finally {
      await rm(projectPath, { recursive: true, force: true });
    }
  });
});
