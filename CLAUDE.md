# MrDJ Dev Suite — Agent Guidelines

## Before every git commit
Always run `mrdj doctor --fast` (or via MCP `doctor_scan_project`) on the target project before committing. If the report has errors, fix them before proceeding. Warnings are acceptable to commit with.

## Before moving to the next phase
Run `mrdj doctor --fast` before beginning a new phase of onboarding or development work. Resolve all errors before continuing to the next phase.

## Starting the Expo dev server
Always use `mrdj clear-expo-start <project-path>` instead of bare `expo start`, `npx expo start`, or `pnpm exec expo start`. This command:
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
