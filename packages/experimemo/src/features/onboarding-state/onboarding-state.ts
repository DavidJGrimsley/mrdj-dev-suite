import './onboarding-state-adapter';

export {
  configureOnboardingStateAdapter,
  getOnboardingStateAdapter,
  markOnboardingComplete,
  subscribeToOnboardingStateChanges,
  useOnboardingState,
} from './onboarding-state-core';
export {
  DEFAULT_ONBOARDING_FLOW_ID,
  DEFAULT_ONBOARDING_FLOW_VERSION,
  createEmptyOnboardingState,
  upsertLegalAcceptance,
} from './onboarding-state-types';
export type {
  OnboardingDocumentAcceptance,
  OnboardingPersistenceMode,
  OnboardingState,
  OnboardingStateAdapter,
} from './onboarding-state-types';
