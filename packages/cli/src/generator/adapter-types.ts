/**
 * Common adapter interfaces for framework-agnostic generation and onboarding.
 */

import type {
  FrameworkDescriptor,
  FrameworkDetectionResult,
  FrameworkId,
  FrameworkTemplate,
  GenerationExecutionOptions,
  GenerationPlan,
  GenerationPlanValidation,
  GenerationRequest,
  GenerationResult,
  PrerequisiteReport,
  VerificationReport,
} from '@mr.dj2u/framework-registry';

export * from '@mr.dj2u/framework-registry';

export interface OnboardOptions {
  readonly overwrite?: boolean;
  readonly approvedPlanDigest?: string;
  readonly coordinatorApproved?: boolean;
}

export interface OnboardResult {
  readonly success: boolean;
  readonly projectPath: string;
  readonly frameworkId: FrameworkId;
  readonly addedFiles: readonly string[];
  readonly summary: string;
  readonly planDigest?: string;
  readonly canonicalProjectMemoryLocation?: string;
  readonly proposedFiles?: readonly string[];
}

export interface FrameworkAdapter {
  readonly descriptor: FrameworkDescriptor;
  getCapabilities(): FrameworkDescriptor['buildRunCapabilities'];
  getKnowledgeResources(): readonly string[];
  detect(targetPath: string): Promise<FrameworkDetectionResult>;
  checkPrerequisites(options?: { platform?: string }): Promise<PrerequisiteReport>;
  listTemplates(): Promise<readonly FrameworkTemplate[]>;
  planGeneration(request: GenerationRequest): Promise<GenerationPlan>;
  validatePlan(plan: GenerationPlan): Promise<GenerationPlanValidation>;
  generate(plan: GenerationPlan, options: GenerationExecutionOptions): Promise<GenerationResult>;
  verify(projectPath: string, options?: { platform?: string }): Promise<VerificationReport>;
  onboardExisting(projectPath: string, options?: OnboardOptions): Promise<OnboardResult>;
}
