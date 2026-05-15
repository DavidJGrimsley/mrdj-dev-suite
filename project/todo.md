# Phase 1 Work Breakdown

**Goal:** Foundation, knowledge harvest, Doctor, onboarding, and GitHub automation.
**Target:** End of May 2026.

## Sprint 1: Foundation

### Completed
- [x] Create `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
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
- [x] Generate `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- [x] Scaffold selected pieces only after confirmation.

### CLI
- [x] Create `packages/cli/src/commands/onboard.ts`.
- [x] Support interactive mode first.
- [x] Add non-interactive flags later, for example `--styling uniwind --supabase auth --zustand auth-onboarding --project-docs --ci github`.
- [x] Add rich boilerplate generation for feature folders, mock/local data, shared components, Uniwind defaults, and Software Mansion core examples.
- [x] Generate root `AGENTS.md` that points agents to the `project/` source of truth.

## Sprint 6: Upstream `create-expo-stack` Collaboration

### Goal
Explore a friendly upstream contribution while keeping MrDJ-specific depth in `mrdj onboard`.

- [x] Capture `https://github.com/roninoss/create-expo-stack` upstream conventions for a focused Uniwind-support PR.
- [x] Define the focused Uniwind branch/PR scope without making Phase 1 depend on an external fork.
- [x] Study the existing package-slice template conventions before coding.
- [x] Keep `project/info.md`, `project/todo.md`, `project/style.md`, MCP config, and richer boilerplate in `mrdj onboard`, not the upstream PR.
- [x] Track separate upstream follow-ups: clearer generated-file expectations, optional richer Zustand examples, and docs that point users to post-create onboarding tools.
- [x] Use `f:\SoftwareDev\create-expo-stack` as the local fork for upstream-style work.
- [x] Add upstream-friendly `--uniwind` support using package-slice templates.
- [x] Include `web` in Expo Router generated `app.json` platforms.
- [x] Add focused Software Mansion core option support for Reanimated/Worklets, Gesture Handler, Screens, SVG, and Keyboard Controller.

## Sprint 7: create-expo-super-stack And Dev Cleanup

### Goal
Ship the public wrapper and the daily cleanup commands that make new Expo app starts less annoying.

### Completed
- [x] Add `packages/create-expo-super-stack` with bin `create-expo-super-stack`.
- [x] Delegate to `create-expo-stack` and clearly print the delegated command.
- [x] Prefer the local `f:\SoftwareDev\create-expo-stack` fork for dev runs.
- [x] Delegate Uniwind to `create-expo-stack --uniwind` instead of adding it afterward in the wrapper.
- [x] Resolve generated project path from the project name or `cesconfig.jsonc`.
- [x] Run MrDJ onboarding and rich boilerplate after generation.
- [x] Run the full MrDJ onboarding questionnaire instead of only applying canned defaults.
- [x] Offer bundled/custom `project/guidelines.md` template support.
- [x] Add `mrdj kill-port [ports...]`.
- [x] Add `mrdj clear-expo-start` with alias `mrdj clean-start`.
- [x] Add generated app scripts for `kill-port`, `clear-expo-start`, and `clean-start`.
- [x] Add generated app scripts for `expo-install-fix`, `expo-doctor`, and `post-create-check`.
- [x] Run Expo dependency repair/doctor after MrDJ adds dependencies when install was not skipped.
- [x] Force Tailwind v4 for Uniwind so Tailwind 3 peer conflicts do not break `npm install`.
- [x] Normalize NativeWind generated artifacts to Uniwind when rich boilerplate is applied.
- [x] Rename rich demo components to `src/components/exposition`.
- [x] Generate temporary `/exposition`, `/exposition/style-guide`, and `/exposition/data` pages.
- [x] Add Software Mansion core exposition demos for Reanimated/Worklets, Gesture Handler, Screens, SVG, and Keyboard Controller.
- [x] Generate a phase-based `project/todo.md` from onboarding answers.
- [x] Add local dummy data vs Supabase onboarding and generated guidance.
- [x] Add test-to-main onboarding with PR checks and `project/release-flow.md`.
- [x] Print the post-onboarding next steps for style guide, exposition review, project memory review, and phase-by-phase development.
- [x] Move onboarding to `@clack/prompts` for a friendlier create-expo-stack-style UX.
- [x] Expand generated `project/info.md` into canonical product/business planning sections.
- [x] Expand generated `project/style.md` while keeping it visual-only.
- [x] Preserve non-canonical existing info/style notes under Imported Notes.
- [x] Generate `project/intake-agent.md` when context is thin or needs agent follow-up.
- [x] Remove the interactive advanced-setup and comma-separated defaults prompts.
- [x] Fix server/EAS prompt wording and add explain-this choices for confusing concepts.
- [x] Run package-manager install before `expo install --fix`, install known
  missing Expo peers such as `expo-font`, and then run `expo-doctor`.
