# Monorepo Structure

## Description

Monorepo structure patterns establish how to organize multiple apps and shared libraries in a single repository using Turborepo + pnpm workspaces. This enables code sharing, unified tooling, and scalable development across interconnected projects.

## When to Use

**Apply monorepo patterns when:**
- ✅ Building multiple related apps (web, mobile, desktop)
- ✅ Creating shared component libraries
- ✅ Managing shared utilities, hooks, types
- ✅ Scaling team productivity across projects
- ✅ Centralizing configuration and tooling
- ✅ Enabling code reuse across packages

## Core Concepts

**Monorepo Architecture:**
```
monorepo/
├── apps/                 # Applications (Expo, Next.js, etc.)
│   ├── app-name/        # Standalone app with own routes/screens
│   └── another-app/
├── packages/            # Shared libraries and utilities
│   ├── ui/              # Component library
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilities and helpers
│   ├── types/           # Shared TypeScript types
│   ├── config/          # Configuration and constants
│   └── db/              # Database layer (Drizzle, schemas)
├── turbo.json          # Turborepo configuration
├── pnpm-workspace.yaml # Workspace definition
└── package.json        # Root package.json
```

**Key Benefits:**
- Single source of truth for dependencies
- Shared TypeScript configuration
- Unified CI/CD and linting
- Code deduplication
- Atomic version updates
- Optimized build cache

## Code Examples

### pnpm-workspace.yaml - Workspace Definition

```yaml
# pnpm-workspace.yaml - Define workspace structure
packages:
  - 'apps/*'
  - 'packages/*'

ignore:
  - '**/*.test.ts'
  - 'node_modules'
  - '.next'
  - 'dist'
  - 'build'

# Shallow clone (don't install transitive dependencies)
# Only direct dependencies installed
```

### turbo.json - Build Orchestration

```json
{
  "$schema": "https://turbo.build/schema.json",
  
  "globalDotEnv": [".env", ".env.production"],
  
  "tasks": {
    "build": {
      "description": "Build package for distribution",
      "outputs": ["dist/**", "build/**"],
      "outputMode": "full",
      "cache": true,
      "dependsOn": ["^build"]
    },
    
    "dev": {
      "description": "Start development server",
      "cache": false,
      "persistent": true
    },
    
    "test": {
      "description": "Run tests",
      "outputs": ["coverage/**"],
      "cache": true
    },
    
    "lint": {
      "description": "Run linting",
      "cache": true
    },
    
    "type-check": {
      "description": "Type-check TypeScript",
      "cache": true
    },
    
    "format": {
      "description": "Format code",
      "cache": false
    }
  },
  
  "ui": "tui",
  "concurrency": 4
}
```

### Root package.json - Workspace Configuration

```json
{
  "name": "core-monorepo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "lint:fix": "turbo lint -- --fix",
    "type-check": "turbo type-check",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "clean": "turbo clean && rm -rf node_modules",
    "install": "pnpm install"
  },
  
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.9.0"
  },
  
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  
  "pnpm": {
    "overrides": {
      "react": "^19.0.0",
      "react-native": "^0.83.0"
    }
  }
}
```

### apps/app-name/package.json - App-level Configuration

```json
{
  "name": "@monorepo/app-name",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  
  "scripts": {
    "dev": "expo start",
    "build": "expo build",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  
  "dependencies": {
    "@monorepo/ui": "workspace:*",
    "@monorepo/hooks": "workspace:*",
    "@monorepo/utils": "workspace:*",
    "@monorepo/db": "workspace:*",
    
    "react": "^19.0.0",
    "react-native": "^0.83.0",
    "expo": "^56.0.0",
    "expo-router": "^3.0.0",
    "zustand": "^4.4.0"
  },
  
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-native": "^0.83.0",
    "typescript": "^5.9.0",
    "eslint": "^9.0.0"
  }
}
```

### packages/ui/package.json - Library Configuration

