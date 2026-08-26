import { useEffect } from 'react';

import { useAuth } from '../auth/auth-provider';
import {
  configureLegalAcceptanceAdapter,
  setLegalAcceptanceUserId,
} from '../legal/legal-acceptance-config';
import { getSupabaseClient } from '../../services/supabase';
import {
  configureOnboardingStateAdapter,
  getOnboardingStateAdapter,
  setOnboardingStateUserId,
} from './onboarding-state-core';
import {
  createSupabaseLegalAcceptanceAdapter,
  createSupabaseOnboardingStateAdapter,
  type SupabaseClientFactory,
} from './onboarding-state-supabase';

const getClient: SupabaseClientFactory = () =>
  getSupabaseClient() as ReturnType<SupabaseClientFactory>;

export const onboardingStateAdapter = createSupabaseOnboardingStateAdapter(getClient);
export const legalAcceptanceAdapter = createSupabaseLegalAcceptanceAdapter(getClient);

configureOnboardingStateAdapter(onboardingStateAdapter);
configureLegalAcceptanceAdapter(legalAcceptanceAdapter);

export function OnboardingPersistenceSync() {
  const auth = useAuth();

  useEffect(() => {
    const userId = auth.user?.id;
    setOnboardingStateUserId(userId);
    setLegalAcceptanceUserId(userId);

    if (!userId) {
      return;
    }
    void getOnboardingStateAdapter().syncPending?.(userId);
  }, [auth.user?.id]);

  return null;
}
