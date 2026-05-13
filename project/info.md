# mrdj-dev-suite Project Info

## Mission

Build a personal AI dev-suite for Expo developers that can understand project goals, inspect production Expo apps, run production-readiness checks, expose reusable knowledge through MCP, and automate the boring GitHub loops that happen before code reaches `test`.

This starts as a personal suite. Public branding can come later after the workflows prove themselves.

## Product Shape

The suite has five layers:

1. **Knowledge layer:** patterns, guides, rules, examples, skills, and project standards harvested from real apps.
2. **Diagnostic layer:** MrDJ Doctor scans projects for broken scripts, env mistakes, Expo config issues, SSR risks, route architecture issues, lint, typecheck, tests, Expo Doctor, and builds.
3. **Action layer:** CLI commands and MCP tools that run checks, scaffold files, clean dev-server state, create apps, and coordinate git/GitHub workflows.
4. **Agent layer:** Codex/Claude prompts and future plugins that guide project onboarding and review.
5. **Hosting layer:** optional future DWAH-style deployment helpers if the product direction proves useful.

## Core Decisions

- **Work only in this repo:** referenced app repos are read-only sources for pattern harvesting unless a task explicitly says otherwise.
- **Uniwind over NativeWind:** new MrDJ templates and onboarding defaults should use Uniwind with Tailwind v4.
- **Post-create onboarding first:** do not rebuild `rn-new` / `create-expo-stack` first. Run after a project exists and use an agent conversation to understand the app.
- **Project memory is required:** onboarded projects should have `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- **Style is visual-only:** technical rules and agent behavior belong in `project/guidelines.md`.
- **create-expo-super-stack wraps, not forks:** the public wrapper depends on `create-expo-stack`, announces that delegation, then applies MrDJ onboarding.
- **Doctor before git pushes:** the ship workflow should run at least the local equivalent of CI before pushing.
- **GitHub automation uses `gh`:** PR creation, check polling, log inspection, and merging should use the GitHub CLI.
- **Knowledge has one source of truth:** package docs, MCP resources, agent skills, and plugin files should be generated from `packages/knowledge`.

## Current State

- Foundation workspace exists with `packages/doctor`, `packages/cli`, `packages/knowledge`, and `packages/mcp-server`.
- Pattern resources were promoted into `packages/knowledge/src/content`.
- Doctor is modular, has `scanFile(file)`, and can run static checks plus package scripts.
- The CLI can run Doctor, scaffold onboarding project memory, clean stuck Expo ports/caches, and inspect the ship/test workflow.
- `packages/create-expo-super-stack` exists as the wrapper package for `npx create-expo-super-stack`.
- MCP server code uses the real MCP SDK stdio transport and exposes generated knowledge resources.
- Reference repos are no longer required in the tracked workspace; `temp/` research clones were removed after harvest.

## Reference Repos

- Expo apps: `time2pay`, `DJsPortfolio`, `PokePages`, `not-hot-dog`, `expo-super-template`.
- Monorepo/package patterns: `core-monorepo`, `mercury-bank-sdk`, `quantum-api`, `ads-sdk`.
- MCP patterns: `mrdj-app-mcp`, `mrdj-pokemon-mcp`, `mrdj-fne-mcp`.
- Upstream generator to collaborate with: `https://github.com/roninoss/create-expo-stack`.

## First Public Workflows

### `mrdj doctor`

Runs project memory checks, env hygiene checks, Expo config checks, route architecture checks, and available package scripts. The CI profile should run lint, typecheck, tests, Expo Doctor, and production build scripts when present.

### `mrdj ship test`

Planned workflow: run `mrdj doctor --ci`, review git status, commit intentional changes, push branch, open/update PR to `test`, poll checks, fix failures, push again, and merge to `test` after success.

### `mrdj onboard`

Planned workflow: agent-led conversation after `rn-new` or `create-expo-app`. It should learn the app purpose and then add selected defaults such as project docs, Uniwind, Zustand, Supabase, Drizzle, API routes, MCP config, and CI.

### `create-expo-super-stack`

Planned workflow: run `create-expo-stack` under the hood, resolve the generated app, then apply MrDJ project memory, rich boilerplate, Uniwind/Tailwind v4 defaults, Software Mansion core examples, and dev-suite package scripts.

### `mrdj clear-expo-start`

Planned workflow: kill stuck Expo/server ports, clear local Expo/Metro caches, then run Expo start with `--clear`.

## Upstream Create-Expo-Stack Direction

Fork and explore a focused PR for Uniwind support, Expo Router web platform generation, and Software Mansion core option support in `create-expo-stack` if it fits the project style. Keep MrDJ-specific depth out of that PR: project memory files, MCP setup, richer boilerplate, and agent-guided app planning belong in `mrdj onboard` and `create-expo-super-stack`.

## Questions To Revisit

- Should `mrdj doctor --ci` block on warnings in personal repos, or only on errors?
- Should the ship workflow merge automatically after passing checks, or require a final confirmation?
- Should onboard preferences be saved globally so future apps remember the developer's defaults?
