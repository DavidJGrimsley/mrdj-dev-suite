import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildVscodeAddMcpPayload,
  renderCodexBlock,
  renderVscodeAddMcpCommand,
  resolveNpmInstallInvocation,
  resolveServerInvocation,
  runMcpInstallCommand,
  stripExistingCodexBlock,
  MDS_MCP_SERVER_BIN,
  WINDOWS_MDS_MCP_SERVER_ARGS,
  WINDOWS_MDS_MCP_SERVER_COMMAND,
} from '../src/commands/mcp-install.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
  vi.restoreAllMocks();
});

describe('resolveServerInvocation', () => {
  it('uses explicit --command verbatim', () => {
    expect(resolveServerInvocation({ command: 'node /tmp/server.js --flag' })).toEqual({
      command: 'node',
      args: ['/tmp/server.js', '--flag'],
    });
  });

  it('uses node + --server-path when provided', () => {
    expect(resolveServerInvocation({ serverPath: '/abs/server.js' })).toEqual({
      command: 'node',
      args: ['/abs/server.js'],
    });
  });

  it('uses the installed MDS MCP server command by default', () => {
    expect(resolveServerInvocation({})).toEqual({
      command: process.platform === 'win32' ? WINDOWS_MDS_MCP_SERVER_COMMAND : MDS_MCP_SERVER_BIN,
      args: process.platform === 'win32' ? WINDOWS_MDS_MCP_SERVER_ARGS : [],
    });
  });

  it('does not emit local repo paths or npx for the default server', () => {
    const server = resolveServerInvocation({});
    const serialized = `${server.command} ${server.args.join(' ')}`;
    expect(serialized).not.toContain('npx');
    expect(serialized).not.toContain('mrdj-dev-suite');
    expect(serialized).not.toContain('packages');
  });
});

describe('resolveNpmInstallInvocation', () => {
  it('builds a global install command without spawning npm.cmd directly on Windows', () => {
    const invocation = resolveNpmInstallInvocation('@mr.dj2u/mcp-server@latest');

    expect(invocation.args).toContain('install');
    expect(invocation.args).toContain('-g');
    expect(invocation.args).toContain('@mr.dj2u/mcp-server@latest');
    if (process.platform === 'win32') {
      expect(invocation.command.toLowerCase()).not.toBe('npm.cmd');
    }
  });
});

describe('runMcpInstallCommand (project scope)', () => {
  it('writes a project-scoped .mcp.json for Claude that merges with existing servers', async () => {
    const target = await createTempProject();
    await writeFile(
      path.join(target, '.mcp.json'),
      JSON.stringify({ mcpServers: { other: { command: 'echo' } } }, null, 2),
      'utf8'
    );

    await runMcpInstallCommand({
      client: 'claude',
      scope: 'project',
      target,
      serverPath: '/abs/server.js',
    });

    const written = JSON.parse(await readFile(path.join(target, '.mcp.json'), 'utf8'));
    expect(written.mcpServers.other).toEqual({ command: 'echo' });
    expect(written.mcpServers['mr-djs-dev-suite']).toEqual({
      command: 'node',
      args: ['/abs/server.js'],
    });
  });

  it('writes .cursor/mcp.json for Cursor', async () => {
    const target = await createTempProject();
    await runMcpInstallCommand({ client: 'cursor', scope: 'project', target, serverPath: '/abs/server.js' });
    const written = JSON.parse(await readFile(path.join(target, '.cursor', 'mcp.json'), 'utf8'));
    expect(written.mcpServers['mr-djs-dev-suite'].command).toBe('node');
  });

  it('writes .codex/config.toml for Codex and replaces an existing block', async () => {
    const target = await createTempProject();
    const codexPath = path.join(target, '.codex', 'config.toml');
    await mkdir(path.dirname(codexPath), { recursive: true });
    await writeFile(
      codexPath,
      '[mcp_servers.mr-djs-dev-suite]\ncommand = "old"\nargs = ["stale"]\n\n[other]\nkey = "value"\n',
      'utf8'
    );

    await runMcpInstallCommand({ client: 'codex', scope: 'project', target, serverPath: '/abs/server.js' });

    const written = await readFile(codexPath, 'utf8');
    expect(written).toContain('[mcp_servers.mr-djs-dev-suite]');
    expect(written).toContain('command = "node"');
    expect(written).toContain('args = ["/abs/server.js"]');
    expect(written).toContain('[other]');
    expect(written).not.toContain('"stale"');
  });

  it('writes .vscode/mcp.json for VS Code using the mds server key', async () => {
    const target = await createTempProject();
    await mkdir(path.join(target, '.vscode'), { recursive: true });
    await writeFile(
      path.join(target, '.vscode', 'mcp.json'),
      JSON.stringify({ servers: { existing: { command: 'echo' } } }, null, 2),
      'utf8'
    );

    await runMcpInstallCommand({ client: 'vscode', scope: 'project', target, serverPath: '/abs/server.js' });

    const written = JSON.parse(await readFile(path.join(target, '.vscode', 'mcp.json'), 'utf8'));
    expect(written.servers.existing).toEqual({ command: 'echo' });
    expect(written.servers.mds).toEqual({
      command: 'node',
      args: ['/abs/server.js'],
    });
  });
});

