export type PatternCategory =
  | 'routing'
  | 'api'
  | 'animation'
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
    sourceRepos: ['PokePages', 'not-hot-dog', 'DJsPortfolio', 'core-monorepo'],
    resourcePath: 'patterns/routing/file-based-routing.md',
    keywords: ['expo-router', 'routes', 'layouts', 'src/app'],
  },
  {
    id: 'routing-dynamic-routes',
    name: 'Dynamic Routes With Parameters',
    description: 'Dynamic segments, typed params, content-heavy hierarchies, and catch-all routes.',
    category: 'routing',
    sourceRepos: ['PokePages', 'not-hot-dog'],
    resourcePath: 'patterns/routing/dynamic-routes.md',
    keywords: ['dynamic routes', 'params', 'typed routes', 'catch-all'],
  },
  {
    id: 'routing-route-groups',
    name: 'Route Groups',
    description: 'Hidden segments, route grouping, guarded shells, and navigation organization.',
    category: 'routing',
    sourceRepos: ['core-monorepo', 'PokePages', 'DJsPortfolio'],
    resourcePath: 'patterns/routing/route-groups.md',
    keywords: ['route groups', 'navigation', 'auth', 'layout'],
  },
  {
    id: 'api-api-routes',
    name: 'Expo API Routes',
    description: 'Route handlers, catch-all proxy routes, request processing, and response shape.',
    category: 'api',
    sourceRepos: ['DJsPortfolio', 'PokePages', 'quantum-api'],
    resourcePath: 'patterns/api/api-routes.md',
    keywords: ['api routes', 'server', 'route handler', 'proxy'],
  },
  {
    id: 'api-error-handling',
    name: 'API Error Handling',
    description: 'Centralized API failures, validation, and typed error responses.',
    category: 'api',
    sourceRepos: ['DJsPortfolio', 'PokePages'],
    resourcePath: 'patterns/api/error-handling.md',
    keywords: ['error handling', 'validation', 'status codes', 'api'],
  },
  {
    id: 'animation-motion-selection',
    name: 'Motion Implementation Selection',
    description:
      'Choose between platform transitions, Reanimated, Lottie, and parallax/scroll-linked motion based on UX intent and performance budget.',
    category: 'animation',
    sourceRepos: ['time2pay', 'quantum-jam-2025-choose-your-own-adventure', 'Expo blog'],
    resourcePath: 'patterns/animation/animation-motion-selection.md',
    keywords: [
      'animation',
      'motion',
      'parallax',
      'scroll-linked',
      'reanimated',
      'lottie',
      'hero motion',
    ],
  },
  {
    id: 'styling-uniwind-setup',
    name: 'Uniwind And Tailwind v4',
    description: 'Uniwind setup, global.css tokens, Metro configuration, and responsive classes.',
    category: 'styling',
    sourceRepos: ['time2pay', 'DJsPortfolio', 'expo-super-template'],
    resourcePath: 'patterns/styling/uniwind-setup.md',
    keywords: ['uniwind', 'tailwind v4', 'global.css', 'metro'],
  },
  {
    id: 'styling-theme-configuration',
    name: 'Theme Configuration',
    description: 'Theme tokens, CSS variables, and light/dark mode setup.',
    category: 'styling',
    sourceRepos: ['DJsPortfolio', 'expo-super-template', 'PokePages'],
    resourcePath: 'patterns/styling/theme-configuration.md',
    keywords: ['theme', 'css variables', 'tokens', 'dark mode'],
  },
  {
    id: 'styling-responsive-patterns',
    name: 'Responsive Patterns',
    description: 'Breakpoint usage, adaptive layouts, and viewport-safe UI patterns.',
    category: 'styling',
    sourceRepos: ['expo-super-template', 'DJsPortfolio', 'PokePages'],
    resourcePath: 'patterns/styling/responsive-patterns.md',
    keywords: ['responsive', 'breakpoints', 'layout', 'adaptive'],
  },
  {
    id: 'styling-component-styling',
    name: 'Component Styling',
    description: 'Reusable component styles, variants, and class composition.',
    category: 'styling',
    sourceRepos: ['PokePages', 'DJsPortfolio', 'expo-super-template'],
    resourcePath: 'patterns/styling/component-styling.md',
    keywords: ['components', 'styling', 'variants', 'className'],
  },
  {
    id: 'state-zustand-patterns',
    name: 'Zustand Stores',
    description: 'Feature stores, selector hooks, persistence adapters, and SSR-safe storage.',
    category: 'state',
    sourceRepos: ['PokePages', 'core-monorepo', 'time2pay'],
    resourcePath: 'patterns/state/zustand-patterns.md',
    keywords: ['zustand', 'selectors', 'persistence', 'storage'],
  },
  {
    id: 'state-store-organization',
    name: 'Store Organization',
    description: 'Feature-based store structure and domain-oriented state grouping.',
    category: 'state',
    sourceRepos: ['core-monorepo', 'PokePages', 'DJsPortfolio'],
    resourcePath: 'patterns/state/store-organization.md',
    keywords: ['store organization', 'feature stores', 'domain state'],
  },
  {
    id: 'state-selector-hooks',
    name: 'Selector Hooks',
    description: 'Selector hook patterns that minimize rerenders and subscription scope.',
    category: 'state',
    sourceRepos: ['core-monorepo', 'PokePages', 'DJsPortfolio'],
    resourcePath: 'patterns/state/selector-hooks.md',
    keywords: ['selector hooks', 'rerenders', 'zustand', 'performance'],
  },
  {
    id: 'state-persistence-middleware',
    name: 'Persistence Middleware',
    description: 'Persisted stores, storage adapters, and selective rehydration patterns.',
    category: 'state',
    sourceRepos: ['core-monorepo', 'PokePages', 'DJsPortfolio'],
    resourcePath: 'patterns/state/persistence-middleware.md',
    keywords: ['persist', 'asyncstorage', 'rehydration', 'middleware'],
  },
  {
    id: 'database-drizzle-schema',
    name: 'Drizzle And Supabase Data Layer',
    description: 'Schema files, inferred types, RLS notes, migrations, and pooler-safe config.',
    category: 'database',
    sourceRepos: ['DJsPortfolio', 'PokePages', 'core-monorepo'],
    resourcePath: 'patterns/database/drizzle-schema.md',
    keywords: ['drizzle', 'supabase', 'rls', 'schema'],
  },
  {
    id: 'database-migrations',
    name: 'Drizzle Migrations',
    description: 'Schema migrations, generated SQL, and migration workflow patterns.',
    category: 'database',
    sourceRepos: ['PokePages', 'quantum-api'],
    resourcePath: 'patterns/database/migrations.md',
    keywords: ['migrations', 'drizzle-kit', 'schema changes', 'sql'],
  },
  {
    id: 'database-relations',
    name: 'Database Relations',
    description: 'Relations, joins, and relational modeling with Drizzle.',
    category: 'database',
    sourceRepos: ['core-monorepo', 'PokePages', 'quantum-api'],
    resourcePath: 'patterns/database/relations.md',
    keywords: ['relations', 'joins', 'foreign keys', 'drizzle'],
  },
  {
    id: 'database-query-organization',
    name: 'Query Organization',
    description: 'Query modules, service boundaries, and reusable data access patterns.',
    category: 'database',
    sourceRepos: ['core-monorepo', 'PokePages', 'quantum-api'],
    resourcePath: 'patterns/database/query-organization.md',
    keywords: ['queries', 'data access', 'services', 'organization'],
  },
  {
    id: 'deployment-build-configuration',
    name: 'Build Configuration',
    description: 'App build settings, export targets, and deployment-ready config.',
    category: 'deployment',
    sourceRepos: ['time2pay', 'core-monorepo', 'expo-super-template'],
    resourcePath: 'patterns/deployment/build-configuration.md',
    keywords: ['build', 'expo export', 'deployment', 'configuration'],
  },
  {
    id: 'deployment-ci-cd-patterns',
    name: 'CI-Equivalent Local Checks',
    description: 'Local and GitHub checks for lint, typecheck, tests, Expo Doctor, and builds.',
    category: 'deployment',
    sourceRepos: ['time2pay', 'core-monorepo', 'mercury-bank-sdk', 'quantum-api', 'ads-sdk'],
    resourcePath: 'patterns/deployment/ci-cd-patterns.md',
    keywords: ['ci', 'pre-push', 'expo doctor', 'build'],
  },
  {
    id: 'deployment-hosting-setup',
    name: 'Hosting Setup',
    description: 'Production hosting, reverse proxy, and runtime process management.',
    category: 'deployment',
    sourceRepos: ['time2pay', 'PokePages', 'DJsPortfolio'],
    resourcePath: 'patterns/deployment/hosting-setup.md',
    keywords: ['hosting', 'nginx', 'pm2', 'systemd'],
  },
  {
    id: 'deployment-environment-config',
    name: 'Environment Configuration',
    description: 'Environment variables, secrets, and runtime configuration patterns.',
    category: 'deployment',
    sourceRepos: ['time2pay', 'PokePages', 'core-monorepo'],
    resourcePath: 'patterns/deployment/environment-config.md',
    keywords: ['environment', 'env vars', 'secrets', 'config'],
  },
  {
    id: 'project-folder-structure',
    name: 'Project Folder Structure',
    description: 'App folder organization, feature grouping, and platform file layout.',
    category: 'project',
    sourceRepos: ['DJsPortfolio', 'not-hot-dog', 'core-monorepo'],
    resourcePath: 'patterns/project/folder-structure.md',
    keywords: ['folder structure', 'src', 'features', 'platform files'],
  },
  {
    id: 'project-documentation-org',
    name: 'Project Memory Folder',
    description: 'project/info.md, project/todo.md, project/style.md, and project/guidelines.md as agent-readable context.',
    category: 'project',
    sourceRepos: ['DJsPortfolio', 'not-hot-dog', 'mds-app-mcp'],
    resourcePath: 'patterns/project/documentation-org.md',
    keywords: ['project folder', 'info.md', 'todo.md', 'style.md', 'guidelines.md'],
  },
  {
    id: 'project-configuration-patterns',
    name: 'Configuration Patterns',
    description: 'App config, package metadata, tsconfig, Metro, and Babel setup.',
    category: 'project',
    sourceRepos: ['DJsPortfolio', 'time2pay', 'not-hot-dog'],
    resourcePath: 'patterns/project/configuration-patterns.md',
    keywords: ['app config', 'package.json', 'tsconfig', 'metro'],
  },
  {
    id: 'project-monorepo-structure',
    name: 'Monorepo Structure',
    description: 'Workspace layout, shared packages, and Turborepo orchestration.',
    category: 'project',
    sourceRepos: ['core-monorepo', 'mr-djs-dev-suite'],
    resourcePath: 'patterns/project/monorepo-structure.md',
    keywords: ['monorepo', 'pnpm', 'turborepo', 'workspace'],
  },
  {
    id: 'project-library-exports',
    name: 'Library Exports',
    description: 'Package export fields, entry points, and barrel export patterns.',
    category: 'project',
    sourceRepos: ['core-monorepo', 'mercury-bank-sdk', 'ads-sdk', 'quantum-api'],
    resourcePath: 'patterns/project/library-exports.md',
    keywords: ['exports', 'barrel exports', 'peer dependencies', 'esm'],
  },
  {
    id: 'automation-ship-to-test',
    name: 'Ship To Test Workflow',
    description: 'Run local checks, push a branch, open/update a PR, poll CI, fix, and merge to test.',
    category: 'automation',
    sourceRepos: ['time2pay', 'DJsPortfolio'],
    resourcePath: 'reference/package-ci-patterns.md',
    keywords: ['gh', 'pr', 'test branch', 'ci polling'],
  },
  {
    id: 'automation-post-create-onboarding',
    name: 'Post-Create Expo Onboarding',
    description: 'Agent-led setup after rn-new/create-expo-app/create-expo-stack plus wrapper flow for create-expo-super-stack.',
    category: 'automation',
    sourceRepos: ['expo-super-template', 'create-expo-stack'],
    resourcePath: 'guides/post-create-onboarding.md',
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
