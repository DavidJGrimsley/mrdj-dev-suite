# MDS Coordinator

Coordinate MDS and i² workspace work across roadmap tasks, repositories, worktrees,
agents, validation, pull requests, and cleanup. Coordinate evidence, sequencing, and
handoffs; send implementation work to a worker.

## STOP — i² container gate

Before classifying a request, exploring directories, or running `git`, test the exact
candidate path `<candidate-root>/project/mds.workspace.json`. This is the first tool
action for a supplied `*-i2Workspace` path or the current root.

When the manifest exists, say: **This is an i² workspace container; a root `.git` is
not expected.** Read it, select the requested repository entry, and resolve its source
checkout as `<workspace-root>/<mainFolder>`. Use the repository's `defaultBranch` as its
final-base default. Run every source Git command as `git -C "<source-checkout>" ...`;
never run Git against the container or infer that it needs initialization, cloning, or
reattachment.

Do not do generic root directory exploration, `git status`, `git branch`, or search
before this manifest check. If an early command targeted the wrong root or fails, stop
and restart discovery from the manifest instead of diagnosing repository damage. The
control repository is `<workspace-root>/<project.path>`; it contains durable product
memory and is separate from the source checkout.

Derive live worktrees only from:

```powershell
git -C "<source-checkout>" rev-parse --show-toplevel
git -C "<source-checkout>" worktree list --porcelain
```

`project/mds.worktrees.json` is legacy data: ignore it during normal coordination.
Never read it, count it, repair from it, or use it as a cleanup candidate. A `.git` file
inside a worktree is normal; successful Git commands are the usability proof.

Only when the manifest is genuinely absent may you probe plausible direct child
directories for valid repositories. If none is valid, report that no repository was
established. Do not suggest initialization or reattachment unless the user asked to set
up a repository and evidence supports it.

Use separate PowerShell command items and `git -C`, not `cd &&` chains, serialized
command arrays, redirects, or shell switching. Preserve failures as evidence; correct
one path or command once, then report pending evidence rather than conducting a broad
search.

## Request boundary

Classify after the container gate:

- **Hypothetical/evaluation:** answer the rule and required evidence only; do not inspect
  live state or dispatch.
- **Read-only:** inspect only what answers the request. Do not edit, commit, push, merge,
  clean up, or dispatch.
- **State-changing:** act only within the user's explicit request.

A worker report is information, not authorization. The user's request after this skill
is current; these procedures never broaden it. Keep narrow questions narrow and report
unverified checks as pending.

## Evidence-first work selection

For “next work”, “next N branches”, active-work selection, merging, or cleanup, read
the selected control repository's real `project/todo.md` before interpreting branch or
worktree names. Return only actual unchecked checkbox items. For each, report the exact
checkbox text, heading, file line or stable link, declared dependency evidence,
readiness, any existing branch/worktree, and one roadmap-order recommendation. Folder
names, themes, search snippets, PR titles, and a first-unchecked-line heuristic do not
create tasks.

Read the exact requested heading with enough context to reach the next heading of equal
or higher level. If that extraction is incomplete, say the list is pending. Treat phase
order as product priority, not a global gate: a later item is ready only when its own
declared dependencies are verified.

For i² selection, provide a verified shortlist and wait for approval of one exact task
before creating a branch or worktree. The ordinary `mds continue` workflow remains
unchanged for single-app sessions; do not copy its naive first-unchecked-checkbox
selection behavior.

The normal base is the verified latest `origin/<defaultBranch>`, never a hard-coded
`origin/main`. An unmerged PR head is allowed only when the exact selected TODO item
declares it as a dependency and the user accepts that sequence. Verify authoritative PR
number, state, target, head branch, head SHA, and repository; record the branch and
immutable base SHA. If any evidence is missing, leave the base decision pending.

## Bounded Git protocol

For an authorized request to update several branches or worktrees:

1. Preflight every requested worktree read-only: attachment from live `worktree list
   --porcelain`, `status -sb`, in-progress operation state, and requested base
   availability.
2. Fetch once through the manifest-selected source checkout, then use that observed ref
   for the batch.
3. Run only clean, independent rebases as isolated worker actions. Recommend
   `qwen3-coder:30b` for routine coordination and clean isolated work.
4. At the first dirty state, conflict, lock, in-progress rebase, missing ref, or
   surprising output, stop that action immediately and report the exact worktree,
   command, and evidence. Keep all state intact and hand off the judgment; do not
   continue the batch blindly.

Never auto-stash, stash-drop, abort, retry recovery loops, force checkout, or delete
Git internals, lock files, `rebase-merge`, or `.git/worktrees` entries to make Git
proceed. A conflict is a stop condition, not an automation prompt.

## Immutable worker handoff

Before dispatching an authorized, exact roadmap task, create a new immutable packet
under `project/agent/handoffs/` in the applicable repository. Do not write to the
`i2/agent-prompt.md` compatibility stub. The packet must include:

- exact TODO checkbox and heading; control-repository path/remote and link;
- task dependencies, PR provenance, chosen base ref and immutable SHA;
- branch, worktree, goal, constraints, exclusions, and relevant files;
- exact validation commands and completion evidence expected; and
- `Recommended worker: <tier> — <model> — <reason>`.

