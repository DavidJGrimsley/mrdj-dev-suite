import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { runDoctor, scanFile } from '@mr.dj2u/doctor';
import { buildContinueSessionBrief } from '@mr.dj2u/cli/continue';
import {
  getSkill,
  listKnowledgeResources,
  readKnowledgeResource,
} from '@mr.dj2u/knowledge';

import type { DoctorMode } from '@mr.dj2u/doctor';
import type { DoctorCheckResult, DoctorReport } from '@mr.dj2u/doctor';
import type { KnowledgeKind } from '@mr.dj2u/knowledge';

export function resolveSuperStackInvocation(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const localBin = path.resolve(moduleDir, '..', '..', 'create-expo-super-stack', 'dist', 'cli.js');
  if (existsSync(localBin)) {
    return `node "${localBin}"`;
  }
  return 'npx -y create-expo-super-stack';
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
      version: '0.1.2',
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
      description: 'Build an MDS Continue session brief for an onboarded app folder.',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
        },
      },
    },
    {
      name: 'doctor_scan_project',
      description: 'Run MDS Doctor checks against a project folder.',
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
      description: 'Generate a target-aware deployment checklist using Doctor findings and MDS guidance.',
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
      description: 'Run MDS Doctor checks against a project folder.',
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
      description: 'Generate a target-aware deployment checklist using Doctor findings and MDS guidance.',
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

const INFO_TEMPLATE_URL = 'https://davidjgrimsley.com/public-facing/ai/mr-djs-dev-suite/templates/info.md';

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
    "      'clear'      → skip the question; tell the user briefly: \"(using your info.md value: <short paraphrase>)\".",
    "      'ambiguous'  → ask the question, citing the relevant line from the file as context.",
    "      'unknown'    → ask normally.",
    '  - Never invent answers. If the file is silent on a question, ask normally.',
    '',
  ].join('\n');
}

function creditsAndWaitMessage(): string {
  return [
    'When confirmed, run the generator silently from the parent folder via your shell tool. Do NOT print the command.',
    '',
    'Then output the following message verbatim (it gives the user something to read while the generator runs):',
    '',
    '  """',
    '  Generating now. This typically takes 2-5 minutes. While we wait, let\'s shout out and recognize how this is working.',
    '',
    "  create-expo-super-stack by Mr. DJ (who also built this agentic flow) wraps create-expo-stack by Roni Oss with major contributions by Dan Stepanov. Big thanks to them and to several other teams and individuals whose work and educational materials fill Mr. DJ's Dev Suite knowledge base:",
    '',
    '    - Expo team (Evan Bacon for Expo Router, Brent Vatne, Charlie Cheever, and the broader Expo crew)',
    '    - React and React Native core teams',
    '    - Software Mansion (Reanimated, Gesture Handler, Screens, Worklets — Krzysztof Magiera and team)',
    '    - Supabase, Drizzle, and Zustand teams',
    '    - Adam Wathan and the Tailwind CSS team (the foundation Uniwind and NativeWind build on)',
    "    - Janic Duplessis for 'The real cost of React Native animations: benchmarking every approach'",
    '    - Simon Grimm of Galaxies.dev',
    '    - Beto Adrian Maldonado of codewithbeto.dev',
    '    - Vadim of notJust.dev',
    '    - William Candillon for the React Native animation deep-dive content',
    '    - Catalin Miron for the React Native animation tutorials',
    '    - Infinite Red / Jamon Holmgren for Ignite and the broader RN community',
    '',
    "  Their contributions to the software development community are what fill the pages of Mr. DJ's Dev Suite knowledge base, alongside contributions and organization by Mr. DJ. Please enjoy the experience of the Mr. DJ's Dev Suite plugin as you continue your development.",
    '  """',
    '',
    'Then surface generator output as it arrives. Do not echo the assembled command. If the generator surfaces an interactive prompt despite flags, relay it to the user.',
  ].join('\n');
}

