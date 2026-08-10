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
- [x] Replace the MCP placeholder with the real MCP SDK server/transport pattern from `mds-app-mcp`.
- [x] Move pattern markdown source of truth into `packages/knowledge` and generate MCP resources from it.

## Sprint 2: Knowledge Harvest

- [x] Scan app repos: `time2pay`, `DJsPortfolio`, `PokePages`, `not-hot-dog`, `expo-super-template`.
- [x] Scan MCP repos: `mds-app-mcp`, `mds-pokemon-mcp`, `mds-fne-mcp`.
- [x] Scan package/CI repos: `core-monorepo`, `mercury-bank-sdk`, `quantum-api`, `ads-sdk`.
- [x] Seed pattern docs for routing, API routes, Uniwind styling, Zustand, Drizzle/Supabase, deployment, and project organization.
- [x] Add a first metadata catalog in `packages/knowledge/src/patterns`.
- [x] Normalize all pattern docs to suite-wide language instead of app-specific language.
- [x] Add `skills/`, `guides/`, `rules/`, and `reference/` folders under `packages/knowledge/src`.
- [x] Add a knowledge build script that validates markdown and generates MCP/plugin resource indexes.
- [x] Create an animation performance guide/reference doc from Expo's article ["The real cost of React Native animations: benchmarking every approach"](https://expo.dev/blog/the-real-cost-of-react-native-animations-benchmarking-every-approach).
  - [x] Credit the original article/source prominently and link back to Expo/App & Flow wherever the guide uses their benchmark findings.
  - [x] Extrapolate practical MDS guidance: when library choice matters, when it does not, how animated view count affects cost, and what to prefer for long-running/list-heavy animations.
  - [x] Turn findings into Doctor/onboard rules where useful, such as warning on expensive animation patterns in large lists or unguarded debug-build benchmark assumptions.
  - [x] Publish it as a knowledge guide and MCP resource, likely `packages/knowledge/src/guides/animation-performance.md` and `mds://guides/animation-performance`.

## Sprint 3: Doctor Multi-Check

### Completed
- [x] Implement first-pass `runDoctor()` in `packages/doctor`.
- [x] Add static checks for project docs, `.env` gitignore safety, script targets, styling stack, Expo config, env hygiene, and route architecture.
- [x] Add script checks for lint, typecheck, tests, Expo Doctor, and production build profiles.
- [x] Add CLI wiring for `mds doctor`, `--json`, `--fix`, `--ci`, `--full`, `--fast`, and script timeout.

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
- [x] Add CLI placeholder/plan command: `mds test-and-iterate` / `mds ship`.
- [x] Add root alias: `pnpm ship:test`.

### Next
- [x] Create `packages/cli/src/commands/test-and-iterate.ts`.
- [x] Always run `mds doctor --ci` before mutating git.
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
Explore a friendly upstream contribution while keeping MDS-specific depth in `mds onboard`.

- [x] Capture `https://github.com/roninoss/create-expo-stack` upstream conventions for a focused Uniwind-support PR.
- [x] Define the focused Uniwind branch/PR scope without making Phase 1 depend on an external fork.
- [x] Study the existing package-slice template conventions before coding.
- [x] Keep `project/info.md`, `project/todo.md`, `project/style.md`, MCP config, and richer boilerplate in `mds onboard`, not the upstream PR.
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
- [x] Run MDS onboarding and rich boilerplate after generation.
- [x] Run the full MDS onboarding questionnaire instead of only applying canned defaults.
- [x] Offer bundled/custom `project/guidelines.md` template support.
- [x] Add `mds kill-port [ports...]`.
- [x] Add `mds free-port [ports...]` with `mds kill-port` compatibility alias.
- [x] Add `mds clear-expo-start` with alias `mds clean-start`.
- [x] Add generated app scripts for `free-port`, `kill-port` (compat), `clear-expo-start`, and `clean-start`.
- [x] Add generated app scripts for `expo-install-fix`, `expo-doctor`, and `post-create-check`.
- [x] Run Expo dependency repair/doctor after MDS adds dependencies when install was not skipped.
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

