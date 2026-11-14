// Chronological Experimemo walkthrough: a pure state machine plus its scripted content.
// Nothing here invokes a model, a build, git, Doctor, CI or a database; every message is scripted.
//
// Lifecycle: no project -> starter (after Jenny) -> scanning -> question -> schema-question
// -> planning -> plan-ready -> session -> PR review / wrap-up -> completion form -> cleanup -> cleaned-up project home.

import type { PreviewVersion, ProviderId, SessionTabId } from "./types.ts";

export const PROVIDERS: ProviderId[] = ["openai", "claude", "gemini"];

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
};

export const PROVIDER_TOPIC: Record<ProviderId, string> = {
  openai: "Schema & storage",
  claude: "New, Track & editor",
  gemini: "Photo capture",
};

export const SESSION_TAB_LABEL: Record<SessionTabId, string> = {
  infie: "Infie",
  openai: PROVIDER_TOPIC.openai,
  claude: PROVIDER_TOPIC.claude,
  gemini: PROVIDER_TOPIC.gemini,
};

export const SESSION_TAB_ACCESSIBLE_LABEL: Record<SessionTabId, string> = {
  infie: "Infie",
  openai: `${PROVIDER_TOPIC.openai} (${PROVIDER_LABEL.openai})`,
  claude: `${PROVIDER_TOPIC.claude} (${PROVIDER_LABEL.claude})`,
  gemini: `${PROVIDER_TOPIC.gemini} (${PROVIDER_LABEL.gemini})`,
};

export const SESSION_TAB_ORDER: SessionTabId[] = ["infie", "openai", "claude", "gemini"];

// ── Types ───────────────────────────────────────────────────────────────────

export type FlowRole = "infie" | "user" | ProviderId;
export type MessageKind = "plain" | "handoff" | "report" | "problem";

export interface FlowMessage {
  id: string;
  role: FlowRole;
  sender: string;
  text: string;
  kind?: MessageKind;
  badge?: string;
  target?: ProviderId;
  details?: string[];
}

type MessageDraft = Omit<FlowMessage, "id">;

export type HomeStage =
  | "starter"
  | "scanning"
  | "question"
  | "schema-question"
  | "planning"
  | "plan-ready"
  | "session"
  | "cleaned-up";

export type FlowSessionStatus =
  | "CODING"
  | "REVIEW FIXES"
  | "FIXING"
  | "NEEDS YOU"
  | "VERIFIED"
  | "PR OPEN"
  | "MERGED"
  | "COMPLETE";

export type TaskStatus = "pending" | "in_progress" | "needs_fix" | "completed";
export type WorkerPhase = "idle" | "locked" | "ready" | "running" | "done";
export type LessonStage = "none" | "form" | "approved";
export type WrapUpPhase = "none" | "ready" | "polling" | "green" | "sanity-check" | "merged";
export const SANITY_HUMAN_TEST_ID = "exp-human-sanity";
export const SANITY_HUMAN_TEST_LABEL = "Sanity check app after bug fixes";
export type CleanupPhase = "none" | "ready" | "confirm";
export type TaskGlowPhase = "idle" | "glowing" | "checked";

export interface SessionTask {
  id: string;
  provider: ProviderId;
  label: string;
}

export interface SessionTaskState extends SessionTask {
  status: TaskStatus;
  glowing: boolean;
}

export interface DiffRow {
  id: string;
  status: "A" | "M";
  name: string;
}

export interface HumanTestRow {
  id: string;
  text: string;
  done: boolean;
}

export interface WorkerState {
  phase: WorkerPhase;
  script: "main" | "fix";
  cursor: number;
}

export interface SessionFlowState {
  status: FlowSessionStatus;
  delegated: boolean;
  cameraFixed: boolean;
  triageCursor: number;
  triageDone: boolean;
  planMdNote: string | null;
  activeTab: SessionTabId;
  nudge: SessionTabId | null;
  nudgeNext: SessionTabId | null;
  infie: FlowMessage[];
  tabs: Record<ProviderId, FlowMessage[]>;
  workers: Record<ProviderId, WorkerState>;
  tasks: SessionTaskState[];
  taskGlowQueue: string[];
  taskGlowPhase: TaskGlowPhase;
  diffs: DiffRow[];
  humanTests: HumanTestRow[];
  tabDrafts: Record<SessionTabId, string>;
  workerLimitTab: ProviderId | null;
  reviewOpen: boolean;
  wrapUpPhase: WrapUpPhase;
  wrapUpCursor: number;
  presentedChanges: boolean;
  cleanupPhase: CleanupPhase;
  lesson: LessonStage;
  lessonSummary: string;
  lessonAction: string;
}

export interface Lane {
  seq: number;
  delay: number;
  action: FlowAction;
}

export interface FlowState {
  projectCreated: boolean;
  stage: HomeStage;
  projectPreviewVersion: PreviewVersion;
  archivedSessionCount: number;
  homeMessages: FlowMessage[];
  homeDraft: string;
  planCursor: number;
  planNotes: string[];
  session: SessionFlowState | null;
  nextId: number;
  laneSeq: number;
  lanes: {
    home: Lane | null;
    openai: Lane | null;
    claude: Lane | null;
    gemini: Lane | null;
    task: Lane | null;
  };
}

export type FlowAction =
  | { type: "RESET" }
  | { type: "CREATE_PROJECT" }
  | { type: "WHATS_NEXT" }
  | { type: "HOME_STEP" }
  | { type: "SET_HOME_DRAFT"; value: string }
  | { type: "SEND_HOME"; text: string }
  | { type: "START_SESSION" }
  | { type: "SET_TAB"; tab: SessionTabId }
  | { type: "DELEGATE" }
  | { type: "WORKER_STEP"; provider: ProviderId }
  | { type: "TRIAGE_STEP" }
  | { type: "TASK_GLOW_CHECK"; taskId: string }
  | { type: "TASK_GLOW_CLEAR"; taskId: string }
  | { type: "FIX_PROBLEMS" }
  | { type: "SET_SESSION_DRAFT"; value: string }
  | { type: "SEND_SESSION"; text: string }
  | { type: "DISMISS_WORKER_LIMIT" }
  | { type: "TOGGLE_HUMAN_TEST"; id: string }
  | { type: "OPEN_PR" }
  | { type: "REVIEW_CHANGES" }
  | { type: "START_WRAP_UP" }
  | { type: "WRAP_UP_STEP" }
  | { type: "PRESENT_CHANGES" }
  | { type: "AUTO_MERGE" }
  | { type: "SUBMIT_LESSON"; summary: string; correctedAction: string }
  | { type: "REQUEST_CLEANUP" }
  | { type: "CONFIRM_CLEANUP" };

// ── Scripted content ────────────────────────────────────────────────────────

export const STARTER_MESSAGE =
  "This is what your app currently looks like. It's just a shell with the framework and setup in place.";
