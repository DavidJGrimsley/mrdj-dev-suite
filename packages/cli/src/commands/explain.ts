import chalk from 'chalk';

import { listKnowledgeResources, readKnowledgeResource } from '@mr.dj2u/knowledge';

import type { KnowledgeResource, KnowledgeResourceContent } from '@mr.dj2u/knowledge';

export interface ExplainArgv {
  topic?: string;
  json?: boolean;
}

export type ExplainMatch =
  | {
      type: 'doctor';
      id: string;
      name: string;
      description: string;
      nextStep: string;
      relatedResources: string[];
    }
  | {
      type: 'knowledge';
      id: string;
      name: string;
      description: string;
      uri: string;
      kind: string;
      keywords: string[];
      excerpt: string;
    };

export interface ExplainResult {
  query: string;
  status: 'found' | 'ambiguous' | 'not-found';
  matches: ExplainMatch[];
}

const DOCTOR_TOPICS = [
  {
    id: 'project docs',
    name: 'Project Docs',
    description: 'Checks that project/info.md, project/todo.md, project/style.md, and project/guidelines.md exist.',
    nextStep: 'Create or normalize the project memory files so agents have a stable source of truth.',
    relatedResources: ['project-documentation-org', 'post-create-onboarding'],
    aliases: ['project-docs', 'project memory', 'docs'],
  },
  {
    id: 'todo-for-context markers',
    name: 'TodoForContext Markers',
    description: 'Blocks unresolved optional intake markers from surviving into phase work or CI.',
    nextStep:
      'Fill the section under each marker, or delete the marker line to acknowledge that no extra context is needed.',
    relatedResources: ['post-create-onboarding'],
    aliases: ['todoforcontext', 'todo for context', 'markers'],
  },
  {
    id: 'gitignore env',
    name: 'Gitignore Env',
    description: 'Checks that local environment files are ignored before secrets land in git.',
    nextStep: 'Make sure .env, .env.local, and similar files are ignored while safe examples remain tracked.',
    relatedResources: ['env-hygiene', 'deployment-environment-config'],
    aliases: ['env gitignore', '.env', 'gitignore'],
  },
  {
    id: 'package scripts',
    name: 'Package Scripts',
    description: 'Checks whether the project exposes useful local scripts for linting, testing, building, and Doctor.',
    nextStep: 'Add missing scripts only when the package manager and framework support them.',
    relatedResources: ['deployment-ci-cd-patterns'],
    aliases: ['scripts', 'npm scripts'],
  },
  {
    id: 'styling stack',
    name: 'Styling Stack',
    description: 'Checks for the expected Uniwind/Tailwind styling setup and conflicting NativeWind artifacts.',
    nextStep: 'Prefer Uniwind plus Tailwind v4 for new MDS app scaffolds.',
    relatedResources: ['styling-uniwind-setup', 'uniwind-theming'],
    aliases: ['styling', 'uniwind', 'tailwind'],
  },
  {
    id: 'expo config',
    name: 'Expo Config',
    description: 'Checks that Expo configuration is present and compatible with selected platforms and web output.',
    nextStep: 'Inspect app.json or app.config.* and align platforms, web output, and EAS expectations.',
    relatedResources: ['project-configuration-patterns', 'deployment-build-configuration'],
    aliases: ['expo configuration', 'app.json', 'app config'],
  },
  {
    id: 'env hygiene',
    name: 'Env Hygiene',
    description: 'Checks for secret-looking values exposed through EXPO_PUBLIC variables or client code.',
    nextStep: 'Move private keys server-side and keep client env vars publishable only.',
    relatedResources: ['env-hygiene', 'env-vars'],
    aliases: ['environment hygiene', 'secrets', 'expo public'],
  },
  {
    id: 'runtime security',
    name: 'Runtime Security',
    description:
      'Checks that server-only modules, private process.env access, and Expo config credentials do not leak into the client bundle.',
    nextStep:
      'Move database clients, Express, and secrets behind API routes or server modules, and keep client env access on EXPO_PUBLIC_* variables.',
    relatedResources: ['ssr-safety', 'expo-ssr-safety', 'env-hygiene', 'env-vars'],
    aliases: ['runtime-security', 'server imports', 'server-only imports', 'client bundle security'],
  },
  {
    id: 'app architecture',
    name: 'App Architecture',
    description: 'Checks Expo Router route files for oversized screens and business/data logic in app/.',
    nextStep: 'Move real UI into feature screens and keep route files focused on routing and layout.',
    relatedResources: ['app-folder-architecture', 'expo-router-architecture', 'routing-file-based-routing'],
    aliases: ['app folder', 'route architecture', 'routes'],
  },
  {
    id: 'seo metadata',
    name: 'SEO Metadata',
    description: 'Checks web-facing metadata basics such as title, description, and indexing strategy.',
    nextStep: 'Define route-level metadata and canonical/indexing expectations for production web output.',
    relatedResources: ['seo-metadata'],
    aliases: ['seo', 'metadata'],
  },
  {
    id: 'script checks',
    name: 'Script Checks',
    description: 'Runs lint, typecheck, tests, Expo Doctor, and build scripts when the selected Doctor mode asks for them.',
    nextStep: 'Fix the failing script locally, rerun mds doctor, then push only after the CI-equivalent profile passes.',
    relatedResources: ['deployment-ci-cd-patterns', 'deployment'],
    aliases: ['eslint', 'typescript', 'typecheck', 'expo doctor', 'build checks', 'ci'],
  },
] as const;

