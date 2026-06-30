import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';

import { runDoctor } from '@mr.dj2u/doctor';
import { readKnowledgeResource } from '@mr.dj2u/knowledge';
import { buildContinueSessionBrief } from '../continue.js';
import {
  ensurePublishedMcpServerRuntimeForInstall,
  installVscodeUserMcp,
  MDS_MCP_SERVER_BIN,
  WINDOWS_MDS_MCP_SERVER_ARGS,
  WINDOWS_MDS_MCP_SERVER_COMMAND,
  renderCodexBlock,
  resolveVscodeUserMcpConfigPath,
  resolveServerInvocation,
  stripExistingCodexBlock,
  writeJsonMcpConfig,
  writeVscodeMcpConfig,
} from './mcp-install.js';

export type AgentClient = 'vscode' | 'claude' | 'codex';
export type AgentScope = 'user' | 'project';
export type AgentAction = 'install' | 'verify';

export interface AgentArgv {
  action?: AgentAction;
  client?: AgentClient;
  scope?: AgentScope;
  target?: string;
  serverPath?: string;
  command?: string;
  dryRun?: boolean;
  bundlePath?: string;
}

export interface AgentInstallResult {
  client: AgentClient;
  scope: AgentScope;
  target: string;
  dryRun: boolean;
  writtenPaths: string[];
}

export interface AgentVerifyResult {
  client: AgentClient;
  scope: AgentScope;
  target: string;
  passed: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    path: string;
    message: string;
  }>;
}

const INSTRUCTIONS_BEGIN = '<!-- BEGIN MDS COPILOT INSTRUCTIONS -->';
const INSTRUCTIONS_END = '<!-- END MDS COPILOT INSTRUCTIONS -->';
const CLAUDE_INSTRUCTIONS_BEGIN = '<!-- BEGIN MDS CLAUDE INSTRUCTIONS -->';
const CLAUDE_INSTRUCTIONS_END = '<!-- END MDS CLAUDE INSTRUCTIONS -->';
const MDS_SERVER_KEY = 'mr-djs-dev-suite';
const CODEX_PLUGIN_NAME = 'mr-djs-dev-suite';
const CODEX_PLUGIN_SOURCE_PATH = `./plugins/${CODEX_PLUGIN_NAME}`;
const CODEX_MARKETPLACE_NAME = 'mds-local';
const CODEX_PLUGIN_CONFIG_ID = `${CODEX_PLUGIN_NAME}@${CODEX_MARKETPLACE_NAME}`;
const REQUIRED_MCP_TOOL_NAMES = [
  'mds_runtime_versions',
  'create_expo_super_stack_resolve_info',
  'create_expo_super_stack_generate',
];
const MCP_RUNTIME_VERIFY_TIMEOUT_MS = 15000;
const BUNDLED_PLUGIN_DIRS: Record<AgentClient, string> = {
  vscode: 'vscode-copilot',
  claude: 'claude-code',
  codex: 'codex',
};

interface InstructionMarkers {
  begin: string;
  end: string;
}

export async function runAgentCommand(argv: AgentArgv): Promise<void> {
  if ((argv.action ?? 'install') === 'verify') {
    await runAgentVerifyCommand(argv);
    return;
  }

  await runAgentInstallCommand(argv);
}

export async function runAgentInstallCommand(argv: AgentArgv): Promise<AgentInstallResult> {
  const client = argv.client ?? 'vscode';
  const scope = argv.scope ?? 'project';
  const dryRun = Boolean(argv.dryRun);
  const bundleRoot = resolvePluginBundleRoot(client, argv.bundlePath);
  const server = resolveServerInvocation({
    serverPath: argv.serverPath,
    command: argv.command,
  });
  const writtenPaths: string[] = [];

  console.log(chalk.bold('mds agent install'));
  console.log(chalk.dim(`client: ${client}`));
  console.log(chalk.dim(`scope:  ${scope}`));
  console.log(chalk.dim(`bundle: ${bundleRoot}`));
  console.log();

  await ensurePublishedMcpServerRuntimeForInstall(
    {
      serverPath: argv.serverPath,
      command: argv.command,
    },
    dryRun
  );

  if (client === 'vscode') {
    return await installVscodeAgent(argv, scope, dryRun, bundleRoot, server, writtenPaths);
  }

  if (client === 'claude') {
    return await installClaudeAgent(argv, scope, dryRun, bundleRoot, server, writtenPaths);
  }

  return await installCodexAgent(argv, scope, dryRun, bundleRoot, server, writtenPaths);
}

export async function runAgentVerifyCommand(argv: AgentArgv): Promise<AgentVerifyResult> {
  const client = argv.client ?? 'vscode';
  const result = await withMcpRuntimeVerification(await resolveAgentVerifyResult(client, argv));

  console.log(chalk.bold('mds agent verify'));
  console.log(chalk.dim(`client: ${client}`));
  console.log(chalk.dim(`scope:  ${result.scope}`));
  console.log(chalk.dim(`target: ${result.target}`));
  console.log();
  for (const check of result.checks) {
    const label = check.status === 'pass' ? chalk.green('PASS') : chalk.red('FAIL');
    console.log(`${label} ${check.name}: ${check.message}`);
    console.log(chalk.dim(`  ${check.path}`));
  }

  if (!result.passed) {
    process.exitCode = 1;
  }

  return result;
}

