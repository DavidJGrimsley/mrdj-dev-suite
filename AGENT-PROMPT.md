# Task: Supabase Auth Environment Credentials Automation (#16b)

**Status:** Work already implemented in feat/monorepo-intake-model (#21)  
**Branch:** `feat/auth-supabase-credentials-automation`  
**Depends on:** PR #55 (already merged)  
**Blocks:** Nothing (independent; can merge anytime)

## ⚠️ IMPORTANT: THIS WORK IS ALREADY DONE

The complete implementation of Supabase credential automation is **already in the monorepo branch (PR #51 / feat/monorepo-intake-model)**. 

**What exists in the monorepo branch:**
- ✅ CESS interactive prompts for Supabase URL and publishable key
- ✅ `.env.local` generation with actual values
- ✅ CLI flags `--mds-supabase-url` and `--mds-supabase-publishable-key`
- ✅ Safety checks (never overwrites existing `.env.local`)
- ✅ `.gitignore` entries
- ✅ Comprehensive tests

**This task:** Validate the implementation works correctly when monorepo PR #21 merges to main, or migrate the code back to main if the monorepo branch approach changes.

## What You're Solving

PR #55 generated only `.env.example` (a template). Developers had to manually create `.env.local` and fill in Supabase credentials.

**Solution already exists:** The monorepo branch has automated credential entry during CESS onboarding and app generation so Supabase apps work immediately. This task validates that solution.

## Acceptance Criteria (VALIDATION)

### 1. Verify CESS Interactive Intake Works
When selecting "Supabase" auth during app generation on the monorepo branch:

```
? Would you like to configure Supabase auth? (Y/n) Y
? Supabase project URL: https://your-project.supabase.co
? Supabase publishable key: sb_pub_XXXxxxXXXxxxXXXxxxXXXxxxXXXxxxX
```

✅ `.env.local` is generated with actual values (not in Git)  
✅ `.env.example` is generated as empty template (tracked in Git)  
✅ Both live in the app root folder

### 2. Verify CLI Flags Work
Test that automated credential passing works:

```bash
create-expo-super-stack \
  --auth supabase \
  --mds-supabase-url="https://project.supabase.co" \
  --mds-supabase-publishable-key="sb_pub_XXX"
```

✅ App generates with `.env.local` populated  
✅ No interactive prompts (flags provide values)  
✅ App is ready to run immediately

### 3. Verify Safety Checks
- ✅ **Never overwrites existing `.env.local`**
  - Generate fresh app, run command twice
  - Second run should skip credential generation
  - Log: "Keeping existing .env.local"
- ✅ **`.env.local` in `.gitignore`**
  - Verify in app's `.gitignore`
- ✅ **Documentation present**
  - Generated `project/auth-supabase.md` explains credential flow

### 4. Test: Single App Generation
- ✅ Run `create-expo-super-stack` with Supabase auth
- ✅ Answer interactive prompts with valid Supabase credentials
- ✅ Verify `.env.local` contains the values you entered
- ✅ Verify `.env.example` is empty template
- ✅ Generate a fresh app interactively → verify `.env.local` has values
- ✅ Generate with existing `.env.local` → verify it's NOT overwritten
- ✅ Verify `.env.example` stays blank/tracked
- ✅ Verify `.env.local` is in `.gitignore`

## Reference Implementation (Already Exists in PR #51)

The code is already implemented on the `feat/monorepo-intake-model` branch. Reference these files:

### Existing Code to Validate
- **`packages/cli/src/commands/onboard.ts`**
  - Lines: Interactive prompts using `supabaseEnvironmentInput()`
  - Flags: `--mds-supabase-url` and `--mds-supabase-publishable-key` already parsed
  - Flow: `collectSupabaseLocalEnvironment()` and `resolveSupabaseLocalEnvironment()` functions

- **`packages/cli/src/project-memory.ts`**
  - Function: `writeFile()` call generates `.env.local` with actual values
  - Safety: Checks for existing `.env.local` before writing
  - `.gitignore`: Adds `.env.local` to project's `.gitignore`

- **`packages/create-expo-super-stack/src/cli.ts`**
  - Flags already defined and passed to onboarding

### Documentation
- **`packages/library-registry/assets/mds/project/auth-supabase.md`**
  - Explains `.env.example` vs `.env.local` pattern
  - ✅ Test: existing `.env.local` is never overwritten
  - ✅ Test: `.env.local` added to `.gitignore`
  - ✅ Test: blank `.env.example` shipped alongside

- **`packages/create-expo-super-stack/tests/cli.test.ts`**
  - ✅ Test: CLI flags pass through correctly

## Validation Checklist

### Before Opening PR:

1. **Verify Tests Pass**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm --filter "@mr.dj2u/cli" test -- onboard.test.ts
   ```

2. **Smoke Test: Interactive Flow**
   ```bash
   cd test-apps
   node ../packages/cli/dist/cli.js create auth-supabase-interactive \
     --auth supabase
   # When prompted, enter real or test Supabase credentials
   ```
   ✅ Verify `.env.local` created with values  
   ✅ Verify `.env.example` empty  
   ✅ Verify `.gitignore` has `.env.local`

3. **Smoke Test: CLI Flags**
   ```bash
   cd test-apps
   node ../packages/cli/dist/cli.js create auth-supabase-flags \
     --auth supabase \
     --mds-supabase-url="https://test.supabase.co" \
     --mds-supabase-publishable-key="sb_pub_test"
   ```
   ✅ Verify `.env.local` created with flag values  
   ✅ No interactive prompts shown

4. **Edge Case: Existing .env.local**
   ```bash
   # Run the same test twice
   node ../packages/cli/dist/cli.js create auth-supabase-twice \
     --auth supabase \
     --mds-supabase-url="https://test.supabase.co" \
     --mds-supabase-publishable-key="sb_pub_test"
   
   # Run again
   node ../packages/cli/dist/cli.js create auth-supabase-twice \
     --auth supabase \
     --mds-supabase-url="https://different.supabase.co" \
     --mds-supabase-publishable-key="sb_pub_different"
   ```
   ✅ Second run keeps original `.env.local` (first set of values)

## Definition of Done

✅ All validation tests pass  
✅ Interactive prompts work correctly  
✅ CLI flags parse and pass values  
✅ `.env.local` generated with actual credentials  
✅ `.env.example` stays empty/template-only  
✅ Existing `.env.local` never overwritten  
✅ `.gitignore` properly configured  
✅ Code compiles and lints without errors  
✅ PR opened and ready for review

## What NOT to Do

- ❌ DO NOT modify the monorepo workspace logic (that's #21)
- ❌ DO NOT add workspace CLI integration (that's #22, #23)
- ❌ DO NOT change Doctor checks (that's #24–#26)
- ✅ **ONLY:** Validate Supabase credentials automation works correctly

## Definition of Done

- [ ] All acceptance criteria met
- [ ] All tests pass (`pnpm ci:repo`)
- [ ] Manual smoke test passes
- [ ] `.env.local` values in place, `.env.example` empty
- [ ] Existing `.env.local` safely preserved
- [ ] `.gitignore` includes `.env.local`
- [ ] PR description links #16 (incomplete from #55) and #21 (monorepo follow-up)
- [ ] Ready to merge independently (does NOT wait for #21)
