import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AnimatedPressable,
  ExpositionNotice,
  GestureCard,
  KeyboardForm,
  PackageCard,
  ScreensCard,
  SoftwareMansionLogo,
} from '../../components/exposition';
import { useAppTheme } from '../../theme/provider';

export default function ExpositionScreen() {
  const theme = useAppTheme();
  const colors = theme.activeColors;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontFamily: theme.typography.fontFamily,
            fontWeight:
              theme.typography.fontFamily === 'System' ||
              theme.typography.fontFamily === 'monospace'
                ? '800'
                : 'normal',
          },
        ]}>
        Package Exposition
      </Text>
      <Text style={[styles.intro, { color: colors.text }]}>
        Browse the included Software Mansion packages, then keep only what your app needs.
      </Text>
      <ExpositionNotice />
      <PackageCard
        packageName="reanimated-color-picker"
        title="Stylist color editing"
        body="Stylist uses this package for the hue slider, color preview, and manual palette picker that writes theme tokens.">
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://github.com/alabsi91/reanimated-color-picker')}>
          Reanimated Color Picker
        </Text>
      </PackageCard>
      <PackageCard
        packageName="@react-native-async-storage/async-storage"
        title="Stylist local preferences"
        body="Stylist stores local-only preferences such as the Google Fonts API key, dismissed banners, and editor settings with Async Storage.">
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() =>
            Linking.openURL('https://react-native-async-storage.github.io/async-storage/')
          }>
          Async Storage Docs
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-safe-area-context"
        title="Stylist safe spacing"
        body="Stylist reads safe-area insets so editor controls stay clear of cutouts, native tabs, and device navigation areas.">
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() =>
            Linking.openURL('https://docs.expo.dev/versions/latest/sdk/safe-area-context/')
          }>
          Expo SDK - SafeAreaContext
        </Text>
      </PackageCard>
      <PackageCard
        packageName="tailwindcss/colors"
        title="Stylist palette families"
        body="Stylist uses Tailwind color families and shade scales to drive the palette-family mode and accessible token previews.">
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://tailwindcss.com/docs/customizing-colors')}>
          Tailwind CSS - Colors
        </Text>
      </PackageCard>
      <PackageCard
        packageName="expo-router API routes"
        title="Stylist sync endpoint"
        body="Stylist uses an Expo Router +api route so both native and web can sync theme output files by calling /exposition/stylist-sync.">
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://docs.expo.dev/router/web/api-routes/')}>
          Expo Router - API Routes
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-reanimated + react-native-worklets"
        title="Motion that feels native"
        body="Press the button to see the Reanimated timing demo. Worklets make this kind of UI-thread animation possible.">
        <AnimatedPressable label="Press and hold" />
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://docs.swmansion.com/react-native-reanimated')}>
          Software Mansion - Reanimated
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-gesture-handler"
        title="Gesture-first interactions"
        body="Drag the card below. If your product does not need touch-heavy interactions, this demo helps you decide what to remove.">
        <GestureCard title="Drag me" body="This card springs back when the gesture ends." />
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() =>
            Linking.openURL('https://docs.swmansion.com/react-native-gesture-handler')
          }>
          Software Mansion - Gesture Handler
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-screens"
        title="Native navigation primitives"
        body="Screens support the navigation layer with native lifecycle and memory behavior.">
        <ScreensCard />
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://docs.swmansion.com/react-native-screens')}>
          Software Mansion - Screens
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-svg"
        title="Portable vector UI"
        body="Use SVG for marks, badges, charts, and vector states that need to scale cleanly.">
        <View style={styles.svgDemo}>
          <SoftwareMansionLogo width={150} height={80} />
        </View>
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() => Linking.openURL('https://docs.expo.dev/versions/latest/sdk/svg')}>
          Expo SDK - SVG
        </Text>
      </PackageCard>
      <PackageCard
        packageName="react-native-keyboard-controller"
        title="Keyboard-heavy screens"
        body="Use this when forms, chat, notes, or auth flows need better keyboard control than manual offsets.">
        <KeyboardForm />
        <Text
          style={[styles.link, { color: colors.secondary }]}
          onPress={() =>
            Linking.openURL('https://kirillzyusko.github.io/react-native-keyboard-controller/')
          }>
          Kirill Zyusko - Keyboard Controller
        </Text>
      </PackageCard>
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
  },
  intro: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
  },
  link: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  svgDemo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
