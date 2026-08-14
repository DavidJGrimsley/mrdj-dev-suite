---
name: "Super Stack Startup Skill"
description: "Instructions for running create-expo-super-stack while keeping packages/knowledge as the source of truth and handing off to phase-based app development."
---

# Skill: Super Stack Startup

Use when kicking off a new app with `create-expo-super-stack` and transitioning into phase-based MDS development.

## Main rule

Run generator + onboarding as one guided flow, keep agent-facing wording sourced from `packages/knowledge`, and let the current CLI implementation remain the execution source of truth.

## Checks

- Confirm command runs from a parent directory where the app folder does not already exist.
- Confirm stack choices and MDS intake values are captured before generation.
- Confirm generated app includes project memory and onboarding next-step output.
- Confirm Super Stack ran the package-manager install unless the user
  passed an explicit skip (`--no-install`, `--mds-skip-expo-fix`, or
  `--mds-skip-create`). If install was skipped or failed, surface that
  before handing the app to `mds continue`.
- Confirm prompt and skill text stay thin and defer detailed behavior to the canonical knowledge package.
- Confirm unresolved context markers are resolved before coding begins.
- Confirm follow-up uses `mds continue` from inside the generated app folder.

## Preferred structure

- Keep startup conversation in plain language and summarize choices before execution.
- Keep generation details in scripts/flags, but keep user-facing flow conversational.
- Keep post-generation workflow phase-based using the generated `project/todo.md`, and derive that roadmap from normalized `project/info.md` before handoff.
- Prefer shared knowledge content over duplicating long onboarding prose in plugin or MCP wrappers.

## Example fix

- Problem: User runs generation inside an existing app folder and gets mixed state artifacts.
- Fix: Restart from parent directory, regenerate cleanly, then continue in a new app-folder session.

## Agent behavior

- Prevent ambiguous execution context and confirm folder target before running generation.
- Delegate framework/template primitives to upstream Expo tooling, then apply MDS memory shaping, defaults, and continue-workflow conventions.
- Update `packages/knowledge` first when the wording or flow changes, then regenerate downstream surfaces from it.
