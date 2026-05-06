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
export declare function getPattern(id: string): Promise<Pattern | null>;
export declare function listPatterns(category?: PatternCategory): Promise<Pattern[]>;
export declare function getSkill(id: string): Promise<Skill | null>;
export declare function searchSkills(query: string): Promise<Skill[]>;
//# sourceMappingURL=index.d.ts.map