---
name: "MDS Run Doctor"
description: "Run the MDS Run Doctor workflow in VS Code Copilot user scope."
---

# /run-doctor

Run MDS Doctor as the primary health check for an Expo project.

## Arguments

- `projectPath`: project root path (default: current directory).
- `mode`: `fast`, `ci`, or `full` (default: `ci`).
- `runScripts`: whether Doctor should execute project scripts (default: `true` for `ci` mode).

## MCP-First Workflow

1. Confirm the `mds` MCP server is available.
2. Call `doctor_scan_project` with selected arguments.
3. For each non-pass result, call `doctor_explain_result`.
4. If the check is release-related or web-facing, call `generate_deploy_checklist` before giving next steps.
5. Pull targeted implementation guidance with `get_skill` (typically `deployment`, `debugging`, or `dev-server-management`).

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. Direct CLI alternatives:
   - `mds doctor <projectPath>`
   - `mds doctor <projectPath> --ci`
   - `mds doctor <projectPath> --json`

## Verification And Output

- Re-run Doctor after each fix batch.
- Keep the response concise and user-facing; do not surface internal tool chatter or intermediate file reads.
- Output: check summary, blocking errors first, and the exact command used for re-check.
