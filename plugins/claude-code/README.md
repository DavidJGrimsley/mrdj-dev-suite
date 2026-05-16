# MrDJ Dev Suite - Claude Code Plugin

Gives Claude Code native MDS behavior for Expo projects: MCP tools, a custom `mds` agent, slash commands, generated skills, and project instructions.

## What's Included

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Instructions merged into project `CLAUDE.md` or user `~/.claude/CLAUDE.md` |
| `.mcp.json` | Pre-configured MCP server example for `mrdj-dev-suite` |
| `agents/mds.md` | Claude Code custom agent for MDS workflows |
| `commands/*.md` | Slash command markdown files copied to `.claude/commands/` |
| `skills/*/SKILL.md` | Build-generated skills sourced from `packages/knowledge` |

## One-Command Install

Project scope installs MCP, instructions, the custom agent, slash commands, and generated skills into one Expo app:

```sh
mrdj agent install --client claude --scope project --target /path/to/your/expo-app
mrdj agent verify --client claude --target /path/to/your/expo-app
```

User scope installs MCP plus reusable assets into `~/.claude`:

```sh
mrdj agent install --client claude --scope user
mrdj agent install --client claude --scope user --dry-run
```

After install, restart Claude Code or reopen the workspace, run `/mcp`, and confirm `mrdj-dev-suite` is listed. Then use the `mds` agent or slash commands such as `/run-doctor`, `/review-expo-project`, and `/prepare-deploy`.

## MCP-Only Fallback

Use this when you only want MCP tools/prompts and not the local agent/commands/skills files:

```sh
mrdj mcp install --client claude --scope project --target /path/to/your/expo-app
mrdj mcp install --client claude --scope user
```

## Generated Assets

Skills are sourced from `packages/knowledge/src/content/skills/` and generated into `plugins/claude-code/skills/` at build time. Slash commands are copied from `commands-src/` into `commands/` during the same build.

```sh
pnpm --filter @mrdj/knowledge build
```

Do not edit generated `commands/` or `skills/` files directly; update the knowledge source or command source and rebuild.

