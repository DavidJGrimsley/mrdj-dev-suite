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
- [x] Clean up mojibake/encoding artifacts in generated markdown.
- [x] Add tests for the first Doctor and CLI behavior.
- [x] Replace the MCP placeholder with the real MCP SDK server/transport pattern from `mrdj-app-mcp`.
- [x] Move pattern markdown source of truth into `packages/knowledge` and generate MCP resources from it.

## Sprint 2: Knowledge Harvest

- [x] Scan app repos: `time2pay`, `DJsPortfolio`, `PokePages`, `not-hot-dog`, `expo-super-template`.
- [x] Scan MCP repos: `mrdj-app-mcp`, `mrdj-pokemon-mcp`, `mrdj-fne-mcp`.
- [x] Scan package/CI repos: `core-monorepo`, `mercury-bank-sdk`, `quantum-api`, `ads-sdk`.
- [x] Seed pattern docs for routing, API routes, Uniwind styling, Zustand, Drizzle/Supabase, deployment, and project organization.
- [x] Add a first metadata catalog in `packages/knowledge/src/patterns`.
- [x] Normalize all pattern docs to suite-wide language instead of app-specific language.
- [x] Add `skills/`, `guides/`, `rules/`, and `reference/` folders under `packages/knowledge/src`.
- [x] Add a knowledge build script that validates markdown and generates MCP/plugin resource indexes.
- [x] Create an animation performance guide/reference doc from Expo's article ["The real cost of React Native animations: benchmarking every approach"](https://expo.dev/blog/the-real-cost-of-react-native-animations-benchmarking-every-approach).
  - [x] Credit the original article/source prominently and link back to Expo/App & Flow wherever the guide uses their benchmark findings.
  - [x] Extrapolate practical MrDJ guidance: when library choice matters, when it does not, how animated view count affects cost, and what to prefer for long-running/list-heavy animations.
  - [x] Turn findings into Doctor/onboard rules where useful, such as warning on expensive animation patterns in large lists or unguarded debug-build benchmark assumptions.
  - [x] Publish it as a knowledge guide and MCP resource, likely `packages/knowledge/src/guides/animation-performance.md` and `mrdj://guides/animation-performance`.

## Sprint 3: Doctor Multi-Check

### Completed
- [x] Implement first-pass `runDoctor()` in `packages/doctor`.
- [x] Add static checks for project docs, `.env` gitignore safety, script targets, styling stack, Expo config, env hygiene, and route architecture.
- [x] Add script checks for lint, typecheck, tests, Expo Doctor, and production build profiles.
- [x] Add CLI wiring for `mrdj doctor`, `--json`, `--fix`, `--ci`, `--full`, `--fast`, and script timeout.

### Next
- [x] Split Doctor into check modules: `checks/eslint.ts`, `checks/typescript.ts`, `checks/expo-doctor.ts`, `checks/app-architecture.ts`, `checks/ssr-safety.ts`, `checks/env-hygiene.ts`, `checks/seo-metadata.ts`.
- [x] Add `scanFile(file)` for focused agent/code-review workflows.
- [x] Add a reporter module with stable JSON schema and human output helpers.
- [x] Add unit tests using temp projects for passing, warning, and failing reports.
- [x] Test Doctor against `time2pay`, `DJsPortfolio`, `PokePages`, `expo-super-template`, and `core-monorepo`.

## Sprint 4: Ship/Test Workflow

### Goal
Turn the repeated request "push to git, open PR to test, poll it, fix failures, update PR, and merge to test" into a repeatable command and agent prompt.

### Current
- [x] Add CLI placeholder/plan command: `mrdj test-and-iterate` / `mrdj ship`.
- [x] Add root alias: `pnpm ship:test`.

### Next
- [x] Create `packages/cli/src/commands/test-and-iterate.ts`.
- [x] Always run `mrdj doctor --ci` before mutating git.
- [x] Detect current branch, remote, default base, and existing PR using `gh`.
- [x] Stage only intentional changes after showing `git status` (Phase 1 keeps staging manual).
- [x] Print the commit, push, open/update PR, and check-polling workflow for dry-run use.
- [x] Document failure handling: fetch logs, summarize, fix locally, rerun Doctor, push again, and keep polling.
- [x] Keep final merge manual during the dry-run proving period.
- [x] Keep destructive/mutating behavior behind an explicit `--execute` flag until the workflow is proven.

## Sprint 5: Post-Create Onboarding

### Direction
Do not compete with `rn-new` / `create-expo-stack` first. Build an agent-led post-create onboarder that learns the developer's goal and then adds the missing project memory, boilerplate, checks, and conventions.

