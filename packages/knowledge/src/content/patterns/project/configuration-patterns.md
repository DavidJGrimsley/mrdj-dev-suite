# Configuration Patterns

## Description

Configuration patterns establish consistent strategies for managing app configuration files across development, staging, and production environments. These patterns standardize `app.json`, `package.json`, build configs, and environment setup for reproducible, maintainable builds.

## When to Use

**Apply configuration patterns when:**
- ✅ Setting up a new Expo project
- ✅ Configuring iOS/Android builds
- ✅ Managing environment variables (dev/staging/prod)
- ✅ Optimizing build performance
- ✅ Enabling code transformations (Babel, Metro)
- ✅ Scaling to multiple platforms/app variants

## Core Concepts

**Configuration Hierarchy:**
```
1. app.json / app.config.js
   └── Expo configuration (SDK, plugins, native config)

2. package.json
   └── Dependencies, scripts, metadata

3. tsconfig.json
   └── TypeScript compilation settings

4. metro.config.js
   └── Metro bundler (module resolution, assets)

5. babel.config.js
   └── Code transformation (async/await, decorators)

6. .env files
   └── Runtime environment variables
```

## Code Examples

### app.json - Static Expo Configuration

```json
{
  "expo": {
    "name": "DJsPortfolio",
    "slug": "djsportfolio",
    "version": "1.0.0",
    "scheme": "djsportfolio",
    
    "platforms": ["ios", "android", "web"],
    
    "sdkVersion": "55.0.0",
    "runtimeVersion": "55.0.0",
    
    "web": {
      "output": "static",
      "favicon": "./public/favicon.ico",
      "bundler": "metro"
    },
    
    "ios": {
      "bundleIdentifier": "com.mrdj2u.djsportfolio",
      "buildNumber": "1",
      "supportsTabletMode": true
    },
    
    "android": {
      "package": "com.mrdj2u.djsportfolio",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./public/adaptive-icon.png",
        "backgroundImage": "./public/adaptive-icon-background.png"
      }
    },
    
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow DJsPortfolio to access camera"
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./public/splash.png",
          "resizeMode": "contain"
        }
      ]
    ],
    
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

### app.config.js - Dynamic Expo Configuration

```javascript
// app.config.js - Allows environment-based config
export default ({ config }) => {
  const isDev = process.env.APP_ENV === 'development';
  const isStaging = process.env.APP_ENV === 'staging';
  
  return {
    ...config,
    
    name: isStaging ? 'DJsPortfolio (Staging)' : 'DJsPortfolio',
    
    extra: {
      apiUrl: isDev
        ? 'http://localhost:3000'
        : isStaging
        ? 'https://staging-api.davidjgrimsley.com'
        : 'https://api.davidjgrimsley.com',
      
      environment: process.env.APP_ENV || 'development',
      logLevel: isDev ? 'debug' : 'warn',
    },
    
    ios: {
      bundleIdentifier: isDev
        ? 'com.mrdj2u.djsportfolio.dev'
        : isStaging
        ? 'com.mrdj2u.djsportfolio.staging'
        : 'com.mrdj2u.djsportfolio',
    },
    
    android: {
      package: isDev
        ? 'com.mrdj2u.djsportfolio.dev'
        : isStaging
        ? 'com.mrdj2u.djsportfolio.staging'
        : 'com.mrdj2u.djsportfolio',
    },
  };
};
```

### package.json - Dependencies & Scripts

```json
{
  "name": "djsportfolio",
  "version": "1.0.0",
  "description": "Personal portfolio with React Native & Expo",
  
  "type": "module",
  "main": "index.js",
  "private": true,
  
  "scripts": {
    "dev": "expo start",
    "dev:ios": "expo start --ios",
    "dev:android": "expo start --android",
    "dev:web": "expo start --web",
    
    "build": "expo build",
    "build:web": "expo export -p web",
    
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    
    "test": "jest",
    "test:watch": "jest --watch",
    
    "eas:build:ios": "eas build --platform ios",
    "eas:build:android": "eas build --platform android",
    "eas:submit": "eas submit"
  },
  
  "dependencies": {
    "react": "^19.0.0",
    "react-native": "^0.83.0",
    "expo": "^55.0.0",
    "expo-router": "^3.0.0",
    "zustand": "^4.4.0",
    "drizzle-orm": "^0.30.0",
    "@react-native-async-storage/async-storage": "^1.21.0"
  },
  
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-native": "^0.83.0",
    "typescript": "^5.9.0",
    "eslint": "^9.0.0",
    "@babel/core": "^7.23.0"
  },
  
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### tsconfig.json - TypeScript Configuration

```json
{
  "extends": "@react-native/tsconfig",
  
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    
    "moduleResolution": "node",
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/assets/*": ["assets/*"]
    },
    
    "types": ["expo", "@react-native-types", "node"],
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  
  "include": ["src", "index.js"],
  "exclude": ["node_modules", "dist", "build"]
}
```

### metro.config.js - Module Resolution

