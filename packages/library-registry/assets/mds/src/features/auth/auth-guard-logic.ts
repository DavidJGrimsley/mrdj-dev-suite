import type { AuthAdapterState } from './auth-types';

export type AuthGuardDecision = 'loading' | 'authorized' | 'fallback' | 'redirect';

export function resolveAuthGuardDecision(
  state: AuthAdapterState,
  options: { fallback?: unknown; fallbackHref?: string }
): AuthGuardDecision {
  if (state.isLoading) {
    return 'loading';
  }
  if (state.session?.user) {
    return 'authorized';
  }
  if (options.fallback !== undefined && options.fallback !== null) {
    return 'fallback';
  }
  return options.fallbackHref ? 'redirect' : 'fallback';
}
