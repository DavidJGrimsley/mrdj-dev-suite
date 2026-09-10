# Pre-Phase-0 Task Handoff

Control repository: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\project`
Roadmap reference: `project/todo.md:102`
Branch: `fix/experimemo-link-slot-style`
Base commit: `43c7906a2731de597b4a902183c19404ce1362a7`

## Goal

Fix generated Experimemo Link/Slot style-array crash by flattening child styles and add a generated-app regression test. PR #49 is closed; PR #50 only supplies scanner coverage.

## Boundaries

- Work only in this worktree: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\mrdj-dev-suite-experimemo-link-slot-style`.
- Do not edit the sibling control repository or mark roadmap items complete.
- Preserve existing compatibility, licensing, and unrelated behavior.
- Verify GitHub/CI facts directly; do not treat a worker report as evidence.
- Do not merge, publish, or create external side effects without user approval.

## Validation

Run `mds doctor --fast`, the task-specific tests, `git diff --check`, and
`git status -sb`. Report exact evidence and blockers. Do not claim completion
without a merged PR or reachable commit proving the roadmap task.

Recommended worker: Tier 3 — GPT-5.6-sol, medium reasoning — targeted generator fix plus regression coverage.

Do not merge this branch or its pull request.

