// ─── Canonical Onboarding Beats & Reveal Ledger ────────────────────────────
// Drives the progressive reveal of the persistent i² Home / Project / Session shell
// per tutorial-script.md.

import { assetUrl } from "../assetUrl";

export type OnboardingBeat =
  | "B00"
  | "B01"
  | "B02"
  | "B03"
  | "B04"
  | "B05"
  | "B06"
  | "B07"
  | "B08"
  | "B09"
  | "B10"
  | "B11"
  | "B12"
  | "B13"
  | "B14"
  | "B15"
  | "B16"
  | "B17"
  | "B18"
  | "B19"
  | "B20"
  | "B21"
  | "COMPLETE";

export const BEAT_ORDER: readonly OnboardingBeat[] = [
  "B00",
  "B01",
  "B02",
  "B03",
  "B04",
  "B05",
  "B06",
  "B07",
  "B08",
  "B09",
  "B10",
  "B11",
  "B12",
  "B13",
  "B14",
  "B15",
  "B16",
  "B17",
  "B18",
  "B19",
  "B20",
  "B21",
  "COMPLETE",
] as const;

// ─── Tutorial tracks ─────────────────────────────────────────────────────────
// The beats above are shared by three scripted tutorials. Each track runs its own
// subset in order; Generate and Import keep their existing flows.
export type TutorialTrackId = "meet-infie" | "project-session" | "widgets";

/** Project & Session Flow can run whole, or start at either portion. */
export type ProjectSessionPortion = "full" | "project" | "session";

export const TRACK_BEATS: Record<TutorialTrackId, readonly OnboardingBeat[]> = {
  "meet-infie": ["B00", "B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B10", "B11", "B12", "B20", "B21"],
  "project-session": ["B08", "B09", "B13", "B14", "B15", "B16", "B17", "B19"],
  widgets: ["B18"],
};

/** Track a `?beat=` deep link belongs to (B08 is Meet Infie's navigation turn). */
export function trackForBeat(beat: OnboardingBeat): TutorialTrackId | null {
  if (beat === "COMPLETE") return null;
  if (beat === "B18") return "widgets";
  if (beat !== "B08" && TRACK_BEATS["project-session"].includes(beat)) return "project-session";
  return "meet-infie";
}

export type InfieFormId = "mist" | "glyph" | "surge" | "compile";

export const INFIE_FORM_ASSETS: Record<InfieFormId, string> = {
  mist: assetUrl("/assets/infie-form-mist.png"),
  glyph: assetUrl("/assets/infie-form-glyph.png"),
  surge: assetUrl("/assets/infie-form-surge.png"),
  compile: assetUrl("/assets/infie-form-compile.png"),
};

// Silent form cycle per tutorial-script.md:
// Repeating cycle Mist -> Glyph -> Surge -> Compile with no two adjacent beats sharing a form
// within a tutorial track (Meet Infie skips B09 and B13–B19; Project & Session Flow runs
// B08, B09, B13–B17, B19; Widgets & Whatnot is B18 alone).
// B05 uses Glyph (Mist skipped because B06 Controls is Mist); B06 pauses cycle in Mist;
// B07 resumes with Surge; B08 stays Compile across all its turns.
export const BEAT_FORM_MAP: Record<OnboardingBeat, InfieFormId> = {
  B00: "mist",
  B01: "mist",
  B02: "glyph",
  B03: "surge",
  B04: "compile",
  B05: "glyph",
  B06: "mist",
  B07: "surge",
  B08: "compile",
  B09: "mist",
  B10: "glyph",
  B11: "surge",
  B12: "compile",
  B13: "surge",
  B14: "glyph",
  B15: "surge",
  B16: "compile",
  B17: "mist",
  B18: "glyph",
  B19: "surge",
  B20: "glyph",
  B21: "mist",
  COMPLETE: "mist",
};

