# Mr. DJ's Dev Suite (MDS)

Personal AI dev-suite for Expo developers.

The suite turns patterns from real apps into a reusable Doctor, MCP knowledge base, onboarding assistant, and GitHub workflow helper.

## Recommended Usage

### Install

Run `npm install -g @mr.dj2u/cli` once to get the `mds` command globally.

#### VS Code Custom Agent

`mds agent install --client vscode`

#### Codex Plugin

`mds agent install --client codex`

After restarting Codex, type `@Mr. DJ's Dev Suite`, approve the install pop-up, and use the plugin mention in chat.

#### Claude Code Plugin

`mds agent install --client claude`

After restarting Claude Code, run `/mcp` to confirm `mr-djs-dev-suite`, then use the `mds` agent or MDS slash commands.

### Recommended workflow

The suite is designed around short, repeatable workflows. You can use the CLI directly or let the installed agent bundle / prompt layer route you to the right MCP tools, skills, and knowledge.

1. Install MDS for your client:

   ```bash
   npm install -g @mr.dj2u/cli
   mds agent install --client vscode
   mds agent install --client codex
   mds agent install --client claude
   ```

   - VS Code Copilot: `mds agent install --client vscode`
   - Codex: `mds agent install --client codex`
   - Claude Code: `mds agent install --client claude`

2. Create a new app or onboard an existing app:

   - New app: scaffold with `npx create-expo-super-stack`.
   - Existing app: run `mds onboard` from the app root after the app exists, or pass
     `--project /path/to/expo-app` when running it from elsewhere.

   ```bash
   npx create-expo-super-stack my-app --expo-router
   mds onboard --project /path/to/expo-app
   ```

3. Run the routine checks:

   ```bash
   mds doctor /path/to/expo-app --fast
   mds explain "env hygiene"
   mds report /path/to/expo-app --mode ci --output report.md
   ```

   `mds doctor` runs the project health checks; `mds explain` explains a Doctor topic or bundled knowledge item; `mds report` writes a local Markdown or JSON report for easier handoff.

4. Use bundled skills and workflows when you want guidance instead of ad hoc commands:

   ```bash
   mds skills list
   mds skills show continue-development
   ```

   In agent hosts, the bundled workflows are exposed as prompts/skills such as `/wrap-up` and `/push-merge-loop`, but the repo still treats the GitHub loop as a manual/dry-run workflow unless you intentionally opt into the future execution path.

5. Wrap up and push-merge loop:

   ```bash
   mds ship feature/my-change
   mds push-merge-loop feature/my-change
   ```

   The current implementation is intentionally conservative: mutating git steps remain manual, and the `--execute` path is reserved for the future implementation. The repo docs still require `mds doctor --ci` before git work, and the loop is documented as a planning/PR-check workflow rather than an autonomous merge system.

### Use

- Codex: ``@Mr. DJ's Dev Suite <command name>``
- Claude Code: `/<command name>`
- VS Code Copilot: simply mention the tool.

## Technical Overview, CLI Usage, and Product Workflows

This includes the information on what happens when you run the above prompts. You shouldn't need to read this to use the tools, but it's here if you're curious about the inner workings or want to run the CLI commands directly.

### Packages

- `packages/doctor` - project checks for scripts, env safety, Expo config, route architecture, lint, typecheck, tests, Expo Doctor, and builds.
- `packages/cli` - `mds doctor`, `mds onboard`, cleanup commands, and `mds push-merge-loop` (`mds test-and-iterate`) entry points.
- `packages/create-expo-super-stack` - `npx create-expo-super-stack` wrapper around `create-expo-stack` plus MDS onboarding.
- `packages/knowledge` - canonical source of truth for harvested patterns, guides, rules, skills, and reference notes.
- `packages/mcp-server` - MCP SDK server exposing Doctor tools, knowledge resources, and onboarding prompts over stdio.

