import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPatternMetadata,
  listPatternMetadata,
} from './patterns/index.js';
import { listPromptSpecs } from './prompts/index.js';

import type { PatternCategory, PatternMetadata } from './patterns/index.js';
import type { PromptSpec } from './prompts/index.js';

export type { PatternCategory, PatternMetadata } from './patterns/index.js';
export type {
  McpToolSpec,
  PromptArgSpec,
  PromptSpec,
  PromptSpecContent,
  PromptSurface,
} from './prompts/index.js';
export {
  getMcpToolSpec,
  getPromptSpec,
  listMcpToolSpecs,
  listPromptSpecs,
  readPromptContent,
  readPromptSpec,
} from './prompts/index.js';

export type KnowledgeKind =
  | 'pattern'
  | 'guide'
  | 'rule'
  | 'skill'
  | 'reference'
  | 'checklist'
  | 'example'
  | 'prompt';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  source?: string;
  example?: string;
  references?: string[];
  uri: string;
  resourcePath?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  uri: string;
}

export interface KnowledgeResource {
  id: string;
  uri: string;
  kind: KnowledgeKind;
  name: string;
  description: string;
  resourcePath: string;
  keywords: string[];
  category?: PatternCategory;
  sourceRepos?: string[];
}

export interface KnowledgeResourceContent extends KnowledgeResource {
  content: string;
}

const CONTENT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content');

const GUIDE_RESOURCES = [
  {
    id: 'animation-performance',
    name: 'Animation Performance Guide',
    description: 'Practical React Native animation performance guidance from Expo/App & Flow benchmarks.',
    resourcePath: 'guides/animation-performance.md',
    keywords: ['animation', 'performance', 'reanimated', 'lists'],
    sourceRepos: ['Expo blog', 'App & Flow'],
  },
  {
    id: 'post-create-onboarding',
    name: 'Post-Create Expo Onboarding',
    description: 'Agent-led setup flow after rn-new or create-expo-app.',
    resourcePath: 'guides/post-create-onboarding.md',
    keywords: ['onboard', 'expo', 'create-expo-app', 'uniwind'],
    sourceRepos: ['expo-super-template', 'create-expo-stack'],
  },
] as const;

const RULE_RESOURCES = [
  {
    id: 'app-folder-architecture',
    name: 'App Folder Architecture Rule',
    description: 'Keep Expo Router route files thin and free of business/data logic.',
    resourcePath: 'rules/app-folder-architecture.md',
    keywords: ['app folder', 'architecture', 'route files'],
  },
  {
    id: 'env-hygiene',
    name: 'Environment Hygiene Rule',
    description: 'Prevent secret-looking values from being exposed through EXPO_PUBLIC variables.',
    resourcePath: 'rules/env-hygiene.md',
    keywords: ['env', 'secrets', 'expo public'],
  },
  {
    id: 'ssr-safety',
    name: 'SSR Safety Rule',
    description: 'Guard browser globals and client-only APIs in Expo web/server paths.',
    resourcePath: 'rules/ssr-safety.md',
    keywords: ['ssr', 'window', 'localStorage'],
  },
  {
    id: 'seo-metadata',
    name: 'SEO Metadata Rule',
    description: 'Ensure production web routes have a metadata and indexing strategy.',
    resourcePath: 'rules/seo-metadata.md',
    keywords: ['seo', 'metadata', 'canonical', 'sitemap'],
  },
] as const;

