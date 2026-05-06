# Store Organization Pattern

## Description

Store organization structures Zustand stores into logically separated, focused stores rather than monolithic state objects. Each store manages a specific domain (auth, UI, features) with clear separation of concerns, improving maintainability, performance, and reusability.

## When to Use

**Use store organization** for:
- ✅ Separating auth/user state from app state
- ✅ Feature-specific stores (dex tracker, favorites, settings)
- ✅ UI state isolation (modals, navigation stacks)
- ✅ Preventing unnecessary re-renders across unrelated state changes
- ✅ Reusable store composition across projects

## Core Principles

**One store per domain:**
- `useAuthStore` - User authentication, profile, session
- `useUIStore` - Modals, toasts, navigation state
- `useFeatureStore` - Feature-specific data (favorites, tracking)
- `useSettingsStore` - User preferences, app configuration

**Tight cohesion, loose coupling:**
- Each store manages its own domain exclusively
- Stores don't depend on each other
- Actions within a store are self-contained
- Cross-store operations handled at component/hook level

## Code Example

### Basic Store Structure

```typescript
// File: src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  username: string;
}

interface Profile {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  ageVerified: boolean;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  // State
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;

  // Computed properties
  isAdult: boolean;
  canUseSocialFeatures: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      profile: null,
      session: null,
      isLoggedIn: false,
      loading: true,
      error: null,

      // Computed properties (getters)
      get isAdult(): boolean {
        const profile = get().profile;
        if (!profile?.ageVerified) return false;
        return true;
      },

      get canUseSocialFeatures(): boolean {
        return get().isLoggedIn && get().isAdult;
      },

      // Actions
      setUser: (user) => {
        set({ user, isLoggedIn: !!user, error: null });
      },

      setProfile: (profile) => {
        set({ profile, error: null });
      },

      setSession: (session) => {
        set({ session, error: null });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },

      signOut: async () => {
        try {
          set({ loading: true });
          // Call logout API
          await supabase.auth.signOut();

          set({
            user: null,
            profile: null,
            session: null,
            isLoggedIn: false,
            loading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Logout failed',
            loading: false,
          });
        }
      },

      initializeAuth: async () => {
        try {
          set({ loading: true });
          // Check session, load user and profile
          const { data } = await supabase.auth.getSession();

          if (data.session) {
            set({
              session: {
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token || '',
                expiresAt: data.session.expires_at || 0,
              },
              isLoggedIn: true,
              loading: false,
            });
            // Load user and profile...
          } else {
            set({ isLoggedIn: false, loading: false });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Initialization failed',
            loading: false,
          });
        }
      },

      reset: () => {
        set({
          user: null,
          profile: null,
          session: null,
          isLoggedIn: false,
          loading: true,
          error: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Partial persistence - don't persist loading or error states
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
    }
  )
);
```

### UI State Store

```typescript
// File: src/store/uiStore.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface UIState {
  // Modals
  modals: Record<string, boolean>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  dismissToast: (id: string) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Modals
  modals: {},
  openModal: (id) => {
    set((state) => ({
      modals: { ...state.modals, [id]: true },
    }));
  },
  closeModal: (id) => {
    set((state) => ({
      modals: { ...state.modals, [id]: false },
    }));
  },

  // Toasts
  toasts: [],
  showToast: (message, type, duration = 3000) => {
    const id = `${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    // Auto-dismiss
    setTimeout(() => {
      get().dismissToast(id);
    }, duration);
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  // Loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  // Theme
  darkMode: false,
  toggleDarkMode: () => {
    set((state) => ({ darkMode: !state.darkMode }));
  },
}));
```

### Feature-Specific Store

```typescript
// File: src/store/dexTrackerStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DexTrackerState {
  // State
  trackedPokemon: Record<number, boolean>;
  shinyPokemon: Record<number, boolean>;
  favoritesList: number[];

  // Computed
  totalCaught: () => number;
  totalShiny: () => number;
  completionPercentage: () => number;
  isCaught: (dexNumber: number) => boolean;
  isShiny: (dexNumber: number) => boolean;
  isFavorite: (dexNumber: number) => boolean;

  // Actions
  addPokemon: (dexNumber: number) => void;
  removePokemon: (dexNumber: number) => void;
  toggleShiny: (dexNumber: number) => void;
  addFavorite: (dexNumber: number) => void;
  removeFavorite: (dexNumber: number) => void;
  resetTracker: () => void;
}

