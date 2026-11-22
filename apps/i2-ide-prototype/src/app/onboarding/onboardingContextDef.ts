import React, { createContext, useContext } from "react";
import {
  OnboardingBeat,
  RevealGroupId,
  InfieFormId,
  TutorialTrackId,
  ProjectSessionPortion,
} from "./revealLedger";

export interface UserProfile {
  name: string;
  email: string;
  authMethod: "form" | "github";
}

export interface TutorialOwnedRecord {
  id: string;
  kind: "project" | "session" | "question";
  isTutorialDemo: true;
}

export type LevelUpAnimationStage =
  | "idle"
  | "floating"
  | "shaking"
  | "rolling"
  | "glowing"
  | "docked";

export interface DockedTutorialChatEntry {
  id: string;
  role: "assistant" | "user";
  text: string;
  /** "agent_question" renders the B14 demo agent question block in conversation order. */
  kind?: "message" | "agent_question";
}

export interface DockedTutorialChatState {
  currentMessageId?: string;
  currentLine: string;
  history: ReadonlyArray<DockedTutorialChatEntry>;
  showContinue: boolean;
  onContinue?: () => void;
  onTextComplete?: (messageId: string) => void;
}

export type TutorialFinishReason = "completed" | "dismissed";

export interface StartOnboardingOptions {
  /** Replays Meet Infie from Learn: real state is snapshotted and restored, no level is awarded. */
  replay?: boolean;
}

export interface StartTrackOptions {
  /** Project & Session Flow only: run both portions, or start at one of them. */
  portion?: ProjectSessionPortion;
}

export interface OnboardingContextValue {
  onboardingRunId: number;
  /** The scripted tutorial running now; null outside every tutorial. */
  activeTutorial: TutorialTrackId | null;
  projectSessionPortion: ProjectSessionPortion;
  /** True while Meet Infie is being replayed from Learn. */
  isMeetInfieReplay: boolean;
  /** Meet Infie has finished at least once (first level awarded, Learn enabled). */
  firstRunComplete: boolean;
  /** Widgets & Whatnot runs as a floating overlay; the screens beneath stay live. */
  isWidgetsTourActive: boolean;
  currentBeat: OnboardingBeat;
  turnIndex: number;
  b00GateCompleted: boolean;
  b00GateHeld: boolean;
  setB00GateHeld: React.Dispatch<React.SetStateAction<boolean>>;
  maxEnabledBeat: OnboardingBeat;
  /** Meet Infie or Project & Session Flow is running: screens show the scripted chat and demo data. */
  isTutorialActive: boolean;
  isTutorialComplete: boolean;
  level: number;
  currentForm: InfieFormId;
  currentFormAsset: string;
  userProfile: UserProfile | null;
  projectInterestReply: string;
  connectedModels: readonly string[];
  connectModel: (providerId: string) => void;
  micPermissionChoice: "allow" | "not_now" | null;
  setMicPermissionChoice: (choice: "allow" | "not_now") => void;
  agentQuestionReplied: boolean;
  agentQuestionReplyText: string;
  submitAgentQuestionReply: (reply: string) => void;
  demoSessionCompleted: boolean;
  setDemoSessionCompleted: (done: boolean) => void;
  revealedGroups: ReadonlySet<RevealGroupId>;
  tutorialRecords: readonly TutorialOwnedRecord[];
  isRevealed: (group: RevealGroupId) => boolean;
  revealGroup: (group: RevealGroupId | readonly RevealGroupId[]) => void;
  retireGroup: (group: RevealGroupId | readonly RevealGroupId[]) => void;
  advanceBeat: (nextBeat?: OnboardingBeat) => void;
  setTurnIndex: React.Dispatch<React.SetStateAction<number>>;
  setUserProfile: (profile: UserProfile) => void;
  setProjectInterestReply: (reply: string) => void;
  setLevel: React.Dispatch<React.SetStateAction<number>>;
  startOnboarding: (options?: StartOnboardingOptions) => void;
  startTutorialTrack: (track: Exclude<TutorialTrackId, "meet-infie">, options?: StartTrackOptions) => void;
  /** Ends the active tutorial in place; real state is kept and demo records are released. */
  finishTutorial: (reason?: TutorialFinishReason) => void;
  completeOnboarding: () => void;
  levelUpFlourish: boolean;
  levelUpStage: LevelUpAnimationStage;
  dockedChat: DockedTutorialChatState;
  setDockedChat: React.Dispatch<React.SetStateAction<DockedTutorialChatState>>;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}
