# Database Adapter Contract

MDS generated apps can use `src/db` as a narrow boundary between product logic and the selected backend. The contract is intentionally smaller than an ORM: it defines typed table operations, provider metadata, capabilities, subscription cleanup, and standard error classes.

Generated Supabase data-start projects receive:

- `src/db/adapter.ts` for shared contract types and errors.
- `src/db/supabase.ts` for the Supabase-backed implementation.
- `src/db/index.ts` for a Supabase-only `getAdapter()` factory.
- `src/types/database.ts` for app-owned table row types.

Use the adapter from feature code instead of importing provider clients directly:

```ts
import { getAdapter } from '../db';

const db = getAdapter();
const comments = await db.query({
  table: 'mds_guestbook',
  orderBy: { column: 'created_at', ascending: false },
});
```

The Supabase adapter supports reads, writes, realtime subscriptions, and contract-level error mapping. Its `transaction` method is a callback boundary for code organization, not an atomic Postgres transaction. Use a Postgres function or server route when a flow needs atomic multi-step writes.

The Firebase variant is a skeleton. It copies the same contract and a Firestore-oriented adapter shell, but apps must define collection paths, auth rules, query mapping, and `onSnapshot` behavior before using it for product data.

