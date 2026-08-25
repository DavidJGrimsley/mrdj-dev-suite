# Supabase Auth Setup

This app includes the MDS auth shell wired to Supabase Auth.

## Environment

The scaffold includes `.env.example` with the required client-safe Supabase variables. Copy it to `.env.local` and fill in your values before running the app:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`EXPO_PUBLIC_SUPABASE_KEY` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are still accepted as fallbacks for older projects.

## Database

Apply `supabase/migrations/0001_mds_auth_onboarding.sql` to the Supabase project before relying on onboarding or legal acceptance persistence.

Onboarding completion and legal acceptance are written through MDS adapters, not by the auth screens. When Zustand is also selected, Zustand is only a local cache and pending queue. Supabase `user_onboarding_state` and `user_legal_acceptances` remain the source of truth. Legal rows are insert-only and scoped to `auth.uid()`.

Do not treat pre-auth local legal acceptance as a hosted audit record. Hosted apps should write legal acceptance after sign-in, typically through `/legal/updates`.

The Expo client env values are not enough to run migrations. To apply SQL, use one of these:

```bash
# Linked Supabase project. Requires a Supabase CLI login/access token.
npx supabase link --project-ref <project-ref>
npx supabase migration up --linked
```

```bash
# Direct database connection. Requires the Postgres connection string/password from Supabase.
npx supabase migration up --db-url "<postgres-connection-string>"
```

Use separate Supabase projects for test/staging and production. Never put service-role keys, database passwords, or other Supabase secrets in Expo client code.

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are client-visible configuration values, not database admin credentials. They are okay in local `.env.local` files and deployment env settings, and the generated `.env.example` template leaves them blank so new apps do not all point at one shared development backend.

## Notes

- New Supabase projects usually require email confirmation before the first session appears.
- OAuth and magic-link auth need app deep links and are left as follow-up integration work.
- Row level security is the production boundary for client-visible Supabase tables.
