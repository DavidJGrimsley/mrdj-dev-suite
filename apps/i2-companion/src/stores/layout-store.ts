import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

import { companionRepos } from '../adapters/sqlite/companion-db';
import {
  BUILTIN_LAYOUT_PRESETS,
  WIDGET_CATALOG,
  derivePlacementsFromWindows,
  migratePlacementsToWindows,
  resolveCanonicalWidgetId,
} from '../data/widget-catalog.ts';
import {
  DEFAULT_COCKPIT_ANCHOR,
  clampPlacementToComfort,
  clampWindowToComfort,
  computeSmartPlacement,
  shouldReanchorOnRefSpaceEpoch,
  snapYawToArcSlot,
  type CockpitAnchor,
  type Vec3,
} from '../features/spatial/cockpit-math.ts';
import {
  adjustNormalizedWeightPair,
  resolveWindowGroupLayout,
} from '../features/spatial/window-group-layout.ts';
import type {
  CanonicalWidgetId,
  LayoutRouteScope,
  SpatialLayoutPreset,
  SpatialWidgetPlacement,
  SpatialWindow,
  SpatialZone,
  VrArrangeMode,
  VrPosture,
  WidgetPresentationMode,
  WindowGroupLayout,
  WindowGroupLayoutMode,
} from '../types/widgets.ts';

export interface WindowLayerBudget {
  visibleWindowCount: number;
  totalWindowCount: number;
  maxWindowLayers: number;
  remainingWindowLayers: number;
  atHardLimit: boolean;
}

export interface WindowMutationResult {
  ok: boolean;
  windowId?: string;
  reason?: string;
}

export interface SpatialLayoutState {
  hydrated: boolean;
  presets: SpatialLayoutPreset[];
  activePresetByScope: Record<string, string>;
  currentScope: LayoutRouteScope;
  focusedWindowId: string | null;
  focusedWidgetId: CanonicalWidgetId | null;
  maxWindowLayers: number;
  lastLayerLimitNotice: string | null;
  anchor: CockpitAnchor;
  activeInputTarget: { widgetId: CanonicalWidgetId; fieldId: string } | null;

  hydrate: () => Promise<void>;
  setScope: (scope: LayoutRouteScope) => void;
  getActivePreset: () => SpatialLayoutPreset;
  getWindowLayerBudget: (preset?: SpatialLayoutPreset) => WindowLayerBudget;
  setMaxWindowLayers: (limit: number) => void;
  clearLayerLimitNotice: () => void;
  switchPreset: (presetId: string) => Promise<void>;
  saveAsNewPreset: (name: string, description?: string) => Promise<SpatialLayoutPreset>;
  renamePreset: (presetId: string, name: string) => Promise<void>;
  overwriteCustomPreset: (presetId: string) => Promise<void>;
  deleteCustomPreset: (presetId: string) => Promise<void>;
  resetActivePresetToDefault: () => Promise<void>;

  setFocusedWindow: (windowId: string | null) => void;
  setFocusedWidget: (widgetId: CanonicalWidgetId | null) => void;

  // First-class OpenXR floating window & widget group operations
  addWindow: (
    widgetIdsOrAliases: string | readonly string[],
    options?: {
      zone?: SpatialZone;
      title?: string;
      layoutMode?: WindowGroupLayoutMode;
      widthM?: number;
      heightM?: number;
      removeFromOtherWindows?: boolean;
    }
  ) => Promise<WindowMutationResult>;
  closeWindow: (windowId: string) => Promise<void>;
  deleteWindow: (windowId: string) => Promise<void>;
  moveWindowPose: (
    windowId: string,
    pose: Partial<Pick<SpatialWindow, 'yawDeg' | 'pitchDeg' | 'radiusM' | 'zone'>>,
    options?: { freeform?: boolean }
  ) => Promise<void>;
  nudgeWindowPose: (
    windowId: string,
    delta: Partial<Pick<SpatialWindow, 'yawDeg' | 'pitchDeg' | 'radiusM'>>
  ) => Promise<void>;
  resizeWindow: (windowId: string, widthM: number, heightM: number) => Promise<void>;
  resizeWindowBy: (windowId: string, dWidthM: number, dHeightM: number) => Promise<void>;
  setWindowMode: (windowId: string, mode: WidgetPresentationMode) => Promise<void>;
  setWindowLayoutMode: (windowId: string, layoutMode: WindowGroupLayoutMode) => Promise<void>;
  setWindowGroupLayout: (windowId: string, patch: Partial<WindowGroupLayout>) => Promise<void>;
  adjustWindowGroupSplit: (
    windowId: string,
    axis: 'col' | 'row',
    index: number,
    delta: number
  ) => Promise<void>;
  setWindowActiveWidget: (windowId: string, widgetId: CanonicalWidgetId) => Promise<void>;
  groupWidgetIntoWindow: (
    targetWindowId: string,
    widgetIdOrAlias: string,
    options?: { removeFromOtherWindows?: boolean; activate?: boolean }
  ) => Promise<WindowMutationResult>;
  ungroupWidgetToNewWindow: (
    sourceWindowId: string,
    widgetId: CanonicalWidgetId
  ) => Promise<WindowMutationResult>;
  reorderWidgetInWindow: (
    windowId: string,
    widgetId: CanonicalWidgetId,
    direction: 'up' | 'down' | number
  ) => Promise<void>;
  mergeWindows: (sourceWindowId: string, targetWindowId: string) => Promise<WindowMutationResult>;
  scrollWindowWidget: (windowId: string, widgetId: CanonicalWidgetId, deltaPx: number) => void;

