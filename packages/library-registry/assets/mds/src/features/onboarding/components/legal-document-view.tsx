import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LegalDocument } from '../legal-documents';

interface LegalDocumentViewProps {
  document: LegalDocument;
}

function LegalDocumentMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function LegalSectionItem({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>{document.title}</Text>
      <Text style={styles.summary}>{document.summary}</Text>
      <View style={styles.metaRow}>
        <LegalDocumentMeta label="Effective" value={document.effectiveDate} />
        <LegalDocumentMeta label="Last updated" value={document.lastUpdated} />
      </View>
      {document.sections.map((section) => (
        <LegalSectionItem key={section.id} title={section.title} body={section.body} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 20,
    paddingTop: 84,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  summary: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaItem: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 14,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionBody: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
});
