import { execFile } from 'node:child_process';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import chalk from 'chalk';

import { runDoctor } from '@mr.dj2u/doctor';

import type { DoctorCheckResult, DoctorReport } from '@mr.dj2u/doctor';

import {
  classifyExpoSdkUpgrade,
  detectProjectExpoSdk,
  fetchOfficialExpoVersions,
  requiresExpoSdkAttention,
  type ExpoSdkSnapshot,
  type ExpoVersionsCatalog,
} from '../expo-sdk-state.js';
import {
  isComponentStrategyResolved,
  parseComponentStrategy,
  type ComponentStrategy,
} from '../component-strategy.js';
import {
  isEjectionInventoryResolved,
  parseEjectionInventory,
  type EjectionInventory,
  type EjectionInventoryStatus,
  inventoryStatusFrom,
} from '../ejection-inventory.js';

export type { ComponentStrategy };

const execFileAsync = promisify(execFile);
const TODO_MARKER = '# TodoForContext(optional):';

export interface ContinueArgv {
  path?: string;
  json?: boolean;
}

export interface ContinueBriefOptions {
  resolveExpoVersions?: () => Promise<ExpoVersionsCatalog | null>;
}

export interface MarkerHit {
  file: string;
  line: number;
  text: string;
}

export interface TodoItem {
  file: string;
  line: number;
  text: string;
  section: string;
}

export interface GitSnapshot {
  available: boolean;
  branch?: string;
  clean: boolean;
  statusLines: string[];
  error?: string;
}

export interface ContinueRecommendation {
  priority:
    | 'not-onboarded'
    | 'todo-for-context'
    | 'doctor-errors'
    | 'dirty-git'
    | 'phase-0-user-review'
    | 'expo-sdk-upgrade'
    | 'todo'
    | 'ci-ready';
  title: string;
  plan: string[];
  requiresApproval: boolean;
}

export interface ContinueSessionBrief {
  projectPath: string;
  isOnboardedApp: boolean;
  packageManager: string | null;
  packageScripts: string[];
  todoForContext: {
    count: number;
    hits: MarkerHit[];
  };
  git: GitSnapshot;
  doctor: {
    summary: DoctorReport['summary'];
    errors: Array<Pick<DoctorCheckResult, 'name' | 'message'>>;
    warnings: Array<Pick<DoctorCheckResult, 'name' | 'message'>>;
  } | null;
  nextTodo: TodoItem | null;
  expoSdk: ExpoSdkSnapshot | null;
  componentStrategy: ComponentStrategy | null;
  ejectionInventory: EjectionInventory | null;
  ejectionStatus: EjectionInventoryStatus;
  recommendation: ContinueRecommendation;
  handoff: string;
}

const PLAN_MODE_KICKOFF_STEP =
  'Start this session in Plan mode: define success criteria, scope, risks, and acceptance checks before editing code.';

const MOTION_INTENT_KEYWORDS = [
  'animation',
  'animations',
  'motion',
  'smooth',
  'smoothness',
  'jank',
  'janky',
  'stutter',
  'stuttering',
  'choppy',
  'laggy',
  'reanimated',
  'lottie',
  'layout transition',
  'lineartransition',
  'fadein',
  'fadeout',
  'parallax',
  'scroll-linked',
  'scroll linked',
  'layered scroll',
  'hero motion',
  'depth effect',
  'pinned scene',
] as const;

