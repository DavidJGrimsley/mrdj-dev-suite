# /retrospective-project-onboarding

Finish onboarding an existing migrated project after `mds workspace init` generated draft project memory.

## Arguments

- `projectPath`: initialized app checkout path, usually `<app>-i2Workspace/<app>-main`.

## Workflow

1. Read `project/onboarding-evidence.md`, `project/info.md`, `project/style.md`, `project/guidelines.md`, and `project/todo.md` from the workspace control repository.
2. Verify generated claims against the app checkout before treating them as project truth.
3. Find every unresolved `# TodoForContext(optional):` marker and ask the UD focused questions, one at a time.
4. Write confirmed answers into the relevant project memory section and remove the marker line.
5. Do not invent mission, target audience, product goals, monetization, release intent, or component strategy from code alone.
6. After all markers are gone, run `mds roadmap`, then `mds continue`, and propose the next implementation slice.

## Guardrails

- Project memory is authoritative only after UD confirmation.
- Keep this workflow project-only unless the UD explicitly asks for app-source changes.
- Do not run full `mds onboard` scaffolding from this workflow.
