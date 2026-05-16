Start a guided `create-expo-super-stack` session to scaffold a new Expo app.

1. Call `get_skill` with `super-stack-startup` to load the MDS Super Stack startup skill.
2. Follow the skill's intake questions to understand what the app is for, who it serves, core flows, and deployment target.
3. Recommend a `create-expo-super-stack` command with appropriate flags based on the user's answers.
4. After the user runs the command (or confirm they want you to run it), call `generate_setup_tasks` via MCP to produce a phase-ordered `project/todo.md` for the new app.
5. Walk the user through the post-create steps: review the exposition pages, read `project/info.md`, and confirm the first phase to build.

Run this command from the parent directory where the new app should be created.
