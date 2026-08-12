import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import { LegalDocumentView } from './legal-document-view';
import { getLegalDocument, type LegalDocumentId } from './legal-documents';

interface LegalDocumentModalProps {
  documentId: LegalDocumentId;
  visible: boolean;
  onClose: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}

export function LegalDocumentModal({
  documentId,
  visible,
  onClose,
  onPrimaryAction,
  primaryActionLabel = 'Done',
}: LegalDocumentModalProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const document = getLegalDocument(documentId);
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible}>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.surface }]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{document.title}</Text>
            <Text style={[styles.updated, { color: colors.text }]}>
              Last updated: {document.lastUpdated}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Close ${document.title}`}
            accessibilityRole="button"
            onPress={onClose}
            style={[
              styles.closeButton,
              {
                backgroundColor: colors.surface,
                borderRadius: Math.max(8, theme.layout.radius - 4),
              },
            ]}>
            <Text style={[styles.closeText, { color: colors.text }]}>X</Text>
          </Pressable>
        </View>
        <LegalDocumentView document={document} showHeader={false} />
        <View style={[styles.footer, { borderTopColor: colors.surface }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryAction ?? onClose}
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                borderRadius: theme.layout.radius,
              },
            ]}>
            <Text style={[styles.primaryButtonText, { color: primaryForeground }]}>
              {primaryActionLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  updated: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeText: {
    fontSize: 15,
    fontWeight: '900',
  },
  footer: {
    borderTopWidth: 1,
    padding: 20,
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
