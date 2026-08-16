import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getLibraryItem, listLibraryItems } from '@mr.dj2u/library-registry';

import type { LibraryItem, LibrarySourceName } from '@mr.dj2u/library-registry';

export const EJECTION_INVENTORY_HEADING = 'Ejection Inventory';

export const PHASE0_EJECTION_INVENTORY_TODO =
  'Review the ejection inventory with `mds eject` and confirm retain/eject decisions for generated starter and template components. Set Decision to confirmed after you finish.';

export const PHASE3_EJECTION_CLEANUP_TODO =
  'Complete the ejection cleanup checklist in `project/ejection-cleanup.md` after the app shell and core flows are stable.';

export const PHASE4_DEVELOPER_COPY_TODO =
  'Run `mds report --kind content` and replace remaining placeholder or example copy before release.';

export const EJECTION_CLEANUP_FILE = 'ejection-cleanup.md';

export type EjectionDecision = 'retain' | 'eject';
export type EjectionInventoryDecision = 'pending' | 'confirmed';

export type EjectionItemId = string;

export type ExpositionKeepKey = EjectionItemId;

export interface ProjectMemorySelections {
  includeCreateExpoComponents?: boolean;
  onboardingFlow?: 'none' | 'multi-screen';
  legalDocumentMode?: 'none' | 'public-routes' | 'onboarding-agreement';
  authProvider?: string;
  dataStart?: 'local' | 'supabase';
  usesExpoUi?: boolean;
  usesExpoUiUniversalComponents?: boolean;
  usesExpoNativeTabs?: boolean;
  stylingSystem?: string;
}

export interface EjectionInventoryItem {
  id: EjectionItemId;
  label: string;
  description: string;
  source: LibrarySourceName | 'mds';
  kind: 'product' | 'developer-tool' | 'exposition' | 'starter-component';
  present: boolean;
  selectedInMemory: boolean;
  defaultDecision: EjectionDecision;
  decision: EjectionDecision;
  libraryItemIds: string[];
  destinations: string[];
}

export interface EjectionInventory {
  decision: EjectionInventoryDecision;
  items: EjectionInventoryItem[];
}

export interface EjectionCleanupTask {
  id: string;
  itemId: EjectionItemId;
  severity: 'required' | 'recommended';
  text: string;
  files: string[];
}

export interface EjectionInventoryStatus {
  decision: EjectionInventoryDecision | 'not-applicable';
  presentCount: number;
  retained: string[];
  ejected: string[];
  confirmed: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  onboarding: 'Onboarding Setup',
  settings: 'Settings Page',
  data: 'Data Adapter',
  stylist: 'Stylist',
  auth: 'Auth Flow',
  legal: 'Legal Documents',
  exposition: 'Exposition Pages',
  'expo-sdk-56': 'Expo SDK 56 Exposition',
  nativewindui: 'NativeWindUI Exposition',
  swmansion: 'Software Mansion Demos',
  'create-expo-app': 'create-expo-app Components',
  'create-expo-stack': 'create-expo-stack Starter Components',
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  onboarding: 'Generated multi-screen onboarding routes and screens.',
  settings: 'Generated settings modal/route and screen.',
  data: 'Generated local data adapter, mock snapshot, and data exposition page.',
  stylist: 'Developer-only Stylist theme editor and sync endpoint.',
  auth: 'Generated sign-in, sign-up, and auth provider adapters.',
  legal: 'Generated terms/privacy documents and legal routes.',
  exposition: 'Temporary package exposition hub and shared demo components.',
  'expo-sdk-56': 'Temporary Expo UI / SDK 56 demonstration screen.',
  nativewindui: 'Temporary NativeWindUI demonstration screen.',
  swmansion: 'Temporary Software Mansion package demonstration components.',
  'create-expo-app': 'Starter components from the Expo create-expo-app template.',
  'create-expo-stack': 'Starter components from create-expo-stack (Button, Container, EditScreenInfo).',
};

const GROUP_KIND: Record<string, EjectionInventoryItem['kind']> = {
  onboarding: 'product',
  settings: 'product',
  data: 'product',
  stylist: 'developer-tool',
  auth: 'product',
  legal: 'product',
  exposition: 'exposition',
  'expo-sdk-56': 'exposition',
  nativewindui: 'exposition',
  swmansion: 'exposition',
  'create-expo-app': 'starter-component',
  'create-expo-stack': 'starter-component',
};

