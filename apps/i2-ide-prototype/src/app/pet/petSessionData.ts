// Unguided Pet Show and Tell "Add Comments" session replay data and pure state machine.
// Baseline repo metadata reflects F:/SoftwareDev/pet-show-and-tell-add-comments at 6e17795.
// Plan, aggregate task label, checklist details, and real git diff entries are synchronized
// from the Pet owner's verified artifacts once PET_V2_READY is published.

export type PetReplayStatus =
  | "PLAN REVIEW"
  | "CODING"
  | "WAITING ON TEST"
  | "NEEDS YOU"
  | "VERIFIED"
  | "PR OPEN"
  | "MERGED"
  | "COMPLETE";

export type PetReplayPhase =
  | "plan-review"
  | "coding"
  | "testing"
  | "verified"
  | "pr-open"
  | "merged"
  | "complete";

export interface PetChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PetDiffEntry {
  status: "M" | "A" | "D";
  name: string;
  path: string;
  add?: string;
  del?: string;
  hunk?: string;
}

export interface PetArtifactsBundle {
  schemaVersion: number;
  baseCommit: string;
  taskLabel: string;
  planMd: string;
  diffSha256: string;
  v1IndexHtmlSha256: string | null;
  v2IndexHtmlSha256: string | null;
  summary: {
    commitFiles: string;
    branchFiles: string;
    add: string;
    del: string;
  };
  files: PetDiffEntry[];
}

export interface PetReplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface PetAgentTaskItem {
  id: string;
  label: string;
  done: boolean;
}

// Simulated MDS Wrap up after Open PR: Doctor, todo/commit, CI and review threads poll to green
// before an explicit Merge is offered. Nothing touches a real remote, branch, or network.
export type PetWrapUpPhase = "none" | "polling" | "green";

export interface PetReplayState {
  phase: PetReplayPhase;
  status: PetReplayStatus;
  acceptedAt: number | null;
  deadline: number | null;
  checklist: PetChecklistItem[];
  branchPreviewSelection: string;
  testAppOpened: boolean;
  messages: PetReplayMessage[];
  wrapUpPhase: PetWrapUpPhase;
  /** Number of PET_WRAP_UP_STEPS already completed while polling. */
  wrapUpStep: number;
  /** The blank (nothing-to-add) session completion report was explicitly submitted. */
  reportSubmitted: boolean;
  /** Project-level Update Main was explicitly chosen; only then does `main` serve v2. */
  mainUpdated: boolean;
  /** Project-level Reconcile was run at least once. */
  reconciled: boolean;
}

export type PetReplayAction =
  | { type: "APPROVE_PLAN"; now?: number }
  | { type: "TICK"; now?: number }
  | { type: "TEST_APP" }
  | { type: "TOGGLE_CHECKLIST"; id: string }
  | { type: "VERIFY_TESTING" }
  | { type: "OPEN_PR" }
  | { type: "START_WRAP_UP" }
  | { type: "WRAP_UP_STEP" }
  | { type: "MERGE_PR" }
  | { type: "SUBMIT_BLANK_REPORT" }
  | { type: "UPDATE_MAIN" }
  | { type: "RECONCILE" }
  | { type: "SELECT_BRANCH_PREVIEW"; target: string }
  | { type: "SEND_USER_MESSAGE"; text: string }
  | { type: "RESET" };

export const PET_REPLAY_PROJECT_ID = "pet";
export const PET_REPLAY_SESSION_ID = "add-comments";
export const PET_REPLAY_SESSION_NAME = "Add Comments";
export const PET_REPLAY_BRANCH = "add-comments";
export const PET_REPLAY_GOAL = "Add comments with Like/Love on comments";
export const PET_REPLAY_TODO_TEXT = "Add comments with Like/Love on comments";
export const PET_CODING_DURATION_MS = 30_000;
export const PET_SESSION_STORAGE_KEY = "i2.pet.addComments.replay.v1";

export const PET_REPLAY_CHECKLIST: readonly PetChecklistItem[] = [
  { id: "pet-chk-post", text: "Post a comment on a pet post", done: false },
  { id: "pet-chk-toggle", text: "Toggle Like/Love reaction off on a comment", done: false },
  { id: "pet-chk-persist", text: "Verify comment and reaction persist after reopening the post", done: false },
  { id: "pet-chk-validation", text: "Verify blank and 181-character comments are rejected", done: false },
];

