---
mode: "agent"
description: "Run the MDS Push Merge Loop workflow with callable MDS MCP diagnostics and explicit fallback rules."
---

# /push-merge-loop

Execute the short PR iteration loop for the test branch with strict quality gates.

## Goal

Push intentional changes with a meaningful commit message, open/update a PR to `test`, poll for feedback and failed checks, fix issues, and merge to `test` once all checks are green.

## Loop Rules

1. Run `mds doctor --ci` before any git mutation.
2. Stage only intentional files and create a meaningful commit message.
3. Push branch and open or update a PR targeting `test`.
4. Wait about 2 minutes, then begin polling. Count every evidence snapshot as one cycle, including a snapshot where checks are still pending.
5. Repeat the poll/classify/fix/validate/push flow for no more than 5 total cycles.
6. Merge to `test` only after a final fresh snapshot proves that the PR head is unchanged, all required checks are green, and no unresolved blocking feedback remains.

## Polling State Machine

Use this state flow: `preflight -> pull request active -> poll -> classify -> fix -> validate -> push -> poll`. End in `ready` only when every readiness condition is proven. End in `blocked` when the retry limit is reached or complete evidence cannot be collected.

For each cycle:

1. Use GitHub CLI to read the PR number, URL, state, base branch, head branch, `headRefOid`, `statusCheckRollup`, reviews, and top-level comments.
2. Use `gh api graphql` to paginate `reviewThreads(first: 100, after: $cursor)` until `pageInfo.hasNextPage` is false. Capture each thread's ID, resolution and outdated state, path, line, and comment author, body, URL, and creation time.
3. Inspect every unresolved thread regardless of author. Explicitly include GitHub Copilot and Codex reviews; never ignore an actionable finding because it came from a bot or an unfamiliar reviewer login.
4. Classify each finding as:
   - `actionable/blocking`: unresolved, still applies to the current diff, and requests a concrete code, test, documentation, or safety correction;
   - `informational`: a summary, praise, question already answered by the code, or optional suggestion that does not block readiness;
   - `resolved`: GitHub reports the thread as resolved;
   - `outdated`: GitHub reports it as outdated or the referenced diff no longer exists and the underlying concern no longer applies.
5. Record a reason for every informational or outdated classification. A `CHANGES_REQUESTED` review remains blocking until the request is demonstrably addressed or dismissed by an authorized reviewer.
6. Address actionable findings locally. After any change, rerun `mds doctor --ci`; do not push if Doctor reports errors. Push the validated update, then start the next cycle against the new head SHA.
7. If checks are pending, no fix is available, or new feedback arrives, wait about 2 minutes and use the next cycle. Never tight-loop GitHub.

## Readiness And Failure Rules

The PR is `ready` only when a final fresh snapshot proves all of the following for the same `headRefOid`:

- the PR is open and targets the expected base;
- every required check is successful, with no failed, cancelled, pending, queued, or unknown required result;
- there is no unresolved actionable/blocking thread or active change request; and
- the PR head did not change while the final evidence was collected.

Treat missing authentication, GitHub API errors, incomplete review-thread pagination, a missing or closed PR, an unexpected base, or a head change during collection as `blocked`, never as success. If cycle 5 still has pending checks, actionable feedback, incomplete evidence, or a validation failure, stop without merging.

## Evidence Report

Keep one concise entry per cycle containing:

- cycle number, PR URL, and observed head SHA;
- required checks grouped as passed, failed, and pending/unknown;
- review-thread URLs and locations, reviewer identity, classification, and rationale;
- changes made, Doctor result, and pushed head SHA when applicable; and
- resulting state: `repoll`, `ready`, or `blocked`, with concrete remaining actions.

## Guardrails

- Do not merge when required checks are failing, pending, or unknown.
- Do not skip Doctor between fix cycles.
- Do not resolve a review thread merely to make the PR appear ready; resolve it only after the finding is actually addressed.
- Do not claim readiness from stale evidence collected for an earlier head SHA.
- If still blocked after 5 cycles, stop and summarize remaining blockers with concrete next actions.

