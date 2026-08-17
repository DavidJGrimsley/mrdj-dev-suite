import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getReadableTextColor } from '../../theme/color-utils';
import { useAppTheme } from '../../theme/provider';
import {
  buildSettingsLinkItems,
  createPlaceholderAuthAdapter,
  performSettingsSignOut,
  resolveSettingsVersionInfo as resolveSettingsVersionInfoFromConstants,
  type SettingsConstantsShape,
  type SettingsLegalUrls,
} from './settings-screen-logic';

import type { AuthAdapter } from '../auth/auth-types';

export interface SettingsScreenProps {
  auth: AuthAdapter;
  legalUrls?: SettingsLegalUrls;
  profileHref?: string;
}

export function resolveSettingsVersionInfo(
  source: SettingsConstantsShape = Constants as SettingsConstantsShape
){
  return resolveSettingsVersionInfoFromConstants(source);
}

async function openSettingsHref(href: string): Promise<void> {
  await Linking.openURL(href);
}

export default function SettingsScreen({
  auth,
  legalUrls,
  profileHref,
}: SettingsScreenProps) {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const user = auth.state.session?.user ?? null;
  const versionInfo = useMemo(() => resolveSettingsVersionInfo(), []);
  const links = useMemo(
    () => buildSettingsLinkItems(legalUrls, profileHref),
    [legalUrls, profileHref]
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dangerForeground = getReadableTextColor(colors.error, theme.colors.light.text);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    setNotice(null);
    const result = await performSettingsSignOut(auth);
    setIsSigningOut(false);
    setNotice(result.ok ? result.message ?? 'Signed out.' : result.error);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderRadius: theme.layout.radius,
          },
        ]}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: theme.typography.fontTitle,
              },
            ]}>
            Settings
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            Review account details, legal documents, and release information in one place.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
              borderRadius: theme.layout.radius,
            },
          ]}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Account</Text>
          <Text style={[styles.accountTitle, { color: colors.text }]}>
            {user?.name?.trim() || user?.email?.trim() || 'Signed-out preview'}
          </Text>
          <Text style={[styles.accountMeta, { color: colors.text }]}>
            {user?.email?.trim() || 'No authenticated session is active.'}
          </Text>
          <Text style={[styles.accountMeta, { color: colors.text }]}>
            Provider: {user?.provider || auth.provider}
          </Text>
        </View>

        {links.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Links</Text>
            <View style={styles.linkStack}>
              {links.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => void openSettingsHref(item.href)}
                  style={[
                    styles.linkCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.primary,
                      borderRadius: theme.layout.radius,
                    },
                  ]}>
                  <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.linkDescription, { color: colors.text }]}>
                    {item.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>App info</Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary,
                borderRadius: theme.layout.radius,
              },
            ]}>
            <Text style={[styles.accountTitle, { color: colors.text }]}>
              Version {versionInfo.version}
            </Text>
            {versionInfo.build ? (
              <Text style={[styles.accountMeta, { color: colors.text }]}>
                Build {versionInfo.build}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={!user || isSigningOut}
            onPress={() => void handleSignOut()}
            style={[
              styles.primaryButton,
              {
                backgroundColor: user ? colors.error : colors.surface,
                borderRadius: theme.layout.radius,
                opacity: !user || isSigningOut ? 0.7 : 1,
              },
            ]}>
            <Text
              style={[
                styles.primaryButtonText,
                { color: user ? dangerForeground : colors.text },
              ]}>
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>

        {notice ? <Text style={[styles.notice, { color: colors.text }]}>{notice}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    alignSelf: 'center',
    borderWidth: 1,
    gap: 18,
    maxWidth: 760,
    padding: 18,
    width: '100%',
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  accountMeta: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkStack: {
    gap: 10,
  },
  linkCard: {
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '900',
  },
  linkDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  notice: {
    fontSize: 13,
    lineHeight: 19,
  },
});
