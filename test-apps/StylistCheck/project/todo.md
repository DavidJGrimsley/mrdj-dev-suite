# StylistCheck TODO

## Phase 0: Orientation And Planning

- [ ] Browse exposition pages to understand included base packages.
- [ ] Review styling in the 'Stylist' page.
- [ ] Review `project/` files for accuracy and planning adjustments.
- [ ] Resolve every `# TodoForContext(optional):` marker by filling the section underneath or deleting the marker line to acknowledge no extra context is needed. (There may be none of these if the agent was thorough in onboarding, but if there are any, they should be resolved before development starts.)

- [x] Confirm app purpose, audience, and primary flows in `project/info.md`.
- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.
- [ ] Keep or prune included package examples after reviewing `/exposition`.
- [ ] Remove exposition pages before production once their lessons are absorbed.
- [ ] Replace generic onboarding placeholders with real app decisions before full implementation.

## Phase 1: App Shell And First Flow

- [ ] Build the MVP first for web.
- [ ] Establish app shell, navigation, layouts, and route groups in `src/app`.
- [ ] Use shared layouts unless project memory is updated.
- [ ] Implement the first core flow from project info: Agent should derive the first core user flows from project/info.md during intake..
- [ ] Keep route files thin and move real UI into feature screens.
- [ ] Apply Stylist synced theme tokens to production UI components and screens.

## Phase 2: Data Layer

- [ ] Start with local dummy data with Expo SQLite.
- [ ] Use the local Expo SQLite demo as the first adapter.
- [ ] Replace the local adapter with Supabase when the product needs synced/authenticated data.
- [ ] Verify data requirements against `project/info.md` before adding tables or auth.

## Phase 3: Complete Product Flows

- [ ] Build the remaining core flows from `project/info.md` phase by phase.
- [ ] Add shared state only when state crosses screens or features.
- [ ] Verify each selected platform after the MVP flow works.
- [ ] Verify web behavior.
- [ ] Verify ios behavior.
- [ ] Verify android behavior.
- [ ] Add Expo UI examples where they improve native feel.
- [ ] Prototype Expo Native Tabs for mobile navigation.

## Phase 4: Polish, Safeguards, And Release

- [ ] Prune unused Software Mansion examples and remove unneeded packages.
- [ ] Run `mds doctor --ci` and address errors.
- [ ] Follow `project/release-flow.md` for test-to-main development.
- [ ] Add GitHub branch protection so PR checks pass before merging into `test` or `main`.
- [ ] Confirm Expo web output mode: static.
- [ ] Add monorepo support after the MVP is stable.