export const SCANNING_MESSAGE = "Scanning project files...";
export const QUESTION_MESSAGE =
  "The next batch of work would be to define the schema and possibly implement the screens in your app. Would you like to do one at a time or bundle it in one session?";
export const BUNDLE_ANSWER = "Bundle it!";
export const SCHEMA_QUESTION_MESSAGE =
  "Would you like to define the Experiment schema yourself, or should a model propose one?";
export const SCHEMA_PROPOSAL_ANSWER = "Let a model propose one.";
export const PLANNING_START_MESSAGE = "Starting ping-pong planning with your available providers.";
export const PLAN_COMPOSER_GHOST = "Change the plan";
export const PLAN_EDIT_ACK =
  "Noted. I've added that to the plan notes. Press Start Session whenever you're ready.";
export const STARTER_PROMPT_ACK =
  "Press What's Next and I'll look at the project before we plan.";

const homeMsg = (
  role: FlowRole,
  text: string,
  extra: Partial<MessageDraft> = {}
): MessageDraft => ({
  role,
  sender: role === "infie" ? "Infie" : role === "user" ? "You" : PROVIDER_LABEL[role],
  text,
  ...extra,
});

export const PLAN_SCRIPT: MessageDraft[] = [
  homeMsg(
    "openai",
    "Proposal (GPT-5.4 Mini): define an Experiment record — id, title, category, hypothesis, procedure, dataPlan, observations, results[], notes, conclusion, status, photos[], createdAt, updatedAt — stored offline in app:/data/experiments.json with a serialized write queue."
  ),
  homeMsg(
    "claude",
    "Screen flow (Claude Sonnet, reviewed by Claude Opus 5.5): keep screens scoped to New (form), Track (active and completed cards), Experiment editor (observations, dated results, status), and App Info. Screens depend on the settled Experiment record."
  ),
  homeMsg(
    "gemini",
    "Challenge (Gemini Flash): photo capture belongs in this bundled session, not at the end. Exact Android uses the 'device.camera purpose.camera' grant in app.ts with its explanation under 'purpose.camera' in strings/en.json, and web preview can test the photo picker control without claiming native device hardware."
  ),
  homeMsg(
    "openai",
    "Agreed on dependencies: Phase 1 locks the schema & local store, Phase 2 wires New, Track and the editor, and Phase 3 attaches photos & permission checks."
  ),
  homeMsg(
    "claude",
    "Claude Opus 5.5 architecture check confirms the split: schema first, then UI screens and photo attachment sharing one record type, followed by human testing in the web preview and PR wrap-up."
  ),
  homeMsg(
    "infie",
    "Synthesis (scripted demonstration, no live model calls): Claude Opus 5.5 handles architecture and review while GPT-5.4 Mini takes schema & storage, Claude Sonnet takes New, Track & editor, and Gemini Flash takes photo capture. I use the most efficient models available for grunt work while architecture and review will be done by the more capable models. No top-tier models (such as Astra or Fable) are required for this work. Press Start Session to begin, or tell me what to change."
  ),
];

export interface PlanSnapshot {
  schemaTitle: string;
  schemaFields: string[];
  storageDetail: string;
  screens: string[];
  cameraDetail: string;
  dependencies: string[];
  processDetail: string | null;
  models: {
    architectureReview: string;
    gruntWork: string[];
    policyNote: string;
  } | null;
}

export function getProgressivePlan(planCursor: number, planNotes: string[]): PlanSnapshot & { notes: string[] } {
  return {
    schemaTitle: planCursor >= 1 ? "Experiment record & local store" : "Drafting schema proposal…",
    schemaFields:
      planCursor >= 1
        ? [
            "id, title, category, status",
            "hypothesis, procedure, dataPlan",
            "observations, results[], notes, conclusion",
            "photos[], createdAt, updatedAt",
          ]
        : [],
    storageDetail:
      planCursor >= 1
        ? "Offline persistence in app:/data/experiments.json with serialized writes"
        : "Pending schema proposal",
    screens:
      planCursor >= 2
        ? ["New (create form)", "Track (active & completed)", "Experiment editor", "App Info"]
        : [],
    cameraDetail:
      planCursor >= 3
        ? "Photo capture via app.ts grant 'device.camera purpose.camera' + strings/en.json 'purpose.camera'; web preview exercises photo control"
        : "",
    dependencies:
      planCursor >= 4
        ? [
            "1. Schema & local storage (Schema & storage)",
            "2. New, Track & editor screens (New, Track & editor)",
            "3. Photo capture & permission check (Photo capture)",
            "4. Web preview testing & PR wrap-up",
          ]
        : [],
    processDetail:
      planCursor >= 5
        ? "Proposal -> Challenge -> Architecture review -> Scripted synthesis (no live model calls)"
        : null,
    models:
      planCursor >= 6
        ? {
            architectureReview: "Claude Opus 5.5",
            gruntWork: [
              "GPT-5.4 Mini — Schema & storage",
              "Claude Sonnet — New, Track & editor",
              "Gemini Flash — Photo capture",
            ],
            policyNote:
              "Efficient models handle implementation grunt work; Claude Opus 5.5 handles architecture & review. No Astra or Fable required.",
          }
        : null,
    notes: planNotes,
  };
}

export const SESSION_NAME = "Experiment schema and screens";
export const SESSION_BRANCH = "session/experiment-schema-and-screens";
export const SESSION_GOAL =
  "Define the Experiment schema and local storage, build the New, Track and editor screens, and add photo capture.";

export const SESSION_TASKS: SessionTask[] = [
  { id: "task-schema", provider: "openai", label: "Define the Experiment schema and local storage" },
  { id: "task-screens", provider: "claude", label: "Build the New, Track and editor screens" },
  { id: "task-photos", provider: "gemini", label: "Add photo capture to experiments" },
];

export const HUMAN_TESTS: Array<{ id: string; text: string }> = [
  { id: "exp-human-1", text: "Create an experiment from New in the web preview" },
  { id: "exp-human-2", text: "Find it in Track and edit it" },
  { id: "exp-human-3", text: "Try the photo attachment control in the web preview" },
];

const SESSION_INTRO: MessageDraft[] = [
  homeMsg(
    "infie",
    "Session started. I'll split the work across three topic tracks: Schema & storage (OpenAI), New, Track & editor (Claude), and Photo capture (Gemini). Press Continue and I'll hand each track its part."
  ),
];

const DELEGATION_INFIE: MessageDraft = homeMsg(
  "infie",
  "Handed off. Schema & storage starts first because the screens and photo capture build on its record. Open the Schema & storage tab to follow along."
);

