# Project Folder Structure Pattern

## Description

Project folder structure establishes a consistent, scalable organization for single-package Expo apps and feature-based libraries. This pattern balances discoverability with maintainability, grouping related functionality while keeping the root shallow and navigable.

## When to Use

**Organize project folders when:**
- ✅ Setting up a new Expo app
- ✅ Scaling from prototype to production
- ✅ Adding new features or modules
- ✅ Sharing code across platforms (web/native)
- ✅ Building reusable component libraries
- ✅ Organizing API routes and services

## Core Concepts

**Folder Strategy:**
- Root-level shallow (max 10-15 entries)
- Feature-driven organization within `src/`
- Shared utilities isolated from business logic
- Platform-specific code colocated with shared code

## Code Examples

### Recommended Folder Structure

```
project-root/
├── src/
│   ├── app/                      # Expo Router routes (file-based)
│   │   ├── _layout.tsx          # Root layout, providers
│   │   ├── +html.tsx            # Custom HTML (web)
│   │   ├── +not-found.tsx       # 404 route
│   │   ├── index.tsx            # Home page
│   │   ├── (drawer)/            # Drawer navigation group
│   │   │   ├── _layout.tsx      # Drawer layout
│   │   │   ├── (tabs)/          # Tab navigation
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx    # Home tab
│   │   │   │   └── profile.tsx
│   │   │   └── settings.tsx
│   │   ├── auth/
│   │   │   ├── sign-in.tsx
│   │   │   └── sign-up.tsx
│   │   └── api/
│   │       └── +api.ts          # API routes
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Animation/           # Animated components
│   │   ├── Auth/                # Auth-related components
│   │   ├── Cards/               # Card variants
│   │   ├── Forms/               # Form components
│   │   ├── Lists/               # List components
│   │   ├── Navigation/          # Nav components
│   │   ├── Text/                # Text variants
│   │   └── UI/                  # Generic UI (Button, Modal, etc.)
│   │
│   ├── features/                # Feature-specific business logic
│   │   ├── auth/
│   │   │   ├── hooks/           # useAuth, useLogin
│   │   │   ├── services/        # Auth service
│   │   │   ├── types.ts         # Auth types
│   │   │   └── index.ts         # Barrel export
│   │   │
│   │   ├── posts/
│   │   │   ├── hooks/           # usePost, usePosts
│   │   │   ├── services/        # Post API service
│   │   │   ├── store.ts         # Zustand store
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   └── social/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── store.ts
│   │       └── index.ts
│   │
│   ├── hooks/                   # Shared custom hooks
│   │   ├── useApi.ts
│   │   ├── useForm.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useTheme.ts
│   │   └── index.ts
│   │
│   ├── services/                # Shared services
│   │   ├── api.ts               # API client
│   │   ├── storage.ts           # Storage abstraction
│   │   ├── auth.ts              # Auth service
│   │   └── index.ts
│   │
│   ├── store/                   # Global state (Zustand)
│   │   ├── authStore.ts
│   │   ├── settingsStore.ts
│   │   └── index.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── formatting.ts        # Date, number formatting
│   │   ├── validators.ts        # Input validation
│   │   ├── helpers.ts           # Generic helpers
│   │   └── index.ts
│   │
│   ├── constants/               # App constants
│   │   ├── theme.ts             # Colors, spacing, typography
│   │   ├── errors.ts            # Error messages
│   │   └── index.ts
│   │
│   ├── types/                   # TypeScript types
│   │   ├── api.ts               # API types
│   │   ├── domain.ts            # Business domain types
│   │   └── index.ts
│   │
│   └── context/                 # React Context (if needed)
│       ├── ThemeContext.tsx
│       └── MapContext.tsx
│
├── public/                      # Static assets
│   ├── icons/                   # App icons, favicons
│   ├── images/                  # Static images
│   ├── manifest.webmanifest     # PWA manifest
│   └── sw.js                    # Service worker
│
├── project/                     # Project metadata & docs
│   ├── info.md                  # Project description
│   ├── style.md                 # Design system
│   ├── todo.md                  # Roadmap
│   └── architecture.md          # Architecture decisions
│
├── .env.example                 # Environment template
├── app.json                     # Expo config
├── app.config.js                # Dynamic Expo config
├── babel.config.js              # Babel presets
├── metro.config.js              # Metro bundler config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
└── README.md                    # Getting started
```

### Alternative: Feature-Based (Monorepo App)

```
apps/my-app/
├── src/
│   ├── app/                 # Routes (same as above)
│   ├── features/
│   │   ├── auth/
│   │   ├── posts/
│   │   └── social/
│   ├── shared/              # Shared across features
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── ui/              # Design system
│   │   └── utils/
│   └── core/                # App core
│       ├── store/
│       ├── context/
│       └── constants/
├── public/
├── project/
└── package.json
```

