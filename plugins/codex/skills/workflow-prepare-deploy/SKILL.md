---
name: "MDS Prepare Deploy"
description: "Use when the user asks Mr. DJ's Dev Suite to run the Prepare Deploy workflow."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Plugin skills and command markdown are guidance only.
- Prefer callable MDS MCP tools exposed by `@mr.dj2u/mcp-server` when this workflow names them.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.
- For ordinary CLI workflows that do allow fallback, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /prepare-deploy

Prepare an Expo project for release using deployment-focused skills plus Doctor parity checks.

## Arguments

- `projectPath`: release candidate project path (default: current directory).
- `includeSeo`: whether to include web metadata/indexing checks (default: `true` when web is targeted).

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Run `doctor_scan_project` in `ci` mode for release parity.
3. Pull `get_skill` for `deployment`; if web is involved also pull `seo-metadata`.
4. Use `knowledge_list_resources` (`kind: "rule"`) to confirm env hygiene, SSR safety, and metadata requirements.
5. Produce a release checklist mapped to current failing checks.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI path:
   - `mds doctor <projectPath> --ci`
   - Run project scripts: `lint`, `type-check`, `test`, and production build/profile scripts.

## Verification And Output

- Re-run `doctor_scan_project` (or CLI equivalent) until blockers are cleared.
- Output: release readiness status, unresolved blockers, and rollback/readiness notes.
