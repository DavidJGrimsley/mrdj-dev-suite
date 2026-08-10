# Onboarding And Auth Library Plan

## Purpose

Turn the current MDS Library foundation into a practical source-copy library for app-start flows:

- onboarding flows that can be chosen by experience style;
- authentication flows that can connect to a real Supabase project;
- `create-expo-super-stack` defaults that can generate a complete app shell with onboarding/auth already wired;
- Time2Pay dogfooding before treating the flows as broadly reusable.

The library already supports the metadata model this needs: namespaced item ids, tags, categories, dependencies, composed items, variants, compatibility checks, and safe source-copy restore. This plan should therefore build on the existing registry instead of creating a separate onboarding/auth system.

## Working Decisions

- Treat onboarding and auth as separate library concerns that compose together.
- Build the first onboarding variant now; design the metadata so later variants fit naturally.
- Build legal documents as a reusable content/rendering block before refined onboarding consumes them.
- Build auth as a real Supabase-backed flow, not a placeholder account-setup screen.
- Dogfood onboarding in Time2Pay before broadening the catalog.
- Use a clean Expo app as a regression fixture before touching Time2Pay.
- Teach `create-expo-super-stack` to consume these library items once the registry entries are proven.
- Implement this as three focused branches: legal documents, onboarding, then Supabase auth.

## Reference Repositories

Prefer local paths when available because they let agents inspect exact files quickly and avoid stale GitHub context. Use GitHub links as fallback when the local repo is missing or out of date.

Local references:

- PokePages: `F:\ReactNativeApps\PokePages`
- Time2Pay: `F:\ReactNativeApps\T2P\time2pay`
- Core monorepo / Identinterest / CreatiSphere / Higher reference apps: `F:\ReactNativeApps\core-monorepo`

GitHub fallbacks:

- PokePages: `https://github.com/DavidJGrimsley/PokePages`
- Time2Pay: `https://github.com/DavidJGrimsley/time2pay`

Reference intent:

- Use PokePages for legal documents, agreement modals, onboarding legal acceptance, and content-driven terms/privacy patterns.
- Use Time2Pay for public legal routes, hosted-mode constraints, and onboarding dogfood.
- Use `core-monorepo` for auth, Supabase, shared app-start patterns, and any reusable account/session architecture that should inform the MDS Library.

## Vocabulary

Use tags and categories for discovery:

- `category: onboarding`
- `category: auth`
- `tag: onboarding`
- `tag: auth`
- `tag: legal`
- `tag: terms`
- `tag: privacy`
- `tag: agreements`
- `tag: content-pages`
- `tag: supabase`
- `tag: session`
- `tag: profile`
- `tag: scrollable`
- `tag: swipeable`
- `tag: conversation`
- `tag: multi-screen`
- `tag: with-auth`
- `tag: without-auth`

Use variants for installable shape choices:

- `multi-screen`: normal route-per-step flow.
- `scrollable`: one long scroll screen with sections.
- `swipeable`: paged/card carousel flow.
- `conversation`: chat-style guided onboarding.

Use auth tags for discovery, not for duplicating whole onboarding flows:

- `with-auth`: onboarding composes with an auth item or hands off to auth.
- `without-auth`: onboarding ends in app entry, local profile setup, or a simple "Let's begin" step.

Do not create all variants immediately. Start with one solid baseline, then keep future presentation variants as explicit metadata and roadmap tasks.

## Part 0 — Legal Document Building Block

### Goal

Extract the reusable legal-document pattern before refining onboarding, so onboarding can consume legal docs instead of owning them.

This is based on existing app patterns:

- PokePages uses a document content source, a full document page, a modal agreement viewer, and onboarding acceptance state.
- Time2Pay already has public `/privacy` and `/terms` routes backed by a reusable `PublicLegalDocument` component.

The library should preserve that separation:

- content source;
- reusable renderer;
- public route surface;
- modal/agreement surface;
- optional onboarding acceptance adapter.

### First production-worthy item

Add a new item such as:

```text
mds/legal-documents
```

Likely variants:

```text
public-routes
viewer-only
onboarding-agreement
settings-links
```

Initial scope:

- Typed legal document content shape for terms and privacy policy.
- Placeholder/example content with obvious replacement warnings.
- Full-screen/public document renderer for `/terms` and `/privacy`.
- Modal/agreement viewer that can be opened from onboarding, settings, or app-info screens.
- Acceptance state adapter or tiny hook that onboarding can use without owning document content.
- Theme-aware UI using MDS theme support.
- Expo Router route assets for public terms/privacy routes.

Registry metadata:

- `kind: "flow"` or `kind: "integration"` depending on final asset shape.
- `categories: ["legal", "content", "onboarding"]`
- `tags: ["legal", "terms", "privacy", "agreements", "content-pages"]`
- `composedItems: ["mds/theme-support"]`
- `relatedItems: ["mds/onboarding", "mds/settings"]`

### Rendering surfaces

The same legal content should be viewable in several places:

- public routes, for example `/terms` and `/privacy`;
- settings/app-info links;
- onboarding agreement review;
- future web/privacy URLs.

Do not duplicate legal copy across those surfaces. The renderer should receive a document type or document object and render from the shared content source.

### Developer presentation

Legal docs should be presented as a small set of surfaces, not as a vague component placement question.

Suggested prompt:

```text
Where should users be able to view legal documents?

1. Public routes + reusable viewer
   Adds /terms and /privacy plus the shared legal document renderer.

2. Reusable viewer only
   Adds the legal content source and viewer component, but no routes.

3. Onboarding agreement step
   Adds the reusable viewer and wires it into onboarding.

4. Settings/app-info links
   Adds the reusable viewer and asks where the settings/app-info link should appear.
```

Default recommendation:

- If the developer says "add legal docs" with no extra detail, default to public `/terms` and `/privacy` routes plus the reusable viewer.
- If the developer says "for onboarding," add the onboarding agreement surface.
- If the developer says "settings" or "app info," inspect the app and ask where the link should appear.
- If the target is unclear, copy the reusable source only and report import paths.

Public legal routes are route options, not component placement. Settings links, onboarding agreement modals, and app-info links are placement-sensitive and should be handled conversationally by the agent.

### Onboarding integration

Onboarding should depend on or relate to `mds/legal-documents` when legal acceptance is enabled.

Expected behavior:

- Onboarding can include a legal agreement step.
- The legal step opens the same document viewer used elsewhere.
- Onboarding records "accepted terms" and "accepted privacy" through a small adapter/hook.
- Apps can remove the legal step or swap document content without changing the rest of onboarding.

### Acceptance

- A clean Expo app can install `mds/legal-documents` and view terms/privacy routes.
- The same legal content can render inside an onboarding agreement step.
- The same legal content can be linked from settings/app-info.
- The source content is easy for the developer or agent to replace.
- The library item warns clearly that placeholder legal text is not legal advice and must be reviewed before production.

## Part 1 — Onboarding Library Plan

### Goal

Replace the current `mds/onboarding-preview` with a refined onboarding flow that is useful in real apps and easy to discover through the library.

The current item can remain while the refined flow is developed, but it should be clear in the catalog that `mds/onboarding-preview` is not the final onboarding system and does not implement auth.

If the refined onboarding flow includes legal acceptance, it should compose with `mds/legal-documents` rather than carrying its own separate legal document source.

### First production-worthy item

Add a new item such as:

```text
mds/onboarding
```

Baseline variant:

```text
variant: multi-screen
```

Initial scope:

- Welcome/value proposition screen.
- Optional legal/terms review step powered by `mds/legal-documents`.
- User preference/profile-intake step that does not require auth.
- Completion state that can route to the app, auth, or account setup depending on composition.
- Theme-aware UI using MDS theme support.
- Expo Router route assets for SDK 56.
- No hardcoded app name except through existing token replacement.

Registry metadata:

- `kind: "flow"`
- `categories: ["onboarding", "flows"]`
- `tags: ["onboarding", "multi-screen", "without-auth"]`
- `variants: ["multi-screen"]` initially
- `relatedItems: ["mds/auth-supabase"]` once auth exists
- `composedItems: ["mds/theme-support"]`
- compose with `mds/legal-documents` only when legal acceptance is selected

### Future onboarding variants

Add later as variants or separate items only when their source actually differs:

- `multi-screen`: separate routes/screens. Best default for real apps.
- `scrollable`: one screen with sections. Best for quick apps and low-friction onboarding.
- `swipeable`: horizontal pager/cards. Best for product tours.
- `conversation`: chat-like guided setup. Best for apps where the first interaction should feel assistant-led.

Default recommendation:

- Use `multi-screen` first because it maps cleanly to Expo Router, deep links, back behavior, analytics, and future auth handoff.

### With-auth / without-auth composition

Do not duplicate every onboarding variant just to support auth.

Preferred model:

- `mds/onboarding` owns onboarding UI and progress.
- `mds/auth-supabase` owns session/auth UI.
- A composition item, for example `mds/onboarding-auth-supabase`, wires them together.

Auth should be built as reusable building blocks. The onboarding item should expose a small completion seam, not clone the whole flow for every auth choice.

Example completion model:

```ts
type OnboardingCompletionMode =
  | "enter-app"
  | "auth"
  | "account-setup"
  | "custom";
```

Expected behavior:

- Without auth, the final onboarding step can be one fewer screen or a simple "Let's begin" screen that routes into the app.
- With auth, the same onboarding flow changes its final action to route to sign-in/sign-up or uses the `mds/auth-supabase` building blocks in the final step.
- App-specific behavior should be passed through a clear completion route/callback instead of hardcoded into the shared source.

This lets the library support:

```text
mds/onboarding --variant multi-screen
mds/onboarding --variant scrollable
mds/auth-supabase
mds/onboarding-auth-supabase
```

Avoid creating a matrix like:

```text
multi-screen-with-auth
multi-screen-without-auth
scrollable-with-auth
scrollable-without-auth
swipeable-with-auth
swipeable-without-auth
conversation-with-auth
conversation-without-auth
```

That would duplicate too much source and make future maintenance brittle.

The agent-facing behavior should be:

- If the developer asks for onboarding only, ask whether it should end in the app or hand off to auth.
- If the developer asks for onboarding with auth, compose onboarding plus the auth item.
- If the developer has not decided, install onboarding without auth and leave a clear integration seam.

### Time2Pay dogfood path

Use Time2Pay as the real-world validation target.

Suggested sequence:

1. Create a Time2Pay dogfood branch.
2. Add the baseline `mds/onboarding` item to Time2Pay through the published/local library workflow.
3. Ask where the flow should appear in the app, then wire it into Time2Pay routing.
4. Replace generic copy with Time2Pay-specific product language.
5. Run Time2Pay typecheck/lint/doctor.
6. Capture any adaptations that feel generally useful and move those back into the MDS Library source.
7. Keep Time2Pay-specific copy and business logic in Time2Pay, not in the shared library.

Acceptance:

- Time2Pay can show the onboarding flow in development.
- The flow can be removed, bypassed, or marked complete without corrupting app navigation.
- The shared library item still works in a clean Expo test app after Time2Pay dogfooding.

## Part 2 — Supabase Auth Plan

### Goal

Add a real Supabase-backed auth flow to the MDS Library and make `create-expo-super-stack` capable of generating a usable app with auth from the start.

This should be built after or alongside the baseline onboarding item, but auth needs its own clean boundary. The current `account-setup-screen` placeholder is not auth and should not be treated as auth.

### First production-worthy item

Add a new item such as:

```text
mds/auth-supabase
```

Initial scope:

- Supabase client setup using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Sign-in screen.
- Sign-up screen.
- Password reset/request screen if lightweight enough for v1; otherwise track as follow-up.
- Session provider or hook.
- Route guard / redirect pattern for Expo Router.
- Sign-out helper for settings/profile screen integration.
- Clear environment setup docs.

