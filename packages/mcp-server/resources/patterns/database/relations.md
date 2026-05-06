# Table Relations Pattern

## Description

Relations define how tables connect through foreign keys and reference relationships in Drizzle ORM. The `relations.ts` file explicitly declares one-to-many, many-to-one, and one-to-one relationships, enabling type-safe queries that fetch related data with full TypeScript inference.

## When to Use

**Define relations when:**
- ✅ Table A references Table B (foreign key)
- ✅ Need to query parent + child data together
- ✅ Want type-safe relationship loading
- ✅ Implementing nested/relational queries
- ✅ Ensuring referential integrity
- ✅ Building flexible association patterns

## Core Concepts

**Relationship Types:**
1. **One-to-Many**: One profile has many posts
2. **Many-to-One**: Many posts belong to one profile
3. **One-to-One**: One profile has one settings
4. **Many-to-Many**: Many users have many groups (junction table)

**Relation Declaration:**
```typescript
// Foreign key in database:
posts.user_id → profiles.id

// In relations.ts:
export const profilesRelations = relations(profiles, ({ many }) => ({
  posts: many(posts),  // One profile can have many posts
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(profiles, {
    fields: [posts.userId],
    references: [profiles.id],
  }),
}));
```

**Type Safety:**
- Zustand stores for state: `User | null`
- Drizzle types from schema: `typeof profiles.$inferSelect`
- Relations enable: `profile.posts` with full type checking

## Code Examples

### Basic One-to-Many Relations

```typescript
// File: src/db/profilesSchema.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;

// File: src/db/postsSchema.ts
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;

// File: src/db/relations.ts
import { relations } from 'drizzle-orm';
import { profiles, posts } from './schemas';

/**
 * One profile has many posts
 */
export const profilesRelations = relations(profiles, ({ many }) => ({
  posts: many(posts),
}));

/**
 * Many posts belong to one profile
 */
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(profiles, {
    fields: [posts.userId],
    references: [profiles.id],
  }),
}));
```

### Query with Relations

```typescript
// File: src/db/postsQueries.ts
import { db } from './index';
import { posts, profiles } from './schemas';
import { eq } from 'drizzle-orm';

/**
 * Get post with author data
 */
export async function getPostWithAuthor(postId: string) {
  return await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      author: true,  // Load related profile
    },
  });
}

// Result type:
// {
//   id: string;
//   title: string;
//   content: string;
//   userId: string;
//   createdAt: Date;
//   author: {
//     id: string;
//     username: string;
//     email: string;
//     bio: string | null;
//     createdAt: Date;
//   }
// }
```

### Complex Relations: Many-to-Many

```typescript
// File: src/db/usersSchema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
});

// File: src/db/groupsSchema.ts
export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
});

// File: src/db/userGroupsSchema.ts (Junction table)
export const userGroups = pgTable('user_groups', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
});

// File: src/db/relations.ts
export const usersRelations = relations(users, ({ many }) => ({
  userGroups: many(userGroups),  // Users have many group memberships
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  userGroups: many(userGroups),  // Groups have many user members
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

// Query usage:
const userWithGroups = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    userGroups: {
      with: {
        group: true,  // Nested relations
      },
    },
  },
});
```

### One-to-One Relations

```typescript
// File: src/db/userSettingsSchema.ts
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()  // One-to-one: unique constraint
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('auto'),
  notificationsEnabled: boolean('notifications_enabled').default(true),
});

// File: src/db/relations.ts
export const usersRelations = relations(users, ({ one }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// Query:
const userWithSettings = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    settings: true,
  },
});
```

### Nested Relations Query

```typescript
// File: src/db/queriesAdvanced.ts

/**
 * Get user with posts, comments, and comment authors
 * Deeply nested relations
 */
export async function getUserWithContent(userId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      // User's posts
      posts: {
        with: {
          // Posts' comments
          comments: {
            with: {
              // Comments' authors
              author: true,
            },
          },
        },
      },
    },
  });
}

// Result structure:
// {
//   id: string;
//   username: string;
//   posts: [
//     {
//       id: string;
//       title: string;
//       comments: [
//         {
//           id: string;
//           text: string;
//           author: {
//             id: string;
//             username: string;
//           }
//         }
//       ]
//     }
//   ]
// }
```

