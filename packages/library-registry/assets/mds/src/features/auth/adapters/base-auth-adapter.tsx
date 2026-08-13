import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AuthActionInput, AuthActionResult, AuthAdapter, AuthSession } from './auth-types';

let activeSession: AuthSession | null = null;
const listeners = new Set<(session: AuthSession | null) => void>();

function emit(nextSession: AuthSession | null) {
  activeSession = nextSession;
  for (const listener of listeners) listener(nextSession);
}

function sessionFromEmail(email: string): AuthSession {
  return {
    user: {
      id: `base-${email.trim().toLowerCase()}`,
      email: email.trim(),
      provider: 'base',
    },
  };
}

export function AuthAdapterProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuthAdapter(): AuthAdapter {
  const [session, setSession] = useState<AuthSession | null>(activeSession);

  useEffect(() => {
    listeners.add(setSession);
    return () => {
      listeners.delete(setSession);
    };
  }, []);

  const signInWithEmailPassword = useCallback(async ({ email }: AuthActionInput) => {
    emit(sessionFromEmail(email));
    return { ok: true } satisfies AuthActionResult;
  }, []);

  const signUpWithEmailPassword = useCallback(async ({ email }: AuthActionInput) => {
    emit(sessionFromEmail(email));
    return { ok: true } satisfies AuthActionResult;
  }, []);

  const requestPasswordReset = useCallback(async () => {
    return {
      ok: true,
      message: 'Base auth has no backend. Wire this adapter to your provider before release.',
    } satisfies AuthActionResult;
  }, []);

  const signOut = useCallback(async () => {
    emit(null);
    return { ok: true } satisfies AuthActionResult;
  }, []);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'base',
      state: { isLoading: false, session },
      signInWithEmailPassword,
      signUpWithEmailPassword,
      requestPasswordReset,
      signOut,
    }),
    [requestPasswordReset, session, signInWithEmailPassword, signOut, signUpWithEmailPassword],
  );
}