// Synchronized from Pet owner's PET_V2_READY artifacts:
// - prototype-task-label.txt: "Add local post comments and per-comment Like/Love reactions"
// - plan.md & diff-6e17795.patch (9 modified files, +1106 -39 against 6e17795)
export const PET_AGENT_TASKS_PENDING: readonly PetAgentTaskItem[] = [
  { id: "pet-task-1", label: "Add local post comments and per-comment Like/Love reactions", done: false },
];

export const PET_AGENT_TASKS_DONE: readonly PetAgentTaskItem[] = [
  { id: "pet-task-1", label: "Add local post comments and per-comment Like/Love reactions", done: true },
];

export const PET_DIFF_SUMMARY = {
  ready: true,
  commitFiles: "9 files",
  branchFiles: "9 files",
  add: "+1156",
  del: "-39",
};

export const PET_SOURCE_DIFFS: readonly PetDiffEntry[] = [
  { status: "M", name: "post-detail-screen.tsx", path: "src/features/pets/post-detail-screen.tsx", add: "+347", del: "-4" },
  { status: "M", name: "pet-store.ts", path: "src/features/pets/pet-store.ts", add: "+51", del: "-1" },
  { status: "M", name: "pet-database.web.ts", path: "src/storage/pet-database.web.ts", add: "+147", del: "-18" },
  { status: "M", name: "pet-database.ts", path: "src/storage/pet-database.ts", add: "+89", del: "-8" },
  { status: "M", name: "pet.ts", path: "src/types/pet.ts", add: "+27", del: "-0" },
  { status: "M", name: "test-pet-web-data.cjs", path: "scripts/test-pet-web-data.cjs", add: "+218", del: "-3" },
  { status: "M", name: "test-pet-migration.cjs", path: "scripts/test-pet-migration.cjs", add: "+149", del: "-2" },
  { status: "M", name: "smoke-web.mjs", path: "scripts/smoke-web.mjs", add: "+126", del: "-1" },
  { status: "M", name: "todo.md", path: "project/todo.md", add: "+2", del: "-2" },
];