const HANDOFFS: Record<ProviderId, MessageDraft> = {
  openai: homeMsg(
    "infie",
    "Define the Experiment record and its local storage: every field from the blueprint, dated results, and photo attachments. Report back when it's done.",
    { sender: "Infie → OpenAI", kind: "handoff", badge: "Handoff", target: "openai" }
  ),
  claude: homeMsg(
    "infie",
    "Build New, Track and the experiment editor on the shared record, in the field-notebook style. Wait for Schema & storage first, then report back.",
    { sender: "Infie → Claude", kind: "handoff", badge: "Handoff", target: "claude" }
  ),
  gemini: homeMsg(
    "infie",
    "Add photo capture to experiments and check camera permission readiness. Wait for New, Track & editor first, then report back.",
    { sender: "Infie → Gemini", kind: "handoff", badge: "Handoff", target: "gemini" }
  ),
};

const WAITING_TEXT: Record<ProviderId, string> = {
  openai: "",
  claude: "Waiting for Schema & storage before starting the screens.",
  gemini: "Waiting for New, Track & editor before starting photo capture.",
};

export interface WorkerStep {
  delay: number;
  messages: MessageDraft[];
  effect?: "report" | "flag" | "fixed";
}

const worker = (provider: ProviderId, text: string, extra: Partial<MessageDraft> = {}): MessageDraft =>
  homeMsg(provider, text, extra);

export const WORKER_SCRIPTS: Record<
  ProviderId,
  { main: WorkerStep[]; fix?: WorkerStep[] }
> = {
  openai: {
    main: [
      {
        delay: 700,
        messages: [
          worker(
            "openai",
            "Starting on the Experiment record: title, category, status, hypothesis, procedure, data plan, observations, notes, conclusion, dated results and photos."
          ),
        ],
      },
      {
        delay: 1000,
        messages: [
          worker(
            "openai",
            "Storing records on the device in app:/data/experiments.json so the app works offline, and serializing writes so a quick edit can't overwrite another."
          ),
        ],
      },
      {
        delay: 1000,
        messages: [
          worker("openai", "The schema and local storage are in place. Reporting back to Infie.", {
            badge: "Poked Infie",
          }),
        ],
        effect: "report",
      },
    ],
  },
  claude: {
    main: [
      {
        delay: 700,
        messages: [
          worker(
            "claude",
            "Building the New form and the Track list on the shared Experiment record. Track groups active and completed experiments."
          ),
        ],
      },
      {
        delay: 1000,
        messages: [
          worker(
            "claude",
            "Opening a card leads to the editor. Styling follows the blueprint: field notebook, green accents, light and dark themes."
          ),
        ],
      },
      {
        delay: 1000,
        messages: [
          worker("claude", "New, Track and the editor are ready. Reporting back to Infie.", {
            badge: "Poked Infie",
          }),
        ],
        effect: "report",
      },
    ],
  },
  gemini: {
    main: [
      {
        delay: 700,
        messages: [
          worker(
            "gemini",
            "Adding photo capture so an experiment can attach photos from the picker or camera control."
          ),
        ],
      },
      {
        delay: 1000,
        messages: [worker("gemini", "Checking Exact camera grant and Android permission strings.")],
      },
      {
        delay: 1100,
        messages: [
          worker(
            "gemini",
            "Problem: app.ts declares the grant 'device.camera purpose.camera', and Exact expects the camera permission rationale under the 'purpose.camera' key in strings/en.json rather than inline in the grant. The web preview exercises the photo control, while native Android hardware behavior still requires an actual Android build. Flagging this to Infie.",
            { kind: "problem", badge: "Problem found" }
          ),
        ],
        effect: "flag",
      },
    ],
    fix: [
      {
        delay: 700,
        messages: [
          worker(
            "gemini",
            "Keeping 'device.camera purpose.camera' in app.ts and placing the camera permission explanation under 'purpose.camera' in strings/en.json."
          ),
        ],
      },
      {
        delay: 1100,
        messages: [
          worker(
            "gemini",
            "The camera permission fix is in place and the web photo control checks out. Sent the fix summary to Infie for session completion submission.",
            { badge: "Poked Infie" }
          ),
        ],
        effect: "fixed",
      },
    ],
  },
};

const REPORTS: Record<"openai" | "claude", { report: MessageDraft; infie: MessageDraft }> = {
  openai: {
    report: homeMsg(
      "openai",
      "The Experiment schema and local storage are done.",
      {
        sender: "OpenAI → Infie",
        kind: "report",
        badge: "Report",
        details: ["Files: app.ts, experiment-store.ts"],
      }
    ),
    infie: homeMsg(
      "infie",
      "Schema & storage finished, so I'm updating that task and adding its files to the session diffs. New, Track & editor can start now. Open the New, Track & editor tab."
    ),
  },
  claude: {
    report: homeMsg("claude", "New, Track and the experiment editor are built on the shared record.", {
      sender: "Claude → Infie",
      kind: "report",
      badge: "Report",
      details: ["Files: app.contract"],
    }),
    infie: homeMsg(
      "infie",
      "New, Track & editor finished. I'm updating that task, adding the diffs, and switching the preview to the updated app. Photo capture is next. Open the Photo capture tab."
    ),
  },
};

export const CAMERA_PLAN_MD_BLOCK =
  "Camera permission fix: keep grant 'device.camera purpose.camera' in app.ts and define the user-facing rationale under 'purpose.camera' in strings/en.json; verify the photo picker control in the web preview without claiming native Android camera hardware.";

const GEMINI_PROBLEM_ALERT: MessageDraft[] = [
  homeMsg(
    "gemini",
    "Photo capture is wired, but the 'device.camera purpose.camera' grant in app.ts needs its explanation key 'purpose.camera' in strings/en.json.",
    {
      sender: "Gemini → Infie",
      kind: "problem",
      badge: "Problem found",
      details: ["Files: app.ts, strings/en.json"],
    }
  ),
  homeMsg(
    "infie",
    "Alert received. Consulting OpenAI and Claude to verify the Exact permission format and prepare a proposed fix before Gemini applies it."
  ),
];

const TRIAGE_SCRIPT: Array<{ delay: number; messages: MessageDraft[]; planMdNote?: string }> = [
  {
    delay: 750,
    messages: [
      homeMsg(
        "openai",
        "OpenAI triage: keep 'device.camera purpose.camera' in app.ts so the grant stays bound to the named purpose key."
      ),
      homeMsg(
        "claude",
        "Claude triage: add 'purpose.camera' to strings/en.json with a clear explanation, and keep human testing scoped to the web photo control since web preview cannot guarantee native Android hardware."
      ),
    ],
  },
  {
    delay: 800,
    planMdNote: CAMERA_PLAN_MD_BLOCK,
    messages: [
      homeMsg(
        "infie",
        "Proposed fix: (1) keep 'device.camera purpose.camera' in app.ts, (2) store the camera explanation under 'purpose.camera' in strings/en.json, and (3) exercise the photo picker in the web preview. I added this block to this session's plan.md for future review. Press Fix Problems to have Gemini apply it.",
        { badge: "Plan updated" }
      ),
    ],
  },
];

