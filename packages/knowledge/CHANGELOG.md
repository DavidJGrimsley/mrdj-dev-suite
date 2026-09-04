# @mr.dj2u/knowledge

## 0.1.10

### Patch Changes

- 2a12eed: Generate confirmed multi-app workspaces with isolated minimal or full CESS Expo app profiles, shared config and UI packages, one root Turbo toolchain, and canonical app-local Supabase credentials.

## 0.1.9

### Patch Changes

- 963c374: Route mds continue to the official Expo upgrade skill when project SDK state is behind latest stable.
- b687345: Make Doctor mode selection explicit in reports and help, add redacted hardcoded credential detection, and restrict Expo server-output warnings to real Expo Router API route files.
- 1b74694: Add Doctor router-safety and API-safety checks for Expo Router groups, layouts, navigation, and API auth, validation, method, service-role, rate-limit, CORS, and error-exposure issues.
- 1b74694: Add Doctor runtime security checks for server-only imports on the client, Expo config credential literals, client process.env policy, localhost fetch, and env template hygiene.
- c5d9c99: Document that library add and onboarding install dependencies by default, and that MDS cannot enforce installs for third-party agents.
- 30f115d: Add default-enabled React Doctor integration for generated apps: install `react-doctor`, scaffold `doctor.config.json` + README docs, and expose `mds run react-doctor` with easy env/package.json opt-out and monorepo workspace scanning.
- 4111748: Keep initialized workspace control repositories limited to canonical project memory and `mds.workspace.json`. Retrospective evidence and handoff guidance now live in temporary review packets, while workspace status derives live worktrees from Git instead of a persisted worktree registry.

## 0.1.8

### Patch Changes

- e5c99c0: Add repository metadata and changesets-based release automation for trusted npm publishing.