const PROTECTED_DESTINATION_PATTERNS = [
  /(^|\/)_layout\.tsx$/u,
  /(^|\/)theme\/(tokens|provider|color-utils|font-assets)\.tsx?$/u,
  /(^|\/)assets\/images\/splash-icon/u,
  /(^|\/)project\/theme\.json$/u,
];

const NEVER_INVENTORY_ITEM_IDS = new Set([
  'expo/splash-screen',
  'expo/theme-support',
  'expo/default-starter',
  'expo/home-screen',
  'expo/explore-screen',
  'mds/theme-support',
]);

export function isEjectionInventoryResolved(
  inventory: EjectionInventory | null | undefined
): boolean {
  return inventory?.decision === 'confirmed';
}

export function formatEjectionInventorySummary(inventory: EjectionInventory): string {
  const retained = inventory.items.filter((item) => item.decision === 'retain').map((item) => item.id);
  const ejected = inventory.items.filter((item) => item.decision === 'eject').map((item) => item.id);
  return [
    `decision ${inventory.decision}`,
    retained.length > 0 ? `retain ${retained.join(', ')}` : 'retain nothing',
    ejected.length > 0 ? `eject ${ejected.join(', ')}` : 'eject nothing',
  ].join('; ');
}

export function inventoryStatusFrom(inventory: EjectionInventory | null): EjectionInventoryStatus {
  if (!inventory || inventory.items.length === 0) {
    return {
      decision: 'not-applicable',
      presentCount: 0,
      retained: [],
      ejected: [],
      confirmed: false,
    };
  }

  return {
    decision: inventory.decision,
    presentCount: inventory.items.filter((item) => item.present).length,
    retained: inventory.items.filter((item) => item.decision === 'retain').map((item) => item.id),
    ejected: inventory.items.filter((item) => item.decision === 'eject').map((item) => item.id),
    confirmed: inventory.decision === 'confirmed',
  };
}

export function parseProjectMemorySelections(markdown: string): ProjectMemorySelections {
  const includeCreateExpoComponents = parseYesNo(
    readLabeledValue(markdown, 'Components from create-expo-app')
  );
  const onboardingRaw = readLabeledValue(markdown, 'Onboarding Flow')?.toLowerCase() ?? '';
  const legalRaw = readLabeledValue(markdown, 'Legal Documents')?.toLowerCase() ?? '';
  const authRaw = readLabeledValue(markdown, 'Auth') ?? '';
  const dataRaw = readLabeledValue(markdown, 'Starting Data mode')?.toLowerCase() ?? '';
  const styleRaw = readLabeledValue(markdown, 'Style Library');

  return {
    includeCreateExpoComponents,
    onboardingFlow: onboardingRaw.includes('multi')
      ? 'multi-screen'
      : onboardingRaw.includes('none')
        ? 'none'
        : undefined,
    legalDocumentMode: legalRaw.includes('onboarding')
      ? 'onboarding-agreement'
      : legalRaw.includes('public')
        ? 'public-routes'
        : legalRaw.includes('none')
          ? 'none'
          : undefined,
    authProvider: inferAuthProvider(authRaw),
    dataStart: dataRaw.includes('supabase')
      ? 'supabase'
      : dataRaw.includes('local') || dataRaw.includes('sqlite') || dataRaw.includes('dummy')
        ? 'local'
        : undefined,
    usesExpoUi: parseYesNo(readLabeledValue(markdown, 'Expo UI')),
    usesExpoUiUniversalComponents: parseYesNo(
      readLabeledValue(markdown, 'Expo UI Universal components')
    ),
    usesExpoNativeTabs: parseYesNo(readLabeledValue(markdown, 'Expo Native Tabs')),
    stylingSystem: styleRaw,
  };
}

export function defaultRetainFromMemory(
  itemId: EjectionItemId,
  memory: ProjectMemorySelections
): boolean {
  switch (itemId) {
    case 'onboarding':
      return memory.onboardingFlow === 'multi-screen';
    case 'settings':
      return true;
    case 'data':
      return memory.dataStart === 'local' || memory.dataStart === 'supabase';
    case 'stylist':
      return false;
    case 'auth':
      return Boolean(memory.authProvider && memory.authProvider !== 'none');
    case 'legal':
      return Boolean(memory.legalDocumentMode && memory.legalDocumentMode !== 'none');
    case 'create-expo-app':
    case 'create-expo-stack':
      return memory.includeCreateExpoComponents === true;
    default:
      return false;
  }
}

