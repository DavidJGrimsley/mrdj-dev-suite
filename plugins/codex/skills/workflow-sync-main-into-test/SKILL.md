---
name: "MDS Sync Main Into Test"
description: "Use when the user asks Mr. DJ's Dev Suite to create or update the merge-commit PR that synchronizes main back into test after promotion."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Plugin skills and command markdown are guidance only.
- Prefer callable MDS MCP tools exposed by `@mr.dj2u/mcp-server` when this workflow names them.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.
- For ordinary CLI workflows that do allow fallback, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /sync-main-into-test

Create or update the reusable merge-commit pull request that synchronizes `main` back into `test` after a successful promotion.

## Required Flow

1. Resolve the target repository from `projectPath`; never assume the MDS source repository is the target.
2. Verify the promotion PR directly with GitHub. Continue only when it is merged, its head branch is `test`, and its base branch is `main`.
3. Run `mds sync-main-into-test <projectPath> --main <main> --test <test> --execute --json`.
4. Report the structured result and the pull-request URL when one was created or updated.

## Guardrails

- The command creates or updates the PR; it never merges it.
- Use the deterministic `mds/sync-main-into-test` branch so GitHub and MDS triggers cannot create duplicate PRs.
- If `main` or `test` is missing, authentication or permissions are unavailable, or the merge conflicts, stop and report the blocker.
- Keep the developer's current checkout untouched; the command performs merge work in an isolated temporary clone.
- The sync PR must be merged with GitHub's merge-commit strategy, never squash or rebase.
- Do not treat this MDS repository's own branch layout as a prerequisite; the command targets other managed repositories.
