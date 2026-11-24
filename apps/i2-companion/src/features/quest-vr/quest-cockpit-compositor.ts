import type {
  QuestCompositorCapabilities,
  QuestPanelNative,
} from '../../../modules/quest-panel/src/index.ts';
import {
  computeWindowPixelSpec,
  getEffectiveWindowDimensions,
  sphericalToWorldPose,
  type CockpitAnchor,
} from '../spatial/cockpit-math.ts';
import type { SpatialWindow } from '../../types/widgets.ts';
import type { WindowSurfaceModel } from './quest-window-surface.ts';

export const QUEST_PANEL_FIRST_SHOW_TIMEOUT_MS = 850;
export const MAX_JSON_OPS_PER_SLOT = 2048;
export const MAX_PANEL_PX = 2048;
export const MAX_PANEL_METERS = 2.4;
export const MAX_WINDOW_POOL_CAPACITY = 16;

export interface CompositorWindowFrame {
  windowId: string;
  label: string;
  widthPx: number;
  heightPx: number;
  bucketWidthPx: number;
  bucketHeightPx: number;
  widthM: number;
  heightM: number;
  pose: readonly number[];
  nodeTag?: string;
  ops: Record<string, unknown>[];
}

export interface CompositorOverlayFrame {
  label: string;
  widthPx: number;
  heightPx: number;
  widthM: number;
  heightM: number;
  pose: readonly number[];
  ops: Record<string, unknown>[];
}

export interface CompositorSyncReport {
  status: 'ready' | 'pending' | 'slow' | 'unavailable';
  capabilities: QuestCompositorCapabilities;
  slotByWindowId: Record<string, number>;
  overflowWindowIds: string[];
}

export function getFallbackCapabilities(): QuestCompositorCapabilities {
  return {
    available: false,
    version: 5,
    poolCapacity: MAX_WINDOW_POOL_CAPACITY,
    maxLayerCount: MAX_WINDOW_POOL_CAPACITY,
    maxWindowLayers: MAX_WINDOW_POOL_CAPACITY - 2,
    maxSwapchainWidth: 2048,
    maxSwapchainHeight: 2048,
    reservedNonWindowLayers: 2,
    activeWindowCount: 0,
    activeSwapchainCount: 0,
    activeSwapchainBytes: 0,
    memoryBudgetBytes: 192 * 1024 * 1024,
    lastEndFrameResult: 0,
    lastSwapchainResult: 0,
    initialized: false,
    systemName: 'Quest OpenXR (unprobed)',
  };
}

/**
 * Viro scene materials used for non-overlapping window borders, handles, Batcave environment,
 * and the exact OpenXR compositor punch-through shader (`questCockpitHole`).
 *
 * Notice the rounded-rect SDF in `questCockpitHole`:
 * - Pixels outside the rounded corner radius execute `discard;` (leaving depth/color untouched
 *   so behind-window chrome or borders remain crisp instead of getting stamped with alpha 0).
 * - Pixels inside write `vec4(0.0)` with `blendMode: 'None'` and `cullMode: 'Back'`, punching
 *   a 1:1 transparent hole to the hardware OpenXR underlay quad.
 */
export function cockpitHoleMaterials() {
  const fragment = [
    'vec2 p = abs(v_texcoord - 0.5) - vec2(0.482, 0.482);',
    'float d = length(max(p, 0.0)) + min(max(p.x, p.y), 0.0) - 0.018;',
    'if (d > 0.0) discard;',
    '_output_color = vec4(0.0);',
  ].join(' ');
  return {
    questCockpitHole: {
      lightingModel: 'Constant' as const,
      blendMode: 'None' as const,
      diffuseColor: '#00000000',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
      shaderModifiers: { fragment },
    },
    questHoverOutline: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#2dd4bf',
      writesToDepthBuffer: false,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questDockBackdrop: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#101320',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBtnMint: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#abefa3',
    },
    questPanelBody: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#0b1220',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelBodyFocused: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#0f1c30',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelHeader: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#162238',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelHeaderDragging: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#0f766e',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelBorder: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#1e293b',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelBorderFocused: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#2dd4bf',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questPanelBorderHover: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#5eead4',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBtnDark: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#1e293b',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBtnTeal: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#14b8a6',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBtnAmber: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#d97706',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBtnRose: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#be123c',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBatcaveFloor: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#060a12',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBatcaveRing: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#115e59',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
    questBatcavePillar: {
      lightingModel: 'Constant' as const,
      diffuseColor: '#0c1526',
      writesToDepthBuffer: true,
      readsFromDepthBuffer: true,
      cullMode: 'Back' as const,
    },
  };
}