export function plannedItemIdsFromMemory(memory: ProjectMemorySelections): EjectionItemId[] {
  const ids: EjectionItemId[] = ['settings', 'stylist', 'exposition', 'data'];
  if (memory.onboardingFlow === 'multi-screen') {
    ids.push('onboarding');
  }
  if (memory.authProvider && memory.authProvider !== 'none') {
    ids.push('auth');
  }
  if (memory.legalDocumentMode && memory.legalDocumentMode !== 'none') {
    ids.push('legal');
  }
  if (memory.usesExpoUi || memory.usesExpoUiUniversalComponents) {
    ids.push('expo-sdk-56');
  }
  if (memory.stylingSystem?.toLowerCase().includes('nativewindui')) {
    ids.push('nativewindui');
  }
  if (memory.includeCreateExpoComponents) {
    ids.push('create-expo-app', 'create-expo-stack');
  }
  return unique(ids);
}

export function parseEjectionInventory(markdown: string): EjectionInventory | null {
  const section = extractMarkdownSection(markdown, EJECTION_INVENTORY_HEADING);
  if (!section) {
    return null;
  }

  const decision = parseInventoryDecision(readLabeledValue(section, 'Decision'));
  if (!decision) {
    return null;
  }

  const memory = parseProjectMemorySelections(markdown);
  const items: EjectionInventoryItem[] = [];
  const itemPattern =
    /^\s*-\s+([a-z0-9-]+)\s*:\s*(retain|eject|default retain|default eject)(?:\s+\((present|missing)\))?/gimu;

  for (const match of section.matchAll(itemPattern)) {
    const id = match[1];
    const rawDecision = match[2]?.toLowerCase() ?? '';
    const presence = match[3]?.toLowerCase();
    if (!id) {
      continue;
    }
    const decisionValue: EjectionDecision = rawDecision.includes('retain') ? 'retain' : 'eject';
    items.push(
      buildInventoryItem(id, {
        present: presence === 'present',
        selectedInMemory: defaultRetainFromMemory(id, memory) || isProductGroup(id),
        decision: decisionValue,
        memory,
      })
    );
  }

  if (items.length === 0) {
    return { decision, items: [] };
  }

  return { decision, items };
}

export function renderEjectionInventorySection(inventory: EjectionInventory): string {
  const itemLines =
    inventory.items.length === 0
      ? ['- Items: none']
      : [
          '- Items:',
          ...inventory.items.map((item) => {
            const presence = item.present ? 'present' : 'missing';
            return `  - ${item.id}: ${item.decision} (${presence})`;
          }),
        ];

  return [
    `## ${EJECTION_INVENTORY_HEADING}`,
    '',
    'This record is the Phase 0 retain/eject decision for generated starter and template components. Run `mds eject` to review the inventory and confirm.',
    '',
    `- Decision: ${inventory.decision}`,
    ...itemLines,
    '',
  ].join('\n');
}

export function upsertEjectionInventorySection(
  markdown: string,
  inventory: EjectionInventory
): string {
  const rendered = renderEjectionInventorySection(inventory).trimEnd();
  const normalized = markdown.replace(/\r\n/gu, '\n');
  const headingPattern = new RegExp(
    `^##\\s+${escapeRegExp(EJECTION_INVENTORY_HEADING)}\\s*$`,
    'imu'
  );
  const lines = normalized.split('\n');
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (headingPattern.test(lines[index] ?? '')) {
      start = index;
      break;
    }
  }

  if (start === -1) {
    return `${normalized.replace(/\s+$/u, '')}\n\n${rendered}\n`;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,2}\s+\S/u.test(lines[index] ?? '')) {
      end = index;
      break;
    }
  }

  return [...lines.slice(0, start), rendered, ...lines.slice(end)].join('\n').replace(/\s+$/u, '') + '\n';
}

