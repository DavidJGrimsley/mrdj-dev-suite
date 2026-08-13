import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { AuthAdapterProvider, useAuthAdapter } from './auth-adapter';

import type { AuthActionInput, AuthActionResult, AuthProviderId, AuthUser } from './auth-types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  provider: AuthProviderId;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  error?: string | null;
  signIn(input: AuthActionInput): Promise<AuthActionResult>;
  signUp(input: AuthActionInput): Promise<AuthActionResult>;
  requestPasswordReset(email: string): Promise<AuthActionResult>;
  signOut(): Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthStateProvider({ children }: { children: ReactNode }) {
  const adapter = useAuthAdapter();
  const { state } = adapter;
  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = Boolean(state.session?.user);
    return {
      provider: adapter.provider,
      status: state.isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'anonymous',
      isLoading: state.isLoading,
      isAuthenticated,
      user: state.session?.user ?? null,
      error: state.error,
      signIn: adapter.signInWithEmailPassword,
      signUp: adapter.signUpWithEmailPassword,
      requestPasswordReset: adapter.requestPasswordReset,
      signOut: adapter.signOut,
    };
  }, [adapter, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthAdapterProvider>
      <AuthStateProvider>{children}</AuthStateProvider>
    </AuthAdapterProvider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}