Registry metadata:

- `kind: "flow"`
- `categories: ["auth", "flows"]`
- `tags: ["auth", "supabase", "session", "sign-in", "sign-up"]`
- `dependencies: ["@supabase/supabase-js", "expo-secure-store" or chosen storage dependency]`
- `compatibility: Expo SDK 56, Expo Router`
- `composedItems: ["mds/theme-support"]`

### CESS integration

Once `mds/auth-supabase` works through the library:

1. Add a CESS option for auth:
   - no auth;
   - Supabase auth.
2. If Supabase auth is selected, CESS should:
   - install the auth library item;
   - add `.env.example` keys;
   - add project docs explaining where to place the real Supabase URL and anon key;
   - wire the root layout/route guard;
   - add a settings/profile sign-out route or hook point.
3. Keep real secrets out of generated files.
4. Never put service-role keys in client code.

### Supabase project dogfood

Use the dedicated Supabase project that exists for this purpose.

Dogfood sequence:

1. Confirm the Supabase project URL and anon key are available locally, not committed.
2. Create a clean Expo app with CESS and the Supabase auth option.
3. Add the auth item through the library path first if CESS is not wired yet.
4. Verify sign-up, sign-in, session persistence, sign-out, and app restart behavior.
5. Verify the same flow works on native and web where supported.
6. Only after the clean app passes, wire the same flow into Time2Pay if Time2Pay needs auth for the onboarding release.

Acceptance:

- A clean CESS app can run with real Supabase auth after the developer supplies env vars.
- The auth flow passes typecheck/lint/doctor.
- The library can add auth without overwriting customized app auth files unless explicitly confirmed.
- The agent can explain exactly what the developer must configure in Supabase.

## Recommended Build Order

Build onboarding first, then auth, but design onboarding with the auth seam from day one.

Reasoning:

- Time2Pay needs onboarding soon.
- Onboarding can be dogfooded without waiting for the auth system.
- Auth is higher-risk because it touches env vars, session persistence, route guards, and real backend behavior.
- A clean onboarding/auth boundary prevents the app-start flow from becoming one giant tangled template.

Suggested order:

1. Extract `mds/legal-documents` from the PokePages/Time2Pay pattern.
2. Test legal documents in a clean Expo app as public routes and modal/agreement surfaces.
3. Refine `mds/onboarding` baseline multi-screen flow.
4. Add registry metadata for future onboarding variants without implementing them yet.
5. Compose onboarding with `mds/legal-documents` only when legal acceptance is selected.
6. Test onboarding in a clean Expo app.
7. Dogfood onboarding in Time2Pay.
8. Build `mds/auth-supabase`.
9. Test auth in a clean Expo app against the dedicated Supabase project.
10. Add `mds/onboarding-auth-supabase` composition.
11. Teach CESS to install/wire onboarding and auth options.
12. Dogfood the combined path in Time2Pay or a hosted-mode sample app.

## Branch Strategy

Use three focused branches:

1. `feature/library-legal-documents`
2. `feature/library-onboarding-flow`
3. `feature/library-supabase-auth`

Each branch should merge independently after its own clean-app test and package checks pass. This keeps the reusable layers honest and avoids a giant branch where legal docs, onboarding, auth, CESS, and Time2Pay dogfooding are all tangled together.

### Branch 1 — Legal Documents

Scope:

- Add `mds/legal-documents`.
- Add public `/terms` and `/privacy` route support as an option/variant.
- Add reusable legal document renderer.
- Add modal/agreement surface.
- Add placeholder/example legal content with strong replacement warnings.
- Add registry tests for list/show/plan/apply/variants.

Testing:

- Clean Expo app:
  - add `mds/legal-documents --variant public-routes`;
  - verify `/terms` and `/privacy`;
  - add modal viewer to a test screen;
  - run typecheck, lint, and Doctor.
- Time2Pay:
  - compare against existing public legal routes;
  - confirm the MDS shape can support Time2Pay's current route/content pattern.
