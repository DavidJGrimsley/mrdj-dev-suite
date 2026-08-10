import { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  BottomSheet,
  Button as ExpoUIButton,
  Checkbox as ExpoUICheckbox,
  Collapsible,
  Column,
  Host,
  Icon as ExpoUIIcon,
  Picker as ExpoUIPicker,
  Row,
  Slider as ExpoUISlider,
  Spacer,
  Switch as ExpoUISwitch,
  Text as ExpoUIText,
  TextInput as ExpoUITextInput,
  useNativeState,
} from '@expo/ui';

import { ExpositionNotice, PackageCard } from '../../components/exposition';
import { useAppTheme } from '../../theme/provider';

type TopicKind =
  | 'expo-ui'
  | 'universal'
  | 'native-state'
  | 'drop-in'
  | 'inline-modules'
  | 'native-tabs'
  | 'runtime'
  | 'widgets'
  | 'audio';

const highlights: {
  kind: TopicKind;
  title: string;
  packageName: string;
  body: string;
  links: { label: string; href: string }[];
}[] = [
  {
    kind: 'expo-ui',
    title: 'Expo UI is production-ready',
    packageName: '@expo/ui',
    body: 'This page uses Expo UI Universal components directly instead of describing them from the sidelines.',
    links: [
      {
        label: 'Expo UI docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/ui/',
      },
    ],
  },
  {
    kind: 'universal',
    title: 'Universal components',
    packageName: '@expo/ui',
    body: 'One component tree targets Android, iOS, and web. The lab below uses layout, display, controls, disclosure, lists, and forms.',
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
    packageName: '@expo/ui',
    body: 'The note field below stores text in an observable native state object, so native text controls can own their editing state.',
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
    body: 'The slider, picker, switch, checkbox, button, and text input are wired as drop-in starter controls for generated apps.',
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
    body: 'Use inline Swift/Kotlin modules for app-local native features that are too specific to publish as a package.',
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
    body: 'When Expo Native Tabs are enabled, the generated tabs shell uses NativeTabs instead of the JavaScript Tabs navigator.',
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
    body: 'SDK 56 aligns generated apps to React Native 0.85, React 19.2, Hermes V1, and faster precompiled native builds.',
    links: [],
  },
  {
    kind: 'widgets',
    title: 'Widgets',
    packageName: 'expo-widgets',
    body: 'Widgets are called out as a production candidate for lock-screen, home-screen, and glanceable companion surfaces.',
    links: [
      {
        label: 'Widgets docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/widgets/',
      },
    ],
  },
  {
    kind: 'audio',
    title: 'Audio and haptics updates',
    packageName: 'expo-audio + expo-haptics',
    body: 'Expo Audio is the forward-looking audio API, while haptics remain a good fit for tactile control feedback.',
    links: [
      {
        label: 'Expo Audio docs',
        href: 'https://docs.expo.dev/versions/latest/sdk/audio/',
      },
    ],
  },
];

function ExpoLogoSvg({ size }: { size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      accessibilityRole="image"
      accessibilityLabel="Expo logo"
    >
      <Path
        d="M9.477 7.638c.164-.24.343-.27.488-.27.145 0 .387.03.551.27 2.13 2.901 6.55 10.56 6.959 10.976.605.618 1.436.233 1.918-.468.475-.69.607-1.174.607-1.69 0-.352-6.883-13.05-7.576-14.106-.667-1.017-.884-1.274-2.025-1.274h-.854c-1.138 0-1.302.257-1.969 1.274C6.883 3.406 0 16.104 0 16.456c0 .517.132 1 .607 1.69.482.7 1.313 1.086 1.918.468.41-.417 4.822-8.075 6.952-10.977z"
        fill="#111827"
      />
    </Svg>
  );
}

function ExpoIconMark({ visible, size }: { visible: boolean; size: number }) {
  if (!visible) return null;
  if (Platform.OS === 'web') {
    return (
      <View style={styles.logoFrame}>
        <ExpoLogoSvg size={size} />
      </View>
    );
  }

  return (
    <ExpoUIIcon
      name={'app.fill' as any}
      size={size}
      color="#111827"
      accessibilityLabel="Expo app icon"
    />
  );
}

