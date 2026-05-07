# Theme Configuration & CSS Variables

## Description

Theme configuration manages design tokens (colors, spacing, typography) through CSS variables in global.css with light/dark mode variants. Components reference tokens via `var(--color-primary)` syntax, enabling runtime theme switching without provider components or prop drilling.

## When to Use

**Use CSS variable theming** for:
- ✅ Dynamic light/dark mode support
- ✅ Brand color customization
- ✅ Consistent spacing scales
- ✅ Typography system with multiple styles
- ✅ Cross-platform (iOS, Android, Web) theme support

## Code Example

### Complete Theme System

```css
/* File: src/global.css */
@import 'tailwindcss';
@import 'uniwind';

@layer theme {
  :root {
    /* ===== LIGHT MODE (DEFAULT) ===== */
    @variant light {
      /* Primary color palette (Red - brand color) */
      --color-primary: #ef5350;
      --color-primary-50: #ffebee;
      --color-primary-100: #ffcdd2;
      --color-primary-200: #ef9a9a;
      --color-primary-300: #e57373;
      --color-primary-400: #ef5350;
      --color-primary-500: #ef5350;
      --color-primary-600: #e53935;
      --color-primary-700: #c62828;
      --color-primary-800: #b71c1c;
      --color-primary-900: #b71c1c;

      /* Secondary color palette (Blue - accent) */
      --color-secondary: #29b6f6;
      --color-secondary-50: #e1f5fe;
      --color-secondary-100: #b3e5fc;
      --color-secondary-500: #29b6f6;
      --color-secondary-700: #0277bd;
      --color-secondary-900: #01579b;

      /* Background surfaces */
      --color-background: #fafafa;      /* Main background */
      --color-surface: #ffffff;         /* Card/surface background */
      --color-surface-2: #f5f5f5;       /* Secondary surface */
      --color-surface-3: #eeeeee;       /* Tertiary surface */

      /* Text colors */
      --color-typography: #212121;      /* Primary text */
      --color-typography-60: #666666;   /* Secondary text (60% opacity) */
      --color-typography-38: #9e9e9e;   /* Tertiary text (38% opacity) */

      /* UI elements */
      --color-border: #e0e0e0;          /* Border color */
      --color-divider: #bdbdbd;         /* Divider lines */
      --color-disabled: #bdbdbd;        /* Disabled state */
      --color-focus-ring: #2196f3;      /* Focus indicator */

      /* Status colors */
      --color-success: #4caf50;
      --color-warning: #ff9800;
      --color-error: #f44336;
      --color-info: #2196f3;

      /* Semantic colors */
      --color-link: #1976d2;
      --color-link-visited: #7b1fa2;
    }

    /* ===== DARK MODE ===== */
    @variant dark {
      /* Primary color palette (adjusted for dark) */
      --color-primary: #ef5350;
      --color-primary-50: #ffebee;
      --color-primary-100: #ffcdd2;
      --color-primary-200: #ef9a9a;
      --color-primary-300: #e57373;
      --color-primary-400: #ef5350;
      --color-primary-500: #ef5350;
      --color-primary-600: #e53935;
      --color-primary-700: #d32f2f;
      --color-primary-800: #c62828;
      --color-primary-900: #b71c1c;

      /* Secondary color palette (lighter for dark) */
      --color-secondary: #4fc3f7;
      --color-secondary-50: #e0f2f1;
      --color-secondary-100: #b2dfdb;
      --color-secondary-500: #4fc3f7;
      --color-secondary-700: #0288d1;
      --color-secondary-900: #01579b;

      /* Background surfaces (dark) */
      --color-background: #121212;      /* Main dark background */
      --color-surface: #1e1e1e;         /* Card/surface in dark */
      --color-surface-2: #272727;       /* Secondary surface */
      --color-surface-3: #303030;       /* Tertiary surface */

      /* Text colors (light for dark mode) */
      --color-typography: #ffffff;      /* Primary text */
      --color-typography-60: #b3b3b3;   /* Secondary text (60% opacity) */
      --color-typography-38: #808080;   /* Tertiary text (38% opacity) */

      /* UI elements (dark mode) */
      --color-border: #424242;
      --color-divider: #616161;
      --color-disabled: #616161;
      --color-focus-ring: #42a5f5;

      /* Status colors (dark mode) */
      --color-success: #66bb6a;
      --color-warning: #ffb74d;
      --color-error: #ef5350;
      --color-info: #64b5f6;

      /* Semantic colors */
      --color-link: #64b5f6;
      --color-link-visited: #ce93d8;
    }

    /* ===== SPACING SCALE ===== */
    --spacing-0: 0px;
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-3: 12px;
    --spacing-4: 16px;
    --spacing-5: 20px;
    --spacing-6: 24px;
    --spacing-8: 32px;
    --spacing-10: 40px;
    --spacing-12: 48px;
    --spacing-16: 64px;

    /* ===== TYPOGRAPHY ===== */
    --font-sans: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'RobotoMono', 'Monaco', monospace;
    --font-display: 'Modak', 'Georgia', serif;

    /* Font sizes */
    --text-xs: 12px;
    --text-sm: 14px;
    --text-base: 16px;
    --text-lg: 18px;
    --text-xl: 20px;
    --text-2xl: 24px;
    --text-3xl: 30px;
    --text-4xl: 36px;

    /* Line heights */
    --line-height-tight: 1.2;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.75;

    /* Letter spacing */
    --tracking-tighter: -0.05em;
    --tracking-tight: -0.025em;
    --tracking-normal: 0em;
    --tracking-wide: 0.025em;
    --tracking-wider: 0.05em;

    /* ===== SHADOWS ===== */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.2);

    /* ===== BORDER RADIUS ===== */
    --radius-none: 0px;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-2xl: 24px;
    --radius-full: 9999px;

    /* ===== BREAKPOINTS ===== */
    --breakpoint-xs: 320px;
    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
    --breakpoint-xl: 1280px;
    --breakpoint-2xl: 1536px;
  }
}

/* ===== TYPOGRAPHY UTILITIES ===== */
@layer utilities {
  /* Header styles */
  .typography-header {
    @apply text-4xl font-bold;
    font-family: var(--font-display);
    letter-spacing: var(--tracking-wide);
    line-height: var(--line-height-tight);
  }

  .typography-subheader {
    @apply text-2xl font-bold;
    font-family: var(--font-sans);
    line-height: var(--line-height-tight);
  }

  .typography-title {
    @apply text-xl font-semibold;
    font-family: var(--font-sans);
  }

  /* Body text styles */
  .typography-body {
    @apply text-base;
    font-family: var(--font-sans);
    line-height: var(--line-height-normal);
    color: var(--color-typography);
  }

  .typography-body-small {
    @apply text-sm;
    font-family: var(--font-sans);
    line-height: var(--line-height-normal);
  }

  .typography-caption {
    @apply text-xs;
    font-family: var(--font-sans);
    color: var(--color-typography-60);
    line-height: var(--line-height-normal);
  }

  .typography-overline {
    @apply text-xs font-semibold uppercase;
    font-family: var(--font-sans);
    letter-spacing: var(--tracking-wide);
  }

  /* Monospace styles */
  .typography-code {
    font-family: var(--font-mono);
    @apply text-sm;
    background-color: var(--color-surface-2);
    color: var(--color-primary);
  }

  /* Text utilities */
  .text-primary { color: var(--color-primary); }
  .text-secondary { color: var(--color-secondary); }
  .text-typography { color: var(--color-typography); }
  .text-typography-60 { color: var(--color-typography-60); }
  .text-typography-38 { color: var(--color-typography-38); }

  /* Background utilities */
  .bg-primary { background-color: var(--color-primary); }
  .bg-secondary { background-color: var(--color-secondary); }
  .bg-surface { background-color: var(--color-surface); }
  .bg-surface-2 { background-color: var(--color-surface-2); }

  /* Border utilities */
  .border-primary { border-color: var(--color-primary); }
  .border-secondary { border-color: var(--color-secondary); }
  .border-default { border-color: var(--color-border); }

  /* Spacing utilities */
  .p-safe { padding-bottom: env(safe-area-inset-bottom); }
}

/* ===== GLOBAL RESET ===== */
@layer base {
  * {
    @apply margin-0 padding-0;
    box-sizing: border-box;
  }

  body {
    @apply bg-[var(--color-background)] text-[var(--color-typography)];
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

**From:** DJsPortfolio/global.css, expo-super-template/global.css

### Component Theme Usage

```typescript
// File: src/components/Card.tsx
import { View, Text } from 'react-native';

