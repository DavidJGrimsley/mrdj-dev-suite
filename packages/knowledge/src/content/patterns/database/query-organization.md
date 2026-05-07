# Query Organization Pattern

## Description

Query organization involves structuring database query functions into dedicated files (`*Queries.ts`) for each schema. This pattern provides a clean data access layer where queries are type-safe, reusable, and organized by domain (users, posts, comments, etc.).

## When to Use

**Organize queries when:**
- ✅ Executing SELECT, INSERT, UPDATE, DELETE operations
- ✅ Need to reuse complex queries across components
- ✅ Want centralized data access logic
- ✅ Building filters, pagination, sorting
- ✅ Implementing complex WHERE clauses
- ✅ Ensuring type safety across application

## Core Concepts

**Query Organization Structure:**
```
src/db/
├── *Schema.ts         # Schema definitions
├── relations.ts       # Relationship definitions
├── *Queries.ts        # Query functions (one file per schema)
├── queryHelpers.ts    # Shared query utilities
└── index.ts           # Exports all queries
```

**Principles:**
1. One `*Queries.ts` file per schema domain
2. Export type-safe async functions
3. Use Drizzle ORM for type inference
4. Centralize WHERE clauses and filters
5. Enable selective column loading
6. Support pagination and sorting

## Code Examples

### Basic Query Organization

```typescript
// File: src/db/profilesSchema.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  bio: text('bio'),
  profileImage: text('profile_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// File: src/db/profilesQueries.ts
import { db } from './index';
import { profiles, type Profile, type NewProfile } from './profilesSchema';
import { eq, ilike, desc, asc } from 'drizzle-orm';

/**
 * Get profile by ID
 */
export async function getProfileById(id: string): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  
  return profile;
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  
  return profile;
}

/**
 * Get all profiles
 */
export async function getAllProfiles(): Promise<Profile[]> {
  return await db
    .select()
    .from(profiles)
    .orderBy(desc(profiles.createdAt));
}

/**
 * Create new profile
 */
export async function createProfile(data: NewProfile): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values(data)
    .returning();
  
  return profile;
}

/**
 * Update profile
 */
export async function updateProfile(
  id: string,
  data: Partial<NewProfile>
): Promise<Profile> {
  const [profile] = await db
    .update(profiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning();
  
  return profile;
}

/**
 * Delete profile
 */
export async function deleteProfile(id: string): Promise<void> {
  await db.delete(profiles).where(eq(profiles.id, id));
}
```

### Advanced Queries: Filtering & Pagination

```typescript
// File: src/db/postsQueries.ts
import { db } from './index';
import { posts, profiles } from './schemas';
import { eq, desc, and, or, ilike, gt, lt } from 'drizzle-orm';

/**
 * Get posts by user with pagination
 */
export async function getUserPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Post[]> {
  return await db
    .select()
    .from(posts)
    .where(eq(posts.userId, userId))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Search posts by title or content
 */
export async function searchPosts(query: string): Promise<Post[]> {
  return await db
    .select()
    .from(posts)
    .where(
      or(
        ilike(posts.title, `%${query}%`),
        ilike(posts.content, `%${query}%`)
      )
    )
    .orderBy(desc(posts.createdAt));
}

/**
 * Get trending posts (by like count and date)
 */
export async function getTrendingPosts(hours: number = 24): Promise<Post[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return await db
    .select()
    .from(posts)
    .where(gt(posts.createdAt, since))
    .orderBy((p) => desc(p.likes))
    .limit(10);
}

/**
 * Get posts with filters
 */
interface PostFilters {
  userId?: string;
  published?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  searchQuery?: string;
}

export async function getPostsWithFilters(
  filters: PostFilters,
  limit: number = 20,
  offset: number = 0
): Promise<Post[]> {
  const conditions = [];
  
  if (filters.userId) {
    conditions.push(eq(posts.userId, filters.userId));
  }
  
  if (filters.published !== undefined) {
    conditions.push(eq(posts.published, filters.published));
  }
  
  if (filters.createdAfter) {
    conditions.push(gt(posts.createdAt, filters.createdAfter));
  }
  
  if (filters.createdBefore) {
    conditions.push(lt(posts.createdAt, filters.createdBefore));
  }
  
  if (filters.searchQuery) {
    conditions.push(
      or(
        ilike(posts.title, `%${filters.searchQuery}%`),
        ilike(posts.content, `%${filters.searchQuery}%`)
      )
    );
  }
  
  return await db
    .select()
    .from(posts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
}
```

### Queries with Relations

```typescript
// File: src/db/postsQueries.ts

/**
 * Get post with author
 */
export async function getPostWithAuthor(postId: string) {
  return await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: true,  // Loads profile data
    },
  });
}

/**
 * Get posts with authors and comment count
 */
export async function getPostsWithAuthors(limit: number = 20) {
  return await db.query.posts.findMany({
    orderBy: desc(posts.createdAt),
    limit,
    with: {
      author: {
        columns: {
          id: true,
          username: true,
          profileImage: true,
        },
      },
    },
  });
}

/**
 * Get profile with posts
 */
export async function getProfileWithPosts(profileId: string) {
  return await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    with: {
      posts: {
        orderBy: desc(posts.createdAt),
        limit: 10,
      },
    },
  });
}
```

