import { useEffect } from 'react';

import { useAuth } from '../../auth/auth-provider';
import { configureLegalAcceptanceAdapter } from '../../legal/legal-acceptance-config';
import { getSupabaseClient } from '../../../services/supabase';
import { configureOnboardingStateAdapter, getOnboardingStateAdapter } from '../onboarding-state-core';
import type { SupabaseClientFactory } from '../onboarding-state-supabase';
import {
  getPersistedOnboardingState,
  setPersistedOnboardingState,
} from '../onboarding-store';
import {
  createZustandSupabaseLegalAcceptanceAdapter,
  createZustandSupabaseOnboardingStateAdapter,
} from '../onboarding-state-zustand-supabase';

const cache = {
  getState: getPersistedOnboardingState,
  setState: setPersistedOnboardingState,
};

const getClient: SupabaseClientFactory = () =>
  getSupabaseClient() as ReturnType<SupabaseClientFactory>;

export const onboardingStateAdapter = createZustandSupabaseOnboardingStateAdapter(getClient, cache);
export const legalAcceptanceAdapter = createZustandSupabaseLegalAcceptanceAdapter(getClient, cache);

configureOnboardingStateAdapter(onboardingStateAdapter);
configureLegalAcceptanceAdapter(legalAcceptanceAdapter);

export function OnboardingPersistenceSync() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.user?.id) {
      return;
    }
    void getOnboardingStateAdapter().syncPending?.(auth.user.id);
  }, [auth.user?.id]);

  return null;
}