### Agent Prompt
- [x] Create MCP prompt: `onboard_new_expo_app`.
- [x] Ask what the app is for, who it serves, core flows, data needs, and deployment target.
- [x] Detect existing Expo SDK, router, package manager, aliases, and styling setup.
- [x] Ask which defaults to add: Uniwind, Zustand, Supabase, Drizzle, API routes, project docs, MCP/Codex/Claude config, CI.
- [x] Generate `project/info.md`, `project/todo.md`, and `project/style.md`.
- [x] Scaffold selected pieces only after confirmation.

### CLI
- [x] Create `packages/cli/src/commands/onboard.ts`.
- [x] Support interactive mode first.
- [x] Add non-interactive flags later, for example `--styling uniwind --supabase auth --zustand auth-onboarding --project-docs --ci github`.

## Sprint 6: Upstream `create-expo-stack` Collaboration

### Goal
Explore a friendly upstream contribution while keeping MrDJ-specific depth in `mrdj onboard`.

- [x] Capture `https://github.com/roninoss/create-expo-stack` upstream conventions for a focused Uniwind-support PR.
- [x] Define the focused Uniwind branch/PR scope without making Phase 1 depend on an external fork.
- [x] Study the existing package-slice template conventions before coding.
- [x] Keep `project/info.md`, `project/todo.md`, `project/style.md`, MCP config, and richer boilerplate in `mrdj onboard`, not the upstream PR.
- [x] Track separate upstream follow-ups: clearer generated-file expectations, optional richer Zustand examples, and docs that point users to post-create onboarding tools.

## Full Product Roadmap

This section restores the larger roadmap from `temp/plan.md`. The sprint board above is the current Phase 1 execution slice; this roadmap is the broader product plan.

### Phase 1: Buff Up The MCP

- [x] Turn the MCP from an app-specific advice endpoint into an Expo project intelligence server.
- [x] Expose stable resources for guides and rules, such as Expo Router structure, SSR, env vars, Uniwind, Supabase, SEO, API routes, deployment, app-folder rules, business-logic boundaries, component structure, and server/client boundaries.
- [x] Add reusable prompt foundation with `onboard_new_expo_app`; broader prompt library continues in the roadmap.
- [x] Add MCP tools: `doctor_scan_project`, `doctor_scan_file`, `doctor_explain_result`, `knowledge_list_resources`, `get_skill`, `get_guide`, and `generate_setup_tasks`.
- [x] Add skills as bundled instructions for Expo Router architecture, SSR deployment, Supabase env vars, Uniwind theming, SEO metadata, API routes, and deployment.

### Phase 2: Build The Doctor

