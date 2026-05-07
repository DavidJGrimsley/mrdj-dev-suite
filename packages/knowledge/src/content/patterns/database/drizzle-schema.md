# Drizzle ORM Schema Design

## Description

Drizzle ORM schemas define type-safe database tables with full TypeScript inference from database types to application types. Schemas use domain-specific files with shared relations.ts for foreign keys and relationships, enabling compile-time type safety and automatic type generation.

## When to Use

**Use Drizzle schemas** for:
- ✅ Any PostgreSQL table definition in React Native/Node.js applications
- ✅ Projects requiring full TypeScript type inference (no separate type definitions)
- ✅ Applications with complex relationships and joins
- ✅ Teams valuing compile-time safety over runtime convenience

## Code Example

### Basic Schema with Type Inference

```typescript
// File: packages/db/src/schema/quantum-api/quantum-execution-jobs/schema.ts
import { pgTable, uuid, text, jsonb, integer, timestamp, unique, check } from 'drizzle-orm/pg-core';

export const quantumExecutionJobs = pgTable('quantum_execution_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: text('provider').notNull(), // 'ibm' | 'aws' | etc.
  remoteJobId: text('remote_job_id').notNull(),
  status: text('status').notNull().default('queued'), // queued | running | succeeded | failed | cancelled
  requestPayload: jsonb('request_payload').notNull(), // Full request object
  resultPayload: jsonb('result_payload'), // Result when status === succeeded
  errorPayload: jsonb('error_payload'), // Error object when status === failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  // Composite unique constraint
  uniqueRemoteJob: unique().on(table.provider, table.remoteJobId),
  
  // Check constraints for valid status values
  statusCheck: check(
    'status_check',
    sql`status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')`
  ),
  
  // Ensure completedAt is set when status is terminal
  completedAtCheck: check(
    'completed_at_check',
    sql`(status IN ('succeeded', 'failed', 'cancelled') AND completed_at IS NOT NULL) 
        OR (status NOT IN ('succeeded', 'failed', 'cancelled') AND completed_at IS NULL)`
  ),
}));

// Infer types from schema
export type QuantumExecutionJob = typeof quantumExecutionJobs.$inferSelect;
export type NewQuantumExecutionJob = typeof quantumExecutionJobs.$inferInsert;
```

**From:** DJsPortfolio/packages/db/src/schema/quantum-api/quantum-execution-jobs/schema.ts (lines 1-69)

### Schema with Foreign Keys

```typescript
// File: src/db/eventClaimsSchema.ts (PokePages pattern)
import { pgTable, uuid, text, timestamp, integer, foreignKey } from 'drizzle-orm/pg-core';
import { profiles } from './profilesSchema';
import { events } from './eventsSchema';

export const eventClaims = pgTable(
  'event_claims',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    eventId: uuid('event_id').notNull(),
    claimedAt: timestamp('claimed_at').defaultNow().notNull(),
    proofData: text('proof_data'), // Optional proof/screenshot
  },
  (table) => ({
    userFk: foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: 'event_claims_user_fk',
    }).onDelete('cascade'),
    
    eventFk: foreignKey({
      columns: [table.eventId],
      foreignColumns: [events.id],
      name: 'event_claims_event_fk',
    }).onDelete('cascade'),
    
    // Unique constraint: user can only claim event once
    uniqueUserEvent: unique().on(table.userId, table.eventId),
  })
);

export type EventClaim = typeof eventClaims.$inferSelect;
export type NewEventClaim = typeof eventClaims.$inferInsert;
```

**From:** PokePages/src/db/eventClaimsSchema.ts pattern

### Indexed Schema for Performance

```typescript
// File: src/db/postsSchema.ts
import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    likes: integer('likes').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => ({
    // Single column indexes for common queries
    userIdIdx: index('posts_user_id_idx').on(table.userId),
    createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
    
    // Composite index for common query pattern
    userCreatedIdx: index('posts_user_created_idx')
      .on(table.userId, table.createdAt),
    
    // Index for soft deletes
    activePostsIdx: index('posts_active_idx')
      .on(table.userId, table.deletedAt),
  })
);
```

## Configuration

### Database Connection Setup

```typescript
// File: src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schemas from './schemas';

