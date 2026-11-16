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

export type InfieFormId = "mist" | "glyph" | "surge" | "compile";

export const INFIE_FORM_ASSETS: Record<InfieFormId, string> = {
  mist: assetUrl("/assets/infie-form-mist.png"),
  glyph: assetUrl("/assets/infie-form-glyph.png"),
  surge: assetUrl("/assets/infie-form-surge.png"),
  compile: assetUrl("/assets/infie-form-compile.png"),
};

// Silent 21-beat form cycle per tutorial-script.md:
// Repeating cycle Mist -> Glyph -> Surge -> Compile with no two adjacent beats sharing a form.
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
  B13: "mist",
  B14: "glyph",
  B15: "surge",
  B16: "compile",
  B17: "mist",
  B18: "glyph",
  B19: "surge",
  B20: "compile",
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
  "This is the Session Completion Form. I do most of the work. You check the corrections, give feedback, and hit Submit. They're quick and easy, and I've already filled in most of it.",
  "If you're on the free plan, session completion forms are required and users on the paid plans are still welcome to contribute. You can also turn on auto-submit on merge in Settings for future sessions. An auto-submitted form still counts as your completion form. These boost your level and are the primary way to passively increase it while you work. We greatly appreciate it.",
  "Either way, the corrected actions are what get sent back to improve iSquared, not your codebase. That means the next time you or another dev attempt this same thing, we will avoid that mistake.",
  "iSquared is also exploring quantum computing: quantum machine learning runs in tandem with the regular analysis of those requests, so we can see where quantum computing really fits into the IDE. It's research for now. Nothing you build depends on it.",
  "Session Completion Forms, donors, and paid users are what keep this experience running.",
  "It's great to contribute to the Infinite Intelligence that drives this experience, made possible by the vast open source and free education materials available today. For which my creator is eternally grateful to the community.",
] as const;

/**
 * B15 Agents and tasks. Every turn but the last is gated by Continue; the last is gated by
 * checking the demo Human task. Turn logic derives from this list's length.
 */
export const B15_LINES: readonly string[] = [
  "Each Session has Session Agents working on it. The model is up to you. Use our ready-made agents, bring your own, or import them. i² gives them a place to work together.",
  "Me, the Session Agents, and any other agents you bring in all work through the iSquared MCP and tools. They're there to prevent dangerous mistakes in your codebase, steer around common pitfalls, and put best practices into practice.",
  "Simulators are built in, too. Session Agents use them to check their own work, and you can use them to see it for yourself.",
  "Tasks come in two groups: Session Agent tasks and Human tasks. You're the human. This one's ready for you to verify. Click on all open tasks to mark them complete.",
] as const;
/** Index of the B15 turn that reveals the task groups and waits for the Human task check. */
export const B15_TASKS_TURN = B15_LINES.length - 1;

/**
 * B19 Away from the desk. Every turn but the last is gated by Continue; the last
 * (`B19_TURN2_LINE`) is gated by returning Home.
 */
export const B19_LINES: readonly string[] = [
  "The website lets even your non-technical teammates join in too without downloading the desktop app or codebase. The i² mobile app keeps you connected with notifications, project updates, and chat while you're away. You can also get into your i² project environments through the mobile apps, the website, and apps in your VR headset for a truly immersive experience.",
] as const;
/** Index of the B19 turn that asks the user to head Home. */
export const B19_HOME_TURN = B19_LINES.length;

/** B12 Turn 0 bridge line: shown as the conversation slides left to its Home chat position. */
export const B12_BRIDGE_LINE = "Let me scoot over and make some room.";

/** B17 after Submit: what submitting did to the demo Session (gated by Continue). */
export const B17_SESSION_CLOSED_LINE =
  "Submitted. Next I close the session: its branches are merged and cleaned up, both locally and on the remote, barring your approval.";
/** B17 → B18 segue (no gate). */
export const B17_TO_UI_SEGUE = "So that's the flow of a session, now onto the rest of the UI.";
/** B18 → B19 segue (no gate). */
export const B18_TO_SURFACES_SEGUE = "This IDE is just one surface of iSquared.";

/** B18 5-turn sequence (0: Move music -> bottom, 1: Panels/collapse, 2: Open Widgets, 3: Library callout, 4: Segue). */
export const B18_MOVE_TURN = 0;
export const B18_PANELS_TURN = 1;
export const B18_OPEN_WIDGETS_TURN = 2;
export const B18_LIBRARY_TURN = 3;
export const B18_SEGUE_TURN = 4;

export const B18_LINES: readonly string[] = [
  "Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want and iSquared supports fullscreen multiple screen layout saves. Try moving the music player to the bottom panel underneath this chat.",
  "You can drag panel edges to resize them or collapse a panel completely. Double-click my chat header or tab bar anytime to collapse all panels and focus on our conversation, then double-click again to bring them back.",
  "Click Widgets in the header to see everything else you can add to your workspace.",
  "One of my favorites is the Library: screens, flows, components, and packages that fit your project.",
  B18_TO_SURFACES_SEGUE,
] as const;

