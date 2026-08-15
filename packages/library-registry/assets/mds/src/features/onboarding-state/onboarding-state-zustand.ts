import {
  createEmptyOnboardingState,
  upsertLegalAcceptance,
  type OnboardingState,
  type OnboardingStateAdapter,
} from './onboarding-state-types';
import {
  getPersistedOnboardingState,
  setPersistedOnboardingState,
} from './onboarding-store';
import type { MemoryLegalAcceptanceAdapter, MemoryLegalDocument } from './onboarding-state-memory';

export function createZustandOnboardingStateAdapter(): OnboardingStateAdapter {
  return {
    mode: 'zustand-local',
    async loadState() {
      const state = getPersistedOnboardingState();
      return { ...state, legalAcceptances: [...state.legalAcceptances] };
    },
    async saveState(state: OnboardingState) {
      setPersistedOnboardingState({
        ...state,
        legalAcceptances: [...state.legalAcceptances],
        pendingSync: false,
      });
    },
    async markComplete(input) {
      const current = getPersistedOnboardingState();
      const next = {
        ...current,
        completedAt: input?.completedAt ?? new Date().toISOString(),
        currentStep: 'complete',
        pendingSync: false,
      };
      setPersistedOnboardingState(next);
      return next;
    },
  };
}

export function createZustandLegalAcceptanceAdapter(): MemoryLegalAcceptanceAdapter {
  return {
    async loadRequiredLegalAcceptances(requiredDocuments: MemoryLegalDocument[]) {
      const acceptedDocumentKeys = getPersistedOnboardingState().legalAcceptances.map(
        (item) => `${item.documentId}@${item.documentVersion}`,
      );
      const accepted = new Set(acceptedDocumentKeys);
      const missingDocuments = requiredDocuments.filter(
        (document) => !accepted.has(`${document.documentId}@${document.acceptanceVersion}`),
      );

      return {
        status: missingDocuments.length > 0 ? 'needs-legal' : 'complete',
        requiredDocuments: missingDocuments,
        acceptedDocumentKeys,
      };
    },

    async acceptLegalDocument(document, input) {
      const next = upsertLegalAcceptance(getPersistedOnboardingState() ?? createEmptyOnboardingState(), {
        documentId: document.documentId,
        documentVersion: document.acceptanceVersion,
        acceptedAt: new Date().toISOString(),
        userId: input?.userId,
        flowId: input?.flowId,
        flowVersion: input?.flowVersion,
      });
      setPersistedOnboardingState(next);
    },
  };
}
