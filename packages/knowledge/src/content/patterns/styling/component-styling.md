# Component Styling Patterns

## Description

Component styling encapsulates Uniwind/Tailwind utilities into reusable, typed React components. Components accept className props for customization, use `cn()` for conditional classes with tailwind-merge, and follow consistent naming conventions (`ThemedText`, `ThemedView`, variant suffixes).

## When to Use

**Use component styling patterns** for:
- ✅ Reusable styled primitives (Button, Card, Input)
- ✅ Theme-aware components with dark mode support
- ✅ Complex components with multiple variants
- ✅ Accessible components with proper ARIA attributes
- ✅ Cross-platform component libraries

## Code Example

### Base Themed Primitives

```typescript
// File: src/components/ThemedView.tsx
import { View, ViewProps } from 'react-native';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'surface' | 'surface-2';
}

export function ThemedView({
  variant = 'default',
  className,
  ...props
}: ThemedViewProps) {
  const variantStyles = {
    default: 'bg-[var(--color-background)]',
    surface: 'bg-[var(--color-surface)]',
    'surface-2': 'bg-[var(--color-surface-2)]',
  };

  return (
    <View
      className={`${variantStyles[variant]} ${className || ''}`}
      {...props}
    />
  );
}
```

```typescript
// File: src/components/ThemedText.tsx
import { Text, TextProps } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'default' | 'title' | 'subtitle' | 'caption';
}

export function ThemedText({
  type = 'default',
  className,
  ...props
}: ThemedTextProps) {
  const typeStyles = {
    default: 'typography-body text-[var(--color-typography)]',
    title: 'typography-title text-[var(--color-typography)]',
    subtitle: 'typography-subheader text-[var(--color-typography-60)]',
    caption: 'typography-caption text-[var(--color-typography-38)]',
  };

  return (
    <Text
      className={`${typeStyles[type]} ${className || ''}`}
      {...props}
    />
  );
}
```

### Button Component with Variants

```typescript
// File: src/components/Button.tsx
import { Pressable, Text, PressableProps } from 'react-native';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: ButtonProps) {
  // Base styles for all variants
  const baseStyles = 'flex-row items-center justify-center rounded-lg font-semibold transition-all active:opacity-80 disabled:opacity-50';

  // Variant colors
  const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white',
    secondary: 'bg-[var(--color-secondary)] text-white',
    tertiary: 'bg-[var(--color-surface-2)] text-[var(--color-typography)]',
    danger: 'bg-[var(--color-error)] text-white',
  };

  // Size padding
  const sizeStyles = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-3 text-base',
    large: 'px-6 py-4 text-lg',
  };

  // Width
  const widthClass = fullWidth ? 'w-full' : 'self-start';

  return (
    <Pressable
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], widthClass, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {leftIcon && <View className="mr-2">{leftIcon}</View>}
      
      <Text className="text-white font-semibold">
        {isLoading ? 'Loading...' : title}
      </Text>

      {rightIcon && <View className="ml-2">{rightIcon}</View>}
    </Pressable>
  );
}

// Usage:
<Button
  title="Submit"
  variant="primary"
  size="large"
  fullWidth
  onPress={handleSubmit}
/>

<Button
  title="Delete"
  variant="danger"
  size="medium"
  leftIcon={<TrashIcon />}
/>
```

### Card Component

```typescript
// File: src/components/Card.tsx
import { View, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface CardProps extends ViewProps {
  elevation?: 'none' | 'small' | 'medium' | 'large';
  rounded?: 'none' | 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export function Card({
  elevation = 'medium',
  rounded = 'medium',
  padding = 'medium',
  className,
  ...props
}: CardProps) {
  const elevationStyles = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
  };

  const roundedStyles = {
    none: 'rounded-none',
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl',
  };

  const paddingStyles = {
    none: 'p-0',
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  return (
    <View
      className={cn(
        'bg-[var(--color-surface)]',
        'border border-[var(--color-border)]',
        elevationStyles[elevation],
        roundedStyles[rounded],
        paddingStyles[padding],
        className
      )}
      {...props}
    />
  );
}

// Usage:
<Card padding="large" rounded="medium">
  <ThemedText type="title">Card Title</ThemedText>
</Card>
```

### Input Component

