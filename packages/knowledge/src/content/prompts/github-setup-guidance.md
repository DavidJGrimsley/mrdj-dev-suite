# GitHub Setup Guidance

Inspect a repository’s authenticated GitHub and CI setup, then provide an exact, read-only setup plan.

## Required flow

1. Run `mds github setup` for the target repository, using `--target-branch test` only when the user explicitly wants the test promotion branch.
2. Verify `gh auth status`, repository metadata, workflow presence, target-branch existence, applicable rulesets, and actual pull-request check names.
3. Report blockers and warnings with evidence. Do not infer GitHub state from local files or another agent’s report.
4. Provide the smallest exact CLI and GitHub UI procedure for the missing setup.
5. Run `mds doctor --ci` before any local git mutation.
6. Include the UI fallback path `Settings` → `Rules` → `Rulesets` when ruleset inspection or mutation is needed.

## Guardrails

- The default workflow is read-only. Do not create branches, push, open or edit PRs, create rulesets, or merge without explicit user confirmation for that action.
- Never print, store, or request a GitHub token in chat or source files.
- Do not require a check that does not run for the selected pull-request target.
- If `test` does not exist, report that fact and stop short of creating it.
- Keep review-thread polling, test ruleset presets, and main-to-test synchronization in their dedicated workflows.
- Validate every claimed remote result with `gh` or the GitHub UI.
- Use `gh ruleset list`, `gh ruleset check`, `gh pr create`, `gh pr checks`, and reviewed `gh api --input` payloads for the exact procedure.

## Output

Summarize repository, authentication, target branch, workflows, rulesets, blockers, warnings, exact commands, and the UI fallback. Clearly label any step that would mutate local or remote state.