### Quick Start

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
pnpm push:merge
```

### Product Workflows

#### Doctor

`mds doctor` is the production-readiness check. The CI profile is meant to run the same checks you expect before pushing: lint, typecheck, tests, Expo Doctor, and production build scripts when the target repo has them.

```bash
node packages/cli/dist/cli.js doctor /path/to/expo-app --ci
node packages/cli/dist/cli.js doctor /path/to/expo-app --json
```

#### Ship To Test

`mds push-merge-loop` (alias: `mds test-and-iterate`) is the Phase 1 dry-run shortcut for:

1. Run `mds doctor --ci`.
2. Review git status and commit intentional changes.
3. Push the branch and open/update a PR into `test`.
4. Poll GitHub checks.
5. Fix failures, push again, and keep polling.
6. Merge to `test` after checks pass.

Mutating git steps remain manual during the dry-run proving period. `--execute` runs Doctor first and stops if the project is not ready.

#### Create Expo Super Stack

`create-expo-super-stack` runs `create-expo-stack` under the hood, prints the delegated command, then applies MDS project memory, phase-based onboarding, exposition pages, dev-suite scripts, and Software Mansion core examples. Styling flags are passed through to `create-expo-stack`; Super Stack does not force Uniwind unless you run onboarding directly against an existing app. Until the upstream Uniwind PR lands, the package prefers the temporary scoped fork `@mr.dj2u/create-expo-stack` after local fork overrides and before the official fallback.

```bash
node packages/create-expo-super-stack/dist/cli.js my-app --expo-router
node packages/create-expo-super-stack/dist/cli.js my-app --expo-router --mds-guidelines-template
```

Defaults and non-interactive runs (optional):

- `create-expo-super-stack` accepts `--mds-defaults=<comma-separated defaults>` to control which MDS defaults are scaffolded.
- Interactive runs still ask the onboarding questions; there is no `--mds-save-defaults` / `--mds-no-save-defaults` flag.
- Non-interactive runs (`--mds-yes`) use provided `--mds-*` answers plus built-in onboarding defaults where values are missing.

#### Workspace Initialization

Use `mds workspace init` to move an existing repository and all of its healthy Git worktrees into an I² workspace. Planning is the default; no real workspace is changed until an Infie-run apply command includes both `--apply` and `--yes`.

```bash
# Inspect the migration first
mds workspace init /path/to/app-main

# Apply it. Add --stash only when the plan identifies intentional local changes.
mds workspace init /path/to/app-main --apply --yes --stash

# Generate a new app directly into the workspace-shaped layout.
create-expo-super-stack my-app --mds-workspace --expo-router
```

For GitHub source repositories, the initializer infers and creates `<repo>-project` as the canonical control repository unless `--project-remote` is provided. It commits and pushes `project/`, creates `temp/` and `generated/`, and writes local ignored workspace links into every worktree. See [the initialization guide](packages/cli/WORKSPACE-INITIALIZATION-GUIDE.md) for recovery and Infie usage.

#### Onboard

`mds onboard` runs after `rn-new`, `create-expo-app`, or `create-expo-stack`, not instead of them. It uses friendly Clack prompts to learn the app goal, audience, data model, styling choice, backend needs, release flow, and deployment target, then creates project memory and rich boilerplate by default.

Defaults and non-interactive runs (optional):

- `mds onboard` accepts `--defaults=<comma-separated defaults>` to control which MDS defaults are scaffolded.
- Interactive runs still ask the onboarding questions; there is no `--save-defaults` flag.
- Non-interactive runs (`--yes`) use provided answers plus built-in onboarding defaults where values are missing.

#### MDS Continue

`mds continue` prints an MDS Continue session brief for an already-onboarded app. It checks unresolved `TodoForContext` markers, `project/todo.md`, git status, package scripts, package manager, and a fast no-scripts Doctor scan, then proposes the next session plan without changing files.

```bash
node packages/cli/dist/cli.js continue /path/to/expo-app
node packages/cli/dist/cli.js continue /path/to/expo-app --json
```

#### MDS Library

`mds library` searches the bundled MDS Library and safely copies editable component, screen, flow, and integration source into an Expo project. The catalog remains available after exposition files are ejected; it does not try to guess which items an older project originally contained.

```bash
# Browse or inspect the universal catalog
node packages/cli/dist/cli.js library list --query animation
node packages/cli/dist/cli.js library show swmansion/animated-pressable

