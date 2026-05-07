# Persistence Middleware Pattern

## Description

Persistence middleware enables Zustand stores to automatically save state to AsyncStorage (mobile) or localStorage (web), with automatic hydration on app startup. This pattern provides offline-first state management where user data persists across app sessions and devices.

## When to Use

**Use persistence middleware** for:
- ✅ User authentication (sessions, tokens, profiles)
- ✅ User preferences and settings
- ✅ Feature state (favorites, tracking, progress)
- ✅ Feature flags and configuration
- ✅ Offline-first user data
- ✅ Quick app resumption (instant state restoration)

**Don't persist:**
- ❌ Transient loading/error states
- ❌ Real-time data (scores, counts from API)
- ❌ Sensitive data (without encryption)
- ❌ Temporary UI state (modal visibility)

## Core Concepts

**Persist middleware workflow:**
1. **Initialize**: App loads, hydrate stored state from storage
2. **Use**: Normal store operations, state updates automatically
3. **Save**: Middleware detects changes, writes to storage
4. **Restore**: User reopens app, stored state automatically loaded

**Storage options:**
- Mobile (React Native): `@react-native-async-storage/async-storage`
- Web: Built-in `localStorage`
- Cross-platform: Conditional import via platform detection

## Code Example

### Basic Persistence Setup

```typescript
// File: src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // State and actions
      user: null,
      profile: null,
      session: null,
      isLoggedIn: false,
      loading: true,
      error: null,

      setUser: (user) => set({ user, isLoggedIn: !!user }),

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          profile: null,
          session: null,
          isLoggedIn: false,
        });
      },
    }),
    {
      // Persistence configuration
      name: 'auth-storage',                                    // Storage key
      storage: createJSONStorage(() => AsyncStorage),         // Storage adapter
      partialize: (state) => ({                               // Partial persistence
        user: state.user,
        profile: state.profile,
        session: state.session,
        // NOT persisted: loading, error (transient)
      }),
    }
  )
);
```

### Cross-Platform Storage

```typescript
// File: src/utils/storage.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageValue } from 'zustand/middleware';

/**
 * Cross-platform storage adapter
 * Mobile: AsyncStorage
 * Web: localStorage
 */
export const createCrossPlatformStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (name: string): StorageValue | null => {
        const value = localStorage.getItem(name);
        return value ? JSON.parse(value) : null;
      },
      setItem: (name: string, value: StorageValue): void => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: (name: string): void => {
        localStorage.removeItem(name);
      },
    };
  }

  return {
    getItem: async (name: string): Promise<StorageValue | null> => {
      const value = await AsyncStorage.getItem(name);
      return value ? JSON.parse(value) : null;
    },
    setItem: async (name: string, value: StorageValue): Promise<void> => {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: async (name: string): Promise<void> => {
      await AsyncStorage.removeItem(name);
    },
  };
};

// Usage
const storage = createCrossPlatformStorage();
```

### Partial Persistence Pattern

```typescript
// File: src/store/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  // User preferences (PERSIST these)
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  compactMode: boolean;

  // Transient UI state (DON'T persist)
  loading: boolean;
  error: string | null;
  syncInProgress: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
  setSyncInProgress: (inProgress: boolean) => void;
  resetSettings: () => void;
}

const initialState: Pick<
  SettingsState,
  'theme' | 'language' | 'notifications' | 'compactMode'
> = {
  theme: 'auto',
  language: 'en',
  notifications: true,
  compactMode: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      // Transient state
      loading: false,
      error: null,
      syncInProgress: false,

      // Actions
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleNotifications: () =>
        set((state) => ({ notifications: !state.notifications })),
      setSyncInProgress: (inProgress) => set({ syncInProgress: inProgress }),

      resetSettings: () => set(initialState),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),

      // Key pattern: Only persist user preferences, not transient state
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notifications: state.notifications,
        compactMode: state.compactMode,
        // Excluded: loading, error, syncInProgress
      }),
    }
  )
);
```

### Middleware Composition

```typescript
// File: src/store/appStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  appVersion: string;
  lastOpenedAt: number;
  userPreferences: Record<string, any>;

  setAppVersion: (version: string) => void;
  updatePreference: (key: string, value: any) => void;
}

export const useAppStore = create<AppState>()(
  devtools(  // Dev tools wrapper (outer)
    persist(  // Persistence middleware (middle)
      (set) => ({
        appVersion: '1.0.0',
        lastOpenedAt: Date.now(),
        userPreferences: {},

        setAppVersion: (version) => set({ appVersion: version }),

        updatePreference: (key, value) =>
          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              [key]: value,
            },
          })),
      }),
      {
        name: 'app-storage',
        storage: createJSONStorage(() => AsyncStorage),
      }
    ),
    { name: 'AppStore' }
  )
);
```

### State Hydration & Initialization

