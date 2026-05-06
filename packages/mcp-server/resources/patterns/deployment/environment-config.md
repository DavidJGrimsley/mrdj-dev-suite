# Environment Configuration Pattern

## Description

Environment configuration involves organizing and managing environment variables across development, staging, and production. This includes distinguishing between client-side public variables (exposed in build) and server-side private variables (never exposed), using proper naming conventions, and managing secrets securely.

## When to Use

**Configure environments when:**
- ✅ Switching between dev/staging/production
- ✅ Managing API URLs per environment
- ✅ Handling secrets and private keys
- ✅ Configuring database connections
- ✅ Setting feature flags
- ✅ Managing logging levels
- ✅ Building for web vs. native

## Core Concepts

**Environment Variable Types:**

```
1. Public (Client-Exposed)
   ├── EXPO_PUBLIC_*           → Included in client build
   ├── REACT_APP_*             → React convention (Expo also supports)
   └── VUE_APP_*               → Vue convention (if applicable)

2. Private (Server-Only)
   ├── DATABASE_URL            → Database connection
   ├── API_SECRET_KEY          → Signing secrets
   ├── JWT_SECRET              → JWT signing
   ├── STRIPE_SECRET_KEY       → Payment secrets
   └── (no prefix)             → Convention: private unless EXPO_PUBLIC_
```

**Why the Distinction?**
- Public variables: baked into client bundle, visible to end users
- Private variables: stay on server, never exposed to client
- Mixing = security vulnerability

## Code Examples

### Environment File Structure

```bash
# File: .env (development)
# Public variables - EXPOSED in client build
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=MyApp
EXPO_PUBLIC_LOG_LEVEL=debug

# Private variables - NEVER exposed (dev only)
DATABASE_URL=postgresql://user:pass@localhost:5432/appdb
JWT_SECRET=dev-secret-key-12345
STRIPE_SECRET_KEY=sk_test_1234567890abcdef
```

```bash
# File: .env.production (production)
# Public variables
EXPO_PUBLIC_API_URL=https://api.example.com
EXPO_PUBLIC_APP_NAME=MyApp
EXPO_PUBLIC_LOG_LEVEL=warn

# Private variables - stored in secure vault or CI/CD secrets
DATABASE_URL=postgresql://user:secure-password@db.example.com:5432/proddb
JWT_SECRET=<from-secure-vault>
STRIPE_SECRET_KEY=sk_live_1234567890abcdef
```

### Accessing Environment Variables in Code

```typescript
// File: src/config.ts
import { Platform } from 'react-native';

/**
 * Public configuration (safe for client)
 * These are prefixed with EXPO_PUBLIC_ and baked into the bundle
 */
export const PUBLIC_CONFIG = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  appName: process.env.EXPO_PUBLIC_APP_NAME || 'MyApp',
  logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'warn',
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Private configuration (server-side only)
 * Only available in Node.js, NOT in client
 */
export const PRIVATE_CONFIG = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
};

/**
 * Validation - ensure required vars are present
 */
export function validateConfig() {
  // Check public vars (development only)
  if (process.env.NODE_ENV === 'development') {
    if (!PUBLIC_CONFIG.apiUrl) {
      throw new Error('EXPO_PUBLIC_API_URL is required');
    }
  }
  
  // Check private vars (server-side only)
  if (typeof window === 'undefined') {
    // Running on server
    if (!PRIVATE_CONFIG.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }
    if (!PRIVATE_CONFIG.jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }
  }
}

// Validate on startup
validateConfig();
```

### API Configuration

```typescript
// File: src/services/api.ts
import { PUBLIC_CONFIG } from '@/config';

const API_BASE_URL = PUBLIC_CONFIG.apiUrl;

export const api = {
  // All requests use the configured API URL
  get: (path: string) => 
    fetch(`${API_BASE_URL}${path}`),
  
  post: (path: string, data: any) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    }),
};

// Usage
const users = await api.get('/users');
```

### Server-Side Configuration

```typescript
// File: api-server/src/config.ts
import { PRIVATE_CONFIG, PUBLIC_CONFIG } from '@/config';

/**
 * Server can access both public and private config
 */
export const serverConfig = {
  // Public (can be sent to clients if needed)
  public: PUBLIC_CONFIG,
  
  // Private (never send to clients)
  private: PRIVATE_CONFIG,
  
  // Database
  database: {
    connectionString: PRIVATE_CONFIG.databaseUrl,
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
    },
  },
  
  // Auth
  auth: {
    jwtSecret: PRIVATE_CONFIG.jwtSecret,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    refreshExpiry: process.env.REFRESH_EXPIRY || '30d',
  },
  
  // Payment
  stripe: {
    secretKey: PRIVATE_CONFIG.stripeSecretKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
};
```