```typescript
// File: src/components/TextInput.tsx
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { cn } from '@/utils/cn';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function TextInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  ...props
}: TextInputProps) {
  return (
    <View className="w-full">
      {label && (
        <ThemedText type="subtitle" className="mb-2">
          {label}
        </ThemedText>
      )}

      <View className="flex-row items-center border border-[var(--color-border)] rounded-lg px-3 bg-[var(--color-surface)]">
        {leftIcon && <View className="mr-2">{leftIcon}</View>}

        <RNTextInput
          className={cn(
            'flex-1 py-3 text-base text-[var(--color-typography)]',
            'placeholder:text-[var(--color-typography-38)]',
            error && 'border-[var(--color-error)]',
            className
          )}
          placeholderTextColor="var(--color-typography-38)"
          {...props}
        />

        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>

      {error && (
        <ThemedText type="caption" className="mt-1 text-[var(--color-error)]">
          {error}
        </ThemedText>
      )}

      {helperText && !error && (
        <ThemedText type="caption" className="mt-1">
          {helperText}
        </ThemedText>
      )}
    </View>
  );
}

// Usage:
<TextInput
  label="Email"
  placeholder="user@example.com"
  error={emailError}
  leftIcon={<MailIcon />}
/>
```

### Badge Component

```typescript
// File: src/components/Badge.tsx
import { View, Text, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Badge({
  label,
  variant = 'primary',
  size = 'medium',
  dismissible = false,
  onDismiss,
  className,
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-[var(--color-primary)] text-white',
    success: 'bg-[var(--color-success)] text-white',
    warning: 'bg-[var(--color-warning)] text-white',
    error: 'bg-[var(--color-error)] text-white',
    info: 'bg-[var(--color-info)] text-white',
  };

  const sizeStyles = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base',
  };

  return (
    <View
      className={cn(
        'flex-row items-center rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <Text className="font-semibold">{label}</Text>
      {dismissible && (
        <Text
          onPress={onDismiss}
          className="ml-2 font-bold opacity-70"
        >
          ×
        </Text>
      )}
    </View>
  );
}

// Usage:
<Badge label="Active" variant="success" dismissible onDismiss={handleDismiss} />
```

## Helper Function: `cn()`

```typescript
// File: src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper conflict resolution
 * - Combines multiple class arrays/strings with clsx
 * - Resolves conflicting Tailwind utilities with twMerge
 * - Removes falsy values automatically
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Usage:
<View className={cn('bg-red-500', isActive && 'bg-blue-500')} />
// Result: "bg-blue-500" (red conflict resolved)
```

## Best Practices

### ✅ DO

1. **Create primitive components** (Button, Card, Input, Badge)
   ```typescript
   export function Button({ title, variant, size, ...props }) {
     // Reusable across entire app
   }
   ```

2. **Use variant patterns** for styling flexibility
   ```typescript
   const variantStyles = {
     primary: 'bg-primary text-white',
     secondary: 'bg-secondary text-white',
     tertiary: 'bg-surface-2 text-typography',
   };
   ```

3. **Accept className prop** for composition
   ```typescript
   export function Button({ className, ...props }) {
     return <Pressable className={cn(baseStyles, className)} {...props} />;
   }
   ```

4. **Use `cn()` for conditional classes**
   ```typescript
   className={cn(
     'base-styles',
     isActive && 'active-styles',
     error && 'error-styles'
   )}
   ```

### ❌ DON'T

1. **Don't hardcode colors** — use theme variables
   ```tsx
   // ❌ BAD
   className="bg-red-500"
   
   // ✅ GOOD
   className="bg-[var(--color-primary)]"
   ```

2. **Don't create one-off styled components**
   ```tsx
   // ❌ BAD - not reusable
   function HomeButton({ onPress }) {
     return <Pressable className="bg-blue-500 px-4 py-3 rounded" onPress={onPress} />;
   }
   
   // ✅ GOOD - reusable primitive
   function Button({ title, variant, ...props }) {
     // Used everywhere
   }
   ```

3. **Don't use inline style objects** for Tailwind-able properties
   ```tsx
   // ❌ BAD
   style={{ backgroundColor: '#ef5350' }}
   
   // ✅ GOOD
   className="bg-[var(--color-primary)]"
   ```

## Related Patterns

- [Uniwind Setup](./uniwind-setup.md) — Uniwind configuration
- [Theme Configuration](./theme-configuration.md) — Theme tokens
- [Responsive Patterns](./responsive-patterns.md) — Responsive design

---

*Pattern extracted from production repositories: PokePages, DJsPortfolio, expo-super-template*
*Files: src/components/*.tsx from Expo Router projects*