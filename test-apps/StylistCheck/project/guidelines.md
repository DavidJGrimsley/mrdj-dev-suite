# StylistCheck Guidelines

## MDS Template Baseline

This file was copied from the bundled MDS `guidelines.md` template. Customize
it for the app before treating it as final.

## Source Of Truth

- The `project/` folder is the golden source of truth for product intent,
  roadmap, visual style, and technical rules.
- Agents and contributors must read `project/info.md`, `project/todo.md`,
  `project/style.md`, and this file before making product or architecture
  changes.
- Never make a change that conflicts with the project memory files unless the
  user explicitly updates them first.

## TodoForContext Markers Block Onboarding

- The string `# TodoForContext(optional):` marks sections the user has not
  yet decided about.
- Before agentic intake, planning, or scaffolding, scan every `project/`
  file for this marker.
- If any marker is present: stop, list each file and line, and tell the
  user to fill the section underneath OR delete the marker line to
  acknowledge they do not want to add that context.
- Only proceed when zero markers remain. `mds doctor` also surfaces this
  as an error that blocks CI.

## Product Context

- Audience: Expo app users
- Core flows: Agent should derive the first core user flows from project/info.md during intake.
- Data needs: Local state first; add backend only when needed
- Deployment target: Expo web/native deployment
- Target platforms:
- web
- ios
- android
- First MVP platform: web
- Expo Router app directory: `src/app`
- Platform-specific organization: platform-specific files only
- Platform layout mode: shared layouts
- Web output: static
- Deployed server: no deployed server planned
- Latest Expo SDK preference: yes
- Advanced package setup: yes
- Create Expo starter components: no
- Expo UI: yes
- Expo Native Tabs: yes
- Data start: local dummy data with Expo SQLite
- Test-to-main safeguards: yes
- EAS usage:
- not planned yet

## Expo Architecture

- Keep Expo Router route files thin; route files should import feature screens
  or layouts.
- Put reusable business logic in `src/features`, `src/services`, `src/data`, or
  shared hooks.
- Keep Expo Router routes in `src/app` unless project memory changes.
- Use shared layouts for selected platform shells.
- Prefer Uniwind with Tailwind v4 for new styling work.
- Use Zustand only when state is shared across screens or features.
- Keep private environment variables server-side and never expose secrets with
  `EXPO_PUBLIC_`.

## Default Package Support

- Software Mansion core support starts with Reanimated/Worklets, Gesture
  Handler, Screens, SVG, and Keyboard Controller.
- Use the temporary `/exposition` pages to decide which package examples should
  stay, be replaced, or be removed.
- Use `react-native-keyboard-controller` for real keyboard-heavy flows instead
  of piling up manual keyboard offsets.
- Use Reanimated for meaningful motion, but avoid expensive animation loops in
  long lists.

## Workflow

- Run `mds doctor --ci` before pushing.
- Use `mds clear-expo-start` when Metro or server ports get wedged.
- When enabled, develop through feature branches into `test`, then promote
  validated work from `test` to `main`.
- Treat monorepo scaffolding as future work until the single-app MVP is stable.

## Selected Defaults

- project-docs
- guidelines
- uniwind
- doctor
- test-to-main
