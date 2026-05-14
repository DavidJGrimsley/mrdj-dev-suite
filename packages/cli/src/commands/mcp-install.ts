import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import chalk from 'chalk';

export type McpClient = 'claude' | 'codex' | 'cursor';
export type McpScope = 'user' | 'project';

export interface McpInstallArgv {
  client?: McpClient;
  scope?: McpScope;
  target?: string;
  serverPath?: string;
  command?: string;
  dryRun?: boolean;
}

interface ResolvedServer {
  command: string;
  args: string[];
}

const SERVER_KEY = 'mrdj-dev-suite';

export async function runMcpInstallCommand(argv: McpInstallArgv): Promise<void> {
  const client = argv.client ?? 'claude';
  const scope = argv.scope ?? 'user';
  const server = resolveServerInvocation(argv);
  const dryRun = Boolean(argv.dryRun);

  console.log(chalk.bold('mrdj mcp install'));
  console.log(chalk.dim(`client: ${client}`));
  console.log(chalk.dim(`scope:  ${scope}`));
  console.log(chalk.dim(`command: ${server.command} ${server.args.join(' ')}`));
  console.log();

  if (scope === 'user') {
    await installUserScope(client, server, dryRun);
    return;
  }

  const targetDir = path.resolve(argv.target ?? '.');
  console.log(chalk.dim(`target: ${targetDir}`));
  await installProjectScope(client, targetDir, server, dryRun);
}

async function installProjectScope(
  client: McpClient,
  targetDir: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  switch (client) {
    case 'claude':
      await writeJsonMcpConfig(path.join(targetDir, '.mcp.json'), server, dryRun);
      printClaudeProjectFollowup(targetDir);
      break;
    case 'cursor':
      await writeJsonMcpConfig(path.join(targetDir, '.cursor', 'mcp.json'), server, dryRun);
      break;
    case 'codex':
      await writeCodexConfig(path.join(targetDir, '.codex', 'config.toml'), server, dryRun);
      break;
  }
}

async function installUserScope(
  client: McpClient,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const home = os.homedir();
  switch (client) {
    case 'claude': {
      const filePath = path.join(home, '.claude.json');
      await writeJsonMcpConfig(filePath, server, dryRun);
      printClaudeUserFollowup();
      break;
    }
    case 'cursor':
      await writeJsonMcpConfig(path.join(home, '.cursor', 'mcp.json'), server, dryRun);
      break;
    case 'codex':
      await writeCodexConfig(path.join(home, '.codex', 'config.toml'), server, dryRun);
      break;
  }
}

export function resolveServerInvocation(argv: McpInstallArgv): ResolvedServer {
  if (argv.command) {
    const [command, ...args] = argv.command.split(/\s+/).filter(Boolean);
    if (!command) {
      throw new Error('mrdj mcp install --command was empty.');
    }
    return { command, args };
  }

  const serverPath = argv.serverPath ?? findLocalServerEntry();
  if (serverPath) {
    return { command: 'node', args: [serverPath] };
  }

  return { command: 'npx', args: ['-y', '@mrdj/mcp-server'] };
}

function findLocalServerEntry(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    return require.resolve('@mrdj/mcp-server');
  } catch {
    return undefined;
  }
}

export async function writeMcpJsonToProject(targetDir: string): Promise<void> {
  const server = resolveServerInvocation({});
  const filePath = path.join(targetDir, '.mcp.json');
  const existing = await readJsonIfExists(filePath);
  const merged: Record<string, unknown> = existing ?? {};
  const servers = isRecord(merged.mcpServers) ? { ...merged.mcpServers } : {};
  if (servers[SERVER_KEY]) return;
  servers[SERVER_KEY] = { command: server.command, args: server.args };
  merged.mcpServers = servers;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
}

async function writeJsonMcpConfig(
  filePath: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const existing = await readJsonIfExists(filePath);
  const merged: Record<string, unknown> = existing ?? {};
  const servers = isRecord(merged.mcpServers) ? { ...merged.mcpServers } : {};
  servers[SERVER_KEY] = {
    command: server.command,
    args: server.args,
  };
  merged.mcpServers = servers;

  const json = `${JSON.stringify(merged, null, 2)}\n`;

  if (dryRun) {
    console.log(chalk.cyan('--dry-run output:'));
    console.log(chalk.gray(`# would write ${filePath}`));
    console.log(json);
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, json, 'utf8');
  console.log(chalk.green(`wrote ${filePath}`));
}

async function writeCodexConfig(
  filePath: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const existing = (await readTextIfExists(filePath)) ?? '';
  const cleaned = stripExistingCodexBlock(existing, SERVER_KEY);
  const block = renderCodexBlock(SERVER_KEY, server);
  const next = cleaned.length > 0 && !cleaned.endsWith('\n') ? `${cleaned}\n\n${block}` : `${cleaned}${block}`;

  if (dryRun) {
    console.log(chalk.cyan('--dry-run output:'));
    console.log(chalk.gray(`# would write ${filePath}`));
    console.log(next);
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, next, 'utf8');
  console.log(chalk.green(`wrote ${filePath}`));
}

export function renderCodexBlock(key: string, server: ResolvedServer): string {
  const argsLine = server.args.map((arg) => JSON.stringify(arg)).join(', ');
  return [`[mcp_servers.${key}]`, `command = ${JSON.stringify(server.command)}`, `args = [${argsLine}]`, ''].join('\n');
}

export function stripExistingCodexBlock(content: string, key: string): string {
  const header = `[mcp_servers.${key}]`;
  const start = content.indexOf(header);
  if (start === -1) {
    return content;
  }

  const after = content.slice(start);
  const nextHeader = after.search(/\n\[[^\]]+]/);
  const end = nextHeader === -1 ? content.length : start + nextHeader + 1;
  const before = content.slice(0, start).replace(/\n+$/, '');
  const tail = content.slice(end).replace(/^\n+/, '');
  return [before, tail].filter(Boolean).join('\n\n');
}

function printClaudeProjectFollowup(targetDir: string): void {
  console.log();
  console.log(chalk.bold('Next steps for Claude Code (project scope):'));
  console.log(`  1. Open ${targetDir} as a workspace in Claude Code (or restart Claude Code if already open).`);
  console.log('  2. Run /mcp to confirm the mrdj-dev-suite server is listed.');
  console.log('  3. Invoke the prompt: /mcp__mrdj-dev-suite__onboard_new_expo_app');
}

function printClaudeUserFollowup(): void {
  console.log();
  console.log(chalk.bold('Next steps for Claude Code (user scope):'));
  console.log('  1. Restart Claude Code so it picks up ~/.claude.json.');
  console.log('  2. From any workspace, run /mcp to confirm mrdj-dev-suite is listed.');
  console.log('  3. Available prompts:');
  console.log('       /mcp__mrdj-dev-suite__create_expo_super_stack    (run from a parent dir to create a new app)');
  console.log('       /mcp__mrdj-dev-suite__onboard_new_expo_app       (run inside an existing Expo app folder)');
}

async function readJsonIfExists(filePath: string): Promise<Record<string, unknown> | null> {
  const raw = await readTextIfExists(filePath);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
