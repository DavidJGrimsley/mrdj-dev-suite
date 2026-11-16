# IDE widgets and onboarding handoff

Task mapping: Unmapped; do not mark unrelated roadmap items complete. Source repository: https://github.com/DavidJGrimsley/mrdj-dev-suite. Canonical control repository: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/project` (https://github.com/DavidJGrimsley/mrdj-dev-suite-project). Branch `ide-widgets-onboarding`, worktree `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/mrdj-dev-suite-ide-widgets-onboarding`, base `origin/main` at `f8d2b482f876bfa9ed86257bba621ec3debf10ec`. The prototype merges are included in that base; no unmerged PR dependency is intended.

## Requested work

1. Widgets should eventually be draggable from their current location or the widgets library to another IDE location, with other widgets resizing automatically. The user says to defer this until out of Figma Make probably: treat it as deferred, not an instruction to implement it now. Widgets lost double-click to expand and triple-click to maximize; find the Figma version that supports these interactions and restore them where feasible. Identify any missing reference rather than inventing behavior.
2. Add or integrate tutorial beats about: iSquared exploring quantum computing and machine learning alongside regular analysis requests to find where quantum computing fits; Infie, other agents, and session agents using iSquared MCP and tools to prevent dangerous codebase mistakes, avoid pitfalls, and apply best practices; built-in simulators for agents and humans; and access to i2 project environments through mobile apps, the website, and VR headset apps. Describe future or exploratory capabilities accurately, without implying they are implemented. The control roadmap's `todo.md` Quantum Upgrade section discusses a deferred Infie Portfolio Optimizer and Quantum Benchmark Lab, but does not establish the precise quantum machine-learning workflow. Look for the user's specific existing note elsewhere and report if it cannot be found.
3. Make widgets intended to open files open the actual files. Inspect the existing prototype and determine the exact repositories or assets needed; the user expects that additional repositories may need to be uploaded. Preserve security and request the specific missing sources rather than fabricate file contents or expose local files. Report practical limitations.

Inspect applicable repository and prototype instructions, existing behavior, and available references first. The user wants coordination and will start the implementation agent. Do not deploy or merge without authorization. Keep unrelated work intact.

## Validation and evidence

Determine and run relevant prototype and root checks; at minimum run the prototype build, `git diff --check`, and applicable lint, type-check and tests. The prototype has its own package-manager requirements; read its README. Compare against the recorded task base and current final base. Report exact commands, results, browser interaction evidence for each changed behavior, missing repositories or Figma references, and unverified items. Before any commit run `mds doctor --fast` and resolve errors as required by repository instructions.

Workspace-generated artifacts: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/generated/`; test-only generated apps: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/test-apps/`. Environment propagation is pending; do not reveal secret contents.

Recommended worker: Tier 3 — capable coding agent — interaction recovery, tutorial content, and real-file boundaries require cross-cutting judgment.
