# Infie Coordinator Foundation — Session Handoff

## Task mapping

Control repository: `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\project`
Roadmap: `project/todo.md:646-647`
- Reuse the existing Infie coordinator branch after the workspace prerequisite.
- Implement Infie as the coordinator, attention manager, session router, and PR/worktree orchestrator in Guided mode.

The workspace-lifecycle prerequisite is merged on `main` through PRs #69 and
#71. The existing branch had zero commits unique from merged `main` and was
fast-forwarded to base commit `43c7906a2731de597b4a902183c19404ce1362a7`.

## Scope and boundaries

- Work only in this worktree:
  `F:\\SoftwareDev\\mrdj-dev-suite-i2Workspace\\mrdj-dev-suite-feat-infie-coordinator-agent`.
- Build the smallest usable Infie coordination foundation and its tests/docs.
- Preserve Git as authoritative for branches, worktrees, commits, and PRs.
- Keep approval gates explicit; do not perform merges, publishing, sharing, or
  other external side effects without user approval.
- Do not edit the sibling control repository or its `project/todo.md`.
- Do not change licensing or unrelated runtime/package behavior.
- Do not merge this branch or its pull request.

## Required evidence

Document the design decisions, files changed, tests, and remaining blockers.
Run from this worktree:

    mds doctor --fast
    git diff --check
    git status -sb

If dependencies are unavailable, report that as a validation blocker rather
than claiming success.

Recommended worker: Tier 4 — GPT-6-astra, high reasoning — this is a
cross-cutting coordinator contract and session-orchestration foundation.

