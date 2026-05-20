import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  runAgentInstallCommand,
  runAgentVerifyCommand,
  verifyClaudeAgentInstall,
  verifyCodexAgentInstall,
  verifyVscodeAgentInstall,
} from '../src/commands/agent.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
  vi.restoreAllMocks();
});

describe('VS Code agent install', () => {
  it('installs project-scoped VS Code Copilot assets and preserves existing MCP servers', async () => {
    const bundleRoot = await createBundle();
    const target = await createTempDir('mds-agent-target-');
    await mkdir(path.join(target, '.vscode'), { recursive: true });
    await mkdir(path.join(target, '.github'), { recursive: true });
    await writeFile(
      path.join(target, '.vscode', 'mcp.json'),
      JSON.stringify({ servers: { existing: { command: 'echo' } } }, null, 2),
      'utf8'
    );
    await writeFile(
      path.join(target, '.vscode', 'settings.json'),
      JSON.stringify({ 'editor.formatOnSave': true }, null, 2),
      'utf8'
    );
    await writeFile(path.join(target, '.github', 'copilot-instructions.md'), '# Existing\n', 'utf8');

    await runAgentInstallCommand({
      client: 'vscode',
      scope: 'project',
      target,
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
    });

    const mcp = JSON.parse(await readFile(path.join(target, '.vscode', 'mcp.json'), 'utf8'));
    expect(mcp.servers.existing).toEqual({ command: 'echo' });
    expect(mcp.servers.mds).toEqual({ command: 'node', args: ['/abs/server.js'] });
    const settings = JSON.parse(await readFile(path.join(target, '.vscode', 'settings.json'), 'utf8'));
    expect(settings['editor.formatOnSave']).toBe(true);
    expect(settings['chat.useAgentSkills']).toBe(true);

    const instructions = await readFile(path.join(target, '.github', 'copilot-instructions.md'), 'utf8');
    expect(instructions).toContain('# Existing');
    expect(instructions).toContain('BEGIN MDS COPILOT INSTRUCTIONS');

    const verify = await verifyVscodeAgentInstall(target);
    expect(verify.passed).toBe(true);
    expect(verify.checks.some((check) => check.name === 'Doctor validation')).toBe(true);
    expect(verify.checks.some((check) => check.name === 'Knowledge guide validation')).toBe(true);
    expect(verify.checks.some((check) => check.name === 'CLI workflow validation')).toBe(true);
  });

  it('supports user-scope dry-runs without mutating the home directory', async () => {
    const bundleRoot = await createBundle();
    const fakeHome = await createTempDir('mds-agent-home-');
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    const result = await runAgentInstallCommand({
      client: 'vscode',
      scope: 'user',
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.target).toBe(path.join(fakeHome, '.copilot'));
    expect(result.writtenPaths.some((filePath) => filePath.endsWith(path.join('skills', 'deployment', 'SKILL.md')))).toBe(
      true
    );
    await expect(readFile(path.join(fakeHome, '.copilot', 'instructions.md'), 'utf8')).rejects.toThrow();
  });
});

describe('Claude agent install', () => {
  it('installs project-scoped Claude Code assets with MCP and instructions', async () => {
    const bundleRoot = await createClaudeBundle();
    const target = await createTempDir('mds-claude-target-');
    await writeFile(
      path.join(target, '.mcp.json'),
      JSON.stringify({ mcpServers: { other: { command: 'echo' } } }, null, 2),
      'utf8'
    );
    await writeFile(path.join(target, 'CLAUDE.md'), '# Existing Claude Instructions\n', 'utf8');

    await runAgentInstallCommand({
      client: 'claude',
      scope: 'project',
      target,
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
    });

    const mcp = JSON.parse(await readFile(path.join(target, '.mcp.json'), 'utf8'));
    expect(mcp.mcpServers.other).toEqual({ command: 'echo' });
    expect(mcp.mcpServers['mr-djs-dev-suite']).toEqual({ command: 'node', args: ['/abs/server.js'] });
    expect(await readFile(path.join(target, '.claude', 'agents', 'mds.md'), 'utf8')).toContain('name: mds');
    expect(await readFile(path.join(target, '.claude', 'commands', 'run-doctor.md'), 'utf8')).toContain('# Run Doctor');
    expect(await readFile(path.join(target, '.claude', 'skills', 'deployment', 'SKILL.md'), 'utf8')).toContain(
      'Deploy safely'
    );

    const instructions = await readFile(path.join(target, 'CLAUDE.md'), 'utf8');
    expect(instructions).toContain('# Existing Claude Instructions');
    expect(instructions).toContain('BEGIN MDS CLAUDE INSTRUCTIONS');

    const verify = await verifyClaudeAgentInstall(target);
    expect(verify.passed).toBe(true);
  });

  it('supports user-scope dry-runs without mutating the home directory', async () => {
    const bundleRoot = await createClaudeBundle();
    const fakeHome = await createTempDir('mds-claude-home-');
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    const result = await runAgentInstallCommand({
      client: 'claude',
      scope: 'user',
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.target).toBe(path.join(fakeHome, '.claude'));
    expect(result.writtenPaths.some((filePath) => filePath.endsWith(path.join('agents', 'mds.md')))).toBe(true);
    await expect(readFile(path.join(fakeHome, '.claude.json'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(fakeHome, '.claude', 'agents', 'mds.md'), 'utf8')).rejects.toThrow();
  });
});

describe('Codex agent install', () => {
  it('installs project-scoped Codex MCP config, local plugin, and marketplace entry', async () => {
    const bundleRoot = await createCodexBundle();
    const target = await createTempDir('mds-codex-target-');
    await writeFileWithDirs(
      path.join(target, '.agents', 'plugins', 'marketplace.json'),
      JSON.stringify(
        {
          name: 'local',
          interface: { displayName: 'Local Plugins' },
          plugins: [
            {
              name: 'other',
              source: { source: 'local', path: './plugins/other' },
              policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
              category: 'Coding',
            },
          ],
        },
        null,
        2
      )
    );

    await runAgentInstallCommand({
      client: 'codex',
      scope: 'project',
      target,
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
    });

    const config = await readFile(path.join(target, '.codex', 'config.toml'), 'utf8');
    expect(config).toContain('[mcp_servers.mr-djs-dev-suite]');
    expect(config).toContain('command = "node"');
    expect(config).toContain('args = ["/abs/server.js"]');
    expect(config).toContain('[marketplaces.mds-local]');
    expect(config).toContain(`source = ${JSON.stringify(target)}`);
    expect(config).toContain('[plugins."mr-djs-dev-suite@mds-local"]');
    expect(config).toContain('enabled = true');

    const marketplace = JSON.parse(await readFile(path.join(target, '.agents', 'plugins', 'marketplace.json'), 'utf8'));
    expect(marketplace.plugins.find((plugin: { name: string }) => plugin.name === 'other')).toBeTruthy();
    const mdsEntry = marketplace.plugins.find((plugin: { name: string }) => plugin.name === 'mr-djs-dev-suite');
    expect(mdsEntry.source).toEqual({ source: 'local', path: './plugins/mr-djs-dev-suite' });
    expect(mdsEntry.policy).toEqual({ installation: 'AVAILABLE', authentication: 'ON_INSTALL' });
    expect(await readFile(path.join(target, 'plugins', 'mr-djs-dev-suite', '.codex-plugin', 'plugin.json'), 'utf8')).toContain(
      '"name": "mr-djs-dev-suite"'
    );
    const pluginMcp = JSON.parse(await readFile(path.join(target, 'plugins', 'mr-djs-dev-suite', '.mcp.json'), 'utf8'));
    expect(pluginMcp.mcpServers['mr-djs-dev-suite']).toEqual({ command: 'node', args: ['/abs/server.js'] });

    const verify = await verifyCodexAgentInstall(target);
    expect(verify.passed).toBe(true);
  });

  it('installs user-scoped Codex config, marketplace, plugin, and verifies without project checks', async () => {
    const bundleRoot = await createCodexBundle();
    const fakeHome = await createTempDir('mds-codex-home-');
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runAgentInstallCommand({
      client: 'codex',
      scope: 'user',
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
    });

    const output = logSpy.mock.calls.flat().join('\n');
    expect(output).toContain("Restart Codex so it picks up the Mr. DJ's Dev Suite plugin.");
    expect(output).toContain("Type `@Mr. DJ's Dev Suite` in chat to get the install pop-up.");
    expect(output).toContain('Hit Install.');
    expect(output).toContain("Use with `@Mr. DJ's Dev Suite` in Codex Desktop or the Codex extension for VS Code.");
    expect(output).toContain('Run `mds agent verify --client codex --scope user` from any workspace.');

    const config = await readFile(path.join(fakeHome, '.codex', 'config.toml'), 'utf8');
    expect(config).toContain('[mcp_servers.mr-djs-dev-suite]');
    expect(config).toContain('[marketplaces.mds-local]');
    expect(config).toContain(`source = ${JSON.stringify(fakeHome)}`);
    expect(config).toContain('[plugins."mr-djs-dev-suite@mds-local"]');
    expect(config).toContain('enabled = true');

    const marketplace = JSON.parse(await readFile(path.join(fakeHome, '.agents', 'plugins', 'marketplace.json'), 'utf8'));
    const mdsEntry = marketplace.plugins.find((plugin: { name: string }) => plugin.name === 'mr-djs-dev-suite');
    expect(mdsEntry.source).toEqual({ source: 'local', path: './plugins/mr-djs-dev-suite' });
    expect(await readFile(path.join(fakeHome, 'plugins', 'mr-djs-dev-suite', '.codex-plugin', 'plugin.json'), 'utf8')).toContain(
      '"name": "mr-djs-dev-suite"'
    );

    const verify = await verifyCodexAgentInstall(fakeHome, 'user');
    expect(verify.passed).toBe(true);
    expect(verify.scope).toBe('user');
    expect(verify.checks.some((check) => check.name === 'Doctor validation')).toBe(false);
  });

  it('falls back to user-scope Codex verification when project assets are absent and no scope was provided', async () => {
    const bundleRoot = await createCodexBundle();
    const fakeHome = await createTempDir('mds-codex-home-');
    const target = await createTempDir('mds-codex-empty-target-');
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    await runAgentInstallCommand({
      client: 'codex',
      scope: 'user',
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
    });

    const verify = await runAgentVerifyCommand({ client: 'codex', target });
    expect(verify.passed).toBe(true);
    expect(verify.scope).toBe('user');
    expect(verify.target).toBe(fakeHome);
  });

  it('supports user-scope dry-runs without mutating the home directory', async () => {
    const bundleRoot = await createCodexBundle();
    const fakeHome = await createTempDir('mds-codex-home-');
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);

    const result = await runAgentInstallCommand({
      client: 'codex',
      scope: 'user',
      bundlePath: bundleRoot,
      serverPath: '/abs/server.js',
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.target).toBe(fakeHome);
    expect(
      result.writtenPaths.some((filePath) => filePath.endsWith(path.join('plugins', 'mr-djs-dev-suite', 'commands', 'run-doctor.md')))
    ).toBe(true);
    await expect(readFile(path.join(fakeHome, '.codex', 'config.toml'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(fakeHome, '.agents', 'plugins', 'marketplace.json'), 'utf8')).rejects.toThrow();
  });
});

async function createBundle(): Promise<string> {
  const bundleRoot = await createTempDir('mds-vscode-bundle-');
  await writeFileWithDirs(
    path.join(bundleRoot, '.github', 'copilot-instructions.md'),
    '<!-- BEGIN MDS COPILOT INSTRUCTIONS -->\n# MDS\n<!-- END MDS COPILOT INSTRUCTIONS -->\n'
  );
  await writeFileWithDirs(
    path.join(bundleRoot, '.vscode', 'settings.json'),
    JSON.stringify(
      {
        'github.copilot.chat.codeGeneration.useInstructionFiles': true,
        'chat.promptFilesLocations': { '.github/prompts': true },
        'chat.agentFilesLocations': { '.github/agents': true },
        'chat.useAgentSkills': true,
        'chat.agentSkillsLocations': { '.github/skills': true, '~/.copilot/skills': true },
      },
      null,
      2
    )
  );
  await writeFileWithDirs(path.join(bundleRoot, '.github', 'agents', 'mds.agent.md'), '# Agent\n');
  await writeFileWithDirs(path.join(bundleRoot, '.github', 'prompts', 'run-doctor.prompt.md'), '# Prompt\n');
  await writeFileWithDirs(path.join(bundleRoot, '.github', 'skills', 'deployment', 'SKILL.md'), '# Skill\n');
  await writeFileWithDirs(
    path.join(bundleRoot, 'user', '.copilot', 'instructions.md'),
    '<!-- BEGIN MDS COPILOT INSTRUCTIONS -->\n# MDS\n<!-- END MDS COPILOT INSTRUCTIONS -->\n'
  );
  await writeFileWithDirs(path.join(bundleRoot, 'user', '.copilot', 'agents', 'mds.agent.md'), '# Agent\n');
  await writeFileWithDirs(path.join(bundleRoot, 'user', '.copilot', 'skills', 'deployment', 'SKILL.md'), '# Skill\n');
  return bundleRoot;
}

async function createClaudeBundle(): Promise<string> {
  const bundleRoot = await createTempDir('mds-claude-bundle-');
  await writeFileWithDirs(path.join(bundleRoot, 'CLAUDE.md'), '# MDS Claude Instructions\n');
  await writeFileWithDirs(path.join(bundleRoot, 'agents', 'mds.md'), '---\nname: mds\n---\n# MDS Agent\n');
  await writeFileWithDirs(path.join(bundleRoot, 'commands', 'run-doctor.md'), '# Run Doctor\n');
  await writeFileWithDirs(path.join(bundleRoot, 'skills', 'deployment', 'SKILL.md'), '---\ndescription: Deploy safely\n---\n');
  return bundleRoot;
}

async function createCodexBundle(): Promise<string> {
  const bundleRoot = await createTempDir('mds-codex-bundle-');
  await writeFileWithDirs(
    path.join(bundleRoot, '.codex-plugin', 'plugin.json'),
    JSON.stringify({ name: 'mr-djs-dev-suite', version: '0.1.0' }, null, 2)
  );
  await writeFileWithDirs(
    path.join(bundleRoot, '.mcp.json'),
    JSON.stringify(
      {
        mcpServers: {
          'mr-djs-dev-suite': {
            command: 'npx',
            args: ['-y', '@mr.dj2u/mcp-server@0.1.2'],
          },
        },
      },
      null,
      2
    )
  );
  await writeFileWithDirs(path.join(bundleRoot, 'commands', 'run-doctor.md'), '# Run Doctor\n');
  await writeFileWithDirs(path.join(bundleRoot, 'skills', 'deployment', 'SKILL.md'), '---\ndescription: Deploy safely\n---\n');
  return bundleRoot;
}

async function writeFileWithDirs(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
