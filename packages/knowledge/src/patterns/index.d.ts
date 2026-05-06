export type PatternCategory = 'routing' | 'api' | 'styling' | 'state' | 'database' | 'deployment' | 'project' | 'automation';
export interface PatternMetadata {
    id: string;
    name: string;
    description: string;
    category: PatternCategory;
    sourceRepos: string[];
    resourcePath?: string;
    keywords: string[];
}
export declare const PATTERN_METADATA: ({
    id: string;
    name: string;
    description: string;
    category: "routing";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "api";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "styling";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "state";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "database";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "deployment";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "project";
    sourceRepos: string[];
    resourcePath: string;
    keywords: string[];
} | {
    id: string;
    name: string;
    description: string;
    category: "automation";
    sourceRepos: string[];
    keywords: string[];
    resourcePath?: undefined;
})[];
export declare function listPatternMetadata(category?: PatternCategory): PatternMetadata[];
export declare function getPatternMetadata(id: string): PatternMetadata | null;
//# sourceMappingURL=index.d.ts.map