export function resolveEjectionInventoryForRender(
  memory: ProjectMemorySelections,
  existingMarkdown?: string | null
): EjectionInventory {
  const plannedIds = plannedItemIdsFromMemory(memory);
  const existing = existingMarkdown ? parseEjectionInventory(existingMarkdown) : null;
  const items = plannedIds.map((id) => {
    const previous = existing?.items.find((item) => item.id === id);
    const defaultDecision: EjectionDecision = defaultRetainFromMemory(id, memory)
      ? 'retain'
      : 'eject';
    return buildInventoryItem(id, {
      present: previous?.present ?? false,
      selectedInMemory: defaultRetainFromMemory(id, memory) || isProductGroup(id),
      decision: previous?.decision ?? defaultDecision,
      memory,
    });
  });

  if (
    existing?.decision === 'confirmed' &&
    existing.items.length === items.length &&
    existing.items.every((item, index) => item.id === items[index]?.id && item.decision === items[index]?.decision)
  ) {
    return { decision: 'confirmed', items };
  }

  return { decision: existing?.decision === 'confirmed' ? 'pending' : (existing?.decision ?? 'pending'), items };
}

export async function buildEjectionInventory(
  projectPath: string,
  options: { memoryMarkdown?: string | null } = {}
): Promise<EjectionInventory> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const markdown =
    options.memoryMarkdown === undefined
      ? await readOptionalText(infoPath)
      : options.memoryMarkdown;
  const memory = markdown ? parseProjectMemorySelections(markdown) : {};
  const persisted = markdown ? parseEjectionInventory(markdown) : null;
  const groups = new Map<string, { libraryItemIds: Set<string>; destinations: Set<string> }>();

  for (const summary of listLibraryItems()) {
    const item = getLibraryItem(summary.id);
    if (!item || NEVER_INVENTORY_ITEM_IDS.has(item.id)) {
      continue;
    }
    const groupId = groupIdForLibraryItem(item);
    if (!groupId) {
      continue;
    }
    const group = groups.get(groupId) ?? {
      libraryItemIds: new Set<string>(),
      destinations: new Set<string>(),
    };
    group.libraryItemIds.add(item.id);
    for (const destination of collectItemDestinations(item)) {
      if (!isProtectedDestination(destination)) {
        group.destinations.add(destination);
      }
    }
    groups.set(groupId, group);
  }

  const presentByGroup = new Map<string, boolean>();
  for (const [groupId, group] of groups) {
    const expanded = expandLibraryDestinations(projectPath, [...group.destinations]);
    presentByGroup.set(groupId, await anyPathExists(expanded));
  }

  const plannedIds = plannedItemIdsFromMemory(memory);
  const discoveredIds = [...groups.keys()].filter((id) => presentByGroup.get(id));
  const itemIds = unique([...plannedIds, ...discoveredIds, ...(persisted?.items.map((item) => item.id) ?? [])]);

  const items = itemIds.map((id) => {
    const persistedItem = persisted?.items.find((item) => item.id === id);
    const selectedInMemory = defaultRetainFromMemory(id, memory) || isProductGroup(id);
    const defaultDecision: EjectionDecision = defaultRetainFromMemory(id, memory)
      ? 'retain'
      : 'eject';
    return buildInventoryItem(id, {
      present: presentByGroup.get(id) ?? persistedItem?.present ?? false,
      selectedInMemory,
      decision: persistedItem?.decision ?? defaultDecision,
      memory,
      libraryItemIds: [...(groups.get(id)?.libraryItemIds ?? [])],
      destinations: [...(groups.get(id)?.destinations ?? [])],
    });
  });

  return {
    decision: persisted?.decision ?? 'pending',
    items,
  };
}

export function applyInventoryDecisions(
  inventory: EjectionInventory,
  keepIds: readonly string[],
  options: { confirm?: boolean } = {}
): EjectionInventory {
  const keep = new Set(keepIds);
  return {
    decision: options.confirm ? 'confirmed' : inventory.decision,
    items: inventory.items.map((item) => ({
      ...item,
      decision: keep.has(item.id) ? 'retain' : 'eject',
    })),
  };
}

export function defaultKeepIds(inventory: EjectionInventory): string[] {
  return inventory.items
    .filter((item) => item.present && item.defaultDecision === 'retain')
    .map((item) => item.id);
}

export function presentKeepIds(inventory: EjectionInventory): string[] {
  return inventory.items.filter((item) => item.present && item.decision === 'retain').map((item) => item.id);
}

export function knownEjectionItemIds(inventory?: EjectionInventory | null): string[] {
  const discovered = inventory?.items.map((item) => item.id) ?? [];
  return unique([...Object.keys(GROUP_LABELS), ...discovered]);
}