export function buildWindowNodeTag(slotIndex: number): string {
  return `quest-win:${slotIndex}`;
}

export function buildWindowPixelKey(frame: CompositorWindowFrame): string {
  const widthPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.widthPx)));
  const heightPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.heightPx)));
  const bucketWidthPx = Math.max(widthPx, Math.min(MAX_PANEL_PX, Math.round(frame.bucketWidthPx)));
  const bucketHeightPx = Math.max(
    heightPx,
    Math.min(MAX_PANEL_PX, Math.round(frame.bucketHeightPx))
  );
  const ops = frame.ops.slice(0, MAX_JSON_OPS_PER_SLOT);
  return JSON.stringify({
    label: frame.label,
    widthPx,
    heightPx,
    bucketWidthPx,
    bucketHeightPx,
    ops,
  });
}

export function buildWindowPoseKey(frame: CompositorWindowFrame): string {
  const widthM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.widthM.toFixed(4))));
  const heightM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.heightM.toFixed(4))));
  const pose = frame.pose.map((n) => Number(n.toFixed(5)));
  return JSON.stringify({ widthM, heightM, pose, nodeTag: frame.nodeTag ?? null });
}

export function clampWindowSpecJson(frame: CompositorWindowFrame): string {
  const widthPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.widthPx)));
  const heightPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.heightPx)));
  const bucketWidthPx = Math.max(widthPx, Math.min(MAX_PANEL_PX, Math.round(frame.bucketWidthPx)));
  const bucketHeightPx = Math.max(
    heightPx,
    Math.min(MAX_PANEL_PX, Math.round(frame.bucketHeightPx))
  );
  const widthM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.widthM.toFixed(4))));
  const heightM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.heightM.toFixed(4))));
  const pose = frame.pose.map((n) => Number(n.toFixed(5)));
  const ops = frame.ops.slice(0, MAX_JSON_OPS_PER_SLOT);

  return JSON.stringify({
    label: frame.label,
    widthPx,
    heightPx,
    bucketWidthPx,
    bucketHeightPx,
    widthM,
    heightM,
    pose,
    nodeTag: frame.nodeTag ?? null,
    ops:
      ops.length > 0
        ? ops
        : [
            {
              op: 'roundRect',
              x: 0,
              y: 0,
              width: widthPx,
              height: heightPx,
              radius: 24,
              color: '#0b1220',
            },
          ],
  });
}

export function clampOverlaySpecJson(frame: CompositorOverlayFrame): string {
  const widthPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.widthPx)));
  const heightPx = Math.max(64, Math.min(MAX_PANEL_PX, Math.round(frame.heightPx)));
  const widthM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.widthM.toFixed(4))));
  const heightM = Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.heightM.toFixed(4))));
  const pose = frame.pose.map((n) => Number(n.toFixed(5)));
  const ops = frame.ops.slice(0, MAX_JSON_OPS_PER_SLOT);
  return JSON.stringify({
    label: frame.label,
    widthPx,
    heightPx,
    bucketWidthPx: widthPx,
    bucketHeightPx: heightPx,
    widthM,
    heightM,
    pose,
    ops,
  });
}

export function buildCompositorFrameFromSurface(
  win: SpatialWindow,
  anchor: CockpitAnchor,
  surface: WindowSurfaceModel,
  slotIndex: number
): CompositorWindowFrame {
  const pose = sphericalToWorldPose(anchor, win).pose7;
  const dims = getEffectiveWindowDimensions(win);
  return {
    windowId: win.windowId,
    label: win.windowId,
    widthPx: surface.widthPx,
    heightPx: surface.heightPx,
    bucketWidthPx: surface.bucketWidthPx,
    bucketHeightPx: surface.bucketHeightPx,
    widthM: dims.widthM,
    heightM: dims.heightM,
    pose,
    nodeTag: buildWindowNodeTag(slotIndex),
    ops: surface.ops,
  };
}

