import { useCallback, useEffect, useState } from 'react';

import { createMemoryOnboardingStateAdapter } from './onboarding-state-memory';
import type { OnboardingState, OnboardingStateAdapter } from './onboarding-state-types';

let onboardingStateAdapter: OnboardingStateAdapter = createMemoryOnboardingStateAdapter();
const onboardingStateListeners = new Set<() => void>();

export function configureOnboardingStateAdapter(adapter: OnboardingStateAdapter): void {
  onboardingStateAdapter = adapter;
  for (const listener of onboardingStateListeners) {
    listener();
  }
}

export function getOnboardingStateAdapter(): OnboardingStateAdapter {
  return onboardingStateAdapter;
}

export function subscribeToOnboardingStateChanges(listener: () => void): () => void {
  onboardingStateListeners.add(listener);
  return () => {
    onboardingStateListeners.delete(listener);
  };
}

export async function markOnboardingComplete(input?: {
  userId?: string;
  completedAt?: string;
}): Promise<OnboardingState> {
  return onboardingStateAdapter.markComplete(input);
}

export function useOnboardingState(userId?: string) {
  const adapter = onboardingStateAdapter;
  const [state, setState] = useState<OnboardingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const next = await adapter.loadState(userId);
      setState(next);
      return next;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to load onboarding state.';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [adapter, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(
    () =>
      subscribeToOnboardingStateChanges(() => {
        void refresh();
      }),
    [refresh]
  );

  return {
    adapter,
    state,
    isLoading,
    error,
    refresh,
    markComplete: (input?: { completedAt?: string }) =>
      adapter.markComplete({ userId, completedAt: input?.completedAt }),
  };
}
