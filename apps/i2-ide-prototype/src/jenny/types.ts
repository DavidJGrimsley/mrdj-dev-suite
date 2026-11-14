/**
 * Jenny Project Creation & Discovery Agent Types
 * Clean, browser-safe interfaces for project creation, blueprint state,
 * deterministic discovery, and provider-neutral host contract.
 */

export type FrameworkId = "exact" | "expo-react-native";

export interface FrameworkOption {
  id: FrameworkId;
  displayName: string;
  shortName: string;
  actionText: string;
  description: string;
  defaultTemplate: string;
  availableTemplates: string[];
  supportedPlatforms: string[];
  uiLanguage: string;
  dataLogic: string;
  maturity: "stable" | "preview" | "experimental";
  officialDocsUrl: string;
  sourceRepoUrl: string;
}

export type RequirementStatus =
  | "answered"
  | "inferred"
  | "unknown"
  | "deferred"
  | "conflicting"
  | "requires-confirmation";

export type RequirementProvenance =
  | "initial-idea"
  | "chat"
  | "inferred"
  | "user-edit"
  | "framework-default";

export interface RequirementItem<T = string> {
  key: string;
  label: string;
  value: T;
  status: RequirementStatus;
  provenance: RequirementProvenance;
  notes?: string;
}

export interface ProjectMemoryFiles {
  infoMd: string;
  styleMd: string;
  guidelinesMd: string;
  todoMd: string;
}

export interface ProjectBlueprint {
  version: 1;
  frameworkId: FrameworkId;
  template: string;
  projectName: RequirementItem<string>;
  slug: RequirementItem<string>;
  elevatorPitch: RequirementItem<string>;
  targetAudience: RequirementItem<string>;
  platforms: RequirementItem<string[]>;
  mvpFeatures: RequirementItem<string[]>;
  deferredFeatures: RequirementItem<string[]>;
  visualDirection: RequirementItem<string>;
  colorPalette: RequirementItem<string>;
  navigationPattern: RequirementItem<string>;
  dataStorage: RequirementItem<string>;
  authentication: RequirementItem<string>;
  offlineSupport: RequirementItem<string>;
  openDecisions: RequirementItem<string[]>;
  readinessScore: number;
  approvedPlanId: string | null;
  lastUpdated: number;
}

export interface ChatMessage {
  id: string;
  role: "jenny" | "user";
  text: string;
  timestamp: number;
  suggestions?: string[];
}

export interface GenerationPlan {
  executable: boolean;
  planId: string;
  frameworkId: FrameworkId;
  frameworkName: string;
  projectName: string;
  destinationPath: string;
  template: string;
  platforms: string[];
  generatedFiles: Array<{ path: string; summary: string }>;
  projectMemory: ProjectMemoryFiles;
  commandPreview: string;
  createdAt: number;
  reviewedAt?: number;
  approvedAt?: number;
}

export interface HostCapabilities {
  version: "1.0.0";
  hostKind: "browser-prototype" | "desktop-core";
  draftPersistenceAvailable: boolean;
  localDiscoveryAvailable: boolean;
  modelProviderAvailable: boolean;
  executionAvailable: boolean;
  message: string;
  engineLabel?: string;
}

export type HostExecutionEventType =
  | "started"
  | "step"
  | "warning"
  | "error"
  | "capability-blocked"
  | "completed";

export interface HostExecutionEvent {
  type: HostExecutionEventType;
  stepName: string;
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface JennyHandoffResult {
  projectId: string;
  projectName: string;
  frameworkId: FrameworkId;
  toolchainRevision: string;
  selectedTemplate: string;
  targetPlatforms: string[];
  generatedFiles: Array<{ path: string; summary: string }>;
  projectMemory: ProjectMemoryFiles;
  deferredDecisions: string[];
  openTasks: string[];
  recommendedFirstSession: string;
  executionStatus: "prototype-simulated" | "blocked-missing-host-core" | "ready-for-production";
  handoffTimestamp: number;
}

export interface DiscoveryResult {
  updatedBlueprint: ProjectBlueprint;
  reply: string;
  suggestions: string[];
  readyToReview: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DraftStorageData {
  blueprint: ProjectBlueprint;
  messages: ChatMessage[];
  savedAt: number;
}

/**
 * Provider-neutral typed browser interface for Project Creation Host.
 * Encapsulates capabilities, draft persistence, discovery, planning,
 * validation, approval execution events, cancellation, and handoff.
 */
export interface ProjectCreationHost {
  version: "1.0.0";
  capabilities: HostCapabilities;
  role: typeof JENNY_ROLE;

  // Draft persistence
  loadDraft(): Promise<DraftStorageData | null>;
  saveDraft(data: { blueprint: ProjectBlueprint; messages: ChatMessage[] }): Promise<void>;
  clearDraft(): Promise<void>;

  // Discovery engine
  analyzeIdea(idea: string, current: ProjectBlueprint, history?: ChatMessage[]): Promise<DiscoveryResult>;

  // Planning and validation
  createPlan(blueprint: ProjectBlueprint): Promise<GenerationPlan>;
  validatePlan(plan: GenerationPlan): Promise<ValidationResult>;

  // Approval and execution events
  executePlan(
    plan: GenerationPlan,
    onEvent: (event: HostExecutionEvent) => void,
    approval: { digest: string; signal: AbortSignal }
  ): Promise<{
    success: boolean;
    handoff?: JennyHandoffResult;
    reason?: string;
  }>;
}

/** Host adapters must enforce these restrictions and revalidate the approved digest before writes. */
export const JENNY_ROLE = {
  name: "Jenny", purpose: "Project discovery and approved scaffolding only",
  allowedOperations: ["draft", "discover", "review-plan", "validate-plan", "execute-approved-plan"],
  forbiddenOperations: ["read-secrets", "unrelated-files", "unapproved-execution"],
} as const;