const FIX_HANDOFF: MessageDraft = homeMsg(
  "infie",
  "Apply the agreed fix: keep 'device.camera purpose.camera' in app.ts, add the 'purpose.camera' rationale to strings/en.json, verify the web photo control, and report back for session completion submission.",
  { sender: "Infie → Gemini", kind: "handoff", badge: "Handoff", target: "gemini" }
);

const FIX_INFIE_START: MessageDraft = homeMsg(
  "infie",
  "Sending the agreed camera fix to Photo capture (Gemini). Open the Photo capture tab to watch it."
);

const GEMINI_FIXED_INFIE: MessageDraft[] = [
  homeMsg(
    "gemini",
    "Added the 'purpose.camera' rationale to strings/en.json matching 'device.camera purpose.camera' in app.ts, verified the web photo control, and sent the fix summary to Infie for session completion submission.",
    {
      sender: "Gemini → Infie",
      kind: "report",
      badge: "Report",
      details: ["Files: app.ts, strings/en.json"],
    }
  ),
];

const ALL_AGENT_TASKS_DONE_NEEDS_HUMAN =
  "All Agent Tasks are done! Try the app in the glowing Web Preview and complete the Human Testing checklist on the right to continue.";
const ALL_AGENT_TASKS_DONE_VERIFIED =
  "All Agent Tasks and Human Testing checks are complete! Press Open PR when you're ready.";
const ALL_HUMAN_TESTS_DONE_MESSAGE =
  "All Human Testing items are checked off. Press Open PR to open the simulated pull request.";

export const PR_OPENED_MESSAGE =
  "Pull request opened for session/experiment-schema-and-screens into main. Press Review Changes to inspect the summary and diffs.";
export const REVIEW_OPENED_MESSAGE =
  "PR review opened. Press Wrap up to run the simulated Doctor check and poll PR comments and CI until green.";

const WRAP_UP_INTRO =
  "Starting Wrap up: I'll run Doctor, poll the PR for review comments and failing CI checks, keep fixing any issues until everything is green, and then offer Auto-merge or Present changes for an optional smoke check.";

const WRAP_UP_SCRIPT: Array<{ delay: number; message: MessageDraft; nextGreen?: boolean }> = [
  {
    delay: 850,
    message: homeMsg(
      "infie",
      "Simulated Doctor check passed with 0 errors. Polling PR checks and comments: CI flagged a permission-key lint check and a reviewer left 1 comment on the strings/en.json 'purpose.camera' wording."
    ),
  },
  {
    delay: 900,
    message: homeMsg(
      "infie",
      "Applied the simulated wording update, re-ran Doctor (0 errors) and CI checks, and resolved the review thread."
    ),
  },
  {
    delay: 850,
    nextGreen: true,
    message: homeMsg(
      "infie",
      "All checks and review threads are green. Choose Auto-merge to simulate merging the PR, or Present changes to inspect the app preview for a quick smoke check first.",
      { badge: "Checks green" }
    ),
  },
];

export const LESSON_SUMMARY =
  "Built the Experiment schema & offline store, New/Track/Editor screens, and photo capture; fixed Exact camera permission placement (app.ts grant + strings/en.json) and verified via web preview and PR wrap-up.";
export const LESSON_ACTION =
  "Define typed schema & offline storage before screens; place Exact 'purpose.camera' rationale in strings/en.json (not inline in the app.ts grant); test web controls in preview without claiming untested native hardware; poll Doctor, CI & review threads to green before merging.";

export const SESSION_EDIT_ACK = "Noted. I've folded that into the session.";

// ── State construction ──────────────────────────────────────────────────────

export function createInitialFlowState(): FlowState {
  return {
    projectCreated: false,
    stage: "starter",
    projectPreviewVersion: "v1",
    archivedSessionCount: 0,
    homeMessages: [],
    homeDraft: "",
    planCursor: 0,
    planNotes: [],
    session: null,
    nextId: 1,
    laneSeq: 0,
    lanes: { home: null, openai: null, claude: null, gemini: null, task: null },
  };
}

function withIds(state: FlowState, drafts: MessageDraft[]): { state: FlowState; messages: FlowMessage[] } {
  let nextId = state.nextId;
  const messages = drafts.map((d) => ({ ...d, id: `m${nextId++}` }));
  return { state: { ...state, nextId }, messages };
}

function setLane(
  state: FlowState,
  lane: keyof FlowState["lanes"],
  delay: number,
  action: FlowAction
): FlowState {
  const seq = state.laneSeq + 1;
  return { ...state, laneSeq: seq, lanes: { ...state.lanes, [lane]: { seq, delay, action } } };
}

function clearLane(state: FlowState, lane: keyof FlowState["lanes"]): FlowState {
  return { ...state, lanes: { ...state.lanes, [lane]: null } };
}

function createSession(): SessionFlowState {
  return {
    status: "CODING",
    delegated: false,
    cameraFixed: false,
    triageCursor: 0,
    triageDone: false,
    planMdNote: null,
    activeTab: "infie",
    nudge: null,
    nudgeNext: null,
    infie: [],
    tabs: { openai: [], claude: [], gemini: [] },
    workers: {
      openai: { phase: "idle", script: "main", cursor: 0 },
      claude: { phase: "idle", script: "main", cursor: 0 },
      gemini: { phase: "idle", script: "main", cursor: 0 },
    },
    tasks: SESSION_TASKS.map((t) => ({ ...t, status: "pending" as TaskStatus, glowing: false })),
    taskGlowQueue: [],
    taskGlowPhase: "idle",
    diffs: [],
    humanTests: HUMAN_TESTS.map((t) => ({ ...t, done: false })),
    tabDrafts: { infie: "", openai: "", claude: "", gemini: "" },
    workerLimitTab: null,
    reviewOpen: false,
    wrapUpPhase: "none",
    wrapUpCursor: 0,
    presentedChanges: false,
    cleanupPhase: "none",
    lesson: "none",
    lessonSummary: LESSON_SUMMARY,
    lessonAction: LESSON_ACTION,
  };
}

// ── Reducer helpers ─────────────────────────────────────────────────────────

function mapSession(
  state: FlowState,
  fn: (s: SessionFlowState) => SessionFlowState
): FlowState {
  if (!state.session) return state;
  return { ...state, session: fn(state.session) };
}

function appendInfie(state: FlowState, drafts: MessageDraft[]): FlowState {
  if (!state.session) return state;
  const { state: s1, messages } = withIds(state, drafts);
  return { ...s1, session: { ...s1.session!, infie: [...s1.session!.infie, ...messages] } };
}

function appendTab(state: FlowState, provider: ProviderId, drafts: MessageDraft[]): FlowState {
  if (!state.session) return state;
  const { state: s1, messages } = withIds(state, drafts);
  const session = s1.session!;
  return {
    ...s1,
    session: { ...session, tabs: { ...session.tabs, [provider]: [...session.tabs[provider], ...messages] } },
  };
}

