# Uniwind & Tailwind v4 Setup

## Description

Uniwind provides Tailwind v4 CSS integration for React Native with build-time style computation and Metro bundler configuration. Design tokens (colors, spacing, typography) live in CSS using `@layer theme` with `@variant` for light/dark modes, enabling cross-platform responsive styling without separate theme providers.

## When to Use

**Use Uniwind** for:
- ✅ React Native projects (iOS, Android, Web)
- ✅ Responsive design with breakpoints
- ✅ Dark mode support with CSS variables
- ✅ Tailwind utility-first styling approach
- ✅ Projects using Tailwind v4+

## Installation

### 1. Install Dependencies

```bash
npm install uniwind
npm install --save-dev tailwindcss@^4 @tailwindcss/postcss
```

### 2. Configure Metro Bundler

```javascript
// File: metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  // Optional: set rem polyfill if needed (default 16px)
  // polyfills: { rem: 16 }
});
```

### 3. Add PostCSS Configuration

```javascript
// File: postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## Code Example

### Global CSS with Theme Tokens

```css
/* File: src/global.css */
@import 'tailwindcss';
@import 'uniwind';

/* Define theme tokens as CSS variables */
@layer theme {
  :root {
    /* Light mode (default) */
    @variant light {
      /* Primary colors */
      --color-primary: #ef5350;
      --color-primary-50: #ffebee;
      --color-primary-100: #ffcdd2;
      --color-primary-500: #ef5350;
      --color-primary-700: #c62828;
      --color-primary-900: #b71c1c;

      /* Secondary colors */
      --color-secondary: #29b6f6;
      --color-secondary-500: #29b6f6;
      --color-secondary-700: #0277bd;

      /* Neutral colors */
      --color-background: #fafafa;
      --color-surface: #ffffff;
      --color-typography: #212121;
      --color-border: #e0e0e0;
      --color-divider: #bdbdbd;

      /* Status colors */
      --color-success: #4caf50;
      --color-warning: #ff9800;
      --color-error: #f44336;
      --color-info: #2196f3;
    }

    /* Dark mode */
    @variant dark {
      --color-primary: #ef5350;
      --color-primary-50: #ffebee;
      --color-primary-100: #ffcdd2;
      --color-primary-500: #ef5350;
      --color-primary-700: #d32f2f;
      --color-primary-900: #b71c1c;

      --color-secondary: #29b6f6;
      --color-secondary-500: #29b6f6;
      --color-secondary-700: #0288d1;

      --color-background: #121212;
      --color-surface: #1e1e1e;
      --color-typography: #ffffff;
      --color-border: #424242;
      --color-divider: #616161;

      --color-success: #66bb6a;
      --color-warning: #ffb74d;
      --color-error: #ef5350;
      --color-info: #64b5f6;
    }

    /* Spacing scale */
    --spacing-0: 0;
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-3: 12px;
    --spacing-4: 16px;
    --spacing-6: 24px;
    --spacing-8: 32px;

    /* Typography */
    --font-sans: 'Roboto', sans-serif;
    --font-mono: 'RobotoMono', monospace;
    --font-display: 'Modak', serif;
  }
}

/* Define typography utilities */
@layer utilities {
  .typography-header {
    @apply text-4xl font-bold tracking-tight;
    font-family: var(--font-display);
  }

  .typography-subheader {
    @apply text-2xl font-bold;
    font-family: var(--font-sans);
  }

  .typography-body {
    @apply text-base leading-6;
    font-family: var(--font-sans);
  }

  .typography-caption {
    @apply text-sm text-gray-500;
    font-family: var(--font-sans);
  }
}

/* Global style reset */
@layer base {
  * {
    @apply margin-0 padding-0;
  }

  body {
    @apply bg-[var(--color-background)] text-[var(--color-typography)];
  }
}
```

**From:** expo-super-template/global.css, DJsPortfolio/global.css

### Component Styling with Uniwind

```typescript
// File: src/components/Button.tsx
import { Pressable, Text } from 'react-native';
import { cn } from '@/utils/cn'; // tailwind-merge helper

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const baseStyles = 'px-4 py-3 rounded-lg active:opacity-80 disabled:opacity-50';

  const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white',
    secondary: 'bg-[var(--color-secondary)] text-white',
    ghost: 'bg-transparent border border-[var(--color-border)]',
  };

  const containerStyles = cn(
    baseStyles,
    variantStyles[variant],
    fullWidth && 'w-full'
  );

  return (
    <Pressable
      className={containerStyles}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className="text-center font-semibold">
        {title}
      </Text>
    </Pressable>
  );
}
```

### Dark Mode Support

```typescript
// File: src/hooks/useColorScheme.ts
import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const scheme = useNativeColorScheme();
  return scheme || 'light';
}

