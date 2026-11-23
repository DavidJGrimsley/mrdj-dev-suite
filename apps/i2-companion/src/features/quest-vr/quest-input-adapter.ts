import type { QuestInputBatch, QuestInputNative } from '../../../modules/quest-input/src';
import type { Vec3 } from '../spatial/cockpit-math.ts';

export const QUEST_TRIGGER_SOURCES = [1, 4] as const;
export const HEAD_GAZE_SOURCE_ID = 12;

export function isAcceptedControllerRaySource(source: number): boolean {
  return source === 1 || source === 4;
}

export type Quat4 = readonly [number, number, number, number];

export interface QuestHandSample {
  validPose: boolean;
  aimPosition: Vec3 | null;
  aimOrientation: Quat4 | null;
  aimDirection: Vec3 | null;
  triggerValue: number;
  squeezeValue: number;
  stickX: number;
  stickY: number;
  primaryDown: boolean;
  secondaryDown: boolean;
  menuDown: boolean;
}

export interface QuestRawSampleFrame {
  seq: number;
  generation: number;
  refSpaceEpoch: number;
  live: boolean;
  actionsReady: boolean;
  left: QuestHandSample;
  right: QuestHandSample;
}

export interface QuestInputEdges {
  trackingLostSustained: boolean;
  rightStickScrollDelta: number;
  gripHeldRight: boolean;
  gripHeldLeft: boolean;
  triggerPressed: boolean;
  secondaryDismissEdge: boolean;
}

const INTS_HEADER = 5;
const INTS_PER_HAND = 5;
const FLOATS_PER_HAND = 17;

/**
 * Computes controller aim forward vector (-Z rotated by quaternion [qx, qy, qz, qw]).
 */
export function forwardFromQuat([qx, qy, qz, qw]: Quat4): Vec3 {
  const dx = -2 * (qw * qy + qx * qz);
  const dy = 2 * (qw * qx - qy * qz);
  const dz = -1 + 2 * (qx * qx + qy * qy);
  const len = Math.hypot(dx, dy, dz) || 1;
  return [dx / len || 0, dy / len || 0, dz / len || 0];
}

export function decodeLatestRawSample(batch: QuestInputBatch): QuestRawSampleFrame | null {
  if (!batch.available || !batch.count || batch.count <= 0) return null;
  const idx = batch.count - 1;
  const seq = batch.seq?.[idx] ?? batch.latestSeq ?? 0;
  const ints = batch.ints ?? [];
  const floats = batch.floats ?? [];
  const intBase = idx * (INTS_HEADER + 2 * INTS_PER_HAND);
  const floatBase = idx * (2 * FLOATS_PER_HAND);
  if (ints.length < intBase + INTS_HEADER + 2 * INTS_PER_HAND) return null;
  if (floats.length < floatBase + 2 * FLOATS_PER_HAND) return null;

  const parseHand = (h: 0 | 1): QuestHandSample => {
    const iOff = intBase + INTS_HEADER + h * INTS_PER_HAND;
    const fOff = floatBase + h * FLOATS_PER_HAND;
    const locateResult = ints[iOff];
    const locationFlags = ints[iOff + 1];
    const activeBits = ints[iOff + 3];
    const buttonBits = ints[iOff + 4];
    const validPose = locateResult === 0 && (locationFlags & 0x3) !== 0 && (activeBits & 0x1) !== 0;
    const px = floats[fOff];
    const py = floats[fOff + 1];
    const pz = floats[fOff + 2];
    const qx = floats[fOff + 3];
    const qy = floats[fOff + 4];
    const qz = floats[fOff + 5];
    const qw = floats[fOff + 6];
    const hasFinitePose =
      validPose &&
      Number.isFinite(px) &&
      Number.isFinite(py) &&
      Number.isFinite(pz) &&
      Number.isFinite(qw);
    const aimOrientation: Quat4 | null = hasFinitePose ? [qx, qy, qz, qw] : null;
    return {
      validPose,
      aimPosition: hasFinitePose ? [px, py, pz] : null,
      aimOrientation,
      aimDirection: aimOrientation ? forwardFromQuat(aimOrientation) : null,
      triggerValue: floats[fOff + 13] ?? 0,
      squeezeValue: floats[fOff + 14] ?? 0,
      stickX: floats[fOff + 15] ?? 0,
      stickY: floats[fOff + 16] ?? 0,
      primaryDown: (buttonBits & 0x1) !== 0,
      secondaryDown: (buttonBits & 0x2) !== 0,
      menuDown: (buttonBits & 0x4) !== 0,
    };
  };

  return {
    seq,
    generation: ints[intBase + 3] ?? batch.generation ?? 0,
    refSpaceEpoch: ints[intBase + 4] ?? 0,
    live: Boolean(batch.live),
    actionsReady: ints[intBase + 2] === 1 || Boolean(batch.actionsReady),
    left: parseHand(0),
    right: parseHand(1),
  };
}