### Filtering with Relations

```typescript
// File: src/db/queriesWithFilters.ts

/**
 * Get profiles that have published posts
 */
export async function getProfilesWithPosts() {
  return await db.query.profiles.findMany({
    with: {
      posts: {
        where: eq(posts.published, true),
      },
    },
  });
}

/**
 * Get recent posts with author (active authors only)
 */
export async function getRecentPosts() {
  return await db.query.posts.findMany({
    orderBy: (posts) => desc(posts.createdAt),
    limit: 10,
    with: {
      author: {
        columns: {
          username: true,
          profileImage: true,
        },
      },
    },
  });
}
```

## Relation Best Practices

### ✅ DO

1. **Define relations in dedicated file**
   ```typescript
   // ✅ RIGHT - src/db/relations.ts
   export const profilesRelations = relations(...);
   export const postsRelations = relations(...);
   
   // ✅ Import in index.ts
   import { profilesRelations, postsRelations } from './relations';
   ```

2. **Export from index.ts**
   ```typescript
   // File: src/db/index.ts
   export { db } from './client';
   export { profiles, posts } from './schemas';
   export * from './relations';  // Make relations available
   ```

3. **Use type-safe queries**
   ```typescript
   // ✅ RIGHT - Full type inference
   const postWithAuthor = await db.query.posts.findFirst({
     where: eq(posts.id, postId),
     with: {
       author: true,  // TypeScript knows author: Profile
     },
   });
   ```

4. **Name relations descriptively**
   ```typescript
   // ✅ RIGHT - Clear relationship names
   profiles: many(posts);  // Posts written by profile
   author: one(profiles);  // Profile who wrote this post
   
   // ❌ WRONG - Unclear
   items: many(posts);
   owner: one(profiles);
   ```

### ❌ DON'T

1. **Don't define relations in schema files**
   ```typescript
   // ❌ WRONG - Mixing concerns
   // src/db/profilesSchema.ts
   export const profilesRelations = relations(...);
   
   // ✅ RIGHT - Dedicated relations.ts
   // src/db/relations.ts
   export const profilesRelations = relations(...);
   ```

2. **Don't forget to import relations in db/index.ts**
   ```typescript
   // ❌ WRONG - Relations not exported
   // src/db/index.ts
   export { db } from './client';
   // (relations.ts exists but not imported)
   
   // ✅ RIGHT
   import * from './relations';  // Make relations available
   ```

3. **Don't load unnecessary relations**
   ```typescript
   // ❌ WRONG - Loading relation you don't use
   const post = await db.query.posts.findFirst({
     where: eq(posts.id, postId),
     with: {
       author: true,
       comments: true,
       tags: true,
       relatedPosts: true,
     },
   });
   // Only using post.author
   
   // ✅ RIGHT - Load only needed relations
   const post = await db.query.posts.findFirst({
     where: eq(posts.id, postId),
     with: {
       author: true,
     },
   });
   ```

## Referential Integrity

### Foreign Key Constraints

```typescript
// File: src/db/postsSchema.ts

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, {
      onDelete: 'cascade',  // Delete posts when user deleted
      onUpdate: 'cascade',  // Update userId when user.id changes
    }),
  title: text('title').notNull(),
  content: text('content').notNull(),
});
```

### ON DELETE Options

- `cascade`: Delete child records when parent deleted
- `restrict`: Prevent parent deletion if children exist
- `set null`: Set foreign key to NULL when parent deleted
- `no action`: Raise error (requires manual cleanup)

## Related Patterns

- [Drizzle Schema](./drizzle-schema.md) — Schema definitions
- [Migrations](./migrations.md) — Schema versioning
- [Query Organization](./query-organization.md) — Query patterns

---

*Pattern extracted from production repositories: core-monorepo, PokePages, quantum-api*
*Files: src/db/relations.ts, query builders with nested relations*