import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

import chalk from 'chalk';

export type McpClient = 'claude' | 'codex' | 'cursor';

export interface McpInstallArgv {
  client?: McpClient;
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
  const targetDir = path.resolve(argv.target ?? '.');
  const server = resolveServerInvocation(argv);

  console.log(chalk.bold('mrdj mcp install'));
  console.log(chalk.dim(`client: ${client}`));
  console.log(chalk.dim(`target: ${targetDir}`));
  console.log(chalk.dim(`command: ${server.command} ${server.args.join(' ')}`));
  console.log();

  switch (client) {
    case 'claude':
      await writeJsonMcpConfig(targetDir, '.mcp.json', server, Boolean(argv.dryRun));
      printClaudeFollowup(targetDir);
      break;
    case 'cursor':
      await writeJsonMcpConfig(targetDir, path.join('.cursor', 'mcp.json'), server, Boolean(argv.dryRun));
      break;
    case 'codex':
      await writeCodexConfig(targetDir, server, Boolean(argv.dryRun));
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
    const resolved = require.resolve('@mrdj/mcp-server');
    return resolved;
  } catch {
    return undefined;
  }
}

async function writeJsonMcpConfig(
  targetDir: string,
  relativeFile: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const filePath = path.join(targetDir, relativeFile);
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
  targetDir: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const filePath = path.join(targetDir, '.codex', 'config.toml');
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

function printClaudeFollowup(targetDir: string): void {
  console.log();
  console.log(chalk.bold('Next steps for Claude Code:'));
  console.log('  1. Restart Claude Code or run `claude mcp reload`.');
  console.log(
    `  2. From inside ${targetDir}, invoke the MCP prompt: /mcp-prompt mrdj-dev-suite onboard_new_expo_app`
  );
  console.log('  3. Or use it from anywhere via `claude mcp add` with the same command shown above.');
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
