---
name: "Deployment Readiness Skill"
description: "Instructions for local checks before shipping an Expo app."
---

# Skill: Deployment Readiness

Use before merging or releasing an Expo project to shared environments.

## Main rule

Treat deployment as a repeatable checklist: pass local quality gates, verify runtime configuration, and document rollback expectations before ship.

## Checks

- Run lint, type-check, tests, Expo Doctor, and production build/profile checks when scripts exist.
- Verify env vars are documented and separated by client/server exposure level.
- Confirm output mode and hosting assumptions match the selected platform strategy.
- Confirm metadata/indexing basics are defined for web exports.
- Record release and rollback notes for the current change batch.

## Preferred structure

- Keep release checks in scripts that CI and agents can run consistently.
- Gate merge/publish flows on the same Doctor and package validation criteria.
- Keep deployment conventions in `project/guidelines.md` and release tasks in `project/todo.md`.

## Example fix

- Problem: Release pipeline runs tests but skips Expo Doctor and build profile checks.
- Fix: Add missing scripts, wire them into pre-merge checks, and document the required sequence in project memory.

## Agent behavior

- Run project-defined checks first; do not invent alternate release criteria.
- Delegate framework deployment primitives to official Expo guidance, then apply MDS workflow rules for docs, Doctor parity, and rollback readiness.

