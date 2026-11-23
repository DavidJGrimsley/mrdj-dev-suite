import type {
  CanonicalWidgetId,
  SpatialLayoutPreset,
  SpatialWidgetPlacement,
  SpatialWindow,
  WidgetAliasId,
  WidgetCatalogEntry,
  WindowGroupLayoutMode,
} from '../types/widgets';

export const WIDGET_ID_ALIASES: Record<string, CanonicalWidgetId> = {
  currentDiffs: 'git',
  goalPlan: 'currentGoal',
  webPreview: 'emuWeb',
  environments: 'workspaceEnv',
  workspace: 'workspaceEnv',
  desktopStream: 'workspaceEnv',
  desktopMirror: 'workspaceEnv',
  desktop: 'workspaceEnv',
};

export function resolveCanonicalWidgetId(id: WidgetAliasId | string): CanonicalWidgetId | null {
  const mapped = WIDGET_ID_ALIASES[id] ?? id;
  if (WIDGET_CATALOG.some((entry) => entry.id === mapped)) {
    return mapped as CanonicalWidgetId;
  }
  return null;
}

export const WIDGET_CATALOG: readonly WidgetCatalogEntry[] = [
  {
    id: 'infie3d',
    label: 'Infie 3D',
    description: 'Interactive 3D Infie Mist, Glyph, Surge, Compile & Controller actor',
    category: 'core',
    defaultZone: 'center',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'infieChat',
    label: 'Infie Chat',
    description: 'Conversation, guidance, approvals & session controls',
    category: 'core',
    defaultZone: 'center',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'workspaceEnv',
    label: 'i² Environments',
    description: 'Choose simulated environment, inspect shared project/session state & events',
    category: 'core',
    defaultZone: 'center',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'globalTodo',
    label: 'Global To-Do',
    description: 'Cross-project tasks & reminders',
    category: 'core',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'projectFolder',
    label: 'Project Folder',
    description: 'Canonical info.md, todo.md, style.md & guidelines.md',
    category: 'core',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'currentGoal',
    label: 'Current Goal & Plan',
    description: 'Active session objective & Plan.md',
    category: 'core',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'agentTasks',
    label: 'Agent Tasks',
    description: 'Session agent task list & status',
    category: 'core',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'humanTesting',
    label: 'Human Testing',
    description: 'Human verification checklist & sign-off',
    category: 'diagnostics',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'explorer',
    label: 'Explorer',
    description: 'Workspace file tree & source viewer',
    category: 'core',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'git',
    label: 'Git & Diffs',
    description: 'Commit diffs, branch changes & PR preview',
    category: 'devTools',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Integrated agent & shell logs',
    category: 'devTools',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'terminal',
  },
  {
    id: 'eas',
    label: 'EAS Build',
    description: 'Expo builds, submits & dev actions',
    category: 'devTools',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'hostMutationsAuthorized',
  },
  {
    id: 'stylist',
    label: 'Stylist',
    description: 'Palette, typography & theme assistant',
    category: 'devTools',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'doctor',
    label: 'Doctor',
    description: 'i² & MDS Doctor diagnostics',
    category: 'diagnostics',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'doctor',
  },
  {
    id: 'problems',
    label: 'Problems',
    description: 'TypeScript, lint & Doctor issues',
    category: 'diagnostics',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'extensions',
    label: 'Extensions',
    description: 'Connected MCP & IDE extensions',
    category: 'devTools',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'File & session activity timeline',
    category: 'diagnostics',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Global workspace search',
    category: 'devTools',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'outline',
    label: 'Outline',
    description: 'Symbol outline for the active file',
    category: 'diagnostics',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'emuWeb',
    label: 'Web Preview',
    description: 'Simulated web app preview & shared comment state',
    category: 'emulators',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'emuAndroid',
    label: 'Android Preview',
    description: 'Simulated Android app preview shell',
    category: 'emulators',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'emulatorsNative',
  },
  {
    id: 'emuIos',
    label: 'iOS Preview',
    description: 'Simulated iOS app preview shell',
    category: 'emulators',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'emulatorsNative',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    description: 'All sessions & reviews across workspaces',
    category: 'devTools',
    defaultZone: 'leftWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'actions',
    label: 'Actions',
    description: 'i² quick command triggers',
    category: 'devTools',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
    requiresCapability: 'hostMutationsAuthorized',
  },
  {
    id: 'library',
    label: 'Library',
    description: 'MDS reusable component & pattern library',
    category: 'devTools',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'infiePreferences',
    label: 'Preference Sliders',
    description: 'Guidance, sassiness, verbosity, technical level, speed & effort',
    category: 'devTools',
    defaultZone: 'rightWing',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'music',
    label: 'LeekBeats Music',
    description: 'i² Curated ambient player & provider status',
    category: 'core',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
  {
    id: 'widgets',
    label: 'Widgets Gallery',
    description: 'Add, restore, arrange & manage spatial widgets',
    category: 'core',
    defaultZone: 'bottomShelf',
    supportsVr: true,
    supportsMobile: true,
    supportsWeb: true,
  },
];

function placement(
  widgetId: CanonicalWidgetId,
  zone: SpatialWidgetPlacement['zone'],
  sortOrder: number,
  coords: { yawDeg: number; pitchDeg: number; radiusM: number; widthM: number; heightM: number },
  dockZone: SpatialWidgetPlacement['dockZone'],
  windowId?: string
): SpatialWidgetPlacement {
  return {
    instanceId: `${widgetId}:default`,
    widgetId,
    zone,
    sortOrder,
    visible: true,
    mode: 'normal',
    pinned: widgetId === 'infieChat' || widgetId === 'infie3d',
    ...coords,
    dockZone,
    dockWeight: 1,
    scrollOffset: 0,
    windowId,
  };
}

function makeWindow(
  windowId: string,
  title: string,
  zone: SpatialWindow['zone'],
  sortOrder: number,
  coords: { yawDeg: number; pitchDeg: number; radiusM: number; widthM: number; heightM: number },
  dockZone: SpatialWindow['dockZone'],
  widgetIds: CanonicalWidgetId[],
  layoutMode: WindowGroupLayoutMode = 'stack'
): SpatialWindow {
  return {
    windowId,
    title,
    zone,
    sortOrder,
    visible: true,
    mode: 'normal',
    pinned: widgetIds.includes('infieChat') || widgetIds.includes('workspaceEnv'),
    ...coords,
    dockZone,
    dockWeight: 1,
    layoutMode,
    widgetIds,
    activeWidgetId: widgetIds[0],
    scrollOffsets: {},
  };
}

export function derivePlacementsFromWindows(
  windows: readonly SpatialWindow[],
  existingInfie3d?: SpatialWidgetPlacement | null
): SpatialWidgetPlacement[] {
  const out: SpatialWidgetPlacement[] = [];
  if (existingInfie3d) {
    out.push({ ...existingInfie3d });
  }
  let order = 0;
  for (const win of windows) {
    for (const widgetId of win.widgetIds) {
      if (widgetId === 'infie3d') continue;
      out.push({
        instanceId: `${widgetId}:${win.windowId}`,
        widgetId,
        zone: win.zone,
        sortOrder: order++,
        visible: win.visible,
        mode: win.mode,
        pinned: win.pinned,
        yawDeg: win.yawDeg,
        pitchDeg: win.pitchDeg,
        radiusM: win.radiusM,
        widthM: win.widthM,
        heightM: win.heightM,
        dockZone: win.dockZone,
        dockWeight: win.dockWeight,
        scrollOffset: win.scrollOffsets[widgetId] ?? 0,
        windowId: win.windowId,
      });
    }
  }
  return out;
}

export function migratePlacementsToWindows(
  presetId: string,
  placements: readonly SpatialWidgetPlacement[]
): SpatialWindow[] {
  const byWindow = new Map<string, SpatialWidgetPlacement[]>();
  for (const p of placements) {
    if (p.widgetId === 'infie3d') continue;
    const key = p.windowId ?? `win-${p.widgetId}-${presetId}`;
    const list = byWindow.get(key) ?? [];
    list.push(p);
    byWindow.set(key, list);
  }
  const windows: SpatialWindow[] = [];
  let sortOrder = 0;
  for (const [windowId, members] of byWindow.entries()) {
    const primary = members[0];
    const firstCatalog = WIDGET_CATALOG.find((c) => c.id === primary.widgetId);
    const title =
      members.length === 1
        ? (firstCatalog?.label ?? primary.widgetId)
        : `${firstCatalog?.label ?? primary.widgetId} (+${members.length - 1})`;
    const scrollOffsets: Record<string, number> = {};
    for (const m of members) {
      if (m.scrollOffset) scrollOffsets[m.widgetId] = m.scrollOffset;
    }
    windows.push({
      windowId,
      title,
      zone: primary.zone,
      sortOrder: sortOrder++,
      visible: members.some((m) => m.visible),
      mode: primary.mode,
      pinned: members.some((m) => m.pinned),
      yawDeg: primary.yawDeg,
      pitchDeg: primary.pitchDeg,
      radiusM: primary.radiusM,
      widthM: primary.widthM,
      heightM: primary.heightM,
      dockZone: primary.dockZone,
      dockWeight: primary.dockWeight,
      layoutMode: members.length > 2 ? 'tabs' : 'stack',
      widgetIds: members.map((m) => m.widgetId),
      activeWidgetId: members[0].widgetId,
      scrollOffsets,
    });
  }
  return windows;
}

function presetWithWindows(
  base: Omit<SpatialLayoutPreset, 'widgets'>,
  infieCoords: {
    yawDeg: number;
    pitchDeg: number;
    radiusM: number;
    widthM: number;
    heightM: number;
  }
): SpatialLayoutPreset {
  const infie = placement('infie3d', 'center', 0, infieCoords, 'center');
  return {
    ...base,
    widgets: derivePlacementsFromWindows(base.windows, infie),
  };
}

export const BUILTIN_LAYOUT_PRESETS: readonly SpatialLayoutPreset[] = [
  presetWithWindows(
    {
      presetId: 'minimal-infie-emu',
      name: 'Infie + Emulator',
      description:
        'Focused minimal OpenXR preset: 3D Infie actor + 2 sharp OpenXR compositor windows (Infie Chat & Web Preview).',
      isBuiltin: true,
      builtinRevision: 4,
      arrangeMode: 'arc',
      posture: 'standing',
      schemaVersion: 2,
      updatedAt: 0,
      windows: [
        makeWindow(
          'win-infie-chat',
          'Infie Chat',
          'center',
          0,
          { yawDeg: -14, pitchDeg: -6, radiusM: 1.44, widthM: 0.98, heightM: 0.74 },
          'center',
          ['infieChat'],
          'stack'
        ),
        makeWindow(
          'win-emu-web',
          'Web Preview · Pet Show & Tell',
          'rightWing',
          1,
          { yawDeg: 28, pitchDeg: -2, radiusM: 1.46, widthM: 0.88, heightM: 0.86 },
          'right',
          ['emuWeb'],
          'stack'
        ),
      ],
    },
    { yawDeg: -14, pitchDeg: 18, radiusM: 1.38, widthM: 0.54, heightM: 0.54 }
  ),
  presetWithWindows(
    {
      presetId: 'session-focus',
      name: 'Session Focus',
      description:
        'Balanced 4-window OpenXR cockpit: Infie center, grouped Plan/Tasks/Git left, Testing/Web right, Music shelf.',
      isBuiltin: true,
      builtinRevision: 4,
      arrangeMode: 'arc',
      posture: 'standing',
      schemaVersion: 2,
      updatedAt: 0,
      windows: [
        makeWindow(
          'win-focus-chat',
          'Infie Chat',
          'center',
          0,
          { yawDeg: 0, pitchDeg: -4, radiusM: 1.46, widthM: 1.04, heightM: 0.78 },
          'center',
          ['infieChat'],
          'stack'
        ),
        makeWindow(
          'win-focus-plan',
          'Goal, Tasks & Diffs',
          'leftWing',
          1,
          { yawDeg: -42, pitchDeg: 2, radiusM: 1.5, widthM: 0.96, heightM: 0.94 },
          'left',
          ['currentGoal', 'agentTasks', 'git'],
          'stack'
        ),
        makeWindow(
          'win-focus-verify',
          'Testing & Web Preview',
          'rightWing',
          2,
          { yawDeg: 42, pitchDeg: 2, radiusM: 1.5, widthM: 0.96, heightM: 0.94 },
          'right',
          ['humanTesting', 'emuWeb'],
          'stack'
        ),
        makeWindow(
          'win-focus-music',
          'LeekBeats Music',
          'bottomShelf',
          3,
          { yawDeg: 0, pitchDeg: -31, radiusM: 1.38, widthM: 0.84, heightM: 0.42 },
          'bottom',
          ['music'],
          'stack'
        ),
      ],
    },
    { yawDeg: 0, pitchDeg: 22, radiusM: 1.4, widthM: 0.54, heightM: 0.54 }
  ),
  presetWithWindows(
    {
      presetId: 'batcave-cockpit',
      name: 'Batcave Command',
      description:
        'Full 15-widget grouped Batcave preset fitting cleanly in 5 sharp OpenXR compositor windows + 3D Infie actor.',
      isBuiltin: true,
      builtinRevision: 4,
      arrangeMode: 'free',
      posture: 'standing',
      schemaVersion: 2,
      updatedAt: 0,
      windows: [
        makeWindow(
          'win-batcave-command',
          'Infie Command Hub',
          'center',
          0,
          { yawDeg: -16, pitchDeg: -3, radiusM: 1.5, widthM: 1.02, heightM: 0.96 },
          'center',
          ['infieChat', 'currentGoal', 'agentTasks'],
          'stack'
        ),
        makeWindow(
          'win-batcave-env',
          'Environment & App Preview',
          'center',
          1,
          { yawDeg: 22, pitchDeg: 3, radiusM: 1.54, widthM: 1.14, heightM: 0.92 },
          'center',
          ['workspaceEnv', 'emuWeb'],
          'stack'
        ),
        makeWindow(
          'win-batcave-code',
          'Workspace, Explorer & Git',
          'leftWing',
          2,
          { yawDeg: -58, pitchDeg: 3, radiusM: 1.58, widthM: 1.02, heightM: 0.98 },
          'left',
          ['projectFolder', 'explorer', 'git'],
          'stack'
        ),
        makeWindow(
          'win-batcave-verify',
          'Verify, Doctor & Prefs',
          'rightWing',
          3,
          { yawDeg: 60, pitchDeg: 3, radiusM: 1.58, widthM: 1.02, heightM: 0.98 },
          'right',
          ['humanTesting', 'doctor', 'sessions', 'infiePreferences'],
          'tabs'
        ),
        makeWindow(
          'win-batcave-ops',
          'Terminal, To-Do & Music',
          'bottomShelf',
          4,
          { yawDeg: 0, pitchDeg: -30, radiusM: 1.42, widthM: 1.24, heightM: 0.56 },
          'bottom',
          ['terminal', 'globalTodo', 'music'],
          'tabs'
        ),
      ],
    },
    { yawDeg: -16, pitchDeg: 24, radiusM: 1.44, widthM: 0.54, heightM: 0.54 }
  ),
  presetWithWindows(
    {
      presetId: 'emulator-wall',
      name: 'Emulator Wall',
      description:
        '5 independent OpenXR compositor windows: Infie Chat, i² Environments, Web, Android, and iOS simulated app previews.',
      isBuiltin: true,
      builtinRevision: 4,
      arrangeMode: 'free',
      posture: 'standing',
      schemaVersion: 2,
      updatedAt: 0,
      windows: [
        makeWindow(
          'win-wall-chat',
          'Infie Chat',
          'leftWing',
          0,
          { yawDeg: -42, pitchDeg: -4, radiusM: 1.48, widthM: 0.9, heightM: 0.78 },
          'left',
          ['infieChat'],
          'stack'
        ),
        makeWindow(
          'win-wall-env',
          'i² Environments',
          'center',
          1,
          { yawDeg: -4, pitchDeg: 10, radiusM: 1.54, widthM: 1.06, heightM: 0.7 },
          'center',
          ['workspaceEnv'],
          'stack'
        ),
        makeWindow(
          'win-wall-web',
          'Web Preview',
          'center',
          2,
          { yawDeg: -4, pitchDeg: -20, radiusM: 1.48, widthM: 0.92, heightM: 0.56 },
          'center',
          ['emuWeb'],
          'stack'
        ),
        makeWindow(
          'win-wall-android',
          'Android Preview (Sim)',
          'rightWing',
          3,
          { yawDeg: 36, pitchDeg: 4, radiusM: 1.52, widthM: 0.72, heightM: 0.86 },
          'right',
          ['emuAndroid'],
          'stack'
        ),
        makeWindow(
          'win-wall-ios',
          'iOS Preview (Sim)',
          'rightWing',
          4,
          { yawDeg: 64, pitchDeg: 4, radiusM: 1.56, widthM: 0.72, heightM: 0.86 },
          'right',
          ['emuIos'],
          'stack'
        ),
      ],
    },
    { yawDeg: -42, pitchDeg: 22, radiusM: 1.44, widthM: 0.48, heightM: 0.48 }
  ),
];
