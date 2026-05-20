---
name: "MDS Prepare Deploy"
description: "Use when the user asks Mr. DJ's Dev Suite to run the Prepare Deploy workflow."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Prefer the bundled MCP tools before terminal fallbacks.
- When an MCP tool named in this workflow is available, call that tool directly instead of running app-local npm scripts.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If the MCP server is unavailable, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

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
5. Call `generate_deploy_checklist` so SEO, scripts, and release-readiness gaps are reflected in the next steps.
6. Produce a release checklist mapped to current failing checks.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI path:
   - `mds doctor <projectPath> --ci`
   - Run project scripts: `lint`, `type-check`, `test`, and production build/profile scripts.

## Verification And Output

- Re-run `doctor_scan_project` (or CLI equivalent) until blockers are cleared.
- Keep the response user-facing and checklist-driven; avoid internal tool chatter and avoid asking for a PR unless the user requested GitHub workflow.
- Output: release readiness status, unresolved blockers, and rollback/readiness notes.