export function isProtectedDestination(destination: string): boolean {
  const normalized = normalizeProjectPath(destination);
  return PROTECTED_DESTINATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function expandLibraryDestinations(
  projectPath: string,
  destinations: readonly string[]
): string[] {
  const files = new Set<string>();
  for (const destination of destinations) {
    const appDirectories = destination.includes('{{appDir}}') ? ['app', 'src/app'] : [null];
    const componentDirectories = destination.includes('{{componentsDir}}')
      ? ['components', 'src/components']
      : [null];
    const featureDirectories = destination.includes('{{featuresDir}}')
      ? ['features', 'src/features']
      : [null];
    for (const appDirectory of appDirectories) {
      for (const componentsDirectory of componentDirectories) {
        for (const featuresDirectory of featureDirectories) {
          const relativePath = destination
            .split('{{appDir}}')
            .join(appDirectory ?? '')
            .split('{{componentsDir}}')
            .join(componentsDirectory ?? '')
            .split('{{featuresDir}}')
            .join(featuresDirectory ?? '');
          if (relativePath.includes('{{') || path.isAbsolute(relativePath)) {
            throw new Error(`Unsafe MDS Library ejection destination: ${destination}`);
          }
          const resolved = path.resolve(projectPath, relativePath);
          const relative = path.relative(projectPath, resolved);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error(`Unsafe MDS Library ejection destination: ${destination}`);
          }
          files.add(resolved);
        }
      }
    }
  }
  return [...files];
}

export function retainedDestinations(inventory: EjectionInventory, projectPath: string): string[] {
  const destinations = inventory.items
    .filter((item) => item.decision === 'retain')
    .flatMap((item) => item.destinations);
  return expandLibraryDestinations(projectPath, destinations);
}

export function ejectedDestinations(inventory: EjectionInventory, projectPath: string): string[] {
  const destinations = inventory.items
    .filter((item) => item.decision === 'eject')
    .flatMap((item) => item.destinations);
  return expandLibraryDestinations(projectPath, destinations);
}

export function shouldSkipGeneratedSubstitute(
  inventory: EjectionInventory | null | undefined,
  projectPath: string,
  destination: string
): boolean {
  if (!inventory || inventory.decision !== 'confirmed') {
    return false;
  }
  const resolved = path.resolve(projectPath, destination);
  const relative = normalizeProjectPath(path.relative(projectPath, resolved));
  if (!relative || relative.startsWith('..') || isProtectedDestination(relative)) {
    return false;
  }
  if (!isGeneratedAppDestination(relative)) {
    return false;
  }

  for (const item of inventory.items) {
    const matches = expandLibraryDestinations(projectPath, item.destinations).some(
      (candidate) => path.resolve(candidate) === resolved
    );
    if (!matches) {
      continue;
    }
    return item.decision === 'retain';
  }

  return false;
}

export async function persistEjectionInventory(
  projectPath: string,
  inventory: EjectionInventory
): Promise<string | null> {
  const infoPath = path.join(projectPath, 'project', 'info.md');
  const existing = await readOptionalText(infoPath);
  if (existing === null) {
    await mkdir(path.dirname(infoPath), { recursive: true });
    await writeFile(infoPath, `${renderEjectionInventorySection(inventory)}\n`, 'utf8');
    return infoPath;
  }
  const next = upsertEjectionInventorySection(existing, inventory);
  if (next !== existing.replace(/\r\n/gu, '\n') && next !== existing) {
    await writeFile(infoPath, next, 'utf8');
    return infoPath;
  }
  return null;
}