async function resolveAgentVerifyResult(client: AgentClient, argv: AgentArgv): Promise<AgentVerifyResult> {
  if (argv.scope) {
    const target = resolveAgentVerifyTarget(client, argv.scope, argv.target);
    return await verifyAgentInstall(client, target, argv.scope);
  }

  const projectTarget = resolveAgentVerifyTarget(client, 'project', argv.target);
  const projectResult = await verifyAgentInstall(client, projectTarget, 'project');
  if (projectResult.passed) {
    return projectResult;
  }

  const userTarget = resolveAgentVerifyTarget(client, 'user', argv.target);
  const userResult = await verifyAgentInstall(client, userTarget, 'user');
  return userResult.passed ? userResult : projectResult;
}

async function withMcpRuntimeVerification(result: AgentVerifyResult): Promise<AgentVerifyResult> {
  const server = await readConfiguredMcpServer(result);
  if (!server || !shouldVerifyMcpRuntime(server)) {
    return result;
  }

  const runtimeCheck = await checkMcpRuntimeTools(server);
  const checks = [...result.checks, runtimeCheck];
  return {
    ...result,
    passed: result.passed && runtimeCheck.status === 'pass',
    checks,
  };
}

async function readConfiguredMcpServer(result: AgentVerifyResult): Promise<ReturnType<typeof resolveServerInvocation> | null> {
  if (result.client === 'codex') {
    return await readJsonMcpServer(path.join(result.target, 'plugins', CODEX_PLUGIN_NAME, '.mcp.json'), 'mcpServers', MDS_SERVER_KEY);
  }

  if (result.client === 'vscode') {
    const filePath =
      result.scope === 'user' ? resolveVscodeUserMcpConfigPath() : path.join(result.target, '.vscode', 'mcp.json');
    return await readJsonMcpServer(filePath, 'servers', 'mds');
  }

  const filePath = result.scope === 'user' ? path.join(path.dirname(result.target), '.claude.json') : path.join(result.target, '.mcp.json');
  return await readJsonMcpServer(filePath, 'mcpServers', MDS_SERVER_KEY);
}

async function readJsonMcpServer(
  filePath: string,
  containerKey: 'mcpServers' | 'servers',
  serverKey: string
): Promise<ReturnType<typeof resolveServerInvocation> | null> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const container = isRecord(parsed[containerKey]) ? parsed[containerKey] : null;
    const server = isRecord(container?.[serverKey]) ? container[serverKey] : null;
    const command = typeof server?.command === 'string' ? server.command : null;
    const args = Array.isArray(server?.args) ? server.args.filter((arg): arg is string => typeof arg === 'string') : [];
    return command ? { command, args } : null;
  } catch {
    return null;
  }
}

function shouldVerifyMcpRuntime(server: ReturnType<typeof resolveServerInvocation>): boolean {
  if (server.command === MDS_MCP_SERVER_BIN && server.args.length === 0) {
    return true;
  }

  return (
    (server.command === WINDOWS_MDS_MCP_SERVER_COMMAND || server.command === 'cmd.exe') &&
    server.args.length === WINDOWS_MDS_MCP_SERVER_ARGS.length &&
    server.args.every((arg, index) => arg === WINDOWS_MDS_MCP_SERVER_ARGS[index])
  );
}

async function checkMcpRuntimeTools(
  server: ReturnType<typeof resolveServerInvocation>
): Promise<AgentVerifyResult['checks'][number]> {
  const display = [server.command, ...server.args].join(' ');
  let closeClient: (() => Promise<void>) | undefined;

  try {
    const result = await withTimeout(async () => {
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
      });
      const client = new Client(
        {
          name: 'mds-agent-verify',
          version: '0.0.0',
        },
        {
          capabilities: {},
        }
      );
      closeClient = () => client.close();
      await client.connect(transport);
      return await client.listTools();
    }, MCP_RUNTIME_VERIFY_TIMEOUT_MS);

    const toolNames = new Set(result.tools.map((tool) => tool.name));
    const missing = REQUIRED_MCP_TOOL_NAMES.filter((toolName) => !toolNames.has(toolName));
    return {
      name: 'MCP runtime tools',
      status: missing.length === 0 ? 'pass' : 'fail',
      path: display,
      message:
        missing.length === 0
          ? `MCP server started and exposed required Super Stack tools.`
          : `MCP server started, but missing required tools: ${missing.join(', ')}.`,
    };
  } catch (error) {
    return {
      name: 'MCP runtime tools',
      status: 'fail',
      path: display,
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await closeClient?.().catch(() => undefined);
  }
}

