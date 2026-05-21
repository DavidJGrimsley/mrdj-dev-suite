# StylistCheck Style

## Visual Direction

- Define how the app should look and feel before building final screens.
- Keep this file focused on visual/design direction only.

## Brand/References

# TodoForContext(optional): Add brand words, competitor references, client examples, screenshots, or links.

## Colors

- Canonical editable tokens live in `project/theme.json`.
- Use `/exposition/stylist` and the Save button to sync style tokens into this file.

# TodoForContext(optional): Add palette direction, semantic color meaning, and light/dark mode expectations.

## Typography

# TodoForContext(optional): Add font choices, type scale, readability constraints, and tone.

## Layout/Spacing

# TodoForContext(optional): Add density, spacing, border radius, information hierarchy, and platform layout notes.

## Motion Tone

# TodoForContext(optional): Add animation feel: playful, calm, utility-first, premium, minimal, etc.

## Accessibility Notes

- Prefer readable contrast, scalable type, clear focus/pressed states, and platform-appropriate interactions.
- Add user-specific accessibility needs here when known.

## Style Questions To Revisit

# TodoForContext(optional): Add unresolved visual decisions to revisit later in `/exposition/stylist`; delete this marker if there are none.

<!-- MDS_STYLIST_THEME_START -->
## Canonical Theme Tokens (Managed by Stylist)

The block below mirrors `project/theme.json` and is managed by `mds stylist sync`.

```json
{
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
}
```
<!-- MDS_STYLIST_THEME_END -->