const connectionString = process.env.DATABASE_URL!;

// Optimized connection pool for Supabase PgBouncer
export const client = postgres(connectionString, {
  prepare: false,        // Required for PgBouncer
  ssl: 'require',
  max: 3,               // Small pool size
  idle_timeout: 20,     // Close idle connections
  connect_timeout: 30,  // Connection timeout
  max_lifetime: 1800,   // Recycle after 30 minutes
});

export const db = drizzle(client, {
  schema: schemas,
});
```

### TypeScript Configuration

```typescript
// File: tsconfig.json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "drizzle-orm/compiler",
        "options": {
          "casing": "snake_case"
        }
      }
    ]
  }
}
```

## Best Practices

### ✅ DO

1. **Infer types from schema** — don't maintain separate type definitions
   ```typescript
   // ✅ GOOD - single source of truth
   export type Post = typeof posts.$inferSelect;
   export type NewPost = typeof posts.$inferInsert;
   
   // ❌ BAD - duplicate type definitions
   interface Post {
     id: string;
     title: string;
     // ... manually maintaining type sync
   }
   ```

2. **Use domain-specific schema files**
   ```
   src/db/
   ├── profilesSchema.ts
   ├── postsSchema.ts
   ├── commentsSchema.ts
   ├── relations.ts      ← all relationships defined here
   └── index.ts
   ```

3. **Define relationships in shared relations.ts**
   ```typescript
   // File: src/db/relations.ts
   import { relations } from 'drizzle-orm';
   import { profiles, posts, comments } from './schemas';
   
   export const profilesRelations = relations(profiles, ({ many }) => ({
     posts: many(posts),
   }));
   ```

4. **Use JSONB for flexible data** instead of many normalized tables
   ```typescript
   requestPayload: jsonb('request_payload').notNull(),
   resultPayload: jsonb('result_payload'),
   ```

5. **Add check constraints** for data integrity
   ```typescript
   check(
     'status_check',
     sql`status IN ('pending', 'completed', 'failed')`
   )
   ```

### ❌ DON'T

1. **Don't create overly normalized schemas** when embedding is more performant
   ```typescript
   // ❌ AVOID - creates N+1 queries
   users table → user_profiles table → user_settings table
   
   // ✅ BETTER - use JSONB for related data
   users: { profile: jsonb, settings: jsonb }
   ```

2. **Don't forget indexes** on frequently queried columns
   ```typescript
   // ❌ BAD - no index on userId
   posts table with userId but no index
   
   // ✅ GOOD - indexed for fast lookups
   userIdIdx: index().on(table.userId)
   ```

3. **Don't use mutable defaults** (like functions) for timestamps
   ```typescript
   // ❌ BAD - function called once at migration time
   createdAt: timestamp('created_at').default(fn)
   
   // ✅ GOOD - database handles default for each row
   createdAt: timestamp('created_at').defaultNow()
   ```

4. **Don't create tables without soft delete** if you might need historical data
   ```typescript
   // ✅ GOOD - reversible deletion
   deletedAt: timestamp('deleted_at')
   
   // Query active records
   where(isNull(posts.deletedAt))
   ```

## Related Patterns

- [Database Migrations](./migrations.md) — Managing schema changes
- [Relationships](./relations.md) — Foreign keys and joins
- [Query Organization](./query-organization.md) — Data access layer

---

*Pattern extracted from production repositories: DJsPortfolio, PokePages, core-monorepo*
*Files: DJsPortfolio/packages\db\src\schema\quantum-api\quantum-execution-jobs\schema.ts*
*Lines 1-69 with full JSONB payload handling and check constraints*