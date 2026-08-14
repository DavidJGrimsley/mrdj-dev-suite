import { configureLegalAcceptanceAdapter } from '../legal/legal-acceptance-config';
import { configureOnboardingStateAdapter } from './onboarding-state-core';
import {
  createZustandLegalAcceptanceAdapter,
  createZustandOnboardingStateAdapter,
} from './onboarding-state-zustand';

export const onboardingStateAdapter = createZustandOnboardingStateAdapter();
export const legalAcceptanceAdapter = createZustandLegalAcceptanceAdapter();

configureOnboardingStateAdapter(onboardingStateAdapter);
configureLegalAcceptanceAdapter(legalAcceptanceAdapter);

export function OnboardingPersistenceSync() {
  return null;
}
