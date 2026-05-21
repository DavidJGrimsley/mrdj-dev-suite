# StylistCheck Intake Agent Handoff

Use this file when the terminal intake was intentionally concise, generic, or included pre-existing notes that need a real agent conversation.

## Agent Prompt

Read `project/info.md`, `project/style.md`, `project/guidelines.md`, and `project/todo.md`.
If the user said `mds continue`, run `mds continue` first when available and use its session brief as the starting point.
First, search every `project/` file for `# TodoForContext(optional):`. If any markers remain, stop before intake and tell the user to fill the section underneath or delete the marker line to acknowledge no extra context is needed.
Ask conversational follow-up questions until the app plan is clear enough to build phase by phase.
Move any imported notes into the correct canonical sections, preserve useful context, and remove uncertainty only after the user confirms it.
Update `project/todo.md` so Phase 0 through Phase 4 reflect the clarified app, business, data, style, package, and release plan.

## Places To Clarify

- The current onboarding answers still include generic defaults.
- Confirm the target users, first core flow, data model, deployment plan, monetization, and team context.

## No API Keys Required

The public CLI does not require OpenAI, Anthropic, or other provider keys. This handoff is for Codex, Claude, or another agent environment the developer already chose to use.
