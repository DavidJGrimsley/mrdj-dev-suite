import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StylistColorScheme = 'light' | 'dark';
export type StylistColorMode = 'bg' | 'automatic';
export type StylistFamilyMode = 'one' | 'two';
export type StylistSemanticColorKey = 'primary' | 'secondary' | 'success' | 'warning';
export type StyleLibrary =
  | 'uniwind'
  | 'nativewind'
  | 'nativewindui'
  | 'unistyles'
  | 'restyle'
  | 'tamagui'
  | 'stylesheet';
export type WritePolicy = 'managed' | 'overwrite';

export interface StylistColorPalette {
  background: string;
  surface: string;
  text: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
}

export interface StylistSemanticFamilies {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
}

export interface StylistTheme {
  version: 1;
  colorSystem: {
    mode: StylistColorMode;
    previewScheme: StylistColorScheme;
    familyMode: StylistFamilyMode;
  };
  families: {
    light: StylistSemanticFamilies;
    dark: StylistSemanticFamilies;
  };
  palettes: {
    bg: {
      light: StylistColorPalette;
      dark: StylistColorPalette;
    };
    automatic: {
      light: StylistColorPalette;
      dark: StylistColorPalette;
    };
  };
  colors: {
    light: StylistColorPalette;
    dark: StylistColorPalette;
  };
  typography: {
    fontFamily: string;
    fontDisplay: string;
    fontTitle: string;
    fontSubtitle: string;
    fontBody: string;
    fontCaption: string;
    fontMono: string;
    displaySize: number;
    headingSize: number;
    bodySize: number;
    captionSize: number;
  };
  layout: {
    radius: number;
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
}

export interface StylistConfig {
  styleLibrary: StyleLibrary;
  writePolicy: WritePolicy;
}

export interface SyncStylistThemeResult {
  projectPath: string;
  theme: StylistTheme;
  updatedFiles: string[];
  styleLibrary: StyleLibrary;
  writePolicy: WritePolicy;
}

export interface SyncStylistThemeOptions {
  styleLibrary?: StyleLibrary | 'auto';
  writePolicy?: WritePolicy;
}

export interface LoadStylistThemeDiagnostics {
  source: 'theme.json' | 'style.md' | 'default';
  mismatchDetected: boolean;
}

export interface LoadStylistThemeResult {
  theme: StylistTheme;
  diagnostics: LoadStylistThemeDiagnostics;
}

const STYLE_THEME_BLOCK_START = '<!-- MDS_STYLIST_THEME_START -->';
const STYLE_THEME_BLOCK_END = '<!-- MDS_STYLIST_THEME_END -->';
const GLOBAL_CSS_THEME_BLOCK_START = '/* MDS_STYLIST_THEME_START */';
const GLOBAL_CSS_THEME_BLOCK_END = '/* MDS_STYLIST_THEME_END */';
const NATIVEWIND_UI_THEME_BLOCK_START = '/* MDS_STYLIST_NATIVEWINDUI_THEME_START */';
const NATIVEWIND_UI_THEME_BLOCK_END = '/* MDS_STYLIST_NATIVEWINDUI_THEME_END */';
const UNISTYLES_THEME_BLOCK_START = '// MDS_STYLIST_UNISTYLES_THEME_START';
const UNISTYLES_THEME_BLOCK_END = '// MDS_STYLIST_UNISTYLES_THEME_END';
const RESTYLE_THEME_BLOCK_START = '// MDS_STYLIST_RESTYLE_THEME_START';
const RESTYLE_THEME_BLOCK_END = '// MDS_STYLIST_RESTYLE_THEME_END';
const TAMAGUI_THEME_BLOCK_START = '// MDS_STYLIST_TAMAGUI_THEME_START';
const TAMAGUI_THEME_BLOCK_END = '// MDS_STYLIST_TAMAGUI_THEME_END';

export const DEFAULT_STYLIST_THEME: StylistTheme = {
  version: 1,
  colorSystem: {
    mode: 'bg',
    previewScheme: 'light',
    familyMode: 'one',
  },
  families: {
    light: {
      primary: 'blue',
      secondary: 'violet',
      success: 'emerald',
      warning: 'amber',
    },
    dark: {
      primary: 'blue',
      secondary: 'violet',
      success: 'emerald',
      warning: 'amber',
    },
  },
  palettes: {
    bg: {
      light: {
        background: '#f8fafc',
        surface: '#e2e8f0',
        text: '#111827',
        primary: '#2563eb',
        secondary: '#7c3aed',
        success: '#16a34a',
        warning: '#f97316',
      },
      dark: {
        background: '#09090b',
        surface: '#18181b',
        text: '#f8fafc',
        primary: '#60a5fa',
        secondary: '#a78bfa',
        success: '#4ade80',
        warning: '#fb923c',
      },
    },
    automatic: {
      light: {
        background: '#eff6ff',
        surface: '#dbeafe',
        text: '#1e3a8a',
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
      },
      dark: {
        background: '#172554',
        surface: '#1e3a8a',
        text: '#eff6ff',
        primary: '#60a5fa',
        secondary: '#a78bfa',
        success: '#34d399',
        warning: '#fbbf24',
      },
    },
  },
  colors: {
    light: {
      background: '#f8fafc',
      surface: '#e2e8f0',
      text: '#111827',
      primary: '#2563eb',
      secondary: '#7c3aed',
      success: '#16a34a',
      warning: '#f97316',
    },
    dark: {
      background: '#09090b',
      surface: '#18181b',
      text: '#f8fafc',
      primary: '#60a5fa',
      secondary: '#a78bfa',
      success: '#4ade80',
      warning: '#fb923c',
    },
  },
  typography: {
    fontFamily: 'System',
    fontDisplay: 'System',
    fontTitle: 'System',
    fontSubtitle: 'System',
    fontBody: 'System',
    fontCaption: 'System',
    fontMono: 'monospace',
    displaySize: 32,
    headingSize: 20,
    bodySize: 15,
    captionSize: 12,
  },
  layout: {
    radius: 12,
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  },
};

export async function syncStylistTheme(
  projectPathInput: string,
  payload: unknown,
  options: SyncStylistThemeOptions = {}
): Promise<SyncStylistThemeResult> {
  const projectPath = path.resolve(projectPathInput);
  const projectDir = path.join(projectPath, 'project');
  const updatedFiles: string[] = [];
  await mkdir(projectDir, { recursive: true });

  const theme = normalizeStylistTheme(payload);
  const resolved = await resolveStylistContext(projectPath, options);
  const styleLibrary = resolved.styleLibrary;
  const writePolicy = resolved.writePolicy;

  const themePath = path.join(projectDir, 'theme.json');
  const wroteTheme = await writeTextFileIfChanged(themePath, `${JSON.stringify(theme, null, 2)}\n`);
  if (wroteTheme) {
    updatedFiles.push(themePath);
  }

  const stylePath = path.join(projectDir, 'style.md');
  const styleExisting = await readOptionalText(stylePath);
  const styleNext = upsertManagedBlock(
    styleExisting ?? renderDefaultStyleMarkdown(),
    STYLE_THEME_BLOCK_START,
    STYLE_THEME_BLOCK_END,
    renderStyleThemeBlock(theme)
  );
  const wroteStyle = await writeTextFileIfChanged(stylePath, styleNext);
  if (wroteStyle) {
    updatedFiles.push(stylePath);
  }

  const tokensPath = path.join(projectPath, 'src', 'theme', 'tokens.ts');
  const wroteTokens = await writeTextFileIfChanged(tokensPath, renderThemeTokensFile(theme));
  if (wroteTokens) {
    updatedFiles.push(tokensPath);
  }

  const fontAssetUpdates = await syncThemeFontAssets(projectPath, theme);
  updatedFiles.push(...fontAssetUpdates);

  const adapterUpdates = await syncStyleLibraryOutputs(
    projectPath,
    theme,
    styleLibrary,
    writePolicy
  );
  updatedFiles.push(...adapterUpdates);

  const todoPath = path.join(projectDir, 'todo.md');
  const todoExisting = await readOptionalText(todoPath);
  if (todoExisting) {
    const todoNext = ensureThemeTodoTask(todoExisting);
    if (todoNext !== todoExisting) {
      await writeFile(todoPath, todoNext, 'utf8');
      updatedFiles.push(todoPath);
    }
  }

  const stylistConfigPath = path.join(projectDir, 'stylist.config.json');
  const wroteConfig = await writeTextFileIfChanged(
    stylistConfigPath,
    `${JSON.stringify({ styleLibrary, writePolicy } satisfies StylistConfig, null, 2)}\n`
  );
  if (wroteConfig) {
    updatedFiles.push(stylistConfigPath);
  }

  return {
    projectPath,
    theme,
    updatedFiles,
    styleLibrary,
    writePolicy,
  };
}

const SYSTEM_FONT_FAMILIES = new Set([
  'system',
  'monospace',
  'sans-serif',
  'serif',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'arial',
  'helvetica',
  'times new roman',
  'georgia',
  'courier new',
]);

function normalizeFontFamilyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isSystemFontFamily(fontFamily: string): boolean {
  const normalized = normalizeFontFamilyName(fontFamily).toLowerCase();
  if (!normalized) {
    return true;
  }
  return SYSTEM_FONT_FAMILIES.has(normalized);
}

function toFontAssetBaseKey(fontFamily: string): string {
  const normalized = normalizeFontFamilyName(fontFamily);
  if (!normalized) {
    return 'System';
  }
  return normalized.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
}

function toFontAssetFileName(fontFamily: string, weight: 400 | 700): string {
  const base = toFontAssetBaseKey(fontFamily);
  return `${base}-${weight}.ttf`;
}

async function syncThemeFontAssets(projectPath: string, theme: StylistTheme): Promise<string[]> {
  const fontAssetsPath = path.join(projectPath, 'src', 'theme', 'font-assets.ts');

  const families = new Set<string>();
  for (const family of [
    theme.typography.fontDisplay,
    theme.typography.fontTitle,
    theme.typography.fontSubtitle,
    theme.typography.fontBody,
    theme.typography.fontCaption,
    theme.typography.fontMono,
  ]) {
    const normalized = normalizeFontFamilyName(family);
    if (normalized && !isSystemFontFamily(normalized)) {
      families.add(normalized);
    }
  }

  if (families.size === 0) {
    const wrote = await writeTextFileIfChanged(fontAssetsPath, renderFontAssetsFile(new Map()));
    return wrote ? [fontAssetsPath] : [];
  }

  const assetsDir = path.join(projectPath, 'assets', 'fonts');
  await mkdir(assetsDir, { recursive: true });

  const fontAssetEntries = new Map<string, string>();
  const updated: string[] = [];

  for (const family of families) {
    const css = await fetchGoogleFontsCss(family);
    const urls = parseTtfUrlsByWeight(css);
    const preferredWeights: Array<400 | 700> = [400, 700];
    const availableWeight = preferredWeights.find((weight) => urls.has(weight));
    if (!availableWeight) {
      continue;
    }

    const url = urls.get(availableWeight);
    if (!url) {
      continue;
    }

    const fileName = toFontAssetFileName(family, availableWeight);
    const destPath = path.join(assetsDir, fileName);
    if (!(await pathExists(destPath))) {
      const buffer = await downloadFontFile(url);
      await writeFile(destPath, buffer);
      updated.push(destPath);
    }

    const key = normalizeFontFamilyName(family);
    if (key) {
      fontAssetEntries.set(key, `../../assets/fonts/${fileName}`);
    }
  }

  const wroteAssetsFile = await writeTextFileIfChanged(
    fontAssetsPath,
    renderFontAssetsFile(fontAssetEntries)
  );
  if (wroteAssetsFile) {
    updated.push(fontAssetsPath);
  }

  return updated;
}

async function fetchGoogleFontsCss(fontFamily: string): Promise<string> {
  const familyParam = normalizeFontFamilyName(fontFamily).replace(/\s+/g, '+');
  const url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;700&display=swap`;
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('Global fetch is unavailable. Update Node to 18+ and retry.');
  }

  // Google Fonts varies the returned formats (woff2 vs ttf) based on user agent.
  // For native apps we need truetype/otf sources, so we try a couple of UAs until we see them.
  const userAgents: Array<string | null> = [null, 'curl/8.0.1', 'Mozilla/5.0'];
  let lastError: unknown = null;

  for (const userAgent of userAgents) {
    try {
      const response = await fetchFn(url, {
        headers: userAgent ? { 'user-agent': userAgent } : undefined,
      });
      if (!response.ok) {
        lastError = new Error(`Failed to download Google Fonts stylesheet for ${fontFamily}.`);
        continue;
      }
      const css = await response.text();
      if (css.includes('.ttf') || css.includes('.otf')) {
        return css;
      }
      lastError = new Error(
        `Google Fonts stylesheet for ${fontFamily} did not include truetype/otf sources.`
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load Google Fonts CSS.');
}

function parseTtfUrlsByWeight(css: string): Map<400 | 700, string> {
  const result = new Map<400 | 700, string>();
  const faceBlocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  for (const block of faceBlocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const weightValue = weightMatch ? Number.parseInt(weightMatch[1] ?? '', 10) : NaN;
    if (weightValue !== 400 && weightValue !== 700) {
      continue;
    }
    if (result.has(weightValue)) {
      continue;
    }
    const urlMatches = [...block.matchAll(/url\(([^)]+)\)/g)];
    const urls = urlMatches
      .map((match) => (match[1] ?? '').replace(/^['"]|['"]$/g, '').trim())
      .filter(Boolean);
    const asset = urls.find((value) => {
      const lowered = value.toLowerCase();
      return lowered.includes('.ttf') || lowered.includes('.otf');
    });
    if (asset) {
      result.set(weightValue, asset);
    }
  }
  return result;
}

async function downloadFontFile(url: string): Promise<Buffer> {
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('Global fetch is unavailable. Update Node to 18+ and retry.');
  }
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`Failed to download font file: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function renderFontAssetsFile(fontAssets: Map<string, string>): string {
  const entries = [...fontAssets.entries()].sort(([a], [b]) => a.localeCompare(b));
  const lines = entries.map(([key, relativePath]) => {
    const quotedKey = JSON.stringify(key);
    const quotedPath = JSON.stringify(relativePath);
    return `  ${quotedKey}: require(${quotedPath}),`;
  });

  return [
    'export const THEME_FONT_ASSETS: Record<string, number> = {',
    ...(lines.length ? lines : []),
    '};',
    '',
    'export default THEME_FONT_ASSETS;',
    '',
  ].join('\n');
}

export async function resolveStylistContext(
  projectPathInput: string,
  options: SyncStylistThemeOptions = {}
): Promise<StylistConfig> {
  const projectPath = path.resolve(projectPathInput);
  const stylistConfig = await loadStylistConfig(projectPath);
  const writePolicy = options.writePolicy ?? stylistConfig?.writePolicy ?? 'managed';

  let styleLibrary: StyleLibrary;
  if (options.styleLibrary && options.styleLibrary !== 'auto') {
    styleLibrary = options.styleLibrary;
  } else if (stylistConfig?.styleLibrary) {
    styleLibrary = stylistConfig.styleLibrary;
  } else {
    styleLibrary = await detectStyleLibrary(projectPath);
  }

  return { styleLibrary, writePolicy };
}

export async function loadStylistConfig(projectPathInput: string): Promise<StylistConfig | null> {
  const projectPath = path.resolve(projectPathInput);
  const configPath = path.join(projectPath, 'project', 'stylist.config.json');
  const raw = await readOptionalText(configPath);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const styleLibrary = parseStyleLibrary(parsed.styleLibrary);
    const writePolicy = parseWritePolicy(parsed.writePolicy);
    if (!styleLibrary || !writePolicy) {
      return null;
    }
    return { styleLibrary, writePolicy };
  } catch {
    return null;
  }
}

export async function detectStyleLibrary(projectPathInput: string): Promise<StyleLibrary> {
  const projectPath = path.resolve(projectPathInput);

  const fromCesConfig = await detectStyleLibraryFromCesConfig(projectPath);
  if (fromCesConfig) {
    return fromCesConfig;
  }

  const fromDeps = await detectStyleLibraryFromDependencies(projectPath);
  if (fromDeps) {
    return fromDeps;
  }

  const fromFiles = await detectStyleLibraryFromFiles(projectPath);
  if (fromFiles) {
    return fromFiles;
  }

  return 'stylesheet';
}

export async function loadStylistTheme(projectPathInput: string): Promise<StylistTheme> {
  const result = await loadStylistThemeWithDiagnostics(projectPathInput);
  return result.theme;
}

export async function loadStylistThemeWithDiagnostics(
  projectPathInput: string
): Promise<LoadStylistThemeResult> {
  const projectPath = path.resolve(projectPathInput);
  const themePath = path.join(projectPath, 'project', 'theme.json');
  const stylePath = path.join(projectPath, 'project', 'style.md');
  const themeRaw = await readOptionalText(themePath);
  const styleRaw = await readOptionalText(stylePath);

  const fromThemeJson = parseThemeJson(themeRaw);
  const fromStyleManaged = parseThemeFromStyleMarkdown(styleRaw);
  const mismatchDetected =
    fromThemeJson !== null &&
    fromStyleManaged !== null &&
    JSON.stringify(fromThemeJson) !== JSON.stringify(fromStyleManaged);

  if (fromThemeJson) {
    return {
      theme: fromThemeJson,
      diagnostics: { source: 'theme.json', mismatchDetected },
    };
  }
  if (fromStyleManaged) {
    return {
      theme: fromStyleManaged,
      diagnostics: { source: 'style.md', mismatchDetected: false },
    };
  }
  return {
    theme: DEFAULT_STYLIST_THEME,
    diagnostics: { source: 'default', mismatchDetected: false },
  };
}

export function normalizeStylistTheme(value: unknown): StylistTheme {
  if (!isRecord(value)) {
    throw new Error('Theme payload must be an object.');
  }

  if (value.version !== 1) {
    throw new Error('version must be 1.');
  }

  const colorSystem = ensureRecord(value.colorSystem, 'colorSystem');
  const families = ensureRecord(value.families, 'families');
  const familiesLight = ensureRecord(families.light, 'families.light');
  const familiesDark = ensureRecord(families.dark, 'families.dark');
  const palettes = ensureRecord(value.palettes, 'palettes');
  const paletteBg = ensureRecord(palettes.bg, 'palettes.bg');
  const paletteAutomatic = ensureRecord(palettes.automatic, 'palettes.automatic');
  const paletteBgLight = ensureRecord(paletteBg.light, 'palettes.bg.light');
  const paletteBgDark = ensureRecord(paletteBg.dark, 'palettes.bg.dark');
  const paletteAutomaticLight = ensureRecord(paletteAutomatic.light, 'palettes.automatic.light');
  const paletteAutomaticDark = ensureRecord(paletteAutomatic.dark, 'palettes.automatic.dark');
  const colors = ensureRecord(value.colors, 'colors');
  const colorsLight = ensureRecord(colors.light, 'colors.light');
  const colorsDark = ensureRecord(colors.dark, 'colors.dark');
  const typography = ensureRecord(value.typography, 'typography');
  const layout = ensureRecord(value.layout, 'layout');
  const spacing = ensureRecord(layout.spacing, 'layout.spacing');

  const theme: StylistTheme = {
    version: 1,
    colorSystem: {
      mode: ensureEnumValue(colorSystem.mode, 'colorSystem.mode', ['bg', 'automatic']),
      previewScheme: ensureEnumValue(colorSystem.previewScheme, 'colorSystem.previewScheme', [
        'light',
        'dark',
      ]),
      familyMode: ensureEnumValue(colorSystem.familyMode, 'colorSystem.familyMode', ['one', 'two']),
    },
    families: {
      light: ensureSemanticFamilies(familiesLight, 'families.light'),
      dark: ensureSemanticFamilies(familiesDark, 'families.dark'),
    },
    palettes: {
      bg: {
        light: ensureColorPalette(paletteBgLight, 'palettes.bg.light'),
        dark: ensureColorPalette(paletteBgDark, 'palettes.bg.dark'),
      },
      automatic: {
        light: ensureColorPalette(paletteAutomaticLight, 'palettes.automatic.light'),
        dark: ensureColorPalette(paletteAutomaticDark, 'palettes.automatic.dark'),
      },
    },
    colors: {
      light: ensureColorPalette(colorsLight, 'colors.light'),
      dark: ensureColorPalette(colorsDark, 'colors.dark'),
    },
    typography: {
      fontFamily: ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontDisplay:
        ensureOptionalNonEmptyString(typography.fontDisplay) ??
        ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontTitle:
        ensureOptionalNonEmptyString(typography.fontTitle) ??
        ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontSubtitle:
        ensureOptionalNonEmptyString(typography.fontSubtitle) ??
        ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontBody:
        ensureOptionalNonEmptyString(typography.fontBody) ??
        ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontCaption:
        ensureOptionalNonEmptyString(typography.fontCaption) ??
        ensureNonEmptyString(typography.fontFamily, 'typography.fontFamily'),
      fontMono: ensureOptionalNonEmptyString(typography.fontMono) ?? 'monospace',
      displaySize: ensureNumberInRange(typography.displaySize, 'typography.displaySize', 18, 72),
      headingSize: ensureNumberInRange(typography.headingSize, 'typography.headingSize', 14, 48),
      bodySize: ensureNumberInRange(typography.bodySize, 'typography.bodySize', 10, 24),
      captionSize: ensureNumberInRange(typography.captionSize, 'typography.captionSize', 10, 20),
    },
    layout: {
      radius: ensureNumberInRange(layout.radius, 'layout.radius', 0, 48),
      spacing: {
        xs: ensureNumberInRange(spacing.xs, 'layout.spacing.xs', 0, 64),
        sm: ensureNumberInRange(spacing.sm, 'layout.spacing.sm', 0, 96),
        md: ensureNumberInRange(spacing.md, 'layout.spacing.md', 0, 128),
        lg: ensureNumberInRange(spacing.lg, 'layout.spacing.lg', 0, 160),
        xl: ensureNumberInRange(spacing.xl, 'layout.spacing.xl', 0, 192),
      },
    },
  };

  ensureDistinctPalette(theme.palettes.bg.light, 'palettes.bg.light');
  ensureDistinctPalette(theme.palettes.bg.dark, 'palettes.bg.dark');
  ensureDistinctPalette(theme.palettes.automatic.light, 'palettes.automatic.light');
  ensureDistinctPalette(theme.palettes.automatic.dark, 'palettes.automatic.dark');

  const activePalettes =
    theme.colorSystem.mode === 'automatic' ? theme.palettes.automatic : theme.palettes.bg;
  theme.colors = {
    light: activePalettes.light,
    dark: activePalettes.dark,
  };

  ensureDistinctPalette(theme.colors.light, 'colors.light');
  ensureDistinctPalette(theme.colors.dark, 'colors.dark');

  return theme;
}

function renderStyleThemeBlock(theme: StylistTheme): string {
  return [
    STYLE_THEME_BLOCK_START,
    '## Canonical Theme Tokens (Managed by Stylist)',
    '',
    'The block below mirrors `project/theme.json` and is managed by `mds stylist sync`.',
    '',
    '```json',
    JSON.stringify(theme, null, 2),
    '```',
    STYLE_THEME_BLOCK_END,
  ].join('\n');
}

function parseThemeJson(raw: string | null): StylistTheme | null {
  if (!raw) {
    return null;
  }
  try {
    return normalizeStylistTheme(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function parseThemeFromStyleMarkdown(raw: string | null): StylistTheme | null {
  if (!raw) {
    return null;
  }
  const startIndex = raw.indexOf(STYLE_THEME_BLOCK_START);
  const endIndex = raw.indexOf(STYLE_THEME_BLOCK_END);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }
  const block = raw.slice(startIndex, endIndex + STYLE_THEME_BLOCK_END.length);
  const codeFenceMatch = block.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!codeFenceMatch?.[1]) {
    return null;
  }
  try {
    return normalizeStylistTheme(JSON.parse(codeFenceMatch[1]) as unknown);
  } catch {
    return null;
  }
}

export function renderGlobalCssThemeBlock(theme: StylistTheme): string {
  const light = theme.colors.light;
  const dark = theme.colors.dark;
  return [
    GLOBAL_CSS_THEME_BLOCK_START,
    ':root {',
    `  --color-background: ${light.background};`,
    `  --color-surface: ${light.surface};`,
    `  --color-typography: ${light.text};`,
    `  --color-primary: ${light.primary};`,
    `  --color-secondary: ${light.secondary};`,
    `  --color-success: ${light.success};`,
    `  --color-warning: ${light.warning};`,
    `  --radius-md: ${theme.layout.radius}px;`,
    `  --spacing-1: ${theme.layout.spacing.xs}px;`,
    `  --spacing-2: ${theme.layout.spacing.sm}px;`,
    `  --spacing-4: ${theme.layout.spacing.md}px;`,
    `  --spacing-6: ${theme.layout.spacing.lg}px;`,
    `  --spacing-8: ${theme.layout.spacing.xl}px;`,
    `  --font-size-display: ${theme.typography.displaySize}px;`,
    `  --font-size-heading: ${theme.typography.headingSize}px;`,
    `  --font-size-body: ${theme.typography.bodySize}px;`,
    `  --font-size-caption: ${theme.typography.captionSize}px;`,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root {',
    `    --color-background: ${dark.background};`,
    `    --color-surface: ${dark.surface};`,
    `    --color-typography: ${dark.text};`,
    `    --color-primary: ${dark.primary};`,
    `    --color-secondary: ${dark.secondary};`,
    `    --color-success: ${dark.success};`,
    `    --color-warning: ${dark.warning};`,
    '  }',
    '}',
    '',
    '.stylist-theme-root {',
    '  background-color: var(--color-background);',
    '  color: var(--color-typography);',
    '}',
    GLOBAL_CSS_THEME_BLOCK_END,
  ].join('\n');
}

export function renderThemeTokensFile(theme: StylistTheme): string {
  return [
    "export type StylistColorScheme = 'light' | 'dark';",
    "export type StylistColorMode = 'bg' | 'automatic';",
    "export type StylistFamilyMode = 'one' | 'two';",
    '',
    'export interface StylistColorPalette {',
    '  background: string;',
    '  surface: string;',
    '  text: string;',
    '  primary: string;',
    '  secondary: string;',
    '  success: string;',
    '  warning: string;',
    '}',
    '',
    'export interface StylistSemanticFamilies {',
    '  primary: string;',
    '  secondary: string;',
    '  success: string;',
    '  warning: string;',
    '}',
    '',
    'export interface StylistThemeTokens {',
    '  version: 1;',
    '  colorSystem: {',
    '    mode: StylistColorMode;',
    '    previewScheme: StylistColorScheme;',
    '    familyMode: StylistFamilyMode;',
    '  };',
    '  families: {',
    '    light: StylistSemanticFamilies;',
    '    dark: StylistSemanticFamilies;',
    '  };',
    '  palettes: {',
    '    bg: {',
    '      light: StylistColorPalette;',
    '      dark: StylistColorPalette;',
    '    };',
    '    automatic: {',
    '      light: StylistColorPalette;',
    '      dark: StylistColorPalette;',
    '    };',
    '  };',
    '  colors: {',
    '    light: StylistColorPalette;',
    '    dark: StylistColorPalette;',
    '  };',
    '  typography: {',
    '    fontFamily: string;',
    '    fontDisplay: string;',
    '    fontTitle: string;',
    '    fontSubtitle: string;',
    '    fontBody: string;',
    '    fontCaption: string;',
    '    fontMono: string;',
    '    displaySize: number;',
    '    headingSize: number;',
    '    bodySize: number;',
    '    captionSize: number;',
    '  };',
    '  layout: {',
    '    radius: number;',
    '    spacing: {',
    '      xs: number;',
    '      sm: number;',
    '      md: number;',
    '      lg: number;',
    '      xl: number;',
    '    };',
    '  };',
    '}',
    '',
    `export const stylistThemeTokens: StylistThemeTokens = ${renderTsLiteral(theme)};`,
    '',
    'export default stylistThemeTokens;',
    '',
  ].join('\n');
}

function renderTsLiteral(value: unknown, indent = 0): string {
  if (typeof value === 'string') {
    return `'${value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const nextIndent = indent + 2;
    const entries = value.map(
      (item) => `${' '.repeat(nextIndent)}${renderTsLiteral(item, nextIndent)},`
    );
    return `[\n${entries.join('\n')}\n${' '.repeat(indent)}]`;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const nextIndent = indent + 2;
    const rendered = entries.map(([key, item]) => {
      return `${' '.repeat(nextIndent)}${formatTsObjectKey(key)}: ${renderTsLiteral(item, nextIndent)},`;
    });
    return `{\n${rendered.join('\n')}\n${' '.repeat(indent)}}`;
  }

  return 'undefined';
}

function formatTsObjectKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : renderTsLiteral(key);
}

async function syncStyleLibraryOutputs(
  projectPath: string,
  theme: StylistTheme,
  styleLibrary: StyleLibrary,
  writePolicy: WritePolicy
): Promise<string[]> {
  switch (styleLibrary) {
    case 'uniwind':
      return [await writeCssAdapter(projectPath, theme, styleLibrary, writePolicy)];
    case 'nativewind':
      return [await writeCssAdapter(projectPath, theme, styleLibrary, writePolicy)];
    case 'nativewindui':
      return [await writeCssAdapter(projectPath, theme, styleLibrary, writePolicy)];
    case 'unistyles':
      return [await writeUnistylesThemeFile(projectPath, theme, writePolicy)];
    case 'restyle':
      return [await writeRestyleThemeFile(projectPath, theme, writePolicy)];
    case 'tamagui':
      return [await writeTamaguiThemeFile(projectPath, theme, writePolicy)];
    case 'stylesheet':
    default:
      return [];
  }
}

async function writeCssAdapter(
  projectPath: string,
  theme: StylistTheme,
  styleLibrary: 'uniwind' | 'nativewind' | 'nativewindui',
  writePolicy: WritePolicy
): Promise<string> {
  const globalCssPath = path.join(projectPath, 'global.css');
  const existing = (await readOptionalText(globalCssPath)) ?? '';
  const defaultScaffold = renderDefaultCssScaffold(styleLibrary);
  let next = existing;

  if (writePolicy === 'overwrite') {
    if (styleLibrary === 'nativewindui') {
      next = `${defaultScaffold}\n\n${renderNativewindUiGlobalCssThemeBlock(theme)}\n`;
    } else {
      next = `${defaultScaffold}\n\n${renderGlobalCssThemeBlock(theme)}\n`;
    }
    await writeTextFileIfChanged(globalCssPath, normalizeTrailingNewline(next));
    return globalCssPath;
  }

  if (!next.trim()) {
    next = defaultScaffold;
  }

  if (styleLibrary === 'nativewindui') {
    next = upsertManagedBlock(
      next,
      NATIVEWIND_UI_THEME_BLOCK_START,
      NATIVEWIND_UI_THEME_BLOCK_END,
      renderNativewindUiGlobalCssThemeBlock(theme)
    );
  } else {
    next = upsertManagedBlock(
      next,
      GLOBAL_CSS_THEME_BLOCK_START,
      GLOBAL_CSS_THEME_BLOCK_END,
      renderGlobalCssThemeBlock(theme)
    );
  }

  await writeTextFileIfChanged(globalCssPath, normalizeTrailingNewline(next));
  return globalCssPath;
}

async function writeUnistylesThemeFile(
  projectPath: string,
  theme: StylistTheme,
  writePolicy: WritePolicy
): Promise<string> {
  const themePath = path.join(projectPath, 'theme.ts');
  const existing = (await readOptionalText(themePath)) ?? '';
  const block = renderUnistylesManagedBlock(theme);
  let next = existing;

  if (writePolicy === 'overwrite' || !existing.trim()) {
    next = renderUnistylesThemeFile(theme);
  } else {
    next = upsertManagedBlock(next, UNISTYLES_THEME_BLOCK_START, UNISTYLES_THEME_BLOCK_END, block);
  }

  await writeTextFileIfChanged(themePath, normalizeTrailingNewline(next));
  return themePath;
}

async function writeRestyleThemeFile(
  projectPath: string,
  theme: StylistTheme,
  writePolicy: WritePolicy
): Promise<string> {
  const themePath = path.join(projectPath, 'theme.ts');
  const existing = (await readOptionalText(themePath)) ?? '';
  const block = renderRestyleManagedBlock(theme);
  let next = existing;

  if (writePolicy === 'overwrite' || !existing.trim()) {
    next = renderRestyleThemeFile(theme);
  } else {
    next = upsertManagedBlock(next, RESTYLE_THEME_BLOCK_START, RESTYLE_THEME_BLOCK_END, block);
  }

  await writeTextFileIfChanged(themePath, normalizeTrailingNewline(next));
  return themePath;
}

async function writeTamaguiThemeFile(
  projectPath: string,
  theme: StylistTheme,
  writePolicy: WritePolicy
): Promise<string> {
  const targetPath = path.join(projectPath, 'tamagui.tokens.ts');
  const existing = (await readOptionalText(targetPath)) ?? '';
  let next = existing;

  if (writePolicy === 'overwrite' || !existing.trim()) {
    next = renderTamaguiTokenFile(theme);
  } else {
    next = upsertManagedBlock(
      next,
      TAMAGUI_THEME_BLOCK_START,
      TAMAGUI_THEME_BLOCK_END,
      renderTamaguiManagedBlock(theme)
    );
  }

  await writeTextFileIfChanged(targetPath, normalizeTrailingNewline(next));
  return targetPath;
}

function renderNativewindUiGlobalCssThemeBlock(theme: StylistTheme): string {
  const light = theme.colors.light;
  const dark = theme.colors.dark;
  return [
    NATIVEWIND_UI_THEME_BLOCK_START,
    '@layer base {',
    '  :root {',
    `    --background: ${toRgbSpaceSeparated(light.background)};`,
    `    --foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --card: ${toRgbSpaceSeparated(light.surface)};`,
    `    --card-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --popover: ${toRgbSpaceSeparated(light.surface)};`,
    `    --popover-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --primary: ${toRgbSpaceSeparated(light.primary)};`,
    '    --primary-foreground: 255 255 255;',
    `    --secondary: ${toRgbSpaceSeparated(light.secondary)};`,
    '    --secondary-foreground: 255 255 255;',
    `    --muted: ${toRgbSpaceSeparated(light.surface)};`,
    `    --muted-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --accent: ${toRgbSpaceSeparated(light.secondary)};`,
    '    --accent-foreground: 255 255 255;',
    `    --destructive: ${toRgbSpaceSeparated(light.warning)};`,
    '    --destructive-foreground: 255 255 255;',
    `    --border: ${toRgbSpaceSeparated(light.surface)};`,
    `    --input: ${toRgbSpaceSeparated(light.surface)};`,
    `    --ring: ${toRgbSpaceSeparated(light.primary)};`,
    '',
    `    --android-background: ${toRgbSpaceSeparated(light.background)};`,
    `    --android-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --android-card: ${toRgbSpaceSeparated(light.surface)};`,
    `    --android-card-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --android-popover: ${toRgbSpaceSeparated(light.surface)};`,
    `    --android-popover-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --android-primary: ${toRgbSpaceSeparated(light.primary)};`,
    '    --android-primary-foreground: 255 255 255;',
    `    --android-secondary: ${toRgbSpaceSeparated(light.secondary)};`,
    '    --android-secondary-foreground: 255 255 255;',
    `    --android-muted: ${toRgbSpaceSeparated(light.surface)};`,
    `    --android-muted-foreground: ${toRgbSpaceSeparated(light.text)};`,
    `    --android-accent: ${toRgbSpaceSeparated(light.secondary)};`,
    '    --android-accent-foreground: 255 255 255;',
    `    --android-destructive: ${toRgbSpaceSeparated(light.warning)};`,
    '    --android-destructive-foreground: 255 255 255;',
    `    --android-border: ${toRgbSpaceSeparated(light.surface)};`,
    `    --android-input: ${toRgbSpaceSeparated(light.surface)};`,
    `    --android-ring: ${toRgbSpaceSeparated(light.primary)};`,
    '  }',
    '',
    '  @media (prefers-color-scheme: dark) {',
    '    :root {',
    `      --background: ${toRgbSpaceSeparated(dark.background)};`,
    `      --foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --card: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --card-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --popover: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --popover-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --primary: ${toRgbSpaceSeparated(dark.primary)};`,
    '      --primary-foreground: 255 255 255;',
    `      --secondary: ${toRgbSpaceSeparated(dark.secondary)};`,
    '      --secondary-foreground: 255 255 255;',
    `      --muted: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --muted-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --accent: ${toRgbSpaceSeparated(dark.secondary)};`,
    '      --accent-foreground: 255 255 255;',
    `      --destructive: ${toRgbSpaceSeparated(dark.warning)};`,
    '      --destructive-foreground: 255 255 255;',
    `      --border: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --input: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --ring: ${toRgbSpaceSeparated(dark.primary)};`,
    '',
    `      --android-background: ${toRgbSpaceSeparated(dark.background)};`,
    `      --android-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --android-card: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --android-card-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --android-popover: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --android-popover-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --android-primary: ${toRgbSpaceSeparated(dark.primary)};`,
    '      --android-primary-foreground: 255 255 255;',
    `      --android-secondary: ${toRgbSpaceSeparated(dark.secondary)};`,
    '      --android-secondary-foreground: 255 255 255;',
    `      --android-muted: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --android-muted-foreground: ${toRgbSpaceSeparated(dark.text)};`,
    `      --android-accent: ${toRgbSpaceSeparated(dark.secondary)};`,
    '      --android-accent-foreground: 255 255 255;',
    `      --android-destructive: ${toRgbSpaceSeparated(dark.warning)};`,
    '      --android-destructive-foreground: 255 255 255;',
    `      --android-border: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --android-input: ${toRgbSpaceSeparated(dark.surface)};`,
    `      --android-ring: ${toRgbSpaceSeparated(dark.primary)};`,
    '    }',
    '  }',
    '}',
    NATIVEWIND_UI_THEME_BLOCK_END,
  ].join('\n');
}

function renderUnistylesManagedBlock(theme: StylistTheme): string {
  const light = theme.colors.light;
  const dark = theme.colors.dark;
  return [
    UNISTYLES_THEME_BLOCK_START,
    'export const lightTheme = {',
    '  colors: {',
    `    typography: '${light.text}',`,
    `    background: '${light.background}',`,
    `    primary: '${light.primary}',`,
    `    secondary: '${light.secondary}',`,
    `    success: '${light.success}',`,
    `    warning: '${light.warning}',`,
    `    surface: '${light.surface}',`,
    '  },',
    '  spacing: {',
    `    xs: ${theme.layout.spacing.xs},`,
    `    sm: ${theme.layout.spacing.sm},`,
    `    md: ${theme.layout.spacing.md},`,
    `    lg: ${theme.layout.spacing.lg},`,
    `    xl: ${theme.layout.spacing.xl},`,
    '  },',
    '  radius: {',
    `    md: ${theme.layout.radius},`,
    '  },',
    '} as const;',
    '',
    'export const darkTheme = {',
    '  colors: {',
    `    typography: '${dark.text}',`,
    `    background: '${dark.background}',`,
    `    primary: '${dark.primary}',`,
    `    secondary: '${dark.secondary}',`,
    `    success: '${dark.success}',`,
    `    warning: '${dark.warning}',`,
    `    surface: '${dark.surface}',`,
    '  },',
    '  spacing: {',
    `    xs: ${theme.layout.spacing.xs},`,
    `    sm: ${theme.layout.spacing.sm},`,
    `    md: ${theme.layout.spacing.md},`,
    `    lg: ${theme.layout.spacing.lg},`,
    `    xl: ${theme.layout.spacing.xl},`,
    '  },',
    '  radius: {',
    `    md: ${theme.layout.radius},`,
    '  },',
    '} as const;',
    UNISTYLES_THEME_BLOCK_END,
  ].join('\n');
}

function renderUnistylesThemeFile(theme: StylistTheme): string {
  return `${renderUnistylesManagedBlock(theme)}\n`;
}

function renderRestyleManagedBlock(theme: StylistTheme): string {
  const light = theme.colors.light;
  return [
    RESTYLE_THEME_BLOCK_START,
    "import { createTheme } from '@shopify/restyle';",
    '',
    'export const theme = createTheme({',
    '  colors: {',
    `    background: '${light.background}',`,
    `    text: '${light.text}',`,
    `    muted: '${light.surface}',`,
    `    primary: '${light.primary}',`,
    `    border: '${light.secondary}',`,
    `    success: '${light.success}',`,
    `    warning: '${light.warning}',`,
    '  },',
    '  spacing: {',
    `    xs: ${theme.layout.spacing.xs},`,
    `    sm: ${theme.layout.spacing.sm},`,
    `    md: ${theme.layout.spacing.md},`,
    `    lg: ${theme.layout.spacing.lg},`,
    `    xl: ${theme.layout.spacing.xl},`,
    '  },',
    '  borderRadii: {',
    `    md: ${theme.layout.radius},`,
    '  },',
    '  textVariants: {',
    '    defaults: {',
    "      color: 'text',",
    `      fontSize: ${theme.typography.bodySize},`,
    '    },',
    '    header: {',
    "      color: 'text',",
    `      fontSize: ${theme.typography.headingSize},`,
    "      fontWeight: '700',",
    '    },',
    '    body: {',
    "      color: 'text',",
    `      fontSize: ${theme.typography.bodySize},`,
    '    },',
    '    muted: {',
    "      color: 'muted',",
    `      fontSize: ${theme.typography.captionSize},`,
    '    },',
    '  },',
    '  breakpoints: {',
    '    phone: 0,',
    '    tablet: 768,',
    '  },',
    '});',
    '',
    'export type Theme = typeof theme;',
    RESTYLE_THEME_BLOCK_END,
  ].join('\n');
}

function renderRestyleThemeFile(theme: StylistTheme): string {
  return `${renderRestyleManagedBlock(theme)}\n`;
}

function renderTamaguiManagedBlock(theme: StylistTheme): string {
  const light = theme.colors.light;
  const dark = theme.colors.dark;
  return [
    TAMAGUI_THEME_BLOCK_START,
    'export const mdsTamaguiThemeTokens = {',
    '  radius: {',
    `    md: ${theme.layout.radius},`,
    '  },',
    '  size: {',
    `    display: ${theme.typography.displaySize},`,
    `    heading: ${theme.typography.headingSize},`,
    `    body: ${theme.typography.bodySize},`,
    `    caption: ${theme.typography.captionSize},`,
    '  },',
    '  space: {',
    `    xs: ${theme.layout.spacing.xs},`,
    `    sm: ${theme.layout.spacing.sm},`,
    `    md: ${theme.layout.spacing.md},`,
    `    lg: ${theme.layout.spacing.lg},`,
    `    xl: ${theme.layout.spacing.xl},`,
    '  },',
    '  color: {',
    '    light: {',
    `      background: '${light.background}',`,
    `      surface: '${light.surface}',`,
    `      text: '${light.text}',`,
    `      primary: '${light.primary}',`,
    `      secondary: '${light.secondary}',`,
    `      success: '${light.success}',`,
    `      warning: '${light.warning}',`,
    '    },',
    '    dark: {',
    `      background: '${dark.background}',`,
    `      surface: '${dark.surface}',`,
    `      text: '${dark.text}',`,
    `      primary: '${dark.primary}',`,
    `      secondary: '${dark.secondary}',`,
    `      success: '${dark.success}',`,
    `      warning: '${dark.warning}',`,
    '    },',
    '  },',
    '} as const;',
    TAMAGUI_THEME_BLOCK_END,
  ].join('\n');
}

function renderTamaguiTokenFile(theme: StylistTheme): string {
  return `${renderTamaguiManagedBlock(theme)}\n`;
}

function renderDefaultCssScaffold(styleLibrary: 'uniwind' | 'nativewind' | 'nativewindui'): string {
  if (styleLibrary === 'uniwind') {
    return ["@import 'tailwindcss';", "@import 'uniwind';"].join('\n');
  }
  return ['@tailwind base;', '@tailwind components;', '@tailwind utilities;'].join('\n');
}

function toRgbSpaceSeparated(hex: string): string {
  const normalized = hex.replace('#', '').trim();
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function ensureThemeTodoTask(todo: string): string {
  return todo;
}

function renderDefaultStyleMarkdown(): string {
  return [
    '# Style',
    '',
    '## Visual Direction',
    '',
    '- Managed collaboratively through `project/theme.json` and the Stylist page.',
    '',
    '## Colors',
    '',
    '- Add additional brand constraints here when needed.',
    '',
    '## Typography',
    '',
    '- Add preferred font families and readability guidance.',
    '',
    '## Layout/Spacing',
    '',
    '- Capture density, spacing rhythm, and border radius guidance.',
    '',
  ].join('\n');
}

function upsertManagedBlock(
  source: string,
  startToken: string,
  endToken: string,
  replacementBlock: string
): string {
  const startIndex = source.indexOf(startToken);
  const endIndex = source.indexOf(endToken);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = source.slice(0, startIndex).trimEnd();
    const after = source.slice(endIndex + endToken.length).trimStart();
    const merged = `${before}\n\n${replacementBlock}\n\n${after}`.trim();
    return `${merged}\n`;
  }

  const trimmed = source.trimEnd();
  if (!trimmed) {
    return `${replacementBlock}\n`;
  }
  return `${trimmed}\n\n${replacementBlock}\n`;
}

async function detectStyleLibraryFromCesConfig(projectPath: string): Promise<StyleLibrary | null> {
  const cesPath = path.join(projectPath, 'cesconfig.jsonc');
  const raw = await readOptionalText(cesPath);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(stripJsonComments(raw)) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const packages = Array.isArray(parsed.packages) ? parsed.packages : [];
    for (const item of packages) {
      if (!isRecord(item)) {
        continue;
      }
      if (item.type !== 'styling') {
        continue;
      }
      const detected = parseStyleLibrary(item.name);
      if (detected) {
        return detected;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function detectStyleLibraryFromDependencies(
  projectPath: string
): Promise<StyleLibrary | null> {
  const packagePath = path.join(projectPath, 'package.json');
  const raw = await readOptionalText(packagePath);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    const dependencies = isRecord(parsed.dependencies) ? parsed.dependencies : {};
    const devDependencies = isRecord(parsed.devDependencies) ? parsed.devDependencies : {};
    const depKeys = new Set<string>([
      ...Object.keys(dependencies),
      ...Object.keys(devDependencies),
    ]);

    if (depKeys.has('uniwind')) return 'uniwind';
    if (depKeys.has('@shopify/restyle')) return 'restyle';
    if (depKeys.has('tamagui') || depKeys.has('@tamagui/config')) return 'tamagui';
    if (depKeys.has('react-native-unistyles')) return 'unistyles';
    if (depKeys.has('nativewindui') || depKeys.has('@roninoss/nativewindui')) return 'nativewindui';
    if (depKeys.has('nativewind')) {
      const hasNativewindUiTree =
        (await pathExists(path.join(projectPath, 'components', 'nativewindui'))) ||
        (await pathExists(path.join(projectPath, 'src', 'components', 'nativewindui')));
      return hasNativewindUiTree ? 'nativewindui' : 'nativewind';
    }
  } catch {
    return null;
  }

  return null;
}

async function detectStyleLibraryFromFiles(projectPath: string): Promise<StyleLibrary | null> {
  const globalCss = await readOptionalText(path.join(projectPath, 'global.css'));
  if (globalCss) {
    if (globalCss.includes("@import 'uniwind'") || globalCss.includes('@import "uniwind"')) {
      return 'uniwind';
    }
    if (globalCss.includes('@tailwind base') || globalCss.includes('@tailwind components')) {
      if (globalCss.includes('--android-background') || globalCss.includes('--android-primary')) {
        return 'nativewindui';
      }
      return 'nativewind';
    }
  }

  if (await pathExists(path.join(projectPath, 'tamagui.config.ts'))) {
    return 'tamagui';
  }
  if (await pathExists(path.join(projectPath, 'theme.ts'))) {
    const themeFile = await readOptionalText(path.join(projectPath, 'theme.ts'));
    if (themeFile?.includes('createTheme(') && themeFile.includes('@shopify/restyle')) {
      return 'restyle';
    }
    if (themeFile?.includes('lightTheme') && themeFile.includes('darkTheme')) {
      return 'unistyles';
    }
  }

  return null;
}

function stripJsonComments(raw: string): string {
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function parseStyleLibrary(value: unknown): StyleLibrary | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'uniwind':
    case 'nativewind':
    case 'nativewindui':
    case 'unistyles':
    case 'restyle':
    case 'tamagui':
    case 'stylesheet':
      return normalized;
    default:
      return null;
  }
}

function parseWritePolicy(value: unknown): WritePolicy | null {
  if (value === 'managed' || value === 'overwrite') {
    return value;
  }
  return null;
}

function normalizeTrailingNewline(value: string): string {
  return `${value.replace(/\s+$/, '')}\n`;
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function writeTextFileIfChanged(filePath: string, contents: string): Promise<boolean> {
  const existing = await readOptionalText(filePath);
  if (existing === contents) {
    return false;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
  return true;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function ensureHexColor(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string hex color.`);
  }

  const normalized = value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`${label} must use #RRGGBB format.`);
  }

