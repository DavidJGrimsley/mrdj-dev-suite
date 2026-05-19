# Skill: Environment Variables

Use when adding, reviewing, or debugging app configuration and secrets handling.

## Main rule

Keep a hard boundary between public client config and private server secrets; anything sensitive must never cross into `EXPO_PUBLIC_*` variables.

## Checks

- Confirm secrets (service-role keys, private tokens, payment secrets, passwords) are server-only.
- Confirm `EXPO_PUBLIC_*` values are safe to expose in client bundles.
- Validate required env keys exist for each runtime mode used by the project.
- Ensure Supabase anon key usage is scoped to client-safe flows and service-role usage is server-only.
- Verify env naming/docs are consistent across `.env` files, scripts, and project memory.

## Preferred structure

- Keep env access centralized through small typed config helpers.
- Separate client-safe config and server-only config modules.
- Document required keys and local setup in project memory and onboarding outputs.

## Example fix

- Problem: A route imports `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` from client config.
- Fix: Move service-role key to server-only env access, switch client flow to anon key, and update docs/checks.

## Agent behavior

- Prioritize removing exposure risk before refactoring for style.
- Delegate framework/env-loading primitives to official Expo guidance, then enforce MDS-specific security boundaries and Doctor alignment.
