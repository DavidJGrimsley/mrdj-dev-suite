import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '../../components/exposition';

export default function OnboardingScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Start with intent</Text>
      <Text style={styles.body}>
        Replace this screen with the first real onboarding step once the product flow is settled.
      </Text>
      <Link href="/" asChild>
        <AnimatedPressable label="Continue to home" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: "800",
  },
  body: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 24,
  },
});