interface SlotBinding {
  slotIndex: number;
  owner: number;
  pixelKey: string | null;
  poseKey: string | null;
}

/**
 * Multi-window OpenXR compositor controller bound to Viro's existing single OpenXR session.
 *
 * - Assigns each visible SpatialWindow a persistent hardware slot `0..maxWindowLayers-1`.
 * - Separates pixel updates (`drawWindow`) from spatial transform/physical-size updates (`poseWindow`),
 *   so smooth move & resize drags update OpenXR poses with zero bitmap re-rasterization until a
 *   quantized resolution threshold changes.
 * - Never fakes extra compositor layers past `capabilities.maxWindowLayers`; overflow windows are
 *   explicitly reported in `overflowWindowIds`.
 */
export class MultiWindowCompositorController {
  private readonly backend: QuestPanelNative | null;
  private bindingsByWindowId = new Map<string, SlotBinding>();
  private overlayOwner: number | null = null;
  private overlaySpecKey: string | null = null;
  private firstSubmitAt: number | null = null;
  private disposed = false;
  private lastCapabilities: QuestCompositorCapabilities = getFallbackCapabilities();

  constructor(backend: QuestPanelNative | null) {
    this.backend = backend;
  }

  isAvailable(): boolean {
    try {
      return Boolean(this.backend?.isAvailable?.());
    } catch {
      return false;
    }
  }

  queryCapabilities(): QuestCompositorCapabilities {
    if (!this.backend?.isAvailable?.()) {
      return this.lastCapabilities;
    }
    try {
      const queried = this.backend.getCapabilities?.();
      if (queried) {
        this.lastCapabilities = queried;
        return queried;
      }
    } catch {
      // keep last known capabilities
    }
    return this.lastCapabilities;
  }

  /**
   * Computes deterministic persistent slot assignments for a list of visible window IDs
   * without permuting existing open windows when another window closes.
   */
  assignSlots(visibleWindowIds: readonly string[]): {
    slotByWindowId: Record<string, number>;
    overflowWindowIds: string[];
    capabilities: QuestCompositorCapabilities;
  } {
    const caps = this.queryCapabilities();
    const hardMax = Math.max(
      1,
      Math.min(MAX_WINDOW_POOL_CAPACITY, caps.maxWindowLayers || MAX_WINDOW_POOL_CAPACITY)
    );

    const wantedSet = new Set(visibleWindowIds);
    // Release bindings for closed windows or slots outside hardware limit
    for (const [winId, binding] of Array.from(this.bindingsByWindowId.entries())) {
      if (!wantedSet.has(winId) || binding.slotIndex >= hardMax) {
        if (binding.owner > 0) {
          this.backend?.hideWindow?.(binding.slotIndex, binding.owner);
        }
        this.bindingsByWindowId.delete(winId);
      }
    }

    const usedSlots = new Set<number>();
    for (const binding of this.bindingsByWindowId.values()) {
      usedSlots.add(binding.slotIndex);
    }

    const slotByWindowId: Record<string, number> = {};
    const overflowWindowIds: string[] = [];

    for (const winId of visibleWindowIds) {
      const existing = this.bindingsByWindowId.get(winId);
      if (existing && existing.slotIndex < hardMax) {
        slotByWindowId[winId] = existing.slotIndex;
        continue;
      }

      let freeSlot = -1;
      for (let s = 0; s < hardMax; s++) {
        if (!usedSlots.has(s)) {
          freeSlot = s;
          break;
        }
      }

      if (freeSlot < 0) {
        overflowWindowIds.push(winId);
        continue;
      }

      usedSlots.add(freeSlot);
      this.bindingsByWindowId.set(winId, {
        slotIndex: freeSlot,
        owner: 0,
        pixelKey: null,
        poseKey: null,
      });
      slotByWindowId[winId] = freeSlot;
    }

    return { slotByWindowId, overflowWindowIds, capabilities: caps };
  }

  getSlotForWindow(windowId: string): number | undefined {
    return this.bindingsByWindowId.get(windowId)?.slotIndex;
  }

