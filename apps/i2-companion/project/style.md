# i2 Companion Style

## Visual Direction

- Quiet, dark-first, developer-focused spatial and companion surfaces matching `apps/i2-ide-prototype`.
- Clear typographic hierarchy, compact information density, high-contrast teal (`#2dd4bf`) and mint (`#abefa3`) Infie accents over deep obsidian (`#05070d`, `#111012`, `#161517`, `#1d1b20`).

## Brand/References

- Primary desktop reference: `apps/i2-ide-prototype` (`#0a0814` backdrop, `#2dd4bf` teal energy, `#abefa3` mint action/success, `#fbbf24` amber attention).
- 3D Infie identity: `generated/infie-prototype` (`Mist`, `Glyph`, `Surge`, `Compile`, `Controller`).

## Colors

- Canonical editable tokens live in `project/theme.json` and `src/theme/tokens.ts`.
- Dark cockpit surfaces (`#05070d` void, `#14151c` panel, `#1d1b20` header, `rgba(255,255,255,0.10)` hairline border) with high-contrast readable text (`#f8fafc` primary, `#cbd5e1` secondary).

## Typography

- Monospace (`Consolas` / platform mono) for code, diffs, branch names, and Doctor checks.
- Clean geometric/grotesk sans-serif for headers and readable body copy (minimum `14sp`/comfort-scaled physical text in Quest VR).

## Layout/Spacing

- Quest VR cockpit: curved spherical-arc layout centered at eye origin (`0.55m`–`2.8m` comfort range), readable card sizes (`<= 2.0m`), generous trigger hit targets (`>= 48mm`).
- Mobile/Web: responsive single-column on narrow viewports; multi-zone `WidgetDock` on wide Web viewports.

## Motion Tone

- Calm, responsive, subtle 3D Infie float/breathing and Mist-intermediary form transitions; respect `reducedMotion` everywhere.

## Accessibility Notes

- High contrast, scalable type, explicit status labels alongside color chips, keyboard/controller focus clarity, and reduced-motion compliance.

<!-- MDS_STYLIST_THEME_START -->
## Canonical Theme Tokens (Managed by Stylist)

The block below mirrors `project/theme.json` and is managed by `mds stylist sync`.

```json
{
  "version": 1,
  "colorSystem": {
    "mode": "bg",
    "previewScheme": "dark",
    "familyMode": "one"
  },
  "families": {
    "light": {
      "primary": "teal",
      "secondary": "emerald",
      "success": "emerald",
      "warning": "amber"
    },
    "dark": {
      "primary": "teal",
      "secondary": "emerald",
      "success": "emerald",
      "warning": "amber"
    }
  },
  "palettes": {
    "bg": {
      "light": {
        "background": "#f8fafc",
        "surface": "#e2e8f0",
        "text": "#0f172a",
        "primary": "#0d9488",
        "secondary": "#16a34a",
        "success": "#16a34a",
        "warning": "#d97706"
      },
      "dark": {
        "background": "#05070d",
        "surface": "#161517",
        "text": "#f8fafc",
        "primary": "#2dd4bf",
        "secondary": "#abefa3",
        "success": "#abefa3",
        "warning": "#fbbf24"
      }
    },
    "automatic": {
      "light": {
        "background": "#f0fdfa",
        "surface": "#ccfbf1",
        "text": "#134e4a",
        "primary": "#0d9488",
        "secondary": "#10b981",
        "success": "#10b981",
        "warning": "#d97706"
      },
      "dark": {
        "background": "#0a0814",
        "surface": "#1d1b20",
        "text": "#f8fafc",
        "primary": "#2dd4bf",
        "secondary": "#abefa3",
        "success": "#4ade80",
        "warning": "#fbbf24"
      }
    }
  },
  "colors": {
    "light": {
      "background": "#f8fafc",
      "surface": "#e2e8f0",
      "text": "#0f172a",
      "primary": "#0d9488",
      "secondary": "#16a34a",
      "success": "#16a34a",
      "warning": "#d97706"
    },
    "dark": {
      "background": "#05070d",
      "surface": "#161517",
      "text": "#f8fafc",
      "primary": "#2dd4bf",
      "secondary": "#abefa3",
      "success": "#abefa3",
      "warning": "#fbbf24"
    }
  },
  "typography": {
    "fontFamily": "System",
    "fontDisplay": "System",
    "fontTitle": "System",
    "fontSubtitle": "System",
    "fontBody": "System",
    "fontCaption": "System",
    "fontMono": "monospace",
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
}
```
<!-- MDS_STYLIST_THEME_END -->