// File: src/components/ThemedView.tsx
import { View, ViewProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ThemedViewProps extends ViewProps {
  lightBg?: string;
  darkBg?: string;
}

export function ThemedView({
  lightBg = 'bg-white',
  darkBg = 'dark:bg-black',
  className,
  ...props
}: ThemedViewProps) {
  const colorScheme = useColorScheme();

  return (
    <View
      className={`${lightBg} ${darkBg} ${className || ''}`}
      {...props}
    />
  );
}

// Usage
function Screen() {
  return (
    <ThemedView
      lightBg="bg-white"
      darkBg="dark:bg-gray-900"
      className="flex-1"
    >
      {/* Content */}
    </ThemedView>
  );
}
```

### Responsive Breakpoints

```typescript
// File: src/components/ResponsiveGrid.tsx
import { View } from 'react-native';

export function ResponsiveGrid({ children }) {
  return (
    <View className="flex-row flex-wrap gap-4 w-full">
      {/* 
        Mobile (default): 1 column
        md (768px): 2 columns
        lg (1024px): 3 columns
      */}
      <View className="w-full md:w-1/2 lg:w-1/3">
        {children}
      </View>
    </View>
  );
}
```

## Configuration

### Tailwind Config

```javascript
// File: tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './App.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        mono: ['RobotoMono', 'monospace'],
        display: ['Modak', 'serif'],
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
};
```

## Best Practices

### ✅ DO

1. **Define all tokens in CSS** using `@layer theme`
   ```css
   @layer theme {
     :root {
       --color-primary: #ef5350;
       --color-surface: #ffffff;
     }
   }
   ```

2. **Use CSS variables** in components
   ```tsx
   <View className="bg-[var(--color-primary)]" />
   ```

3. **Support dark mode** with `@variant dark`
   ```css
   @variant dark {
     --color-background: #121212;
   }
   ```

4. **Use `cn()` with tailwind-merge** for conditional classes
   ```tsx
   className={cn('bg-red-500', isActive && 'bg-blue-500')}
   ```

5. **Keep Tailwind config minimal** — use CSS variables instead
   ```javascript
   // ✅ MINIMAL config
   module.exports = {
     content: ['./src/**/*.tsx'],
     theme: { extend: { fontFamily: { ... } } }
   };
   ```

### ❌ DON'T

1. **Don't define colors in tailwind.config.js**
   ```javascript
   // ❌ BAD - hard to theme dynamically
   colors: { primary: '#ef5350' }
   
   // ✅ GOOD - use CSS variables
   // In global.css: --color-primary: #ef5350
   ```

2. **Don't forget `prepare: false`** in Metro config
   ```javascript
   // ❌ BAD - required for Uniwind + Metro
   // No withUniwindConfig
   
   // ✅ GOOD
   module.exports = withUniwindConfig(config, {
     cssEntryFile: './src/global.css',
   });
   ```

3. **Don't use `StyleSheet.create()`** for layout/spacing
   ```typescript
   // ❌ BAD - verbose and hard to maintain
   const styles = StyleSheet.create({
     container: { flex: 1, padding: 16, backgroundColor: '#fff' }
   });
   
   // ✅ GOOD - use Tailwind classes
   <View className="flex-1 p-4 bg-white" />
   ```

4. **Don't forget to import global.css** in app root
   ```typescript
   // File: src/app/_layout.tsx
   import '@/global.css'; // ← Required for Uniwind to work
   ```

## Related Patterns

- [Theme Configuration](./theme-configuration.md) — Advanced theming patterns
- [Responsive Patterns](./responsive-patterns.md) — Mobile-first responsive design
- [Component Styling](./component-styling.md) — Component-specific styling

---

*Pattern extracted from production repositories: expo-super-template, DJsPortfolio, not-hot-dog*
*Files: expo-super-template/global.css, metro.config.js*