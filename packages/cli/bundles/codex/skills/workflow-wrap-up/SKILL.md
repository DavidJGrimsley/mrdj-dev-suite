---
name: "MDS Wrap Up"
description: "Use when the user has finished testing and wants Mr. DJ's Dev Suite to run the final wrap-up workflow (Doctor, git inclusion checks, PR loop, CI fix retries, and merge policy guardrails)."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Prefer the bundled MCP tools before terminal fallbacks.
- When an MCP tool named in this workflow is available, call that tool directly instead of running app-local npm scripts.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If the MCP server is unavailable, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /wrap-up

Run the post-testing release wrap-up flow: final local checks, git inclusion confirmation, PR loop, and merge handling.

## Goal

When the developer says testing is complete, finish the handoff safely by:

1. Marking completed todo items.
2. Running `mds doctor --ci`.
3. Reviewing `git status` and confirming intentionally excluded files.
4. Running the publish/PR/check loop.
5. Handling merge according to policy defaults and repo overrides.

## Required Flow Order

1. Update `project/todo.md` only for tasks clearly completed in this session.
2. Run `mds doctor --ci` before any git mutation.
3. Review `git status --short` and list changed files.
4. Confirm any intentionally omitted files with the developer before staging.
5. Publish through GitHub flow (branch push + PR).
6. Poll checks and unresolved feedback.
7. Fix failures locally, rerun Doctor, push updates, and poll again.
8. Repeat up to 5 cycles total.

## GitHub Skill Routing

Use GitHub workflows in this order when available:

1. `github` for repo/PR context and routing.
2. `yeet` for commit/push/open-or-update PR flow.
3. `gh-fix-ci` for failed checks/log inspection and CI-driven fix loops.
4. `gh-address-comments` when unresolved review threads are blocking merge.

## Merge Policy

Evaluate policy in this order:

1. Explicit user instruction in the current session.
2. Optional repo config at `project/release-policy.json`.
3. Defaults if config is absent.

Supported repo config shape:

```json
{
  "wrapUp": {
    "autoMergeTest": true,
    "autoMergeMain": false
  }
}
```

Default behavior:

- Auto-merge to `test`: enabled.
- Per-repo override: allowed.
- Auto-merge to `main`: never allowed.

If the workflow targets `main` directly (no `test` branch flow), stop before merge and tell the developer to merge manually.

## Guardrails

- Never auto-merge to `main`.
- Do not skip `mds doctor --ci` between fix cycles.
- Do not assume omitted files are intentional; confirm them.
- If checks or blocking threads still fail after 5 cycles, stop and request human help with a concise blocker summary.
