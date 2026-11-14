/**
 * Framework registry, template catalog, plan contracts, and execution identities.
 *
 * This module is browser-safe with zero Node.js runtime dependencies.
 */

export type FrameworkId = 'exact' | 'expo-react-native' | string;

export type PlatformTarget = 'web' | 'ios' | 'android' | 'macos' | 'windows' | 'linux';

export type FrameworkMaturity = 'stable' | 'preview' | 'experimental';

export type LanguageId = 'contract' | 'typescript' | 'rust';

export interface ToolRequirement {
  readonly name: string;
  readonly binary: string;
  readonly description: string;
  readonly optional?: boolean;
  readonly platform?: PlatformTarget;
  readonly homepage?: string;
  readonly installCommand?: string;
}

export interface BuildRunCapabilities {
  readonly webDevServer: string;
  readonly webTest: string;
  readonly nativeRun?: string;
  readonly verifyCommand: string;
  readonly contractBuildCommand?: string;
  readonly diagnosticsTool: string;
  readonly prohibitsExpoDoctor?: boolean;
}

export interface DetectionSignals {
  readonly requiredAny: readonly string[];
  readonly exactFiles?: readonly string[];
  readonly expoFiles?: readonly string[];
}

export interface FrameworkDescriptor {
  readonly knowledgeResources?: readonly string[];
  readonly id: FrameworkId;
  readonly displayName: string;
  readonly description: string;
  readonly maturity: FrameworkMaturity;
  readonly homepage: string;
  readonly repository: string;
  readonly defaultLanguage: LanguageId;
  readonly supportedLanguages: readonly LanguageId[];
  readonly supportedPlatforms: readonly PlatformTarget[];
  readonly experimentalPlatforms: readonly PlatformTarget[];
  readonly defaultActionLabel: string;
  readonly isDefault: boolean;
  readonly requiredTools: readonly ToolRequirement[];
  readonly buildRunCapabilities: BuildRunCapabilities;
  readonly detectionSignals: DetectionSignals;
}

export interface PinnedRevision {
  readonly repository: string;
  readonly branch?: string;
  readonly commit: string;
}

export type TemplateCategory = 'starter' | 'official' | 'community';

export interface FrameworkTemplate {
  readonly id: string;
  readonly frameworkId: FrameworkId;
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly verifiedHosts: readonly string[];
  readonly pinnedRevision: PinnedRevision;
  readonly upstreamSource: string;
  readonly category: TemplateCategory;
  readonly notes?: string;
}

export interface PrerequisiteStatus {
  readonly name: string;
  readonly binary: string;
  readonly installed: boolean;
  readonly version?: string;
  readonly required: boolean;
  readonly actionableFix: string;
  readonly details?: string;
}

export interface PrerequisiteReport {
  readonly frameworkId: FrameworkId;
  readonly satisfied: boolean;
  readonly prerequisites: readonly PrerequisiteStatus[];
  readonly summary: string;
  readonly notes: readonly string[];
}

export interface GeneratorIdentity {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly frameworkCommit: string;
  readonly timestamp?: string;
}

export interface ProjectMetadataInput {
  readonly name?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly bundleId?: string;
  readonly platforms?: readonly PlatformTarget[];
}

export interface GenerationRequest {
  readonly frameworkId: FrameworkId;
  readonly appName: string;
  readonly targetDirectory: string;
  readonly templateId?: string;
  readonly bundleId?: string;
  readonly platforms?: readonly PlatformTarget[];
  readonly projectInfo?: ProjectMetadataInput;
  readonly options?: Record<string, unknown>;
}

/**
 * Project identity chosen for a generated app.
 * - `new-workspace` (default): create a complete new i2 workspace (control repo, source main checkout, manifest, temp, generated).
 * - `workspace-member`: explicit opt-out; the app joins an already initialized enclosing workspace and never writes its memory.
 * - `distinct-project`: explicit opt-out (standalone); the app owns its own project/ memory.
 */
export type ProjectIdentityMode = 'new-workspace' | 'workspace-member' | 'distinct-project';

/** Complete, reviewable layout of a new i2 workspace. Remotes are local bare repositories; nothing is published. */
export interface NewWorkspaceTopology {
  readonly workspaceId: string;
  readonly name: string;
  readonly root: string;
  readonly projectPath: string;
  readonly manifestPath: string;
  readonly tempPath: string;
  readonly generatedPath: string;
  /** Source main checkout that receives the official generator output. */
  readonly sourcePath: string;
  /** Folder the official generator creates (`<root>/<app>`, so package names and slugs stay `<app>`); renamed to sourcePath. */
  readonly generatorOutputPath: string;
  readonly defaultBranch: string;
  /** Local bare repository (under temp/local-remotes) used as the source origin. */
  readonly sourceRemote: string;
  /** Local bare repository (under temp/local-remotes) used as the control origin. */
  readonly projectRemote: string;
  /** Git executable used for every repository operation, bound by content digest. */
  readonly git: { readonly executable: string; readonly digest: string };
  /** Author/committer for the generator-made commits; applied per command, never written to Git config. */
  readonly commitAuthor: { readonly name: string; readonly email: string };
  /** Full generator output is streamed here; only a bounded tail is kept in memory. */
  readonly logPath: string;
  /** Nearest enclosing initialized workspace, if the new root is nested inside one. It is never written. */
  readonly enclosingWorkspace?: { readonly root: string; readonly workspaceId: string };
}

