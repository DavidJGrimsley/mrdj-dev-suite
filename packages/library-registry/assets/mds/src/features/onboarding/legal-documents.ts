export interface LegalDocumentSection {
  id: string;
  title: string;
  body: string;
}

export interface LegalDocument {
  id: 'agreement' | 'terms';
  title: string;
  summary: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalDocumentSection[];
}

export const onboardingLegalDocuments: Record<'agreement' | 'terms', LegalDocument> = {
  agreement: {
    id: 'agreement',
    title: 'User Agreement',
    summary: 'Agreement template for onboarding consent and account usage.',
    effectiveDate: '2026-05-24',
    lastUpdated: '2026-05-24',
    sections: [
      {
        id: 'scope',
        title: 'Scope',
        body: 'This agreement covers access to [APP NAME], account conduct, and baseline obligations between [COMPANY NAME] and each user.',
      },
      {
        id: 'usage',
        title: 'Acceptable Use',
        body: 'Users agree not to misuse the service, attempt unauthorized access, or submit harmful content.',
      },
      {
        id: 'privacy',
        title: 'Privacy and Data',
        body: 'User data is handled according to the published privacy notice. Replace this section with your final privacy commitments and retention policy.',
      },
      {
        id: 'termination',
        title: 'Termination',
        body: 'Either party may terminate usage under the conditions described in this section. Add jurisdiction-specific language before production launch.',
      },
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    summary: 'Near-blank, production-oriented terms starter for legal review.',
    effectiveDate: '2026-05-24',
    lastUpdated: '2026-05-24',
    sections: [
      {
        id: 'eligibility',
        title: 'Eligibility',
        body: 'Users must meet age and legal capacity requirements for their jurisdiction.',
      },
      {
        id: 'accounts',
        title: 'Accounts',
        body: 'Users are responsible for account credentials and activity performed through their account.',
      },
      {
        id: 'payments',
        title: 'Payments and Billing',
        body: 'If applicable, describe pricing, billing intervals, refunds, and failed payment handling.',
      },
      {
        id: 'liability',
        title: 'Disclaimers and Liability',
        body: 'Define limitations of liability and service disclaimers with legal counsel.',
      },
      {
        id: 'governing-law',
        title: 'Governing Law',
        body: 'Specify governing law, venue, and dispute resolution expectations.',
      },
    ],
  },
};