```typescript
// File: src/hooks/useAppInitialization.ts
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useDexTrackerStore } from '@/store/dexTrackerStore';

/**
 * Initialize app state on startup
 * Hydrates persisted stores and performs async initialization
 */
export function useAppInitialization() {
  const [isReady, setIsReady] = useState(false);
  const authStore = useAuthStore();
  const dexStore = useDexTrackerStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Stores auto-hydrate from storage (middleware)
        // Do any async initialization after hydration
        if (authStore.isLoggedIn && authStore.user) {
          // Verify session is still valid
          // Sync user data from API if needed
          await authStore.initializeAuth();
        }

        // Other initialization tasks
        // ...
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  return { isReady };
}

// Usage in root component
export function App() {
  const { isReady } = useAppInitialization();

  if (!isReady) {
    return <SplashScreen />;
  }

  return <RootLayout />;
}
```

### Storage Migration Pattern

```typescript
// File: src/utils/storageMigration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Migrate persisted state when schema changes
 * Called before store initialization
 */
export async function migrateStorage() {
  try {
    const authData = await AsyncStorage.getItem('auth-storage');
    if (!authData) return;

    const state = JSON.parse(authData);

    // Migrate from v1 to v2
    if (state.version === 1) {
      // Transform old structure to new structure
      const migratedState = {
        ...state,
        version: 2,
        // Add new fields with defaults
        profile: state.profile || null,
        // Remove deprecated fields
      };

      delete migratedState.oldField;

      await AsyncStorage.setItem('auth-storage', JSON.stringify(migratedState));
    }
  } catch (error) {
    console.error('Storage migration error:', error);
  }
}

// Call during app initialization
export function App() {
  useEffect(() => {
    migrateStorage().then(() => {
      // Initialize stores
    });
  }, []);
}
```

### Error Handling & Recovery

```typescript
// File: src/store/withPersistenceError.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SafeStorageState {
  data: any;
  storageError: string | null;
  clearStorage: () => Promise<void>;
}

/**
 * Storage adapter with error handling and recovery
 */
const safeStorage = createJSONStorage(() => AsyncStorage);

const originalGetItem = safeStorage.getItem;
const originalSetItem = safeStorage.setItem;

const SafeJSONStorage = {
  ...safeStorage,

  getItem: async (name: string) => {
    try {
      return await originalGetItem(name);
    } catch (error) {
      console.error(`Error reading from storage (${name}):`, error);
      // Return null on error - store will use defaults
      return null;
    }
  },

  setItem: async (name: string, value: any) => {
    try {
      await originalSetItem(name, value);
    } catch (error) {
      console.error(`Error writing to storage (${name}):`, error);
      // Continue - store remains in memory even if storage fails
    }
  },

  removeItem: async (name: string) => {
    try {
      await safeStorage.removeItem(name);
    } catch (error) {
      console.error(`Error removing storage (${name}):`, error);
    }
  },
};

// Use in store
export const useSafeStore = create<SafeStorageState>()(
  persist(
    (set) => ({
      data: null,
      storageError: null,

      clearStorage: async () => {
        try {
          await AsyncStorage.removeItem('safe-storage');
          set({ data: null });
        } catch (error) {
          set({
            storageError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    }),
    {
      name: 'safe-storage',
      storage: SafeJSONStorage,
    }
  )
);
```

## Persistence Best Practices

### ✅ DO

1. **Partition persistent vs transient state**
   ```typescript
   partialize: (state) => ({
     user: state.user,           // ✅ Persist
     preferences: state.preferences,
     isLoggedIn: state.isLoggedIn,
     // NOT included: loading, error (transient)
   })
   ```

2. **Use reasonable storage keys**
   ```typescript
   {
     name: 'auth-storage',     // ✅ Descriptive
     // NOT 'store1', 'store-2', etc.
   }
   ```

3. **Handle storage errors gracefully**
   ```typescript
   try {
     await AsyncStorage.setItem(key, value);
   } catch (error) {
     // Log but continue - state still in memory
     console.error('Storage write failed:', error);
   }
   ```

### ❌ DON'T

1. **Don't persist sensitive data without encryption**
   ```typescript
   // ❌ WRONG
   partialize: (state) => ({
     apiKey: state.apiKey,        // Never persist secrets!
     password: state.password,
   })

   // ✅ RIGHT
   // Store sensitive data in secure storage (expo-secure-store, etc.)
   ```

2. **Don't create too many storage keys**
   ```typescript
   // ❌ WRONG - Storage bloat
   persist((set) => ({...}), { name: 'store1' })
   persist((set) => ({...}), { name: 'store2' })
   persist((set) => ({...}), { name: 'store3' })

   // ✅ RIGHT - Organized stores with clear names
   persist((set) => ({...}), { name: 'auth-storage' })
   persist((set) => ({...}), { name: 'settings-storage' })
   ```

3. **Don't forget migration strategy**
   ```typescript
   // ✅ Always include version field
   partialize: (state) => ({
     version: 1,
     user: state.user,
   })

   // Then check version on init and migrate if needed
   ```

## Related Patterns

- [Store Organization](./store-organization.md) — Multi-store architecture
- [Selector Hooks](./selector-hooks.md) — Performance optimization
- [Zustand Patterns](./zustand-patterns.md) — Zustand fundamentals

---

*Pattern extracted from production repositories: core-monorepo, PokePages, DJsPortfolio*
*Files: src/store/ directory with persist middleware*