export const PET_PLAN_MD_TEXT = [
  "# Pet Show and Tell — Comments Implementation Plan",
  "",
  "## Objective",
  "Add local-only post comments and per-comment Like/Love reactions to Pet Show and Tell (Expo SDK 58), preserving the existing local-only product boundary, Android Expo Go compatibility, and hosted static web preview behavior without adding packages or seeded comments.",
  "",
  "## Aggregate Prototype Task Label",
  "`Add local post comments and per-comment Like/Love reactions`",
  "",
  "## Architecture & File Changes",
  "",
  "### 1. Shared Types & Validation (`src/types/pet.ts`, `src/features/pets/comment-validation.ts` or helper in `src/types/pet.ts`)",
  "- Add `PetComment` (`id`, `postId`, `body`, `createdAt`) and `PetCommentInput` (`postId`, `body`).",
  "- Extend `PetSnapshot` with `comments: PetComment[]` and `commentReactions: Record<string, ReactionKind>`.",
  "- Centralize comment body normalization/validation (`MAX_COMMENT_LENGTH = 180`, trimmed length `1..180`).",
  "",
  "### 2. SQLite Persistence (`src/storage/pet-database.ts`)",
  "- Add `comments` table (`id TEXT PRIMARY KEY NOT NULL`, `postId TEXT NOT NULL`, `body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 180)`, `createdAt TEXT NOT NULL`, `FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE`).",
  "- Add `idx_comments_postId_createdAt` index on `comments(postId, createdAt DESC)`.",
  "- Add `comment_reactions` table (`commentId TEXT PRIMARY KEY NOT NULL`, `value TEXT NOT NULL CHECK (value IN ('like', 'love'))`, `FOREIGN KEY (commentId) REFERENCES comments(id) ON DELETE CASCADE`).",
  "- Update legacy seed cleanup query so legacy posts with comments (`EXISTS (SELECT 1 FROM comments WHERE comments.postId = posts.id)`) are preserved alongside posts with reactions.",
  "- Implement `createLocalPetComment(input)` (validates post existence + trimmed body `1..180`) and `saveLocalCommentReaction(commentId, reaction)` (toggles/deletes, validates `'like' | 'love' | null`).",
  "- Update `getPetSnapshot()` to return `comments` ordered newest-first (`ORDER BY createdAt DESC, rowid DESC`) and `commentReactions`.",
  "",
  "### 3. Web Session Adapter (`src/storage/pet-database.web.ts`)",
  "- Use independent session key `pet-show-and-tell.preview.v2` (`LEGACY_V1_SESSION_KEY = 'pet-show-and-tell.preview.v1'`).",
  "- On initialization (when `v2` is absent and not `?reset=1`): perform a one-time import from `v1` if valid `v1` data exists, preserving existing `pets`, `posts`, and `reactions` (applying legacy seed migrations), initializing empty `comments: []` and `commentReactions: {}`, and persisting to `v2` without ever writing to or deleting `v1`.",
  "- When `v2` already exists: load `v2` only; never let `v1` overwrite `v2`.",
  "- Implement `createLocalPetComment` and `saveLocalCommentReaction` with parity validation and newest-first ordering (`unshift` + stable `createdAt DESC` sort).",
  "- Cascade `deleteLocalPetPost` to remove post comments and their `commentReactions`.",
  "- Keep `resetPetDatabase()` and `?reset=1` resetting `v2` to seeded state with empty comments/commentReactions, persisting clean `v2` so `v1` does not overwrite reset `v2` on reload.",
  "",
  "### 4. Zustand Store (`src/features/pets/pet-store.ts`)",
  "- Add `comments: PetComment[]` and `commentReactions: Record<string, ReactionKind>` to `PetStore`.",
  "- Hydrate/refresh both from `getPetSnapshot()`.",
  "- Add `addComment(input)` (prepends newest comment) and `toggleCommentReaction(commentId, reaction)` (mutually exclusive Like/Love, tap again clears, independent of post reactions).",
  "- Cascade `deletePost(postId)` to remove deleted post's comments and their entries in `commentReactions`.",
  "",
  "### 5. Post Detail UI (`src/features/pets/post-detail-screen.tsx`)",
  "- Render Comments section on post detail with count, empty state, newest-first comment list, composer with live trimmed `n/180` counter (without `maxLength` truncation so >180-char trimmed submissions trigger inline alert validation while preserving draft), inline validation/save errors, and accessible labels/roles/states (`aria-selected` + `accessibilityState`).",
  "- Per-comment mutually exclusive Like/Love buttons with selected state styling and accessible labels/states.",
  "- No seeded comments, no individual comment edit/delete, local-only note updated to reflect reactions and comments stay on-device.",
  "",
  "### 6. Project Docs & Tests",
  "- Preserve exact two existing comment TODO lines in `project/todo.md` and mark `[x]` only after all validations pass.",
  "- Extend `scripts/test-pet-migration.cjs` and `scripts/test-pet-web-data.cjs` (plus store/UI/cascade tests if needed) to cover:",
  "  - Existing DB migration (including legacy seed cleanup preserving posts with comments)",
  "  - Comment create, reload, newest-first order, trimmed `1..180` validation",
  "  - Per-comment reaction toggle & mutual exclusivity while preserving post reactions",
  "  - Cascading deletes (DB + Web + Zustand)",
  "  - One-time v1 web import, no v1 writes, preventing v1 from overwriting v2, and reset behavior",
  "- Update `scripts/smoke-web.mjs` if appropriate to also exercise post detail comment empty/populated/submit/reaction states and verify zero console/page/off-origin/overflow errors on `v2`.",
  "",
  "### 7. Verification & Export",
  "- Run `npm test`, `npm run typecheck`, `npm run test:pet-migration`, `npm run test:web-data`, `npx mds doctor --fast`.",
  "- Export `v1` (re-verify) and `v2` with full `PET_WEB_BASE_PATH` (`/iSquared/preview/pet-show-and-tell/v2`), save `v2` + manifest under `generated/.../pet/v2/`, and run `npm run test:web-smoke` against `v2`.",
  "- Record Android Expo Go check status truthfully (`NOT RUN` if no Android emulator/device available).",
  "",
].join("\n");

export const PET_WRAP_UP_STEP_DELAY_MS = 900;