export async function generateEjectionCleanupTasks(
  projectPath: string,
  ejectedItems: readonly EjectionInventoryItem[],
  removedFiles: readonly string[]
): Promise<EjectionCleanupTask[]> {
  if (ejectedItems.length === 0) {
    return [];
  }

  const tasks: EjectionCleanupTask[] = [];
  const removedRelatives = removedFiles.map((filePath) =>
    normalizeProjectPath(path.relative(projectPath, filePath))
  );
  const docFiles = [
    path.join(projectPath, 'project', 'guidelines.md'),
    path.join(projectPath, 'project', 'info.md'),
    path.join(projectPath, 'AGENTS.md'),
    path.join(projectPath, 'CLAUDE.md'),
  ];
  const sourceRoots = [
    path.join(projectPath, 'src'),
    path.join(projectPath, 'app'),
    path.join(projectPath, 'components'),
    path.join(projectPath, 'features'),
  ];

  for (const item of ejectedItems) {
    tasks.push({
      id: `${item.id}-docs`,
      itemId: item.id,
      severity: 'required',
      text: `Update \`project/guidelines.md\` and agent instructions so they no longer describe ejected ${item.label}.`,
      files: ['project/guidelines.md', 'AGENTS.md', 'CLAUDE.md'],
    });

    const staleDocs = await findMentions(docFiles, [item.label, ...item.libraryItemIds, item.id]);
    if (staleDocs.length > 0) {
      tasks.push({
        id: `${item.id}-stale-docs`,
        itemId: item.id,
        severity: 'required',
        text: `Remove leftover ${item.label} mentions from ${staleDocs.join(', ')}.`,
        files: staleDocs,
      });
    }

    const importNeedles = unique([
      ...removedRelatives.filter((relative) =>
        item.destinations.some((destination) => relative.endsWith(stripTemplate(destination)))
      ),
      ...item.libraryItemIds,
      ...routeNeedlesForItem(item.id),
    ]);
    const staleSources = await findMentionsInTrees(sourceRoots, importNeedles);
    if (staleSources.length > 0) {
      tasks.push({
        id: `${item.id}-dangling-imports`,
        itemId: item.id,
        severity: 'required',
        text: `Remove dangling imports, links, or route registrations for ejected ${item.label} in ${staleSources.join(', ')}.`,
        files: staleSources,
      });
    } else {
      tasks.push({
        id: `${item.id}-scan-imports`,
        itemId: item.id,
        severity: 'recommended',
        text: `Search remaining app files for leftover imports or routes that pointed at ejected ${item.label}.`,
        files: [],
      });
    }
  }

  tasks.push({
    id: 'unused-packages',
    itemId: ejectedItems[0]?.id ?? 'inventory',
    severity: 'recommended',
    text: 'Remove unused packages that only existed for ejected components, then run the project install and Doctor.',
    files: ['package.json'],
  });

  return tasks;
}

export function renderEjectionCleanupMarkdown(
  inventory: EjectionInventory,
  tasks: readonly EjectionCleanupTask[],
  generatedAt = new Date().toISOString()
): string {
  const ejected = inventory.items.filter((item) => item.decision === 'eject');
  const retained = inventory.items.filter((item) => item.decision === 'retain');
  return [
    '# Ejection Cleanup',
    '',
    `Generated after \`mds eject\` on ${generatedAt}.`,
    '',
    'Complete this checklist after the app shell and core flows are stable, before polish and release.',
    '',
    `Retained: ${retained.map((item) => item.label).join(', ') || 'nothing'}`,
    `Ejected: ${ejected.map((item) => item.label).join(', ') || 'nothing'}`,
    '',
    '## Tasks',
    '',
    ...(tasks.length > 0
      ? tasks.map((task) => `- [ ] ${task.text}`)
      : ['- [ ] No automatic follow-ups were generated. Review leftover imports and docs anyway.']),
    '',
  ].join('\n');
}

export async function writeEjectionCleanupChecklist(
  projectPath: string,
  inventory: EjectionInventory,
  tasks: readonly EjectionCleanupTask[]
): Promise<string | null> {
  if (tasks.length === 0) {
    return null;
  }
  const filePath = path.join(projectPath, 'project', EJECTION_CLEANUP_FILE);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${renderEjectionCleanupMarkdown(inventory, tasks)}\n`, 'utf8');
  return filePath;
}

export function appendCleanupTasksToTodo(
  todoMarkdown: string,
  tasks: readonly EjectionCleanupTask[]
): string {
  if (tasks.length === 0) {
    return todoMarkdown;
  }

  const normalized = todoMarkdown.replace(/\r\n/gu, '\n');
  const lines = normalized.split('\n');
  const phase3Index = lines.findIndex((line) => /^##\s+Phase 3\b/iu.test(line));
  const taskLines = unique([
    PHASE3_EJECTION_CLEANUP_TODO,
    ...tasks.filter((task) => task.severity === 'required').map((task) => task.text),
  ]).map((text) => `- [ ] ${text}`);

  if (phase3Index === -1) {
    return `${normalized.replace(/\s+$/u, '')}\n\n## Phase 3: Complete Product Flows\n\n${taskLines.join('\n')}\n`;
  }

  let insertAt = lines.length;
  for (let index = phase3Index + 1; index < lines.length; index += 1) {
    if (/^##\s+\S/u.test(lines[index] ?? '')) {
      insertAt = index;
      break;
    }
  }

  const existing = lines.slice(phase3Index, insertAt).join('\n');
  const missing = taskLines.filter((line) => !existing.includes(line.slice(6)));
  if (missing.length === 0) {
    return ensureTrailingNewline(normalized);
  }

  const before = lines.slice(0, insertAt);
  while (before.length > 0 && before[before.length - 1] === '') {
    before.pop();
  }
  return ensureTrailingNewline([...before, '', ...missing, '', ...lines.slice(insertAt)].join('\n'));
}

