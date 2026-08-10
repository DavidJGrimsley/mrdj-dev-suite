import { LegalDocumentView } from './legal-document-view';
import { getLegalDocument, type LegalDocumentId } from './legal-documents';

interface LegalDocumentRouteProps {
  documentId: LegalDocumentId;
}

export function LegalDocumentRoute({ documentId }: LegalDocumentRouteProps) {
  return <LegalDocumentView document={getLegalDocument(documentId)} />;
}
