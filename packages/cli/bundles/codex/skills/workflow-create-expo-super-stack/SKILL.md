---
name: "MDS Create Expo Super Stack"
description: "Use when the user asks Mr. DJ's Dev Suite to run the Create Expo Super Stack workflow."
---

# Codex Workflow Routing

- This is a Mr. DJ's Dev Suite plugin workflow. Plugin skills and command markdown are guidance only.
- Prefer callable MDS MCP tools exposed by `@mr.dj2u/mcp-server` when this workflow names them.
- Do not use stale package names such as `@mrdj/cli`. The CLI package is `@mr.dj2u/cli`; the executable is `mds`.
- If a workflow specifically requires guided MDS MCP tools and they are unavailable, stop and tell the user to refresh or reinstall the MDS plugin/MCP server instead of inventing defaults.
- For ordinary CLI workflows that do allow fallback, prefer `mds <command>` from PATH, then `npx -y -p @mr.dj2u/cli@latest mds <command>`.

# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, using the published CESS CLI as the execution source of truth and callable MDS MCP tools as the guided intake surface.

## Arguments

- `parentDir`: folder where the new app directory should be created.
- `appName`: app folder name.

## Required MDS MCP Tool Flow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Drive intake with `create_expo_super_stack_intake_step`.
3. Ask exactly one question per turn.
4. Always show the returned default and options.
5. Never invent or silently accept defaults on the user's behalf.
6. When the intake tool returns `confirm`, summarize the returned `summaryLines` and ask the user to confirm.
7. After explicit confirmation, set `answers.confirmed=true`, call the intake tool again, and proceed only when it returns `ready`.
8. Then call `create_expo_super_stack_generate` with `confirmed: true`.

## Failure Behavior

1. If the guided intake or generate tools are unavailable, stop.
2. Call `mds_runtime_versions` to diagnose stale plugin or MCP installs.
3. Tell the user to refresh or reinstall the MDS plugin/MCP server.
4. Do not fall back to `--mds-yes` or direct CLI shortcuts unless the user explicitly asked for a fast non-interactive run.

## Verification And Output

- Confirm generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Output: generated app path, onboarding status, and the handoff to open a fresh agent session inside the new app folder and run `mds continue`.
