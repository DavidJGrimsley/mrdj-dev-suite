# Selector Hooks Pattern

## Description

Selector hooks extract and memoize specific state values from Zustand stores, preventing unnecessary re-renders when unrelated store state changes. This pattern optimizes performance by ensuring components only re-render when *their specific selected state* changes, not when any store property updates.

## When to Use

**Use selector hooks** when:
- ✅ Component only needs 1-2 properties from store (not entire store)
- ✅ Large stores with many independent properties
- ✅ Multiple components accessing different store slices
- ✅ Preventing cascade re-renders in lists
- ✅ Optimizing performance-critical components
- ✅ Creating reusable state accessors

## Core Concepts

**The Problem: Store Without Selectors**
```typescript
// ❌ WRONG - Component re-renders when ANY store property changes
function UserCard() {
  const store = useAuthStore();  // Entire store destructured
  // Component re-renders when user, profile, session, loading, error change
  return <Text>{store.user?.email}</Text>;
}
```

**The Solution: Selector Hooks**
```typescript
// ✅ RIGHT - Component only re-renders when user changes
function UserCard() {
  const userEmail = useAuthStore((state) => state.user?.email);
  // Component re-renders ONLY when email changes
  return <Text>{userEmail}</Text>;
}
```

**Selector Execution:**
1. Component calls selector hook
2. Selector function receives entire state
3. Selector returns only needed property(s)
4. Zustand compares returned value with previous
5. Re-render only if value changed (shallow equality)

## Code Examples

### Basic Selector Pattern

```typescript
// File: src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoggedIn: false,
  loading: false,
  error: null,

  setUser: (user) => set({ user, isLoggedIn: !!user }),
  login: async (email, password) => {
    set({ loading: true });
    // ...
  },
}));

// File: src/hooks/useAuth.ts
/**
 * Individual selector hooks for auth state
 * Each hook selects one specific property
 */

export const useUserEmail = () => {
  return useAuthStore((state) => state.user?.email);
};

export const useIsLoggedIn = () => {
  return useAuthStore((state) => state.isLoggedIn);
};

export const useAuthLoading = () => {
  return useAuthStore((state) => state.loading);
};

export const useAuthError = () => {
  return useAuthStore((state) => state.error);
};

export const useUserProfile = () => {
  return useAuthStore((state) => state.profile);
};
```

### Composite Selector Pattern

```typescript
// File: src/hooks/useAuth.ts

/**
 * Combine multiple related properties
 * Useful when component needs several related values
 */
export const useAuthStatus = () => {
  return useAuthStore((state) => ({
    isLoggedIn: state.isLoggedIn,
    loading: state.loading,
    error: state.error,
  }));
};

/**
 * For object properties, use shallow equality check
 */
import { useShallow } from 'zustand/react';

export const useUserData = () => {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      profile: state.profile,
    }))
  );
};

/**
 * Computed/derived selectors
 * Create values on-the-fly from state
 */
export const useIsAdmin = () => {
  return useAuthStore((state) => {
    return state.profile?.role === 'admin';
  });
};

export const useUserDisplayName = () => {
  return useAuthStore((state) => {
    return state.user?.displayName || state.user?.email || 'Anonymous';
  });
};
```

### Advanced: Memoized Selectors

```typescript
// File: src/hooks/useAuth.ts
import { useMemo } from 'react';

/**
 * Selector factory - returns memoized selector function
 * Useful for passing parameters to selectors
 */
export function useUserById(userId: string) {
  return useAuthStore(
    useMemo(
      () => (state) => {
        // Selector only recreated if userId changes
        if (state.user?.id === userId) {
          return state.user;
        }
        return null;
      },
      [userId]
    )
  );
}

/**
 * Selector with default value
 */
export const useThemePreference = (defaultTheme = 'auto') => {
  return useAuthStore((state) => state.profile?.themePreference " defaultTheme);
};

/**
 * Conditional selectors
 */
export const useLoggedInUserProfile = () => {
  return useAuthStore((state) => {
    // Only return if user is logged in
    if (state.isLoggedIn && state.user && state.profile) {
      return state.profile;
    }
    return null;
  });
};
```

### Action Selector Pattern

```typescript
// File: src/store/authStore.ts & hooks/useAuth.ts

interface AuthState {
  // ... state properties
  user: User | null;
  profile: Profile | null;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // ... state
  setUser: (user) => set({ user }),
  login: async (email, password) => {
    // ...
  },
  logout: async () => {
    // ...
  },
  updateProfile: async (profile) => {
    // ...
  },
}));

/**
 * Selector for actions
 * Actions are stable references, no memoization needed
 */
export const useAuthActions = () => {
  return useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    setUser: state.setUser,
  }));
};

/**
 * Combined selectors: state + actions
 */
export const useAuthContext = () => {
  return useAuthStore((state) => ({
    // State
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    loading: state.loading,
    error: state.error,

    // Actions
    login: state.login,
    logout: state.logout,
    setUser: state.setUser,
  }));
};
```

### List/Array Selectors

