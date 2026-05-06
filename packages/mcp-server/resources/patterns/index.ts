export type PatternCategory =
  | 'routing'
  | 'api'
  | 'styling'
  | 'state'
  | 'database'
  | 'deployment'
  | 'project';

export interface PatternResource {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  filePath: string;
  keywords: string[];
}

const patternResources = [
  {
    id: 'routing-file-based-routing',
    name: 'File-Based Routing with Expo Router',
    category: 'routing',
    description: 'Route files, nested layouts, and Expo Router route mapping patterns.',
    filePath: 'routing/file-based-routing.md',
    keywords: ['expo router', 'file-based routing', 'layout', 'routes'],
  },
  {
    id: 'routing-dynamic-routes',
    name: 'Dynamic Routes with Parameters',
    category: 'routing',
    description: 'Dynamic segments, typed params, and catch-all route patterns.',
    filePath: 'routing/dynamic-routes.md',
    keywords: ['dynamic routes', 'params', 'typed routes', 'catch-all'],
  },
  {
    id: 'routing-route-groups',
    name: 'Route Groups Pattern',
    category: 'routing',
    description: 'Route grouping, hidden segments, and navigation organization.',
    filePath: 'routing/route-groups.md',
    keywords: ['route groups', 'expo router', 'navigation', 'groups'],
  },
  {
    id: 'api-api-routes',
    name: 'API Routes with Catch-All Pattern',
    category: 'api',
    description: 'Expo Router API route handlers and request processing patterns.',
    filePath: 'api/api-routes.md',
    keywords: ['api routes', 'server', 'route handler', 'express'],
  },
  {
    id: 'api-error-handling',
    name: 'Error Handling in API Services',
    category: 'api',
    description: 'Centralized error handling, validation, and failure responses.',
    filePath: 'api/error-handling.md',
    keywords: ['error handling', 'validation', 'status codes', 'api'],
  },
  {
    id: 'styling-uniwind-setup',
    name: 'Uniwind & Tailwind v4 Setup',
    category: 'styling',
    description: 'Uniwind configuration, Tailwind 4 setup, and CSS entry patterns.',
    filePath: 'styling/uniwind-setup.md',
    keywords: ['uniwind', 'tailwind v4', 'metro', 'global css'],
  },
  {
    id: 'styling-theme-configuration',
    name: 'Theme Configuration & CSS Variables',
    category: 'styling',
    description: 'Theme tokens, CSS variables, and light/dark mode pattern setup.',
    filePath: 'styling/theme-configuration.md',
    keywords: ['theme', 'css variables', 'tokens', 'dark mode'],
  },
  {
    id: 'styling-responsive-patterns',
    name: 'Responsive Design Patterns',
    category: 'styling',
    description: 'Breakpoint usage, adaptive layouts, and viewport-safe patterns.',
    filePath: 'styling/responsive-patterns.md',
    keywords: ['responsive', 'breakpoints', 'layout', 'adaptive'],
  },
  {
    id: 'styling-component-styling',
    name: 'Component Styling Patterns',
    category: 'styling',
    description: 'Reusable component styling, variants, and class composition.',
    filePath: 'styling/component-styling.md',
    keywords: ['components', 'styling', 'variants', 'className'],
  },
  {
    id: 'state-zustand-patterns',
    name: 'Zustand State Management',
    category: 'state',
    description: 'Atomic store design, store actions, and state slices for Zustand.',
    filePath: 'state/zustand-patterns.md',
    keywords: ['zustand', 'state management', 'store', 'selectors'],
  },
  {
    id: 'state-store-organization',
    name: 'Store Organization Pattern',
    category: 'state',
    description: 'Feature-based store structure and domain-oriented state grouping.',
    filePath: 'state/store-organization.md',
    keywords: ['store organization', 'feature stores', 'domain state'],
  },
  {
    id: 'state-selector-hooks',
    name: 'Selector Hooks Pattern',
    category: 'state',
    description: 'Selector hook patterns that minimize rerenders and subscription scope.',
    filePath: 'state/selector-hooks.md',
    keywords: ['selector hooks', 'rerenders', 'zustand', 'performance'],
  },
  {
    id: 'state-persistence-middleware',
    name: 'Persistence Middleware Pattern',
    category: 'state',
    description: 'Persisted stores, storage adapters, and selective rehydration patterns.',
    filePath: 'state/persistence-middleware.md',
    keywords: ['persist', 'asyncstorage', 'rehydration', 'middleware'],
  },
  {
    id: 'database-drizzle-schema',
    name: 'Drizzle ORM Schema Design',
    category: 'database',
    description: 'Schema definitions, inferred types, and relational model patterns.',
    filePath: 'database/drizzle-schema.md',
    keywords: ['drizzle', 'schema', 'types', 'postgres'],
  },
  {
    id: 'database-migrations',
    name: 'Drizzle Migrations Pattern',
    category: 'database',
    description: 'Schema migrations, generated SQL, and migration workflow patterns.',
    filePath: 'database/migrations.md',
    keywords: ['migrations', 'drizzle-kit', 'schema changes', 'sql'],
  },
  {
    id: 'database-relations',
    name: 'Table Relations Pattern',
    category: 'database',
    description: 'Relations, joins, and relational modeling with Drizzle.',
    filePath: 'database/relations.md',
    keywords: ['relations', 'joins', 'foreign keys', 'drizzle'],
  },
  {
    id: 'database-query-organization',
    name: 'Query Organization Pattern',
    category: 'database',
    description: 'Query modules, service boundaries, and reusable data access patterns.',
    filePath: 'database/query-organization.md',
    keywords: ['queries', 'data access', 'services', 'organization'],
  },
  {
    id: 'deployment-build-configuration',
    name: 'Build Configuration Pattern',
    category: 'deployment',
    description: 'App build settings, export targets, and deployment-ready config.',
    filePath: 'deployment/build-configuration.md',
    keywords: ['build', 'expo export', 'deployment', 'configuration'],
  },
  {
    id: 'deployment-ci-cd-patterns',
    name: 'CI/CD Patterns',
    category: 'deployment',
    description: 'GitHub Actions workflows, automation, and release pipelines.',
    filePath: 'deployment/ci-cd-patterns.md',
    keywords: ['ci', 'cd', 'github actions', 'workflows'],
  },
  {
    id: 'deployment-hosting-setup',
    name: 'Hosting Setup Pattern',
    category: 'deployment',
    description: 'Production hosting, reverse proxy, and runtime process management.',
    filePath: 'deployment/hosting-setup.md',
    keywords: ['hosting', 'nginx', 'pm2', 'systemd'],
  },
  {
    id: 'deployment-environment-config',
    name: 'Environment Configuration Pattern',
    category: 'deployment',
    description: 'Environment variables, secrets, and runtime configuration patterns.',
    filePath: 'deployment/environment-config.md',
    keywords: ['environment', 'env vars', 'secrets', 'config'],
  },
  {
    id: 'project-folder-structure',
    name: 'Project Folder Structure Pattern',
    category: 'project',
    description: 'App folder organization, feature grouping, and platform file layout.',
    filePath: 'project/folder-structure.md',
    keywords: ['folder structure', 'src', 'features', 'platform files'],
  },
  {
    id: 'project-documentation-org',
    name: 'Documentation Organization Pattern',
    category: 'project',
    description: 'README, project docs, and documentation maintenance patterns.',
    filePath: 'project/documentation-org.md',
    keywords: ['documentation', 'readme', 'project docs', 'organization'],
  },
  {
    id: 'project-configuration-patterns',
    name: 'Configuration Patterns',
    category: 'project',
    description: 'App config, package metadata, tsconfig, metro, and babel setup.',
    filePath: 'project/configuration-patterns.md',
    keywords: ['app config', 'package.json', 'tsconfig', 'metro'],
  },
  {
    id: 'project-monorepo-structure',
    name: 'Monorepo Structure',
    category: 'project',
    description: 'Workspace layout, shared packages, and Turborepo orchestration.',
    filePath: 'project/monorepo-structure.md',
    keywords: ['monorepo', 'pnpm', 'turborepo', 'workspace'],
  },
  {
    id: 'project-library-exports',
    name: 'Library Exports',
    category: 'project',
    description: 'Package export fields, entry points, and barrel export patterns.',
    filePath: 'project/library-exports.md',
    keywords: ['exports', 'barrel exports', 'peer dependencies', 'esm'],
  },
] satisfies PatternResource[];