describe('runMcpInstallCommand (user scope)', () => {
  let fakeHome: string;

  beforeEach(async () => {
    fakeHome = await createTempProject();
    vi.spyOn(os, 'homedir').mockReturnValue(fakeHome);
  });

  it('writes ~/.claude.json for Claude, preserving existing keys', async () => {
    await writeFile(
      path.join(fakeHome, '.claude.json'),
      JSON.stringify({ otherSetting: true, mcpServers: { other: { command: 'echo' } } }, null, 2),
      'utf8'
    );

    await runMcpInstallCommand({ client: 'claude', scope: 'user', serverPath: '/abs/server.js' });

    const written = JSON.parse(await readFile(path.join(fakeHome, '.claude.json'), 'utf8'));
    expect(written.otherSetting).toBe(true);
    expect(written.mcpServers.other).toEqual({ command: 'echo' });
    expect(written.mcpServers['mr-djs-dev-suite']).toEqual({
      command: 'node',
      args: ['/abs/server.js'],
    });
  });

  it('writes ~/.cursor/mcp.json for Cursor', async () => {
    await runMcpInstallCommand({ client: 'cursor', scope: 'user', serverPath: '/abs/server.js' });
    const written = JSON.parse(await readFile(path.join(fakeHome, '.cursor', 'mcp.json'), 'utf8'));
    expect(written.mcpServers['mr-djs-dev-suite'].command).toBe('node');
  });

  it('writes ~/.codex/config.toml for Codex', async () => {
    await runMcpInstallCommand({ client: 'codex', scope: 'user', serverPath: '/abs/server.js' });
    const written = await readFile(path.join(fakeHome, '.codex', 'config.toml'), 'utf8');
    expect(written).toContain('[mcp_servers.mr-djs-dev-suite]');
    expect(written).toContain('command = "node"');
  });

  it('prints VS Code user-scope MCP dry-run instructions without writing files', async () => {
    await runMcpInstallCommand({
      client: 'vscode',
      scope: 'user',
      serverPath: '/abs/server.js',
      dryRun: true,
    });

    await expect(readFile(path.join(fakeHome, '.vscode', 'mcp.json'), 'utf8')).rejects.toThrow();
  });
});

describe('renderCodexBlock', () => {
  it('renders a TOML block with JSON-escaped strings', () => {
    expect(renderCodexBlock('mr-djs-dev-suite', { command: 'node', args: ['a b', 'c'] })).toBe(
      '[mcp_servers.mr-djs-dev-suite]\ncommand = "node"\nargs = ["a b", "c"]\n'
    );
  });
});

describe('renderVscodeAddMcpCommand', () => {
  it('renders a shell-safe add-mcp command for the current platform', () => {
    const command = renderVscodeAddMcpCommand(buildVscodeAddMcpPayload({ command: 'mds-mcp-server', args: [] }));

    if (process.platform === 'win32') {
      expect(command).toBe(`code --add-mcp '{"name":"mds","command":"mds-mcp-server","args":[]}'`);
      return;
    }

    expect(command).toBe('code --add-mcp "{\\"name\\":\\"mds\\",\\"command\\":\\"mds-mcp-server\\",\\"args\\":[]}"');
  });
});

describe('stripExistingCodexBlock', () => {
  it('removes only the named server block and keeps siblings', () => {
    const input = '[mcp_servers.mr-djs-dev-suite]\ncommand = "x"\nargs = []\n\n[other]\nk = "v"\n';
    expect(stripExistingCodexBlock(input, 'mr-djs-dev-suite')).toBe('[other]\nk = "v"\n');
  });

  it('returns content unchanged when the block is missing', () => {
    expect(stripExistingCodexBlock('[other]\nk = "v"\n', 'mr-djs-dev-suite')).toBe(
      '[other]\nk = "v"\n'
    );
  });
});

async function createTempProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mds-mcp-install-'));
  tempDirs.push(dir);
  return dir;
}
