import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';
import tailwindColors from 'tailwindcss/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable, ExpositionNotice } from '../../components/exposition';
import stylistThemeTokens, {
  type StylistColorMode,
  type StylistColorPalette,
  type StylistColorScheme,
  type StylistFamilyMode,
  type StylistSemanticFamilies,
  type StylistThemeTokens,
} from '../../theme/tokens';

type SemanticColorKey = keyof StylistSemanticFamilies;
type PaletteColorKey = keyof StylistColorPalette;
type TailwindShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type ColorInputMode = 'picker' | 'families';
type PaletteFamilies = Record<PaletteColorKey, TailwindColorFamily>;
type PaletteShades = Record<PaletteColorKey, TailwindShade>;

type TailwindColorFamily =
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

const paletteColorKeys: PaletteColorKey[] = [
  'background',
  'surface',
  'text',
  'primary',
  'secondary',
  'success',
  'warning',
];

const semanticColorKeys: SemanticColorKey[] = ['primary', 'secondary', 'success', 'warning'];
const spacingKeys: Array<keyof StylistThemeTokens['layout']['spacing']> = ['xs', 'sm', 'md', 'lg', 'xl'];
const schemeKeys: StylistColorScheme[] = ['light', 'dark'];
const familyModeOptions: Array<{ label: string; value: StylistFamilyMode }> = [
  { label: '1 family', value: 'one' },
  { label: '2 families', value: 'two' },
];
const colorModeOptions: Array<{ label: string; value: StylistColorMode }> = [
  { label: 'BG Color', value: 'bg' },
  { label: 'Automatic', value: 'automatic' },
];
const colorInputModeOptions: Array<{ label: string; value: ColorInputMode }> = [
  { label: 'Color Picker', value: 'picker' },
  { label: 'Tailwind Families', value: 'families' },
];
const NATIVE_SAVE_COMMAND = 'npm run mds:stylist:sync -- --input-file project/theme.json';

const tailwindFamilies: TailwindColorFamily[] = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];

const pickerSwatches = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#03a9f4',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#8bc34a',
  '#cddc39',
  '#ffeb3b',
  '#ffc107',
  '#ff9800',
  '#ff5722',
  '#795548',
  '#9e9e9e',
  '#607d8b',
];

const tailwindPalette = tailwindColors as Record<string, Partial<Record<TailwindShade, string>>>;
const automaticLockedKeys: PaletteColorKey[] = ['background', 'surface', 'text'];
const shadeOptions: TailwindShade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const defaultBgFamilies: Record<StylistColorScheme, PaletteFamilies> = {
  light: {
    background: 'slate',
    surface: 'gray',
    text: 'slate',
    primary: 'blue',
    secondary: 'violet',
    success: 'emerald',
    warning: 'amber',
  },
  dark: {
    background: 'slate',
    surface: 'gray',
    text: 'slate',
    primary: 'blue',
    secondary: 'violet',
    success: 'emerald',
    warning: 'amber',
  },
};

