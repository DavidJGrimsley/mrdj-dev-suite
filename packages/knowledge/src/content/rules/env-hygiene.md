# Environment Hygiene Rule

Never expose secrets through `EXPO_PUBLIC_` variables. Public variables are
bundled for the client.

Treat names containing `SECRET`, `SERVICE_ROLE`, `PRIVATE`, `PASSWORD`,
`TOKEN`, or `STRIPE_SECRET` as unsafe when they are prefixed with
`EXPO_PUBLIC_`.

Doctor also reports context-gated hardcoded credential values in source and
configuration files. Reports must identify only the file, line, safe identifier,
detector, and remediation; never print the credential value itself.

