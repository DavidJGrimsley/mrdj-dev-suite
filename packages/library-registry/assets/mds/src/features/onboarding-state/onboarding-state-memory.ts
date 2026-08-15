import {
  createEmptyOnboardingState,
  upsertLegalAcceptance,
  type OnboardingDocumentAcceptance,
  type OnboardingState,
  type OnboardingStateAdapter,
} from './onboarding-state-types';

export type MemoryLegalDocument = {
  documentId: OnboardingDocumentAcceptance['documentId'];
  acceptanceVersion: string;
};

export type MemoryLegalSnapshot = {
  status: 'needs-legal' | 'complete';
  requiredDocuments: MemoryLegalDocument[];
  acceptedDocumentKeys: string[];
};

export type MemoryLegalAcceptanceAdapter = {
  loadRequiredLegalAcceptances(
    requiredDocuments: MemoryLegalDocument[],
    userId?: string,
  ): Promise<MemoryLegalSnapshot>;
  acceptLegalDocument(
    document: MemoryLegalDocument,
    input?: { userId?: string; flowId?: string; flowVersion?: number },
  ): Promise<void>;
};

type MemoryStore = {
  state: OnboardingState | null;
};

export function createMemoryOnboardingStore(initial?: OnboardingState | null): MemoryStore {
  return { state: initial ?? null };
}

export function createMemoryOnboardingStateAdapter(
  store: MemoryStore = createMemoryOnboardingStore(),
): OnboardingStateAdapter {
  return {
    mode: 'memory',
    async loadState() {
      return store.state ? { ...store.state, legalAcceptances: [...store.state.legalAcceptances] } : null;
    },
    async saveState(state: OnboardingState) {
      store.state = {
        ...state,
        legalAcceptances: [...state.legalAcceptances],
      };
    },
    async markComplete(input) {
      const current = store.state ?? createEmptyOnboardingState();
      const next = {
        ...current,
        completedAt: input?.completedAt ?? new Date().toISOString(),
        currentStep: 'complete',
      };
      store.state = next;
      return next;
    },
  };
}

export function createMemoryLegalAcceptanceAdapter(
  store: MemoryStore = createMemoryOnboardingStore(),
): MemoryLegalAcceptanceAdapter {
  return {
    async loadRequiredLegalAcceptances(requiredDocuments: MemoryLegalDocument[]) {
      const acceptedDocumentKeys = (store.state?.legalAcceptances ?? []).map(
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
      const current = store.state ?? createEmptyOnboardingState();
      store.state = upsertLegalAcceptance(current, {
        documentId: document.documentId,
        documentVersion: document.acceptanceVersion,
        acceptedAt: new Date().toISOString(),
        userId: input?.userId,
        flowId: input?.flowId,
        flowVersion: input?.flowVersion,
      });
    },
  };
}

export function createMemoryOnboardingPersistence(store: MemoryStore = createMemoryOnboardingStore()) {
  return {
    store,
    onboarding: createMemoryOnboardingStateAdapter(store),
    legal: createMemoryLegalAcceptanceAdapter(store),
  };
}
