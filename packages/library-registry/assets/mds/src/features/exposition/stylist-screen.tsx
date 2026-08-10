import AsyncStorage from '@react-native-async-storage/async-storage';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';
import tailwindColors from 'tailwindcss/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '../../components/swmansion/animated-pressable';
import { EMBEDDED_GOOGLE_FONTS } from './embedded-fonts';
import defaultThemeTokens, {
  type StylistColorMode,
  type StylistColorPalette,
  type StylistColorScheme,
  type StylistFamilyMode,
  type StylistSemanticFamilies,
  type StylistThemeTokens,
} from '../../theme/tokens';
import { useSetAppTheme } from '../../theme/provider';

type SemanticColorKey = keyof StylistSemanticFamilies;
type PaletteColorKey = keyof StylistColorPalette;
type TailwindShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type ColorInputMode = 'picker' | 'families';
type WritePolicy = 'managed' | 'overwrite';
type SaveMessageTone = 'info' | 'success' | 'error';
type PaletteFamilies = Record<PaletteColorKey, TailwindColorFamily>;
type PaletteShades = Record<PaletteColorKey, TailwindShade>;
type LivePickerPreview = {
  colorInputMode: ColorInputMode;
  colorMode: StylistColorMode;
  hex: string;
  key: PaletteColorKey;
  scheme: StylistColorScheme;
};
type FontRoleKey =
  | 'fontDisplay'
  | 'fontTitle'
  | 'fontSubtitle'
  | 'fontBody'
  | 'fontCaption'
  | 'fontMono';
type StylistTypographyRoles = {
  fontDisplay: string;
  fontTitle: string;
  fontSubtitle: string;
  fontBody: string;
  fontCaption: string;
  fontMono: string;
};
type ExtendedStylistThemeTokens = Omit<StylistThemeTokens, 'typography'> & {
  typography: StylistThemeTokens['typography'] & StylistTypographyRoles;
};
type TopToggleHelpKey = 'colorMode' | 'preview' | 'familyStrategy';

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
const stylistThemeTokens = defaultThemeTokens;

const spacingKeys: (keyof StylistThemeTokens['layout']['spacing'])[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
];
const schemeKeys: StylistColorScheme[] = ['light', 'dark'];
const familyModeOptions: { label: string; value: StylistFamilyMode }[] = [
  { label: '1 family', value: 'one' },
  { label: '2 families', value: 'two' },
];
const colorModeOptions: { label: string; value: StylistColorMode }[] = [
  { label: 'BG Color', value: 'bg' },
  { label: 'Automatic', value: 'automatic' },
];
const colorInputModeOptions: { label: string; value: ColorInputMode }[] = [
  { label: 'Color Picker', value: 'picker' },
  { label: 'Tailwind Families', value: 'families' },
];
const NATIVE_SAVE_COMMAND = 'npm run stylist:sync:android';
const GOOGLE_FONTS_KEY_STORAGE = 'mds.stylist.googleFontsApiKey';
const GOOGLE_FONTS_BANNER_DISMISSED_STORAGE = 'mds.stylist.googleFontsBannerDismissed';
const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';
const WEB_LAST_SYNC_MESSAGE_STORAGE = 'mds.stylist.lastSyncMessage';
const WEB_SYSTEM_FONTS = new Set([
  'system',
  'arial',
  'helvetica',
  'times new roman',
  'georgia',
  'courier new',
  'monospace',
  'sans-serif',
  'serif',
  'ui-sans-serif',
]);
const NATIVE_SAFE_FONTS = new Set([
  'system',
  'arial',
  'helvetica',
  'times new roman',
  'georgia',
  'courier new',
  'monospace',
  'sans-serif',
  'serif',
  'notoserif',
  'noto sans',
]);
const fontRoleFields: {
  key: FontRoleKey;
  label: string;
  placeholder: string;
}[] = [
  { key: 'fontDisplay', label: 'Display', placeholder: 'Display font family' },
  { key: 'fontTitle', label: 'Title', placeholder: 'Title font family' },
  {
    key: 'fontSubtitle',
    label: 'Subtitle',
    placeholder: 'Subtitle font family',
  },
  { key: 'fontBody', label: 'Body', placeholder: 'Body font family' },
  { key: 'fontCaption', label: 'Caption', placeholder: 'Caption font family' },
  { key: 'fontMono', label: 'Mono', placeholder: 'Mono font family' },
];
const builtInFontChoices = [
  'System',
  'monospace',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'sans-serif',
  'serif',
];
const loadedWebFonts = new Set<string>();

type WebSyncMessageSnapshot = { message: string; timestamp: number };

function readWebSyncMessageSnapshot(): WebSyncMessageSnapshot | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  try {
    const raw = (globalThis as any).sessionStorage?.getItem(WEB_LAST_SYNC_MESSAGE_STORAGE);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<WebSyncMessageSnapshot>;
    if (!parsed.message || typeof parsed.message !== 'string') {
      return null;
    }
    if (typeof parsed.timestamp !== 'number') {
      return null;
    }
    return { message: parsed.message, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
}

function writeWebSyncMessageSnapshot(message: string) {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    (globalThis as any).sessionStorage?.setItem(
      WEB_LAST_SYNC_MESSAGE_STORAGE,
      JSON.stringify({ message, timestamp: Date.now() } satisfies WebSyncMessageSnapshot)
    );
  } catch {
    // no-op
  }
}

function clearWebSyncMessageSnapshot() {
  if (Platform.OS !== 'web') {
    return;
  }

  try {
    (globalThis as any).sessionStorage?.removeItem(WEB_LAST_SYNC_MESSAGE_STORAGE);
  } catch {
    // no-op
  }
}

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

const tailwindPalette = tailwindColors as unknown as Record<
  string,
  Partial<Record<TailwindShade, string>>
>;
const automaticLockedKeys: PaletteColorKey[] = ['background', 'surface', 'text'];
const shadeOptions: TailwindShade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const topToggleHelpCopy: Record<TopToggleHelpKey, { title: string; body: string }> = {
  colorMode: {
    title: 'Color Mode',
    body: 'Automatic derives background, surface, and text from primary. BG Color lets you set each palette color directly.',
  },
  preview: {
    title: 'Preview',
    body: 'Preview switches light/dark editing context. Saved tokens still include both schemes.',
  },
  familyStrategy: {
    title: 'Family Strategy',
    body: '1 family mirrors semantic color families across light and dark. 2 families lets each scheme use its own family mapping.',
  },
};

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

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureReadableTextColor(
  text: string,
  surface: string,
  scheme: StylistColorScheme
): string {
  if (contrastRatio(text, surface) >= 7) {
    return text;
  }

  const target = scheme === 'dark' ? '#ffffff' : '#000000';
  for (const amount of [0.25, 0.4, 0.55, 0.7, 0.85, 1]) {
    const candidate = mixHex(text, target, amount);
    if (contrastRatio(candidate, surface) >= 7) {
      return candidate;
    }
  }

  return target;
}

