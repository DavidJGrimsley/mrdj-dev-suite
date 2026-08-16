import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Link, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform, Pressable, StatusBar, Text } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import themeFontAssets from '../theme/font-assets';
import { AppThemeProvider, useAppTheme } from '../theme/provider';
import { OnboardingPersistenceSync } from '../features/onboarding-state/onboarding-state-adapter';

function RouterThemeBridge({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const prefersDark = theme.activeScheme === 'dark';
  const base = prefersDark ? DarkTheme : DefaultTheme;
  const shellColor = theme.activeColors.background;
  const routerTheme = useMemo(
    () => ({
      ...base,
      colors: {
        ...base.colors,
        background: shellColor,
        border: theme.activeColors.surface,
        card: shellColor,
        notification: theme.activeColors.warning,
        primary: theme.activeColors.primary,
        text: theme.activeColors.text,
      },
    }),
    [base, shellColor, theme.activeColors]
  );

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync?.(shellColor);
  }, [shellColor]);

  return <ThemeProvider value={routerTheme}>{children}</ThemeProvider>;
}

function LayoutInner() {
  const theme = useAppTheme();
  const shellColor = theme.activeColors.background;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: shellColor }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <RouterThemeBridge>
            <StatusBar
              backgroundColor={shellColor}
              barStyle={theme.activeScheme === 'dark' ? 'light-content' : 'dark-content'}
              translucent={false}
            />
            {Platform.OS === 'android' ? (
              <NavigationBar style={theme.activeScheme === 'dark' ? 'dark' : 'light'} />
            ) : null}
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: shellColor },
                headerShown: Platform.OS !== 'web',
                headerRight: () => (
                  <Link href="/settings" asChild>
                    <Pressable
                      accessibilityRole="button"
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#111827',
                        borderRadius: 14,
                        height: 28,
                        justifyContent: 'center',
                        width: 28,
                      }}>
                      <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>i</Text>
                    </Pressable>
                  </Link>
                ),
              }}>
              <Stack.Screen name="onboarding" options={{ title: 'Onboarding' }} />
              <Stack.Screen name="onboarding/features" options={{ title: 'Features' }} />
              <Stack.Screen name="onboarding/complete" options={{ title: 'Complete' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="settings"
                options={{ presentation: 'modal', title: 'Settings' }}
              />
            </Stack>
          </RouterThemeBridge>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function Layout() {
  const hasFontAssets = Object.keys(themeFontAssets).length > 0;
  const [fontsLoaded, fontsError] = useFonts(themeFontAssets);

  if (hasFontAssets && !fontsLoaded && !fontsError) {
    return null;
  }

  return (
    <AppThemeProvider>
      <OnboardingPersistenceSync />
      <LayoutInner />
    </AppThemeProvider>
  );
}