```json
{
  "name": "@monorepo/ui",
  "version": "1.0.0",
  "description": "Shared UI component library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": {
      "import": "./dist/components/index.js",
      "types": "./dist/components/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    }
  },
  
  "files": ["dist", "src"],
  
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "eslint src"
  },
  
  "dependencies": {
    "@monorepo/utils": "workspace:*",
    "@monorepo/types": "workspace:*",
    
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

### packages/db/package.json - Database Layer

```json
{
  "name": "@monorepo/db",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./schemas": {
      "import": "./dist/schemas/index.js",
      "types": "./dist/schemas/index.d.ts"
    },
    "./queries": {
      "import": "./dist/queries/index.js",
      "types": "./dist/queries/index.d.ts"
    }
  },
  
  "scripts": {
    "build": "tsc",
    "db:push": "drizzle-kit push:pg",
    "db:pull": "drizzle-kit introspect:pg",
    "db:generate": "drizzle-kit generate:pg"
  },
  
  "dependencies": {
    "@monorepo/types": "workspace:*",
    "drizzle-orm": "^0.30.0",
    "postgres": "^3.4.0"
  },
  
  "devDependencies": {
    "drizzle-kit": "^0.20.0"
  }
}
```

### Monorepo File Structure

```
core-monorepo/
├── apps/
│   ├── creatisphere/           # Expo app
│   │   ├── src/app/
│   │   ├── src/components/
│   │   ├── package.json
│   │   ├── app.json
│   │   └── tsconfig.json
│   │
│   ├── higher/                 # Another Expo app
│   │   ├── src/app/
│   │   ├── src/components/
│   │   ├── package.json
│   │   └── app.json
│   │
│   └── website/                # Next.js app (optional)
│       ├── app/
│       ├── components/
│       └── package.json
│
├── packages/
│   ├── ui/
│   │   ├── src/components/     # Shared components
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── hooks/
│   │   ├── src/useAuth.ts
│   │   ├── src/useForm.ts
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── utils/
│   │   ├── src/date.ts
│   │   ├── src/string.ts
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── types/
│   │   ├── src/user.ts
│   │   ├── src/index.ts
│   │   └── package.json
│   │
│   ├── config/
│   │   ├── src/theme.ts
│   │   ├── src/constants.ts
│   │   └── package.json
│   │
│   └── db/
│       ├── src/schemas/
│       ├── src/queries/
│       ├── src/index.ts
│       ├── drizzle.config.ts
│       └── package.json
│
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace definition
├── tsconfig.base.json          # Base TypeScript config
├── package.json                # Root package
├── tsconfig.json
├── eslint.config.js
└── prettier.config.json
```

### tsconfig.base.json - Shared TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    
    "baseUrl": ".",
    "paths": {
      "@monorepo/ui": ["packages/ui/src"],
      "@monorepo/hooks": ["packages/hooks/src"],
      "@monorepo/utils": ["packages/utils/src"],
      "@monorepo/types": ["packages/types/src"],
      "@monorepo/config": ["packages/config/src"],
      "@monorepo/db": ["packages/db/src"]
    }
  }
}
```

### app tsconfig.json - App-specific Config

```json
{
  "extends": "../../tsconfig.base.json",
  
  "compilerOptions": {
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "@/components": ["./src/components"],
      "@/screens": ["./src/screens"],
      "@/store": ["./src/store"],
      "@/utils": ["./src/utils"]
    }
  },
  
  "include": ["src", "index.js"],
  "exclude": ["node_modules", "dist"]
}
```

### Workspace Dependencies - package.json Pattern

```json
{
  "dependencies": {
    "@monorepo/ui": "workspace:*",
    "@monorepo/hooks": "workspace:*",
    "@monorepo/db": "workspace:*"
  }
}
```

**Explanation:**
- `workspace:*` — Reference local package version
- pnpm resolves to actual package (not npm registry)
- Always uses local version during development
- Can be published independently

## Monorepo Best Practices

### ✅ DO

1. **Use workspace: references for local packages**
   ```json
   "@monorepo/ui": "workspace:*"  // References packages/ui
   ```

2. **Organize by domain (apps vs. packages)**
   ```
   apps/     - Standalone applications
   packages/ - Shared libraries and utilities
   ```

3. **Share TypeScript configuration**
   ```
   tsconfig.base.json - Root config
   tsconfig.json - App overrides
   ```

4. **Use Turborepo for task orchestration**
   ```json
   "build": {
     "dependsOn": ["^build"],  // Build deps first
     "cache": true
   }
   ```

5. **Extract common code to packages**
   ```
   - Shared components → packages/ui
   - Custom hooks → packages/hooks
   - Utilities → packages/utils
   - Types → packages/types
   ```

### ❌ DON'T

1. **Don't use relative paths for local packages**
   ```json
   ❌ "../../../packages/ui"
   ✅ "@monorepo/ui": "workspace:*"
   ```

2. **Don't duplicate code across apps**
   ```typescript
   ❌ Each app has its own useAuth hook
   ✅ Shared hook in packages/hooks
   ```

3. **Don't create overly nested package structure**
   ```
   ❌ packages/utils/src/helpers/date/formatting.ts
   ✅ packages/utils/src/date.ts
   ```

4. **Don't forget to update root package.json scripts**
   ```json
   ❌ Only app-level scripts
   ✅ Root scripts for "build all", "test all", "lint all"
   ```

## Related Patterns

- [Folder Structure](./folder-structure.md) — Individual app organization
- [Library Exports](./library-exports.md) — Package.json exports field
- [Build Configuration](./build-configuration.md) — Metro, Babel, tsconfig

---

*Pattern extracted from production monorepos: core-monorepo (3 apps, 6 packages), Mr. DJ's Dev Suite*
*Examples: pnpm-workspace.yaml, turbo.json, tsconfig.base.json, workspace:* references*
