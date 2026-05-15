# mrdj-dev-suite

Personal AI dev-suite for Expo developers.

The suite turns patterns from real apps into a reusable Doctor, MCP knowledge base, onboarding assistant, and GitHub workflow helper.

## Status

Phase 1 is self-contained. The workspace is scaffolded, harvested knowledge lives in `packages/knowledge`, Doctor has modular checks and tests, MCP uses the real SDK stdio transport, and onboard/ship commands have working Phase 1 command modules.

## Packages

- `packages/doctor` - project checks for scripts, env safety, Expo config, route architecture, lint, typecheck, tests, Expo Doctor, and builds.
- `packages/cli` - `mrdj doctor`, `mrdj onboard`, cleanup commands, and `mrdj test-and-iterate` entry points.
- `packages/create-expo-super-stack` - `npx create-expo-super-stack` wrapper around `create-expo-stack` plus MrDJ onboarding.
- `packages/knowledge` - canonical source of truth for harvested patterns, guides, rules, skills, and reference notes.
- `packages/mcp-server` - MCP SDK server exposing Doctor tools, knowledge resources, and onboarding prompts over stdio.

## Quick Start

```bash
pnpm install
pnpm build
node packages/cli/dist/cli.js doctor . --scripts=false
```

Useful scripts:

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm doctor -- --ci
pnpm create-expo-super-stack -- my-app --expo-router
pnpm ship:test
```

## Product Workflows

### Doctor

`mrdj doctor` is the production-readiness check. The CI profile is meant to run the same checks you expect before pushing: lint, typecheck, tests, Expo Doctor, and production build scripts when the target repo has them.

```bash
node packages/cli/dist/cli.js doctor /path/to/expo-app --ci
node packages/cli/dist/cli.js doctor /path/to/expo-app --json
```

### Ship To Test

`mrdj test-and-iterate` is the Phase 1 dry-run shortcut for:

1. Run `mrdj doctor --ci`.
2. Review git status and commit intentional changes.
3. Push the branch and open/update a PR into `test`.
4. Poll GitHub checks.
5. Fix failures, push again, and keep polling.
6. Merge to `test` after checks pass.

Mutating git steps remain manual during the dry-run proving period. `--execute` runs Doctor first and stops if the project is not ready.

### Create Expo Super Stack

`create-expo-super-stack` runs `create-expo-stack` under the hood, prints the delegated command, then applies MrDJ project memory, phase-based onboarding, exposition pages, dev-suite scripts, and Software Mansion core examples. Styling flags are passed through to `create-expo-stack`; Super Stack does not force Uniwind unless you run onboarding directly against an existing app.

```bash
node packages/create-expo-super-stack/dist/cli.js my-app --expo-router
node packages/create-expo-super-stack/dist/cli.js my-app --expo-router --mrdj-guidelines-template
```

### Onboard

`mrdj onboard` runs after `rn-new`, `create-expo-app`, or `create-expo-stack`, not instead of them. It uses friendly Clack prompts to learn the app goal, audience, data model, styling choice, backend needs, release flow, and deployment target, then creates project memory and rich boilerplate by default.

### MDS Continue

`mrdj continue` prints an MDS Continue session brief for an already-onboarded app. It checks unresolved `TodoForContext` markers, `project/todo.md`, git status, package scripts, package manager, and a fast no-scripts Doctor scan, then proposes the next session plan without changing files.

```bash
node packages/cli/dist/cli.js continue /path/to/expo-app
node packages/cli/dist/cli.js continue /path/to/expo-app --json
```

Defaults for new MrDJ projects:

- Uniwind, not NativeWind, when MrDJ is managing styling for an existing app.
- Zustand when shared state is needed.
- Supabase/Drizzle/API routes only when the app actually needs them.
- Always create `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Normalize existing `project/info.md` and `project/style.md` into canonical sections while preserving imported notes.
- Add `project/intake-agent.md` when a follow-up Codex/Claude conversation should clarify thin or messy context.
- Keep `project/style.md` visual-only; put technical rules in `project/guidelines.md`.
- Use `--guidelines-template` to copy the bundled MrDJ `guidelines.md` template, or `--guidelines-template-path <file>` for a custom template.
- Use temporary `/exposition`, `/exposition/style-guide`, and `/exposition/data` pages to review package choices, style direction, and data flow before pruning them for production.