function UniversalComponentLab() {
  const [count, setCount] = useState(0);
  const [showIcon, setShowIcon] = useState(true);
  const [likesSuperStack, setLikesSuperStack] = useState(true);
  const [logoSize, setLogoSize] = useState(40);
  const [density, setDensity] = useState<'compact' | 'balanced' | 'spacious'>('balanced');
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isOpen, setOpen] = useState(true);
  const name = useNativeState('Ada Lovelace');

  return (
    <View style={styles.universalExampleBox}>
      <Host matchContents={{ vertical: true }} style={styles.universalHost}>
        <Column spacing={14}>
          <Row spacing={10} alignment="center">
            <ExpoIconMark visible={showIcon} size={logoSize} />
            <Column spacing={3}>
              <ExpoUIText textStyle={styles.universalHeading}>Universal component lab</ExpoUIText>
              <ExpoUIText
                textStyle={styles.universalBody}
              >{`Count: ${count} | Density: ${density}`}</ExpoUIText>
            </Column>
            <Spacer flexible />
            <ExpoUIText textStyle={styles.statusPill}>
              {likesSuperStack ? 'Approved' : 'Reviewing'}
            </ExpoUIText>
          </Row>

          <Collapsible
            label={isOpen ? 'Hide details' : 'Show details'}
            isOpen={isOpen}
            onOpenChange={setOpen}
          >
            <ExpoUIText textStyle={styles.universalBody}>
              Host, Column, Row, Collapsible, Button, Switch, Checkbox, Slider, Picker, TextInput,
              and BottomSheet are all live here in one universal tree.
            </ExpoUIText>
          </Collapsible>

          <Row spacing={10} alignment="center">
            <ExpoUIButton
              label={`Increment (${count})`}
              onPress={() => setCount((value) => value + 1)}
            />
            <ExpoUIButton
              variant="outlined"
              label="Open sheet"
              onPress={() => setSheetOpen(true)}
            />
          </Row>
          <ExpoUISwitch label="Show Expo icon/logo" value={showIcon} onValueChange={setShowIcon} />
          <ExpoUICheckbox
            label="I think Super Stack is great"
            value={likesSuperStack}
            onValueChange={setLikesSuperStack}
          />

          <Column spacing={6}>
            <ExpoUIText textStyle={styles.universalBody}>{`Logo size: ${logoSize}`}</ExpoUIText>
            <ExpoUISlider min={28} max={72} step={4} value={logoSize} onValueChange={setLogoSize} />
          </Column>
          <ExpoUIPicker selectedValue={density} onValueChange={setDensity}>
            <ExpoUIPicker.Item label="Compact" value="compact" />
            <ExpoUIPicker.Item label="Balanced" value="balanced" />
            <ExpoUIPicker.Item label="Spacious" value="spacious" />
          </ExpoUIPicker>
          <ExpoUITextInput
            value={name}
            placeholder="Display name"
            placeholderTextColor="#64748b"
            style={styles.textInput}
            textStyle={styles.textInputText}
          />
          <ExpoUIText textStyle={styles.universalBody}>{`Input value: ${name.value}`}</ExpoUIText>

          <BottomSheet
            isPresented={isSheetOpen}
            onDismiss={() => setSheetOpen(false)}
            snapPoints={[{ height: 320 }, 'half']}
          >
            <Column spacing={10}>
              <ExpoUIText textStyle={styles.universalHeading}>BottomSheet example</ExpoUIText>
              <ExpoUIText textStyle={styles.universalBody}>
                This sheet is rendered by Expo UI BottomSheet and opened by the universal Button.
              </ExpoUIText>
              <ExpoUIButton label="Close sheet" onPress={() => setSheetOpen(false)} />
            </Column>
          </BottomSheet>
        </Column>
      </Host>
    </View>
  );
}

function NativeStateExample() {
  const text = useNativeState('Ada Lovelace');
  return (
    <View style={styles.exampleBox}>
      <Host matchContents={{ vertical: true }} style={styles.universalHost}>
        <Column spacing={8}>
          <ExpoUIText textStyle={styles.universalHeading}>Native-owned text field</ExpoUIText>
          <ExpoUITextInput
            value={text}
            placeholder="Display name"
            placeholderTextColor="#64748b"
            style={styles.textInput}
            textStyle={styles.textInputText}
          />
          <ExpoUIText
            textStyle={styles.universalBody}
          >{`Current native state: ${text.value}`}</ExpoUIText>
        </Column>
      </Host>
    </View>
  );
}

function DropInExample() {
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(3);
  return (
    <View style={styles.exampleBox}>
      <Host matchContents={{ vertical: true }} style={styles.universalHost}>
        <Column spacing={12}>
          <ExpoUIText textStyle={styles.exampleTitle}>Drop-in controls wired together</ExpoUIText>
          <ExpoUISwitch label="Enabled" value={enabled} onValueChange={setEnabled} />
          <Column spacing={6}>
            <ExpoUIText textStyle={styles.exampleBody}>{`Selected intensity: ${level}`}</ExpoUIText>
            <ExpoUISlider
              min={1}
              max={5}
              step={1}
              value={level}
              onValueChange={setLevel}
              disabled={!enabled}
            />
          </Column>
        </Column>
      </Host>
    </View>
  );
}

function InlineModuleExample() {
  return (
    <View style={styles.exampleBox}>
      <Text style={styles.exampleTitle}>Inline module shape</Text>
      <Text style={styles.codeLine}>modules/LocalGreeting/index.ts</Text>
      <Text style={styles.codeLine}>modules/LocalGreeting/ios/LocalGreeting.swift</Text>
      <Text style={styles.codeLine}>modules/LocalGreeting/android/LocalGreeting.kt</Text>
    </View>
  );
}

