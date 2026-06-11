# Mr. DJ's Dev Suite Codex Plugin

The Mr. DJ's Dev Suite Codex plugin bundle is generated from `packages/knowledge` and ships the Codex-native MDS surface: plugin manifest, MCP server config, generated skills, and command prompts.

## What's Included

- Codex plugin manifest: `.codex-plugin/plugin.json`
- MCP server config: `.mcp.json`
- Generated skills: `skills/<skill-id>/SKILL.md`
- Command prompt files: `commands/*.md`

The source of truth for skills remains `packages/knowledge/src/content/skills`.
Runtime behavior comes from callable MDS MCP tools exposed by `@mr.dj2u/mcp-server`.

## One-Command Install

Project scope installs MCP plus the local marketplace/plugin enable blocks into `.codex/config.toml`, copies this plugin into `plugins/mr-djs-dev-suite`, and registers it in `.agents/plugins/marketplace.json`:

```sh
mds agent install --client codex --scope project --target /path/to/your/expo-app
mds agent verify --client codex --scope project --target /path/to/your/expo-app
```

User scope installs MCP plus the local marketplace/plugin enable blocks into `~/.codex/config.toml`, copies the plugin into `~/plugins/mr-djs-dev-suite`, and registers it in `~/.agents/plugins/marketplace.json`:

```sh
mds agent install --client codex --scope user
mds agent verify --client codex --scope user
mds agent install --client codex --scope user --dry-run
```

After install, restart Codex so it picks up the local marketplace. Then type `@Mr. DJ's Dev Suite` in chat to get the install pop-up, hit Install, and use `@Mr. DJ's Dev Suite` in Codex Desktop or the Codex extension for VS Code.

If Codex keeps using stale behavior after reinstall, do a full cleanup and reinstall:

1. Remove the installed local plugin copy for the scope you used:
   - project scope: `<target>/plugins/mr-djs-dev-suite`
   - user scope: `~/plugins/mr-djs-dev-suite`
2. Remove the local Codex cache copy:
   - `~/.codex/plugins/cache/mds-local/mr-djs-dev-suite`
3. Reinstall:
   - `mds agent install --client codex --scope project --target /path/to/your/expo-app`
   - or `mds agent install --client codex --scope user`
4. Run verify again:
   - `mds agent verify --client codex --scope project --target /path/to/your/expo-app`
   - or `mds agent verify --client codex --scope user`
5. Restart Codex, then run `mds_runtime_versions` from the host surface to confirm which runtime is active.

## MCP-Only Fallback

Use this when you only want the callable MDS MCP tools/prompts and not the plugin/skills bundle:

```sh
mds mcp install --client codex --scope project --target /path/to/your/expo-app
mds mcp install --client codex --scope user
```

## Regenerate

```sh
pnpm --filter @mr.dj2u/knowledge build
```

Do not edit generated plugin skills directly; update `packages/knowledge` and rebuild.
