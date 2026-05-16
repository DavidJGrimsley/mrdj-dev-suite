# MDS - Claude Code Instructions

> Paste or merge the relevant sections of this file into your project's `CLAUDE.md`.

## MDS MCP tools available

When the `mrdj-dev-suite` MCP server is connected (check `/mcp`), you have access to:

| Tool | Use it when |
|------|-------------|
| `doctor_scan_project` | Auditing an Expo project for errors and warnings |
| `doctor_scan_file` | Reviewing a single file for architecture/rule violations |
| `doctor_explain_result` | Getting a plain-English explanation of a Doctor finding |
| `get_skill` | Loading a full skill document by ID |
| `get_guide` | Loading a guide by ID |
| `knowledge_list_resources` | Listing available skills, guides, rules, checklists, examples, and prompts |
| `generate_setup_tasks` | Generating a phase-ordered setup list for a new Expo app |
| `continue_project` | Continuing work from `project/todo.md` in an existing app |

## When to run Doctor

- Before every `git commit`, run `doctor_scan_project` (or `mrdj doctor --fast`).
- Before each phase shift, clear all blocking Doctor errors first.

## Dev server rule

Start Expo with `mrdj clear-expo-start <project-path>`. Use `mrdj free-port` for targeted port cleanup; `mrdj kill-port` remains a compatibility alias.

## Slash commands

This project has MDS slash commands installed in `.claude/commands/`:

| Command | What it does |
|---------|-------------|
| `/run-doctor` | Run MDS Doctor and get a prioritized issue summary |
| `/review-expo-project` | Full project review: Doctor + architecture + SSR + env skills |
| `/prepare-deploy` | Pre-deploy checklist using deployment guidance |
| `/fix-seo` | SEO and metadata gap analysis and fixes |
| `/create-expo-super-stack` | Guided `create-expo-super-stack` session |
| `/continue-development` | Pick and start the next task from `project/todo.md` |
| `/project-research-plan` | Turn raw notes or ideas into canonical `project/info.md` |
| `/ship-test-loop` | Run the PR-check/fix loop into `test` with up to 5 iterations |

## Project memory

Keep these files as source of truth for project context:

- `project/info.md`
- `project/todo.md`
- `project/style.md`
- `project/guidelines.md`
