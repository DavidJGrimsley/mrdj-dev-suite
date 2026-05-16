---
name: "MDS Plugin Creation Skill"
description: "Instructions for building a new MDS plugin bundle for Claude Code, Codex, Cursor, or any AI agent client."
---

# Skill: MDS Plugin Creation

Use when building or extending a MrDJ Dev Suite plugin bundle for any AI agent client (Claude Code, Codex, Cursor, etc.).

## Main rule

Plugins are thin bundles. `packages/knowledge` is the single source of truth for all skill content — never write skill markdown directly inside a plugin directory. Skills are copied into a plugin at build time by the `generate:plugins` script.

## Structure conventions

Every MDS plugin lives in `plugins/<client-name>/` and follows this layout:

```
plugins/<client-name>/
  README.md          ← install guide for end users
  CLAUDE.md          ← CLAUDE.md content to merge into the target project (Claude Code only)
  .mcp.json          ← pre-configured MCP server entry (template)
  commands/          ← slash command / prompt markdown files
    run-doctor.md
    review-expo-project.md
    ...
  skills/            ← BUILD-GENERATED — do not edit by hand, add to .gitignore
    expo-router-architecture.md
    ...
```

### Claude Code specifics

- Commands land in `.claude/commands/` when installed in the user's project; each `.md` file becomes `/command-name` in Claude Code.
- The `CLAUDE.md` file is meant to be pasted/merged into the target project's own `CLAUDE.md`, not used standalone.
- `.mcp.json` uses `"mrdj-dev-suite"` as the server key to stay consistent with `mrdj mcp install`.

### Codex specifics

- Commands go in `.codex-plugin/commands/` and are registered in `.codex-plugin/plugin.json`.
- MCP config is written as a TOML block in `.codex/config.toml`.

## Checks

- Confirm no skill markdown is duplicated inside the plugin — it must live only in `packages/knowledge/src/content/skills/`.
- Confirm `plugins/<client>/skills/` is listed in `.gitignore`.
- Confirm the `generate:plugins` script is wired into the `packages/knowledge` build so skills stay in sync.
- Confirm every slash command references only MCP tool names that exist in `packages/mcp-server/src/tools/index.ts`.
- Confirm `.mcp.json` uses server key `"mrdj-dev-suite"`.

## Adding a new plugin

1. Create `plugins/<client-name>/` with the layout above.
2. Author slash commands in `commands/` — reference MCP tools; delegate framework guidance to Expo-owned skills.
3. Add the new output path to `packages/knowledge/scripts/generate-plugin-skills.ts`.
4. Add `plugins/<client-name>/skills/` to `.gitignore`.
5. Run `pnpm build` from the repo root to populate `skills/` and verify no errors.
6. Write a README with install steps specific to that client.

## Agent behavior

- After adding or editing any skill in `packages/knowledge/src/content/skills/`, run `pnpm --filter @mrdj/knowledge generate:plugins` (or `pnpm build`) to re-sync all plugin skill directories.
- When writing slash command content, keep it short and action-oriented — one clear goal per command, referencing MCP tools by exact name.
- Do not create a new skill in `packages/knowledge` for content that is already covered by an Expo-owned skill; delegate instead.
