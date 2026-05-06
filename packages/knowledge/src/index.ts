import {
  getPatternMetadata,
  listPatternMetadata,
} from './patterns/index.js';

import type { PatternCategory } from './patterns/index.js';

export type { PatternCategory, PatternMetadata } from './patterns/index.js';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  source?: string;
  example?: string;
  references?: string[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
}

export async function getPattern(id: string): Promise<Pattern | null> {
  const metadata = getPatternMetadata(id);
  if (!metadata) {
    return null;
  }

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    source: metadata.sourceRepos.join(', '),
    references: metadata.resourcePath ? [metadata.resourcePath] : [],
  };
}

export async function listPatterns(category?: PatternCategory): Promise<Pattern[]> {
  return listPatternMetadata(category).map((metadata) => ({
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    category: metadata.category,
    source: metadata.sourceRepos.join(', '),
    references: metadata.resourcePath ? [metadata.resourcePath] : [],
  }));
}

export async function getSkill(id: string): Promise<Skill | null> {
  void id;
  return null;
}

export async function searchSkills(query: string): Promise<Skill[]> {
  void query;
  return [];
}