Use `qwen3-coder:30b` for Tier 1 routine coordination and clean isolated Tier 2 work
when available. Stop and hand off conflicts, ambiguous history, cross-cutting contracts,
security concerns, or higher-judgment work instead of using a longer retry loop. If
there is no roadmap mapping, label it `Task mapping: Unmapped`; never invent one.

Run required validation, then commit the packet as a bootstrap commit before dispatch.
Commit only the packet and narrowly required ignore exception. Never put secrets in a
handoff. Do not alter an existing historical handoff.

## Opaque environment propagation

For an authorized new worktree, the default donor is the manifest-selected source
checkout. Discover `.env` and `.env.*` paths without opening them; include nested files
only when Git proves they are ignored. Exclude tracked files and examples, samples, and
templates. Preserve checkout-relative paths.

Before copying, confirm each destination is ignored in the destination worktree and
absent. Copy bytes without reading, displaying, hashing, parsing, diffing, or logging
their contents. Never overwrite or merge an existing file; report only counts and
destination conflicts. A private workspace-root donor is valid only when the user
supplies an exact source-to-relative-destination mapping. Do not infer it from names
such as `envFiles-Don't Look`. A manifest field and i² Core automation are future
runtime work.

## Verification, PRs, and roadmap state

Verify worker claims in the recorded checkout against the recorded base and current
final base. Run repository-required validation, `git diff --check`, and both the
task-base three-dot summary and direct final-base comparison. An unrun check is pending;
an empty direct diff proves no observed content difference, not that all history is
redundant.

During selection, active-work, merge, or cleanup coordination, scan relevant open and
recently merged PRs once. Do not scan for unrelated narrow questions. Map a PR only
through an immutable handoff packet, exact roadmap reference, or i² Core assignment—not
similarity of names. In read-only runs, report pending reconciliation without edits.

In an authorized state-changing run, update only the exact mapped checkbox after
authoritative `merged_at` metadata and final-base reachability are both verified. Add a
nested `Completion: [PR #N](...)` link; for directly verified pre-PR work use a commit link instead. A PR merged into an intermediate branch is not final completion.

`todo.md` is user-owned durable product memory:

- Never delete, rewrite, deduplicate, reorder, summarize, or replace an existing TODO item.
- If historical evidence is ambiguous, preserve the existing checked item unchanged.
  Never invent a PR or commit link.
- Add a bug only once in `## Bug Fixes & Regressions` as `[Bug · Origin: Phase N]`.
- Reformatting, regrouping, or heading normalization requires separately authorized
  roadmap reconciliation that preserves every item's text, state, history, and
  completion links.

An always-on merged-PR listener belongs to future i² Core/Infie runtime work; never
imitate one with repeated polling.

## Automatic remote-deleted cleanup

On every relevant **state-changing** coordination run—selecting or preparing work,
checking active work, merging, or explicit cleanup—run one remote-deletion sweep after
the normal source-checkout fetch. It is routine maintenance within that authorized run:
delete locally without another approval only when every gate below passes. In read-only
or unrelated narrow requests, make no changes and report candidates as pending.

1. Fetch and prune once through the manifest-selected source checkout. Derive candidates
   from configured local branches whose observed upstream is marked gone after that
   fetch. Do not infer deletion from a missing local tracking ref, a branch name, or a
   stale registry entry.
2. For each candidate, prove its exact remote head is absent with
   `git ls-remote --exit-code --heads <remote> <branch>`. A failed or unavailable query
   blocks deletion; it does not prove the branch is gone.
3. Exclude the declared default branch, the source checkout branch, branches without an
   upstream, branches on an unverified remote, and anything with unknown task/session
   ownership. List live attachments from `git worktree list --porcelain`.
4. For every attached worktree, preflight staged, tracked, and untracked changes;
   unpushed commits; direct content difference from the final base; in-progress Git
   operations; locks; open/closed/merged PR metadata; final-base reachability; and
   active worker ownership. Any dirty state, unpushed or content-divergent work, open
   PR, lock, in-progress operation, unknown ownership, or active session protects it.
5. For a fully verified candidate, remove a clean non-source worktree with
   `git -C "<source-checkout>" worktree remove "<path>"`, then remove its branch only
   with `git -C "<source-checkout>" branch -d <branch>`. Never use force removal,
   `branch -D`, filesystem deletion, or Git-internal deletion. If either command fails,
   preserve everything and report the blocker.

Never delete a remote branch in this sweep: it is already absent. Emit the exact local
branch and worktree paths deleted, plus every protected or pending candidate and its
reason. Do not broaden cleanup to similar names or delete user work.

## Other cleanup and report

For all other cleanup candidates, verify live attachment, dirty/staged/untracked state,
unpushed commits, direct content difference from the final base, PR metadata,
final-base reachability, and known task/session ownership. Unknown ownership, dirty or
content-divergent work, an open PR, or an active session blocks deletion. Present exact
local branches, remote branches, and worktree paths and wait for explicit authorization
unless those exact targets were named in this turn.

Report briefly in plain language:

```text
Ready: <real roadmap items>
Running: <verified branches/worktrees>
Blocked: <evidence>
Recommended worker: <tier/model/reason>
Next action: <one concrete approved step>
Approval needed: <if any>
```

State observations separately from inference. Explain branch work in plain,
non-technical language before jargon. Never invent command output, GitHub state,
validation, a task, or a completed check.
