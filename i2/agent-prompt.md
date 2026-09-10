# Pre-Phase-0 Task Handoff

Control repository: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\project`
Roadmap reference: `project/todo.md:96`
Branch: `feat/release-ci-eas`
Base commit: `43c7906a2731de597b4a902183c19404ce1362a7`

## Goal

Design and implement release CI for test-to-TestFlight and main-to-EAS production, gated on available credentials; never expose or invent credentials.

## Boundaries

- Work only in this worktree: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\mrdj-dev-suite-release-ci-eas`.
- Do not edit the sibling control repository or mark roadmap items complete.
- Preserve existing compatibility, licensing, and unrelated behavior.
- Verify GitHub/CI facts directly; do not treat a worker report as evidence.
- Do not merge, publish, or create external side effects without user approval.

## Validation

Run `mds doctor --fast`, the task-specific tests, `git diff --check`, and
`git status -sb`. Report exact evidence and blockers. Do not claim completion
without a merged PR or reachable commit proving the roadmap task.

Recommended worker: Tier 4 — GPT-5.6-sol, high reasoning — release pipeline and credential-boundary work.

Do not merge this branch or its pull request.

