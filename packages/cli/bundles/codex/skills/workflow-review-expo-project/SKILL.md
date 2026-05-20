---
name: "MDS Review Expo Project"
description: "Use when the user asks Mr. DJ's Dev Suite to run the Review Expo Project workflow."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Prefer the bundled MCP tools before terminal fallbacks.
- When an MCP tool named in this workflow is available, call that tool directly instead of running app-local npm scripts.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If the MCP server is unavailable, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

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
5. If the findings affect release readiness, call `generate_deploy_checklist` so the next steps stay checklist-driven instead of PR-driven.
6. Call `knowledge_list_resources` with `kind: "guide"` if extra reference context is needed.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. If MCP still cannot run, use direct CLI flows:
   - `mds continue <projectPath>`
   - `mds doctor <projectPath> --ci`

## Verification And Output

- Keep the response user-facing: summarize findings and next steps without echoing internal tool chatter or file-read noise.
- Re-run `doctor_scan_project` (or `mds doctor --ci`) after fixes.
- If the user is validating an installed agent bundle, include `mds agent verify --client <client> --target <path>` in the follow-up commands.
- Output: blocker summary, failing checks, recommended next task, and concrete follow-up commands. Avoid proposing a PR unless the user explicitly asks for a GitHub workflow.
