# Post-Create Expo Onboarding

MrDJ onboarding runs after `rn-new`, `create-expo-app`, `create-expo-stack`, or
another generator has created an Expo project. `create-expo-super-stack` wraps
that same idea by running `create-expo-stack` first and then applying the MrDJ
onboarding pass.

## Flow

1. Detect package manager, Expo SDK, Expo Router, app directory, aliases, and
   styling stack.
2. Explain project memory first, then ask what the app is for, who it serves,
   primary flows, data needs, and release/deployment intent.
3. Use friendly Clack prompts with visible defaults, helpful explanations, and
   no blank required answers.
4. Derive defaults from selected answers instead of asking for comma-separated
   internal keywords.
5. Offer rich boilerplate by default: project memory docs, exposition pages,
   Uniwind repair for existing apps, Software Mansion core examples, Supabase or
   local data guidance, MCP/Codex/Claude instructions, and CI/release safeguards.
6. Scaffold only selected pieces.
7. Add generated cleanup scripts such as `clear-expo-start` and `kill-port`.
8. Install added dependencies, run `expo install --fix`, install known missing
   Expo peers such as `expo-font` for `@expo/vector-icons`, then run Doctor.

## Defaults

- Prefer Uniwind and Tailwind v4 for new projects.
- Keep route files thin and move business logic into features, services, hooks,
  and utilities.
- Always add `project/info.md`, `project/todo.md`, `project/style.md`, and
  `project/guidelines.md` when project memory is selected.
- Normalize existing `project/info.md` and `project/style.md` into canonical
  sections while preserving unknown content under Imported Notes.
- Add `project/intake-agent.md` when context is thin or imported notes need a
  follow-up agent conversation.
- Keep `project/style.md` visual-only; put technical and agent rules in
  `project/guidelines.md`.
- Treat monorepo-aware scaffolding as a future step after the single-app MVP is
  stable.