```javascript
const { getDefaultConfig } = require('@react-native/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

const customConfig = {
  projectRoot: __dirname,
  
  resolver: {
    // Module resolution
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'wav', 'mp3'],
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
    
    // Platform-specific modules
    platform: 'web',
    
    // Alias resolution (alternative to tsconfig paths)
    extraNodeModules: {
      '@': `${__dirname}/src`,
    },
  },
  
  transformer: {
    // Enable CSS support via Uniwind
    unstable_allowRequireContext: true,
  },
};

// Apply Uniwind configuration
module.exports = withUniwindConfig(customConfig, {
  cssEntryFile: './src/global.css',
});
```

### babel.config.js - Code Transformation

```javascript
module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      'babel-preset-expo',
      ['@babel/preset-typescript', { allowDeclareFields: true }],
    ],
    
    plugins: [
      // React optimization (enabled by default in Expo SDK 54+)
      ['babel-plugin-react-compiler', { target: '19' }],
      
      // Async/await support
      '@babel/plugin-proposal-async-generator-functions',
      
      // Decorators (if using)
      ['@babel/plugin-proposal-decorators', { loose: true }],
      
      // Class properties
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      
      // Module resolution
      ['module-resolver', {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
          '@': './src',
        },
      }],
    ],
  };
};
```

### .env Files - Environment Variables

```bash
# .env.development (local development)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_ENABLE_DEVTOOLS=true

DATABASE_URL=postgresql://dev:password@localhost:5432/djsportfolio_dev
JWT_SECRET=dev-secret-key-not-for-production

# .env.staging (staging environment)
EXPO_PUBLIC_API_URL=https://staging-api.davidjgrimsley.com
EXPO_PUBLIC_LOG_LEVEL=info
EXPO_PUBLIC_ENABLE_DEVTOOLS=false

DATABASE_URL=postgresql://user:password@staging-db:5432/djsportfolio_staging
JWT_SECRET=<from-secure-vault>

# .env.production (production)
EXPO_PUBLIC_API_URL=https://api.davidjgrimsley.com
EXPO_PUBLIC_LOG_LEVEL=warn
EXPO_PUBLIC_ENABLE_DEVTOOLS=false

DATABASE_URL=postgresql://user:password@prod-db:5432/djsportfolio
JWT_SECRET=<from-secure-vault>
```

### .env.example - Template

```bash
# Public variables (exposed to client)
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_LOG_LEVEL=warn
EXPO_PUBLIC_ENABLE_DEVTOOLS=false

# Private variables (server-only)
DATABASE_URL=postgresql://user:password@db:5432/app
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_...
```

### Configuration Loading (src/constants/config.ts)

```typescript
// src/constants/config.ts - Centralized config access
import * as SecureStore from 'expo-secure-store';

export const PUBLIC_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  logLevel: (process.env.EXPO_PUBLIC_LOG_LEVEL || 'warn') as LogLevel,
  enableDevTools: process.env.EXPO_PUBLIC_ENABLE_DEVTOOLS === 'true',
};

// Server-side only
export const PRIVATE_CONFIG = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
};

// Runtime validation
if (!PUBLIC_CONFIG.apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

// Usage in components
export function useConfig() {
  return PUBLIC_CONFIG;
}
```

## Configuration Best Practices

### ✅ DO

1. **Use EXPO_PUBLIC_ prefix for client variables**
   ```bash
   EXPO_PUBLIC_API_URL=...    # ✅ Available in app
   DATABASE_URL=...           # ✅ Private, not exposed
   ```

2. **Separate environment configs**
   ```bash
   .env.development
   .env.staging
   .env.production
   ```

3. **Validate config on startup**
   ```typescript
   if (!process.env.EXPO_PUBLIC_API_URL) {
     throw new Error('EXPO_PUBLIC_API_URL is required');
   }
   ```

4. **Use app.config.js for dynamic config**
   ```javascript
   // Allows environment-based changes
   const apiUrl = isDev ? 'http://localhost' : 'https://prod-api.com';
   ```

### ❌ DON'T

1. **Don't expose secrets in client**
   ```bash
   ❌ EXPO_PUBLIC_API_KEY=sk_secret...
   ✅ API_KEY=sk_secret... (private)
   ```

2. **Don't commit .env files**
   ```bash
   # .gitignore
   .env
   .env.*.local
   .env.production.local
   ```

3. **Don't mix config sources**
   ```typescript
   ❌ process.env.API_URL sometimes, config.apiUrl other times
   ✅ Always use centralized config object
   ```

4. **Don't hardcode values in code**
   ```typescript
   ❌ const API_URL = 'https://api.example.com';
   ✅ const API_URL = process.env.EXPO_PUBLIC_API_URL;
   ```

## Related Patterns

- [Build Configuration](./build-configuration.md) — Metro, Babel, tsconfig
- [Environment Configuration](../deployment/environment-config.md) — Env setup
- [Folder Structure](./folder-structure.md) — File organization

---

*Pattern extracted from production repositories: DJsPortfolio, time2pay, not-hot-dog*
*Examples: app.json, app.config.js, metro.config.js, babel.config.js, tsconfig.json*