- [x] Add `f:\SoftwareDev\dogfood` as the official practice app target.

### Next
- [ ] Publish package only after an npm name check and a final end-to-end local generation pass.
- [ ] Add a fully interactive agent-session path for `create-expo-super-stack` so a Codex/plugin prompt can guide the app setup from start to finish while using the CLI behind the scenes.
- [ ] Let the agent-session intake accept pasted `project/info.md` sections, whole project memory files, or research-plan documents, then check and reshape them into the canonical `project/info.md` and `project/style.md` structure.
- [ ] Add intake guidance telling users with little product direction to ask an AI agent for a research plan first, then feed that plan into MrDJ onboarding.
- [ ] Save personal defaults globally for future app generation.
- [ ] Add monorepo support after the single-app MVP is stable.

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

- [x] Implement `mrdj doctor`.
- [x] Implement `mrdj doctor --json`.
- [x] Implement `mrdj doctor --fix`.
- [x] Implement `mrdj init` / `mrdj onboard`.
- [x] Implement `mrdj kill-port`.
- [x] Implement `mrdj clear-expo-start` / `mrdj clean-start`.
- [x] Implement `create-expo-super-stack`.
- [x] Implement `mrdj explain`.
- [x] Implement `mrdj skills list`.
- [x] Implement `mrdj skills show`.
- [x] Implement `mrdj mcp install` with `--client claude|codex|cursor` (subsumes the originally separate `mrdj codex install` and `mrdj claude install` commands).
- [x] Implement `mrdj report`.
- [ ] Keep DWAH-specific commands future-facing until the personal suite proves itself, such as `dwah login`, `dwah link`, `dwah env pull`, `dwah env push`, `dwah deploy`, `dwah preview`, `dwah promote`, and `dwah rollback`.

### Phase 4: Agent Skills

- [x] Ensure the agent with which I'm working has a skill for creating skills BEFORE any work is done.
- [x] Author markdown skills first; avoid over-engineering.
- [x] Create skills for app-folder architecture, SSR safety, API routes, SEO, Supabase env vars, Uniwind theme systems, deployment, debugging, and project onboarding.
- [x] Create a dev-server-management skill that enforces the dev-server recovery pattern (run clear-expo-start, kill conflicting ports, clear Expo/Metro caches, and avoid fallback to port 8082).
- [x] Create a production-server-patterns skill covering the three production serving modes: EAS/`npx expo serve`, Express adapter (`node server.js`), and dual-server architecture with separate API.
- [x] Create a Super Stack startup skill that walks an agent through project research, `create-expo-super-stack`, project-memory shaping, exposition review, and phase-based build kickoff.
- [x] Create a continue-development skill that reads `project/todo.md`, finds the next logical task, finishes incomplete work in the current phase first, and only defers/moves tasks with an explicit note when the developer chooses to defer.
- [x] Create a research-plan intake skill that can turn pasted research docs, raw notes, or partial `project/info.md` sections into canonical project memory.
- [x] Standardize skill structure: when to use it, main rule, checks, preferred structure, example fix, and agent behavior.
- [ ] Make the same skills reusable by Codex, Claude Code, MCP resources, docs, and future DWAH onboarding.

### Phase 5: Codex Plugin

- [ ] Ensure the agent with which I'm working has a skill for creating Plugins BEFORE any work is done.
- [ ] Build `plugins/codex/` with `.codex-plugin/plugin.json`, `.mcp.json`, skills, commands, and README.
- [ ] Include Codex commands such as `review-expo-project.md`, `run-doctor.md`, `prepare-deploy.md`, and `fix-seo.md`.
- [ ] Add a Codex command/prompt for `create-expo-super-stack` that starts an agent-assisted app setup session and keeps the user in conversation with the agent the whole time.
- [ ] Add a Codex command/prompt for continuing a generated app by scanning `project/todo.md`, selecting the next phase/task, and updating/defering todos as work progresses.
- [ ] Add a Codex command/prompt for project research planning when the user has an app idea but little direction, with output designed to feed back into `project/info.md`.
- [ ] Support two install paths: reliable manual MCP/skills install and a fancier Codex plugin bundle.
- [ ] Avoid depending on plugin-installed MCP behavior until Codex plugin support is proven stable.

