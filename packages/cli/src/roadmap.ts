import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type DerivedRoadmapPhaseId = 'phase-0' | 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';

export interface InfoSectionMapEntry {
  key: InfoSectionKey;
  headings: string[];
  content: string;
}

export type InfoSectionMap = Partial<Record<InfoSectionKey, InfoSectionMapEntry>>;

export interface DerivedRoadmapTask {
  phaseId: DerivedRoadmapPhaseId;
  text: string;
  source:
    | 'review'
    | 'core-flow'
    | 'screen'
    | 'feature'
    | 'data'
    | 'integration'
    | 'platform'
    | 'monetization'
    | 'release'
    | 'open-question';
  completed: boolean;
}

export interface DerivedRoadmapPhase {
  id: DerivedRoadmapPhaseId;
  title: string;
  tasks: DerivedRoadmapTask[];
}

export interface RoadmapMarkerHit {
  file: string;
  line: number;
  text: string;
}

export interface ProjectRoadmapResult {
  kind: 'project-roadmap';
  projectPath: string;
  infoPath: string;
  todoPath: string;
  blockedByMarkers: boolean;
  markerHits: RoadmapMarkerHit[];
  phases: DerivedRoadmapPhase[];
  warnings: string[];
  write: boolean;
  wrote: boolean;
  preservedStatuses: number;
  todoContent: string;
}

export interface GenerateProjectRoadmapOptions {
  write?: boolean;
  preserveStatus?: boolean;
}

type InfoSectionKey =
  | 'overview'
  | 'targetUsers'
  | 'productGoals'
  | 'nonGoals'
  | 'coreFeatures'
  | 'coreUserFlows'
  | 'mustIncludeScreensOrFlows'
  | 'dataAndBackend'
  | 'platforms'
  | 'packageChoices'
  | 'monetizationStrategy'
  | 'teamContext'
  | 'releaseStrategy'
  | 'questionsToRevisit'
  | 'resources'
  | 'techStack';

interface PhaseSpec {
  id: DerivedRoadmapPhaseId;
  title: string;
  heading: string;
}

const TODO_FOR_CONTEXT_MARKER = '# TodoForContext(optional):';
export const ROADMAP_BLOCKED_MARKER_WARNING =
  'Roadmap generation is blocked until every `# TodoForContext(optional):` marker in `project/` is resolved. Fill the section underneath or delete the marker line first.';
const PHASE_SPECS: PhaseSpec[] = [
  {
    id: 'phase-0',
    title: 'Phase 0: Orientation And Planning',
    heading: '## Phase 0: Orientation And Planning',
  },
  {
    id: 'phase-1',
    title: 'Phase 1: App Shell And First Flow',
    heading: '## Phase 1: App Shell And First Flow',
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Data Layer',
    heading: '## Phase 2: Data Layer',
  },
  {
    id: 'phase-3',
    title: 'Phase 3: Complete Product Flows',
    heading: '## Phase 3: Complete Product Flows',
  },
  {
    id: 'phase-4',
    title: 'Phase 4: Polish, Safeguards, And Release',
    heading: '## Phase 4: Polish, Safeguards, And Release',
  },
];

const SECTION_ALIASES: Record<InfoSectionKey, string[]> = {
  overview: ['overview', 'summary', 'app overview', 'product overview'],
  targetUsers: ['target users', 'users', 'audience', 'who this app is for'],
  productGoals: ['product goals', 'goals', 'business goals', 'success criteria'],
  nonGoals: ['non-goals', 'non goals', 'out of scope'],
  coreFeatures: ['core features', 'features', 'feature list', 'main features'],
  coreUserFlows: ['core user flows', 'user flows', 'flows', 'core flows', 'primary flows'],
  mustIncludeScreensOrFlows: [
    'must-include screens or flows',
    'must include screens or flows',
    'must-have screens or flows',
    'must have screens or flows',
    'known screens or flows',
    'screens',
  ],
  dataAndBackend: [
    'data and backend',
    'data',
    'backend',
    'data model',
    'backend and integrations',
    'data & backend',
  ],
  platforms: ['platforms', 'targets', 'platform targets'],
  packageChoices: ['package choices', 'packages', 'stack choices', 'tech stack'],
  monetizationStrategy: ['monetization strategy', 'monetization'],
  teamContext: ['team context', 'team', 'stakeholders'],
  releaseStrategy: ['release strategy', 'release plan', 'deployment plan', 'distribution'],
  questionsToRevisit: ['questions to revisit', 'open questions', 'unknowns', 'risks'],
  resources: ['resources', 'references', 'links'],
  techStack: ['tech stack & mds onboarding', 'tech stack', 'mds onboarding'],
};

