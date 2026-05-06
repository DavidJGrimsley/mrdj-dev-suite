# Library Exports

## Description

Library exports patterns define how to structure and expose package functionality via `package.json` export fields, entry points, and barrel exports. These patterns enable proper module resolution, tree-shaking, and TypeScript type support across CommonJS and ESM contexts.

## When to Use

**Apply library exports patterns when:**
- ✅ Creating a shared component library
- ✅ Publishing a utility package to npm or workspace
- ✅ Designing public APIs for packages
- ✅ Supporting both CommonJS and ESM consumers
- ✅ Optimizing bundle size with tree-shaking
- ✅ Managing peer dependencies
- ✅ Providing TypeScript type definitions

## Core Concepts

**Export Field Structure:**
```json
{
  "main": "dist/index.js",           // CommonJS entry
  "module": "dist/index.esm.js",     // ESM entry
  "types": "dist/index.d.ts",        // TypeScript types
  
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": { ... },
    "./hooks": { ... }
  }
}
```

**Key Benefits:**
- Explicit public API definition
- Tree-shaking support
- Conditional module resolution
- Type safety for consumers
- Clear version contracts

## Code Examples

### Basic Library - package.json

```json
{
  "name": "@monorepo/ui",
  "version": "1.0.0",
  "description": "Shared UI component library",
  "license": "MIT",
  
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "src"],
  
  "scripts": {
    "build": "tsc --project tsconfig.build.json && npm run build:types",
    "build:types": "tsc --emitDeclarationOnly --project tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "eslint src"
  },
  
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  
  "dependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0"
  },
  
  "peerDependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0"
  },
  
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-native": "^0.83.0",
    "typescript": "^5.9.0"
  }
}
```

### Multi-entry Library - package.json

```json
{
  "name": "@monorepo/ui",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    
    "./components": {
      "import": "./dist/components/index.js",
      "require": "./dist/components/index.cjs",
      "types": "./dist/components/index.d.ts"
    },
    
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "require": "./dist/hooks/index.cjs",
      "types": "./dist/hooks/index.d.ts"
    },
    
    "./theme": {
      "import": "./dist/theme/index.js",
      "require": "./dist/theme/index.cjs",
      "types": "./dist/theme/index.d.ts"
    },
    
    "./package.json": "./package.json"
  },
  
  "files": ["dist", "src", "LICENSE"]
}
```

### Conditional Exports - package.json

```json
{
  "name": "@monorepo/ui",
  "version": "1.0.0",
  
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    
    "./button": {
      "types": "./dist/button.d.ts",
      "import": "./dist/button.mjs",
      "require": "./dist/button.cjs"
    }
  },
  
  "files": ["dist"]
}
```

### Barrel Export Pattern - src/index.ts

```typescript
// src/index.ts - Main barrel export
// Re-export all public components and hooks

// Components
export { Button } from './components/Button';
export { Card } from './components/Card';
export { Modal } from './components/Modal';
export { TextInput } from './components/TextInput';

// Hooks
export { useTheme } from './hooks/useTheme';
export { useForm } from './hooks/useForm';
export { useMedia } from './hooks/useMedia';

// Types
export type { ButtonProps } from './components/Button';
export type { CardProps } from './components/Card';
export type { FormState } from './hooks/useForm';

// Utils
export { cn } from './utils/cn';
export { toPascalCase } from './utils/string';

// Constants and defaults
export { DEFAULT_THEME } from './constants/theme';
export { BREAKPOINTS } from './constants/breakpoints';
```

### Submodule Barrel - src/components/index.ts

```typescript
// src/components/index.ts - Components submodule
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';
export { TextInput } from './TextInput';
export { Select } from './Select';

// Re-export types
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';
export type { ModalProps } from './Modal';
export type { TextInputProps } from './TextInput';
export type { SelectProps } from './Select';
```

### Hooks Submodule - src/hooks/index.ts

```typescript
// src/hooks/index.ts - Hooks submodule
export { useTheme } from './useTheme';
export { useForm } from './useForm';
export { useMedia } from './useMedia';
export { useAsync } from './useAsync';
export { useDebounce } from './useDebounce';

// Re-export types
export type { UseFormOptions, UseFormState } from './useForm';
export type { Breakpoint, MediaQuery } from './useMedia';
```

