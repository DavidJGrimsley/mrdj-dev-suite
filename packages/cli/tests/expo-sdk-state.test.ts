import { describe, expect, it } from 'vitest';

import {
  classifyExpoSdkUpgrade,
  detectProjectExpoSdk,
  fetchOfficialExpoVersions,
  parseExpoVersionsCatalog,
  parseVersionMajor,
} from '../src/expo-sdk-state.js';

const CATALOG_PAYLOAD = {
  expoGoSdkVersion: '54.0.0',
  sdkVersions: {
    '55.0.0': {
      expoVersion: '~55.0.28',
      facebookReactNativeVersion: '0.83.10',
    },
    '56.0.0': {
      expoVersion: '~56.0.19',
      facebookReactNativeVersion: '0.85.3',
    },
    '57.0.0': {
      expoVersion: '~57.0.12',
      facebookReactNativeVersion: '0.86.2',
    },
    '58.0.0': {
      expoVersion: '58.0.0-preview.2',
      facebookReactNativeVersion: '0.87.0',
    },
  },
};

describe('parseVersionMajor', () => {
  it('parses Expo-style ranges', () => {
    expect(parseVersionMajor('~56.0.19')).toBe(56);
    expect(parseVersionMajor('^57.0.0')).toBe(57);
    expect(parseVersionMajor('56.0.19')).toBe(56);
  });

  it('ignores unparseable dist-tags and workspace protocol versions', () => {
    expect(parseVersionMajor('latest')).toBeNull();
    expect(parseVersionMajor('catalog:')).toBeNull();
    expect(parseVersionMajor('workspace:*')).toBeNull();
    expect(parseVersionMajor(undefined)).toBeNull();
  });
});

describe('parseExpoVersionsCatalog', () => {
  it('selects the highest non-preview SDK as latest stable', () => {
    const catalog = parseExpoVersionsCatalog(CATALOG_PAYLOAD);

    expect(catalog?.latestStableMajor).toBe(57);
    expect(catalog?.latestPublishedMajor).toBe(58);
    expect(catalog?.latestPublishedIsPreview).toBe(true);
    expect(catalog?.reactNativeBySdkMajor[57]).toBe('0.86.2');
  });

  it('ignores preview-only newest releases when choosing latest stable', () => {
    const catalog = parseExpoVersionsCatalog({
      sdkVersions: {
        '56.0.0': { expoVersion: '~56.0.19', facebookReactNativeVersion: '0.85.3' },
        '57.0.0': { expoVersion: '57.0.0-preview.2', facebookReactNativeVersion: '0.86.0' },
      },
    });

    expect(catalog?.latestStableMajor).toBe(56);
    expect(catalog?.latestPublishedIsPreview).toBe(true);
  });
});

describe('detectProjectExpoSdk', () => {
  it('reads the declared Expo SDK from the expo dependency only', () => {
    const project = detectProjectExpoSdk({
      dependencies: {
        expo: '~56.0.19',
        'expo-router': '~6.0.18',
        '@expo/vector-icons': '^15.0.2',
        'react-native': '0.85.3',
      },
    });

    expect(project.hasExpo).toBe(true);
    expect(project.detectedMajor).toBe(56);
    expect(project.reactNativeRange).toBe('0.85.3');
  });
});

describe('classifyExpoSdkUpgrade', () => {
  const catalog = parseExpoVersionsCatalog(CATALOG_PAYLOAD);

  it('classifies a lower declared major as behind', () => {
    const snapshot = classifyExpoSdkUpgrade(
      detectProjectExpoSdk({ dependencies: { expo: '~56.0.19', 'react-native': '0.85.3' } }),
      catalog
    );

    expect(snapshot.status).toBe('behind');
    expect(snapshot.detectedMajor).toBe(56);
    expect(snapshot.latestStableMajor).toBe(57);
    expect(snapshot.officialSkill).toBe('upgrading-expo');
  });

  it('classifies a matching major as current when no newer preview exists', () => {
    const currentCatalog = parseExpoVersionsCatalog({
      sdkVersions: {
        '56.0.0': { expoVersion: '~56.0.19', facebookReactNativeVersion: '0.85.3' },
        '57.0.0': { expoVersion: '~57.0.12', facebookReactNativeVersion: '0.86.2' },
      },
    });
    const snapshot = classifyExpoSdkUpgrade(
      detectProjectExpoSdk({ dependencies: { expo: '~57.0.12', 'react-native': '0.86.2' } }),
      currentCatalog
    );

    expect(snapshot.status).toBe('current');
  });

  it('does not infer SDK state from independently versioned Expo packages', () => {
    const snapshot = classifyExpoSdkUpgrade(
      detectProjectExpoSdk({
        dependencies: {
          expo: '~57.0.12',
          'expo-router': '~6.0.18',
          'react-native': '0.86.2',
        },
      }),
      catalog
    );

    expect(snapshot.status).toBe('current');
  });

  it('classifies latest expo with previous React Native as in-progress', () => {
    const snapshot = classifyExpoSdkUpgrade(
      detectProjectExpoSdk({ dependencies: { expo: '~57.0.12', 'react-native': '0.85.3' } }),
      catalog
    );

    expect(snapshot.status).toBe('in-progress');
    expect(snapshot.evidence.join('\n')).toContain('react-native');
  });

  it('does not recommend a preview-only newer SDK', () => {
    const previewCatalog = parseExpoVersionsCatalog({
      sdkVersions: {
        '56.0.0': { expoVersion: '~56.0.19', facebookReactNativeVersion: '0.85.3' },
        '57.0.0': { expoVersion: '57.0.0-preview.2', facebookReactNativeVersion: '0.86.0' },
      },
    });
    const snapshot = classifyExpoSdkUpgrade(
      detectProjectExpoSdk({ dependencies: { expo: '~56.0.19', 'react-native': '0.85.3' } }),
      previewCatalog
    );

    expect(snapshot.status).toBe('preview-only');
  });

  it('distinguishes missing Expo metadata from an unavailable official catalog', () => {
    expect(classifyExpoSdkUpgrade(detectProjectExpoSdk({ dependencies: {} }), catalog).status).toBe(
      'unknown'
    );
    expect(
      classifyExpoSdkUpgrade(detectProjectExpoSdk({ dependencies: { expo: '~56.0.19' } }), null).status
    ).toBe('unavailable');
    expect(
      classifyExpoSdkUpgrade(detectProjectExpoSdk({ dependencies: { expo: 'latest' } }), catalog).status
    ).toBe('unknown');
  });
});

describe('fetchOfficialExpoVersions', () => {
  it('returns null when the versions request fails', async () => {
    const catalog = await fetchOfficialExpoVersions(async () => {
      throw new Error('network down');
    });

    expect(catalog).toBeNull();
  });

  it('parses a successful versions response', async () => {
    const catalog = await fetchOfficialExpoVersions(
      async () =>
        new Response(JSON.stringify(CATALOG_PAYLOAD), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    );

    expect(catalog?.latestStableMajor).toBe(57);
  });
});