### Aggregation Queries

```typescript
// File: src/db/aggregateQueries.ts
import { count, sum, avg, max, min } from 'drizzle-orm';

/**
 * Get post statistics
 */
export async function getPostStats(userId: string) {
  const [stats] = await db
    .select({
      totalPosts: count(posts.id),
      totalLikes: sum(posts.likes),
      avgLikes: avg(posts.likes),
      maxLikes: max(posts.likes),
      minLikes: min(posts.likes),
    })
    .from(posts)
    .where(eq(posts.userId, userId));
  
  return stats;
}

/**
 * Get user activity metrics
 */
export async function getUserMetrics(userId: string) {
  const [metrics] = await db
    .select({
      postsCount: count(posts.id),
      commentsCount: count(comments.id),
      likesReceived: sum(posts.likes),
    })
    .from(posts)
    .leftJoin(comments, eq(comments.postId, posts.id))
    .where(eq(posts.userId, userId));
  
  return metrics;
}
```

### Batch Operations

```typescript
// File: src/db/batchQueries.ts

/**
 * Create multiple posts
 */
export async function createManyPosts(posts: NewPost[]): Promise<Post[]> {
  return await db
    .insert(posts)
    .values(posts)
    .returning();
}

/**
 * Update multiple posts (bulk update)
 */
export async function updateManyPosts(
  ids: string[],
  data: Partial<NewPost>
): Promise<void> {
  await db
    .update(posts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(inArray(posts.id, ids));
}

/**
 * Delete multiple posts
 */
export async function deleteManyPosts(ids: string[]): Promise<void> {
  await db
    .delete(posts)
    .where(inArray(posts.id, ids));
}
```

### Query Helper Functions

```typescript
// File: src/db/queryHelpers.ts

/**
 * Pagination helper - returns paginated results + total count
 */
export async function paginate<T>(
  query: any,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;
  
  const results = await query.limit(limit).offset(offset);
  const [{ total }] = await db
    .select({ total: count() })
    .from(/* table */);
  
  return {
    results,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Sort helper - standardize sorting
 */
export function buildSort(sortBy?: string, order: 'asc' | 'desc' = 'desc') {
  const sortMap: Record<string, any> = {
    'recent': desc(posts.createdAt),
    'popular': desc(posts.likes),
    'oldest': asc(posts.createdAt),
  };
  
  return sortMap[sortBy] || sortMap['recent'];
}
```

## Query Organization Best Practices

### ✅ DO

1. **Organize queries by schema**
   ```typescript
   // ✅ RIGHT - One file per domain
   src/db/
   ├── profilesQueries.ts
   ├── postsQueries.ts
   ├── commentsQueries.ts
   ```

2. **Export from central index**
   ```typescript
   // src/db/index.ts
   export * from './profilesQueries';
   export * from './postsQueries';
   export * from './commentsQueries';
   ```

3. **Use type-safe results**
   ```typescript
   // ✅ RIGHT - Explicit return types
   export async function getProfile(id: string): Promise<Profile | undefined> {
     return await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
   }
   ```

4. **Load only needed columns**
   ```typescript
   // ✅ RIGHT - Select specific columns
   export async function getProfilePreview(id: string) {
     return await db
       .select({
         id: profiles.id,
         username: profiles.username,
         profileImage: profiles.profileImage,
       })
       .from(profiles)
       .where(eq(profiles.id, id))
       .limit(1);
   }
   ```

### ❌ DON'T

1. **Don't mix query logic in components**
   ```typescript
   // ❌ WRONG - Query logic in React component
   export function ProfileCard() {
     const [profile, setProfile] = useState(null);
     
     useEffect(() => {
       db.select().from(profiles).where(...).then(setProfile);
     }, []);
   }
   
   // ✅ RIGHT - Query in dedicated file, use hook
   // src/db/profilesQueries.ts
   export async function getProfile(id: string) { ... }
   
   // src/hooks/useProfile.ts
   export function useProfile(id: string) {
     return useQuery(() => getProfile(id));
   }
   ```

2. **Don't load unnecessary relations**
   ```typescript
   // ❌ WRONG - Loading everything
   const post = await db.query.posts.findFirst({
     where: eq(posts.id, postId),
     with: {
       author: true,
       comments: { with: { author: true } },
       likes: true,
       tags: true,
     },
   });
   
   // ✅ RIGHT - Load only needed relations
   const post = await db.query.posts.findFirst({
     where: eq(posts.id, postId),
     with: {
       author: true,
     },
   });
   ```

3. **Don't repeat queries across files**
   ```typescript
   // ❌ WRONG - Query logic duplicated
   // Component A
   const user = await db.select().from(profiles).where(eq(profiles.id, id));
   
   // Component B
   const user = await db.select().from(profiles).where(eq(profiles.id, id));
   
   // ✅ RIGHT - Centralize in query file
   // src/db/profilesQueries.ts
   export async function getProfileById(id: string) { ... }
   ```

## Related Patterns

- [Drizzle Schema](./drizzle-schema.md) — Schema definitions
- [Migrations](./migrations.md) — Schema versioning
- [Relations](./relations.md) — Table relationships

---

*Pattern extracted from production repositories: core-monorepo, PokePages, quantum-api*
*Files: src/db/*Queries.ts, query builders, aggregation patterns*