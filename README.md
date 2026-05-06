# mrdj-dev-suite

Personal AI dev-suite for Expo developers.

The suite turns patterns from real apps into a reusable Doctor, MCP knowledge base, onboarding assistant, and GitHub workflow helper.

## Status

Phase 1 is underway. The workspace is scaffolded, pattern resources are seeded, and the first Doctor/CLI slice is implemented. MCP transport, tests, and full ship/onboard automation are still in progress.

## Packages

- `packages/doctor` - project checks for scripts, env safety, Expo config, route architecture, lint, typecheck, tests, Expo Doctor, and builds.
- `packages/cli` - `mrdj doctor`, `mrdj onboard`, and `mrdj test-and-iterate` entry points.
- `packages/knowledge` - harvested pattern metadata and future source of truth for skills, guides, rules, and templates.
- `packages/mcp-server` - placeholder MCP surface that will be upgraded with the real `mrdj-app-mcp` transport pattern.

## Quick Start

```bash
pnpm install
pnpm build
node packages/cli/dist/cli.js doctor . --scripts=false
```

Useful scripts:

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm doctor -- --ci
pnpm ship:test
```

## Product Workflows

### Doctor

`mrdj doctor` is the production-readiness check. The CI profile is meant to run the same checks you expect before pushing: lint, typecheck, tests, Expo Doctor, and production build scripts when the target repo has them.

```bash
node packages/cli/dist/cli.js doctor /path/to/expo-app --ci
node packages/cli/dist/cli.js doctor /path/to/expo-app --json
```

### Ship To Test

`mrdj test-and-iterate` is planned as the shortcut for:

1. Run `mrdj doctor --ci`.
2. Review git status and commit intentional changes.
3. Push the branch and open/update a PR into `test`.
4. Poll GitHub checks.
5. Fix failures, push again, and keep polling.
6. Merge to `test` after checks pass.

The current command prints the locked workflow. Mutating execution will be added behind an explicit flag after the dry-run path is proven.

### Onboard

`mrdj onboard` should run after `rn-new` or `create-expo-app`, not replace them. It should be agent-led: learn the app goal, audience, data model, styling choice, backend needs, and deployment target, then scaffold only the selected pieces.

Defaults for new MrDJ projects:

- Uniwind, not NativeWind.
- Zustand when shared state is needed.
- Supabase/Drizzle/API routes only when the app actually needs them.
- Always create `project/info.md`, `project/todo.md`, and `project/style.md`.

## Upstream Create-Expo-Stack

The plan is to fork `roninoss/create-expo-stack` and explore a focused upstream PR for Uniwind support. MrDJ-specific depth stays here in `mrdj onboard`: project memory, MCP config, richer boilerplate, and conversational planning.

## Local Rules

- Work inside this repo unless explicitly asked otherwise.
- Use the other repos as read-only pattern sources.
- Keep `temp/` ignored for cloned reference repos and scratch analysis.
- Prefer small verified slices over huge generated claims of completion.
