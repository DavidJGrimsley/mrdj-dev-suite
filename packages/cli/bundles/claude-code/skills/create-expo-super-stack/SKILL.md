---
description: Create a new Expo app with the MDS Super Stack flow, using this knowledge package as the shared source of truth for agent-facing text and the published CLI as the execution source of truth.
disable-model-invocation: true
---

# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, using this knowledge package as the shared source of truth for agent-facing text and the published CLI as the execution source of truth.

## Arguments

- `parentDir`: folder where the new app directory should be created.
- `appName`: app folder name.

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Invoke the MCP prompt `create_expo_super_stack` from a parent directory when you want guided intake.
3. Keep the conversation one question per turn and summarize the captured choices before generation.
4. Treat the MCP prompt as the intake surface and the CLI as the generator, so CLI changes are picked up automatically when the published command changes.
5. After generation, move into the new app folder and invoke `continue_project` (or prompt `continue_mds_project`) for the first implementation session.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. Direct CLI generation:
   - `npx -y create-expo-super-stack <appName>`
3. Then onboard/continue from inside the generated app using the current CLI behavior:
   - `mds continue <new-app-path>`

## Verification And Output

- Confirm generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Output: generated app path, onboarding status, and immediate next command.
