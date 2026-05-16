Run MDS Doctor on the current project and summarize the results.

1. Call `doctor_scan_project` via the `mrdj-dev-suite` MCP server with the current working directory as `projectPath`.
2. Present errors first (blocking — must fix before committing), then warnings (non-blocking but worth addressing).
3. For each finding include: what it is, why it matters, and a concrete fix suggestion.
4. If there are no errors, confirm the project is clean and list any warnings for awareness.
