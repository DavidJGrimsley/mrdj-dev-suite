import { LegalDocumentView } from './components/legal-document-view';
import { onboardingLegalDocuments } from './legal-documents';

export default function AgreementScreen() {
  return <LegalDocumentView document={onboardingLegalDocuments.agreement} />;
}
