# Post-Create Expo Onboarding

MrDJ onboarding runs after `rn-new`, `create-expo-app`, or another generator has
created an Expo project.

## Flow

1. Detect package manager, Expo SDK, Expo Router, app directory, aliases, and
   styling stack.
2. Ask what the app is for, who it serves, primary flows, data needs, and
   deployment target.
3. Offer defaults as explicit choices: project memory docs, Uniwind, Zustand,
   Supabase, Drizzle, API routes, MCP/Codex/Claude instructions, and CI.
4. Scaffold only selected pieces.
5. Run Doctor after scaffolding.

## Defaults

- Prefer Uniwind and Tailwind v4 for new projects.
- Keep route files thin and move business logic into features, services, hooks,
  and utilities.
- Always add `project/info.md`, `project/todo.md`, and `project/style.md` when
  project memory is selected.

