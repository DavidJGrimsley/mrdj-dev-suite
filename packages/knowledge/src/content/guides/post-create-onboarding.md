# Post-Create Expo Onboarding

MDS onboarding runs after `rn-new`, `create-expo-app`, `create-expo-stack`, or
another generator has created an Expo project. `create-expo-super-stack` wraps
that same idea by running `create-expo-stack` first and then applying the MDS
onboarding pass.

## Flow

1. Detect package manager, Expo SDK, Expo Router, app directory, aliases, and
   styling stack.
2. Explain project memory first, then ask what the app is for, who it serves,
   primary flows, data needs, and release/deployment intent.
3. Use friendly Clack prompts with visible defaults, helpful explanations, and
   no blank required answers.
4. Derive defaults from selected answers instead of asking for comma-separated
   internal keywords.
5. Offer rich boilerplate by default: project memory docs, exposition pages,
   Uniwind repair for existing apps, Software Mansion core examples, Supabase or
   local data guidance, MCP/Codex/Claude instructions, and CI/release safeguards.
6. Scaffold only selected pieces.
7. Add generated cleanup scripts such as `clear-expo-start` and `free-port`.
8. Install added dependencies, run `expo install --fix`, install known missing
   Expo peers such as `expo-font` for `@expo/vector-icons`, then run Doctor.

## Agentic Onboarding (MCP)

The terminal `mds onboard` command writes the project memory files. The
agentic version is a conversation with Claude Code, Codex, or Cursor that
fills those files in collaboratively.

Install **once, globally** (user scope, default) so every workspace gets
the prompts:

```bash
mds mcp install --client claude   # merges into ~/.claude.json
mds mcp install --client codex    # merges into ~/.codex/config.toml
mds mcp install --client cursor   # merges into ~/.cursor/mcp.json
mds mcp install --dry-run         # preview merge before writing
```

Restart the host (or run `claude mcp reload`) and the MDS prompts are
available from any workspace.

Two prompts ship with the server:

- `create_expo_super_stack` — invoke from a **parent folder** (e.g.
  `F:\ReactNativeApps`) when the app folder does not exist yet. The
  agent confirms platforms, styling, data start, etc., then runs
  `create-expo-super-stack`, verifies the generated app folder, and
  offers to resolve TodoForContext markers.
- `onboard_new_expo_app` — invoke from **inside an existing Expo app
  folder** (a freshly generated one or a year-old project). Runs the
  intake → normalize → plan → scaffold flow.

After generation, the user-dev should open the generated app folder
directly in a new agent session and run `mds continue`. That fresh
app-root session reduces token usage and saves money because future
searches, reads, and plans are scoped to the app instead of the parent
folder and old generator conversation.

Both prompts enforce or surface a **TodoForContext blocker** before
implementation work: they scan every `project/` file for the literal
marker `# TodoForContext(optional):` and ask the user to fill it in or
delete the marker line.

`mds doctor` mirrors this rule with a `todo-for-context markers`
error so the same blocker stops CI and editor surfaces until the user
fills the section or deletes the marker line.

### What's new in the agentic prompts

- **PHASE 0 file intake.** The agent offers to digest an existing
  `project/info.md` and `project/style.md` if the user has them already.
  Questions whose answers are unambiguous in the file are skipped; the
  agent asks for clarification only when the file is silent or unclear.
  A reference template URL is mentioned in the prompt; the agent can
  also inline the template on request.
- **Android TV alongside Apple TV.** The platform multi-select now
  includes Android TV. Android TV builds from the same Android target
  with leanback config in `app.json`; Apple TV is a separate tvOS build
  target via `react-native-tvos`. Selecting either records the intent
  in project memory.
- **Embedded flag map.** Both prompts now include the exact
  create-expo-stack and `--mds-*` flag map so the agent does not have
  to grep `node_modules` or scan source to translate answers into a
  command. This was the biggest source of slowness in early test runs.
- **Credits while waiting.** When generation kicks off, the agent
  prints a recognition note for the upstream teams and individuals
  whose work fills the MDS knowledge base.
- **Success message surfaced.** After a successful run, the agent
  quotes the generator's `MDS onboarding complete` tail block back
  verbatim so the Mr. DJ personal thank-you text appears in chat the same way
  it does in a terminal CLI run.
- **MDS Continue handoff.** The agent runs `mds continue` from the
  generated app folder, then tells the user-dev to open that app folder
  in a fresh agent session to lower token usage and cost.

## Defaults

- Prefer Uniwind and Tailwind v4 for new projects.
- Keep route files thin and move business logic into features, services, hooks,
  and utilities.
- Always add `project/info.md`, `project/todo.md`, `project/style.md`, and
  `project/guidelines.md` when project memory is selected.
- Normalize existing `project/info.md` and `project/style.md` into canonical
  sections while preserving unknown content under Imported Notes.
- Add `project/intake-agent.md` when context is thin or imported notes need a
  follow-up agent conversation.
- Keep `project/style.md` visual-only; put technical and agent rules in
  `project/guidelines.md`.
- Treat monorepo-aware scaffolding as a future step after the single-app MVP is
  stable.
