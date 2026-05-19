# Mr. DJ's Dev Suite - Claude Code Instructions

This file is merged by `mds agent install --client claude` into either a project `CLAUDE.md` or user `~/.claude/CLAUDE.md`.

## MDS MCP Tools Available

When the `mr-djs-dev-suite` MCP server is connected (check `/mcp`), use these tools before falling back to terminal commands:

| Tool | Use it when |
|------|-------------|
| `list_skills` | Listing available MDS skills and summaries |
| `doctor_scan_project` | Auditing an Expo project for errors and warnings |
| `doctor_scan_file` | Reviewing one file for architecture, env, SSR, API, or route issues |
| `doctor_explain_result` | Getting a plain-English explanation of a Doctor finding |
| `generate_refactor_plan` | Planning a refactor with Doctor findings and related MDS knowledge |
| `generate_deploy_checklist` | Creating a target-aware release checklist |
| `get_skill` | Loading a full skill document by ID, such as `expo-router-architecture` |
| `get_guide` | Loading a guide by ID, such as `animation-performance` |
| `knowledge_list_resources` | Compatibility alias for listing skills, guides, rules, and patterns |
| `generate_setup_tasks` | Generating a phase-ordered task list for a new Expo app |
| `continue_project` | Continuing work from `project/todo.md` in an existing app |

## MDS Agent

The project includes a Claude Code custom agent at `.claude/agents/mds.md` after install. Use it for Doctor scans, project review, onboarding, deployment readiness, refactor planning, and phase-based continuation.

## When To Run Doctor

- Before every `git commit`, run `doctor_scan_project` or `mds doctor --fast` in the terminal.
- Before starting a new phase of development, resolve all Doctor errors first.
- Before release/client handoff, run `generate_deploy_checklist` and then fix any blocking Doctor errors.

## Dev Server Rule

Always start Expo with `mds clear-expo-start <project-path>`. Never use bare `expo start`, `npx expo start`, or `pnpm exec expo start`. This command frees port 8081, clears caches, and starts with `--clear`.

## Slash Commands

This project has MDS slash commands installed in `.claude/commands/`:

| Command | What it does |
|---------|-------------|
| `/run-doctor` | Run MDS Doctor and get a prioritized issue summary |
| `/review-expo-project` | Full project review: Doctor plus architecture, SSR, and env skills |
| `/prepare-deploy` | Pre-deploy checklist using deployment skills and MCP tools |
| `/fix-seo` | SEO and metadata gap analysis and fixes |
| `/create-expo-super-stack` | Guided `create-expo-super-stack` session |
| `/continue-development` | Pick and start the next task from `project/todo.md` |
| `/research-plan` | Turn raw notes or ideas into canonical `project/info.md` |

## Project Memory

Keep these files as the source of truth for agent context:

- `project/info.md` - product goals, user needs, tech decisions
- `project/todo.md` - phase-ordered task list
- `project/style.md` - visual/UI conventions only
- `project/guidelines.md` - technical rules and project-specific agent behavior