interface PackageJsonSubset {
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface CommandOutput {
  stdout: string;
  stderr: string;
}

export async function runContinueCommand(argv: ContinueArgv): Promise<void> {
  const brief = await buildContinueSessionBrief(argv.path ?? '.');

  if (argv.json) {
    console.log(JSON.stringify(brief, null, 2));
    return;
  }

  console.log(renderContinueSessionBrief(brief));
  if (!brief.isOnboardedApp) {
    process.exitCode = 1;
  }
}

export async function buildContinueSessionBrief(
  projectPathInput = '.',
  options: ContinueBriefOptions = {}
): Promise<ContinueSessionBrief> {
  const projectPath = path.resolve(projectPathInput);
  const isOnboardedApp = await isOnboardedProject(projectPath);
  const packageJson = await readPackageJson(projectPath);
  const packageManager = packageJson ? await detectPackageManager(projectPath, packageJson) : null;
  const packageScripts = Object.keys(packageJson?.scripts ?? {}).sort();
  const todoForContext = isOnboardedApp
    ? {
        hits: await scanTodoForContextMarkers(projectPath),
      }
    : { hits: [] };
  const git = await readGitSnapshot(projectPath);
  const doctorReport = isOnboardedApp
    ? await runDoctor(projectPath, { mode: 'fast', runScripts: false })
    : null;
  const nextTodo = isOnboardedApp ? await findFirstUncheckedTodo(projectPath) : null;
  const expoSdk = isOnboardedApp ? await resolveExpoSdkSnapshot(packageJson, options) : null;
  const componentStrategy = isOnboardedApp ? await readComponentStrategy(projectPath) : null;
  const ejectionInventory = isOnboardedApp ? await readEjectionInventory(projectPath) : null;
  const recommendation = chooseRecommendation({
    isOnboardedApp,
    markerCount: todoForContext.hits.length,
    doctorReport,
    git,
    nextTodo,
    expoSdk,
    componentStrategy,
    ejectionInventory,
  });

  return {
    projectPath,
    isOnboardedApp,
    packageManager,
    packageScripts,
    todoForContext: {
      count: todoForContext.hits.length,
      hits: todoForContext.hits,
    },
    git,
    doctor: doctorReport
      ? {
          summary: doctorReport.summary,
          errors: doctorReport.checks
            .filter((check) => check.status === 'error')
            .map(({ name, message }) => ({ name, message })),
          warnings: doctorReport.checks
            .filter((check) => check.status === 'warn')
            .map(({ name, message }) => ({ name, message })),
        }
      : null,
    nextTodo,
    expoSdk,
    componentStrategy,
    ejectionInventory,
    ejectionStatus: inventoryStatusFrom(ejectionInventory),
    recommendation,
    handoff:
      'For lower token usage and lower cost, open this app folder directly in a new agent session and run `mds continue` before implementation work.',
  };
}

export function chooseRecommendation(input: {
  isOnboardedApp: boolean;
  markerCount: number;
  doctorReport: DoctorReport | null;
  git: GitSnapshot;
  nextTodo: TodoItem | null;
  expoSdk?: ExpoSdkSnapshot | null;
  componentStrategy?: ComponentStrategy | null;
  ejectionInventory?: EjectionInventory | null;
}): ContinueRecommendation {
  if (!input.isOnboardedApp) {
    return {
      priority: 'not-onboarded',
      title: 'Open an onboarded app folder',
      requiresApproval: true,
      plan: [
        'Run from the app folder, or pass the app path explicitly.',
        'Example: `mds continue ./my-app`.',
        'After generation, open the generated app folder in a fresh agent session to reduce token usage and save money.',
      ],
    };
  }

  if (input.markerCount > 0) {
    return {
      priority: 'todo-for-context',
      title: 'Resolve TodoForContext markers',
      requiresApproval: true,
      plan: [
        PLAN_MODE_KICKOFF_STEP,
        'Ask the user whether to fill each marker with context or delete the marker line to acknowledge no extra context is needed.',
        'Handle markers one at a time and keep edits limited to project memory files.',
        'Run `mds continue` again when marker cleanup is finished.',
      ],
    };
  }

  if ((input.doctorReport?.summary.errors ?? 0) > 0) {
    return {
      priority: 'doctor-errors',
      title: 'Fix Doctor errors',
      requiresApproval: true,
      plan: [
        PLAN_MODE_KICKOFF_STEP,
        'Review the failing Doctor checks listed in this brief.',
        'Fix the highest-impact error first, keeping edits scoped to the app folder.',
        'Rerun `mds doctor --fast --scripts=false` or `mds continue` after fixes.',
      ],
    };
  }

  if (input.git.available && !input.git.clean) {
    return {
      priority: 'dirty-git',
      title: 'Review dirty git state',
      requiresApproval: true,
      plan: [
        PLAN_MODE_KICKOFF_STEP,
        'Inspect the existing working tree before starting new work.',
        'Separate user changes from generated or agent-made changes.',
        'Only begin the next task once the user confirms how to handle the dirty state.',
        ...(requiresExpoSdkAttention(input.expoSdk)
          ? [
              'If this working tree needs Expo SDK attention, load the official Expo upgrade skill (`upgrading-expo`) after the user confirms how to handle the dirty state. Do not call MDS `get_skill` for an upgrade skill.',
            ]
          : []),
      ],
    };
  }

  if (input.componentStrategy && !isComponentStrategyResolved(input.componentStrategy)) {
    return {
      priority: 'phase-0-user-review',
      title: 'Confirm the Phase 0 component strategy before implementation work',
      requiresApproval: true,
      plan: [
        'Phase 0 cannot continue until the owner confirms the component strategy in `project/info.md`.',
        'Review the Style Library, Expo UI / Universal Components / NativeTabs flags, and any listed conflicts.',
        'Set `Decision: confirmed` in the Component Strategy section after that review, then mark the matching Phase 0 todo complete.',
        'Run `mds continue` again once the strategy decision is confirmed.',
      ],
    };
  }

  if (input.ejectionInventory && !isEjectionInventoryResolved(input.ejectionInventory)) {
    return {
      priority: 'phase-0-user-review',
      title: 'Confirm the Phase 0 ejection inventory before implementation work',
      requiresApproval: true,
      plan: [
        'Phase 0 cannot continue until retain/eject decisions are recorded for generated starter and template components.',
        'Run `mds eject` and keep the components selected in project memory, or set `Decision: confirmed` in the Ejection Inventory section after reviewing the list.',
        'Ejected items get a cleanup checklist in `project/ejection-cleanup.md` instead of leaving stale imports undocumented.',
        'Run `mds continue` again once the ejection inventory decision is confirmed.',
      ],
    };
  }

  if (input.nextTodo && isPhase0Section(input.nextTodo.section)) {
    return {
      priority: 'phase-0-user-review',
      title: 'Complete Phase 0 orientation before agent implementation work',
      requiresApproval: true,
      plan: [
        "Phase 0 is not agent work but simple review by you before you get started to ensure the agent will help you create exactly the project you're envisioning.",
        'Review Phase 0 items in project/todo.md and mark each one complete after your review decisions are done.',
        'Run `mds continue` again once Phase 0 items are complete to move into implementation phases.',
      ],
    };
  }

  if (requiresExpoSdkAttention(input.expoSdk) && input.expoSdk) {
    return buildExpoSdkUpgradeRecommendation(input.expoSdk, input.nextTodo);
  }

  if (input.nextTodo) {
    const todoContext = `${input.nextTodo.section} ${input.nextTodo.text}`;
    return {
      priority: 'todo',
      title: `Continue ${input.nextTodo.section}: ${input.nextTodo.text}`,
      requiresApproval: true,
      plan: matchesMotionIntent(todoContext) ? buildMotionTodoPlan() : buildGenericTodoPlan(),
    };
  }

  return {
    priority: 'ci-ready',
    title: 'Prepare CI or deployment readiness',
    requiresApproval: true,
    plan: [
      PLAN_MODE_KICKOFF_STEP,
      'Run the CI-equivalent checks with `mds doctor --ci`.',
      'Review release/deployment notes in project/release-flow.md when present.',
      'Prepare the next deployment or PR plan from a clean app-root session.',
    ],
  };
}

export function renderContinueSessionBrief(brief: ContinueSessionBrief): string {
  const lines = [
    chalk.bold('MDS Continue'),
    chalk.dim(brief.projectPath),
    '',
    brief.handoff,
    '',
  ];

  if (!brief.isOnboardedApp) {
    lines.push(chalk.yellow('This does not look like an onboarded app folder.'));
    lines.push('Run from the app folder or pass the app path, for example `mds continue ./my-app`.');
    lines.push('');
    lines.push(...renderPlan(brief.recommendation));
    return lines.join('\n');
  }

  lines.push(chalk.bold('Snapshot'));
  lines.push(`Package manager: ${brief.packageManager ?? 'not detected'}`);
  lines.push(`Package scripts: ${brief.packageScripts.length > 0 ? brief.packageScripts.join(', ') : 'none'}`);
  lines.push(`TodoForContext markers: ${brief.todoForContext.count}`);
  if (brief.doctor) {
    lines.push(
      `Doctor fast/no-scripts: ${brief.doctor.summary.errors} errors, ${brief.doctor.summary.warnings} warnings, ` +
        `${brief.doctor.summary.passed} passed, ${brief.doctor.summary.skipped} skipped`
    );
  }
  lines.push(
    `Git: ${brief.git.available ? `${brief.git.branch ?? 'branch unknown'} (${brief.git.clean ? 'clean' : 'dirty'})` : 'not detected'}`
  );
  lines.push(
    `Next todo: ${brief.nextTodo ? `${brief.nextTodo.section} - ${brief.nextTodo.text}` : 'none found'}`
  );
  if (brief.expoSdk) {
    lines.push(`Expo SDK: ${formatExpoSdkSnapshot(brief.expoSdk)}`);
  }
  lines.push(`Ejection inventory: ${formatEjectionStatus(brief.ejectionStatus)}`);
  lines.push('');

  if (brief.todoForContext.hits.length > 0) {
    lines.push(chalk.bold('TodoForContext markers'));
    for (const hit of brief.todoForContext.hits) {
      lines.push(`- ${hit.file}:${hit.line} ${hit.text}`);
    }
    lines.push('');
  }

  if (brief.doctor && brief.doctor.errors.length > 0) {
    lines.push(chalk.bold('Doctor errors'));
    for (const error of brief.doctor.errors) {
      lines.push(`- ${error.name}: ${error.message}`);
    }
    lines.push('');
  }

  if (brief.git.available && !brief.git.clean) {
    lines.push(chalk.bold('Git status'));
    lines.push(...brief.git.statusLines.map((line) => `- ${line}`));
    lines.push('');
  }

  lines.push(...renderPlan(brief.recommendation));
  return lines.join('\n');
}

function renderPlan(recommendation: ContinueRecommendation): string[] {
  return [
    chalk.bold('Recommended next session'),
    recommendation.title,
    '',
    chalk.bold('Proposed plan'),
    ...recommendation.plan.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Plan approval required. Autopilot is intentionally reserved for a future command or flag.',
  ];
}

function buildExpoSdkUpgradeRecommendation(
  expoSdk: ExpoSdkSnapshot,
  nextTodo: TodoItem | null
): ContinueRecommendation {
  const from = expoSdk.detectedMajor;
  const to = expoSdk.latestStableMajor;
  const title =
    expoSdk.status === 'unavailable'
      ? 'Verify Expo SDK state using the official Expo upgrade skill'
      : expoSdk.status === 'in-progress'
      ? `Finish the in-progress Expo SDK upgrade${to != null ? ` to ${to}` : ''} using the official Expo upgrade skill`
      : `Upgrade Expo SDK${from != null && to != null ? ` ${from} → ${to}` : ''} using the official Expo upgrade skill`;
  const deferredTodo = nextTodo
    ? `Do not start the next todo (${nextTodo.section} - ${nextTodo.text}) until the upgrade is complete or the user explicitly declines.`
    : 'Do not start a new product todo until the upgrade is complete or the user explicitly declines.';

  return {
    priority: 'expo-sdk-upgrade',
    title,
    requiresApproval: true,
    plan: [
      PLAN_MODE_KICKOFF_STEP,
      expoSdk.status === 'unavailable'
        ? "The project's Expo SDK could not be compared with the official catalog, so do not assume the next unchecked todo is safe to start."
        : "This recommendation comes from the project's declared Expo SDK and official latest stable SDK, not from the next unchecked todo.",
      'Load the official Expo skill `upgrading-expo`. Do not call MDS `get_skill` for an upgrade skill. MDS does not own upgrade steps.',
      'Confirm the target SDK with the user, then follow that official skill for dependency updates, diagnostics, breaking changes, and any skip-a-release rules.',
      'After the official skill finishes, run `mds continue` again to return to phase work.',
      deferredTodo,
    ],
  };
}

function formatExpoSdkSnapshot(expoSdk: ExpoSdkSnapshot): string {
  const detected = expoSdk.detectedMajor ?? 'not detected';
  const latest = expoSdk.latestStableMajor ?? 'unknown';
  return `${detected} (latest stable ${latest}; ${expoSdk.status})`;
}

async function resolveExpoSdkSnapshot(
  packageJson: PackageJsonSubset | null,
  options: ContinueBriefOptions
): Promise<ExpoSdkSnapshot | null> {
  const project = detectProjectExpoSdk(packageJson);
  if (!project.hasExpo) {
    return null;
  }

  const catalog = await resolveExpoVersionsCatalog(options);
  return classifyExpoSdkUpgrade(project, catalog);
}

async function resolveExpoVersionsCatalog(
  options: ContinueBriefOptions
): Promise<ExpoVersionsCatalog | null> {
  if (options.resolveExpoVersions) {
    return options.resolveExpoVersions();
  }

  if (process.env.VITEST) {
    return null;
  }

  return fetchOfficialExpoVersions();
}

function buildGenericTodoPlan(): string[] {
  return [
    PLAN_MODE_KICKOFF_STEP,
    'Read project memory for the current phase and confirm the intended outcome.',
    'Implement the earliest unchecked todo item only after the user approves this plan.',
    'Run focused verification, then update project/todo.md if the task is complete.',
  ];
}

function buildMotionTodoPlan(): string[] {
  return [
    PLAN_MODE_KICKOFF_STEP,
    'Read project memory for the current phase and confirm the intended outcome.',
    'Call `get_skill` with `id: "animation-motion"` before broad motion edits.',
    'Call `get_guide` with `id: "animation-performance"` before choosing libraries or rewrite scope.',
    'Call `generate_refactor_plan` with `focus: "animation"` before broad motion refactors.',
    'Classify the affected motion as one-shot, layout, gesture-driven, list-heavy, loading, or parallax/scroll-linked before editing.',
    'Use `/review-motion` when the task is primarily an audit, inventory, or motion classification request rather than a narrow fix.',
    'Implement the earliest unchecked todo item only after the user approves this plan.',
    'Run focused verification, then update project/todo.md if the task is complete.',
  ];
}

function matchesMotionIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return MOTION_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isPhase0Section(section: string): boolean {
  return /^phase\s*0\b/i.test(section.trim());
}

async function readComponentStrategy(projectPath: string): Promise<ComponentStrategy | null> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  if (!(await pathExists(infoPath))) {
    return null;
  }

