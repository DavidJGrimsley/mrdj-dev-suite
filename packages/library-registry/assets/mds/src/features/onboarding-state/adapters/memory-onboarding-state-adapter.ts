import { configureLegalAcceptanceAdapter } from '../../legal/legal-acceptance-config';
import { configureOnboardingStateAdapter } from '../onboarding-state-core';
import { createMemoryOnboardingPersistence } from '../onboarding-state-memory';

const persistence = createMemoryOnboardingPersistence();

configureOnboardingStateAdapter(persistence.onboarding);
configureLegalAcceptanceAdapter(persistence.legal);

export const onboardingStateAdapter = persistence.onboarding;
export const legalAcceptanceAdapter = persistence.legal;

export function OnboardingPersistenceSync() {
  return null;
}
