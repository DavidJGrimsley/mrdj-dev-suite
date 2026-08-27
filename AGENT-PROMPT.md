# Wave 4 Task #24: Doctor Runtime Security Checks

**Branch:** `feat/doctor-runtime-security`  
**PR:** #24 (draft)  
**Depends on:** #3 (doctor-dogfood, already merged)  
**Blocks:** Nothing (independent)

---

## ⚠️ IMPORTANT: TIER 5 SECURITY-SENSITIVE WORK

**Use Grok 4.5 or Claude Opus 5 for this task.** This is Tier 5 (very high) because false positives and false negatives in security checks both have real cost. Budget time for careful reasoning, test coverage, and edge cases.

---

## Mission

Extend Doctor with **runtime security checks** that catch dangerous patterns in SSR (server-side rendering), server imports, and credential/secret handling. Focus on preventing:
- Server-only code (APIs, database, secrets) accidentally bundled into client JS
- Credentials exposed in environment variables or config
- Unsafe server imports on the client
- Missing env-var guards for sensitive data

---

## Acceptance Criteria

### 1. SSR Safety Checks
Add Doctor checks that catch:
- ✅ Server-only files imported into client routes (detect via `use server` directive, `.server.ts` naming, or known server packages)
- ✅ Database clients (e.g., `prisma`, `drizzle-orm`) imported on client
- ✅ Server framework code imported on client (e.g., Express middleware)
- ✅ Warn if `node` env var is used but `getDefaultConfig` in `metro.config.js` doesn't set Node runtime target
- ✅ API keys / credentials in Expo config hardcoded (not `EXPO_PUBLIC_*` env vars)

### 2. Credential/Env Hygiene
- ✅ Warn if `.env.local` contains `EXPO_PUBLIC_*` (should be in `.env.example`)
- ✅ Warn if non-public keys are in `.env.example` (template should not expose real secrets)
- ✅ Detect hardcoded API keys in source files (patterns: `sk_`, `pk_`, Bearer tokens, AWS keys)
- ✅ Flag `process.env` access without `EXPO_PUBLIC_` prefix in client code (should fail loudly in dev)
- ✅ Flag `fetch` to hardcoded URLs with `localhost:3000` or similar dev-server patterns

### 3. Test Coverage
- ✅ Test against `time2pay` (real monorepo with server + client)
- ✅ Test against `DJsPortfolio` (web app with API routes)
- ✅ Test against `PokePages` (client-heavy app)
- ✅ Test normal, warning, and critical cases (passing app, app with warnings, app with real security issue)
- ✅ Add unit tests for edge cases (template files, node_modules, comments, strings)

### 4. Validation
```bash
pnpm run type-check
pnpm run build
pnpm run lint
pnpm --filter "@mr.dj2u/doctor" test
pnpm run doctor --ci  # Should pass with 0 security errors (may have existing warnings)
```

### 5. Changeset
- ✅ Add `.changeset/` entry for `@mr.dj2u/doctor` documenting new runtime security checks

---

## Files to Create/Modify

### Core Implementation
- **`packages/doctor/src/checks/runtime-security.ts`** (NEW)
  - Main check module
  - Functions: `checkSSRSafety()`, `checkCredentialExposure()`, `checkServerImports()`
  - Return warnings/errors per file

- **`packages/doctor/src/checks/env-hygiene.ts`** (NEW or extend existing)
  - Expand `.env.local` vs `.env.example` checking
  - Add hardcoded secret detection (API key patterns)
  - Add `process.env` guard checks in client code

### Tests
- **`packages/doctor/tests/runtime-security.test.ts`** (NEW)
  - Test SSR safety against fixtures
  - Test credential exposure detection
  - Test false positives (comments containing "api_key", strings, etc.)

- **`packages/doctor/tests/env-hygiene.test.ts`** (NEW/extend)
  - Test `.env` template vs `.env.local` patterns
  - Test hardcoded secret patterns
  - Test `process.env` access patterns

### Documentation
- Update `docs/doctor.md` to document new security checks
- Add examples of passing, warning, and failing cases

---

## Definition of Done

✅ All acceptance criteria pass  
✅ Tests pass on time2pay, DJsPortfolio, PokePages  
✅ Type-check and lint clean  
✅ Doctor full run reports 0 errors (existing warnings OK)  
✅ Changeset added  
✅ PR ready for review  

---

## Model Tier Recommendation

**Use Grok 4.5 (free, Tier 4+) or Claude Opus 5 (Tier 5).** This is security-sensitive work where false negatives (missing a real vulnerability) and false positives (flagging safe code) both have real cost. Invest in a strong model.

---

## Notes

- Focus on **real vulnerabilities**, not code style
- False positives are better than false negatives (warn aggressively, let developers adjust)
- This work is independent; can merge anytime after it's solid
- Dogfood against real apps first; adjust based on real findings
