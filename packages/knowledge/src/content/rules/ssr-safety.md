# SSR Safety Rule

Expo web routes must not assume browser-only globals are available during
render.

Warn on unguarded `window`, `document`, `localStorage`, `sessionStorage`, and
`navigator` references in route files. Prefer `useEffect`, explicit
`typeof window !== 'undefined'` guards, or a storage adapter.

Do not import server-only modules into client routes. Database clients
(`prisma`, `drizzle-orm`), Node server frameworks (`express`), `'use server'`
files, and `*.server.ts` modules belong behind API routes or server entry
points. Client code may only read `EXPO_PUBLIC_*` (plus `NODE_ENV` and
`EXPO_OS`). Doctor's `runtime security` check enforces this server-on-client
boundary; the browser-global scan remains a separate warning.

