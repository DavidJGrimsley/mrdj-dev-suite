# Environment Hygiene Rule

Never expose secrets through `EXPO_PUBLIC_` variables. Public variables are
bundled for the client.

Treat names containing `SECRET`, `SERVICE_ROLE`, `PRIVATE`, `PASSWORD`,
`TOKEN`, or `STRIPE_SECRET` as unsafe when they are prefixed with
`EXPO_PUBLIC_`.

Document every `EXPO_PUBLIC_*` key from `.env.local` in a committed
`.env.example` (empty or placeholder values only). Example/template env files
must not contain live-looking secrets.

Doctor also reports context-gated hardcoded credential values in source and
configuration files, including Stripe `sk_`/`pk_`, OpenAI `sk-`, AWS `AKIA`
keys, and Bearer/JWT tokens. Reports must identify only the file, line, safe
identifier, detector, and remediation; never print the credential value itself.
Real gitignored env files are the correct place for secrets.

