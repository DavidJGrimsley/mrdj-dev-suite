import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PromptSurface = 'codex-command' | 'claude-command' | 'mcp-prompt' | 'phase9-artifact';

export interface PromptArgSpec {
  name: string;
  description: string;
  required?: boolean;
}

export interface PromptSpec {
  id: string;
  slug: string;
  title: string;
  description: string;
  resourcePath: string;
  keywords: string[];
  surfaces: PromptSurface[];
  codexCommandFile?: string;
  claudeCommandFile?: string;
  mcpPromptName?: string;
  mcpArgs?: PromptArgSpec[];
}

export interface PromptSpecContent extends PromptSpec {
  content: string;
}

export interface McpToolSpec {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const CONTENT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');

const PROMPT_SPECS: PromptSpec[] = [
  {
    id: 'run-doctor',
    slug: 'run-doctor',
    title: 'Run Doctor',
    description: 'Run MDS Doctor and summarize actionable findings.',
    resourcePath: 'prompts/run-doctor.md',
    keywords: ['doctor', 'ci', 'health check'],
    surfaces: ['codex-command', 'claude-command'],
    codexCommandFile: 'run-doctor.md',
    claudeCommandFile: 'run-doctor.md',
  },
  {
    id: 'review-expo-project',
    slug: 'review-expo-project',
    title: 'Review Expo Project',
    description: 'Run an MCP-first Expo project review and remediation summary.',
    resourcePath: 'prompts/review-expo-project.md',
    keywords: ['review', 'expo', 'doctor'],
    surfaces: ['codex-command', 'claude-command'],
    codexCommandFile: 'review-expo-project.md',
    claudeCommandFile: 'review-expo-project.md',
  },
  {
    id: 'review-motion',
    slug: 'review-motion',
    title: 'Review Motion',
    description: 'Inventory app motion, classify animation types, and recommend smoother implementations.',
    resourcePath: 'prompts/review-motion.md',
    keywords: ['animation', 'motion', 'smooth', 'parallax', 'reanimated'],
    surfaces: ['codex-command', 'claude-command', 'mcp-prompt'],
    codexCommandFile: 'review-motion.md',
    claudeCommandFile: 'review-motion.md',
    mcpPromptName: 'review_motion',
    mcpArgs: [
      { name: 'projectPath', description: 'Path to the Expo project being reviewed.' },
      { name: 'focusPath', description: 'Optional screen, route, or component path to inspect first.' },
      { name: 'mode', description: 'Doctor mode override: fast, ci, or full.' },
    ],
  },
  {
    id: 'prepare-deploy',
    slug: 'prepare-deploy',
    title: 'Prepare Deploy',
    description: 'Generate deployment readiness checks and blocking issues.',
    resourcePath: 'prompts/prepare-deploy.md',
    keywords: ['deploy', 'release', 'checklist'],
    surfaces: ['codex-command', 'claude-command'],
    codexCommandFile: 'prepare-deploy.md',
    claudeCommandFile: 'prepare-deploy.md',
  },
  {
    id: 'fix-seo',
    slug: 'fix-seo',
    title: 'Fix SEO',
    description: 'Audit and fix route-level SEO and metadata issues.',
    resourcePath: 'prompts/fix-seo.md',
    keywords: ['seo', 'metadata', 'web'],
    surfaces: ['codex-command', 'claude-command'],
    codexCommandFile: 'fix-seo.md',
    claudeCommandFile: 'fix-seo.md',
  },
  {
    id: 'create-expo-super-stack',
    slug: 'create-expo-super-stack',
    title: 'Create Expo Super Stack',
    description:
      'Start a guided app creation flow from a parent directory while keeping the knowledge package as the text source of truth.',
    resourcePath: 'prompts/create-expo-super-stack.md',
    keywords: ['create-expo-super-stack', 'onboarding', 'generator'],
    surfaces: ['codex-command', 'claude-command', 'mcp-prompt'],
    codexCommandFile: 'create-expo-super-stack.md',
    claudeCommandFile: 'create-expo-super-stack.md',
    mcpPromptName: 'create_expo_super_stack',
    mcpArgs: [
      { name: 'parentDir', description: 'Parent directory where the app folder will be created.' },
      { name: 'appName', description: 'App folder name.' },
    ],
  },
  {
    id: 'continue-development',
    slug: 'continue-development',
    title: 'Continue Development',
    description: 'Continue an onboarded project by choosing the next phase task.',
    resourcePath: 'prompts/continue-development.md',
    keywords: ['continue', 'todo', 'phase'],
    surfaces: ['codex-command', 'claude-command', 'mcp-prompt'],
    codexCommandFile: 'continue-development.md',
    claudeCommandFile: 'continue-development.md',
    mcpPromptName: 'continue_mds_project',
    mcpArgs: [{ name: 'projectPath', description: 'Path to the existing onboarded app folder.' }],
  },
  {
    id: 'project-research-plan',
    slug: 'project-research-plan',
    title: 'Project Research Plan',
    description: 'Normalize raw notes into canonical project memory and next tasks.',
    resourcePath: 'prompts/project-research-plan.md',
    keywords: ['research', 'intake', 'project info'],
    surfaces: ['codex-command', 'claude-command'],
    codexCommandFile: 'project-research-plan.md',
    claudeCommandFile: 'project-research-plan.md',
  },
  {
    id: 'onboard-new-expo-app',
    slug: 'onboard-new-expo-app',
    title: 'Onboard Existing Expo App',
    description: 'Run onboarding intake for an existing Expo app folder.',
    resourcePath: 'prompts/onboard-new-expo-app.md',
    keywords: ['onboard', 'project memory', 'expo app'],
    surfaces: ['mcp-prompt'],
    mcpPromptName: 'onboard_new_expo_app',
    mcpArgs: [{ name: 'projectPath', description: 'Path to the existing Expo app folder.' }],
  },
  {
    id: 'retrospective-project-onboarding',
    slug: 'retrospective-project-onboarding',
    title: 'Retrospective Project Onboarding',
    description: 'Confirm project memory generated from an existing app and Git history after workspace init.',
    resourcePath: 'prompts/retrospective-project-onboarding.md',
    keywords: ['retrospective', 'project memory', 'workspace init', 'todo for context'],
    surfaces: ['mcp-prompt'],
    mcpPromptName: 'retrospective_project_onboarding',
    mcpArgs: [{ name: 'projectPath', description: 'Path to the initialized workspace app checkout.' }],
  },
  {
    id: 'push-merge-loop',
    slug: 'push-merge-loop',
    title: 'Push Merge Loop',
    description:
      'Run the PR loop into test: doctor, commit, push, poll checks/comments, fix, repeat, merge.',
    resourcePath: 'prompts/push-merge-loop.md',
    keywords: ['push', 'merge', 'pull request', 'test branch', 'checks'],
    surfaces: ['codex-command', 'claude-command', 'mcp-prompt'],
    codexCommandFile: 'push-merge-loop.md',
    claudeCommandFile: 'push-merge-loop.md',
    mcpPromptName: 'push_merge_loop',
    mcpArgs: [
      { name: 'projectPath', description: 'Target repository path for the workflow.' },
      { name: 'branch', description: 'Feature branch name to push and open/update PR from.' },
      { name: 'base', description: 'Base branch (default: test).' },
    ],
  },
  {
    id: 'wrap-up',
    slug: 'wrap-up',
    title: 'Wrap Up',
    description:
      'Run release wrap-up after testing: todo completion, doctor, git inclusion checks, PR/check loops, and policy-based merge handling.',
    resourcePath: 'prompts/wrap-up.md',
    keywords: ['wrap up', 'release', 'pull request', 'doctor', 'merge policy'],
    surfaces: ['codex-command', 'claude-command', 'mcp-prompt'],
    codexCommandFile: 'wrap-up.md',
    claudeCommandFile: 'wrap-up.md',
    mcpPromptName: 'wrap_up_release',
    mcpArgs: [
      { name: 'projectPath', description: 'Target repository path for wrap-up flow.' },
      { name: 'branch', description: 'Feature branch to push and open/update PR from.' },
      { name: 'base', description: 'Target base branch (default: test).' },
      {
        name: 'mergeMode',
        description: 'Optional override: auto-test (default) or manual-test.',
      },
    ],
  },
  {
    id: 'phase9-bootstrap',
    slug: 'phase9-bootstrap',
    title: 'Unified Agent Bundle Bootstrap',
    description: 'Bootstrap recipe for Phase 9 unified bundle installation.',
    resourcePath: 'examples/unified-agent-bundle-bootstrap.md',
    keywords: ['phase 9', 'bundle', 'bootstrap'],
    surfaces: ['phase9-artifact'],
  },
  {
    id: 'phase9-validation',
    slug: 'phase9-validation',
    title: 'Unified Agent Bundle Validation',
    description: 'Validation checklist source for Phase 9 unified bundle.',
    resourcePath: 'checklists/unified-agent-bundle-validation.md',
    keywords: ['phase 9', 'bundle', 'validation'],
    surfaces: ['phase9-artifact'],
  },
];

const MCP_TOOL_SPECS: McpToolSpec[] = [
  {
    name: 'continue_project',
    title: 'Continue Project',
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
    title: 'Doctor Scan Project',
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
    title: 'Doctor Scan File',
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
    title: 'Explain Doctor Result',
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
    title: 'List Knowledge Resources',
    description: 'List MDS knowledge resources by kind.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['pattern', 'guide', 'rule', 'skill', 'reference', 'checklist', 'example', 'prompt'],
        },
      },
    },
  },
  {
    name: 'get_skill',
    title: 'Get Skill',
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
    title: 'Get Guide',
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
    name: 'generate_setup_tasks',
    title: 'Generate Setup Tasks',
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

export function listPromptSpecs(surface?: PromptSurface): PromptSpec[] {
  if (!surface) {
    return [...PROMPT_SPECS];
  }
  return PROMPT_SPECS.filter((spec) => spec.surfaces.includes(surface));
}

export function getPromptSpec(idOrSlug: string): PromptSpec | null {
  const legacyAliases: Record<string, string> = {
    'ship-test-loop': 'push-merge-loop',
    ship_test_loop: 'push_merge_loop',
  };
  const normalized = legacyAliases[idOrSlug] ?? idOrSlug;
  return (
    PROMPT_SPECS.find(
      (spec) => spec.id === normalized || spec.slug === normalized || spec.mcpPromptName === normalized
    ) ??
    null
  );
}

export async function readPromptSpec(idOrSlug: string): Promise<PromptSpecContent | null> {
  const spec = getPromptSpec(idOrSlug);
  if (!spec) {
    return null;
  }
  return {
    ...spec,
    content: await readPromptContent(spec),
  };
}

export async function readPromptContent(spec: Pick<PromptSpec, 'resourcePath'>): Promise<string> {
  return readFile(path.join(CONTENT_ROOT, spec.resourcePath), 'utf8');
}

export function listMcpToolSpecs(): McpToolSpec[] {
  return [...MCP_TOOL_SPECS];
}

export function getMcpToolSpec(name: string): McpToolSpec | null {
  return MCP_TOOL_SPECS.find((spec) => spec.name === name) ?? null;
}
