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
2. Extend Doctor checks and fixtures as new real app failures appear.
3. Keep pattern markdown source of truth in `packages/knowledge/src/content`.
4. Keep MCP resources generated from `packages/knowledge`.
5. Prove the ship-to-test dry-run before enabling fuller git mutation.
6. Expand agent-led post-create onboarding defaults after dogfooding.

## GitHub Workflow Direction

Use `gh` for PR inspection. The Phase 1 ship command detects branch, remote, git status, and an existing PR, then prints the safe workflow. Full commit/push/merge automation stays manual until the dry-run path has been proven on real repos.
