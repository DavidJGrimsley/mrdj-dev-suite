# Convex Auth Setup

This app includes the MDS auth shell wired to Convex React Native and Convex Auth. This variant is experimental.

## Environment

Install the generated app dependencies, then initialize Convex:

```bash
npx convex dev
npx @convex-dev/auth
```

Set the public Convex deployment URL for the Expo app:

```bash
EXPO_PUBLIC_CONVEX_URL=
```

## Password Provider Snippet

After Convex generates its `convex/` folder and `_generated` files, configure password auth in the Convex backend:

```ts
import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

Convex Auth is beta. Confirm the current Convex Auth setup docs before treating this path as production infrastructure.
