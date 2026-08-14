export type OnboardingPersistenceMode =
  | 'memory'
  | 'zustand-local'
  | 'supabase'
  | 'zustand-supabase';

export const DEFAULT_ONBOARDING_FLOW_ID = 'mds/onboarding';
export const DEFAULT_ONBOARDING_FLOW_VERSION = 1;

export type OnboardingDocumentAcceptance = {
  documentId: 'terms' | 'privacy';
  documentVersion: string;
  acceptedAt: string;
  userId?: string;
  flowId?: string;
  flowVersion?: number;
};

export type OnboardingState = {
  flowId: string;
  flowVersion: number;
  currentStep?: string;
  completedAt?: string;
  legalAcceptances: OnboardingDocumentAcceptance[];
  pendingSync?: boolean;
};

export type OnboardingStateAdapter = {
  mode: OnboardingPersistenceMode;
  loadState(userId?: string): Promise<OnboardingState | null>;
  saveState(state: OnboardingState, userId?: string): Promise<void>;
  markComplete(input?: { userId?: string; completedAt?: string }): Promise<OnboardingState>;
  syncPending?(userId: string): Promise<OnboardingState>;
};

export function createEmptyOnboardingState(
  input: Partial<OnboardingState> = {},
): OnboardingState {
  return {
    flowId: input.flowId ?? DEFAULT_ONBOARDING_FLOW_ID,
    flowVersion: input.flowVersion ?? DEFAULT_ONBOARDING_FLOW_VERSION,
    currentStep: input.currentStep,
    completedAt: input.completedAt,
    legalAcceptances: input.legalAcceptances ?? [],
    pendingSync: input.pendingSync,
  };
}

export function upsertLegalAcceptance(
  state: OnboardingState,
  acceptance: OnboardingDocumentAcceptance,
): OnboardingState {
  const remaining = state.legalAcceptances.filter(
    (item) =>
      !(
        item.documentId === acceptance.documentId &&
        item.documentVersion === acceptance.documentVersion
      ),
  );
  return {
    ...state,
    legalAcceptances: [...remaining, acceptance],
  };
}
