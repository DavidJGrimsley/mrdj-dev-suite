import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  OnboardingBeat,
  BEAT_ORDER,
  RevealGroupId,
  PERSISTENT_RELEASE_GROUPS,
  B15_TASKS_TURN,
  B17_EXPLANATIONS,
  B18_LIBRARY_TURN,
  B18_OPEN_WIDGETS_TURN,
  B18_SLIDERS_TURN,
  B19_FINAL_TURN,
  B14_AGENT_REPLY_DEFAULT,
  TutorialTrackId,
  ProjectSessionPortion,
  getInfieFormForBeat,
  getInfieFormAssetForBeat,
  getInitialRevealedGroupsForBeat,
  getStartingGroupsForTrack,
  trackForBeat,
} from "./revealLedger";
import {
  OnboardingContext,
  OnboardingContextValue,
  TutorialOwnedRecord,
  UserProfile,
  LevelUpAnimationStage,
  DockedTutorialChatState,
  StartOnboardingOptions,
  StartTrackOptions,
  TutorialFinishReason,
} from "./onboardingContextDef";

const DEFAULT_MAX_ENABLED_BEAT: OnboardingBeat = "COMPLETE";

// Real user state (profile, interest reply) is kept locally and separate from
// tutorial-owned demo records.
const LS_PROFILE = "i2.onboarding.profile";
const LS_INTEREST = "i2.onboarding.interest";
const LS_MODELS = "i2.onboarding.models";
function lsSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

const EMPTY_DOCKED_CHAT: DockedTutorialChatState = {
  currentLine: "",
  history: [],
  showContinue: false,
  onContinue: undefined,
};

const DEMO_RECORDS: TutorialOwnedRecord[] = [
  { id: "pet", kind: "project", isTutorialDemo: true },
  { id: "nothotdog", kind: "project", isTutorialDemo: true },
  { id: "tutorial-demo-session", kind: "session", isTutorialDemo: true },
  { id: "tutorial-demo-question", kind: "question", isTutorialDemo: true },
];

// The music player keeps playing (and keeps the user's position) through a Meet Infie replay.
const MUSIC_GROUPS: readonly RevealGroupId[] = ["music_play_only", "music_full_player", "widget_move_resize"];

/** Real user state captured when Meet Infie is replayed, restored when the replay ends. */
interface ReplaySnapshot {
  level: number;
  userProfile: UserProfile | null;
  projectInterestReply: string;
  connectedModels: string[];
  micPermissionChoice: "allow" | "not_now" | null;
}

