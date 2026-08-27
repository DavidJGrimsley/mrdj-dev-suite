import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  applySdk56SplashConfig,
  ensureGeneratedSystemAppearance,
  renderInfo,
  renderGeneratedOnboardingConfig,
  resolveGeneratorStylingSystem,
  SDK_56_SPLASH_DARK_IMAGE,
  SDK_56_SPLASH_LIGHT_IMAGE,
} from '../src/project-memory.js';

import type { OnboardAnswers } from '../src/project-memory.js';

const onboardingTemplateUrl = new URL(
  '../../library-registry/assets/mds/src/features/onboarding/onboarding-config.ts',
  import.meta.url
);

const answers: OnboardAnswers = {
  appName: 'Sample App',
  audience: 'Sample users',
  coreFlows: 'Open the app',
  dataNeeds: 'Local UI/app state',
  deploymentTarget: 'Internal demo',
  advancedPackageSetup: true,
  includeCreateExpoComponents: false,
  targetPlatforms: ['web'],
  firstTargetPlatform: 'web',
  platformFileStrategy: 'files-only',
  webOutput: 'static',
  deployedServer: 'none',
  expoServerAdapter: 'none',
  customBackend: false,
  customBackendEntry: 'server.js',
  usesExpoUi: false,
  usesExpoUiUniversalComponents: false,
  usesExpoNativeTabs: false,
  easUses: [],
  projectInfoReady: false,
  projectStyleReady: false,
  appDirectory: 'src',
  platformLayoutMode: 'shared',
  dataStart: 'local',
  onboardingFlow: 'multi-screen',
  legalDocumentMode: 'none',
  onboardingCompletionMode: 'auth',
  legalUpdateGate: 'none',
  testToMainSafeguards: true,
  defaults: [],
};

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

function normalizeLineEndings(source: string, lineEnding: '\n' | '\r\n'): string {
  return source.replace(/\r?\n/gu, lineEnding);
}

function expectedCompletionBlock(lineEnding: '\n' | '\r\n'): string {
  const completion = {
    mode: 'auth',
    route: '/',
    label: 'Continue to app',
    helperText:
      'Auth handoff selected. Signed-out users are routed to sign in by the protected app layout.',
  };

  return [
    '  completion: {',
    `    mode: '${completion.mode}',`,
    `    route: '${completion.route}' as Href,`,
    `    label: ${JSON.stringify(completion.label)},`,
    `    helperText: ${JSON.stringify(completion.helperText)},`,
    '  },',
  ].join(lineEnding);
}

describe('renderGeneratedOnboardingConfig', () => {
  it.each([
    { name: 'LF', lineEnding: '\n' as const },
    { name: 'CRLF', lineEnding: '\r\n' as const },
  ])('rewrites the onboarding completion block for $name input', async ({ lineEnding }) => {
    const template = await readFile(onboardingTemplateUrl, 'utf8');
    const source = normalizeLineEndings(template, lineEnding);
    const rendered = renderGeneratedOnboardingConfig(source, answers);

    expect(rendered).toContain(expectedCompletionBlock(lineEnding));
    expect(rendered).toContain("mode: 'auth'");
    expect(rendered).not.toContain("mode: 'enter-app'");
    expect(rendered.includes('\r\n')).toBe(lineEnding === '\r\n');
  });
});

describe('resolveGeneratorStylingSystem', () => {
  it('prefers this run\'s generatorStylingSystem over stale defaults', () => {
    expect(
      resolveGeneratorStylingSystem({
        generatorStylingSystem: 'stylesheet',
        defaults: ['project-docs', 'uniwind', 'nativewindui'],
      })
    ).toBe('stylesheet');
  });

  it('falls back to a nativewindui default when the current run did not set a system', () => {
    expect(
      resolveGeneratorStylingSystem({
        defaults: ['project-docs', 'guidelines', 'nativewindui'],
      })
    ).toBe('nativewindui');
  });

  it('falls back to Uniwind when MDS is managing Uniwind and no system is selected', () => {
    expect(
      resolveGeneratorStylingSystem(
        { defaults: ['project-docs', 'guidelines', 'doctor'] },
        { manageUniwind: true }
      )
    ).toBe('uniwind');
  });

  it('returns stylesheet when nothing selected the current run as a styling library', () => {
    expect(
      resolveGeneratorStylingSystem({
        defaults: ['project-docs', 'guidelines', 'doctor'],
      })
    ).toBe('stylesheet');
  });
});

describe('renderInfo project shape', () => {
  it('renders single Expo app defaults', () => {
    const rendered = renderInfo('/tmp/app', {
      ...answers,
      defaults: [],
    } as OnboardAnswers);

    expect(rendered).toContain('- Project shape: single Expo app');
  });
});

describe('ensureGeneratedSystemAppearance', () => {
  it('adds create-expo-app SDK 56 light and dark splash config and assets', async () => {
    const projectPath = await mkdtemp(path.join(os.tmpdir(), 'mds-splash-config-'));
    tempDirs.push(projectPath);
    await writeFile(
      path.join(projectPath, 'app.json'),
      JSON.stringify({
        expo: {
          name: 'Appearance App',
          slug: 'appearance-app',
          userInterfaceStyle: 'light',
          splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
          },
          plugins: ['expo-router'],
        },
      }),
      'utf8'
    );

    const results = await ensureGeneratedSystemAppearance(projectPath);
    expect(results.some((result) => result.wrote)).toBe(true);

    const appJson = JSON.parse(await readFile(path.join(projectPath, 'app.json'), 'utf8')) as {
      expo: {
        userInterfaceStyle: string;
        splash?: unknown;
        plugins: unknown[];
      };
    };
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
    expect(appJson.expo.splash).toBeUndefined();
    expect(appJson.expo.plugins).toContainEqual([
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: SDK_56_SPLASH_LIGHT_IMAGE,
        dark: {
          image: SDK_56_SPLASH_DARK_IMAGE,
          backgroundColor: '#000000',
        },
        imageWidth: 200,
      },
    ]);

    const lightSplash = await readFile(path.join(projectPath, 'assets', 'images', 'splash-icon.png'));
    const darkSplash = await readFile(
      path.join(projectPath, 'assets', 'images', 'splash-icon-dark.png')
    );
    expect(lightSplash.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    expect(darkSplash.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  });

  it('fills missing dark splash fields without replacing an existing light image', () => {
    const expo: Record<string, unknown> = {
      userInterfaceStyle: 'automatic',
      plugins: [
        [
          'expo-splash-screen',
          {
            backgroundColor: '#208AEF',
            image: './assets/images/custom-splash.png',
            imageWidth: 76,
          },
        ],
      ],
    };

    expect(applySdk56SplashConfig(expo)).toBe(true);
    expect(expo.plugins).toEqual([
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/custom-splash.png',
          imageWidth: 76,
          dark: {
            image: SDK_56_SPLASH_DARK_IMAGE,
            backgroundColor: '#000000',
          },
        },
      ],
    ]);
  });
});
