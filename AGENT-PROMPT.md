# Agent Prompt: feat/auth-supabase-env-local

## ⚠️ PRE-START: Check Dependencies

- **#30 (Add MDS auth library variants):** Already merged. You depend on this work being in place.
- **Rebase:** `git fetch origin --no-tags && git rebase origin/main`
- **No blocking dependencies:** This is a quick fix/improvement to auth onboarding.

---

## Rank: feat/auth-supabase-env-local — Generate .env.local for Supabase Auth Apps

### Mission

Ensure every Supabase auth-enabled generated app includes a `.env.local` file with credentials template. Currently, generated apps only get `.env.example`, forcing developers to manually create `.env.local` before the app can load. This breaks the "works out of the box" promise.

### Problem Statement

**Current behavior:**
- Generated apps with Supabase auth have `.env.example` with empty placeholders
- Developers must manually create `.env.local` with their Supabase credentials
- If they forget, app crashes at login screen (by design)
- This is a friction point in the onboarding experience

**Desired behavior:**
- Generated apps include `.env.local` alongside `.env.example`
- `.env.local` is in `.gitignore` (not committed)
- For test/smoke apps, `.env.local` can have example credentials (public keys are safe to share)
- Developers can immediately run the generated app with working auth

**Example (working):**
`F:\SoftwareDev\MDS\mrdj-dev-suite-MAIN\test-apps\auth-supabase-onboarding-smoke-sdk56\.env.local`
```
EXPO_PUBLIC_SUPABASE_URL=https://bvzekjnvpkbcdobccffn.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable__NjNz5Lsu6MhXgqdpWOihQ_yxKo22M-
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable__NjNz5Lsu6MhXgqdpWOihQ_yxKo22M-
```

**Example (broken — missing `.env.local`):**
`F:\SoftwareDev\MDS\test-apps\library-contract-work-1\` (has only `.env.example`)

### Scope

1. **Update project-memory integration:**
   - File: `packages/cli/src/project-memory.ts`
   - When Phase 0 selects Supabase auth, include `.env.local` generation
   - Template: mirror `.env.example` but with example/empty values

2. **Create `.env.local` template in library assets:**
   - File: `packages/library-registry/assets/mds/.env.local.template` or similar
   - Contains:
     ```
     EXPO_PUBLIC_SUPABASE_URL=
     EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
     EXPO_PUBLIC_SUPABASE_KEY=
     ```
   - Can be hard-coded or read from `.env.example`

3. **Wire into CESS generator:**
   - `create-expo-super-stack` now generates `.env.local` when auth is Supabase
   - For local dev/smoke tests: populate with example values (from `auth-supabase-onboarding-smoke-sdk56` as reference)
   - For production docs: leave empty but present

4. **Test with fresh app generation:**
   - Generate a new test app with Supabase auth selected
   - Verify `.env.local` is created
   - Verify app can start (Doctor passes, no login errors)
   - Compare against working example

5. **No breaking changes:**
   - Existing generated apps continue to work (`.env.local` is optional)
   - `.env.local` remains in `.gitignore` (never committed)
   - `.env.example` still serves as documentation of required vars

6. **Changeset for `@mr.dj2u/cli`**

### Acceptance Criteria

- [ ] `.env.local` is generated for all Supabase auth apps
- [ ] `.env.local` is in `.gitignore` (not version-controlled)
- [ ] `.env.example` still exists as documentation
- [ ] Fresh generated app builds and passes Doctor without manual env setup
- [ ] No changes to database adapter work (keep #17 separate)
- [ ] Existing test apps still work (no regressions)
- [ ] Changeset added
- [ ] `pnpm run doctor --ci` passes

### Model Tier: Tier 2 (Low-Medium)

**Why Tier 2:** Straightforward pattern matching (copy `.env.example` to `.env.local`), well-scoped, no complex design. Similar to changing a template or adding a file to generation.

---

## Execution (Quick)

1. **Rebase:** `git fetch origin --no-tags && git rebase origin/main`

2. **Locate env template in existing code:**
   - Find where `.env.example` is currently generated or stored
   - Check `packages/cli/src/project-memory.ts` for auth setup

3. **Add `.env.local` generation:**
   - When Phase 0 = Supabase auth, also generate `.env.local`
   - Copy `.env.example` content (or hard-code if simpler)
   - Place in app root (same as `.env.example`)

4. **Test generation:**
   - Generate a fresh app with Supabase auth
   - Verify `.env.local` exists and is readable
   - Verify `.env.local` is in `.gitignore`
   - Run `pnpm run doctor --fast` to confirm no env-related errors

5. **Compare against working example:**
   - Diff your generated `.env.local` against `F:\SoftwareDev\MDS\mrdj-dev-suite-MAIN\test-apps\auth-supabase-onboarding-smoke-sdk56\.env.local`
   - Should match structure; values can be empty placeholders or examples

6. **Commit and push:**
   - `git add . && git commit -m "feat: generate .env.local for Supabase auth apps"`
   - `git push origin feat/auth-supabase-env-local`

---

## Files to Review / Modify

- `packages/cli/src/project-memory.ts` — auth setup, project-memory generation
- `packages/library-registry/assets/mds/` — asset templates
- `.env.example` in test-apps (reference)
- `.gitignore` — verify `.env*` is ignored

## Reference Apps

- **Working:** `F:\SoftwareDev\MDS\mrdj-dev-suite-MAIN\test-apps\auth-supabase-onboarding-smoke-sdk56`
- **Broken:** `F:\SoftwareDev\MDS\test-apps\library-contract-work-1`

---

**Status:** Ready to start now. Tier 2, quick turnaround. No dependencies blocking.