const KEYWORD_TASKS: Array<{
  phaseId: DerivedRoadmapPhaseId;
  source: DerivedRoadmapTask['source'];
  patterns: RegExp[];
  text: string;
}> = [
  {
    phaseId: 'phase-2',
    source: 'data',
    patterns: [/\bauth\b/i, /\blogin\b/i, /\bsign[- ]?in\b/i, /\buser accounts?\b/i],
    text: 'Implement authentication, session handling, and signed-in user boundaries.',
  },
  {
    phaseId: 'phase-2',
    source: 'data',
    patterns: [/\bsupabase\b/i, /\bdrizzle\b/i, /\bdatabase\b/i, /\btables?\b/i],
    text: 'Design the initial data model, persistence layer, and migration boundaries.',
  },
  {
    phaseId: 'phase-2',
    source: 'integration',
    patterns: [/\buploads?\b/i, /\bstorage\b/i, /\bimages?\b/i, /\bfiles?\b/i],
    text: 'Plan file and media upload flows, storage ownership, and failure handling.',
  },
  {
    phaseId: 'phase-2',
    source: 'integration',
    patterns: [/\bexternal apis?\b/i, /\bintegrations?\b/i, /\bthird[- ]party\b/i],
    text: 'Define external integration boundaries, request flows, and error handling.',
  },
  {
    phaseId: 'phase-2',
    source: 'integration',
    patterns: [/\brealtime\b/i, /\bcollaboration\b/i, /\bsync\b/i],
    text: 'Design realtime or sync behavior before wiring collaboration-heavy features.',
  },
  {
    phaseId: 'phase-3',
    source: 'integration',
    patterns: [/\banalytics\b/i, /\bevents?\b/i],
    text: 'Add an analytics/event plan once the MVP flow is working end to end.',
  },
  {
    phaseId: 'phase-3',
    source: 'integration',
    patterns: [/\bpush\b/i, /\bemail\b/i, /\bnotifications?\b/i],
    text: 'Implement notification and messaging flows after the core product loop is stable.',
  },
  {
    phaseId: 'phase-3',
    source: 'integration',
    patterns: [/\boffline\b/i, /\bcache\b/i],
    text: 'Add offline and cache behavior for the flows that need resilience away from the network.',
  },
  {
    phaseId: 'phase-3',
    source: 'integration',
    patterns: [/\badmin\b/i, /\bmoderation\b/i],
    text: 'Implement admin or moderation tooling after the primary user experience is established.',
  },
  {
    phaseId: 'phase-3',
    source: 'monetization',
    patterns: [/\bpayments?\b/i, /\bsubscriptions?\b/i, /\bmonetization\b/i, /\bpricing\b/i],
    text: 'Implement the monetization or payments flow after the core value loop is proven.',
  },
  {
    phaseId: 'phase-4',
    source: 'release',
    patterns: [/\btestflight\b/i, /\bapp store\b/i, /\bplay store\b/i, /\bside-loaded apk\b/i],
    text: 'Prepare store/distribution packaging, review notes, and release validation for the chosen delivery path.',
  },
  {
    phaseId: 'phase-4',
    source: 'release',
    patterns: [/\bweb hosting\b/i, /\bvps\b/i, /\bplesk\b/i, /\btemp domain\b/i, /\bnginx\b/i, /\bserver\b/i],
    text: 'Validate the production web/server hosting path, environment ownership, and rollout checklist.',
  },
  {
    phaseId: 'phase-4',
    source: 'release',
    patterns: [/\btest-to-main\b/i, /\bbranch protection\b/i, /\bpr checks?\b/i],
    text: 'Confirm branch protection, CI checks, and release gating match the planned ship workflow.',
  },
];

