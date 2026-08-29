export type LegalDocumentId = 'terms' | 'privacy';

export interface LegalDocumentSection {
  id: string;
  title: string;
  body: string[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  summary: string;
  effectiveDate: string;
  lastUpdated: string;
  acceptanceVersion: string;
  requiresReacceptance: boolean;
  changeSummary: string;
  sections: LegalDocumentSection[];
}

export const legalDocumentReplacementWarning =
  'This placeholder legal text is not legal advice. Replace it with documents reviewed by qualified counsel before production use.';

export const legalDocuments: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    summary:
      'Starter terms for __MDS_APP_NAME__ with common sections your legal reviewer can replace.',
    effectiveDate: '2026-08-10',
    lastUpdated: '2026-08-10',
    acceptanceVersion: '2026-08-10',
    requiresReacceptance: true,
    changeSummary:
      'Initial material Terms of Service version that should be accepted before protected app access.',
    sections: [
      {
        id: 'acceptance',
        title: 'Acceptance of Terms',
        body: [
          'By accessing or using __MDS_APP_NAME__, you agree to these Terms of Service.',
          'If you do not agree to these terms, do not use the app or service.',
        ],
      },
      {
        id: 'service-scope',
        title: 'Service Scope',
        body: [
          '__MDS_APP_NAME__ provides the app features, content, workflows, and connected services described in your product documentation.',
          'Replace this section with a specific description of what your app does and what it does not provide.',
        ],
      },
      {
        id: 'accounts',
        title: 'Accounts and Responsibilities',
        body: [
          'You are responsible for the accuracy of information you provide and for activity that occurs through your account or device.',
          'If your app does not use accounts, replace this section with your guest, device, or local-profile expectations.',
        ],
      },
      {
        id: 'acceptable-use',
        title: 'Acceptable Use',
        body: [
          'Do not misuse the service, attempt unauthorized access, interfere with app operation, or use the app for unlawful activity.',
          'Add any app-specific content, community, billing, safety, or platform rules before release.',
        ],
      },
      {
        id: 'third-parties',
        title: 'Third-Party Services',
        body: [
          'The app may link to, integrate with, or depend on third-party services that are governed by their own terms and policies.',
          'List the providers your app actually uses, including payment, analytics, authentication, storage, or AI services.',
        ],
      },
      {
        id: 'changes-contact',
        title: 'Changes and Contact',
        body: [
          'These terms may be updated as product functionality, business requirements, or legal obligations change.',
          '__MDS_LEGAL_BUSINESS_NAME__ is the business responsible for these terms. Direct legal questions to __MDS_LEGAL_CONTACT_EMAIL__ and replace this line with your reviewed notice workflow.',
          'Replace this placeholder with your business address, jurisdiction, and local notice requirements: __MDS_LEGAL_ADDRESS_OR_REGION_NOTE__.',
        ],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    summary:
      'Starter privacy policy for __MDS_APP_NAME__ with common data and rights sections to replace.',
    effectiveDate: '2026-08-10',
    lastUpdated: '2026-08-10',
    acceptanceVersion: '2026-08-10',
    requiresReacceptance: true,
    changeSummary:
      'Initial material Privacy Policy version that should be accepted before protected app access.',
    sections: [
      {
        id: 'data-processed',
        title: 'Data We Process',
        body: [
          '__MDS_APP_NAME__ may process information needed to provide app functionality, support, security, and product improvement.',
          'Replace this placeholder with the exact categories of personal, device, account, payment, analytics, and content data your app processes.',
        ],
      },
      {
        id: 'use-of-data',
        title: 'How Data Is Used',
        body: [
          'Data should be used only to operate the app, provide requested features, maintain security, support users, and meet legal obligations.',
          'Document any analytics, personalization, AI processing, advertising, or business communications that apply to your app.',
        ],
      },
      {
        id: 'sharing',
        title: 'Sharing and Third Parties',
        body: [
          'Do not claim data is never shared unless that is true for every provider and operational workflow.',
          'List the third-party processors, infrastructure providers, payment providers, analytics tools, and integrations your app uses.',
        ],
      },
      {
        id: 'retention-security',
        title: 'Retention and Security',
        body: [
          'Explain how long data is kept, what controls protect it, and how users or administrators can delete data when appropriate.',
          'Replace this section with retention periods, backup behavior, account deletion behavior, and incident-response commitments.',
        ],
      },
      {
        id: 'rights-contact',
        title: 'Your Choices and Contact',
        body: [
          'Users may have rights to access, correct, delete, export, restrict, or object to processing depending on jurisdiction, including GDPR and comparable privacy laws.',
          'For GDPR-facing flows, document your lawful bases, cross-border transfer process, retention rules, and response timelines for data-subject requests.',
          'Route privacy requests to __MDS_LEGAL_CONTACT_EMAIL__ on behalf of __MDS_LEGAL_BUSINESS_NAME__, and replace this placeholder workflow before production use.',
          'Replace this location or jurisdiction note with the reviewed business address, EU representative, or regional contact process that applies: __MDS_LEGAL_ADDRESS_OR_REGION_NOTE__.',
        ],
      },
    ],
  },
};

export function getLegalDocument(documentId: LegalDocumentId): LegalDocument {
  return legalDocuments[documentId];
}
