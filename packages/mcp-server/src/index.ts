import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { DEFAULT_DOCTOR_MODE, FULL_MODE_GUIDANCE, runDoctor, scanFile } from '@mr.dj2u/doctor';
import {
  buildCessIntakeStep,
  buildCreateExpoSuperStackArgv,
  extractCessInfoFromMarkdown,
  resolveCessPlan,
  validateCessGenerationReadiness,
} from '@mr.dj2u/cli/cess-intake';
import { buildContinueSessionBrief } from '@mr.dj2u/cli/continue';
import { applyLibraryAdd, inspectLibraryProject, planLibraryAdd } from '@mr.dj2u/cli/library';
import { renderInfo } from '@mr.dj2u/cli/project-memory';
import { generateProjectRoadmap } from '@mr.dj2u/cli/roadmap';
import {
  getPromptSpec,
  getSkill,
  listKnowledgeResources,
  readKnowledgeResource,
} from '@mr.dj2u/knowledge';
import { getLibraryItem, resolveLibraryItem, searchLibraryItems } from '@mr.dj2u/library-registry';

import type { DoctorMode } from '@mr.dj2u/doctor';
import type { DoctorCheckResult, DoctorReport } from '@mr.dj2u/doctor';
import type { KnowledgeKind } from '@mr.dj2u/knowledge';
import type { LibraryItemKind, LibrarySourceName } from '@mr.dj2u/library-registry';

interface SuperStackInvocationSpec {
  command: string;
  args: string[];
  display: string;
  source: 'local-build' | 'published-latest' | 'npm-exec';
  target: string;
}

interface ResolveSuperStackInvocationOptions {
  packageJsonPath?: string;
  npmCliPath?: string | null;
}

export function resolveSuperStackInvocationSpec(
  options: ResolveSuperStackInvocationOptions = {}
): SuperStackInvocationSpec {
  const packageJsonPath = options.packageJsonPath ?? getMcpServerPackageJsonPath();
  const localCliPath = resolveLocalSuperStackCliPath(packageJsonPath);
  if (localCliPath) {
    return {
      command: process.execPath,
      args: [localCliPath],
      display: `${process.execPath} ${localCliPath}`,
      source: 'local-build',
      target: localCliPath,
    };
  }

  const npmCliPath = options.npmCliPath === undefined ? resolveNpmCliPath() : options.npmCliPath;
  if (npmCliPath) {
    return {
      command: process.execPath,
      args: [npmCliPath, 'exec', '--yes', 'create-expo-super-stack@latest', '--'],
      display: 'npm exec --yes create-expo-super-stack@latest --',
      source: 'npm-exec',
      target: 'create-expo-super-stack@latest',
    };
  }

  return {
    command: 'npx',
    args: ['-y', 'create-expo-super-stack@latest'],
    display: 'npx -y create-expo-super-stack@latest',
    source: 'published-latest',
    target: 'create-expo-super-stack@latest',
  };
}

export function resolveSuperStackInvocation(): string {
  return resolveSuperStackInvocationSpec().display;
}

function resolveLocalSuperStackCliPath(packageJsonPath: string): string | null {
  if (classifyMcpServerRuntimeMode(packageJsonPath) !== 'local-node') {
    return null;
  }
  const packageDir = path.dirname(packageJsonPath);
  const candidate = path.resolve(packageDir, '..', 'create-expo-super-stack', 'dist', 'cli.js');
  return existsSync(candidate) ? candidate : null;
}

function resolveNpmCliPath(): string | null {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && existsSync(npmExecPath)) {
    return npmExecPath;
  }
  try {
    const resolved = createRequire(import.meta.url).resolve('npm/bin/npm-cli.js');
    return existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  content?: string;
}

export function createMrdjMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'mr-djs-dev-suite',
      version: getMcpServerRuntimeVersion(),
      description: 'MDS Expo dev-suite Doctor, knowledge resources, and onboarding prompts.',
    },
    {
      capabilities: {
        resources: {},
        prompts: {},
        tools: {},
      },
    }
  );

  registerKnowledgeResources(server);
  registerTools(server);
  registerPrompts(server);

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createMrdjMcpServer();
  await server.connect(new StdioServerTransport());
  console.error('mr-djs-dev-suite MCP server running on stdio');
  process.stdin.resume();
}

