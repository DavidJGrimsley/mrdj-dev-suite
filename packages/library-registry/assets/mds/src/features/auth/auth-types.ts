import type { ReactNode } from 'react';

export type AuthProviderId = 'base' | 'supabase' | 'firebase' | 'convex';

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  provider?: AuthProviderId | string | null;
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string | null;
}

export interface AuthAdapterState {
  isLoading: boolean;
  session: AuthSession | null;
  error?: string | null;
}

export interface AuthActionInput {
  email: string;
  password: string;
}

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export interface AuthAdapter {
  provider: AuthProviderId;
  state: AuthAdapterState;
  signInWithEmailPassword(input: AuthActionInput): Promise<AuthActionResult>;
  signUpWithEmailPassword(input: AuthActionInput): Promise<AuthActionResult>;
  requestPasswordReset(email: string): Promise<AuthActionResult>;
  signOut(): Promise<AuthActionResult>;
}

export interface AuthAdapterProviderProps {
  children: ReactNode;
}