export function buildCreateExpoSuperStackPromptText(parentDir?: string, appName?: string): string {
  const looksLikePath = (s: string) => s.includes('/') || s.includes('\\') || s.includes(':');
  const parent =
    parentDir && looksLikePath(parentDir) ? parentDir : 'the current working directory';
  const appHint = appName ? ` The user already named the app: \`${appName}\`.` : '';
  const superStack = resolveSuperStackInvocation();
  return [
    `You are kicking off a brand-new Expo app from ${parent}.${appHint}`,
    '',
    'You are NOT inside the app folder yet — the folder does not exist. The generator will create it.',
    '',
    'IMPORTANT: Drive this entire flow conversationally. Never echo the assembled command line, never paste a flag string. Run the generator silently when all answers are gathered. The user should feel like a chat, not a CLI session.',
    '',
    'IMPORTANT: Ask EXACTLY one question per turn. Number multi-choice options. Always show the default and let the user just say "default" or press enter. Accept numbers, label text, or natural language ("all", "first three", "android only").',
    'IMPORTANT: If the very first user message is a single bare word like "go", "start", "yes", "run", or similar — treat it as "proceed" and do NOT interpret it as a folder path or app name. Use the current working directory as the parent.',
    '',
    fileIntakePhase('PHASE 0 — Optional: attach existing project memory'),
    '====== PHASE 1 — Project name and parent folder ======',
    '',
    `Q1.1 — Confirm: ${parent} is the parent folder where the new app folder will be created. Yes / change to a different folder?`,
    `Q1.2 — App name? (kebab-case suggested, e.g. \`my-new-app\`)${appHint ? ' — already provided, just confirm.' : ''}`,
    'Verify the chosen app folder does not already exist before proceeding.',
    '',
    '====== PHASE 2 — Stack choices (passed to create-expo-stack as flags) ======',
    '',
    'Q2.1 — TypeScript or JavaScript?',
    '  1. TypeScript (default — strongly recommended)',
    '  2. JavaScript',
    '',
    'Q2.2 — Package manager?',
    '  1. npm (default)',
    '  2. pnpm',
    '  3. yarn',
    '  4. bun',
    '',
    'Q2.3 — Navigation library?',
    '  1. Expo Router (default — file-based routing, recommended)',
    '  2. React Navigation',
    '',
    'Q2.4 — Navigation type? (only ask if React Navigation; Expo Router uses file-based routing)',
    '  1. Stack (default)',
    '  2. Tabs',
    '  3. Drawer',
    '',
    'Q2.5 — Styling system?',
    '  1. Uniwind (default — Tailwind v4 universal styling, MDS preference)',
    '  2. NativeWind (Tailwind v3 for React Native)',
    '  3. Tamagui',
    '  4. Restyle',
    '  5. StyleSheet (no library)',
    '',
    'Q2.6 — State management?',
    '  1. Zustand (default — small, simple)',
    '  2. None / decide later',
    '',
    'Q2.7 — Authentication backend?',
    '  1. None (default — wire up later)',
    '  2. Supabase',
    '  3. Firebase',
    '',
    'Q2.8 — Set up EAS now?',
    '  1. No (default — you can add it later)',
    '  2. Yes',
    '',
    '====== PHASE 3 — MDS project memory & roadmap (passed as --mds-* flags) ======',
    '',
    'Q3.1 — App display name? (defaults to the project name from Q1.2 — confirm or override)',
    '',
    'Q3.2 — Who is this app for? Include user type, demographic, role, or context if known.',
    '',
    'Q3.3 — What should users be able to do first? Examples: sign up, create a project, invite teammates, checkout. (Press enter / say "defer" to let an agent derive this later from project/info.md.)',
    '',
    'Q3.3a — What screens do you know you will need in the app as of now? (Press enter / say "defer" to leave a TodoForContext marker.)',
    '',
    'Q3.4 — Which data categories does the app need? (multi-select — reply with comma-separated numbers, or label text, or "all")',
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
    'Q3.5 — Which platforms will this app target? (multi-select)',
    '  1. Web',
    '  2. iOS',
    '  3. Android',
    '  4. Apple TV',
    '  5. Android TV',
    '  Default: 1, 2, 3',
    '  Note: Android TV builds from the same Android target with leanback config in app.json. Apple TV is a separate tvOS build target via react-native-tvos. Selecting either TV option records the intent in project memory; configuration is applied later.',
    '',
    'Q3.6 — Which selected platform should be the first MVP target? (only ask if Q3.5 has more than one)',
    '',
    'Q3.7 — When platforms diverge, how should platform-specific code be organized? (only if multi-platform)',
    '  1. File suffixes only (default — e.g. screen.web.tsx. Good for small to medium projects targeting web and mobile)',
    '  2. Platform folders (recommended for large projects, very different UI on each platform, or targeting TV and other platforms from one codebase)',
    '',
    'Q3.7a — Where should the Expo Router app folder live?',
    '  1. src/app (default — MDS preference for new Super Stack apps)',
    '  2. app (root-level app folder)',
    '',
    'Q3.7b — Do selected platforms need their own layouts? (only if multi-platform)',
    '  1. Shared layouts (default — use platform files only where needed)',
    '  2. Platform-specific layouts',
    '',
    'Q3.8 — Web output mode? (only if web is in Q3.5)',
    '  1. Static (default — most marketing/content/app-shell exports)',
    '  2. Server (Expo Router API routes / SSR)',
    '  3. SPA',
    '',
    'Q3.9 — Server type? (only if Q3.8 = Server, OR if mobile is in Q3.5)',
    '  If Q3.8 = Server:',
    '    1. Standard Expo (default — Expo Router API routes)',
    '    2. Custom backend',
    '    3. None',
    '  If mobile-only (no web):',
    '    1. Custom backend',
    '    2. None (default)',
    '',
    'Q3.10 — How will the first version reach its users? (DEPLOYMENT / DISTRIBUTION method, NOT which OSes — that was Q3.5)',
    '  Examples: TestFlight to friends, internal client demo, App Store / Play Store launch, web hosting, side-loaded APK, internal-only.',
    '',
    'Q3.11 — Keep the starter components that come with create-expo-app?',
    '  1. No (default — MDS rich boilerplate replaces them)',
    '  2. Yes',
    '',
    'Q3.12 — Use the latest Expo SDK even if Expo Go availability may lag?',
    '  1. Yes (default)',
    '  2. No',
    '',
    'Q3.13 — Use Expo UI for native-feeling screens? (only ask if mobile is in Q3.5)',
    '  1. Yes (default)',
    '  2. No',
    '',
    'Q3.14 — Use Expo Native Tabs? (only ask if mobile is in Q3.5)',
    '  1. Yes (default)',
    '  2. No',
    '',
    'Q3.15 — Which EAS uses should the roadmap remember? (multi-select; only ask if Q2.8 = Yes)',
    '  1. building mobile applications',
    '  2. hosting a deployed server',
    '  3. hosting web apps',
    '  4. publishing mobile applications',
    '',
    'Q3.16 — Use the bundled MDS project/guidelines.md template?',
    '  1. Yes (default — recommended; MDS-specific architecture rules)',
    '  2. No',
    '',
    'Q3.17 — Data starting point?',
    '  1. Local dummy data (default — fastest for early UI work)',
    '  2. Supabase from the start (use when auth/synced data is already central)',
    '',
    'Q3.18 — Use test-to-main branching safeguards? (feature branches → test branch → main, with PR checks)',
    '  1. Yes (default)',
    '  2. No',
    '',
    'Q3.19 — Save these onboarding answers as personal defaults for future app generation?',
    '  1. No (default)',
    '  2. Yes',
    '',
    '====== Flag map (use these EXACTLY — DO NOT search for them in node_modules) ======',
    '',
    'create-expo-stack flags (Phase 2 answers):',
    '  Q2.1 TypeScript Yes → --typescript ; No → --javascript',
    '  Q2.2 npm → --npm ; pnpm → --pnpm ; yarn → --yarn ; bun → --bun',
    '  Q2.3 Expo Router → --expo-router ; React Navigation → --react-navigation',
    '  Q2.4 (only with React Navigation) Tabs → --tabs ; Drawer → --drawer+tabs ; Stack → no flag',
    '  Q2.5 Uniwind → --uniwind ; NativeWind → --nativewind ; Tamagui → --tamagui ; Restyle → --restyle ; StyleSheet → no styling flag',
    '  Q2.6 Zustand → --zustand ; None → no state flag',
    '  Q2.7 Supabase → --supabase ; Firebase → --firebase ; None → no auth flag',
    '  Q2.8 EAS Yes → --eas ; No → no flag',
    '',
    'mds-* flags (Phase 3 answers — wrap values containing spaces in double quotes):',
    '  Q3.1 → --mds-app-name=',
    '  Q3.2 → --mds-audience=',
    '  Q3.3 → --mds-core-flows=',
    '  Q3.3a → --mds-screens=',
    '  Q3.4 → --mds-data-needs=         (comma-joined labels)',
    '  Q3.5 → --mds-platforms=          (comma-joined slugs from: web,ios,android,apple-tv,android-tv)',
    '  Q3.6 → --mds-first-platform=',
    '  Q3.7 → --mds-platform-strategy=  (files-only|folders)',
    '  Q3.7a → --mds-app-directory=     (src|root)',
    '  Q3.7b → --mds-platform-layouts=  (shared|platform-specific)',
    '  Q3.8 → --mds-web-output=         (static|server|spa)',
    '  Q3.9 → --mds-deployed-server=    (standard-expo|custom|none)',
    '  Q3.10 → --mds-deployment-target=',
    '  Q3.11 → --mds-create-expo-components or --mds-no-create-expo-components',
    '  Q3.12 → --mds-latest-expo-sdk or --mds-no-latest-expo-sdk',
    '  Q3.13 → --mds-expo-ui or --mds-no-expo-ui',
    '  Q3.14 → --mds-expo-native-tabs or --mds-no-expo-native-tabs',
    '  Q3.15 → --mds-eas-uses=          (comma-joined labels; only if Q2.8 = Yes)',
    '  Q3.16 → --mds-guidelines-template',
    '  Q3.17 → --mds-data-start=        (local|supabase)',
    '  Q3.18 → --mds-test-to-main or --mds-no-test-to-main',
    '  Q3.19 → --mds-save-defaults or --mds-no-save-defaults',
    '  Always append: --mds-yes',
    '',
    '====== PHASE 4 — Confirm and generate ======',
    '',
    'Present a SHORT plain-English summary of the choices (not flag form, not the command). Example:',
    '  "Here is what I have:',
    '   - app: my-new-app at F:/ReactNativeApps',
    '   - TypeScript, npm, Expo Router, Uniwind, Zustand, no auth provider, no EAS yet',
    '   - audience: <...>, first flow: <...>',
    '   - platforms: web + iOS + Android, first MVP: iOS, src/app routes, files-only suffixes, shared layouts',
    '   - data starts local, test-to-main on, MDS guidelines template on"',
    'Ask the user to confirm or change anything.',
    '',
    creditsAndWaitMessage(),
    '',
    'Generator invocation (build silently from the flag map above; never echo this line):',
    `  ${superStack} <appName> <create-expo-stack flags> <--mds-* flags> --mds-yes`,
    '',
    '====== PHASE 5 — Verify and hand off ======',
    '',
    'After generation succeeds:',
    '  1. Find the line "Onboarding next steps" in the generator output. Quote everything from that line to the end of stdout verbatim in a fenced code block. Do NOT quote the CREATED file list or anything before "Onboarding next steps".',
    '  2. Then tell the user (in plain text, not a code block):',
    '     "Your app is ready. To keep token usage low, open a new agent session directly inside the `<appName>` folder and run `mds continue` there."',
    '  3. If TodoForContext markers exist in the new app\'s project/ files, add one line:',
    '     "There are unresolved context markers in project/ — resolve them in your new session before starting implementation work."',
    '  4. Do NOT walk through markers or ask questions about them in this session.',
    '',
    'Rules:',
    '- Never run the generator inside an existing app folder. If you suspect you are inside one, stop and ask.',
    '- Never echo the assembled command line. Summarize choices in plain English instead.',
    '- One question per turn. Always show the default. Skip dependent questions when prerequisites are not met.',
    '- The generator runs all of MDS onboarding (project memory, exposition pages, dependencies, expo-doctor) once you pass --mds-yes plus the --mds-* flags. Do not run `mds onboard` separately afterward — it is already done.',
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
    'Q1.11 — Use latest Expo SDK even if Expo Go availability may lag? (Yes default / No)',
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
    'After it completes, run `mds doctor` and surface any errors/warnings.',
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
        : ['No Doctor warnings or errors matched this refactor request. Keep the current architecture intact.'],
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
  const hasSeoSignal = checkNames.some((value) => value.includes('seo') || value.includes('metadata'));
  const hasEnvSignal = checkNames.some((value) => value.includes('env') || value.includes('secret'));
  const hasSsrSignal = checkNames.some((value) => value.includes('ssr') || value.includes('window'));
  const hasExpoSignal = checkNames.some((value) => value.includes('expo config') || value.includes('expo configuration'));

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
      detail: 'Confirm app config, platform list, web output, and build profiles match the release target.',
      relatedResources: ['mds://patterns/project-configuration-patterns', 'mds://skills/deployment'],
    },
  ];

  if (target === 'web' || target === 'all') {
    items.push(
      {
        id: 'web-metadata',
        status: hasSeoSignal ? 'action' : 'manual',
        title: 'Verify web SEO metadata',
        detail: 'Check title, description, canonical URL, Open Graph tags, sitemap, and robots strategy.',
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

  if (text.includes('env') || text.includes('secret') || text.includes('public')) {
    resources.add('mds://rules/env-hygiene');
    resources.add('mds://skills/env-vars');
  }
  if (text.includes('ssr') || text.includes('window') || text.includes('document') || text.includes('localstorage')) {
    resources.add('mds://rules/ssr-safety');
    resources.add('mds://skills/expo-ssr-safety');
  }
  if (text.includes('seo') || text.includes('metadata') || text.includes('canonical')) {
    resources.add('mds://rules/seo-metadata');
    resources.add('mds://skills/seo-metadata');
  }
  if (text.includes('app architecture') || text.includes('route') || text.includes('app/')) {
    resources.add('mds://rules/app-folder-architecture');
    resources.add('mds://skills/expo-router-architecture');
  }
  if (text.includes('styling') || text.includes('uniwind') || text.includes('tailwind')) {
    resources.add('mds://skills/uniwind-theming');
  }
  if (text.includes('expo') || text.includes('build') || text.includes('script') || text.includes('package')) {
    resources.add('mds://skills/deployment');
  }

  return [...resources];
}

function nextStepForCheck(check: DoctorCheckResult): string {
  const text = `${check.name} ${check.message}`.toLowerCase();
  if (text.includes('env') || text.includes('secret')) {
    return 'Separate public client config from private server secrets, then rerun the affected file/project scan.';
  }
  if (text.includes('ssr') || text.includes('window') || text.includes('document')) {
    return 'Move client-only runtime access behind platform/lifecycle guards or isolate it from server paths.';
  }
  if (text.includes('seo') || text.includes('metadata')) {
    return 'Add or normalize route metadata, canonical/indexing strategy, and web output verification.';
  }
  if (text.includes('app architecture') || text.includes('route')) {
    return 'Move business/data logic out of route files and keep app/ focused on routing shells.';
  }
  if (text.includes('script') || text.includes('build') || text.includes('package')) {
    return 'Fix the failing or missing package script so local checks match CI/release expectations.';
  }
  return 'Apply the smallest targeted fix, then rerun Doctor to confirm the finding is resolved.';
}

function normalizeDeployTarget(value: string | undefined): 'web' | 'ios' | 'android' | 'native' | 'all' {
  return value === 'web' ||
    value === 'ios' ||
    value === 'android' ||
    value === 'native' ||
    value === 'all'
    ? value
    : 'all';
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

  return `${severity}\n\nFinding: ${message}\n\nNext step: inspect the named file or script, apply the smallest fix, then rerun mds doctor.`;
}

function generateSetupTasks(projectPath: string, defaults: string[]): string[] {
  const selected = defaults.length > 0 ? defaults : ['project-docs', 'doctor', 'uniwind'];
  const tasks = [
    `Detect package manager, Expo SDK, router, app folder, aliases, and styling stack in ${projectPath}.`,
    'Ask for app goal, audience, core flows, must-include screens/flows, data needs, and deployment target.',
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

