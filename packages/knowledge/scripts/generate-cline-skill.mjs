import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CLINE_COORDINATOR_SKILL_ID = 'mds-coordinator';
export const CLINE_COORDINATOR_SKILL_VERSION = '1.2.0';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function generateClineCoordinatorSkill({ repoRoot, contentRoot, resource }) {
  if (!resource || resource.id !== CLINE_COORDINATOR_SKILL_ID) {
    throw new Error('[cline-skill] Expected the mds-coordinator knowledge resource.');
  }

  if (!resource.description || !resource.resourcePath) {
    throw new Error('[cline-skill] Coordinator resource metadata is incomplete.');
  }

  const sourcePath = path.join(contentRoot, resource.resourcePath);
  const content = await readFile(sourcePath, 'utf8');
  if (!content.trim()) {
    throw new Error(`[cline-skill] Coordinator content is empty: ${resource.resourcePath}`);
  }

  const destinationDirectory = path.join(repoRoot, '.cline', 'skills', CLINE_COORDINATOR_SKILL_ID);
  await rm(destinationDirectory, { recursive: true, force: true });
  await mkdir(destinationDirectory, { recursive: true });

  const skill = [
    '---',
    `name: ${CLINE_COORDINATOR_SKILL_ID}`,
    `description: ${JSON.stringify(resource.description)}`,
    '---',
    '',
    content.trimEnd(),
    '',
  ].join('\n');
  const metadata = {
    name: CLINE_COORDINATOR_SKILL_ID,
    version: CLINE_COORDINATOR_SKILL_VERSION,
    description: resource.description,
    author: 'MDS/i² Coordinator',
    tags: ['coordination', 'i2', 'git', 'worktrees', 'ci/cd'],
    commands: ['mds-coordinator'],
    enabled: true,
  };

  await Promise.all([
    writeFile(path.join(destinationDirectory, 'SKILL.md'), skill, 'utf8'),
    writeFile(
      path.join(destinationDirectory, 'metadata.json'),
      `${JSON.stringify(metadata, null, 2)}\n`,
      'utf8'
    ),
  ]);

  return {
    sourcePath,
    destinationDirectory,
    metadata,
  };
}

export async function generateClineCoordinatorSkillFromKnowledge({ packageRoot } = {}) {
  const resolvedPackageRoot = packageRoot ?? path.resolve(scriptDirectory, '..');
  const repoRoot = path.resolve(resolvedPackageRoot, '..', '..');
  const knowledgeModule = await import(
    pathToFileURL(path.join(resolvedPackageRoot, 'dist', 'index.js')).href
  );
  const resource = knowledgeModule
    .listKnowledgeResources('skill')
    .find((candidate) => candidate.id === CLINE_COORDINATOR_SKILL_ID);

  return generateClineCoordinatorSkill({
    repoRoot,
    contentRoot: path.join(resolvedPackageRoot, 'src', 'content'),
    resource,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateClineCoordinatorSkillFromKnowledge();
  console.log(`  generated ${path.relative(result.destinationDirectory, result.sourcePath)}`);
}
