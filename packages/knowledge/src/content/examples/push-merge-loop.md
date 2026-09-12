# Push-Merge Loop Example

Example iteration log for `/push-merge-loop`:

- Iteration 1:
  - Evidence: PR #123 at head `abc123`; `lint` failed, `test` pending.
  - Review: Copilot thread URL at `src/api.ts:42` classified actionable/blocking; one Codex summary classified informational with rationale.
  - Fixes: remove dead import and update the API guard clause.
  - Validation: Doctor CI passed; pushed head `def456`.
  - Result: `repoll`.
- Iteration 2:
  - Evidence: PR #123 at head `def456`; `lint` passed, `test` failed; the earlier Copilot thread is resolved.
  - Fixes: update the stale skill ID expectation.
  - Validation: Doctor CI passed; pushed head `fed789`.
  - Result: `repoll`.
- Iteration 3:
  - Evidence: one fresh snapshot observed head `fed789` at both the beginning and end of collection; all required checks passed, no checks were pending or unknown, and no actionable review threads or active change requests remained.
  - Result: `ready`.
- Merge: eligible to merge into `test` under the workflow's merge policy.

If the fifth snapshot still has pending checks, an unresolved actionable thread, an API/pagination failure, or a head SHA that changes during collection, the result is `blocked` and the report lists the exact remaining evidence or fix needed.

