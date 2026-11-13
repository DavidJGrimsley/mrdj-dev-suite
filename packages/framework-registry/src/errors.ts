/**
 * Structured error classes and codes for framework generation, planning, and verification.
 *
 * Browser-safe with clear machine-readable error codes and human-actionable guidance.
 */

export const ErrorCodes = {
  PLAN_VALIDATION_FAILED: 'PLAN_VALIDATION_FAILED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  PLAN_DIGEST_MISMATCH: 'PLAN_DIGEST_MISMATCH',
  PREREQUISITE_MISSING: 'PREREQUISITE_MISSING',
  DESTINATION_NOT_EMPTY: 'DESTINATION_NOT_EMPTY',
  RESERVATION_CONFLICT: 'RESERVATION_CONFLICT',
  GENERATION_CANCELLED: 'GENERATION_CANCELLED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  UNSUPPORTED_HOST: 'UNSUPPORTED_HOST',
  FRAMEWORK_NOT_FOUND: 'FRAMEWORK_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorDetails {
  readonly code: ErrorCode;
  readonly message: string;
  readonly actionableFix: string;
  readonly context?: Record<string, unknown>;
}

export class FrameworkError extends Error {
  readonly code: ErrorCode;
  readonly actionableFix: string;
  readonly context?: Record<string, unknown>;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'FrameworkError';
    this.code = details.code;
    this.actionableFix = details.actionableFix;
    this.context = details.context;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      actionableFix: this.actionableFix,
      context: this.context,
    };
  }
}

export class PlanValidationError extends FrameworkError {
  constructor(message: string, errors: readonly string[], context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.PLAN_VALIDATION_FAILED,
      message,
      actionableFix:
        'Resolve the listed validation errors in the generation request before submitting for approval: ' +
        errors.join('; '),
      context: { ...context, validationErrors: errors },
    });
    this.name = 'PlanValidationError';
  }
}

export class ApprovalRequiredError extends FrameworkError {
  constructor(planDigest: string, context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.APPROVAL_REQUIRED,
      message: `Project generation cannot proceed without explicit user approval. Required digest: ${planDigest}`,
      actionableFix:
        `Review the generation plan and approve execution by passing approvedPlanDigest="${planDigest}". ` +
        'Automated generation is inhibited until approval is supplied.',
      context: { ...context, requiredPlanDigest: planDigest },
    });
    this.name = 'ApprovalRequiredError';
  }
}

export class PlanDigestMismatchError extends FrameworkError {
  constructor(expectedDigest: string, actualDigest: string, context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.PLAN_DIGEST_MISMATCH,
      message:
        `Supplied approval digest "${actualDigest}" does not match the active generation plan digest "${expectedDigest}". ` +
        'The plan was modified after review or an invalid digest was provided.',
      actionableFix:
        'Re-validate the updated generation plan and provide the matching approvedPlanDigest.',
      context: { ...context, expectedDigest, actualDigest },
    });
    this.name = 'PlanDigestMismatchError';
  }
}

export class PrerequisiteMissingError extends FrameworkError {
  constructor(missing: readonly string[], actionableFix: string, context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.PREREQUISITE_MISSING,
      message: `Required framework tools are missing: ${missing.join(', ')}.`,
      actionableFix,
      context: { ...context, missingTools: missing },
    });
    this.name = 'PrerequisiteMissingError';
  }
}

export class DestinationNotEmptyError extends FrameworkError {
  constructor(targetDirectory: string, context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.DESTINATION_NOT_EMPTY,
      message: `Target directory "${targetDirectory}" already exists and contains files.`,
      actionableFix:
        'Specify an empty directory or a new target path to prevent accidental file clobbering.',
      context: { ...context, targetDirectory },
    });
    this.name = 'DestinationNotEmptyError';
  }
}

export class GenerationCancelledError extends FrameworkError {
  constructor(reason?: string, context?: Record<string, unknown>) {
    super({
      code: ErrorCodes.GENERATION_CANCELLED,
      message: `Generation process was cancelled by the user or host: ${reason ?? 'User cancellation requested.'}`,
      actionableFix: 'Re-run generation when ready.',
      context: { ...context, reason },
    });
    this.name = 'GenerationCancelledError';
  }
}
