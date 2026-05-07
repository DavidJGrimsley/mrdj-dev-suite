# mrdj-dev-suite

Personal AI dev-suite for Expo developers.

The suite turns patterns from real apps into a reusable Doctor, MCP knowledge base, onboarding assistant, and GitHub workflow helper.

## Status

Phase 1 is self-contained. The workspace is scaffolded, harvested knowledge lives in `packages/knowledge`, Doctor has modular checks and tests, MCP uses the real SDK stdio transport, and onboard/ship commands have working Phase 1 command modules.

## Packages

- `packages/doctor` - project checks for scripts, env safety, Expo config, route architecture, lint, typecheck, tests, Expo Doctor, and builds.
- `packages/cli` - `mrdj doctor`, `mrdj onboard`, and `mrdj test-and-iterate` entry points.
- `packages/knowledge` - canonical source of truth for harvested patterns, guides, rules, skills, and reference notes.
- `packages/mcp-server` - MCP SDK server exposing Doctor tools, knowledge resources, and onboarding prompts over stdio.

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

`mrdj test-and-iterate` is the Phase 1 dry-run shortcut for:

1. Run `mrdj doctor --ci`.
2. Review git status and commit intentional changes.
3. Push the branch and open/update a PR into `test`.
4. Poll GitHub checks.
5. Fix failures, push again, and keep polling.
6. Merge to `test` after checks pass.

Mutating git steps remain manual during the dry-run proving period. `--execute` runs Doctor first and stops if the project is not ready.

### Onboard

`mrdj onboard` runs after `rn-new` or `create-expo-app`, not instead of them. It learns the app goal, audience, data model, styling choice, backend needs, and deployment target, then creates the project memory files.

Defaults for new MrDJ projects:

- Uniwind, not NativeWind.
- Zustand when shared state is needed.
- Supabase/Drizzle/API routes only when the app actually needs them.
- Always create `project/info.md`, `project/todo.md`, and `project/style.md`.

## Reference Repos

The reference repos used for Phase 1 harvest are no longer required in the workspace. `temp/` research clones were removed, and `project/SUPERmrdj-dev-suite.code-workspace` now opens only this suite.

## Local Rules

- Work inside this repo unless explicitly asked otherwise.
- Use the other repos as read-only pattern sources.
- Keep `temp/` ignored for cloned reference repos and scratch analysis.
- Prefer small verified slices over huge generated claims of completion.
