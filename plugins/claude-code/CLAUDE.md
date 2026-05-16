# MrDJ Dev Suite — Claude Code Instructions

> Paste or merge the relevant sections of this file into your project's `CLAUDE.md`.

## MDS MCP tools available

When the `mrdj-dev-suite` MCP server is connected (check `/mcp`), you have access to:

| Tool | Use it when |
|------|-------------|
| `doctor_scan_project` | Auditing an Expo project for errors and warnings |
| `doctor_scan_file` | Reviewing a single file for architecture/rule violations |
| `doctor_explain_result` | Getting a plain-English explanation of a Doctor finding |
| `get_skill` | Loading a full skill document by ID (e.g. `expo-router-architecture`) |
| `get_guide` | Loading a guide by ID (e.g. `animation-performance`) |
| `knowledge_list_resources` | Listing all available skills, guides, rules, and patterns |
| `generate_setup_tasks` | Generating a phase-ordered task list for a new Expo app |
| `continue_project` | Continuing work from `project/todo.md` in an existing app |

## When to run Doctor

- Before every `git commit` — run `doctor_scan_project` (or `mrdj doctor --fast` in terminal). Fix all errors before committing; warnings are acceptable.
- Before starting a new phase of development — resolve all errors first.

## Dev server rule

Always start Expo with `mrdj clear-expo-start <project-path>`. Never use bare `expo start`, `npx expo start`, or `pnpm exec expo start`. This command frees port 8081, clears all caches, and starts with `--clear`.

## Slash commands

This project has MDS slash commands installed in `.claude/commands/`:

| Command | What it does |
|---------|-------------|
| `/run-doctor` | Run MDS Doctor and get a prioritized issue summary |
| `/review-expo-project` | Full project review: Doctor + architecture + SSR + env skills |
| `/prepare-deploy` | Pre-deploy checklist using the deployment skill |
| `/fix-seo` | SEO and metadata gap analysis and fixes |
| `/create-expo-super-stack` | Guided `create-expo-super-stack` session |
| `/continue-development` | Pick and start the next task from `project/todo.md` |
| `/research-plan` | Turn raw notes or ideas into canonical `project/info.md` |

## Project memory

Keep these files as the source of truth for agent context:

- `project/info.md` — product goals, user needs, tech decisions
- `project/todo.md` — phase-ordered task list
- `project/style.md` — visual/UI conventions (no technical rules here)
- `project/guidelines.md` — technical rules and agent behavior for this specific project
