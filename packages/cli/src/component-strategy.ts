export const COMPONENT_STRATEGY_HEADING = 'Component Strategy';

export const PHASE0_COMPONENT_STRATEGY_TODO =
  'Confirm the Phase 0 component strategy in `project/info.md` (style library, Expo UI / Universal Components / NativeTabs, and any listed conflicts). Set Decision to confirmed after you review the generated app.';

export type ComponentStrategyStylingSystem =
  | 'uniwind'
  | 'nativewind'
  | 'nativewindui'
  | 'tamagui'
  | 'restyle'
  | 'stylesheet';

export type ComponentStrategyDecision = 'pending' | 'confirmed';

export type ComponentStrategyConflictCode =
  | 'styling-system-and-expo-ui-universal'
  | 'styling-system-and-expo-ui'
  | 'styling-system-and-native-tabs';

export interface ComponentStrategyConflict {
  code: ComponentStrategyConflictCode;
  severity: 'warning' | 'info';
  message: string;
}

export interface ComponentStrategy {
  stylingSystem: ComponentStrategyStylingSystem;
  usesExpoUi: boolean;
  usesExpoUiUniversalComponents: boolean;
  usesExpoNativeTabs: boolean;
  conflicts: ComponentStrategyConflict[];
  decision: ComponentStrategyDecision;
}

export interface ComponentStrategyInput {
  stylingSystem: ComponentStrategyStylingSystem;
  usesExpoUi: boolean;
  usesExpoUiUniversalComponents: boolean;
  usesExpoNativeTabs: boolean;
  decision?: ComponentStrategyDecision;
}

const STYLING_LABELS: Record<ComponentStrategyStylingSystem, string> = {
  uniwind: 'Uniwind',
  nativewind: 'NativeWind',
  nativewindui: 'NativeWindUI',
  tamagui: 'Tamagui',
  restyle: 'Restyle',
  stylesheet: 'StyleSheet',
};

export function formatStylingSystemLabel(stylingSystem: ComponentStrategyStylingSystem): string {
  return STYLING_LABELS[stylingSystem];
}

export function parseStylingSystemLabel(
  value: string | undefined
): ComponentStrategyStylingSystem | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized.includes('nativewindui')) {
    return 'nativewindui';
  }
  if (normalized.includes('nativewind')) {
    return 'nativewind';
  }
  if (normalized.includes('uniwind')) {
    return 'uniwind';
  }
  if (normalized.includes('tamagui')) {
    return 'tamagui';
  }
  if (normalized.includes('restyle')) {
    return 'restyle';
  }
  if (normalized.includes('stylesheet') || normalized === 'none') {
    return 'stylesheet';
  }
  return undefined;
}

export function parseComponentStrategyDecision(
  value: string | undefined
): ComponentStrategyDecision | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'confirmed') {
    return normalized;
  }
  return undefined;
}

export function detectComponentStrategyConflicts(
  input: Pick<
    ComponentStrategy,
    'stylingSystem' | 'usesExpoUi' | 'usesExpoUiUniversalComponents' | 'usesExpoNativeTabs'
  >
): ComponentStrategyConflict[] {
  const styleLabel = formatStylingSystemLabel(input.stylingSystem);
  const conflicts: ComponentStrategyConflict[] = [];

  if (input.usesExpoUiUniversalComponents) {
    conflicts.push({
      code: 'styling-system-and-expo-ui-universal',
      severity: 'warning',
      message: `${styleLabel} does not style Expo UI Universal components. Use Expo UI APIs for those surfaces; keep product screens on ${styleLabel}.`,
    });
  } else if (input.usesExpoUi) {
    conflicts.push({
      code: 'styling-system-and-expo-ui',
      severity: 'info',
      message: `Expo UI native surfaces do not consume ${styleLabel}. Use Expo UI modifiers there; keep shared product screens on ${styleLabel}.`,
    });
  }

  if (input.usesExpoNativeTabs) {
    conflicts.push({
      code: 'styling-system-and-native-tabs',
      severity: 'info',
      message: `Expo Native Tabs render native tab chrome and ignore ${styleLabel} tab-bar styles.`,
    });
  }

  return conflicts;
}

export function buildComponentStrategy(
  input: ComponentStrategyInput,
  options: { decision?: ComponentStrategyDecision } = {}
): ComponentStrategy {
  const stylingSystem = input.stylingSystem;
  const usesExpoUi = Boolean(input.usesExpoUi);
  const usesExpoUiUniversalComponents = usesExpoUi && Boolean(input.usesExpoUiUniversalComponents);
  const usesExpoNativeTabs = Boolean(input.usesExpoNativeTabs);
  const decision = options.decision ?? input.decision ?? 'pending';

  return {
    stylingSystem,
    usesExpoUi,
    usesExpoUiUniversalComponents,
    usesExpoNativeTabs,
    conflicts: detectComponentStrategyConflicts({
      stylingSystem,
      usesExpoUi,
      usesExpoUiUniversalComponents,
      usesExpoNativeTabs,
    }),
    decision,
  };
}

export function isComponentStrategyResolved(strategy: ComponentStrategy | null | undefined): boolean {
  return strategy?.decision === 'confirmed';
}

