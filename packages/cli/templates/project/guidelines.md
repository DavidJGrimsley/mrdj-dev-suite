# {{appName}} Guidelines

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
- Honor the `Component Strategy` section in `project/info.md`. Do not start
  Phase 1 until Decision is confirmed.

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

- Audience: {{audience}}
- Core flows: {{coreFlows}}
- Data needs: {{dataNeeds}}
- Deployment target: {{deploymentTarget}}
- Target platforms:
{{targetPlatforms}}
- First MVP platform: {{firstTargetPlatform}}
- Expo Router app directory: {{appDirectory}}
- Platform-specific organization: {{platformFileStrategy}}
- Platform layout mode: {{platformLayoutMode}}
- Web output: {{webOutput}}
- Deployed server: {{deployedServer}}
- Advanced package setup: {{advancedPackageSetup}}
- Create Expo starter components: {{includeCreateExpoComponents}}
- Expo UI: {{usesExpoUi}}
- Expo UI Universal components: {{usesExpoUiUniversalComponents}}
- Expo Native Tabs: {{usesExpoNativeTabs}}
- Data start: {{dataStart}}
- Test-to-main safeguards: {{testToMainSafeguards}}
- EAS usage:
{{easUses}}

## Expo Architecture

- Keep Expo Router route files thin; route files should import feature screens
  or layouts.
- Put reusable business logic in `src/features`, `src/services`, `src/data`, or
  shared hooks.
- Keep Expo Router routes in {{appDirectory}} unless project memory changes.
- Use {{platformLayoutMode}} for selected platform shells.
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

- After adding a package, immediately run the project package manager.
  Prefer `mds library add` for MDS Library catalog items. Do not treat
  the task as complete if install failed. MDS cannot install packages
  added outside MDS-owned flows.
- Run `mds doctor --ci` before pushing.
- Use `mds clear-expo-start` when Metro or server ports get wedged.
- When enabled, develop through feature branches into `test`, then promote
  validated work from `test` to `main`.
- Treat monorepo scaffolding as future work until the single-app MVP is stable.

## Selected Defaults

{{defaults}}
