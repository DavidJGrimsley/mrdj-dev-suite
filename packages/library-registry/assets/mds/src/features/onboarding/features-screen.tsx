import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';
import { getReadableTextColor } from './onboarding-colors';
import { onboardingConfig } from './onboarding-config';

export default function OnboardingFeaturesScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          {onboardingConfig.featuresEyebrow}
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontTitle,
            },
          ]}>
          {onboardingConfig.featuresTitle}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>{onboardingConfig.featuresBody}</Text>
      </View>

      <View style={styles.stack}>
        {onboardingConfig.featureHighlights.map((feature) => (
          <View
            key={feature.id}
            style={[
              styles.featureCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderRadius: theme.layout.radius,
              },
            ]}>
            {feature.badge ? (
              <Text style={[styles.badge, { color: colors.primary }]}>{feature.badge}</Text>
            ) : null}
            <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
            <Text style={[styles.featureBody, { color: colors.text }]}>{feature.body}</Text>
          </View>
        ))}
      </View>

      <Link href={onboardingConfig.nextRouteAfterFeatures} asChild>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.flatten([
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: theme.layout.radius },
          ])}>
          <Text style={[styles.primaryButtonText, { color: primaryForeground }]}>Continue</Text>
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
  featureCard: {
    borderWidth: 1,
    gap: 7,
    padding: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  featureBody: {
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
