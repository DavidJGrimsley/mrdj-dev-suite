# Build Configuration Pattern

## Description

Build configuration involves setting up Expo's Metro bundler and native build systems to optimize app compilation, control output formats, manage dependencies, and enable platform-specific customization. This includes `metro.config.js`, `app.json` build settings, and build hooks.

## When to Use

**Configure builds when:**
- ✅ Setting up Metro bundler for React Native
- ✅ Customizing native code compilation
- ✅ Optimizing bundle size and performance
- ✅ Managing dependencies during build
- ✅ Enabling/disabling features per platform
- ✅ Setting up development vs. production builds
- ✅ Configuring EAS Build settings

## Core Concepts

**Build Configuration Layers:**
```
1. metro.config.js      → Metro bundler configuration
2. app.json             → Expo app configuration + build settings
3. eas.json             → EAS Build cloud build configuration
4. babel.config.js      → JavaScript transpilation
5. tsconfig.json        → TypeScript compilation
6. Plugins              → Expo plugins for native config
```

**Key Build Concerns:**
1. Module resolution and paths
2. Asset handling and transforms
3. Platform-specific bundling
4. Dependency optimization
5. Environment variable injection
6. Native module integration

## Code Examples

### Metro Configuration

```typescript
// File: metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

/**
 * Configure module resolution
 */
config.resolver = {
  ...config.resolver,
  // Add path aliases
  extraNodeModules: {
    '@': path.resolve(__dirname, 'src'),
    '@/assets': path.resolve(__dirname, 'assets'),
  },
  // Async requires allowed in certain directories
  asyncRequireModulePath: path.resolve(__dirname, 'metro'),
  // Additional source extensions
  sourceExts: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'mjs',
    'cjs',
  ],
};

/**
 * Configure transformer options
 */
config.transformer = {
  ...config.transformer,
  // Enable experimental stable types
  unstable_allowRequireContext: true,
};

/**
 * Configure watchman (file watcher)
 */
config.watchman = {
  ...config.watchman,
  healthCheck: {
    enabled: true,
  },
};

module.exports = config;
```

### App Configuration

```json
{
  "expo": {
    "name": "MyApp",
    "slug": "myapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    
    "assetBundlePatterns": ["**/*"],
    
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.mycompany.myapp",
      "buildNumber": "1"
    },
    
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.mycompany.myapp",
      "versionCode": 1
    },
    
    "web": {
      "favicon": "./assets/favicon.png",
      "output": "static",
      "bundler": "metro"
    },
    
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          },
          "android": {
            "minSdkVersion": 21,
            "targetSdkVersion": 34,
            "compileSdkVersion": 34
          }
        }
      ]
    ],
    
    "extra": {
      "eas": {
        "projectId": "12345678-1234-1234-1234-123456789012"
      }
    }
  }
}
```

### EAS Build Configuration

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "releaseChannel": "preview"
      },
      "ios": {
        "buildType": "simulator"
      }
    },
    "preview2": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "aab",
        "releaseChannel": "production"
      },
      "ios": {
        "buildType": "archive"
      }
    },
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    }
  },
  
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "@env ANDROID_SERVICE_ACCOUNT",
        "track": "production"
      },
      "ios": {
        "ascAppId": "1234567890",
        "appleId": "@env APPLE_ID",
        "ascAppPassword": "@env ASC_APP_PASSWORD"
      }
    }
  }
}
```

### Babel Configuration

```javascript
// File: babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Path aliases
      [
        'module-resolver',
        {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
          alias: {
            '@': './src',
            '@/assets': './assets',
          },
        },
      ],
      // Class properties and private fields
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-private-methods',
      // Dynamic imports
      '@babel/plugin-syntax-dynamic-import',
    ],
  };
};
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/assets/*": ["assets/*"]
    }
  },
  "include": [
    "src/**/*",
    "app.json",
    "metro.config.js",
    "babel.config.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

### Development vs. Production Build

```javascript
// File: metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Development-specific optimizations
 */
if (process.env.NODE_ENV === 'development') {
  config.transformer.minifierPath = false; // No minification
  config.resolver.sourceExts = [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'mjs',
  ];
}

/**
 * Production-specific optimizations
 */
if (process.env.NODE_ENV === 'production') {
  config.transformer = {
    ...config.transformer,
    minifierPath: 'metro-minify-uglify', // Use UglifyJS
  };
  
  config.resolver = {
    ...config.resolver,
    // In production, prefer compiled (lower priority on source)
    resolverMainFields: ['react-native', 'browser', 'main'],
  };
}

module.exports = config;
```

### Build Optimization

```javascript
// File: metro.config.js

const config = getDefaultConfig(__dirname);

/**
 * Optimize for bundle size
 */
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

/**
 * Configure caching
 */
config.cacheVersion = '1.0.0';
config.resetCache = process.env.RESET_CACHE === 'true';

/**
 * Configure serializer for web
 */
config.serializer = {
  ...config.serializer,
  // Enable treeshaking for web
  isThirdPartyModule: (module) =>
    /node_modules/.test(module),
};

module.exports = config;
```

## Build Configuration Best Practices

### ✅ DO

1. **Use environment variables for secrets**
   ```json
   {
     "extra": {
       "eas": {
         "projectId": "@env EAS_PROJECT_ID"
       }
     }
   }
   ```

2. **Configure different build profiles**
   ```json
   {
     "build": {
       "development": { "developmentClient": true },
       "preview": { "distribution": "internal" },
       "production": { "distribution": "store" }
     }
   }
   ```

3. **Optimize for production**
   ```javascript
   // Production builds use minification
   if (process.env.NODE_ENV === 'production') {
     config.transformer.minifierPath = 'metro-minify-uglify';
   }
   ```

4. **Document build settings**
   ```javascript
   // metro.config.js
   /**
    * Metro configuration for React Native
    * 
    * Development: Fast refresh, no minification
    * Production: Minified, optimized for size
    */
   ```

### ❌ DON'T

1. **Don't hardcode secrets in config**
   ```javascript
   // ❌ WRONG - Secrets in code
   {
     "apiKey": "sk-1234567890abcdef"
   }
   
   // ✅ RIGHT - Use environment variables
   {
     "apiKey": "@env API_KEY"
   }
   ```

2. **Don't miss platform-specific settings**
   ```json
   // ❌ WRONG - No platform config
   { "bundleIdentifier": "com.myapp" }
   
   // ✅ RIGHT - Platform-specific IDs
   {
     "ios": { "bundleIdentifier": "com.myapp" },
     "android": { "package": "com.myapp" }
   }
   ```

3. **Don't ignore dependency conflicts**
   ```javascript
   // ❌ WRONG - Unresolved conflicts
   // Conflicting peer dependencies not addressed
   
   // ✅ RIGHT - Resolve in metro config
   config.resolver.extraNodeModules = { ... };
   ```

## Related Patterns

- [CI/CD Patterns](./ci-cd-patterns.md) — Automated builds and deployment
- [Environment Configuration](./environment-config.md) — Environment setup
- [Hosting Setup](./hosting-setup.md) — Deployment targets

---

*Pattern extracted from production repositories: time2pay, core-monorepo, expo-super-template*
*Files: metro.config.js, app.json, eas.json, babel.config.js, tsconfig.json*
