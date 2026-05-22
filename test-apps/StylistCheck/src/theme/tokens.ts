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
    "mode": "automatic",
    "previewScheme": "dark",
    "familyMode": "one"
  },
  "families": {
    "light": {
      "primary": "teal",
      "secondary": "red",
      "success": "neutral",
      "warning": "amber"
    },
    "dark": {
      "primary": "teal",
      "secondary": "red",
      "success": "neutral",
      "warning": "amber"
    }
  },
  "palettes": {
    "bg": {
      "light": {
        "background": "#ff6900",
        "surface": "#f3f4f6",
        "text": "#0f172b",
        "primary": "#2b7fff",
        "secondary": "#2b7fff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#ff6900",
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
        "background": "#f2fbfc",
        "surface": "#e0f6f7",
        "text": "#003a3c",
        "primary": "#00b6bb",
        "secondary": "#fb2c36",
        "success": "#737373",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#002425",
        "surface": "#003a3c",
        "text": "#bdeced",
        "primary": "#00b6bb",
        "secondary": "#fb2c36",
        "success": "#737373",
        "warning": "#fe9a00"
      }
    }
  },
  "colors": {
    "light": {
      "background": "#f2fbfc",
      "surface": "#e0f6f7",
      "text": "#003a3c",
      "primary": "#00b6bb",
      "secondary": "#fb2c36",
      "success": "#737373",
      "warning": "#fe9a00"
    },
    "dark": {
      "background": "#002425",
      "surface": "#003a3c",
      "text": "#bdeced",
      "primary": "#00b6bb",
      "secondary": "#fb2c36",
      "success": "#737373",
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
    "radius": 25,
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
