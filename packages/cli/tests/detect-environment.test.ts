import { describe, expect, it } from 'vitest';

import { detectEnvironment, isExpoMcpOnboardingEnabled } from '../src/detect-environment.js';

describe('detectEnvironment', () => {
  it('reports a fully provisioned environment when toolchains and package managers are available', async () => {
    const report = await detectEnvironment('/tmp/demo-app', {
      desiredPlatforms: ['web', 'ios', 'android'],
      trigger: 'flag',
      platform: 'darwin',
      env: {
        EXPO_UNSTABLE_MCP_SERVER: '1',
        ANDROID_HOME: '/android',
      },
      fileExists: async (filePath) => filePath.endsWith('.env.local'),
      readTextFile: async (filePath) =>
        filePath.endsWith('package.json')
          ? JSON.stringify({
              dependencies: {
                expo: '~56.0.19',
              },
              devDependencies: {
                'expo-mcp': '^0.3.0',
              },
            })
          : null,
      runCommand: async (command, args) => {
        const key = `${command} ${args.join(' ')}`;
        switch (key) {
          case `${process.execPath} --version`:
            return 'v22.3.0';
          case 'npm --version':
            return '10.8.2';
          case 'pnpm --version':
            return '9.15.0';
          case 'yarn --version':
            return '4.5.1';
          case 'bun --version':
            return '1.1.24';
          case 'xcodebuild -version':
            return 'Xcode 16.0';
          case 'xcrun simctl list devices booted':
            return 'iPhone 16 Pro (booted)';
          case 'adb version':
            return 'Android Debug Bridge version 1.0.41';
          case 'emulator -list-avds':
            return 'Pixel_9_API_35';
          default:
            return null;
        }
      },
    });

    expect(report.expoMcp.packageInstalled).toBe(true);
    expect(report.expoMcp.localCapabilitiesConfigured).toBe(true);
    expect(report.expoSdkVersion).toBe('56.0.19');
    expect(report.nodeVersion).toBe('22.3.0');
    expect(report.packageManagers.filter((manager) => manager.available)).toHaveLength(4);
    expect(report.ios.toolchainAvailable).toBe(true);
    expect(report.ios.simulatorAvailable).toBe(true);
    expect(report.android.toolchainAvailable).toBe(true);
    expect(report.android.simulatorAvailable).toBe(true);
    expect(report.recommendedPlatforms).toEqual(['web', 'ios', 'android']);
    expect(report.envFiles).toEqual(['.env.local']);
  });

  it('reduces recommended platforms on Windows-friendly partial environments', async () => {
    const report = await detectEnvironment('/tmp/demo-app', {
      desiredPlatforms: ['web', 'ios', 'android'],
      trigger: 'env',
      platform: 'win32',
      env: {},
      fileExists: async () => false,
      readTextFile: async (filePath) =>
        filePath.endsWith('package.json')
          ? JSON.stringify({
              dependencies: {
                expo: '~56.0.19',
              },
            })
          : null,
      runCommand: async (command, args) => {
        const key = `${command} ${args.join(' ')}`;
        if (key === `${process.execPath} --version`) return 'v22.3.0';
        if (key === 'npm --version') return '10.8.2';
        if (key === 'adb version') return 'Android Debug Bridge version 1.0.41';
        return null;
      },
    });

    expect(report.expoMcp.packageInstalled).toBe(false);
    expect(report.recommendedPlatforms).toEqual(['web', 'android']);
    expect(report.skippedPlatforms).toEqual(['ios']);
    expect(report.warningLines).toContain(
      'Xcode was not detected, so local iOS builds are not currently available.'
    );
    expect(report.warningLines).toContain('No .env files were detected in the project root.');
  });

  it('handles missing Expo MCP package and conflicting package manager availability gracefully', async () => {
    const report = await detectEnvironment('/tmp/demo-app', {
      desiredPlatforms: ['android'],
      fileExists: async () => false,
      readTextFile: async () => JSON.stringify({ dependencies: {} }),
      runCommand: async (command, args) => {
        const key = `${command} ${args.join(' ')}`;
        if (key === 'npm --version') return '10.8.2';
        if (key === 'pnpm --version') return '9.15.0';
        return null;
      },
    });

    expect(report.packageManagers.find((manager) => manager.name === 'npm')?.available).toBe(true);
    expect(report.packageManagers.find((manager) => manager.name === 'pnpm')?.available).toBe(true);
    expect(report.packageManagers.find((manager) => manager.name === 'yarn')?.available).toBe(false);
    expect(report.expoMcp.packageInstalled).toBe(false);
    expect(report.warningLines.some((line) => line.includes('expo-mcp is not installed yet'))).toBe(true);
  });
});

describe('isExpoMcpOnboardingEnabled', () => {
  it('prefers the explicit flag over the environment variable and falls back to EXPO_MCP_ONBOARDING=true', () => {
    expect(isExpoMcpOnboardingEnabled(true, {})).toEqual({ enabled: true, trigger: 'flag' });
    expect(isExpoMcpOnboardingEnabled(undefined, { EXPO_MCP_ONBOARDING: 'true' })).toEqual({
      enabled: true,
      trigger: 'env',
    });
    expect(isExpoMcpOnboardingEnabled(undefined, {})).toEqual({ enabled: false });
  });
});