function setTaskStatus(session: SessionFlowState, provider: ProviderId, status: TaskStatus): SessionFlowState {
  return { ...session, tasks: session.tasks.map((t) => (t.provider === provider ? { ...t, status } : t)) };
}

function setTaskById(
  session: SessionFlowState,
  taskId: string,
  patch: Partial<Pick<SessionTaskState, "status" | "glowing">>
): SessionFlowState {
  return { ...session, tasks: session.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) };
}

function addDiffs(session: SessionFlowState, rows: Array<Omit<DiffRow, "id">>): SessionFlowState {
  const existing = new Set(session.diffs.map((d) => d.name));
  const fresh = rows
    .filter((r) => !existing.has(r.name))
    .map((r) => ({ ...r, id: `diff-${r.name}` }));
  return { ...session, diffs: [...session.diffs, ...fresh] };
}

/** Point the viewer at the tab that has news; if they're already reading Infie, skip straight to next. */
function nudgeAfterReport(session: SessionFlowState, next: SessionTabId | null): SessionFlowState {
  if (session.activeTab === "infie") return { ...session, nudge: next, nudgeNext: null };
  return { ...session, nudge: "infie", nudgeNext: next };
}

function enqueueTaskGlow(state: FlowState, taskId: string): FlowState {
  const session = state.session;
  if (!session) return state;
  const alreadyQueued = session.taskGlowQueue.includes(taskId);
  const queue = alreadyQueued ? session.taskGlowQueue : [...session.taskGlowQueue, taskId];
  if (session.taskGlowPhase === "idle") {
    const next = mapSession(state, (s) => ({
      ...setTaskById(s, taskId, { glowing: true }),
      taskGlowQueue: queue,
      taskGlowPhase: "glowing",
    }));
    return setLane(next, "task", 500, { type: "TASK_GLOW_CHECK", taskId });
  }
  return mapSession(state, (s) => ({ ...s, taskGlowQueue: queue }));
}

function startWorkerIfReady(state: FlowState, provider: ProviderId): FlowState {
  const session = state.session;
  if (!session) return state;
  const w = session.workers[provider];
  if (w.phase !== "ready") return state;
  let next = mapSession(state, (s) => {
    const withWorker = {
      ...s,
      workers: { ...s.workers, [provider]: { ...w, phase: "running" as WorkerPhase, cursor: 0 } },
      nudge: s.nudge === provider ? null : s.nudge,
    };
    return w.script === "main" ? setTaskStatus(withWorker, provider, "in_progress") : withWorker;
  });
  const steps = WORKER_SCRIPTS[provider][w.script] ?? [];
  next = setLane(next, provider, steps[0]?.delay ?? 600, { type: "WORKER_STEP", provider });
  return next;
}

function applyWorkerEffect(
  state: FlowState,
  provider: ProviderId,
  effect: NonNullable<WorkerStep["effect"]>
): FlowState {
  if (effect === "report" && (provider === "openai" || provider === "claude")) {
    const report = REPORTS[provider];
    const nextProvider: ProviderId = provider === "openai" ? "claude" : "gemini";
    const taskId = provider === "openai" ? "task-schema" : "task-screens";
    let next = appendInfie(state, [report.report, report.infie]);
    next = mapSession(next, (s) => {
      let session =
        provider === "openai"
          ? addDiffs(s, [
              { status: "A", name: "app.ts" },
              { status: "A", name: "experiment-store.ts" },
            ])
          : addDiffs(s, [{ status: "M", name: "app.contract" }]);
      session = {
        ...session,
        workers: {
          ...session.workers,
          [nextProvider]: { phase: "ready" as WorkerPhase, script: "main" as const, cursor: 0 },
        },
      };
      return nudgeAfterReport(session, nextProvider);
    });
    if (provider === "claude") {
      next = { ...next, projectPreviewVersion: "v2" };
    }
    return enqueueTaskGlow(next, taskId);
  }

  if (effect === "flag" && provider === "gemini") {
    let next = appendInfie(state, GEMINI_PROBLEM_ALERT);
    next = mapSession(next, (s) => {
      let session = setTaskStatus(s, "gemini", "needs_fix");
      session = addDiffs(session, [{ status: "A", name: "experiment-photos.ts" }]);
      session = { ...session, status: "REVIEW FIXES", triageCursor: 0, triageDone: false };
      return nudgeAfterReport(session, null);
    });
    return setLane(next, "home", TRIAGE_SCRIPT[0].delay, { type: "TRIAGE_STEP" });
  }

  if (effect === "fixed" && provider === "gemini") {
    let next = appendInfie(state, GEMINI_FIXED_INFIE);
    next = mapSession(next, (s) => {
      const session = addDiffs(s, [{ status: "M", name: "strings/en.json" }]);
      return nudgeAfterReport(session, null);
    });
    return enqueueTaskGlow(next, "task-photos");
  }

  return state;
}

export function areAllAgentTasksDone(session: SessionFlowState): boolean {
  return session.tasks.length > 0 && session.tasks.every((t) => t.status === "completed");
}

export function areAllHumanTestsDone(session: SessionFlowState): boolean {
  return session.humanTests.length > 0 && session.humanTests.every((t) => t.done);
}