export async function generateProjectRoadmap(
  projectPathInput = '.',
  options: GenerateProjectRoadmapOptions = {}
): Promise<ProjectRoadmapResult> {
  const projectPath = path.resolve(projectPathInput);
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const todoPath = path.join(projectPath, 'project', 'todo.md');
  const write = options.write ?? false;
  const preserveStatus = options.preserveStatus ?? true;

  const infoRaw = await readFile(infoPath, 'utf8');
  const markerHits = await scanProjectTodoForContextMarkers(projectPath);
  const existingTodo = (await pathExists(todoPath)) ? await readFile(todoPath, 'utf8') : renderTodoSkeleton(extractProjectName(infoRaw));

  if (markerHits.length > 0) {
    return {
      kind: 'project-roadmap',
      projectPath,
      infoPath,
      todoPath,
      blockedByMarkers: true,
      markerHits,
      phases: [],
      warnings: [ROADMAP_BLOCKED_MARKER_WARNING],
      write,
      wrote: false,
      preservedStatuses: 0,
      todoContent: ensureTrailingNewline(existingTodo),
    };
  }

  const sections = parseInfoSections(infoRaw);
  const warnings: string[] = [];
  const derivedPhases = deriveRoadmapPhases(sections, warnings);
  const todoWithManagedBlocks = ensureManagedBlocks(existingTodo);

  let nextTodo = todoWithManagedBlocks;
  let preservedStatuses = 0;
  for (const phase of derivedPhases) {
    const phaseStatuses = preserveStatus ? readManagedTaskStatus(nextTodo, phase.id) : new Map<string, boolean>();
    preservedStatuses += phase.tasks.filter((task) => phaseStatuses.get(normalizeTaskKey(task.text)) === true).length;
    nextTodo = replaceManagedBlock(nextTodo, phase.id, phase.tasks, phaseStatuses);
  }

  const wrote = write && normalizeLineEndings(nextTodo) !== normalizeLineEndings(existingTodo);
  if (write && wrote) {
    await writeFile(todoPath, ensureTrailingNewline(nextTodo), 'utf8');
  }

  return {
    kind: 'project-roadmap',
    projectPath,
    infoPath,
    todoPath,
    blockedByMarkers: false,
    markerHits: [],
    phases: derivedPhases,
    warnings,
    write,
    wrote,
    preservedStatuses,
    todoContent: ensureTrailingNewline(nextTodo),
  };
}

export function parseInfoSections(infoRaw: string): InfoSectionMap {
  const lines = normalizeLineEndings(infoRaw).split('\n');
  const map: InfoSectionMap = {};
  let currentHeading: string | null = null;
  let currentKey: InfoSectionKey | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (!currentHeading || !currentKey) {
      buffer = [];
      return;
    }
    const content = buffer.join('\n').trim();
    const existing = map[currentKey];
    map[currentKey] = {
      key: currentKey,
      headings: existing ? [...existing.headings, currentHeading] : [currentHeading],
      content: existing && existing.content ? `${existing.content}\n\n${content}`.trim() : content,
    };
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(line);
    if (headingMatch?.[1]) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentKey = normalizeSectionHeading(currentHeading);
      continue;
    }

    if (currentHeading) {
      buffer.push(line);
    }
  }

  flush();
  return map;
}

