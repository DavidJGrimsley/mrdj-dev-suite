import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import { useAuth } from './auth-provider';

type AuthScreenMode = 'sign-in' | 'sign-up' | 'reset-password';

const screenCopy = {
  'sign-in': {
    eyebrow: 'Welcome back',
    title: 'Sign in',
    action: 'Sign in',
  },
  'sign-up': {
    eyebrow: 'Create account',
    title: 'Sign up',
    action: 'Create account',
  },
  'reset-password': {
    eyebrow: 'Account recovery',
    title: 'Reset password',
    action: 'Send reset link',
  },
} satisfies Record<AuthScreenMode, { eyebrow: string; title: string; action: string }>;

export function AuthScreen({ mode }: { mode: AuthScreenMode }) {
  const theme = useAppTheme();
  const auth = useAuth();
  const router = useRouter();
  const colors = theme.activeColors;
  const primaryForeground = getReadableTextColor(colors.primary, theme.colors.light.text);
  const copy = screenCopy[mode];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const showPassword = mode !== 'reset-password';
  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    return showPassword ? password.length >= 8 : true;
  }, [email, password, showPassword]);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage('');
    setError('');
    const trimmedEmail = email.trim();
    const result =
      mode === 'sign-in'
        ? await auth.signIn({ email: trimmedEmail, password })
        : mode === 'sign-up'
          ? await auth.signUp({ email: trimmedEmail, password })
          : await auth.requestPasswordReset(trimmedEmail);

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.message ?? 'Done.');
    if (mode !== 'reset-password') {
      router.replace('/');
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>{copy.eyebrow}</Text>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: theme.typography.fontTitle,
              fontSize: Math.max(28, theme.typography.headingSize + 6),
            },
          ]}
        >
          {copy.title}
        </Text>
      </View>

      <View
        style={[
          styles.form,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderRadius: theme.layout.radius,
          },
        ]}
      >
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.text}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary,
                color: colors.text,
              },
            ]}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        {showPassword ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.text}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                  color: colors.text,
                },
              ]}
              textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
              value={password}
            />
          </View>
        ) : null}

        {error || auth.error ? <Text style={styles.errorText}>{error || auth.error}</Text> : null}
        {message ? (
          <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit || submitting}
          onPress={submit}
          style={StyleSheet.flatten([
            styles.primaryButton,
            {
              backgroundColor: canSubmit ? colors.primary : '#9ca3af',
              borderRadius: theme.layout.radius,
              opacity: submitting ? 0.7 : 1,
            },
          ])}
        >
          <Text style={[styles.primaryButtonText, { color: primaryForeground }]}>
            {submitting ? 'Working...' : copy.action}
          </Text>
        </Pressable>
      </View>

      <View style={styles.links}>
        {mode !== 'sign-in' ? (
          <Link href="/sign-in" style={[styles.link, { color: colors.primary }]}>
            Sign in
          </Link>
        ) : null}
        {mode !== 'sign-up' ? (
          <Link href="/sign-up" style={[styles.link, { color: colors.primary }]}>
            Create account
          </Link>
        ) : null}
        {mode !== 'reset-password' ? (
          <Link href="/reset-password" style={[styles.link, { color: colors.primary }]}>
            Reset password
          </Link>
        ) : null}
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  form: {
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    borderWidth: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '800',
  },
});