export type PetWrapUpCheckId = "doctor" | "todo" | "ci" | "review";

export interface PetWrapUpStep {
  check: PetWrapUpCheckId;
  label: string;
  pending: string;
  done: string;
  message: string;
}

// Mirrors the MDS Wrap Up command ("End session, update Todo.md, generate commit message, commit")
// plus the PR polling from the Experimemo walkthrough. Check names come from the Pet plan's
// verification section; every result shown here is simulated.
export const PET_WRAP_UP_STEPS: readonly PetWrapUpStep[] = [
  {
    check: "doctor",
    label: "Doctor",
    pending: "Running mds doctor --fast…",
    done: "0 errors",
    message: "Simulated `mds doctor --fast` on `add-comments`: 0 errors.",
  },
  {
    check: "todo",
    label: "Todo & commit",
    pending: "Updating project/todo.md…",
    done: "todo.md checked · commit message ready",
    message:
      "`project/todo.md` marks both comment items complete in the branch diff, and the wrap-up commit message is generated (simulated).",
  },
  {
    check: "ci",
    label: "CI checks",
    pending: "Polling PR checks…",
    done: "passing",
    message:
      "Simulated PR checks passing: typecheck, test, test:pet-migration, test:web-data, and web smoke.",
  },
  {
    check: "review",
    label: "Review threads",
    pending: "Checking review threads…",
    done: "0 open threads",
    message:
      "No open review threads. Wrap up is green — click Merge to simulate merging `add-comments` into `test`. Nothing merges until you click.",
  },
];

export const PET_BLANK_REPORT_NOTICE = "Nothing to add to Infinite Intelligence was found.";

export function createInitialPetReplayState(): PetReplayState {
  return {
    phase: "plan-review",
    status: "PLAN REVIEW",
    acceptedAt: null,
    deadline: null,
    checklist: PET_REPLAY_CHECKLIST.map((item) => ({ ...item })),
    branchPreviewSelection: "main",
    testAppOpened: false,
    wrapUpPhase: "none",
    wrapUpStep: 0,
    reportSubmitted: false,
    mainUpdated: false,
    reconciled: false,
    messages: [
      {
        id: "pet-init-1",
        role: "assistant",
        content:
          "Plan ready for Add Comments (`add-comments` from `6e17795`): add local comments with Like/Love reactions on pet posts. Review `Plan.md` and click Approve Plan to start implementation.",
      },
    ],
  };
}

export function getRemainingCodingMs(state: PetReplayState, now = Date.now()): number {
  if (state.status !== "CODING" || state.deadline === null) return 0;
  return Math.max(0, state.deadline - now);
}

export function getRemainingCodingSeconds(state: PetReplayState, now = Date.now()): number {
  const ms = getRemainingCodingMs(state, now);
  return ms === 0 ? 0 : Math.ceil(ms / 1000);
}

export function getPetPreviewVersionForTarget(
  target: string,
  state: PetReplayState,
): "v1" | "v2" {
  // Keep v2 unmounted everywhere until Test App is clicked at WAITING ON TEST.
  if (!state.testAppOpened) return "v1";
  if (target === "main") {
    // main is promoted only by the explicit project-level Update Main choice.
    return state.status === "COMPLETE" && state.mainUpdated ? "v2" : "v1";
  }
  if (target === "test") {
    return state.status === "MERGED" || state.status === "COMPLETE" ? "v2" : "v1";
  }
  return "v2";
}

function appendAssistant(state: PetReplayState, id: string, content: string): PetReplayMessage[] {
  return [...state.messages, { id, role: "assistant", content }];
}

