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
    | 'setup'
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

export interface RoadmapClarificationQuestion {
  id: string;
  section: InfoSectionKey | 'project';
  prompt: string;
  reason: string;
}

export interface RoadmapStatePhase {
  derivedTaskKeys: string[];
}

export interface RoadmapState {
  version: 1;
  phases: Record<DerivedRoadmapPhaseId, RoadmapStatePhase>;
}

export interface ProjectRoadmapResult {
  kind: 'project-roadmap';
  projectPath: string;
  infoPath: string;
  todoPath: string;
  roadmapStatePath: string;
  blockedByMarkers: boolean;
  markerHits: RoadmapMarkerHit[];
  needsClarification: boolean;
  clarificationQuestions: RoadmapClarificationQuestion[];
  confidenceWarnings: string[];
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

interface MarkerScanOptions {
  scope?: 'project' | 'info';
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

interface PhaseRange {
  phase: PhaseSpec;
  start: number;
  end: number;
}

interface MergeRoadmapResult {
  todoContent: string;
  preservedStatuses: number;
}

interface ConfidenceCheck {
  warning: string;
  question: RoadmapClarificationQuestion;
}

interface RoadmapProjectContext {
  appDirectory: 'src/app' | 'app' | null;
  hasExposition: boolean;
  hasStylist: boolean;
}

const TODO_FOR_CONTEXT_MARKER = '# TodoForContext(optional):';
const LEGACY_MARKER_PREFIX = '<!-- MDS_DERIVED_PHASE_';
const ROADMAP_STATE_FILE = 'roadmap-state.json';
const LEGACY_SCAFFOLD_TASK_KEYS = new Set([
  'browse exposition pages to understand included base packages',
  'review styling in the stylist page',
  'review project files for accuracy and planning adjustments',
  'run or defer eject stylist mark this todo done after ejection or deciding to defer if you want to keep the stylist around for tinkering',
  'run mds eject exposition and keep only the generated sections you want to retain',
  'sign in and set up eas in the terminal',
  'resolve every todoforcontext optional marker in project info md by filling the section underneath or deleting the marker line to acknowledge no extra context is needed',
  'confirm visual direction in project style md after using the stylist page',
  'after the project info md markers are resolved refresh the agent derived roadmap from project info md and review it for accuracy',
  'refresh the agent derived roadmap from project info md and review it for accuracy before implementation',
  'keep or prune included package examples after reviewing exposition',
  'remove exposition pages before production once their lessons are absorbed',
  'establish the app shell and first implementation ready route in src app',
  'establish the app shell and first implementation ready route for the mvp',
  'implement the first concrete product flow from project info md and the roadmap',
  'implement the initial data layer using local dummy data with expo sqlite',
  'implement the initial data layer and service boundaries needed for the mvp',
  'build the remaining core flows from project info md phase by phase',
  'adapt the working mvp flow for the remaining target platforms after the primary flow is stable',
  'configure eas for building mobile applications',
  'configure eas for publishing mobile applications',
  'complete the remaining product flows needed for the mvp',
  'run mds doctor ci and address errors',
  'run mds doctor ci and address errors before release',
  'follow project release flow md for test to main development',
  'complete the one time github repo setup from project release flow md so test and main are protected correctly',
  'add github branch protection so pr checks pass before merging into test or main',
  'prepare store distribution packaging review notes and release validation for the chosen delivery path',
]);
const GENERATED_SCAFFOLD_TASK_PATTERNS = [
  /^browse exposition pages to understand included base packages$/,
  /^review styling in the stylist page$/,
  /^run or defer eject stylist mark this todo done after ejection or deciding to defer/,
  /^run mds eject exposition and keep only the generated sections/,
  /^sign in and set up eas in the terminal$/,
  /^resolve every todoforcontext optional marker/,
  /^confirm visual direction in project style md after using the stylist page$/,
  /^after the project info md markers are resolved refresh/,
  /^refresh the agent derived roadmap from project info md/,
  /^keep or prune included package examples after reviewing exposition$/,
  /^remove exposition pages before production/,
  /^establish the app shell and first implementation ready route in src app$/,
  /^establish the app shell and first implementation ready route for the mvp$/,
  /^implement the first concrete product flow from project info md and the roadmap$/,
  /^implement the initial data layer using local dummy data with expo sqlite$/,
  /^implement the initial data layer and service boundaries needed for the mvp$/,
  /^build the remaining core flows from project info md phase by phase$/,
  /^adapt the working mvp flow for the remaining target platforms after the primary flow is stable$/,
  /^configure eas for building mobile applications$/,
  /^configure eas for publishing mobile applications$/,
  /^run mds doctor ci and address errors$/,
  /^follow project release flow md for test to main development$/,
  /^complete the one time github repo setup from project release flow md/,
  /^add github branch protection so pr checks pass before merging into test or main$/,
  /^prepare store distribution packaging review notes and release validation/,
];
export const ROADMAP_BLOCKED_MARKER_WARNING =
  'Roadmap generation is blocked until every `# TodoForContext(optional):` marker in `project/` is resolved. Fill the section underneath or delete the marker line first.';
export const ROADMAP_CLARIFICATION_WARNING =
  'Roadmap generation needs clarification because `project/info.md` still reads as too generic for high-confidence product planning.';

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
  coreFeatures: ['core features', 'core flows and features', 'features', 'feature list', 'main features'],
  coreUserFlows: ['first user flow', 'core user flows', 'user flows', 'flows', 'core flows', 'primary flows'],
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
  packageChoices: ['package choices', 'packages', 'stack choices'],
  monetizationStrategy: ['monetization strategy', 'monetization'],
  teamContext: ['team context', 'team', 'stakeholders'],
  releaseStrategy: ['release strategy', 'release plan', 'deployment plan', 'distribution'],
  questionsToRevisit: ['questions to revisit', 'open questions', 'unknowns', 'risks', 'later scope & possibilities'],
  resources: ['resources', 'references', 'links', 'research, notes, and references'],
  techStack: ['tech stack & cess onboarding', 'tech stack & mds onboarding', 'tech stack', 'mds onboarding'],
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

const GENERIC_PATTERNS: Record<'audience' | 'coreFlows' | 'release' | 'productGoals', RegExp[]> = {
  audience: [
    /\bexpo app users\b/i,
    /\btarget users?\b/i,
    /\bgeneral users?\b/i,
  ],
  coreFlows: [
    /\bagent should derive\b/i,
    /\blet the agent derive\b/i,
    /\bderive the first core user flows\b/i,
    /\bdecide later\b/i,
    /\btbd\b/i,
  ],
  release: [
    /\bexpo web\/native deployment\b/i,
    /\bnot planned yet\b/i,
    /\bdecide later\b/i,
  ],
  productGoals: [
    /\badd the business\/product outcomes\b/i,
    /\bdecide later\b/i,
  ],
};

export async function generateProjectRoadmap(
  projectPathInput = '.',
  options: GenerateProjectRoadmapOptions = {}
): Promise<ProjectRoadmapResult> {
  const projectPath = path.resolve(projectPathInput);
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const todoPath = path.join(projectPath, 'project', 'todo.md');
  const roadmapStatePath = path.join(projectPath, 'project', ROADMAP_STATE_FILE);
  const write = options.write ?? false;
  const preserveStatus = options.preserveStatus ?? true;

  const infoRaw = await readFile(infoPath, 'utf8');
  const existingTodo = (await pathExists(todoPath))
    ? await readFile(todoPath, 'utf8')
    : renderTodoSkeleton(extractProjectName(infoRaw));
  const roadmapContext = await inspectRoadmapProjectContext(projectPath);
  const markerHits = await scanProjectTodoForContextMarkers(projectPath, { scope: 'info' });

  if (markerHits.length > 0) {
    return {
      kind: 'project-roadmap',
      projectPath,
      infoPath,
      todoPath,
      roadmapStatePath,
      blockedByMarkers: true,
      markerHits,
      needsClarification: false,
      clarificationQuestions: [],
      confidenceWarnings: [],
      phases: [],
      warnings: [ROADMAP_BLOCKED_MARKER_WARNING],
      write,
      wrote: false,
      preservedStatuses: 0,
      todoContent: ensureTrailingNewline(existingTodo),
    };
  }

  const sections = parseInfoSections(infoRaw);
  const clarification = detectRoadmapClarificationNeeds(sections);
  if (clarification.clarificationQuestions.length > 0) {
    return {
      kind: 'project-roadmap',
      projectPath,
      infoPath,
      todoPath,
      roadmapStatePath,
      blockedByMarkers: false,
      markerHits: [],
      needsClarification: true,
      clarificationQuestions: clarification.clarificationQuestions,
      confidenceWarnings: clarification.confidenceWarnings,
      phases: [],
      warnings: [ROADMAP_CLARIFICATION_WARNING],
      write,
      wrote: false,
      preservedStatuses: 0,
      todoContent: ensureTrailingNewline(stripLegacyDerivedMarkers(existingTodo)),
    };
  }

  const warnings: string[] = [];
  const derivedPhases = deriveRoadmapPhases(sections, warnings, roadmapContext);
  const previousState =
    (await readRoadmapState(roadmapStatePath)) ?? inferLegacyRoadmapState(existingTodo);
  const nextState = buildRoadmapState(derivedPhases);
  const merged = mergeRoadmapIntoTodo(existingTodo, derivedPhases, previousState, preserveStatus);
  const nextTodo = merged.todoContent;
  const todoChanged = normalizeLineEndings(nextTodo) !== normalizeLineEndings(existingTodo);
  const previousStateJson = previousState ? JSON.stringify(previousState) : null;
  const nextStateJson = JSON.stringify(nextState);
  const stateChanged = previousStateJson !== nextStateJson;
  const wrote = write && (todoChanged || stateChanged);

  if (write) {
    if (todoChanged) {
      await writeFile(todoPath, nextTodo, 'utf8');
    }
    if (stateChanged) {
      await writeFile(roadmapStatePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
    }
  }

  return {
    kind: 'project-roadmap',
    projectPath,
    infoPath,
    todoPath,
    roadmapStatePath,
    blockedByMarkers: false,
    markerHits: [],
    needsClarification: false,
    clarificationQuestions: [],
    confidenceWarnings: [],
    phases: derivedPhases,
    warnings,
    write,
    wrote,
    preservedStatuses: merged.preservedStatuses,
    todoContent: nextTodo,
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
    const headingMatch = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (headingMatch?.[1] === '#' && !/tech stack/iu.test(headingMatch[2] ?? '')) {
      continue;
    }
    if (headingMatch?.[2]) {
      flush();
      currentHeading = headingMatch[2].trim();
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

export function deriveRoadmapPhases(
  sections: InfoSectionMap,
  warnings: string[] = [],
  context: RoadmapProjectContext = {
    appDirectory: null,
    hasExposition: false,
    hasStylist: false,
  }
): DerivedRoadmapPhase[] {
  const phaseTasks = new Map<DerivedRoadmapPhaseId, DerivedRoadmapTask[]>(
    PHASE_SPECS.map((phase) => [phase.id, []])
  );
  const seen = new Map<DerivedRoadmapPhaseId, Set<string>>(
    PHASE_SPECS.map((phase) => [phase.id, new Set<string>()])
  );

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
  const techStackItems = extractSectionItems(sections.techStack?.content);
  const monetizationItems = extractSectionItems(sections.monetizationStrategy?.content);
  const questionItems = extractSectionItems(sections.questionsToRevisit?.content);
  const platformItems = extractSectionItems(sections.platforms?.content);
  const packageItems = buildMeaningfulItemList([
    ...extractSectionItems(sections.packageChoices?.content),
    getLabeledSectionValue(sections.techStack?.content, 'Navigation'),
    getLabeledSectionValue(sections.techStack?.content, 'Style Library'),
    parseYesNoValue(getLabeledSectionValue(sections.techStack?.content, 'Expo UI')) === true
      ? 'Expo UI'
      : null,
    parseYesNoValue(getLabeledSectionValue(sections.techStack?.content, 'Expo Native Tabs')) === true
      ? 'Expo Native Tabs'
      : null,
    ...techStackItems.filter((item) => /software mansion/i.test(item)),
  ]);
  const techStackContent = sections.techStack?.content;
  const startingDataMode = getLabeledSectionValue(techStackContent, 'Starting Data mode');
  const easEnabled = parseYesNoValue(getLabeledSectionValue(techStackContent, 'EAS'));
  const easUses = splitChoiceList(getLabeledSectionValue(techStackContent, 'EAS Usage'));
  const testToMainSafeguards = parseYesNoValue(
    getLabeledSectionValue(techStackContent, 'Use test-to-main safeguards')
  );
  const deployedServer = getLabeledSectionValue(techStackContent, 'Deployed server');
  const webOutput = getLabeledSectionValue(techStackContent, 'Web output');
  const routeDirectory = extractRouteDirectory(sections, context);
  const firstTargetPlatform =
    getLabeledSectionValue(sections.platforms?.content, 'First MVP platform') ??
    getLabeledSectionValue(techStackContent, 'First MVP platform');
  const dataItems = buildMeaningfulItemList([
    ...extractSectionItems(sections.dataAndBackend?.content),
    getLabeledSectionValue(techStackContent, 'Data Categories'),
    startingDataMode,
    toEnabledLabel(getLabeledSectionValue(techStackContent, 'Auth'), 'Auth'),
    toEnabledLabel(getLabeledSectionValue(techStackContent, 'State management library'), 'State management'),
  ]);
  const releaseItems = buildMeaningfulItemList([
    ...extractSectionItems(sections.releaseStrategy?.content),
    getLabeledSectionValue(techStackContent, 'Initial Deployment plan'),
    testToMainSafeguards === true ? 'test-to-main safeguards' : null,
    shouldSkipServerReleaseTask(deployedServer, webOutput) ? null : deployedServer,
    webOutput && normalizeTaskKey(webOutput) !== 'none' ? `web output: ${webOutput}` : null,
  ]);
  const effectiveMonetizationItems = isNoMonetizationPlan(sections.monetizationStrategy?.content)
    ? []
    : monetizationItems;

  addTask('phase-0', 'Review `project/` files for accuracy and planning adjustments.', 'setup');
  if (context.hasExposition) {
    addTask(
      'phase-0',
      'Browse exposition pages to understand the included starter flows, package demos, and MDS scaffolding.',
      'setup'
    );
    addTask(
      'phase-0',
      'Run `mds eject exposition` and keep only the generated sections you want to retain.',
      'setup'
    );
    addTask(
      'phase-0',
      'Keep or prune included package examples after reviewing `/exposition`.',
      'setup'
    );
    addTask(
      'phase-0',
      'Remove exposition pages before production once their lessons are absorbed.',
      'setup'
    );
  }
  if (context.hasStylist) {
    addTask(
      'phase-0',
      "Review styling in the 'Stylist' page and pressure-test the starter theme before building product screens.",
      'setup'
    );
    addTask(
      'phase-0',
      'Run or defer `eject-stylist`; mark this todo done after ejection or deciding to keep it longer for design iteration.',
      'setup'
    );
  }
  addTask(
    'phase-0',
    context.hasStylist
      ? 'Confirm visual direction in `project/style.md` after reviewing the Stylist page.'
      : 'Confirm the visual direction in `project/style.md` before implementation accelerates.',
    'setup'
  );
  if (easEnabled === true || easUses.length > 0) {
    addTask('phase-0', 'Sign in and set up EAS in the terminal.', 'setup');
  }
  addTask(
    'phase-0',
    'If `project/info.md` changes materially, rerun `mds roadmap` and review this plan before continuing implementation.',
    'setup'
  );

  addTask(
    'phase-1',
    routeDirectory
      ? `Establish the app shell and first implementation-ready route in ${routeDirectory}.`
      : 'Establish the app shell and first implementation-ready route for the MVP.',
    'screen'
  );
  const firstFlow = flowItems[0];
  if (firstFlow) {
    addTask('phase-1', `Implement the first core user flow: ${firstFlow}.`, 'core-flow');
  } else {
    addTask(
      'phase-1',
      'Implement the first concrete product flow from `project/info.md` and the roadmap.',
      'core-flow'
    );
    warnings.push(
      'No concrete core flow was found in `project/info.md`; roadmap generation should be rerun after the app intent is clarified.'
    );
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

  if (startingDataMode) {
    addTask('phase-2', `Implement the initial data layer using ${startingDataMode}.`, 'data');
    if (/\bsupabase\b/i.test(startingDataMode)) {
      addTask(
        'phase-2',
        'Create separate Supabase projects for test/staging and production before shared data work expands.',
        'data'
      );
    }
  } else {
    addTask('phase-2', 'Implement the initial data layer and service boundaries needed for the MVP.', 'data');
  }

  if (dataItems.length > 0) {
    addTask(
      'phase-2',
      `Design the initial data layer and service boundaries for: ${formatTaskList(pickDistinct(dataItems, 3))}.`,
      'data'
    );
  } else {
    warnings.push(
      'No concrete data/backend notes were found in `project/info.md`; data-layer work will rely on the scaffolded phase anchors until clarified.'
    );
  }

  const keywordSource = [dataItems, releaseItems, effectiveMonetizationItems, packageItems, platformItems]
    .flat()
    .join(' ');
  for (const task of KEYWORD_TASKS) {
    if (
      task.text === 'Validate the production web/server hosting path, environment ownership, and rollout checklist.' &&
      shouldSkipServerReleaseTask(deployedServer, webOutput)
    ) {
      continue;
    }
    if (task.patterns.some((pattern) => pattern.test(keywordSource))) {
      addTask(task.phaseId, task.text, task.source);
    }
  }

  const remainingFlows = flowItems.slice(1);
  if (remainingFlows.length > 0) {
    addTask(
      'phase-3',
      `Implement the remaining core flows from ` +
        '`project/info.md`' +
        `: ${formatTaskList(pickDistinct(remainingFlows, 4))}.`,
      'core-flow'
    );
  } else if (flowItems.length === 0) {
    addTask('phase-3', 'Build the remaining core flows from `project/info.md` phase by phase.', 'core-flow');
  }

  const remainingScreens = screenItems.slice(firstScreens.length);
  if (remainingScreens.length > 0) {
    addTask(
      'phase-3',
      `Add the remaining must-include screens or workflows: ${formatTaskList(
        pickDistinct(remainingScreens, 4)
      )}.`,
      'screen'
    );
  }

  if (
    effectiveMonetizationItems.length > 0 &&
    !isPlaceholderSection(sections.monetizationStrategy?.content) &&
    !isNoMonetizationPlan(sections.monetizationStrategy?.content)
  ) {
    addTask(
      'phase-3',
      `Translate the monetization or business model into product work: ${formatTaskList(
        pickDistinct(effectiveMonetizationItems, 2)
      )}.`,
      'monetization'
    );
  }

  const targetPlatforms = extractPlatformTargets(platformItems);
  const normalizedFirstTargetPlatform = normalizeTaskKey(firstTargetPlatform ?? '');
  const remainingPlatforms = targetPlatforms.filter(
    (platform) => normalizeTaskKey(platform) !== normalizedFirstTargetPlatform
  );
  if (remainingPlatforms.length > 0) {
    addTask(
      'phase-3',
      `Adapt the working MVP flow for the remaining target platforms after the primary flow is stable: ${formatTaskList(
        remainingPlatforms
      )}.`,
      'platform'
    );
  }
  for (const easUse of easUses) {
    addTask('phase-3', `Configure EAS for ${easUse}.`, 'integration');
  }

  addTask('phase-4', 'Run `mds doctor --ci` and address errors.', 'release');
  if (testToMainSafeguards === true) {
    addTask('phase-4', 'Follow `project/release-flow.md` for test-to-main development.', 'release');
    addTask(
      'phase-4',
      'Complete the one-time GitHub repo setup from `project/release-flow.md` so `test` and `main` are protected correctly.',
      'release'
    );
    addTask(
      'phase-4',
      'Add GitHub branch protection so PR checks pass before merging into `test` or `main`.',
      'release'
    );
  } else if (testToMainSafeguards === false) {
    addTask('phase-4', 'Decide on release safeguards before production work begins.', 'release');
  }
  if (webOutput && normalizeTaskKey(webOutput) !== 'none') {
    addTask('phase-4', `Confirm Expo web output mode: ${webOutput}.`, 'release');
  }
  if (deployedServer && !shouldSkipServerReleaseTask(deployedServer, webOutput)) {
    addTask('phase-4', `Plan deployed server work: ${deployedServer}.`, 'release');
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

export function renderDerivedRoadmapPlaceholder(_phaseId: DerivedRoadmapPhaseId): string {
  return '';
}

export async function scanProjectTodoForContextMarkers(
  projectPathInput = '.',
  options: MarkerScanOptions = {}
): Promise<RoadmapMarkerHit[]> {
  const projectPath = path.resolve(projectPathInput);
  const projectDir = path.join(projectPath, 'project');
  if (!(await pathExists(projectDir))) {
    return [];
  }

  const markdownFiles =
    options.scope === 'info'
      ? ['info.md']
      : (
          await readdir(projectDir, { withFileTypes: true })
        )
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
          .map((entry) => entry.name)
          .sort();
  const hits: RoadmapMarkerHit[] = [];

  for (const file of markdownFiles) {
    const filePath = path.join(projectDir, file);
    if (!(await pathExists(filePath))) {
      continue;
    }
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

function detectRoadmapClarificationNeeds(sections: InfoSectionMap): {
  confidenceWarnings: string[];
  clarificationQuestions: RoadmapClarificationQuestion[]; 
} {
  const checks: ConfidenceCheck[] = [];
  const releaseSignal = [
    sections.releaseStrategy?.content,
    getLabeledSectionValue(sections.techStack?.content, 'Initial Deployment plan'),
    getLabeledSectionValue(sections.techStack?.content, 'EAS Usage'),
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');

  if (isMissingOrLowConfidenceSection(sections.targetUsers?.content, 'audience')) {
    checks.push({
      warning:
        '`project/info.md` still has a generic target audience, so roadmap generation cannot tell who the first experience is really for.',
      question: {
        id: 'target-users',
        section: 'targetUsers',
        prompt: 'Who is the actual target user for this app, and what context are they in when they use it?',
        reason: 'Target Users is still generic or placeholder-level.',
      },
    });
  }

  if (isMissingOrLowConfidenceSection(sections.coreUserFlows?.content, 'coreFlows')) {
    checks.push({
      warning:
        '`project/info.md` still lacks a concrete first user flow, so roadmap generation would be guessing at the MVP.',
      question: {
        id: 'core-user-flows',
        section: 'coreUserFlows',
        prompt: 'What is the first real end-to-end user flow this app should support?',
        reason: 'Core User Flows is still generic or placeholder-level.',
      },
    });
  }

  if (isMissingOrLowConfidenceSection(sections.productGoals?.content, 'productGoals')) {
    checks.push({
      warning:
        '`project/info.md` still does not say what success looks like, so roadmap priorities would be low-confidence.',
      question: {
        id: 'product-goals',
        section: 'productGoals',
        prompt: 'What business or product outcome would make the first version successful?',
        reason: 'Product Goals is still generic or placeholder-level.',
      },
    });
  }

  if (isMissingOrLowConfidenceSection(releaseSignal || undefined, 'release')) {
    checks.push({
      warning:
        '`project/info.md` still has a generic release/distribution plan, so release-phase tasks would be mostly filler.',
      question: {
        id: 'release-strategy',
        section: 'releaseStrategy',
        prompt: 'How will the first version actually reach its users: internal demo, TestFlight, web deployment, store launch, or something else?',
        reason: 'Release Strategy is still generic or placeholder-level.',
      },
    });
  }

  return {
    confidenceWarnings: checks.map((check) => check.warning),
    clarificationQuestions: checks.map((check) => check.question),
  };
}

function mergeRoadmapIntoTodo(
  todoRaw: string,
  derivedPhases: DerivedRoadmapPhase[],
  previousState: RoadmapState | null,
  preserveStatus: boolean
): MergeRoadmapResult {
  const next = ensureTodoHasPhaseHeadings(todoRaw);
  const lines = normalizeLineEndings(next).split('\n');
  const phaseRanges = getPhaseRanges(lines);
  if (phaseRanges.length === 0) {
    return {
      todoContent: ensureTrailingNewline(next),
      preservedStatuses: 0,
    };
  }

  const output: string[] = trimTrailingBlankLines(lines.slice(0, phaseRanges[0]?.start ?? 0));
  let preservedStatuses = 0;

  for (const range of phaseRanges) {
    const phaseTasks = derivedPhases.find((phase) => phase.id === range.phase.id)?.tasks ?? [];
    const sectionLines = lines.slice(range.start + 1, range.end);
    const previousDerivedKeys = new Set(previousState?.phases[range.phase.id]?.derivedTaskKeys ?? []);
    const statusMap = preserveStatus ? readCheckboxStatus(sectionLines) : new Map<string, boolean>();
    preservedStatuses += phaseTasks.filter((task) => statusMap.get(normalizeTaskKey(task.text)) === true).length;

    const nextSection = rebuildPhaseSection(sectionLines, phaseTasks, previousDerivedKeys, statusMap);
    if (output.length > 0) {
      output.push('');
    }
    output.push(range.phase.heading, '');
    output.push(...nextSection);
  }

  return {
    todoContent: ensureTrailingNewline(output.join('\n')),
    preservedStatuses,
  };
}

function rebuildPhaseSection(
  existingSectionLines: string[],
  derivedTasks: DerivedRoadmapTask[],
  previousDerivedKeys: Set<string>,
  statusMap: Map<string, boolean>
): string[] {
  const preservedLines = trimBlankEdges(
    existingSectionLines.filter((line) => {
      if (isLegacyMarkerLine(line)) {
        return false;
      }

      const checkbox = parseCheckbox(line);
      if (!checkbox) {
        return true;
      }

      if (isGeneratedScaffoldTaskKey(normalizeTaskKey(checkbox.text))) {
        return false;
      }

      return !previousDerivedKeys.has(normalizeTaskKey(checkbox.text));
    })
  );

  const nextDerivedLines = derivedTasks.map((task) => {
    const checked = statusMap.get(normalizeTaskKey(task.text)) === true;
    return `- [${checked ? 'x' : ' '}] ${task.text}`;
  });

  if (preservedLines.length === 0) {
    return nextDerivedLines;
  }

  if (nextDerivedLines.length === 0) {
    return preservedLines;
  }

  return [...preservedLines, '', ...nextDerivedLines];
}

function isGeneratedScaffoldTaskKey(key: string): boolean {
  return LEGACY_SCAFFOLD_TASK_KEYS.has(key) || GENERATED_SCAFFOLD_TASK_PATTERNS.some((pattern) => pattern.test(key));
}

function buildRoadmapState(phases: DerivedRoadmapPhase[]): RoadmapState {
  return {
    version: 1,
    phases: {
      'phase-0': {
        derivedTaskKeys: phases
          .find((phase) => phase.id === 'phase-0')
          ?.tasks.map((task) => normalizeTaskKey(task.text)) ?? [],
      },
      'phase-1': {
        derivedTaskKeys: phases
          .find((phase) => phase.id === 'phase-1')
          ?.tasks.map((task) => normalizeTaskKey(task.text)) ?? [],
      },
      'phase-2': {
        derivedTaskKeys: phases
          .find((phase) => phase.id === 'phase-2')
          ?.tasks.map((task) => normalizeTaskKey(task.text)) ?? [],
      },
      'phase-3': {
        derivedTaskKeys: phases
          .find((phase) => phase.id === 'phase-3')
          ?.tasks.map((task) => normalizeTaskKey(task.text)) ?? [],
      },
      'phase-4': {
        derivedTaskKeys: phases
          .find((phase) => phase.id === 'phase-4')
          ?.tasks.map((task) => normalizeTaskKey(task.text)) ?? [],
      },
    },
  };
}

async function readRoadmapState(filePath: string): Promise<RoadmapState | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }

  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8')) as RoadmapState;
    if (parsed?.version !== 1 || typeof parsed.phases !== 'object' || parsed.phases === null) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function inferLegacyRoadmapState(todoRaw: string): RoadmapState | null {
  if (!todoRaw.includes(LEGACY_MARKER_PREFIX)) {
    return null;
  }

  const phases = Object.fromEntries(
    PHASE_SPECS.map((phase) => [
      phase.id,
      {
        derivedTaskKeys: readLegacyDerivedTaskKeys(todoRaw, phase.id),
      },
    ])
  ) as Record<DerivedRoadmapPhaseId, RoadmapStatePhase>;

  return {
    version: 1,
    phases,
  };
}

function readLegacyDerivedTaskKeys(todoRaw: string, phaseId: DerivedRoadmapPhaseId): string[] {
  const marker = `MDS_DERIVED_${phaseId.toUpperCase().replace(/-/g, '_')}`;
  const pattern = new RegExp(`<!-- ${marker}_START -->([\\s\\S]*?)<!-- ${marker}_END -->`);
  const match = pattern.exec(todoRaw);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/\r?\n/u)
    .map((line) => parseCheckbox(line)?.text)
    .filter((value): value is string => Boolean(value))
    .map(normalizeTaskKey)
    .filter(Boolean);
}

function ensureTodoHasPhaseHeadings(todoRaw: string): string {
  let next = ensureTrailingNewline(stripLegacyDerivedMarkers(todoRaw));
  for (const phase of PHASE_SPECS) {
    if (!next.includes(phase.heading)) {
      next = `${next.trimEnd()}\n\n${phase.heading}\n`;
    }
  }
  return ensureTrailingNewline(next);
}

function getPhaseRanges(lines: string[]): PhaseRange[] {
  const ranges: PhaseRange[] = [];
  const headingIndexes = PHASE_SPECS.map((phase) => ({
    phase,
    index: lines.findIndex((line) => line.trim() === phase.heading),
  })).filter((item) => item.index >= 0);

  for (let index = 0; index < headingIndexes.length; index += 1) {
    const current = headingIndexes[index];
    const next = headingIndexes[index + 1];
    if (!current) {
      continue;
    }
    ranges.push({
      phase: current.phase,
      start: current.index,
      end: next?.index ?? lines.length,
    });
  }

  return ranges;
}

function readCheckboxStatus(lines: string[]): Map<string, boolean> {
  const status = new Map<string, boolean>();
  for (const line of lines) {
    const checkbox = parseCheckbox(line);
    if (!checkbox) {
      continue;
    }
    status.set(normalizeTaskKey(checkbox.text), checkbox.checked);
  }
  return status;
}

function parseCheckbox(line: string): { checked: boolean; text: string } | null {
  const match = /^-\s+\[(x| )\]\s+(.+?)\s*$/i.exec(line.trim());
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    checked: match[1].toLowerCase() === 'x',
    text: match[2],
  };
}

function stripLegacyDerivedMarkers(todoRaw: string): string {
  return normalizeLineEndings(todoRaw)
    .replace(/<!-- MDS_DERIVED_PHASE_[^>]+_START -->\n?/g, '')
    .replace(/<!-- MDS_DERIVED_PHASE_[^>]+_END -->\n?/g, '');
}

function isLegacyMarkerLine(line: string): boolean {
  return line.trim().startsWith(LEGACY_MARKER_PREFIX);
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
    )
    .map((item) => normalizeTaskKey(item))
    .map((item) => {
      if (item === 'tvos') {
        return 'apple tv';
      }
      return item;
    });

  return uniqueItems(values);
}

function getLabeledSectionValue(content: string | undefined, ...labels: string[]): string | null {
  if (!content) {
    return null;
  }

  const lines = normalizeLineEndings(content).split('\n');
  for (const rawLine of lines) {
    const line = rawLine.replace(/^\s*[-*]\s+/u, '').trim();
    for (const label of labels) {
      const match = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+)$`, 'i').exec(line);
      if (match?.[1]) {
        return cleanTaskText(match[1]);
      }
    }
  }

  return null;
}

function extractRouteDirectory(
  sections: InfoSectionMap,
  context: RoadmapProjectContext
): 'src/app' | 'app' | null {
  const labeled =
    getLabeledSectionValue(sections.techStack?.content, 'Expo Router app directory') ??
    getLabeledSectionValue(sections.platforms?.content, 'Expo Router app directory');
  if (labeled) {
    const normalized = normalizeTaskKey(labeled);
    if (normalized === 'src app') {
      return 'src/app';
    }
    if (normalized === 'app') {
      return 'app';
    }
  }

  const platformContent = normalizeLineEndings(sections.platforms?.content ?? '');
  const routeMatch = /routes live under\s+`?(src\/app|app)`?/iu.exec(platformContent);
  if (routeMatch?.[1]) {
    return routeMatch[1] === 'src/app' ? 'src/app' : 'app';
  }

  return context.appDirectory;
}

function parseYesNoValue(value: string | null): boolean | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeTaskKey(value);
  if (normalized === 'yes') {
    return true;
  }
  if (normalized === 'no') {
    return false;
  }
  return null;
}

function splitChoiceList(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return uniqueItems(
    value
      .split(/,|\band\b/iu)
      .map((item) => cleanTaskText(item))
      .filter(Boolean)
  );
}

function buildMeaningfulItemList(items: Array<string | null | undefined>): string[] {
  return uniqueItems(
    items
      .map((item) => cleanTaskText(item ?? ''))
      .filter(Boolean)
      .filter((item) => !isNoneLikeValue(item))
  );
}

function toEnabledLabel(value: string | null, label: string): string | null {
  if (!value || isNoneLikeValue(value)) {
    return null;
  }
  return `${label}: ${value}`;
}

function shouldSkipServerReleaseTask(
  deployedServer: string | null,
  webOutput: string | null
): boolean {
  const normalizedServer = normalizeTaskKey(deployedServer ?? '');
  const normalizedWebOutput = normalizeTaskKey(webOutput ?? '');
  const hasExplicitNoServer =
    normalizedServer === 'no deployed server planned' || normalizedServer === 'none';
  const hasExplicitNoWeb = normalizedWebOutput === 'none';
  return hasExplicitNoServer && hasExplicitNoWeb;
}

function isNoMonetizationPlan(content: string | undefined): boolean {
  if (!content) {
    return false;
  }

  return /\bno monetization\b/i.test(content) || /\bnot moneti[sz]ing\b/i.test(content);
}

function isNoneLikeValue(value: string): boolean {
  const normalized = normalizeTaskKey(value);
  return (
    normalized === 'none' ||
    normalized === 'no' ||
    normalized === 'not planned yet' ||
    normalized === 'no auth planned yet' ||
    normalized === 'no deployed server planned'
  );
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
    .replace(/^Deployment plan:\s*/i, '')
    .replace(/^-\s*/, '')
    .replace(/^`|`$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+\.$/, '.')
    .trim()
    .replace(/[;,:.-]+$/u, '')
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMissingOrLowConfidenceSection(
  content: string | undefined,
  kind: keyof typeof GENERIC_PATTERNS
): boolean {
  if (!content || isPlaceholderSection(content)) {
    return true;
  }

  const normalized = normalizeTaskKey(content);
  if (!normalized) {
    return true;
  }

  return GENERIC_PATTERNS[kind].some((pattern) => pattern.test(content));
}

function isPlaceholderSection(content: string | undefined): boolean {
  if (!content) {
    return true;
  }

  const normalized = normalizeTaskKey(content);
  return (
    content.includes(TODO_FOR_CONTEXT_MARKER) ||
    normalized.startsWith('add ') ||
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
    '## Phase 1: App Shell And First Flow',
    '',
    '## Phase 2: Data Layer',
    '',
    '## Phase 3: Complete Product Flows',
    '',
    '## Phase 4: Polish, Safeguards, And Release',
    '',
  ].join('\n');
}

async function inspectRoadmapProjectContext(projectPath: string): Promise<RoadmapProjectContext> {
  const srcAppDir = path.join(projectPath, 'src', 'app');
  const rootAppDir = path.join(projectPath, 'app');
  const srcExpositionDir = path.join(srcAppDir, 'exposition');
  const rootExpositionDir = path.join(rootAppDir, 'exposition');
  const srcStylistPath = path.join(srcExpositionDir, 'stylist.tsx');
  const rootStylistPath = path.join(rootExpositionDir, 'stylist.tsx');
  const hasSrcApp = await pathExists(srcAppDir);
  const hasRootApp = await pathExists(rootAppDir);
  const hasExposition = (await pathExists(srcExpositionDir)) || (await pathExists(rootExpositionDir));
  const hasStylist = (await pathExists(srcStylistPath)) || (await pathExists(rootStylistPath));

  return {
    appDirectory: hasSrcApp ? 'src/app' : hasRootApp ? 'app' : null,
    hasExposition,
    hasStylist,
  };
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

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && (lines[start]?.trim() ?? '') === '') {
    start += 1;
  }
  while (end > start && (lines[end - 1]?.trim() ?? '') === '') {
    end -= 1;
  }
  return lines.slice(start, end);
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && (next[next.length - 1]?.trim() ?? '') === '') {
    next.pop();
  }
  return next;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