export function listTools(): MCPTool[] {
  return [
    {
      name: 'continue_project',
      description:
        'Build an MDS Continue session brief for an onboarded app folder, including Expo SDK upgrade routing when project state is behind the official latest stable SDK.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
        },
      },
    },
    {
      name: 'doctor_scan_project',
      description: `Run MDS Doctor checks against a project folder. Default mode is ${DEFAULT_DOCTOR_MODE}; use ci for PR/release gates and full for broad build verification. ${FULL_MODE_GUIDANCE}`,
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          mode: { type: 'string', enum: ['fast', 'ci', 'full'] },
          runScripts: { type: 'boolean' },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'doctor_scan_file',
      description: 'Run focused Doctor checks against one file.',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          projectPath: { type: 'string' },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'doctor_explain_result',
      description: 'Explain a Doctor result in beginner-friendly language.',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
        },
        required: ['status', 'message'],
      },
    },
    {
      name: 'knowledge_list_resources',
      description: 'List MDS knowledge resources by kind.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['pattern', 'guide', 'rule', 'skill', 'reference'] },
        },
      },
    },
    {
      name: 'list_skills',
      description: 'List bundled MDS agent skills with optional keyword filtering.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
    },
    {
      name: 'get_skill',
      description: 'Read a bundled MDS agent skill.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'get_guide',
      description: 'Read a bundled MDS knowledge guide.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'generate_refactor_plan',
      description: 'Generate a Doctor-backed refactor plan with related MDS knowledge resources.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          mode: { type: 'string', enum: ['fast', 'ci', 'full'] },
          runScripts: { type: 'boolean' },
          focus: { type: 'string' },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'generate_deploy_checklist',
      description:
        'Generate a target-aware deployment checklist using Doctor findings and MDS guidance.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          target: { type: 'string', enum: ['web', 'ios', 'android', 'native', 'all'] },
          mode: { type: 'string', enum: ['fast', 'ci', 'full'] },
          runScripts: { type: 'boolean' },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'generate_project_roadmap',
      description:
        'Propose roadmap additions from normalized project/info.md without rewriting existing TODO items. Append only after explicit approval.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          append: { type: 'boolean' },
        },
        required: ['projectPath'],
      },
    },
    {
      name: 'generate_setup_tasks',
      description: 'Generate post-create onboarding setup tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          defaults: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'create_expo_super_stack_extract_info',
      description:
        'Extract reusable intake answers from attached project memory before guided Create Expo Super Stack questions begin.',
      inputSchema: {
        type: 'object',
        properties: {
          infoMarkdown: { type: 'string' },
          styleMarkdown: { type: 'string' },
          parentDir: { type: 'string' },
          appName: { type: 'string' },
        },
        required: ['infoMarkdown'],
      },
    },
    {
      name: 'create_expo_super_stack_intake_step',
      description:
        'Advance one guided Create Expo Super Stack intake step using the shared CLI-backed questionnaire.',
      inputSchema: {
        type: 'object',
        properties: {
          parentDir: { type: 'string' },
          appName: { type: 'string' },
          answers: { type: 'object', additionalProperties: true },
        },
      },
    },
    {
      name: 'create_expo_super_stack_resolve_info',
      description:
        'Resolve attached project info into a complete Create Expo Super Stack generate payload in one stateless step.',
      inputSchema: {
        type: 'object',
        properties: {
          infoMarkdown: { type: 'string' },
          styleMarkdown: { type: 'string' },
          parentDir: { type: 'string' },
          appName: { type: 'string' },
          answers: { type: 'object', additionalProperties: true },
        },
        required: ['infoMarkdown'],
      },
    },
    {
      name: 'create_expo_super_stack_generate',
      description:
        'Run create-expo-super-stack after guided intake has been fully answered and explicitly confirmed.',
      inputSchema: {
        type: 'object',
        properties: {
          parentDir: { type: 'string' },
          appName: { type: 'string' },
          answers: { type: 'object', additionalProperties: true },
          canonicalProjectInfoMarkdown: { type: 'string' },
          confirmed: { type: 'boolean' },
        },
        required: ['confirmed'],
      },
    },
    {
      name: 'library_search',
      description:
        'Search the MDS Library catalog, optionally filtering against an Expo project compatibility context.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['component', 'animation', 'screen', 'flow', 'integration'],
          },
          source: {
            type: 'string',
            enum: ['mds', 'create-expo-app', 'create-expo-stack', 'nativewindui', 'swmansion'],
          },
          tags: { type: 'array', items: { type: 'string' } },
          categories: { type: 'array', items: { type: 'string' } },
          projectPath: { type: 'string' },
        },
      },
    },
    {
      name: 'library_get',
      description:
        'Get one MDS Library item and, when a project path is supplied, its resolved compatibility details.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectPath: { type: 'string' },
          variant: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      name: 'library_plan_add',
      description:
        'Preflight copying an editable MDS Library item into a project and return its confirmation plan hash plus placement guidance. Before applying any library item, ask the developer where or how they want it used unless they already specified a target screen, route, component slot, provider boundary, or setup location.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectPath: { type: 'string' },
          variant: { type: 'string' },
        },
        required: ['id', 'projectPath'],
      },
    },
    {
      name: 'library_add',
      description:
        'Apply an unchanged MDS Library add plan after explicit confirmation, without overwriting customized files. Installs planned dependencies immediately (defaults to true) unless installDependencies is false. Use only after the developer has approved the source-copy plan and either named the app placement/integration point or accepted the default source-copy fallback.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          projectPath: { type: 'string' },
          variant: { type: 'string' },
          planHash: { type: 'string' },
          confirmed: { type: 'boolean', const: true },
          installDependencies: {
            type: 'boolean',
            description:
              'Install planned dependencies immediately. Defaults to true. Pass false only for an explicit no-install copy; the returned pendingCommands both declare and install those packages.',
          },
        },
        required: ['id', 'projectPath', 'planHash', 'confirmed'],
      },
    },
    {
      name: 'mds_runtime_versions',
      description:
        'Report the active MDS MCP server, CLI, and create-expo-super-stack runtime versions and sources.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

export async function listResources(): Promise<MCPResource[]> {
  return listKnowledgeResources().map((resource) => ({
    uri: resource.uri,
    name: resource.name,
    mimeType: 'text/markdown',
    content: resource.description,
  }));
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'continue_project': {
      return buildContinueSessionBrief(readString(input.projectPath) ?? '.');
    }
    case 'doctor_scan_project': {
      const projectPath = readString(input.projectPath) ?? '.';
      const mode = normalizeMode(readString(input.mode));
      const runScripts = typeof input.runScripts === 'boolean' ? input.runScripts : undefined;
      return runDoctor(projectPath, { mode, runScripts });
    }
    case 'doctor_scan_file': {
      const filePath = readString(input.filePath);
      if (!filePath) {
        throw new Error('doctor_scan_file requires filePath.');
      }
      return scanFile(filePath, { projectPath: readString(input.projectPath) });
    }
    case 'doctor_explain_result': {
      return explainDoctorResult(input);
    }
    case 'knowledge_list_resources': {
      return listKnowledgeResources(normalizeKind(readString(input.kind)));
    }
    case 'list_skills': {
      return listSkillSummaries(readString(input.query));
    }
    case 'get_skill': {
      const id = readString(input.id);
      return id ? getSkill(id) : null;
    }
    case 'get_guide': {
      const id = readString(input.id);
      return id ? readKnowledgeResource(`mds://guides/${id}`) : null;
    }
    case 'generate_refactor_plan': {
      const projectPath = readString(input.projectPath);
      if (!projectPath) {
        throw new Error('generate_refactor_plan requires projectPath.');
      }
      return generateRefactorPlan(projectPath, input);
    }
    case 'generate_deploy_checklist': {
      const projectPath = readString(input.projectPath);
      if (!projectPath) {
        throw new Error('generate_deploy_checklist requires projectPath.');
      }
      return generateDeployChecklist(projectPath, input);
    }
    case 'generate_project_roadmap': {
      const projectPath = readString(input.projectPath);
      if (!projectPath) {
        throw new Error('generate_project_roadmap requires projectPath.');
      }
      return generateProjectRoadmap(projectPath, {
        write: input.append === true,
        append: input.append === true,
      });
    }
    case 'generate_setup_tasks': {
      return generateSetupTasks(
        readString(input.projectPath) ?? '.',
        readStringArray(input.defaults)
      );
    }
    case 'create_expo_super_stack_extract_info': {
      const infoMarkdown = readString(input.infoMarkdown);
      if (!infoMarkdown) {
        throw new Error('create_expo_super_stack_extract_info requires infoMarkdown.');
      }
      return extractCessInfoFromMarkdown({
        infoMarkdown,
        styleMarkdown: readString(input.styleMarkdown),
        parentDir: readString(input.parentDir),
        appName: readString(input.appName),
      });
    }
    case 'create_expo_super_stack_intake_step': {
      return buildCessIntakeStep({
        parentDir: readString(input.parentDir),
        appName: readString(input.appName),
        answers: readRecord(input.answers) as Record<string, unknown> | undefined,
      });
    }
    case 'create_expo_super_stack_resolve_info': {
      return resolveCreateExpoSuperStackInfo(input);
    }
    case 'create_expo_super_stack_generate': {
      return generateCreateExpoSuperStack(input);
    }
    case 'library_search': {
      return searchMdsLibrary(input);
    }
    case 'library_get': {
      return getMdsLibraryItem(input);
    }
    case 'library_plan_add': {
      return planMdsLibraryAdd(input);
    }
    case 'library_add': {
      return addMdsLibraryItem(input);
    }
    case 'mds_runtime_versions': {
      return getMdsRuntimeVersions();
    }
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

export async function readResource(uri: string): Promise<MCPResource | null> {
  const resource = await readKnowledgeResource(uri);
  if (!resource) {
    return null;
  }

  return {
    uri: resource.uri,
    name: resource.name,
    mimeType: 'text/markdown',
    content: resource.content,
  };
}

function registerKnowledgeResources(server: McpServer): void {
  for (const resource of listKnowledgeResources()) {
    server.registerResource(
      resource.id,
      resource.uri,
      {
        title: resource.name,
        description: resource.description,
        mimeType: 'text/markdown',
      },
      async () => {
        const content = await readKnowledgeResource(resource.uri);
        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: 'text/markdown',
              text: content?.content ?? '',
            },
          ],
        };
      }
    );
  }
}

