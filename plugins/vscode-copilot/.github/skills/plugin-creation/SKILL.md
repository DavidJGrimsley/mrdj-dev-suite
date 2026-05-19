---
name: "MDS Plugin Creation Skill"
description: "Instructions for building a new MDS plugin bundle for Claude Code, Codex, Cursor, or any AI agent client."
---

# Skill: MDS Plugin Creation

Use when building or extending an MDS plugin bundle for any agent client (Claude Code, Codex, Cursor, etc.).

## Main rule

Plugins are thin bundles. `packages/knowledge` is the source of truth for skills, command prompts, checklists, and examples. Do not hand-author plugin skill/command copies in plugin folders.

## Structure conventions

Every MDS plugin lives in `plugins/<client-name>/`:

```
plugins/<client-name>/
  README.md
  CLAUDE.md            # Claude-specific merge instructions (if relevant)
  .mcp.json
  commands/            # generated command markdown from canonical prompt specs
  skills/              # generated skill files
```

## Checks

- Skill markdown lives only in `packages/knowledge/src/content/skills/`.
- Prompt/command markdown lives only in `packages/knowledge/src/content/prompts/`.
- `plugins/<client>/skills/` remains generated output and is not manually edited.
- Commands reference real MCP tool names from `packages/mcp-server`.
- MCP config uses the `mr-djs-dev-suite` server key.

## Adding a plugin capability

1. Add or update canonical content in `packages/knowledge/src/content/*`.
2. Update canonical prompt metadata in `packages/knowledge/src/prompts/index.ts`.
3. Regenerate outputs via `pnpm --filter @mr.dj2u/knowledge build`.
4. Verify generated plugin assets under `plugins/codex/` and `plugins/claude-code/`.

## Agent behavior

- Prefer extending canonical knowledge specs over patching generated plugin files.
- Keep command prompts action-oriented and MCP-first with clear fallback paths.
- Delegate framework guidance to Expo-owned skills/docs when available; layer MDS project-memory and workflow guidance on top.