function getReadableChipTextColor(background: string): string {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111827', background)
    ? '#ffffff'
    : '#111827';
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

function deriveAutomaticPalette(
  families: StylistSemanticFamilies,
  scheme: StylistColorScheme,
  useSharedSemanticShades = false
): StylistColorPalette {
  const semanticShade: TailwindShade = useSharedSemanticShades
    ? 500
    : scheme === 'light'
      ? 500
      : 400;
  const backgroundShade: TailwindShade = scheme === 'light' ? 50 : 950;
  let surfaceShade: TailwindShade = scheme === 'light' ? 100 : 900;

  const background = getTailwindColor(families.primary, backgroundShade);
  let surface = getTailwindColor(families.primary, surfaceShade);

  if (background === surface) {
    surfaceShade = nudgeShadeTowardCenter(surfaceShade);
    surface = getTailwindColor(families.primary, surfaceShade);
  }

  const text = ensureReadableTextColor(
    getTailwindColor(families.primary, scheme === 'light' ? 900 : 200),
    surface,
    scheme
  );

  return {
    background,
    surface,
    text,
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
    text: ensureReadableTextColor(
      shades[scheme === 'light' ? 900 : 200],
      shades[scheme === 'light' ? 100 : 900],
      scheme
    ),
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

  const useSharedSemanticShades = theme.colorSystem.familyMode === 'one';
  const automaticFamilyLight = deriveAutomaticPalette(
    theme.families.light,
    'light',
    useSharedSemanticShades
  );
  const automaticFamilyDark = deriveAutomaticPalette(familiesDark, 'dark', useSharedSemanticShades);

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

function sanitizeHexDraftInput(raw: string): string {
  const hexOnly = raw
    .trim()
    .replace(/[^0-9a-fA-F]/g, '')
    .slice(0, 6)
    .toLowerCase();
  return `#${hexOnly}`;
}

function isCommitReadyHex(raw: string): boolean {
  const length = sanitizeHexDraftInput(raw).slice(1).length;
  return length === 3 || length === 6;
}

function isImmediateApplyHex(raw: string): boolean {
  return sanitizeHexDraftInput(raw).slice(1).length === 6;
}

function normalizeHexForTheme(raw: string): string {
  const sanitized = sanitizeHexDraftInput(raw);
  const hexBody = sanitized.slice(1);
  if (hexBody.length === 3) {
    return `#${hexBody
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }
  return sanitized;
}

function normalizeFontFamilyName(value: string): string {
  return value.replace(/^['"]|['"]$/g, '').trim();
}

function humanizeSaveError(rawMessage: string): string {
  const message = rawMessage.trim();
  if (!message) {
    return 'Theme save failed for an unknown reason.';
  }
  if (message.includes('spawn EINVAL')) {
    return 'Theme save could not start the sync command on this machine (spawn EINVAL). Check your local Node/npm shell setup, then retry.';
  }
  if (message.includes('Failed to parse stylist sync output')) {
    return 'Theme save finished with unreadable CLI output. Please rerun Save Theme and check terminal logs.';
  }
  return message;
}

function normalizeThemeTypography(theme: StylistThemeTokens): ExtendedStylistThemeTokens {
  const fallback = normalizeFontFamilyName(theme.typography.fontFamily) || 'System';

  return {
    ...theme,
    typography: {
      ...theme.typography,
      fontFamily: fallback,
      fontDisplay:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontDisplay ?? fallback
        ) || fallback,
      fontTitle:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontTitle ?? fallback
        ) || fallback,
      fontSubtitle:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontSubtitle ?? fallback
        ) || fallback,
      fontBody:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontBody ?? fallback
        ) || fallback,
      fontCaption:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontCaption ?? fallback
        ) || fallback,
      fontMono:
        normalizeFontFamilyName(
          (theme.typography as Partial<StylistTypographyRoles>).fontMono ?? 'monospace'
        ) || 'monospace',
    },
  };
}

function withFontFamilyAlias(theme: ExtendedStylistThemeTokens): ExtendedStylistThemeTokens {
  return {
    ...theme,
    typography: {
      ...theme.typography,
      fontFamily: normalizeFontFamilyName(theme.typography.fontDisplay) || 'System',
    },
  };
}

function areThemesEqual(
  left: ExtendedStylistThemeTokens,
  right: ExtendedStylistThemeTokens
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeFontCssFamily(fontFamily: string): string {
  const normalized = normalizeFontFamilyName(fontFamily);
  if (!normalized) {
    return 'System';
  }

  return normalized.includes(' ') ? `"${normalized}"` : normalized;
}

function makeNativeFontFamily(fontFamily: string): string {
  const normalized = normalizeFontFamilyName(fontFamily);
  return normalized || 'System';
}

function isNativeUnsafeFont(fontFamily: string): boolean {
  const key = normalizeFontFamilyName(fontFamily).toLowerCase();
  if (!key) {
    return false;
  }

  return !NATIVE_SAFE_FONTS.has(key);
}

function resolvePreviewFontFamily(fontFamily: string): string {
  return Platform.OS === 'web' ? makeFontCssFamily(fontFamily) : makeNativeFontFamily(fontFamily);
}

function resolvePreviewFontWeight(
  fontFamily: string,
  weight: NonNullable<TextStyle['fontWeight']>
): NonNullable<TextStyle['fontWeight']> {
  if (Platform.OS === 'web') {
    return weight;
  }

  // Many Google Fonts are single-weight on native until the sync downloads assets, so avoid
  // requesting unsupported weights that can cause the font to fall back.
  return isNativeUnsafeFont(fontFamily) ? 'normal' : weight;
}

function buildGoogleFontsStylesheetUrl(fontFamily: string): string {
  const familyParam = normalizeFontFamilyName(fontFamily).replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;500;700;800&display=swap`;
}

function ensureWebFontLoaded(fontFamily: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const normalized = normalizeFontFamilyName(fontFamily);
  if (!normalized) {
    return;
  }

  if (WEB_SYSTEM_FONTS.has(normalized.toLowerCase()) || loadedWebFonts.has(normalized)) {
    return;
  }

  const existing = document.querySelector(`link[data-stylist-font="${normalized}"]`);
  if (existing) {
    loadedWebFonts.add(normalized);
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildGoogleFontsStylesheetUrl(normalized);
  link.setAttribute('data-stylist-font', normalized);
  document.head.appendChild(link);
  loadedWebFonts.add(normalized);
}

export default function StylistScreen() {
  const insets = useSafeAreaInsets();
  const setAppTheme = useSetAppTheme();
  const [colorInputMode, setColorInputMode] = useState<ColorInputMode>('picker');
  const [bgFamilies, setBgFamilies] =
    useState<Record<StylistColorScheme, PaletteFamilies>>(defaultBgFamilies);
  const [bgFamilyShades, setBgFamilyShades] =
    useState<Record<StylistColorScheme, PaletteShades>>(defaultBgFamilyShades);
  const [theme, setTheme] = useState<ExtendedStylistThemeTokens>(
    withFontFamilyAlias(
      normalizeThemeTypography(
        reconcileTheme(stylistThemeTokens, 'picker', defaultBgFamilies, defaultBgFamilyShades)
      )
    )
  );
  const [selectedColor, setSelectedColor] = useState<PaletteColorKey>('primary');
  const [pickerHexDraft, setPickerHexDraft] = useState('#');
  const [livePickerPreview, setLivePickerPreview] = useState<LivePickerPreview | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageTone, setSaveMessageTone] = useState<SaveMessageTone>('info');
  const [nativeDraft, setNativeDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessageNonce, setSaveMessageNonce] = useState(0);
  const [writePolicy, setWritePolicy] = useState<WritePolicy | null>(null);
  const [showWritePolicyModal, setShowWritePolicyModal] = useState(false);
  const [activeTopToggleHelp, setActiveTopToggleHelp] = useState<TopToggleHelpKey | null>(null);
  const [writePolicyLoaded, setWritePolicyLoaded] = useState(Platform.OS !== 'web');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [storedApiKey, setStoredApiKey] = useState('');
  const [fontBannerDismissed, setFontBannerDismissed] = useState(false);
  const [remoteFonts, setRemoteFonts] = useState<string[]>([]);
  const [loadingFonts, setLoadingFonts] = useState(false);
  const [fontFetchError, setFontFetchError] = useState('');
  const [fontRefreshIndex, setFontRefreshIndex] = useState(0);
  const saveStatusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMessageKind = useRef<'none' | 'load' | 'sync' | 'status'>('none');
  const [explicitFontRoles, setExplicitFontRoles] = useState<Record<FontRoleKey, boolean>>({
    fontDisplay: true,
    fontTitle: true,
    fontSubtitle: true,
    fontBody: true,
    fontCaption: true,
    fontMono: true,
  });
  const saveButtonScale = useMemo(() => new Animated.Value(1), []);
  const saveBannerOpacity = useMemo(() => new Animated.Value(1), []);

  function pulseSaveButton() {
    saveButtonScale.stopAnimation();
    Animated.sequence([
      Animated.timing(saveButtonScale, {
        toValue: 0.96,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(saveButtonScale, {
        toValue: 1,
        speed: 16,
        bounciness: 6,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }

  function publishSaveMessage(tone: SaveMessageTone, message: string) {
    if (saveStatusTimeout.current) {
      clearTimeout(saveStatusTimeout.current);
      saveStatusTimeout.current = null;
    }
    const stamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    setSaveMessageTone(tone);
    setSaveMessage(`${message} (${stamp})`);
    setSaveMessageNonce((value) => value + 1);
    saveBannerOpacity.stopAnimation();
    saveBannerOpacity.setValue(0.2);
    Animated.timing(saveBannerOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  const publishEffectMessage = useEffectEvent((tone: SaveMessageTone, message: string) => {
    publishSaveMessage(tone, message);
  });

  function publishSyncMessage(message: string) {
    saveMessageKind.current = 'sync';
    publishSaveMessage('success', message);
    writeWebSyncMessageSnapshot(message);
    saveStatusTimeout.current = setTimeout(() => {
      saveMessageKind.current = 'status';
      clearWebSyncMessageSnapshot();
      publishSaveMessage('info', 'Current theme files and preview are in sync.');
    }, 3000);
  }

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const restored = readWebSyncMessageSnapshot();
    if (restored) {
      saveMessageKind.current = 'sync';
      publishEffectMessage('success', restored.message);
      const elapsed = Date.now() - restored.timestamp;
      const remaining = Math.max(0, 3000 - elapsed);
      saveStatusTimeout.current = setTimeout(() => {
        saveMessageKind.current = 'status';
        clearWebSyncMessageSnapshot();
        publishEffectMessage('info', 'Current theme files and preview are in sync.');
      }, remaining);
    }

    let cancelled = false;
    async function hydrateWritePolicy() {
      try {
        const response = await fetch('/exposition/stylist-sync');
        if (!response.ok) {
          if (!cancelled) {
            setWritePolicyLoaded(true);
          }
          return;
        }
        const payload = (await response.json()) as {
          hasConfig?: boolean;
          writePolicy?: WritePolicy;
          theme?: StylistThemeTokens;
          mismatchDetected?: boolean;
          themeSource?: 'theme.json' | 'style.md' | 'default';
        };
        if (cancelled) {
          return;
        }
        if (payload.theme) {
          const nextTheme = withFontFamilyAlias(
            normalizeThemeTypography(
              reconcileTheme(payload.theme, 'picker', defaultBgFamilies, defaultBgFamilyShades)
            )
          );
          setTheme((prev) => (areThemesEqual(prev, nextTheme) ? prev : nextTheme));
          setAppTheme(nextTheme);
          setExplicitFontRoles({
            fontDisplay: true,
            fontTitle: true,
            fontSubtitle: true,
            fontBody: true,
            fontCaption: true,
            fontMono: true,
          });
        }
        if (payload.hasConfig && payload.writePolicy) {
          setWritePolicy(payload.writePolicy);
        }
        if (payload.themeSource === 'style.md' && payload.mismatchDetected) {
          if (saveMessageKind.current === 'none') {
            saveMessageKind.current = 'load';
            setSaveMessageTone('info');
            setSaveMessage(
              'Detected mismatch between project/style.md managed block and project/theme.json. Loaded project/style.md by startup priority.'
            );
          }
        } else if (payload.themeSource === 'style.md') {
          if (saveMessageKind.current === 'none') {
            saveMessageKind.current = 'load';
            setSaveMessageTone('info');
            setSaveMessage('Loaded theme from project/style.md managed block.');
          }
        }
      } finally {
        if (!cancelled) {
          setWritePolicyLoaded(true);
        }
      }
    }

    void hydrateWritePolicy();
    return () => {
      cancelled = true;
    };
  }, [setAppTheme]);

  const activeScheme = theme.colorSystem.previewScheme;
  const basePreviewColors = theme.colors[activeScheme];
  const baseEditablePalette =
    theme.colorSystem.mode === 'automatic'
      ? theme.palettes.automatic[activeScheme]
      : theme.palettes.bg[activeScheme];
  const livePickerMatchesActiveView =
    livePickerPreview?.scheme === activeScheme &&
    livePickerPreview.colorMode === theme.colorSystem.mode &&
    livePickerPreview.colorInputMode === colorInputMode;
  const previewColors = useMemo(() => {
    if (!livePickerPreview || !livePickerMatchesActiveView) {
      return basePreviewColors;
    }

    if (theme.colorSystem.mode === 'automatic') {
      return ensureDistinctBackgroundSurface(
        deriveAutomaticPaletteFromPrimary(
          {
            ...theme.palettes.automatic[activeScheme],
            [livePickerPreview.key]: livePickerPreview.hex,
          },
          activeScheme
        ),
        activeScheme
      );
    }

    return ensureDistinctBackgroundSurface(
      {
        ...theme.palettes.bg[activeScheme],
        [livePickerPreview.key]: livePickerPreview.hex,
      },
      activeScheme
    );
  }, [
    activeScheme,
    basePreviewColors,
    livePickerMatchesActiveView,
    livePickerPreview,
    theme.colorSystem.mode,
    theme.palettes.automatic,
    theme.palettes.bg,
  ]);
  const controlTextColor = ensureReadableTextColor(
    previewColors.text,
    previewColors.surface,
    activeScheme
  );
  const editablePalette = useMemo(() => {
    if (!livePickerPreview || !livePickerMatchesActiveView) {
      return baseEditablePalette;
    }

    return {
      ...baseEditablePalette,
      [livePickerPreview.key]: livePickerPreview.hex,
    };
  }, [baseEditablePalette, livePickerMatchesActiveView, livePickerPreview]);
  const pickerTargetKey = getPickerTargetKey();
  const pickerDisplayHex = editablePalette[pickerTargetKey].toLowerCase();
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

  const galleryTokens = useMemo(
    () => ({
      rowGap: theme.layout.spacing.sm,
      compactGap: theme.layout.spacing.xs,
      cardPadding: theme.layout.spacing.md,
      sectionPadding: theme.layout.spacing.lg,
      pillPaddingHorizontal: theme.layout.spacing.sm,
      pillPaddingVertical: Math.max(4, theme.layout.spacing.xs),
      inputGap: theme.layout.spacing.sm,
      inputMinHeight: Math.max(42, theme.layout.spacing.xl),
      radius: theme.layout.radius,
    }),
    [theme.layout]
  );

  const availableFontFamilies = useMemo(() => {
    const merged = new Map<string, string>();
    for (const family of [...builtInFontChoices, ...EMBEDDED_GOOGLE_FONTS, ...remoteFonts]) {
      const normalized = normalizeFontFamilyName(family);
      if (!normalized) {
        continue;
      }
      const key = normalized.toLowerCase();
      if (!merged.has(key)) {
        merged.set(key, normalized);
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
  }, [remoteFonts]);

  useEffect(() => {
    setTheme((prev) => {
      const nextTheme = withFontFamilyAlias(
        normalizeThemeTypography(reconcileTheme(prev, colorInputMode, bgFamilies, bgFamilyShades))
      );
      return areThemesEqual(prev, nextTheme) ? prev : nextTheme;
    });
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

  useEffect(() => {
    setPickerHexDraft((prev) => (prev === pickerDisplayHex ? prev : pickerDisplayHex));
  }, [pickerDisplayHex]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateFontSettings() {
      try {
        const [savedKey, dismissed] = await Promise.all([
          AsyncStorage.getItem(GOOGLE_FONTS_KEY_STORAGE),
          AsyncStorage.getItem(GOOGLE_FONTS_BANNER_DISMISSED_STORAGE),
        ]);
        if (!isMounted) {
          return;
        }
        const nextKey = savedKey?.trim() ?? '';
        setStoredApiKey(nextKey);
        setApiKeyDraft(nextKey);
        setFontBannerDismissed(dismissed === 'true' && !nextKey);
      } catch {
        if (isMounted) {
          setFontBannerDismissed(false);
        }
      }
    }

    void hydrateFontSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    ensureWebFontLoaded(theme.typography.fontDisplay);
    ensureWebFontLoaded(theme.typography.fontTitle);
    ensureWebFontLoaded(theme.typography.fontSubtitle);
    ensureWebFontLoaded(theme.typography.fontBody);
    ensureWebFontLoaded(theme.typography.fontCaption);
    ensureWebFontLoaded(theme.typography.fontMono);
  }, [
    theme.typography.fontDisplay,
    theme.typography.fontTitle,
    theme.typography.fontSubtitle,
    theme.typography.fontBody,
    theme.typography.fontCaption,
    theme.typography.fontMono,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveFonts(apiKey: string) {
      if (!apiKey) {
        setRemoteFonts([]);
        setFontFetchError('');
        return;
      }

      setLoadingFonts(true);
      setFontFetchError('');
      try {
        const response = await fetch(
          `${GOOGLE_FONTS_API_URL}?sort=popularity&key=${encodeURIComponent(apiKey)}`
        );
        const payload = (await response.json()) as {
          items?: { family?: string }[];
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(payload?.error?.message ?? 'Could not load Google Fonts list.');
        }

        const fetched = (payload.items ?? [])
          .map((item) => normalizeFontFamilyName(item.family ?? ''))
          .filter((value) => value.length > 0);

        if (!cancelled) {
          setRemoteFonts(fetched);
          setFontFetchError('');
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteFonts([]);
          setFontFetchError(
            error instanceof Error ? error.message : 'Could not load Google Fonts list.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingFonts(false);
        }
      }
    }

    void loadLiveFonts(storedApiKey);

    return () => {
      cancelled = true;
    };
  }, [storedApiKey, fontRefreshIndex]);

  function updateTheme(mutator: (prev: ExtendedStylistThemeTokens) => ExtendedStylistThemeTokens) {
    setTheme((prev) =>
      withFontFamilyAlias(
        normalizeThemeTypography(
          reconcileTheme(mutator(prev), colorInputMode, bgFamilies, bgFamilyShades)
        )
      )
    );
  }

  function updateNumeric(path: string, raw: string) {
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) {
      return;
    }

    updateTheme((prev) => {
      if (path === 'displaySize') {
        return {
          ...prev,
          typography: { ...prev.typography, displaySize: value },
        };
      }
      if (path === 'headingSize') {
        return {
          ...prev,
          typography: { ...prev.typography, headingSize: value },
        };
      }
      if (path === 'bodySize') {
        return { ...prev, typography: { ...prev.typography, bodySize: value } };
      }
      if (path === 'captionSize') {
        return {
          ...prev,
          typography: { ...prev.typography, captionSize: value },
        };
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
    setBgFamilies((prev) => (mode === 'one' ? { ...prev, dark: { ...prev.light } } : prev));
    setBgFamilyShades((prev) => (mode === 'one' ? { ...prev, dark: { ...prev.light } } : prev));
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
          ...(prev.colorSystem.familyMode === 'one'
            ? {
                light: {
                  ...prev.palettes[targetPalette].light,
                  [key]: hex,
                },
                dark: {
                  ...prev.palettes[targetPalette].dark,
                  [key]: hex,
                },
              }
            : {
                [activeScheme]: {
                  ...prev.palettes[targetPalette][activeScheme],
                  [key]: hex,
                },
              }),
        },
      },
    }));
  }

  function getPickerTargetKey(): PaletteColorKey {
    return isLockedAutomaticPickerKey(theme.colorSystem.mode, colorInputMode, selectedColor)
      ? 'primary'
      : selectedColor;
  }

  function previewPickerColor(hex: string) {
    const nextPreview = {
      colorInputMode,
      colorMode: theme.colorSystem.mode,
      hex: hex.toLowerCase(),
      key: getPickerTargetKey(),
      scheme: activeScheme,
    };
    setLivePickerPreview((prev) => {
      if (
        prev?.hex === nextPreview.hex &&
        prev.key === nextPreview.key &&
        prev.scheme === nextPreview.scheme &&
        prev.colorMode === nextPreview.colorMode &&
        prev.colorInputMode === nextPreview.colorInputMode
      ) {
        return prev;
      }

      return nextPreview;
    });
  }

  function applyPickerColor(hex: string) {
    const targetKey = getPickerTargetKey();
    const nextHex = hex.toLowerCase();
    setLivePickerPreview(null);
    if (baseEditablePalette[targetKey].toLowerCase() === nextHex) {
      return;
    }

    updateManualColor(targetKey, nextHex);
  }

  function handlePickerHexChange(raw: string) {
    const nextDraft = sanitizeHexDraftInput(raw);
    setPickerHexDraft(nextDraft);
    if (!isImmediateApplyHex(nextDraft)) {
      return;
    }
    const nextHex = normalizeHexForTheme(nextDraft);
    setPickerHexDraft(nextHex);
    applyPickerColor(nextHex);
  }

  function commitPickerHexDraft() {
    if (!isCommitReadyHex(pickerHexDraft)) {
      setPickerHexDraft(pickerDisplayHex);
      return;
    }
    const nextHex = normalizeHexForTheme(pickerHexDraft);
    setPickerHexDraft(nextHex);
    applyPickerColor(nextHex);
  }

  function updateFontRole(role: FontRoleKey, fontFamily: string) {
    const normalized = normalizeFontFamilyName(fontFamily);
    if (!normalized) {
      return;
    }

    setExplicitFontRoles((prev) => ({ ...prev, [role]: true }));
    updateTheme((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        [role]: normalized,
        fontFamily: role === 'fontDisplay' ? normalized : prev.typography.fontFamily,
      },
    }));
  }

  function applyNotoFonts() {
    const notoRoles: Record<FontRoleKey, string> = {
      fontDisplay: 'Noto Sans Display',
      fontTitle: 'Noto Sans Display',
      fontSubtitle: 'Noto Serif Display',
      fontBody: 'Noto Sans',
      fontCaption: 'Noto Serif',
      fontMono: 'Noto Sans Mono',
    };

    setExplicitFontRoles({
      fontDisplay: true,
      fontTitle: true,
      fontSubtitle: true,
      fontBody: true,
      fontCaption: true,
      fontMono: true,
    });
    updateTheme((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        ...notoRoles,
        fontFamily: 'Noto Sans Display',
      },
    }));
  }

  async function saveFontApiSettings() {
    const nextKey = apiKeyDraft.trim();
    try {
      await AsyncStorage.setItem(GOOGLE_FONTS_KEY_STORAGE, nextKey);
      await AsyncStorage.setItem(
        GOOGLE_FONTS_BANNER_DISMISSED_STORAGE,
        nextKey ? 'false' : String(fontBannerDismissed)
      );
      setStoredApiKey(nextKey);
      setFontBannerDismissed(false);
      publishSaveMessage(
        nextKey ? 'success' : 'info',
        nextKey ? 'Google Fonts key saved. Live list is refreshing.' : 'Google Fonts key cleared.'
      );
    } catch {
      publishSaveMessage('error', 'Unable to save Google Fonts API key on this device.');
    }
  }

  async function dismissFontBanner() {
    try {
      await AsyncStorage.setItem(GOOGLE_FONTS_BANNER_DISMISSED_STORAGE, 'true');
    } catch {
      // no-op
    }
    setFontBannerDismissed(true);
  }

  async function saveTheme(policyOverride?: WritePolicy) {
    const payloadTheme = withFontFamilyAlias(
      normalizeThemeTypography(reconcileTheme(theme, colorInputMode, bgFamilies, bgFamilyShades))
    );
    const resolvedPolicy = policyOverride ?? writePolicy ?? 'managed';
    pulseSaveButton();
    setSaving(true);
    publishSaveMessage('info', 'Saving theme...');
    try {
      const response = await fetch('/exposition/stylist-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          theme: payloadTheme,
          metadata: {
            writePolicy: resolvedPolicy,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Stylist sync failed.');
      }
      const readBackResponse = await fetch('/exposition/stylist-sync', {
        method: 'GET',
        headers: { 'cache-control': 'no-store' },
      });
      let canonicalTheme = payloadTheme;
      if (readBackResponse.ok) {
        const readBackPayload = (await readBackResponse.json()) as {
          theme?: StylistThemeTokens;
          writePolicy?: WritePolicy;
        };
        if (readBackPayload.theme) {
          canonicalTheme = withFontFamilyAlias(
            normalizeThemeTypography(
              reconcileTheme(readBackPayload.theme, colorInputMode, bgFamilies, bgFamilyShades)
            )
          );
          setTheme((prev) => (areThemesEqual(prev, canonicalTheme) ? prev : canonicalTheme));
          setAppTheme(canonicalTheme);
          setExplicitFontRoles({
            fontDisplay: true,
            fontTitle: true,
            fontSubtitle: true,
            fontBody: true,
            fontCaption: true,
            fontMono: true,
          });
        } else {
          setAppTheme(payloadTheme);
        }
        setWritePolicy(readBackPayload.writePolicy ?? payload.writePolicy ?? resolvedPolicy);
      } else {
        setWritePolicy(payload.writePolicy ?? resolvedPolicy);
        setAppTheme(payloadTheme);
      }
      setNativeDraft('');
      publishSyncMessage(`Synced ${payload.updatedFiles?.length ?? 0} files from Stylist.`);
    } catch (error) {
      if (Platform.OS !== 'web') {
        const draft = JSON.stringify(payloadTheme, null, 2);
        setNativeDraft(draft);
        setWritePolicy(resolvedPolicy);
        setAppTheme(payloadTheme);
        publishSaveMessage(
          'success',
          'Draft saved in Stylist. Run the sync command from your project root terminal.'
        );
        return;
      }
      const message = humanizeSaveError(
        error instanceof Error ? error.message : 'Unknown save error.'
      );
      Alert.alert('Stylist save failed', message);
      publishSaveMessage('error', message);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveThemePress() {
    if (saving) {
      return;
    }

    if (Platform.OS === 'web' && writePolicyLoaded && !writePolicy) {
      setShowWritePolicyModal(true);
      return;
    }

    void saveTheme();
  }

  function chooseWritePolicyAndSave(nextPolicy: WritePolicy) {
    setWritePolicy(nextPolicy);
    setShowWritePolicyModal(false);
    void saveTheme(nextPolicy);
  }

  const nativeSaveCommand = NATIVE_SAVE_COMMAND;
  const saveMessageColors =
    saveMessageTone === 'success'
      ? { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' }
      : saveMessageTone === 'error'
        ? {
            backgroundColor: '#fee2e2',
            borderColor: '#fca5a5',
            color: '#991b1b',
          }
        : {
            backgroundColor: '#dbeafe',
            borderColor: '#93c5fd',
            color: '#1e3a8a',
          };

  return (
    <View style={styles.root}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? 220 : Math.max(insets.top + 132, 160),
            paddingBottom: Math.max(insets.bottom + 40, 96),
          },
        ]}
        style={[styles.screen, { backgroundColor: previewColors.background }]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: previewColors.text }]}>
            __MDS_APP_NAME__ Stylist
          </Text>
          <Animated.View style={{ transform: [{ scale: saveButtonScale }] }}>
            <Pressable
              onPress={handleSaveThemePress}
              disabled={saving}
              style={[
                styles.saveButton,
                styles.saveButtonInline,
                { backgroundColor: previewColors.primary },
              ]}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Theme'}</Text>
            </Pressable>
          </Animated.View>
        </View>
        <Text style={[styles.intro, { color: previewColors.text }]}>
          Adjust design tokens - do not forget to hit Save Theme so the changes will be applied to
          your app color theme files.
        </Text>
        {saveMessage ? (
          <Animated.View
            key={`save-message-${saveMessageNonce}`}
            style={[
              styles.saveMessageBanner,
              {
                backgroundColor: saveMessageColors.backgroundColor,
                borderColor: saveMessageColors.borderColor,
                opacity: saveBannerOpacity,
              },
            ]}
          >
            <Text style={[styles.saveMessageText, { color: saveMessageColors.color }]}>
              {saveMessage}
            </Text>
          </Animated.View>
        ) : null}
        {!fontBannerDismissed || !storedApiKey ? (
          <View style={[styles.fontBanner, { borderColor: previewColors.primary }]}>
            <View style={styles.fontBannerHeader}>
              <Text style={styles.fontBannerTitle}>Google Fonts API Key (Optional)</Text>
              <Pressable onPress={dismissFontBanner} style={styles.bannerDismissButton}>
                <Text style={styles.bannerDismissText}>X</Text>
              </Pressable>
            </View>
            <Text style={styles.fontBannerBody}>
              Embedded curated fonts are already built in. Add your Google Fonts API key only if you
              want the live catalog sync. System and common fallback fonts are included too.
            </Text>
            <TextInput
              value={apiKeyDraft}
              onChangeText={setApiKeyDraft}
              placeholder="Paste Google Fonts API key"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <View style={styles.fontBannerActions}>
              <Pressable
                onPress={saveFontApiSettings}
                style={[styles.bannerAction, { backgroundColor: previewColors.primary }]}
              >
                <Text style={styles.bannerActionText}>Save Key</Text>
              </Pressable>
              <Pressable
                onPress={() => setFontRefreshIndex((prev) => prev + 1)}
                style={[styles.bannerAction, styles.bannerActionGhost]}
              >
                <Text style={styles.bannerActionGhostText}>Refresh List</Text>
              </Pressable>
            </View>
            {loadingFonts ? (
              <Text style={styles.fontBannerBody}>Loading live Google Fonts list...</Text>
            ) : null}
            {fontFetchError ? <Text style={styles.fontError}>{fontFetchError}</Text> : null}
          </View>
        ) : null}
        <View
          style={[
            styles.section,
            styles.sectionOverlay,
            {
              backgroundColor: previewColors.surface,
              borderRadius: theme.layout.radius,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: controlTextColor }]}>Colors</Text>
            <View style={styles.inlineToggle}>
              {colorInputModeOptions.map((option) => {
                const isSelected = colorInputMode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setColorInputMode(option.value)}
                    style={[
                      styles.inlineToggleOption,
                      isSelected && styles.inlineToggleOptionSelected,
                    ]}
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

          <Text style={[styles.helperText, { color: controlTextColor }]}>
            {theme.colorSystem.mode === 'automatic'
              ? 'Automatic mode derives background, surface, and text from the primary color in real time.'
              : theme.colorSystem.familyMode === 'one'
                ? 'BG mode lets you set one shared palette for both light and dark previews.'
                : `BG mode lets you set palette colors directly for the active ${activeScheme} scheme.`}
          </Text>

          {theme.colorSystem.mode === 'automatic' && colorInputMode === 'picker' ? (
            <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
              Background, surface, and text are disabled here because they are derived from the
              primary color.
            </Text>
          ) : null}

          {colorInputMode === 'picker' ? (
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
                    <Text
                      style={[
                        styles.colorChipLabel,
                        {
                          color: getReadableChipTextColor(editablePalette[key]),
                        },
                      ]}
                    >
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {colorInputMode === 'picker' ? (
            <>
              <ColorPicker
                value={baseEditablePalette[pickerTargetKey]}
                onChangeJS={({ hex }: { hex: string }) => {
                  previewPickerColor(hex);
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
              <View style={styles.pickerHexRow}>
                <Text style={styles.pickerHexLabel}>Hex</Text>
                <TextInput
                  value={pickerHexDraft}
                  onChangeText={handlePickerHexChange}
                  onBlur={commitPickerHexDraft}
                  onSubmitEditing={commitPickerHexDraft}
                  autoCorrect={false}
                  autoCapitalize="none"
                  maxLength={7}
                  style={[
                    styles.input,
                    styles.pickerHexInput,
                    { color: '#111827', borderColor: previewColors.primary },
                  ]}
                  placeholder="#rrggbb"
                  placeholderTextColor="#6b7280"
                />
              </View>
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
              {(theme.colorSystem.mode === 'automatic' ? semanticColorKeys : paletteColorKeys).map(
                (key) => {
                  const familyValue =
                    theme.colorSystem.mode === 'automatic'
                      ? activeFamilies[key as SemanticColorKey]
                      : activeBgFamilies[key as PaletteColorKey];
                  const shadeValue =
                    theme.colorSystem.mode === 'automatic'
                      ? null
                      : activeBgFamilyShades[key as PaletteColorKey];
                  const familyChipColor =
                    theme.colorSystem.mode === 'automatic'
                      ? previewColors[key as SemanticColorKey]
                      : editablePalette[key as PaletteColorKey];

                  return (
                    <View key={key} style={styles.familyRow}>
                      <View style={styles.familyHeader}>
                        <View
                          style={[
                            styles.familyTitleChip,
                            {
                              backgroundColor: familyChipColor,
                              borderColor: previewColors.text,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.familyTitleChipText,
                              {
                                color: getReadableChipTextColor(familyChipColor),
                              },
                            ]}
                          >
                            {key}
                          </Text>
                        </View>
                        {theme.colorSystem.familyMode === 'two' ? (
                          <Text style={[styles.familySchemeHint, { color: previewColors.text }]}>
                            ({activeFamilyScheme})
                          </Text>
                        ) : null}
                      </View>
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
                                {
                                  color: familyValue === family ? '#f8fafc' : previewColors.text,
                                },
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
                            const shadeColor = getTailwindColor(familyValue, shade);
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
                }
              )}
            </View>
          )}
        </View>

        <View style={previewCard}>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontDisplay),
              fontSize: theme.typography.displaySize,
              fontWeight: resolvePreviewFontWeight(theme.typography.fontDisplay, '900'),
            }}
          >
            Display headline
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontTitle),
              fontSize: theme.typography.headingSize,
              fontWeight: resolvePreviewFontWeight(theme.typography.fontTitle, '800'),
            }}
          >
            Section heading
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontSubtitle),
              fontSize: theme.typography.bodySize + 1,
              fontWeight: resolvePreviewFontWeight(theme.typography.fontSubtitle, '600'),
            }}
          >
            Subtitle copy for card sections and hero support text.
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontBody),
              fontSize: theme.typography.bodySize,
            }}
          >
            Readable body copy for product screens, onboarding, settings, and forms.
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontCaption),
              fontSize: theme.typography.captionSize,
              textTransform: 'uppercase',
            }}
          >
            Caption and metadata text
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontMono),
              fontSize: 11,
              textTransform: 'uppercase',
              opacity: 0.82,
            }}
          >
            Monospaced sample
          </Text>
          <Text
            style={{
              color: previewColors.text,
              fontFamily: resolvePreviewFontFamily(theme.typography.fontMono),
              fontSize: 12,
              backgroundColor: previewColors.background,
              padding: 8,
              borderRadius: 8,
            }}
          >
            {'const typography = "monospaced";'}
          </Text>
          <AnimatedPressable
            label="Call to Action"
            backgroundColor={previewColors.secondary}
            textColor={previewColors.text}
          />
        </View>

        <View
          style={[
            styles.section,
            styles.typographySection,
            {
              backgroundColor: previewColors.surface,
              borderRadius: theme.layout.radius,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: controlTextColor }]}>Typography</Text>
            <Pressable
              onPress={applyNotoFonts}
              style={[styles.presetButton, { borderColor: controlTextColor }]}
            >
              <Text style={[styles.presetButtonText, { color: controlTextColor }]}>Noto</Text>
            </Pressable>
          </View>
          <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
            Search and choose a font per role. Display also syncs `fontFamily` for compatibility.
          </Text>
          <View style={[styles.grid, styles.fontPickerGrid]}>
            {fontRoleFields.map((field) => (
              <FontFamilyCombobox
                key={field.key}
                grid
                label={field.label}
                labelColor={controlTextColor}
                value={explicitFontRoles[field.key] ? theme.typography[field.key] : ''}
                placeholder=""
                options={availableFontFamilies}
                onSelect={(fontFamily) => updateFontRole(field.key, fontFamily)}
              />
            ))}
          </View>
          {Platform.OS !== 'web' &&
          fontRoleFields.some((field) => isNativeUnsafeFont(theme.typography[field.key])) ? (
            <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
              Custom fonts apply on native after you press Save Theme and reload. Until the sync
              downloads the font assets, previews may render with System.
            </Text>
          ) : null}
          <View style={[styles.grid, styles.tokenSizeGrid]}>
            <NumberField
              grid
              label="Display"
              labelColor={controlTextColor}
              value={theme.typography.displaySize}
              onChange={(value) => updateNumeric('displaySize', value)}
            />
            <NumberField
              grid
              label="Heading"
              labelColor={controlTextColor}
              value={theme.typography.headingSize}
              onChange={(value) => updateNumeric('headingSize', value)}
            />
            <NumberField
              grid
              label="Body"
              labelColor={controlTextColor}
              value={theme.typography.bodySize}
              onChange={(value) => updateNumeric('bodySize', value)}
            />
            <NumberField
              grid
              label="Caption"
              labelColor={controlTextColor}
              value={theme.typography.captionSize}
              onChange={(value) => updateNumeric('captionSize', value)}
            />
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: previewColors.surface,
              borderRadius: theme.layout.radius,
              padding: galleryTokens.sectionPadding,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: controlTextColor }]}>Component Gallery</Text>
          <Text style={[styles.helperText, { color: controlTextColor }]}>
            Token previews using cards, status views, input states, and spacing rhythm. These are
            just example components.
          </Text>
          <View style={[styles.galleryRow, { gap: galleryTokens.rowGap }]}>
            <View
              style={[
                styles.galleryCard,
                {
                  borderColor: previewColors.primary,
                  backgroundColor: previewColors.background,
                  borderRadius: galleryTokens.radius,
                  gap: galleryTokens.compactGap,
                  padding: galleryTokens.cardPadding,
                },
              ]}
            >
              <Text style={[styles.galleryCardTitle, { color: previewColors.text }]}>
                Default Card
              </Text>
              <Text style={[styles.galleryCardBody, { color: previewColors.text }]}>
                Solid surface card for primary content blocks.
              </Text>
            </View>
            <View
              style={[
                styles.galleryCard,
                styles.galleryCardSoft,
                {
                  borderColor: previewColors.secondary,
                  borderRadius: galleryTokens.radius,
                  gap: galleryTokens.compactGap,
                  padding: galleryTokens.cardPadding,
                },
              ]}
            >
              <Text style={[styles.galleryCardTitle, { color: previewColors.text }]}>
                Soft Card
              </Text>
              <Text style={[styles.galleryCardBody, { color: previewColors.text }]}>
                Layered panel with lower contrast for secondary content.
              </Text>
            </View>
          </View>
          <View style={[styles.statusRow, { gap: galleryTokens.compactGap }]}>
            {[
              { label: 'Success', color: previewColors.success },
              { label: 'Warning', color: previewColors.warning },
              { label: 'Primary', color: previewColors.primary },
              { label: 'Secondary', color: previewColors.secondary },
            ].map((status) => (
              <View
                key={status.label}
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: status.color,
                    borderRadius: galleryTokens.radius,
                    paddingHorizontal: galleryTokens.pillPaddingHorizontal,
                    paddingVertical: galleryTokens.pillPaddingVertical,
                  },
                ]}
              >
                <Text style={styles.statusPillText}>{status.label}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.inputStatesRow, { gap: galleryTokens.inputGap }]}>
            <TextInput
              style={[
                styles.input,
                {
                  borderRadius: galleryTokens.radius,
                  minHeight: galleryTokens.inputMinHeight,
                  paddingHorizontal: galleryTokens.cardPadding,
                },
              ]}
              placeholder="Default input"
            />
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: previewColors.warning,
                  borderRadius: galleryTokens.radius,
                  minHeight: galleryTokens.inputMinHeight,
                  paddingHorizontal: galleryTokens.cardPadding,
                },
              ]}
              placeholder="Warning state input"
            />
            <TextInput
              style={[
                styles.input,
                {
                  borderRadius: galleryTokens.radius,
                  minHeight: galleryTokens.inputMinHeight,
                  opacity: 0.6,
                  paddingHorizontal: galleryTokens.cardPadding,
                },
              ]}
              placeholder="Disabled input"
              editable={false}
            />
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: previewColors.surface,
              borderRadius: theme.layout.radius,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: controlTextColor }]}>Layout Tokens</Text>
          <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
            Hit enter or click out of the text box to take effect.
          </Text>
          <NumberField
            label="Corner Radius"
            labelColor={controlTextColor}
            value={theme.layout.radius}
            onChange={(value) => updateNumeric('radius', value)}
          />
          <View style={styles.grid}>
            {spacingKeys.map((key) => (
              <NumberField
                grid
                key={key}
                label={`Spacing ${key}`}
                labelColor={controlTextColor}
                value={theme.layout.spacing[key]}
                onChange={(value) => updateNumeric(key, value)}
              />
            ))}
          </View>
          <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
            Bar width mirrors each spacing token so scale jumps are easy to spot.
          </Text>
          <View style={styles.spacingPreview}>
            {spacingKeys.map((key) => (
              <View key={`preview-${key}`} style={styles.spacingPreviewRow}>
                <Text style={[styles.spacingLabel, { color: controlTextColor }]}>{key}</Text>
                <View
                  style={[
                    styles.spacingBar,
                    {
                      width: Math.max(10, theme.layout.spacing[key] * 3),
                      backgroundColor: previewColors.primary,
                      borderRadius: Math.max(4, theme.layout.radius / 2),
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <Text style={[styles.helperText, styles.lockedNote, { color: controlTextColor }]}>
            Practical preview: XS controls list gaps, SM pads the first 3 items, and MD pads the
            list container.
          </Text>
          <View
            style={[
              styles.layoutPreviewContainer,
              {
                borderColor: previewColors.primary,
                borderRadius: theme.layout.radius,
                padding: theme.layout.spacing.md,
                gap: theme.layout.spacing.xs,
              },
            ]}
          >
            {spacingKeys.map((spacingKey, index) => (
              <View
                key={`layout-preview-${spacingKey}`}
                style={[
                  styles.layoutPreviewCard,
                  {
                    borderRadius: Math.max(6, theme.layout.radius - 2),
                    padding: index < 3 ? theme.layout.spacing.sm : theme.layout.spacing[spacingKey],
                    borderColor: previewColors.secondary,
                    backgroundColor: previewColors.background,
                  },
                ]}
              >
                <Text style={[styles.layoutPreviewTitle, { color: previewColors.text }]}>
                  {spacingKey.toUpperCase()} -{' '}
                  {spacingKey === 'xs'
                    ? 'Extra Small'
                    : spacingKey === 'sm'
                      ? 'Small'
                      : spacingKey === 'md'
                        ? 'Medium'
                        : spacingKey === 'lg'
                          ? 'Large'
                          : 'Extra Large'}
                </Text>
                <Text style={[styles.layoutPreviewBody, { color: previewColors.text }]}>
                  {spacingKey === 'xs'
                    ? 'Used for the gap between these list items.'
                    : spacingKey === 'sm'
                      ? 'Used for the padding for the first 3 list items.'
                      : spacingKey === 'md'
                        ? 'Used for the padding around the list.'
                        : spacingKey === 'lg'
                          ? "Reserved for roomier layout sections (this list item's padding)."
                          : "Reserved for extra-roomy layout sections (this list item's padding)."}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: saveButtonScale }] }}>
          <Pressable
            onPress={handleSaveThemePress}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: previewColors.primary }]}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Theme'}</Text>
          </Pressable>
        </Animated.View>

        {saveMessage ? (
          <Animated.View
            key={`save-message-bottom-${saveMessageNonce}`}
            style={[
              styles.saveMessageBanner,
              {
                backgroundColor: saveMessageColors.backgroundColor,
                borderColor: saveMessageColors.borderColor,
                opacity: saveBannerOpacity,
              },
            ]}
          >
            <Text style={[styles.saveMessageText, { color: saveMessageColors.color }]}>
              {saveMessage}
            </Text>
          </Animated.View>
        ) : null}
        {Platform.OS !== 'web' ? (
          <View style={styles.nativeHelp}>
            <Text style={styles.nativeTitle}>Native fallback</Text>
            <Text style={styles.nativeBody}>Run this command in your app root terminal:</Text>
            <Text style={styles.command}>{nativeSaveCommand}</Text>
            {nativeDraft ? <Text style={styles.payload}>{nativeDraft}</Text> : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={showWritePolicyModal}
        onRequestClose={() => setShowWritePolicyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Save Behavior</Text>
            <Text style={styles.modalBody}>
              Managed updates only Stylist-owned token blocks. Overwrite regenerates the full
              style-library target file.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => chooseWritePolicyAndSave('managed')}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonPrimaryText}>Managed (Recommended)</Text>
              </Pressable>
              <Pressable
                onPress={() => chooseWritePolicyAndSave('overwrite')}
                style={[styles.modalButton, styles.modalButtonSecondary]}
              >
                <Text style={styles.modalButtonSecondaryText}>Overwrite Full File</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.controls,
          {
            backgroundColor: previewColors.surface,
            borderColor: previewColors.primary,
            top: Platform.OS === 'web' ? 76 : Math.max(insets.top + 8, 14),
          },
        ]}
      >
        <ToggleRow
          label="Color Mode"
          options={colorModeOptions}
          value={theme.colorSystem.mode}
          onChange={(value) => updateColorMode(value as StylistColorMode)}
          infoText={topToggleHelpCopy.colorMode.body}
          onPressInfo={() => setActiveTopToggleHelp('colorMode')}
        />
        <ToggleRow
          label="Preview"
          options={schemeKeys.map((scheme) => ({
            label: scheme,
            value: scheme,
          }))}
          value={theme.colorSystem.previewScheme}
          onChange={(value) => updatePreviewScheme(value as StylistColorScheme)}
          infoText={topToggleHelpCopy.preview.body}
          onPressInfo={() => setActiveTopToggleHelp('preview')}
        />
        <ToggleRow
          label="Family Strategy"
          options={familyModeOptions}
          value={theme.colorSystem.familyMode}
          onChange={(value) => updateFamilyMode(value as StylistFamilyMode)}
          infoText={topToggleHelpCopy.familyStrategy.body}
          onPressInfo={() => setActiveTopToggleHelp('familyStrategy')}
        />
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(activeTopToggleHelp)}
        onRequestClose={() => setActiveTopToggleHelp(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {activeTopToggleHelp ? topToggleHelpCopy[activeTopToggleHelp].title : 'Toggle Help'}
            </Text>
            <Text style={styles.modalBody}>
              {activeTopToggleHelp
                ? topToggleHelpCopy[activeTopToggleHelp].body
                : 'No toggle help selected.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setActiveTopToggleHelp(null)}
                style={[styles.modalButton, styles.modalButtonPrimary]}
              >
                <Text style={styles.modalButtonPrimaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleRow(props: {
  label: string;
  infoText: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  onPressInfo: () => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabelRow}>
        <Text style={styles.toggleLabel}>{props.label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${props.label} explanation`}
          accessibilityHint={props.infoText}
          onPress={props.onPressInfo}
          style={styles.toggleInfoButton}
        >
          <Text style={styles.toggleInfoButtonText}>i</Text>
        </Pressable>
      </View>
      <View style={styles.toggleOptions}>
        {props.options.map((option) => {
          const isSelected = props.value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => props.onChange(option.value)}
              style={[styles.toggleOption, isSelected && styles.toggleOptionSelected]}
            >
              <Text
                style={[styles.toggleOptionText, isSelected && styles.toggleOptionTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  grid?: boolean;
  labelColor?: string;
}) {
  const [draft, setDraft] = useState(String(props.value));

  return (
    <View style={[styles.field, props.grid ? styles.gridField : styles.fullField]}>
      <Text style={[styles.fieldLabel, props.labelColor ? { color: props.labelColor } : null]}>
        {props.label}
      </Text>
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

function FontFamilyCombobox(props: {
  label: string;
  labelColor?: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  grid?: boolean;
}) {
  const [query, setQuery] = useState(props.value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery((prev) => (prev === props.value ? prev : props.value));
  }, [props.value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return props.options.filter((option) => option.toLowerCase() !== 'system');
    }
    return props.options.filter((option) => option.toLowerCase().includes(q));
  }, [props.options, query]);

  useEffect(() => {
    if (!isOpen || Platform.OS !== 'web') {
      return;
    }

    for (const option of filteredOptions.slice(0, 80)) {
      ensureWebFontLoaded(option);
    }
  }, [filteredOptions, isOpen]);

  function commitValue(next: string) {
    const normalized = normalizeFontFamilyName(next);
    if (!normalized) {
      setQuery(props.value);
      setIsOpen(false);
      return;
    }
    props.onSelect(normalized);
    setQuery(normalized);
    setIsOpen(false);
  }

  function openDropdown() {
    setIsOpen(true);
  }

  return (
    <View
      style={[
        styles.field,
        props.grid ? styles.gridField : styles.fullField,
        isOpen ? styles.fieldOverlayOpen : null,
      ]}
    >
      <Text style={[styles.fieldLabel, props.labelColor ? { color: props.labelColor } : null]}>
        {props.label}
      </Text>
      <View style={styles.comboboxWrap}>
        <View style={styles.inputWithAction}>
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (!isOpen) {
                openDropdown();
              }
            }}
            onFocus={() => {
              openDropdown();
            }}
            onSubmitEditing={() => commitValue(query)}
            blurOnSubmit
            returnKeyType="done"
            placeholder={props.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
            style={[styles.input, styles.inputWithTrailingAction]}
          />
          {query.trim().length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear ${props.label} font`}
              onPress={() => {
                commitValue('System');
              }}
              style={styles.clearInputButton}
            >
              <Text style={styles.clearInputButtonText}>x</Text>
            </Pressable>
          ) : null}
        </View>
        {isOpen ? (
          <View style={styles.comboboxDropdown}>
            <View style={styles.comboboxHeader}>
              <Text style={styles.comboboxHeaderText}>Choose a font</Text>
              <Pressable onPress={() => setIsOpen(false)} style={styles.comboboxCloseButton}>
                <Text style={styles.comboboxCloseText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.comboboxScroll}
            >
              {filteredOptions.length === 0 ? (
                <Text style={styles.comboboxEmpty}>No matching fonts</Text>
              ) : (
                filteredOptions.map((option) => (
                  <Pressable
                    key={`${props.label}-${option}`}
                    onPress={() => {
                      commitValue(option);
                    }}
                    style={styles.comboboxOption}
                  >
                    <Text
                      style={[
                        styles.comboboxOptionText,
                        { fontFamily: resolvePreviewFontFamily(option) },
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>
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
  toggleLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleInfoButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  toggleInfoButtonText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
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
  fontBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  fontBannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontBannerTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  fontBannerBody: {
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
  },
  bannerDismissButton: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDismissText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  fontBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bannerAction: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  bannerActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  bannerActionGhost: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  bannerActionGhostText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  fontError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 12,
    padding: 16,
  },
  sectionOverlay: {
    overflow: 'visible',
    zIndex: 40,
  },
  typographySection: {
    overflow: 'visible',
    zIndex: 90,
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
  presetButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '800',
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
  pickerHexRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pickerHexLabel: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pickerHexInput: {
    flex: 1,
    fontFamily: 'monospace',
    minHeight: 38,
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
  familyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  familyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  familyTitleChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  familyTitleChipText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  familySchemeHint: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.72,
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
  galleryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryCard: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 220,
    padding: 12,
  },
  galleryCardSoft: {
    backgroundColor: 'rgba(148,163,184,0.14)',
  },
  galleryCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  galleryCardBody: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.92,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  inputStatesRow: {
    gap: 8,
  },
  spacingPreview: {
    gap: 8,
  },
  spacingPreviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  spacingLabel: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    width: 32,
  },
  spacingBar: {
    height: 12,
  },
  layoutPreviewContainer: {
    borderWidth: 1,
  },
  layoutPreviewCard: {
    borderWidth: 1,
  },
  layoutPreviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  layoutPreviewBody: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fontPickerGrid: {
    overflow: 'visible',
    zIndex: 120,
  },
  tokenSizeGrid: {
    zIndex: 1,
  },
  field: {
    gap: 6,
  },
  fieldOverlayOpen: {
    zIndex: 500,
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
  comboboxWrap: {
    position: 'relative',
  },
  comboboxDropdown: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    borderWidth: 1,
    elevation: 4,
    marginTop: 6,
    maxHeight: 220,
    overflow: 'hidden',
  },
  comboboxScroll: {
    maxHeight: 168,
  },
  comboboxHeader: {
    alignItems: 'center',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comboboxHeaderText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
  },
  comboboxCloseButton: {
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  comboboxCloseText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  comboboxOption: {
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comboboxOptionText: {
    color: '#111827',
    fontSize: 13,
  },
  comboboxEmpty: {
    color: '#6b7280',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  inputWithAction: {
    position: 'relative',
  },
  inputWithTrailingAction: {
    paddingRight: 38,
  },
  clearInputButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 9,
    width: 24,
  },
  clearInputButtonText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
    textTransform: 'uppercase',
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
  saveMessageBanner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveMessageText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
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
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    maxWidth: 420,
    padding: 16,
    width: '100%',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    gap: 8,
  },
  modalButton: {
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#0f172a',
  },
  modalButtonSecondary: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  modalButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalButtonSecondaryText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
});
