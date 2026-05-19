# /continue-development

Resume work on an onboarded project by following MDS phase order from `project/todo.md`.

## Arguments

- `projectPath`: onboarded app path (default: current directory).

## MCP-First Workflow

1. Confirm the `mds-dev-suite` MCP server is available.
2. Call `continue_project` first to get the active-phase brief.
3. Pull `get_skill` for `continue-development` to enforce phase-first sequencing.
4. If blockers appear, use `doctor_scan_project` and `doctor_explain_result` for targeted remediation before feature work.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. Direct CLI flow:
   - `mds continue <projectPath>`
   - `mds doctor <projectPath>` when blockers are unclear.

## Verification And Output

- Confirm the chosen task belongs to the active phase or has an explicit deferral note.
- Output: selected next task, blockers, and validation commands to run after implementation.
