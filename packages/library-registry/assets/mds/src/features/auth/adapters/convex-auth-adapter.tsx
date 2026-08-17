import { ConvexAuthProvider, useAuthActions, useConvexAuth } from '@convex-dev/auth/react';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { convexAuthStorage, getConvexClient, isConvexConfigured } from '../../services/convex';

import type { AuthActionInput, AuthActionResult, AuthAdapter, AuthSession } from './auth-types';

const configurationError =
  'Set EXPO_PUBLIC_CONVEX_URL and initialize Convex Auth before using this generated adapter.';

const ConvexAuthAdapterContext = createContext<AuthAdapter | null>(null);

function authError(error: unknown): AuthActionResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: message };
}

function useMissingConvexAuthAdapter(): AuthAdapter {
  const unavailable = useCallback(async () => {
    return { ok: false, error: configurationError } satisfies AuthActionResult;
  }, []);

  const refreshSession = useCallback(async () => {}, []);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'convex',
      state: { isLoading: false, session: null, error: configurationError },
      refreshSession,
      signInWithEmailPassword: unavailable,
      signUpWithEmailPassword: unavailable,
      requestPasswordReset: unavailable,
      signOut: unavailable,
    }),
    [refreshSession, unavailable],
  );
}

function MissingConvexAuthAdapterProvider({ children }: { children: ReactNode }) {
  const adapter = useMissingConvexAuthAdapter();
  return <ConvexAuthAdapterContext.Provider value={adapter}>{children}</ConvexAuthAdapterContext.Provider>;
}

function ConfiguredConvexAuthAdapterProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={getConvexClient()} storage={convexAuthStorage}>
      <ConfiguredConvexAuthAdapterState>{children}</ConfiguredConvexAuthAdapterState>
    </ConvexAuthProvider>
  );
}

function ConfiguredConvexAuthAdapterState({ children }: { children: ReactNode }) {
  const adapter = useConfiguredConvexAuthAdapter();
  return <ConvexAuthAdapterContext.Provider value={adapter}>{children}</ConvexAuthAdapterContext.Provider>;
}

export function AuthAdapterProvider({ children }: { children: ReactNode }) {
  if (!isConvexConfigured) {
    return <MissingConvexAuthAdapterProvider>{children}</MissingConvexAuthAdapterProvider>;
  }

  return <ConfiguredConvexAuthAdapterProvider>{children}</ConfiguredConvexAuthAdapterProvider>;
}

function useConfiguredConvexAuthAdapter(): AuthAdapter {
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

  const signInWithEmailPassword = useCallback(
    async ({ email, password }: AuthActionInput) => {
      try {
        await signIn('password', { email: email.trim(), password, flow: 'signIn' });
        return { ok: true } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [signIn],
  );

  const signUpWithEmailPassword = useCallback(
    async ({ email, password }: AuthActionInput) => {
      try {
        await signIn('password', { email: email.trim(), password, flow: 'signUp' });
        return { ok: true } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [signIn],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      try {
        await signIn('password', { email: email.trim(), flow: 'reset' });
        return { ok: true, message: 'Password reset request sent.' } satisfies AuthActionResult;
      } catch (error) {
        return authError(error);
      }
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    try {
      await convexSignOut();
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, [convexSignOut]);

  const refreshSession = useCallback(async () => {}, []);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'convex',
      state: { isLoading, session },
      refreshSession,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      requestPasswordReset,
      signOut,
    }),
    [
      isLoading,
      refreshSession,
      requestPasswordReset,
      session,
      signInWithEmailPassword,
      signOut,
      signUpWithEmailPassword,
    ],
  );
}

export function useAuthAdapter(): AuthAdapter {
  const adapter = useContext(ConvexAuthAdapterContext);
  if (!adapter) {
    throw new Error('useAuthAdapter must be used inside AuthAdapterProvider.');
  }
  return adapter;
}
