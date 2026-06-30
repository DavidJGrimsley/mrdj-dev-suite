import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import chalk from 'chalk';

export type McpClient = 'claude' | 'codex' | 'cursor' | 'vscode';
export type McpScope = 'user' | 'project';

export interface McpInstallArgv {
  client?: McpClient;
  scope?: McpScope;
  target?: string;
  serverPath?: string;
  command?: string;
  dryRun?: boolean;
}

export interface ResolvedServer {
  command: string;
  args: string[];
}

export interface ResolvedCommand {
  command: string;
  args: string[];
}

export const SERVER_KEY = 'mr-djs-dev-suite';
export const VSCODE_SERVER_KEY = 'mds';
export const PUBLISHED_MCP_SERVER_PACKAGE = '@mr.dj2u/mcp-server';
export const PUBLISHED_MCP_SERVER_VERSION = 'latest';
export const PUBLISHED_MCP_SERVER_SPEC = `${PUBLISHED_MCP_SERVER_PACKAGE}@${PUBLISHED_MCP_SERVER_VERSION}`;
export const MDS_MCP_SERVER_BIN = 'mds-mcp-server';
export const WINDOWS_MDS_MCP_SERVER_COMMAND = 'cmd';
export const WINDOWS_MDS_MCP_SERVER_ARGS = ['/c', `${MDS_MCP_SERVER_BIN}.cmd`];

export async function runMcpInstallCommand(argv: McpInstallArgv): Promise<void> {
  const client = argv.client ?? 'claude';
  const scope = argv.scope ?? 'user';
  const server = resolveServerInvocation(argv);
  const dryRun = Boolean(argv.dryRun);

  console.log(chalk.bold('mds mcp install'));
  console.log(chalk.dim(`client: ${client}`));
  console.log(chalk.dim(`scope:  ${scope}`));
  console.log(chalk.dim(`command: ${server.command} ${server.args.join(' ')}`));
  console.log();

  await ensurePublishedMcpServerRuntimeForInstall(argv, dryRun);

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
    case 'vscode':
      await writeVscodeMcpConfig(path.join(targetDir, '.vscode', 'mcp.json'), server, dryRun);
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
    case 'vscode':
      await installVscodeUserMcp(server, dryRun);
      break;
  }
}

export function resolveServerInvocation(argv: McpInstallArgv): ResolvedServer {
  if (argv.command) {
    const [command, ...args] = argv.command.split(/\s+/).filter(Boolean);
    if (!command) {
      throw new Error('mds mcp install --command was empty.');
    }
    return { command, args };
  }

  const serverPath = argv.serverPath;
  if (serverPath) {
    return { command: 'node', args: [serverPath] };
  }

  return resolvePublishedServerInvocation();
}

export function resolvePublishedServerInvocation(): ResolvedServer {
  if (process.platform === 'win32') {
    return { command: WINDOWS_MDS_MCP_SERVER_COMMAND, args: WINDOWS_MDS_MCP_SERVER_ARGS };
  }

  return { command: MDS_MCP_SERVER_BIN, args: [] };
}

export async function ensurePublishedMcpServerRuntimeForInstall(
  argv: Pick<McpInstallArgv, 'command' | 'serverPath'>,
  dryRun: boolean
): Promise<void> {
  if (argv.command || argv.serverPath) {
    return;
  }

  if (dryRun) {
    console.log(chalk.dim(`would ensure MCP runtime package ${PUBLISHED_MCP_SERVER_SPEC} is installed globally`));
    console.log();
    return;
  }

  console.log(chalk.dim(`ensuring MCP runtime package ${PUBLISHED_MCP_SERVER_SPEC} is installed globally...`));
  const npmInstall = resolveNpmInstallInvocation(PUBLISHED_MCP_SERVER_SPEC);
  await runCommand(npmInstall.command, npmInstall.args);
  console.log(chalk.green(`MCP runtime ready: ${MDS_MCP_SERVER_BIN}`));
  console.log();
}