export function deriveRoadmapPhases(sections: InfoSectionMap, warnings: string[] = []): DerivedRoadmapPhase[] {
  const phaseTasks = new Map<DerivedRoadmapPhaseId, DerivedRoadmapTask[]>(
    PHASE_SPECS.map((phase) => [phase.id, []])
  );
  const seen = new Map<DerivedRoadmapPhaseId, Set<string>>(PHASE_SPECS.map((phase) => [phase.id, new Set<string>()]));

  const addTask = (
    phaseId: DerivedRoadmapPhaseId,
    text: string,
    source: DerivedRoadmapTask['source']
  ): void => {
    const cleaned = cleanTaskText(text);
    if (!cleaned) {
      return;
    }
    const key = normalizeTaskKey(cleaned);
    const phaseSeen = seen.get(phaseId);
    if (phaseSeen?.has(key)) {
      return;
    }
    phaseSeen?.add(key);
    phaseTasks.get(phaseId)?.push({
      phaseId,
      text: cleaned,
      source,
      completed: false,
    });
  };

  const flowItems = extractSectionItems(sections.coreUserFlows?.content);
  const featureItems = extractSectionItems(sections.coreFeatures?.content);
  const screenItems = extractSectionItems(sections.mustIncludeScreensOrFlows?.content);
  const dataItems = extractSectionItems(sections.dataAndBackend?.content);
  const releaseItems = extractSectionItems(sections.releaseStrategy?.content);
  const monetizationItems = extractSectionItems(sections.monetizationStrategy?.content);
  const questionItems = extractSectionItems(sections.questionsToRevisit?.content);
  const platformItems = extractSectionItems(sections.platforms?.content);
  const packageItems = extractSectionItems(sections.packageChoices?.content);

  addTask(
    'phase-0',
    'Review the auto-derived roadmap tasks below against `project/info.md` and adjust the project docs if anything is inaccurate before implementation.',
    'review'
  );

  if (screenItems.length > 0) {
    addTask(
      'phase-0',
      `Confirm the roadmap covers the required screens and flows: ${formatTaskList(screenItems)}.`,
      'screen'
    );
  }

  if (questionItems.length > 0 || hasUnresolvedMarkers(sections)) {
    addTask(
      'phase-0',
      'Resolve open product questions in `project/info.md` before deep implementation work begins.',
      'open-question'
    );
  }

  const firstFlow = flowItems[0];
  if (firstFlow) {
    addTask('phase-1', `Implement the first core user flow: ${firstFlow}.`, 'core-flow');
  } else {
    warnings.push('No concrete core flow was found in `project/info.md`; roadmap falls back to scaffold tasks for Phase 1.');
  }

  const firstScreens = pickDistinct(screenItems, 3);
  if (firstScreens.length > 0) {
    addTask(
      'phase-1',
      `Build the first screens or routes needed for the MVP flow: ${formatTaskList(firstScreens)}.`,
      'screen'
    );
  }

  const firstFeatures = pickDistinct(featureItems, 3);
  if (firstFeatures.length > 0) {
    addTask(
      'phase-1',
      `Scope the first feature modules around: ${formatTaskList(firstFeatures)}.`,
      'feature'
    );
  }

  if (dataItems.length > 0) {
    addTask(
      'phase-2',
      `Design the initial data layer and service boundaries for: ${formatTaskList(pickDistinct(dataItems, 3))}.`,
      'data'
    );
  } else {
    warnings.push('No concrete data/backend notes were found in `project/info.md`; Phase 2 will rely mostly on the scaffolded defaults.');
  }

  const keywordSource = [dataItems, releaseItems, monetizationItems, packageItems, platformItems].flat().join(' ');
  for (const task of KEYWORD_TASKS) {
    if (task.patterns.some((pattern) => pattern.test(keywordSource))) {
      addTask(task.phaseId, task.text, task.source);
    }
  }

  const remainingFlows = flowItems.slice(1);
  if (remainingFlows.length > 0) {
    addTask(
      'phase-3',
      `Implement the remaining core flows from ` + '`project/info.md`' + `: ${formatTaskList(pickDistinct(remainingFlows, 4))}.`,
      'core-flow'
    );
  }

  const remainingScreens = screenItems.slice(firstScreens.length);
  if (remainingScreens.length > 0) {
    addTask(
      'phase-3',
      `Add the remaining must-include screens or workflows: ${formatTaskList(pickDistinct(remainingScreens, 4))}.`,
      'screen'
    );
  }

  if (monetizationItems.length > 0 && !isPlaceholderSection(sections.monetizationStrategy?.content)) {
    addTask(
      'phase-3',
      `Translate the monetization or business model into product work: ${formatTaskList(pickDistinct(monetizationItems, 2))}.`,
      'monetization'
    );
  }

  const remainingPlatforms = extractPlatformTargets(platformItems);
  if (remainingPlatforms.length > 1) {
    addTask(
      'phase-3',
      `Adapt the completed flows for the remaining target platforms: ${formatTaskList(remainingPlatforms)}.`,
      'platform'
    );
  }

  if (releaseItems.length > 0) {
    addTask(
      'phase-4',
      `Prepare the release flow for: ${formatTaskList(pickDistinct(releaseItems, 3))}.`,
      'release'
    );
  }

  if (questionItems.length > 0) {
    addTask(
      'phase-4',
      'Close or explicitly defer the remaining open questions before production release.',
      'open-question'
    );
  }

  return PHASE_SPECS.map((phase) => ({
    id: phase.id,
    title: phase.title,
    tasks: phaseTasks.get(phase.id) ?? [],
  }));
}

export function renderDerivedRoadmapPlaceholder(phaseId: DerivedRoadmapPhaseId): string {
  const marker = markerName(phaseId);
  return [`<!-- ${marker}_START -->`, `<!-- ${marker}_END -->`].join('\n');
}