export async function runExplainCommand(argv: ExplainArgv): Promise<void> {
  if (!argv.topic) {
    throw new Error('mds explain requires a topic.');
  }

  const result = await explainTopic(argv.topic);

  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printExplainResult(result);
  }

  if (result.status !== 'found') {
    process.exitCode = 1;
  }
}

export async function explainTopic(topic: string): Promise<ExplainResult> {
  const query = topic.trim();
  const normalized = normalize(query);
  const exactDoctorMatches = DOCTOR_TOPICS.filter((candidate) =>
    [candidate.id, candidate.name, ...candidate.aliases].map(normalize).includes(normalized)
  ).map(doctorMatchFromTopic);
  if (exactDoctorMatches.length === 1) {
    return { query, status: 'found', matches: exactDoctorMatches };
  }

  const resources = listKnowledgeResources();
  const exactResourceMatches = await Promise.all(
    resources
      .filter((resource) =>
        resource.uri === query ||
        [resource.id, resource.name].map(normalize).includes(normalized)
      )
      .map(async (resource) => knowledgeMatchFromResource(resource))
  );
  if (exactResourceMatches.length === 1) {
    return { query, status: 'found', matches: exactResourceMatches };
  }

  const doctorMatches = DOCTOR_TOPICS.filter((candidate) =>
    [candidate.id, candidate.name, candidate.description, ...candidate.aliases]
      .map(normalize)
      .some((value) => value.includes(normalized) || normalized.includes(value))
  ).map(doctorMatchFromTopic);

  const knowledgeMatches = await Promise.all(
    resources
      .filter((resource) => resourceMatches(resource, normalized))
      .map(async (resource) => knowledgeMatchFromResource(resource))
  );

  const matches = [...doctorMatches, ...knowledgeMatches];
  if (matches.length === 1) {
    return { query, status: 'found', matches };
  }
  if (matches.length > 1) {
    return { query, status: 'ambiguous', matches };
  }
  return { query, status: 'not-found', matches: [] };
}

function doctorMatchFromTopic(candidate: (typeof DOCTOR_TOPICS)[number]): ExplainMatch {
  return {
    type: 'doctor',
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    nextStep: candidate.nextStep,
    relatedResources: [...candidate.relatedResources],
  };
}

function printExplainResult(result: ExplainResult): void {
  if (result.status === 'not-found') {
    console.log(chalk.red(`No MDS explanation matched "${result.query}".`));
    console.log(chalk.gray('Try a Doctor check name like env hygiene, app architecture, or seo metadata.'));
    return;
  }

  if (result.status === 'ambiguous') {
    console.log(chalk.yellow(`"${result.query}" matched multiple topics:`));
    for (const match of result.matches.slice(0, 10)) {
      console.log(`  ${match.id} - ${match.name}`);
    }
    console.log(chalk.gray('Run `mds explain <exact id>` for one of these topics.'));
    return;
  }

  const match = result.matches[0];
  if (!match) {
    console.log(chalk.red(`No MDS explanation matched "${result.query}".`));
    return;
  }
  console.log(chalk.bold(match.name));
  console.log(chalk.dim(`${match.type}: ${match.id}`));
  console.log();
  console.log(match.description);
  console.log();

  if (match.type === 'doctor') {
    console.log(chalk.bold('Next Step'));
    console.log(match.nextStep);
    if (match.relatedResources.length > 0) {
      console.log();
      console.log(chalk.bold('Related Resources'));
      for (const resource of match.relatedResources) {
        console.log(`- ${resource}`);
      }
    }
    return;
  }

  console.log(chalk.bold('Resource'));
  console.log(`${match.kind} ${match.uri}`);
  if (match.excerpt) {
    console.log();
    console.log(chalk.bold('Excerpt'));
    console.log(match.excerpt);
  }
}

async function knowledgeMatchFromResource(resource: KnowledgeResource): Promise<ExplainMatch> {
  const content = await readKnowledgeResource(resource.uri);
  return {
    type: 'knowledge',
    id: resource.id,
    name: resource.name,
    description: resource.description,
    uri: resource.uri,
    kind: resource.kind,
    keywords: resource.keywords,
    excerpt: summarizeContent(content),
  };
}

function summarizeContent(resource: KnowledgeResourceContent | null): string {
  if (!resource) {
    return '';
  }

  return resource.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .slice(0, 3)
    .join('\n');
}

function resourceMatches(resource: KnowledgeResource, normalizedQuery: string): boolean {
  return [resource.id, resource.uri, resource.name, resource.description, ...resource.keywords]
    .map(normalize)
    .some((value) => value.includes(normalizedQuery) || normalizedQuery.includes(value));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
