import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpositionNotice } from '../../components/exposition';
import { addLocalTask, getLocalAppSnapshot } from '../../services/local-data';
import { useAppTheme } from '../../theme/provider';

import type { appSnapshot } from '../../data/mock-app';

type Snapshot = typeof appSnapshot;

export default function DataScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    void getLocalAppSnapshot().then(setSnapshot);
  }, []);

  async function addTask() {
    setSnapshot(await addLocalTask());
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontFamily: theme.typography.fontFamily,
            fontWeight:
              theme.typography.fontFamily === 'System' ||
              theme.typography.fontFamily === 'monospace'
                ? '800'
                : 'normal',
          },
        ]}>
        Data Exposition
      </Text>
      <Text style={[styles.intro, { color: colors.text }]}>
        This app starts with a web-safe local adapter and a native Expo SQLite adapter. Keep the
        boundary, then swap implementation details when Supabase is ready.
      </Text>
      <ExpositionNotice />
      <Pressable
        onPress={addTask}
        style={[
          styles.button,
          { backgroundColor: colors.primary, borderRadius: theme.layout.radius },
        ]}>
        <Text style={styles.buttonText}>Insert a local task</Text>
      </Pressable>
      {snapshot?.tasks.map((task) => (
        <View
          key={task.id}
          style={[
            styles.taskCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderRadius: theme.layout.radius,
            },
          ]}>
          <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
          <Text style={[styles.taskStatus, { color: colors.text }]}>{task.status}</Text>
        </View>
      ))}
      <View style={styles.guidance}>
        <Text style={styles.sectionTitle}>Later Supabase replacement</Text>
        <Text style={styles.body}>
          Create matching tables, move reads/writes into this adapter, then keep screens unchanged.
          Use separate Supabase projects for test/staging and production so test-to-main promotion
          never writes directly into production data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 20,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  intro: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  taskTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  taskStatus: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  guidance: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 21,
  },
});
