import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildVscodeMcpConfig,
  buildVscodeSettings,
  generateVscodeCopilotBundle,
  VSCODE_MCP_SERVER_KEY,
} from '../scripts/generate-vscode-copilot.mjs';

interface SkillSeed {
  id: string;
  name: string;
  description: string;
  resourcePath: string;
  content: string;
}

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('generateVscodeCopilotBundle', () => {
  it('generates VS Code Copilot project and user assets from knowledge skills', async () => {
    const repoRoot = await createTempDir('mds-vscode-bundle-');
    const contentRoot = path.join(repoRoot, 'packages', 'knowledge', 'src', 'content');
    await mkdir(contentRoot, { recursive: true });

    const skills = [
      createSkillSeed({
        id: 'deployment',
        name: 'Deployment Skill',
        description: 'Deployment guidance for release readiness.',
      }),
      createSkillSeed({
        id: 'debugging',
        name: 'Debugging Skill',
        description: 'Debugging guidance for reproducible fixes.',
      }),
    ];
    await seedSkillFiles(contentRoot, skills);

    const result = await generateVscodeCopilotBundle({
      repoRoot,
      contentRoot,
      skills: skills.map(({ content: _content, ...metadata }) => metadata),
    });

    expect(result.skillIds).toEqual(['debugging', 'deployment']);
    expect(result.promptFiles.every((fileName) => fileName.endsWith('.prompt.md'))).toBe(true);

    const bundleRoot = path.join(repoRoot, 'plugins', 'vscode-copilot');
    const mcpRaw = await readFile(path.join(bundleRoot, '.vscode', 'mcp.json'), 'utf8');
    const mcp = JSON.parse(mcpRaw) as { servers: Record<string, { command: string; args: string[] }> };
    expect(mcp.servers[VSCODE_MCP_SERVER_KEY]).toEqual({
      command: 'npx',
      args: ['-y', '@mr.dj2u/mcp-server@0.1.5'],
    });
    const settingsRaw = await readFile(path.join(bundleRoot, '.vscode', 'settings.json'), 'utf8');
    const settings = JSON.parse(settingsRaw) as Record<string, unknown>;
    expect(settings['chat.useAgentSkills']).toBe(true);

    const promptFiles = await readdir(path.join(bundleRoot, '.github', 'prompts'));
    expect(promptFiles).toContain('run-doctor.prompt.md');

    const skillRaw = await readFile(
      path.join(bundleRoot, '.github', 'skills', 'deployment', 'SKILL.md'),
      'utf8'
    );
    expect(skillRaw).toContain('name: "Deployment Skill"');
    expect(skillRaw).toContain('description: "Deployment guidance for release readiness."');

    const userWorkflowSkill = await readFile(
      path.join(bundleRoot, 'user', '.copilot', 'skills', 'workflow-run-doctor', 'SKILL.md'),
      'utf8'
    );
    expect(userWorkflowSkill).toContain('name: "MDS Run Doctor"');
    expect(userWorkflowSkill).toContain(VSCODE_MCP_SERVER_KEY);
  });

  it('builds a VS Code MCP config with the camel-case server key', () => {
    expect(buildVscodeMcpConfig()).toEqual({
      servers: {
        mds: {
          command: 'npx',
          args: ['-y', '@mr.dj2u/mcp-server@0.1.5'],
        },
      },
    });
  });

  it('builds VS Code settings for Copilot customization discovery', () => {
    expect(buildVscodeSettings()).toMatchObject({
      'github.copilot.chat.codeGeneration.useInstructionFiles': true,
      'chat.useAgentSkills': true,
    });
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

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
