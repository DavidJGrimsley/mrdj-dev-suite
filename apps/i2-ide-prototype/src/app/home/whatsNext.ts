// Home "What's Next": Infie scans the open projects and proposes up to three real next actions.
// Pure and derived only from existing prototype state (Pet replay reducer, imported Field Notes,
// tutorial-owned Experimemo flow); nothing here invents sessions or completed work.

import type { PetReplayStatus, PetWrapUpPhase } from "../pet/petSessionData.ts";
import {
  PET_REPLAY_PROJECT_ID,
  PET_REPLAY_SESSION_ID,
  PET_REPLAY_SESSION_NAME,
} from "../pet/petSessionData.ts";
import { getSessionActions, SESSION_NAME, type FlowState } from "../../tutorial/flow.ts";
import { IMPORT_PROJECT_ID, IMPORT_PROJECT_NAME, IMPORTED_SESSIONS } from "./importedProject.ts";

export const WHATS_NEXT_MAX_RECOMMENDATIONS = 3;
export const WHATS_NEXT_LABEL = "What's Next";
export const WHATS_NEXT_USER_MESSAGE = "What's next?";
export const WHATS_NEXT_SCANNING_MESSAGE = "Scanning your open projects…";
/** Dissolve of the idle buttons, then the scan beat before proposals appear. */
export const WHATS_NEXT_DISSOLVE_MS = 280;
export const WHATS_NEXT_SCAN_MS = 1200;
export const WHATS_NEXT_REDUCED_SCAN_MS = 400;

// Mirrors the ids in App.tsx (kept here so this module stays importable from node tests).
export const WHATS_NEXT_NOT_HOTDOG_ID = "nothotdog";
export const WHATS_NEXT_EXPERIMEMO_PROJECT_ID = "experimemo";
export const WHATS_NEXT_EXPERIMEMO_SESSION_ID = "experimemo-session";

export type WhatsNextSource = "pet" | "field-notes" | "experimemo";

export type WhatsNextDestination =
  | { kind: "session"; projectId: string; sessionId: string }
  | { kind: "project"; projectId: string };

export interface WhatsNextRecommendation {
  id: WhatsNextSource;
  actionLabel: string;
  project: string;
  session?: string;
  message: string;
  preset: "Recommendation" | "Attention";
  destination: WhatsNextDestination;
}

export interface WhatsNextInput {
  pet: {
    status: PetReplayStatus;
    wrapUpPhase: PetWrapUpPhase;
    mainUpdated: boolean;
    remainingSeconds: number;
  };
  /** Field Notes exists only after the Import flow finished. */
  importedLive: boolean;
  /** The Experimemo tutorial flow; nothing exists until Jenny created the project. */
  experimemo: Pick<FlowState, "projectCreated" | "stage" | "session">;
}

export interface WhatsNextScan {
  /** Infie's conversational summary, one line per project, in priority order. */
  lines: string[];
  /** At most WHATS_NEXT_MAX_RECOMMENDATIONS, deterministic priority: Pet, Field Notes, Experimemo. */
  recommendations: WhatsNextRecommendation[];
}

const PET_PROJECT_NAME = "Pet Show and Tell";

function petCandidate(pet: WhatsNextInput["pet"]): { line: string; rec: WhatsNextRecommendation | null } {
  const session = (actionLabel: string, message: string, preset: WhatsNextRecommendation["preset"] = "Recommendation") => ({
    id: "pet" as const,
    actionLabel,
    project: PET_PROJECT_NAME,
    session: PET_REPLAY_SESSION_NAME,
    message,
    preset,
    destination: { kind: "session" as const, projectId: PET_REPLAY_PROJECT_ID, sessionId: PET_REPLAY_SESSION_ID },
  });
  switch (pet.status) {
    case "PLAN REVIEW":
      return {
        line: "Pet Show and Tell: Add Comments has a plan waiting for your review.",
        rec: session("Review Plan", "PLAN REVIEW · Approve the plan to start coding"),
      };
    case "CODING":
      return {
        line: `Pet Show and Tell: agents are still coding Add Comments (${pet.remainingSeconds}s left).`,
        rec: session("Check on", `Agents coding · ${pet.remainingSeconds}s left`),
      };
    case "WAITING ON TEST":
      return {
        line: "Pet Show and Tell: Add Comments finished coding and is waiting for you to test it.",
        rec: session("Test App", "Diffs ready · Mount v2 to test", "Attention"),
      };
    case "NEEDS YOU":
      return {
        line: "Pet Show and Tell: Add Comments needs you to finish its human testing checklist.",
        rec: session("Checklist", "v2 mounted · Finish the 4 human checks", "Attention"),
      };
    case "VERIFIED":
      return {
        line: "Pet Show and Tell: Add Comments is verified and ready for a pull request.",
        rec: session("Open PR", "Human testing verified"),
      };
    case "PR OPEN":
      if (pet.wrapUpPhase === "green") {
        return {
          line: "Pet Show and Tell: wrap up is green on Add Comments — it's ready to merge.",
          rec: session("Merge", "Wrap up green · Merge into test"),
        };
      }
      if (pet.wrapUpPhase === "polling") {
        return {
          line: "Pet Show and Tell: wrap up is still running on Add Comments.",
          rec: session("Check on", "Wrapping up · Doctor, CI, and review threads"),
        };
      }
      return {
        line: "Pet Show and Tell: the Add Comments PR is open and needs a wrap up.",
        rec: session("Wrap up", "PR open · Run Doctor, CI, and review checks"),
      };
    case "MERGED":
      return {
        line: "Pet Show and Tell: Add Comments is merged to test — its completion report is waiting for you.",
        rec: session("Submit Report", "Merged to test · Submit the blank completion report"),
      };
    case "COMPLETE":
      if (pet.mainUpdated) {
        return {
          line: "Pet Show and Tell: Add Comments is complete and main is updated — no pending items.",
          rec: null,
        };
      }
      return {
        line: "Pet Show and Tell: Add Comments is complete on test; main is still on the baseline.",
        rec: {
          id: "pet",
          actionLabel: "Update Main or Reconcile",
          project: PET_PROJECT_NAME,
          message: "Session complete · Choose on Project Home",
          preset: "Recommendation",
          destination: { kind: "project", projectId: PET_REPLAY_PROJECT_ID },
        },
      };
    default:
      return { line: "", rec: null };
  }
}

