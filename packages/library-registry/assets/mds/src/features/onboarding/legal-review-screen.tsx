import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LegalDocumentModal } from '../legal/legal-document-modal';
import { getLegalDocument, type LegalDocumentId } from '../legal/legal-documents';
import {
  getRequiredMaterialLegalDocuments,
  useLegalUpdateGateSnapshot,
} from '../legal/legal-acceptance-adapter';
import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import { markOnboardingComplete } from '../onboarding-state/onboarding-state';
import { onboardingConfig } from './onboarding-config';

const requiredDocuments = getRequiredMaterialLegalDocuments();

function LegalRow({
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
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={[
        styles.documentCard,
        {
          backgroundColor: colors.surface,
          borderColor: accepted ? colors.success : colors.primary,
          borderRadius: theme.layout.radius,
        },
      ]}
    >
      <View style={styles.documentText}>
        <Text style={[styles.documentTitle, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.documentMeta, { color: colors.text }]}>
          Last updated {document.lastUpdated}
        </Text>
      </View>
      <Text style={[styles.documentAction, { color: accepted ? colors.success : colors.primary }]}>
        {accepted ? 'Accepted' : 'Review'}
      </Text>
    </Pressable>
  );
}

export default function OnboardingLegalReviewScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);
  const [activeDocument, setActiveDocument] = useState<LegalDocumentId | null>(null);
  const { snapshot, acceptDocument, savingDocumentId } = useLegalUpdateGateSnapshot();
  const missingDocumentIds = new Set(
    snapshot.requiredDocuments.map((document) => document.documentId)
  );
  const hasAcceptedRequiredDocuments = snapshot.status === 'complete';

  const closeModal = () => setActiveDocument(null);
  const acceptActiveDocument = async () => {
    if (activeDocument) {
      const document = requiredDocuments.find((item) => item.documentId === activeDocument);
      if (document) {
        await acceptDocument(document);
      }
    }
    closeModal();
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primary }]}>Legal</Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontTitle,
            },
          ]}
        >
          {onboardingConfig.legal.title}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>{onboardingConfig.legal.body}</Text>
      </View>

      <View style={styles.stack}>
        {requiredDocuments.map((document) => (
          <LegalRow
            accepted={!missingDocumentIds.has(document.documentId)}
            documentId={document.documentId}
            key={document.documentId}
            onOpen={() => setActiveDocument(document.documentId)}
          />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!hasAcceptedRequiredDocuments || Boolean(savingDocumentId)}
        onPress={() => {
          void markOnboardingComplete().then(() => {
            router.replace(onboardingConfig.completion.route);
          });
        }}
        style={[
          styles.primaryButton,
          {
            backgroundColor:
              hasAcceptedRequiredDocuments && !savingDocumentId ? colors.primary : colors.surface,
            borderRadius: theme.layout.radius,
          },
        ]}
      >
        <Text
          style={[
            styles.primaryButtonText,
            {
              color:
                hasAcceptedRequiredDocuments && !savingDocumentId ? primaryForeground : colors.text,
            },
          ]}
        >
          {onboardingConfig.completion.label}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 84 : 28,
  },
  header: {
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 720,
  },
  stack: {
    gap: 12,
  },
  documentCard: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  documentText: {
    flex: 1,
    gap: 4,
  },
  documentTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  documentMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  documentAction: {
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 15,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
