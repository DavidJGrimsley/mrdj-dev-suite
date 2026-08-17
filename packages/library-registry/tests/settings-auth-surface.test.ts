import { describe, expect, it } from 'vitest';

import { resolveAuthGuardDecision } from '../assets/mds/src/features/auth/auth-guard-logic.ts';
import {
  buildSettingsLinkItems,
  createPlaceholderAuthAdapter,
  performSettingsSignOut,
  resolveSettingsVersionInfo,
} from '../assets/mds/src/features/settings/settings-screen-logic.ts';

describe('settings/auth surface helpers', () => {
  it('resolves auth guard states for loading, authorized, fallback, and redirect flows', () => {
    expect(
      resolveAuthGuardDecision({ isLoading: true, session: null }, { fallbackHref: '/sign-in' })
    ).toBe('loading');
    expect(
      resolveAuthGuardDecision(
        { isLoading: false, session: { user: { id: 'u1' } } },
        { fallbackHref: '/sign-in' }
      )
    ).toBe('authorized');
    expect(
      resolveAuthGuardDecision({ isLoading: false, session: null }, { fallback: 'login-screen' })
    ).toBe('fallback');
    expect(
      resolveAuthGuardDecision({ isLoading: false, session: null }, { fallbackHref: '/sign-in' })
    ).toBe('redirect');
  });

  it('builds settings links and signs out through the provided auth adapter', async () => {
    const links = buildSettingsLinkItems(
      {
        terms: 'app://terms',
        privacy: 'app://privacy',
        gdpr: 'https://example.com/gdpr',
      },
      'app://profile'
    );
    const providerResults = await Promise.all(
      (['base', 'supabase', 'firebase'] as const).map(async (provider) =>
        performSettingsSignOut({
          ...createPlaceholderAuthAdapter(provider),
          provider,
          signOut: async () => ({ ok: true as const, message: `${provider} signed out` }),
        })
      )
    );

    expect(providerResults).toEqual([
      { ok: true, message: 'base signed out' },
      { ok: true, message: 'supabase signed out' },
      { ok: true, message: 'firebase signed out' },
    ]);
    expect(links.map((item) => item.id)).toEqual(['profile', 'terms', 'privacy', 'gdpr']);
    expect(links.find((item) => item.id === 'gdpr')?.description).toContain('data-subject');
  });

  it('derives version/build details from Expo constants-like input', () => {
    expect(
      resolveSettingsVersionInfo({
        expoConfig: {
          version: '2.4.0',
          ios: { buildNumber: '56' },
        },
      })
    ).toEqual({ version: '2.4.0', build: '56' });

    expect(resolveSettingsVersionInfo({})).toEqual({ version: 'Development build' });
  });
});
