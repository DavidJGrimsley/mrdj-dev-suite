import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import { markOnboardingComplete } from '../onboarding-state/onboarding-state';
import { onboardingConfig } from './onboarding-config';

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const finishOnboarding = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setCompletionError(null);
    try {
      await markOnboardingComplete();
      setTimeout(() => router.replace(onboardingConfig.completion.route), 0);
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : 'Unable to finish onboarding. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderRadius: theme.layout.radius,
          },
        ]}>
        <Text style={[styles.kicker, { color: colors.primary }]}>
          {onboardingConfig.completion.mode}
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontTitle,
            },
          ]}>
          {onboardingConfig.completeTitle}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>{onboardingConfig.completeBody}</Text>
        <Text style={[styles.helper, { color: colors.text }]}>
          {onboardingConfig.completion.helperText}
        </Text>
        {completionError ? (
          <Text style={[styles.errorText, { color: colors.warning }]}>{completionError}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void finishOnboarding()}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, borderRadius: theme.layout.radius },
          ]}>
          <Text style={[styles.primaryButtonText, { color: primaryForeground }]}>
            {isSaving ? 'Completing...' : onboardingConfig.completion.label}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 84 : 28,
  },
  panel: {
    alignSelf: 'center',
    borderWidth: 1,
    gap: 12,
    maxWidth: 760,
    padding: 18,
    width: '100%',
  },
  kicker: {
    fontSize: 12,
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
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.86,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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