  presentWindows(
    windows: readonly {
      win: SpatialWindow;
      surface: WindowSurfaceModel;
    }[],
    anchor: CockpitAnchor,
    overlay: CompositorOverlayFrame | null,
    nowMs = Date.now()
  ): CompositorSyncReport {
    const caps = this.queryCapabilities();
    if (this.disposed || !this.isAvailable() || !this.backend) {
      return {
        status: 'unavailable',
        capabilities: caps,
        slotByWindowId: {},
        overflowWindowIds: windows.map((w) => w.win.windowId),
      };
    }

    const { slotByWindowId, overflowWindowIds } = this.assignSlots(
      windows.map((entry) => entry.win.windowId)
    );

    let anyReady = false;
    let anyActive = false;

    for (const entry of windows) {
      const slotIndex = slotByWindowId[entry.win.windowId];
      if (slotIndex === undefined) continue;
      const binding = this.bindingsByWindowId.get(entry.win.windowId);
      if (!binding) continue;

      if (binding.owner <= 0) {
        const opened = this.backend.openWindow?.(slotIndex) ?? -1;
        if (opened <= 0) continue;
        binding.owner = opened;
      }

      const frame = buildCompositorFrameFromSurface(entry.win, anchor, entry.surface, slotIndex);
      const pixelKey = buildWindowPixelKey(frame);
      const poseKey = buildWindowPoseKey(frame);

      if (binding.pixelKey !== pixelKey) {
        binding.pixelKey = pixelKey;
        binding.poseKey = poseKey;
        this.backend.drawWindow?.(slotIndex, binding.owner, clampWindowSpecJson(frame));
        if (this.firstSubmitAt === null) this.firstSubmitAt = nowMs;
      } else if (binding.poseKey !== poseKey) {
        binding.poseKey = poseKey;
        this.backend.poseWindow?.(
          slotIndex,
          binding.owner,
          Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.widthM.toFixed(4)))),
          Math.max(0.2, Math.min(MAX_PANEL_METERS, Number(frame.heightM.toFixed(4)))),
          frame.pose.map((n) => Number(n.toFixed(5))),
          frame.nodeTag ?? null
        );
      }

      anyActive = true;
      const st = this.backend.statusWindow?.(slotIndex, binding.owner) ?? 0;
      if (st === 1) anyReady = true;
    }

    if (overlay) {
      if (!this.overlayOwner || this.overlayOwner <= 0) {
        this.overlayOwner = this.backend.openOverlay?.() ?? -1;
      }
      if (this.overlayOwner > 0) {
        const overlayJson = clampOverlaySpecJson(overlay);
        if (this.overlaySpecKey !== overlayJson) {
          this.overlaySpecKey = overlayJson;
          this.backend.drawOverlay?.(this.overlayOwner, overlayJson);
        }
      }
    } else if (this.overlayOwner && this.overlayOwner > 0) {
      this.backend.hideOverlay?.(this.overlayOwner);
      this.overlaySpecKey = null;
    }

    let status: CompositorSyncReport['status'] = 'ready';
    if (anyActive && !anyReady) {
      if (
        this.firstSubmitAt !== null &&
        nowMs - this.firstSubmitAt > QUEST_PANEL_FIRST_SHOW_TIMEOUT_MS
      ) {
        status = 'slow';
      } else {
        status = 'pending';
      }
    }

    return {
      status,
      capabilities: this.queryCapabilities(),
      slotByWindowId,
      overflowWindowIds,
    };
  }

  hideAllOneFrameSafe(): void {
    this.backend?.hideAllWindows?.();
    if (this.overlayOwner && this.overlayOwner > 0) {
      this.backend?.hideOverlay?.(this.overlayOwner);
    }
    this.bindingsByWindowId.clear();
    this.overlayOwner = null;
    this.overlaySpecKey = null;
  }

  dispose(): void {
    this.disposed = true;
    this.hideAllOneFrameSafe();
  }
}

export function buildWindowSlotPixelHelper(
  win: SpatialWindow,
  totalVisibleWindows: number,
  maxSwapchainWidth = 2048,
  maxSwapchainHeight = 2048
) {
  const eff = getEffectiveWindowDimensions(win);
  return computeWindowPixelSpec({
    widthM: eff.widthM,
    heightM: eff.heightM,
    widgetCount: win.widgetIds.length,
    hasHighDensityContent: win.widgetIds.some(
      (id) => id === 'workspaceEnv' || id === 'explorer' || id === 'terminal' || id === 'git'
    ),
    totalVisibleWindows,
    maxSwapchainWidth,
    maxSwapchainHeight,
  });
}