/**
 * Selects the raw OpenXR hand sample corresponding to a Viro input source ID:
 * Viro OpenXR controller source 1 = primary/right controller (typically), source 4 = secondary/left.
 * Falls back gracefully to whichever hand is currently tracking with higher trigger/pose validity.
 */
export function selectHandForSource(
  frame: QuestRawSampleFrame | null,
  source?: number
): QuestHandSample | null {
  if (!frame) return null;
  if (source === 4 && frame.left.validPose) return frame.left;
  if (source === 1 && frame.right.validPose) return frame.right;
  if (frame.right.validPose) return frame.right;
  if (frame.left.validPose) return frame.left;
  return null;
}

export class QuestRawInputTracker {
  private afterSeq = 0;
  private trackingLostSinceMs: number | null = null;
  private prevTriggerDown = false;
  private prevDismissDown = false;

  reset(): void {
    this.trackingLostSinceMs = null;
    this.prevTriggerDown = false;
    this.prevDismissDown = false;
  }

  poll(
    native: QuestInputNative | null,
    nowMs = Date.now(),
    sustainedLossThresholdMs = 240
  ): { frame: QuestRawSampleFrame | null; edges: QuestInputEdges } {
    if (!native?.isAvailable?.()) {
      return {
        frame: null,
        edges: {
          trackingLostSustained: false,
          rightStickScrollDelta: 0,
          gripHeldRight: false,
          gripHeldLeft: false,
          triggerPressed: false,
          secondaryDismissEdge: false,
        },
      };
    }

    const batch = native.read(this.afterSeq);
    const frame = decodeLatestRawSample(batch);
    if (frame) {
      this.afterSeq = frame.seq;
    }

    const anyTracked = frame ? frame.left.validPose || frame.right.validPose : false;
    if (!anyTracked) {
      if (this.trackingLostSinceMs === null) {
        this.trackingLostSinceMs = nowMs;
      }
    } else {
      this.trackingLostSinceMs = null;
    }

    const trackingLostSustained =
      this.trackingLostSinceMs !== null &&
      nowMs - this.trackingLostSinceMs >= sustainedLossThresholdMs;

    const triggerNow = frame
      ? frame.right.triggerValue > 0.72 || frame.left.triggerValue > 0.72
      : false;
    const triggerPressed = triggerNow && !this.prevTriggerDown;
    this.prevTriggerDown = triggerNow;

    const dismissNow = frame ? frame.right.secondaryDown || frame.left.menuDown : false;
    const secondaryDismissEdge = dismissNow && !this.prevDismissDown;
    this.prevDismissDown = dismissNow;

    const stickY = frame ? frame.right.stickY : 0;
    const rightStickScrollDelta = Math.abs(stickY) > 0.18 ? -stickY * 26 : 0;

    return {
      frame,
      edges: {
        trackingLostSustained,
        rightStickScrollDelta,
        gripHeldRight: Boolean(frame && frame.right.squeezeValue > 0.65),
        gripHeldLeft: Boolean(frame && frame.left.squeezeValue > 0.65),
        triggerPressed,
        secondaryDismissEdge,
      },
    };
  }
}