function NativeTabsExample() {
  return (
    <View style={styles.exampleBox}>
      <Text style={styles.exampleTitle}>No fake tab preview here</Text>
      <Text style={styles.exampleBody}>
        In generated tabs apps, the actual tab bar uses expo-router NativeTabs when Expo Native Tabs
        are enabled. Keep mobile tab counts tight because Android native tabs are best with five or
        fewer destinations.
      </Text>
    </View>
  );
}

function RuntimeExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.componentLabelGrid}>
        <Text style={styles.componentLabel}>React Native 0.85</Text>
        <Text style={styles.componentLabel}>React 19.2</Text>
        <Text style={styles.componentLabel}>Hermes V1</Text>
        <Text style={styles.componentLabel}>Precompiled modules</Text>
      </View>
    </View>
  );
}

function WidgetsExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.widgetTile}>
        <Text style={styles.widgetTitle}>Today</Text>
        <Text style={styles.widgetBody}>3 generated-app checks ready</Text>
      </View>
    </View>
  );
}

function AudioExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.transportRow}>
        <Text style={styles.transportButton}>expo-audio player</Text>
        <Text style={styles.transportButton}>haptic confirmation</Text>
      </View>
      <Text style={styles.exampleBody}>
        Add expo-audio when the product needs real playback; keep haptics for important control
        transitions.
      </Text>
    </View>
  );
}

function TopicExample({ kind }: { kind: TopicKind }) {
  if (kind === 'universal') return <UniversalComponentLab />;
  if (kind === 'expo-ui') return null;
  if (kind === 'native-state') return <NativeStateExample />;
  if (kind === 'drop-in') return <DropInExample />;
  if (kind === 'inline-modules') return <InlineModuleExample />;
  if (kind === 'native-tabs') return <NativeTabsExample />;
  if (kind === 'runtime') return <RuntimeExample />;
  if (kind === 'widgets') return <WidgetsExample />;
  return <AudioExample />;
}

export default function ExpoSdk56Screen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <RNScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Text style={{ ...styles.title, color: colors.text }}>Expo SDK 56 Exposition</Text>
      <Text style={{ ...styles.intro, color: colors.text }}>
        Examples first: this page uses Expo UI Universal components where the SDK topic supports it,
        then explains exactly what each component is doing.
      </Text>
      <ExpositionNotice />
      {highlights.map((item) => (
        <PackageCard
          key={item.title}
          packageName={item.packageName}
          title={item.title}
          body={item.body}
        >
          <View style={styles.cardChildren}>
            <TopicExample kind={item.kind} />
            {item.links.length ? (
              <View style={styles.linkList}>
                {item.links.map((link) => (
                  <Text
                    key={link.href}
                    onPress={() => Linking.openURL(link.href)}
                    style={styles.link}
                  >
                    {link.label}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </PackageCard>
      ))}
      <View style={styles.linksCard}>
        <Text style={styles.linksTitle}>Video sources</Text>
        <Text
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=MKqGbv-Tssg&t')}
          style={styles.link}
        >
          {
            "What's New in Expo SDK 56: Expo UI, Inline Swift/Kotlin Modules, and Faster Builds by Expo"
          }
        </Text>
        <Text
          onPress={() => Linking.openURL('https://www.youtube.com/watch?v=ywvywq0AGPM')}
          style={styles.link}
        >
          Everything new in Expo SDK 56 by Code with Beto
        </Text>
      </View>
    </RNScrollView>
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
    paddingTop: Platform.OS === 'web' ? 84 : 20,
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
  cardChildren: {
    gap: 14,
    paddingTop: 8,
  },
  exampleBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 12,
    alignSelf: 'stretch',
  },
  universalExampleBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 12,
    alignSelf: 'stretch',
  },
  universalHost: {
    alignSelf: 'stretch',
    width: '100%',
  },
  universalHeading: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  universalBody: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  collapsibleHeaderScope: {
    alignSelf: 'stretch',
  },
  collapsibleTitle: {
    color: '#0f2a5f',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  collapsibleBody: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  exampleTitle: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '900',
  },
  exampleBody: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  logoFrame: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 14,
    borderWidth: 1,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  statusPill: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 16,
    minHeight: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlignVertical: 'center',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderColor: '#bfdbfe',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  textInputText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  listItemTitle: {
    color: '#0f2a5f',
    fontSize: 15,
    fontWeight: '900',
  },
  listItemBody: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  listBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    color: '#075985',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  listBadgeMuted: {
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  componentLabelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  componentLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '800',
    includeFontPadding: false,
    lineHeight: 18,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    textAlignVertical: 'center',
  },
  widgetTile: {
    backgroundColor: '#ffffff',
    borderColor: '#bfdbfe',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  widgetTitle: {
    color: '#111827',
    fontSize: 22,
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
    backgroundColor: '#ffffff',
    borderColor: '#bfdbfe',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1e3a8a',
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
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  linksTitle: {
    color: '#312e81',
    fontSize: 16,
    fontWeight: '900',
  },
  link: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
});
