# MDS Codex Plugin

The MrDJ Dev Suite plugin bundle is generated from `packages/knowledge` and ships:

- Codex plugin manifest: `.codex-plugin/plugin.json`
- MCP server config: `.mcp.json`
- Generated skills: `skills/<skill-id>/SKILL.md`
- Command prompt files in `commands/`

The source of truth for skills remains `packages/knowledge/src/content/skills`.
Command prompt markdown is sourced from `packages/knowledge/src/content/prompts` via canonical prompt specs.

## Install In Codex (Plugin Path)

1. Build knowledge outputs (this also regenerates the plugin bundle):
   - `pnpm --filter @mrdj/knowledge build`
2. Ensure the local marketplace includes this plugin:
   - `.agents/plugins/marketplace.json` -> `./plugins/codex`
3. Install the plugin from the local marketplace in Codex.

## Install MCP Via CLI (Reliable Fallback)

Use manual MCP install when you want predictable behavior across clients or CI:

- `mrdj mcp install --client codex --scope project`
- `mrdj mcp install --client codex` (user scope)

This path does not depend on plugin installation and remains fully supported.

## When To Prefer CLI Fallback

- You need a fast/project-scoped setup in a fresh repo.
- Plugin discovery or install is unavailable in your Codex environment.
- You need deterministic local or CI setup without UI/plugin prerequisites.