export function petReplayReducer(state: PetReplayState, action: PetReplayAction): PetReplayState {
  switch (action.type) {
    case "APPROVE_PLAN": {
      if (state.status !== "PLAN REVIEW") return state;
      const now = action.now ?? Date.now();
      return {
        ...state,
        phase: "coding",
        status: "CODING",
        acceptedAt: now,
        deadline: now + PET_CODING_DURATION_MS,
        messages: appendAssistant(
          state,
          `pet-approve-${now}`,
          "Plan approved. Implementing Add Comments on branch `add-comments` (30s). Feel free to optionally explore i² Home, Global To-Do, Project Home, or the baseline preview while the agents work.",
        ),
      };
    }

    case "TICK": {
      if (state.status !== "CODING" || state.deadline === null) return state;
      const now = action.now ?? Date.now();
      if (now < state.deadline) return state;
      return {
        ...state,
        phase: "testing",
        status: "WAITING ON TEST",
        messages: appendAssistant(
          state,
          `pet-deadline-${state.deadline}`,
          "Implementation complete on `add-comments`. Inspect the source diff in Current Diffs (preview stays on baseline until you click Test App), then click Test App to mount the updated build.",
        ),
      };
    }

    case "TEST_APP": {
      if (state.status !== "WAITING ON TEST") return state;
      return {
        ...state,
        phase: "testing",
        status: "NEEDS YOU",
        testAppOpened: true,
        branchPreviewSelection: PET_REPLAY_SESSION_ID,
        messages: appendAssistant(
          state,
          "pet-test-app",
          "Updated Pet Show and Tell preview mounted. Verify posting a comment, toggling Like/Love off, persistence after reopening, and blank/181-char rejection in Human Testing.",
        ),
      };
    }

    case "TOGGLE_CHECKLIST": {
      if (state.status !== "NEEDS YOU") return state;
      const nextChecklist = state.checklist.map((item) =>
        item.id === action.id ? { ...item, done: !item.done } : item,
      );
      return {
        ...state,
        checklist: nextChecklist,
      };
    }

    case "VERIFY_TESTING": {
      if (state.status !== "NEEDS YOU") return state;
      if (!state.checklist.every((item) => item.done)) return state;
      return {
        ...state,
        phase: "verified",
        status: "VERIFIED",
        messages: appendAssistant(
          state,
          "pet-verified",
          "All Human Testing checks verified. Click Open PR to simulate opening the pull request.",
        ),
      };
    }

    case "OPEN_PR": {
      if (state.status !== "VERIFIED") return state;
      return {
        ...state,
        phase: "pr-open",
        status: "PR OPEN",
        wrapUpPhase: "none",
        wrapUpStep: 0,
        messages: appendAssistant(
          state,
          "pet-pr-open",
          "Simulated PR opened for `add-comments` → `test`. Click Wrap up to run the simulated MDS wrap-up (Doctor, todo/commit, CI checks, and review threads) before merging.",
        ),
      };
    }

    case "START_WRAP_UP": {
      if (state.status !== "PR OPEN" || state.wrapUpPhase !== "none") return state;
      return {
        ...state,
        wrapUpPhase: "polling",
        wrapUpStep: 0,
        messages: appendAssistant(
          state,
          "pet-wrapup-start",
          "Wrapping up `add-comments` (simulated `mds wrap-up`): running Doctor, confirming `project/todo.md`, then polling PR checks and review threads.",
        ),
      };
    }

    case "WRAP_UP_STEP": {
      if (state.status !== "PR OPEN" || state.wrapUpPhase !== "polling") return state;
      const step = PET_WRAP_UP_STEPS[state.wrapUpStep];
      if (!step) return { ...state, wrapUpPhase: "green" };
      const nextStep = state.wrapUpStep + 1;
      return {
        ...state,
        wrapUpStep: nextStep,
        wrapUpPhase: nextStep >= PET_WRAP_UP_STEPS.length ? "green" : "polling",
        messages: appendAssistant(state, `pet-wrapup-${step.check}`, step.message),
      };
    }

    case "MERGE_PR": {
      if (state.status !== "PR OPEN" || state.wrapUpPhase !== "green") return state;
      return {
        ...state,
        phase: "merged",
        status: "MERGED",
        messages: appendAssistant(
          state,
          "pet-merged",
          `Simulated merge of \`add-comments\` into \`test\` complete (no real PR or branch was modified). The \`test\` preview now serves the updated build; \`main\` stays on the baseline. ${PET_BLANK_REPORT_NOTICE} Review the blank completion report below and submit it to finish the session.`,
        ),
      };
    }

    case "SUBMIT_BLANK_REPORT": {
      if (state.status !== "MERGED" || state.reportSubmitted) return state;
      return {
        ...state,
        phase: "complete",
        status: "COMPLETE",
        reportSubmitted: true,
        messages: appendAssistant(
          state,
          "pet-report-submitted",
          "Blank completion report submitted — nothing was added to Infinite Intelligence. Add Comments is complete on `test`. On Project Home, choose Update Main to promote the build to `main`, or Reconcile to compare `main` with `test`.",
        ),
      };
    }

    case "UPDATE_MAIN": {
      if (state.status !== "COMPLETE" || state.mainUpdated) return state;
      return {
        ...state,
        mainUpdated: true,
        branchPreviewSelection: "main",
        messages: appendAssistant(
          state,
          "pet-update-main",
          "Simulated Update Main: `test` fast-forwarded into `main` (no real Git or remote action). The `main` preview now serves the updated Pet Show and Tell build.",
        ),
      };
    }

    case "RECONCILE": {
      if (state.status !== "COMPLETE") return state;
      return {
        ...state,
        reconciled: true,
        messages: appendAssistant(
          state,
          `pet-reconcile-${state.messages.length}`,
          state.mainUpdated
            ? "Simulated Reconcile: `main` and `test` match, `project/todo.md` marks both comment items complete, and no session work is left unmerged."
            : "Simulated Reconcile: `test` includes the Add Comments merge but `main` does not yet (main is 1 merge behind test). `project/todo.md` on `test` marks both comment items complete. Choose Update Main when you're ready to promote it.",
        ),
      };
    }

    case "SELECT_BRANCH_PREVIEW": {
      if (
        action.target !== "main" &&
        action.target !== "test" &&
        action.target !== PET_REPLAY_SESSION_ID
      ) {
        return state;
      }
      if (state.branchPreviewSelection === action.target) return state;
      return {
        ...state,
        branchPreviewSelection: action.target,
      };
    }

    case "SEND_USER_MESSAGE": {
      const trimmed = action.text.trim();
      if (!trimmed) return state;
      const userMsg: PetReplayMessage = {
        id: `pet-u-${state.messages.length + 1}`,
        role: "user",
        content: trimmed,
      };
      let replyText =
        "Noted. Follow the current session action when you're ready to advance the replay.";
      if (state.status === "PLAN REVIEW") {
        replyText =
          "Review `Plan.md` in Current Goal & Plan, then click Approve Plan to begin the 30-second implementation run.";
      } else if (state.status === "CODING") {
        replyText =
          "The 30-second implementation timer is still running and cannot be skipped. You can inspect `Plan.md` or browse Home/Widgets until the deadline finishes.";
      } else if (state.status === "WAITING ON TEST") {
        replyText =
          "Review the source diff in Current Diffs, then click Test App to mount the updated Pet Show and Tell build.";
      } else if (state.status === "NEEDS YOU") {
        replyText =
          "Check off all four Human Testing items after verifying them in the live Pet Show and Tell preview, then click Record Testing.";
      } else if (state.status === "PR OPEN") {
        replyText =
          state.wrapUpPhase === "green"
            ? "Wrap up is green. Click Merge when you're ready to simulate merging `add-comments` into `test`."
            : state.wrapUpPhase === "polling"
              ? "Wrap up is still polling the simulated checks — Merge appears once they're green."
              : "Click Wrap up to run the simulated Doctor, todo/commit, CI, and review-thread checks.";
      } else if (state.status === "MERGED") {
        replyText = `${PET_BLANK_REPORT_NOTICE} Submit the blank completion report below to finish the session.`;
      } else if (state.status === "COMPLETE") {
        replyText = state.mainUpdated
          ? "Session complete and `main` is updated. Reconcile stays available on Project Home."
          : "Session complete. Choose Update Main or Reconcile on Project Home.";
      }
      const replyMsg: PetReplayMessage = {
        id: `pet-a-${state.messages.length + 2}`,
        role: "assistant",
        content: replyText,
      };
      return {
        ...state,
        messages: [...state.messages, userMsg, replyMsg],
      };
    }

    case "RESET": {
      return createInitialPetReplayState();
    }

    default:
      return state;
  }
}