### Agentic Onboarding via MCP

`mrdj mcp install` registers the MrDJ MCP server with Claude Code, Codex, or Cursor so the MrDJ prompts are callable from a chat session.

### Optional Codex Plugin Bundle

The knowledge build also generates a local Codex plugin bundle at `plugins/codex` (manifest, MCP config, generated skills, and command prompts) plus `.agents/plugins/marketplace.json`.

```bash
pnpm --filter @mrdj/knowledge build
pnpm build:plugin
```

Install path options:

- Plugin path (optional): install `mrdj-dev-suite` from the local marketplace entry at `./plugins/codex`.
- CLI path (reliable fallback): run `mrdj mcp install --client codex --scope project` (or user-scope install) and use MCP prompts/tools directly.

Use the CLI path when you need deterministic setup in fresh repos or CI, or when plugin installation is unavailable in your Codex environment.

Two prompts ship with the server:

- `create_expo_super_stack` — invoke from a **parent folder** (e.g. `F:\ReactNativeApps`) when the app folder does not exist yet. The agent confirms a few headline choices, runs `create-expo-super-stack`, then verifies the generated app folder and offers to resolve TodoForContext markers.
- `onboard_new_expo_app` — invoke from **inside an existing Expo app folder** (whether brand new from a generator or a year-old project). Runs the intake → normalize → plan → scaffold flow.

After generation, the user-dev should open the generated app folder directly in a new agent session and run `mrdj continue`. That fresh app-root session reduces token usage and saves money because future searches, reads, and plans are scoped to the app instead of the parent folder and old generator conversation.

Both prompts enforce or surface a `# TodoForContext(optional):` blocker before implementation work. If any markers remain in `project/` files, the agent asks the user to fill them in or delete the marker line. `mrdj doctor` surfaces the same condition as an error.

By default, install is **user-scoped** (every workspace gets the server). Pass `--scope project` to limit to one folder.

```bash
# default: user-scope install (recommended for personal use)
node packages/cli/dist/cli.js mcp install --client claude
node packages/cli/dist/cli.js mcp install --client codex
node packages/cli/dist/cli.js mcp install --client cursor

# preview the merge against your existing config file before writing
node packages/cli/dist/cli.js mcp install --dry-run

# local dev: point the server at the workspace dist build
node packages/cli/dist/cli.js mcp install --server-path "F:\SoftwareDev\mrdj-dev-suite\packages\mcp-server\dist\index.js"

# limit to one project (writes .mcp.json / .cursor/mcp.json / .codex/config.toml into the target dir)
node packages/cli/dist/cli.js mcp install --scope project --target F:\path\to\app
```

User-scope writes to:

- Claude Code: `~/.claude.json`
- Cursor: `~/.cursor/mcp.json`
- Codex: `~/.codex/config.toml`

The merge preserves existing keys/blocks; only the `mrdj-dev-suite` entry is added or replaced.

By default the config invokes the published MCP server via `npx -y @mrdj/mcp-server`. Pass `--server-path` while developing locally to point at `packages/mcp-server/dist/index.js` instead.

### Dev Cleanup

`mrdj kill-port` kills stuck local server ports. `mrdj clear-expo-start` kills Expo/server ports, clears Expo/Metro caches, then starts Expo with `--clear`.

```bash
node packages/cli/dist/cli.js kill-port 8081 3000
node packages/cli/dist/cli.js clear-expo-start /path/to/app --no-start
```

## Reference Repos

The reference repos used for Phase 1 harvest are no longer required in the workspace. `temp/` research clones were removed, and `project/SUPERmrdj-dev-suite.code-workspace` now opens only this suite.

## Local Rules

- Work inside this repo unless explicitly asked otherwise.
- Use `f:\SoftwareDev\create-expo-stack` for upstream-style generator work and `f:\SoftwareDev\dogfood` as the practice app target.
- Keep `temp/` ignored for cloned reference repos and scratch analysis.
- Prefer small verified slices over huge generated claims of completion.