export function getInfieFormForBeat(beat: OnboardingBeat): InfieFormId {
  return BEAT_FORM_MAP[beat] ?? "mist";
}

export function getInfieFormAssetForBeat(beat: OnboardingBeat): string {
  return INFIE_FORM_ASSETS[getInfieFormForBeat(beat)];
}

export const B17_EXPLANATIONS: readonly string[] = [
  "Here's the Session Completion Form. I've filled in most of it. Check the corrections, add feedback, and hit Submit. Free plans need one; paid users can contribute too. Auto-submit on merge in Settings still counts.",
  "These forms boost your level while you work. Corrections go back to iSquared, not your codebase. How many open Sessions you can leave unsubmitted depends on your level and plan.",
  "We're also exploring quantum machine learning alongside the regular analysis. It's research; nothing you build depends on it. Forms, donors, and paid users help keep i² running, and my creator is grateful to the open-source and free-education communities.",
] as const;

/**
 * B15 Agents and tasks. Every turn but the last is gated by Continue; the last is gated by
 * checking the demo Human task. Turn logic derives from this list's length.
 */
export const B15_LINES: readonly string[] = [
  "Each Session has Session Agents working on it. Pick the model: ready-made agents, your own, or imported ones. i² is where they work together.",
  "Me, the Session Agents, and any other agents you bring in work through the iSquared MCP and tools. We block dangerous mistakes, steer around pitfalls, and put best practices to work.",
  "Simulators are built in, too. Session Agents use them to check their own work, and you can use them to see it yourself.",
  "Tasks come in two groups: Session Agent tasks and Human tasks. You're the human. This one's ready for you to verify. Click on all open tasks to mark them complete.",
] as const;
/** Index of the B15 turn that reveals the task groups and waits for the Human task check. */
export const B15_TASKS_TURN = B15_LINES.length - 1;

/**
 * B19 Away from the desk (Project & Session Flow's last beat). Every turn is gated by
 * Continue; Continue on `B19_TURN2_LINE` finishes the tutorial in the session view.
 */
export const B19_LINES: readonly string[] = [
  "The website lets even your non-technical teammates join in too, without the desktop app or the codebase. The mobile app brings notifications, updates, and chat, and you can open your environments on mobile, the website, or in VR.",
] as const;
/** Index of the B19 turn that closes Project & Session Flow. */
export const B19_FINAL_TURN = B19_LINES.length;

/** B12 Turn 0 bridge line: shown as the conversation slides left to its Home chat position. */
export const B12_BRIDGE_LINE = "Let me scoot over and make some room.";

/** B17 after Submit: what submitting did to the demo Session (gated by Continue). */
export const B17_SESSION_CLOSED_LINE =
  "Submitted. Next I close the session: its branches are merged and cleaned up, both locally and on the remote, barring your approval.";

/**
 * Widgets & Whatnot (B18): 0 arrange demo, 1 panels/collapse, 2 Preference Sliders,
 * 3 open Widgets (skipped when the gallery was already open), 4 Library, 5 explore on your own.
 */
export const B18_MOVE_TURN = 0;
export const B18_PANELS_TURN = 1;
export const B18_SLIDERS_TURN = 2;
export const B18_OPEN_WIDGETS_TURN = 3;
export const B18_LIBRARY_TURN = 4;
export const B18_EXPLORE_TURN = 5;

export const B18_LINES: readonly string[] = [
  "Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want, and iSquared supports fullscreen multiple-screen layout saves. Let's try it with a widget.",
  "You can drag panel edges to resize them or collapse a panel completely. Double-click my chat header or tab bar anytime to collapse all panels and focus on our conversation, then double-click again to bring them back.",
  "Preference Sliders apply to all models in all conversations. Find them in Widgets any time. How fast would you like the text? Try the Speed slider—even while I'm talking.",
  "Click Widgets in the header to see everything else you can add to your workspace.",
  "One of my favorites is the Library: screens, flows, components, and packages that fit your project.",
  "Explore the rest of the widgets on your own!",
] as const;