async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`MCP runtime did not respond within ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function verifyAgentInstall(
  client: AgentClient,
  target: string,
  scope: AgentScope = 'project'
): Promise<AgentVerifyResult> {
  switch (client) {
    case 'vscode':
      return await verifyVscodeAgentInstall(target, scope);
    case 'claude':
      return await verifyClaudeAgentInstall(target, scope);
    case 'codex':
      return await verifyCodexAgentInstall(target, scope);
  }
}

export async function verifyVscodeAgentInstall(
  target: string,
  scope: AgentScope = 'project'
): Promise<AgentVerifyResult> {
  const checks: AgentVerifyResult['checks'] = [];

  if (scope === 'user') {
    const userMcpPath = resolveVscodeUserMcpConfigPath();
    const instructionsPath = path.join(target, 'instructions.md');
    const agentPath = path.join(target, 'agents', 'mds.agent.md');
    const skillsPath = path.join(target, 'skills');

    checks.push(await checkVscodeMcp(userMcpPath));
    checks.push(await checkContainsMarker('copilot instructions', instructionsPath, INSTRUCTIONS_BEGIN));
    checks.push(await checkExists('MDS custom agent', agentPath));
    checks.push(await checkDirectoryContains('skill files', skillsPath, 'SKILL.md'));

    return {
      client: 'vscode',
      scope,
      target,
      passed: checks.every((check) => check.status === 'pass'),
      checks,
    };
  }

  const mcpPath = path.join(target, '.vscode', 'mcp.json');
  const settingsPath = path.join(target, '.vscode', 'settings.json');
  const instructionsPath = path.join(target, '.github', 'copilot-instructions.md');
  const agentPath = path.join(target, '.github', 'agents', 'mds.agent.md');
  const promptsPath = path.join(target, '.github', 'prompts');
  const skillsPath = path.join(target, '.github', 'skills');

  checks.push(await checkVscodeMcp(mcpPath));
  checks.push(await checkVscodeSettings(settingsPath));
  checks.push(await checkContainsMarker('copilot instructions', instructionsPath, INSTRUCTIONS_BEGIN));
  checks.push(await checkExists('MDS custom agent', agentPath));
  checks.push(await checkDirectoryContains('prompt files', promptsPath, '.prompt.md'));
  checks.push(await checkDirectoryContains('skill files', skillsPath, 'SKILL.md'));
  checks.push(...(await runValidationChecks(target)));

  return {
    client: 'vscode',
    scope,
    target,
    passed: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

export async function verifyClaudeAgentInstall(
  target: string,
  scope: AgentScope = 'project'
): Promise<AgentVerifyResult> {
  const checks: AgentVerifyResult['checks'] = [];
  const claudeRoot = scope === 'user' ? target : path.join(target, '.claude');
  const mcpPath = scope === 'user' ? path.join(path.dirname(target), '.claude.json') : path.join(target, '.mcp.json');
  const instructionsPath = path.join(target, 'CLAUDE.md');
  const agentPath = path.join(claudeRoot, 'agents', 'mds.md');
  const commandsPath = path.join(claudeRoot, 'commands');
  const skillsPath = path.join(claudeRoot, 'skills');

  checks.push(await checkJsonMcp('Claude MCP config', mcpPath));
  checks.push(await checkContainsMarker('Claude instructions', instructionsPath, CLAUDE_INSTRUCTIONS_BEGIN));
  checks.push(await checkExists('MDS Claude agent', agentPath));
  checks.push(await checkDirectoryContains('Claude slash commands', commandsPath, '.md'));
  checks.push(await checkDirectoryContains('Claude skills', skillsPath, 'SKILL.md'));
  if (scope === 'project') {
    checks.push(...(await runValidationChecks(target)));
  }

  return {
    client: 'claude',
    scope,
    target,
    passed: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

export async function verifyCodexAgentInstall(
  target: string,
  scope: AgentScope = 'project'
): Promise<AgentVerifyResult> {
  const checks: AgentVerifyResult['checks'] = [];
  const configPath = path.join(target, '.codex', 'config.toml');
  const marketplacePath = path.join(target, '.agents', 'plugins', 'marketplace.json');
  const pluginRoot = path.join(target, 'plugins', CODEX_PLUGIN_NAME);

  checks.push(await checkCodexConfig(configPath, target));
  checks.push(await checkMarketplaceEntry(marketplacePath));
  checks.push(await checkExists('Codex plugin manifest', path.join(pluginRoot, '.codex-plugin', 'plugin.json')));
  checks.push(await checkCodexPluginMcpConfig(path.join(pluginRoot, '.mcp.json')));
  checks.push(await checkDirectoryContains('Codex plugin skills', path.join(pluginRoot, 'skills'), 'SKILL.md'));
  if (scope === 'project') {
    checks.push(...(await runValidationChecks(target)));
  }

  return {
    client: 'codex',
    scope,
    target,
    passed: checks.every((check) => check.status === 'pass'),
    checks,
  };
}

async function installVscodeAgent(
  argv: AgentArgv,
  scope: AgentScope,
  dryRun: boolean,
  bundleRoot: string,
  server: ReturnType<typeof resolveServerInvocation>,
  writtenPaths: string[]
): Promise<AgentInstallResult> {
  if (scope === 'user') {
    const target = path.join(os.homedir(), '.copilot');
    await installVscodeUserAssets(bundleRoot, target, dryRun, writtenPaths);
    await installVscodeUserMcp(server, dryRun);
    return {
      client: 'vscode',
      scope,
      target,
      dryRun,
      writtenPaths,
    };
  }

  const target = path.resolve(argv.target ?? '.');
  await writeVscodeMcpConfig(path.join(target, '.vscode', 'mcp.json'), server, dryRun);
  writtenPaths.push(path.join(target, '.vscode', 'mcp.json'));
  await mergeJsonFile(
    path.join(bundleRoot, '.vscode', 'settings.json'),
    path.join(target, '.vscode', 'settings.json'),
    dryRun,
    writtenPaths
  );
  await installVscodeProjectAssets(bundleRoot, target, dryRun, writtenPaths);
  printProjectInstallFollowup(target, 'vscode');

  return {
    client: 'vscode',
    scope,
    target,
    dryRun,
    writtenPaths,
  };
}

async function installClaudeAgent(
  argv: AgentArgv,
  scope: AgentScope,
  dryRun: boolean,
  bundleRoot: string,
  server: ReturnType<typeof resolveServerInvocation>,
  writtenPaths: string[]
): Promise<AgentInstallResult> {
  if (scope === 'user') {
    const target = path.join(os.homedir(), '.claude');
    await writeJsonMcpConfig(path.join(os.homedir(), '.claude.json'), server, dryRun);
    writtenPaths.push(path.join(os.homedir(), '.claude.json'));
    await installClaudeSharedAssets(bundleRoot, target, dryRun, writtenPaths);
    await upsertInstructions(
      path.join(bundleRoot, 'CLAUDE.md'),
      path.join(target, 'CLAUDE.md'),
      dryRun,
      writtenPaths,
      { begin: CLAUDE_INSTRUCTIONS_BEGIN, end: CLAUDE_INSTRUCTIONS_END }
    );
    printUserInstallFollowup(target, 'claude');
    return {
      client: 'claude',
      scope,
      target,
      dryRun,
      writtenPaths,
    };
  }

  const target = path.resolve(argv.target ?? '.');
  await writeJsonMcpConfig(path.join(target, '.mcp.json'), server, dryRun);
  writtenPaths.push(path.join(target, '.mcp.json'));
  await installClaudeSharedAssets(bundleRoot, path.join(target, '.claude'), dryRun, writtenPaths);
  await upsertInstructions(
    path.join(bundleRoot, 'CLAUDE.md'),
    path.join(target, 'CLAUDE.md'),
    dryRun,
    writtenPaths,
    { begin: CLAUDE_INSTRUCTIONS_BEGIN, end: CLAUDE_INSTRUCTIONS_END }
  );
  printProjectInstallFollowup(target, 'claude');

  return {
    client: 'claude',
    scope,
    target,
    dryRun,
    writtenPaths,
  };
}

async function installCodexAgent(
  argv: AgentArgv,
  scope: AgentScope,
  dryRun: boolean,
  bundleRoot: string,
  server: ReturnType<typeof resolveServerInvocation>,
  writtenPaths: string[]
): Promise<AgentInstallResult> {
  const target = scope === 'user' ? os.homedir() : path.resolve(argv.target ?? '.');
  await writeCodexAgentConfig(path.join(target, '.codex', 'config.toml'), server, target, dryRun, writtenPaths);
  await installCodexPluginAssets(bundleRoot, target, server, dryRun, writtenPaths);
  if (scope === 'user') {
    printUserInstallFollowup(target, 'codex');
  } else {
    printProjectInstallFollowup(target, 'codex');
  }

  return {
    client: 'codex',
    scope,
    target,
    dryRun,
    writtenPaths,
  };
}

async function runValidationChecks(target: string): Promise<AgentVerifyResult['checks']> {
  const checks: AgentVerifyResult['checks'] = [];

  try {
    const report = await runDoctor(target, { mode: 'fast', runScripts: false });
    checks.push({
      name: 'Doctor validation',
      status: 'pass',
      path: target,
      message: `Doctor ran: ${report.summary.errors} errors, ${report.summary.warnings} warnings.`,
    });
  } catch (error) {
    checks.push({
      name: 'Doctor validation',
      status: 'fail',
      path: target,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const guide = await readKnowledgeResource('mds://guides/post-create-onboarding');
    checks.push({
      name: 'Knowledge guide validation',
      status: guide?.content ? 'pass' : 'fail',
      path: 'mds://guides/post-create-onboarding',
      message: guide?.content ? 'Fetched a bundled knowledge guide.' : 'Could not fetch the bundled guide.',
    });
  } catch (error) {
    checks.push({
      name: 'Knowledge guide validation',
      status: 'fail',
      path: 'mds://guides/post-create-onboarding',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const brief = await buildContinueSessionBrief(target);
    checks.push({
      name: 'CLI workflow validation',
      status: 'pass',
      path: target,
      message: `MDS Continue workflow ran with recommendation "${brief.recommendation.priority}".`,
    });
  } catch (error) {
    checks.push({
      name: 'CLI workflow validation',
      status: 'fail',
      path: target,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return checks;
}

export function resolveVscodeBundleRoot(bundlePath?: string): string {
  return resolvePluginBundleRoot('vscode', bundlePath);
}

export function resolvePluginBundleRoot(client: AgentClient, bundlePath?: string): string {
  if (bundlePath) {
    return path.resolve(bundlePath);
  }

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = path.resolve(moduleDir, '..', '..');
  const bundledDir = path.join(packageRoot, 'bundles', BUNDLED_PLUGIN_DIRS[client]);
  if (pathExistsSync(bundledDir)) {
    return bundledDir;
  }

  const repoRoot = path.resolve(moduleDir, '..', '..', '..', '..');

  switch (client) {
    case 'vscode':
      return path.join(repoRoot, 'plugins', 'vscode-copilot');
    case 'claude':
      return path.join(repoRoot, 'plugins', 'claude-code');
    case 'codex':
      return path.join(repoRoot, 'plugins', 'codex');
  }
}

function resolveAgentVerifyTarget(client: AgentClient, scope: AgentScope, target?: string): string {
  if (scope === 'project') {
    return path.resolve(target ?? '.');
  }

  switch (client) {
    case 'vscode':
      return path.join(os.homedir(), '.copilot');
    case 'claude':
      return path.join(os.homedir(), '.claude');
    case 'codex':
      return os.homedir();
  }
}

async function installVscodeProjectAssets(
  bundleRoot: string,
  target: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  await upsertInstructions(
    path.join(bundleRoot, '.github', 'copilot-instructions.md'),
    path.join(target, '.github', 'copilot-instructions.md'),
    dryRun,
    writtenPaths,
    { begin: INSTRUCTIONS_BEGIN, end: INSTRUCTIONS_END }
  );
  await copyTree(path.join(bundleRoot, '.github', 'agents'), path.join(target, '.github', 'agents'), dryRun, writtenPaths);
  await copyTree(path.join(bundleRoot, '.github', 'prompts'), path.join(target, '.github', 'prompts'), dryRun, writtenPaths);
  await copyTree(path.join(bundleRoot, '.github', 'skills'), path.join(target, '.github', 'skills'), dryRun, writtenPaths);
}

async function installVscodeUserAssets(
  bundleRoot: string,
  target: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  await upsertInstructions(
    path.join(bundleRoot, 'user', '.copilot', 'instructions.md'),
    path.join(target, 'instructions.md'),
    dryRun,
    writtenPaths,
    { begin: INSTRUCTIONS_BEGIN, end: INSTRUCTIONS_END }
  );
  await copyTree(path.join(bundleRoot, 'user', '.copilot', 'agents'), path.join(target, 'agents'), dryRun, writtenPaths);
  await copyTree(path.join(bundleRoot, 'user', '.copilot', 'skills'), path.join(target, 'skills'), dryRun, writtenPaths);
}

async function installClaudeSharedAssets(
  bundleRoot: string,
  claudeRoot: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  await copyTree(path.join(bundleRoot, 'commands'), path.join(claudeRoot, 'commands'), dryRun, writtenPaths);
  await copyTree(path.join(bundleRoot, 'agents'), path.join(claudeRoot, 'agents'), dryRun, writtenPaths);
  await copyTree(path.join(bundleRoot, 'skills'), path.join(claudeRoot, 'skills'), dryRun, writtenPaths);
}

async function installCodexPluginAssets(
  bundleRoot: string,
  installRoot: string,
  server: ReturnType<typeof resolveServerInvocation>,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  const pluginRoot = path.join(installRoot, 'plugins', CODEX_PLUGIN_NAME);
  await copyTree(bundleRoot, pluginRoot, dryRun, writtenPaths);
  await writeCodexPluginMcpConfig(pluginRoot, server, dryRun, writtenPaths);
  await upsertCodexMarketplace(
    path.join(installRoot, '.agents', 'plugins', 'marketplace.json'),
    CODEX_PLUGIN_SOURCE_PATH,
    dryRun,
    writtenPaths
  );
}

async function writeCodexAgentConfig(
  configPath: string,
  server: ReturnType<typeof resolveServerInvocation>,
  marketplaceSourceRoot: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  const existing = (await readTextIfExists(configPath)) ?? '';
  const cleaned = [
    (content: string) => stripExistingCodexBlock(content, MDS_SERVER_KEY),
    (content: string) => stripTomlBlock(content, `[marketplaces.${CODEX_MARKETPLACE_NAME}]`),
    (content: string) => stripTomlBlock(content, `[plugins.${JSON.stringify(CODEX_PLUGIN_CONFIG_ID)}]`),
  ].reduce((content, strip) => strip(content), existing);
  const next = appendTomlBlocks(cleaned, [
    renderCodexBlock(MDS_SERVER_KEY, server),
    renderCodexMarketplaceBlock(CODEX_MARKETPLACE_NAME, marketplaceSourceRoot),
    renderCodexPluginEnableBlock(CODEX_PLUGIN_CONFIG_ID),
  ]);

  await writeText(configPath, next, dryRun, writtenPaths);
}

async function writeCodexPluginMcpConfig(
  pluginRoot: string,
  server: ReturnType<typeof resolveServerInvocation>,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  const config = {
    mcpServers: {
      [MDS_SERVER_KEY]: {
        command: server.command,
        args: server.args,
      },
    },
  };
  await writeText(path.join(pluginRoot, '.mcp.json'), `${JSON.stringify(config, null, 2)}\n`, dryRun, writtenPaths);
}

async function upsertInstructions(
  sourcePath: string,
  destinationPath: string,
  dryRun: boolean,
  writtenPaths: string[],
  markers: InstructionMarkers
): Promise<void> {
  const source = await readFile(sourcePath, 'utf8');
  const existing = await readTextIfExists(destinationPath);
  const sourceBlock = source.includes(markers.begin)
    ? source
    : `${markers.begin}\n${source.trim()}\n${markers.end}\n`;
  const next = upsertMarkedBlock(existing ?? '', sourceBlock, markers);
  await writeText(destinationPath, next, dryRun, writtenPaths);
}

async function mergeJsonFile(
  sourcePath: string,
  destinationPath: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  const source = JSON.parse(await readFile(sourcePath, 'utf8')) as Record<string, unknown>;
  const existingRaw = await readTextIfExists(destinationPath);
  const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {};
  const next = deepMerge(existing, source);
  await writeText(destinationPath, `${JSON.stringify(next, null, 2)}\n`, dryRun, writtenPaths);
}

async function upsertCodexMarketplace(
  marketplacePath: string,
  pluginSourcePath: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  const existingRaw = await readTextIfExists(marketplacePath);
  const existing = existingRaw ? parseJsonObject(existingRaw, marketplacePath) : {};
  const marketplace: Record<string, unknown> = {
    ...existing,
    name: typeof existing.name === 'string' ? existing.name : 'mds-local',
    interface: isRecord(existing.interface) ? existing.interface : { displayName: 'MDS Local Plugins' },
  };
  const existingPlugins = Array.isArray(existing.plugins) ? existing.plugins : [];
  const nextEntry = {
    name: CODEX_PLUGIN_NAME,
    source: {
      source: 'local',
      path: pluginSourcePath,
    },
    policy: {
      installation: 'AVAILABLE',
      authentication: 'ON_INSTALL',
    },
    category: 'Coding',
  };
  const plugins = existingPlugins.filter((plugin) => !isRecord(plugin) || plugin.name !== CODEX_PLUGIN_NAME);
  plugins.push(nextEntry);
  marketplace.plugins = plugins;

  await writeText(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, dryRun, writtenPaths);
}

function upsertMarkedBlock(existing: string, block: string, markers: InstructionMarkers): string {
  const trimmedBlock = block.trim();
  const start = existing.indexOf(markers.begin);
  const end = existing.indexOf(markers.end);
  if (start !== -1 && end !== -1 && end > start) {
    const afterEnd = end + markers.end.length;
    return `${existing.slice(0, start).trimEnd()}\n\n${trimmedBlock}\n\n${existing.slice(afterEnd).trimStart()}`.trimStart();
  }

  return existing.trim().length > 0 ? `${existing.trimEnd()}\n\n${trimmedBlock}\n` : `${trimmedBlock}\n`;
}

function appendTomlBlocks(existing: string, blocks: string[]): string {
  const content = existing.trimEnd();
  const blockText = blocks.map((block) => block.trim()).filter(Boolean).join('\n\n');
  return content.length > 0 ? `${content}\n\n${blockText}\n` : `${blockText}\n`;
}

function stripTomlBlock(content: string, header: string): string {
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

function readTomlBlock(content: string, header: string): string {
  const start = content.indexOf(header);
  if (start === -1) {
    return '';
  }

  const after = content.slice(start);
  const nextHeader = after.search(/\n\[[^\]]+]/);
  const end = nextHeader === -1 ? content.length : start + nextHeader + 1;
  return content.slice(start, end);
}

function renderCodexMarketplaceBlock(name: string, sourceRoot: string): string {
  return [`[marketplaces.${name}]`, 'source_type = "local"', `source = ${JSON.stringify(sourceRoot)}`, ''].join('\n');
}

function renderCodexPluginEnableBlock(pluginConfigId: string): string {
  return [`[plugins.${JSON.stringify(pluginConfigId)}]`, 'enabled = true', ''].join('\n');
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = merged[key];
    if (isRecord(current) && isRecord(value)) {
      merged[key] = deepMerge(current, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

async function copyTree(
  sourceDir: string,
  destinationDir: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  if (dryRun) {
    const files = await listFiles(sourceDir);
    for (const file of files) {
      writtenPaths.push(path.join(destinationDir, path.relative(sourceDir, file)));
    }
    printDryRunTree(sourceDir, destinationDir);
    return;
  }

  await mkdir(destinationDir, { recursive: true });
  await cp(sourceDir, destinationDir, { recursive: true, force: true });
  const files = await listFiles(destinationDir);
  writtenPaths.push(...files);
  console.log(chalk.green(`copied ${sourceDir} -> ${destinationDir}`));
}

async function writeText(
  filePath: string,
  content: string,
  dryRun: boolean,
  writtenPaths: string[]
): Promise<void> {
  writtenPaths.push(filePath);
  if (dryRun) {
    console.log(chalk.cyan('--dry-run output:'));
    console.log(chalk.gray(`# would write ${filePath}`));
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  console.log(chalk.green(`wrote ${filePath}`));
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(filePath)));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }
  return files;
}

