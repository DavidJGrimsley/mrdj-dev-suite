/**
 * Jenny Discovery Engine contracts and state management.
 *
 * Dedicated to progressive project creation requirements gathering,
 * architecture planning, and generation handoff.
 */

import type {
  DiscoveredRequirement,
  FrameworkId,
  JennyDiscoveryState,
  RequirementStatus,
} from './types.js';

export const JENNY_AGENT_NAME = 'Jenny' as const;

/**
 * Canonical opening greeting for Jenny, as mandated by the iSquared specification:
 * "Hello I'm Jenny. I'm ready to help you create a new project. What's the idea?"
 */
export const JENNY_OPENING_GREETING =
  "Hello I'm Jenny. I'm ready to help you create a new project. What's the idea?" as const;

export interface DiscoveryOptions {
  readonly frameworkId?: FrameworkId;
  readonly initialIdea?: string;
  readonly projectName?: string;
}

export function createInitialDiscoveryState(options: DiscoveryOptions = {}): JennyDiscoveryState {
  const frameworkId = options.frameworkId ?? 'exact';
  const initialIdea = options.initialIdea ?? '';
  const projectName = options.projectName ?? '';

  return {
    agentName: JENNY_AGENT_NAME,
    frameworkId,
    initialIdea,
    projectName,
    requirements: {},
    openDecisions: [],
    deferredDecisions: [],
    selectedTemplateId: 'blank',
    isReadyForPlan: false,
    updatedAt: new Date().toISOString(),
  };
}

export function recordRequirement(
  state: JennyDiscoveryState,
  key: string,
  question: string,
  status: RequirementStatus,
  value?: unknown,
  provenance?: string,
  notes?: string
): JennyDiscoveryState {
  const requirement: DiscoveredRequirement = {
    key,
    question,
    status,
    value,
    provenance,
    notes,
  };

  const nextRequirements = {
    ...state.requirements,
    [key]: requirement,
  };

  const openDecisions = Object.values(nextRequirements)
    .filter((r) => r.status === 'unknown' || r.status === 'conflicting')
    .map((r) => r.question);

  const deferredDecisions = Object.values(nextRequirements)
    .filter((r) => r.status === 'deferred')
    .map((r) => r.question);

  return {
    ...state,
    requirements: nextRequirements,
    openDecisions,
    deferredDecisions,
    updatedAt: new Date().toISOString(),
  };
}
