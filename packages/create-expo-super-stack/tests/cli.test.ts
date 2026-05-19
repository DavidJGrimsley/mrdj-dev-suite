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
  renderHelpText,
  resolveProjectTarget,
  shouldInstallExpoFontPeerFromPackageJson,
  shouldRunExpoLatestSdkCommandFromPackageJson,
  toExpoScheme,
  toExpoSlug,
  validateCreateExpoStackArgs,
  withResolvedProjectName,
} from '../src/cli.js';

describe('create-expo-super-stack CLI helpers', () => {
  it('parses help flags without forcing interactive prompts', () => {
    const longHelp = parseArgs(['--help']);
    expect(longHelp.helpRequested).toBe(true);
    expect(longHelp.projectName).toBeUndefined();
    expect(longHelp.createExpoStackArgs).toEqual([]);

    const shortHelp = parseArgs(['-h']);
    expect(shortHelp.helpRequested).toBe(true);
    expect(shortHelp.projectName).toBeUndefined();
    expect(shortHelp.createExpoStackArgs).toEqual([]);
  });

  it('renders help text with usage and examples', () => {
    const help = renderHelpText();
    expect(help).toContain('Usage:');
    expect(help).toContain('create-expo-super-stack [project-name]');
    expect(help).toContain('--mds-yes');
    expect(help).toContain('-h, --help');
  });

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
    expect(resolved.mds.appName).toBe('poop');
  });

  it('normalizes path-like project targets before delegating to create-expo-stack', () => {
    const cwd = path.join('F:', 'SoftwareDev', 'mr-djs-dev-suite');
    const target = resolveProjectTarget(path.join('F:', 'SoftwareDev', 'Smoke Path App'), cwd);

    expect(target.projectName).toBe('Smoke Path App');
    expect(target.parentDir).toContain(path.join('F:', 'SoftwareDev'));

    const parsed = parseArgs([path.join('..', 'Smoke Relative App'), '--expo-router', '--no-install']);
    const resolved = withResolvedProjectName(parsed, 'ignored');

    expect(resolved.projectName).toBe('Smoke Relative App');
    expect(resolved.createExpoStackArgs).toEqual(['Smoke Relative App', '--expo-router', '--no-install']);
    expect(resolved.mds.appName).toBe('Smoke Relative App');
    expect(resolved.mds.projectParentDir).toBeDefined();
  });

  it('uses an explicit MDS app name instead of the project folder name', () => {
    const parsed = parseArgs(['folder-name', '--mds-app-name=Display Name']);
    const resolved = withResolvedProjectName(parsed, 'ignored');

    expect(resolved.projectName).toBe('folder-name');
    expect(resolved.mds.appName).toBe('Display Name');
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

  it('parses every onboarding mds flag the agentic prompt sends', () => {
    const parsed = parseArgs([
      'demo-app',
      '--mds-platforms=web,ios,android-tv',
      '--mds-first-platform=ios',
      '--mds-platform-strategy=folders',
      '--mds-app-directory=src',
      '--mds-platform-layouts=platform-specific',
      '--mds-web-output=server',
      '--mds-deployed-server=standard-expo',
      '--mds-no-create-expo-components',
      '--mds-latest-expo-sdk',
      '--mds-no-expo-ui',
      '--mds-expo-native-tabs',
      '--mds-eas-uses=building mobile applications,publishing mobile applications',
    ]);

    expect(parsed.mds.platforms).toEqual(['web', 'ios', 'android-tv']);
    expect(parsed.mds.firstPlatform).toBe('ios');
    expect(parsed.mds.platformStrategy).toBe('folders');
    expect(parsed.mds.appDirectory).toBe('src');
    expect(parsed.mds.platformLayouts).toBe('platform-specific');
    expect(parsed.mds.webOutput).toBe('server');
    expect(parsed.mds.deployedServer).toBe('standard-expo');
    expect(parsed.mds.createExpoComponents).toBe(false);
    expect(parsed.mds.latestExpoSdk).toBe(true);
    expect(parsed.mds.expoUi).toBe(false);
    expect(parsed.mds.expoNativeTabs).toBe(true);
    expect(parsed.mds.easUses).toEqual([
      'building mobile applications',
      'publishing mobile applications',
    ]);
    // None of these mds-only flags should leak into the create-expo-stack args.
    expect(parsed.createExpoStackArgs).toEqual(['demo-app']);
  });

  it('rejects malformed enum values for the new mds flags instead of forwarding garbage', () => {
    const parsed = parseArgs([
      'demo-app',
      '--mds-platform-strategy=other',
      '--mds-app-directory=sideways',
      '--mds-platform-layouts=solo',
      '--mds-web-output=foo',
      '--mds-deployed-server=bar',
    ]);

    expect(parsed.mds.platformStrategy).toBeUndefined();
    expect(parsed.mds.appDirectory).toBeUndefined();
    expect(parsed.mds.platformLayouts).toBeUndefined();
    expect(parsed.mds.webOutput).toBeUndefined();
    expect(parsed.mds.deployedServer).toBeUndefined();
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
