import { useCallback, useEffect, useState } from 'react';

import { createMemoryOnboardingStateAdapter } from './onboarding-state-memory';
import type { OnboardingState, OnboardingStateAdapter } from './onboarding-state-types';

let onboardingStateAdapter: OnboardingStateAdapter = createMemoryOnboardingStateAdapter();
type OnboardingStateListener = (state?: OnboardingState) => void;

const onboardingStateListeners = new Set<OnboardingStateListener>();
let currentOnboardingUserId: string | undefined;

function notifyOnboardingStateChanged(state?: OnboardingState): void {
  for (const listener of onboardingStateListeners) {
    listener(state);
  }
}

export function configureOnboardingStateAdapter(adapter: OnboardingStateAdapter): void {
  onboardingStateAdapter = adapter;
  notifyOnboardingStateChanged();
}

export function getOnboardingStateAdapter(): OnboardingStateAdapter {
  return onboardingStateAdapter;
}

export function setOnboardingStateUserId(userId?: string | null): void {
  currentOnboardingUserId = userId ?? undefined;
}

export function subscribeToOnboardingStateChanges(listener: OnboardingStateListener): () => void {
  onboardingStateListeners.add(listener);
  return () => {
    onboardingStateListeners.delete(listener);
  };
}

export async function markOnboardingComplete(input?: {
  userId?: string;
  completedAt?: string;
}): Promise<OnboardingState> {
  const next = await onboardingStateAdapter.markComplete({
    ...input,
    userId: input?.userId ?? currentOnboardingUserId,
  });
  notifyOnboardingStateChanged(next);
  return next;
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
      subscribeToOnboardingStateChanges((nextState) => {
        if (nextState) {
          setState(nextState);
          setError(undefined);
          setIsLoading(false);
          return;
        }
        void refresh();
      }),
    [refresh],
  );

  return {
    adapter,
    state,
    isLoading,
    error,
    refresh,
    markComplete: async (input?: { completedAt?: string }) => {
      const next = await adapter.markComplete({ userId, completedAt: input?.completedAt });
      setState(next);
      setError(undefined);
      setIsLoading(false);
      notifyOnboardingStateChanged(next);
      return next;
    },
  };
}
