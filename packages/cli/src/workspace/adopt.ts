import { applyWorkspaceInitialization, planWorkspaceInitialization } from './init.js';

import type { WorkspaceInitOptions, WorkspaceInitializationPlan } from './init.js';

/** Adoption is the legacy name for workspace initialization. */
export type WorkspaceAdoptionPlan = WorkspaceInitializationPlan;

export function planWorkspaceAdoption(sourcePath: string, options: WorkspaceInitOptions = {}): WorkspaceAdoptionPlan {
  return planWorkspaceInitialization(sourcePath, options);
}

export const applyWorkspaceAdoption = applyWorkspaceInitialization;
