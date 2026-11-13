/**
 * Canonical framework registry and pinned template definitions.
 *
 * Exact is the default framework for new projects.
 * Expo React Native remains supported via backward-compatible adapters.
 */

import type {
  FrameworkDescriptor,
  FrameworkDetectionResult,
  FrameworkId,
  FrameworkTemplate,
} from './types.js';

export const DEFAULT_FRAMEWORK_ID: FrameworkId = 'exact';

/**
 * Pinned immutable upstream git revisions for reproducible generation.
 */
export const UPSTREAM_REVISIONS = {
  EXACT_MAIN: {
    repository: 'https://github.com/expo/exact.git',
    branch: 'main',
    commit: '9398d982e02a6ba08e4c78d0db27624c3153c1c6',
  },
  EXACT_TEMPLATES_MAIN: {
    repository: 'https://github.com/expo/exact-templates.git',
    branch: 'main',
    commit: '041917c8e1c9c2c076232a8011f0d5f40601ca01',
  },
  CHAT_TEMPLATE: {
    repository: 'https://github.com/ide/exact2.git',
    branch: 'chat/messages-1123',
    commit: 'ad181418b37d5452a0c0e35f15bf6d3f45f4a212',
  },
  LANDSCAPES_TEMPLATE: {
    repository: 'https://github.com/ide/exact2.git',
    branch: 'duo/series-rebase',
    commit: 'f9744dd955216db749ba48feee27b92bbd39ddd0',
  },
  SOFTWEAR_TEMPLATE: {
    repository: 'https://github.com/expo/exact',
    branch: 'main',
    commit: '1cbce180d4256414368de13d39d5e3ff01292f1c',
  },
} as const;

export const EXACT_FRAMEWORK_DESCRIPTOR: FrameworkDescriptor = {
  knowledgeResources: ['mds://guides/jenny-project-creation', 'mds://guides/framework-exact'],
  id: 'exact',
  displayName: 'Exact',
  description:
    'Write an app once in Contract with TypeScript or Rust data logic; runs natively on web, macOS, iOS, and Linux.',
  maturity: 'preview',
  homepage: 'https://github.com/expo/exact',
  repository: 'https://github.com/expo/exact.git',
  defaultLanguage: 'contract',
  supportedLanguages: ['contract', 'typescript', 'rust'],
  supportedPlatforms: ['web', 'macos', 'ios', 'linux', 'windows'],
  experimentalPlatforms: ['android'],
  defaultActionLabel: 'Generate new Exact project',
  isDefault: true,
  requiredTools: [
    {
      name: 'Bun',
      binary: 'bun',
      description: 'JavaScript & toolchain runner (minimum 1.4.2; pinned upstream packageManager bun@1.4.2)',
      homepage: 'https://bun.sh',
      installCommand: 'curl -fsSL https://bun.sh/install | bash',
    },
    {
      name: 'Rust & Cargo',
      binary: 'cargo',
      description:
        'Required for the Contract compiler and web/native builds; run official setup --check.',
      homepage: 'https://rustup.rs',
      installCommand: 'https://rustup.rs',
    },
    {
      name: 'Google Chrome',
      binary: 'chrome',
      description: 'Used as parity oracle and automated agent test driver for web loop',
      optional: true,
      homepage: 'https://www.google.com/chrome/',
    },
  ],
  buildRunCapabilities: {
    webDevServer: 'bun exact.mjs web',
    webTest: 'bun exact.mjs test web',
    nativeRun: 'bun exact.mjs run',
    verifyCommand: 'bun exact.mjs verify',
    contractBuildCommand: 'bun exact.mjs contract build app.contract --json --errors-only',
    diagnosticsTool: 'contract build',
    prohibitsExpoDoctor: true,
  },
  detectionSignals: {
    requiredAny: ['app.contract', 'exact.mjs', 'exact.json'],
    exactFiles: ['app.contract', 'exact.mjs', 'app.test.contract'],
  },
};

