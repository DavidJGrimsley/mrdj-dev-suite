// Type definitions for the Experimemo Tutorial integration in i2 IDE Prototype.

export type TutorialStep =
  | "framing"
  | "jenny-creation"
  | "starter-reveal"
  | "session-setup"
  | "session-active"
  | "session-result";

export type PreviewVersion = "v1" | "v2";

export type ProviderId = "openai" | "claude" | "gemini";

export type SessionTabId = "infie" | ProviderId;

export interface PreviewManifestEntry {
  version: PreviewVersion;
  label: string;
  defaultUrl: string;
}

export interface PreviewUrlManifest {
  v1: PreviewManifestEntry;
  v2: PreviewManifestEntry;
}

export interface ScriptedChatMessage {
  id: string;
  role: "jenny" | "user" | "infie" | "openai" | "claude" | "gemini" | "system";
  senderName: string;
  text: string;
  timestamp?: number;
  badge?: string;
  handoffTarget?: "openai" | "claude" | "gemini" | "infie";
  reportData?: {
    summary: string;
    filesChanged?: string[];
    verification?: string[];
    limitations?: string[];
  };
}

export interface TutorialBlueprintField<T = string> {
  key: string;
  label: string;
  value: T | null;
  isDiscussed: boolean;
  section: string;
}

export interface RoadmapTask {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
}

export interface TutorialBlueprintState {
  projectName: TutorialBlueprintField<string>;
  overview: TutorialBlueprintField<string>;
  targetAudience: TutorialBlueprintField<string>;
  targetPlatforms: TutorialBlueprintField<string[]>;
  framework: TutorialBlueprintField<string>;
  firstTargetPlatform: TutorialBlueprintField<string>;
  problemStatement: TutorialBlueprintField<string>;
  productGoals: TutorialBlueprintField<string>;
  nonGoals: TutorialBlueprintField<string>;
  coreFlows: TutorialBlueprintField<string>;
  keyFeatures: TutorialBlueprintField<string[]>;
  screens: TutorialBlueprintField<string[]>;
  dataStored: TutorialBlueprintField<string>;
  dataStorage: TutorialBlueprintField<string>;
  authentication: TutorialBlueprintField<string>;
  visualStyle: TutorialBlueprintField<string>;
  navigationPattern: TutorialBlueprintField<string>;
  onboardingFlow: TutorialBlueprintField<string>;
  monetizationStrategy: TutorialBlueprintField<string>;
  teamContext: TutorialBlueprintField<string>;
  laterScope: TutorialBlueprintField<string>;
  referenceDesigns: TutorialBlueprintField<string>;
  distribution: TutorialBlueprintField<string>;
  legalSupport: TutorialBlueprintField<string>;
  projectSetup: TutorialBlueprintField<string>;
  mdsGuidelines: TutorialBlueprintField<string>;
  roadmapTasks: RoadmapTask[];
}

export interface ScriptedJennyTurn {
  turnIndex: number; // 0-based: 0 to 25 (turns 1 to 26)
  question: string;
  answer: string;
  fieldKey: keyof Omit<TutorialBlueprintState, "roadmapTasks">;
  patch: (prev: TutorialBlueprintState) => TutorialBlueprintState;
}
