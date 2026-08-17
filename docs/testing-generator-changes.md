# Testing Generator Changes Against Real Apps

Use the generator validation matrix before shipping generator or ejection changes that could affect real Expo apps.

Run:

```bash
pnpm test:matrix
```

The matrix reads `packages/cli/tests/fixtures/test-apps-matrix.json`. On Windows, it looks for real app source repositories under `F:\ReactNativeApps`, creates disposable validation workspaces under `F:\SoftwareDev\MDS\test-apps\.generator-matrix-worktrees`, installs dependencies in those disposable workspaces with non-frozen installs, then runs:

- `mds doctor --ci`
- `mds eject exposition`
- `mds eject stylist`

The original app repositories are not modified. Local app paths are used as read-only sources, and destructive validation happens only in temporary clones or temporary copies. If a listed app is not present under `F:\ReactNativeApps`, the matrix clones its GitHub URL into the disposable run folder instead. On non-Windows machines, configure `MDS_TEST_APPS_ROOT` and `MDS_MATRIX_WORKTREES_ROOT`, or let the matrix fall back to GitHub clones and the OS temp directory. The report is written to `generator-matrix-report.json` at the repo root.

Folder roles:

- `F:\ReactNativeApps` is for real apps you actively work on.
- `F:\SoftwareDev\MDS\test-apps` is for scratch/generated test apps, including Create Expo Super Stack experiments.
- `F:\SoftwareDev\MDS\test-apps\.generator-matrix-worktrees` is for throwaway matrix copies that can be safely modified and deleted.

After dependencies are installed, the matrix continues through ejection and Link/Slot style-array scanning even if `mds doctor --ci` reports app-health failures. That keeps generator regressions visible separately from app cleanup work.

Useful environment variables:

- `MDS_MATRIX_KEEP_TEMP=1` keeps temporary app workspaces for debugging.
- `MDS_MATRIX_SKIP_INSTALL=1` skips dependency installation when a prepared temp workspace already has dependencies.
- `MDS_TEST_APPS_ROOT=<path>` overrides the real app source root, which defaults to `F:\ReactNativeApps`.
- `MDS_MATRIX_WORKTREES_ROOT=<path>` overrides the disposable validation workspace root, which defaults to `F:\SoftwareDev\MDS\test-apps\.generator-matrix-worktrees`.
- `MDS_MATRIX_COMMAND_TIMEOUT_MS=<ms>` changes the per-command timeout.
- `MDS_MATRIX_TEST_TIMEOUT_MS=<ms>` changes the full matrix test timeout.

The matrix test is intentionally local-only. It is skipped by normal `pnpm test` runs unless it is explicitly targeted by `pnpm test:matrix`, `pnpm test -- generator-matrix`, or `MDS_RUN_GENERATOR_MATRIX=1`.

On Windows, a just-finished app command can briefly hold a file lock. Cleanup retries automatically; if the run folder still cannot be removed, the report records `keptTempRoot` and `cleanupError` for manual cleanup.
