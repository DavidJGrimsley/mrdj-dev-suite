# Development Guide

## Setup

```bash
pnpm install
pnpm list -r
```

## Core Scripts

```bash
pnpm dev
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm build:knowledge
pnpm build:plugin
pnpm doctor -- --ci
pnpm ship:test
```

`pnpm build:plugin` is optional; `pnpm build:knowledge` already includes plugin bundle generation.

`pnpm lint` checks code only. Use package-level `pnpm lint:fix` when you intentionally want ESLint to rewrite files.

## Package Layout

- `packages/doctor` - reusable checks and report types.
- `packages/cli` - command-line surface.
- `packages/knowledge` - source catalog for patterns, skills, guides, rules, checklists, examples, and prompt specs.
- `packages/mcp-server` - MCP tools/resources surface backed by canonical knowledge resources.
- `plugins/codex` - generated Codex plugin bundle (manifest, MCP config, commands, and generated skills).

## Plugin Build Workflow

`packages/knowledge` is the single source of truth. Running `pnpm --filter @mrdj/knowledge build` now does all of the following:

1. Validates markdown under `packages/knowledge/src/content`.
2. Copies content into `packages/knowledge/dist/content`.
3. Generates `plugins/codex/**`:
   - `.codex-plugin/plugin.json`
   - `.mcp.json`
   - `skills/<skill-id>/SKILL.md` from canonical knowledge skills
   - `commands/*.md` command prompts
   - plugin `README.md`
4. Generates `plugins/claude-code/commands/**` and command-backed Claude skills from canonical prompt specs.
5. Generates/updates `.agents/plugins/marketplace.json` with local source path `./plugins/codex`.

Strict validation is enforced for generated skills. Missing or empty skill markdown fails the build.

## Plugin Verification

Run the standard checks:

```bash
pnpm --filter @mrdj/knowledge test
pnpm --filter @mrdj/knowledge build
pnpm build
```

Then smoke-check the manual MCP path (kept fully supported and independent from plugin install):

```bash
node packages/cli/dist/cli.js mcp install --client codex --scope project
```

After install, execute one MCP-first command flow (recommended: `run-doctor`) and verify CLI fallback instructions remain accurate.

## Current Development Priorities

1. Keep the workspace installable and buildable.
2. Extend Doctor checks and fixtures as new real app failures appear.
3. Keep pattern markdown source of truth in `packages/knowledge/src/content`.
4. Keep MCP resources generated from `packages/knowledge`.
5. Prove the ship-to-test dry-run before enabling fuller git mutation.
6. Expand agent-led post-create onboarding defaults after dogfooding.

## GitHub Workflow Direction

Use `gh` for PR inspection. The Phase 1 ship command detects branch, remote, git status, and an existing PR, then prints the safe workflow. Full commit/push/merge automation stays manual until the dry-run path has been proven on real repos.
