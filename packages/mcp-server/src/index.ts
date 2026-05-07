import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { runDoctor, scanFile } from '@mrdj/doctor';
import {
  getSkill,
  listKnowledgeResources,
  readKnowledgeResource,
} from '@mrdj/knowledge';

import type { DoctorMode } from '@mrdj/doctor';
import type { KnowledgeKind } from '@mrdj/knowledge';

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
      name: 'mrdj-dev-suite',
      version: '0.1.0',
      description: 'MrDJ Expo dev-suite Doctor, knowledge resources, and onboarding prompts.',
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
  console.error('mrdj-dev-suite MCP server running on stdio');
  process.stdin.resume();
}

export function listTools(): MCPTool[] {
  return [
    {
      name: 'doctor_scan_project',
      description: 'Run MrDJ Doctor checks against a project folder.',
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
      description: 'List MrDJ knowledge resources by kind.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['pattern', 'guide', 'rule', 'skill', 'reference'] },
        },
      },
    },
    {
      name: 'get_skill',
      description: 'Read a bundled MrDJ agent skill.',
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
      description: 'Read a bundled MrDJ knowledge guide.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
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

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
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
    case 'get_skill': {
      const id = readString(input.id);
      return id ? getSkill(id) : null;
    }
    case 'get_guide': {
      const id = readString(input.id);
      return id ? readKnowledgeResource(`mrdj://guides/${id}`) : null;
    }
    case 'generate_setup_tasks': {
      return generateSetupTasks(readString(input.projectPath) ?? '.', readStringArray(input.defaults));
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
    'doctor_scan_project',
    {
      title: 'Doctor Scan Project',
      description: 'Run MrDJ Doctor checks against a project folder.',
      inputSchema: {
        projectPath: z.string(),
        mode: z.enum(['fast', 'ci', 'full']).optional(),
        runScripts: z.boolean().optional(),
      },
    },
    async ({ projectPath, mode, runScripts }) => {
      const report = await runDoctor(projectPath, { mode: mode ?? 'fast', runScripts });
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
      description: 'List MrDJ knowledge resources by kind.',
      inputSchema: {
        kind: z.enum(['pattern', 'guide', 'rule', 'skill', 'reference']).optional(),
      },
    },
    async ({ kind }) => toolJson(listKnowledgeResources(kind))
  );

  server.registerTool(
    'get_skill',
    {
      title: 'Get Skill',
      description: 'Read a bundled MrDJ agent skill.',
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
      description: 'Read a bundled MrDJ knowledge guide.',
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => toolJson(await readKnowledgeResource(`mrdj://guides/${id}`))
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
    async ({ projectPath, defaults }) => toolJson(generateSetupTasks(projectPath ?? '.', defaults ?? []))
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'onboard_new_expo_app',
    {
      title: 'Onboard New Expo App',
      description: 'Guide an agent through MrDJ post-create onboarding for an Expo app.',
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
            text:
              `Run MrDJ post-create onboarding for ${projectPath ?? 'the current Expo project'}.\n` +
              'Detect the app shape, ask for app goal/audience/core flows/data/deployment, ' +
              'offer selected defaults, scaffold only confirmed pieces, and run Doctor afterward.',
          },
        },
      ],
    })
  );
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
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
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

  return `${severity}\n\nFinding: ${message}\n\nNext step: inspect the named file or script, apply the smallest fix, then rerun mrdj doctor.`;
}

function generateSetupTasks(projectPath: string, defaults: string[]): string[] {
  const selected = defaults.length > 0 ? defaults : ['project-docs', 'doctor', 'uniwind'];
  const tasks = [
    `Detect package manager, Expo SDK, router, app folder, aliases, and styling stack in ${projectPath}.`,
    'Ask for app goal, audience, core flows, data needs, and deployment target.',
  ];

  if (selected.includes('project-docs')) {
    tasks.push('Create project/info.md, project/todo.md, and project/style.md.');
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
  tasks.push('Run mrdj doctor after scaffolding selected pieces.');

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
    console.error('Fatal error in mrdj-dev-suite MCP server:', message);
    process.exit(1);
  });
}