- [x] Implement `mds doctor`.
- [x] Implement `mds doctor --json`.
- [x] Implement `mds doctor --fix`.
- [x] Implement `mds init` / `mds onboard`.
- [x] Implement `mds kill-port`.
- [x] Implement `mds free-port` with `mds kill-port` compatibility alias.
- [x] Implement `mds clear-expo-start` / `mds clean-start`.
- [x] Implement `create-expo-super-stack`.
- [x] Implement `mds explain`.
- [x] Implement `mds skills list`.
- [x] Implement `mds skills show`.
- [x] Implement `mds mcp install` with `--client claude|codex|cursor` (subsumes the originally separate `mds codex install` and `mds claude install` commands).
- [x] Implement `mds report`.
- [ ] Keep DWAH-specific commands and hosting/preview layers future-facing until the personal suite proves itself, such as `dwah login`, `dwah link`, `dwah env pull`, `dwah env push`, `dwah deploy`, `dwah preview`, `dwah promote`, and `dwah rollback`.

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
- [x] Make the same skills reusable by Codex, Claude Code, MCP resources, docs, and future DWAH onboarding.

### Phase 5: Codex Plugin

- [x] Ensure the agent with which I'm working has a skill for creating Plugins BEFORE any work is done.
- [x] Build `plugins/codex/` with `.codex-plugin/plugin.json`, `.mcp.json`, skills, commands, and README.
- [x] Include Codex commands such as `review-expo-project.md`, `run-doctor.md`, `prepare-deploy.md`, and `fix-seo.md`.
- [x] Add a Codex command/prompt for `create-expo-super-stack` that starts an agent-assisted app setup session and keeps the user in conversation with the agent the whole time.
- [x] Add a Codex command/prompt for continuing a generated app by scanning `project/todo.md`, selecting the next phase/task, and updating/defering todos as work progresses.
- [x] Add a Codex command/prompt for project research planning when the user has an app idea but little direction, with output designed to feed back into `project/info.md`.
- [x] Support two install paths: reliable manual MCP/skills install and a fancier Codex plugin bundle.
- [x] Avoid depending on plugin-installed MCP behavior until Codex plugin support is proven stable.

### Phase 6: Claude Code Plugin

- [x] Ensure the agent with which I'm working has a skill for creating Plugins BEFORE any work is done.
- [x] Build `plugins/claude-code/` with plugin config, MCP config, commands, shared skills, and README.
- [x] Use the same source skill files as the Codex plugin.
- [x] Generate plugin skill files from `packages/knowledge` instead of duplicating content manually.
- [x] Retire Claude `commands-src` legacy path and keep `plugins/claude-code/commands` as the single distributable command surface.

### Phase 7: Knowledge Package

- [x] Make `packages/knowledge` the source of truth for rules, guides, skills, checklists, examples, prompt specs, and MCP tool/prompt metadata.
- [x] Generate/copy knowledge outputs into `plugins/codex/skills`, `plugins/codex/commands`, `plugins/claude-code/skills`, `plugins/claude-code/commands`, and MCP/doc surfaces (MCP server resources/prompts wired from canonical knowledge + updated docs guides).
- [x] Treat the knowledge package like a design system: one canonical source, many output surfaces.
- [x] Add canonical push-merge-loop artifacts across surfaces: Codex command, Claude command, MCP prompt (`push_merge_loop`), checklist, and example.
- [x] Add Phase 9 source artifacts in canonical knowledge content (bootstrap example + validation checklist) so bundle work starts from one source.

### Phase 8: MCP Tools To Build First

- [x] Build first: `doctor_scan_project`, `doctor_scan_file`, `doctor_explain_result`, `list_skills`, `get_skill`, `get_guide`, `generate_refactor_plan`, and `generate_deploy_checklist`.
- [ ] Build later: `github_read_repo`, `github_open_issue`, `github_comment_pr`, `dwah_create_project`, `dwah_get_preview_url`, `dwah_deploy`, `dwah_get_logs`, and `dwah_promote`.
- [x] Prioritize project review and guidance before deployment tools.

### Phase 9: Unified Agent Bundle (VS Code Copilot, Claude Code, Codex)

- [x] Define the unified agent scope: one agent that loads MCP servers and suite tooling, with clear tool-routing expectations.
- [x] Bundle MCP server config, skills/prompts, knowledge resources, CLI wrappers, and recommended VS Code settings into a single installable package.
- [x] Map each bundle asset to a single source of truth (knowledge package, MCP server, CLI) to avoid duplication and drift.
- [x] Create a bootstrap flow that installs the bundle and verifies the agent can see tools and resources.
- [x] Add a short multi-step validation script: run Doctor, fetch a knowledge guide, and execute a CLI workflow from the agent.
- [x] Extend `mds agent install` to Claude Code and Codex so VS Code, Claude, and Codex each get a native bundle in one command.
- [x] Add a generated Claude Code `mds` custom agent plus generated commands and skills.
- [x] Keep Codex as a plugin-first bundle and install it through a local marketplace entry plus MCP config.

