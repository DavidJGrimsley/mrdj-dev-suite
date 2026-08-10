import { useMemo, useState } from 'react';

import type { LegalDocumentId } from './legal-documents';

export type LegalAcceptanceRecord = Record<LegalDocumentId, boolean>;

const defaultAcceptance: LegalAcceptanceRecord = {
  terms: false,
  privacy: false,
};

export function useLegalAcceptance(initialAcceptance: Partial<LegalAcceptanceRecord> = {}) {
  const [acceptedDocuments, setAcceptedDocuments] = useState<LegalAcceptanceRecord>({
    ...defaultAcceptance,
    ...initialAcceptance,
  });

  const hasAcceptedRequiredDocuments = useMemo(
    () => acceptedDocuments.terms && acceptedDocuments.privacy,
    [acceptedDocuments.privacy, acceptedDocuments.terms],
  );

  const acceptDocument = (documentId: LegalDocumentId) => {
    setAcceptedDocuments((current) => ({ ...current, [documentId]: true }));
  };

  const revokeDocument = (documentId: LegalDocumentId) => {
    setAcceptedDocuments((current) => ({ ...current, [documentId]: false }));
  };

  const resetLegalAcceptance = () => {
    setAcceptedDocuments(defaultAcceptance);
  };

  return {
    acceptedDocuments,
    hasAcceptedRequiredDocuments,
    acceptDocument,
    revokeDocument,
    resetLegalAcceptance,
  };
}
