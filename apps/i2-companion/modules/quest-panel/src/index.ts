import { requireOptionalNativeModule } from 'expo';
import {
  correlateCompositorDiagnostics,
  type CorrelatedCompositorWindow,
  type QuestCompositorDiagnostics,
  type QuestCompositorLayerDiag,
} from '../../../src/features/quest-vr/quest-compositor-diag';

export { correlateCompositorDiagnostics };
export type { CorrelatedCompositorWindow, QuestCompositorDiagnostics, QuestCompositorLayerDiag };

// JS side of modules/quest-panel (Android only).
// v5 adds dynamic multi-window OpenXR quad slots (0..15) + 1 dedicated overlay slot,
// OpenXR runtime capability reporting, and render-thread xrEndFrame diagnostics.
export interface QuestPanelCapabilities {
  available: boolean;
  version: number;
  poolCapacity: number;
  maxLayerCount: number;
  maxWindowLayers: number;
  maxSwapchainWidth: number;
  maxSwapchainHeight: number;
  reservedNonWindowLayers: number;
  activeWindowCount: number;
  activeSwapchainCount: number;
  activeSwapchainBytes: number;
  memoryBudgetBytes: number;
  lastEndFrameResult: number;
  lastSwapchainResult: number;
  sessionGeneration?: number;
  initialized: boolean;
  systemName: string;
}

export type QuestCompositorCapabilities = QuestPanelCapabilities;

export interface QuestPanelNative {
  isAvailable(): boolean;
  refSpaceEpoch?(): number;
  getCapabilities(): QuestPanelCapabilities;
  getDiagnostics?(): QuestCompositorDiagnostics;
  setDiagnosticsEnabled?(enabled: boolean): void;
  registerFont?(name: string, uri: string): void;
  // Multi-window OpenXR quad slots (0..15)
  openWindow(slotIndex: number): number;
  statusWindow(slotIndex: number, id: number): number;
  drawWindow(slotIndex: number, id: number, specJson: string): void;
  poseWindow(
    slotIndex: number,
    id: number,
    widthM: number,
    heightM: number,
    pose: number[],
    nodeTag?: string | null
  ): void;
  hideWindow(slotIndex: number, id: number): void;
  hideAllWindows(): void;
  // Dedicated floating overlay slot (slot 16)
  openOverlay?(): number;
  statusOverlay?(id: number): number;
  drawOverlay?(id: number, specJson: string): void;
  hideOverlay?(id: number): void;
  // Legacy aliases kept for compatibility
  open(): number;
  status(id: number): number;
  draw(id: number, specJson: string): void;
  hide(id: number): void;
  openTitle?(): number;
  statusTitle?(id: number): number;
  drawTitle?(id: number, specJson: string): void;
  hideTitle?(id: number): void;
  openSlot?(slotName: string): number;
  statusSlot?(slotName: string, id: number): number;
  drawSlot?(slotName: string, id: number, specJson: string): void;
  poseSlot?(slotName: string, id: number, pose: number[]): void;
  hideSlot?(slotName: string, id: number): void;
  hideAllSlots?(): void;
}

const native = requireOptionalNativeModule<QuestPanelNative>('QuestPanel');

/** Null when the module is not linked, for example outside Android. */
export const questPanelNative: QuestPanelNative | null = native;

/** True when running inside the patched Quest OpenXR renderer (v5). */
export function questPanelAvailable(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

export function getQuestPanelCapabilities(): QuestPanelCapabilities | null {
  try {
    return native?.getCapabilities() ?? null;
  } catch {
    return null;
  }
}

export function getQuestCompositorDiagnostics(): QuestCompositorDiagnostics | null {
  try {
    return native?.getDiagnostics?.() ?? null;
  } catch {
    return null;
  }
}
