# Push-Merge Loop Example

Example iteration log for `/push-merge-loop`:

- Iteration 1:
  - Failed: `lint` and one requested review change.
  - Fixes: remove dead import, update API guard clause.
  - Result: `lint` green, one test still failing.
- Iteration 2:
  - Failed: `test` in `packages/cli`.
  - Fixes: update stale skill ID expectation.
  - Result: all checks green.
- Merge: PR merged into `test`.