export async function persistEjectionCleanup(
  projectPath: string,
  inventory: EjectionInventory,
  tasks: readonly EjectionCleanupTask[]
): Promise<{ cleanupPath: string | null; todoPath: string | null }> {
  const cleanupPath = await writeEjectionCleanupChecklist(projectPath, inventory, tasks);
  const todoPath = path.join(projectPath, 'project', 'todo.md');
  const existingTodo = await readOptionalText(todoPath);
  if (existingTodo === null) {
    return { cleanupPath, todoPath: null };
  }
  const nextTodo = appendCleanupTasksToTodo(existingTodo, tasks);
  if (nextTodo !== existingTodo.replace(/\r\n/gu, '\n') && nextTodo !== existingTodo) {
    await writeFile(todoPath, nextTodo, 'utf8');
    return { cleanupPath, todoPath };
  }
  return { cleanupPath, todoPath: null };
}

function groupIdForLibraryItem(item: LibraryItem): string | null {
  if (item.tags.includes('eject:onboarding')) return 'onboarding';
  if (item.tags.includes('eject:settings')) return 'settings';
  if (item.tags.includes('eject:data')) return 'data';
  if (item.tags.includes('eject:stylist')) return 'stylist';
  if (item.tags.includes('eject:auth')) return 'auth';
  if (item.id === 'mds/legal-documents') return 'legal';
  if (item.id === 'mds/expo-sdk-56') return 'expo-sdk-56';
  if (item.id === 'nativewindui/exposition') return 'nativewindui';
  if (item.source.name === 'swmansion' && item.tags.includes('eject:exposition')) return 'swmansion';
  if (item.tags.includes('eject:exposition')) return 'exposition';
  if (item.source.name === 'create-expo-app' && isStarterComponent(item)) return 'create-expo-app';
  if (item.source.name === 'create-expo-stack' && isStarterComponent(item)) return 'create-expo-stack';
  return null;
}

function isStarterComponent(item: LibraryItem): boolean {
  return item.kind === 'component' || item.kind === 'animation';
}

function isProductGroup(id: string): boolean {
  return GROUP_KIND[id] === 'product';
}

function buildInventoryItem(
  id: string,
  options: {
    present: boolean;
    selectedInMemory: boolean;
    decision: EjectionDecision;
    memory: ProjectMemorySelections;
    libraryItemIds?: string[];
    destinations?: string[];
  }
): EjectionInventoryItem {
  const defaultDecision: EjectionDecision = defaultRetainFromMemory(id, options.memory)
    ? 'retain'
    : 'eject';
  return {
    id,
    label: GROUP_LABELS[id] ?? titleize(id),
    description: GROUP_DESCRIPTIONS[id] ?? `Generated ${id} artifacts.`,
    source: sourceForGroup(id),
    kind: GROUP_KIND[id] ?? 'exposition',
    present: options.present,
    selectedInMemory: options.selectedInMemory,
    defaultDecision,
    decision: options.decision,
    libraryItemIds: options.libraryItemIds ?? [],
    destinations: options.destinations ?? [],
  };
}

function sourceForGroup(id: string): LibrarySourceName | 'mds' {
  if (id === 'create-expo-app') return 'create-expo-app';
  if (id === 'create-expo-stack') return 'create-expo-stack';
  if (id === 'nativewindui') return 'nativewindui';
  if (id === 'swmansion') return 'swmansion';
  return 'mds';
}

function collectItemDestinations(item: LibraryItem): string[] {
  const destinations = new Set<string>();
  for (const asset of item.assets) {
    destinations.add(asset.destination);
  }
  for (const variant of item.variants) {
    for (const asset of variant.assets ?? []) {
      destinations.add(asset.destination);
    }
  }
  return [...destinations];
}

