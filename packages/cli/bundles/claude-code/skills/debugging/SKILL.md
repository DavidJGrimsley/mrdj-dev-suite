---
description: Use when diagnosing broken behavior, flaky tooling, or unclear failures in Expo projects.
---

# Skill: Debugging

Use when diagnosing broken behavior, flaky tooling, or unclear failures in Expo projects.

## Main rule

Debug by narrowing scope quickly: reproduce, isolate, capture evidence, apply the smallest safe fix, then verify.

## Checks

- Reproduce the issue consistently and record exact command/path/error output.
- Confirm environment assumptions (platform, output mode, env vars, script path) match the failing context.
- Run targeted checks first (`mds doctor`, focused tests, route/file scans) before broad reruns.
- Separate root-cause signals from secondary cascade errors.
- Re-verify with the same reproduction path after the fix.

## Preferred structure

- Keep debugging notes concise in task output or project memory when the issue is recurring.
- Prefer deterministic scripts over ad-hoc manual sequences.
- Escalate from narrow test scope to broader validation only after targeted checks pass.

## Example fix

- Problem: Route crashes only on web server output with ambiguous stack traces.
- Fix: Reproduce in server mode, isolate browser-global usage in shared module, add guards, rerun targeted test and Doctor scan.

## Agent behavior

- Start with high-risk failures (security, data loss, crashers), then address lower-risk warnings.
- Keep users unblocked with concrete next commands and avoid speculative broad refactors before evidence is clear.
- Delegate framework primitive questions to official Expo or React Native guidance, then apply MDS reproduction discipline, Doctor checks, and project-memory context.
