---
name: "Continue Development Skill"
description: "Instructions for choosing and progressing the next task from project/todo.md."
---

# Skill: Continue Development

Use when resuming work on an onboarded app and selecting the next task from `project/todo.md`.

## Main rule

Continue phase-by-phase: finish in-progress phase items first, and only defer/move tasks with an explicit note and user confirmation.

## Checks

- Confirm project memory files are present and current before task selection.
- Identify the active phase and incomplete tasks in `project/todo.md`.
- Confirm blockers/context markers are resolved before feature implementation.
- Confirm any deferral includes a clear reason and destination note.
- Re-run Doctor/checks after significant phase tasks are completed.

## Preferred structure

- Start each session by summarizing current phase state and next recommended task.
- Keep task updates minimal and explicit in `project/todo.md`.
- Keep roadmap changes aligned with product intent in `project/info.md`.

## Example fix

- Problem: Agent jumps to a later phase feature while current phase has unresolved blockers.
- Fix: Return to active phase tasks, complete or formally defer blockers, then proceed to later phase work.

## Agent behavior

- Optimize for forward progress without losing roadmap integrity.
- Avoid silently reordering roadmap priorities; ask for confirmation before major sequencing changes.
- Treat this as an MDS-only workflow skill: use official Expo or React Native guidance for framework mechanics, then apply MDS phase order, project memory, and Doctor checks.