const VALID_STATUSES = new Set<PetReplayStatus>([
  "PLAN REVIEW",
  "CODING",
  "WAITING ON TEST",
  "NEEDS YOU",
  "VERIFIED",
  "PR OPEN",
  "MERGED",
  "COMPLETE",
]);

const VALID_PHASES = new Set<PetReplayPhase>([
  "plan-review",
  "coding",
  "testing",
  "verified",
  "pr-open",
  "merged",
  "complete",
]);

export function parsePetReplayState(raw: string | null, now = Date.now()): PetReplayState {
  if (!raw) return createInitialPetReplayState();
  try {
    const parsed = JSON.parse(raw) as Partial<PetReplayState>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.status ||
      !VALID_STATUSES.has(parsed.status) ||
      !parsed.phase ||
      !VALID_PHASES.has(parsed.phase) ||
      !Array.isArray(parsed.checklist)
    ) {
      return createInitialPetReplayState();
    }
    const base = createInitialPetReplayState();
    const doneById = new Map<string, boolean>();
    for (const item of parsed.checklist) {
      if (item && typeof item.id === "string" && typeof item.done === "boolean") {
        doneById.set(item.id, item.done);
      }
    }
    const hydrated: PetReplayState = {
      phase: parsed.phase,
      status: parsed.status,
      acceptedAt: typeof parsed.acceptedAt === "number" ? parsed.acceptedAt : null,
      deadline: typeof parsed.deadline === "number" ? parsed.deadline : null,
      checklist: base.checklist.map((item) => ({
        ...item,
        done: doneById.get(item.id) ?? false,
      })),
      branchPreviewSelection:
        parsed.branchPreviewSelection === "main" ||
        parsed.branchPreviewSelection === "test" ||
        parsed.branchPreviewSelection === PET_REPLAY_SESSION_ID
          ? parsed.branchPreviewSelection
          : "main",
      testAppOpened: Boolean(parsed.testAppOpened),
      wrapUpPhase:
        parsed.wrapUpPhase === "polling" || parsed.wrapUpPhase === "green" ? parsed.wrapUpPhase : "none",
      wrapUpStep:
        typeof parsed.wrapUpStep === "number" && parsed.wrapUpStep >= 0
          ? Math.min(Math.floor(parsed.wrapUpStep), PET_WRAP_UP_STEPS.length)
          : 0,
      reportSubmitted: Boolean(parsed.reportSubmitted),
      mainUpdated: Boolean(parsed.mainUpdated),
      reconciled: Boolean(parsed.reconciled),
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.filter(
            (m): m is PetReplayMessage =>
              Boolean(m) &&
              typeof m.id === "string" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
        : base.messages,
    };
    if (hydrated.messages.length === 0) hydrated.messages = base.messages;
    if (hydrated.status === "MERGED" || hydrated.status === "COMPLETE") {
      // States saved before the wrap-up flow existed had already passed the merge step.
      hydrated.wrapUpPhase = "green";
      hydrated.wrapUpStep = PET_WRAP_UP_STEPS.length;
    } else if (hydrated.status !== "PR OPEN") {
      hydrated.wrapUpPhase = "none";
      hydrated.wrapUpStep = 0;
    } else if (hydrated.wrapUpPhase === "green") {
      hydrated.wrapUpStep = PET_WRAP_UP_STEPS.length;
    }
    if (hydrated.status === "COMPLETE" && typeof parsed.reportSubmitted !== "boolean") {
      // Legacy COMPLETE came from the old final step, which had already promoted main.
      hydrated.reportSubmitted = true;
      hydrated.mainUpdated = true;
    }
    if (hydrated.status === "CODING" && hydrated.deadline !== null && now >= hydrated.deadline) {
      return petReplayReducer(hydrated, { type: "TICK", now });
    }
    return hydrated;
  } catch {
    return createInitialPetReplayState();
  }
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadPetReplayState(storage?: StorageLike | null, now = Date.now()): PetReplayState {
  const target = storage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!target) return createInitialPetReplayState();
  try {
    return parsePetReplayState(target.getItem(PET_SESSION_STORAGE_KEY), now);
  } catch {
    return createInitialPetReplayState();
  }
}

export function savePetReplayState(state: PetReplayState, storage?: StorageLike | null): void {
  const target = storage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!target) return;
  try {
    target.setItem(PET_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable
  }
}

export function clearPetReplayState(storage?: StorageLike | null): void {
  const target = storage ?? (typeof window !== "undefined" ? window.sessionStorage : null);
  if (!target) return;
  try {
    target.removeItem(PET_SESSION_STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}
