---
name: "Uniwind Theming Skill"
description: "Instructions for Tailwind v4 and Uniwind setup."
---

# Skill: Uniwind Theming

Use when setting up or maintaining Tailwind v4 + Uniwind styling in Expo projects.

## Main rule

Prefer Uniwind with Tailwind v4 defaults, keep theme tokens centralized, and ensure bundler/style wiring is consistent across environments.

## Checks

- Confirm Tailwind v4 and Uniwind dependencies/config are aligned with project SDK.
- Confirm `global.css` import order loads Tailwind before Uniwind layers.
- Confirm Metro/bundler integration uses `withUniwindConfig` (or project-equivalent wiring).
- Confirm design tokens are centralized and reused instead of ad-hoc values.
- Confirm platform-specific style behavior is intentional and documented.

## Preferred structure

- Keep token definitions in one source module/file.
- Keep style-system setup in project bootstrap/config files, not scattered across screens.
- Keep shared class patterns in reusable UI components.

## Example fix

- Problem: Global styles load in the wrong order, causing token classes to fail on web.
- Fix: Reorder style imports, verify Metro integration, and move duplicate token literals into shared theme config.

## Agent behavior

- Preserve existing design intent while fixing setup drift.
- Delegate framework styling primitives to official Expo/Uniwind docs, then apply MDS conventions for token consistency and onboarding readiness.

