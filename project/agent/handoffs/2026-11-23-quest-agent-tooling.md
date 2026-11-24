# Quest agent tooling — coordinator handoff

Task mapping: Unmapped. The user explicitly selected Branch 0 in the attached plan; no exact Quest tooling checkbox was found in the control roadmap. Do not mark the broader mobile companion task complete.

Control repository: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/project`; roadmap: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/project/todo.md`. Source remote: https://github.com/DavidJGrimsley/mrdj-dev-suite (control repository has no independently verified remote).

Dependency and provenance: open draft [PR #94](https://github.com/DavidJGrimsley/mrdj-dev-suite/pull/94), head `i2-companion`, target `main`; observed head and immutable task base `bed6749d0089ebe7c9d3be6e0c1f3497a7b45f0a` (`origin/i2-companion`). The user explicitly chose the supplied plan and its integration-branch sequence. Do not update or merge PR #94 as part of this task.

Branch: `chore/quest-agent-tooling`. Worktree: `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/mrdj-dev-suite-quest-agent-tooling`. Goal: prepare and verify the Quest development workflow described below; do not implement VR UI. The user wants the coordinator to delegate implementation to a worker.

Artifact destinations required by repository instructions: generated non-app artifacts `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/generated/`; generated test apps `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/test-apps/`. Versioned task documentation belongs in the source worktree as requested below. Preserve existing secrets; do not read or disclose env-file contents.

Desktop visual references: `C:/Users/DJLeg/Pictures/Screenshots/Screenshot 2026-11-23 171712.png`, `C:/Users/DJLeg/Pictures/Screenshots/Screenshot 2026-11-23 165637.png`, `C:/Users/DJLeg/Pictures/Screenshots/Screenshot 2026-11-23 171729.png`. Plan source: `C:/Users/DJLeg/Downloads/iSquared_VR_Depths_Branch_Prompts.md`.

Before work, read root and applicable nested AGENTS.md. Follow their requirements and verify claims in the supplied plan against current primary documentation and actual repository state. Preserve SDK and Viro versions; do not modify UI, unrelated apps, `main`, or PR #94. Avoid secrets. No external messages, merges, deployments, or publishing without explicit user instruction. When hardware or authentication is unavailable, report actual blockers and continue independent setup.

Validation: from `apps/i2-companion`, run `npm run typecheck`, `npm run test:unit`, `npm run lint`, `npm run expo-doctor`, and a real Quest connection check, reporting exact results. Before committing run `mds doctor --fast` as required by root AGENTS.md; also run `git diff --check`. Report the commit, changed files, actual device/build/tool evidence and remaining risks; do not claim headset checks passed without evidence.

Recommended worker: Tier 3 — capable coding agent — cross-platform native tooling, official SDK verification and machine-specific setup require judgment; use installed tools and avoid speculative retries.

**Shared quality gates, every branch:**
1. Inspect the actual source, source-level design tokens, and the user-provided desktop screenshot(s) before producing user-facing UI. Screenshot alone is not enough; code alone is not enough.
2. No internal strings in production UI: `Spatial Home Proof`, `Meta Spatial SDK`, `Test DOM Button`, `Submitted:`, `OpenXR`, `Viro`, `layer slots`, etc. Diagnostics must live in debug-only screens/logs and never masquerade as product copy.
3. No `ViroText`-rendered production UI, no 3D glyph meshes, no duplicate custom UI drawing framework. Use original React/CSS DOM for panels where possible, with fallback to Android view/Compose only when justified.
4. Controller interaction, text editing, scrolling, hover, focus, and keyboard must work IN HEADSET, not merely in Chrome desktop or headless tests.
5. Capture a Quest screenshot or video; compare the flattened UI panel with the corresponding desktop screenshot in layout, font, copy, colors, spacing, and hierarchy. Report deviations; do not claim pixel perfect based only on simulated tests.
6. No invasive refactor beyond the branch scope. Changes to Android native configuration must be idempotent across Expo prebuilds, with one documented Quest build pathway and a preserved phone build pathway.
7. Test cold start, normal use, recenter, turning 90° and 180°, moving around the room, app pause/resume, and controller input. Ensure panels remain readable and never show their backs unexpectedly.
8. Write a concise handoff with commit, files, actual screenshot evidence, passed/failed tests, risks, and next branch prerequisites. One concrete functioning milestone before more abstraction.
9. Use official documentation available to the agent through Expo Skills/MCP and Meta VR CLI/MCP. Do not invent APIs from training data.
10. When blocked by hardware or tooling, report exactly what cannot be verified; do not replace failed integration with placeholder copy that looks like a finished feature.


## Branch 0 — `chore/quest-agent-tooling`

### Paste into Claude Code / Codex / Grok

```text
You are preparing the iSquared (i2) Quest development workflow, NOT implementing VR UI yet. Work from `i2-companion` (PR #94), create branch `chore/quest-agent-tooling`, and do not mutate the production UI. Inspect `apps/i2-companion/AGENTS.md`, `.claude/settings.json`, `app.config.ts`, `tools/quest/`, `package.json`, and the root repo instructions. Inventory existing Expo, React Native, Viro, Kotlin, Meta Spatial SDK, build variants, Android Studio/Gradle, ADB, and Quest device configuration.

Set up and VERIFY official agent tools, skills, and local documentation:
- Expo Skills and the official Expo plugin for whichever agents are installed. Claude Code: `claude plugin install expo@claude-plugins-official`; Codex: `codex plugin add expo@openai-curated`; Grok Build where available: `grok plugin install expo --trust`. Avoid installing duplicates.
- Expo MCP (`https://mcp.expo.dev/mcp`, OAuth) through the plugin. `claude /mcp` or `codex mcp login expo` as appropriate. Only install local `expo-mcp` in the app if appropriate for Expo SDK 57 and verified to work; advanced local capabilities on Android/Quest are not guaranteed.
- Meta VR CLI (formerly hzdb) using the CURRENT official instructions: https://developers.meta.com/vr/essentials/metavr-overview/ . Run `metavr init` to register supported agents/MCP/skills and confirm `metavr device list`; never invent CLI flags. Install/verify `meta-quest/agentic-tools` skills, particularly `hz-quest-verify-first`, `hz-spatial-sdk`, `hz-immersive-designer`, and `metavr-cli`.
- Register official Viro/ReactVision docs and https://github.com/ReactVision/viro as READ-ONLY reference context for the legacy implementation; do not add random third-party Viro MCP servers without vetting. Add Meta reference docs for panels, input, objects, runtime limits, and reference-space/recenter handling.
- Make GitHub repo/PR access available to the agent, plus screenshot/visual comparison ability for the desktop Vite prototype (Playwright or equivalent), and Quest screenshots/logs via Meta VR CLI/ADB.

IMPORTANT: the discontinued web service `Expo Agent` is not installable. Use Expo Skills + MCP + existing agents. Preserve Expo SDK 57 and the existing Viro patchset; do not upgrade or remove either as a setup side effect.

Create versioned `docs/quest/AGENT_WORKFLOW.md` and `docs/quest/QUEST_REFERENCE_MAP.md` with official source URLs, what actually works, how to build the `homeproof` and existing Viro variants, how to find screenshots, where screenshot references should be stored, and explicit safe testing commands. Confirm the installed native Meta SDK version, currently 0.15.0 in the proof, from actual Gradle resolution.

Run and report baseline checks: `npm run typecheck`, `npm run test:unit`, `npm run lint`, `npm run expo-doctor` from `apps/i2-companion`, and at least a Quest device connection check. Preserve exact results, don't manufacture passes. Do not publish credentials/tokens. Avoid touching `main` or unrelated apps.

Done when: tools/skills are discoverable by at least one primary coding agent, Meta can identify the Quest, the build variants are mapped, current official references are saved, and a short WORKFLOW handoff identifies which commands require the user's approval/device.
```