  // Backward-compatible widget-centric actions routed cleanly through SpatialWindow groups
  addWidget: (
    widgetIdOrAlias: string,
    zone?: SpatialZone,
    targetWindowId?: string
  ) => Promise<WindowMutationResult>;
  removeWidget: (widgetId: CanonicalWidgetId) => Promise<void>;
  moveWidgetPose: (
    widgetId: CanonicalWidgetId,
    pose: Partial<Pick<SpatialWidgetPlacement, 'yawDeg' | 'pitchDeg' | 'radiusM' | 'zone'>>,
    options?: { freeform?: boolean }
  ) => Promise<void>;
  nudgeWidgetPose: (
    widgetId: CanonicalWidgetId,
    delta: Partial<Pick<SpatialWidgetPlacement, 'yawDeg' | 'pitchDeg' | 'radiusM'>>
  ) => Promise<void>;
  resizeWidget: (widgetId: CanonicalWidgetId, widthM: number, heightM: number) => Promise<void>;
  resizeWidgetBy: (widgetId: CanonicalWidgetId, dWidthM: number, dHeightM: number) => Promise<void>;
  setWidgetMode: (widgetId: CanonicalWidgetId, mode: WidgetPresentationMode) => Promise<void>;
  scrollWidget: (widgetId: CanonicalWidgetId, deltaPx: number) => void;

  setArrangeMode: (mode: VrArrangeMode) => Promise<void>;
  setPosture: (posture: VrPosture) => Promise<void>;
  recenterCockpit: (
    origin: Vec3,
    yawDeg: number,
    source: CockpitAnchor['source'],
    epoch: number
  ) => void;
  handleRefSpaceEpoch: (
    observedEpoch: number,
    postSample: { origin: Vec3; yawDeg: number } | null
  ) => void;
  setActiveInputTarget: (target: { widgetId: CanonicalWidgetId; fieldId: string } | null) => void;
}

function zoneToDockZone(zone: SpatialZone): SpatialWindow['dockZone'] {
  if (zone === 'leftWing') return 'left';
  if (zone === 'rightWing') return 'right';
  if (zone === 'bottomShelf') return 'bottom';
  return 'center';
}

function defaultWindowDimensions(widgetIds: readonly CanonicalWidgetId[]): {
  widthM: number;
  heightM: number;
} {
  if (widgetIds.includes('workspaceEnv')) {
    return widgetIds.length > 1 ? { widthM: 1.08, heightM: 0.92 } : { widthM: 1.04, heightM: 0.72 };
  }
  if (widgetIds.length >= 3) {
    return { widthM: 1.0, heightM: 0.92 };
  }
  if (widgetIds.length === 2) {
    return { widthM: 0.96, heightM: 0.86 };
  }
  return { widthM: 0.86, heightM: 0.62 };
}

function buildWindowTitle(widgetIds: readonly CanonicalWidgetId[]): string {
  if (widgetIds.length === 0) return 'Empty Window';
  const firstLabel = WIDGET_CATALOG.find((w) => w.id === widgetIds[0])?.label ?? widgetIds[0];
  if (widgetIds.length === 1) return firstLabel;
  return `${firstLabel} + ${widgetIds.length - 1}`;
}

function cloneWindow(win: SpatialWindow): SpatialWindow {
  return clampWindowToComfort({
    ...win,
    widgetIds: [...win.widgetIds],
    scrollOffsets: { ...(win.scrollOffsets ?? {}) },
    groupLayout: win.groupLayout
      ? {
          columns: win.groupLayout.columns,
          colWeights: win.groupLayout.colWeights ? [...win.groupLayout.colWeights] : undefined,
          rowWeights: win.groupLayout.rowWeights ? [...win.groupLayout.rowWeights] : undefined,
        }
      : undefined,
  });
}

function normalizePresetWindows(preset: SpatialLayoutPreset): SpatialLayoutPreset {
  const existingInfie = preset.widgets.find((w) => w.widgetId === 'infie3d') ?? null;
  const windowsSource =
    preset.windows && preset.windows.length > 0
      ? preset.windows
      : migratePlacementsToWindows(
          preset.presetId,
          preset.widgets.filter((w) => w.widgetId !== 'infie3d')
        );
  const windows = windowsSource
    .map(cloneWindow)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w, idx) => ({ ...w, sortOrder: idx }));
  return {
    ...preset,
    schemaVersion: Math.max(2, preset.schemaVersion || 2),
    windows,
    widgets: derivePlacementsFromWindows(windows, existingInfie),
  };
}

function clonePreset(p: SpatialLayoutPreset): SpatialLayoutPreset {
  return normalizePresetWindows({
    ...p,
    windows: (p.windows ?? []).map(cloneWindow),
    widgets: (p.widgets ?? []).map((w) => clampPlacementToComfort({ ...w })),
  });
}

function ensureEditablePreset(state: SpatialLayoutState): {
  preset: SpatialLayoutPreset;
  presets: SpatialLayoutPreset[];
} {
  const activeId = state.activePresetByScope[state.currentScope] ?? 'minimal-infie-emu';
  const found = state.presets.find((p) => p.presetId === activeId) ?? state.presets[0];
  return { preset: clonePreset(found), presets: state.presets };
}

function syncPreset(preset: SpatialLayoutPreset): SpatialLayoutPreset {
  const infie3d = preset.widgets.find((w) => w.widgetId === 'infie3d') ?? null;
  const cleanWindows = preset.windows
    .filter((w) => w.widgetIds.length > 0)
    .map(cloneWindow)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w, index) => ({ ...w, sortOrder: index }));
  return {
    ...preset,
    schemaVersion: Math.max(2, preset.schemaVersion || 2),
    windows: cleanWindows,
    widgets: derivePlacementsFromWindows(cleanWindows, infie3d),
    updatedAt: Date.now(),
  };
}

