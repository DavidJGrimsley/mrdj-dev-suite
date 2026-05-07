# Route Groups Pattern

## Description

Route groups use parentheses `(groupName)` to organize routes without adding URL segments. Groups enable shared layouts, nested navigation stacks, and logical route organization within Expo Router's file-based routing system.

## When to Use

**Use route groups** for:
- ✅ Shared layout wrapping multiple routes without URL changes
- ✅ Tab navigation stacks (e.g., `(tabs)/home`, `(tabs)/explore`)
- ✅ Authentication flow separation (`(auth)` vs main app)
- ✅ Nested drawer navigation within groups
- ✅ Organizing related features without URL hierarchy

## Code Example

### Basic Route Group with Shared Layout

```typescript
// File: src/app/(drawer)/_layout.tsx
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerShown: true,
          drawerType: 'slide',
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: 'Home',
            drawerIcon: ({ color }) => <HomeIcon color={color} />,
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            title: 'Settings',
            drawerIcon: ({ color }) => <SettingsIcon color={color} />,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
```

```typescript
// File: src/app/(drawer)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { HomeIcon, ExploreIcon, ProfileIcon } from '@/components/Icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <ExploreIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
```

```typescript
// File: src/app/(drawer)/(tabs)/index.tsx
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Home Tab</Text>
    </View>
  );
}
// Route: /home (no "(tabs)" in URL)
```

### Multiple Nested Groups

```
src/app/
├── _layout.tsx                  (root: Stack)
├── (drawer)/                    (drawer group, no URL)
│   ├── _layout.tsx              (Drawer layout)
│   ├── (tabs)/                  (tabs group within drawer, no URL)
│   │   ├── _layout.tsx          (Tabs layout)
│   │   ├── index.tsx            → /
│   │   ├── explore.tsx          → /explore
│   │   └── profile.tsx          → /profile
│   └── settings.tsx             → /settings
├── (auth)/                      (auth group, no URL)
│   ├── _layout.tsx              (Stack layout for auth flow)
│   ├── sign-in.tsx              → /sign-in
│   └── sign-up.tsx              → /sign-up
└── +not-found.tsx               (catch-all 404)

// Key insight: Route groups "(drawer)" and "(tabs)" don't appear in URLs
// Routes map: / (home), /explore, /profile, /settings, /sign-in, /sign-up
```

### Authentication Flow with Route Groups

```typescript
// File: src/app/_layout.tsx (Root Layout)
import { Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function RootLayout() {
  const { isLoggedIn, loading } = useAuthStore();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      {isLoggedIn ? (
        // Main app routes (drawer + tabs)
        <Stack.Screen name="(drawer)" />
      ) : (
        // Auth routes (sign-in, sign-up)
        <Stack.Screen
          name="(auth)"
          options={{
            animationEnabled: false,
          }}
        />
      )}
    </Stack>
  );
}
```

```typescript
// File: src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
```

```typescript
// File: src/app/(auth)/sign-in.tsx
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function SignInScreen() {
  const handleSignIn = async () => {
    // Authentication logic
    await authenticate();
    // Replace entire stack with main app
    router.replace('/(drawer)/(tabs)/');
  };

  return (
    <View className="flex-1 justify-center items-center">
      <Text>Sign In</Text>
      <Pressable onPress={handleSignIn}>
        <Text>Login</Text>
      </Pressable>
    </View>
  );
}
// Route: /sign-in (not /(auth)/sign-in)
```

### Feature-Specific Groups

```
src/app/
├── (drawer)/
│   ├── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── explore.tsx
│   └── (guides)/            (guides feature group)
│       ├── _layout.tsx      (guides layout/header)
│       ├── index.tsx        → /guides
│       ├── [id].tsx         → /guides/[id]
│       └── search.tsx       → /guides/search
└── (modal)/                 (modal overlay group)
    ├── _layout.tsx          (modal presentation)
    ├── settings-modal.tsx   → /settings-modal
    └── share-modal.tsx      → /share-modal

// Routes: /guides, /guides/123, /guides/search, /settings-modal, /share-modal
```