/** B14 demo agent question (arrives in the Project Home Infie chat) and its pre-filled reply. */
export const B14_AGENT_QUESTION = "Should new comments show newest first or oldest first?";
export const B14_AGENT_REPLY_DEFAULT = "Newest first.";

/** B19 closing line of Project & Session Flow (user-directed copy). */
export const B19_TURN2_LINE =
  "If your project didn't start in i², I'll onboard it for you. I'll offer a tutorial when you do something new here.";

export type RevealGroupId =
  | "infie_and_message"
  | "identity_controls"
  | "level_indicator"
  | "continue_button"
  | "project_interest_reply"
  | "music_play_only"
  | "music_full_player"
  | "controls_mic_prompt"
  | "controls_illustrations"
  | "workspace_tree"
  | "project_folder_only"
  | "folder_illustration"
  | "stylist_preview"
  | "model_signin_buttons"
  | "header_breadcrumbs"
  | "header_tutorials_widgets_games"
  | "header_notifications_settings"
  | "home_header_controls"
  | "home_conversation_entry"
  | "home_resume_projects"
  | "home_new_import_buttons"
  | "home_action_buttons"
  | "home_projects_and_actions"
  | "project_navigation"
  | "project_roadmap_sessions"
  | "demo_session_and_question"
  | "session_agent_controls"
  | "session_task_groups"
  | "session_pr_status"
  | "session_completion_form"
  | "widget_move_resize"
  | "library_entry_and_example"
  | "tutorials_entry";

export type RevealLifetime =
  | "persistent"
  | "temporary"
  | "tutorial-data"
  | "normal-ui";

export interface RevealLedgerEntry {
  id: RevealGroupId;
  group: string;
  firstBeat: OnboardingBeat;
  cue: string;
  locationAndGate: string;
  lifetime: RevealLifetime;
  componentTarget: string;
}

