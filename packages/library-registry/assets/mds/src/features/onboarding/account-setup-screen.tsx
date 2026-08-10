import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function AccountSetupScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Account setup</Text>
      <Text style={styles.body}>
        This is the production-ready handoff point after legal acceptance. Replace this with your
        real auth and profile onboarding flow.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/')}
        style={styles.homeButton}>
        <Text style={styles.homeButtonText}>Continue to home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#ffffff',
    flex: 1,
    gap: 12,
    padding: 20,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
  },
  body: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
  },
  homeButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
