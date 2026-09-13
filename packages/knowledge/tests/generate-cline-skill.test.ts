import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  CLINE_COORDINATOR_SKILL_VERSION,
  generateClineCoordinatorSkill,
} from '../scripts/generate-cline-skill.mjs';

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirectories.length = 0;
});

describe('generateClineCoordinatorSkill', () => {
  it('projects canonical content and shared metadata into the Cline skill folder', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'mds-cline-skill-'));
    tempDirectories.push(repoRoot);
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    const resourcePath = 'skills/mds-coordinator.md';
    const description = 'Coordinate MDS and i² workspace work from one canonical source.';
    await mkdir(path.join(contentRoot, 'skills'), { recursive: true });
    await writeFile(path.join(contentRoot, resourcePath), '# MDS Coordinator\n\nCanonical guidance.\n', 'utf8');

    const result = await generateClineCoordinatorSkill({
      repoRoot,
      contentRoot,
      resource: {
        id: 'mds-coordinator',
        name: 'MDS Coordinator',
        description,
        resourcePath,
      },
    });

    const skill = await readFile(path.join(result.destinationDirectory, 'SKILL.md'), 'utf8');
    const metadata = JSON.parse(
      await readFile(path.join(result.destinationDirectory, 'metadata.json'), 'utf8')
    ) as Record<string, unknown>;

    expect(skill).toContain('name: mds-coordinator');
    expect(skill).toContain(`description: ${JSON.stringify(description)}`);
    expect(skill).toMatch(/# MDS Coordinator\n\nCanonical guidance\./);
    expect(metadata).toMatchObject({
      name: 'mds-coordinator',
      version: CLINE_COORDINATOR_SKILL_VERSION,
      description,
      author: 'MDS/i² Coordinator',
    });
  });
});
