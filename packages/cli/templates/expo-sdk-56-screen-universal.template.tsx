import { useState } from 'react';
import { Linking, Platform, ScrollView as RNScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  BottomSheet,
  Button as ExpoUIButton,
  Checkbox as ExpoUICheckbox,
  Collapsible,
  Column,
  FieldGroup,
  Host,
  Icon as ExpoUIIcon,
  List,
  ListItem,
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

const highlights: Array<{
  kind: TopicKind;
  title: string;
  packageName: string;
  body: string;
  experimental?: boolean;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    kind: 'expo-ui',
    title: 'Expo UI is production-ready',
    packageName: '@expo/ui',
    body: 'This page uses Expo UI Universal components directly instead of describing them from the sidelines.',
    links: [{ label: 'Expo UI docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/' }],
  },
  {
    kind: 'universal',
    title: 'Universal components',
    packageName: '@expo/ui',
    body: 'One component tree targets Android, iOS, and web. The lab below uses layout, display, controls, disclosure, lists, and forms.',
    experimental: true,
    links: [{ label: 'Universal components docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/universal/' }],
  },
  {
    kind: 'native-state',
    title: 'useNativeState',
    packageName: '@expo/ui',
    body: 'The note field below stores text in an observable native state object, so native text controls can own their editing state.',
    links: [{ label: 'useNativeState docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/usenativestate/' }],
  },
  {
    kind: 'drop-in',
    title: 'Drop-in replacements',
    packageName: '@expo/ui',
    body: 'The slider, picker, switch, checkbox, button, and text input are wired as drop-in starter controls for generated apps.',
    links: [{ label: 'Drop-in replacements docs', href: 'https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/' }],
  },
  {
    kind: 'inline-modules',
    title: 'Inline modules',
    packageName: 'expo-modules-core',
    body: 'Use inline Swift/Kotlin modules for app-local native features that are too specific to publish as a package.',
    experimental: true,
    links: [{ label: 'Inline modules tutorial', href: 'https://docs.expo.dev/modules/inline-modules-tutorial/' }],
  },
  {
    kind: 'native-tabs',
    title: 'Router and native tabs',
    packageName: 'expo-router',
    body: 'When Expo Native Tabs are enabled, the generated tabs shell uses NativeTabs instead of the JavaScript Tabs navigator.',
    links: [{ label: 'Native tabs docs', href: 'https://docs.expo.dev/versions/latest/sdk/router/native-tabs/' }],
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
    links: [{ label: 'Widgets docs', href: 'https://docs.expo.dev/versions/latest/sdk/widgets/' }],
  },
  {
    kind: 'audio',
    title: 'Audio and haptics updates',
    packageName: 'expo-audio + expo-haptics',
    body: 'Expo Audio is the forward-looking audio API, while haptics remain a good fit for tactile control feedback.',
    links: [{ label: 'Expo Audio docs', href: 'https://docs.expo.dev/versions/latest/sdk/audio/' }],
  },
];

