import '../../global.css';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Platform, StatusBar } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { companionStore } from '../stores/companion-store';
import { layoutStore } from '../stores/layout-store';
import { tutorialStore } from '../stores/tutorial-store';
import themeFontAssets from '../theme/font-assets';
import { AppThemeProvider, useAppTheme } from '../theme/provider';

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

  useEffect(() => {
    void companionStore.getState().hydrate();
    void layoutStore.getState().hydrate();
    void tutorialStore.getState().hydrate();
  }, []);

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
                headerShown: false,
              }}>
              <Stack.Screen name="index" options={{ title: 'i² Companion' }} />
              <Stack.Screen name="vr" options={{ title: 'Quest Cockpit', headerShown: false }} />
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'modal',
                  title: 'Settings',
                  headerShown: Platform.OS !== 'web',
                }}
              />
              <Stack.Screen
                name="terms"
                options={{ title: 'Terms Of Service', headerShown: true }}
              />
              <Stack.Screen
                name="privacy"
                options={{ title: 'Privacy Policy', headerShown: true }}
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
      <LayoutInner />
    </AppThemeProvider>
  );
}
