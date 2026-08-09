# I^2 IDE Plan

## Decision
Build the IDE as a new app/shell inside this monorepo, not as a VS Code fork.

Use VS Code as a reference point for editor affordances, but do not make a fork the default product path unless we later decide extension-host compatibility is a hard requirement.

## Why This Is The Right Default
- This repo already has the core platform pieces the IDE would need: CLI, Doctor, knowledge, MCP, onboarding, and generated agent bundles.
- The current `project/todo.md` shows the product is already moving toward an agent-first workflow, so the IDE should sit on top of MDS rather than replace it.
- Your dual-screen design is a better fit for a custom supervisor shell than for a classic code-editor fork.
- The future scope includes multiple frameworks, so the architecture should be adapter-based, not Expo-only.

## What The Design Is Telling Us
- The Figma export is a strong product north star: two primary surfaces, visible agent state, human testing, diffs, sessions, and quick actions.
- The "Blitz mode" idea in `project/todo.md` points to a mother IDE that can fan work out across worktrees and then gather the results back in one place.
- The design should guide layout and workflow, not lock the implementation to the exact export stack.

## What Already Exists In The Repo
- The repo already has a workspace structure and a knowledge system that can be reused instead of rebuilt.
- `packages/knowledge` is already the source of truth for guides, rules, skills, checklists, examples, and prompt metadata.
- `packages/mcp-server` already exposes that knowledge to agents.
- The current work in `project/todo.md` means the platform foundation is mostly in place; the IDE is the next product layer, not the first layer.

## Build Order
1. Build a minimal shell that can open a project/workspace, show the dual-screen layout, and drive the existing MDS tools.
2. Add the session model: project goal, agent messages, tasks, diffs, human test checklist, and workspace state.
3. Add the learning pipeline with append-only capture, redaction, candidate extraction, and human approval.
4. Add worktree orchestration and "Blitz mode" only after the single-workspace flow is stable.
5. Add framework adapters so Expo is first, but not the only supported target.
6. Expand toward multi-project, multi-workspace, and multi-framework support after the core shell proves itself.

## Session Learning Rules
- Never write raw session data straight into canonical repo knowledge.
- Store raw sessions in a private or limbo state first.
- Redact secrets, personal data, and noisy one-off details before anything is eligible for promotion.
- Convert approved learnings into durable knowledge items, then place them into the appropriate repo surface, likely `project/` memory files or `packages/knowledge`.
- Keep rejected items out of canonical knowledge so the repo stays trustworthy.

## Time Estimate
Assuming one focused developer:

- Prototype shell with the dual-screen layout and basic agent wiring: about 4 to 8 weeks full-time, or 2 to 4 months part-time.
- Add the session-to-limbo-to-approval learning loop and initial worktree orchestration: another 4 to 8 weeks.
- Reach a solid multi-framework v1 that feels like a product: about 3 to 6 months total from here if we stay disciplined.
- Reach a broad, polished, "this is the IDE platform" version: closer to 6 to 12 months total, depending on how much VS Code-level parity you want.

## Relative To The Work Already Done
- You are not starting from zero because the MDS platform already exists.
- You are also not "almost done" because the IDE shell, orchestration UI, and learning pipeline are still largely new work.
- In practical terms, the current repo is the foundation; the IDE is likely another major phase that is comparable to, or larger than, the platform work already completed.

## First Milestones
- Define the v1 scope as a custom agentic shell, not a full editor replacement.
- Choose the first supported runtime surface for the IDE.
- Map the Figma design into routes, widgets, and data flows.
- Define the limbo/review schema for session learnings.
- Decide which knowledge surfaces are canonical and which are generated.
- Keep the framework-adapter story explicit from day one so the IDE can grow beyond Expo without becoming messy.