function registerTools(server: McpServer): void {
  server.registerTool(
    'continue_project',
    {
      title: 'Continue Project',
      description: 'Build an MDS Continue session brief for an onboarded app folder.',
      inputSchema: {
        projectPath: z.string().optional(),
      },
    },
    async ({ projectPath }) => {
      const brief = await buildContinueSessionBrief(projectPath ?? '.');
      return toolJson(brief);
    }
  );

  server.registerTool(
    'doctor_scan_project',
    {
      title: 'Doctor Scan Project',
      description: `Run MDS Doctor checks against a project folder. Default mode is ${DEFAULT_DOCTOR_MODE}; ci includes tests/Expo Doctor/release build, and full adds broad build candidates. ${FULL_MODE_GUIDANCE}`,
      inputSchema: {
        projectPath: z.string(),
        mode: z.enum(['fast', 'ci', 'full']).optional(),
        runScripts: z.boolean().optional(),
      },
    },
    async ({ projectPath, mode, runScripts }) => {
      const report = await runDoctor(projectPath, {
        mode: mode ?? DEFAULT_DOCTOR_MODE,
        runScripts,
      });
      return toolJson(report);
    }
  );

  server.registerTool(
    'doctor_scan_file',
    {
      title: 'Doctor Scan File',
      description: 'Run focused Doctor checks against one file.',
      inputSchema: {
        filePath: z.string(),
        projectPath: z.string().optional(),
      },
    },
    async ({ filePath, projectPath }) => {
      const report = await scanFile(filePath, { projectPath });
      return toolJson(report);
    }
  );

  server.registerTool(
    'knowledge_list_resources',
    {
      title: 'List Knowledge Resources',
      description: 'List MDS knowledge resources by kind.',
      inputSchema: {
        kind: z.enum(['pattern', 'guide', 'rule', 'skill', 'reference']).optional(),
      },
    },
    async ({ kind }) => toolJson(listKnowledgeResources(kind))
  );

  server.registerTool(
    'list_skills',
    {
      title: 'List Skills',
      description: 'List bundled MDS agent skills with optional keyword filtering.',
      inputSchema: {
        query: z.string().optional(),
      },
    },
    async ({ query }) => toolJson(listSkillSummaries(query))
  );

  server.registerTool(
    'get_skill',
    {
      title: 'Get Skill',
      description: 'Read a bundled MDS agent skill.',
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => toolJson(await getSkill(id))
  );

  server.registerTool(
    'get_guide',
    {
      title: 'Get Guide',
      description: 'Read a bundled MDS knowledge guide.',
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => toolJson(await readKnowledgeResource(`mds://guides/${id}`))
  );

  server.registerTool(
    'generate_refactor_plan',
    {
      title: 'Generate Refactor Plan',
      description: 'Generate a Doctor-backed refactor plan with related MDS knowledge resources.',
      inputSchema: {
        projectPath: z.string(),
        mode: z.enum(['fast', 'ci', 'full']).optional(),
        runScripts: z.boolean().optional(),
        focus: z.string().optional(),
      },
    },
    async (input) => toolJson(await generateRefactorPlan(input.projectPath, input))
  );

  server.registerTool(
    'generate_deploy_checklist',
    {
      title: 'Generate Deploy Checklist',
      description:
        'Generate a target-aware deployment checklist using Doctor findings and MDS guidance.',
      inputSchema: {
        projectPath: z.string(),
        target: z.enum(['web', 'ios', 'android', 'native', 'all']).optional(),
        mode: z.enum(['fast', 'ci', 'full']).optional(),
        runScripts: z.boolean().optional(),
      },
    },
    async (input) => toolJson(await generateDeployChecklist(input.projectPath, input))
  );

  server.registerTool(
    'generate_project_roadmap',
    {
      title: 'Generate Project Roadmap',
      description:
        'Propose roadmap additions from normalized project/info.md. Set append only after explicitly approving new task wording.',
      inputSchema: {
        projectPath: z.string(),
        append: z.boolean().optional(),
      },
    },
    async (input) =>
      toolJson(
        await generateProjectRoadmap(input.projectPath, {
          write: input.append === true,
          append: input.append === true,
        })
      )
  );

  server.registerTool(
    'doctor_explain_result',
    {
      title: 'Explain Doctor Result',
      description: 'Explain a Doctor result in beginner-friendly language.',
      inputSchema: {
        status: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (input) => toolText(explainDoctorResult(input))
  );

  server.registerTool(
    'generate_setup_tasks',
    {
      title: 'Generate Setup Tasks',
      description: 'Generate post-create onboarding setup tasks.',
      inputSchema: {
        projectPath: z.string().optional(),
        defaults: z.array(z.string()).optional(),
      },
    },
    async ({ projectPath, defaults }) =>
      toolJson(generateSetupTasks(projectPath ?? '.', defaults ?? []))
  );

  server.registerTool(
    'create_expo_super_stack_extract_info',
    {
      title: 'Create Expo Super Stack Extract Info',
      description:
        'Extract reusable intake answers from attached project memory before guided Create Expo Super Stack questions begin.',
      inputSchema: {
        infoMarkdown: z.string(),
        styleMarkdown: z.string().optional(),
        parentDir: z.string().optional(),
        appName: z.string().optional(),
      },
    },
    async ({ infoMarkdown, styleMarkdown, parentDir, appName }) =>
      toolJson(
        extractCessInfoFromMarkdown({
          infoMarkdown,
          styleMarkdown,
          parentDir,
          appName,
        })
      )
  );

  server.registerTool(
    'create_expo_super_stack_intake_step',
    {
      title: 'Create Expo Super Stack Intake Step',
      description:
        'Advance one guided Create Expo Super Stack intake step using the shared CLI-backed questionnaire.',
      inputSchema: {
        parentDir: z.string().optional(),
        appName: z.string().optional(),
        answers: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async ({ parentDir, appName, answers }) =>
      toolJson(
        buildCessIntakeStep({
          parentDir,
          appName,
          answers,
        })
      )
  );

  server.registerTool(
    'create_expo_super_stack_resolve_info',
    {
      title: 'Create Expo Super Stack Resolve Info',
      description:
        'Resolve attached project info into a complete Create Expo Super Stack generate payload in one stateless step.',
      inputSchema: {
        infoMarkdown: z.string(),
        styleMarkdown: z.string().optional(),
        parentDir: z.string().optional(),
        appName: z.string().optional(),
        answers: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async ({ infoMarkdown, styleMarkdown, parentDir, appName, answers }) =>
      toolJson(
        resolveCreateExpoSuperStackInfo({
          infoMarkdown,
          styleMarkdown,
          parentDir,
          appName,
          answers,
        })
      )
  );

  server.registerTool(
    'create_expo_super_stack_generate',
    {
      title: 'Create Expo Super Stack Generate',
      description:
        'Run create-expo-super-stack after guided intake has been fully answered and explicitly confirmed.',
      inputSchema: {
        parentDir: z.string().optional(),
        appName: z.string().optional(),
        answers: z.record(z.string(), z.unknown()).optional(),
        canonicalProjectInfoMarkdown: z.string().optional(),
        confirmed: z.boolean(),
      },
    },
    async ({ parentDir, appName, answers, canonicalProjectInfoMarkdown, confirmed }) =>
      toolJson(
        await generateCreateExpoSuperStack({
          parentDir,
          appName,
          answers,
          canonicalProjectInfoMarkdown,
          confirmed,
        })
      )
  );

  server.registerTool(
    'library_search',
    {
      title: 'Search MDS Library',
      description:
        'Search the MDS Library catalog, optionally filtering against an Expo project compatibility context.',
      inputSchema: {
        query: z.string().optional(),
        kind: z.enum(['component', 'animation', 'screen', 'flow', 'integration']).optional(),
        source: z
          .enum(['mds', 'create-expo-app', 'create-expo-stack', 'nativewindui', 'swmansion'])
          .optional(),
        tags: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        projectPath: z.string().optional(),
      },
    },
    async (input) => toolJson(await searchMdsLibrary(input))
  );

  server.registerTool(
    'library_get',
    {
      title: 'Get MDS Library Item',
      description:
        'Get one MDS Library item and, when a project path is supplied, its resolved compatibility details.',
      inputSchema: {
        id: z.string(),
        projectPath: z.string().optional(),
        variant: z.string().optional(),
      },
    },
    async (input) => toolJson(await getMdsLibraryItem(input))
  );

  server.registerTool(
    'library_plan_add',
    {
      title: 'Plan MDS Library Add',
      description:
        'Preflight copying an editable MDS Library item into a project and return its confirmation plan hash plus placement guidance. Before applying any library item, ask the developer where or how they want it used unless they already specified a target screen, route, component slot, provider boundary, or setup location.',
      inputSchema: {
        id: z.string(),
        projectPath: z.string(),
        variant: z.string().optional(),
      },
    },
    async (input) => toolJson(await planMdsLibraryAdd(input))
  );

  server.registerTool(
    'library_add',
    {
      title: 'Add MDS Library Item',
      description:
        'Apply an unchanged MDS Library add plan after explicit confirmation, without overwriting customized files. Installs planned dependencies immediately (defaults to true) unless installDependencies is false. Use only after the developer has approved the source-copy plan and either named the app placement/integration point or accepted the default source-copy fallback.',
      inputSchema: {
        id: z.string(),
        projectPath: z.string(),
        variant: z.string().optional(),
        planHash: z.string(),
        confirmed: z.literal(true),
        installDependencies: z
          .boolean()
          .optional()
          .describe(
            'Install planned dependencies immediately. Defaults to true. Pass false only for an explicit no-install copy; the returned pendingCommands both declare and install those packages.'
          ),
      },
    },
    async (input) => toolJson(await addMdsLibraryItem(input))
  );

  server.registerTool(
    'mds_runtime_versions',
    {
      title: 'MDS Runtime Versions',
      description:
        'Report the active MDS MCP server, CLI, and create-expo-super-stack runtime versions and sources.',
      inputSchema: {},
    },
    async () => toolJson(getMdsRuntimeVersions())
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'create_expo_super_stack',
    {
      title: 'Create Expo Super Stack',
      description:
        'Run from a parent directory (e.g. F:/ReactNativeApps) to generate a brand-new Expo app via create-expo-super-stack and immediately apply MDS onboarding.',
      argsSchema: {
        parentDir: z.string().optional(),
        appName: z.string().optional(),
      },
    },
    ({ parentDir, appName }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildCreateExpoSuperStackPromptText(parentDir, appName),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'onboard_new_expo_app',
    {
      title: 'Onboard Existing Expo App',
      description:
        'Run from inside an existing Expo app folder to apply MDS project memory, intake, planning, and scaffolding.',
      argsSchema: {
        projectPath: z.string().optional(),
      },
    },
    ({ projectPath }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildOnboardPromptText(projectPath),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'retrospective_project_onboarding',
    {
      title: 'Retrospective Project Onboarding',
      description:
        'Confirm project memory generated from an existing app and Git history after workspace init.',
      argsSchema: {
        projectPath: z.string().optional(),
      },
    },
    ({ projectPath }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildRetrospectiveProjectOnboardingPromptText(projectPath),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'continue_mds_project',
    {
      title: 'Continue MDS Project',
      description:
        'Build an MDS Continue session brief for an existing Expo app folder by calling continue_project first.',
      argsSchema: {
        projectPath: z.string().optional(),
      },
    },
    ({ projectPath }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildContinueProjectPromptText(projectPath),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'review_motion',
    {
      title: 'Review Motion',
      description:
        'Inventory project motion, classify animation types, and recommend smoother implementations with MDS guidance.',
      argsSchema: {
        projectPath: z.string().optional(),
        focusPath: z.string().optional(),
        mode: z.enum(['fast', 'ci', 'full']).optional(),
      },
    },
    ({ projectPath, focusPath, mode }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildReviewMotionPromptText(projectPath, focusPath, mode),
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'wrap_up_release',
    {
      title: 'Wrap Up Release',
      description:
        'Run post-testing wrap-up: todo completion, Doctor CI gate, git inclusion checks, PR loops, and guarded merge handling.',
      argsSchema: {
        projectPath: z.string().optional(),
        branch: z.string().optional(),
        base: z.string().optional(),
        mergeMode: z.enum(['auto-test', 'manual-test']).optional(),
      },
    },
    ({ projectPath, branch, base, mergeMode }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildWrapUpPromptText(projectPath, branch, base, mergeMode),
          },
        },
      ],
    })
  );
}

export function buildRetrospectiveProjectOnboardingPromptText(projectPath?: string): string {
  const target = projectPath ?? 'the initialized workspace app checkout';
  const canonicalPrompt = readCanonicalPromptMarkdown('retrospective-project-onboarding').trim();
  return [
    `Run retrospective project onboarding for ${target}.`,
    '',
    'Start by discovering the workspace from the app checkout, then use the workspace control repository project memory.',
    '',
    canonicalPrompt,
  ].join('\n');
}

const INFO_TEMPLATE_URL =
  'https://davidjgrimsley.com/public-facing/ai/mr-djs-dev-suite/templates/info.md';

function fileIntakePhase(label: string): string {
  return [
    `====== ${label} ======`,
    '',
    'Recommend planning first for thin ideas before scaffolding.',
    'If the user already has a research plan or project memory (`project/info.md` and optionally `project/style.md`), they can paste or attach it here and you will use it as intake context.',
    '',
    'Tell the user (paraphrase is fine, but keep all four points):',
    '  1. They can paste/attach an existing research plan or project/info.md now and you will skip questions whose answers are unambiguous in the file.',
    `  2. Reference template (optional): ${INFO_TEMPLATE_URL} — if the URL is not yet hosted, offer to inline a copy of the template on request.`,
    '  3. Same offer applies to project/style.md. If they do not have one, you will ask a few short style questions later (colors, fonts, brand vibe) so the generated style.md is not empty.',
    '  4. If they have nothing, no problem — just say "skip" / "none" and you will build it from scratch as you go.',
    '',
    'Wait for the user to attach/paste content or to opt out. Then:',
    '  - Parse what was provided and normalize it into canonical project memory structure. For each upcoming question, classify the answer as:',
    '      \'clear\'      → skip the question; tell the user briefly: "(using your info.md value: <short paraphrase>)".',
    "      'ambiguous'  → ask the question, citing the relevant line from the file as context.",
    "      'unknown'    → ask normally.",
    '  - Never invent answers. If the file is silent on a question, ask normally.',
    '',
  ].join('\n');
}

function readCanonicalPromptMarkdown(idOrSlug: string): string {
  const promptSpec = getPromptSpec(idOrSlug);
  if (!promptSpec) {
    throw new Error(`Unknown canonical MDS prompt: ${idOrSlug}`);
  }

  const packageJsonPath = getMcpServerPackageJsonPath();
  const runtimeMode = classifyMcpServerRuntimeMode(packageJsonPath);
  const localPromptPath =
    runtimeMode === 'local-node'
      ? path.resolve(
          path.dirname(packageJsonPath),
          '..',
          'knowledge',
          'src',
          'content',
          promptSpec.resourcePath
        )
      : null;
  const installedPromptPath = path.resolve(
    path.dirname(packageJsonPath),
    '..',
    'knowledge',
    'dist',
    'content',
    promptSpec.resourcePath
  );
  const promptPath =
    localPromptPath && existsSync(localPromptPath) ? localPromptPath : installedPromptPath;

  return readFileSync(promptPath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function buildCreateExpoSuperStackPromptText(parentDir?: string, appName?: string): string {
  const promptParent = parentDir?.trim() ? parentDir : 'the current working directory';
  const promptAppHint = appName ? `The user already named the app: \`${appName}\`.` : '';
  const canonicalPrompt = readCanonicalPromptMarkdown('create-expo-super-stack').trim();
  return [
    `You are kicking off a brand-new Expo app from ${promptParent}. ${promptAppHint}`.trim(),
    '',
    canonicalPrompt,
  ].join('\n');
}

export function buildContinueProjectPromptText(projectPath?: string): string {
  const target = projectPath ?? 'the current working directory';
  return [
    `Build an MDS Continue session brief for the Expo project at ${target}.`,
    '',
    'Call the MCP tool `continue_project` first with:',
    `  projectPath: "${target}"`,
    '',
    'After the tool returns:',
    '1. Briefly summarize what you found (2-3 sentences max). Name the next step in one sentence.',
    '2. Before any edits, recommend Plan mode first: define scope, success criteria, and validation steps.',
    '3. If TodoForContext markers exist:',
    '   - Say something brief like: "Let me ask you a few questions to get to know the project and help you plan the vision."',
    '   - Then work through each marker by asking the question its hint implies. Do NOT ask the user whether to fill or delete — just ask the question.',
    '   - Ask EXACTLY ONE question per message. Never combine questions. Never ask sub-questions in the same message.',
    '   - After the user answers, write the answer into the file under the marker and delete the marker line. Then move to the next question.',
    '   - Do not offer "skip markers and implement anyway."',
    '4. After all markers are resolved, call continue_project again to confirm blockers are cleared.',
    '5. If recommendation.priority is expo-sdk-upgrade:',
    '   - Load the official Expo skill `upgrading-expo`.',
    '   - Do not call MDS `get_skill` for an upgrade skill. MDS does not own upgrade steps.',
    '   - Do not implement the next todo or call `generate_project_roadmap` for feature work until the user declines or the upgrade is done.',
    '6. Before implementation planning, call `generate_project_roadmap`.',
    '   - If it returns `needsClarification: true`, ask the listed clarification questions EXACTLY ONE AT A TIME, update `project/info.md`, and rerun `generate_project_roadmap` until it no longer needs clarification.',
    '   - Only move into implementation planning after roadmap is not blocked and does not need clarification.',
  ].join('\n');
}

export function buildReviewMotionPromptText(
  projectPath?: string,
  focusPath?: string,
  mode?: DoctorMode | string
): string {
  const target = projectPath ?? 'the current Expo project';
  const resolvedMode = normalizeMode(typeof mode === 'string' ? mode : undefined);
  const focusLine = focusPath?.trim()
    ? `Start by inspecting motion in \`${focusPath.trim()}\`, then widen to surrounding screens only if needed.`
    : 'If the developer named a route, screen, or component in the conversation, inspect that motion first before broad project feedback.';
  const canonicalPrompt = readCanonicalPromptMarkdown('review-motion').trim();

  return [
    `Review motion for the Expo project at ${target}.`,
    `Use Doctor mode \`${resolvedMode}\` for the project scan unless the developer asks for a deeper pass.`,
    focusLine,
    '',
    canonicalPrompt,
  ].join('\n');
}

export function buildWrapUpPromptText(
  projectPath?: string,
  branch?: string,
  base?: string,
  mergeMode?: 'auto-test' | 'manual-test'
): string {
  const target = projectPath ?? 'the current repository';
  const resolvedBranch = branch ?? 'current branch';
  const resolvedBase = base ?? 'test';
  const resolvedMergeMode = mergeMode ?? 'auto-test';
  return [
    `Run the MDS wrap-up release workflow for ${target}.`,
    '',
    'Use this only when the developer says testing is complete and wants final release prep.',
    '',
    'Context for this run:',
    `- projectPath: ${target}`,
    `- branch: ${resolvedBranch}`,
    `- base: ${resolvedBase}`,
    `- mergeMode override: ${resolvedMergeMode}`,
    '',
    'Required flow order:',
    '1. Mark only clearly completed items in `project/todo.md`.',
    '2. Run `mds doctor --ci` before any git mutation.',
    '3. Run `git status --short`, list changed files, and explicitly confirm intentionally omitted files with the developer.',
    '4. Route GitHub context through `github`.',
    '5. Route publish flow through `yeet` (commit/push/open-or-update PR).',
    '6. Poll checks and unresolved review feedback.',
    '7. For failing checks, route through `gh-fix-ci`; for blocking unresolved review threads, route through `gh-address-comments`.',
    '8. Fix locally, rerun `mds doctor --ci`, push, and poll again.',
    '9. Repeat the fix/poll loop up to 5 total cycles, then stop and ask for human help if blockers remain.',
    '',
    'Merge policy resolution order:',
    '1. Explicit instruction from the developer in this session.',
    '2. Optional repo config at `project/release-policy.json` with shape:',
    '   { "wrapUp": { "autoMergeTest": true, "autoMergeMain": false } }',
    '3. Defaults when config is absent: auto-merge to `test` enabled; manual merge for `main` always required.',
    '',
    'Guardrails:',
    '- Never auto-merge to `main`.',
    '- If the target flow does not use `test`, stop before merge and ask the developer to merge manually.',
    '- Do not skip Doctor between fix cycles.',
    '- Do not assume omitted files are intentional without explicit confirmation.',
    '- Keep `/push-merge-loop` focused as the PR iteration primitive; this `/wrap-up` prompt orchestrates preflight plus ship loop.',
  ].join('\n');
}

export function buildOnboardPromptText(projectPath?: string): string {
  const target = projectPath ?? 'the current Expo project';
  return [
    `You are running MDS agentic onboarding inside ${target}. The app folder must already exist on disk.`,
    '',
    'If you are NOT yet inside an Expo app folder, stop and tell the user to either:',
    '  (a) cd into the existing app folder and re-invoke this prompt, or',
    '  (b) run the `create_expo_super_stack` MCP prompt from a parent folder to generate a new app first.',
    '',
    'IMPORTANT: Drive this conversationally. Never echo the assembled `mds onboard` command line. One question per turn. Number multi-choice options. Always show the default and accept "default" / number / label / natural language.',
    '',
    fileIntakePhase('PHASE 0a — Optional: attach existing project memory'),
    '====== PHASE 0b — State + blocker check ======',
    '',
    `Check whether ${target}/project/ exists with content.`,
    '  - If project/ is missing or empty: skip the blocker check and go to PHASE 1 intake.',
    '  - If project/ files exist: read project/info.md, project/style.md, project/guidelines.md, and project/todo.md, then run the blocker check below.',
    '',
    'Blocker check: search each project/ file for the literal marker `# TodoForContext(optional):`.',
    '  If ONE OR MORE markers are still present:',
    '    1. STOP. Do not begin intake. Do not propose a plan. Do not scaffold anything.',
    "    2. List every file + line that still contains a marker, and quote the marker's hint text.",
    '    3. Tell the user, verbatim:',
    '         "These TodoForContext lines are blocking onboarding. For each one,',
    '          either fill out the section underneath OR delete the marker line to',
    '          acknowledge you do not want to add that context. Save the file, then',
    '          tell me to re-check."',
    '    4. Wait for the user. When they say re-check, repeat PHASE 0 from scratch.',
    '  Only when zero markers remain may you proceed to PHASE 1.',
    '',
    '====== PHASE 1 — Intake conversation ======',
    '',
    'Reuse anything project/info.md already states; only ask questions whose answers are missing or generic.',
    '',
    'Q1.1 — App display name? (defaults to the folder name)',
    '',
    'Q1.2 — Who is this app for? (audience — user types, demographics, role, or context)',
    '',
    'Q1.3 — What should users be able to do first? (1-3 core flows; press enter to defer)',
    '',
    'Q1.3a — What screens do you know you will need in the app as of now? (Press enter / say "defer" to leave a TodoForContext marker.)',
    '',
    'Q1.4 — Which data categories does the app need? (multi-select)',
    '  1. Local UI/app state (default)',
    '  2. User accounts/authentication',
    '  3. Backend database records',
    '  4. File/image uploads or storage',
    '  5. External APIs/integrations',
    '  6. Analytics/events',
    '  7. Payments/subscriptions',
    '  8. Realtime/collaboration',
    '  9. Push/email notifications',
    ' 10. Offline sync/cache',
    ' 11. Admin/moderation tools',
    ' 12. Other / custom (you will be asked to describe)',
    '',
    'Q1.5 — Which platforms will this app target? (multi-select)',
    '  1. Web',
    '  2. iOS',
    '  3. Android',
    '  4. Apple TV',
    '  5. Android TV',
    '  Default: 1, 2, 3',
    '  Note: Android TV builds from the same Android target with leanback config in app.json. Apple TV is a separate tvOS build target via react-native-tvos.',
    '',
    'Q1.6 — First MVP target platform? (only ask if Q1.5 has more than one)',
    '',
    'Q1.7 — When platforms diverge, how should platform-specific code be organized? (only if multi-platform)',
    '  1. File suffixes only (default — e.g. screen.web.tsx. Good for small to medium projects targeting web and mobile)',
    '  2. Platform folders (recommended for large projects, very different UI on each platform, or targeting TV and other platforms from one codebase)',
    '',
    'Q1.7a — Where should MDS place Expo Router route files it generates?',
    '  1. Detected existing app folder (default; usually src/app or app)',
    '  2. src/app',
    '  3. app',
    '  Note: mds onboard does not move an existing route tree automatically.',
    '',
    'Q1.7b — Do selected platforms need their own layouts? (only if multi-platform)',
    '  1. Shared layouts (default)',
    '  2. Platform-specific layouts',
    '',
    'Q1.8 — Web output mode? (only if web is in Q1.5)',
    '  1. Static (default)',
    '  2. Server (Expo Router API routes / SSR)',
    '  3. SPA',
    '',
    'Q1.9 — Server type? (only if Q1.8 = Server, OR if mobile is in Q1.5)',
    '  If Q1.8 = Server: Standard Expo (default) / Custom backend / None',
    '  If mobile-only: Custom backend / None (default)',
    '',
    'Q1.10 — How will the first version reach its users? (DEPLOYMENT/DISTRIBUTION method, NOT which OSes)',
    '  Examples: TestFlight to friends, internal client demo, App Store / Play Store launch, web hosting, side-loaded APK, internal-only.',
    '',
    'Q1.12 — Use Expo UI for native-feeling screens? (only if mobile target; Yes default / No)',
    '',
    'Q1.13 — Use Expo Native Tabs? (only if mobile target; Yes default / No)',
    '',
    'Q1.14 — Set up EAS now? (No default / Yes)',
    'Q1.15 — Which EAS uses? (multi-select; only if Q1.14 = Yes)',
    '  1. building mobile applications',
    '  2. hosting a deployed server',
    '  3. hosting web apps',
    '  4. publishing mobile applications',
    '',
    'Q1.16 — Use the bundled MDS project/guidelines.md template? (Yes default / No)',
    '',
    'Q1.17 — Data starting point?',
    '  1. Local dummy data (default)',
    '  2. Supabase from the start',
    '',
    'Q1.18 — Use test-to-main branching safeguards? (Yes default / No)',
    '',
    '====== PHASE 2 — Confirm and scaffold ======',
    '',
    'Present a SHORT plain-English summary of choices (not flag form). Ask the user to confirm or change anything.',
    '',
    'When confirmed, run silently via your shell tool. Do NOT print the command. Just say:',
    '  "Scaffolding project memory and rich boilerplate now. This takes a few seconds."',
    'After onboarding completes, describe the initial roadmap only for a new project. Existing project/todo.md content is a preserved ledger, not an auto-derived file.',
    'If markers remain, tell the developer the scaffolded phase template is intentional and that they should resolve the markers before reviewing a roadmap proposal.',
    'If roadmap returns `needsClarification: true`, ask the listed clarification questions one at a time, update `project/info.md`, then review the resulting proposal before any explicitly approved append.',
    '',
    '====== Flag map for `mds onboard` (use these EXACTLY) ======',
    '',
    '  Q1.1 → --app-name=             (wrap value in double quotes if it contains spaces)',
    '  Q1.2 → --audience=',
    '  Q1.3 → --core-flows=',
    '  Q1.3a → --screens=',
    '  Q1.4 → --data-needs=           (comma-joined labels)',
    '  Q1.5 → --platforms=            (comma-joined slugs from: web,ios,android,apple-tv,android-tv)',
    '  Q1.6 → --first-platform=',
    '  Q1.7 → --platform-strategy=    (files-only|folders)',
    '  Q1.7a → --app-directory=       (src|root)',
    '  Q1.7b → --platform-layouts=    (shared|platform-specific)',
    '  Q1.8 → --web-output=           (static|server|spa|none)',
    '  Q1.9 → --deployed-server=      (standard-expo|custom|none)',
    '  Q1.10 → --deployment-target=',
    '  Q1.11 → --latest-expo-sdk      (boolean flag — pass true/false: --latest-expo-sdk for Yes, omit or --latest-expo-sdk=false for No)',
    '  Q1.12 → --expo-ui              (Yes only; omit when No)',
    '  Q1.13 → --expo-native-tabs     (Yes only; omit when No)',
    '  Q1.14 → --eas-selected         (Yes only)',
    '  Q1.15 → --eas-uses=            (comma-joined; only if Q1.14 = Yes)',
    '  Q1.16 → --guidelines-template  (Yes only)',
    '  Q1.17 → --data-start=          (local|supabase)',
    '  Q1.18 → --test-to-main         (Yes only)',
    '  Always append: --yes',
    '  Project path: pass --project=<absolute path to the app folder>',
    '',
    'After it completes, check the CLI output for a skipped or failed package install. If dependencies were not installed, print the pending install command and do not treat onboarding as complete. Then run `mds doctor` and surface any errors/warnings.',
    '',
    'Rules:',
    '- Never bypass PHASE 0. The marker check is non-negotiable; the user can clear it in seconds by deleting lines.',
    '- Never echo the assembled command line. Summarize choices in plain English instead.',
    '- One question per turn. Show the default. Skip dependent questions when prerequisites are not met.',
    '- Keep technical/agent rules in project/guidelines.md, not project/style.md.',
  ].join('\n');
}

interface SkillSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  uri: string;
}

interface RefactorPlanItem {
  priority: number;
  status: DoctorCheckResult['status'];
  check: string;
  finding: string;
  relatedResources: string[];
  nextStep: string;
}

interface DeployChecklistItem {
  id: string;
  status: 'pass' | 'action' | 'blocker' | 'manual';
  title: string;
  detail: string;
  relatedResources: string[];
}

async function generateRefactorPlan(
  projectPath: string,
  input: Record<string, unknown>
): Promise<{
  kind: 'refactor-plan';
  projectPath: string;
  mode: DoctorMode;
  generatedAt: string;
  focus: string | null;
  summary: DoctorReport['summary'];
  priorities: RefactorPlanItem[];
  recommendedOrder: string[];
  verification: string[];
}> {
  const mode = normalizeMode(readString(input.mode));
  const runScripts = typeof input.runScripts === 'boolean' ? input.runScripts : false;
  const focus = readString(input.focus)?.trim();
  const report = await runDoctor(projectPath, { mode, runScripts });
  const actionableChecks = report.checks
    .filter((check) => check.status === 'error' || check.status === 'warn')
    .filter((check) => (focus ? doctorCheckMatches(check, focus) : true))
    .sort(sortDoctorChecks);

  const priorities = actionableChecks.map((check, index) => ({
    priority: index + 1,
    status: check.status,
    check: check.name,
    finding: check.message,
    relatedResources: relatedResourcesForCheck(check),
    nextStep: nextStepForCheck(check),
  }));

  return {
    kind: 'refactor-plan',
    projectPath: report.projectPath,
    mode: report.mode,
    generatedAt: report.timestamp,
    focus: focus ?? null,
    summary: report.summary,
    priorities,
    recommendedOrder:
      priorities.length > 0
        ? priorities.map((item) => `${item.priority}. ${item.check}: ${item.nextStep}`)
        : [
            'No Doctor warnings or errors matched this refactor request. Keep the current architecture intact.',
          ],
    verification: [
      `Run doctor_scan_project for ${report.projectPath} in ${report.mode} mode after the refactor.`,
      'If route, env, or SSR files changed, run doctor_scan_file on the touched files before the full scan.',
      'Use get_skill for each related MDS skill before making broad architectural edits.',
    ],
  };
}

async function generateDeployChecklist(
  projectPath: string,
  input: Record<string, unknown>
): Promise<{
  kind: 'deploy-checklist';
  projectPath: string;
  target: 'web' | 'ios' | 'android' | 'native' | 'all';
  mode: DoctorMode;
  generatedAt: string;
  summary: DoctorReport['summary'];
  checklist: DeployChecklistItem[];
  unresolvedFindings: RefactorPlanItem[];
  verification: string[];
}> {
  const mode = readString(input.mode) ? normalizeMode(readString(input.mode)) : 'ci';
  const runScripts = typeof input.runScripts === 'boolean' ? input.runScripts : false;
  const target = normalizeDeployTarget(readString(input.target));
  const report = await runDoctor(projectPath, { mode, runScripts });
  const unresolvedFindings = report.checks
    .filter((check) => check.status === 'error' || check.status === 'warn')
    .sort(sortDoctorChecks)
    .map((check, index) => ({
      priority: index + 1,
      status: check.status,
      check: check.name,
      finding: check.message,
      relatedResources: relatedResourcesForCheck(check),
      nextStep: nextStepForCheck(check),
    }));

  return {
    kind: 'deploy-checklist',
    projectPath: report.projectPath,
    target,
    mode: report.mode,
    generatedAt: report.timestamp,
    summary: report.summary,
    checklist: buildDeployChecklist(report, target),
    unresolvedFindings,
    verification: [
      `Run doctor_scan_project with mode "${mode}" and runScripts true before release approval.`,
      'Run the project-specific lint, typecheck, test, and production build commands that CI will run.',
      target === 'web' || target === 'all'
        ? 'Verify metadata, canonical URLs, robots, sitemap, and SSR-safe route behavior in the production web output.'
        : 'Verify native build/profile settings, store metadata readiness, and device smoke tests for selected native targets.',
    ],
  };
}

function listSkillSummaries(query?: string): SkillSummary[] {
  const normalizedQuery = query?.trim().toLowerCase();
  return listKnowledgeResources('skill')
    .filter((resource) => {
      if (!normalizedQuery) {
        return true;
      }
      return [resource.id, resource.name, resource.description, ...resource.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      description: resource.description,
      tags: resource.keywords,
      uri: resource.uri,
    }));
}

function buildDeployChecklist(
  report: DoctorReport,
  target: 'web' | 'ios' | 'android' | 'native' | 'all'
): DeployChecklistItem[] {
  const hasErrors = report.summary.errors > 0;
  const hasWarnings = report.summary.warnings > 0;
  const checkNames = report.checks.map((check) => `${check.name} ${check.message}`.toLowerCase());
  const hasSeoSignal = checkNames.some(
    (value) => value.includes('seo') || value.includes('metadata')
  );
  const hasEnvSignal = checkNames.some(
    (value) => value.includes('env') || value.includes('secret')
  );
  const hasSsrSignal = checkNames.some(
    (value) => value.includes('ssr') || value.includes('window')
  );
  const hasExpoSignal = checkNames.some(
    (value) => value.includes('expo config') || value.includes('expo configuration')
  );

  const items: DeployChecklistItem[] = [
    {
      id: 'doctor-blockers',
      status: hasErrors ? 'blocker' : hasWarnings ? 'action' : 'pass',
      title: 'Clear Doctor findings',
      detail: hasErrors
        ? 'Doctor reported errors that should block release.'
        : hasWarnings
          ? 'Doctor reported warnings; triage them before release approval.'
          : 'Doctor found no warnings or errors for this scan.',
      relatedResources: ['mds://skills/deployment', 'mds://skills/debugging'],
    },
    {
      id: 'env-boundaries',
      status: hasEnvSignal ? 'action' : 'manual',
      title: 'Verify public/private environment boundaries',
      detail:
        'Confirm EXPO_PUBLIC values are safe for client bundles and private service keys stay server-only.',
      relatedResources: ['mds://rules/env-hygiene', 'mds://skills/env-vars'],
    },
    {
      id: 'expo-runtime',
      status: hasExpoSignal ? 'action' : 'manual',
      title: 'Verify Expo config and runtime targets',
      detail:
        'Confirm app config, platform list, web output, and build profiles match the release target.',
      relatedResources: [
        'mds://patterns/project-configuration-patterns',
        'mds://skills/deployment',
      ],
    },
  ];

  if (target === 'web' || target === 'all') {
    items.push(
      {
        id: 'web-metadata',
        status: hasSeoSignal ? 'action' : 'manual',
        title: 'Verify web SEO metadata',
        detail:
          'Check title, description, canonical URL, Open Graph tags, sitemap, and robots strategy.',
        relatedResources: ['mds://rules/seo-metadata', 'mds://skills/seo-metadata'],
      },
      {
        id: 'web-ssr-safety',
        status: hasSsrSignal ? 'action' : 'manual',
        title: 'Verify SSR-safe web/server code',
        detail: 'Guard browser globals and keep native-only imports out of server execution paths.',
        relatedResources: ['mds://rules/ssr-safety', 'mds://skills/expo-ssr-safety'],
      }
    );
  }

  if (target === 'ios' || target === 'android' || target === 'native' || target === 'all') {
    items.push({
      id: 'native-build-readiness',
      status: 'manual',
      title: 'Verify native build readiness',
      detail:
        'Run the selected EAS/local native build profile and smoke test the target platform before store or client release.',
      relatedResources: ['mds://skills/deployment', 'mds://reference/package-ci-patterns'],
    });
  }

  return items;
}

function doctorCheckMatches(check: DoctorCheckResult, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  return [check.name, check.message, JSON.stringify(check.details ?? {})]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function sortDoctorChecks(a: DoctorCheckResult, b: DoctorCheckResult): number {
  return severityRank(a.status) - severityRank(b.status) || a.name.localeCompare(b.name);
}

function severityRank(status: DoctorCheckResult['status']): number {
  return status === 'error' ? 0 : status === 'warn' ? 1 : status === 'skip' ? 2 : 3;
}

function relatedResourcesForCheck(check: DoctorCheckResult): string[] {
  const text = `${check.name} ${check.message}`.toLowerCase();
  const resources = new Set<string>(['mds://skills/debugging']);

  if (
    text.includes('animation') ||
    text.includes('motion') ||
    text.includes('parallax') ||
    text.includes('reanimated') ||
    text.includes('scroll-linked') ||
    text.includes('lottie')
  ) {
    resources.add('mds://skills/animation-motion');
    resources.add('mds://guides/animation-performance');
    resources.add('mds://patterns/animation-motion-selection');
  }
  if (text.includes('env') || text.includes('secret') || text.includes('public') || text.includes('credential')) {
    resources.add('mds://rules/env-hygiene');
    resources.add('mds://skills/env-vars');
  }
  if (
    text.includes('ssr') ||
    text.includes('window') ||
    text.includes('document') ||
    text.includes('localstorage') ||
    text.includes('runtime security') ||
    text.includes('server-only') ||
    text.includes('localhost')
  ) {
    resources.add('mds://rules/ssr-safety');
    resources.add('mds://skills/expo-ssr-safety');
  }
  if (text.includes('runtime security')) {
    resources.add('mds://rules/env-hygiene');
    resources.add('mds://skills/env-vars');
  }
  if (text.includes('seo') || text.includes('metadata') || text.includes('canonical')) {
    resources.add('mds://rules/seo-metadata');
    resources.add('mds://skills/seo-metadata');
  }
  if (text.includes('api safety')) {
    resources.add('mds://skills/api-routes');
    resources.add('mds://patterns/api-api-routes');
    resources.add('mds://patterns/api-error-handling');
  }
  if (text.includes('router safety')) {
    resources.add('mds://skills/expo-router-architecture');
    resources.add('mds://patterns/routing-route-groups');
    resources.add('mds://rules/app-folder-architecture');
  }
  if (text.includes('app architecture') || text.includes('route') || text.includes('app/')) {
    resources.add('mds://rules/app-folder-architecture');
    resources.add('mds://skills/expo-router-architecture');
  }
  if (text.includes('styling') || text.includes('uniwind') || text.includes('tailwind')) {
    resources.add('mds://skills/uniwind-theming');
  }
  if (
    text.includes('expo') ||
    text.includes('build') ||
    text.includes('script') ||
    text.includes('package')
  ) {
    resources.add('mds://skills/deployment');
  }

  return [...resources];
}

function nextStepForCheck(check: DoctorCheckResult): string {
  const text = `${check.name} ${check.message}`.toLowerCase();
  if (
    text.includes('animation') ||
    text.includes('motion') ||
    text.includes('parallax') ||
    text.includes('reanimated') ||
    text.includes('scroll-linked') ||
    text.includes('lottie')
  ) {
    return 'Classify the motion first, simplify repeated or scroll-linked work where needed, then verify the release-build behavior on the affected screen.';
  }
  if (text.includes('env') || text.includes('secret')) {
    return 'Separate public client config from private server secrets, then rerun the affected file/project scan.';
  }
  if (text.includes('ssr') || text.includes('window') || text.includes('document')) {
    return 'Move client-only runtime access behind platform/lifecycle guards or isolate it from server paths.';
  }
  if (text.includes('seo') || text.includes('metadata')) {
    return 'Add or normalize route metadata, canonical/indexing strategy, and web output verification.';
  }
  if (text.includes('api safety')) {
    return 'Validate HTTP methods and request schemas, enforce auth on sensitive endpoints, and keep error bodies from leaking internals.';
  }
  if (text.includes('router safety')) {
    return 'Keep route groups and layouts intentional, avoid string-assembled hrefs, and move mixed business logic out of app/.';
  }
  if (text.includes('app architecture') || text.includes('route')) {
    return 'Move business/data logic out of route files and keep app/ focused on routing shells.';
  }
  if (text.includes('script') || text.includes('build') || text.includes('package')) {
    return 'Fix the failing or missing package script so local checks match CI/release expectations.';
  }
  return 'Apply the smallest targeted fix, then rerun Doctor to confirm the finding is resolved.';
}

function normalizeDeployTarget(
  value: string | undefined
): 'web' | 'ios' | 'android' | 'native' | 'all' {
  return value === 'web' ||
    value === 'ios' ||
    value === 'android' ||
    value === 'native' ||
    value === 'all'
    ? value
    : 'all';
}

async function searchMdsLibrary(input: Record<string, unknown>): Promise<unknown> {
  const projectPath = readString(input.projectPath);
  const compatibilityContext = projectPath ? await inspectLibraryProject(projectPath) : undefined;
  const tags = readStringArray(input.tags);
  const categories = readStringArray(input.categories);

  return searchLibraryItems(readString(input.query) ?? '', {
    kind: normalizeLibraryItemKind(readString(input.kind)),
    source: normalizeLibrarySource(readString(input.source)),
    tags: tags.length > 0 ? tags : undefined,
    categories: categories.length > 0 ? categories : undefined,
    compatibleWith: compatibilityContext,
  });
}

async function getMdsLibraryItem(input: Record<string, unknown>): Promise<unknown> {
  const id = readString(input.id);
  if (!id) {
    throw new Error('library_get requires id.');
  }
  if (!getLibraryItem(id)) {
    throw new Error(`Unknown library item: ${id}`);
  }

  const projectPath = readString(input.projectPath);
  const compatibilityContext = projectPath ? await inspectLibraryProject(projectPath) : undefined;
  return resolveLibraryItem(id, compatibilityContext, {
    variant: readString(input.variant),
  });
}

async function planMdsLibraryAdd(input: Record<string, unknown>): Promise<unknown> {
  const id = readString(input.id);
  const projectPath = readString(input.projectPath);
  if (!id) {
    throw new Error('library_plan_add requires id.');
  }
  if (!projectPath) {
    throw new Error('library_plan_add requires projectPath.');
  }

  return planLibraryAdd(projectPath, id, {
    variant: readString(input.variant),
  });
}

async function addMdsLibraryItem(input: Record<string, unknown>): Promise<unknown> {
  const id = readString(input.id);
  const projectPath = readString(input.projectPath);
  const planHash = readString(input.planHash);
  if (!id) {
    throw new Error('library_add requires id.');
  }
  if (!projectPath) {
    throw new Error('library_add requires projectPath.');
  }
  if (input.confirmed !== true) {
    throw new Error('library_add requires confirmed=true after the user approves the add plan.');
  }
  if (!planHash) {
    throw new Error('library_add requires the planHash returned by library_plan_add.');
  }

  const variant = readString(input.variant);
  const currentPlan = await planLibraryAdd(projectPath, id, { variant });
  if (currentPlan.planHash !== planHash) {
    throw new Error(
      'library_add rejected a stale planHash. Run library_plan_add again and confirm the unchanged plan.'
    );
  }

  return applyLibraryAdd(projectPath, id, {
    variant,
    planHash,
    confirmed: true,
    installDependencies: readBoolean(input.installDependencies),
  });
}

function normalizeLibraryItemKind(value: string | undefined): LibraryItemKind | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value === 'component' ||
    value === 'animation' ||
    value === 'screen' ||
    value === 'flow' ||
    value === 'integration'
  ) {
    return value;
  }
  throw new Error(`Unsupported MDS Library item kind: ${value}`);
}

function normalizeLibrarySource(value: string | undefined): LibrarySourceName | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value === 'mds' ||
    value === 'create-expo-app' ||
    value === 'create-expo-stack' ||
    value === 'nativewindui' ||
    value === 'swmansion'
  ) {
    return value;
  }
  throw new Error(`Unsupported MDS Library source: ${value}`);
}

function normalizeMode(value: string | undefined): DoctorMode {
  return value === 'ci' || value === 'full' || value === 'fast' ? value : 'fast';
}

function normalizeKind(value: string | undefined): KnowledgeKind | undefined {
  return value === 'pattern' ||
    value === 'guide' ||
    value === 'rule' ||
    value === 'skill' ||
    value === 'reference'
    ? value
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getMcpServerRuntimeVersion(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const packageJsonPath = path.resolve(moduleDir, '..', 'package.json');
  return readPackageVersion(packageJsonPath, '0.1.8') ?? '0.1.8';
}

function getMcpServerPackageJsonPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, '..', 'package.json');
}

export function classifyMcpServerRuntimeMode(
  packageJsonPath: string
): 'local-node' | 'published-npx' {
  const normalized = packageJsonPath.replace(/\\/gu, '/').toLowerCase();
  if (normalized.includes('/packages/mcp-server/')) {
    return 'local-node';
  }
  if (
    normalized.includes('/_npx/') ||
    normalized.includes('/npm-cache/') ||
    normalized.includes('/cache/') ||
    normalized.includes('/.npm/')
  ) {
    return 'published-npx';
  }
  return 'published-npx';
}

function getMdsRuntimeVersions(): {
  mcpServerVersion: string;
  cliVersion: string | null;
  createExpoStackVersion: string | null;
  createExpoSuperStack: {
    version: string | null;
    invocation: string;
    source: 'local-build' | 'published-latest' | 'npm-exec';
    target: string;
  };
  intakeToolsAvailable: boolean;
  runtimeMode: 'local-node' | 'published-npx';
  versionVisibility: 'direct' | 'isolated';
  versionVisibilityReason: string;
  warnings: string[];
} {
  const packageJsonPath = getMcpServerPackageJsonPath();
  const invocation = resolveSuperStackInvocationSpec({ packageJsonPath });
  const runtimeMode = classifyMcpServerRuntimeMode(packageJsonPath);
  const localCliPath = resolveLocalSuperStackCliPath(packageJsonPath);
  const cliVersion = resolveInstalledPackageVersion('@mr.dj2u/cli');
  const createExpoSuperStackVersion =
    (localCliPath
      ? readPackageVersion(path.resolve(path.dirname(localCliPath), '..', 'package.json'), null)
      : null) ?? resolveInstalledPackageVersion('create-expo-super-stack');
  const createExpoStackVersion =
    resolveInstalledPackageVersion('@mr.dj2u/create-expo-stack') ??
    resolveInstalledPackageVersion('create-expo-stack');
  const warnings: string[] = [];
  if (runtimeMode === 'local-node' && !localCliPath) {
    warnings.push(
      'Local MCP runtime could not find packages/create-expo-super-stack/dist/cli.js, so generation will fall back to the published package.'
    );
  }
  const versionVisibility =
    runtimeMode === 'published-npx' && !localCliPath ? 'isolated' : 'direct';
  const versionVisibilityReason =
    invocation.source === 'local-build'
      ? 'This MCP session is using the local create-expo-super-stack build from the repo, so its version and path are directly inspectable.'
      : versionVisibility === 'isolated'
        ? runtimeMode === 'published-npx'
          ? 'This MCP session is running from the published package, so local package versions are not directly inspectable from this process.'
          : 'This MCP session can run create-expo-super-stack on demand, so that package may not appear as a locally installed dependency in this process.'
        : 'This MCP session can directly inspect the installed package versions it is using.';

  return {
    mcpServerVersion: getMcpServerRuntimeVersion(),
    cliVersion,
    createExpoStackVersion,
    createExpoSuperStack: {
      version: createExpoSuperStackVersion,
      invocation: invocation.display,
      source: invocation.source,
      target: invocation.target,
    },
    intakeToolsAvailable: true,
    runtimeMode,
    versionVisibility,
    versionVisibilityReason,
    warnings,
  };
}

function resolveCreateExpoSuperStackInfo(input: Record<string, unknown>): {
  status: 'needs-input' | 'confirm';
  parentDir?: string;
  appName?: string;
  answers: Record<string, unknown>;
  summaryLines: string[];
  missingQuestionIds: string[];
  ambiguousQuestionIds: string[];
  extracted: ReturnType<typeof extractCessInfoFromMarkdown>;
  runtime: ReturnType<typeof getMdsRuntimeVersions>;
  generateInput?: {
    parentDir: string;
    appName: string;
    answers: Record<string, unknown>;
    canonicalProjectInfoMarkdown: string;
    confirmed: true;
  };
} {
  const infoMarkdown = readString(input.infoMarkdown);
  if (!infoMarkdown) {
    throw new Error('create_expo_super_stack_resolve_info requires infoMarkdown.');
  }
  const overrides = readRecord(input.answers) ?? {};
  assertNoUnsupportedCessAliasKeys(overrides);

  const extracted = extractCessInfoFromMarkdown({
    infoMarkdown,
    styleMarkdown: readString(input.styleMarkdown),
    parentDir: readString(input.parentDir),
    appName: readString(input.appName),
  });
  const parentDir = readString(input.parentDir);
  const appName = readString(input.appName) ?? extracted.derivedFolderSlug;
  const answers = {
    ...extracted.prefilledAnswers,
    ...overrides,
    saveDefaults:
      readBoolean(overrides.saveDefaults) ?? extracted.prefilledAnswers.saveDefaults ?? false,
  };
  const missingQuestionIds = validateCessGenerationReadiness({
    parentDir,
    appName,
    answers,
  });
  const canConfirm =
    Boolean(parentDir && appName) &&
    missingQuestionIds.length === 0 &&
    extracted.ambiguousQuestionIds.length === 0;
  const resolvedPlan = canConfirm
    ? resolveCessPlan({
        parentDir,
        appName,
        answers,
      })
    : null;
  const summaryLines = resolvedPlan?.summaryLines ?? [];
  const canonicalProjectInfoMarkdown =
    resolvedPlan && parentDir && appName
      ? buildCanonicalProjectInfoMarkdown({
          projectPath: path.resolve(parentDir, appName),
          sourceInfoMarkdown: infoMarkdown,
          plan: resolvedPlan,
        })
      : undefined;

  return {
    status: canConfirm ? 'confirm' : 'needs-input',
    parentDir,
    appName,
    answers,
    summaryLines,
    missingQuestionIds,
    ambiguousQuestionIds: extracted.ambiguousQuestionIds,
    extracted,
    runtime: getMdsRuntimeVersions(),
    generateInput: canConfirm
      ? {
          parentDir: parentDir as string,
          appName: appName as string,
          answers,
          canonicalProjectInfoMarkdown: canonicalProjectInfoMarkdown as string,
          confirmed: true,
        }
      : undefined,
  };
}

function assertNoUnsupportedCessAliasKeys(answers: Record<string, unknown> | undefined): void {
  if (!answers) {
    return;
  }
  const unsupportedKeys = [
    'language',
    'routing',
    'style',
    'auth',
    'projectDocs',
    'guidelines',
  ].filter((key) => key in answers);
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `Unsupported Create Expo Super Stack answer keys: ${unsupportedKeys.join(', ')}. ` +
        'Use canonical intake keys such as scriptLanguage, navigationLibrary, stylingSystem, authBackend, and guidelinesTemplate, or call create_expo_super_stack_resolve_info.'
    );
  }
}

async function generateCreateExpoSuperStack(input: Record<string, unknown>): Promise<{
  status: 'generated';
  projectPath: string;
  summaryLines: string[];
  runtime: ReturnType<typeof getMdsRuntimeVersions>;
  roadmap: Awaited<ReturnType<typeof generateProjectRoadmap>>;
  stdoutTail: string;
  stderrTail: string;
}> {
  const parentDir = readString(input.parentDir);
  const appName = readString(input.appName);
  const answers = readRecord(input.answers);
  assertNoUnsupportedCessAliasKeys(answers);
  const confirmed = input.confirmed === true;
  const missingRequirements = validateCessGenerationReadiness({
    parentDir,
    appName,
    answers,
  });

  if (!confirmed) {
    throw new Error(
      'create_expo_super_stack_generate requires confirmed=true after the user explicitly approves the summary.'
    );
  }
  if (missingRequirements.length > 0) {
    throw new Error(
      `Cannot generate yet. Missing guided intake answers for: ${missingRequirements.join(', ')}.`
    );
  }

  const plan = resolveCessPlan({
    parentDir,
    appName,
    answers: {
      ...(answers ?? {}),
      confirmed: true,
    },
  });
  const canonicalProjectInfoMarkdown = readString(input.canonicalProjectInfoMarkdown);
  const invocation = resolveSuperStackInvocationSpec();
  const commandArgs = [...invocation.args, ...buildCreateExpoSuperStackArgv(plan)];
  const result = await runCommandCapture(invocation.command, commandArgs, plan.parentDir);
  const missingArtifacts = findMissingSuperStackArtifacts(
    plan.projectPath,
    plan.onboardAnswers.appDirectory
  );
  if (missingArtifacts.length > 0) {
    throw new Error(
      [
        `create-expo-super-stack did not finish Super Stack scaffolding for ${plan.projectPath}.`,
        `Missing expected artifacts: ${missingArtifacts.join(', ')}.`,
        'The base Expo app may have been created, but the MDS onboarding/scaffold step did not complete.',
        '',
        'stdout tail:',
        tailText(result.stdout, 20) || '(empty)',
        '',
        'stderr tail:',
        tailText(result.stderr, 20) || '(empty)',
      ].join('\n')
    );
  }
  const roadmap = await finalizeGeneratedSuperStackProject({
    projectPath: plan.projectPath,
    appDirectory: plan.onboardAnswers.appDirectory,
    canonicalProjectInfoMarkdown,
  });

  return {
    status: 'generated',
    projectPath: plan.projectPath,
    summaryLines: plan.summaryLines,
    runtime: getMdsRuntimeVersions(),
    roadmap,
    stdoutTail: tailText(result.stdout, 60),
    stderrTail: tailText(result.stderr, 40),
  };
}

function buildCanonicalProjectInfoMarkdown(input: {
  projectPath: string;
  sourceInfoMarkdown: string;
  plan: ReturnType<typeof resolveCessPlan>;
}): string {
  return ensureTrailingNewline(
    renderInfo(input.projectPath, input.plan.onboardAnswers, input.sourceInfoMarkdown, {
      preserveImportedNotes: false,
    })
  );
}

export async function finalizeGeneratedSuperStackProject(input: {
  projectPath: string;
  appDirectory: 'src' | 'root';
  canonicalProjectInfoMarkdown?: string;
}): Promise<Awaited<ReturnType<typeof generateProjectRoadmap>>> {
  if (input.canonicalProjectInfoMarkdown) {
    await writeFile(
      path.join(input.projectPath, 'project', 'info.md'),
      ensureTrailingNewline(input.canonicalProjectInfoMarkdown),
      'utf8'
    );
  }

  return await generateProjectRoadmap(input.projectPath, {
    write: true,
    initialize: true,
  });
}

async function runCommandCapture(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32' && command !== 'node' && command !== process.execPath,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
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
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `create-expo-super-stack exited with code ${code ?? 'unknown'}.\n${tailText(stderr || stdout, 40)}`
        )
      );
    });
  });
}

