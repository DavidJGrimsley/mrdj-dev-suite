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
4. Wait about 2 minutes, then poll PR comments, review threads, and failed checks.
5. Fix issues locally, rerun Doctor, push updates, and poll again.
6. Repeat polling/fix cycles up to 5 total iterations.
7. Merge to `test` only when all required checks are green and no unresolved blocking feedback remains.

## Guardrails

- Do not merge when required checks are failing.
- Do not skip Doctor between fix cycles.
- Keep a concise changelog per iteration: what failed, what was changed, what passed.
- If still failing after 5 cycles, stop and summarize remaining blockers with concrete next actions.

