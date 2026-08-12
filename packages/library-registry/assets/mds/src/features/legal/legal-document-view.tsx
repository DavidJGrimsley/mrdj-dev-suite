import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';
import {
  legalDocumentReplacementWarning,
  type LegalDocument,
} from './legal-documents';

interface LegalDocumentViewProps {
  document: LegalDocument;
  footer?: ReactNode;
  showHeader?: boolean;
}

function LegalDocumentMeta({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <View
      style={[
        styles.metaItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surface,
          borderRadius: theme.layout.radius,
        },
      ]}>
      <Text style={[styles.metaLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function LegalSectionItem({ title, body }: { title: string; body: string[] }) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          borderRadius: theme.layout.radius,
        },
      ]}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: colors.text,
            fontFamily: theme.typography.fontFamily,
          },
        ]}>
        {title}
      </Text>
      <View style={styles.paragraphs}>
        {body.map((paragraph, index) => (
          <Text
            key={`${title}-${index}`}
            style={[
              styles.sectionBody,
              {
                color: colors.text,
                fontFamily: theme.typography.fontBody,
                fontSize: theme.typography.bodySize,
              },
            ]}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function LegalDocumentView({
  document,
  footer,
  showHeader = true,
}: LegalDocumentViewProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.document}>
        {showHeader ? (
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                  fontFamily: theme.typography.fontFamily,
                },
              ]}>
              {document.title}
            </Text>
            <Text
              style={[
                styles.summary,
                {
                  color: colors.text,
                  fontFamily: theme.typography.fontBody,
                  fontSize: theme.typography.bodySize,
                },
              ]}>
              {document.summary}
            </Text>
            <View style={styles.metaRow}>
              <LegalDocumentMeta label="Effective" value={document.effectiveDate} />
              <LegalDocumentMeta label="Last updated" value={document.lastUpdated} />
              <LegalDocumentMeta label="Acceptance version" value={document.acceptanceVersion} />
            </View>
          </View>
        ) : null}

        <View
          style={[
            styles.warning,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
              borderRadius: theme.layout.radius,
            },
          ]}>
          <Text style={[styles.warningTitle, { color: colors.text }]}>Replacement required</Text>
          <Text
            style={[
              styles.warningBody,
              {
                color: colors.text,
                fontFamily: theme.typography.fontBody,
              },
            ]}>
            {legalDocumentReplacementWarning}
          </Text>
        </View>

        {document.sections.map((section) => (
          <LegalSectionItem key={section.id} title={section.title} body={section.body} />
        ))}
        {footer}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
    paddingTop: 48,
  },
  document: {
    gap: 16,
    maxWidth: 920,
    width: '100%',
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  warning: {
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  warningBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  paragraphs: {
    gap: 10,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 23,
  },
});
