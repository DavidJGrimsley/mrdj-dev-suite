# MDS Doctor GitHub Action

Composite Action that runs `@mr.dj2u/doctor` and fails CI when:

- Doctor reports errors, or
- Doctor score is below `min-score` (default: `90`)

## Prerequisites

- Your workflow must `actions/checkout` the repo before using this action.
- If `run-scripts: true`, your workflow must install dependencies first (so lint/typecheck/test/build scripts can run).

## Usage

```yaml
- uses: ./.github/actions/mds-doctor
  with:
    project-path: .
    mode: ci
    run-scripts: true
    timeout-ms: 120000
    doctor-version: latest
    node-version: 20
    min-score: 90
```

Outputs:

- `score`, `errors`, `warnings`, `passed`, `skipped`

