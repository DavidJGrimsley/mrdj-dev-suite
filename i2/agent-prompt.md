# Pre-Phase-0 Task Handoff

Control repository: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\project`
Roadmap reference: `project/todo.md:92`
Branch: `feat/test-branch-ruleset`
Base commit: `43c7906a2731de597b4a902183c19404ce1362a7`

## Goal

Assess and implement a test-branch ruleset preset; repository currently has no test branch, so document/implement only a reusable preset without claiming activation.

## Boundaries

- Work only in this worktree: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\mrdj-dev-suite-test-branch-ruleset`.
- Do not edit the sibling control repository or mark roadmap items complete.
- Preserve existing compatibility, licensing, and unrelated behavior.
- Verify GitHub/CI facts directly; do not treat a worker report as evidence.
- Do not merge, publish, or create external side effects without user approval.

## Validation

Run `mds doctor --fast`, the task-specific tests, `git diff --check`, and
`git status -sb`. Report exact evidence and blockers. Do not claim completion
without a merged PR or reachable commit proving the roadmap task.

Recommended worker: Tier 2 — GPT-5.6-luna, low-medium reasoning — policy/configuration task; current absence of test branch is a blocker to live verification.

Do not merge this branch or its pull request.