const SKILL_RESOURCES = [
  {
    id: 'expo-router-architecture',
    name: 'Expo Router Architecture Skill',
    description: 'Instructions for reviewing and building thin Expo Router route files.',
    resourcePath: 'skills/expo-router-architecture.md',
    keywords: ['expo router', 'architecture', 'routes'],
  },
  {
    id: 'expo-ssr-safety',
    name: 'Expo SSR Safety Skill',
    description: 'Instructions for avoiding web/server runtime crashes.',
    resourcePath: 'skills/expo-ssr-safety.md',
    keywords: ['ssr', 'web', 'guards'],
  },
  {
    id: 'env-vars',
    name: 'Environment Variables Skill',
    description: 'Instructions for public/private env variable boundaries.',
    resourcePath: 'skills/env-vars.md',
    keywords: ['env', 'secrets', 'configuration'],
  },
  {
    id: 'uniwind-theming',
    name: 'Uniwind Theming Skill',
    description: 'Instructions for Tailwind v4 and Uniwind setup.',
    resourcePath: 'skills/uniwind-theming.md',
    keywords: ['uniwind', 'tailwind', 'theme'],
  },
  {
    id: 'api-routes',
    name: 'API Routes Skill',
    description: 'Instructions for secure Expo Router API routes.',
    resourcePath: 'skills/api-routes.md',
    keywords: ['api routes', 'validation', 'auth'],
  },
  {
    id: 'deployment',
    name: 'Deployment Readiness Skill',
    description: 'Instructions for local checks before shipping an Expo app.',
    resourcePath: 'skills/deployment.md',
    keywords: ['deployment', 'doctor', 'ci'],
  },
  {
    id: 'dev-server-management',
    name: 'Dev Server Management Skill',
    description:
      'Instructions for recovering Expo/Metro local dev-server state and resolving port/cache conflicts.',
    resourcePath: 'skills/dev-server-management.md',
    keywords: ['dev server', 'expo start', 'metro', 'ports', 'cache'],
  },
  {
    id: 'production-server-patterns',
    name: 'Production Server Patterns Skill',
    description: 'Instructions for choosing and running Expo production serving modes.',
    resourcePath: 'skills/production-server-patterns.md',
    keywords: ['production server', 'expo serve', 'express', 'server.js'],
  },
  {
    id: 'seo-metadata',
    name: 'SEO Metadata Skill',
    description: 'Instructions for production web metadata, canonical URLs, and indexing strategy.',
    resourcePath: 'skills/seo-metadata.md',
    keywords: ['seo', 'metadata', 'canonical', 'open graph'],
  },
  {
    id: 'debugging',
    name: 'Debugging Skill',
    description: 'Instructions for reproducible issue triage and root-cause-first fixes.',
    resourcePath: 'skills/debugging.md',
    keywords: ['debugging', 'triage', 'doctor', 'root cause'],
  },
  {
    id: 'project-onboarding',
    name: 'Project Onboarding Skill',
    description: 'Instructions for onboarding an existing Expo app into MDS project memory and workflow.',
    resourcePath: 'skills/project-onboarding.md',
    keywords: ['onboarding', 'project memory', 'expo app'],
  },
  {
    id: 'super-stack-startup',
    name: 'Super Stack Startup Skill',
    description:
      'Instructions for running create-expo-super-stack and handing off to phase-based app development.',
    resourcePath: 'skills/super-stack-startup.md',
    keywords: ['create-expo-super-stack', 'startup', 'onboarding flow'],
  },
  {
    id: 'continue-development',
    name: 'Continue Development Skill',
    description: 'Instructions for choosing and progressing the next task from project/todo.md.',
    resourcePath: 'skills/continue-development.md',
    keywords: ['continue', 'todo', 'phase', 'roadmap'],
  },
  {
    id: 'research-plan-intake',
    name: 'Research Plan Intake Skill',
    description: 'Instructions for turning raw research and notes into canonical MDS project memory.',
    resourcePath: 'skills/research-plan-intake.md',
    keywords: ['research', 'intake', 'project info', 'planning'],
  },
  {
    id: 'plugin-creation',
    name: 'MDS Plugin Creation Skill',
    description: 'Instructions for building a new MDS plugin bundle for Claude Code, Codex, Cursor, or any AI agent client.',
    resourcePath: 'skills/plugin-creation.md',
    keywords: ['plugin', 'claude code', 'codex', 'commands', 'bundle'],
  },
] as const;

