import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSupabaseClient, supabase } from '../../services/supabase';

import type {
  AuthActionInput,
  AuthActionResult,
  AuthAdapter,
  AuthSession,
  AuthUser,
} from './auth-types';
import type { Session, User } from '@supabase/supabase-js';

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
    provider: 'supabase',
    metadata: user.user_metadata,
  };
}

function mapSupabaseSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    user: mapSupabaseUser(session.user),
    accessToken: session.access_token,
  };
}

function authError(error: unknown): AuthActionResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: message };
}

export function AuthAdapterProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuthAdapter(): AuthAdapter {
  const configurationError = supabase
    ? null
    : 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using Supabase auth. EXPO_PUBLIC_SUPABASE_KEY and EXPO_PUBLIC_SUPABASE_ANON_KEY are accepted fallbacks.';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [error, setError] = useState<string | null>(configurationError);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      return;
    }

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      setError(sessionError?.message ?? null);
      setSession(mapSupabaseSession(data.session));
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(mapSupabaseSession(nextSession));
      setError(null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmailPassword = useCallback(async ({ email, password }: AuthActionInput) => {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const signUpWithEmailPassword = useCallback(async ({ email, password }: AuthActionInput) => {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return { ok: false, error: error.message };
      if (data.user && !data.session) {
        return {
          ok: true,
          message: 'Check your email to confirm this account, then sign in.',
        } satisfies AuthActionResult;
      }
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email.trim());
      if (error) return { ok: false, error: error.message };
      return { ok: true, message: 'Password reset email sent.' } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, error: error.message };
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setError(configurationError);
      setSession(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: sessionError } = await supabase.auth.getSession();
    setError(sessionError?.message ?? null);
    setSession(mapSupabaseSession(data.session));
    setIsLoading(false);
  }, [configurationError]);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'supabase',
      state: { isLoading, session, error },
      refreshSession,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      requestPasswordReset,
      signOut,
    }),
    [
      error,
      isLoading,
      refreshSession,
      requestPasswordReset,
      session,
      signInWithEmailPassword,
      signOut,
      signUpWithEmailPassword,
    ]
  );
}
