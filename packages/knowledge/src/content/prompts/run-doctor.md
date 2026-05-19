# /run-doctor

Run MDS Doctor as the primary health check for an Expo project.

## Arguments

- `projectPath`: project root path (default: current directory).
- `mode`: `fast`, `ci`, or `full` (default: `ci`).
- `runScripts`: whether Doctor should execute project scripts (default: `true` for `ci` mode).

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Call `doctor_scan_project` with selected arguments.
3. For each non-pass result, call `doctor_explain_result`.
4. Pull targeted implementation guidance with `get_skill` (typically `deployment`, `debugging`, or `dev-server-management`).

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. Direct CLI alternatives:
   - `mds doctor <projectPath>`
   - `mds doctor <projectPath> --ci`
   - `mds doctor <projectPath> --json`

## Verification And Output

- Re-run Doctor after each fix batch.
- Output: check summary, blocking errors first, and the exact command used for re-check.
