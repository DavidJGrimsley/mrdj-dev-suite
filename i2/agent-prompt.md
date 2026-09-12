# Agent prompt compatibility stub

Task-specific instructions are recorded in the sibling control repository:

`<workspace-root>\project\agent\handoffs\`

The coordinator assignment and linked handoff packet are authoritative. This
tracked file is intentionally identical in every source worktree; do not add
branch-specific instructions here. Do not put secrets in the handoff or this
stub.

## Workspace artifact-location contract

When the task is in an i² workspace, first establish the source-worktree root
and confirm the sibling `project/mds.workspace.json` manifest. Keep normal
source changes in that worktree. Put non-app task artifacts in `../generated/`
and apps generated solely to test MDS/i² in `../test-apps/<app-name>/`, both
relative to the source-worktree root. Do not hard-code an absolute path or use
another sibling `test-apps` directory.

The coordinator assignment must state the resolved generated-artifact and
test-app destinations before creating output. If it does not, or the manifest
cannot be verified, stop and ask the user rather than choosing a location.