function tailText(value: string, lines: number): string {
  return value.split(/\r?\n/u).filter(Boolean).slice(-lines).join('\n');
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
}

function findMissingSuperStackArtifacts(
  projectPath: string,
  appDirectory: 'src' | 'root'
): string[] {
  const requiredFiles = [
    'project/info.md',
    'project/todo.md',
    'project/style.md',
    'project/guidelines.md',
  ];
  const stylistRoute =
    appDirectory === 'src' ? 'src/app/exposition/stylist.tsx' : 'app/exposition/stylist.tsx';
  requiredFiles.push(stylistRoute);
  return requiredFiles.filter((relativePath) => !existsSync(path.join(projectPath, relativePath)));
}

function resolveInstalledPackageVersion(packageName: string): string | null {
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve(packageName);
    return readPackageVersion(findNearestPackageJson(resolved), null);
  } catch {
    return null;
  }
}

function findNearestPackageJson(startPath: string): string {
  let current = path.dirname(startPath);
  for (;;) {
    const candidate = path.join(current, 'package.json');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return candidate;
    }
    current = parent;
  }
}

function readPackageVersion(packageJsonPath: string, fallback: string | null): string | null {
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Record<string, unknown>;
    return typeof parsed.version === 'string' && parsed.version.trim().length > 0
      ? parsed.version
      : fallback;
  } catch {
    return fallback;
  }
}