### Phase 6: Claude Code Plugin

- [ ] Ensure the agent with which I'm working has a skill for creating Plugins BEFORE any work is done.
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

### Phase 9: Unified Agent Bundle (VS Code Copilot)

- [ ] Define the unified agent scope: one agent that loads MCP servers and suite tooling, with clear tool-routing expectations.
- [ ] Bundle MCP server config, skills/prompts, knowledge resources, CLI wrappers, and recommended VS Code settings into a single installable package.
- [ ] Map each bundle asset to a single source of truth (knowledge package, MCP server, CLI) to avoid duplication and drift.
- [ ] Create a bootstrap flow that installs the bundle and verifies the agent can see tools and resources.
- [ ] Add a short multi-step validation script: run Doctor, fetch a knowledge guide, and execute a CLI workflow from the agent.

### Phase 10: GitHub Action

- [ ] Add a repo-local `.github/actions/mrdj-doctor/` or publish `mrdj/doctor-action`.
- [ ] Support PR/push usage with `npx @mrdj/doctor --ci`.
- [ ] Report a Doctor score plus errors and warnings in CI output.
- [ ] Include findings such as unsafe public secrets, missing canonical metadata, and route files containing business logic.

### Phase 11: Personal Workflow And Dogfooding

- [ ] Support use inside an Expo app with `npx @mrdj/cli init`.
- [ ] Support `npx create-expo-super-stack`.
- [ ] Support `mrdj clear-expo-start` and `mrdj kill-port` in generated apps.
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
- [x] Onboarding creates the four project memory files in a fresh Expo app.
- [x] Generated `project/style.md` stays visual-only and `project/guidelines.md` carries technical/agent rules.
- [x] Generated rich boilerplate uses `src/components/exposition`, not `src/components/mrdj`.
- [x] Generated exposition pages include a temporary/prune-before-production notice.
- [x] Generated `project/todo.md` gives agents a phase-ordered app build plan.
- [x] Existing project memory can be normalized without losing original notes.

## Out Of Scope For Phase 1

- Codex/Claude Code plugin UI polish.
- DWAH hosting/preview layer.
- Monorepo-aware generated app scaffolding beyond the post-MVP todo.
- Fully automated merge without a successful dry-run period.


## Cleanup/Random todo
- [x] Add a question to onboarding that asks if the user wants the app folder within the src folder with yes as the default.
- [x] In onboarding, after asking about platform-specific needs, ask if the different platforms need their own layouts; keep monorepo structure as separate future work.
- [ ] Run a sweep to ensure MrDJ-dev-suite(MDS) does not replace official Expo skills. When an Expo-owned skill exists, MDS delegates framework guidance to that skill and layers on project-specific memory, checks, defaults, and workflow automation.
(Then maybe add a small audit checklist before adding any new MrDJ skill:

Does an Expo skill already cover this?
If yes, is MrDJ only adding project-specific guidance?
Are we linking/delegating instead of duplicating?
Is the new rule checkable by Doctor or useful to onboarding?
Would this still be useful if the Expo docs/plugin improved tomorrow?)
- change reference of 'MrDJ' infront of tools to 'MDS' and refer to the suite as 'MrDJ Dev Suite' instead of 'MrDJ' to avoid confusion between the suite and the persona/agent. for example, 'MDS Doctor' instead of 'MrDJ Doctor' and 'MDS onboarding' instead of 'MrDJ onboarding'.
- change kill-port to MDS free-port



## Mono repo support
- [ ] Add a question at the very beginning of onboarding about whether the project is a monorepo or not, and if so, what package(s) the user wants to target for Expo app creation and Doctor checks.
- [ ] For onboarding, generate the project memory files and rich boilerplate inside the target package instead of the root, and adjust all file paths accordingly.
- [ ] For Doctor, run checks only against the target package instead of the whole repo, and adjust any file path outputs accordingly.
(previous todo, might be partially done but is related and we could finish it now: - [ ] in onboarding, after asking about platform specific needs, ask if the different platforms need their own layouts. maybe we can even go so far as to ask if they want a monorepo structure with separate packages for each platform, but that might be too much for now. at the very least we should ask if they want the app folder within the src folder with yes as the default.)