export const REVEAL_LEDGER: Record<RevealGroupId, RevealLedgerEntry> = {
  infie_and_message: {
    id: "infie_and_message",
    group: "Infie and current message",
    firstBeat: "B01",
    cue: "B01 arrival / B02 hello",
    locationAndGate: "Floating in usable negative space",
    lifetime: "persistent",
    componentTarget: "FloatingInfieStage / FloatingInfieMessage",
  },
  identity_controls: {
    id: "identity_controls",
    group: "Identity controls",
    firstBeat: "B02",
    cue: "B02 name question",
    locationAndGate: "Beside message; Submit or GitHub",
    lifetime: "temporary",
    componentTarget: "FloatingIdentityControls",
  },
  level_indicator: {
    id: "level_indicator",
    group: "Level",
    firstBeat: "B03",
    cue: "B03 “level zero”",
    locationAndGate: "Actual top-right Home header anchor",
    lifetime: "persistent",
    componentTarget: "Header[data-name='Level']",
  },
  continue_button: {
    id: "continue_button",
    group: "Continue",
    firstBeat: "B04",
    cue: "B04 reply to the user’s project interest",
    locationAndGate: "Beside current message",
    lifetime: "temporary",
    componentTarget: "FloatingContinueButton",
  },
  project_interest_reply: {
    id: "project_interest_reply",
    group: "Project-interest reply",
    firstBeat: "B04",
    cue: "B04 question",
    locationAndGate: "Beside message; Send or Continue",
    lifetime: "temporary",
    componentTarget: "FloatingProjectInterestReply",
  },
  music_play_only: {
    id: "music_play_only",
    group: "Play button (music player anchor)",
    firstBeat: "B05",
    cue: "B05 music question",
    locationAndGate: "Actual lower-left Home widget anchor; Play or Continue",
    lifetime: "persistent",
    componentTarget: "LeekBeatsWidget (Play button)",
  },
  music_full_player: {
    id: "music_full_player",
    group: "Play → music player (LeekBeats)",
    firstBeat: "B05",
    cue: "B05 “music player”",
    locationAndGate: "Actual lower-left Home widget anchor; Play or Continue",
    lifetime: "persistent",
    componentTarget: "LeekBeatsWidget (Prev / Play-Pause / Next / LeekBeats label)",
  },
  controls_mic_prompt: {
    id: "controls_mic_prompt",
    group: "Simulated microphone permission prompt",
    firstBeat: "B06",
    cue: "B06 “I'm all ears if you want to speak conversationally.”",
    locationAndGate: "Unboxed prompt; Allow microphone or Not now",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (B06 mic prompt)",
  },
  controls_illustrations: {
    id: "controls_illustrations",
    group: "Controls transformation videos and device illustrations",
    firstBeat: "B06",
    cue: "B06 keyboard/mouse, gamepad, joystick/numpad",
    locationAndGate: "Floating beside Infie; Continue per turn",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (B06 controls stage)",
  },
  workspace_tree: {
    id: "workspace_tree",
    group: "Animated vertical native i2Workspace tree",
    firstBeat: "B08",
    cue: "Project & Session Flow B08 Turn 0 “Here you'll work in an i² Workspace.”",
    locationAndGate: "Vertical native tree; fades on Continue",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (WorkspaceTree)",
  },
  project_folder_only: {
    id: "project_folder_only",
    group: "Isolated green project/ folder and B09 vertical file list",
    firstBeat: "B08",
    cue: "Project & Session Flow B08 Turn 1 “The key to working with i² is the project folder.”",
    locationAndGate: "Green project/ folder alone -> 4 files in B09",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (GreenProjectFolder)",
  },
  folder_illustration: {
    id: "folder_illustration",
    group: "Folder and four file labels",
    firstBeat: "B08",
    cue: "B08–B09 matching line",
    locationAndGate: "Small floating illustration; Continue per turn",
    lifetime: "temporary",
    componentTarget: "FloatingProjectFolderIllustration",
  },
  stylist_preview: {
    id: "stylist_preview",
    group: "Static preview of The Stylist",
    firstBeat: "B09",
    cue: "B09 “style.md is the colors, typography…”",
    locationAndGate: "Right of messages on style.md; retires before guidelines.md",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (StylistStaticPreview)",
  },
  model_signin_buttons: {
    id: "model_signin_buttons",
    group: "Faux model provider sign-in buttons",
    firstBeat: "B10",
    cue: "B10 models configuration",
    locationAndGate: "Claude, ChatGPT, Grok, Gemini, Cline, local (≥1 required)",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (ModelSignInButtons)",
  },
  header_breadcrumbs: {
    id: "header_breadcrumbs",
    group: "Header i2 / Project / Session breadcrumbs",
    firstBeat: "B08",
    cue: "Meet Infie B08 “Here's how navigation works”",
    locationAndGate: "Spotlight near Infie -> top-left Header anchor; docks on Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderBreadcrumbs']",
  },
  header_tutorials_widgets_games: {
    id: "header_tutorials_widgets_games",
    group: "Header Learn, Widgets, Games group",
    firstBeat: "B11",
    cue: "B11 Turn 0 “Click Learn for tutorials and lessons…”",
    locationAndGate: "Spotlight -> docks on Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderTutorialsWidgetsGames']",
  },
  header_notifications_settings: {
    id: "header_notifications_settings",
    group: "Header Notification / Settings group",
    firstBeat: "B11",
    cue: "B11 Turn 1 “Your alerts, notifications and settings live here.”",
    locationAndGate: "Spotlight -> docks on Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderNotificationsSettings']",
  },
  home_header_controls: {
    id: "home_header_controls",
    group: "Home header/identity/navigation",
    firstBeat: "B11",
    cue: "B12 Turn 0 “Let me scoot over…” — Workspace/Emulators appear",
    locationAndGate: "Existing Home positions",
    lifetime: "persistent",
    componentTarget: "Header (breadcrumbs, Widgets/Games, Workspace/Emulators, Bell/Settings)",
  },
  home_conversation_entry: {
    id: "home_conversation_entry",
    group: "Home conversation entry",
    firstBeat: "B12",
    cue: "B12 Turn 1 “Let me scoot over…” — conversation slides to Home chat",
    locationAndGate: "Existing Home position",
    lifetime: "persistent",
    componentTarget: "I2HomeScreen (left Infie conversation column)",
  },
  home_resume_projects: {
    id: "home_resume_projects",
    group: "Resume projects section",
    firstBeat: "B12",
    cue: "B12 Turn 2 “You can resume projects…”",
    locationAndGate: "Existing Home Active Projects grid (non-clickable during Meet Infie)",
    lifetime: "persistent",
    componentTarget: "I2HomeScreen (Active Projects grid)",
  },
  home_new_import_buttons: {
    id: "home_new_import_buttons",
    group: "Generate new project and Import Project buttons",
    firstBeat: "B12",
    cue: "B12 Turn 3 “You can also start new projects…”",
    locationAndGate: "Existing Home CTA row",
    lifetime: "persistent",
    componentTarget: "I2HomeScreen (Generate + Import buttons)",
  },
  home_action_buttons: {
    id: "home_action_buttons",
    group: "Action buttons associated with dummy data",
    firstBeat: "B12",
    cue: "B12 Turn 5 “I'll present Action Buttons…”",
    locationAndGate: "Inside Home Infie chat",
    lifetime: "persistent",
    componentTarget: "I2HomeScreen (InfieActionRow)",
  },
  home_projects_and_actions: {
    id: "home_projects_and_actions",
    group: "New project and project picker",
    firstBeat: "B12",
    cue: "B12 Home reveals",
    locationAndGate: "Existing Home positions",
    lifetime: "persistent",
    componentTarget: "I2HomeScreen (Active Projects grid + Generate + Open New)",
  },
  project_navigation: {
    id: "project_navigation",
    group: "Project title/switcher/Home navigation",
    firstBeat: "B13",
    cue: "Project & Session Flow B13 first line",
    locationAndGate: "Existing project positions",
    lifetime: "normal-ui",
    componentTarget: "ProjectHomeScreen Header",
  },
  project_roadmap_sessions: {
    id: "project_roadmap_sessions",
    group: "Roadmap/Session groups",
    firstBeat: "B13",
    cue: "B13 “roadmap and Sessions”",
    locationAndGate: "Existing Project Home content",
    lifetime: "normal-ui",
    componentTarget: "ProjectHomeScreen columns & Sessions panel",
  },
  demo_session_and_question: {
    id: "demo_session_and_question",
    group: "Demo Session and inline question",
    firstBeat: "B14",
    cue: "B14 Session/question line",
    locationAndGate: "Project Home; reply, then open Session",
    lifetime: "tutorial-data",
    componentTarget: "ProjectHomeScreen demo session & inline chat agent question",
  },
  session_agent_controls: {
    id: "session_agent_controls",
    group: "Session/agent/model controls",
    firstBeat: "B15",
    cue: "B15 first line",
    locationAndGate: "Existing Session positions",
    lifetime: "normal-ui",
    componentTarget: "SessionScreen Header & agent/model bar",
  },
  session_task_groups: {
    id: "session_task_groups",
    group: "Agent/Human task groups",
    firstBeat: "B15",
    cue: "B15 “Tasks come in two groups”",
    locationAndGate: "Existing Session content; human review action",
    lifetime: "normal-ui",
    componentTarget: "SessionScreen Agent Tasks & Human Testing panels",
  },
  session_pr_status: {
    id: "session_pr_status",
    group: "PR/review/completion status",
    firstBeat: "B16",
    cue: "B16 PR explanation",
    locationAndGate: "Existing status position",
    lifetime: "tutorial-data",
    componentTarget: "SessionScreen StatusChip & Branch/PR panel",
  },
  session_completion_form: {
    id: "session_completion_form",
    group: "Completion form",
    firstBeat: "B17",
    cue: "B17 “Session Completion Form”",
    locationAndGate: "Session chat column above the action row; Submit after explanation",
    lifetime: "temporary",
    componentTarget: "SessionCompletionForm (Session chat column)",
  },
  widget_move_resize: {
    id: "widget_move_resize",
    group: "Widget move/resize controls",
    firstBeat: "B18",
    cue: "Widgets & Whatnot “Move it, resize it”",
    locationAndGate: "On/near music widget; arranging is demonstrated on a sample layout",
    lifetime: "normal-ui",
    componentTarget: "LeekBeatsWidget drag/resize/keyboard move controls",
  },
  library_entry_and_example: {
    id: "library_entry_and_example",
    group: "Library entry and example",
    firstBeat: "B18",
    cue: "Widgets & Whatnot “the Library”",
    locationAndGate: "Existing widget entry/location",
    lifetime: "persistent",
    componentTarget: "Header Widgets gallery with highlighted Library entry",
  },
  tutorials_entry: {
    id: "tutorials_entry",
    group: "Learn entry",
    firstBeat: "B11",
    cue: "B11 “Click Learn…” / B20 “Learn has the other tutorials…”",
    locationAndGate: "Actual final Home position; opens the Learn modal",
    lifetime: "persistent",
    componentTarget: "Header Learn button",
  },
};

