import React, { createContext, useContext } from "react";
import { OnboardingBeat, RevealGroupId, InfieFormId } from "./revealLedger";

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
  currentLine: string;
  history: ReadonlyArray<DockedTutorialChatEntry>;
  showContinue: boolean;
  onContinue?: () => void;
}

export interface OnboardingContextValue {
  onboardingRunId: number;
  currentBeat: OnboardingBeat;
  turnIndex: number;
  b00GateCompleted: boolean;
  b00GateHeld: boolean;
  setB00GateHeld: React.Dispatch<React.SetStateAction<boolean>>;
  maxEnabledBeat: OnboardingBeat;
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
  startOnboarding: () => void;
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
