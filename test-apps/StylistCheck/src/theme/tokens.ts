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
      "primary": "neutral",
      "secondary": "violet",
      "success": "emerald",
      "warning": "amber"
    },
    "dark": {
      "primary": "neutral",
      "secondary": "violet",
      "success": "emerald",
      "warning": "amber"
    }
  },
  "palettes": {
    "bg": {
      "light": {
        "background": "#62748e",
        "surface": "#f3f4f6",
        "text": "#0f172b",
        "primary": "#2b7fff",
        "secondary": "#2b7fff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#62748e",
        "surface": "#f3f4f6",
        "text": "#0f172b",
        "primary": "#2b7fff",
        "secondary": "#2b7fff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      }
    },
    "automatic": {
      "light": {
        "background": "#fafafa",
        "surface": "#f5f5f5",
        "text": "#171717",
        "primary": "#737373",
        "secondary": "#8e51ff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#0a0a0a",
        "surface": "#171717",
        "text": "#e5e5e5",
        "primary": "#737373",
        "secondary": "#8e51ff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      }
    }
  },
  "colors": {
    "light": {
      "background": "#62748e",
      "surface": "#f3f4f6",
      "text": "#0f172b",
      "primary": "#2b7fff",
      "secondary": "#2b7fff",
      "success": "#00bc7d",
      "warning": "#fe9a00"
    },
    "dark": {
      "background": "#62748e",
      "surface": "#f3f4f6",
      "text": "#0f172b",
      "primary": "#2b7fff",
      "secondary": "#2b7fff",
      "success": "#00bc7d",
      "warning": "#fe9a00"
    }
  },
  "typography": {
    "fontFamily": "Times New Roman",
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