export const EXPO_FRAMEWORK_DESCRIPTOR: FrameworkDescriptor = {
  knowledgeResources: ['mds://guides/jenny-project-creation', 'mds://guides/framework-expo-react-native'],
  id: 'expo-react-native',
  displayName: 'Expo React Native',
  description:
    'Universal React Native applications with Expo Router, Uniwind styling, and MDS project onboarding.',
  maturity: 'stable',
  homepage: 'https://docs.expo.dev',
  repository: 'https://github.com/expo/expo.git',
  defaultLanguage: 'typescript',
  supportedLanguages: ['typescript'],
  supportedPlatforms: ['ios', 'android', 'web'],
  experimentalPlatforms: [],
  defaultActionLabel: 'Generate new Expo project',
  isDefault: false,
  requiredTools: [
    {
      name: 'Node.js',
      binary: 'node',
      description: 'Runtime environment (>= 18.0.0)',
      homepage: 'https://nodejs.org',
    },
    {
      name: 'pnpm / npm',
      binary: 'pnpm',
      description: 'Package manager for installing dependencies',
      homepage: 'https://pnpm.io',
    },
  ],
  buildRunCapabilities: {
    webDevServer: 'mds clear-expo-start',
    webTest: 'pnpm test',
    nativeRun: 'npx expo run:ios',
    verifyCommand: 'mds doctor --ci',
    diagnosticsTool: 'mds doctor',
    prohibitsExpoDoctor: false,
  },
  detectionSignals: {
    requiredAny: ['app.json', 'package.json'],
    expoFiles: ['app.json', 'expo-env.d.ts', 'app/_layout.tsx', 'src/app/_layout.tsx'],
  },
};

export const EXACT_TEMPLATES: readonly FrameworkTemplate[] = [
  {
    id: 'blank',
    frameworkId: 'exact',
    name: 'Blank Starter',
    description: 'Clean single-screen Exact app starter with view, state, and automated tests.',
    keywords: ['starter', 'blank', 'minimal', 'contract', 'typescript', 'one-screen'],
    verifiedHosts: [],
    pinnedRevision: UPSTREAM_REVISIONS.EXACT_MAIN,
    upstreamSource: 'https://github.com/expo/exact',
    category: 'starter',
    notes: 'Provides minimal app.contract, app.ts data seam, and app.test.contract.',
  },
  {
    id: 'chat',
    frameworkId: 'exact',
    name: 'Chat',
    description:
      'Messenger with conversation list, transcript, auto-following keyboard composer, and local persistence.',
    keywords: [
      'chat',
      'messaging',
      'messenger',
      'conversation',
      'inbox',
      'transcript',
      'bubbles',
      'composer',
      'keyboard',
      'local persistence',
    ],
    verifiedHosts: ['web', 'ios 27'],
    pinnedRevision: UPSTREAM_REVISIONS.CHAT_TEMPLATE,
    upstreamSource: 'https://github.com/expo/exact-templates/tree/main/chat',
    category: 'official',
    notes: 'Built on Exact revision ad181418b3. Includes conversation store and transcript views.',
  },
  {
    id: 'landscapes',
    frameworkId: 'exact',
    name: 'Landscapes',
    description:
      'Gallery of landmarks ported from Apple sample: sidebar, map, collections, and inspect sheet.',
    keywords: [
      'landmarks',
      'places',
      'travel',
      'gallery',
      'photos',
      'featured hero',
      'map',
      'collections',
      'favorites',
      'sidebar',
      'split view',
    ],
    verifiedHosts: ['iOS 27.1 iPhone Duo'],
    pinnedRevision: UPSTREAM_REVISIONS.LANDSCAPES_TEMPLATE,
    upstreamSource: 'https://github.com/expo/exact-templates/tree/main/landscapes',
    category: 'official',
    notes: 'Requires scripts/fetch-images.sh before build. Built on Exact revision f9744dd955.',
  },
  {
    id: 'softwear',
    frameworkId: 'exact',
    name: 'Softwear',
    description:
      'Demonstration clothing store with searchable catalogue, product photos, bag, and REST demo API.',
    keywords: [
      'store',
      'shop',
      'shopping',
      'ecommerce',
      'clothing',
      'apparel',
      'catalogue',
      'catalog',
      'product',
      'inventory',
      'cart',
      'checkout',
    ],
    verifiedHosts: ['web (28 UI tests passing)'],
    pinnedRevision: UPSTREAM_REVISIONS.SOFTWEAR_TEMPLATE,
    upstreamSource: 'https://github.com/expo/exact-templates/tree/main/softwear',
    category: 'official',
    notes: 'Built on Exact revision 1cbce180d4. Includes SQLite demo backend and responsive web tabs.',
  },
];

