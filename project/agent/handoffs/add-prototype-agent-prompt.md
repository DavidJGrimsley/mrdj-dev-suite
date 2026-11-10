# Agent handoff: add-prototype

Task mapping: Unmapped. No exact checkbox was identified in the canonical roadmap. Do not mark an unrelated item complete.

## Context and ownership

- Source repository: https://github.com/DavidJGrimsley/mrdj-dev-suite
- Canonical control repository: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/project` (https://github.com/DavidJGrimsley/mrdj-dev-suite-project); read its `todo.md` and relevant project memory without overwriting user changes.
- Branch: `add-prototype`; worktree: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/mrdj-dev-suite-add-prototype`.
- Base: `origin/main` at `1851f87a7b609a3509a4a8086fa4f279683bcb3b`; no PR dependency identified.
- Source prototype: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/temp/FinalFigmaMake-iSquaredIDE`.
- Workspace-generated artifacts: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/generated/`. Test-only generated apps: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/test-apps/`.

## Goal

Inspect the repository and prototype, then place the prototype in an appropriate durable location in this source worktree. Preserve its functionality and explain the location choice. The user will provide the video to replace and its replacement directly when starting the agent; obtain that information before making the video change. Run the prototype locally, provide the localhost URL, and leave it available for the user to inspect. Present evidence and a merge-readiness recommendation for user confirmation.

Respect the prototype's own applicable instructions and licensing/attribution. Avoid unrelated changes and preserve the original folder until its contents are safely integrated and verified; coordinate any eventual removal with the user. Do not touch the source checkout's existing tracked deletions. Do not begin the later hosting or generator tasks. Do not merge or deploy without explicit authorization.

## Validation and handoff evidence

Inspect scripts and applicable instructions before choosing exact package installation and startup commands. The imported prototype currently declares `pnpm build` and `pnpm dev`; run its build and verify the running app in a browser, including the changed video. Run applicable repository checks, including `pnpm type-check`, `pnpm lint`, `pnpm test`, and `pnpm build` where appropriate; report failures or unrun checks precisely. Run `git diff --check` and compare changes both with the recorded base and the current final base. Before any commit run `mds doctor --fast` and resolve errors as required by repository instructions. Report changed files, chosen location, validation results, localhost URL, remaining limitations, and whether the user has confirmed visual review.

Environment propagation from the source checkout remains pending: discovery produced unexpected traversal warnings, and no environment files were copied. Do not print or inspect secret contents.

Recommended worker: Tier 2 — capable coding agent — repository placement, integration, and visual verification require implementation judgment. The video specification is pending from the user.
