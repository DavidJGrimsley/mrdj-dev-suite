import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpositionNotice, PackageCard } from '../../components/exposition';
import { useAppTheme } from '../../theme/provider';

const highlights = [
  {
    kind: 'expo-ui',
    title: 'Expo UI is production-ready',
    packageName: '@expo/ui',
    body: 'SwiftUI and Jetpack Compose APIs are stable in SDK 56 with deeper native parity.',
    links: [{ label: 'Expo UI docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/' }],
  },
  {
    kind: 'universal',
    title: 'Universal components',
    packageName: '@expo/ui',
    body: 'Host, Button, Switch, Text, layout primitives, lists, and controls can live in one source tree.',
    links: [
      {
        label: 'Universal components docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/ui/universal/',
      },
    ],
  },
  {
    kind: 'native-state',
    title: 'useNativeState',
    packageName: '@expo/ui/swift-ui',
    body: 'Native state can drive form controls and text entry without JS-thread controlled-input jitter.',
    links: [
      {
        label: 'useNativeState docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate/',
      },
    ],
  },
  {
    kind: 'drop-in',
    title: 'Drop-in replacements',
    packageName: '@expo/ui',
    body: 'Expo UI maps common community UI primitives to native-backed replacements.',
    links: [
      {
        label: 'Drop-in replacements docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/',
      },
    ],
  },
  {
    kind: 'inline-modules',
    title: 'Inline modules',
    packageName: 'expo-modules-core',
    body: 'Swift/Kotlin modules can be authored directly beside app code for project-local native features.',
    links: [
      {
        label: 'Inline modules tutorial',
        href: 'https://docs.expo.dev/modules/inline-modules-tutorial/',
      },
    ],
  },
  {
    kind: 'native-tabs',
    title: 'Router and native tabs',
    packageName: 'expo-router',
    body: 'Expo Router absorbs more of its stack internals and ships stronger native tabs support.',
    links: [
      {
        label: 'Native tabs docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/router/native-tabs/',
      },
    ],
  },
  {
    kind: 'runtime',
    title: 'Runtime baseline',
    packageName: 'react-native + react',
    body: 'SDK 56 aligns to React Native 0.85, React 19.2, Hermes V1 defaults, and faster builds.',
    links: [],
  },
  {
    kind: 'widgets',
    title: 'Widgets',
    packageName: 'expo-widgets',
    body: 'Expo widgets are stable, with strong iOS support for lock-screen and home-screen experiences.',
    links: [{ label: 'Widgets docs', href: 'https://docs.expo.dev/versions/latest/sdk/widgets/' }],
  },
  {
    kind: 'audio',
    title: 'Audio and haptics updates',
    packageName: 'expo-audio + expo-haptics',
    body: 'Audio streaming primitives improved and haptics coverage keeps expanding.',
    links: [{ label: 'Expo Audio docs', href: 'https://docs.expo.dev/versions/latest/sdk/audio/' }],
  },
];

