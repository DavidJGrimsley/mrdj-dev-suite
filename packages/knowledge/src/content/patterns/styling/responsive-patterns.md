# Responsive Design Patterns

## Description

Responsive patterns implement mobile-first breakpoint strategies using Uniwind/Tailwind utilities. Components adapt layout, typography, and spacing across iOS, Android, and Web platforms using responsive class modifiers (sm:, md:, lg:, xl:) and platform-specific code (`.web.tsx`, `.native.tsx`).

## When to Use

**Use responsive patterns** for:
- ✅ Multi-platform layouts (mobile, tablet, web)
- ✅ Breakpoint-specific typography scaling
- ✅ Flexible grid/column systems
- ✅ Platform-specific layout adjustments
- ✅ Safe area insets on mobile

## Breakpoints

| Breakpoint | Width | Use Case |
|-----------|-------|----------|
| `default` | 0px+ | Mobile-first (default) |
| `sm:` | 640px+ | Large phones, small tablets |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Tablets, small desktops |
| `xl:` | 1280px+ | Desktops |
| `2xl:` | 1536px+ | Large desktops |

## Code Example

### Mobile-First Grid Layout

```typescript
// File: src/components/ResponsiveGrid.tsx
import { View } from 'react-native';
import { ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'small' | 'medium' | 'large';
}

export function ResponsiveGrid({
  children,
  columns = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'medium',
}: ResponsiveGridProps) {
  // Calculate width: 100% / columns for each breakpoint
  const gapClasses = {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
  };

  return (
    <View
      className={`
        flex-row flex-wrap
        ${gapClasses[gap]}
        w-full
      `}
    >
      {children}
    </View>
  );
}

// Usage:
function ProductGrid() {
  return (
    <ResponsiveGrid columns={{ default: 1, sm: 2, md: 3, lg: 4 }}>
      {/* Mobile: 1 column */}
      {/* Tablet (md): 3 columns */}
      {/* Desktop (lg): 4 columns */}
    </ResponsiveGrid>
  );
}
```

### Responsive Typography

```typescript
// File: src/components/ResponsiveHeading.tsx
import { Text, TextProps } from 'react-native';
import { useFontSize } from '@/hooks/useFontSize';

interface ResponsiveHeadingProps extends TextProps {
  children: string;
  level?: 1 | 2 | 3;
}

export function ResponsiveHeading({
  children,
  level = 1,
  ...props
}: ResponsiveHeadingProps) {
  // Responsive font sizes: mobile first
  const headingStyles = {
    1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl', // H1
    2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',  // H2
    3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',   // H3
  };

  return (
    <Text
      className={`
        font-bold
        leading-tight
        ${headingStyles[level]}
        dark:text-white
      `}
      {...props}
    >
      {children}
    </Text>
  );
}

// Usage:
<ResponsiveHeading level={1}>
  Mobile: 24px → Tablet: 30px → Desktop: 36px → Large: 48px
</ResponsiveHeading>
```

### Platform-Specific Responsive Layout

```typescript
// File: src/components/HeroSection.tsx (default - all platforms)
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

export function HeroSection() {
  return (
    <View
      className={`
        flex-col md:flex-row
        gap-4 md:gap-8
        w-full
        px-4 md:px-8
        py-8 md:py-16
      `}
    >
      {/* Image: mobile-first (full width) */}
      <View className="w-full md:w-1/2">
        <Image
          source={{ uri: 'https://example.com/hero.jpg' }}
          className="w-full aspect-video rounded-lg"
        />
      </View>

      {/* Content: mobile-full width, desktop-50% */}
      <View className="w-full md:w-1/2 justify-center">
        <ResponsiveHeading level={1}>
          Welcome to Our App
        </ResponsiveHeading>
        <Text className="mt-4 text-base md:text-lg leading-relaxed">
          Responsive content for all screen sizes.
        </Text>
      </View>
    </View>
  );
}
```

```typescript
// File: src/components/HeroSection.web.tsx (web-specific override)
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

export function HeroSection() {
  return (
    <View
      className={`
        flex-row
        gap-8
        w-full
        px-8
        py-16
        justify-center
        max-w-6xl
        mx-auto
      `}
    >
      {/* Desktop-optimized layout */}
      <View className="w-1/2">
        <Image
          source={{ uri: 'https://example.com/hero.jpg' }}
          className="w-full aspect-video rounded-lg"
        />
      </View>

      <View className="w-1/2 justify-center">
        <Text className="text-5xl font-bold leading-tight">
          Welcome to Our App
        </Text>
        <Text className="mt-6 text-lg leading-relaxed">
          Web-optimized responsive layout.
        </Text>
      </View>
    </View>
  );
}
```