### Phase 10: GitHub Action

- [x] Add a repo-local `.github/actions/mds-doctor/` or publish `mds/doctor-action`.
- [x] Support PR/push usage with `npx @mr.dj2u/doctor --ci`.
- [x] Report a Doctor score plus errors and warnings in CI output.
- [x] Include findings such as unsafe public secrets, missing canonical metadata, and route files containing business logic.

### Phase 11: Publishing, Personal Workflow And Dogfooding

- [x] Run a sweep to ensure MDS does not replace official Expo skills. When an Expo-owned skill exists, MDS delegates framework guidance to that skill and layers on project-specific memory, checks, defaults, and workflow automation.
(Then maybe add a small audit checklist before adding any new MDS skill:

Does an Expo skill already cover this?
If yes, is MDS only adding project-specific guidance?
Are we linking/delegating instead of duplicating?
Is the new rule checkable by Doctor or useful to onboarding?
Would this still be useful if the Expo docs/plugin improved tomorrow?)
- [x] Finish naming cleanup: use `MDS` for tools while keeping `Mr. DJ's Dev Suite` as suite name in brand references.
- [x] Publish all packages to npm that are required for the CLI, unified agent bundle and the entire dev suite workflow.
- [x] Add temporary `@mr.dj2u/create-expo-stack@2.21.3-mrdj.0` fork dependency/resolver path to `create-expo-super-stack` so the dev suite can work before the upstream PR is merged.
- [x] Republish npm packages (`@mr.dj2u/knowledge`, `@mr.dj2u/doctor`, `@mr.dj2u/cli`, `create-expo-super-stack`, and `@mr.dj2u/mcp-server` are all at `0.1.1`; scoped fork `@mr.dj2u/create-expo-stack@2.21.3-mrdj.0` is published).
- [x] Test npx create expo super stack as any other dev would (smoke-tested with `npx -y create-expo-super-stack phase11-smoke-app --expo-router --uniwind --no-install --mds-yes --mds-skip-expo-fix`).
- [x] Support use inside an Expo app with `npx @mr.dj2u/cli init` (verified on 2026-05-19 in `f:\phase11-smoke\phase11-smoke-app`).
- [x] Open a PR to create expo stack from my local fork (added Uniwind to CLI, made CLI match website, updated website with Uniwind.)
- [x] Support `npx create-expo-super-stack`.
- [x] Support `mds clear-expo-start` and `mds free-port` in generated apps.
- [x] Support `npx @mr.dj2u/doctor`.
- [x] Support Codex install via `npx @mr.dj2u/cli agent install --client codex` and MCP-only setup via `npx @mr.dj2u/cli mcp install --client codex`.
- [x] Support Claude install via `npx @mr.dj2u/cli agent install --client claude` and MCP-only setup via `npx @mr.dj2u/cli mcp install --client claude`.
- [x] Review and update prompt/skill text in MCP/plugin surfaces (agentic create expo super stack - CLI-backed flows pick up CLI changes once that updated CLI version is what gets executed so this may be a non-issue) to remove any lag from the CLI and ensure that the source of truth in `packages/knowledge` prevents this drift in the future.
- [x] Bundle the custom agent for VS Code Copilot, and the plugins for Claude and Codex with the CLI so it can be installed with `mds agent install` with the client flag.
- [x] Use the custom agent for VS Code Copilot to run through the full post-create onboarding flow in a new Expo app, then run Doctor, explain the results, and create a fix plan.
- [x] Use the plugin in Codex/Claude to review an Expo project, run Doctor, explain issues for beginners, create a fix plan, and fix highest-risk SSR/env issues first.
- [ ] Dogfood on Time2Pay, PokePages and the Dogfood app.
- [ ] Add/update the how to section of the README with the recommended workflow: start with how to install for Copilot, Codex, or Claude, then a "How to use this suite": `create-expo-super-stack` for new apps, then use `mds doctor`, `mds explain`, and `mds report` in regular development, and use the agent skills for project review, guidance, and workflow automation.

### MVP Week Roadmap