export function resolveNpmInstallInvocation(packageSpec: string): ResolvedCommand {
  const npmCliPath = resolveNpmCliPath();
  if (npmCliPath) {
    return {
      command: process.execPath,
      args: [npmCliPath, 'install', '-g', '--no-audit', '--no-fund', packageSpec],
    };
  }

  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', 'install', '-g', '--no-audit', '--no-fund', packageSpec],
    };
  }

  return {
    command: 'npm',
    args: ['install', '-g', '--no-audit', '--no-fund', packageSpec],
  };
}

function resolveNpmCliPath(): string | null {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && isJavaScriptFile(npmExecPath) && existsSync(npmExecPath)) {
    return npmExecPath;
  }

  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve('npm/bin/npm-cli.js');
    if (existsSync(resolved)) {
      return resolved;
    }
  } catch {
    // npm is not always resolvable from globally installed packages.
  }

  const nodeDir = path.dirname(process.execPath);
  const candidates =
    process.platform === 'win32'
      ? [path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')]
      : [
          path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
          path.resolve(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function isJavaScriptFile(filePath: string): boolean {
  return /\.(?:c?js|mjs)$/iu.test(filePath);
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        if (stdout.trim()) {
          console.log(chalk.dim(stdout.trim()));
        }
        return resolve();
      }

      reject(
        new Error(
          [
            `Failed to install ${PUBLISHED_MCP_SERVER_SPEC} with ${command}.`,
            stderr.trim() || stdout.trim() || `exit code ${code ?? 'unknown'}`,
          ].join('\n')
        )
      );
    });
  });
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

export async function writeJsonMcpConfig(
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

export async function writeCodexConfig(
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

export async function writeVscodeMcpConfig(
  filePath: string,
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  const existing = await readJsonIfExists(filePath);
  const merged: Record<string, unknown> = existing ?? {};
  const servers = isRecord(merged.servers) ? { ...merged.servers } : {};
  servers[VSCODE_SERVER_KEY] = {
    command: server.command,
    args: server.args,
  };
  merged.servers = servers;

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

export async function installVscodeUserMcp(
  server: ResolvedServer,
  dryRun: boolean
): Promise<void> {
  await writeVscodeMcpConfig(resolveVscodeUserMcpConfigPath(), server, dryRun);
}

export function buildVscodeAddMcpPayload(server: ResolvedServer): Record<string, unknown> {
  return {
    name: VSCODE_SERVER_KEY,
    command: server.command,
    args: server.args,
  };
}

export function renderVscodeAddMcpCommand(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  if (process.platform === 'win32') {
    return `code --add-mcp '${json}'`;
  }

  return `code --add-mcp ${JSON.stringify(json)}`;
}

export function resolveVscodeUserMcpConfigPath(): string {
  if (process.platform === 'win32') {
    const appDataRoot = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appDataRoot, 'Code', 'User', 'mcp.json');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
  }

  return path.join(os.homedir(), '.config', 'Code', 'User', 'mcp.json');
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
  console.log('  2. Run /mcp to confirm the mr-djs-dev-suite server is listed.');
  console.log('  3. Invoke the prompt: /mcp__mr-djs-dev-suite__onboard_new_expo_app');
}

function printClaudeUserFollowup(): void {
  console.log();
  console.log(chalk.bold('Next steps for Claude Code (user scope):'));
  console.log('  1. Restart Claude Code so it picks up ~/.claude.json.');
  console.log('  2. From any workspace, run /mcp to confirm mr-djs-dev-suite is listed.');
  console.log('  3. Available prompts:');
  console.log('       /mcp__mr-djs-dev-suite__create_expo_super_stack    (run from a parent dir to create a new app)');
  console.log('       /mcp__mr-djs-dev-suite__onboard_new_expo_app       (run inside an existing Expo app folder)');
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

