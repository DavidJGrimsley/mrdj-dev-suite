import { Link, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SvgMark } from '../../components/exposition';
import { appSnapshot } from '../../data/mock-app';
import { useAppTheme } from '../../theme/provider';

const expositionLinks: { href: Href; title: string; body: string }[] = [];

export default function HomeScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <SvgMark size={64} />
          <View style={styles.brandText}>
            <Text style={[styles.brandLine, { color: colors.text }]}>Super</Text>
            <Text style={[styles.brandLine, { color: colors.text }]}>Stack</Text>
          </View>
        </View>
        <View style={styles.headerText}>
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
            Experimemo
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>{appSnapshot.audience}</Text>
        </View>
        {Platform.OS === 'web' ? (
          <Link href="/settings" asChild>
            <Pressable
              accessibilityRole="button"
              style={StyleSheet.flatten([styles.infoButton, { backgroundColor: colors.primary }])}>
              <Text style={styles.infoButtonText}>i</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      <View style={styles.grid}>
        <Link href="/onboarding" asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.primaryCard,
              { backgroundColor: colors.primary, borderRadius: theme.layout.radius },
            ])}>
            <Text style={styles.primaryTitle}>Onboarding</Text>
            <Text style={styles.primaryBody}>
              Open the generated onboarding flow before the main product flow replaces it.
            </Text>
          </Pressable>
        </Link>
        {expositionLinks.map((item) => (
          <Link key={String(item.href)} href={item.href} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.linkCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary,
                  borderRadius: theme.layout.radius,
                },
              ])}>
              <Text style={[styles.linkTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.linkBody, { color: colors.text }]}>{item.body}</Text>
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
    flexGrow: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 84 : 20,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  brandLockup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },
  headerText: {
    alignItems: 'center',
    width: '100%',
  },
  brandText: {
    gap: 0,
  },
  brandLine: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 17,
    textTransform: 'uppercase',
  },
  infoButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 36,
  },
  infoButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 14,
    marginTop: 3,
    textAlign: 'center',
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
    fontWeight: '800',
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
    fontWeight: '800',
  },
  linkBody: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
});
