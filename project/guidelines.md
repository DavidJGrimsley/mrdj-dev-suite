# Mr. DJ's Dev Suite Guidelines

## Source Of Truth

- The `project/` folder is the source of truth for product intent, roadmap,
  visual direction, and technical rules.
- Read `project/info.md`, `project/todo.md`, `project/style.md`, and this file
  before changing architecture, behavior, generated defaults, or roadmap scope.
- Never make a change that conflicts with project memory unless the user
  explicitly updates the memory first.

## Repo Scope

- Mr. DJ's Dev Suite owns the MDS CLI, Doctor, MCP server, knowledge package,
  onboarding, rich boilerplate, and `create-expo-super-stack`.
- `f:\SoftwareDev\create-expo-stack` is the upstream-style fork. Keep MDS
  memory, MCP, and rich boilerplate out of upstream PRs.
- `@mr.dj2u/create-expo-stack` is a temporary scoped fork package for public
  `create-expo-super-stack` dogfooding until the upstream PR lands.
- `f:\SoftwareDev\dogfood` is the practice app for testing generated flows.

## TypeScript And Packages

- Use TypeScript throughout.
- Keep public package APIs explicit and typed.
- Prefer focused modules over large mixed-responsibility files.
- Keep `packages/knowledge` as the canonical source for guides, rules, skills,
  and reference notes.
- Update tests when changing Doctor checks, CLI behavior, generated files, or
  MCP task output.

## Project Memory

- Onboarded apps must include:
  - `project/info.md`
  - `project/todo.md`
  - `project/style.md`
  - `project/guidelines.md`
- `project/info.md` holds product intent.
- `project/todo.md` holds the roadmap.
- `project/style.md` holds visual/design direction only.
- `project/guidelines.md` holds architecture, agent, workflow, and technical
  rules.
- Generated `AGENTS.md` files should point agents back to the `project/` folder.

## Expo Defaults

- Prefer Uniwind and Tailwind v4 for new MDS Expo templates.
- Keep Expo Router route files thin; route files should import feature screens
  or layouts.
- Put reusable logic in `src/features`, `src/services`, `src/data`, shared hooks,
  or shared components.
- Use Zustand only when shared state is genuinely needed.
- Keep private env vars server-side and never expose secrets with
  `EXPO_PUBLIC_`.

## Dev Workflow

- Run `pnpm type-check`, `pnpm lint`, `pnpm test`, and `pnpm build` before
  claiming a dev-suite change is ready.
- Run `mds doctor --ci` before pushing app changes.
- Use `mds clear-expo-start` when Metro/cache/port state
  gets wedged.
- Treat monorepo-aware generated app support as future work until the single-app
  MVP is stable.
