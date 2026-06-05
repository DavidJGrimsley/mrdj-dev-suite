---
name: "MDS Project Research Plan"
description: "Use when the user asks Mr. DJ's Dev Suite to run the Project Research Plan workflow."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Plugin skills and command markdown are guidance only.
- Prefer callable MDS MCP tools exposed by `@mr.dj2u/mcp-server` when this workflow names them.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.
- For ordinary CLI workflows that do allow fallback, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /project-research-plan

Turn rough product notes/research into actionable MDS project memory and next-phase plan.

## Arguments

- `projectPath`: target project path (default: current directory).
- `inputs`: attached notes/docs to normalize into canonical memory files.

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Pull `get_skill` for `research-plan-intake` (and `project-onboarding` when onboarding context is mixed in).
3. Call `knowledge_list_resources` for `guide` and `reference` resources as needed for structure and validation.
4. Normalize clear context directly; ask focused follow-up only where ambiguity changes implementation direction.
5. Update project memory files and produce an implementation-ready next-phase plan.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI fallback:
   - Use `mds onboard <projectPath>` for structured intake when memory files are missing.
   - Use `mds continue <projectPath>` after memory normalization to select the next task.

## Verification And Output

- Confirm `project/info.md`, `project/style.md`, and `project/todo.md` align with extracted research context.
- Output: resolved unknowns, outstanding questions, and the recommended next implementation slice.