const REFERENCE_RESOURCES = [
  {
    id: 'reference-repo-evacuation',
    name: 'Reference Repo Evacuation',
    description: 'Inventory of harvested reference repos and cleanup rules.',
    resourcePath: 'reference/reference-repo-evacuation.md',
    keywords: ['reference repos', 'evacuation', 'phase 1'],
    sourceRepos: ['mds-dev-suite'],
  },
  {
    id: 'mcp-sdk-transport',
    name: 'MCP SDK Transport Pattern',
    description: 'MCP server/stdio transport pattern harvested from mds-app-mcp.',
    resourcePath: 'reference/mcp-sdk-transport.md',
    keywords: ['mcp', 'stdio', 'resources', 'tools'],
    sourceRepos: ['mds-app-mcp'],
  },
  {
    id: 'package-ci-patterns',
    name: 'Package And CI Patterns',
    description: 'Package build/test/typecheck patterns from SDK and monorepo references.',
    resourcePath: 'reference/package-ci-patterns.md',
    keywords: ['ci', 'sdk', 'package', 'exports'],
    sourceRepos: ['core-monorepo', 'mercury-bank-sdk', 'ads-sdk', 'quantum-api'],
  },
  {
    id: 'doctor-dogfood',
    name: 'Doctor Dogfood Notes',
    description: 'Required Phase 1 Doctor dogfood targets and acceptance notes.',
    resourcePath: 'reference/doctor-dogfood.md',
    keywords: ['doctor', 'dogfood', 'verification'],
    sourceRepos: ['time2pay', 'DJsPortfolio', 'PokePages', 'expo-super-template', 'core-monorepo'],
  },
  {
    id: 'create-expo-stack-uniwind',
    name: 'create-expo-stack Uniwind Exploration',
    description: 'Focused upstream contribution notes for adding Uniwind support.',
    resourcePath: 'reference/create-expo-stack-uniwind.md',
    keywords: ['create-expo-stack', 'rn-new', 'uniwind', 'upstream'],
    sourceRepos: ['create-expo-stack'],
  },
] as const;

const CHECKLIST_RESOURCES = [
  {
    id: 'ship-test-loop',
    name: 'Ship-Test Loop Checklist',
    description: 'Checklist for doctor/PR/fix/poll/merge loops into the test branch.',
    resourcePath: 'checklists/ship-test-loop.md',
    keywords: ['checklist', 'ship', 'test branch', 'pull request'],
    sourceRepos: ['mds-dev-suite'],
  },
  {
    id: 'unified-agent-bundle-validation',
    name: 'Unified Agent Bundle Validation Checklist',
    description: 'Phase 9 validation checklist for the unified agent bundle.',
    resourcePath: 'checklists/unified-agent-bundle-validation.md',
    keywords: ['phase 9', 'unified bundle', 'validation'],
    sourceRepos: ['mds-dev-suite'],
  },
] as const;

const EXAMPLE_RESOURCES = [
  {
    id: 'ship-test-loop',
    name: 'Ship-Test Loop Example',
    description: 'Example iteration log for a PR loop into the test branch.',
    resourcePath: 'examples/ship-test-loop.md',
    keywords: ['example', 'ship', 'iteration'],
    sourceRepos: ['mds-dev-suite'],
  },
  {
    id: 'unified-agent-bundle-bootstrap',
    name: 'Unified Agent Bundle Bootstrap Example',
    description: 'Phase 9 bootstrap example for unified agent bundle installation.',
    resourcePath: 'examples/unified-agent-bundle-bootstrap.md',
    keywords: ['phase 9', 'bundle', 'bootstrap'],
    sourceRepos: ['mds-dev-suite'],
  },
] as const;

export async function getPattern(id: string): Promise<Pattern | null> {
  const metadata = getPatternMetadata(id);
  if (!metadata) {
    return null;
  }

  return patternFromMetadata(metadata);
}

export async function listPatterns(category?: PatternCategory): Promise<Pattern[]> {
  return listPatternMetadata(category).map(patternFromMetadata);
}

export async function getSkill(id: string): Promise<Skill | null> {
  const resource = getKnowledgeResource(`mds://skills/${id}`);
  if (!resource || resource.kind !== 'skill') {
    return null;
  }

  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    content: await readContent(resource.resourcePath),
    tags: resource.keywords,
    uri: resource.uri,
  };
}

