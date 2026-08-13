import { useCallback, useEffect, useMemo, useState } from 'react';

import { legalDocuments, type LegalDocument, type LegalDocumentId } from './legal-documents';

export type LegalGateStatus = 'checking' | 'needs-legal' | 'complete' | 'error';

export interface RequiredLegalDocument {
  documentId: LegalDocumentId;
  acceptanceVersion: string;
  title: string;
  changeSummary: string;
}

export interface LegalAcceptanceSnapshot {
  status: LegalGateStatus;
  requiredDocuments: RequiredLegalDocument[];
  acceptedDocumentKeys: string[];
  error?: string;
}

export interface LegalAcceptanceAdapter {
  loadRequiredLegalAcceptances(
    requiredDocuments: RequiredLegalDocument[]
  ): Promise<LegalAcceptanceSnapshot>;
  acceptLegalDocument(document: RequiredLegalDocument): Promise<void>;
}

const STORAGE_KEY = 'mds.legal.acceptances.v1';
const memoryAcceptedKeys = new Set<string>();
const legalAcceptanceListeners = new Set<() => void>();

function legalDocumentKey(document: RequiredLegalDocument): string {
  return `${document.documentId}@${document.acceptanceVersion}`;
}

function toRequiredLegalDocument(document: LegalDocument): RequiredLegalDocument {
  return {
    documentId: document.id,
    acceptanceVersion: document.acceptanceVersion,
    title: document.title,
    changeSummary: document.changeSummary,
  };
}

export function getRequiredMaterialLegalDocuments(): RequiredLegalDocument[] {
  return Object.values(legalDocuments)
    .filter((document) => document.requiresReacceptance)
    .map(toRequiredLegalDocument);
}

function getBrowserStorage(): Storage | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function readAcceptedKeys(): Set<string> {
  const storage = getBrowserStorage();
  if (!storage) {
    return new Set(memoryAcceptedKeys);
  }

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) {
      return new Set(memoryAcceptedKeys);
    }
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set(memoryAcceptedKeys);
  }
}

function writeAcceptedKeys(keys: Set<string>): void {
  memoryAcceptedKeys.clear();
  for (const key of keys) {
    memoryAcceptedKeys.add(key);
  }

  const storage = getBrowserStorage();
  if (!storage) {
    notifyLegalAcceptanceChanged();
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  notifyLegalAcceptanceChanged();
}

function notifyLegalAcceptanceChanged(): void {
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

export const localLegalAcceptanceAdapter: LegalAcceptanceAdapter = {
  async loadRequiredLegalAcceptances(requiredDocuments) {
    const acceptedDocumentKeys = readAcceptedKeys();
    const missingDocuments = requiredDocuments.filter(
      (document) => !acceptedDocumentKeys.has(legalDocumentKey(document))
    );

    return {
      status: missingDocuments.length > 0 ? 'needs-legal' : 'complete',
      requiredDocuments: missingDocuments,
      acceptedDocumentKeys: [...acceptedDocumentKeys],
    };
  },

  async acceptLegalDocument(document) {
    const acceptedDocumentKeys = readAcceptedKeys();
    acceptedDocumentKeys.add(legalDocumentKey(document));
    writeAcceptedKeys(acceptedDocumentKeys);
  },
};

let legalAcceptanceAdapter: LegalAcceptanceAdapter = localLegalAcceptanceAdapter;

export function configureLegalAcceptanceAdapter(adapter: LegalAcceptanceAdapter): void {
  legalAcceptanceAdapter = adapter;
}

export function useLegalUpdateGateSnapshot(
  adapter: LegalAcceptanceAdapter = legalAcceptanceAdapter
) {
  const requiredMaterialDocuments = useMemo(() => getRequiredMaterialLegalDocuments(), []);
  const [snapshot, setSnapshot] = useState<LegalAcceptanceSnapshot>({
    status: 'checking',
    requiredDocuments: requiredMaterialDocuments,
    acceptedDocumentKeys: [],
  });
  const [savingDocumentId, setSavingDocumentId] = useState<LegalDocumentId | null>(null);

  const refresh = useCallback(async () => {
    setSnapshot((current) => ({
      ...current,
      status: 'checking',
      error: undefined,
    }));
    try {
      const nextSnapshot = await adapter.loadRequiredLegalAcceptances(requiredMaterialDocuments);
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check legal acceptance.';
      const errorSnapshot: LegalAcceptanceSnapshot = {
        status: 'error',
        requiredDocuments: requiredMaterialDocuments,
        acceptedDocumentKeys: [],
        error: message,
      };
      setSnapshot(errorSnapshot);
      return errorSnapshot;
    }
  }, [adapter, requiredMaterialDocuments]);

  const acceptDocument = useCallback(
    async (document: RequiredLegalDocument) => {
      setSavingDocumentId(document.documentId);
      try {
        await adapter.acceptLegalDocument(document);
        return await refresh();
      } finally {
        setSavingDocumentId(null);
      }
    },
    [adapter, refresh]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(
    () =>
      subscribeToLegalAcceptanceChanges(() => {
        void refresh();
      }),
    [refresh]
  );

  return {
    snapshot,
    refresh,
    acceptDocument,
    savingDocumentId,
  };
}

export function useLegalUpdateGateStatus(
  adapter: LegalAcceptanceAdapter = legalAcceptanceAdapter
): LegalGateStatus {
  return useLegalUpdateGateSnapshot(adapter).snapshot.status;
}
