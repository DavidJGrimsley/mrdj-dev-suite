import '../../global.css';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Onboarding' }} />
        <Stack.Screen name="exposition/index" options={{ title: 'Exposition' }} />
        <Stack.Screen name="exposition/stylist" options={{ title: 'Stylist' }} />
        <Stack.Screen name="exposition/data" options={{ title: 'Data' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', title: 'Settings' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
