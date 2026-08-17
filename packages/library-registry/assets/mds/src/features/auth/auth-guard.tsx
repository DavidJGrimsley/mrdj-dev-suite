import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/provider';
import { resolveAuthGuardDecision, type AuthGuardDecision } from './auth-guard-logic';

import type { AuthAdapter, AuthAdapterState } from './auth-types';

export interface AuthGuardProps {
  auth: AuthAdapter;
  children: ReactNode;
  fallbackHref?: string;
  fallback?: ReactNode;
}

export function AuthGuard({
  auth,
  children,
  fallbackHref = '/sign-in',
  fallback,
}: AuthGuardProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  const refreshAuth = useCallback(() => {
    void auth.refreshSession();
  }, [auth]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useFocusEffect(
    useCallback(() => {
      refreshAuth();
    }, [refreshAuth])
  );

  const decision: AuthGuardDecision = resolveAuthGuardDecision(auth.state, {
    fallback,
    fallbackHref,
  });

  if (decision === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Checking session...</Text>
      </View>
    );
  }

  if (decision === 'authorized') {
    return <>{children}</>;
  }

  if (decision === 'redirect' && fallbackHref) {
    return <Redirect href={fallbackHref} />;
  }

  return <>{fallback ?? null}</>;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