export const PERSISTENT_RELEASE_GROUPS: readonly RevealGroupId[] = (
  Object.values(REVEAL_LEDGER) as RevealLedgerEntry[]
)
  .filter((entry) => entry.lifetime === "persistent" || entry.lifetime === "normal-ui")
  .map((entry) => entry.id);

/**
 * Reveals that Project & Session Flow stages itself even though they persist afterwards
 * (Project Home panels slide in at B13, task groups appear at B15).
 */
export const PROJECT_SESSION_STAGED_GROUPS: readonly RevealGroupId[] = [
  "project_roadmap_sessions",
  "session_task_groups",
];

/** Groups a later tutorial starts from: the finished Meet Infie shell, minus its own staged reveals. */
export function getStartingGroupsForTrack(track: TutorialTrackId): Set<RevealGroupId> {
  const set = new Set(PERSISTENT_RELEASE_GROUPS);
  if (track === "project-session") {
    for (const id of PROJECT_SESSION_STAGED_GROUPS) set.delete(id);
  }
  return set;
}

export function getInitialRevealedGroupsForBeat(beat: OnboardingBeat): Set<RevealGroupId> {
  if (beat === "COMPLETE") {
    return new Set(PERSISTENT_RELEASE_GROUPS);
  }
  const track = trackForBeat(beat);
  const targetIndex = BEAT_ORDER.indexOf(beat);
  if (track && track !== "meet-infie") {
    // A deep link lands mid-tutorial: staged reveals from earlier beats are already shown.
    const set = getStartingGroupsForTrack(track);
    for (const id of PROJECT_SESSION_STAGED_GROUPS) {
      if (BEAT_ORDER.indexOf(REVEAL_LEDGER[id].firstBeat) <= targetIndex) set.add(id);
    }
    return set;
  }
  if (targetIndex <= 0) {
    return new Set();
  }
  const set = new Set<RevealGroupId>();
  for (const entry of Object.values(REVEAL_LEDGER) as RevealLedgerEntry[]) {
    if (entry.lifetime === "persistent" || entry.lifetime === "normal-ui") {
      const entryIndex = BEAT_ORDER.indexOf(entry.firstBeat);
      if (entryIndex >= 0 && entryIndex <= targetIndex) {
        set.add(entry.id);
      }
    }
  }
  return set;
}
