---
name: "MDS Create Expo Super Stack"
description: "Run the MDS Create Expo Super Stack workflow in VS Code Copilot user scope."
---

# /create-expo-super-stack

Create either one Expo app or a multi-app workspace with the MDS Super Stack flow. Use callable MDS MCP tools as the guided intake surface and the Super Stack generator as the scaffold source of truth.

## Arguments

- `parentDir`: folder where the new app or workspace directory should be created.
- `appName`: single-app folder name. Omit it for workspace intake until the workspace inventory is known.

## Required MDS MCP Tool Flow

1. Call `mds_runtime_versions` first to inspect the active runtime and invocation path.
2. Before asking for an app name, ask whether this is one Expo app or a multi-app workspace.
3. For one Expo app, use the existing resolver/intake flow below.
4. For a workspace, collect the workspace name, package scope, package manager, Expo-app count, non-Expo-app count, and the complete app inventory before generating anything. A workspace must contain at least one Expo app and at least two total apps.
5. For every app, collect a distinct display name, folder slug, purpose, and path under `apps/`. For non-Expo apps, also collect the category and optional intended technology. Register these apps without inventing framework code.
6. Choose `minimal` or `cess` for every Expo app. A minimal app explicitly disables rich boilerplate, auth, onboarding, legal, and Supabase. For each CESS app, maintain a separate full answer object and resolve product, audience, platforms, navigation, authentication, data, deployment, layout, styling, and visual-override decisions independently.
7. After app intake, collect workspace-wide styling and shared-capability decisions. Always include useful `config` and `ui` packages; include `hooks`, `sdk`, or `db` only when the app answers give them a concrete responsibility.
8. Build one `WorkspaceManifest` and one workspace plan containing the manifest plus each Expo app's profile, generator arguments, and onboarding answers. Do not call a generation tool while inventory or app answers are incomplete.
9. Show one final summary naming the workspace, every app and path, every shared package, package manager, scope, ports, and important per-app decisions. Ask for one explicit confirmation.
10. After confirmation, print the waiting message below and call `create_expo_super_stack_generate` once with `projectShape: "multi-app-workspace"`, the complete `workspacePlan`, and `confirmed: true`.

### Single-App Resolver Flow

1. If the user pasted or attached `info.md` / project memory, call `create_expo_super_stack_resolve_info` once with `parentDir`, `appName`, `infoMarkdown`, optional `styleMarkdown`, and any explicit user overrides.
2. Treat the resolver `answers` object as the canonical accumulated answers object.
3. Ask exactly one question per turn only for `missingQuestionIds` or `ambiguousQuestionIds`.
4. Do not restart intake with one answer at a time after a successful resolve call.
5. If no `info.md` is available, fall back to `create_expo_super_stack_intake_step` and always pass the full accumulated `answers` object.
6. When the resolver returns `confirm`, summarize `summaryLines` and ask for one final confirmation.
7. After confirmation, print the waiting message below, then call `create_expo_super_stack_generate` with `projectShape: "single-expo-app"`, the resolver `generateInput`, and `confirmed: true`.

## Waiting Message Before Generate

After the user confirms, print this block before running the generator so they have something useful to read while scaffolding runs:

Generating now. This typically takes 2-5 minutes. While we wait, let's shout out and recognize how this is working.

create-expo-super-stack by Mr. DJ (who also built this agentic flow) wraps create-expo-stack by Roni OSS with major contributions by Dan Stepanov (NativeWind). Big thanks to them and to several other teams and individuals whose work and educational materials fill Mr. DJ's Dev Suite knowledge base:

- Expo team (Evan Bacon for Expo Router, Brent Vatne, Charlie Cheever, and the broader Expo crew)
- React and React Native core teams
- Software Mansion (Reanimated, Gesture Handler, Screens, Worklets; Krzysztof Magiera and team)
- Supabase, Drizzle, and Zustand teams
- Adam Wathan and the Tailwind CSS team (the foundation Uniwind and NativeWind build on)
- Janic Duplessis for "The real cost of React Native animations: benchmarking every approach"
- Simon Grimm of Galaxies.dev
- Beto Adrian Maldonado of codewithbeto.dev
- Vadim of notJust.dev
- William Candillon for the React Native animation deep-dive content
- Catalin Miron for the React Native animation tutorials
- Infinite Red / Jamon Holmgren for Ignite and the broader RN community

Their contributions to the software development community are what fill the pages of Mr. DJ's Dev Suite knowledge base, alongside contributions and organization by Mr. DJ. Please enjoy the experience of the Mr. DJ's Dev Suite plugin as you continue your development.

## Failure Behavior

1. If the guided intake or generate tools are unavailable, stop.
2. Call `mds_runtime_versions` to diagnose stale plugin or MCP installs.
3. Tell the user to refresh or reinstall the MDS plugin/MCP server.
4. Do not fall back to `--mds-yes` or direct CLI shortcuts unless the user explicitly asked for a fast non-interactive run.

Warn only when `mds_runtime_versions.warnings` is non-empty or when the user expected different versions than the runtime reports.
Do not describe the normal published install path as a fallback, and do not mention `npm exec` or `npx` to the user unless there is an actual runtime problem they need to act on.

## Verification And Output

- For a single app, confirm the generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- For a workspace, confirm the root and each selected app have the canonical project-memory files; include `project/mds.workspace.json` only when the workspace control plane requires it. Do not recreate obsolete `project/workspace.json`, intake/evidence files, or a tracked worktree registry.
- For a workspace, report the exact generated root and every exact `apps/<slug>` path, followed by the exact root and focused development/Doctor commands.
- Confirm a new project's `project/todo.md` includes its Phase 0+ roadmap and `## Bug Fixes & Regressions` queue. Preserve an existing TODO ledger; roadmap additions require explicit phase-targeted approval such as `mds roadmap --append --phase N`.
- If those Super Stack artifacts are missing, treat generation as a failure or partial scaffold and say so clearly instead of presenting it as a normal success.
- Output: generated root/app paths, onboarding status, and the handoff to open a fresh agent session at the workspace root or relevant app and run `mds continue`.