function printDryRunTree(sourceDir: string, destinationDir: string): void {
  console.log(chalk.cyan('--dry-run output:'));
  console.log(chalk.gray(`# would copy ${sourceDir} -> ${destinationDir}`));
}

function printProjectInstallFollowup(target: string, client: AgentClient): void {
  console.log();
  if (client === 'vscode') {
    console.log(chalk.bold('Next steps for VS Code Copilot (project scope):'));
    console.log(`  1. Open ${target} in VS Code.`);
    console.log('  2. Confirm the mds MCP server is enabled when Copilot prompts for MCP trust.');
    console.log('  3. Run `mds agent verify --client vscode --target .` from the project root.');
    return;
  }

  if (client === 'claude') {
    console.log(chalk.bold('Next steps for Claude Code (project scope):'));
    console.log(`  1. Open ${target} in Claude Code or restart Claude Code if it is already open.`);
    console.log('  2. Run `/mcp` to confirm the mr-djs-dev-suite server is listed.');
    console.log('  3. Use the `mds` agent or MDS slash commands such as `/run-doctor`.');
    return;
  }

  console.log(chalk.bold('Next steps for Codex (project scope):'));
  console.log(`  1. Open ${target} in Codex.`);
  console.log("  2. Type `@Mr. DJ's Dev Suite` in chat to get the install pop-up.");
  console.log('  3. Hit Install.');
  console.log("Use with `@Mr. DJ's Dev Suite` in Codex Desktop or the Codex extension for VS Code.");
  console.log('Run `mds agent verify --client codex --scope project --target .` from the project root.');
}

