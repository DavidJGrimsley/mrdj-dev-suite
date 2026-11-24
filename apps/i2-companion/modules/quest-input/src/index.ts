import { requireOptionalNativeModule } from 'expo';

// JS side of modules/quest-input (Android only). One synchronous read returns the
// raw controller samples recorded since `afterSeq`; see quest-input-source.ts.
export interface QuestInputBatch {
  available: boolean;
  error?: string;
  version?: number;
  /** Renderer session the samples belong to; changes on every VR entry. */
  generation?: number;
  live?: boolean;
  actionsReady?: boolean;
  latestSeq?: number;
  oldestSeq?: number;
  published?: number;
  framesWithoutInput?: number;
  rejected?: number;
  /** CLOCK_MONOTONIC at read time, ns from originMonotonicNs; null before the first sample. */
  nowNs?: number | null;
  /** Absolute int64 origins as decimal strings, for logs only. */
  originDisplayTimeNs?: string | null;
  originMonotonicNs?: string | null;
  capacity?: number;
  count?: number;
  seq?: number[];
  /** OpenXR XrTime domain, ns from originDisplayTimeNs. */
  displayTimeNs?: number[];
  /** CLOCK_MONOTONIC domain, ns from originMonotonicNs. */
  capturedNs?: number[];
  ints?: number[];
  floats?: number[];
}

export interface QuestInputNative {
  isAvailable(): boolean;
  setMarkersEnabled?(enabled: boolean): boolean;
  read(afterSeq: number): QuestInputBatch;
  /** OpenXR interaction profile paths, left then right; empty strings until bound. */
  profiles(): string[];
  openDiagnostics?(): number;
  statusDiagnostics?(owner: number): number;
  drawDiagnostics?(owner: number, specJson: string): void;
  patchDiagnostics?(owner: number, patchJson: string): void;
  hideDiagnostics?(owner: number): void;
}

const native = requireOptionalNativeModule<QuestInputNative>('QuestInput');

/** Null when the module is not linked, for example outside Android. */
export const questInputNative: QuestInputNative | null = native;

/** True only with the patched renderer that carries the input sampler (0003). */
export function questInputAvailable(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}