```typescript
// File: src/store/postsStore.ts & hooks/usePosts.ts

interface PostsState {
  posts: Post[];
  selectedPostId: string | null;
  filter: 'all' | 'favorites' | 'archived';

  addPost: (post: Post) => void;
  deletePost: (id: string) => void;
  selectPost: (id: string) => void;
  setFilter: (filter: 'all' | 'favorites' | 'archived') => void;
}

export const usePostsStore = create<PostsState>((set) => ({
  posts: [],
  selectedPostId: null,
  filter: 'all',

  addPost: (post) => set((state) => ({ posts: [...state.posts, post] })),
  deletePost: (id) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== id),
    })),
  selectPost: (id) => set({ selectedPostId: id }),
  setFilter: (filter) => set({ filter }),
}));

/**
 * Filter and map selectors
 */
export const useFavoritePosts = () => {
  return usePostsStore((state) =>
    state.posts.filter((post) => post.isFavorite)
  );
};

export const useFilteredPosts = () => {
  return usePostsStore((state) => {
    switch (state.filter) {
      case 'favorites':
        return state.posts.filter((p) => p.isFavorite);
      case 'archived':
        return state.posts.filter((p) => p.archived);
      default:
        return state.posts;
    }
  });
};

/**
 * Sorted selectors
 */
export const usePostsSortedByDate = () => {
  return usePostsStore((state) =>
    [...state.posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );
};

/**
 * Count selectors
 */
export const usePostCount = () => {
  return usePostsStore((state) => state.posts.length);
};

export const useFavoritePostCount = () => {
  return usePostsStore((state) => state.posts.filter((p) => p.isFavorite).length);
};

/**
 * Specific post selector
 */
export const usePostById = (postId: string) => {
  return usePostsStore((state) =>
    state.posts.find((p) => p.id === postId)
  );
};

export const useSelectedPost = () => {
  return usePostsStore((state) => {
    if (!state.selectedPostId) return null;
    return state.posts.find((p) => p.id === state.selectedPostId) " null;
  });
};
```

## Performance Optimization

### Equality Checking

```typescript
// File: src/hooks/useAuth.ts
import { useShallow } from 'zustand/react';

/**
 * Default: Shallow equality for objects
 */
function Component() {
  // Without useShallow - object reference changes every time
  const user = useAuthStore((state) => ({
    id: state.user?.id,
    email: state.user?.email,
  })); // Re-renders if ANY store property changes
}

/**
 * With useShallow - values are compared, not reference
 */
function Component() {
  const user = useAuthStore(
    useShallow((state) => ({
      id: state.user?.id,
      email: state.user?.email,
    }))
  ); // Re-renders only if id or email changes
}
```

### Subscription Pattern

```typescript
// File: src/utils/storeSubscription.ts
import { useEffect, useRef } from 'react';

/**
 * Subscribe to specific state changes
 * Useful for side effects triggered by state changes
 */
export function useStoreSubscription<T>(
  selector: (state: any) => T,
  onChange: (value: T) => void
) {
  const previousValue = useRef<T>();

  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe(
      selector,
      (value) => {
        if (previousValue.current !== value) {
          previousValue.current = value;
          onChange(value);
        }
      }
    );

    return unsubscribe;
  }, [selector, onChange]);
}

// Usage
function Component() {
  useStoreSubscription(
    (state) => state.isLoggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) {
        console.log('User logged in!');
      }
    }
  );
}
```

## Selector Best Practices

### ✅ DO

1. **Create specific selectors for each property**
   ```typescript
   // ✅ RIGHT
   export const useUserEmail = () => useAuthStore((s) => s.user?.email);
   export const useIsLoggedIn = () => useAuthStore((s) => s.isLoggedIn);

   function Component() {
     const email = useUserEmail();  // Only re-renders if email changes
   }
   ```

2. **Use selector hooks in components**
   ```typescript
   // ✅ RIGHT
   export const useUserData = () =>
     useAuthStore(useShallow((s) => ({ user: s.user, profile: s.profile })));

   function Component() {
     const { user, profile } = useUserData();
   }
   ```

3. **Memoize complex selectors**
   ```typescript
   // ✅ RIGHT
   export const useFilteredAndSorted = () => {
     return usePostsStore((state) =>
       state.posts
         .filter((p) => p.published)
         .sort((a, b) => b.date - a.date)
     );
   };
   ```

### ❌ DON'T

1. **Don't destructure entire store in component**
   ```typescript
   // ❌ WRONG - Re-renders on any store change
   function Component() {
     const { user, profile, loading, error, ... } = useAuthStore();
   }
   ```

2. **Don't create selectors inline**
   ```typescript
   // ❌ WRONG - Selector recreated every render
   function Component() {
     const email = useAuthStore(
       (state) => state.user?.email  // NEW function every render
     );
   }

   // ✅ RIGHT - Extract to hook or useMemo
   export const useUserEmail = () => useAuthStore((s) => s.user?.email);
   ```

3. **Don't perform expensive operations in selectors**
   ```typescript
   // ❌ WRONG - Heavy computation on every store change
   const processedData = useAuthStore((state) => {
     return state.data.map(/* heavy processing */).sort().filter();
   });

   // ✅ RIGHT - Use useMemo or memoized selector
   export const useProcessedData = () => {
     return useAuthStore((state) => state.processedData);  // Pre-computed
   };
   ```

## Comparison: With vs Without Selectors

### Without Selectors (❌ Performance Issue)
```typescript
function UserCard() {
  const { user, profile, isLoggedIn, loading, error } = useAuthStore();
  // Re-renders when ANY property changes
  return <Text>{user?.email}</Text>;
}
```

### With Selectors (✅ Optimized)
```typescript
export const useUserEmail = () => useAuthStore((s) => s.user?.email);

function UserCard() {
  const email = useUserEmail();
  // Re-renders ONLY when email changes
  return <Text>{email}</Text>;
}
```

**Performance Impact:**
- Without selectors: UserCard re-renders when loading, error, profile change (unnecessary)
- With selectors: UserCard re-renders only when email changes (efficient)

## Related Patterns

- [Store Organization](./store-organization.md) — Multiple focused stores
- [Persistence Middleware](./persistence-middleware.md) — State persistence
- [Zustand Patterns](./zustand-patterns.md) — Zustand fundamentals

---

*Pattern extracted from production repositories: core-monorepo, PokePages, DJsPortfolio*
*Files: src/hooks/ directory, src/store/ with custom selectors*