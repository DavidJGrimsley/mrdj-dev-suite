import type { LegalDocumentId } from './legal-documents';

export type LegalAcceptanceRecord = Record<LegalDocumentId, boolean>;

export { useLegalAcceptance } from './legal-acceptance-adapter';
