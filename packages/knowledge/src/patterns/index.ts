export type PatternCategory =
  | 'routing'
  | 'api'
  | 'styling'
  | 'state'
  | 'database'
  | 'deployment'
  | 'project'
  | 'automation';

export interface PatternMetadata {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  sourceRepos: string[];
  resourcePath?: string;
  keywords: string[];
}

export const PATTERN_METADATA = [
  {
    id: 'routing-file-based-routing',
    name: 'Expo Router File-Based Routing',
    description: 'Route files, layouts, groups, typed params, and route shell boundaries.',
    category: 'routing',
    sourceRepos: ['time2pay', 'DJsPortfolio', 'PokePages', 'not-hot-dog'],
    resourcePath: 'routing/file-based-routing.md',
    keywords: ['expo-router', 'routes', 'layouts', 'src/app'],
  },
  {
    id: 'api-routes-validation',
    name: 'Expo API Routes with Validation',
    description: 'Route handlers, Zod validation, auth guards, proxy routes, and error envelopes.',
    category: 'api',
    sourceRepos: ['time2pay', 'DJsPortfolio', 'quantum-api'],
    resourcePath: 'api/api-routes.md',
    keywords: ['api routes', 'zod', 'auth', 'proxy'],
  },
  {
    id: 'styling-uniwind-tailwind-v4',
    name: 'Uniwind and Tailwind v4',
    description: 'Uniwind setup, global.css tokens, Metro configuration, and responsive class usage.',
    category: 'styling',
    sourceRepos: ['time2pay', 'DJsPortfolio', 'expo-super-template'],
    resourcePath: 'styling/uniwind-setup.md',
    keywords: ['uniwind', 'tailwind v4', 'global.css', 'metro'],
  },
  {
    id: 'state-zustand-stores',
    name: 'Zustand Stores',
    description: 'Feature stores, selector hooks, persistence adapters, and SSR-safe storage.',
    category: 'state',
    sourceRepos: ['time2pay', 'core-monorepo', 'expo-super-template'],
    resourcePath: 'state/zustand-patterns.md',
    keywords: ['zustand', 'selectors', 'persistence', 'storage'],
  },
  {
    id: 'database-drizzle-supabase',
    name: 'Drizzle and Supabase Data Layer',
    description: 'Domain schema files, migrations, RLS notes, query modules, and pooler-safe config.',
    category: 'database',
    sourceRepos: ['time2pay', 'PokePages', 'core-monorepo'],
    resourcePath: 'database/drizzle-schema.md',
    keywords: ['drizzle', 'supabase', 'rls', 'migrations'],
  },
  {
    id: 'deployment-ci-equivalent-checks',
    name: 'CI-Equivalent Local Checks',
    description: 'Local pre-push checks mirroring lint, typecheck, tests, Expo Doctor, and builds.',
    category: 'deployment',
    sourceRepos: ['time2pay', 'core-monorepo', 'mercury-bank-sdk', 'quantum-api'],
    resourcePath: 'deployment/ci-cd-patterns.md',
    keywords: ['ci', 'pre-push', 'expo doctor', 'build'],
  },
  {
    id: 'project-memory-folder',
    name: 'Project Memory Folder',
    description: 'project/info.md, project/todo.md, and project/style.md as agent-readable context.',
    category: 'project',
    sourceRepos: ['time2pay', 'DJsPortfolio', 'core-monorepo', 'mrdj-app-mcp'],
    resourcePath: 'project/documentation-org.md',
    keywords: ['project folder', 'info.md', 'todo.md', 'style.md'],
  },
  {
    id: 'automation-ship-to-test',
    name: 'Ship to Test Workflow',
    description: 'Run local checks, push a branch, open/update a PR, poll CI, fix failures, and merge to test.',
    category: 'automation',
    sourceRepos: ['time2pay', 'DJsPortfolio'],
    keywords: ['gh', 'pr', 'test branch', 'ci polling'],
  },
  {
    id: 'automation-post-create-onboarding',
    name: 'Post-Create Expo Onboarding',
    description: 'Agent-led setup after rn-new/create-expo-app instead of competing with project generators.',
    category: 'automation',
    sourceRepos: ['expo-super-template', 'create-expo-stack'],
    keywords: ['rn-new', 'create-expo-stack', 'onboard', 'agent conversation'],
  },
] satisfies PatternMetadata[];

export function listPatternMetadata(category?: PatternCategory): PatternMetadata[] {
  if (!category) {
    return [...PATTERN_METADATA];
  }

  return PATTERN_METADATA.filter((pattern) => pattern.category === category);
}

export function getPatternMetadata(id: string): PatternMetadata | null {
  return PATTERN_METADATA.find((pattern) => pattern.id === id) ?? null;
}
