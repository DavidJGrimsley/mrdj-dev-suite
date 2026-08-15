import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';

import defaultThemeTokens, {
  type StylistColorPalette,
  type StylistColorScheme,
  type StylistThemeTokens,
} from './tokens';

export type AppThemeValue = StylistThemeTokens & {
  activeScheme: StylistColorScheme;
  activeColors: StylistColorPalette;
};

type AppThemeSchemePreference = StylistColorScheme | 'preview' | 'system';
export type AppThemeColorOverrides = Partial<
  Record<StylistColorScheme, Partial<StylistColorPalette>>
>;

export function readSystemScheme(): StylistColorScheme | null {
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' || scheme === 'dark' ? scheme : null;
}

const initialSystemScheme = readSystemScheme() ?? 'light';

const AppThemeContext = createContext<AppThemeValue>({
  ...defaultThemeTokens,
  activeScheme: initialSystemScheme,
  activeColors: defaultThemeTokens.colors[initialSystemScheme],
});
const AppThemeSetterContext = createContext<Dispatch<SetStateAction<StylistThemeTokens>> | null>(
  null
);

function resolveActiveScheme(
  theme: StylistThemeTokens,
  systemScheme: ReturnType<typeof useColorScheme>,
  preference: AppThemeSchemePreference,
): StylistColorScheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  if (preference === 'preview') {
    return theme.colorSystem.previewScheme;
  }
  if (systemScheme === 'light' || systemScheme === 'dark') {
    return systemScheme;
  }
  return readSystemScheme() ?? 'light';
}

export function AppThemeProvider({
  children,
  colors,
  scheme = 'system',
}: {
  children: ReactNode;
  colors?: AppThemeColorOverrides;
  scheme?: AppThemeSchemePreference;
}) {
  const [theme, setTheme] = useState<StylistThemeTokens>(defaultThemeTokens);
  const systemScheme = useColorScheme();
  const value = useMemo<AppThemeValue>(() => {
    const activeScheme = resolveActiveScheme(theme, systemScheme, scheme);
    const mergedColors = {
      light: { ...theme.colors.light, ...colors?.light },
      dark: { ...theme.colors.dark, ...colors?.dark },
    };

    return {
      ...theme,
      colors: mergedColors,
      activeScheme,
      activeColors: mergedColors[activeScheme],
    };
  }, [colors, scheme, systemScheme, theme]);

  return (
    <AppThemeSetterContext.Provider value={setTheme}>
      <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
    </AppThemeSetterContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}

export function useSetAppTheme() {
  const setTheme = useContext(AppThemeSetterContext);
  if (!setTheme) {
    throw new Error('useSetAppTheme must be used inside AppThemeProvider.');
  }
  return setTheme;
}