function printUserInstallFollowup(target: string, client: Exclude<AgentClient, 'vscode'>): void {
  console.log();
  if (client === 'claude') {
    console.log(chalk.bold('Next steps for Claude Code (user scope):'));
    console.log(`  1. Restart Claude Code so it picks up assets in ${target}.`);
    console.log('  2. Run `/mcp` to confirm mr-djs-dev-suite is listed.');
    console.log('  3. Use the `mds` agent or MDS slash commands from any workspace.');
    return;
  }

  console.log(chalk.bold('Next steps for Codex (user scope):'));
  console.log("  1. Restart Codex so it picks up the Mr. DJ's Dev Suite plugin.");
  console.log("  2. Type `@Mr. DJ's Dev Suite` in chat to get the install pop-up.");
  console.log('  3. Hit Install.');
  console.log("Use with `@Mr. DJ's Dev Suite` in Codex Desktop or the Codex extension for VS Code.");
  console.log('Run `mds agent verify --client codex --scope user` from any workspace.');
}

async function checkVscodeMcp(filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return {
      name: 'VS Code MCP config',
      status: 'fail',
      path: filePath,
      message: '.vscode/mcp.json is missing.',
    };
  }

  try {
    const parsed = JSON.parse(raw) as { servers?: Record<string, unknown> };
    const server = isRecord(parsed.servers?.mds) ? parsed.servers.mds : null;
    if (isValidMdsMcpServerInvocation(server)) {
      return {
        name: 'VS Code MCP config',
        status: 'pass',
        path: filePath,
        message: 'mds server invocation is valid.',
      };
    }
  } catch {
    return {
      name: 'VS Code MCP config',
      status: 'fail',
      path: filePath,
      message: '.vscode/mcp.json is not valid JSON.',
    };
  }

  return {
    name: 'VS Code MCP config',
    status: 'fail',
    path: filePath,
    message: 'mds server is missing or uses an invalid invocation.',
  };
}