```typescript
// File: src/app/(drawer)/(guides)/_layout.tsx
import { Stack } from 'expo-router';

export default function GuidesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: 'Guides',
        headerBackVisible: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
```

### Modal Presentation with Route Groups

```typescript
// File: src/app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* Main app */}
      <Stack.Screen name="(drawer)" />

      {/* Modal stack (presented on top) */}
      <Stack.Screen
        name="(modal)"
        options={{
          presentation: 'modal',
          headerShown: false,
          animationEnabled: true,
        }}
      />
    </Stack>
  );
}
```

```typescript
// File: src/app/(modal)/_layout.tsx
import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="settings-modal" />
      <Stack.Screen name="share-modal" />
    </Stack>
  );
}
```

```typescript
// File: src/app/(modal)/settings-modal.tsx
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function SettingsModal() {
  return (
    <View className="flex-1 bg-white rounded-t-2xl p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold">Settings</Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-lg">✕</Text>
        </Pressable>
      </View>

      {/* Settings content */}
    </View>
  );
}
// Route: /settings-modal (presented as modal)
// Navigate: router.push('/settings-modal')
```

## Route Group Naming Conventions

| Pattern | Purpose | URL Impact |
|---------|---------|-----------|
| `(tabs)` | Tab navigation group | No URL segment |
| `(drawer)` | Drawer navigation group | No URL segment |
| `(auth)` | Authentication flow | No URL segment |
| `(modal)` | Modal overlays | No URL segment |
| `(feature-name)` | Feature-specific routes | No URL segment |

## Navigation Patterns

### Navigate Between Groups

```typescript
import { router } from 'expo-router';

// Navigate to route in different group
router.push('/'); // Home in (tabs)
router.push('/guides'); // Guides in (guides)
router.push('/settings-modal'); // Modal in (modal)

// Navigate with params
router.push('/guides/123');
router.push({
  pathname: '/guides/[id]',
  params: { id: '123' },
});

// Replace (clear stack)
router.replace('/(drawer)/(tabs)/');
router.replace('/(auth)/sign-in');
```

## Best Practices

### ✅ DO

1. **Use groups to organize related routes**
   ```
   (drawer)/         - Main app navigation
   (tabs)/          - Tab routes
   (auth)/          - Auth flow
   (guides)/        - Feature routes
   ```

2. **Keep _layout.tsx files focused** on navigation setup
   ```typescript
   export default function GuideLayout() {
     return (
       <Stack screenOptions={{ /* navigation options */ }}>
         <Stack.Screen name="index" />
         <Stack.Screen name="[id]" />
       </Stack>
     );
   }
   ```

3. **Use router.replace()** when changing auth states
   ```typescript
   // After login, replace auth stack with main app
   router.replace('/(drawer)/(tabs)/');
   
   // After logout, replace main app with auth
   router.replace('/(auth)/sign-in');
   ```

### ❌ DON'T

1. **Don't nest groups excessively**
   ```typescript
   // ❌ TOO DEEP
   (app)/(main)/(features)/(guides)/index.tsx
   
   // ✅ REASONABLE
   (drawer)/(guides)/index.tsx
   ```

2. **Don't duplicate layout logic**
   ```typescript
   // ❌ DUPLICATED
   // (drawer)/_layout.tsx - defines Drawer
   // (drawer)/(tabs)/_layout.tsx - defines Drawer again
   
   // ✅ COMPOSED
   // (drawer)/_layout.tsx - wraps (tabs) group
   // (drawer)/(tabs)/_layout.tsx - defines Tabs within drawer
   ```

3. **Don't forget router.replace()** for auth transitions
   ```typescript
   // ❌ LEAVES BACK BUTTON
   router.push('/(drawer)/(tabs)/');
   
   // ✅ CLEAR STACK
   router.replace('/(drawer)/(tabs)/');
   ```

## Related Patterns

- [File-Based Routing](./file-based-routing.md) — Routing fundamentals
- [Dynamic Routes](./dynamic-routes.md) — Dynamic segments

---

*Pattern extracted from production repositories: core-monorepo, PokePages, DJsPortfolio*
*Files: src/app/ directory structures from Expo Router projects*