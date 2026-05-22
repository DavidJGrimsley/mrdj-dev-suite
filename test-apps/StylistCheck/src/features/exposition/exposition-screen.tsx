import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable, GestureCard, KeyboardForm, PackageCard, ScreensCard, SvgMark } from '../../components/exposition';

export default function ExpositionScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>Software Mansion Exposition</Text>
      <Text style={styles.intro}>Browse the included base packages, then delete what the app does not need.</Text>
      <PackageCard
        packageName="react-native-reanimated + react-native-worklets"
        title="Motion that feels native"
        body="create-expo-stack includes Reanimated and Worklets by default. Reanimated powers smooth UI-thread animations and gesture-driven transitions. Worklets are small JS functions that run off the regular JS thread, which is why motion stays smooth under load. In this app, Reanimated is used directly by this press demo, the gesture card, and the stylist color picker."
      >
        <AnimatedPressable label="Press and hold" />
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Non-UI worklet use case</Text>
          <Text style={styles.infoBody}>
            Worklets can also run lightweight signal logic, not just animations. Example:
          </Text>
          <Text style={styles.infoCode}>
            {'const smooth = worklet((next, prev) => prev + (next - prev) * 0.2);'}
          </Text>
          <Text style={styles.infoBody}>
            That pattern can smooth sensor/noise values before they drive UI state.
          </Text>
        </View>
      </PackageCard>
      <PackageCard
        packageName="react-native-gesture-handler"
        title="Gesture-first interactions"
        body="Drag the card below. If your product does not need touch-heavy interactions, this demo helps you decide what to remove."
      >
        <GestureCard title="Drag me" body="This card springs back when the gesture ends." />
      </PackageCard>
      <PackageCard
        packageName="react-native-screens"
        title="Native navigation primitives"
        body="create-expo-stack Expo Router setups route through React Navigation internals that use react-native-screens. In this app that means your default navigation stack is already benefiting from native screen primitives."
      >
        <ScreensCard />
      </PackageCard>
      <PackageCard
        packageName="react-native-svg"
        title="Portable vector UI"
        body="Use SVG for marks, badges, charts, and vector states that need to scale cleanly."
      >
        <View style={styles.svgDemo}><SvgMark /></View>
      </PackageCard>
      <PackageCard
        packageName="react-native-keyboard-controller"
        title="Keyboard-heavy screens"
        body="Use this when forms, chat, notes, or auth flows need better keyboard control than manual offsets."
      >
        <KeyboardForm />
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
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: "900",
  },
  intro: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
  },
  svgDemo: {
    alignItems: "center",
    paddingVertical: 8,
  },
  infoCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginTop: 8,
    padding: 12,
  },
  infoTitle: {
    color: '#312e81',
    fontSize: 14,
    fontWeight: "800",
  },
  infoBody: {
    color: '#4338ca',
    fontSize: 13,
    lineHeight: 18,
  },
  infoCode: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    color: '#312e81',
    fontFamily: 'monospace',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
