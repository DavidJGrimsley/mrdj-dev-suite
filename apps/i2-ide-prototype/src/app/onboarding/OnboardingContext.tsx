import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  OnboardingBeat,
  BEAT_ORDER,
  RevealGroupId,
  PERSISTENT_RELEASE_GROUPS,
  B17_EXPLANATIONS,
  B14_AGENT_REPLY_DEFAULT,
  getInfieFormForBeat,
  getInfieFormAssetForBeat,
} from "./revealLedger";
import {
  OnboardingContext,
  OnboardingContextValue,
  TutorialOwnedRecord,
  UserProfile,
  LevelUpAnimationStage,
  DockedTutorialChatState,
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

export function OnboardingProvider({
  children,
  initialBeat = "COMPLETE",
  maxEnabledBeat = DEFAULT_MAX_ENABLED_BEAT,
}: {
  children: React.ReactNode;
  initialBeat?: OnboardingBeat;
  maxEnabledBeat?: OnboardingBeat;
}) {
  const [onboardingRunId, setOnboardingRunId] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<OnboardingBeat>(initialBeat);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [b00GateCompleted, setB00GateCompleted] = useState<boolean>(false);
  const [isTutorialComplete, setIsTutorialComplete] = useState<boolean>(
    initialBeat === "COMPLETE"
  );
  const [level, setLevel] = useState<number>(initialBeat === "COMPLETE" ? 1 : 0);
  const [levelUpFlourish, setLevelUpFlourish] = useState<boolean>(false);
  const [levelUpStage, setLevelUpStage] = useState<LevelUpAnimationStage>("idle");
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [projectInterestReply, setProjectInterestReplyState] = useState<string>("");
  const [connectedModels, setConnectedModels] = useState<string[]>([]);
  const [micPermissionChoice, setMicPermissionChoiceState] = useState<"allow" | "not_now" | null>(null);
  const [agentQuestionReplied, setAgentQuestionReplied] = useState<boolean>(false);
  const [agentQuestionReplyText, setAgentQuestionReplyText] = useState<string>("");
  const [demoSessionCompleted, setDemoSessionCompleted] = useState<boolean>(false);
  const [dockedChat, setDockedChat] = useState<DockedTutorialChatState>({
    currentLine: "",
    history: [],
    showContinue: false,
    onContinue: undefined,
  });
  const [revealedGroups, setRevealedGroups] = useState<Set<RevealGroupId>>(() =>
    initialBeat === "COMPLETE" ? new Set(PERSISTENT_RELEASE_GROUPS) : new Set()
  );
  const [tutorialRecords, setTutorialRecords] = useState<TutorialOwnedRecord[]>([
    { id: "pet", kind: "project", isTutorialDemo: true },
    { id: "nothotdog", kind: "project", isTutorialDemo: true },
    { id: "tutorial-demo-session", kind: "session", isTutorialDemo: true },
    { id: "tutorial-demo-question", kind: "question", isTutorialDemo: true },
  ]);

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

  // B00 Gate: Two-second pure black timer
  useEffect(() => {
    if (currentBeat !== "B00") return;
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
  }, [currentBeat, onboardingRunId, maxEnabledBeat, revealGroup]);

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
      // B08 Workspace tree (turns 0-1) & green project/ folder alone (turns 2-3)
      if (turnIndex >= 2) {
        retireGroup("workspace_tree");
        revealGroup(["project_folder_only", "folder_illustration", "header_breadcrumbs"]);
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
      // B10 Models configuration
      retireGroup(["workspace_tree", "project_folder_only", "folder_illustration", "stylist_preview"]);
      if (turnIndex === 0) {
        retireGroup("model_signin_buttons");
      } else {
        revealGroup("model_signin_buttons");
      }
    } else if (currentBeat === "B11") {
      // B11 Header bar groups
      retireGroup("model_signin_buttons");
    } else if (currentBeat === "B12") {
      // B12 Home comes into view
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
      // B13 Project Home
      retireGroup("tutorial_demo_project");
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
      if (turnIndex === 0) {
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
      retireGroup("session_completion_form");
      if (turnIndex === 0) {
        revealGroup(["widget_move_resize", "continue_button"]);
      } else {
        revealGroup([
          "widget_move_resize",
          "library_entry_and_example",
          "continue_button",
        ]);
      }
    } else if (currentBeat === "B19") {
      retireGroup("library_entry_and_example");
      if (turnIndex === 0) {
        revealGroup("continue_button");
      } else {
        retireGroup("continue_button");
      }
    } else if (currentBeat === "B20") {
      revealGroup(["tutorials_entry", "continue_button"]);
    } else if (currentBeat === "B21") {
      revealGroup(["tutorials_entry", "continue_button"]);
    }
  }, [currentBeat, turnIndex, maxEnabledBeat, revealGroup, retireGroup]);

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

  // Start the first-run onboarding tutorial at B00 (2s pure black -> B01 arrival -> ...)
  const startOnboarding = useCallback(() => {
    setOnboardingRunId((id) => id + 1);
    setIsTutorialComplete(false);
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
    setDockedChat({ currentLine: "", history: [], showContinue: false, onContinue: undefined });
    setRevealedGroups(new Set());
    setTutorialRecords([
      { id: "pet", kind: "project", isTutorialDemo: true },
      { id: "nothotdog", kind: "project", isTutorialDemo: true },
      { id: "tutorial-demo-session", kind: "session", isTutorialDemo: true },
      { id: "tutorial-demo-question", kind: "question", isTutorialDemo: true },
    ]);
    setCurrentBeat("B00");
  }, []);

  // Final release (B21 -> COMPLETE): retain real state and persistent controls,
  // retire temporary teaching visuals and tutorial-owned demo records in place.
  const completeOnboarding = useCallback(() => {
    setIsTutorialComplete(true);
    setLevel(1);
    setLevelUpStage("docked");
    setLevelUpFlourish(true);
    window.setTimeout(() => setLevelUpFlourish(false), 1800);
    setCurrentBeat("COMPLETE");
    setTurnIndex(0);
    setAgentQuestionReplied(false);
    setDemoSessionCompleted(false);
    setTutorialRecords([]);
    setRevealedGroups(new Set(PERSISTENT_RELEASE_GROUPS));
  }, []);

  const isRevealed = useCallback(
    (group: RevealGroupId) => {
      if (currentBeat === "B00") return false;
      if (isTutorialComplete) {
        return PERSISTENT_RELEASE_GROUPS.includes(group);
      }
      return revealedGroups.has(group);
    },
    [currentBeat, isTutorialComplete, revealedGroups]
  );

  const value = useMemo<OnboardingContextValue>(
    () => ({
      onboardingRunId,
      currentBeat,
      turnIndex,
      b00GateCompleted,
      maxEnabledBeat,
      isTutorialActive: !isTutorialComplete,
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
      completeOnboarding,
      levelUpFlourish,
      levelUpStage,
      dockedChat,
      setDockedChat,
    }),
    [
      onboardingRunId,
      currentBeat,
      turnIndex,
      b00GateCompleted,
      maxEnabledBeat,
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
