# MDS - Claude Code Plugin

Gives Claude Code awareness of your Expo project via MDS Doctor, canonical knowledge skills, and generated slash commands.

## What's included

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Project-level instructions to paste/merge into your `CLAUDE.md` |
| `.mcp.json` | Pre-configured MCP server entry for the `mrdj-dev-suite` server |
| `commands/` | Slash command markdown files; copy to `.claude/commands/` in your project |
| `skills/` | Build-generated skill files (sourced from `packages/knowledge`; do not edit) |

## Install

### Step 1 - Connect the MCP server

User scope:

```sh
mrdj mcp install --client claude
```

Project scope:

```sh
mrdj mcp install --client claude --scope project --target /path/to/your/expo-app
```

Verify with `/mcp` in Claude Code and confirm `mrdj-dev-suite` is listed.

### Step 2 - Install slash commands

Copy `commands/` into your Expo project's `.claude/commands/` folder:

```sh
cp -r /path/to/mrdj-dev-suite/plugins/claude-code/commands .claude/commands
```

### Step 3 - Add CLAUDE.md instructions (recommended)

Merge the contents of `CLAUDE.md` into your project's own `CLAUDE.md`.

## Updating

After pulling the latest `mrdj-dev-suite`:

```sh
pnpm build
```

Then re-copy `commands/` into your project if command files changed.