- [ ] Week 1: repo, Turborepo, shared package, knowledge package, skills markdown, docs folder, and initial MCP server skeleton.
- [ ] Week 2: Doctor v0 with app file size, business logic keywords, SSR globals, public secret vars, SEO basics, and Expo config basics.
- [ ] Week 3: MCP tools for project/file scans, skills/guides, and project reports.
- [ ] Week 4: CLI installer with `mds init`, `mds doctor`, `mds mcp install`, `mds codex install`, and `mds claude install`.
- [ ] Week 5: Codex and Claude bundles with shared skills, commands, MCP config, and install docs.
- [ ] Week 6: real-world dogfood with reports, fixes, examples, and roadmap cleanup.

## Integration And Acceptance

- [x] `pnpm install` succeeds and produces a lockfile.
- [x] `pnpm type-check` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [x] `node packages/cli/dist/cli.js doctor . --json --scripts=false` returns a structured report.
- [x] `mds doctor --ci` mirrors each target repo's CI checks as closely as the repo permits.
- [x] MCP resource listing exposes the harvested patterns.
- [x] Onboarding creates the four project memory files in a fresh Expo app.
- [x] Generated `project/style.md` stays visual-only and `project/guidelines.md` carries technical/agent rules.
- [x] Generated rich boilerplate uses `src/components/exposition`, not `src/components/mds`.
- [x] Generated exposition pages include a temporary/prune-before-production notice.
- [x] Generated `project/todo.md` gives agents a phase-ordered app build plan.
- [x] Existing project memory can be normalized without losing original notes.

## Mono repo support (turbo repo)
- [ ] During onboarding, at the very beginning, before CES starts, there should be a question for "Do you want a web app & landing page/website (e.g. app.domain.com & domain.com) or just a web app or only other platforms?" This will generate an expo app (a modified generated superstack for each with shared packages) in two places in the apps folder with a packages folder that uses the same project memory, components, style files, etc for shared context but separate app folders and entry points. This is a simple way to support monorepos without having to ask about it directly. The web app folder can be maybe apps/app while the landing page is apps/site. 
- [ ] If the user answered no to the previous question, show a question explicitly asking this needs to be a is a monorepo or not, with no as the default, and if yes, what package(s) the user wants to target (expo app and separate backend or something.). This will at first just be added to the project info and small todo item and then the agent can take it from there but maybe over time we can have a default setup for something like this. 
- [ ] For onboarding, generate the project memory files and rich boilerplate inside the target package instead of the root, and adjust all file paths accordingly.
- [ ] For Doctor, run checks only against the target package instead of the whole repo, and adjust any file path outputs accordingly.
(previous todo, might be partially done but is related and we could finish it now: - [ ] in onboarding, after asking about platform specific needs, ask if the different platforms need their own layouts. maybe we can even go so far as to ask if they want a monorepo structure with separate packages for each platform, but that might be too much for now. at the very least we should ask if they want the app folder within the src folder with yes as the default.)
- [ ] Create a monorepo doctor that runs as well