export function OnboardingProvider({
  children,
  initialBeat = "COMPLETE",
  maxEnabledBeat = DEFAULT_MAX_ENABLED_BEAT,
  initialB00GateHeld = false,
}: {
  children: React.ReactNode;
  initialBeat?: OnboardingBeat;
  maxEnabledBeat?: OnboardingBeat;
  initialB00GateHeld?: boolean;
}) {
  const [onboardingRunId, setOnboardingRunId] = useState<number>(0);
  const [activeTutorial, setActiveTutorial] = useState<TutorialTrackId | null>(() => trackForBeat(initialBeat));
  const [projectSessionPortion, setProjectSessionPortion] = useState<ProjectSessionPortion>("full");
  const [isMeetInfieReplay, setIsMeetInfieReplay] = useState(false);
  const [firstRunComplete, setFirstRunComplete] = useState<boolean>(
    () => trackForBeat(initialBeat) !== "meet-infie"
  );
  const replaySnapshotRef = useRef<ReplaySnapshot | null>(null);
  const [currentBeat, setCurrentBeat] = useState<OnboardingBeat>(initialBeat);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [b00GateCompleted, setB00GateCompleted] = useState<boolean>(false);
  const [b00GateHeld, setB00GateHeld] = useState<boolean>(initialB00GateHeld);
  const isScriptedTrack = activeTutorial === "meet-infie" || activeTutorial === "project-session";
  const isTutorialComplete = !isScriptedTrack;
  const [level, setLevel] = useState<number>(() => (trackForBeat(initialBeat) === "meet-infie" ? 0 : 1));
  const [levelUpFlourish, setLevelUpFlourish] = useState<boolean>(false);
  const [levelUpStage, setLevelUpStage] = useState<LevelUpAnimationStage>("idle");
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [projectInterestReply, setProjectInterestReplyState] = useState<string>("");
  const [connectedModels, setConnectedModels] = useState<string[]>([]);
  const [micPermissionChoice, setMicPermissionChoiceState] = useState<"allow" | "not_now" | null>(null);
  const [agentQuestionReplied, setAgentQuestionReplied] = useState<boolean>(false);
  const [agentQuestionReplyText, setAgentQuestionReplyText] = useState<string>("");
  const [demoSessionCompleted, setDemoSessionCompleted] = useState<boolean>(false);
  const [dockedChat, setDockedChat] = useState<DockedTutorialChatState>(EMPTY_DOCKED_CHAT);
  const [revealedGroups, setRevealedGroups] = useState<Set<RevealGroupId>>(() =>
    getInitialRevealedGroupsForBeat(initialBeat)
  );
  const [tutorialRecords, setTutorialRecords] = useState<TutorialOwnedRecord[]>(() =>
    trackForBeat(initialBeat) === "project-session" || trackForBeat(initialBeat) === "meet-infie" ? DEMO_RECORDS : []
  );

  const revealGroup = useCallback((group: RevealGroupId | readonly RevealGroupId[]) => {
    const list = Array.isArray(group) ? group : [group as RevealGroupId];
    setRevealedGroups((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const item of list) {
        if (!next.has(item)) {
          next.add(item);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const retireGroup = useCallback((group: RevealGroupId | readonly RevealGroupId[]) => {
    const list = Array.isArray(group) ? group : [group as RevealGroupId];
    setRevealedGroups((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const item of list) {
        if (next.has(item)) {
          next.delete(item);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const advanceBeat = useCallback(
    (explicitNext?: OnboardingBeat) => {
      setCurrentBeat((prev) => {
        const maxIdx = BEAT_ORDER.indexOf(maxEnabledBeat);
        if (explicitNext) {
          const targetIdx = BEAT_ORDER.indexOf(explicitNext);
          if (targetIdx <= maxIdx) {
            setTurnIndex(0);
            return explicitNext;
          }
          return prev;
        }
        const currentIdx = BEAT_ORDER.indexOf(prev);
        if (currentIdx < 0 || currentIdx >= maxIdx) {
          return prev;
        }
        const nextBeat = BEAT_ORDER[currentIdx + 1] ?? prev;
        setTurnIndex(0);
        return nextBeat;
      });
    },
    [maxEnabledBeat]
  );

  // B00 Gate: Two-second pure black timer (waits while the opening sequence is active)
  useEffect(() => {
    if (currentBeat !== "B00" || b00GateHeld) return;
    setB00GateCompleted(false);
    const timer = window.setTimeout(() => {
      setB00GateCompleted(true);
      const maxIdx = BEAT_ORDER.indexOf(maxEnabledBeat);
      const b00Idx = BEAT_ORDER.indexOf("B00");
      if (maxIdx > b00Idx) {
        setCurrentBeat("B01");
        setTurnIndex(0);
        revealGroup("infie_and_message");
      }
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [currentBeat, onboardingRunId, b00GateHeld, maxEnabledBeat, revealGroup]);

  // Synchronize beat-level reveal groups as beats & turns progress
  useEffect(() => {
    if (currentBeat === "B00" || currentBeat === "COMPLETE") return;

    if (currentBeat === "B01") {
      revealGroup("infie_and_message");
    } else if (currentBeat === "B02") {
      revealGroup("infie_and_message");
    } else if (currentBeat === "B03") {
      // Level, Continue, reply field and music are revealed by OnboardingStage on
      // their cues (after the matching phrase), not on beat entry.
      retireGroup("identity_controls");
      revealGroup("infie_and_message");
    } else if (currentBeat === "B04") {
      if (turnIndex >= 1) retireGroup("project_interest_reply");
    } else if (currentBeat === "B05") {
      retireGroup("project_interest_reply");
    } else if (currentBeat === "B06") {
      // B06 Controls: mic prompt on turn 0, transformation videos & PNGs on turns 1–4
      if (turnIndex === 0) {
        retireGroup("controls_illustrations");
      } else {
        retireGroup("controls_mic_prompt");
      }
    } else if (currentBeat === "B07") {
      // B07 Working with Infie (3 turns)
      retireGroup(["controls_mic_prompt", "controls_illustrations"]);
    } else if (currentBeat === "B08") {
      // Meet Infie B08 is the navigation turn alone (its nav group is cued by OnboardingStage).
      // Project & Session Flow B08: workspace tree (turn 0), then the green project/ folder
      // alone (turns 1-3).
      if (activeTutorial === "project-session" && turnIndex >= 1) {
        retireGroup("workspace_tree");
        revealGroup(["project_folder_only", "folder_illustration"]);
      }
    } else if (currentBeat === "B09") {
      // B09 Four files under green project/ folder + Stylist preview on turn 2
      retireGroup("workspace_tree");
      revealGroup(["project_folder_only", "folder_illustration"]);
      if (turnIndex === 2) {
        revealGroup("stylist_preview");
      } else {
        retireGroup("stylist_preview");
      }
    } else if (currentBeat === "B10") {
      // B10 Models configuration: provider buttons on turn 1 only
      if (turnIndex === 1) {
        revealGroup("model_signin_buttons");
      } else {
        retireGroup("model_signin_buttons");
      }
    } else if (currentBeat === "B11") {
      // B11 Header bar groups
      retireGroup("model_signin_buttons");
    } else if (currentBeat === "B12") {
      // B12 Home comes into view: the conversation slides over and Workspace/Emulators appear
      retireGroup("model_signin_buttons");
      revealGroup([
        "header_breadcrumbs",
        "header_tutorials_widgets_games",
        "header_notifications_settings",
        "home_header_controls",
        "tutorials_entry",
        "home_conversation_entry",
        "home_projects_and_actions",
      ]);
    } else if (currentBeat === "B13") {
      // B13 Project Home: the project-folder lesson visuals are gone
      retireGroup(["workspace_tree", "project_folder_only", "folder_illustration", "stylist_preview"]);
    } else if (currentBeat === "B14") {
      revealGroup([
        "project_navigation",
        "project_roadmap_sessions",
        "demo_session_and_question",
      ]);
      if (turnIndex === 0) {
        revealGroup("continue_button");
      } else {
        retireGroup("continue_button");
      }
    } else if (currentBeat === "B15") {
      retireGroup("demo_session_and_question");
      if (turnIndex < B15_TASKS_TURN) {
        revealGroup(["session_agent_controls", "continue_button"]);
      } else {
        retireGroup("continue_button");
        revealGroup(["session_agent_controls", "session_task_groups"]);
      }
    } else if (currentBeat === "B16") {
      revealGroup([
        "session_agent_controls",
        "session_task_groups",
        "session_pr_status",
        "continue_button",
      ]);
    } else if (currentBeat === "B17") {
      revealGroup(["session_completion_form"]);
      if (turnIndex < B17_EXPLANATIONS.length - 1) {
        revealGroup("continue_button");
      } else {
        retireGroup("continue_button");
      }
    } else if (currentBeat === "B18") {
      // Widgets & Whatnot: the music player stays where the user put it; the Library is
      // highlighted only while its callout is up.
      revealGroup(MUSIC_GROUPS);
      if (turnIndex === B18_LIBRARY_TURN) {
        revealGroup("library_entry_and_example");
      } else {
        retireGroup("library_entry_and_example");
      }
      if (turnIndex === B18_SLIDERS_TURN || turnIndex === B18_OPEN_WIDGETS_TURN) retireGroup("continue_button");
    } else if (currentBeat === "B19") {
      retireGroup("session_completion_form");
      if (turnIndex > B19_FINAL_TURN) retireGroup("continue_button");
    } else if (currentBeat === "B20") {
      revealGroup(["tutorials_entry", "continue_button"]);
    } else if (currentBeat === "B21") {
      revealGroup(["tutorials_entry", "continue_button"]);
    }
  }, [currentBeat, turnIndex, activeTutorial, maxEnabledBeat, revealGroup, retireGroup]);

  // B21 Dramatic center-screen level-up animation sequence (0 -> 1 rolodex)
  useEffect(() => {
    if (currentBeat !== "B21") {
      if (currentBeat !== "COMPLETE") {
        setLevelUpStage("idle");
      }
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setLevel(1);
      setLevelUpFlourish(true);
      setLevelUpStage("docked");
      const t = window.setTimeout(() => setLevelUpFlourish(false), 1200);
      return () => window.clearTimeout(t);
    }
    setLevel(0);
    setLevelUpStage("floating");
    setLevelUpFlourish(true);
    const t1 = window.setTimeout(() => setLevelUpStage("shaking"), 650);
    const t2 = window.setTimeout(() => {
      setLevelUpStage("rolling");
      setLevel(1);
    }, 1350);
    const t3 = window.setTimeout(() => setLevelUpStage("glowing"), 1950);
    const t4 = window.setTimeout(() => setLevelUpStage("docked"), 2600);
    const t5 = window.setTimeout(() => setLevelUpFlourish(false), 3400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(t5);
    };
  }, [currentBeat]);

  const setUserProfile = useCallback((profile: UserProfile) => {
    setUserProfileState(profile);
    lsSet(LS_PROFILE, JSON.stringify(profile));
  }, []);

  const setProjectInterestReply = useCallback((reply: string) => {
    setProjectInterestReplyState(reply);
    lsSet(LS_INTEREST, reply);
  }, []);

  const connectModel = useCallback((providerId: string) => {
    setConnectedModels((prev) => {
      if (prev.includes(providerId)) return prev;
      const next = [...prev, providerId];
      lsSet(LS_MODELS, JSON.stringify(next));
      return next;
    });
  }, []);

  const setMicPermissionChoice = useCallback((choice: "allow" | "not_now") => {
    setMicPermissionChoiceState(choice);
  }, []);

  const submitAgentQuestionReply = useCallback((reply: string) => {
    const trimmed = reply.trim() || B14_AGENT_REPLY_DEFAULT;
    setAgentQuestionReplyText(trimmed);
    setAgentQuestionReplied(true);
  }, []);

  // Start Meet Infie at B00 (2s pure black -> B01 arrival -> ...). A replay from Learn
  // snapshots the real profile, level and model choices, and keeps the music player in place.
  const startOnboarding = useCallback(
    (options?: StartOnboardingOptions) => {
      const replay = Boolean(options?.replay);
      replaySnapshotRef.current = replay
        ? {
            level,
            userProfile,
            projectInterestReply,
            connectedModels,
            micPermissionChoice,
          }
        : null;
      setOnboardingRunId((id) => id + 1);
      setActiveTutorial("meet-infie");
      setIsMeetInfieReplay(replay);
      setLevel(0);
      setLevelUpFlourish(false);
      setLevelUpStage("idle");
      setTurnIndex(0);
      setB00GateCompleted(false);
      setConnectedModels([]);
      setMicPermissionChoiceState(null);
      setAgentQuestionReplied(false);
      setAgentQuestionReplyText("");
      setDemoSessionCompleted(false);
      setDockedChat(EMPTY_DOCKED_CHAT);
      setRevealedGroups(new Set(replay ? MUSIC_GROUPS : []));
      setTutorialRecords(DEMO_RECORDS);
      setCurrentBeat("B00");
    },
    [level, userProfile, projectInterestReply, connectedModels, micPermissionChoice]
  );

  // Start Project & Session Flow or Widgets & Whatnot over the finished shell.
  const startTutorialTrack = useCallback(
    (track: Exclude<TutorialTrackId, "meet-infie">, options?: StartTrackOptions) => {
      replaySnapshotRef.current = null;
      setOnboardingRunId((id) => id + 1);
      setActiveTutorial(track);
      setIsMeetInfieReplay(false);
      setAgentQuestionReplied(false);
      setAgentQuestionReplyText("");
      setDemoSessionCompleted(false);
      setDockedChat(EMPTY_DOCKED_CHAT);
      setRevealedGroups(getStartingGroupsForTrack(track));
      setTutorialRecords(track === "project-session" ? DEMO_RECORDS : []);
      if (track === "project-session") {
        const portion = options?.portion ?? "full";
        setProjectSessionPortion(portion);
        setTurnIndex(0);
        setCurrentBeat(portion === "session" ? "B15" : "B08");
      } else {
        setTurnIndex(0);
        setCurrentBeat("B18");
      }
    },
    []
  );

  // Release (end of a tutorial, or dismissal): retain real state and persistent controls,
  // retire temporary teaching visuals and tutorial-owned demo records in place. Only the
  // first Meet Infie completion awards the first level; a replay restores its snapshot.
  const finishTutorial = useCallback(
    (reason: TutorialFinishReason = "completed") => {
      const track = activeTutorial ?? "meet-infie";
      const snapshot = replaySnapshotRef.current;
      replaySnapshotRef.current = null;
      if (track === "meet-infie") {
        if (snapshot) {
          setLevel(snapshot.level);
          setLevelUpStage(snapshot.level > 0 ? "docked" : "idle");
          setLevelUpFlourish(false);
          setUserProfileState(snapshot.userProfile);
          if (snapshot.userProfile) lsSet(LS_PROFILE, JSON.stringify(snapshot.userProfile));
          setProjectInterestReplyState(snapshot.projectInterestReply);
          lsSet(LS_INTEREST, snapshot.projectInterestReply);
          setConnectedModels(snapshot.connectedModels);
          lsSet(LS_MODELS, JSON.stringify(snapshot.connectedModels));
          setMicPermissionChoiceState(snapshot.micPermissionChoice);
        } else if (reason === "completed") {
          setFirstRunComplete(true);
          setLevel(1);
          setLevelUpStage("docked");
          setLevelUpFlourish(true);
          window.setTimeout(() => setLevelUpFlourish(false), 1800);
        }
      }
      setActiveTutorial(null);
      setIsMeetInfieReplay(false);
      setCurrentBeat("COMPLETE");
      setTurnIndex(0);
      setAgentQuestionReplied(false);
      setDemoSessionCompleted(false);
      setDockedChat(EMPTY_DOCKED_CHAT);
      setTutorialRecords([]);
      setRevealedGroups(new Set(PERSISTENT_RELEASE_GROUPS));
    },
    [activeTutorial]
  );

  const completeOnboarding = useCallback(() => finishTutorial("completed"), [finishTutorial]);

  const isRevealed = useCallback(
    (group: RevealGroupId) => {
      if (!activeTutorial) {
        return PERSISTENT_RELEASE_GROUPS.includes(group);
      }
      if (currentBeat === "B00" && !MUSIC_GROUPS.includes(group)) return false;
      return revealedGroups.has(group);
    },
    [activeTutorial, currentBeat, revealedGroups]
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      onboardingRunId,
      activeTutorial,
      projectSessionPortion,
      isMeetInfieReplay,
      firstRunComplete,
      isWidgetsTourActive: activeTutorial === "widgets",
      currentBeat,
      turnIndex,
      b00GateCompleted,
      b00GateHeld,
      setB00GateHeld,
      maxEnabledBeat,
      isTutorialActive: isScriptedTrack,
      isTutorialComplete,
      level,
      currentForm: getInfieFormForBeat(currentBeat),
      currentFormAsset: getInfieFormAssetForBeat(currentBeat),
      userProfile,
      projectInterestReply,
      connectedModels,
      connectModel,
      micPermissionChoice,
      setMicPermissionChoice,
      agentQuestionReplied,
      agentQuestionReplyText,
      submitAgentQuestionReply,
      demoSessionCompleted,
      setDemoSessionCompleted,
      revealedGroups,
      tutorialRecords,
      isRevealed,
      revealGroup,
      retireGroup,
      advanceBeat,
      setTurnIndex,
      setUserProfile,
      setProjectInterestReply,
      setLevel,
      startOnboarding,
      startTutorialTrack,
      finishTutorial,
      completeOnboarding,
      levelUpFlourish,
      levelUpStage,
      dockedChat,
      setDockedChat,
    }),
    [
      onboardingRunId,
      activeTutorial,
      projectSessionPortion,
      isMeetInfieReplay,
      firstRunComplete,
      currentBeat,
      turnIndex,
      b00GateCompleted,
      b00GateHeld,
      setB00GateHeld,
      maxEnabledBeat,
      isScriptedTrack,
      isTutorialComplete,
      level,
      userProfile,
      projectInterestReply,
      connectedModels,
      connectModel,
      micPermissionChoice,
      setMicPermissionChoice,
      agentQuestionReplied,
      agentQuestionReplyText,
      submitAgentQuestionReply,
      demoSessionCompleted,
      revealedGroups,
      tutorialRecords,
      isRevealed,
      revealGroup,
      retireGroup,
      advanceBeat,
      setUserProfile,
      setProjectInterestReply,
      startOnboarding,
      startTutorialTrack,
      finishTutorial,
      completeOnboarding,
      levelUpFlourish,
      levelUpStage,
      dockedChat,
    ]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
