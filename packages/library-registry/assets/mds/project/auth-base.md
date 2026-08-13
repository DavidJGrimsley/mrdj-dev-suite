# Auth Setup

This app includes the provider-neutral MDS auth shell.

## What Was Added

- Sign-in, sign-up, and password reset routes under the auth route group.
- Shared auth form UI in `src/features/auth`.
- `AuthProvider` and `useAuth`.
- A base in-memory adapter at `src/features/auth/auth-adapter.ts`.

## Before Production

- Replace the base adapter with a real auth provider.
- Persist sessions outside process memory.
- Guard protected app routes in the root Expo Router layout.
- Store legal acceptance and onboarding completion in user-scoped storage when those flows matter for compliance.
