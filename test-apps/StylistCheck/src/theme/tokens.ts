export type StylistColorScheme = 'light' | 'dark';
export type StylistColorMode = 'bg' | 'automatic';
export type StylistFamilyMode = 'one' | 'two';

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

export interface StylistThemeTokens {
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

export const stylistThemeTokens: StylistThemeTokens = {
  "version": 1,
  "colorSystem": {
    "mode": "bg",
    "previewScheme": "light",
    "familyMode": "one"
  },
  "families": {
    "light": {
      "primary": "blue",
      "secondary": "violet",
      "success": "emerald",
      "warning": "amber"
    },
    "dark": {
      "primary": "blue",
      "secondary": "violet",
      "success": "emerald",
      "warning": "amber"
    }
  },
  "palettes": {
    "bg": {
      "light": {
        "background": "#f8fafc",
        "surface": "#e2e8f0",
        "text": "#111827",
        "primary": "#2563eb",
        "secondary": "#7c3aed",
        "success": "#16a34a",
        "warning": "#f97316"
      },
      "dark": {
        "background": "#09090b",
        "surface": "#18181b",
        "text": "#f8fafc",
        "primary": "#60a5fa",
        "secondary": "#a78bfa",
        "success": "#4ade80",
        "warning": "#fb923c"
      }
    },
    "automatic": {
      "light": {
        "background": "#eff6ff",
        "surface": "#dbeafe",
        "text": "#1e3a8a",
        "primary": "#3b82f6",
        "secondary": "#8b5cf6",
        "success": "#10b981",
        "warning": "#f59e0b"
      },
      "dark": {
        "background": "#172554",
        "surface": "#1e3a8a",
        "text": "#eff6ff",
        "primary": "#60a5fa",
        "secondary": "#a78bfa",
        "success": "#34d399",
        "warning": "#fbbf24"
      }
    }
  },
  "colors": {
    "light": {
      "background": "#f8fafc",
      "surface": "#e2e8f0",
      "text": "#111827",
      "primary": "#2563eb",
      "secondary": "#7c3aed",
      "success": "#16a34a",
      "warning": "#f97316"
    },
    "dark": {
      "background": "#09090b",
      "surface": "#18181b",
      "text": "#f8fafc",
      "primary": "#60a5fa",
      "secondary": "#a78bfa",
      "success": "#4ade80",
      "warning": "#fb923c"
    }
  },
  "typography": {
    "fontFamily": "System",
    "displaySize": 32,
    "headingSize": 20,
    "bodySize": 15,
    "captionSize": 12
  },
  "layout": {
    "radius": 12,
    "spacing": {
      "xs": 4,
      "sm": 8,
      "md": 16,
      "lg": 24,
      "xl": 32
    }
  }
};

export default stylistThemeTokens;
