# Mr. DJ's Dev Suite - Claude Code Plugin

Gives Claude Code native MDS behavior for Expo projects: MCP tools, a custom `mds` agent, slash commands, generated skills, and install-time project instructions.

## What's Included

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Claude plugin identity and display metadata |
| `.mcp.json` | Plugin MCP server config for `mr-djs-dev-suite` |
| `settings.json` | Enables the plugin's `mds` agent by default when installed as a Claude plugin |
| `agents/mds.md` | Claude Code custom agent for MDS workflows |
| `commands/*.md` | Flat command files; plugin install exposes namespaced commands |
| `skills/*/SKILL.md` | Build-generated skills sourced from `packages/knowledge` |
| `CLAUDE.md` | Instructions merged only by `mds agent install --client claude` |

Claude Code plugin installs do not load a plugin-root `CLAUDE.md` as context. The packaged plugin behavior lives in `agents/`, `skills/`, `commands/`, `.mcp.json`, and `settings.json`; the CLI installer also merges `CLAUDE.md` into the target project or user profile for standalone `.claude` installs.

## Recommended Install

Project scope installs MCP, instructions, the custom agent, short slash commands, and generated skills into one Expo app:

```sh
mds agent install --client claude --scope project --target /path/to/your/expo-app
mds agent verify --client claude --scope project --target /path/to/your/expo-app
```

User scope installs MCP plus reusable assets into `~/.claude`:

```sh
mds agent install --client claude --scope user
mds agent verify --client claude --scope user
```

After install, restart Claude Code or run `/reload-plugins`, then run `/mcp` and confirm `mr-djs-dev-suite` is listed. Use the `mds` agent or short commands such as `/run-doctor`, `/continue-development`, `/review-expo-project`, and `/prepare-deploy`.

## True Claude Plugin Test

When loaded with Claude's plugin system, command names are namespaced by plugin name:

```sh
claude --plugin-dir ./plugins/claude-code
```

Then test:

```text
/mr-djs-dev-suite:run-doctor
/mr-djs-dev-suite:continue-development
/mr-djs-dev-suite:prepare-deploy
```

## MCP-Only Fallback

Use this when you only want MCP tools/prompts and not the local agent/commands/skills files:

```sh
mds mcp install --client claude --scope project --target /path/to/your/expo-app
mds mcp install --client claude --scope user
```

## Generated Assets

Skills are sourced from `packages/knowledge/src/content/skills/`. Slash commands and command skills are generated from the canonical prompt specs in `packages/knowledge/src/content/prompts/` plus `buildCommandFiles()` in `packages/knowledge/scripts/generate-codex-plugin.mjs`.

```sh
pnpm --filter @mr.dj2u/knowledge build
```

Do not edit generated `commands/` or `skills/` files directly; update the knowledge source or command generator and rebuild.