### Safe Area Responsive Padding

```typescript
// File: src/components/ScreenContainer.tsx
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
}

export function ScreenContainer({
  children,
  className,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`
        flex-1
        bg-[var(--color-background)]
        px-4 md:px-8 lg:px-12
        ${className || ''}
      `}
      style={{
        paddingBottom: insets.bottom + 16,
        paddingTop: insets.top + 16,
      }}
      {...props}
    >
      {children}
    </View>
  );
}

// Usage:
function HomeScreen() {
  return (
    <ScreenContainer>
      {/* Content automatically respects safe area */}
    </ScreenContainer>
  );
}
```

### Responsive Form Layout

```typescript
// File: src/components/FormGrid.tsx
import { View } from 'react-native';
import { ReactNode } from 'react';

interface FormGridProps {
  children: ReactNode;
  columns?: number;
}

export function FormGrid({
  children,
  columns = 2,
}: FormGridProps) {
  const columnClass = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
  }[columns] || 'md:grid-cols-2';

  return (
    <View
      className={`
        flex-col
        ${columnClass}
        gap-4 md:gap-6
        w-full
      `}
    >
      {/* Mobile: full-width stacked fields */}
      {/* Tablet+: multi-column layout */}
      {children}
    </View>
  );
}

// Usage:
function UserForm() {
  return (
    <FormGrid columns={2}>
      {/* Each child gets full width on mobile, 50% on tablet+ */}
    </FormGrid>
  );
}
```

## Configuration

### Tailwind Breakpoints

```javascript
// File: tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '320px',   // Small mobile
      'sm': '640px',   // Large phone
      'md': '768px',   // Tablet
      'lg': '1024px',  // iPad landscape
      'xl': '1280px',  // Desktop
      '2xl': '1536px', // Large desktop
    },
  },
};
```

## Best Practices

### ✅ DO

1. **Start with mobile-first** — default styles for mobile, then enhance
   ```tsx
   <View className="text-base md:text-lg lg:text-xl">
     Mobile: 16px → Tablet: 18px → Desktop: 20px
   </View>
   ```

2. **Use responsive spacing** to adjust for screen size
   ```tsx
   <View className="px-4 md:px-8 lg:px-12 py-4 md:py-8">
     Responsive padding scales with breakpoint
   </View>
   ```

3. **Create platform-specific overrides** for significant layout changes
   ```typescript
   // Component.tsx (all platforms)
   // Component.web.tsx (web-only optimizations)
   // Component.native.tsx (mobile-only optimizations)
   ```

4. **Use CSS custom properties** for responsive values
   ```css
   @layer utilities {
     .container-responsive {
       width: calc(100% - var(--spacing-4));
       max-width: 1024px;
     }
   }
   ```

### ❌ DON'T

1. **Don't hardcode fixed widths** — use responsive classes
   ```tsx
   // ❌ BAD - fixed width
   <View className="w-300" />
   
   // ✅ GOOD - responsive
   <View className="w-full md:w-1/2 lg:w-1/3" />
   ```

2. **Don't use all breakpoints** — typically only 2-3 needed
   ```tsx
   // ❌ EXCESSIVE
   <View className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl" />
   
   // ✅ FOCUSED
   <View className="text-base md:text-lg lg:text-xl" />
   ```

3. **Don't forget safe area insets** on mobile
   ```tsx
   // ✅ INCLUDE
   style={{ paddingTop: insets.top + 16 }}
   
   // ❌ EXCLUDE
   className="pt-4" // Doesn't account for notch/unsafe areas
   ```

## Related Patterns

- [Uniwind Setup](./uniwind-setup.md) — Uniwind configuration
- [Theme Configuration](./theme-configuration.md) — Theme tokens
- [Component Styling](./component-styling.md) — Component patterns

---

*Pattern extracted from production repositories: expo-super-template, DJsPortfolio, PokePages*
*Files: responsive layout patterns from Expo Router apps*