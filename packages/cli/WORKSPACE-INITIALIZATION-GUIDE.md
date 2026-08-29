# Workspace Initialization Guide

`mds workspace init` gives Infie one safe workflow for moving an existing Git repository and all of its active worktrees into a standard I² workspace.

## Safe workflow

Always inspect first:

```bash
mds workspace init .
```

The plan lists every worktree, dirty checkout, stale registration, destination path, inferred control repository, legacy `project/` file it will seed, and whether retrospective onboarding will generate or fill missing project memory. Planning changes nothing.

Apply only after the plan is correct:

```bash
mds workspace init . --apply --yes
```

The default workspace name comes from the source repository's `origin` name, not the current checkout folder. For example, a checkout in `C:\work\scratch` with origin `github.com:example/actual-product.git` becomes `actual-product-i2Workspace/actual-product-main`. Use `--workspace-name` only when the UD intentionally wants a different visible workspace name.

Before Infie applies an initialization plan, she must ask the UD where the workspace root should live. The default suggestion is beside the source checkout; use `--workspace-parent <parent>` when the UD wants a clean shared parent, for example `mds workspace init . --workspace-parent F:\SoftwareDev`. That produces `F:\SoftwareDev\actual-product-i2Workspace`. `--workspace-root` remains the escape hatch for an exact full destination; do not combine it with `--workspace-parent`.

For GitHub source remotes, apply creates `<source-repo>-project` through the GitHub CLI if the control repository does not already exist. The control repository is always created as **private**, even when the source repository is public. If UD provides a specific control repo, pass it explicitly with `--project-remote git@github.com:example/app-project.git`.

If a checkout has intentional local changes, add `--stash`. This creates named Git stashes before any worktree is moved. Without that explicit flag, an apply refuses dirty repositories.

On Windows, an apply started from a checkout that must move automatically hands off to a safe helper process outside the affected worktrees. The helper waits for the initiating process to release its working directory before moving anything. If the CLI runtime itself is inside a worktree that will move, use an installed MDS CLI or an isolated runner outside the repository.

Initialization never installs or repairs package dependencies. A moved checkout may need an explicit, user-requested dependency repair afterwards; that is separate from workspace initialization.

## Result

The resulting root is `<name>-i2Workspace/` unless `--workspace-root` overrides it:

```text
<name>-i2Workspace/
  project/                 # remote-backed coordination repository
    info.md
    todo.md
    style.md
    guidelines.md
    intake-agent.md
    onboarding-evidence.md
    mds.workspace.json
    mds.worktrees.json
  <name>-main/             # default branch checkout
  <name>-<branch>/         # every healthy feature checkout
  temp/                    # local reference material
  generated/               # requested agent deliverables
```

Feature checkouts are never relabeled as main. If the source checkout is on a feature branch, it is preserved under its feature name and a clean default-branch main checkout is created.

If the source app has no legacy `project/` folder, `workspace init --apply --yes` runs retrospective project onboarding before committing the control repo. It reads README, package scripts/dependencies, Expo Router routes, config/data/backend files, local branches, and Git history, then creates draft project memory. Human-only or ambiguous product details stay marked with `# TodoForContext(optional):` so the UD can confirm the generated brain before implementation work.

If legacy project memory exists, init preserves existing files and only fills missing project-memory/evidence/handoff files. To rerun the safe project-only pass later, use:

```bash
mds onboard --retrospective --project-only --yes --project /path/to/<app>-i2Workspace/<app>-main
```

This mode only writes the workspace control repository. It does not edit app source, install dependencies, add routes, or run rich onboarding scaffolds.

## Recovery and rollback

An apply repairs prunable Git registrations, moves linked worktrees through Git, then repairs the primary checkout after its local move. Each move is recorded in a temporary journal. If a move fails, initialization reverses completed moves; if rollback cannot finish, the journal remains for recovery. A recognizable partial workspace can be resumed, but unknown files or destination collisions block apply.

Git moves are reversible with `git worktree move`. Intentional local changes are recoverable with `git stash list` and `git stash pop`. Do not delete a partial workspace root; use the reported status to repair it. Doctor also reports missing required project memory and unresolved `# TodoForContext(optional):` markers so a generated retrospective draft cannot masquerade as confirmed project truth.

## Infie invocation

Infie should call the planning form first and only invoke the apply form after it has surfaced the plan. `--apply --yes` authorizes creation, commit, and push of the required control repository. Ask for the workspace parent first, then use `--workspace-parent`; use `--workspace-root` only for an exact exceptional destination.