async function checkJsonMcp(name: string, filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return {
      name,
      status: 'fail',
      path: filePath,
      message: 'MCP config file is missing.',
    };
  }

  try {
    const parsed = JSON.parse(raw) as { mcpServers?: Record<string, unknown> };
    const server = isRecord(parsed.mcpServers?.[MDS_SERVER_KEY]) ? parsed.mcpServers[MDS_SERVER_KEY] : null;
    if (isValidMdsMcpServerInvocation(server)) {
      return {
        name,
        status: 'pass',
        path: filePath,
        message: `${MDS_SERVER_KEY} server invocation is valid.`,
      };
    }
  } catch {
    return {
      name,
      status: 'fail',
      path: filePath,
      message: 'MCP config file is not valid JSON.',
    };
  }

  return {
    name,
    status: 'fail',
    path: filePath,
    message: `${MDS_SERVER_KEY} server is missing or uses an invalid invocation.`,
  };
}

async function checkCodexConfig(
  filePath: string,
  marketplaceSourceRoot: string
): Promise<AgentVerifyResult['checks'][number]> {
  const raw = (await readTextIfExists(filePath)) ?? '';
  const marketplaceHeader = `[marketplaces.${CODEX_MARKETPLACE_NAME}]`;
  const pluginHeader = `[plugins.${JSON.stringify(CODEX_PLUGIN_CONFIG_ID)}]`;
  const marketplaceBlock = readTomlBlock(raw, marketplaceHeader);
  const pluginBlock = readTomlBlock(raw, pluginHeader);
  const directServerBlock = readTomlBlock(raw, `[mcp_servers.${MDS_SERVER_KEY}]`);
  const hasMarketplace = marketplaceBlock.includes(`source = ${JSON.stringify(marketplaceSourceRoot)}`);
  const hasEnabledPlugin = pluginBlock.includes('enabled = true');
  const hasLegacyDirectServer =
    directServerBlock.includes('args = ["-y", "@mr.dj2u/mcp-server"]') ||
    directServerBlock.includes("args = ['-y', '@mr.dj2u/mcp-server']");
  const missing = [
    hasMarketplace ? null : `${CODEX_MARKETPLACE_NAME} marketplace block`,
    hasEnabledPlugin ? null : `${CODEX_PLUGIN_CONFIG_ID} plugin enable block`,
    hasLegacyDirectServer ? 'working MCP server command' : null,
  ].filter((entry): entry is string => entry !== null);

  return {
    name: 'Codex MCP config',
    status: missing.length === 0 ? 'pass' : 'fail',
    path: filePath,
    message:
      missing.length === 0
        ? `Local marketplace and plugin enable blocks are configured.`
        : `Missing ${missing.join(', ')}.`,
  };
}