export async function scanProjectTodoForContextMarkers(
  projectPathInput = '.'
): Promise<RoadmapMarkerHit[]> {
  const projectPath = path.resolve(projectPathInput);
  const projectDir = path.join(projectPath, 'project');
  if (!(await pathExists(projectDir))) {
    return [];
  }

  const entries = await readdir(projectDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
  const hits: RoadmapMarkerHit[] = [];

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

function ensureManagedBlocks(todoRaw: string): string {
  let next = ensureTrailingNewline(todoRaw);

  for (const [index, phase] of [...PHASE_SPECS].reverse().entries()) {
    const phaseIndex = PHASE_SPECS.length - 1 - index;
    const startMarker = `<!-- ${markerName(phase.id)}_START -->`;
    if (next.includes(startMarker)) {
      continue;
    }

    const sectionIndex = next.indexOf(phase.heading);
    if (sectionIndex === -1) {
      continue;
    }

    const nextPhase = PHASE_SPECS[phaseIndex + 1];
    const insertionIndex = nextPhase ? next.indexOf(nextPhase.heading, sectionIndex) : next.length;
    const prefix = next.slice(0, insertionIndex).trimEnd();
    const suffix = next.slice(insertionIndex).trimStart();
    const block = renderDerivedRoadmapPlaceholder(phase.id);
    next = suffix.length > 0 ? `${prefix}\n\n${block}\n\n${suffix}` : `${prefix}\n\n${block}\n`;
  }

  return next;
}

function replaceManagedBlock(
  todoRaw: string,
  phaseId: DerivedRoadmapPhaseId,
  tasks: DerivedRoadmapTask[],
  existingStatus: Map<string, boolean>
): string {
  const marker = markerName(phaseId);
  const startMarker = `<!-- ${marker}_START -->`;
  const endMarker = `<!-- ${marker}_END -->`;
  const body = tasks.map((task) => {
    const checked = existingStatus.get(normalizeTaskKey(task.text)) === true;
    return `- [${checked ? 'x' : ' '}] ${task.text}`;
  });
  const replacement = [startMarker, ...body, endMarker].join('\n');
  const pattern = new RegExp(`<!-- ${marker}_START -->[\\s\\S]*?<!-- ${marker}_END -->`);
  return todoRaw.replace(pattern, replacement);
}

function readManagedTaskStatus(todoRaw: string, phaseId: DerivedRoadmapPhaseId): Map<string, boolean> {
  const pattern = new RegExp(`<!-- ${markerName(phaseId)}_START -->([\\s\\S]*?)<!-- ${markerName(phaseId)}_END -->`);
  const match = pattern.exec(todoRaw);
  const status = new Map<string, boolean>();
  const body = match?.[1];
  if (!body) {
    return status;
  }

  for (const line of body.split(/\r?\n/u)) {
    const todoMatch = /^-\s+\[(x| )\]\s+(.+?)\s*$/i.exec(line.trim());
    const checkbox = todoMatch?.[1];
    const taskText = todoMatch?.[2];
    if (checkbox && taskText) {
      status.set(normalizeTaskKey(taskText), checkbox.toLowerCase() === 'x');
    }
  }

  return status;
}

function markerName(phaseId: DerivedRoadmapPhaseId): string {
  return `MDS_DERIVED_${phaseId.toUpperCase().replace(/-/g, '_')}`;
}

function normalizeSectionHeading(value: string): InfoSectionKey | null {
  const normalized = normalizeTaskKey(value);
  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as Array<[InfoSectionKey, string[]]>) {
    if (aliases.map(normalizeTaskKey).includes(normalized)) {
      return key;
    }
  }
  return null;
}

function extractSectionItems(content: string | undefined): string[] {
  if (!content || isPlaceholderSection(content)) {
    return [];
  }

  const lines = normalizeLineEndings(content).split('\n');
  const bulletItems = lines
    .map((line) => {
      const bulletMatch = /^\s*[-*]\s+(.+?)\s*$/.exec(line);
      const numberedMatch = /^\s*\d+\.\s+(.+?)\s*$/.exec(line);
      return bulletMatch?.[1] ?? numberedMatch?.[1] ?? null;
    })
    .filter((value): value is string => Boolean(value))
    .map(cleanTaskText)
    .filter(Boolean);
  if (bulletItems.length > 0) {
    return uniqueItems(bulletItems);
  }

  const prose = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('#'))
    .filter((line) => !line.startsWith('>'))
    .filter((line) => !line.startsWith('```'))
    .filter((line) => !line.includes(TODO_FOR_CONTEXT_MARKER))
    .join(' ');
  if (!prose) {
    return [];
  }

  const sentenceSplit = prose
    .split(/(?:[.;]|\s{2,})/u)
    .map((item) => cleanTaskText(item))
    .filter(Boolean);

  return uniqueItems(sentenceSplit);
}

