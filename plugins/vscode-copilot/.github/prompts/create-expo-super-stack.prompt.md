---
mode: "agent"
description: "Run the MDS Create Expo Super Stack workflow with callable MDS MCP diagnostics and explicit fallback rules."
---

# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, using the published CESS CLI as the execution source of truth and callable MDS MCP tools as the guided intake surface.

## Arguments

- `parentDir`: folder where the new app directory should be created.
- `appName`: app folder name.

## Required MDS MCP Tool Flow

1. Confirm the `mds` MCP server is available.
2. If the user pasted or attached `info.md` / project memory, call `create_expo_super_stack_extract_info` first.
3. Seed the returned answers into `create_expo_super_stack_intake_step` and use intake only for missing or ambiguous questions.
4. Ask exactly one question per turn.
5. Always show the returned default and options.
6. Never invent or silently accept defaults on the user's behalf.
7. If extraction found the app name, do not ask a second display-name question.
8. When the intake tool returns `confirm`, summarize the returned `summaryLines` and ask the user to confirm.
9. After explicit confirmation, set `answers.confirmed=true`, call the intake tool again, and proceed only when it returns `ready`.
10. Then call `create_expo_super_stack_generate` with `confirmed: true`.

## Failure Behavior

1. If the guided intake or generate tools are unavailable, stop.
2. Call `mds_runtime_versions` to diagnose stale plugin or MCP installs.
3. Tell the user to refresh or reinstall the MDS plugin/MCP server.
4. Do not fall back to `--mds-yes` or direct CLI shortcuts unless the user explicitly asked for a fast non-interactive run.

## Verification And Output

- Confirm generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Confirm `project/todo.md` includes the auto-derived roadmap generated from normalized `project/info.md`.
- Output: generated app path, onboarding status, and the handoff to open a fresh agent session inside the new app folder and run `mds continue`.
