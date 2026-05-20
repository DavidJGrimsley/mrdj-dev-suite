---
name: "MDS Continue Development"
description: "Use when the user asks Mr. DJ's Dev Suite to continue development, pick the next phase task, resume work, or inspect project/todo.md."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Prefer the bundled MCP tools before terminal fallbacks.
- When an MCP tool named in this workflow is available, call that tool directly instead of running app-local npm scripts.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If the MCP server is unavailable, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /continue-development

Resume work on an onboarded project by following MDS phase order from `project/todo.md`.

## Arguments

- `projectPath`: onboarded app path (default: current directory).

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Call `continue_project` first to get the active-phase brief.
3. Pull `get_skill` for `continue-development` to enforce phase-first sequencing.
4. If blockers appear, use `doctor_scan_project` and `doctor_explain_result` for targeted remediation before feature work.

## Codex Routing Guardrails

- Treat `@Mr. DJ's Dev Suite continue development` as a request for the plugin MCP tool and MDS phase rules first.
- Do not jump directly into app edits until `continue_project` or the CLI fallback has identified the active phase and blockers.
- Never invoke `@mrdj/cli`; that package name is wrong. The published CLI package is `@mr.dj2u/cli` and its executable is `mds`.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client codex --scope project`
2. Direct CLI flow:
   - `mds continue <projectPath>`
   - `mds doctor <projectPath>` when blockers are unclear.
3. If `mds` is not on PATH, invoke the published CLI by binary name:
   - `npx -y -p @mr.dj2u/cli@latest mds continue <projectPath>`

## Verification And Output

- Confirm the chosen task belongs to the active phase or has an explicit deferral note.
- Output: selected next task, blockers, and validation commands to run after implementation.