- PokePages:
  - compare against existing modal/onboarding agreement behavior;
  - use it as reference, not an automatic migration target.

### Branch 2 — Onboarding Flow

Scope:

- Add refined `mds/onboarding`.
- Keep `mds/onboarding-preview` for compatibility.
- Add baseline `multi-screen` variant.
- Add completion seam for `enter-app`, `auth`, `account-setup`, and `custom`.
- Compose with `mds/legal-documents` only when legal acceptance is selected.
- Add registry tests for variants/composition and non-overwrite behavior.

Testing:

- Clean Expo app:
  - add onboarding without legal/auth;
  - verify a simple final "Let's begin" path;
  - add onboarding with legal-document composition;
  - verify agreement review and completion behavior;
  - run typecheck, lint, and Doctor.
- Time2Pay:
  - dogfood onboarding copy/routing on a dedicated branch;
  - keep app-specific text and business decisions in Time2Pay.

### Branch 3 — Supabase Auth

Scope:

- Add `mds/auth-supabase`.
- Add Supabase client setup.
- Add sign-in/sign-up screens.
- Add session provider/hook.
- Add route guard/redirect pattern.
- Add env setup docs and `.env.example` support where appropriate.
- Add `mds/onboarding-auth-supabase` composition once both base items are proven.
- Teach CESS to install/wire auth and onboarding options after the library path works.

Testing:

- Clean CESS app:
  - add Supabase auth;
  - supply local env vars;
  - test sign-up, sign-in, session persistence, app restart behavior, and sign-out.
- Combined flow:
  - onboarding to app without auth;
  - onboarding to auth to app with Supabase auth.
- Time2Pay or hosted-mode sample:
  - dogfood only after the clean app passes.

## How To Add A New Library Flow

For onboarding/auth work, the repeatable library-add workflow is:

1. Build or refine source assets under `packages/library-registry/assets/...`.
2. Add or update the item metadata in `packages/library-registry/src/catalog.ts`.
3. Include tags, categories, dependencies, variants, composed items, and compatibility.
4. Add tests that prove:
   - the item appears in `library list`;
   - `library show` returns the expected metadata;
   - `library add --dry-run` plans the right assets/dependencies;
   - apply is idempotent;
   - customized target files are not overwritten;
   - variants resolve correctly.
5. Test against a clean Expo app.
6. Dogfood in the real target app.
7. Move only generally reusable changes back into the registry.
8. Add a changeset before release.

## Open Questions

- Should `mds/legal-documents` be an integration item plus route variants, or a flow item because it includes public routes and modal surfaces?
- Should legal document content live in JSON, TypeScript constants, markdown, or a typed adapter that can support all three later?
- Should onboarding completion state use local storage, app-owned profile state, or a tiny adapter interface?
- Should auth session state use only Supabase's client session or wrap it in an MDS provider?
- Should `with-auth` remain only a composition/discovery tag, or should the CLI eventually expose it as a convenience alias that resolves to composition? Current recommendation: composition first, optional alias later.
- How much legal/terms UI belongs in default onboarding versus a separate `mds/legal-consent` item?
- Should CESS install onboarding by default, or only when the developer chooses app-start flows?

## Immediate Next Task

Start with `mds/legal-documents`, then `mds/onboarding`:

- extract the reusable legal content/rendering pattern from PokePages and Time2Pay;
- add public terms/privacy route support plus modal/agreement rendering;
- keep `mds/onboarding-preview` as-is for compatibility;
- create a refined baseline multi-screen onboarding item;
- give it future-facing variant metadata;
- test it in a clean Expo app;
- then dogfood it in Time2Pay.



# CESS Integration
let's go ahead and add a question in CESS for these legal docs - it doesn't have to be a specific question like where do you want to host them, just enough to know they're going to need the package. or maybe it should set up the /privacy and /terms routes by default? what do you think? But I do want to add it to CESS for sure. go ahead and modify the feature onboar...plan to include adding a question to CESS for each high-level library item that we're making.
