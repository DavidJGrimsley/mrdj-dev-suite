# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, then hand off to phase-based continuation.

## Arguments

- `parentDir`: folder where the new app directory should be created.
- `appName`: app folder name.

## MCP-First Workflow

1. Confirm the `mrdj-dev-suite` MCP server is available.
2. Invoke the MCP prompt `create_expo_super_stack` from a parent directory.
3. Follow the prompt intake flow and keep one question per turn until generation completes.
4. After generation, move into the new app folder and invoke `continue_project` (or prompt `continue_mrdj_project`) for the first implementation session.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mrdj mcp install --client codex --scope project`
2. Direct CLI generation:
   - `npx -y create-expo-super-stack <appName>`
3. Then onboard/continue from inside the generated app:
   - `mrdj continue <new-app-path>`

## Verification And Output

- Confirm generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Output: generated app path, onboarding status, and immediate next command.