async function checkCodexPluginMcpConfig(filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return {
      name: 'Codex plugin MCP config',
      status: 'fail',
      path: filePath,
      message: '.mcp.json is missing.',
    };
  }

  try {
    const parsed = JSON.parse(raw) as { mcpServers?: Record<string, unknown> };
    const server = isRecord(parsed.mcpServers?.[MDS_SERVER_KEY]) ? parsed.mcpServers[MDS_SERVER_KEY] : null;
    const valid = isValidMdsMcpServerInvocation(server);

    return {
      name: 'Codex plugin MCP config',
      status: valid ? 'pass' : 'fail',
      path: filePath,
      message: valid
        ? 'mr-djs-dev-suite MCP server invocation is valid.'
        : `mr-djs-dev-suite MCP server must use the installed \`${MDS_MCP_SERVER_BIN}\` command or an explicit local node server path.`,
    };
  } catch {
    return {
      name: 'Codex plugin MCP config',
      status: 'fail',
      path: filePath,
      message: '.mcp.json is not valid JSON.',
    };
  }
}

function isValidMdsMcpServerInvocation(server: Record<string, unknown> | null): boolean {
  const command = typeof server?.command === 'string' ? server.command : '';
  const args = Array.isArray(server?.args) ? server.args : [];

  if (command === 'node') {
    return args.length > 0 && args.every((arg) => typeof arg === 'string');
  }

  if (command === MDS_MCP_SERVER_BIN) {
    return args.length === 0;
  }

  if (command === WINDOWS_MDS_MCP_SERVER_COMMAND || command === 'cmd.exe') {
    return (
      args.length === WINDOWS_MDS_MCP_SERVER_ARGS.length &&
      args.every((arg, index) => arg === WINDOWS_MDS_MCP_SERVER_ARGS[index])
    );
  }

  return false;
}

