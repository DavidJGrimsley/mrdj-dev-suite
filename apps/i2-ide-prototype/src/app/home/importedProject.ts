// One sample import. Sessions use nine statuses App.tsx already renders.
// They are not navigable: Project Home and the shell raise the prototype limit.

export const IMPORT_PROJECT_ID = "field-notes";
export const IMPORT_PROJECT_NAME = "Field Notes";
export const IMPORT_FOLDER_LABEL = "field-notes/";
export const IMPORT_WORKSPACE_NAME = "field-notes-i2Workspace";

export const IMPORT_PURPOSE_QUESTION = "What is the purpose of this app?";

export const IMPORT_EXAMPLE_PURPOSE_ANSWER =
  "A private offline-first field notebook for capturing quick notes, photos, and markdown exports.";

export const IMPORT_SIMULATION_LINE =
  "In the full app, I send agents to scan your imported project, infer answers from the codebase, ask you to confirm what they found, and encourage you to elaborate. For this prototype I'm simulating the rest of the answers—try Generate a new project for the fuller experience of filling out info.md.";

export const IMPORT_FLAG_INTRO = "I flagged these possible sessions:";

export const IMPORT_START_LINE =
  "Starting them now. Nine sessions are active, each in a different state.";

export const IMPORT_PROJECT_INTRO_LINE =
  "Field Notes is onboarded with its tracked main branch, project documentation folder, and nine active sessions.";

export const IMPORT_TUTORIAL_ENDING_LINE =
  "That wraps up the Import project tutorial! Field Notes is show-only in this prototype—it illustrates multiple sessions running at once, each with multiple Session Agents coordinated by Infie.";

export const IMPORT_SCAN_STEPS = [
  "Reading the folder…",
  "Looking for an i² project folder…",
  "Reading the app manifest…",
  "Asking Infie what this app is for…",
] as const;

/** Statuses already defined on SessionStatus in App.tsx. Nine of the twelve. */
export const IMPORT_SESSION_STATUSES = [
  "READY",
  "CODING",
  "WAITING ON TEST",
  "NEEDS YOU",
  "REVIEW FIXES",
  "VERIFIED",
  "PR OPEN",
  "BLOCKED",
  "PAUSED",
] as const;

export type ImportSessionStatus = (typeof IMPORT_SESSION_STATUSES)[number];

export interface ImportedSessionSeed {
  id: string;
  name: string;
  branch: string;
  status: ImportSessionStatus;
  agents: number;
  agentDone: number;
  agentTotal: number;
  humanDone: number;
  humanTotal: number;
}

export const IMPORTED_SESSIONS: readonly ImportedSessionSeed[] = [
  { id: "fn-capture", name: "Capture quick notes", branch: "feat/quick-capture", status: "READY", agents: 1, agentDone: 0, agentTotal: 4, humanDone: 0, humanTotal: 2 },
  { id: "fn-sync", name: "Sync notebooks", branch: "feat/sync", status: "CODING", agents: 2, agentDone: 2, agentTotal: 6, humanDone: 0, humanTotal: 3 },
  { id: "fn-photos", name: "Photo attachments", branch: "feat/photos", status: "WAITING ON TEST", agents: 2, agentDone: 5, agentTotal: 8, humanDone: 1, humanTotal: 3 },
  { id: "fn-share", name: "Share a notebook", branch: "feat/share", status: "NEEDS YOU", agents: 1, agentDone: 4, agentTotal: 5, humanDone: 1, humanTotal: 4 },
  { id: "fn-offline", name: "Offline drafts", branch: "feat/offline", status: "REVIEW FIXES", agents: 2, agentDone: 3, agentTotal: 7, humanDone: 2, humanTotal: 2 },
  { id: "fn-search", name: "Search notes", branch: "feat/search", status: "VERIFIED", agents: 1, agentDone: 9, agentTotal: 9, humanDone: 3, humanTotal: 3 },
  { id: "fn-export", name: "Export markdown", branch: "feat/export-md", status: "PR OPEN", agents: 2, agentDone: 6, agentTotal: 6, humanDone: 2, humanTotal: 2 },
  { id: "fn-reminders", name: "Note reminders", branch: "feat/reminders", status: "BLOCKED", agents: 1, agentDone: 1, agentTotal: 5, humanDone: 0, humanTotal: 2 },
  { id: "fn-pins", name: "Pin favorites", branch: "feat/pins", status: "PAUSED", agents: 1, agentDone: 2, agentTotal: 4, humanDone: 1, humanTotal: 2 },
];

export const IMPORTED_PROJECT = {
  id: IMPORT_PROJECT_ID,
  name: IMPORT_PROJECT_NAME,
  desc: "Private notes that stay on this machine",
  framework: "Expo",
  sessions: IMPORTED_SESSIONS.length,
  ago: "Now",
  active: true as const,
  wired: true,
};

export const IMPORTED_FOLDERS = ["main", "feat/quick-capture", "project", "generated"] as const;

export const IMPORT_FLAG_MESSAGE = `${IMPORT_FLAG_INTRO} ${IMPORTED_SESSIONS.map((session) => session.name).join(", ")}.`;

export function isImportedProject(id: string | null | undefined): boolean {
  return id === IMPORT_PROJECT_ID;
}

export function isImportedSession(id: string | null | undefined): boolean {
  return IMPORTED_SESSIONS.some((session) => session.id === id);
}

export function importedSessionById(id: string): ImportedSessionSeed | undefined {
  return IMPORTED_SESSIONS.find((session) => session.id === id);
}
