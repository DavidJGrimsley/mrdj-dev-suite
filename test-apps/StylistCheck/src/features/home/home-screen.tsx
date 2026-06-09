import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SvgMark } from '../../components/exposition';
import { appSnapshot } from '../../data/mock-app';

const expositionLinks = [
  { href: '/exposition' as const, title: 'Software Mansion exposition', body: 'Review included base packages and decide what stays.' },
  { href: '/exposition/stylist' as const, title: 'Stylist', body: 'Test colors, type, motion, and component density.' },
  { href: '/exposition/data' as const, title: 'Data adapter', body: 'Try the local data boundary before replacing it.' },
];

export default function HomeScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.header}>
        <SvgMark />
        <View style={styles.headerText}>
          <Text style={styles.title}>StylistCheck</Text>
          <Text style={styles.subtitle}>{appSnapshot.audience}</Text>
        </View>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="button" style={styles.infoButton}>
            <Text style={styles.infoButtonText}>i</Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.grid}>
        <Link href="/onboarding" asChild>
          <Pressable style={styles.primaryCard}>
            <Text style={styles.primaryTitle}>Onboarding preview</Text>
            <Text style={styles.primaryBody}>Open the generated onboarding screen before the main product flow replaces it.</Text>
          </Pressable>
        </Link>
        {expositionLinks.map((item) => (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={styles.linkCard}>
              <Text style={styles.linkTitle}>{item.title}</Text>
              <Text style={styles.linkBody}>{item.body}</Text>
            </Pressable>
          </Link>
        ))}
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
    gap: 16,
    padding: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  infoButton: {
    alignItems: "center",
    backgroundColor: '#111827',
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  infoButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: "800",
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 14,
    marginTop: 3,
  },
  grid: {
    gap: 12,
  },
  primaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    gap: 8,
    padding: 16,
  },
  primaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: "800",
  },
  primaryBody: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  linkCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  linkTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: "800",
  },
  linkBody: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
});