function explainDoctorResult(input: Record<string, unknown>): string {
  const status = readString(input.status) ?? 'unknown';
  const message = readString(input.message) ?? 'No message provided.';
  const severity =
    status === 'error'
      ? 'This should block shipping until it is fixed.'
      : status === 'warn'
        ? 'This is worth fixing, but it may not block local development.'
        : 'This result does not require action.';

  return `${severity}\n\nFinding: ${message}\n\nNext step: inspect the named file or script, apply the smallest fix, then rerun mds doctor.`;
}

function generateSetupTasks(projectPath: string, defaults: string[]): string[] {
  const selected = defaults.length > 0 ? defaults : ['project-docs', 'doctor', 'uniwind'];
  const tasks = [
    `Detect package manager, Expo SDK, router, app folder, aliases, and styling stack in ${projectPath}.`,
    'Ask for app goal, audience, core flows, must-include screens/flows, data needs, and deployment target.',
  ];

  if (selected.includes('project-docs')) {
    tasks.push(
      'Create project/info.md, project/todo.md, project/style.md, and project/guidelines.md.'
    );
  }
  if (selected.includes('uniwind')) {
    tasks.push('Add or verify Tailwind v4 plus Uniwind configuration.');
  }
  if (selected.includes('zustand')) {
    tasks.push('Scaffold Zustand only for shared state that route-local state cannot handle.');
  }
  if (selected.includes('supabase')) {
    tasks.push('Add Supabase env docs and client/server boundary guidance.');
  }
  tasks.push('Run mds doctor after scaffolding selected pieces.');

  return tasks;
}

function toolJson(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return toolText(JSON.stringify(value, null, 2));
}

function toolText(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

function isDirectRun(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  startStdioServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Fatal error in mr-djs-dev-suite MCP server:', message);
    process.exit(1);
  });
}