// ── Reducer ─────────────────────────────────────────────────────────────────

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "RESET":
      return createInitialFlowState();

    case "CREATE_PROJECT": {
      const base = createInitialFlowState();
      const { state: s1, messages } = withIds(
        { ...base, projectCreated: true, projectPreviewVersion: "v1" },
        [homeMsg("infie", STARTER_MESSAGE)]
      );
      return { ...s1, homeMessages: messages };
    }

    case "WHATS_NEXT": {
      if (!state.projectCreated || state.stage !== "starter") return state;
      const { state: s1, messages } = withIds(state, [homeMsg("infie", SCANNING_MESSAGE)]);
      const next = { ...s1, stage: "scanning" as HomeStage, homeMessages: [...s1.homeMessages, ...messages] };
      return setLane(next, "home", 1000, { type: "HOME_STEP" });
    }

    case "HOME_STEP": {
      if (state.stage === "scanning") {
        const { state: s1, messages } = withIds(state, [homeMsg("infie", QUESTION_MESSAGE)]);
        return clearLane(
          { ...s1, stage: "question", homeDraft: BUNDLE_ANSWER, homeMessages: [...s1.homeMessages, ...messages] },
          "home"
        );
      }
      if (state.stage === "planning") {
        const draft = PLAN_SCRIPT[state.planCursor];
        if (!draft) return clearLane({ ...state, stage: "plan-ready" }, "home");
        const { state: s1, messages } = withIds(state, [draft]);
        const cursor = state.planCursor + 1;
        const next = { ...s1, planCursor: cursor, homeMessages: [...s1.homeMessages, ...messages] };
        if (cursor >= PLAN_SCRIPT.length) return clearLane({ ...next, stage: "plan-ready" }, "home");
        return setLane(next, "home", 1300, { type: "HOME_STEP" });
      }
      return clearLane(state, "home");
    }

    case "SET_HOME_DRAFT":
      // Fixed replies at "question" and "schema-question" are uneditable.
      if (
        state.stage === "scanning" ||
        state.stage === "question" ||
        state.stage === "schema-question" ||
        state.stage === "planning" ||
        state.stage === "session" ||
        state.stage === "cleaned-up"
      ) {
        return state;
      }
      return { ...state, homeDraft: action.value };

    case "SEND_HOME": {
      const text = action.text.trim();
      if (!text || !state.projectCreated) return state;
      if (state.stage === "question") {
        // Strict fixed reply only: reject/ignore arbitrary edited text.
        if (text !== BUNDLE_ANSWER) return state;
        const { state: s1, messages } = withIds(state, [
          homeMsg("user", BUNDLE_ANSWER),
          homeMsg("infie", SCHEMA_QUESTION_MESSAGE),
        ]);
        return {
          ...s1,
          stage: "schema-question",
          homeDraft: SCHEMA_PROPOSAL_ANSWER,
          homeMessages: [...s1.homeMessages, ...messages],
        };
      }
      if (state.stage === "schema-question") {
        // Strict fixed reply only: reject/ignore arbitrary edited text.
        if (text !== SCHEMA_PROPOSAL_ANSWER) return state;
        const { state: s1, messages } = withIds(state, [
          homeMsg("user", SCHEMA_PROPOSAL_ANSWER),
          homeMsg("infie", PLANNING_START_MESSAGE),
        ]);
        const next = {
          ...s1,
          stage: "planning" as HomeStage,
          homeDraft: "",
          planCursor: 0,
          homeMessages: [...s1.homeMessages, ...messages],
        };
        return setLane(next, "home", 1200, { type: "HOME_STEP" });
      }
      if (state.stage === "plan-ready" || state.stage === "starter") {
        const reply = state.stage === "plan-ready" ? PLAN_EDIT_ACK : STARTER_PROMPT_ACK;
        const { state: s1, messages } = withIds(state, [homeMsg("user", text), homeMsg("infie", reply)]);
        return {
          ...s1,
          homeDraft: "",
          planNotes: state.stage === "plan-ready" ? [...state.planNotes, text] : state.planNotes,
          homeMessages: [...s1.homeMessages, ...messages],
        };
      }
      return state;
    }

    case "START_SESSION": {
      if (state.stage !== "plan-ready" || state.session) return state;
      const base: FlowState = { ...state, stage: "session", homeDraft: "", session: createSession() };
      return appendInfie(base, SESSION_INTRO);
    }

    case "SET_TAB": {
      const session = state.session;
      if (!session) return state;
      let next = mapSession(state, (s) => {
        const goingToNudged = s.nudge === action.tab;
        return {
          ...s,
          activeTab: action.tab,
          nudge: goingToNudged ? s.nudgeNext : s.nudge,
          nudgeNext: goingToNudged ? null : s.nudgeNext,
        };
      });
      if (action.tab !== "infie") next = startWorkerIfReady(next, action.tab);
      return next;
    }

    case "DELEGATE": {
      const session = state.session;
      if (!session || session.status !== "CODING" || session.delegated) return state;
      let next = appendInfie(state, [DELEGATION_INFIE, ...PROVIDERS.map((provider) => HANDOFFS[provider])]);
      for (const provider of PROVIDERS) {
        const drafts: MessageDraft[] = [HANDOFFS[provider]];
        if (WAITING_TEXT[provider]) drafts.push(homeMsg(provider, WAITING_TEXT[provider]));
        next = appendTab(next, provider, drafts);
      }
      return mapSession(next, (s) => ({
        ...s,
        delegated: true,
        nudge: "openai",
        nudgeNext: null,
        workers: {
          openai: { phase: "ready", script: "main", cursor: 0 },
          claude: { phase: "locked", script: "main", cursor: 0 },
          gemini: { phase: "locked", script: "main", cursor: 0 },
        },
      }));
    }

    case "WORKER_STEP": {
      const session = state.session;
      if (!session) return clearLane(state, action.provider);
      const w = session.workers[action.provider];
      if (w.phase !== "running") return clearLane(state, action.provider);
      const steps = WORKER_SCRIPTS[action.provider][w.script] ?? [];
      const step = steps[w.cursor];
      if (!step) return clearLane(state, action.provider);
      let next = appendTab(state, action.provider, step.messages);
      const cursor = w.cursor + 1;
      const finished = cursor >= steps.length;
      next = mapSession(next, (s) => ({
        ...s,
        workers: {
          ...s.workers,
          [action.provider]: { ...w, cursor, phase: finished ? ("done" as WorkerPhase) : ("running" as WorkerPhase) },
        },
      }));
      if (finished) next = clearLane(next, action.provider);
      else next = setLane(next, action.provider, steps[cursor].delay, { type: "WORKER_STEP", provider: action.provider });
      if (step.effect) next = applyWorkerEffect(next, action.provider, step.effect);
      return next;
    }

    case "TRIAGE_STEP": {
      const session = state.session;
      if (!session || session.status !== "REVIEW FIXES" || session.triageDone) {
        return clearLane(state, "home");
      }
      const step = TRIAGE_SCRIPT[session.triageCursor];
      if (!step) {
        return clearLane(
          mapSession(state, (s) => ({ ...s, triageDone: true })),
          "home"
        );
      }
      let next = appendInfie(state, step.messages);
      const nextCursor = session.triageCursor + 1;
      const done = nextCursor >= TRIAGE_SCRIPT.length;
      next = mapSession(next, (s) => ({
        ...s,
        triageCursor: nextCursor,
        triageDone: done,
        planMdNote: step.planMdNote ?? s.planMdNote,
      }));
      if (done) return clearLane(next, "home");
      return setLane(next, "home", TRIAGE_SCRIPT[nextCursor].delay, { type: "TRIAGE_STEP" });
    }

    case "TASK_GLOW_CHECK": {
      const session = state.session;
      if (!session || session.taskGlowPhase !== "glowing" || session.taskGlowQueue[0] !== action.taskId) {
        return state;
      }
      let next = mapSession(state, (s) => ({
        ...setTaskById(s, action.taskId, { status: "completed", glowing: true }),
        taskGlowPhase: "checked",
      }));
      const updated = next.session!;
      if (areAllAgentTasksDone(updated) && updated.status === "FIXING") {
        const allHumanDone = areAllHumanTestsDone(updated);
        const nextStatus: FlowSessionStatus = allHumanDone ? "VERIFIED" : "NEEDS YOU";
        next = appendInfie(next, [
          homeMsg(
            "infie",
            allHumanDone ? ALL_AGENT_TASKS_DONE_VERIFIED : ALL_AGENT_TASKS_DONE_NEEDS_HUMAN
          ),
        ]);
        next = mapSession(next, (s) => ({
          ...s,
          cameraFixed: true,
          status: nextStatus,
        }));
      }
      return setLane(next, "task", 450, { type: "TASK_GLOW_CLEAR", taskId: action.taskId });
    }

    case "TASK_GLOW_CLEAR": {
      const session = state.session;
      if (!session || session.taskGlowPhase !== "checked" || session.taskGlowQueue[0] !== action.taskId) {
        return state;
      }
      const remaining = session.taskGlowQueue.slice(1);
      if (remaining.length > 0) {
        const nextTaskId = remaining[0];
        const next = mapSession(state, (s) => ({
          ...setTaskById(setTaskById(s, action.taskId, { glowing: false }), nextTaskId, { glowing: true }),
          taskGlowQueue: remaining,
          taskGlowPhase: "glowing",
        }));
        return setLane(next, "task", 500, { type: "TASK_GLOW_CHECK", taskId: nextTaskId });
      }
      return clearLane(
        mapSession(state, (s) => ({
          ...setTaskById(s, action.taskId, { glowing: false }),
          taskGlowQueue: [],
          taskGlowPhase: "idle",
        })),
        "task"
      );
    }

    case "FIX_PROBLEMS": {
      const session = state.session;
      if (
        !session ||
        session.status !== "REVIEW FIXES" ||
        !session.triageDone ||
        session.workers.gemini.phase !== "done"
      ) {
        return state;
      }
      let next = appendInfie(state, [FIX_INFIE_START, FIX_HANDOFF]);
      next = appendTab(next, "gemini", [FIX_HANDOFF]);
      return mapSession(next, (s) => ({
        ...s,
        status: "FIXING",
        workers: { ...s.workers, gemini: { phase: "ready", script: "fix", cursor: 0 } },
        nudge: "gemini",
        nudgeNext: null,
      }));
    }

    case "SET_SESSION_DRAFT":
      return mapSession(state, (s) => ({
        ...s,
        tabDrafts: { ...s.tabDrafts, [s.activeTab]: action.value },
      }));

    case "SEND_SESSION": {
      const session = state.session;
      const text = action.text.trim();
      if (!session || !text) return state;
      const tab = session.activeTab;
      if (tab === "infie") {
        const next = appendInfie(state, [homeMsg("user", text), homeMsg("infie", SESSION_EDIT_ACK)]);
        return mapSession(next, (s) => ({
          ...s,
          tabDrafts: { ...s.tabDrafts, infie: "" },
        }));
      }
      // Worker tab: append user message to that worker's tab ONLY, no fake agent response, trigger PrototypeLimit.
      const next = appendTab(state, tab, [homeMsg("user", text)]);
      return mapSession(next, (s) => ({
        ...s,
        tabDrafts: { ...s.tabDrafts, [tab]: "" },
        workerLimitTab: tab,
      }));
    }

    case "DISMISS_WORKER_LIMIT":
      return mapSession(state, (s) => ({ ...s, workerLimitTab: null }));

    case "TOGGLE_HUMAN_TEST": {
      const session = state.session;
      if (!session) return state;
      if (session.status === "MERGED" || session.status === "COMPLETE") {
        return state;
      }
      // Initial PR gating tasks lock once PR opens; during sanity-check ONLY the added sanity task is actionable.
      if (session.status === "PR OPEN") {
        if (session.wrapUpPhase !== "sanity-check" || action.id !== SANITY_HUMAN_TEST_ID) {
          return state;
        }
        const target = session.humanTests.find((t) => t.id === SANITY_HUMAN_TEST_ID);
        if (!target || target.done) return state;
        const checked = appendInfie(state, [
          homeMsg(
            "infie",
            "Sanity check verified and simulated auto-merge complete (no real PR or branch was modified). Review the session learnings below, edit anything you like, and submit to continue.",
            { badge: "Merged" }
          ),
        ]);
        return mapSession(checked, (s) => ({
          ...s,
          humanTests: s.humanTests.map((t) =>
            t.id === SANITY_HUMAN_TEST_ID ? { ...t, done: true } : t
          ),
          status: "MERGED",
          wrapUpPhase: "merged",
          lesson: "form",
          activeTab: "infie",
        }));
      }
      let next = mapSession(state, (s) => ({
        ...s,
        humanTests: s.humanTests.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      }));
      const updated = next.session!;
      if (areAllAgentTasksDone(updated)) {
        const allHumanDone = areAllHumanTestsDone(updated);
        if (updated.status === "NEEDS YOU" && allHumanDone) {
          next = appendInfie(next, [homeMsg("infie", ALL_HUMAN_TESTS_DONE_MESSAGE)]);
          next = mapSession(next, (s) => ({ ...s, status: "VERIFIED" }));
        } else if (updated.status === "VERIFIED" && !allHumanDone) {
          next = mapSession(next, (s) => ({ ...s, status: "NEEDS YOU" }));
        }
      }
      return next;
    }

    case "OPEN_PR": {
      const session = state.session;
      if (
        !session ||
        session.status !== "VERIFIED" ||
        !areAllAgentTasksDone(session) ||
        !areAllHumanTestsDone(session)
      ) {
        return state;
      }
      const next = appendInfie(state, [homeMsg("infie", PR_OPENED_MESSAGE)]);
      return mapSession(next, (s) => ({
        ...s,
        status: "PR OPEN",
        activeTab: "infie",
        nudge: null,
        nudgeNext: null,
      }));
    }

    case "REVIEW_CHANGES": {
      const session = state.session;
      if (!session || session.status !== "PR OPEN" || session.reviewOpen) return state;
      const next = appendInfie(state, [homeMsg("infie", REVIEW_OPENED_MESSAGE)]);
      return mapSession(next, (s) => ({
        ...s,
        reviewOpen: true,
        wrapUpPhase: "ready",
        activeTab: "infie",
      }));
    }

    case "START_WRAP_UP": {
      const session = state.session;
      if (!session || session.status !== "PR OPEN" || !session.reviewOpen || session.wrapUpPhase !== "ready") {
        return state;
      }
      const next = appendInfie(state, [homeMsg("infie", WRAP_UP_INTRO)]);
      const withPhase = mapSession(next, (s) => ({
        ...s,
        wrapUpPhase: "polling",
        wrapUpCursor: 0,
      }));
      return setLane(withPhase, "home", WRAP_UP_SCRIPT[0].delay, { type: "WRAP_UP_STEP" });
    }

    case "WRAP_UP_STEP": {
      const session = state.session;
      if (!session || session.wrapUpPhase !== "polling") return clearLane(state, "home");
      const step = WRAP_UP_SCRIPT[session.wrapUpCursor];
      if (!step) {
        return clearLane(
          mapSession(state, (s) => ({ ...s, wrapUpPhase: "green" })),
          "home"
        );
      }
      let next = appendInfie(state, [step.message]);
      const cursor = session.wrapUpCursor + 1;
      const done = Boolean(step.nextGreen) || cursor >= WRAP_UP_SCRIPT.length;
      next = mapSession(next, (s) => ({
        ...s,
        wrapUpCursor: cursor,
        wrapUpPhase: done ? "green" : "polling",
      }));
      if (done) return clearLane(next, "home");
      return setLane(next, "home", WRAP_UP_SCRIPT[cursor].delay, { type: "WRAP_UP_STEP" });
    }

    case "PRESENT_CHANGES": {
      const session = state.session;
      if (!session || session.status !== "PR OPEN" || !session.reviewOpen || session.wrapUpPhase !== "green") {
        return state;
      }
      if (session.presentedChanges) return state;
      const hasSanity = session.humanTests.some((t) => t.id === SANITY_HUMAN_TEST_ID);
      const next = appendInfie(state, [
        homeMsg(
          "infie",
          "Presenting the updated app in the emulator and adding a final Human Testing check ('Sanity check app after bug fixes'). Check it off once verified to simulate merging and continue."
        ),
      ]);
      return mapSession(next, (s) => ({
        ...s,
        reviewOpen: false,
        wrapUpPhase: "sanity-check",
        presentedChanges: true,
        activeTab: "infie",
        humanTests: hasSanity
          ? s.humanTests
          : [...s.humanTests, { id: SANITY_HUMAN_TEST_ID, text: SANITY_HUMAN_TEST_LABEL, done: false }],
      }));
    }

    case "AUTO_MERGE": {
      const session = state.session;
      if (!session || session.status !== "PR OPEN" || !session.reviewOpen || session.wrapUpPhase !== "green") {
        return state;
      }
      const next = appendInfie(state, [
        homeMsg(
          "infie",
          "Simulated auto-merge complete (no real PR or branch was modified). Review the session learnings below, edit anything you like, and submit to continue.",
          { badge: "Merged" }
        ),
      ]);
      return mapSession(next, (s) => ({
        ...s,
        status: "MERGED",
        wrapUpPhase: "merged",
        lesson: "form",
        activeTab: "infie",
      }));
    }

    case "SUBMIT_LESSON": {
      const session = state.session;
      if (!session || session.status !== "MERGED" || session.lesson !== "form") return state;
      const summary = action.summary.trim() || LESSON_SUMMARY;
      const correctedAction = action.correctedAction.trim() || LESSON_ACTION;
      const next = appendInfie(state, [
        homeMsg(
          "infie",
          `Saved session learnings to tutorial memory. Press Clean up Session when you're ready to wrap up this workspace.`,
          { badge: "Approved" }
        ),
      ]);
      return mapSession(next, (s) => ({
        ...s,
        lesson: "approved",
        status: "COMPLETE",
        cleanupPhase: "ready",
        lessonSummary: summary,
        lessonAction: correctedAction,
      }));
    }

    case "REQUEST_CLEANUP": {
      const session = state.session;
      if (!session || session.status !== "COMPLETE" || session.cleanupPhase !== "ready") return state;
      const next = appendInfie(state, [
        homeMsg(
          "infie",
          "I'll archive this session, delete its local worktree, and delete its remote branch. Press Confirm to proceed."
        ),
      ]);
      return mapSession(next, (s) => ({ ...s, cleanupPhase: "confirm" }));
    }

    case "CONFIRM_CLEANUP": {
      const session = state.session;
      if (!session || session.status !== "COMPLETE" || session.cleanupPhase !== "confirm") return state;
      const { state: s1, messages } = withIds(state, [
        homeMsg(
          "infie",
          "Session archived and its worktree and remote branch cleaned up. Your Experimemo project and updated app preview remain here on project home."
        ),
      ]);
      return {
        ...s1,
        stage: "cleaned-up",
        archivedSessionCount: s1.archivedSessionCount + 1,
        session: null,
        homeDraft: "",
        homeMessages: [...s1.homeMessages, ...messages],
        lanes: { home: null, openai: null, claude: null, gemini: null, task: null },
      };
    }

    default:
      return state;
  }
}

