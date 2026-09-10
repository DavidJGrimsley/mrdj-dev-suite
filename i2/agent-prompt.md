# Pre-Phase-0 Task Handoff

Control repository: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\project`
Roadmap reference: `project/todo.md:119`
Branch: `test/experimemo-mvp-fixture`
Base commit: `43c7906a2731de597b4a902183c19404ce1362a7`

## Goal

Use completed Experimemo MVP changes as a generated-app regression fixture covering production copy, Expo UI/NativeTabs, icon, dark mode, and store metadata through initialization/ejection.

## Boundaries

- Work only in this worktree: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\mrdj-dev-suite-experimemo-mvp-fixture`.
- Do not edit the sibling control repository or mark roadmap items complete.
- Preserve existing compatibility, licensing, and unrelated behavior.
- Verify GitHub/CI facts directly; do not treat a worker report as evidence.
- Do not merge, publish, or create external side effects without user approval.

## Validation

Run `mds doctor --fast`, the task-specific tests, `git diff --check`, and
`git status -sb`. Report exact evidence and blockers. Do not claim completion
without a merged PR or reachable commit proving the roadmap task.

Recommended worker: Tier 3 — GPT-5.6-sol, medium reasoning — cross-feature fixture and generator regression work.

Do not merge this branch or its pull request.