### Platform-Specific Code Organization

```
src/components/
├── Button/
│   ├── Button.tsx                  # Shared implementation
│   ├── Button.web.tsx              # Web overrides
│   ├── Button.native.tsx           # iOS/Android overrides
│   ├── Button.ios.tsx              # iOS-specific
│   ├── Button.android.tsx          # Android-specific
│   └── index.ts
│
└── ThemedText/
    ├── ThemedText.tsx              # Default
    ├── ThemedText.web.tsx          # Web-specific
    └── index.ts
```

### Barrel Exports (index.ts Pattern)

```typescript
// File: src/components/index.ts
export * from './Animation';
export * from './Cards';
export * from './Forms';
export * from './UI';

// File: src/features/index.ts
export * as auth from './auth';
export * as posts from './posts';
export * as social from './social';

// File: src/index.ts
export * from './components';
export * from './features';
export * from './hooks';
export * from './services';
export * from './store';
export * from './utils';
```

### Service Organization

```typescript
// File: src/services/api.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const api = {
  users: {
    getAll: () => fetch(`${API_BASE_URL}/users`),
    getById: (id: string) => fetch(`${API_BASE_URL}/users/${id}`),
    create: (data: any) => post(`${API_BASE_URL}/users`, data),
    update: (id: string, data: any) => put(`${API_BASE_URL}/users/${id}`, data),
    delete: (id: string) => delete_(`${API_BASE_URL}/users/${id}`),
  },
  
  posts: {
    getAll: () => fetch(`${API_BASE_URL}/posts`),
    create: (data: any) => post(`${API_BASE_URL}/posts`, data),
  },
};

// File: src/features/auth/services/index.ts
import { api } from '@/services';

export const authService = {
  signIn: (email: string, password: string) => {
    return api.post('/auth/sign-in', { email, password });
  },
  
  signUp: (email: string, password: string) => {
    return api.post('/auth/sign-up', { email, password });
  },
};
```

### Hook Organization

```typescript
// File: src/features/posts/hooks/usePosts.ts
import { useEffect, useState } from 'react';
import { api } from '@/services';

export function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    api.posts.getAll()
      .then(setPosts)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  return { posts, loading, error };
}

// File: src/hooks/useApi.ts - Shared API hook
export function useApi(url: string, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch(url, options)
      .then(r => r.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);
  
  return { data, loading, error };
}
```

### Constants Organization

```typescript
// File: src/constants/theme.ts
export const colors = {
  primary: '#007AFF',
  secondary: '#5AC8FA',
  error: '#FF3B30',
  success: '#34C759',
  
  light: {
    background: '#FFFFFF',
    text: '#000000',
  },
  
  dark: {
    background: '#000000',
    text: '#FFFFFF',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// File: src/constants/errors.ts
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed',
  UNAUTHORIZED: 'Not authorized',
  NOT_FOUND: 'Resource not found',
};
```

## Folder Organization Best Practices

### ✅ DO

1. **Keep root-level shallow**
   ```
   src/
   ├── app/
   ├── components/
   ├── features/
   ├── hooks/
   ├── services/
   └── utils/
   ```

2. **Use feature-based organization**
   ```
   features/auth/hooks/
   features/posts/services/
   ```

3. **Colocate platform-specific code**
   ```
   components/Button.tsx
   components/Button.web.tsx
   components/Button.native.tsx
   ```

4. **Use barrel exports (index.ts)**
   ```typescript
   // src/features/auth/index.ts
   export * from './hooks';
   export * from './services';
   export * from './store';
   ```

### ❌ DON'T

1. **Don't mix routes with screens**
   ```
   // ❌ WRONG
   app/ProfileScreen.tsx      // Route = screen
   
   // ✅ RIGHT
   app/profile.tsx            // Route file
   components/ProfileScreen.tsx // Screen component
   ```

2. **Don't nest too deeply**
   ```
   // ❌ WRONG - 6 levels deep
   src/features/posts/screens/components/ui/Button.tsx
   
   // ✅ RIGHT - 3 levels
   src/components/Button.tsx
   ```

3. **Don't scatter related code**
   ```
   // ❌ WRONG - Auth scattered
   hooks/useAuth.ts
   services/auth.ts
   store/authStore.ts
   
   // ✅ RIGHT - Grouped
   features/auth/hooks/
   features/auth/services/
   features/auth/store.ts
   ```

## Related Patterns

- [Documentation Organization](./documentation-org.md) — Docs structure
- [Configuration Patterns](./configuration-patterns.md) — Config files
- [Monorepo Structure](./monorepo-structure.md) — Multi-package repos

---

*Pattern extracted from production repositories: DJsPortfolio, not-hot-dog, core-monorepo*
*Examples: app/ structure, features/ organization, src/ layout*