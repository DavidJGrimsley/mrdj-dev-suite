import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import { onboardingConfig } from './onboarding-config';

export default function OnboardingWelcomeScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          {onboardingConfig.welcomeEyebrow}
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontTitle,
              fontSize: Math.max(28, theme.typography.displaySize),
            },
          ]}>
          {onboardingConfig.appName}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {onboardingConfig.welcomeTitle}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>{onboardingConfig.welcomeBody}</Text>
      </View>

      <View style={styles.stack}>
        {onboardingConfig.valueProps.map((item) => (
          <View
            key={item.title}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderRadius: theme.layout.radius,
              },
            ]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.cardBody, { color: colors.text }]}>{item.body}</Text>
          </View>
        ))}
      </View>

      <Link href={onboardingConfig.nextRouteAfterWelcome} asChild>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.flatten([
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: theme.layout.radius },
          ])}>
          <Text style={[styles.primaryButtonText, { color: primaryForeground }]}>Get started</Text>
        </Pressable>
      </Link>
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
  eyebrow: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 680,
  },
  stack: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
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
