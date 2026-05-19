# /review-expo-project

Review an Expo project with MCP-first diagnostics and skill-guided remediation.

## Arguments

- `projectPath`: absolute or relative project path (default: current directory).
- `mode`: Doctor mode (`fast`, `ci`, or `full`; default: `ci`).

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Call `continue_project` to summarize current project state and blockers.
3. Call `doctor_scan_project` with `projectPath` and `mode`.
4. For each warning/error, call `doctor_explain_result`, then pull targeted guidance with `get_skill` (for example: `project-onboarding`, `debugging`, `deployment`).
5. Call `knowledge_list_resources` with `kind: "guide"` if extra reference context is needed.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. If MCP still cannot run, use direct CLI flows:
   - `mds continue <projectPath>`
   - `mds doctor <projectPath> --ci`

## Verification And Output

- Re-run `doctor_scan_project` (or `mds doctor --ci`) after fixes.
- Output: blocker summary, failing checks, recommended next task, and concrete follow-up commands.
