# /review-motion

Review motion in an Expo project with MCP-first diagnostics, motion
classification, and parallax-aware recommendations.

## Arguments

- `projectPath`: absolute or relative project path (default: current
  directory).
- `focusPath`: optional route, screen, or component path to inspect first.
- `mode`: Doctor mode (`fast`, `ci`, or `full`; default: `fast`).

## MCP-First Workflow

1. Confirm the `mr-djs-dev-suite` MCP server is available.
2. Call `continue_project` first to understand project state and current
   blockers.
3. Call `doctor_scan_project` with `projectPath` and `mode`.
4. If the user named a specific file or screen, call `doctor_scan_file` on
   `focusPath` too.
5. Call `get_skill` with `id: "animation-motion"`.
6. Call `get_guide` with `id: "animation-performance"` before recommending
   broad motion edits.
7. If you need the implementation matrix, pull the animation pattern
   `mds://patterns/animation-motion-selection`.

## Review Rules

- Classify every animation you inspect as:
  - one-shot transition
  - layout transition
  - gesture-driven motion
  - list-heavy motion
  - loading animation
  - parallax or scroll-linked motion
- Call out parallax explicitly when present. Do not label it as generic
  animation.
- Prefer the smallest set of changes that improves smoothness and keeps the
  visual intent.
- Use official Expo or React Native docs for framework-specific mechanics when
  needed, then layer the MDS motion guidance on top.

## CLI / Manual Fallback

1. If MCP is not configured, install it manually:
   - `mds mcp install --client <client> --scope project`
2. If MCP still cannot run, use direct CLI flows:
   - `mds continue <projectPath>`
   - `mds doctor <projectPath> --fast`

## Verification And Output

- Re-run `doctor_scan_project` after motion refactors when you changed the app.
- Output:
  - a motion inventory by file or screen
  - the recommended implementation class for each animation
  - likely smoothness or jank causes
  - a short verification checklist