export async function searchSkills(query: string): Promise<Skill[]> {
  const normalizedQuery = query.toLowerCase();
  const matches = listKnowledgeResources('skill').filter((resource) => {
    return [resource.id, resource.name, resource.description, ...resource.keywords]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return Promise.all(
    matches.map(async (resource) => ({
      id: resource.id,
      name: resource.name,
      description: resource.description,
      content: await readContent(resource.resourcePath),
      tags: resource.keywords,
      uri: resource.uri,
    }))
  );
}

export function listKnowledgeResources(kind?: KnowledgeKind): KnowledgeResource[] {
  const resources: KnowledgeResource[] = [
    ...listPatternMetadata().map(patternResourceFromMetadata),
    ...GUIDE_RESOURCES.map((resource) => simpleResource('guide', resource)),
    ...RULE_RESOURCES.map((resource) => simpleResource('rule', resource)),
    ...SKILL_RESOURCES.map((resource) => simpleResource('skill', resource)),
    ...REFERENCE_RESOURCES.map((resource) => simpleResource('reference', resource)),
    ...CHECKLIST_RESOURCES.map((resource) => simpleResource('checklist', resource)),
    ...EXAMPLE_RESOURCES.map((resource) => simpleResource('example', resource)),
    ...listPromptSpecs()
      .filter((spec) => spec.surfaces.some((surface) => surface !== 'phase9-artifact'))
      .map(promptResourceFromSpec),
  ];

  return kind ? resources.filter((resource) => resource.kind === kind) : resources;
}

export function getKnowledgeResource(uriOrId: string): KnowledgeResource | null {
  const resources = listKnowledgeResources();
  return (
    resources.find((resource) => resource.uri === uriOrId || resource.id === uriOrId) ?? null
  );
}

export async function readKnowledgeResource(uriOrId: string): Promise<KnowledgeResourceContent | null> {
  const resource = getKnowledgeResource(uriOrId);
  if (!resource) {
    return null;
  }

  return {
    ...resource,
    content: await readContent(resource.resourcePath),
  };
}

function patternFromMetadata(metadata: PatternMetadata): Pattern {
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    source: metadata.sourceRepos.join(', '),
    references: metadata.resourcePath ? [metadata.resourcePath] : [],
    uri: `mds://patterns/${metadata.id}`,
    resourcePath: metadata.resourcePath,
  };
}

function patternResourceFromMetadata(metadata: PatternMetadata): KnowledgeResource {
  return {
    id: metadata.id,
    uri: `mds://patterns/${metadata.id}`,
    kind: 'pattern',
    name: metadata.name,
    description: metadata.description,
    resourcePath: metadata.resourcePath ?? 'reference/reference-repo-evacuation.md',
    keywords: metadata.keywords,
    category: metadata.category,
    sourceRepos: metadata.sourceRepos,
  };
}

function promptResourceFromSpec(spec: PromptSpec): KnowledgeResource {
  return {
    id: spec.id,
    uri: `mds://prompts/${spec.slug}`,
    kind: 'prompt',
    name: spec.title,
    description: spec.description,
    resourcePath: spec.resourcePath,
    keywords: [...spec.keywords],
  };
}

function simpleResource(
  kind: Exclude<KnowledgeKind, 'pattern'>,
  resource: {
    id: string;
    name: string;
    description: string;
    resourcePath: string;
    keywords: readonly string[];
    sourceRepos?: readonly string[];
  }
): KnowledgeResource {
  return {
    id: resource.id,
    uri: `mds://${resourceNamespace(kind)}/${resource.id}`,
    kind,
    name: resource.name,
    description: resource.description,
    resourcePath: resource.resourcePath,
    keywords: [...resource.keywords],
    sourceRepos: resource.sourceRepos ? [...resource.sourceRepos] : undefined,
  };
}

function resourceNamespace(kind: Exclude<KnowledgeKind, 'pattern'>): string {
  return kind === 'reference' ? 'reference' : `${kind}s`;
}

async function readContent(resourcePath: string): Promise<string> {
  const safePath = path.normalize(resourcePath);
  if (safePath.startsWith('..') || path.isAbsolute(safePath)) {
    throw new Error(`Invalid knowledge resource path: ${resourcePath}`);
  }

  return readFile(path.join(CONTENT_ROOT, safePath), 'utf8');
}
