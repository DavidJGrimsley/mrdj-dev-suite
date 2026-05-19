# Mr. DJ's Dev Suite Codex Plugin

The Mr. DJ's Dev Suite Codex plugin bundle is generated from `packages/knowledge` and ships the Codex-native MDS surface: plugin manifest, MCP server config, generated skills, and command prompts.

## What's Included

- Codex plugin manifest: `.codex-plugin/plugin.json`
- MCP server config: `.mcp.json`
- Generated skills: `skills/<skill-id>/SKILL.md`
- Command prompt files: `commands/*.md`

The source of truth for skills remains `packages/knowledge/src/content/skills`.

## One-Command Install

Project scope installs MCP into `.codex/config.toml`, copies this plugin into `plugins/mr-djs-dev-suite`, and registers it in `.agents/plugins/marketplace.json`:

```sh
mds agent install --client codex --scope project --target /path/to/your/expo-app
mds agent verify --client codex --target /path/to/your/expo-app
```

User scope installs MCP into `~/.codex/config.toml`, copies the plugin into `~/plugins/mr-djs-dev-suite`, and registers it in `~/.agents/plugins/marketplace.json`:

```sh
mds agent install --client codex --scope user
mds agent install --client codex --scope user --dry-run
```

After install, restart Codex if needed and enable/install `mr-djs-dev-suite` from the local marketplace.

## MCP-Only Fallback

Use this when you only want predictable MCP tools/prompts and not the plugin/skills bundle:

```sh
mds mcp install --client codex --scope project --target /path/to/your/expo-app
mds mcp install --client codex --scope user
```

## Regenerate

```sh
pnpm --filter @mr.dj2u/knowledge build
```

Do not edit generated plugin skills directly; update `packages/knowledge` and rebuild.
