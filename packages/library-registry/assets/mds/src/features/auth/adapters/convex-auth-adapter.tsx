import { ConvexAuthProvider, useAuthActions, useConvexAuth } from '@convex-dev/auth/react';
import { useCallback, useMemo, type ReactNode } from 'react';

import { convex, convexAuthStorage, isConvexConfigured } from '../../services/convex';

import type { AuthActionInput, AuthActionResult, AuthAdapter, AuthSession } from './auth-types';

function authError(error: unknown): AuthActionResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: message };
}

export function AuthAdapterProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex} storage={convexAuthStorage}>
      {children}
    </ConvexAuthProvider>
  );
}

export function useAuthAdapter(): AuthAdapter {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut: convexSignOut } = useAuthActions();
  const session = useMemo<AuthSession | null>(
    () =>
      isAuthenticated
        ? {
            user: {
              id: 'convex-auth-user',
              provider: 'convex',
            },
          }
        : null,
    [isAuthenticated],
  );
  const configurationError = isConvexConfigured
    ? null
    : 'Set EXPO_PUBLIC_CONVEX_URL and initialize Convex Auth before using this generated adapter.';

  const signInWithEmailPassword = useCallback(
    async ({ email, password }: AuthActionInput) => {
      if (!isConvexConfigured) return { ok: false, error: configurationError ?? '' };
      try {
        await signIn('password', { email: email.trim(), password, flow: 'signIn' });
        return { ok: true } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [configurationError, signIn],
  );

  const signUpWithEmailPassword = useCallback(
    async ({ email, password }: AuthActionInput) => {
      if (!isConvexConfigured) return { ok: false, error: configurationError ?? '' };
      try {
        await signIn('password', { email: email.trim(), password, flow: 'signUp' });
        return { ok: true } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [configurationError, signIn],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!isConvexConfigured) return { ok: false, error: configurationError ?? '' };
      try {
        await signIn('password', { email: email.trim(), flow: 'reset' });
        return { ok: true, message: 'Password reset request sent.' } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [configurationError, signIn],
  );

  const signOut = useCallback(async () => {
    try {
      await convexSignOut();
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, [convexSignOut]);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'convex',
      state: { isLoading, session, error: configurationError },
      signInWithEmailPassword,
      signUpWithEmailPassword,
      requestPasswordReset,
      signOut,
    }),
    [
      configurationError,
      isLoading,
      requestPasswordReset,
      session,
      signInWithEmailPassword,
      signOut,
      signUpWithEmailPassword,
    ],
  );
}