export interface GenerationPlan {
  readonly execution?: ExecutionIdentity;
  readonly projectMemory?: { readonly mode: ProjectIdentityMode; readonly location: string; readonly coordinatorOwned: boolean };
  readonly workspace?: NewWorkspaceTopology;
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly frameworkId: FrameworkId;
  readonly templateId: string;
  readonly appName: string;
  readonly bundleId: string;
  readonly targetDirectory: string;
  readonly targetPlatforms: readonly PlatformTarget[];
  readonly pinnedRevision: PinnedRevision;
  readonly reservationPaths: readonly string[];
  readonly planDigest: string;
  readonly createdAt: string;
  readonly generatorIdentity: GeneratorIdentity;
  readonly options?: Record<string, unknown>;
}

/** Local code identities are reviewed alongside the command, never inferred at execution time. */
export interface CheckoutIdentity {
  readonly directory: string;
  readonly repository: string;
  readonly commit: string;
  readonly treeDigest: string;
}
export interface ExecutionIdentity {
  readonly localSources?: readonly { readonly directory: string; readonly digest: string }[];
  readonly executable: string;
  readonly executableDigest: string;
  readonly cwd: string;
  readonly args: readonly string[];
  readonly script: string;
  readonly scriptDigest: string;
  readonly checkouts: readonly CheckoutIdentity[];
  readonly timeoutMs: number;
}

export interface GenerationPlanValidation {
  readonly valid: boolean;
  readonly planDigest: string;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly prerequisiteReport?: PrerequisiteReport;
}

export interface GenerationExecutionOptions {
  readonly approvedPlanDigest: string;
  readonly dryRun?: boolean;
  readonly progressReporter?: (event: GenerationProgressEvent) => void;
  readonly cancellationToken?: CancellationTokenLike;
}

export interface VerificationCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
  readonly command?: string;
}

export interface VerificationReport {
  readonly passed: boolean;
  readonly frameworkId: FrameworkId;
  readonly checks: readonly VerificationCheck[];
  readonly unverifiedPlatforms: readonly PlatformTarget[];
}

export interface GenerationHandoff {
  readonly projectId: string;
  readonly targetDirectory: string;
  readonly frameworkId: FrameworkId;
  readonly frameworkRevision: string;
  readonly templateId: string;
  readonly generatedFilesSummary: readonly string[];
  readonly canonicalProjectMemoryLocation: string;
  readonly verificationStatus: 'verified' | 'unverified' | 'blocked';
  readonly missingPrerequisites: readonly string[];
  readonly deferredDecisions: readonly string[];
  readonly recommendedNextSession: string;
  /** Present only for `new-workspace` generation. */
  readonly workspace?: { readonly root: string; readonly sourceCheckout: string; readonly controlRepository: string; readonly publication: 'local-only' };
}

export interface JournalEntry {
  readonly action: 'mkdir' | 'write' | 'copy';
  readonly path: string;
  readonly existedBefore: boolean;
  readonly timestamp: string;
}

export interface GenerationResult {
  readonly success: boolean;
  readonly planId: string;
  readonly planDigest: string;
  readonly targetDirectory: string;
  readonly frameworkId: FrameworkId;
  readonly templateId: string;
  readonly pinnedRevision: PinnedRevision;
  readonly createdPaths: readonly string[];
  readonly journalEntries: readonly JournalEntry[];
  readonly verificationReport?: VerificationReport;
  /** Git/control topology checks for `new-workspace` generation, reported separately from framework verification. */
  readonly topologyReport?: VerificationReport;
  readonly handoff: GenerationHandoff;
  readonly error?: string;
}

export interface FrameworkDetectionResult {
  readonly frameworkId: FrameworkId | 'unknown';
  readonly confidence: 'high' | 'medium' | 'low' | 'none';
  readonly matchedSignals: readonly string[];
  readonly ambiguityNote?: string;
}

export type RequirementStatus =
  | 'answered'
  | 'inferred'
  | 'unknown'
  | 'deferred'
  | 'conflicting'
  | 'requiresConfirmation';

export interface DiscoveredRequirement {
  readonly key: string;
  readonly question: string;
  readonly status: RequirementStatus;
  readonly value?: unknown;
  readonly provenance?: string;
  readonly notes?: string;
}

export interface JennyDiscoveryState {
  readonly agentName: 'Jenny';
  readonly frameworkId: FrameworkId;
  readonly initialIdea: string;
  readonly projectName: string;
  readonly requirements: Record<string, DiscoveredRequirement>;
  readonly openDecisions: readonly string[];
  readonly deferredDecisions: readonly string[];
  readonly selectedTemplateId?: string;
  readonly isReadyForPlan: boolean;
  readonly updatedAt: string;
}

export interface GenerationProgressEvent {
  readonly type:
    | 'plan:created'
    | 'plan:validated'
    | 'reservation:started'
    | 'prerequisite:checked'
    | 'scaffold:started'
    | 'scaffold:step'
    | 'scaffold:finished'
    | 'verify:started'
    | 'verify:finished'
    | 'generation:completed'
    | 'generation:failed'
    | 'generation:cancelled';
  readonly timestamp: string;
  readonly message: string;
  readonly step?: number;
  readonly totalSteps?: number;
  readonly percent?: number;
  readonly details?: Record<string, unknown>;
}

export interface CancellationTokenLike {
  readonly isCancelled: boolean;
  throwIfCancelled(): void;
}