  try {
    return parseComponentStrategy(await readFile(infoPath, 'utf8'));
  } catch {
    return null;
  }
}

async function readEjectionInventory(projectPath: string): Promise<EjectionInventory | null> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  if (!(await pathExists(infoPath))) {
    return null;
  }

  try {
    return parseEjectionInventory(await readFile(infoPath, 'utf8'));
  } catch {
    return null;
  }
}

function formatEjectionStatus(status: EjectionInventoryStatus): string {
  if (status.decision === 'not-applicable') {
    return 'not applicable';
  }
  const retained = status.retained.length > 0 ? status.retained.join(', ') : 'none';
  return `${status.decision} (${status.presentCount} present; retain ${retained})`;
}

async function isOnboardedProject(projectPath: string): Promise<boolean> {
  return (
    (await pathExists(path.join(projectPath, 'package.json'))) &&
    ((await pathExists(path.join(projectPath, 'project', 'todo.md'))) ||
      (await pathExists(path.join(projectPath, 'project', 'info.md'))))
  );
}

async function readPackageJson(projectPath: string): Promise<PackageJsonSubset | null> {
  try {
    const raw = await readFile(path.join(projectPath, 'package.json'), 'utf8');
    return JSON.parse(raw) as PackageJsonSubset;
  } catch {
    return null;
  }
}