/** B14 demo agent question (arrives in the Project Home Infie chat) and its pre-filled reply. */
export const B14_AGENT_QUESTION = "Should new comments show newest first or oldest first?";
export const B14_AGENT_REPLY_DEFAULT = "Newest first.";

/** B19 Turn 1 segue line (user-directed copy). */
export const B19_TURN2_LINE =
  "If your project didn't start in i², I'll onboard it for you. Don't worry about what that means as I'll prompt you with a tutorial any time you do something new here. For now, let's head Home. Click i2 in the top left corner.";

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
  | "tutorial_demo_project"
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
    firstBeat: "B03",
    cue: "B03 “Hit Continue”",
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
    cue: "B08 Turn 1 “Here you will work in an i2 Workspace.”",
    locationAndGate: "Vertical native tree; fades when Continue docks nav in Turn 2",
    lifetime: "temporary",
    componentTarget: "OnboardingStage (WorkspaceTree)",
  },
  project_folder_only: {
    id: "project_folder_only",
    group: "Isolated green project/ folder and B09 vertical file list",
    firstBeat: "B08",
    cue: "B08 Turn 3 “The key to working with i² is the project folder.”",
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
    cue: "B08 Turn 2 “It's also how the UI navigation is structured.”",
    locationAndGate: "Spotlight center -> top-left Header anchor; Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderBreadcrumbs']",
  },
  header_tutorials_widgets_games: {
    id: "header_tutorials_widgets_games",
    group: "Header Tutorials, Widgets, Games group",
    firstBeat: "B11",
    cue: "B11 Turn 1 “Whenever you want to visit more tutorials…”",
    locationAndGate: "Spotlight -> docks on Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderTutorialsWidgetsGames']",
  },
  header_notifications_settings: {
    id: "header_notifications_settings",
    group: "Header Notification / Settings group",
    firstBeat: "B11",
    cue: "B11 Turn 2 “A combined list of alerts…”",
    locationAndGate: "Spotlight -> docks on Continue",
    lifetime: "persistent",
    componentTarget: "Header[data-name='HeaderNotificationsSettings']",
  },
  home_header_controls: {
    id: "home_header_controls",
    group: "Home header/identity/navigation",
    firstBeat: "B11",
    cue: "B11 header groups",
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
    locationAndGate: "Existing Home Active Projects grid (non-clickable until Turn 7)",
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
    cue: "B12 Turn 6 “I'll present Action Buttons…”",
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
  tutorial_demo_project: {
    id: "tutorial_demo_project",
    group: "Tutorial demo project choices glow",
    firstBeat: "B12",
    cue: "B12 Turn 7 “I've filled in some dummy data…”",
    locationAndGate: "Inside existing picker; open it",
    lifetime: "tutorial-data",
    componentTarget: "I2HomeScreen ProjectCard (Pet Show and Tell / Not Hotdog)",
  },
  project_navigation: {
    id: "project_navigation",
    group: "Project title/switcher/Home navigation",
    firstBeat: "B13",
    cue: "B13 first line",
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
    cue: "B18 “Move it, resize it”",
    locationAndGate: "On/near music widget",
    lifetime: "normal-ui",
    componentTarget: "LeekBeatsWidget drag/resize/keyboard move controls",
  },
  library_entry_and_example: {
    id: "library_entry_and_example",
    group: "Library entry and example",
    firstBeat: "B18",
    cue: "B18 “the Library”",
    locationAndGate: "Existing widget entry/location",
    lifetime: "persistent",
    componentTarget: "Header Widgets gallery with highlighted Library entry",
  },
  tutorials_entry: {
    id: "tutorials_entry",
    group: "Tutorials entry",
    firstBeat: "B11",
    cue: "B11 / B20 “Check out the other tutorials”",
    locationAndGate: "Actual final Home position",
    lifetime: "persistent",
    componentTarget: "Header Tutorials button",
  },
};

export const PERSISTENT_RELEASE_GROUPS: readonly RevealGroupId[] = (
  Object.values(REVEAL_LEDGER) as RevealLedgerEntry[]
)
  .filter((entry) => entry.lifetime === "persistent" || entry.lifetime === "normal-ui")
  .map((entry) => entry.id);

export function getInitialRevealedGroupsForBeat(beat: OnboardingBeat): Set<RevealGroupId> {
  if (beat === "COMPLETE") {
    return new Set(PERSISTENT_RELEASE_GROUPS);
  }
  const targetIndex = BEAT_ORDER.indexOf(beat);
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
  if (targetIndex >= BEAT_ORDER.indexOf("B18")) {
    set.add("music_play_only");
    set.add("music_full_player");
    set.add("widget_move_resize");
  }
  if (beat === "B19") {
    set.add("continue_button");
  }
  return set;
}