const FRAMEWORK_CATALOG: ReadonlyMap<string, FrameworkDescriptor> = new Map([
  ['exact', EXACT_FRAMEWORK_DESCRIPTOR],
  ['expo-react-native', EXPO_FRAMEWORK_DESCRIPTOR],
]);

export function getFrameworkDescriptor(id: string): FrameworkDescriptor | undefined {
  return FRAMEWORK_CATALOG.get(id);
}

export function listFrameworkDescriptors(): readonly FrameworkDescriptor[] {
  return [EXACT_FRAMEWORK_DESCRIPTOR, EXPO_FRAMEWORK_DESCRIPTOR];
}

export function getDefaultFrameworkDescriptor(): FrameworkDescriptor {
  return EXACT_FRAMEWORK_DESCRIPTOR;
}

export function listFrameworkTemplates(frameworkId?: FrameworkId): readonly FrameworkTemplate[] {
  if (!frameworkId || frameworkId === 'exact') {
    return EXACT_TEMPLATES;
  }
  return [];
}

export function getFrameworkTemplate(
  templateId: string,
  frameworkId: FrameworkId = 'exact'
): FrameworkTemplate | undefined {
  return listFrameworkTemplates(frameworkId).find((t) => t.id === templateId);
}

export function getActionLabelForFramework(frameworkId: FrameworkId): string {
  const descriptor = getFrameworkDescriptor(frameworkId);
  return descriptor?.defaultActionLabel ?? `Generate new ${frameworkId} project`;
}

/**
 * Browser-safe framework detection from a list of relative file paths in a project inventory.
 */
export function detectFrameworkFromInventory(files: readonly string[]): FrameworkDetectionResult {
  const fileSet = new Set(files.map((f) => f.replace(/\\/g, '/').toLowerCase()));

  const hasContract = Array.from(fileSet).some((f) => f.endsWith('.contract'));
  const hasExactMjs = fileSet.has('exact.mjs');
  const hasExactJson = fileSet.has('exact.json');
  const hasAppContract = fileSet.has('app.contract');

  const exactSignals = [hasAppContract, hasExactMjs, hasExactJson].filter(Boolean).length;
  if ((hasAppContract && hasExactMjs) || (hasContract && hasExactMjs && hasExactJson)) {
    return { frameworkId: 'exact', confidence: 'high', matchedSignals: ['app.contract', 'exact.mjs', 'exact.json'].filter(f => fileSet.has(f)) };
  }
  if (exactSignals) return { frameworkId: 'exact', confidence: 'low', matchedSignals: ['app.contract', 'exact.mjs', 'exact.json'].filter(f => fileSet.has(f)), ambiguityNote: 'Insufficient corroborating Exact signals.' };

  const hasAppJson = fileSet.has('app.json');
  const hasPackageJson = fileSet.has('package.json');
  const hasExpoEnv = fileSet.has('expo-env.d.ts');
  const hasExpoRouter = Array.from(fileSet).some((f) => f.includes('app/_layout.tsx') || f.includes('app/_layout.js'));

  if (hasExpoEnv || hasExpoRouter) {
    return {
      frameworkId: 'expo-react-native',
      confidence: 'high',
      matchedSignals: ['expo-env.d.ts', 'expo-router'],
    };
  }

  if (hasAppJson && hasPackageJson) {
    return {
      frameworkId: 'expo-react-native',
      confidence: 'medium',
      matchedSignals: ['app.json', 'package.json'],
      ambiguityNote: 'Found app.json and package.json; verify Expo dependencies.',
    };
  }

  return {
    frameworkId: 'unknown',
    confidence: 'none',
    matchedSignals: [],
  };
}