function routeNeedlesForItem(id: string): string[] {
  switch (id) {
    case 'onboarding':
      return ['/onboarding', 'name="onboarding"'];
    case 'settings':
      return ['/settings', 'name="settings"'];
    case 'data':
      return ['/exposition/data', 'name="exposition/data"', 'mock-app'];
    case 'stylist':
      return ['/exposition/stylist', 'name="exposition/stylist"', 'stylist-sync'];
    case 'auth':
      return ['/sign-in', '/sign-up', 'name="sign-in"'];
    case 'legal':
      return ['/terms', '/privacy', 'placeholder legal'];
    case 'expo-sdk-56':
      return ['/exposition/sdk-56', 'name="exposition/sdk-56"'];
    case 'nativewindui':
      return ['/exposition/nativewindui', 'name="exposition/nativewindui"'];
    case 'exposition':
      return ['/exposition', 'name="exposition/index"'];
    default:
      return [];
  }
}

function isGeneratedAppDestination(relativePath: string): boolean {
  return /^(src\/|app\/|components\/|features\/|scripts\/)/u.test(relativePath);
}

function inferAuthProvider(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('none')) return 'none';
  if (normalized.includes('supabase')) return 'supabase';
  if (normalized.includes('firebase')) return 'firebase';
  if (normalized.includes('convex')) return 'convex';
  if (normalized.includes('base') || normalized.includes('yes')) return 'base';
  return undefined;
}

function parseInventoryDecision(value: string | undefined): EjectionInventoryDecision | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'confirmed') {
    return normalized;
  }
  return undefined;
}

function parseYesNo(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['yes', 'true', 'on'].includes(normalized)) return true;
  if (['no', 'false', 'off'].includes(normalized)) return false;
  return undefined;
}

function extractMarkdownSection(markdown: string, heading: string): string | null {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const headingPattern = new RegExp(`^#{1,2}\\s+${escapeRegExp(heading)}\\s*$`, 'iu');
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (headingPattern.test(lines[index] ?? '')) {
      start = index + 1;
      break;
    }
  }
  if (start === -1) {
    return null;
  }
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (/^#{1,2}\s+\S/u.test(lines[index] ?? '')) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function readLabeledValue(section: string, label: string): string | undefined {
  const pattern = new RegExp(`^\\s*[-*]?\\s*${escapeRegExp(label)}\\s*:\\s*(.+?)\\s*$`, 'imu');
  const match = pattern.exec(section);
  const value = match?.[1]?.trim();
  return value || undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function normalizeProjectPath(filePath: string): string {
  return filePath.split(path.sep).join('/').replace(/^\.\//, '');
}

function stripTemplate(destination: string): string {
  return destination
    .replace('{{appDir}}/', '')
    .replace('{{componentsDir}}/', '')
    .replace('{{featuresDir}}/', '');
}

function titleize(value: string): string {
  return value
    .split('-')
    .map((part) => (part ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}` : part))
    .join(' ');
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function anyPathExists(filePaths: readonly string[]): Promise<boolean> {
  for (const filePath of filePaths) {
    if (await pathExists(filePath)) {
      return true;
    }
  }
  return false;
}

async function findMentions(filePaths: readonly string[], needles: readonly string[]): Promise<string[]> {
  const hits: string[] = [];
  const meaningful = needles.filter((needle) => needle.trim().length > 2);
  for (const filePath of filePaths) {
    const raw = await readOptionalText(filePath);
    if (!raw) continue;
    if (meaningful.some((needle) => raw.toLowerCase().includes(needle.toLowerCase()))) {
      hits.push(normalizeProjectPath(path.basename(path.dirname(filePath)) === 'project'
        ? path.join('project', path.basename(filePath))
        : path.basename(filePath)));
    }
  }
  return unique(hits);
}

async function findMentionsInTrees(
  roots: readonly string[],
  needles: readonly string[]
): Promise<string[]> {
  const hits: string[] = [];
  const meaningful = needles.filter((needle) => needle.trim().length > 2);
  if (meaningful.length === 0) {
    return [];
  }

  const visit = async (directory: string, projectRoot: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', '.expo'].includes(entry.name)) {
          continue;
        }
        await visit(fullPath, projectRoot);
        continue;
      }
      if (!/\.(tsx?|jsx?|md)$/iu.test(entry.name)) {
        continue;
      }
      const raw = await readOptionalText(fullPath);
      if (!raw) continue;
      if (meaningful.some((needle) => raw.includes(needle))) {
        hits.push(normalizeProjectPath(path.relative(projectRoot, fullPath)));
      }
    }
  };

  for (const root of roots) {
    await visit(root, path.dirname(root));
  }

  return unique(hits);
}
