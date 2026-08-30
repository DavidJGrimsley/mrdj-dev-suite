# create-expo-super-stack

## 0.2.0

### Minor Changes

- b6849aa: Add reusable MDS auth library variants and onboarding support.
- 0607cab: Add the production onboarding library flow, CESS onboarding choices, and the `mds/legal-documents` material legal update gate. Remove the old onboarding preview catalog entry in favor of `mds/onboarding`.

### Patch Changes

- 183b60a: Stop generating Uniwind, Tailwind, NativeWind, and NativeWindUI artifacts unless that styling system was selected for the current run.
- c5d9c99: Install newly declared packages immediately in MDS-owned add flows, validate they landed in node_modules, and keep explicit --no-install and dry-run skips.
- 2b5c6e4: Persist a Phase 0 component strategy in project memory and require an explicit Decision before implementation continues.
- 30f115d: Add default-enabled React Doctor integration for generated apps: install `react-doctor`, scaffold `doctor.config.json` + README docs, and expose `mds run react-doctor` with easy env/package.json opt-out and monorepo workspace scanning.
- ea3ada6: Add Expo SDK 56 light and dark splash-screen assets and config to generated apps, and keep that system appearance setup through exposition and Stylist ejection.
- Updated dependencies [b6849aa]
- Updated dependencies [963c374]
- Updated dependencies [b687345]
- Updated dependencies [1b74694]
- Updated dependencies [1b74694]
- Updated dependencies [b36cefb]
- Updated dependencies [689b360]
- Updated dependencies [481c198]
- Updated dependencies [61f95bd]
- Updated dependencies [a2f45a9]
- Updated dependencies [183b60a]
- Updated dependencies [9a3d5fe]
- Updated dependencies [d125aa6]
- Updated dependencies [c5d9c99]
- Updated dependencies [2b5c6e4]
- Updated dependencies [0607cab]
- Updated dependencies [30f115d]
- Updated dependencies [e2c74f2]
- Updated dependencies [ea3ada6]
- Updated dependencies [6108b90]
- Updated dependencies [4111748]
  - @mr.dj2u/cli@0.3.0

## 0.1.20

### Patch Changes

- ec4e291: Add the MDS Library source registry, safe CLI restoration workflow, and matching MCP tools, and make generated MDS assets consume the shared registry.
- Updated dependencies [ec4e291]
  - @mr.dj2u/cli@0.2.0

## 0.1.19

### Patch Changes

- e5c99c0: Add repository metadata and changesets-based release automation for trusted npm publishing.
- Updated dependencies [e5c99c0]
  - @mr.dj2u/cli@0.1.26
