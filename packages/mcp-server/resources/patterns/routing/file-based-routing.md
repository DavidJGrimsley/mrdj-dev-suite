# File-Based Routing with Expo Router

## Description

File-based routing in Expo Router automatically generates routes from the file structure under the `app/` directory. This pattern eliminates manual route configuration and makes navigation structure immediately visible from the filesystem. Routes are only defined under `app/` — components are NOT split into separate `src/screens/` folders, preventing the duplication problem.

## When to Use

**Always use** file-based routing for all Expo Router applications:
- ✅ All page-level components live under `app/` directory structure
- ✅ Route hierarchy directly mirrors file structure
- ✅ Route organization is enforced by filesystem constraints
- ✅ Single source of truth for application navigation

## Code Example

### File Structure Maps to Routes

```
app/
├── _layout.tsx              → Root layout wrapper (providers, fonts, styling)
├── index.tsx                → / (home page)
├── about.tsx                → /about
├── (drawer)/                → Route group (no URL segment)
│   ├── _layout.tsx          → Drawer navigator wrapper
│   ├── home.tsx             → /home
│   └── profile.tsx          → /profile
├── (auth)/                  → Route group for authentication
│   ├── sign-in.tsx          → /sign-in
│   └── sign-up.tsx          → /sign-up
├── events/
│   ├── index.tsx            → /events (list)
│   └── [id].tsx             → /events/:id (detail)
└── guides/
    ├── PLZA/
    │   ├── index.tsx        → /guides/PLZA
    │   └── strategies/
    │       └── [id].tsx     → /guides/PLZA/strategies/:id
```

**From:** PokePages, not-hot-dog, DJsPortfolio (f:\ReactNativeApps\*\src\app\)

### Root Layout Setup

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'zustand';
import { useAuthStore } from '@/store/authStore';

export default function RootLayout() {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(drawer)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
```

**Pattern from:** core-monorepo/apps/*/src/app/_layout.tsx, PokePages/src/app/_layout.tsx

## Configuration

### Setup in `app.json`

```json
{
  "expo": {
    "plugins": [
      [
        "expo-router",
        {
          "origin": false,
          "asyncRoutes": "development",
          "apiRoutes": true
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### TypeScript Configuration

Enable typed routes in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "references": [{ "path": "./tsconfig.app.json" }]
}
```

## Best Practices

### ✅ DO

1. **Keep `app/` files lean** — only routing and layout logic
   ```typescript
   // app/events/[id].tsx ✅ GOOD
   import { EventDetail } from '@/components/EventDetail';
   import { useLocalSearchParams } from 'expo-router';
   
   export default function EventDetailRoute() {
     const { id } = useLocalSearchParams<{ id: string }>();
     return <EventDetail eventId={id} />;
   }
   ```

2. **Use route groups** for organizational structure without affecting URLs
   ```
   (drawer)/        ← drawer navigation group, no URL
   ├── (tabs)/      ← tabs group nested in drawer, no URL
   │   ├── home.tsx → /home
   │   └── profile.tsx → /profile
   ```

3. **Import components from `src/components/`** or `src/screens/`
   ```typescript
   import { ProfileScreen } from '@/components/ProfileScreen';
   // NOT: import { ProfileScreen } from './ProfileScreen';
   ```

4. **Use platform-specific files** for route variations
   ```
   [id].tsx         ← default (all platforms)
   [id].web.tsx     ← web-specific
   [id].native.tsx  ← iOS/Android specific
   ```

### ❌ DON'T

1. **Don't put complex logic in route files**
   ```typescript
   // ❌ BAD
   export default function EventRoute() {
     const [events, setEvents] = useState([]);
     const [loading, setLoading] = useState(false);
     // ... 50+ lines of business logic
     return <View>...</View>;
   }
   ```

2. **Don't duplicate screens in `src/screens/`** AND reference from `app/`
   ```
   ❌ app/events.tsx AND src/screens/EventsScreen.tsx
   ✅ app/events.tsx imports from @/components/EventsScreen
   ```

3. **Don't use `require()` for dynamic routing** — let Expo Router handle it
   ```typescript
   // ❌ BAD
   const Screen = require(`./screens/${routeName}`);
   
   // ✅ GOOD
   router.push(`/events/${eventId}`);
   ```

## Related Patterns

- [Dynamic Routes](./dynamic-routes.md) — Using `[param].tsx` syntax
- [Route Groups](./route-groups.md) — Organizing routes with `(group)/` syntax
- [Navigation Patterns](./navigation-patterns.md) — router.push, Link components, deep linking
- [API Routes](./api-routes.md) — `+api.ts` catch-all pattern for server endpoints

---

*Pattern extracted from production repositories: PokePages, not-hot-dog, DJsPortfolio, core-monorepo*
*File structure observed in: f:\ReactNativeApps\*\src\app\*