const patternIndex = new Map(patternResources.map((resource) => [resource.id, resource]));

export const PATTERN_RESOURCES = patternResources;

export const PATTERN_CATEGORIES: Record<
  PatternCategory,
  {
    description: string;
    resources: PatternResource[];
  }
> = {
  routing: {
    description: 'Expo Router and navigation patterns.',
    resources: patternResources.filter((resource) => resource.category === 'routing'),
  },
  api: {
    description: 'API route and error handling patterns.',
    resources: patternResources.filter((resource) => resource.category === 'api'),
  },
  styling: {
    description: 'Uniwind, theming, and responsive styling patterns.',
    resources: patternResources.filter((resource) => resource.category === 'styling'),
  },
  state: {
    description: 'Zustand stores and state-management patterns.',
    resources: patternResources.filter((resource) => resource.category === 'state'),
  },
  database: {
    description: 'Drizzle ORM and PostgreSQL data patterns.',
    resources: patternResources.filter((resource) => resource.category === 'database'),
  },
  deployment: {
    description: 'Build, hosting, and environment delivery patterns.',
    resources: patternResources.filter((resource) => resource.category === 'deployment'),
  },
  project: {
    description: 'Project structure, config, and package-level patterns.',
    resources: patternResources.filter((resource) => resource.category === 'project'),
  },
};

export function getAllPatterns(): PatternResource[] {
  return [...patternResources];
}

export function getPatternsByCategory(category: PatternCategory): PatternResource[] {
  return PATTERN_CATEGORIES[category].resources;
}

export function getPatternById(id: string): PatternResource | undefined {
  return patternIndex.get(id);
}

export function getPatternFilePaths(): string[] {
  return patternResources.map((resource) => resource.filePath);
}

export function getPatternCount(): number {
  return patternResources.length;
}

export function getCategoryCounts(): Record<PatternCategory, number> {
  return {
    routing: PATTERN_CATEGORIES.routing.resources.length,
    api: PATTERN_CATEGORIES.api.resources.length,
    styling: PATTERN_CATEGORIES.styling.resources.length,
    state: PATTERN_CATEGORIES.state.resources.length,
    database: PATTERN_CATEGORIES.database.resources.length,
    deployment: PATTERN_CATEGORIES.deployment.resources.length,
    project: PATTERN_CATEGORIES.project.resources.length,
  };
}