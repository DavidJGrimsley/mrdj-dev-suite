import type { AuthAdapter } from '../auth/auth-types';

export interface SettingsLegalUrls {
  privacy?: string;
  terms?: string;
  gdpr?: string;
}

export interface SettingsVersionInfo {
  version: string;
  build?: string;
}

export interface SettingsLinkItem {
  id: string;
  label: string;
  href: string;
  description: string;
}

export interface SettingsConstantsShape {
  expoConfig?: {
    version?: string;
    ios?: { buildNumber?: string | null };
    android?: { versionCode?: number | null };
  } | null;
  nativeAppVersion?: string | null;
  nativeBuildVersion?: string | null;
}

export function resolveSettingsVersionInfo(
  source: SettingsConstantsShape
): SettingsVersionInfo {
  const version =
    source.expoConfig?.version ?? source.nativeAppVersion ?? 'Development build';
  const build =
    source.nativeBuildVersion ??
    source.expoConfig?.ios?.buildNumber ??
    (typeof source.expoConfig?.android?.versionCode === 'number'
      ? String(source.expoConfig.android.versionCode)
      : undefined);

  return { version, ...(build ? { build } : {}) };
}

export function buildSettingsLinkItems(
  legalUrls?: SettingsLegalUrls,
  profileHref?: string
): SettingsLinkItem[] {
  return [
    ...(profileHref
      ? [
          {
            id: 'profile',
            label: 'Manage profile',
            href: profileHref,
            description: 'Open the account or profile surface for this app.',
          },
        ]
      : []),
    ...(legalUrls?.terms
      ? [
          {
            id: 'terms',
            label: 'Terms of Service',
            href: legalUrls.terms,
            description: 'Review service usage, account, and policy terms.',
          },
        ]
      : []),
    ...(legalUrls?.privacy
      ? [
          {
            id: 'privacy',
            label: 'Privacy Policy',
            href: legalUrls.privacy,
            description: 'Review data processing, retention, and user choices.',
          },
        ]
      : []),
    ...(legalUrls?.gdpr
      ? [
          {
            id: 'gdpr',
            label: 'GDPR Notice',
            href: legalUrls.gdpr,
            description: 'Review data-subject rights, exports, and deletion requests.',
          },
        ]
      : []),
  ];
}

export function createPlaceholderAuthAdapter(
  provider: AuthAdapter['provider'] = 'base'
): AuthAdapter {
  return {
    provider,
    state: { isLoading: false, session: null },
    refreshSession: async () => {},
    signInWithEmailPassword: async () => ({
      ok: false,
      error: 'Install and wire the auth library before using sign-in from Settings.',
    }),
    signUpWithEmailPassword: async () => ({
      ok: false,
      error: 'Install and wire the auth library before using sign-up from Settings.',
    }),
    requestPasswordReset: async () => ({
      ok: false,
      error: 'Install and wire the auth library before using password reset from Settings.',
    }),
    signOut: async () => ({
      ok: true,
      message: 'No auth provider is configured for this generated Settings screen yet.',
    }),
  };
}

export async function performSettingsSignOut(auth: AuthAdapter) {
  return auth.signOut();
}
