# Workspace Initialization Guide

`mds workspace init` gives Infie one safe workflow for moving an existing Git repository and all of its active worktrees into a standard I² workspace.

## Safe workflow

Always inspect first:

```bash
mds workspace init .
```

The plan lists every live Git worktree, dirty checkout, prunable Git registration, destination path, inferred control repository, canonical legacy `project/` file it will seed, and whether retrospective onboarding will generate or fill missing project memory. Planning changes nothing.

Apply only after the plan is correct:

```bash
mds workspace init . --apply --yes
```

The default workspace name comes from the source repository's `origin` name, not the current checkout folder. For example, a checkout in `C:\work\scratch` with origin `github.com:example/actual-product.git` becomes `actual-product-i2Workspace/actual-product-main`. Use `--workspace-name` only when the UD intentionally wants a different visible workspace name.

Before Infie applies an initialization plan, she must ask the UD where the workspace root should live and show the resulting path. The CLI accepts any `--workspace-parent <workspace-parent>`; it contains no machine-specific destination. The bare CLI keeps its source-parent fallback for compatibility, but Infie must not apply that fallback without the UD acknowledging it. `--workspace-root` remains the escape hatch for an exact full destination; do not combine it with `--workspace-parent`.

For GitHub source remotes, apply creates `<source-repo>-project` through the GitHub CLI if the control repository does not already exist. The control repository is always created as **private**, even when the source repository is public. If UD provides a specific control repo, pass it explicitly with `--project-remote git@github.com:example/app-project.git`.

If a checkout has intentional local changes, add `--stash`. This creates named Git stashes before any worktree is moved. Without that explicit flag, an apply refuses dirty repositories.

On Windows, an apply started from a checkout that must move automatically hands off to a safe helper process outside the affected worktrees. The helper waits for the initiating process to release its working directory before moving anything. If the CLI runtime itself is inside a worktree that will move, use an installed MDS CLI or an isolated runner outside the repository.

Initialization never installs or repairs package dependencies. A moved checkout may need an explicit, user-requested dependency repair afterwards; that is separate from workspace initialization.

To move an existing normalized workspace, use a relocation plan from an external CLI runtime:

```bash
mds workspace relocate . --workspace-parent <workspace-parent> --include-auxiliary <directory>
mds workspace relocate . --workspace-parent <workspace-parent> --include-auxiliary <directory> --apply --yes
```

Only named auxiliary directories move with the generic workspace folders. Relocation journals every move, uses Git for linked worktrees, repairs the primary checkout last, and rolls completed moves back on failure.

Every initialization inventories the four tracked canonical legacy `project/` files from each active worktree. To merge clean differences into the control repository and create a dedicated source cleanup PR that removes only those canonical source files, add `--consolidate-legacy-project --apply --yes`. Conflicts block that cleanup; one-time evidence, handoff, and registry artifacts remain in place for manual archival.

## Result

The resulting root is `<name>-i2Workspace/` unless `--workspace-root` overrides it:

```text
<name>-i2Workspace/
  project/                 # remote-backed coordination repository
    info.md
    todo.md
    style.md
    guidelines.md
    mds.workspace.json
  <name>-main/             # default branch checkout
  <name>-<branch>/         # every healthy feature checkout
  temp/                    # local reference material and review packets
    onboarding/
      retrospective-review.md
  generated/               # requested agent deliverables
```

Feature checkouts are never relabeled as main. If the source checkout is on a feature branch, it is preserved under its feature name and a clean default-branch main checkout is created.

If the source app has no legacy `project/` folder, `workspace init --apply --yes` runs retrospective project onboarding before committing the control repo. It reads README, package scripts/dependencies, Expo Router routes, config/data/backend files, local branches, and Git history, then creates draft project memory and `temp/onboarding/retrospective-review.md`. The review packet is temporary local evidence and handoff guidance, not committed control-repo truth. Human-only or ambiguous product details stay marked with `# TodoForContext(optional):` so the UD can confirm the generated brain before implementation work.

If legacy project memory exists, init copies only the four canonical Markdown files (`info.md`, `todo.md`, `style.md`, and `guidelines.md`) and fills any missing canonical files. Existing one-time evidence, handoff, and worktree-registry artifacts are left untouched in their original location for manual review or archival. To rerun the safe project-only pass later, use:

```bash
mds onboard --retrospective --project-only --yes --project /path/to/<app>-i2Workspace/<app>-main
```

This mode writes only missing control-repository memory and a temporary local review packet. It does not edit app source, install dependencies, add routes, or run rich onboarding scaffolds.

## Recovery and rollback

An apply repairs prunable Git registrations, moves linked worktrees through Git, then repairs the primary checkout after its local move. Each move is recorded in a temporary journal. If a move fails, initialization reverses completed moves; if rollback cannot finish, the journal remains for recovery. A recognizable partial workspace can be resumed, but unknown files or destination collisions block apply.

Git moves are reversible with `git worktree move`. Intentional local changes are recoverable with `git stash list` and `git stash pop`. Do not delete a partial workspace root; use the reported status to repair it. Status derives current worktrees, branches, and HEADs from Git; a legacy `project/mds.worktrees.json` file is ignored and may be archived after review. Doctor also reports missing required project memory and unresolved `# TodoForContext(optional):` markers so a generated retrospective draft cannot masquerade as confirmed project truth.

## Infie invocation

Infie should call the planning form first and only invoke the apply form after it has surfaced the plan. `--apply --yes` authorizes creation, commit, and push of the required control repository. Ask for the workspace parent first, then use `--workspace-parent`; use `--workspace-root` only for an exact exceptional destination.
