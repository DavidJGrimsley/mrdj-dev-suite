# /create-expo-super-stack

Create a new Expo app with the MDS Super Stack flow, using callable MDS MCP tools as the guided intake surface and the Super Stack generator as the scaffold source of truth.

## Arguments

- `parentDir`: folder where the new app directory should be created.
- `appName`: app folder name.

## Required MDS MCP Tool Flow

1. Call `mds_runtime_versions` first to inspect the active runtime and invocation path.
2. If the user pasted or attached `info.md` / project memory, call `create_expo_super_stack_resolve_info` once with `parentDir`, `appName`, `infoMarkdown`, optional `styleMarkdown`, and any explicit user overrides.
3. Treat the resolver `answers` object as the canonical accumulated answers object.
4. Ask exactly one question per turn only for `missingQuestionIds` or `ambiguousQuestionIds`.
5. Do not restart intake with one answer at a time after a successful resolve call.
6. If no `info.md` is available, fall back to `create_expo_super_stack_intake_step` and always pass the full accumulated `answers` object.
7. When the resolver returns `confirm`, summarize `summaryLines` and ask the user for one final confirmation.
8. After explicit confirmation, print the waiting message below, then call `create_expo_super_stack_generate` with the resolver `generateInput` and `confirmed: true`.

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

- Confirm generated app has `project/info.md`, `project/todo.md`, `project/style.md`, and `project/guidelines.md`.
- Confirm `project/todo.md` includes the auto-derived roadmap generated from normalized `project/info.md`.
- If those Super Stack artifacts are missing, treat generation as a failure or partial scaffold and say so clearly instead of presenting it as a normal success.
- Output: generated app path, onboarding status, and the handoff to open a fresh agent session inside the new app folder and run `mds continue`.
