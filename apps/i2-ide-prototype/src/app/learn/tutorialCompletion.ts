import type { LearnTutorialId } from "./LearnModal";

export const COMPLETED_TUTORIALS_STORAGE_KEY = "i2.learn.completedTutorials";

const VALID_TUTORIAL_IDS: readonly LearnTutorialId[] = [
  "meet-infie",
  "project-session",
  "widgets",
  "generate",
  "import",
];

function isValidTutorialId(value: unknown): value is LearnTutorialId {
  return typeof value === "string" && (VALID_TUTORIAL_IDS as readonly string[]).includes(value);
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Reads persisted tutorial completions from storage. Invalid or unavailable storage yields an empty set. */
export function readCompletedTutorials(
  storage: Pick<Storage, "getItem"> | null = defaultStorage(),
): Set<LearnTutorialId> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(COMPLETED_TUTORIALS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(isValidTutorialId));
  } catch {
    return new Set();
  }
}

/** Persists completed tutorial IDs without throwing when storage is unavailable. */
export function writeCompletedTutorials(
  completed: ReadonlySet<LearnTutorialId>,
  storage: Pick<Storage, "setItem"> | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(COMPLETED_TUTORIALS_STORAGE_KEY, JSON.stringify([...completed]));
  } catch {
    /* storage unavailable */
  }
}

/** Returns a new set including `id` (leaving the original untouched). */
export function markTutorialCompleted(
  completed: ReadonlySet<LearnTutorialId>,
  id: LearnTutorialId,
): Set<LearnTutorialId> {
  if (completed.has(id)) return new Set(completed);
  const next = new Set(completed);
  next.add(id);
  return next;
}

/**
 * Action label shown in Learn: Meet Infie is always "Replay"; every other tutorial
 * says "Replay" only after completion and "Start" before then (including after early exit).
 */
export function tutorialActionLabel(
  id: LearnTutorialId,
  completed: ReadonlySet<LearnTutorialId>,
): "Start" | "Replay" {
  return id === "meet-infie" || completed.has(id) ? "Replay" : "Start";
}