async function detectPackageManager(projectPath: string, packageJson: PackageJsonSubset): Promise<string> {
  const packageManager = packageJson.packageManager?.split('@')[0];
  if (packageManager === 'pnpm' || packageManager === 'yarn' || packageManager === 'bun' || packageManager === 'npm') {
    return packageManager;
  }

  if (await pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await pathExists(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  if (await pathExists(path.join(projectPath, 'bun.lockb'))) {
    return 'bun';
  }
  return 'npm';
}

async function scanTodoForContextMarkers(projectPath: string): Promise<MarkerHit[]> {
  const projectDir = path.join(projectPath, 'project');
  if (!(await pathExists(projectDir))) {
    return [];
  }

  const entries = await readdir(projectDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
  const hits: MarkerHit[] = [];

  for (const file of markdownFiles) {
    const filePath = path.join(projectDir, file);
    const contents = await readFile(filePath, 'utf8');
    const lines = contents.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const text = lines[index] ?? '';
      if (isUnresolvedTodoForContextMarkerLine(text)) {
        hits.push({
          file: `project/${file}`,
          line: index + 1,
          text: text.trim(),
        });
      }
    }
  }

  return hits;
}

function isUnresolvedTodoForContextMarkerLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith(TODO_MARKER) || trimmed.startsWith(`- ${TODO_MARKER}`) || trimmed.startsWith(`* ${TODO_MARKER}`);
}

async function findFirstUncheckedTodo(projectPath: string): Promise<TodoItem | null> {
  const todoPath =
    (await firstExistingPath([path.join(projectPath, 'project', 'todo.md'), path.join(projectPath, 'project', 'TODO.md')])) ??
    null;
  if (!todoPath) {
    return null;
  }

  const contents = await readFile(todoPath, 'utf8');
  const lines = contents.split(/\r?\n/);
  let section = 'Unsectioned';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const headingMatch = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch?.[2]) {
      section = headingMatch[2];
      continue;
    }

    const todoMatch = /^-\s+\[\s\]\s+(.+?)\s*$/.exec(line);
    if (todoMatch?.[1]) {
      return {
        file: `project/${path.basename(todoPath)}`,
        line: index + 1,
        text: todoMatch[1],
        section,
      };
    }
  }

  return null;
}

async function readGitSnapshot(projectPath: string): Promise<GitSnapshot> {
  try {
    const result = await runCommand('git', ['status', '--short', '--branch', '--', '.'], projectPath);
    const statusLines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const branchLine = statusLines.find((line) => line.startsWith('##'));
    const dirtyLines = statusLines.filter((line) => !line.startsWith('##'));

    return {
      available: true,
      branch: branchLine ? branchLine.replace(/^##\s*/, '') : undefined,
      clean: dirtyLines.length === 0,
      statusLines,
    };
  } catch (error) {
    return {
      available: false,
      clean: false,
      statusLines: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<CommandOutput> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    windowsHide: true,
  });

  return { stdout, stderr };
}

async function firstExistingPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