function pickNextFocus(preset: SpatialLayoutPreset): {
  focusedWindowId: string | null;
  focusedWidgetId: CanonicalWidgetId | null;
} {
  const win = preset.windows.find((w) => w.visible && w.widgetIds.length > 0) ?? null;
  if (!win) return { focusedWindowId: null, focusedWidgetId: null };
  return {
    focusedWindowId: win.windowId,
    focusedWidgetId: win.activeWidgetId ?? win.widgetIds[0] ?? null,
  };
}

function findWindowContainingWidget(
  windows: readonly SpatialWindow[],
  widgetId: CanonicalWidgetId
): SpatialWindow | undefined {
  return (
    windows.find((w) => w.visible && w.widgetIds.includes(widgetId)) ??
    windows.find((w) => w.widgetIds.includes(widgetId))
  );
}

export const layoutStore = createStore<SpatialLayoutState>((set, get) => ({
  hydrated: false,
  presets: BUILTIN_LAYOUT_PRESETS.map(clonePreset),
  activePresetByScope: { home: 'minimal-infie-emu' },
  currentScope: 'home',
  focusedWindowId: BUILTIN_LAYOUT_PRESETS[0]?.windows[0]?.windowId ?? null,
  focusedWidgetId: 'infieChat',
  maxWindowLayers: 16,
  lastLayerLimitNotice: null,
  anchor: { ...DEFAULT_COCKPIT_ANCHOR },
  activeInputTarget: null,

  async hydrate() {
    await companionRepos.ensureReady();
    const presets = await companionRepos.listPresets();
    const homePresetId = (await companionRepos.getActivePresetId('home')) ?? 'minimal-infie-emu';
    const nextPresets =
      presets.length > 0 ? presets.map(clonePreset) : BUILTIN_LAYOUT_PRESETS.map(clonePreset);
    const active = nextPresets.find((p) => p.presetId === homePresetId) ?? nextPresets[0];
    const focus = pickNextFocus(active);
    set({
      hydrated: true,
      presets: nextPresets,
      activePresetByScope: { home: homePresetId },
      focusedWindowId: focus.focusedWindowId,
      focusedWidgetId: focus.focusedWidgetId,
    });
  },

  setScope(scope) {
    set({ currentScope: scope });
    void companionRepos.getActivePresetId(scope).then((boundId) => {
      if (boundId) {
        const preset = get().presets.find((p) => p.presetId === boundId);
        const focus = preset ? pickNextFocus(preset) : null;
        set((s) => ({
          activePresetByScope: { ...s.activePresetByScope, [scope]: boundId },
          ...(focus ? focus : {}),
        }));
      }
    });
  },

  getActivePreset() {
    const state = get();
    const activeId = state.activePresetByScope[state.currentScope] ?? 'minimal-infie-emu';
    return state.presets.find((p) => p.presetId === activeId) ?? state.presets[0];
  },

  getWindowLayerBudget(presetArg) {
    const preset = presetArg ?? get().getActivePreset();
    const visibleWindowCount = preset.windows.filter((w) => w.visible).length;
    const maxWindowLayers = Math.max(1, get().maxWindowLayers);
    return {
      visibleWindowCount,
      totalWindowCount: preset.windows.length,
      maxWindowLayers,
      remainingWindowLayers: Math.max(0, maxWindowLayers - visibleWindowCount),
      atHardLimit: visibleWindowCount >= maxWindowLayers,
    };
  },

  setMaxWindowLayers(limit) {
    const clamped = Math.max(1, Math.min(16, Math.floor(limit)));
    if (get().maxWindowLayers !== clamped) {
      set({ maxWindowLayers: clamped });
    }
  },

  clearLayerLimitNotice() {
    if (get().lastLayerLimitNotice !== null) {
      set({ lastLayerLimitNotice: null });
    }
  },

  async switchPreset(presetId) {
    const scope = get().currentScope;
    const target = get().presets.find((p) => p.presetId === presetId);
    if (!target) return;
    const focus = pickNextFocus(target);
    set((s) => ({
      activePresetByScope: { ...s.activePresetByScope, [scope]: presetId },
      focusedWindowId: focus.focusedWindowId,
      focusedWidgetId: focus.focusedWidgetId,
      lastLayerLimitNotice: null,
    }));
    await companionRepos.setActivePresetId(scope, presetId);
  },

  async saveAsNewPreset(name, description = 'Custom user spatial layout') {
    const trimmed = name.trim() || `Custom Layout ${get().presets.length + 1}`;
    const current = get().getActivePreset();
    const presetId = `custom-${Date.now()}`;
    const cloned = clonePreset(current);
    const created: SpatialLayoutPreset = syncPreset({
      ...cloned,
      presetId,
      name: trimmed,
      description,
      isBuiltin: false,
      builtinRevision: 0,
      updatedAt: Date.now(),
    });
    set((s) => ({
      presets: [...s.presets, created],
      activePresetByScope: { ...s.activePresetByScope, [s.currentScope]: created.presetId },
    }));
    await companionRepos.savePreset(created);
    await companionRepos.setActivePresetId(get().currentScope, created.presetId);
    return created;
  },

  async renamePreset(presetId, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const target = get().presets.find((p) => p.presetId === presetId);
    if (!target || target.isBuiltin) return;
    const updated: SpatialLayoutPreset = {
      ...clonePreset(target),
      name: trimmed,
      updatedAt: Date.now(),
    };
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === presetId ? updated : p)),
    }));
    await companionRepos.savePreset(updated);
  },

  async overwriteCustomPreset(presetId) {
    const target = get().presets.find((p) => p.presetId === presetId);
    if (!target || target.isBuiltin) return;
    const current = get().getActivePreset();
    const updated: SpatialLayoutPreset = syncPreset({
      ...clonePreset(current),
      presetId: target.presetId,
      name: target.name,
      description: target.description,
      isBuiltin: false,
      builtinRevision: 0,
      updatedAt: Date.now(),
    });
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === presetId ? updated : p)),
      activePresetByScope: { ...s.activePresetByScope, [s.currentScope]: presetId },
    }));
    await companionRepos.savePreset(updated);
    await companionRepos.setActivePresetId(get().currentScope, presetId);
  },

  async deleteCustomPreset(presetId) {
    const target = get().presets.find((p) => p.presetId === presetId);
    if (!target || target.isBuiltin) return;
    const nextPresets = get().presets.filter((p) => p.presetId !== presetId);
    const scope = get().currentScope;
    const nextActive =
      get().activePresetByScope[scope] === presetId
        ? 'minimal-infie-emu'
        : get().activePresetByScope[scope];
    const nextPreset = nextPresets.find((p) => p.presetId === nextActive) ?? nextPresets[0];
    const focus = nextPreset
      ? pickNextFocus(nextPreset)
      : { focusedWindowId: null, focusedWidgetId: null };
    set((s) => ({
      presets: nextPresets,
      activePresetByScope: { ...s.activePresetByScope, [scope]: nextActive },
      ...focus,
    }));
    await companionRepos.deletePreset(presetId);
    await companionRepos.setActivePresetId(scope, nextActive);
  },

  async resetActivePresetToDefault() {
    const current = get().getActivePreset();
    const builtin = BUILTIN_LAYOUT_PRESETS.find((b) => b.presetId === current.presetId);
    if (!builtin) return;
    const reset = { ...clonePreset(builtin), updatedAt: Date.now() };
    const focus = pickNextFocus(reset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === reset.presetId ? reset : p)),
      lastLayerLimitNotice: null,
      ...focus,
    }));
    await companionRepos.savePreset(reset);
  },

  setFocusedWindow(windowId) {
    if (!windowId) {
      set({ focusedWindowId: null });
      return;
    }
    const win = get()
      .getActivePreset()
      .windows.find((w) => w.windowId === windowId);
    set((s) => ({
      focusedWindowId: windowId,
      focusedWidgetId: win?.activeWidgetId ?? win?.widgetIds[0] ?? s.focusedWidgetId,
    }));
  },

  setFocusedWidget(widgetId) {
    if (!widgetId) {
      set({ focusedWidgetId: null });
      return;
    }
    const preset = get().getActivePreset();
    const hostWin = findWindowContainingWidget(preset.windows, widgetId);
    set({
      focusedWidgetId: widgetId,
      ...(hostWin ? { focusedWindowId: hostWin.windowId } : {}),
    });
  },

  async addWindow(widgetIdsOrAliases, options) {
    const rawList = Array.isArray(widgetIdsOrAliases) ? widgetIdsOrAliases : [widgetIdsOrAliases];
    const widgetIds: CanonicalWidgetId[] = [];
    for (const raw of rawList) {
      const canonical = resolveCanonicalWidgetId(raw);
      if (canonical && canonical !== 'infie3d' && !widgetIds.includes(canonical)) {
        widgetIds.push(canonical);
      }
    }
    if (widgetIds.length === 0) {
      return { ok: false, reason: 'No valid 2D panel widget IDs provided.' };
    }

    const { preset } = ensureEditablePreset(get());
    const visibleWindows = preset.windows.filter((w) => w.visible);
    const maxLayers = Math.max(1, get().maxWindowLayers);
    if (visibleWindows.length >= maxLayers) {
      const reason = `OpenXR compositor window limit reached (${visibleWindows.length}/${maxLayers} hardware window layers active). Group widgets into an existing window or close a window first.`;
      set({ lastLayerLimitNotice: reason });
      return { ok: false, reason };
    }

    if (options?.removeFromOtherWindows) {
      preset.windows = preset.windows
        .map((w) => ({
          ...w,
          widgetIds: w.widgetIds.filter((id) => !widgetIds.includes(id)),
        }))
        .filter((w) => w.widgetIds.length > 0);
    }

    const firstCatalog = WIDGET_CATALOG.find((c) => c.id === widgetIds[0]);
    const zone = options?.zone ?? firstCatalog?.defaultZone ?? 'floating';
    const smart = computeSmartPlacement(
      preset.windows.filter((w) => w.visible),
      zone
    );
    const dims = defaultWindowDimensions(widgetIds);
    const windowId = `win-${widgetIds[0]}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const newWindow = clampWindowToComfort({
      windowId,
      title: options?.title?.trim() || buildWindowTitle(widgetIds),
      zone,
      sortOrder: preset.windows.length,
      visible: true,
      mode: 'normal',
      pinned: false,
      yawDeg: smart.yawDeg,
      pitchDeg: smart.pitchDeg,
      radiusM: smart.radiusM,
      widthM: options?.widthM ?? dims.widthM,
      heightM: options?.heightM ?? dims.heightM,
      dockZone: zoneToDockZone(zone),
      dockWeight: 1,
      layoutMode: options?.layoutMode ?? (widgetIds.length > 2 ? 'tabs' : 'stack'),
      widgetIds,
      activeWidgetId: widgetIds[0],
      scrollOffsets: {},
    });

    preset.windows.push(newWindow);
    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: windowId,
      focusedWidgetId: widgetIds[0],
      lastLayerLimitNotice: null,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
    return { ok: true, windowId };
  },

  async closeWindow(windowId) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) =>
      w.windowId === windowId ? { ...w, visible: false, mode: 'normal' } : w
    );
    const synced = syncPreset(preset);
    const nextFocus = pickNextFocus(synced);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
      focusedWindowId:
        s.focusedWindowId === windowId ? nextFocus.focusedWindowId : s.focusedWindowId,
      focusedWidgetId:
        s.focusedWindowId === windowId ? nextFocus.focusedWidgetId : s.focusedWidgetId,
      lastLayerLimitNotice: null,
    }));
    await companionRepos.savePreset(synced);
  },

  async deleteWindow(windowId) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.filter((w) => w.windowId !== windowId);
    const synced = syncPreset(preset);
    const nextFocus = pickNextFocus(synced);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
      focusedWindowId:
        s.focusedWindowId === windowId ? nextFocus.focusedWindowId : s.focusedWindowId,
      focusedWidgetId:
        s.focusedWindowId === windowId ? nextFocus.focusedWidgetId : s.focusedWidgetId,
      lastLayerLimitNotice: null,
    }));
    await companionRepos.savePreset(synced);
  },

  async moveWindowPose(windowId, pose, options) {
    const { preset } = ensureEditablePreset(get());
    const freeform = options?.freeform ?? preset.arrangeMode === 'free';
    if (options?.freeform && preset.arrangeMode !== 'free') {
      preset.arrangeMode = 'free';
    }
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId) return w;
      const nextYaw = pose.yawDeg ?? w.yawDeg;
      const nextZone =
        pose.zone ??
        (!freeform && preset.arrangeMode === 'arc' ? snapYawToArcSlot(nextYaw).zone : w.zone);
      const snappedYaw =
        !freeform && preset.arrangeMode === 'arc' && pose.yawDeg !== undefined && !pose.zone
          ? snapYawToArcSlot(nextYaw).snappedYawDeg
          : nextYaw;
      return clampWindowToComfort({
        ...w,
        ...pose,
        yawDeg: snappedYaw,
        zone: nextZone,
        dockZone: zoneToDockZone(nextZone),
      });
    });
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async nudgeWindowPose(windowId, delta) {
    const current = get()
      .getActivePreset()
      .windows.find((w) => w.windowId === windowId);
    if (!current) return;
    await get().moveWindowPose(
      windowId,
      {
        yawDeg: current.yawDeg + (delta.yawDeg ?? 0),
        pitchDeg: current.pitchDeg + (delta.pitchDeg ?? 0),
        radiusM: current.radiusM + (delta.radiusM ?? 0),
      },
      { freeform: true }
    );
  },

  async resizeWindow(windowId, widthM, heightM) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) =>
      w.windowId === windowId ? clampWindowToComfort({ ...w, widthM, heightM }) : w
    );
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async resizeWindowBy(windowId, dWidthM, dHeightM) {
    const current = get()
      .getActivePreset()
      .windows.find((w) => w.windowId === windowId);
    if (!current) return;
    await get().resizeWindow(windowId, current.widthM + dWidthM, current.heightM + dHeightM);
  },

  async setWindowMode(windowId, mode) {
    const { preset } = ensureEditablePreset(get());
    const target = preset.windows.find((w) => w.windowId === windowId);
    preset.windows = preset.windows.map((w) => {
      if (w.windowId === windowId) return { ...w, mode };
      if (mode === 'fullscreen' && w.mode === 'fullscreen') return { ...w, mode: 'normal' };
      return w;
    });
    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: windowId,
      focusedWidgetId: target?.activeWidgetId ?? target?.widgetIds[0] ?? s.focusedWidgetId,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async setWindowLayoutMode(windowId, layoutMode) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) =>
      w.windowId === windowId
        ? clampWindowToComfort({
            ...w,
            layoutMode,
            activeWidgetId: w.activeWidgetId ?? w.widgetIds[0],
          })
        : w
    );
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async setWindowGroupLayout(windowId, patch) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId) return w;
      const mergedColumns =
        patch.columns ?? w.groupLayout?.columns ?? (w.widgetIds.length > 1 ? 2 : 1);
      const nextResolved = resolveWindowGroupLayout({
        widgetIds: w.widgetIds,
        layoutMode: 'grid',
        groupLayout: {
          columns: mergedColumns,
          colWeights: patch.colWeights ?? w.groupLayout?.colWeights,
          rowWeights: patch.rowWeights ?? w.groupLayout?.rowWeights,
        },
      });
      return clampWindowToComfort({
        ...w,
        layoutMode: w.widgetIds.length > 1 ? 'grid' : w.layoutMode,
        groupLayout: nextResolved,
      });
    });
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async adjustWindowGroupSplit(windowId, axis, index, delta) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId || w.widgetIds.length <= 1) return w;
      const resolved = resolveWindowGroupLayout(w);
      const nextLayout: WindowGroupLayout =
        axis === 'col'
          ? {
              ...resolved,
              colWeights: adjustNormalizedWeightPair(resolved.colWeights, index, delta),
            }
          : {
              ...resolved,
              rowWeights: adjustNormalizedWeightPair(resolved.rowWeights, index, delta),
            };
      return clampWindowToComfort({
        ...w,
        layoutMode: 'grid',
        groupLayout: nextLayout,
      });
    });
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async setWindowActiveWidget(windowId, widgetId) {
    const { preset } = ensureEditablePreset(get());
    let changed = false;
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId || !w.widgetIds.includes(widgetId)) return w;
      changed = true;
      return { ...w, activeWidgetId: widgetId };
    });
    if (!changed) return;
    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: windowId,
      focusedWidgetId: widgetId,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async groupWidgetIntoWindow(targetWindowId, widgetIdOrAlias, options) {
    const widgetId = resolveCanonicalWidgetId(widgetIdOrAlias);
    if (!widgetId || widgetId === 'infie3d') {
      return { ok: false, reason: 'Invalid panel widget ID.' };
    }
    const { preset } = ensureEditablePreset(get());
    const target = preset.windows.find((w) => w.windowId === targetWindowId);
    if (!target) {
      return { ok: false, reason: `Target window "${targetWindowId}" not found.` };
    }

    const maxLayers = Math.max(1, get().maxWindowLayers);
    const visibleOtherCount = preset.windows.filter(
      (w) => w.visible && w.windowId !== targetWindowId
    ).length;
    if (!target.visible && visibleOtherCount >= maxLayers) {
      const reason = `OpenXR compositor window limit reached (${visibleOtherCount}/${maxLayers}). Close another window before reopening "${target.title}".`;
      set({ lastLayerLimitNotice: reason });
      return { ok: false, reason };
    }

    const removeFromOthers = options?.removeFromOtherWindows ?? true;
    const preservedScroll: Record<string, number> = {};
    if (removeFromOthers) {
      preset.windows = preset.windows
        .map((w) => {
          if (w.windowId === targetWindowId) return w;
          if (!w.widgetIds.includes(widgetId)) return w;
          if (w.scrollOffsets[widgetId]) {
            preservedScroll[widgetId] = w.scrollOffsets[widgetId];
          }
          const nextIds = w.widgetIds.filter((id) => id !== widgetId);
          return {
            ...w,
            widgetIds: nextIds,
            activeWidgetId: nextIds.includes(w.activeWidgetId ?? ('' as CanonicalWidgetId))
              ? w.activeWidgetId
              : nextIds[0],
          };
        })
        .filter((w) => w.windowId === targetWindowId || w.widgetIds.length > 0);
    }

    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== targetWindowId) return w;
      const nextIds = w.widgetIds.includes(widgetId) ? w.widgetIds : [...w.widgetIds, widgetId];
      const shouldGrowWidth =
        !w.widgetIds.includes(widgetId) && w.widgetIds.length === 1 && w.widthM < 1.08;
      const nextTitle =
        w.widgetIds.length === 1 && !w.widgetIds.includes(widgetId)
          ? buildWindowTitle(nextIds)
          : w.title;
      const nextGroup = resolveWindowGroupLayout({
        widgetIds: nextIds,
        layoutMode: nextIds.length > 1 ? 'grid' : w.layoutMode,
        groupLayout: w.groupLayout ?? (nextIds.length > 1 ? { columns: 2 } : undefined),
      });
      return clampWindowToComfort({
        ...w,
        visible: true,
        title: nextTitle,
        widthM: shouldGrowWidth ? Math.max(w.widthM, 1.12) : w.widthM,
        layoutMode: nextIds.length > 1 ? 'grid' : w.layoutMode,
        groupLayout: nextIds.length > 1 ? nextGroup : undefined,
        widgetIds: nextIds,
        activeWidgetId: options?.activate === false ? (w.activeWidgetId ?? nextIds[0]) : widgetId,
        scrollOffsets: { ...preservedScroll, ...w.scrollOffsets },
      });
    });

    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: targetWindowId,
      focusedWidgetId: widgetId,
      lastLayerLimitNotice: null,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
    return { ok: true, windowId: targetWindowId };
  },

  async ungroupWidgetToNewWindow(sourceWindowId, widgetId) {
    if (widgetId === 'infie3d') {
      return { ok: false, reason: '3D Infie actor is not a compositor panel widget.' };
    }
    const { preset } = ensureEditablePreset(get());
    const source = preset.windows.find((w) => w.windowId === sourceWindowId);
    if (!source || !source.widgetIds.includes(widgetId)) {
      return { ok: false, reason: `Widget "${widgetId}" is not in window "${sourceWindowId}".` };
    }
    if (source.widgetIds.length <= 1) {
      return {
        ok: true,
        windowId: source.windowId,
        reason: 'Widget is already in its own solo window.',
      };
    }

    const visibleWindows = preset.windows.filter((w) => w.visible);
    const maxLayers = Math.max(1, get().maxWindowLayers);
    if (visibleWindows.length >= maxLayers) {
      const reason = `Cannot pop out "${widgetId}" into a new OpenXR window: ${visibleWindows.length}/${maxLayers} hardware window layers are already active. Close a window or keep it grouped.`;
      set({ lastLayerLimitNotice: reason });
      return { ok: false, reason };
    }

    const remainingIds = source.widgetIds.filter((id) => id !== widgetId);
    const scrollOffset = source.scrollOffsets[widgetId] ?? 0;
    const nextSourceOffsets = { ...source.scrollOffsets };
    delete nextSourceOffsets[widgetId];

    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== sourceWindowId) return w;
      return clampWindowToComfort({
        ...w,
        layoutMode: remainingIds.length > 1 ? 'grid' : 'stack',
        groupLayout:
          remainingIds.length > 1
            ? resolveWindowGroupLayout({
                widgetIds: remainingIds,
                layoutMode: 'grid',
                groupLayout: w.groupLayout,
              })
            : undefined,
        widgetIds: remainingIds,
        activeWidgetId: remainingIds.includes(w.activeWidgetId ?? ('' as CanonicalWidgetId))
          ? w.activeWidgetId
          : remainingIds[0],
        scrollOffsets: nextSourceOffsets,
      });
    });

    const catalog = WIDGET_CATALOG.find((c) => c.id === widgetId);
    const preferredZone = catalog?.defaultZone ?? source.zone;
    const smart = computeSmartPlacement(
      preset.windows.filter((w) => w.visible),
      preferredZone
    );
    const dims = defaultWindowDimensions([widgetId]);
    const newWindowId = `win-${widgetId}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const popped = clampWindowToComfort({
      windowId: newWindowId,
      title: catalog?.label ?? widgetId,
      zone: preferredZone,
      sortOrder: preset.windows.length,
      visible: true,
      mode: 'normal',
      pinned: false,
      yawDeg: smart.yawDeg,
      pitchDeg: smart.pitchDeg,
      radiusM: smart.radiusM,
      widthM: dims.widthM,
      heightM: dims.heightM,
      dockZone: zoneToDockZone(preferredZone),
      dockWeight: 1,
      layoutMode: 'stack',
      widgetIds: [widgetId],
      activeWidgetId: widgetId,
      scrollOffsets: scrollOffset ? { [widgetId]: scrollOffset } : {},
    });
    preset.windows.push(popped);

    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: newWindowId,
      focusedWidgetId: widgetId,
      lastLayerLimitNotice: null,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
    return { ok: true, windowId: newWindowId };
  },

  async reorderWidgetInWindow(windowId, widgetId, direction) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId) return w;
      const idx = w.widgetIds.indexOf(widgetId);
      if (idx < 0) return w;
      const targetIdx =
        direction === 'up'
          ? Math.max(0, idx - 1)
          : direction === 'down'
            ? Math.min(w.widgetIds.length - 1, idx + 1)
            : Math.max(0, Math.min(w.widgetIds.length - 1, direction));
      if (targetIdx === idx) return w;
      const nextIds = [...w.widgetIds];
      const [moved] = nextIds.splice(idx, 1);
      nextIds.splice(targetIdx, 0, moved);
      return { ...w, widgetIds: nextIds };
    });
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
  },

  async mergeWindows(sourceWindowId, targetWindowId) {
    if (sourceWindowId === targetWindowId) {
      return { ok: false, reason: 'Cannot merge a window into itself.' };
    }
    const { preset } = ensureEditablePreset(get());
    const source = preset.windows.find((w) => w.windowId === sourceWindowId);
    const target = preset.windows.find((w) => w.windowId === targetWindowId);
    if (!source || !target) {
      return { ok: false, reason: 'Source or target window not found.' };
    }
    const maxLayers = Math.max(1, get().maxWindowLayers);
    const visibleAfterMerge = preset.windows.filter(
      (w) => w.visible && w.windowId !== sourceWindowId
    ).length;
    if (!target.visible && visibleAfterMerge >= maxLayers) {
      const reason = `OpenXR compositor window limit reached (${visibleAfterMerge}/${maxLayers}).`;
      set({ lastLayerLimitNotice: reason });
      return { ok: false, reason };
    }

    const mergedIds = [...target.widgetIds];
    for (const id of source.widgetIds) {
      if (!mergedIds.includes(id)) mergedIds.push(id);
    }
    const mergedOffsets = { ...source.scrollOffsets, ...target.scrollOffsets };
    preset.windows = preset.windows
      .filter((w) => w.windowId !== sourceWindowId)
      .map((w) =>
        w.windowId === targetWindowId
          ? clampWindowToComfort({
              ...w,
              visible: true,
              layoutMode: mergedIds.length > 1 ? 'grid' : w.layoutMode,
              groupLayout: resolveWindowGroupLayout({
                widgetIds: mergedIds,
                layoutMode: mergedIds.length > 1 ? 'grid' : w.layoutMode,
                groupLayout: w.groupLayout ?? { columns: 2 },
              }),
              widgetIds: mergedIds,
              scrollOffsets: mergedOffsets,
              activeWidgetId: target.activeWidgetId ?? mergedIds[0],
            })
          : w
      );

    const synced = syncPreset(preset);
    set((s) => ({
      focusedWindowId: targetWindowId,
      focusedWidgetId: target.activeWidgetId ?? mergedIds[0] ?? s.focusedWidgetId,
      lastLayerLimitNotice: null,
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
    await companionRepos.savePreset(synced);
    return { ok: true, windowId: targetWindowId };
  },

  scrollWindowWidget(windowId, widgetId, deltaPx) {
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows.map((w) => {
      if (w.windowId !== windowId) return w;
      const currentOffset = w.scrollOffsets[widgetId] ?? 0;
      return clampWindowToComfort({
        ...w,
        scrollOffsets: {
          ...w.scrollOffsets,
          [widgetId]: currentOffset + deltaPx,
        },
      });
    });
    const synced = syncPreset(preset);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
    }));
  },

  // Backward-compatible widget helpers routed through SpatialWindow groups
  async addWidget(widgetIdOrAlias, preferredZone, targetWindowId) {
    const widgetId = resolveCanonicalWidgetId(widgetIdOrAlias);
    if (!widgetId || widgetId === 'infie3d') {
      return { ok: false, reason: 'Invalid panel widget ID.' };
    }
    if (targetWindowId) {
      return get().groupWidgetIntoWindow(targetWindowId, widgetId, {
        removeFromOtherWindows: true,
        activate: true,
      });
    }

    const { preset } = ensureEditablePreset(get());
    const existingWin = findWindowContainingWidget(preset.windows, widgetId);
    if (existingWin) {
      const visibleCount = preset.windows.filter((w) => w.visible).length;
      const maxLayers = Math.max(1, get().maxWindowLayers);
      if (!existingWin.visible && visibleCount >= maxLayers) {
        const reason = `OpenXR compositor window limit reached (${visibleCount}/${maxLayers}). Group "${widgetId}" into an active window or close a window first.`;
        set({ lastLayerLimitNotice: reason });
        return { ok: false, reason };
      }

      preset.windows = preset.windows.map((w) => {
        if (w.windowId !== existingWin.windowId) return w;
        const nextZone = preferredZone ?? w.zone;
        const smart = w.visible
          ? { yawDeg: w.yawDeg, pitchDeg: w.pitchDeg, radiusM: w.radiusM }
          : computeSmartPlacement(
              preset.windows.filter((item) => item.visible),
              nextZone
            );
        return clampWindowToComfort({
          ...w,
          visible: true,
          zone: nextZone,
          dockZone: zoneToDockZone(nextZone),
          yawDeg: w.visible ? w.yawDeg : smart.yawDeg,
          pitchDeg: w.visible ? w.pitchDeg : smart.pitchDeg,
          radiusM: w.visible ? w.radiusM : smart.radiusM,
          activeWidgetId: widgetId,
        });
      });

      const synced = syncPreset(preset);
      set((s) => ({
        focusedWindowId: existingWin.windowId,
        focusedWidgetId: widgetId,
        lastLayerLimitNotice: null,
        presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
      }));
      await companionRepos.savePreset(synced);
      return { ok: true, windowId: existingWin.windowId };
    }

    return get().addWindow([widgetId], { zone: preferredZone });
  },

  async removeWidget(widgetId) {
    if (widgetId === 'infie3d') return;
    const { preset } = ensureEditablePreset(get());
    preset.windows = preset.windows
      .map((w) => {
        if (!w.widgetIds.includes(widgetId)) return w;
        if (w.widgetIds.length === 1) {
          return { ...w, visible: false, mode: 'normal' as WidgetPresentationMode };
        }
        const remaining = w.widgetIds.filter((id) => id !== widgetId);
        return {
          ...w,
          layoutMode: remaining.length > 1 ? w.layoutMode : 'stack',
          groupLayout:
            remaining.length > 1
              ? resolveWindowGroupLayout({
                  widgetIds: remaining,
                  layoutMode: w.layoutMode,
                  groupLayout: w.groupLayout,
                })
              : undefined,
          widgetIds: remaining,
          activeWidgetId: remaining.includes(w.activeWidgetId ?? ('' as CanonicalWidgetId))
            ? w.activeWidgetId
            : remaining[0],
        };
      })
      .filter((w) => w.widgetIds.length > 0);

    const synced = syncPreset(preset);
    const nextFallback = pickNextFocus(synced);
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === synced.presetId ? synced : p)),
      focusedWidgetId:
        s.focusedWidgetId === widgetId ? nextFallback.focusedWidgetId : s.focusedWidgetId,
      focusedWindowId:
        s.focusedWidgetId === widgetId ? nextFallback.focusedWindowId : s.focusedWindowId,
      lastLayerLimitNotice: null,
    }));
    await companionRepos.savePreset(synced);
  },

  async moveWidgetPose(widgetId, pose, options) {
    if (widgetId === 'infie3d') {
      const { preset } = ensureEditablePreset(get());
      preset.widgets = preset.widgets.map((w) =>
        w.widgetId === 'infie3d' ? clampPlacementToComfort({ ...w, ...pose }) : w
      );
      preset.updatedAt = Date.now();
      set((s) => ({
        presets: s.presets.map((p) => (p.presetId === preset.presetId ? preset : p)),
      }));
      await companionRepos.savePreset(preset);
      return;
    }
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    await get().moveWindowPose(win.windowId, pose, options);
  },

  async nudgeWidgetPose(widgetId, delta) {
    if (widgetId === 'infie3d') {
      const current = get()
        .getActivePreset()
        .widgets.find((w) => w.widgetId === 'infie3d');
      if (!current) return;
      await get().moveWidgetPose('infie3d', {
        yawDeg: current.yawDeg + (delta.yawDeg ?? 0),
        pitchDeg: current.pitchDeg + (delta.pitchDeg ?? 0),
        radiusM: current.radiusM + (delta.radiusM ?? 0),
      });
      return;
    }
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    await get().nudgeWindowPose(win.windowId, delta);
  },

  async resizeWidget(widgetId, widthM, heightM) {
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    await get().resizeWindow(win.windowId, widthM, heightM);
  },

  async resizeWidgetBy(widgetId, dWidthM, dHeightM) {
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    await get().resizeWindowBy(win.windowId, dWidthM, dHeightM);
  },

  async setWidgetMode(widgetId, mode) {
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    await get().setWindowActiveWidget(win.windowId, widgetId);
    await get().setWindowMode(win.windowId, mode);
  },

  scrollWidget(widgetId, deltaPx) {
    const win = findWindowContainingWidget(get().getActivePreset().windows, widgetId);
    if (!win) return;
    get().scrollWindowWidget(win.windowId, widgetId, deltaPx);
  },

  async setArrangeMode(arrangeMode) {
    const { preset } = ensureEditablePreset(get());
    preset.arrangeMode = arrangeMode;
    preset.updatedAt = Date.now();
    set((s) => ({
      presets: s.presets.map((p) => (p.presetId === preset.presetId ? preset : p)),
    }));
    await companionRepos.savePreset(preset);
  },

  async setPosture(posture) {
    const { preset } = ensureEditablePreset(get());
    preset.posture = posture;
    preset.updatedAt = Date.now();
    set((s) => ({
      anchor: { ...s.anchor, posture },
      presets: s.presets.map((p) => (p.presetId === preset.presetId ? preset : p)),
    }));
    await companionRepos.savePreset(preset);
  },

  recenterCockpit(origin, yawDeg, source, epoch) {
    set((s) => ({
      anchor: {
        ...s.anchor,
        origin,
        yawDeg,
        source,
        refSpaceEpoch: epoch,
      },
    }));
  },

  handleRefSpaceEpoch(observedEpoch, postSample) {
    const anchor = get().anchor;
    if (!shouldReanchorOnRefSpaceEpoch(anchor, observedEpoch, Boolean(postSample))) {
      if (observedEpoch > anchor.refSpaceEpoch && anchor.source === 'default') {
        set((s) => ({ anchor: { ...s.anchor, refSpaceEpoch: observedEpoch } }));
      }
      return;
    }
    if (postSample) {
      set((s) => ({
        anchor: {
          ...s.anchor,
          origin: postSample.origin,
          yawDeg: postSample.yawDeg,
          source: 'system',
          refSpaceEpoch: observedEpoch,
        },
      }));
    }
  },

  setActiveInputTarget(target) {
    set({ activeInputTarget: target });
  },
}));

export function useLayoutStore<T>(selector: (s: SpatialLayoutState) => T): T {
  return useStore(layoutStore, selector);
}
