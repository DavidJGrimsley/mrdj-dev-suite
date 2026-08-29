---
description: Use when structuring, reviewing, or refactoring Expo Router route code.
---

# Skill: Expo Router Architecture

Use when structuring, reviewing, or refactoring Expo Router route code.

## Main rule

Keep route files thin: routing and composition belong in `app/`, while business/data logic lives in feature, service, and shared modules.

## Checks

- Confirm route files avoid direct DB calls, heavy business logic, and large side-effect chains.
- Confirm shared UI blocks are extracted to component modules.
- Confirm cross-route state is managed in stores/hooks instead of duplicated route-local logic.
- Confirm route grouping/layout usage is intentional and not overloaded at root.
- Confirm file size/complexity trends support long-term maintainability.
- Doctor flags confusing groups, missing layouts, string-assembled hrefs, and mixed route concerns via the `router safety` check (`mds explain "router safety"`).

## Preferred structure

- Keep `app/` files focused on params, navigation, and screen composition.
- Place business workflows in `src/features`.
- Place side effects/integrations in `src/services` or `src/data`.
- Keep reusable UI in `src/components` and cross-cutting helpers in hooks/utilities.

## Example fix

- Problem: A route file performs data fetching, mutation, and form business rules inline.
- Fix: Move fetch/mutation logic to service modules, move workflow rules to a feature module, and keep the route as a thin screen wrapper.

## Agent behavior

- Prefer small, incremental extractions over broad rewrites.
- Delegate framework routing primitives to official Expo Router guidance, then apply MDS rules for maintainable app-folder boundaries and Doctor-compatible architecture.

