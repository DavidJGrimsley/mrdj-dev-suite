import { getPatternMetadata, listPatternMetadata, } from './patterns/index.js';
export async function getPattern(id) {
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
export async function listPatterns(category) {
    return listPatternMetadata(category).map((metadata) => ({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        source: metadata.sourceRepos.join(', '),
        references: metadata.resourcePath ? [metadata.resourcePath] : [],
    }));
}
export async function getSkill(id) {
    void id;
    return null;
}
export async function searchSkills(query) {
    void query;
    return [];
}
//# sourceMappingURL=index.js.map