// ── Derived helpers ─────────────────────────────────────────────────────────

export type PrimaryActionKey =
  | "delegate"
  | "fix"
  | "open-pr"
  | "review-changes"
  | "wrap-up"
  | "auto-merge"
  | "present-changes"
  | "cleanup"
  | "confirm-cleanup";

/** All valid Infie action pills for the current session state (empty while work is in flight). */
export function getSessionActions(
  session: SessionFlowState
): Array<{ key: PrimaryActionKey; label: string; preset: "teal" | "blue" | "amber" | "red" | "purple" }> {
  if (session.status === "CODING" && !session.delegated) {
    return [{ key: "delegate", label: "Continue", preset: "blue" }];
  }
  if (session.status === "REVIEW FIXES" && session.triageDone) {
    return [{ key: "fix", label: "Fix Problems", preset: "red" }];
  }
  if (
    session.status === "VERIFIED" &&
    areAllAgentTasksDone(session) &&
    areAllHumanTestsDone(session)
  ) {
    return [{ key: "open-pr", label: "Open PR", preset: "teal" }];
  }
  if (session.status === "PR OPEN" && !session.reviewOpen && session.wrapUpPhase === "none") {
    return [{ key: "review-changes", label: "Review Changes", preset: "blue" }];
  }
  if (session.status === "PR OPEN" && session.reviewOpen && session.wrapUpPhase === "ready") {
    return [{ key: "wrap-up", label: "Wrap up", preset: "purple" }];
  }
  if (session.status === "PR OPEN" && session.reviewOpen && session.wrapUpPhase === "green") {
    return [
      { key: "auto-merge", label: "Auto-merge", preset: "teal" },
      { key: "present-changes", label: "Present changes", preset: "blue" },
    ];
  }
  if (session.status === "COMPLETE" && session.cleanupPhase === "ready") {
    return [{ key: "cleanup", label: "Clean up Session", preset: "teal" }];
  }
  if (session.status === "COMPLETE" && session.cleanupPhase === "confirm") {
    return [{ key: "confirm-cleanup", label: "Confirm", preset: "red" }];
  }
  return [];
}

export function getPrimaryAction(
  session: SessionFlowState
): { key: PrimaryActionKey; status: FlowSessionStatus } | null {
  const first = getSessionActions(session)[0];
  return first ? { key: first.key, status: session.status } : null;
}

export function countCompletedTasks(session: SessionFlowState): number {
  return session.tasks.filter((t) => t.status === "completed").length;
}

export function countProviderMessages(session: SessionFlowState, tab: SessionTabId): number {
  return tab === "infie" ? session.infie.length : session.tabs[tab].length;
}

export function getSessionComposerPlaceholder(tab: SessionTabId): string {
  if (tab === "infie") return "Ask Infie to coordinate, scan, or switch agents… (⌘↵)";
  return `Message ${SESSION_TAB_ACCESSIBLE_LABEL[tab]}…`;
}
