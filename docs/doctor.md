# Doctor runtime security and env hygiene

Doctor now has two complementary static checks for credential leaks and server/client boundary mistakes.

## Runtime security

Check name: `runtime security`

This check runs only when the scanned project looks like an Expo app (`expo` / `expo-router` in `package.json`, or an `app.json` / `app.config.*` file). Node tooling packages are skipped.

It does **not** replace the existing browser-global SSR scan (`window` / `document` / `localStorage`). That scan still lives in `ssr safety` and route architecture.

### What it catches

| Finding | Severity | Example |
| --- | --- | --- |
| Server packages imported from client files (`prisma`, `drizzle-orm`, `express`, `firebase-admin`, …) | error | `import { PrismaClient } from '@prisma/client'` in `app/index.tsx` |
| Client imports of `*.server.ts`, `+api` modules, or files that start with `'use server'` | error | `import { db } from '../db.server'` |
| `node:fs` / `node:child_process` / `node:http` / `node:net` / `node:cluster` on the client | error | `import fs from 'node:fs'` in a route component |
| Private `process.env.FOO` in client code | error | `process.env.SUPABASE_SERVICE_ROLE_KEY` |
| Hardcoded API keys in Expo config `extra` | error | `expo.extra.apiKey: "sk_live_…"` |
| Metro export conditions overwritten without `"node"` while API routes / `'use server'` / `web.output: "server"` exist | warn | `unstable_conditionNames = ['require', 'react-native']` |
| `fetch` / `axios` to `localhost`, `127.0.0.1`, `0.0.0.0`, or `10.0.2.2` | warn | `fetch('http://localhost:3000/api')` |

### Passing example

```tsx
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = createClient(url, anon);
```

API routes (`*+api.ts`) may import `drizzle-orm` / `prisma`. Stock `getDefaultConfig` from `expo/metro-config` is enough for the Node runtime target.

### Warning example

```tsx
export function loadOrders() {
  return fetch('http://localhost:3000/api/orders');
}
```

Use `process.env.EXPO_PUBLIC_API_URL` (or a similar public base URL) instead of baking the dev server into the client bundle.

### Failing example

```tsx
import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
export const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

Move database clients and private env access into an Expo Router API route or a server-only module that the client never imports.

## Env hygiene

Check name: `env hygiene`

Env hygiene still flags secret-looking `EXPO_PUBLIC_*` names and hardcoded credential **values** in source and config. Reports include file, line, a safe identifier, detector, and remediation. They never print the secret itself.

Additional template checks:

- **Warn** if `.env.local` defines `EXPO_PUBLIC_*` keys that are missing from `.env.example` (or if no example file exists).
- **Error** if `.env.example` / `.env.sample` / `.env.template` contains a live-looking secret value. Empty values and placeholders (`your-`, `changeme`, `example`, `xxx`) are fine.
- Real gitignored env files (`.env`, `.env.local`) are the right place for secrets; Doctor does not treat those values as source leaks.
- Known shapes now include Stripe `sk_` / `rk_`, Stripe publishable `pk_` (warn in source), OpenAI `sk-` / `sk-proj-`, AWS `AKIA…`, Bearer/JWT, Slack, GitHub, SendGrid, webhook secrets, and PEM private-key headers.

### Passing example

`.env.example`

```
EXPO_PUBLIC_API_URL=
STRIPE_SECRET_KEY=
```

`.env.local`

```
EXPO_PUBLIC_API_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
```

### Warning example

`.env.local` contains `EXPO_PUBLIC_API_URL` but `.env.example` does not document it.

### Failing example

`.env.example` committed with `STRIPE_SECRET_KEY=sk_live_…`, or source containing `const stripeSecretKey = "sk_live_…"`.