- [ ] Make Doctor usable in four places: CLI, MCP, CI/GitHub Actions, and later a GUI/dashboard.
- [ ] Add app folder architecture checks for large route files, business logic in `app/`, direct database calls from screens, heavy form logic, duplicated UI chunks, and deeply nested route code.
- [ ] Add SSR safety checks for `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, native-only imports in server paths, and client-only packages imported by server code.
- [ ] Add env hygiene checks for secret-looking `EXPO_PUBLIC_` variables, Supabase service role exposure, Stripe secret exposure, private tokens in client code, missing required env vars, and undocumented runtime/build-time env differences.
- [ ] Add SEO/metadata checks for missing title, description, canonical URL, Open Graph tags, route-level metadata, sitemap strategy, robots strategy, dynamic route metadata sources, and duplicate titles.
- [ ] Add Expo Router best-practice checks for confusing route groups, missing layouts, overloaded root layout, improper API route naming, mixed route concerns, and bad navigation patterns.
- [ ] Add API route safety checks for auth, request validation, Zod schemas, arbitrary JSON bodies, service role usage, method restrictions, and rate-limit strategy.
- [ ] Add package compatibility checks for SSR, edge runtime, Node runtime, and native-only packages imported from web/server paths.

### Phase 3: Create The CLI

- [ ] Implement `mrdj doctor`.
- [ ] Implement `mrdj doctor --json`.
- [ ] Implement `mrdj doctor --fix`.
- [ ] Implement `mrdj init` / `mrdj onboard`.
- [ ] Implement `mrdj explain`.
- [ ] Implement `mrdj skills list`.
- [ ] Implement `mrdj mcp install`.
- [ ] Implement `mrdj codex install`.
- [ ] Implement `mrdj claude install`.
- [ ] Implement `mrdj report`.
- [ ] Keep DWAH-specific commands future-facing until the personal suite proves itself, such as `dwah login`, `dwah link`, `dwah env pull`, `dwah env push`, `dwah deploy`, `dwah preview`, `dwah promote`, and `dwah rollback`.

### Phase 4: Agent Skills

- [ ] Author markdown skills first; avoid over-engineering.
- [ ] Create skills for app-folder architecture, SSR safety, API routes, SEO, Supabase env vars, Uniwind theme systems, deployment, debugging, and project onboarding.
- [ ] Standardize skill structure: when to use it, main rule, checks, preferred structure, example fix, and agent behavior.
- [ ] Make the same skills reusable by Codex, Claude Code, MCP resources, docs, and future DWAH onboarding.

### Phase 5: Codex Plugin

- [ ] Build `plugins/codex/` with `.codex-plugin/plugin.json`, `.mcp.json`, skills, commands, and README.
- [ ] Include Codex commands such as `review-expo-project.md`, `run-doctor.md`, `prepare-deploy.md`, and `fix-seo.md`.
- [ ] Support two install paths: reliable manual MCP/skills install and a fancier Codex plugin bundle.
- [ ] Avoid depending on plugin-installed MCP behavior until Codex plugin support is proven stable.

### Phase 6: Claude Code Plugin

- [ ] Build `plugins/claude-code/` with plugin config, MCP config, commands, shared skills, and README.
- [ ] Use the same source skill files as the Codex plugin.
- [ ] Generate plugin skill files from `packages/knowledge` instead of duplicating content manually.

### Phase 7: Knowledge Package

- [ ] Make `packages/knowledge` the source of truth for rules, guides, skills, checklists, and examples.
- [ ] Generate/copy knowledge outputs into `plugins/codex/skills`, `plugins/claude-code/skills`, `packages/mcp-server/resources`, and docs guides.
- [ ] Treat the knowledge package like a design system: one canonical source, many output surfaces.

### Phase 8: MCP Tools To Build First

- [ ] Build first: `doctor_scan_project`, `doctor_scan_file`, `doctor_explain_result`, `list_skills`, `get_skill`, `get_guide`, `generate_refactor_plan`, and `generate_deploy_checklist`.
- [ ] Build later: `github_read_repo`, `github_open_issue`, `github_comment_pr`, `dwah_create_project`, `dwah_get_preview_url`, `dwah_deploy`, `dwah_get_logs`, and `dwah_promote`.
- [ ] Prioritize project review and guidance before deployment tools.

### Phase 9: GitHub Action

- [ ] Add a repo-local `.github/actions/mrdj-doctor/` or publish `mrdj/doctor-action`.
- [ ] Support PR/push usage with `npx @mrdj/doctor --ci`.
- [ ] Report a Doctor score plus errors and warnings in CI output.
- [ ] Include findings such as unsafe public secrets, missing canonical metadata, and route files containing business logic.

### Phase 10: Personal Workflow And Dogfooding

- [ ] Support use inside an Expo app with `npx @mrdj/cli init`.
- [ ] Support `npx @mrdj/doctor`.
- [ ] Support `npx @mrdj/cli codex install`.
- [ ] Support `npx @mrdj/cli claude install`.
- [ ] Use the suite in Codex/Claude to review an Expo project, run Doctor, explain issues for beginners, create a fix plan, and fix highest-risk SSR/env issues first.
- [ ] Dogfood on DavidJGrimsley.com, Time2Pay, PokePages, Quantum API frontend, and any DWAH prototype.

### MVP Week Roadmap

- [ ] Week 1: repo, Turborepo, shared package, knowledge package, skills markdown, docs folder, and initial MCP server skeleton.
- [ ] Week 2: Doctor v0 with app file size, business logic keywords, SSR globals, public secret vars, SEO basics, and Expo config basics.
- [ ] Week 3: MCP tools for project/file scans, skills/guides, and project reports.
- [ ] Week 4: CLI installer with `mrdj init`, `mrdj doctor`, `mrdj mcp install`, `mrdj codex install`, and `mrdj claude install`.
- [ ] Week 5: Codex and Claude bundles with shared skills, commands, MCP config, and install docs.
- [ ] Week 6: real-world dogfood with reports, fixes, examples, and roadmap cleanup.

## Integration And Acceptance

- [x] `pnpm install` succeeds and produces a lockfile.
- [x] `pnpm type-check` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] `node packages/cli/dist/cli.js doctor . --json --scripts=false` returns a structured report.
- [x] `mrdj doctor --ci` mirrors each target repo's CI checks as closely as the repo permits.
- [x] MCP resource listing exposes the harvested patterns.
- [x] Onboarding creates the three project memory files in a fresh Expo app.

## Out Of Scope For Phase 1

- Codex/Claude Code plugin UI polish.
- DWAH hosting/preview layer.
- Monorepo-aware Doctor beyond a first package-manager/Turbo profile.
- Fully automated merge without a successful dry-run period.
