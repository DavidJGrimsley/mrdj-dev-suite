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
pnpm doctor -- --ci
pnpm ship:test
```

`pnpm lint` checks code only. Use package-level `pnpm lint:fix` when you intentionally want ESLint to rewrite files.

## Package Layout

- `packages/doctor` - reusable checks and report types.
- `packages/cli` - command-line surface.
- `packages/knowledge` - source catalog for patterns, skills, guides, rules, and references.
- `packages/mcp-server` - MCP tools/resources surface, pending full SDK transport.

## Current Development Priorities

1. Keep the workspace installable and buildable.
2. Split Doctor checks into focused modules and add tests.
3. Move pattern markdown source of truth into `packages/knowledge`.
4. Replace MCP placeholder code with the real MCP SDK server pattern.
5. Implement the ship-to-test workflow behind an explicit execution flag.
6. Implement agent-led post-create onboarding.

## GitHub Workflow Direction

Use `gh` for PR operations. The final ship command should run Doctor first, then push, create/update a PR to `test`, poll checks, summarize failures, and merge only after checks pass.
