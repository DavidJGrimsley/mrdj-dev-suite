import { LegalDocumentView } from './components/legal-document-view';
import { onboardingLegalDocuments } from './legal-documents';

export default function TermsScreen() {
  return <LegalDocumentView document={onboardingLegalDocuments.terms} />;
}