# Preview every file and dependency change, then add after confirmation
node packages/cli/dist/cli.js library add swmansion/animated-pressable /path/to/expo-app --dry-run
node packages/cli/dist/cli.js library add swmansion/animated-pressable /path/to/expo-app
```

Library add operations preflight the whole item. Identical files are skipped, while customized files, incompatible dependencies, unsafe destinations, and unsupported project variants stop the operation without overwriting source. By default the add runs the planned package-manager or `expo install` commands immediately and checks that those packages exist in `node_modules`. Use `--no-install` to copy source without declaring or installing dependencies (then run the printed pending commands), or `--json` for agent-friendly output. `mds onboard` also installs newly declared packages unless `--no-install` is passed.

The source-copy destination is only the safe default home for reusable code. When an agent is adding any library item, it should ask where or how the developer wants it used in the app, then import/use or wire it into that screen, route, provider boundary, or setup location after copying. If the developer is not sure, leave the source in the default catalog destination and report the import path as the fallback.

Defaults for new MDS projects:

- Uniwind, not NativeWind, when MDS is managing styling for an existing app.
- Zustand when shared state is needed.
- Supabase/Drizzle/API routes only when the app actually needs them.
- Always create `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Normalize existing `project/info.md` and `project/style.md` into canonical sections while preserving imported notes.
- Add `project/intake-agent.md` when a follow-up Codex/Claude conversation should clarify thin or messy context.
- Keep `project/style.md` visual-only; put technical rules in `project/guidelines.md`.
- Use `--guidelines-template` to copy the bundled MDS `guidelines.md` template, or `--guidelines-template-path <file>` for a custom template.
- Use temporary `/exposition`, `/exposition/style-guide`, and `/exposition/data` pages to review package choices, style direction, and data flow before pruning them for production.

### Agentic Onboarding via MCP

`mds mcp install` registers only the MDS MCP server with Claude Code, Codex, Cursor, or VS Code Copilot so the MDS prompts/tools are callable from a chat session.

Two prompts ship with the server:

- `create_expo_super_stack` - invoke from a **parent folder** (e.g. `F:\ReactNativeApps`) when the app folder does not exist yet. The agent confirms a few headline choices, runs `create-expo-super-stack`, then verifies the generated app folder and offers to resolve TodoForContext markers.
- `onboard_new_expo_app` - invoke from **inside an existing Expo app folder** (whether brand new from a generator or a year-old project). Runs the intake -> normalize -> plan -> scaffold flow.

After generation, the user-dev should open the generated app folder directly in a new agent session and run `mds continue`. That fresh app-root session reduces token usage and saves money because future searches, reads, and plans are scoped to the app instead of the parent folder and old generator conversation.

Both prompts enforce or surface a `# TodoForContext(optional):` blocker before implementation work. If any markers remain in `project/` files, the agent asks the user to fill them in or delete the marker line. `mds doctor` surfaces the same condition as an error.

By default, MCP install is **user-scoped** (every workspace gets the server). Pass `--scope project` to limit to one folder.

```bash
# default: user-scope install (recommended for personal use)
node packages/cli/dist/cli.js mcp install --client claude
node packages/cli/dist/cli.js mcp install --client codex
node packages/cli/dist/cli.js mcp install --client cursor
node packages/cli/dist/cli.js mcp install --client vscode

# preview the merge against your existing config file before writing
node packages/cli/dist/cli.js mcp install --dry-run

# local dev: point the server at the workspace dist build
node packages/cli/dist/cli.js mcp install --server-path "F:\SoftwareDev\mrdj-dev-suite\packages\mcp-server\dist\index.js"

# limit to one project (writes .mcp.json / .cursor/mcp.json / .codex/config.toml / .vscode/mcp.json into the target dir)
node packages/cli/dist/cli.js mcp install --scope project --target F:\path\to\app
```

