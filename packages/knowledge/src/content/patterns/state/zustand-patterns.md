# Zustand State Management

## Description

Zustand provides lightweight atomic state management with TypeScript type inference, optional persistence middleware, and selector hooks for optimal re-renders. Stores are created without providers, maintaining flat structure with computed properties derived from state, and AsyncStorage/localStorage integration for cross-platform persistence.

## When to Use

**Use Zustand** for:
- ✅ Global application state (auth, user, settings)
- ✅ Feature-level state with persistence needs
- ✅ State requiring type-safe selectors
- ✅ Atomic updates without action dispatchers

## Code Example

### Basic Store with Persistence

```typescript
// File: src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthState {
  // State
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoggedIn: boolean;
  loading: boolean;

  // Computed properties (derived state)
  get isAdult(): boolean;
  get canUseSocialFeatures(): boolean;
  get isVip(): boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
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

      // Computed properties
      get isAdult(): boolean {
        const profile = get().profile;
        if (!profile?.dateOfBirth) return false;
        const age = calculateAge(profile.dateOfBirth);
        return age >= 18;
      },

      get canUseSocialFeatures(): boolean {
        return get().isLoggedIn && get().isAdult;
      },

      get isVip(): boolean {
        return get().profile?.vipStatus === true;
      },

      // Actions
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      
      setProfile: (profile) => set({ profile }),

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          profile: null,
          session: null,
          isLoggedIn: false,
        });
      },

      initializeAuth: async () => {
        set({ loading: true });
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const profile = await fetchProfile(data.session.user.id);
            set({
              user: data.session.user,
              profile,
              session: data.session,
              isLoggedIn: true,
              loading: false,
            });
          } else {
            set({ loading: false });
          }
        } catch (error) {
          console.error('Auth init error:', error);
          set({ loading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist specific fields
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        session: state.session,
      }),
    }
  )
);
```

**From:** PokePages/src/store/authStore.ts, core-monorepo pattern

### Selector Hooks for Performance

```typescript
// ✅ GOOD - Custom selector hooks prevent unnecessary re-renders

// Only re-renders when user email changes
export const useUserEmail = () =>
  useAuthStore((state) => state.user?.email);

// Only re-renders when isAdult computed property changes
export const useIsAdult = () =>
  useAuthStore((state) => state.isAdult);

// Multi-selector in single hook
export const useUserWithProfile = () =>
  useAuthStore((state) => ({
    user: state.user,
    profile: state.profile,
    isLoggedIn: state.isLoggedIn,
  }));

// Usage in component
function UserCard() {
  const email = useUserEmail();
  const { profile } = useUserWithProfile();
  
  // Only re-renders when email or profile object reference changes
  return <Text>{email}</Text>;
}
```

### Store for Favorites with Toggle

```typescript
// File: src/store/favoriteFeaturesStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoritesState {
  favorites: Record<string, boolean>;
  toggleFavorite: (key: string) => void;
  isFavorite: (key: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: {},

      toggleFavorite: (key) =>
        set((state) => ({
          favorites: {
            ...state.favorites,
            [key]: !state.favorites[key],
          },
        })),

      isFavorite: (key) => !!get().favorites[key],
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Selector hooks
export const useIsFavorite = (key: string) =>
  useFavoritesStore((state) => state.isFavorite(key));

export const useToggleFavorite = () =>
  useFavoritesStore((state) => state.toggleFavorite);

// Component usage
function FavoriteButton({ pageKey }: { pageKey: string }) {
  const isFavorite = useIsFavorite(pageKey);
  const toggle = useToggleFavorite();

  return (
    <Pressable onPress={() => toggle(pageKey)}>
      <Text>{isFavorite ? '⭐' : '☆'}</Text>
    </Pressable>
  );
}
```

**From:** PokePages/src/store/favoriteFeaturesStore.ts

## Configuration

### Cross-Platform Storage Setup

```typescript
// File: src/utils/createCrossPlatformStorage.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export function createCrossPlatformStorage() {
  if (Platform.OS === 'web') {
    return createJSONStorage(() => ({
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key),
    }));
  }

  return createJSONStorage(() => AsyncStorage);
}

// Use in stores
export const useStore = create<State>()(
  persist(
    (set) => ({ /* state */ }),
    {
      storage: createCrossPlatformStorage(),
    }
  )
);
```

## Best Practices

### ✅ DO

1. **Use selector hooks** to prevent unnecessary re-renders
   ```typescript
   // ✅ GOOD - only subscribes to email
   const email = useAuthStore((state) => state.user?.email);
   
   // ❌ BAD - subscribes to entire store
   const { user, profile, session, ... } = useAuthStore();
   ```

2. **Keep stores flat** — avoid nested objects
   ```typescript
   // ✅ GOOD - flat structure
   userId: '123'
   userName: 'alice'
   userEmail: 'alice@example.com'
   
   // ❌ BAD - nested (causes unnecessary re-renders)
   user: { id: '123', name: 'alice', email: '...' }
   ```

3. **Use computed properties (getters)** for derived state
   ```typescript
   get isAdult(): boolean {
     return calculateAge(get().profile?.dateOfBirth) >= 18;
   }
   ```

4. **Partial persistence** — only persist necessary fields
   ```typescript
   partialize: (state) => ({
     user: state.user,
     theme: state.theme,
     // Don't persist: loading, errors, temporary UI state
   })
   ```

5. **Split stores** by domain/feature
   ```typescript
   useAuthStore()       // auth + user
   useThemeStore()      // app theme
   useFavoritesStore()  // favorites
   ```

### ❌ DON'T

1. **Don't use context** for everything
   ```typescript
   // ❌ AVOID - causes re-renders of all consumers
   <UserContext.Provider value={{ user, setUser, ... }}>
   
   // ✅ USE - only subscribed components re-render
   const user = useUserStore((state) => state.user);
   ```

2. **Don't persist state that changes frequently**
   ```typescript
   // ❌ BAD - persists on every keystroke
   persist((set) => ({
     searchQuery: '',
     setSearchQuery: (q) => set({ searchQuery: q })
   }))
   
   // ✅ GOOD - only persist final state
   onChangeText={(q) => dispatch(setSearchQuery(q))} // local only
   ```

3. **Don't store derived data** that can be computed
   ```typescript
   // ❌ BAD - will get out of sync
   user: { id: '1', name: 'alice', email: 'alice@ex.com' }
   userDisplayName: 'alice' // Duplicate!
   
   // ✅ GOOD - compute on demand
   get userDisplayName() {
     return get().user?.name;
   }
   ```

4. **Don't forget to handle undefined** from selectors
   ```typescript
   // ❌ RISKY
   const email = useAuthStore((state) => state.user?.email);
   return <Text>{email}</Text>; // Could be undefined
   
   // ✅ SAFE
   const email = useAuthStore((state) => state.user?.email);
   return <Text>{email || 'No email'}</Text>;
   ```

## Related Patterns

- [Store Organization](./store-organization.md) — Multi-store patterns
- [Persistence Middleware](./persistence-middleware.md) — AsyncStorage integration
- [Selector Hooks](./selector-hooks.md) — Performance optimization

---

*Pattern extracted from production repositories: PokePages, core-monorepo, time2pay*
*Files: PokePages/src\store\authStore.ts, favoriteFeaturesStore.ts*