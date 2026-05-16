# MDS Codex Plugin

The MrDJ Dev Suite Codex plugin bundle is generated from `packages/knowledge` and ships the Codex-native MDS surface: plugin manifest, MCP server config, generated skills, and command prompts.

## What's Included

- Codex plugin manifest: `.codex-plugin/plugin.json`
- MCP server config: `.mcp.json`
- Generated skills: `skills/<skill-id>/SKILL.md`
- Command prompt files: `commands/*.md`

The source of truth for skills remains `packages/knowledge/src/content/skills`.
Command prompt markdown is sourced from `packages/knowledge/src/content/prompts` via canonical prompt specs.

## One-Command Install

Project scope installs MCP into `.codex/config.toml`, copies this plugin into `plugins/mrdj-dev-suite`, and registers it in `.agents/plugins/marketplace.json`:

```sh
mrdj agent install --client codex --scope project --target /path/to/your/expo-app
mrdj agent verify --client codex --target /path/to/your/expo-app
```

User scope installs MCP into `~/.codex/config.toml`, copies the plugin into `~/plugins/mrdj-dev-suite`, and registers it in `~/.agents/plugins/marketplace.json`:

```sh
mrdj agent install --client codex --scope user
mrdj agent install --client codex --scope user --dry-run
```

After install, restart Codex if needed and enable/install `mrdj-dev-suite` from the local marketplace.

## MCP-Only Fallback

Use this when you only want predictable MCP tools/prompts and not the plugin/skills bundle:

```sh
mrdj mcp install --client codex --scope project --target /path/to/your/expo-app
mrdj mcp install --client codex --scope user
```

## Regenerate

```sh
pnpm --filter @mrdj/knowledge build
```

Do not edit generated plugin skills directly; update `packages/knowledge` and rebuild.