User-scope MCP writes to:

- Claude Code: `~/.claude.json`
- Cursor: `~/.cursor/mcp.json`
- Codex: `~/.codex/config.toml`
- VS Code Copilot: `code --add-mcp` with server key `mds`

The merge preserves existing keys/blocks; only the `mr-djs-dev-suite` entry is added or replaced. By default the config invokes the published MCP server via `npx -y @mr.dj2u/mcp-server@0.1.6`. Pass `--server-path` while developing locally to point at `packages/mcp-server/dist/index.js` instead.

### Native Agent Bundles

Use `mds agent install` when you want the full native bundle for a client instead of MCP alone:

- VS Code Copilot: MCP plus `.vscode` settings, `.github/copilot-instructions.md`, `.github/agents/mds.agent.md`, `.github/prompts/*.prompt.md`, and generated `.github/skills/*/SKILL.md`.
- Claude Code: MCP plus `CLAUDE.md` instructions, `.claude/agents/mds.md`, `.claude/commands/*.md`, and generated `.claude/skills/*/SKILL.md`.
- Codex: MCP plus a local `mr-djs-dev-suite` plugin copied into `plugins/mr-djs-dev-suite`, registered in `.agents/plugins/marketplace.json`, and enabled as `mr-djs-dev-suite@mds-local` in Codex config. Restart Codex, type `@Mr. DJ's Dev Suite`, and hit Install when Codex shows the local plugin approval pop-up.

Project-scoped install and verify:

```bash
node packages/cli/dist/cli.js agent install --client vscode --scope project --target F:\path\to\app
node packages/cli/dist/cli.js agent install --client claude --scope project --target F:\path\to\app
node packages/cli/dist/cli.js agent install --client codex --scope project --target F:\path\to\app

node packages/cli/dist/cli.js agent verify --client vscode --target F:\path\to\app
node packages/cli/dist/cli.js agent verify --client claude --target F:\path\to\app
node packages/cli/dist/cli.js agent verify --client codex --scope project --target F:\path\to\app
```

User-scoped installs:

```bash
node packages/cli/dist/cli.js agent install --client vscode --scope user
node packages/cli/dist/cli.js agent install --client claude --scope user
node packages/cli/dist/cli.js agent install --client codex --scope user

node packages/cli/dist/cli.js agent verify --client vscode --scope user
node packages/cli/dist/cli.js agent verify --client claude --scope user
node packages/cli/dist/cli.js agent verify --client codex --scope user

node packages/cli/dist/cli.js agent install --client vscode --scope user --dry-run
node packages/cli/dist/cli.js agent install --client claude --scope user --dry-run
node packages/cli/dist/cli.js agent install --client codex --scope user --dry-run
```

Project-scope verification checks the client files, runs a fast no-script Doctor scan, fetches a bundled knowledge guide, and executes the MDS Continue workflow. User-scope verification checks the global client assets only. Use `mds mcp install --client <client>` when you only want the MCP server, and `mds agent install --client <client>` when you want MCP plus the native instructions/agent/skills/plugin layer.

### Dev Cleanup

`mds free-port` kills stuck local server ports. `mds clear-expo-start` kills Expo/server ports, clears Expo/Metro caches, then starts Expo with `--clear`.

```bash
node packages/cli/dist/cli.js free-port 8081 3000
node packages/cli/dist/cli.js clear-expo-start /path/to/app --no-start
```

## Reference Repos

The reference repos used for Phase 1 harvest are no longer required in the workspace. `temp/` research clones were removed, and the suite workspace file now opens only this repo.

## Local Rules

- Work inside this repo unless explicitly asked otherwise.
- Use `f:\SoftwareDev\create-expo-stack` for upstream-style generator work and `f:\SoftwareDev\dogfood` as the practice app target.
- Keep `temp/` ignored for cloned reference repos and scratch analysis.
- Prefer small verified slices over huge generated claims of completion.
