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
            text: buildOnboardPromptText(projectPath),
          },
        },
      ],
    })
  );
}

export function buildOnboardPromptText(projectPath?: string): string {
  const target = projectPath ?? 'the current Expo project';
  return [
    `You are running MrDJ agentic post-create onboarding for ${target}.`,
    '',
    'STEP 0 — Blocker check (do this before anything else).',
    `  Read project/info.md, project/style.md, project/guidelines.md, and project/todo.md from ${target}.`,
    '  Search each file for the literal marker `# TodoForContext(optional):`.',
    '  If ONE OR MORE markers are still present:',
    '    1. STOP. Do not begin intake. Do not propose a plan. Do not scaffold anything.',
    "    2. List every file + line that still contains a marker, and quote the marker's hint text.",
    '    3. Tell the user, verbatim:',
    '         "These TodoForContext lines are blocking onboarding. For each one,',
    '          either fill out the section underneath OR delete the marker line to',
    '          acknowledge you do not want to add that context. Save the file, then',
    '          tell me to re-check."',
    '    4. Wait for the user. When they say re-check, repeat Step 0 from scratch.',
    '  Only when zero markers remain may you proceed to Step 1.',
    '',
    'STEP 1 — Intake conversation.',
    '  Using the cleaned project memory as context, ask one focused question at a time to confirm:',
    '  app purpose, primary audience, first 1-3 core user flows, data needs, deployment target,',
    '  target platforms, monetization stance, team context, and release strategy.',
    '  Reuse anything project/info.md already states; do not re-ask questions whose answers are clearly written.',
    '',
    'STEP 2 — Normalize.',
    '  Reshape what you learned into the canonical project/info.md and project/style.md sections.',
    '  Preserve any "Imported Notes" sections verbatim.',
    '  Do not invent details the user did not provide; leave a short "Open question:" line instead.',
    '',
    'STEP 3 — Plan.',
    '  Update project/todo.md with a phase-ordered task list driven by the intake answers.',
    '  Surface tradeoffs (e.g. Supabase vs local data, server vs static web) and let the user pick before writing scaffolding.',
    '',
    'STEP 4 — Scaffold only what was confirmed.',
    '  Use the MCP tools `generate_setup_tasks`, `get_skill`, and `get_guide` for guidance.',
    '  After each scaffold step, run `doctor_scan_project` and surface any new errors/warnings to the user.',
    '',
    'Rules:',
    '- Never bypass Step 0. The marker check is non-negotiable; the user can clear it in seconds by deleting lines.',
    '- Prefer asking over assuming. One question per turn.',
    '- Keep technical/agent rules in project/guidelines.md, not project/style.md.',
  ].join('\n');
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
    tasks.push('Create project/info.md, project/todo.md, project/style.md, and project/guidelines.md.');
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
