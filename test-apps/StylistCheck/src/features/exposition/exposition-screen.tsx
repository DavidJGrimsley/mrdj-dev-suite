import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable, ExpositionNotice, GestureCard, KeyboardForm, PackageCard, ScreensCard, SvgMark } from '../../components/exposition';

export default function ExpositionScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.screen}>
      <Text style={styles.title}>StylistCheck Exposition</Text>
      <Text style={styles.intro}>Browse the included base packages, then delete what the app does not need.</Text>
      <ExpositionNotice />
      <PackageCard
        packageName="react-native-reanimated + react-native-worklets"
        title="Motion that feels native"
        body="Press the button to see the Reanimated timing demo. Worklets make this kind of UI-thread animation possible."
      >
        <AnimatedPressable label="Press and hold" />
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
        body="Screens support the navigation layer with native lifecycle and memory behavior."
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
});
