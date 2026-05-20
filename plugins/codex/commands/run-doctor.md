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
4. If the check is release-related or web-facing, call `generate_deploy_checklist` before giving next steps.
5. Pull targeted implementation guidance with `get_skill` (typically `deployment`, `debugging`, or `dev-server-management`).

## MDS Routing Guardrails

- Treat a request to run MDS Doctor as a request for the MDS MCP tool, not as a request to run app-local npm scripts.
- Do not run `npm run mds:doctor`, `npm run doctor`, or other project package scripts as the MDS Doctor path unless the user explicitly asks for app scripts.
- Never invoke `@mrdj/cli`; that package name is wrong. The published CLI package is `@mr.dj2u/cli` and its executable is `mds`.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI alternatives:
   - `mds doctor <projectPath>`
   - `mds doctor <projectPath> --ci`
   - `mds doctor <projectPath> --json`
3. If `mds` is not on PATH, invoke the published CLI by binary name:
   - `npx -y -p @mr.dj2u/cli@latest mds doctor <projectPath> --ci`

## Verification And Output

- Re-run Doctor after each fix batch.
- Keep the response concise and user-facing; do not surface internal tool chatter or intermediate file reads.
- Output: check summary, blocking errors first, and the exact command used for re-check.
