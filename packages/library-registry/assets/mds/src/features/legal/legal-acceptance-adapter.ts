import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  configureLegalAcceptanceAdapter as configureSharedLegalAcceptanceAdapter,
  getLegalAcceptanceUserId,
  getLegalAcceptanceAdapter,
  memoryLegalAcceptanceAdapter as sharedMemoryLegalAcceptanceAdapter,
  notifyLegalAcceptanceChanged,
  setLegalAcceptanceUserId,
  subscribeToLegalAcceptanceChanges,
} from './legal-acceptance-config';
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
    requiredDocuments: RequiredLegalDocument[],
    userId?: string,
  ): Promise<LegalAcceptanceSnapshot>;
  acceptLegalDocument(
    document: RequiredLegalDocument,
    input?: { userId?: string; flowId?: string; flowVersion?: number },
  ): Promise<void>;
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

export const memoryLegalAcceptanceAdapter =
  sharedMemoryLegalAcceptanceAdapter as LegalAcceptanceAdapter;

/** @deprecated Use memoryLegalAcceptanceAdapter. Kept as a compatible alias. */
export const localLegalAcceptanceAdapter = memoryLegalAcceptanceAdapter;

export function configureLegalAcceptanceAdapter(adapter: LegalAcceptanceAdapter): void {
  configureSharedLegalAcceptanceAdapter(adapter);
}

export { setLegalAcceptanceUserId, subscribeToLegalAcceptanceChanges };

export function useLegalUpdateGateSnapshot(
  adapter: LegalAcceptanceAdapter = getLegalAcceptanceAdapter() as LegalAcceptanceAdapter,
  userId?: string,
) {
  const effectiveUserId = userId ?? getLegalAcceptanceUserId();
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
      const nextSnapshot = await adapter.loadRequiredLegalAcceptances(
        requiredMaterialDocuments,
        effectiveUserId,
      );
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
  }, [adapter, effectiveUserId, requiredMaterialDocuments]);

  const acceptDocument = useCallback(
    async (
      document: RequiredLegalDocument,
      input?: { userId?: string; flowId?: string; flowVersion?: number },
    ) => {
      setSavingDocumentId(document.documentId);
      try {
        await adapter.acceptLegalDocument(document, {
          userId: input?.userId ?? effectiveUserId,
          flowId: input?.flowId,
          flowVersion: input?.flowVersion,
        });
        if (adapter !== memoryLegalAcceptanceAdapter) {
          notifyLegalAcceptanceChanged();
        }
        return await refresh();
      } finally {
        setSavingDocumentId(null);
      }
    },
    [adapter, effectiveUserId, refresh],
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
    [refresh],
  );

  return {
    snapshot,
    refresh,
    acceptDocument,
    savingDocumentId,
  };
}

export function useLegalUpdateGateStatus(
  adapter: LegalAcceptanceAdapter = getLegalAcceptanceAdapter() as LegalAcceptanceAdapter,
  userId?: string,
): LegalGateStatus {
  return useLegalUpdateGateSnapshot(adapter, userId).snapshot.status;
}

export function useLegalAcceptance(
  adapter: LegalAcceptanceAdapter = getLegalAcceptanceAdapter() as LegalAcceptanceAdapter,
  userId?: string,
) {
  const requiredDocuments = useMemo(() => getRequiredMaterialLegalDocuments(), []);
  const { snapshot, acceptDocument, refresh } = useLegalUpdateGateSnapshot(adapter, userId);

  const acceptedDocuments = {
    terms: !snapshot.requiredDocuments.some((document) => document.documentId === 'terms'),
    privacy: !snapshot.requiredDocuments.some((document) => document.documentId === 'privacy'),
  };

  return {
    acceptedDocuments,
    hasAcceptedRequiredDocuments: snapshot.status === 'complete',
    acceptDocument: (documentId: LegalDocumentId) => {
      const document = requiredDocuments.find((item) => item.documentId === documentId);
      if (document) {
        return acceptDocument(document, { userId });
      }
      return refresh();
    },
    revokeDocument: () => {
      throw new Error('Legal acceptance records are append-only. Replace the adapter for test resets.');
    },
    resetLegalAcceptance: () => {
      throw new Error('Legal acceptance records are append-only. Replace the adapter for test resets.');
    },
  };
}
