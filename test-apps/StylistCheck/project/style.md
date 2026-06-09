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
    "mode": "automatic",
    "previewScheme": "dark",
    "familyMode": "one"
  },
  "families": {
    "light": {
      "primary": "blue",
      "secondary": "yellow",
      "success": "neutral",
      "warning": "amber"
    },
    "dark": {
      "primary": "blue",
      "secondary": "yellow",
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
        "primary": "#0000FF",
        "secondary": "#2b7fff",
        "success": "#00bc7d",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#ff6900",
        "surface": "#f3f4f6",
        "text": "#0f172b",
        "primary": "#0000ff",
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
        "primary": "#0000FF",
        "secondary": "#ffff00",
        "success": "#737373",
        "warning": "#fe9a00"
      },
      "dark": {
        "background": "#002425",
        "surface": "#003a3c",
        "text": "#bdeced",
        "primary": "#0000FF",
        "secondary": "#ffff00",
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
}
```
<!-- MDS_STYLIST_THEME_END -->
