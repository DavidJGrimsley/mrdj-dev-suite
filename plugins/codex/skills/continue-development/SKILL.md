# Skill: Continue Development

Use when resuming work on an onboarded app and selecting the next task from `project/todo.md`.

## Main rule

Continue phase-by-phase: finish in-progress phase items first, and only defer/move tasks with an explicit note and user confirmation.

## Checks

- Confirm project memory files are present and current before task selection.
- Identify the active phase and incomplete tasks in `project/todo.md`.
- Confirm blockers/context markers are resolved before feature implementation.
- If `continue_project` or `mds continue` reports `priority: expo-sdk-upgrade`, load the official Expo skill `upgrading-expo`. Do not call MDS `get_skill` for an upgrade skill, and do not take the next todo until the user declines or the upgrade is done.
- Confirm any deferral includes a clear reason and destination note.
- Re-run Doctor/checks after significant phase tasks are completed.
- When this MDS workflow itself adds a package, use an MDS-owned tool
  (`mds library add` for catalog items) or immediately run the project's
  package manager, then confirm `node_modules` contains the new package.
  Do not treat the task as complete if install failed. MDS cannot install
  packages added by a third-party agent outside those tools.

## Preferred structure

- Start each session by summarizing current phase state and next recommended task.
- Preserve every existing TODO line. After direct verification, mark only the
  exact completed checkbox and add a nested GitHub PR link when its
  final-base reachability is proven; append new work only with human-approved
  wording.
- Keep roadmap changes aligned with product intent in `project/info.md`.

## Example fix

- Problem: Agent jumps to a later phase feature while current phase has unresolved blockers.
- Fix: Return to active phase tasks, complete or formally defer blockers, then proceed to later phase work.
- Problem: Agent picks the first unchecked todo while the app's declared Expo SDK is a major behind official latest stable.
- Fix: Honor `expo-sdk-upgrade` from `continue_project` / `mds continue` and load official `upgrading-expo` instead of implementing the stale todo.

## Agent behavior

- Optimize for forward progress without losing roadmap integrity.
- Avoid silently reordering roadmap priorities; ask for confirmation before major sequencing changes.
- Treat this as an MDS-only workflow skill: use official Expo or React Native guidance for framework mechanics, then apply MDS phase order, project memory, and Doctor checks.
