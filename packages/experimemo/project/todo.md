# Experimemo TODO

## Phase 0: Orientation And Planning

- [ ] Confirm the Phase 0 component strategy in `project/info.md` (style library, Expo UI / Universal Components / NativeTabs, and any listed conflicts). Set Decision to confirmed after you review the generated app.
- [ ] Review the ejection inventory with `mds eject` and confirm retain/eject decisions for generated starter and template components. Set Decision to confirmed after you finish.
- [ ] Browse exposition pages to understand included base packages.
- [ ] Review styling in the 'Stylist' page.
- [ ] Review `project/` files for accuracy and planning adjustments.
- [ ] Run or defer `eject-stylist`; mark this todo done after ejection or deciding to defer (if you want to keep the stylist around for tinkering).
- [ ] Run `mds eject` and keep only the generated sections you want to retain.
- [ ] Resolve every `# TodoForContext(optional):` marker in `project/info.md` by filling the section underneath or deleting the marker line to acknowledge no extra context is needed.
- [ ] Confirm visual direction in `project/style.md` after using the Stylist page.
- [ ] After the `project/info.md` markers are resolved, refresh the agent-derived roadmap from `project/info.md` and review it for accuracy.
- [ ] Keep or prune included package examples after reviewing `/exposition`.
- [ ] Remove exposition pages before production once their lessons are absorbed.

## Phase 1: App Shell And First Flow

- [ ] Establish the app shell and first implementation-ready route in `src/app`.
- [ ] Implement the first concrete product flow from `project/info.md` and the roadmap.

## Phase 2: Data Layer

- [ ] Implement the initial data layer using local dummy data with Expo SQLite.

## Phase 3: Complete Product Flows

- [ ] Build the remaining core flows from `project/info.md` phase by phase.
- [ ] Adapt the working MVP flow for the remaining target platforms after the primary flow is stable.

## Phase 4: Polish, Safeguards, And Release

- [ ] Run `mds report --kind content` and replace remaining placeholder or example copy before release.
- [ ] Run `mds doctor --ci` and address errors.
- [ ] Follow `project/release-flow.md` for test-to-main development.
- [ ] Complete the one-time GitHub repo setup from `project/release-flow.md` so `test` and `main` are protected correctly.
- [ ] Add GitHub branch protection so PR checks pass before merging into `test` or `main`.
- [ ] Confirm Expo web output mode: static.
