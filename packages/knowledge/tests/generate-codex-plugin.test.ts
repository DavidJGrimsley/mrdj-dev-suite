import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  COMMAND_FILES,
  generateCodexPluginBundle,
} from '../scripts/generate-codex-plugin.mjs';

interface SkillSeed {
  id: string;
  name: string;
  description: string;
  resourcePath: string;
  content: string;
}

interface CommandSeed {
  fileName: string;
  content: string;
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('generateCodexPluginBundle', () => {
  it('generates plugin bundle files and marketplace output deterministically', async () => {
    const repoRoot = await createTempDir('mds-plugin-repo-');
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    await mkdir(contentRoot, { recursive: true });

    const skills = [
      createSkillSeed({
        id: 'zeta-skill',
        resourcePath: 'skills/zeta-skill.md',
      }),
      createSkillSeed({
        id: 'alpha-skill',
        resourcePath: 'skills/alpha-skill.md',
      }),
    ];
    await seedSkillFiles(contentRoot, skills);
    const commands = createCommandSeeds();

    const result = await generateCodexPluginBundle({
      repoRoot,
      contentRoot,
      pluginVersion: '9.9.9',
      skills: skills.map(({ content: _content, ...metadata }) => metadata),
      commands,
    });

    expect(result.skillIds).toEqual(['alpha-skill', 'zeta-skill']);
    expect(result.commandFiles).toEqual(COMMAND_FILES);

    const pluginRoot = path.join(repoRoot, 'plugins', 'codex');
    const manifestRaw = await readFile(path.join(pluginRoot, '.codex-plugin', 'plugin.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
    expect(manifest.name).toBe('mr-djs-dev-suite');
    expect(manifest.version).toBe('9.9.9');
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.mcpServers).toBe('./.mcp.json');
    const pluginInterface = manifest.interface as Record<string, unknown>;
    expect(pluginInterface.privacyPolicyURL).toBeUndefined();
    expect(pluginInterface.termsOfServiceURL).toBeUndefined();

    const mcpRaw = await readFile(path.join(pluginRoot, '.mcp.json'), 'utf8');
    const mcp = JSON.parse(mcpRaw) as { mcpServers: Record<string, { command: string; args: string[] }> };
    expect(mcp.mcpServers['mr-djs-dev-suite']).toEqual({
      command: 'npx',
      args: ['-y', '@mr.dj2u/mcp-server'],
    });

    const skillsDirEntries = await readdir(path.join(pluginRoot, 'skills'));
    expect(skillsDirEntries.sort()).toEqual(['alpha-skill', 'zeta-skill']);

    const commandEntries = await readdir(path.join(pluginRoot, 'commands'));
    expect(commandEntries.sort()).toEqual([...COMMAND_FILES].sort());

    const marketplaceRaw = await readFile(
      path.join(repoRoot, '.agents', 'plugins', 'marketplace.json'),
      'utf8'
    );
    const marketplace = JSON.parse(marketplaceRaw) as {
      plugins: Array<{ name: string; source: { path: string } }>;
    };
    expect(marketplace.plugins).toHaveLength(1);
    expect(marketplace.plugins[0]).toMatchObject({
      name: 'mr-djs-dev-suite',
      source: {
        path: './plugins/codex',
      },
    });
  });

  it('fails when skill content file is missing', async () => {
    const repoRoot = await createTempDir('mds-plugin-repo-missing-');
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    await mkdir(contentRoot, { recursive: true });

    await expect(
      generateCodexPluginBundle({
        repoRoot,
        contentRoot,
        pluginVersion: '0.1.0',
        commands: createCommandSeeds(),
        skills: [
          {
            id: 'missing-skill',
            name: 'Missing Skill',
            description: 'Missing skill content',
            resourcePath: 'skills/missing-skill.md',
          },
        ],
      })
    ).rejects.toThrow(
      '[codex-plugin] Missing skill content for "missing-skill" at "skills/missing-skill.md".'
    );
  });

  it('preserves existing marketplace metadata and plugins when upserting this plugin', async () => {
    const repoRoot = await createTempDir('mds-plugin-repo-merge-');
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    await mkdir(contentRoot, { recursive: true });

    const skill = createSkillSeed({
      id: 'alpha-skill',
      resourcePath: 'skills/alpha-skill.md',
    });
    await seedSkillFiles(contentRoot, [skill]);

    const marketplacePath = path.join(repoRoot, '.agents', 'plugins', 'marketplace.json');
    await mkdir(path.dirname(marketplacePath), { recursive: true });
    await writeFile(
      marketplacePath,
      JSON.stringify(
        {
          name: 'custom-market',
          interface: {
            displayName: 'Custom Marketplace',
            theme: 'dark',
          },
          plugins: [
            {
              name: 'another-plugin',
              source: {
                source: 'local',
                path: './plugins/another',
              },
              policy: {
                installation: 'AVAILABLE',
              },
              category: 'General',
            },
            {
              name: 'mr-djs-dev-suite',
              source: {
                source: 'local',
                path: './old/path',
              },
              policy: {
                installation: 'UNAVAILABLE',
                authentication: 'NONE',
              },
              category: 'General',
              customFlag: true,
            },
          ],
        },
        null,
        2
      ),
      'utf8'
    );

    await generateCodexPluginBundle({
      repoRoot,
      contentRoot,
      pluginVersion: '0.1.0',
      commands: createCommandSeeds(),
      skills: [
        {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          resourcePath: skill.resourcePath,
        },
      ],
    });

    const marketplaceRaw = await readFile(marketplacePath, 'utf8');
    const marketplace = JSON.parse(marketplaceRaw) as {
      name: string;
      interface: Record<string, unknown>;
      plugins: Array<Record<string, unknown>>;
    };

    expect(marketplace.name).toBe('custom-market');
    expect(marketplace.interface).toMatchObject({
      displayName: 'Custom Marketplace',
      theme: 'dark',
    });
    expect(marketplace.plugins).toHaveLength(2);
    expect(marketplace.plugins[0].name).toBe('another-plugin');
    expect(marketplace.plugins[1]).toMatchObject({
      name: 'mr-djs-dev-suite',
      source: {
        source: 'local',
        path: './plugins/codex',
      },
      policy: {
        installation: 'AVAILABLE',
        authentication: 'ON_INSTALL',
      },
      category: 'Coding',
      customFlag: true,
    });
  });

  it('fails when skill content is empty', async () => {
    const repoRoot = await createTempDir('mds-plugin-repo-empty-');
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    await mkdir(path.join(contentRoot, 'skills'), { recursive: true });
    await writeFile(path.join(contentRoot, 'skills', 'empty-skill.md'), ' \n\t', 'utf8');

    await expect(
      generateCodexPluginBundle({
        repoRoot,
        contentRoot,
        pluginVersion: '0.1.0',
        commands: createCommandSeeds(),
        skills: [
          {
            id: 'empty-skill',
            name: 'Empty Skill',
            description: 'Empty skill content',
            resourcePath: 'skills/empty-skill.md',
          },
        ],
      })
    ).rejects.toThrow(
      '[codex-plugin] Skill content is empty for "empty-skill" at "skills/empty-skill.md".'
    );
  });
});

function createSkillSeed(overrides: Partial<SkillSeed>): SkillSeed {
  const id = overrides.id ?? 'sample-skill';
  const resourcePath = overrides.resourcePath ?? `skills/${id}.md`;
  return {
    id,
    name: overrides.name ?? `Name for ${id}`,
    description: overrides.description ?? `Description for ${id}`,
    resourcePath,
    content: overrides.content ?? `# Skill: ${id}\n\nUse this skill for ${id}.\n`,
  };
}

async function seedSkillFiles(contentRoot: string, skills: SkillSeed[]): Promise<void> {
  for (const skill of skills) {
    const filePath = path.join(contentRoot, skill.resourcePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, skill.content, 'utf8');
  }
}

function createCommandSeeds(): CommandSeed[] {
  return COMMAND_FILES.map((fileName) => ({
    fileName,
    content: `# /${fileName.replace('.md', '')}\n\nGenerated test command for ${fileName}.\n`,
  }));
}

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