function UniversalPreview() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  return (
    <View
      style={[styles.exampleBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
      <Text style={[styles.exampleTitle, { color: colors.text }]}>
        Universal components are not enabled.
      </Text>
      <Text style={[styles.exampleBody, { color: colors.text }]}>
        Turn on Expo UI Universal in onboarding to generate a Host, Column, Text, Button, and Switch
        demo here.
      </Text>
    </View>
  );
}

function TopicExample({ kind }: { kind: string }) {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  const boxStyle = [
    styles.exampleBox,
    { backgroundColor: colors.surface, borderColor: colors.primary },
  ];
  const titleStyle = [styles.exampleTitle, { color: colors.text }];
  const bodyStyle = [styles.exampleBody, { color: colors.text }];
  const pillStyle = [
    styles.examplePill,
    { backgroundColor: colors.background, borderColor: colors.primary, color: colors.text },
  ];
  const labelStyle = [
    styles.componentLabel,
    { backgroundColor: colors.primary, color: colors.background },
  ];
  if (kind === 'universal') return <UniversalPreview />;
  if (kind === 'expo-ui') {
    return (
      <View style={boxStyle}>
        <Text style={titleStyle}>Native controls from one React surface</Text>
        <View style={styles.exampleRow}>
          <Text style={pillStyle}>SwiftUI</Text>
          <Text style={bodyStyle}>iOS controls render with native behavior.</Text>
        </View>
        <View style={styles.exampleRow}>
          <Text style={pillStyle}>Compose</Text>
          <Text style={bodyStyle}>Android controls stay platform-native.</Text>
        </View>
      </View>
    );
  }
  if (kind === 'native-state') {
    return (
      <View style={boxStyle}>
        <Text style={titleStyle}>Text input owned by native state</Text>
        <View style={styles.fakeInput}>
          <Text style={styles.fakeInputText}>Display name</Text>
          <Text style={styles.fakeInputValue}>Ada Lovelace</Text>
        </View>
      </View>
    );
  }
  if (kind === 'drop-in') {
    return (
      <View style={boxStyle}>
        <Text style={titleStyle}>Replacement candidates</Text>
        <View style={styles.exampleRow}>
          <Text style={pillStyle}>Slider</Text>
          <Text style={bodyStyle}>Use the Expo UI version where native fidelity matters.</Text>
        </View>
        <View style={styles.exampleRow}>
          <Text style={pillStyle}>Picker</Text>
          <Text style={bodyStyle}>Swap community picker screens one at a time.</Text>
        </View>
      </View>
    );
  }
  if (kind === 'inline-modules') {
    return (
      <View style={boxStyle}>
        <Text style={titleStyle}>Project-local native module</Text>
        <Text style={styles.codeLine}>modules/LocalGreeting/index.ts</Text>
        <Text style={styles.codeLine}>modules/LocalGreeting/ios/LocalGreeting.swift</Text>
      </View>
    );
  }
  if (kind === 'native-tabs') {
    return (
      <View style={boxStyle}>
        <View style={styles.tabStrip}>
          <Text style={styles.tabActive}>Home</Text>
          <Text style={styles.tabItem}>Search</Text>
          <Text style={styles.tabItem}>Settings</Text>
        </View>
      </View>
    );
  }
  if (kind === 'runtime') {
    return (
      <View style={boxStyle}>
        <Text style={titleStyle}>Runtime versions to verify</Text>
        <View style={styles.componentLabelGrid}>
          <Text style={labelStyle}>RN 0.85</Text>
          <Text style={labelStyle}>React 19.2</Text>
          <Text style={labelStyle}>Hermes V1</Text>
        </View>
      </View>
    );
  }
  if (kind === 'widgets') {
    return (
      <View style={boxStyle}>
        <View
          style={[
            styles.widgetTile,
            { backgroundColor: colors.background, borderColor: colors.primary },
          ]}>
          <Text style={[styles.widgetTitle, { color: colors.text }]}>Today</Text>
          <Text style={[styles.widgetBody, { color: colors.text }]}>3 tasks ready</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={boxStyle}>
      <Text style={titleStyle}>Audio control surface</Text>
      <View style={styles.transportRow}>
        <Text
          style={[
            styles.transportButton,
            { backgroundColor: colors.background, borderColor: colors.primary, color: colors.text },
          ]}>
          Play
        </Text>
        <Text
          style={[
            styles.transportButton,
            { backgroundColor: colors.background, borderColor: colors.primary, color: colors.text },
          ]}>
          Pause
        </Text>
        <Text
          style={[
            styles.transportButton,
            { backgroundColor: colors.background, borderColor: colors.primary, color: colors.text },
          ]}>
          Haptic tap
        </Text>
      </View>
    </View>
  );
}

export default function ExpoSdk56Screen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Expo SDK 56 Exposition</Text>
      <Text style={[styles.intro, { color: colors.text }]}>
        Review the SDK 56 changes before deciding what belongs in the real app.
      </Text>
      <ExpositionNotice />
      {highlights.map((item) => (
        <PackageCard
          key={item.title}
          packageName={item.packageName}
          title={item.title}
          body={item.body}>
          <View style={styles.cardChildren}>
            <TopicExample kind={item.kind} />
            {item.links.length ? (
              <View style={styles.linkList}>
                {item.links.map((link) => (
                  <Text
                    key={link.href}
                    accessibilityRole="link"
                    onPress={() => Linking.openURL(link.href)}
                    style={[styles.link, { color: colors.secondary }]}>
                    {link.label}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </PackageCard>
      ))}
      <View
        style={[
          styles.linksCard,
          { backgroundColor: colors.surface, borderColor: colors.primary },
        ]}>
        <Text style={[styles.linksTitle, { color: colors.text }]}>Video sources</Text>
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=MKqGbv-Tssg&t')}
          style={[styles.link, { color: colors.secondary }]}>
          {
            "What's New in Expo SDK 56: Expo UI, Inline Swift/Kotlin Modules, and Faster Builds by Expo"
          }
        </Text>
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=ywvywq0AGPM')}
          style={[styles.link, { color: colors.secondary }]}>
          Everything new in Expo SDK 56 by Code with Beto
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 92 : 20,
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  intro: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
  },
  linksWrap: {
    gap: 8,
  },
  body: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  cardChildren: {
    gap: 12,
    marginTop: 4,
  },
  exampleBox: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  exampleBody: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  exampleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examplePill: {
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  componentLabelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  componentLabel: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  fakeInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    padding: 10,
  },
  fakeInputText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fakeInputValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  codeLine: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tabStrip: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  tabActive: {
    backgroundColor: '#111827',
    borderRadius: 7,
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    padding: 8,
    textAlign: 'center',
  },
  tabItem: {
    backgroundColor: '#f1f5f9',
    borderRadius: 7,
    color: '#334155',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    padding: 8,
    textAlign: 'center',
  },
  widgetTile: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  widgetTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  widgetBody: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  transportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transportButton: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkList: {
    gap: 8,
    paddingTop: 2,
  },
  linksCard: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  linksTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
});