export function componentStrategiesEquivalent(
  left: Pick<
    ComponentStrategy,
    'stylingSystem' | 'usesExpoUi' | 'usesExpoUiUniversalComponents' | 'usesExpoNativeTabs'
  >,
  right: Pick<
    ComponentStrategy,
    'stylingSystem' | 'usesExpoUi' | 'usesExpoUiUniversalComponents' | 'usesExpoNativeTabs'
  >
): boolean {
  return (
    left.stylingSystem === right.stylingSystem &&
    left.usesExpoUi === right.usesExpoUi &&
    left.usesExpoUiUniversalComponents === right.usesExpoUiUniversalComponents &&
    left.usesExpoNativeTabs === right.usesExpoNativeTabs
  );
}

export function resolveComponentStrategyForRender(
  input: ComponentStrategyInput,
  existingMarkdown?: string | null
): ComponentStrategy {
  const next = buildComponentStrategy(input);
  const existing = existingMarkdown ? parseComponentStrategy(existingMarkdown) : null;
  if (existing && existing.decision === 'confirmed' && componentStrategiesEquivalent(existing, next)) {
    return { ...next, decision: 'confirmed' };
  }
  return next;
}

export function renderComponentStrategySection(strategy: ComponentStrategy): string {
  const conflictLines =
    strategy.conflicts.length === 0
      ? ['- Conflicts: none']
      : [
          '- Conflicts:',
          ...strategy.conflicts.map(
            (conflict) => `  - ${conflict.code} (${conflict.severity}): ${conflict.message}`
          ),
        ];

  return [
    `## ${COMPONENT_STRATEGY_HEADING}`,
    '',
    'This record is the Phase 0 style and component decision. Confirm it before implementation so later agents apply the same UI system without re-asking.',
    '',
    `- Style Library: ${formatStylingSystemLabel(strategy.stylingSystem)}`,
    `- Expo UI: ${formatYesNo(strategy.usesExpoUi)}`,
    `- Expo UI Universal components: ${formatYesNo(strategy.usesExpoUiUniversalComponents)}`,
    `- Expo Native Tabs: ${formatYesNo(strategy.usesExpoNativeTabs)}`,
    ...conflictLines,
    `- Decision: ${strategy.decision}`,
    '',
  ].join('\n');
}

export function parseComponentStrategy(markdown: string): ComponentStrategy | null {
  const section = extractMarkdownSection(markdown, COMPONENT_STRATEGY_HEADING);
  if (!section) {
    return null;
  }

  const stylingSystem = parseStylingSystemLabel(readLabeledValue(section, 'Style Library'));
  const usesExpoUi = parseYesNo(readLabeledValue(section, 'Expo UI'));
  const usesExpoUiUniversalComponents = parseYesNo(
    readLabeledValue(section, 'Expo UI Universal components')
  );
  const usesExpoNativeTabs = parseYesNo(readLabeledValue(section, 'Expo Native Tabs'));
  const decision = parseComponentStrategyDecision(readLabeledValue(section, 'Decision'));

  if (
    !stylingSystem ||
    usesExpoUi === undefined ||
    usesExpoUiUniversalComponents === undefined ||
    usesExpoNativeTabs === undefined ||
    !decision
  ) {
    return null;
  }

  const parsedConflicts = parseConflictLines(section);
  const detected = detectComponentStrategyConflicts({
    stylingSystem,
    usesExpoUi,
    usesExpoUiUniversalComponents,
    usesExpoNativeTabs,
  });

  return {
    stylingSystem,
    usesExpoUi,
    usesExpoUiUniversalComponents,
    usesExpoNativeTabs,
    conflicts: parsedConflicts.length > 0 ? parsedConflicts : detected,
    decision,
  };
}

export function formatComponentStrategySummary(strategy: ComponentStrategy): string {
  const conflictSummary =
    strategy.conflicts.length === 0
      ? 'no style-library conflicts'
      : `${strategy.conflicts.length} conflict${strategy.conflicts.length === 1 ? '' : 's'}`;
  return [
    `style library ${formatStylingSystemLabel(strategy.stylingSystem)}`,
    `Expo UI ${formatYesNo(strategy.usesExpoUi)}`,
    `Universal ${formatYesNo(strategy.usesExpoUiUniversalComponents)}`,
    `Native Tabs ${formatYesNo(strategy.usesExpoNativeTabs)}`,
    conflictSummary,
    `decision ${strategy.decision}`,
  ].join(', ');
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function parseYesNo(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (['yes', 'true', 'on'].includes(normalized)) {
    return true;
  }
  if (['no', 'false', 'off'].includes(normalized)) {
    return false;
  }
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

function parseConflictLines(section: string): ComponentStrategyConflict[] {
  const noneValue = readLabeledValue(section, 'Conflicts');
  if (noneValue && noneValue.toLowerCase() === 'none') {
    return [];
  }

  const conflicts: ComponentStrategyConflict[] = [];
  const linePattern =
    /^\s*-\s+([a-z0-9-]+)\s+\((warning|info)\):\s+(.+?)\s*$/gimu;
  for (const match of section.matchAll(linePattern)) {
    const code = match[1];
    const severity = match[2];
    const message = match[3];
    if (
      (code === 'styling-system-and-expo-ui-universal' ||
        code === 'styling-system-and-expo-ui' ||
        code === 'styling-system-and-native-tabs') &&
      (severity === 'warning' || severity === 'info') &&
      message
    ) {
      conflicts.push({ code, severity, message });
    }
  }
  return conflicts;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