export const useDexTrackerStore = create<DexTrackerState>()(
  persist(
    (set, get) => ({
      trackedPokemon: {},
      shinyPokemon: {},
      favoritesList: [],

      // Computed (getters)
      totalCaught: () => Object.keys(get().trackedPokemon).length,
      totalShiny: () => Object.keys(get().shinyPokemon).length,
      completionPercentage: () => (get().totalCaught() / 1025) * 100,
      isCaught: (dexNumber) => !!get().trackedPokemon[dexNumber],
      isShiny: (dexNumber) => !!get().shinyPokemon[dexNumber],
      isFavorite: (dexNumber) => get().favoritesList.includes(dexNumber),

      // Actions
      addPokemon: (dexNumber) => {
        set((state) => ({
          trackedPokemon: {
            ...state.trackedPokemon,
            [dexNumber]: true,
          },
        }));
      },

      removePokemon: (dexNumber) => {
        set((state) => {
          const { [dexNumber]: _, ...rest } = state.trackedPokemon;
          return { trackedPokemon: rest };
        });
      },

      toggleShiny: (dexNumber) => {
        set((state) => ({
          shinyPokemon: {
            ...state.shinyPokemon,
            [dexNumber]: !state.shinyPokemon[dexNumber],
          },
        }));
      },

      addFavorite: (dexNumber) => {
        set((state) => {
          if (state.favoritesList.includes(dexNumber)) {
            return state;
          }
          return {
            favoritesList: [...state.favoritesList, dexNumber],
          };
        });
      },

      removeFavorite: (dexNumber) => {
        set((state) => ({
          favoritesList: state.favoritesList.filter((id) => id !== dexNumber),
        }));
      },

      resetTracker: () => {
        set({
          trackedPokemon: {},
          shinyPokemon: {},
          favoritesList: [],
        });
      },
    }),
    {
      name: 'dex-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Multi-Store Architecture

```typescript
// File: src/store/index.ts
// Central export point for all stores

export { useAuthStore } from './authStore';
export { useUIStore } from './uiStore';
export { useDexTrackerStore } from './dexTrackerStore';
export { useSettingsStore } from './settingsStore';
export { useFavoritesStore } from './favoritesStore';

// Usage in components
import { useAuthStore, useUIStore, useDexTrackerStore } from '@/store';
```

## Store Usage Patterns

### Using Stores in Components

```typescript
// File: src/components/UserProfile.tsx
import { useAuthStore } from '@/store/authStore';

export function UserProfile() {
  // Using selector hook for performance (only re-render on email change)
  const userEmail = useAuthStore((state) => state.user?.email);

  return <Text>{userEmail}</Text>;
}
```

### Cross-Store Operations

```typescript
// File: src/hooks/useLogout.ts
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useDexTrackerStore } from '@/store/dexTrackerStore';

export function useLogout() {
  const signOut = useAuthStore((state) => state.signOut);
  const resetTracker = useDexTrackerStore((state) => state.resetTracker);
  const showToast = useUIStore((state) => state.showToast);

  return async () => {
    try {
      await signOut();
      resetTracker();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  };
}
```

### Store Composition

```typescript
// File: src/hooks/useAppState.ts
// Custom hook that combines multiple stores

export function useAppState() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const darkMode = useUIStore((state) => state.darkMode);
  const totalCaught = useDexTrackerStore((state) => state.totalCaught());

  return {
    isLoggedIn,
    user,
    profile,
    darkMode,
    totalCaught,
  };
}
```

## Store Organization Best Practices

### ✅ DO

1. **Keep stores focused on single domain**
   ```typescript
   // ✅ GOOD
   useAuthStore      // Auth only
   useUIStore        // UI state only
   useDexStore       // Feature only
   ```

2. **Use partial persistence**
   ```typescript
   partialize: (state) => ({
     user: state.user,          // Persist
     profile: state.profile,     // Persist
     loading: state.loading,     // DON'T persist (transient)
     error: state.error,        // DON'T persist (transient)
   })
   ```

3. **Provide computed properties as getters**
   ```typescript
   get isAdult(): boolean {
     return this.profile?.ageVerified ?? false;
   }
   ```

### ❌ DON'T

1. **Don't create monolithic stores**
   ```typescript
   // ❌ WRONG
   useAppStore  // Auth + UI + Features + Settings - too much!
   
   // ✅ RIGHT
   useAuthStore
   useUIStore
   useFeaturesStore
   useSettingsStore
   ```

2. **Don't duplicate state across stores**
   ```typescript
   // ❌ WRONG
   // useAuthStore has user
   // useUIStore also has user (duplicated)
   
   // ✅ RIGHT
   // Only useAuthStore has user
   // useUIStore can import it via selectors
   ```

3. **Don't make stores depend on each other**
   ```typescript
   // ❌ WRONG
   export const useFeatureStore = create((set, get) => ({
     signOut: useAuthStore.getState().signOut,  // Circular dependency
   }))
   
   // ✅ RIGHT
   // Composed in hooks/components, not in stores
   ```

## Related Patterns

- [Zustand Patterns](./zustand-patterns.md) — Zustand fundamentals
- [Persistence Middleware](./persistence-middleware.md) — Persistence setup
- [Selector Hooks](./selector-hooks.md) — Performance optimization

---

*Pattern extracted from production repositories: core-monorepo, PokePages, DJsPortfolio*
*Files: src/store/ directory structures*