async function checkMarketplaceEntry(filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return {
      name: 'Codex marketplace entry',
      status: 'fail',
      path: filePath,
      message: 'Marketplace file is missing.',
    };
  }

  try {
    const parsed = JSON.parse(raw) as { plugins?: unknown[] };
    const plugin = parsed.plugins?.find((entry) => isRecord(entry) && entry.name === CODEX_PLUGIN_NAME);
    const source = isRecord(plugin) && isRecord(plugin.source) ? plugin.source : null;
    const valid = source?.source === 'local' && source.path === CODEX_PLUGIN_SOURCE_PATH;
    return {
      name: 'Codex marketplace entry',
      status: valid ? 'pass' : 'fail',
      path: filePath,
      message: valid ? 'mr-djs-dev-suite local plugin is registered.' : 'mr-djs-dev-suite local plugin entry is missing or invalid.',
    };
  } catch {
    return {
      name: 'Codex marketplace entry',
      status: 'fail',
      path: filePath,
      message: 'Marketplace file is not valid JSON.',
    };
  }
}

async function checkVscodeSettings(filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  const raw = await readTextIfExists(filePath);
  if (!raw) {
    return {
      name: 'VS Code Copilot settings',
      status: 'fail',
      path: filePath,
      message: '.vscode/settings.json is missing.',
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const promptLocations = parsed['chat.promptFilesLocations'];
    const agentLocations = parsed['chat.agentFilesLocations'];
    const skillLocations = parsed['chat.agentSkillsLocations'];
    const valid =
      parsed['github.copilot.chat.codeGeneration.useInstructionFiles'] === true &&
      parsed['chat.useAgentSkills'] === true &&
      isRecord(promptLocations) &&
      promptLocations['.github/prompts'] === true &&
      isRecord(agentLocations) &&
      agentLocations['.github/agents'] === true &&
      isRecord(skillLocations) &&
      skillLocations['.github/skills'] === true;

    return {
      name: 'VS Code Copilot settings',
      status: valid ? 'pass' : 'fail',
      path: filePath,
      message: valid ? 'Copilot customization discovery settings are installed.' : 'Required Copilot settings are missing.',
    };
  } catch {
    return {
      name: 'VS Code Copilot settings',
      status: 'fail',
      path: filePath,
      message: '.vscode/settings.json is not valid JSON.',
    };
  }
}

async function checkContainsMarker(
  name: string,
  filePath: string,
  marker: string
): Promise<AgentVerifyResult['checks'][number]> {
  const content = await readTextIfExists(filePath);
  return {
    name,
    status: content?.includes(marker) ? 'pass' : 'fail',
    path: filePath,
    message: content?.includes(marker) ? 'MDS instructions are installed.' : 'MDS instructions are missing.',
  };
}

async function checkExists(name: string, filePath: string): Promise<AgentVerifyResult['checks'][number]> {
  try {
    await stat(filePath);
    return { name, status: 'pass', path: filePath, message: 'File exists.' };
  } catch {
    return { name, status: 'fail', path: filePath, message: 'File is missing.' };
  }
}

async function checkDirectoryContains(
  name: string,
  dirPath: string,
  suffix: string
): Promise<AgentVerifyResult['checks'][number]> {
  try {
    const files = await listFiles(dirPath);
    const hasMatch = files.some((file) => file.endsWith(suffix));
    return {
      name,
      status: hasMatch ? 'pass' : 'fail',
      path: dirPath,
      message: hasMatch ? `Found ${suffix} assets.` : `No ${suffix} assets found.`,
    };
  } catch {
    return {
      name,
      status: 'fail',
      path: dirPath,
      message: 'Directory is missing.',
    };
  }
}

async function readTextIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function parseJsonObject(raw: string, filePath: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // Throw below with a stable message.
  }
  throw new Error(`${filePath} is not a JSON object.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pathExistsSync(filePath: string): boolean {
  return existsSync(filePath);
}

