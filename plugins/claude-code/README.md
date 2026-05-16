# MrDJ Dev Suite — Claude Code Plugin

Gives Claude Code awareness of your Expo project via MDS Doctor, knowledge skills, and project-specific slash commands.

## What's included

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Project-level instructions to paste/merge into your `CLAUDE.md` |
| `.mcp.json` | Pre-configured MCP server entry for the `mrdj-dev-suite` server |
| `commands/` | Slash command markdown files — copy to `.claude/commands/` in your project |
| `skills/` | Build-generated skill files (sourced from `packages/knowledge`; do not edit) |

## Install

### Step 1 — Connect the MCP server

**User scope** (available in every workspace):

```sh
mrdj mcp install --client claude
```

**Project scope** (one workspace only):

```sh
mrdj mcp install --client claude --scope project --target /path/to/your/expo-app
```

Verify: open Claude Code, run `/mcp`, and confirm `mrdj-dev-suite` is listed.

### Step 2 — Install slash commands

Copy the `commands/` directory into your Expo project's `.claude/commands/` folder:

```sh
# From your Expo project root
cp -r /path/to/mrdj-dev-suite/plugins/claude-code/commands .claude/commands
```

The following slash commands will then be available in Claude Code:

| Command | What it does |
|---------|-------------|
| `/run-doctor` | Run MDS Doctor and get a prioritized issue summary |
| `/review-expo-project` | Full project review: Doctor + architecture + SSR + env skills |
| `/prepare-deploy` | Pre-deploy checklist using the deployment skill |
| `/fix-seo` | SEO and metadata gap analysis and fixes |
| `/create-expo-super-stack` | Guided `create-expo-super-stack` session |
| `/continue-development` | Pick and start the next task from `project/todo.md` |
| `/research-plan` | Turn raw notes or ideas into canonical `project/info.md` |

### Step 3 — Add CLAUDE.md instructions (optional but recommended)

Paste the contents of `CLAUDE.md` (or the relevant sections) into your Expo project's own `CLAUDE.md`. This tells Claude Code about available MCP tools, when to run Doctor, and the dev-server rule.

## Skills

Skills are sourced from `packages/knowledge/src/content/skills/` and generated into `plugins/claude-code/skills/` at build time. They are available in two ways:

1. **Via MCP** — call `get_skill` with the skill ID from any Claude Code session
2. **As files** — browse `skills/` for reference (do not edit; re-run `pnpm build` to regenerate)

Available skill IDs: `expo-router-architecture`, `expo-ssr-safety`, `env-vars`, `uniwind-theming`, `api-routes`, `deployment`, `dev-server-management`, `production-server-patterns`, `seo-metadata`, `debugging`, `project-onboarding`, `super-stack-startup`, `continue-development`, `research-plan-intake`, `plugin-creation`.

## Updating

After pulling the latest `mrdj-dev-suite`:

```sh
pnpm build   # regenerates skills/ and dist/
```

Then re-copy `commands/` to your Expo project if any commands changed.
