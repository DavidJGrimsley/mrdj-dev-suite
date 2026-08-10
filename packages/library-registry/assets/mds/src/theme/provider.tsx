import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import defaultThemeTokens, {
  type StylistColorPalette,
  type StylistColorScheme,
  type StylistThemeTokens,
} from './tokens';

export type AppThemeValue = StylistThemeTokens & {
  activeScheme: StylistColorScheme;
  activeColors: StylistColorPalette;
};

const AppThemeContext = createContext<AppThemeValue>({
  ...defaultThemeTokens,
  activeScheme: defaultThemeTokens.colorSystem.previewScheme,
  activeColors: defaultThemeTokens.colors[defaultThemeTokens.colorSystem.previewScheme],
});
const AppThemeSetterContext = createContext<Dispatch<SetStateAction<StylistThemeTokens>> | null>(
  null
);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<StylistThemeTokens>(defaultThemeTokens);
  const value = useMemo<AppThemeValue>(() => {
    const activeScheme = theme.colorSystem.previewScheme;
    return {
      ...theme,
      activeScheme,
      activeColors: theme.colors[activeScheme],
    };
  }, [theme]);

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
