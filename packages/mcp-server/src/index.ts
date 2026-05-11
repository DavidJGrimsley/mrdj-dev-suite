import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
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
    'create_expo_super_stack',
    {
      title: 'Create Expo Super Stack',
      description:
        'Run from a parent directory (e.g. F:/ReactNativeApps) to generate a brand-new Expo app via create-expo-super-stack and immediately apply MrDJ onboarding.',
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
        'Run from inside an existing Expo app folder to apply MrDJ project memory, intake, planning, and scaffolding.',
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

export function buildCreateExpoSuperStackPromptText(parentDir?: string, appName?: string): string {
  const parent = parentDir ?? 'the current working directory';
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
    '',
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
    '  1. Uniwind (default — Tailwind v4 universal styling, MrDJ preference)',
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
    '====== PHASE 3 — MrDJ project memory & roadmap (passed as --mrdj-* flags) ======',
    '',
    'Q3.1 — App display name? (defaults to the project name from Q1.2 — confirm or override)',
    '',
    'Q3.2 — Who is this app for? Include user type, demographic, role, or context if known.',
    '',
    'Q3.3 — What should users be able to do first? Examples: sign up, create a project, invite teammates, checkout. (Press enter / say "defer" to let an agent derive this later from project/info.md.)',
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
    '  Default: 1, 2, 3',
    '',
    'Q3.6 — Which selected platform should be the first MVP target? (only ask if Q3.5 has more than one)',
    '',
    'Q3.7 — When platforms diverge, how should platform-specific code be organized? (only if multi-platform)',
    '  1. File suffixes only (default — e.g. screen.web.tsx)',
    '  2. Platform folders',
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
    '  1. No (default — MrDJ rich boilerplate replaces them)',
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
    'Q3.16 — Use the bundled MrDJ project/guidelines.md template?',
    '  1. Yes (default — recommended; MrDJ-specific architecture rules)',
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
    '====== PHASE 4 — Confirm and generate ======',
    '',
    'Present a SHORT plain-English summary of the choices (not flag form, not the command). Example:',
    '  "Here is what I have:',
    '   - app: my-new-app at F:/ReactNativeApps',
    '   - TypeScript, npm, Expo Router, Uniwind, Zustand, no auth provider, no EAS yet',
    '   - audience: <...>, first flow: <...>',
    '   - platforms: web + iOS + Android, first MVP: iOS, files-only suffixes',
    '   - data starts local, test-to-main on, MrDJ guidelines template on"',
    'Ask the user to confirm or change anything.',
    '',
    'When confirmed, run the generator silently from the parent folder via your shell tool. Do NOT print the command.',
    'Just say: "Generating now. This typically takes 2-5 minutes — I will surface anything the generator asks."',
    '',
    `Generator invocation (build silently from the answers; never echo this line):`,
    `  ${superStack} <appName> <create-expo-stack flags from Phase 2> <--mrdj-* flags from Phase 3> --mrdj-yes`,
    '',
    'Stream output. If the generator surfaces an interactive prompt despite flags, relay it to the user.',
    '',
    '====== PHASE 5 — Verify and hand off ======',
    '',
    'After generation succeeds:',
    '  1. cd into the new app folder.',
    '  2. Run `mrdj doctor` and surface any errors/warnings (especially todo-for-context markers).',
    '  3. Tell the user the app is ready and list the next steps from project/todo.md.',
    '',
    'Rules:',
    '- Never run the generator inside an existing app folder. If you suspect you are inside one, stop and ask.',
    '- Never echo the assembled command line. Summarize choices in plain English instead.',
    '- One question per turn. Always show the default. Skip dependent questions when prerequisites are not met.',
    '- The generator runs all of MrDJ onboarding (project memory, exposition pages, dependencies, expo-doctor) once you pass --mrdj-yes plus the --mrdj-* flags. Do not run `mrdj onboard` separately afterward — it is already done.',
  ].join('\n');
}

export function buildOnboardPromptText(projectPath?: string): string {
  const target = projectPath ?? 'the current Expo project';
  return [
    `You are running MrDJ agentic onboarding inside ${target}. The app folder must already exist on disk.`,
    '',
    'If you are NOT yet inside an Expo app folder, stop and tell the user to either:',
    '  (a) cd into the existing app folder and re-invoke this prompt, or',
    '  (b) run the `create_expo_super_stack` MCP prompt from a parent folder to generate a new app first.',
    '',
    'IMPORTANT: Drive this conversationally. Never echo the assembled `mrdj onboard` command line. One question per turn. Number multi-choice options. Always show the default and accept "default" / number / label / natural language.',
    '',
    '====== PHASE 0 — State + blocker check ======',
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
    '  Default: 1, 2, 3',
    '',
    'Q1.6 — First MVP target platform? (only ask if Q1.5 has more than one)',
    '',
    'Q1.7 — When platforms diverge, how should platform-specific code be organized? (only if multi-platform)',
    '  1. File suffixes only (default — e.g. screen.web.tsx)',
    '  2. Platform folders',
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
    'Q1.16 — Use the bundled MrDJ project/guidelines.md template? (Yes default / No)',
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
    'Invocation (build silently from answers; never echo):',
    '  mrdj onboard --yes --app-name=<...> --audience=<...> --core-flows=<...> --data-needs=<...> --platforms=<...> --first-platform=<...> --web-output=<...> --deployed-server=<...> --deployment-target=<...> --data-start=<local|supabase> --test-to-main --guidelines-template <other flags as needed>',
    '',
    'After it completes, run `mrdj doctor` and surface any errors/warnings.',
    '',
    'Rules:',
    '- Never bypass PHASE 0. The marker check is non-negotiable; the user can clear it in seconds by deleting lines.',
    '- Never echo the assembled command line. Summarize choices in plain English instead.',
    '- One question per turn. Show the default. Skip dependent questions when prerequisites are not met.',
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
