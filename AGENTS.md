# Mr. DJ's Dev Suite — Agent Guidelines

## i² workspace artifact locations
When this checkout is a source worktree in an i² workspace, establish the
source-worktree root and confirm the sibling `project/mds.workspace.json`
manifest before creating output. These rules apply only after that verification:

- Keep normal MDS source changes in the selected source worktree.
- Put non-app task artifacts, such as generated reports, images, and documents,
  in `../generated/` relative to the source-worktree root.
- Put apps generated solely to test MDS/i² in
  `../test-apps/<app-name>/` relative to the source-worktree root.
- Do not hard-code an absolute path or create/use a different sibling
  `test-apps` directory. If the workspace contract cannot be verified, stop and
  ask the user for the output location.

Every coordinator handoff for i² work must name the resolved generated-artifact
and test-app destinations before an agent creates files.

## Before every git commit
Always run `mds doctor --fast` (or via MCP `doctor_scan_project`) on the target project before committing. If the report has errors, fix them before proceeding. Warnings are acceptable to commit with.

## Before moving to the next phase
Run `mds doctor --fast` before beginning a new phase of onboarding or development work. Resolve all errors before continuing to the next phase.

## Starting the Expo dev server
Always use `mds clear-expo-start <project-path>` instead of bare `expo start`, `npx expo start`, or `pnpm exec expo start`. This command:
- Kills any process listening on the Expo port (default 8081) and the Express port (3000) if a server script is detected
- Clears project-level caches (`.expo`, `.cache`, `node_modules/.cache/metro`, `node_modules/.cache/babel-loader`)
- Clears the Windows system-level Metro cache (`%LOCALAPPDATA%\Temp\metro-cache`)
- Starts Expo with `--clear`

Never fall back to a non-default port (e.g. 8082) — always free the default port first with `clear-expo-start`.

## Starting the Express dev server
When a project has a `server.js` or `server/index.js` and needs its backend started, run `node server.js` (or the appropriate entry point) from the project root in a background process. The `clear-expo-start` command will automatically kill port 3000 if a server script is detected in `package.json`.

## Building this repo
```
pnpm build
```

## Testing this repo
```
pnpm test
```
