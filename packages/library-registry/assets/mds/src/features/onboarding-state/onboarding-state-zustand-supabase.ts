import type { MemoryLegalAcceptanceAdapter, MemoryLegalDocument } from './onboarding-state-memory';
import {
  createSupabaseLegalAcceptanceAdapter,
  createSupabaseOnboardingStateAdapter,
  type SupabaseClientFactory,
} from './onboarding-state-supabase';
import {
  createEmptyOnboardingState,
  upsertLegalAcceptance,
  type OnboardingState,
  type OnboardingStateAdapter,
} from './onboarding-state-types';

export type OnboardingStateCache = {
  getState(): OnboardingState;
  setState(state: OnboardingState): void;
};

export function createZustandSupabaseOnboardingStateAdapter(
  getClient: SupabaseClientFactory,
  cache: OnboardingStateCache,
): OnboardingStateAdapter {
  const remote = createSupabaseOnboardingStateAdapter(getClient);

  return {
    mode: 'zustand-supabase',
    async loadState(userId) {
      const cached = cache.getState();
      if (!userId) {
        return { ...cached, pendingSync: true };
      }

      const remoteState = await remote.loadState(userId);
      if (!remoteState) {
        return { ...cached, pendingSync: Boolean(cached.completedAt || cached.currentStep) };
      }

      const merged: OnboardingState = {
        ...remoteState,
        currentStep: remoteState.currentStep ?? cached.currentStep,
        completedAt: remoteState.completedAt ?? cached.completedAt,
        legalAcceptances: remoteState.legalAcceptances,
        pendingSync: false,
      };
      cache.setState(merged);
      return merged;
    },
    async saveState(state, userId) {
      cache.setState({ ...state, pendingSync: !userId });
      if (userId) {
        await remote.saveState({ ...state, pendingSync: false }, userId);
        cache.setState({ ...state, pendingSync: false });
      }
    },
    async markComplete(input) {
      const current = cache.getState();
      const next = {
        ...current,
        completedAt: input?.completedAt ?? new Date().toISOString(),
        currentStep: 'complete',
        pendingSync: !input?.userId,
      };
      cache.setState(next);
      if (input?.userId) {
        const remoteState = await remote.markComplete(input);
        cache.setState({ ...remoteState, pendingSync: false });
        return { ...remoteState, pendingSync: false };
      }
      return next;
    },
    async syncPending(userId) {
      const cached = cache.getState();
      const remoteState = await remote.loadState(userId);
      if (remoteState) {
        cache.setState({ ...remoteState, pendingSync: false });
        return { ...remoteState, pendingSync: false };
      }
      if (cached.completedAt || cached.currentStep) {
        await remote.saveState({ ...cached, pendingSync: false }, userId);
        cache.setState({ ...cached, pendingSync: false });
      }
      return { ...cache.getState(), pendingSync: false };
    },
  };
}

export function createZustandSupabaseLegalAcceptanceAdapter(
  getClient: SupabaseClientFactory,
  cache: OnboardingStateCache,
): MemoryLegalAcceptanceAdapter {
  const remote = createSupabaseLegalAcceptanceAdapter(getClient);

  return {
    async loadRequiredLegalAcceptances(requiredDocuments: MemoryLegalDocument[], userId?: string) {
      if (!userId) {
        return {
          status: 'needs-legal',
          requiredDocuments,
          acceptedDocumentKeys: [],
        };
      }
      return remote.loadRequiredLegalAcceptances(requiredDocuments, userId);
    },

    async acceptLegalDocument(document, input) {
      if (!input?.userId) {
        const next = upsertLegalAcceptance(cache.getState() ?? createEmptyOnboardingState(), {
          documentId: document.documentId,
          documentVersion: document.acceptanceVersion,
          acceptedAt: new Date().toISOString(),
          flowId: input?.flowId,
          flowVersion: input?.flowVersion,
        });
        cache.setState({ ...next, pendingSync: true });
        return;
      }
      await remote.acceptLegalDocument(document, input);
    },
  };
}
