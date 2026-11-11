// Shared choreography timings for the Infie onboarding tutorial.
// Used by both OnboardingStage (cue timers) and App (Home slide, gallery open,
// ambient background) so the sequenced motions stay in lockstep.
import { BEAT_ORDER, OnboardingBeat } from "./revealLedger";

/** B03: 220ms entrance + a full 1000ms hold before "What a noob." auto-follows. */
export const B03_NOOB_TIMER_MS = 1220;

/** B06: no playback progress by then → fall back to the still PNG presentation. */
export const B06_VIDEO_START_WATCHDOG_MS = 3000;
/** B06: once playing, no media-time progress for this long (tab visible) → still PNG fallback. */
export const B06_VIDEO_STALL_WATCHDOG_MS = 4000;
/** B06: minimum time a still device PNG (reduced motion / failed video) stays up before the next device. */
export const B06_STILL_MIN_DWELL_MS = 2600;
/** B06 Turn 4: Infie glides back to center after the device array retires. */
export const B06_RECENTER_MS = 550;
/** B06: gap between Infie and whatever floats beside her. */
export const B06_BESIDE_GAP_PX = 24;

/** B12: bridge line is readable before the conversation slides left. */
export const B12_BRIDGE_READ_MS = 1000;
/** B12: conversation slide duration (slow, smooth glide). */
export const B12_SLIDE_MS = 1350;
/** B12: gentle ease-in-out so the glide starts and settles softly. */
export const B12_SLIDE_EASE = [0.45, 0, 0.25, 1] as const;
/** B12: pause after the chat lands before anything else happens (Active Projects). */
export const B12_LANDED_DWELL_MS = 1500;
/** B12: Active Projects entrance duration. */
export const B12_PROJECTS_FADE_MS = 700;

/** B18: header Widgets gallery opens shortly after the Library line. */
export const B18_GALLERY_OPEN_DELAY_MS = 400;

/** Before the chat docks, the action row + chat input float this far above the bottom edge. */
export const PREDOCK_BOTTOM_OFFSET = "14vh";

/**
 * Segue lines have no gate: they show for at least 0.5s, longer for longer lines
 * (~220ms per word, a comfortable reading pace).
 */
export function segueDwellMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(500, Math.round(words * 220));
}

/**
 * Ambient background progress: pure black at B00, a little more of the normal
 * i² background with every beat, fully normal from B12 (Home comes into view).
 */
export function ambientProgressForBeat(beat: OnboardingBeat): number {
  const idx = BEAT_ORDER.indexOf(beat);
  const homeIdx = BEAT_ORDER.indexOf("B12");
  if (idx < 0 || homeIdx <= 0) return 1;
  return Math.max(0, Math.min(1, idx / homeIdx));
}
