---
name: "Project Onboarding Skill"
description: "Instructions for onboarding an existing Expo app into MDS project memory and workflow."
---

# Skill: Project Onboarding

Use when onboarding an existing Expo app into the MDS workflow after project creation.

## Main rule

Establish project memory and workflow defaults first, then scaffold only the selected technical additions.

## Checks

- Confirm onboarding target is the existing app folder (not a parent directory).
- Confirm project memory files exist or are generated: `project/info.md`, `project/todo.md`, `project/style.md`, `project/guidelines.md`.
- Confirm unresolved context markers are cleared before deep implementation work.
- Confirm selected defaults (styling, state, data, CI, route placement) are documented in project memory.
- Run Doctor after onboarding changes to validate baseline health.

## Preferred structure

- Use conversational intake to capture audience, flows, data needs, platform targets, and deployment intent.
- Keep visual guidance in `project/style.md`; keep technical/agent rules in `project/guidelines.md`.
- Keep onboarding outputs phase-based so follow-up work can continue from `project/todo.md`.

## Example fix

- Problem: Team starts coding before onboarding, causing missing docs and conflicting architecture assumptions.
- Fix: Run onboarding flow, generate canonical project memory, reconcile open context markers, then resume implementation using phase order.

## Agent behavior

- Ask one focused onboarding question at a time when required by the flow.
- Delegate framework primitive setup guidance to official Expo resources, then layer MDS project-memory and workflow automation rules.
