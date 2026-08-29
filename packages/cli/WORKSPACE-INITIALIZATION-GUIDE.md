# Workspace Initialization Guide

`mds workspace init` gives Infie one safe workflow for moving an existing Git repository and all of its active worktrees into a standard I² workspace.

## Safe workflow

Always inspect first:

```bash
mds workspace init /path/to/app-main
```

The plan lists every worktree, dirty checkout, stale registration, destination path, inferred control repository, and legacy `project/` file it will seed into the new control repository. Planning changes nothing.

Apply only after the plan is correct:

```bash
mds workspace init /path/to/app-main --apply --yes
```

For GitHub source remotes, apply creates `<source-repo>-project` through the GitHub CLI if the control repository does not already exist. It matches the source repository visibility when GitHub reports it and otherwise creates the control repo as private. If UD provides a specific control repo, pass it explicitly with `--project-remote git@github.com:example/app-project.git`.

If a checkout has intentional local changes, add `--stash`. This creates named Git stashes before any worktree is moved. Without that explicit flag, an apply refuses dirty repositories.

## Result

The resulting root is `<name>-i2Workspace/` unless `--workspace-root` overrides it:

```text
<name>-i2Workspace/
  project/                 # remote-backed coordination repository
    mds.workspace.json
    mds.worktrees.json
  <name>-main/             # default branch checkout
  <name>-<branch>/         # every healthy feature checkout
  temp/                    # local reference material
  generated/               # requested agent deliverables
```

Feature checkouts are never relabeled as main. If the source checkout is on a feature branch, it is preserved under its feature name and a clean default-branch main checkout is created.

## Recovery and rollback

An apply repairs prunable Git registrations, moves linked worktrees through Git, then repairs the primary checkout after its local move. If a command is interrupted, run `mds workspace status <workspace-root>` or `mds workspace doctor <workspace-root>` to see missing links, registry entries, or normalized paths before retrying.

Git moves are reversible with `git worktree move`. Intentional local changes are recoverable with `git stash list` and `git stash pop`. Do not delete a partial workspace root; use the reported status to repair it.

## Infie invocation

Infie should call the planning form first and only invoke the apply form after it has surfaced the plan. `--apply --yes` authorizes creation, commit, and push of the required control repository. Use `--workspace-name` and `--workspace-root` for shared parent folders whose Git checkout name is not the desired workspace name.
