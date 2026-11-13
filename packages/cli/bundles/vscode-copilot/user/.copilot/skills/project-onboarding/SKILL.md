---
name: "Project Onboarding Skill"
description: "Instructions for onboarding an existing Expo app into MDS project memory and workflow."
---

# Skill: Project Onboarding

Use when onboarding an existing project into the MDS workflow.

## Main rule

Establish project memory and workflow defaults first, then scaffold only the selected technical additions.

Inspect before changing anything. Use multiple framework signals and report ambiguous or mixed results. Exact detection requires more than a stray Contract file. Unknown repositories may receive framework-neutral project memory; absence of an Expo dependency is not an onboarding failure. Read `mds://guides/framework-exact` or `mds://guides/framework-expo-react-native` only for the detected/selected framework.

Present a reviewable plan of missing documentation and integrations, then obtain approval before applying it. Preserve source, working configuration, upstream agent instructions, existing memory, Git metadata and worktrees. Workspace initialization or repository movement is a separate operation; detection never authorizes either.

## Checks

- Confirm onboarding target is the existing app folder (not a parent directory).
- Confirm project memory files exist or are generated: `project/info.md`, `project/todo.md`, `project/style.md`, `project/guidelines.md`.
- Confirm unresolved context markers are cleared before deep implementation work.
- Confirm selected defaults (styling, state, data, CI, route placement) are documented in project memory.
- Use the framework's actual verification capabilities after approved onboarding. Never run Expo Doctor on Exact or unknown projects.
- For Expo scaffolding, confirm `mds onboard` installed newly declared packages, or that
  `--no-install` was explicit and the printed install command is still
  pending. Do not treat onboarding as complete while those modules are
  missing.

## Preferred structure

- Use conversational intake to capture audience, flows, data needs, platform targets, and deployment intent.
- Keep visual guidance in `project/style.md`; keep technical/agent rules in `project/guidelines.md`.
- Keep onboarding outputs phase-based so follow-up work can continue from `project/todo.md`.

## Example fix

- Problem: Team starts coding before onboarding, causing missing docs and conflicting architecture assumptions.
- Fix: Run onboarding flow, generate canonical project memory, reconcile open context markers, then resume implementation using phase order.

## Agent behavior

- Ask one focused onboarding question at a time when required by the flow.
- Delegate framework primitive setup guidance to that framework's pinned official resources, then layer MDS project-memory and workflow automation rules.
- Resolve canonical memory through workspace discovery; propose edits to coordinator-owned control memory instead of creating a competing source-local folder.
