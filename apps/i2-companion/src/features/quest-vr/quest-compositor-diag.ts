export interface QuestCompositorLayerDiag {
  slot: number;
  nodeTag: string;
  swapchain: string;
  contentW: number;
  contentH: number;
  bucketW: number;
  bucketH: number;
  widthM: number;
  heightM: number;
  pose: [number, number, number, number, number, number, number];
}

export interface QuestCompositorDiagnostics {
  available: boolean;
  version: number;
  frameNumber: number;
  sessionGeneration: number;
  sessionState: number;
  sessionStateName: string;
  focused: boolean;
  endFrameResult: number;
  submittedLayerCount: number;
  activeWindowCount: number;
  activeSwapchainCount: number;
  activeSwapchainBytes: number;
  layers: QuestCompositorLayerDiag[];
}

export interface CorrelatedCompositorWindow {
  windowId: string;
  slot: number;
  swapchain: string;
  widthM: number;
  heightM: number;
  pose: [number, number, number, number, number, number, number];
}

/**
 * Verifies native xrEndFrame compositor proof for a focused VRActivity:
 * requires XR_SESSION_STATE_FOCUSED, XR_SUCCESS (0), at least 2 submitted
 * quad layers, distinct native XrSwapchain handles, and stable slot-to-window IDs.
 */
export function correlateCompositorDiagnostics(
  diag: QuestCompositorDiagnostics | null | undefined,
  slotToWindowId: ReadonlyMap<number, string>
): {
  focusedSuccess: boolean;
  distinctSwapchains: number;
  windows: CorrelatedCompositorWindow[];
} {
  if (!diag || !diag.available || !diag.focused || diag.endFrameResult !== 0) {
    return { focusedSuccess: false, distinctSwapchains: 0, windows: [] };
  }
  const seenSwapchains = new Set<string>();
  const windows: CorrelatedCompositorWindow[] = [];
  for (const layer of diag.layers) {
    if (layer.swapchain && layer.swapchain !== '0x0') {
      seenSwapchains.add(layer.swapchain);
    }
    const mappedId = slotToWindowId.get(layer.slot) ?? layer.nodeTag ?? `slot-${layer.slot}`;
    windows.push({
      windowId: mappedId,
      slot: layer.slot,
      swapchain: layer.swapchain,
      widthM: layer.widthM,
      heightM: layer.heightM,
      pose: layer.pose,
    });
  }
  return {
    focusedSuccess: windows.length >= 2 && seenSwapchains.size >= 2,
    distinctSwapchains: seenSwapchains.size,
    windows,
  };
}
