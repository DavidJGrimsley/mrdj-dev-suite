# Phase 1 Work Breakdown

**Goal:** Foundation, knowledge harvest, Doctor, onboarding, and GitHub automation.
**Target:** End of May 2026.

## Sprint 1: Foundation

### Completed
- [x] Create `project/info.md`, `project/todo.md`, and `project/style.md`.
- [x] Create root workspace files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `tsconfig.json`.
- [x] Add basic editor, lint, prettier, vitest, and gitignore configuration.
- [x] Scaffold packages: `doctor`, `cli`, `knowledge`, `mcp-server`.
- [x] Add root README and development docs.
- [x] Seed MCP pattern resources from the repo scans.

### Follow-Up Fixes
- [ ] Clean up mojibake/encoding artifacts in generated markdown.
- [ ] Add tests for the first Doctor and CLI behavior.
- [ ] Replace the MCP placeholder with the real MCP SDK server/transport pattern from `mrdj-app-mcp`.
- [ ] Move pattern markdown source of truth into `packages/knowledge` and generate MCP resources from it.

## Sprint 2: Knowledge Harvest

- [x] Scan app repos: `time2pay`, `DJsPortfolio`, `PokePages`, `not-hot-dog`, `expo-super-template`.
- [x] Scan MCP repos: `mrdj-app-mcp`, `mrdj-pokemon-mcp`, `mrdj-fne-mcp`.
- [x] Scan package/CI repos: `core-monorepo`, `mercury-bank-sdk`, `quantum-api`, `ads-sdk`.
- [x] Seed pattern docs for routing, API routes, Uniwind styling, Zustand, Drizzle/Supabase, deployment, and project organization.
- [x] Add a first metadata catalog in `packages/knowledge/src/patterns`.
- [ ] Normalize all pattern docs to suite-wide language instead of app-specific language.
- [ ] Add `skills/`, `guides/`, `rules/`, and `reference/` folders under `packages/knowledge/src`.
- [ ] Add a knowledge build script that validates markdown and generates MCP/plugin resource indexes.

## Sprint 3: Doctor Multi-Check

### Completed
- [x] Implement first-pass `runDoctor()` in `packages/doctor`.
- [x] Add static checks for project docs, `.env` gitignore safety, script targets, styling stack, Expo config, env hygiene, and route architecture.
- [x] Add script checks for lint, typecheck, tests, Expo Doctor, and production build profiles.
- [x] Add CLI wiring for `mrdj doctor`, `--json`, `--fix`, `--ci`, `--full`, `--fast`, and script timeout.

### Next
- [ ] Split Doctor into check modules: `checks/eslint.ts`, `checks/typescript.ts`, `checks/expo-doctor.ts`, `checks/app-architecture.ts`, `checks/ssr-safety.ts`, `checks/env-hygiene.ts`, `checks/seo-metadata.ts`.
- [ ] Add `scanFile(file)` for focused agent/code-review workflows.
- [ ] Add a reporter module with stable JSON schema and human output helpers.
- [ ] Add unit tests using temp projects for passing, warning, and failing reports.
- [ ] Test Doctor against `time2pay`, `DJsPortfolio`, `PokePages`, `expo-super-template`, and `core-monorepo`.

## Sprint 4: Ship/Test Workflow

### Goal
Turn the repeated request "push to git, open PR to test, poll it, fix failures, update PR, and merge to test" into a repeatable command and agent prompt.

### Current
- [x] Add CLI placeholder/plan command: `mrdj test-and-iterate` / `mrdj ship`.
- [x] Add root alias: `pnpm ship:test`.

### Next
- [ ] Create `packages/cli/src/commands/test-and-iterate.ts`.
- [ ] Always run `mrdj doctor --ci` before mutating git.
- [ ] Detect current branch, remote, default base, and existing PR using `gh`.
- [ ] Stage only intentional changes after showing `git status`.
- [ ] Commit, push, open/update PR to `test`, poll `gh pr view --json statusCheckRollup`.
- [ ] On failure, fetch failed check logs, summarize, fix locally, rerun Doctor, push again, and keep polling.
- [ ] On success, merge to `test` using the repo's configured merge strategy.
- [ ] Keep destructive/mutating behavior behind an explicit `--execute` flag until the workflow is proven.

## Sprint 5: Post-Create Onboarding

### Direction
Do not compete with `rn-new` / `create-expo-stack` first. Build an agent-led post-create onboarder that learns the developer's goal and then adds the missing project memory, boilerplate, checks, and conventions.

### Agent Prompt
- [ ] Create MCP prompt: `onboard_new_expo_app`.
- [ ] Ask what the app is for, who it serves, core flows, data needs, and deployment target.
- [ ] Detect existing Expo SDK, router, package manager, aliases, and styling setup.
- [ ] Ask which defaults to add: Uniwind, Zustand, Supabase, Drizzle, API routes, project docs, MCP/Codex/Claude config, CI.
- [ ] Generate `project/info.md`, `project/todo.md`, and `project/style.md`.
- [ ] Scaffold selected pieces only after confirmation.

### CLI
- [ ] Create `packages/cli/src/commands/onboard.ts`.
- [ ] Support interactive mode first.
- [ ] Add non-interactive flags later, for example `--styling uniwind --supabase auth --zustand auth-onboarding --project-docs --ci github`.

## Sprint 6: Upstream `create-expo-stack` Collaboration

### Goal
Explore a friendly upstream contribution while keeping MrDJ-specific depth in `mrdj onboard`.

- [ ] Fork `https://github.com/roninoss/create-expo-stack` under the user GitHub account.
- [ ] Create a focused branch for Uniwind support.
- [ ] Study the existing package-slice template conventions before coding.
- [ ] Open a small PR if Uniwind can fit the author's lightweight generator philosophy.
- [ ] Keep `project/info.md`, `project/todo.md`, `project/style.md`, MCP config, and richer boilerplate in `mrdj onboard`, not the upstream PR.
- [ ] Track separate upstream follow-ups: clearer generated-file expectations, optional richer Zustand examples, and docs that point users to post-create onboarding tools.

## Integration And Acceptance

- [ ] `pnpm install` succeeds and produces a lockfile.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` passes.
- [ ] `node packages/cli/dist/cli.js doctor . --json --scripts=false` returns a structured report.
- [ ] `mrdj doctor --ci` mirrors each target repo's CI checks as closely as the repo permits.
- [ ] MCP resource listing exposes the harvested patterns.
- [ ] Onboarding creates the three project memory files in a fresh Expo app.

## Out Of Scope For Phase 1

- Codex/Claude Code plugin UI polish.
- DWAH hosting/preview layer.
- Monorepo-aware Doctor beyond a first package-manager/Turbo profile.
- Fully automated merge without a successful dry-run period.
