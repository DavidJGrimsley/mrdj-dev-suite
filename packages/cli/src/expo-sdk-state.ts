export const OFFICIAL_EXPO_UPGRADE_SKILL = 'upgrading-expo' as const;
export const EXPO_VERSIONS_URL = 'https://exp.host/--/api/v2/versions';
export const EXPO_VERSIONS_FETCH_TIMEOUT_MS = 2500;

export type ExpoSdkStatus =
  | 'behind'
  | 'in-progress'
  | 'current'
  | 'preview-only'
  | 'unavailable'
  | 'unknown';

export interface PackageJsonDependencies {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ProjectExpoSdkState {
  hasExpo: boolean;
  detectedMajor: number | null;
  expoRange: string | null;
  reactNativeRange: string | null;
}

export interface ExpoVersionsCatalog {
  latestStableMajor: number | null;
  latestPublishedMajor: number | null;
  latestPublishedIsPreview: boolean;
  reactNativeBySdkMajor: Record<number, string>;
}

export interface ExpoSdkSnapshot {
  detectedMajor: number | null;
  latestStableMajor: number | null;
  status: ExpoSdkStatus;
  evidence: string[];
  officialSkill: typeof OFFICIAL_EXPO_UPGRADE_SKILL;
}

export function parseVersionMajor(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (
    trimmed.length === 0 ||
    trimmed === 'latest' ||
    trimmed === 'next' ||
    trimmed.startsWith('catalog:') ||
    trimmed.startsWith('workspace:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('link:') ||
    trimmed.startsWith('git') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return null;
  }

  const match = /(\d+)\.\d+(?:\.\d+)?/.exec(trimmed) ?? /^[~^>=<\s]*(\d+)$/.exec(trimmed);
  if (!match?.[1]) {
    return null;
  }

  const major = Number(match[1]);
  return Number.isInteger(major) ? major : null;
}

export function parseReactNativeVersion(
  raw: string | undefined
): { major: number; minor: number; patch: number } | null {
  if (!raw) {
    return null;
  }

  const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(raw);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
  };
}

export function reactNativeMatchesExpected(
  declared: string | undefined,
  expected: string | undefined
): boolean {
  const declaredVersion = parseReactNativeVersion(declared);
  const expectedVersion = parseReactNativeVersion(expected);
  if (!declaredVersion || !expectedVersion) {
    return true;
  }

  return declaredVersion.major === expectedVersion.major && declaredVersion.minor === expectedVersion.minor;
}

export function detectProjectExpoSdk(packageJson: PackageJsonDependencies | null): ProjectExpoSdkState {
  const deps = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const expoRange = deps.expo ?? null;
  const detectedMajor = parseVersionMajor(expoRange ?? undefined);
  return {
    hasExpo: typeof expoRange === 'string' && expoRange.length > 0,
    detectedMajor,
    expoRange,
    reactNativeRange: deps['react-native'] ?? null,
  };
}

export function parseExpoVersionsCatalog(raw: unknown): ExpoVersionsCatalog | null {
  if (!isRecord(raw) || !isRecord(raw.sdkVersions)) {
    return null;
  }

  const reactNativeBySdkMajor: Record<number, string> = {};
  const published: Array<{ major: number; preview: boolean }> = [];

  for (const [sdkKey, entry] of Object.entries(raw.sdkVersions)) {
    const major = parseVersionMajor(sdkKey);
    if (major == null || !isRecord(entry)) {
      continue;
    }

    const expoVersion = typeof entry.expoVersion === 'string' ? entry.expoVersion : undefined;
    const preview = isPreviewExpoVersion(expoVersion);
    published.push({ major, preview });

    const reactNative =
      typeof entry.facebookReactNativeVersion === 'string'
        ? entry.facebookReactNativeVersion
        : isRecord(entry.relatedPackages) && typeof entry.relatedPackages['react-native'] === 'string'
          ? entry.relatedPackages['react-native']
          : undefined;
    if (reactNative) {
      reactNativeBySdkMajor[major] = reactNative;
    }
  }

  if (published.length === 0) {
    return null;
  }

  const latestPublishedMajor = Math.max(...published.map((item) => item.major));
  const stableMajors = published.filter((item) => !item.preview).map((item) => item.major);
  const latestStableMajor = stableMajors.length > 0 ? Math.max(...stableMajors) : null;
  const latestPublishedIsPreview = published.some(
    (item) => item.major === latestPublishedMajor && item.preview
  );

  return {
    latestStableMajor,
    latestPublishedMajor,
    latestPublishedIsPreview,
    reactNativeBySdkMajor,
  };
}

export function classifyExpoSdkUpgrade(
  project: ProjectExpoSdkState,
  catalog: ExpoVersionsCatalog | null
): ExpoSdkSnapshot {
  const latestStableMajor = catalog?.latestStableMajor ?? null;
  const base = {
    detectedMajor: project.detectedMajor,
    latestStableMajor,
    officialSkill: OFFICIAL_EXPO_UPGRADE_SKILL,
  };

  if (!project.hasExpo) {
    return {
      ...base,
      detectedMajor: null,
      status: 'unknown',
      evidence: ['No expo dependency declared in package.json.'],
    };
  }

  if (project.detectedMajor == null) {
    return {
      ...base,
      status: 'unknown',
      evidence: [
        project.expoRange
          ? `Declared expo version "${project.expoRange}" is not a parseable SDK range.`
          : 'Declared expo version is missing.',
      ],
    };
  }

  if (catalog == null || latestStableMajor == null) {
    return {
      ...base,
      status: 'unavailable',
      evidence: ['Official Expo SDK version catalog is unavailable.'],
    };
  }

  if (project.detectedMajor < latestStableMajor) {
    return {
      ...base,
      status: 'behind',
      evidence: [
        `Declared Expo SDK ${project.detectedMajor} is behind official latest stable SDK ${latestStableMajor}.`,
      ],
    };
  }

  if (project.detectedMajor === latestStableMajor) {
    const expectedReactNative = catalog.reactNativeBySdkMajor[latestStableMajor];
    if (expectedReactNative && !reactNativeMatchesExpected(project.reactNativeRange ?? undefined, expectedReactNative)) {
      return {
        ...base,
        status: 'in-progress',
        evidence: [
          `Expo SDK ${project.detectedMajor} is declared, but react-native ${project.reactNativeRange ?? 'is missing'} does not match official ${expectedReactNative}.`,
        ],
      };
    }

    if (
      catalog.latestPublishedIsPreview &&
      catalog.latestPublishedMajor != null &&
      catalog.latestPublishedMajor > latestStableMajor
    ) {
      return {
        ...base,
        status: 'preview-only',
        evidence: [
          `A newer Expo SDK ${catalog.latestPublishedMajor} is preview-only; staying on stable SDK ${latestStableMajor}.`,
        ],
      };
    }

    return {
      ...base,
      status: 'current',
      evidence: [`Declared Expo SDK ${project.detectedMajor} matches official latest stable SDK.`],
    };
  }

  return {
    ...base,
    status: 'current',
    evidence: [`Declared Expo SDK ${project.detectedMajor} is at or ahead of official latest stable SDK ${latestStableMajor}.`],
  };
}

export function isHighConfidenceUpgrade(snapshot: ExpoSdkSnapshot | null | undefined): boolean {
  return snapshot?.status === 'behind' || snapshot?.status === 'in-progress';
}

export function requiresExpoSdkAttention(snapshot: ExpoSdkSnapshot | null | undefined): boolean {
  return isHighConfidenceUpgrade(snapshot) || snapshot?.status === 'unavailable';
}

export async function fetchOfficialExpoVersions(
  fetchImpl: typeof fetch = fetch
): Promise<ExpoVersionsCatalog | null> {
  try {
    const response = await fetchImpl(EXPO_VERSIONS_URL, {
      signal: AbortSignal.timeout(EXPO_VERSIONS_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }

    return parseExpoVersionsCatalog(await response.json());
  } catch {
    return null;
  }
}

function isPreviewExpoVersion(expoVersion: string | undefined): boolean {
  return typeof expoVersion === 'string' && /-preview/i.test(expoVersion);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