  return normalized.toLowerCase();
}

function ensureNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function ensureOptionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ensureNumberInRange(
  value: unknown,
  label: string,
  minInclusive: number,
  maxInclusive: number
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a number.`);
  }

  if (value < minInclusive || value > maxInclusive) {
    throw new Error(`${label} must be between ${minInclusive} and ${maxInclusive}.`);
  }

  return Math.round(value * 1000) / 1000;
}

function ensureColorPalette(value: Record<string, unknown>, label: string): StylistColorPalette {
  const palette: StylistColorPalette = {
    background: ensureHexColor(value.background, `${label}.background`),
    surface: ensureHexColor(value.surface, `${label}.surface`),
    text: ensureHexColor(value.text, `${label}.text`),
    primary: ensureHexColor(value.primary, `${label}.primary`),
    secondary: ensureHexColor(value.secondary, `${label}.secondary`),
    success: ensureHexColor(value.success, `${label}.success`),
    warning: ensureHexColor(value.warning, `${label}.warning`),
  };

  return palette;
}

function ensureDistinctPalette(palette: StylistColorPalette, label: string): void {
  if (palette.background === palette.surface) {
    throw new Error(`${label}.background and ${label}.surface cannot match.`);
  }
}

function ensureSemanticFamilies(
  value: Record<string, unknown>,
  label: string
): StylistSemanticFamilies {
  return {
    primary: ensureNonEmptyString(value.primary, `${label}.primary`),
    secondary: ensureNonEmptyString(value.secondary, `${label}.secondary`),
    success: ensureNonEmptyString(value.success, `${label}.success`),
    warning: ensureNonEmptyString(value.warning, `${label}.warning`),
  };
}

function ensureEnumValue<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[]
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
  }

  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
