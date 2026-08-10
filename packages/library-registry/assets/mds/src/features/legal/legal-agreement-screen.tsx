import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';
import { LegalDocumentModal } from './legal-document-modal';
import { getLegalDocument, type LegalDocumentId } from './legal-documents';
import { useLegalAcceptance } from './use-legal-acceptance';

interface LegalAgreementScreenProps {
  continueLabel?: string;
  onComplete?: () => void;
}

function AgreementRow({
  documentId,
  accepted,
  onOpen,
}: {
  documentId: LegalDocumentId;
  accepted: boolean;
  onOpen: () => void;
}) {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const document = getLegalDocument(documentId);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: accepted ? colors.success : colors.primary,
          borderRadius: theme.layout.radius,
        },
      ]}>
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.cardSummary, { color: colors.text }]}>
          Last updated {document.lastUpdated}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={[
          styles.reviewButton,
          {
            backgroundColor: accepted ? colors.success : colors.primary,
            borderRadius: Math.max(8, theme.layout.radius - 4),
          },
        ]}>
        <Text style={styles.reviewButtonText}>{accepted ? 'Accepted' : 'Review'}</Text>
      </Pressable>
    </View>
  );
}

export function LegalAgreementScreen({
  continueLabel = 'Continue',
  onComplete,
}: LegalAgreementScreenProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const [activeDocument, setActiveDocument] = useState<LegalDocumentId | null>(null);
  const {
    acceptedDocuments,
    acceptDocument,
    hasAcceptedRequiredDocuments,
  } = useLegalAcceptance();

  const closeModal = () => setActiveDocument(null);
  const acceptActiveDocument = () => {
    if (activeDocument) {
      acceptDocument(activeDocument);
    }
    closeModal();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Legal agreements</Text>
        <Text style={[styles.body, { color: colors.text }]}>
          Review and accept the Terms of Service and Privacy Policy before continuing.
        </Text>
      </View>

      <View style={styles.stack}>
        <AgreementRow
          accepted={acceptedDocuments.terms}
          documentId="terms"
          onOpen={() => setActiveDocument('terms')}
        />
        <AgreementRow
          accepted={acceptedDocuments.privacy}
          documentId="privacy"
          onOpen={() => setActiveDocument('privacy')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!hasAcceptedRequiredDocuments}
        onPress={onComplete}
        style={[
          styles.continueButton,
          {
            backgroundColor: hasAcceptedRequiredDocuments ? colors.primary : colors.surface,
            borderRadius: theme.layout.radius,
          },
        ]}>
        <Text
          style={[
            styles.continueButtonText,
            { color: hasAcceptedRequiredDocuments ? '#ffffff' : colors.text },
          ]}>
          {continueLabel}
        </Text>
      </Pressable>

      {activeDocument ? (
        <LegalDocumentModal
          documentId={activeDocument}
          onClose={closeModal}
          onPrimaryAction={acceptActiveDocument}
          primaryActionLabel={`Accept ${getLegalDocument(activeDocument).title}`}
          visible
        />
      ) : null}
    </View>
  );
}

export default LegalAgreementScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 18,
    padding: 20,
    paddingTop: 72,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  stack: {
    gap: 12,
  },
  card: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewButton: {
    alignItems: 'center',
    minWidth: 94,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  continueButton: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 15,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
