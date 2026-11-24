# i2 Companion TODO

## Bug Fixes & Regressions

Add new defects only as `- [ ] [Bug · Origin: Phase N] <concrete defect>`; do not duplicate them in a phase.

## Phase 0 — Orientation And Planning (Complete)

- [x] Confirm the Phase 0 component strategy in `project/info.md` (Uniwind, Lucide, Zustand, `expo-sqlite`, `expo-secure-store`, `three`, `@reactvision/react-viro`, and ejected Expo UI/NativeTabs/Stylist conflicts).
- [x] Review and confirm ejection inventory for `src/app/exposition/`, `src/components/exposition/`, `src/features/exposition/`, `scripts/stylist-sync-android.mjs`, and `stylist-sync+api.ts`.
- [x] Resolve all `# TodoForContext(optional):` markers in `project/info.md`.
- [x] Confirm visual direction in `project/style.md`.
- [x] Confirm Expo web output mode: `static` (no EAS server/deploy configuration in companion scope).

## Phase 1 — App Shell, Auth Gate, Tutorials & Guided Demo (Complete)

- [x] Implement Auth Gate (`dev@i2.app` / `password`, error `"Invalid email or password."`, no create-account button, plainly simulated local sign-in).
- [x] Implement per-device first-use/replay tutorials (`quest`, `android`, `ios`, `web`) with snapshot/restore and no duplicate level rewards.
- [x] Implement explicit environment provider switcher (`simulated-local`, plus honest unimplemented `local-host` / `cloud-host` boundaries with `PrototypeLimit` gates and zero networking).
- [x] Verify Web SQLite WASM + COOP/COEP headers (`crossOriginIsolated === true`) via `tools/web/serve-static.mjs`.

## Phase 2 — Shared Environment State, Unified Widgets & 3D Infie (Complete)

- [x] Implement all 28 canonical desktop-parity widgets (repurposing legacy `desktopStream` into native `workspaceEnv` `i² Environments` with legacy alias migration) + `PrototypeLimit` capability boundaries.
- [x] Build replaceable zero-network `SimulatedEnvironmentProvider` (`EnvironmentProviderPort` with typed `EnvironmentSnapshot`, `dispatch`, and `subscribe` events) + interactive simulated Web/Android/iOS app previews sharing coherent B14/comment/reaction/session state across 2D widgets and Quest VR.
- [x] Build True 3D Infie (`InfieStage.web.tsx` via Three.js + `InfieStage.native.tsx` via Viro) using the 5 GLBs and timing from `assets/infie/`, Mist-intermediary transitions, runtime VFX reconstruction, and gentle 3D motion.

## Phase 3 — Per-Window OpenXR Compositor & Grouped Spatial Windows (Build Verified; Device Install & Worn VR Pending)

- [x] Upgrade `tools/quest/viro-renderer/0004-openxr-quest-cockpit-slots.patch` (`QuestPanelLayer.h` v5) and rebuild `viro_renderer-release.aar`: per-window `XrCompositionLayerQuad` slots (`0..15`) + overlay slot (`16`) inside Viro's single OpenXR session, `XrSystemProperties` capability query, quantized swapchains + hysteresis under `192 MB` budget, `VRONode` `nodeTag` sync, view-Z sorting, paused/destroy lifecycle fixes, and `VROToneMappingRenderPass` `VROBlendMode::None`.
- [x] Upgrade `modules/quest-panel/` (`QuestPanelModule.kt` v5 + `src/index.ts`) and build `MultiWindowCompositorController` + `questCockpitHole` rounded-rect SDF punch-through shader.
- [x] Implement `SpatialWindow` (`stack` / `tabs` widget groups), SQLite schema v3 `spatial_windows` migration, `layoutStore` grouping/ungrouping/reordering/merging + explicit `maxWindowLayers` enforcement, `Batcave Command` (5 grouped OpenXR windows holding 15 widgets) and `Infie + Emulator` presets.
- [x] Build `quest-window-surface.ts` + `SpatialWindowPanel.native.tsx` + `QuestCockpitScene.native.tsx` with per-source `[1, 4]` UV hit-testing (focused & unfocused windows), ray-driven Move/Resize separate from clicks, and OpenXR layer budget HUD.
- [ ] Install `android/app/build/outputs/apk/debug/app-debug.apk` on Quest 3S (`3487C10J3706TQ`) once host ADB (`PID 13676` on `5037`) is reset cleanly without disturbing host tools.
- [ ] Run worn 6DoF Quest 3S verification for live OpenXR `maxWindowLayers` count, stereo sharpness, rounded-rect hole borders, unfocused ray interactions, Move/Resize drag, `Infie + Emulator`, and grouped `Batcave Command`.

## Phase 4 — Verification & Native Builds (Host Verified; Hardware Run Pending)

- [x] Expand unit tests covering grouped `SpatialWindow` operations, hard layer limits, `computeWindowPixelSpec`, SQLite v3 migration, `MultiWindowCompositorController`, `quest-window-surface` UV projection, `SimulatedEnvironmentProvider` + future `local-host`/`cloud-host` boundaries, auth, and COOP/COEP headers.
- [x] Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run expo-doctor` (`21/21`), live Chromium E2E on static web build (`crossOriginIsolated === true`, 0 console/page errors), `build:android`, `build:ios`, and `QUEST_BUILD=1` `assembleDebug`.
- [x] Record verified evidence, observed vs assumed OpenXR runtime limits, ADB timeout status, and worn-headset verification checklist in `project/HANDOFF.md`.