## Random
- [x] Add a question to onboarding that asks if the user wants the app folder within the src folder with yes as the default.
- [x] In onboarding, after asking about platform-specific needs, ask if the different platforms need their own layouts; keep monorepo structure as separate future work.
- [x] Keep `mds free-port` primary in docs, prompts, and generated scripts.
- [x] Continue legacy/backwards-compatibility cleanup now that Codex/Claude/VS Code bundle assets are generated from canonical knowledge sources.
- [x] Enhance `mds continue` and the Continue workflow so new phase kickoff strongly prefers Plan mode before implementation.
- [x] Update Super Stack/onboarding intake to recommend planning first for thin ideas, accept pasted research/project-memory files, and normalize into canonical `project/info.md` + `project/style.md` before generation.
- [x] Save personal defaults globally for future app generation.
- [x] Keep `/push-merge-loop` as the shipped PR iteration primitive (Doctor -> push/PR -> poll/fix -> merge handling); map legacy `ship-test-loop` requests to it.
- [x] Add `/wrap-up` prompt for post-testing release preflight: mark completed todo items, run `mds doctor --ci`, review `git status`, and confirm intentionally omitted files before publish flow.
- [x] Route `/wrap-up` GitHub work through `github` (context), `yeet` (publish), `gh-fix-ci` (failed checks), and `gh-address-comments` (blocking review threads), with a max of 5 fix/poll cycles before human handoff.
- [x] Add optional repo merge policy config for `/wrap-up` with defaults: auto-merge to `test`, per-repo override support, and never auto-merge to `main`.
- [x] Enhance the style guide component (rename to 'Stylist') to have a color picker (I think swmansion has one that we can use...) that can change the ui of that page and then a save button that will let the user save that color scheme to the project style file which will create an immediate todo task to switch the app's theme over. A canonical theme source of truth would be awesome here. One that is editable by editing the style.md file directly or through the style guide page. This style guide component should also have a way to edit the typography styles and maybe some basic layout styles like border radius and spacing scale. This would be a great example of how the style.md file can be used as a source of truth for both the agent and the dev to shape the app's design.
- [ ] Ensure the style guide is using the information in the style.md to generate the app and that the Stylist uses that theme on launch, even before the user has ever opened the app or if they have. This will be from the Style.md that they added to the project/style.md.
- [x] Go through generated exposition pages and fix any bugs.
- [x] After editing the generated app for a while, we need to finally update the generator in create expo super stack. to do this, please review StylistCheck app (all of it's pages, components and such, not just the Stylist), possibly by creating a new app with the same command and diffing the files to update the updateGenerator.md. Then update the app generator per updateGenerator.md. 
- [x] Ensure that create expo super stack is actually using the layout choice chosen during create expo stack. 
- [x] Set up CI for npm packages

## MDS Library

> Sequencing note: this is an explicitly approved standalone `component-library` branch and does not change the active Doctor phase or mark its remaining work complete.

- [x] Add tool to agent/mcp that recalls all components and packages that came with the template app and create-expo-app components so that they can be used later if the dev has a use for them but were ejected. This will be the groundwork for the Component library widget of the MDS/II IDE. - See temp/Dual-Screen IDE Design.

### MDS Library v1: Registry, Discovery, and Safe Restore

- [x] Add the publishable `@mr.dj2u/library-registry` package with typed, searchable metadata and bundled source-copy assets.
- [x] Seed the registry only with completed MDS, create-expo-app, and create-expo-stack assets that are already generated today and have redistribution-friendly provenance.
- [x] Add `mds library list`, `show`, and conflict-safe `add` workflows with compatibility and dependency planning.
- [x] Add matching MCP search, get, plan-add, and confirmed add tools.
- [x] Make MDS generation and exposition ejection consume the shared registry inventory.
- [x] Validate packaged assets, focused restore behavior, repository CI, and MDS Doctor before release.

### MDS Library Later Roadmap

- [ ] Add the redesigned onboarding flow to MDS Library from its dedicated feature branch.
- [ ] Add completed sign-in and sign-up screens/flows from the dedicated auth branch; do not treat the current account-setup placeholder as auth.
- [ ] Add npm-package-backed Library entries and decide which advanced MDS components should graduate into runtime packages.
- [ ] Design reviewed contributor submissions, attribution, licensing, governance, signup-fee, nonprofit, and potential payout policies without granting repository write access by default.
- [ ] Connect the I^2 IDE MDS Library widget to the shared registry APIs, including previews and project compatibility state.

### Create Expo Super Stack
- [ ] Remove question about using the latest expo sdk from onboarding CLI. We are only going to use latest. We can have a note about it in the very beginning.
- [ ] Add light and dark mode to generated app in the way that create expo app does.
- [x] Add/edit the super stack/our create expo stack fork to use SDK 56
- [x] GO through generated app info pages and fix any references that mismatch expo sdk 56.
- [ ] Fix presentation view for modal on web after 56 update to be like a mobile modal instead of a full screen page.
- [x] Use expo ui, native tabs, and other newly stable packages from expo in the generated app and exposition pages. Create and exposition page for expo sdk 56 including an inline expo module! add it to all layout generations.
- [ ] Add a list of commands that come with a generated project to the readme with short explanations of what they do and when to use them (already in progress, just update).
- [ ] eject-stylist script
- [ ] Add an 'eject-exposition' command (effectively what reset app by expo does but a little more interactive). This should be an interactive prompt like CESS that asks the user which parts of the exposition they want to reset. options to keep being: Onboarding Setup, Settings Page, Data Adapter, and Stylist. This would mean the eject stylist would have to be integrated into this command maybe... cause if the user already ejected stylist then they can't keep it so this script needs just check if the stylist has been ejected, if so, don't show it in the list. But the eject stylist script could still be useful for later ejecting it specifically. Edit the Phase 0 Section to Instruct the user to mark the tasks done if they have actually done them or if they want to defer, this really only applies to eject stylist since eject exposition has the option to keep things and should be run either way to complete phase 0. But of course they can do what they want to do.
- [ ] Add a help prompt that explains all the prompts and tools and when to use them. This could be a CLI command like `mds help` AND a prompt that gives an overview of the suite and then options to dive deeper into each tool or prompt. This would be great for onboarding new users to the suite and also for providing a reference for existing users.
- [ ] add the deferred MCP/slash wrapper for mds stylist eject (without changing CLI behavior). - couple with next task.
- [ ] Ensure agentic onboarding aligns with everything in Create expo stack (forked) and create expo super stack and more.
- [ ] Consider adding the following tools as part of the suite & optional usage: argent, radon IDE, npx serve sim. https://github.com/software-mansion/argent https://github.com/software-mansion/radon-ide https://github.com/EvanBacon/serve-sim
- [ ] Confirm/add scripts from my other projects such as copy-icons, generate-sitemap(for static( i don't think it worked on server output but we want to ensure the sitemap is rebuilt every time we build) unless expo or some other package exists and is better)
- [ ] Modify clear-expo-start to also force close all applications on android because 9/10 times I press a to open on Android, nothing happens. 
- [ ] Add expo-mcp local installation as an onboarding question and if the answer is yes, wire it up according to this: https://docs.expo.dev/eas/ai/mcp/#set-up-local-capabilities-recommended
- [ ] Fix this behavior (we want @latest): 
```
...
Run `npm audit` for details.
  Expo SDK already targets SDK 56; skipping expo@latest.
  npx expo install expo@~56.0.6
env:...
› Installing 1 other package using npm
› Using ~56.0.6 instead of ~56.0.8 for expo because this version was explicitly provided. Packages excluded from dependency validation should be listed in expo.install.exclude in package.json
```
- [ ] Fix issue around 'On Node 24, that now emits [DEP0190] when you pass args with shell: true, because Node concatenates them for the shell instead of escaping them safely.
- [ ] Integrate npx react-doctor@latest into the doctor workflow and/or as referenced here: https://www.linkedin.com/posts/lukebrandonfarrell_reactnative-reactscan-developertools-share-7473665720728403969-5xMg/?highlightedUpdateUrn=urn%3Ali%3Aactivity%3A7473665721806340097&origin=SOCIAL_SHARE&utm_source=share&utm_medium=member_desktop&rcm=ACoAADYlT3gBZq1-0LP97LSzLp7orFbYo1Rwzc8

## Future Goals
- [ ] Consider adding agentic workflows for issues on github.
- [ ] Consider publishing the stylist component to npm
- [ ] Add the Supabase project to the template so it's actually usable from the start and the dev will just have to swap out their Supabase URL and anon key. This will be set up for auth so that when you start up SS app with auth and Supabase, the app will start with login/onboarding flow like a complete app. Obviously it will be used in the Settings and throughout the generated app.
- [ ] The agent should not only run tests and doctor after finishing work but it should create a checklist within it's ui for each facet that the dev should actually test. Even if the agent has powers to view and click around the app, the human dev should have to test the feature in a multitude of ways (the agent can provide a list but the human should try to think of even more ways to break it) .Such as a new feature or page. Then the dev could either tell the agent or check the box and then the agent would ask if the dev is ready for a 'wrap-up' and 'pr-merge-loop' or wrap up and commit or something else.
- [ ] Revisit the Stylist save flow to see if we can make it more designer friendly with less duplication and unused fields. Maybe the style.md template should include a json Style section and we'll just have to educate on how to edit it. The better experience would be if the Stylist was something that the dev could share with the rest of the nontechnical team so they could set it themselves. This could easily be done locally but remotely would present challenges. Maybe we could have a shareable link Or I could just host the stylist in a generic way on my portfolio website or expostylist.com that would let them edit the style and then save it back to the project style file/download the save configuration and email it to the dev. This would be super cool for collaboration and also for making it easier for non-technical team members to contribute to the design of the app.

## I^2(Infinite Intelligence) - An Agentic IDE based on MDS.
- [ ] Blitz mode - this will scan the project todo and identify unfinished tasks, group them into scoped branches, open a worktree for each and then use sub agents to complete each task in each branch at the same time and open PRs in order based on merge conflicts and progression of functionality of course. Full Blitz would merge all of those into test one by one and alert the user when they are all done. Standard blitz will load the app in each branch for testing. During the Blitz work, each worktree will appear as a window in the Blitz Widget and when the user clicks on a window, it will open that worktree IDE window but you can see them all working in real time even before clicking. Each window is a copy of the IDE basically with the mother IDE hosting them but the user probably won't see the difference.
