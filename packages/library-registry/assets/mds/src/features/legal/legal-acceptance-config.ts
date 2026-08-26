export type LegalAcceptanceConfigAdapter = {
  loadRequiredLegalAcceptances(
    requiredDocuments: Array<{ documentId: string; acceptanceVersion: string }>,
    userId?: string,
  ): Promise<{
    status: 'checking' | 'needs-legal' | 'complete' | 'error';
    requiredDocuments: Array<{ documentId: string; acceptanceVersion: string }>;
    acceptedDocumentKeys: string[];
    error?: string;
  }>;
  acceptLegalDocument(
    document: { documentId: string; acceptanceVersion: string },
    input?: { userId?: string; flowId?: string; flowVersion?: number },
  ): Promise<void>;
};

const memoryAcceptedKeys = new Set<string>();
const legalAcceptanceListeners = new Set<() => void>();
let currentLegalAcceptanceUserId: string | undefined;

function legalDocumentKey(document: { documentId: string; acceptanceVersion: string }): string {
  return `${document.documentId}@${document.acceptanceVersion}`;
}

export function notifyLegalAcceptanceChanged(): void {
  for (const listener of legalAcceptanceListeners) {
    listener();
  }
}

export function subscribeToLegalAcceptanceChanges(listener: () => void): () => void {
  legalAcceptanceListeners.add(listener);
  return () => {
    legalAcceptanceListeners.delete(listener);
  };
}

export function setLegalAcceptanceUserId(userId?: string | null): void {
  currentLegalAcceptanceUserId = userId ?? undefined;
}

export function getLegalAcceptanceUserId(): string | undefined {
  return currentLegalAcceptanceUserId;
}

export const memoryLegalAcceptanceAdapter: LegalAcceptanceConfigAdapter = {
  async loadRequiredLegalAcceptances(requiredDocuments) {
    const missingDocuments = requiredDocuments.filter(
      (document) => !memoryAcceptedKeys.has(legalDocumentKey(document)),
    );

    return {
      status: missingDocuments.length > 0 ? 'needs-legal' : 'complete',
      requiredDocuments: missingDocuments,
      acceptedDocumentKeys: [...memoryAcceptedKeys],
    };
  },

  async acceptLegalDocument(document) {
    memoryAcceptedKeys.add(legalDocumentKey(document));
    notifyLegalAcceptanceChanged();
  },
};

let legalAcceptanceAdapter: LegalAcceptanceConfigAdapter = memoryLegalAcceptanceAdapter;

export function configureLegalAcceptanceAdapter(adapter: LegalAcceptanceConfigAdapter): void {
  legalAcceptanceAdapter = adapter;
  notifyLegalAcceptanceChanged();
}

export function getLegalAcceptanceAdapter(): LegalAcceptanceConfigAdapter {
  return legalAcceptanceAdapter;
}
