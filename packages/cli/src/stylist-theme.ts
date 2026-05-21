import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StylistColorScheme = 'light' | 'dark';
export type StylistColorMode = 'bg' | 'automatic';
export type StylistFamilyMode = 'one' | 'two';
export type StylistSemanticColorKey = 'primary' | 'secondary' | 'success' | 'warning';

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

export interface SyncStylistThemeResult {
  projectPath: string;
  theme: StylistTheme;
  updatedFiles: string[];
}

const STYLE_THEME_BLOCK_START = '<!-- MDS_STYLIST_THEME_START -->';
const STYLE_THEME_BLOCK_END = '<!-- MDS_STYLIST_THEME_END -->';
const GLOBAL_CSS_THEME_BLOCK_START = '/* MDS_STYLIST_THEME_START */';
const GLOBAL_CSS_THEME_BLOCK_END = '/* MDS_STYLIST_THEME_END */';
const TODO_THEME_TASK =
  "- [ ] Apply Stylist synced theme tokens to production UI components and screens.";

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
  payload: unknown
): Promise<SyncStylistThemeResult> {
  const projectPath = path.resolve(projectPathInput);
  const projectDir = path.join(projectPath, 'project');
  const updatedFiles: string[] = [];
  await mkdir(projectDir, { recursive: true });

  const theme = normalizeStylistTheme(payload);
  const themePath = path.join(projectDir, 'theme.json');
  await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`, 'utf8');
  updatedFiles.push(themePath);

  const stylePath = path.join(projectDir, 'style.md');
  const styleExisting = await readOptionalText(stylePath);
  const styleNext = upsertManagedBlock(
    styleExisting ?? renderDefaultStyleMarkdown(),
    STYLE_THEME_BLOCK_START,
    STYLE_THEME_BLOCK_END,
    renderStyleThemeBlock(theme)
  );
  await writeFile(stylePath, styleNext, 'utf8');
  updatedFiles.push(stylePath);

  const globalCssPath = path.join(projectPath, 'global.css');
  const globalCssExisting = await readOptionalText(globalCssPath);
  const globalCssBase = globalCssExisting ?? ["@import 'tailwindcss';", "@import 'uniwind';", ''].join('\n');
  const globalCssNext = upsertManagedBlock(
    globalCssBase,
    GLOBAL_CSS_THEME_BLOCK_START,
    GLOBAL_CSS_THEME_BLOCK_END,
    renderGlobalCssThemeBlock(theme)
  );
  await writeFile(globalCssPath, globalCssNext, 'utf8');
  updatedFiles.push(globalCssPath);

  const tokensPath = path.join(projectPath, 'src', 'theme', 'tokens.ts');
  await mkdir(path.dirname(tokensPath), { recursive: true });
  await writeFile(tokensPath, renderThemeTokensFile(theme), 'utf8');
  updatedFiles.push(tokensPath);

  const todoPath = path.join(projectDir, 'todo.md');
  const todoExisting = await readOptionalText(todoPath);
  if (todoExisting) {
    const todoNext = ensureThemeTodoTask(todoExisting);
    if (todoNext !== todoExisting) {
      await writeFile(todoPath, todoNext, 'utf8');
      updatedFiles.push(todoPath);
    }
  }

  return {
    projectPath,
    theme,
    updatedFiles,
  };
}

export async function loadStylistTheme(projectPathInput: string): Promise<StylistTheme> {
  const projectPath = path.resolve(projectPathInput);
  const themePath = path.join(projectPath, 'project', 'theme.json');
  const existing = await readOptionalText(themePath);
  if (!existing) {
    return DEFAULT_STYLIST_THEME;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(existing) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse project/theme.json: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return normalizeStylistTheme(parsed);
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
      previewScheme: ensureEnumValue(colorSystem.previewScheme, 'colorSystem.previewScheme', ['light', 'dark']),
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
    `export const stylistThemeTokens: StylistThemeTokens = ${JSON.stringify(theme, null, 2)};`,
    '',
    'export default stylistThemeTokens;',
    '',
  ].join('\n');
}

function ensureThemeTodoTask(todo: string): string {
  if (todo.includes(TODO_THEME_TASK)) {
    return todo;
  }

  const lines = todo.split(/\r?\n/);
  const phaseOneIndex = lines.findIndex((line) => /^##\s+Phase 1\b/i.test(line.trim()));
  if (phaseOneIndex === -1) {
    return `${todo.trimEnd()}\n${TODO_THEME_TASK}\n`;
  }

  const insertionIndex = findSectionEnd(lines, phaseOneIndex);
  lines.splice(insertionIndex, 0, TODO_THEME_TASK);
  return `${lines.join('\n').replace(/\s+$/, '')}\n`;
}

function findSectionEnd(lines: string[], startHeadingIndex: number): number {
  for (let i = startHeadingIndex + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i] ?? '')) {
      return i;
    }
  }

  return lines.length;
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
  return `${trimmed}\n\n${replacementBlock}\n`;
}

async function readOptionalText(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
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

function ensureSemanticFamilies(value: Record<string, unknown>, label: string): StylistSemanticFamilies {
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
