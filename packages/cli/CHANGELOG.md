# @mr.dj2u/cli

## 0.3.0

### Minor Changes

- b6849aa: Add reusable MDS auth library variants and onboarding support.
- 963c374: Route mds continue to the official Expo upgrade skill when project SDK state is behind latest stable.
- b36cefb: Replace the fixed eject keep-list with a project-memory-aware component inventory, generate cleanup tasks for ejected items, surface Phase 0 ejection status, and add a pre-release developer-copy report via `mds report --kind content`.
- 481c198: Add the MDS database adapter contract with Supabase implementation, Firebase skeleton, generated Supabase setup, visible demo usage, and catalog/test coverage.
- 61f95bd: Add the reusable auth guard, upgraded settings surface, and personalized legal document generation for generated apps.
- a2f45a9: Add workspace-first project intake, validated `project/workspace.json` memory, and non-destructive discovery for existing multi-app repositories.
- d125aa6: Add onboarding/legal persistence adapters and an optional Supabase composition, with a safe local default when Supabase is not selected.
- c5d9c99: Install newly declared packages immediately in MDS-owned add flows, validate they landed in node_modules, and keep explicit --no-install and dry-run skips.
- 2b5c6e4: Persist a Phase 0 component strategy in project memory and require an explicit Decision before implementation continues.
- 0607cab: Add the production onboarding library flow, CESS onboarding choices, and the `mds/legal-documents` material legal update gate. Remove the old onboarding preview catalog entry in favor of `mds/onboarding`.
- 30f115d: Add default-enabled React Doctor integration for generated apps: install `react-doctor`, scaffold `doctor.config.json` + README docs, and expose `mds run react-doctor` with easy env/package.json opt-out and monorepo workspace scanning.

### Patch Changes

- b687345: Make Doctor mode selection explicit in reports and help, add redacted hardcoded credential detection, and restrict Expo server-output warnings to real Expo Router API route files.
- 1b74694: Add Doctor router-safety and API-safety checks for Expo Router groups, layouts, navigation, and API auth, validation, method, service-role, rate-limit, CORS, and error-exposure issues.
- 1b74694: Add Doctor runtime security checks for server-only imports on the client, Expo config credential literals, client process.env policy, localhost fetch, and env template hygiene.
- 689b360: Add a local generator validation matrix for testing Doctor and ejection behavior against external real apps without shipping app fixtures in the monorepo.
- 183b60a: Stop generating Uniwind, Tailwind, NativeWind, and NativeWindUI artifacts unless that styling system was selected for the current run.
- 9a3d5fe: Fix the remaining Node 24 `DEP0190` risk by switching shell-based command launches to explicit `spawn` command/argument vectors while preserving the current Expo startup and script execution behavior.
- e2c74f2: Make the generated onboarding completion config rewrite tolerant of LF and CRLF
  line endings while preserving the source file's existing newline style.
- ea3ada6: Add Expo SDK 56 light and dark splash-screen assets and config to generated apps, and keep that system appearance setup through exposition and Stylist ejection.
- 6108b90: Hydrate generated app themes from the system color scheme and replace hard-coded exposition blues with semantic theme tokens.
- 4111748: Keep initialized workspace control repositories limited to canonical project memory and `mds.workspace.json`. Retrospective evidence and handoff guidance now live in temporary review packets, while workspace status derives live worktrees from Git instead of a persisted worktree registry.
- Updated dependencies [b6849aa]
- Updated dependencies [963c374]
- Updated dependencies [b687345]
- Updated dependencies [1b74694]
- Updated dependencies [1b74694]
- Updated dependencies [781098a]
- Updated dependencies [481c198]
- Updated dependencies [61f95bd]
- Updated dependencies [9a3d5fe]
- Updated dependencies [d125aa6]
- Updated dependencies [c5d9c99]
- Updated dependencies [0607cab]
- Updated dependencies [30f115d]
- Updated dependencies [ea3ada6]
- Updated dependencies [6108b90]
- Updated dependencies [4111748]
  - @mr.dj2u/library-registry@0.3.0
  - @mr.dj2u/knowledge@0.1.9
  - @mr.dj2u/doctor@0.1.8

## 0.2.1

### Patch Changes

- Updated dependencies [c1ca453]
  - @mr.dj2u/library-registry@0.2.0

## 0.2.0

### Minor Changes

- ec4e291: Add the MDS Library source registry, safe CLI restoration workflow, and matching MCP tools, and make generated MDS assets consume the shared registry.

### Patch Changes

- Updated dependencies [ec4e291]
  - @mr.dj2u/library-registry@0.1.0

## 0.1.26

### Patch Changes

- e5c99c0: Add repository metadata and changesets-based release automation for trusted npm publishing.
- Updated dependencies [e5c99c0]
  - @mr.dj2u/doctor@0.1.7
  - @mr.dj2u/knowledge@0.1.8
