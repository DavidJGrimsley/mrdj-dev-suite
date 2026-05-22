import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { addLocalTask, getLocalAppSnapshot } from '../../services/local-data';

import type { appSnapshot } from '../../data/mock-app';

type Snapshot = typeof appSnapshot;

export default function DataScreen() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    void getLocalAppSnapshot().then(setSnapshot);
  }, []);

  async function addTask() {
    setSnapshot(await addLocalTask());
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>Data Adapter Exposition</Text>
      <Text style={styles.intro}>
        This page demonstrates a data-layer boundary: screens talk to an adapter, not directly to
        SQLite or Supabase. That lets you change storage later without rewriting UI screens.
      </Text>
      <View style={styles.guidance}>
        <Text style={styles.sectionTitle}>What this page is proving</Text>
        <Text style={styles.body}>
          1. UI calls adapter functions (`getLocalAppSnapshot`, `addLocalTask`), not database code.
        </Text>
        <Text style={styles.body}>
          2. Today the adapter uses local storage (web-safe local data and native SQLite).
        </Text>
        <Text style={styles.body}>
          3. Later you can swap adapter internals to Supabase while keeping your screens mostly
          unchanged.
        </Text>
        <Text style={styles.body}>
          4. Recommended flow: build your app with local data while developing, then start using a
          test Supabase DB, then use production.
        </Text>
      </View>
      <Pressable onPress={addTask} style={styles.button}>
        <Text style={styles.buttonText}>Insert test task via adapter</Text>
      </Pressable>
      <Text style={styles.note}>
        Repeated &quot;Try the local data adapter&quot; rows are expected here. They are intentionally
        simple test inserts to prove write + read flow.
      </Text>
      {snapshot?.tasks.map((task) => (
        <View key={task.id} style={styles.taskCard}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskStatus}>{task.status}</Text>
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
    fontWeight: "900",
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
    fontWeight: "800",
    textAlign: "center",
  },
  note: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 20,
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
    fontWeight: "700",
  },
  taskStatus: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
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
    fontWeight: "800",
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 21,
  },
});