function fieldNotesCandidate(importedLive: boolean): { line: string; rec: WhatsNextRecommendation | null } | null {
  if (!importedLive || IMPORTED_SESSIONS.length === 0) return null;
  return {
    line: `${IMPORT_PROJECT_NAME} has ${IMPORTED_SESSIONS.length} sessions open — open the project to review them and pick what you want to do.`,
    rec: {
      id: "field-notes",
      actionLabel: "Review sessions",
      project: IMPORT_PROJECT_NAME,
      message: `${IMPORTED_SESSIONS.length} sessions open · Pick one on Project Home`,
      preset: "Recommendation",
      destination: { kind: "project", projectId: IMPORT_PROJECT_ID },
    },
  };
}

function experimemoCandidate(
  flow: WhatsNextInput["experimemo"],
): { line: string; rec: WhatsNextRecommendation | null } | null {
  if (!flow.projectCreated) return null;
  const project = "Experimemo";
  const home = (actionLabel: string, message: string): WhatsNextRecommendation => ({
    id: "experimemo",
    actionLabel,
    project,
    message,
    preset: "Recommendation",
    destination: { kind: "project", projectId: WHATS_NEXT_EXPERIMEMO_PROJECT_ID },
  });
  const s = flow.session;
  if (!s) {
    if (flow.stage === "cleaned-up") {
      return { line: "Experimemo: its session is complete and archived — no pending items.", rec: null };
    }
    if (flow.stage === "starter") {
      return {
        line: "Experimemo is generated but has no session yet — ask What's Next on its project home to plan one.",
        rec: home("Plan first session", "New Exact project · No session yet"),
      };
    }
    if (flow.stage === "plan-ready") {
      return {
        line: `Experimemo: the ${SESSION_NAME} plan is ready to start.`,
        rec: home("Start Session", `Plan ready · ${SESSION_NAME}`),
      };
    }
    if (flow.stage === "session") return null; // A session stage without a session is not actionable.
    return {
      line: "Experimemo: planning its first session is still in progress on project home.",
      rec: home("Continue planning", "Planning the first session"),
    };
  }
  const session = (actionLabel: string, message: string, preset: WhatsNextRecommendation["preset"] = "Recommendation") => ({
    id: "experimemo" as const,
    actionLabel,
    project,
    session: SESSION_NAME,
    message,
    preset,
    destination: {
      kind: "session" as const,
      projectId: WHATS_NEXT_EXPERIMEMO_PROJECT_ID,
      sessionId: WHATS_NEXT_EXPERIMEMO_SESSION_ID,
    },
  });
  const line = `Experimemo: the ${SESSION_NAME} session isn't finished yet (${s.status}).`;
  const next = getSessionActions(s)[0];
  if (next) {
    const label = next.key === "confirm-cleanup" ? "Confirm Clean up" : next.label;
    const preset = next.key === "fix" ? "Attention" : "Recommendation";
    return { line, rec: session(label, `${s.status} · Unfinished session`, preset) };
  }
  if (s.status === "MERGED" && s.lesson === "form") {
    return { line, rec: session("Submit Report", "MERGED · Completion report waiting") };
  }
  if (s.status === "NEEDS YOU" || s.status === "VERIFIED") {
    return { line, rec: session("Finish testing", `${s.status} · Human testing open`, "Attention") };
  }
  return { line, rec: session("Check on", `${s.status} · Agents working`) };
}

/** Deterministic: Pet first, imported Field Notes second, generated Experimemo third; Not Hotdog never acts. */
export function scanOpenProjects(input: WhatsNextInput): WhatsNextScan {
  const candidates = [
    petCandidate(input.pet),
    fieldNotesCandidate(input.importedLive),
    experimemoCandidate(input.experimemo),
  ].filter((c): c is { line: string; rec: WhatsNextRecommendation | null } => Boolean(c && c.line));

  const lines = candidates.map((c) => c.line);
  lines.push("Not Hotdog: no pending items.");

  const seen = new Set<string>();
  const recommendations: WhatsNextRecommendation[] = [];
  for (const c of candidates) {
    if (!c.rec || seen.has(c.rec.id)) continue;
    seen.add(c.rec.id);
    recommendations.push(c.rec);
    if (recommendations.length === WHATS_NEXT_MAX_RECOMMENDATIONS) break;
  }
  return { lines, recommendations };
}

/** Infie's closing line after the scan. */
export function whatsNextSummary(scan: WhatsNextScan): string {
  const n = scan.recommendations.length;
  if (n === 0) return "Nothing is waiting on you right now — every open project is caught up.";
  return n === 1 ? "Here's the one thing I'd pick up next:" : `Here are the ${n} things I'd pick up next:`;
}