const defaultBgFamilyShades: Record<StylistColorScheme, PaletteShades> = {
  light: {
    background: 50,
    surface: 100,
    text: 900,
    primary: 500,
    secondary: 500,
    success: 500,
    warning: 500,
  },
  dark: {
    background: 950,
    surface: 900,
    text: 50,
    primary: 400,
    secondary: 400,
    success: 400,
    warning: 400,
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim();
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base: string, mix: string, amount: number): string {
  const a = hexToRgb(base);
  const b = hexToRgb(mix);
  return rgbToHex(
    a.r + (b.r - a.r) * amount,
    a.g + (b.g - a.g) * amount,
    a.b + (b.b - a.b) * amount
  );
}

function generateTailwindLikeScale(primaryHex: string): Record<TailwindShade, string> {
  const white = '#ffffff';
  const black = '#000000';

  return {
    50: mixHex(primaryHex, white, 0.95),
    100: mixHex(primaryHex, white, 0.88),
    200: mixHex(primaryHex, white, 0.74),
    300: mixHex(primaryHex, white, 0.58),
    400: mixHex(primaryHex, white, 0.32),
    500: primaryHex.toLowerCase(),
    600: mixHex(primaryHex, black, 0.16),
    700: mixHex(primaryHex, black, 0.32),
    800: mixHex(primaryHex, black, 0.5),
    900: mixHex(primaryHex, black, 0.68),
    950: mixHex(primaryHex, black, 0.8),
  };
}

function linearToSrgb(value: number): number {
  if (value <= 0.0031308) {
    return 12.92 * value;
  }

  return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toHexChannel(value: number): string {
  const channel = Math.round(clamp01(value) * 255);
  return channel.toString(16).padStart(2, '0');
}

function oklchToHex(l: number, c: number, hDeg: number): string {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCube = lPrime ** 3;
  const mCube = mPrime ** 3;
  const sCube = sPrime ** 3;

  const rLinear = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const gLinear = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const bLinear = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;

  const r = linearToSrgb(rLinear);
  const g = linearToSrgb(gLinear);
  const bOut = linearToSrgb(bLinear);

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(bOut)}`;
}

function parseOklch(color: string): { l: number; c: number; h: number } | null {
  const match = color
    .trim()
    .match(/^oklch\(\s*([0-9.]+)%\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*[0-9.%]+)?\s*\)$/i);

  if (!match) {
    return null;
  }

  const l = Number.parseFloat(match[1] ?? '');
  const c = Number.parseFloat(match[2] ?? '');
  const h = Number.parseFloat(match[3] ?? '');
  if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
    return null;
  }

  return { l: l / 100, c, h };
}

function getTailwindColor(family: string, shade: TailwindShade): string {
  const familyScale = tailwindPalette[family] ?? tailwindPalette.blue;
  const value = familyScale?.[shade] ?? tailwindPalette.blue?.[shade] ?? '#3b82f6';
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('#')) {
    return normalized;
  }
  if (normalized.startsWith('oklch(')) {
    const parsed = parseOklch(normalized);
    if (parsed) {
      return oklchToHex(parsed.l, parsed.c, parsed.h);
    }
  }

  return '#3b82f6';
}

function nudgeShadeTowardCenter(shade: TailwindShade): TailwindShade {
  const order: TailwindShade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const index = order.indexOf(shade);
  if (index <= 0) return 100;
  if (index >= order.length - 1) return 900;
  const next = shade < 500 ? index + 1 : index - 1;
  return order[next] ?? shade;
}

function deriveAutomaticPalette(families: StylistSemanticFamilies, scheme: StylistColorScheme): StylistColorPalette {
  const semanticShade: TailwindShade = scheme === 'light' ? 500 : 400;
  const backgroundShade: TailwindShade = scheme === 'light' ? 50 : 950;
  let surfaceShade: TailwindShade = scheme === 'light' ? 100 : 900;

  const background = getTailwindColor(families.primary, backgroundShade);
  let surface = getTailwindColor(families.primary, surfaceShade);

  if (background === surface) {
    surfaceShade = nudgeShadeTowardCenter(surfaceShade);
    surface = getTailwindColor(families.primary, surfaceShade);
  }

  return {
    background,
    surface,
    text: getTailwindColor(families.primary, scheme === 'light' ? 900 : 50),
    primary: getTailwindColor(families.primary, semanticShade),
    secondary: getTailwindColor(families.secondary, semanticShade),
    success: getTailwindColor(families.success, semanticShade),
    warning: getTailwindColor(families.warning, semanticShade),
  };
}

function deriveBgPaletteFromFamilies(
  families: PaletteFamilies,
  shades: PaletteShades
): StylistColorPalette {
  return {
    background: getTailwindColor(families.background, shades.background),
    surface: getTailwindColor(families.surface, shades.surface),
    text: getTailwindColor(families.text, shades.text),
    primary: getTailwindColor(families.primary, shades.primary),
    secondary: getTailwindColor(families.secondary, shades.secondary),
    success: getTailwindColor(families.success, shades.success),
    warning: getTailwindColor(families.warning, shades.warning),
  };
}

function deriveAutomaticPaletteFromPrimary(
  source: StylistColorPalette,
  scheme: StylistColorScheme
): StylistColorPalette {
  const shades = generateTailwindLikeScale(source.primary);

  return {
    ...source,
    background: shades[scheme === 'light' ? 50 : 950],
    surface: shades[scheme === 'light' ? 100 : 900],
    text: shades[scheme === 'light' ? 900 : 50],
  };
}

function ensureDistinctBackgroundSurface(
  palette: StylistColorPalette,
  scheme: StylistColorScheme
): StylistColorPalette {
  if (palette.background !== palette.surface) {
    return palette;
  }

  const fallbackSurface = scheme === 'light' ? '#e2e8f0' : '#18181b';
  const fallbackAlternate = scheme === 'light' ? '#f1f5f9' : '#27272a';

  return {
    ...palette,
    surface: palette.background === fallbackSurface ? fallbackAlternate : fallbackSurface,
  };
}

function reconcileTheme(
  theme: StylistThemeTokens,
  colorInputMode: ColorInputMode,
  bgFamilies: Record<StylistColorScheme, PaletteFamilies>,
  bgFamilyShades: Record<StylistColorScheme, PaletteShades>
): StylistThemeTokens {
  const familiesDark =
    theme.colorSystem.familyMode === 'one' ? { ...theme.families.light } : theme.families.dark;

  const bgLightSource =
    colorInputMode === 'families'
      ? deriveBgPaletteFromFamilies(bgFamilies.light, bgFamilyShades.light)
      : theme.palettes.bg.light;
  const bgDarkSource =
    colorInputMode === 'families'
      ? deriveBgPaletteFromFamilies(
          theme.colorSystem.familyMode === 'one' ? bgFamilies.light : bgFamilies.dark,
          theme.colorSystem.familyMode === 'one' ? bgFamilyShades.light : bgFamilyShades.dark
        )
      : theme.palettes.bg.dark;

  const bgLight = ensureDistinctBackgroundSurface(bgLightSource, 'light');
  const bgDark = ensureDistinctBackgroundSurface(bgDarkSource, 'dark');

  const automaticFamilyLight = deriveAutomaticPalette(theme.families.light, 'light');
  const automaticFamilyDark = deriveAutomaticPalette(familiesDark, 'dark');

  const automaticLightSource =
    colorInputMode === 'families'
      ? automaticFamilyLight
      : deriveAutomaticPaletteFromPrimary(theme.palettes.automatic.light, 'light');
  const automaticDarkSource =
    colorInputMode === 'families'
      ? automaticFamilyDark
      : deriveAutomaticPaletteFromPrimary(theme.palettes.automatic.dark, 'dark');

  const automaticLight = ensureDistinctBackgroundSurface(automaticLightSource, 'light');
  const automaticDark = ensureDistinctBackgroundSurface(automaticDarkSource, 'dark');

  const resolvedColors =
    theme.colorSystem.mode === 'automatic'
      ? { light: automaticLight, dark: automaticDark }
      : { light: bgLight, dark: bgDark };

  return {
    ...theme,
    families: {
      ...theme.families,
      dark: familiesDark,
    },
    palettes: {
      ...theme.palettes,
      bg: {
        light: bgLight,
        dark: bgDark,
      },
      automatic: {
        light: automaticLight,
        dark: automaticDark,
      },
    },
    colors: resolvedColors,
  };
}

function isLockedAutomaticPickerKey(
  mode: StylistColorMode,
  inputMode: ColorInputMode,
  key: PaletteColorKey
): boolean {
  return mode === 'automatic' && inputMode === 'picker' && automaticLockedKeys.includes(key);
}

export default function StylistScreen() {
  const insets = useSafeAreaInsets();
  const [colorInputMode, setColorInputMode] = useState<ColorInputMode>('picker');
  const [bgFamilies, setBgFamilies] = useState<Record<StylistColorScheme, PaletteFamilies>>(
    defaultBgFamilies
  );
  const [bgFamilyShades, setBgFamilyShades] = useState<Record<StylistColorScheme, PaletteShades>>(
    defaultBgFamilyShades
  );
  const [theme, setTheme] = useState<StylistThemeTokens>(
    reconcileTheme(stylistThemeTokens, 'picker', defaultBgFamilies, defaultBgFamilyShades)
  );
  const [selectedColor, setSelectedColor] = useState<PaletteColorKey>('primary');
  const [saveMessage, setSaveMessage] = useState('');
  const [nativeDraft, setNativeDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const activeScheme = theme.colorSystem.previewScheme;
  const previewColors = theme.colors[activeScheme];
  const editablePalette =
    theme.colorSystem.mode === 'automatic'
      ? theme.palettes.automatic[activeScheme]
      : theme.palettes.bg[activeScheme];
  const activeFamilyScheme: StylistColorScheme =
    theme.colorSystem.familyMode === 'one' ? 'light' : activeScheme;
  const activeFamilies = theme.families[activeFamilyScheme];
  const activeBgFamilies = bgFamilies[activeFamilyScheme];
  const activeBgFamilyShades = bgFamilyShades[activeFamilyScheme];

  const previewCard = useMemo(
    () => ({
      backgroundColor: previewColors.surface,
      borderColor: previewColors.primary,
      borderRadius: theme.layout.radius,
      borderWidth: 1,
      padding: theme.layout.spacing.md,
      gap: theme.layout.spacing.sm,
    }),
    [previewColors, theme.layout]
  );

  useEffect(() => {
    setTheme((prev) => reconcileTheme(prev, colorInputMode, bgFamilies, bgFamilyShades));
  }, [bgFamilies, bgFamilyShades, colorInputMode]);

  useEffect(() => {
    const lockedInAutomaticPicker = isLockedAutomaticPickerKey(
      theme.colorSystem.mode,
      colorInputMode,
      selectedColor
    );
    if (lockedInAutomaticPicker) {
      setSelectedColor('primary');
    }
  }, [colorInputMode, selectedColor, theme.colorSystem.mode]);

  function updateTheme(mutator: (prev: StylistThemeTokens) => StylistThemeTokens) {
    setTheme((prev) => reconcileTheme(mutator(prev), colorInputMode, bgFamilies, bgFamilyShades));
  }

  function updateNumeric(path: string, raw: string) {
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    updateTheme((prev) => {
      if (path === 'displaySize') {
        return { ...prev, typography: { ...prev.typography, displaySize: value } };
      }
      if (path === 'headingSize') {
        return { ...prev, typography: { ...prev.typography, headingSize: value } };
      }
      if (path === 'bodySize') {
        return { ...prev, typography: { ...prev.typography, bodySize: value } };
      }
      if (path === 'captionSize') {
        return { ...prev, typography: { ...prev.typography, captionSize: value } };
      }
      if (path === 'radius') {
        return { ...prev, layout: { ...prev.layout, radius: value } };
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          spacing: { ...prev.layout.spacing, [path]: value },
        },
      };
    });
  }

  function updateColorMode(mode: StylistColorMode) {
    updateTheme((prev) => ({
      ...prev,
      colorSystem: {
        ...prev.colorSystem,
        mode,
      },
    }));
  }

  function updatePreviewScheme(scheme: StylistColorScheme) {
    updateTheme((prev) => ({
      ...prev,
      colorSystem: {
        ...prev.colorSystem,
        previewScheme: scheme,
      },
    }));
  }

  function updateFamilyMode(mode: StylistFamilyMode) {
    setBgFamilies((prev) =>
      mode === 'one' ? { ...prev, dark: { ...prev.light } } : prev
    );
    setBgFamilyShades((prev) =>
      mode === 'one' ? { ...prev, dark: { ...prev.light } } : prev
    );
    updateTheme((prev) => ({
      ...prev,
      colorSystem: {
        ...prev.colorSystem,
        familyMode: mode,
      },
    }));
  }

  function updateFamily(key: SemanticColorKey, family: string) {
    updateTheme((prev) => {
      if (prev.colorSystem.familyMode === 'one') {
        const nextLight = { ...prev.families.light, [key]: family };
        return {
          ...prev,
          families: {
            light: nextLight,
            dark: { ...nextLight },
          },
        };
      }

      return {
        ...prev,
        families: {
          ...prev.families,
          [activeScheme]: {
            ...prev.families[activeScheme],
            [key]: family,
          },
        },
      };
    });
  }

  function updateBgFamily(key: PaletteColorKey, family: TailwindColorFamily) {
    setBgFamilies((prev) => {
      if (theme.colorSystem.familyMode === 'one') {
        const nextLight = { ...prev.light, [key]: family };
        return {
          light: nextLight,
          dark: { ...nextLight },
        };
      }

      return {
        ...prev,
        [activeScheme]: {
          ...prev[activeScheme],
          [key]: family,
        },
      };
    });
  }

  function updateBgShade(key: PaletteColorKey, shade: TailwindShade) {
    setBgFamilyShades((prev) => {
      if (theme.colorSystem.familyMode === 'one') {
        const nextLight = { ...prev.light, [key]: shade };
        return {
          light: nextLight,
          dark: { ...nextLight },
        };
      }

      return {
        ...prev,
        [activeScheme]: {
          ...prev[activeScheme],
          [key]: shade,
        },
      };
    });
  }

  function updateManualColor(key: PaletteColorKey, hex: string) {
    const targetPalette = theme.colorSystem.mode === 'automatic' ? 'automatic' : 'bg';
    updateTheme((prev) => ({
      ...prev,
      palettes: {
        ...prev.palettes,
        [targetPalette]: {
          ...prev.palettes[targetPalette],
          [activeScheme]: {
            ...prev.palettes[targetPalette][activeScheme],
            [key]: hex,
          },
        },
      },
    }));
  }

  function applyPickerColor(hex: string) {
    const targetKey = isLockedAutomaticPickerKey(
      theme.colorSystem.mode,
      colorInputMode,
      selectedColor
    )
      ? 'primary'
      : selectedColor;

    updateManualColor(targetKey, hex);
  }

  async function saveTheme() {
    setSaving(true);
    setSaveMessage('');
    try {
      if (Platform.OS === 'web') {
        const response = await fetch('/exposition/stylist-sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(theme),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Stylist sync failed.');
        }
        setSaveMessage(`Synced ${payload.updatedFiles?.length ?? 0} files from Stylist.`);
      } else {
        const draft = JSON.stringify(theme, null, 2);
        setNativeDraft(draft);
        setSaveMessage('Draft saved in Stylist. Run the sync command from your project root terminal.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown save error.';
      Alert.alert('Stylist save failed', message);
      setSaveMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 92, 120),
            paddingBottom: Math.max(insets.bottom + 40, 96),
          },
        ]}
        style={[styles.screen, { backgroundColor: previewColors.background }]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: previewColors.text }]}>{'StylistCheck Stylist'}</Text>
          <Pressable
            onPress={saveTheme}
            disabled={saving}
            style={[styles.saveButton, styles.saveButtonInline, { backgroundColor: previewColors.primary }]}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Theme'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.intro, { color: previewColors.text }]}>Adjust design tokens - don't forget to hit Save Theme so the changes will be applied to your app color theme files.</Text>
        <ExpositionNotice />

        <View style={previewCard}>
          <Text style={{ color: previewColors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.displaySize, fontWeight: '900' }}>Display headline</Text>
          <Text style={{ color: previewColors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.headingSize, fontWeight: '800' }}>Section heading</Text>
          <Text style={{ color: previewColors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.bodySize }}>Readable body copy for product screens, onboarding, settings, and forms.</Text>
          <Text style={{ color: previewColors.text, fontFamily: theme.typography.fontFamily, fontSize: theme.typography.captionSize, textTransform: 'uppercase' }}>Caption and metadata text</Text>
          <AnimatedPressable label="Call to Action" backgroundColor={previewColors.secondary} textColor={previewColors.text} />
        </View>

        <View style={[styles.section, { backgroundColor: previewColors.surface, borderRadius: theme.layout.radius }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: previewColors.text }]}>Colors</Text>
            <View style={styles.inlineToggle}>
              {colorInputModeOptions.map((option) => {
                const isSelected = colorInputMode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setColorInputMode(option.value)}
                    style={[styles.inlineToggleOption, isSelected && styles.inlineToggleOptionSelected]}
                  >
                    <Text
                      style={[
                        styles.inlineToggleLabel,
                        { color: isSelected ? '#f8fafc' : previewColors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={[styles.helperText, { color: previewColors.text }]}>
            {theme.colorSystem.mode === 'automatic'
              ? 'Automatic mode derives background, surface, and text from the primary color in real time.'
              : `BG mode lets you set palette colors directly for the active ${activeScheme} scheme.`}
          </Text>

          {theme.colorSystem.mode === 'automatic' && colorInputMode === 'picker' ? (
            <Text style={[styles.helperText, styles.lockedNote, { color: previewColors.text }]}>
              Background, surface, and text are disabled here because they are derived from the primary color.
            </Text>
          ) : null}

          <View style={styles.colorRow}>
            {paletteColorKeys.map((key) => {
              const locked =
                theme.colorSystem.mode === 'automatic' &&
                colorInputMode === 'picker' &&
                automaticLockedKeys.includes(key);
              const isSelected = selectedColor === key;

              return (
                <Pressable
                  key={key}
                  disabled={locked}
                  onPress={() => setSelectedColor(key)}
                  style={[
                    styles.colorChip,
                    {
                      backgroundColor: editablePalette[key],
                      borderColor: isSelected ? previewColors.text : '#9ca3af',
                      opacity: locked ? 0.45 : 1,
                    },
                  ]}
                >
                  <Text style={styles.colorChipLabel}>{key}</Text>
                </Pressable>
              );
            })}
          </View>

          {colorInputMode === 'picker' ? (
            <>
              <ColorPicker
                value={editablePalette[selectedColor]}
                onChangeJS={({ hex }: { hex: string }) => {
                  applyPickerColor(hex);
                }}
                onCompleteJS={({ hex }: { hex: string }) => {
                  applyPickerColor(hex);
                }}
                style={styles.picker}
              >
                <Preview hideInitialColor />
                <Panel1 />
                <HueSlider />
              </ColorPicker>
              <View style={styles.manualSwatchesRow}>
                {pickerSwatches.map((swatch) => (
                  <Pressable
                    key={swatch}
                    onPress={() => applyPickerColor(swatch)}
                    style={[
                      styles.manualSwatch,
                      { backgroundColor: swatch },
                      editablePalette[selectedColor].toLowerCase() === swatch
                        ? styles.manualSwatchSelected
                        : null,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
              <View style={styles.familyBlock}>
              {(theme.colorSystem.mode === 'automatic' ? semanticColorKeys : paletteColorKeys).map((key) => {
                const familyValue =
                  theme.colorSystem.mode === 'automatic'
                    ? activeFamilies[key as SemanticColorKey]
                    : activeBgFamilies[key as PaletteColorKey];
                const shadeValue =
                  theme.colorSystem.mode === 'automatic'
                    ? null
                    : activeBgFamilyShades[key as PaletteColorKey];

                return (
                  <View key={key} style={styles.familyRow}>
                    <Text style={[styles.familyTitle, { color: previewColors.text }]}>{`${key} family (${activeFamilyScheme})`}</Text>
                    <View style={styles.familyOptions}>
                      {tailwindFamilies.map((family) => (
                        <Pressable
                          key={`${key}-${family}`}
                          onPress={() => {
                            if (theme.colorSystem.mode === 'automatic') {
                              updateFamily(key as SemanticColorKey, family);
                            } else {
                              updateBgFamily(key as PaletteColorKey, family);
                            }
                          }}
                          style={[
                            styles.familyOption,
                            familyValue === family && {
                              backgroundColor: previewColors.primary,
                              borderColor: previewColors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.familyOptionText,
                              { color: familyValue === family ? '#f8fafc' : previewColors.text },
                            ]}
                          >
                            {family}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {theme.colorSystem.mode === 'bg' ? (
                      <View style={styles.shadeRow}>
                        {shadeOptions.map((shade) => {
                          const shadeColor = getTailwindColor(
                            familyValue,
                            shade
                          );
                          const isSelectedShade = shadeValue === shade;
                          return (
                            <Pressable
                              key={`${key}-${shade}`}
                              onPress={() => updateBgShade(key as PaletteColorKey, shade)}
                              style={[
                                styles.shadeDot,
                                {
                                  backgroundColor: shadeColor,
                                  borderColor: isSelectedShade ? previewColors.text : '#cbd5e1',
                                  borderWidth: isSelectedShade ? 3 : 1,
                                },
                              ]}
                              accessibilityLabel={`${key} shade ${shade}`}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: previewColors.surface, borderRadius: theme.layout.radius }]}>
          <Text style={[styles.sectionTitle, { color: previewColors.text }]}>Typography</Text>
          <Text style={[styles.helperText, styles.lockedNote, { color: previewColors.text }]}>
            Hit enter or click out of the text box to take effect.
          </Text>
          <TextInput
            value={theme.typography.fontFamily}
            onChangeText={(fontFamily) => updateTheme((prev) => ({ ...prev, typography: { ...prev.typography, fontFamily } }))}
            style={styles.input}
            placeholder="Font family"
          />
          <View style={styles.grid}>
            <NumberField grid label="Display" value={theme.typography.displaySize} onChange={(value) => updateNumeric('displaySize', value)} />
            <NumberField grid label="Heading" value={theme.typography.headingSize} onChange={(value) => updateNumeric('headingSize', value)} />
            <NumberField grid label="Body" value={theme.typography.bodySize} onChange={(value) => updateNumeric('bodySize', value)} />
            <NumberField grid label="Caption" value={theme.typography.captionSize} onChange={(value) => updateNumeric('captionSize', value)} />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: previewColors.surface, borderRadius: theme.layout.radius }]}>
          <Text style={[styles.sectionTitle, { color: previewColors.text }]}>Layout Tokens</Text>
          <Text style={[styles.helperText, styles.lockedNote, { color: previewColors.text }]}>
            Hit enter or click out of the text box to take effect.
          </Text>
          <NumberField label="Radius" value={theme.layout.radius} onChange={(value) => updateNumeric('radius', value)} />
          <View style={styles.grid}>
            {spacingKeys.map((key) => (
              <NumberField
                grid
                key={key}
                label={`Spacing ${key}`}
                value={theme.layout.spacing[key]}
                onChange={(value) => updateNumeric(key, value)}
              />
            ))}
          </View>
        </View>

        {saveMessage ? <Text style={[styles.saveMessage, { color: previewColors.text }]}>{saveMessage}</Text> : null}
        {Platform.OS !== 'web' ? (
          <View style={styles.nativeHelp}>
            <Text style={styles.nativeTitle}>Native fallback</Text>
            <Text style={styles.nativeBody}>Run this command in your app root terminal:</Text>
            <Text style={styles.command}>{NATIVE_SAVE_COMMAND}</Text>
            {nativeDraft ? <Text style={styles.payload}>{nativeDraft}</Text> : null}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.controls,
          {
            backgroundColor: previewColors.surface,
            borderColor: previewColors.primary,
            top: Math.max(insets.top + 8, 14),
          },
        ]}
      >
        <ToggleRow
          label="Color Mode"
          options={colorModeOptions}
          value={theme.colorSystem.mode}
          onChange={(value) => updateColorMode(value as StylistColorMode)}
        />
        <ToggleRow
          label="Preview"
          options={schemeKeys.map((scheme) => ({ label: scheme, value: scheme }))}
          value={theme.colorSystem.previewScheme}
          onChange={(value) => updatePreviewScheme(value as StylistColorScheme)}
        />
        <ToggleRow
          label="Family Strategy"
          options={familyModeOptions}
          value={theme.colorSystem.familyMode}
          onChange={(value) => updateFamilyMode(value as StylistFamilyMode)}
        />
      </View>
    </View>
  );
}

function ToggleRow(props: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{props.label}</Text>
      <View style={styles.toggleOptions}>
        {props.options.map((option) => {
          const isSelected = props.value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => props.onChange(option.value)}
              style={[styles.toggleOption, isSelected && styles.toggleOptionSelected]}
            >
              <Text style={[styles.toggleOptionText, isSelected && styles.toggleOptionTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumberField(props: { label: string; value: number; onChange: (value: string) => void; grid?: boolean }) {
  const [draft, setDraft] = useState(String(props.value));

  useEffect(() => {
    setDraft(String(props.value));
  }, [props.value]);

  return (
    <View style={[styles.field, props.grid ? styles.gridField : styles.fullField]}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          props.onChange(draft);
          const parsed = Number.parseFloat(draft);
          setDraft(Number.isFinite(parsed) ? String(parsed) : String(props.value));
        }}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
  },
  controls: {
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    left: 12,
    padding: 8,
    position: 'absolute',
    right: 12,
    zIndex: 30,
  },
  toggleRow: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 8,
  },
  toggleLabel: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  toggleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toggleOption: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleOptionSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  toggleOptionText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleOptionTextSelected: {
    color: '#f9fafb',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
    padding: 16,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  inlineToggle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  inlineToggleOption: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineToggleOptionSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  inlineToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  lockedNote: {
    fontSize: 12,
    opacity: 0.75,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    borderRadius: 999,
    borderWidth: 2,
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  colorChipLabel: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  picker: {
    gap: 12,
    width: '100%',
  },
  manualSwatchesRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  manualSwatch: {
    borderColor: '#d1d5db',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
    height: 32,
    width: 32,
  },
  manualSwatchSelected: {
    borderColor: '#111827',
    borderWidth: 3,
  },
  familyBlock: {
    gap: 12,
  },
  familyRow: {
    gap: 6,
  },
  shadeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shadeDot: {
    borderRadius: 999,
    height: 18,
    width: 18,
  },
  familyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  familyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  familyOption: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  familyOptionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    gap: 6,
  },
  fullField: {
    width: '100%',
  },
  gridField: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 220,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  saveButton: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonInline: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  saveMessage: {
    fontSize: 13,
  },
  nativeHelp: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  nativeTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  nativeBody: {
    color: '#374151',
    fontSize: 12,
  },
  command: {
    backgroundColor: '#111827',
    borderRadius: 8,
    color: '#f9fafb',
    fontFamily: 'monospace',
    fontSize: 12,
    padding: 10,
  },
  payload: {
    color: '#1f2937',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
