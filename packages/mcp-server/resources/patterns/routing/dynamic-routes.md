# Dynamic Routes with Parameters

## Description

Dynamic routes capture URL parameters using bracket syntax `[param].tsx` in Expo Router. Parameters are extracted via `useLocalSearchParams()` hook with full TypeScript support. This enables parameterized pages for lists (detail views, user profiles, etc.) while maintaining type safety.

## When to Use

**Use dynamic routes** for:
- ✅ Detail pages from lists (`/events/123`, `/user/alice`)
- ✅ Nested hierarchies (`/guides/PLZA/strategies/15`)
- ✅ Optional parameters with catch-all routes (`[...slug]`)
- ✅ Single or multiple dynamic segments

## Code Example

### Single Dynamic Segment

```typescript
// File: app/events/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { EventDetailScreen } from '@/components/EventDetailScreen';

export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  if (!id) {
    return <ErrorScreen message="Event ID is required" />;
  }
  
  return <EventDetailScreen eventId={id} />;
}

// Navigation
import { router } from 'expo-router';
router.push(`/events/${eventId}`);
router.push({
  pathname: '/events/[id]',
  params: { id: eventId },
});
```

**From:** PokePages/src/app/(drawer)/events/[event].tsx

### Multiple Dynamic Segments

```typescript
// File: app/guides/[region]/[guide].tsx
import { useLocalSearchParams } from 'expo-router';

export default function GuideDetailRoute() {
  const { region, guide } = useLocalSearchParams<{
    region: string;
    guide: string;
  }>();
  
  return (
    <GuideDetailScreen 
      region={region} 
      guide={guide}
    />
  );
}

// Usage
router.push({
  pathname: '/guides/[region]/[guide]',
  params: { region: 'PLZA', guide: 'elite-four' },
});
// Results in: /guides/PLZA/elite-four
```

**From:** PokePages/src/app/(drawer)/guides/PLZA/strategies/[id].tsx pattern

### Catch-All Routes (Variable Segments)

```typescript
// File: app/docs/[...slug].tsx
import { useLocalSearchParams } from 'expo-router';

export default function DocsRoute() {
  const { slug } = useLocalSearchParams<{ slug: string[] }>();
  // slug is an array: ['api', 'reference', 'functions']
  
  return (
    <DocsScreen 
      path={slug?.join('/') || ''}
      breadcrumbs={slug}
    />
  );
}

// Navigation
router.push('/docs/api/reference/functions');
// slug becomes: ['api', 'reference', 'functions']
```

**From:** Expo Router conventions, applicable to content-heavy hierarchies

## Configuration

### TypeScript Setup for Type-Safe Params

```typescript
// Define param types for each route
type EventDetailParams = {
  id: string;
};

type GuideDetailParams = {
  region: string;
  guide: string;
};

// In route file
const { id } = useLocalSearchParams<EventDetailParams>();
```

### Query Parameters (Search Strings)

```typescript
// Navigation with query params
router.push({
  pathname: '/search',
  params: { 
    q: 'pikachu',
    type: 'pokemon',
    generation: '1'
  }
});

// Results in: /search?q=pikachu&type=pokemon&generation=1

// In route
const { q, type, generation } = useLocalSearchParams<{
  q?: string;
  type?: string;
  generation?: string;
}>();
```

## Best Practices

### ✅ DO

1. **Type your params** for IDE autocomplete and type checking
   ```typescript
   const { id } = useLocalSearchParams<{ id: string }>();
   // TypeScript knows id is string
   ```

2. **Handle missing params** with validation
   ```typescript
   const { id } = useLocalSearchParams<{ id: string }>();
   
   if (!id) {
     return <ErrorScreen />;
   }
   
   // Safe to use id here
   ```

3. **Use descriptive param names**
   ```
   ✅ [userId].tsx
   ✅ [eventId].tsx
   ❌ [id].tsx (too generic)
   ```

4. **Nest dynamic routes** for logical hierarchies
   ```
   guides/
   ├── [region]/
   │   ├── [guide].tsx     → /guides/:region/:guide
   ```

5. **Use catch-all for documentation or content hierarchies**
   ```
   docs/[...slug].tsx → /docs/api/reference/functions
   ```

### ❌ DON'T

1. **Don't mix route parameters and query parameters unnecessarily**
   ```typescript
   // ❌ AVOID
   /events/123?id=456&eventId=789
   
   // ✅ BETTER - use route params
   /events/123
   ```

2. **Don't rely on optional params without defaults**
   ```typescript
   // ❌ RISKY
   const { id } = useLocalSearchParams<{ id: string }>();
   return <EventDetail id={id} />; // Could be undefined
   
   // ✅ SAFE
   const { id } = useLocalSearchParams<{ id?: string }>();
   if (!id) return <ErrorScreen />;
   return <EventDetail id={id} />;
   ```

3. **Don't create overly deep param nesting** without cause
   ```
   ❌ /app/[userId]/posts/[postId]/comments/[commentId]/likes/[likeId]
   ✅ /posts/[postId] with comment data in store/props
   ```

## Related Patterns

- [File-Based Routing](./file-based-routing.md) — Route file structure
- [Route Groups](./route-groups.md) — Organizing routes hierarchically
- [Navigation Patterns](./navigation-patterns.md) — router.push, Link components
- [API Routes](./api-routes.md) — Dynamic API endpoints

---

*Pattern extracted from production repositories: PokePages, not-hot-dog, Expo Router documentation*
*Implementations: f:\ReactNativeApps\PokePages\src\app\(drawer)\events\[event].tsx*