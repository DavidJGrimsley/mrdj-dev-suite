import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';

import { firebaseAuth, getFirebaseAuth } from '../../services/firebase';

import type { AuthActionInput, AuthActionResult, AuthAdapter, AuthSession, AuthUser } from './auth-types';
import type { User } from 'firebase/auth';

function mapFirebaseUser(user: User): AuthUser {
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    provider: 'firebase',
    metadata: {
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
    },
  };
}

function mapFirebaseSession(user: User | null): AuthSession | null {
  if (!user) return null;
  return {
    user: mapFirebaseUser(user),
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
  const configurationError = firebaseAuth
    ? null
    : 'Set the EXPO_PUBLIC_FIREBASE_* variables before using Firebase auth.';
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(firebaseAuth));
  const [error, setError] = useState<string | null>(configurationError);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }
    return onAuthStateChanged(
      firebaseAuth,
      (user) => {
        setSession(mapFirebaseSession(user));
        setError(null);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, []);

  const signInWithEmailPassword = useCallback(async ({ email, password }: AuthActionInput) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const signUpWithEmailPassword = useCallback(async ({ email, password }: AuthActionInput) => {
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      return { ok: true, message: 'Password reset email sent.' } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(getFirebaseAuth());
      return { ok: true } satisfies AuthActionResult;
    } catch (error) {
      return authError(error);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    if (!firebaseAuth) {
      setError(configurationError);
      setSession(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      await firebaseAuth.currentUser?.reload();
      setSession(mapFirebaseSession(firebaseAuth.currentUser));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [configurationError]);

  return useMemo<AuthAdapter>(
    () => ({
      provider: 'firebase',
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
    ],
  );
}
