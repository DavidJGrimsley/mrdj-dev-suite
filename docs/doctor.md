# MDS Doctor

`mds doctor` is the production-readiness check for Expo apps. It runs static scans plus optional package scripts depending on the selected mode.

```bash
mds doctor /path/to/expo-app --fast
mds doctor /path/to/expo-app --ci
mds doctor /path/to/expo-app --json
```

Explain a check:

```bash
mds explain "router safety"
mds explain "api safety"
```

## Modes

| Mode | What it runs |
| --- | --- |
| `--fast` | Static project checks plus lint/typecheck scripts. Default for `mds doctor` via the CLI wrapper. |
| `--ci` | Fast checks plus tests, Expo Doctor, and release build scripts when the app defines them. |
| `--full` | CI checks plus the broadest available build script. |

Static checks always run. Router safety and API safety are static scans — they run in every mode.

Warnings do not fail the process. Errors do. Heuristic router/API findings are **warnings**, except returning `error.stack` in a JSON body, which is an **error**.

## Runtime security

Check name: `runtime security`

Runs for Expo-shaped projects and catches server/client boundary mistakes: server packages imported from client files, client imports of `*.server.ts`, API route modules, files that start with `'use server'`, Node core runtime modules in client routes, private env access in client code, hardcoded credential values in Expo config, unsafe Metro export conditions for server runtimes, and local-only HTTP endpoints in bundled client code.

API routes (`*+api.ts`) may import database/server packages. Stock `getDefaultConfig` from `expo/metro-config` is enough for the Node runtime target.

## Env hygiene

Check name: `env hygiene`

Flags secret-looking `EXPO_PUBLIC_*` names and hardcoded credential values in source and config. Reports include file, line, a safe identifier, detector, and remediation. They never print the secret itself.

Template checks warn when `.env.local` public keys are missing from `.env.example`, and error when committed env examples contain live-looking secrets. Empty values and placeholders such as `your-`, `changeme`, `example`, and `xxx` are allowed.

Known shapes include Stripe, OpenAI, AWS, Bearer/JWT, Slack, GitHub, SendGrid, webhook secrets, and PEM private-key headers.

## Router safety

Looks at Expo Router `app/` or `src/app/` trees.

| Detector | Warns when |
| --- | --- |
| Route groups | A `(group)` folder has no `_layout` file, or groups nest more than two deep |
| Layouts | Conventional `(tabs)` / `(drawer)` / `(auth)` / `(modal)` groups miss a layout; auth-shaped routes have no session/`Redirect`/`Protected` layout; root `_layout` is overloaded with data fetching |
| Navigation | `router.push('/' + id)` or template-literal hrefs assemble paths instead of typed pathname objects |
| Mixed concerns | A large screen mixes auth, data-layer imports, and helpers; a large `+api` file inlines business logic instead of wrapping a service |

Platform layout variants (`_layout.web.tsx`, `_layout.native.tsx`) count as layouts. Test files are ignored.

Static hrefs such as `href="/dashboard"` or `router.push('/(tabs)/settings')` are allowed.

## API safety

Looks at real Expo Router API routes (`*+api.ts` / `*+api.js` under `app/` or `src/app/`). Skips when the project has no Expo Router signal or no API files.

| Detector | Behavior |
| --- | --- |
| Auth | Warns on **sensitive** paths (`billing`, `payment`, `db`, `admin`, `credential`, `auth`, …) that have no auth helper. `handleDbWrite`, `requireAuthUserId`, session helpers, and webhook signatures count. Public/proxy routes are not required to authenticate. |
| HTTP methods | Named `GET`/`POST`/… exports pass. A default export that never inspects `request.method` warns. |
| Input validation | `request.json()` / `request.formData()` without Zod or a parse helper (`handleDbWrite`, `parseBillingJson`) warns. Webhooks that read `arrayBuffer()` plus a signature do not need Zod. |
| Service role | `process.env.*SERVICE_ROLE*` or `createClient(..., serviceRole)` without an auth gate warns. Comments and test mocks are ignored. |
| Rate limiting | Warns on auth/billing/payment/credential/webhook endpoints with no `rateLimit` / `429` / `quota` signal. Ordinary `/api/db` CRUD helpers are not flagged. |
| Error exposure | `stack: error.stack` in a JSON body is an **error**. Other stack/`JSON.stringify(error)` leaks warn. |
| CORS | Warns on `Access-Control-Allow-Origin: *` or reflecting `Origin` without an allowlist. Missing CORS headers on same-origin routes is fine. |

## Safe vs unsafe API routes

Safe — thin wrapper, named method, schema, auth:

```ts
import { z } from 'zod';
import { requireBillingAuthUserId } from '@/server/billing/routes';
import { createStripeCheckoutSession } from '@/server/billing/stripe-service';

const checkoutSchema = z.object({
  offer: z.enum(['annual', 'monthly']),
}).strict();

export async function POST(request: Request): Promise<Response> {
  const authUserId = await requireBillingAuthUserId(request);
  const body = checkoutSchema.parse(await request.json());
  return Response.json(await createStripeCheckoutSession(authUserId, body.offer, request.url));
}
```

Unsafe — untyped body, service role, stack leak, wildcard CORS:

```ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(request: Request) {
  const body = (await request.json()) as { email: string };
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    await supabase.from('users').insert(body);
    return Response.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    return Response.json({ stack: error.stack });
  }
}
```

## Related skills

- `expo-router-architecture` — keep `app/` thin
- `api-routes` — validate, authenticate, and return safe envelopes
