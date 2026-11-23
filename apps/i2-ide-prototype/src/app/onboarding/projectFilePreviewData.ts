// B09 (info.md / todo.md): sample content for ProjectFilePreview. Kept apart from the component
// so tests and the stage can read the same example without rendering anything.
// The sample project ("Sprout") is deliberately tiny and familiar so the file's job reads at a glance.

export type ProjectFileKind = "info" | "todo";

/** How long each self-running step stays on screen (matches the Stylist's unhurried pace). */
export const PROJECT_FILE_STEP_MS = 2100;

export const PROJECT_FILE_NAMES: Record<ProjectFileKind, string> = {
  info: "info.md",
  todo: "todo.md",
};

// ── info.md ──────────────────────────────────────────────────────────────────────────────
export const INFO_TITLE = "Sprout";

export const INFO_LINES = [
  { id: "purpose", label: "Purpose", text: "Keep houseplants alive, zero guilt" },
  { id: "for", label: "For", text: "Busy plant parents, phone first" },
  { id: "must", label: "Must", text: "Offline · gentle nudges · no ads" },
] as const;

export type InfoLineId = (typeof INFO_LINES)[number]["id"];

/** Session Agent plans that Infie checks against info.md, one per step. */
export const INFO_CHECKS: ReadonlyArray<{
  session: string;
  verdict: "fits" | "flag";
  line: InfoLineId;
  note: string;
  infie: string;
}> = [
  { session: "watering-streaks", verdict: "fits", line: "purpose", note: "fits Purpose", infie: "On track. Carry on, Session Agent." },
  { session: "ad-banner", verdict: "flag", line: "must", note: "Must says no ads", infie: "Off-vision? I'll ask you first." },
  { session: "offline-cache", verdict: "fits", line: "must", note: "matches Must", infie: "Right on vision. Love it." },
];

/** Reduced motion rests on the most telling moment: Infie catching an off-vision plan. */
export const INFO_RESTING_STEP = 1;

// ── todo.md ──────────────────────────────────────────────────────────────────────────────
export type TodoSource = "you" | "github" | "info" | "infie";

export const TODO_SOURCE_LABELS: Record<TodoSource, string> = {
  you: "you",
  github: "GitHub #42",
  info: "info.md",
  infie: "Infie",
};

/** Items appear at `appearsAt` and (optionally) get checked off at `doneAt`. */
export const TODO_ITEMS: ReadonlyArray<{
  id: string;
  text: string;
  source: TodoSource;
  appearsAt: number;
  doneAt?: number;
}> = [
  { id: "reminders", text: "Gentle watering reminders", source: "you", appearsAt: 0, doneAt: 3 },
  { id: "photo", text: "Add a plant from a photo", source: "infie", appearsAt: 0 },
  { id: "double-ping", text: "Fix: reminder pings twice", source: "github", appearsAt: 1 },
  { id: "offline", text: "Cache plant list offline", source: "info", appearsAt: 2 },
];

/** One short "just now" event per step, in Infie's voice. */
export const TODO_EVENTS: ReadonlyArray<{ source: TodoSource; text: string }> = [
  { source: "you", text: "You dropped in an idea." },
  { source: "github", text: "Pulled in GitHub issue #42." },
  { source: "info", text: "info.md changed, so I added a todo." },
  { source: "infie", text: "Session merged. Checked off!" },
];

export const TODO_STEP_COUNT = TODO_EVENTS.length;

/** Reduced motion rests on the finished list: every source visible, one item done. */
export const TODO_RESTING_STEP = TODO_STEP_COUNT - 1;