function extractPlatformTargets(platformItems: string[]): string[] {
  const values = platformItems
    .flatMap((item) => item.split(/[:,]/u))
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => item.split(/\s+and\s+|\s*,\s*/u))
    .map((item) => item.trim())
    .filter((item) =>
      ['web', 'ios', 'android', 'apple tv', 'android tv', 'tvos'].includes(normalizeTaskKey(item))
    );

  return uniqueItems(values.map((item) => item.toLowerCase()));
}

function formatTaskList(items: string[]): string {
  const picked = pickDistinct(items, 4);
  if (picked.length === 0) {
    return '';
  }
  if (picked.length === 1) {
    return picked[0] ?? '';
  }
  if (picked.length === 2) {
    return `${picked[0]} and ${picked[1]}`;
  }
  return `${picked.slice(0, -1).join(', ')}, and ${picked[picked.length - 1]}`;
}

function pickDistinct(items: string[], max: number): string[] {
  return uniqueItems(items).slice(0, max);
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeTaskKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function cleanTaskText(value: string): string {
  return value
    .replace(/^Derived from the first planned flows:\s*/i, '')
    .replace(/^Starting mode:\s*/i, '')
    .replace(/^-\s*/, '')
    .replace(/^`|`$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\.$/, '.')
    .trim()
    .replace(/[;,:-]+$/u, '')
    .trim();
}

function normalizeTaskKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasUnresolvedMarkers(sections: InfoSectionMap): boolean {
  return Object.values(sections).some((entry) => entry?.content.includes(TODO_FOR_CONTEXT_MARKER));
}

function isPlaceholderSection(content: string | undefined): boolean {
  if (!content) {
    return true;
  }
  const normalized = normalizeTaskKey(content);
  return (
    content.includes(TODO_FOR_CONTEXT_MARKER) ||
    normalized.includes('add ') ||
    normalized.includes('not planned yet') ||
    normalized.includes('agent should derive') ||
    normalized.includes('replace generic onboarding defaults')
  );
}

function extractProjectName(infoRaw: string): string {
  const match = /^#\s+(.+?)\s*$/m.exec(normalizeLineEndings(infoRaw));
  if (!match?.[1]) {
    return 'Project';
  }
  return match[1].replace(/\s+project info$/i, '').trim();
}

function renderTodoSkeleton(appName: string): string {
  return [
    `# ${appName} TODO`,
    '',
    '## Phase 0: Orientation And Planning',
    '',
    '- [ ] Review `project/` files for accuracy and planning adjustments.',
    '- [ ] Resolve every `# TodoForContext(optional):` marker by filling the section underneath or deleting the marker line to acknowledge no extra context is needed.',
    '',
    renderDerivedRoadmapPlaceholder('phase-0'),
    '',
    '## Phase 1: App Shell And First Flow',
    '',
    renderDerivedRoadmapPlaceholder('phase-1'),
    '',
    '## Phase 2: Data Layer',
    '',
    renderDerivedRoadmapPlaceholder('phase-2'),
    '',
    '## Phase 3: Complete Product Flows',
    '',
    renderDerivedRoadmapPlaceholder('phase-3'),
    '',
    '## Phase 4: Polish, Safeguards, And Release',
    '',
    renderDerivedRoadmapPlaceholder('phase-4'),
    '',
  ].join('\n');
}

function ensureTrailingNewline(value: string): string {
  return `${normalizeLineEndings(value).trimEnd()}\n`;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isUnresolvedTodoForContextMarkerLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith(TODO_FOR_CONTEXT_MARKER) ||
    trimmed.startsWith(`- ${TODO_FOR_CONTEXT_MARKER}`) ||
    trimmed.startsWith(`* ${TODO_FOR_CONTEXT_MARKER}`)
  );
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
