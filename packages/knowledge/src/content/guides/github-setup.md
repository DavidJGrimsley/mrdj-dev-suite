# GitHub Setup Guidance

Use this guide when a repository needs a small, authenticated GitHub or CI setup change.

## Start with read-only discovery

From the repository checkout, run:

```bash
mds github setup --json
gh auth status --hostname github.com
gh repo view --json nameWithOwner,defaultBranchRef,url,viewerPermission
gh ruleset list
gh ruleset check main
```

`mds github setup` reports the authenticated session, repository metadata, target branch, Actions workflows, rulesets, blockers, warnings, and a safe command recipe. It never creates a branch, pushes commits, opens a pull request, or changes a ruleset.

Use `--target-branch test` when the repository has a test branch. If the report says that `test` is missing, stop and confirm the intended promotion model before creating it.

## Read the recommendations

The report distinguishes repository facts from recommendations. A dynamic Copilot workflow is automation, not project CI. A repository with no project `pull_request` workflow, no observed status checks, no ruleset for the target branch, or an open PR with no checks should receive a specific recommendation and an exact read-only inspection command.

Treat these as warnings, not automatic mutations:

- Add or repair a project workflow with `pull_request` for the selected target branch.
- Run the workflow and use the exact check names it reports before requiring checks in a ruleset.
- Review `Settings` → `Rules` → `Rulesets` when no ruleset applies to the target branch.
- Inspect every unchecked PR with `gh pr checks <number> --watch` before treating it as CI-ready.

## Initial CI pull request

Run Doctor before any local git mutation:

```bash
mds doctor --ci
git status --short
git diff --check
```

After reviewing and staging only intentional files, create or update the PR explicitly:

```bash
git push --set-upstream origin <feature-branch>
gh pr create --base <target-branch> --head <feature-branch> --title "<title>" --body-file <body-file>
gh pr checks <number> --watch
```

Do not merge or enable automatic merging without a separate confirmation. For a failed check, inspect its logs, fix locally, rerun `mds doctor --ci`, push the fix, and poll again.

## Branch rulesets

In the GitHub UI, open `Settings` → `Rules` → `Rulesets` → `New branch ruleset`. Target the exact branch ref, enable deletion and force-push protection, require a pull request where human review is desired, and require only checks that actually run for pull requests.

For this repository’s current CI, the pull-request job checks are `doctor` and `packages`. The `release` workflow runs on `main` pushes and should not be required for ordinary pull requests.

Inspect and validate a ruleset from the CLI with:

```bash
gh ruleset list --repo <owner>/<repo>
gh ruleset check <target-branch> --repo <owner>/<repo>
```

If the ruleset payload has been reviewed and the user explicitly approves the remote mutation, apply it with the GitHub API:

```bash
gh api repos/<owner>/<repo>/rulesets --input <ruleset-payload.json>
```

Keep the payload in a reviewed file. Do not paste tokens into shell history or commit secrets.

## Workflow trigger warning

When a workflow uses `pull_request.branches`, the branch filter applies to the PR target branch. A required check whose workflow is skipped can remain pending and block the PR. Include the intended target branch in the workflow trigger, or do not mark that check as required for the target.

## UI fallback

If `gh` is unavailable or cannot authenticate:

1. Open the repository on GitHub and confirm `Settings` → `Actions` → `General` permits the required actions.
2. Open `Actions` and confirm the CI workflows have successful pull-request runs.
3. Open `Settings` → `Rules` → `Rulesets` and review the rules that apply to the target branch.
4. Open the pull request and confirm the required checks and merge restrictions in the merge box.

Never treat a worker report as proof that a workflow, branch, ruleset, or PR exists; verify it in GitHub or with `gh`.