### Build-Time Environment Configuration

```typescript
// File: babel.config.js - Support @env directives
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@': './src',
        },
      },
    ],
  ],
};
```

```typescript
// File: src/constants/api.ts - Using @env syntax
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Usage in code:
export const endpoints = {
  users: `${API_URL}/api/users`,
  posts: `${API_URL}/api/posts`,
  // etc
};
```

### Environment-Specific Configuration

```typescript
// File: src/config/environments.ts
type Environment = 'development' | 'staging' | 'production';

const environments: Record<Environment, any> = {
  development: {
    apiUrl: 'http://localhost:3000',
    logLevel: 'debug',
    debugMode: true,
    analytics: false,
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    logLevel: 'info',
    debugMode: false,
    analytics: true,
  },
  production: {
    apiUrl: 'https://api.example.com',
    logLevel: 'warn',
    debugMode: false,
    analytics: true,
  },
};

const currentEnv = (process.env.NODE_ENV || 'development') as Environment;

export const config = environments[currentEnv];
```

### CI/CD Environment Secrets

```yaml
# File: .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Build app
        env:
          # Public variables (can be in code)
          EXPO_PUBLIC_API_URL: ${{ secrets.PROD_API_URL }}
          EXPO_PUBLIC_LOG_LEVEL: warn
          
          # Private variables (for build process only)
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
          STRIPE_SECRET_KEY: ${{ secrets.PROD_STRIPE_SECRET_KEY }}
        run: npm run build
```

### .env File Examples

```bash
# File: .env.example (commit to repo - no secrets)
# Copy to .env and fill in values

# Public (safe to commit, used in builds)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_NAME=MyApp
EXPO_PUBLIC_LOG_LEVEL=debug

# Private (DO NOT COMMIT)
# DATABASE_URL=postgresql://user:password@localhost:5432/app
# JWT_SECRET=your-secret-key-here
# STRIPE_SECRET_KEY=sk_test_...
```

## Environment Configuration Best Practices

### ✅ DO

1. **Use EXPO_PUBLIC_ prefix for client variables**
   ```typescript
   // Baked into bundle
   const apiUrl = process.env.EXPO_PUBLIC_API_URL;
   ```

2. **Separate public from private variables**
   ```
   Public:  EXPO_PUBLIC_API_URL
   Private: DATABASE_URL (no prefix)
   ```

3. **Validate required variables on startup**
   ```typescript
   if (!process.env.EXPO_PUBLIC_API_URL) {
     throw new Error('EXPO_PUBLIC_API_URL required');
   }
   ```

4. **Use .env.example as template**
   ```bash
   # .env.example shows structure without secrets
   EXPO_PUBLIC_API_URL=http://localhost:3000
   # DATABASE_URL=postgresql://...
   ```

### ❌ DON'T

1. **Don't expose secrets in client code**
   ```typescript
   // ❌ WRONG - API key visible in app
   const apiKey = 'sk_live_1234567890';
   
   // ✅ RIGHT - Use server-side only
   // Server handles auth, client doesn't need key
   ```

2. **Don't commit .env files**
   ```
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

3. **Don't mix public/private without prefixes**
   ```typescript
   // ❌ WRONG - Unclear which is exposed
   process.env.API_URL         // Is this public?
   process.env.SECRET_KEY      // Exposed to client?
   
   // ✅ RIGHT - Clear intent
   process.env.EXPO_PUBLIC_API_URL    // Definitely public
   process.env.JWT_SECRET             // Definitely private
   ```

4. **Don't hardcode values**
   ```typescript
   // ❌ WRONG
   const apiUrl = 'https://api.example.com';
   
   // ✅ RIGHT
   const apiUrl = process.env.EXPO_PUBLIC_API_URL;
   ```

## Related Patterns

- [Build Configuration](./build-configuration.md) — Build setup and optimization
- [CI/CD Patterns](./ci-cd-patterns.md) — Automated deployment
- [Hosting Setup](./hosting-setup.md) — Server configuration

---

*Pattern extracted from production repositories: time2pay, PokePages, core-monorepo*
*Files: .env.*, app.json, babel.config.js, GitHub Actions workflows*