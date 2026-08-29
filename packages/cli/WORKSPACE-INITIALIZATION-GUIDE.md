# Workspace Initialization Guide

`mds workspace init` gives Infie one safe workflow for moving an existing Git repository and all of its active worktrees into a standard I² workspace.

## Safe workflow

Always inspect first:

```bash
mds workspace init /path/to/app-main
```

The plan lists every worktree, dirty checkout, stale registration, destination path, inferred control repository, legacy `project/` file it will seed, and whether retrospective onboarding will generate or fill missing project memory. Planning changes nothing.

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

An apply repairs prunable Git registrations, moves linked worktrees through Git, then repairs the primary checkout after its local move. If a command is interrupted, run `mds workspace status <workspace-root>` or `mds workspace doctor <workspace-root>` to see missing links, registry entries, or normalized paths before retrying.

Git moves are reversible with `git worktree move`. Intentional local changes are recoverable with `git stash list` and `git stash pop`. Do not delete a partial workspace root; use the reported status to repair it. Doctor also reports missing required project memory and unresolved `# TodoForContext(optional):` markers so a generated retrospective draft cannot masquerade as confirmed project truth.

## Infie invocation

Infie should call the planning form first and only invoke the apply form after it has surfaced the plan. `--apply --yes` authorizes creation, commit, and push of the required control repository. Use `--workspace-name` and `--workspace-root` for shared parent folders whose Git checkout name is not the desired workspace name.
