# Doctor Dogfood Notes

Phase 1 dogfood targets:

- `time2pay`
- `DJsPortfolio`
- `PokePages`
- `expo-super-template`
- `core-monorepo`

## Expected Use

Before the reference repos are removed from the workspace, run Doctor in
non-mutating mode against each target and record whether the suite can produce a
structured report. The goal is not to make every external repo perfect; it is to
prove Doctor handles real Expo and monorepo shapes without crashing.

## Minimum Acceptance

- `doctor --json --scripts=false` completes for each target.
- Reports include project docs, package scripts, env hygiene, Expo config, SSR,
  runtime security, SEO, and app architecture where applicable.
- Findings are actionable and avoid leaking env values.

## Phase 1 Run Summary

Command shape:

```bash
node packages/cli/dist/cli.js doctor <target> --json --scripts=false
```

| Target | Errors | Warnings | Passed | Skipped | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `time2pay` | 0 | 1 | 7 | 0 | Structured report completed. |
| `DJsPortfolio` | 0 | 2 | 6 | 0 | Structured report completed. |
| `PokePages` | 1 | 3 | 4 | 0 | Package scripts reference missing built server files. |
| `expo-super-template` | 1 | 3 | 4 | 0 | Package scripts reference a missing server file. |
| `core-monorepo` | 0 | 2 | 3 | 3 | Structured report completed for monorepo root. |

The dogfood pass proves Doctor can scan the required reference shapes without
needing those repos mounted permanently.