const componentNotes: Array<{ name: string; detail: string; href?: string }> = [
  { name: 'Host', detail: 'Wraps the universal subtree so native SwiftUI or Jetpack Compose can render the children.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/host/' },
  { name: 'Column', detail: 'Stacks the lab sections vertically with native layout spacing.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/column/' },
  { name: 'Row', detail: 'Places the Expo mark, count text, and status chips on one horizontal line.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/row/' },
  { name: 'Spacer', detail: 'Pushes trailing content across the Row without manual margin math.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/spacer/' },
  { name: 'ScrollView', detail: 'Supports native universal scroll containers; the old chip rail was removed so this lab stays readable.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/scrollview/' },
  { name: 'Text', detail: 'Renders the lab copy and live state values through the universal Text component.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/text/' },
  { name: 'Icon', detail: 'Mounts Expo UI Icon for native platforms; the Expo SVG path keeps the logo visible on web.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/icon/' },
  { name: 'Button', detail: 'Increments local React state with the label Increment (x).', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/button/' },
  { name: 'Switch', detail: 'Toggles whether the Expo icon/logo is visible.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/switch/' },
  { name: 'Checkbox', detail: 'Captures the generated-app sentiment: I think Super Stack is great.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/checkbox/' },
  { name: 'Slider', detail: 'Controls the logo size and demonstrates numeric native control state.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/slider/' },
  { name: 'TextInput', detail: 'Uses useNativeState so the native text field owns its editing value.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/textinput/' },
  { name: 'Picker', detail: 'Selects the density mode from Picker.Item children.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/picker/' },
  { name: 'BottomSheet', detail: 'Opens this component summary in a native/web bottom sheet.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/bottomsheet/' },
  { name: 'Collapsible', detail: 'Hides and reveals implementation notes with a native disclosure primitive.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/collapsible/' },
  { name: 'List', detail: 'Forms this component inventory as a native-style list.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/list/' },
  { name: 'ListItem', detail: 'Renders each component note as a tappable row with supporting text.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/list/' },
  { name: 'FieldGroup', detail: 'Builds a settings-style grouped form around the main controls.', href: 'https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/fieldgroup/' },
];

function ExpoLogoSvg({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" accessibilityRole="image" accessibilityLabel="Expo logo">
      <Path
        d="M9.477 7.638c.164-.24.343-.27.488-.27.145 0 .387.03.551.27 2.13 2.901 6.55 10.56 6.959 10.976.605.618 1.436.233 1.918-.468.475-.69.607-1.174.607-1.69 0-.352-6.883-13.05-7.576-14.106-.667-1.017-.884-1.274-2.025-1.274h-.854c-1.138 0-1.302.257-1.969 1.274C6.883 3.406 0 16.104 0 16.456c0 .517.132 1 .607 1.69.482.7 1.313 1.086 1.918.468.41-.417 4.822-8.075 6.952-10.977z"
        fill="#111827"
      />
    </Svg>
  );
}

function ExpoIconMark({ visible, size }: { visible: boolean; size: number }) {
  if (!visible) return null;
  return (
    <View style={styles.logoFrame}>
      {Platform.OS === 'web' ? (
        <ExpoLogoSvg size={size} />
      ) : (
        <ExpoUIIcon name={'app.fill' as any} size={size} color="#111827" accessibilityLabel="Expo app icon" />
      )}
    </View>
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
  const nativeNote = useNativeState('Expo UI Universal is running inside Super Stack.');

  return (
    <View style={styles.universalExampleBox}>
      <Host style={styles.universalHost}>
        <Column spacing={14}>
          <View style={styles.collapsibleHeaderScope}>
            <ExpoUIText textStyle={styles.collapsibleTitle}>How this Expo UI Universal Collapsible is wired</ExpoUIText>
            <Collapsible label={isOpen ? 'Hide details' : 'Show details'} isOpen={isOpen} onOpenChange={setOpen}>
              <ExpoUIText textStyle={styles.collapsibleBody}>
                This description is itself an Expo UI Universal Collapsible. The Switch hides the Expo mark, the Button increments React state, TextInput uses useNativeState, Picker changes density, Slider resizes the logo, and BottomSheet presents a summary.
              </ExpoUIText>
            </Collapsible>
          </View>

          <Row spacing={10} alignment="center">
            <ExpoIconMark visible={showIcon} size={logoSize} />
            <Column spacing={3}>
              <ExpoUIText textStyle={styles.universalHeading}>Universal component lab</ExpoUIText>
              <ExpoUIText textStyle={styles.universalBody}>{`Count: ${count} | Density: ${density}`}</ExpoUIText>
            </Column>
            <Spacer flexible />
            <ExpoUIText textStyle={styles.statusPill}>{likesSuperStack ? 'Approved' : 'Reviewing'}</ExpoUIText>
          </Row>

          <FieldGroup style={styles.fieldGroup}>
            <FieldGroup.Section title="Controls">
              <Row spacing={10} alignment="center">
                <ExpoUIButton label={`Increment (${count})`} onPress={() => setCount((value) => value + 1)} />
                <ExpoUIButton variant="outlined" label="Open sheet" onPress={() => setSheetOpen(true)} />
              </Row>
              <ExpoUISwitch label="Show Expo icon/logo" value={showIcon} onValueChange={setShowIcon} />
              <ExpoUICheckbox label="I think Super Stack is great" value={likesSuperStack} onValueChange={setLikesSuperStack} />
              <Column spacing={6}>
                <ExpoUIText textStyle={styles.universalBody}>{`Logo size: ${logoSize}`}</ExpoUIText>
                <ExpoUISlider min={28} max={72} step={4} value={logoSize} onValueChange={setLogoSize} />
              </Column>
              <ExpoUITextInput
                value={nativeNote}
                onChangeText={(text) => {
                  nativeNote.value = text;
                }}
                placeholder="Write a native-state note"
                placeholderTextColor="#64748b"
                style={styles.textInput}
                textStyle={styles.textInputText}
              />
              <ExpoUIPicker selectedValue={density} onValueChange={setDensity}>
                <ExpoUIPicker.Item label="Compact" value="compact" />
                <ExpoUIPicker.Item label="Balanced" value="balanced" />
                <ExpoUIPicker.Item label="Spacious" value="spacious" />
              </ExpoUIPicker>
            </FieldGroup.Section>
          </FieldGroup>

          <List>
            {componentNotes.map((item) => (
              <ListItem
                key={item.name}
                {...(item.href ? { onPress: () => Linking.openURL(item.href ?? '') } : {})}
                trailing={
                  <ExpoUIText textStyle={item.href ? styles.listBadge : styles.listBadgeMuted}>
                    {item.href ? 'docs' : 'disabled'}
                  </ExpoUIText>
                }>
                <ExpoUIText textStyle={styles.listItemTitle}>{item.name}</ExpoUIText>
                <ListItem.Supporting>
                  <ExpoUIText textStyle={styles.listItemBody}>{item.detail}</ExpoUIText>
                </ListItem.Supporting>
              </ListItem>
            ))}
          </List>
        </Column>
      </Host>

      <BottomSheet isPresented={isSheetOpen} onDismiss={() => setSheetOpen(false)} snapPoints={[{ height: 320 }, 'half']}>
        <Host matchContents>
          <Column spacing={10}>
            <ExpoUIText textStyle={styles.universalHeading}>BottomSheet example</ExpoUIText>
            <ExpoUIText textStyle={styles.universalBody}>
              This sheet is rendered by Expo UI BottomSheet and opened by the universal Button in the control section.
            </ExpoUIText>
            <ExpoUIButton label="Close sheet" onPress={() => setSheetOpen(false)} />
          </Column>
        </Host>
      </BottomSheet>
    </View>
  );
}

function NativeStateExample() {
  const text = useNativeState('Ada Lovelace');
  return (
    <View style={styles.exampleBox}>
      <Column spacing={8}>
        <ExpoUIText textStyle={styles.universalHeading}>Native-owned text field</ExpoUIText>
        <ExpoUITextInput
          value={text}
          onChangeText={(value) => {
            text.value = value;
          }}
          placeholder="Display name"
          placeholderTextColor="#64748b"
          style={styles.textInput}
          textStyle={styles.textInputText}
        />
        <ExpoUIText textStyle={styles.universalBody}>{`Current native state: ${text.value}`}</ExpoUIText>
      </Column>
    </View>
  );
}

function DropInExample() {
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(3);
  return (
    <View style={styles.exampleBox}>
      <Column spacing={10}>
        <ExpoUIText textStyle={styles.universalHeading}>Drop-in controls wired together</ExpoUIText>
        <ExpoUISwitch label="Enabled" value={enabled} onValueChange={setEnabled} />
        <ExpoUISlider min={1} max={5} step={1} value={level} onValueChange={setLevel} disabled={!enabled} />
        <ExpoUIText textStyle={styles.universalBody}>{`Selected intensity: ${level}`}</ExpoUIText>
      </Column>
    </View>
  );
}

function InlineModuleExample() {
  return (
    <View style={styles.exampleBox}>
      <ExpoUIText textStyle={styles.exampleTitle}>Inline module shape</ExpoUIText>
      <ExpoUIText textStyle={styles.codeLine}>modules/LocalGreeting/index.ts</ExpoUIText>
      <ExpoUIText textStyle={styles.codeLine}>modules/LocalGreeting/ios/LocalGreeting.swift</ExpoUIText>
      <ExpoUIText textStyle={styles.codeLine}>modules/LocalGreeting/android/LocalGreeting.kt</ExpoUIText>
    </View>
  );
}

function NativeTabsExample() {
  return (
    <View style={styles.exampleBox}>
      <ExpoUIText textStyle={styles.exampleTitle}>No fake tab preview here</ExpoUIText>
      <ExpoUIText textStyle={styles.exampleBody}>
        In generated tabs apps, the actual tab bar uses expo-router NativeTabs when Expo Native Tabs are enabled. Keep mobile tab counts tight because Android native tabs are best with five or fewer destinations.
      </ExpoUIText>
    </View>
  );
}

function RuntimeExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.componentLabelGrid}>
        <ExpoUIText textStyle={styles.componentLabel}>React Native 0.85</ExpoUIText>
        <ExpoUIText textStyle={styles.componentLabel}>React 19.2</ExpoUIText>
        <ExpoUIText textStyle={styles.componentLabel}>Hermes V1</ExpoUIText>
        <ExpoUIText textStyle={styles.componentLabel}>Precompiled modules</ExpoUIText>
      </View>
    </View>
  );
}

function WidgetsExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.widgetTile}>
        <ExpoUIText textStyle={styles.widgetTitle}>Today</ExpoUIText>
        <ExpoUIText textStyle={styles.widgetBody}>3 generated-app checks ready</ExpoUIText>
      </View>
    </View>
  );
}

function AudioExample() {
  return (
    <View style={styles.exampleBox}>
      <View style={styles.transportRow}>
        <ExpoUIText textStyle={styles.transportButton}>expo-audio player</ExpoUIText>
        <ExpoUIText textStyle={styles.transportButton}>haptic confirmation</ExpoUIText>
      </View>
      <ExpoUIText textStyle={styles.exampleBody}>
        Add expo-audio when the product needs real playback; keep haptics for important control transitions.
      </ExpoUIText>
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
    <RNScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ExpoUIText textStyle={{ ...styles.title, color: colors.text }}>Expo SDK 56 Exposition</ExpoUIText>
      <ExpoUIText textStyle={{ ...styles.intro, color: colors.text }}>Examples first: this page uses Expo UI Universal components where the SDK topic supports it, then explains exactly what each component is doing.</ExpoUIText>
      <ExpositionNotice />
      {highlights.map((item) => (
        <PackageCard key={item.title} packageName={item.packageName} title={item.title} body={item.body}>
          <View style={styles.cardChildren}>
            {item.experimental ? <ExpoUIText textStyle={styles.experimentalChip}>Experimental</ExpoUIText> : null}
            <TopicExample kind={item.kind} />
            {item.links.length ? (
              <View style={styles.linkList}>
                {item.links.map((link) => (
                  <ExpoUIText key={link.href} onPress={() => Linking.openURL(link.href)} textStyle={styles.link}>
                    {link.label}
                  </ExpoUIText>
                ))}
              </View>
            ) : null}
          </View>
        </PackageCard>
      ))}
      <View style={styles.linksCard}>
        <ExpoUIText textStyle={styles.linksTitle}>Video sources</ExpoUIText>
        <ExpoUIText onPress={() => Linking.openURL('https://www.youtube.com/watch?v=MKqGbv-Tssg&t')} textStyle={styles.link}>What's New in Expo SDK 56: Expo UI, Inline Swift/Kotlin Modules, and Faster Builds by Expo</ExpoUIText>
        <ExpoUIText onPress={() => Linking.openURL('https://www.youtube.com/watch?v=ywvywq0AGPM')} textStyle={styles.link}>Everything new in Expo SDK 56 by Code with Beto</ExpoUIText>
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
    width: '100%',
  },
  universalExampleBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 560,
    padding: 12,
    width: '100%',
  },
  universalHost: {
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
    width: '100%',
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
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fieldGroup: {
    borderRadius: 12,
    height: 540,
    overflow: 'hidden',
    width: '100%',
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
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
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
  experimentalChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: 'uppercase',
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