### Tree-Shaking Friendly Structure

```typescript
// ❌ AVOID - Default exports prevent tree-shaking
export default {
  Button: ButtonComponent,
  Card: CardComponent,
  Modal: ModalComponent,
};

// ✅ PREFER - Named exports enable tree-shaking
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';

// Usage with tree-shaking
// Only Button code included in bundle
import { Button } from '@monorepo/ui';
```

### Peer Dependencies - package.json

```json
{
  "name": "@monorepo/ui",
  "version": "1.0.0",
  
  "peerDependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0"
  },
  
  "peerDependenciesMeta": {
    "react-native-reanimated": {
      "optional": true
    }
  },
  
  "dependencies": {
    "zustand": "^4.4.0",
    "clsx": "^2.0.0"
  },
  
  "devDependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0"
  }
}
```

### Component with Documentation - Button.tsx

```typescript
// src/components/Button.tsx
import { Pressable, Text } from 'react-native';
import { cn } from '../utils/cn';

export interface ButtonProps {
  /**
   * Button text content
   */
  children: string;
  
  /**
   * Size variant
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Visual variant
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'danger';
  
  /**
   * Callback when pressed
   */
  onPress?: () => void;
  
  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;
}

/**
 * Reusable button component
 * 
 * @example
 * ```tsx
 * <Button size="lg" variant="primary" onPress={handlePress}>
 *   Click me
 * </Button>
 * ```
 */
export function Button({
  children,
  size = 'md',
  variant = 'primary',
  onPress,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        'rounded-lg font-semibold',
        // Size classes
        size === 'sm' && 'px-3 py-1 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',
        // Variant classes
        variant === 'primary' && 'bg-blue-500 active:bg-blue-600',
        variant === 'secondary' && 'bg-gray-200 active:bg-gray-300',
        variant === 'danger' && 'bg-red-500 active:bg-red-600',
        // Disabled state
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      disabled={disabled}
    >
      <Text className={cn(
        'text-center',
        variant === 'primary' && 'text-white',
        variant === 'secondary' && 'text-black',
        variant === 'danger' && 'text-white'
      )}>
        {children}
      </Text>
    </Pressable>
  );
}
```

### TypeScript Configuration - tsconfig.build.json

```json
{
  "extends": "../../tsconfig.base.json",
  
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "emitDeclarationOnly": false,
    
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Library Exports Best Practices

### ✅ DO

1. **Define explicit export fields**
   ```json
   "exports": {
     ".": { "import": "...", "require": "...", "types": "..." },
     "./components": { ... }
   }
   ```

2. **Use named exports for tree-shaking**
   ```typescript
   export { Button }  // ✅ Tree-shakeable
   export default Button  // ❌ Prevents tree-shaking
   ```

3. **Re-export from barrel files**
   ```typescript
   // src/index.ts
   export { Button } from './Button';
   export { Card } from './Card';
   ```

4. **Provide TypeScript type definitions**
   ```json
   "types": "dist/index.d.ts",
   "exports": { ".": { "types": "dist/index.d.ts" } }
   ```

5. **Document peer dependencies**
   ```json
   "peerDependencies": {
     "react": "^19.0.0"
   }
   ```

### ❌ DON'T

1. **Don't use default exports for libraries**
   ```typescript
   ❌ export default { Button, Card, Modal }
   ✅ export { Button }; export { Card }
   ```

2. **Don't export internal utilities**
   ```typescript
   // src/index.ts
   ❌ export { _helpers } from './helpers'
   ✅ Only export public APIs
   ```

3. **Don't forget type definitions**
   ```json
   ❌ "main": "dist/index.js"  (no types)
   ✅ "types": "dist/index.d.ts"
   ```

4. **Don't create circular exports**
   ```typescript
   // Button.ts
   ❌ export { Card } from './Card'
   // Card.ts
   ❌ export { Button } from './Button'
   ```

## Related Patterns

- [Monorepo Structure](./monorepo-structure.md) — Workspace organization
- [Folder Structure](./folder-structure.md) — File organization
- [Configuration Patterns](./configuration-patterns.md) — tsconfig.json setup

---

*Pattern extracted from production libraries: @monorepo/ui, @monorepo/hooks, mercury-ui, mercury package*
*Examples: package.json exports field, barrel exports, component libraries, peer dependencies*