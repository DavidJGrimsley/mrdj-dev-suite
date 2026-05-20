---
description: Prepare an Expo project for release using deployment-focused skills plus Doctor parity checks.
disable-model-invocation: true
---

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
