import chalk from 'chalk';

import { getSkill, listKnowledgeResources } from '@mds/knowledge';

import type { KnowledgeResource, Skill } from '@mds/knowledge';

export interface SkillsListArgv {
  query?: string;
  json?: boolean;
}

export interface SkillsShowArgv {
  id?: string;
  json?: boolean;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  uri: string;
}

export async function runSkillsListCommand(argv: SkillsListArgv): Promise<void> {
  const skills = listSkillSummaries(argv.query);

  if (argv.json) {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  console.log(chalk.bold('mds skills list'));
  if (argv.query) {
    console.log(chalk.dim(`filter: ${argv.query}`));
  }
  console.log();

  if (skills.length === 0) {
    console.log(chalk.yellow('No bundled skills matched.'));
    return;
  }

  for (const skill of skills) {
    console.log(`${chalk.cyan(skill.id)} ${chalk.bold(skill.name)}`);
    console.log(`  ${skill.description}`);
    console.log(chalk.dim(`  tags: ${skill.tags.join(', ')}`));
  }
}

export async function runSkillsShowCommand(argv: SkillsShowArgv): Promise<void> {
  if (!argv.id) {
    throw new Error('mds skills show requires a skill id.');
  }

  const skill = await getSkill(argv.id);
  if (!skill) {
    process.exitCode = 1;
    console.log(chalk.red(`Unknown skill: ${argv.id}`));
    printClosestSkills(argv.id);
    return;
  }

  if (argv.json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }

  console.log(chalk.bold(skill.name));
  console.log(chalk.dim(skill.uri));
  console.log();
  console.log(skill.content);
}

export function listSkillSummaries(query?: string): SkillSummary[] {
  const normalizedQuery = query?.trim().toLowerCase();
  return listKnowledgeResources('skill')
    .filter((resource) => (normalizedQuery ? resourceMatches(resource, normalizedQuery) : true))
    .map(skillSummaryFromResource);
}

function printClosestSkills(query: string): void {
  const matches = listSkillSummaries(query).slice(0, 5);
  if (matches.length === 0) {
    console.log(chalk.gray('Run `mds skills list` to see available bundled skills.'));
    return;
  }

  console.log(chalk.gray('Closest bundled skills:'));
  for (const match of matches) {
    console.log(chalk.gray(`  ${match.id} - ${match.name}`));
  }
}

function skillSummaryFromResource(resource: KnowledgeResource): SkillSummary {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description,
    tags: resource.keywords,
    uri: resource.uri,
  };
}

function resourceMatches(resource: KnowledgeResource | Skill, normalizedQuery: string): boolean {
  return [
    resource.id,
    resource.name,
    resource.description,
    ...('keywords' in resource ? resource.keywords : resource.tags),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}