interface CardProps {
  title: string;
  description: string;
}

export function Card({ title, description }: CardProps) {
  return (
    <View className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-4 border border-[var(--color-border)]">
      <Text className="typography-title text-[var(--color-typography)]">
        {title}
      </Text>
      <Text className="typography-body text-[var(--color-typography-60)] mt-2">
        {description}
      </Text>
    </View>
  );
}
```

## Configuration

### Tailwind Config Integration

```javascript
// File: tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      
      // Use CSS variables
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      background: 'var(--color-background)',
      surface: 'var(--color-surface)',
      typography: 'var(--color-typography)',
      border: 'var(--color-border)',
      
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      error: 'var(--color-error)',
      info: 'var(--color-info)',
    },
    spacing: {
      0: 'var(--spacing-0)',
      1: 'var(--spacing-1)',
      2: 'var(--spacing-2)',
      3: 'var(--spacing-3)',
      4: 'var(--spacing-4)',
      6: 'var(--spacing-6)',
      8: 'var(--spacing-8)',
    },
    fontSize: {
      xs: 'var(--text-xs)',
      sm: 'var(--text-sm)',
      base: 'var(--text-base)',
      lg: 'var(--text-lg)',
      xl: 'var(--text-xl)',
    },
  },
};
```

## Best Practices

### ✅ DO

1. **Organize tokens by semantic purpose**
   ```css
   --color-primary: /* Brand color */
   --color-success: /* Action success */
   --color-error: /* Action error */
   --color-typography: /* Primary text */
   ```

2. **Use `@variant dark`** for dark mode support
   ```css
   @variant dark {
     --color-background: #121212;
     --color-typography: #ffffff;
   }
   ```

3. **Include multiple shades** for each color
   ```css
   --color-primary-50: #ffebee;
   --color-primary-100: #ffcdd2;
   --color-primary-500: #ef5350;
   --color-primary-900: #b71c1c;
   ```

4. **Reference variables in components**
   ```tsx
   <View className="bg-[var(--color-primary)]" />
   ```

### ❌ DON'T

1. **Don't hardcode colors** in components
   ```tsx
   // ❌ BAD
   <View className="bg-red-500" />
   
   // ✅ GOOD
   <View className="bg-[var(--color-primary)]" />
   ```

2. **Don't duplicate theme values**
   ```css
   /* ❌ BAD - define once */
   --color-error: #f44336;
   --alert-background: #f44336; /* duplicate */
   
   /* ✅ GOOD - reference */
   --color-error: #f44336;
   --alert-background: var(--color-error);
   ```

## Related Patterns

- [Uniwind Setup](./uniwind-setup.md) — Basic Uniwind configuration
- [Responsive Patterns](./responsive-patterns.md) — Mobile-first responsive design
- [Component Styling](./component-styling.md) — Component-specific styling

---

*Pattern extracted from production repositories: DJsPortfolio, expo-super-template, PokePages*
*Files: DJsPortfolio/global.css, expo-super-template/global.css*