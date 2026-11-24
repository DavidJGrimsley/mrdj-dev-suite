# i² Companion — Build & Verification Handoff

- **Worktree:** `F:/SoftwareDev/mrdj-dev-suite-i2Workspace/mrdj-dev-suite-i2-companion`
- **Branch:** `main` (in `apps/i2-companion`)
- **Base preserved:** All prior uncommitted work preserved cleanly; zero resets or duplicate worktrees.

## Summary of Implemented Per-Window OpenXR Compositor Architecture

1. **Multi-Window OpenXR Compositor Native Renderer (`tools/quest/viro-renderer/0004-openxr-quest-cockpit-slots.patch` + `native/quest-viro-renderer/viro_renderer-release.aar`):**
   - Replaced the 4-slot static pool with `QuestPanelLayer.h` v5 (`kVersion = 5`), supporting up to `kMaxWindowSlots = 16` independent floating window `XrCompositionLayerQuad` slots (`0..15`) plus `1` dedicated overlay slot (`16`), bound strictly inside Viro's single existing OpenXR session.
   - Queries `XrSystemProperties.graphicsProperties` (`maxLayerCount`, `maxSwapchainImageWidth`, `maxSwapchainImageHeight`, `systemName`) during `initOpenXR()` and exposes live telemetry via `nativeCapabilitiesJson()`.
   - Separates pixel upload (`nativeSlotDrawBitmap` via `AndroidBitmap_lockPixels` zero-copy row-flipped upload) from fast spatial pose & physical size updates (`nativeSlotPoseAndSize`).
   - Adds per-image swapchain revision tracking (`_imageRevisions`), quantized swapchain bucket growth + 18-frame `<= 75%` shrink hysteresis under a `192 MB` swapchain budget (`kSwapchainBytesBudget`), deferred swapchain destruction after 1 omitted frame, view-space Z back-to-front underlay sorting, and optional `VRONode` `nodeTag` `_worldTransform` sampling on the exact `xrEndFrame` submission.
   - Keeps `renderFrame()` `xrWaitFrame`/`xrBeginFrame`/`xrEndFrame` paired when `_paused` (`layerCount = 0`), executes `performRecenterOnRenderThread()` before `prepareFrame()`, destroys panels/swapchains on the render thread before EGL release, and switches `VROToneMappingRenderPass.cpp` to `VROBlendMode::None` so transparent punch-through regions transfer 1:1 without alpha squaring.
   - Rebuilt `viro_renderer-release.aar` via `node tools/quest/build-viro-renderer.mjs` (`libviro_renderer.so` sha256 `8f4e5c5d47b402643b81f363050677ec35a852e08359a8fa928c4331466280b8`).

2. **Expo QuestPanel Native Module (`modules/quest-panel/`):**
   - Upgraded `QuestPanelModule.kt` (`NATIVE_VERSION = 5`) and `modules/quest-panel/src/index.ts` with `openWindow`, `statusWindow`, `drawWindow`, `poseWindow`, `hideWindow`, `hideAllWindows`, `openOverlay`, `statusOverlay`, `drawOverlay`, `hideOverlay`, and `getCapabilities()`.
   - Uses a 2-thread background rasterization executor, `MAX_OPS_PER_WINDOW = 2048`, pixel-only cache keys (`contentW:contentH:bucketW:bucketH:ops`) so Move/Resize never re-rasterizes identical pixels, and immediate `Bitmap.recycle()` on close/hide.

3. **First-Class Floating Windows, Widget Grouping & Named Layout Persistence:**
   - Added `SpatialWindow` (`windowId`, `layoutMode: 'stack' | 'tabs'`, `widgetIds`, `activeWidgetId`, `scrollOffsets`, spherical pose & physical meters) in `src/types/widgets.ts` and `BUILTIN_LAYOUT_PRESETS` (`builtinRevision: 4`, `schemaVersion: 2`) in `src/data/widget-catalog.ts`:
     - `Infie + Emulator` (`minimal-infie-emu`): 2 sharp OpenXR windows + 3D Infie actor.
     - `Batcave Command` (`batcave-cockpit`): 5 grouped OpenXR windows holding all 15 panel widgets (`win-batcave-env` uses `['workspaceEnv', 'emuWeb']`) + 3D Infie actor so the full workspace fits cleanly inside hardware OpenXR layer limits without faking extra native layers.
     - `WIDGET_ID_ALIASES` migrates legacy `desktopStream`, `desktopMirror`, and `desktop` entries -> `workspaceEnv` (`i² Environments`).
   - Upgraded SQLite schema (`COMPANION_DB_SCHEMA_VERSION = 3` in `src/adapters/sqlite/schema.ts`) and `src/adapters/sqlite/repositories.ts` with `spatial_windows` persistence and automatic migration from legacy placements-only presets and `desktopStream` widget IDs.
   - Upgraded `src/stores/layout-store.ts` with `addWindow`, `closeWindow`, `deleteWindow`, `moveWindowPose`, `nudgeWindowPose`, `resizeWindow`, `resizeWindowBy`, `setWindowLayoutMode`, `setWindowActiveWidget`, `groupWidgetIntoWindow`, `ungroupWidgetToNewWindow`, `reorderWidgetInWindow`, `mergeWindows`, `scrollWindowWidget`, and explicit `maxWindowLayers` enforcement (`lastLayerLimitNotice`).
   - Updated `WidgetDock.tsx` and `WidgetsGalleryModal.tsx` for 2D/Web window-group and OpenXR budget parity.

4. **VR Surface Rendering, Rounded-Rect Hole Shader & Per-Window Controller Ray Input:**
   - `src/features/quest-vr/quest-cockpit-compositor.ts`: `MultiWindowCompositorController` manages persistent dynamic window slots `0..maxWindowLayers-1` + `overlay`, updates `questRuntime` capabilities, reports any `overflowWindowIds` explicitly without substituting 3D fallback panels, and fixes `questCockpitHole` with a rounded-rect SDF `discard` shader and `cullMode: 'Back'`.
   - `src/features/quest-vr/quest-window-surface.ts`: renders deterministic Canvas UI ops and pixel hit targets for all 28 widgets (including `workspaceEnv` `i² Environments`, project-scoped `infieChat` + `emuWeb`/`emuAndroid`/`emuIos`, stacked & tabbed groups, `[↑]` reorder, `[Pop]` ungroup, `[×]` remove, interactive toggles, chat quick replies) + exact 3D-to-UV (`worldPointToWindowUv` / `hitTestWindowSurface`) projection with rounded-corner clipping.
   - `src/features/quest-vr/SpatialWindowPanel.native.tsx` & `src/features/quest-vr/QuestCockpitScene.native.tsx`: single shared Window Root `<ViroNode viroTag="quest-win:<slot>">`, `highAccuracyEvents` per-source (`1 | 4`, rejecting head gaze `12`) `onClickState` ClickDown latching so focused and unfocused window widgets respond cleanly, ray-driven Move/Resize handles driven by raw OpenXR aim direction (`quest-input-adapter.ts` `forwardFromQuat`) with trigger-release commit, VR `+ Windows (28)` group target mode, `Layouts / Save`, `Host / Cloud?` boundary trigger, and OpenXR layer/VRAM HUD telemetry.

5. **Shared-Environment Product Correction (`EnvironmentProviderPort`) & Non-OpenAI Review Note:**
   - **Not a remote desktop stream:** Replaced `desktopStream` / `SimulatedDesktopStreamTransport` / `UnauthorizedDesktopStreamStub` / `I2CoreLanStub` with native composable `workspaceEnv` (`i² Environments` in `src/features/widgets/EnvironmentWidget.tsx`) backed by `EnvironmentProviderPort` (`src/types/providers.ts`), `createSimulatedEnvironmentProvider` (`src/providers/simulated-environment-provider.ts`), and `createFutureEnvironmentBoundary` (`src/providers/future-environment-boundaries.ts`).
   - **Coherent single-device simulated state (zero networking):** Local UI widgets and Quest VR OpenXR windows subscribe to `companionStore` (`src/stores/companion-store.ts`) + `SimulatedEnvironmentProvider` (`dispatch(command, origin)` + `subscribe(listener)`). Answering B14 (`Oldest first` / `Newest first`), posting/reacting to `Pet Show & Tell` preview comments across `Web Preview` / `Android Preview` / `iOS Preview` / VR panels, toggling `Human Testing` (`NEEDS YOU` -> `VERIFIED`), advancing stages (`PR OPEN` -> `MERGED` -> `COMPLETE` -> `reset-demo`), and switching environments (`sim-env-pet` <-> `sim-env-experimemo`) update the same in-app simulated environment state cleanly.
   - **Honest future provider boundaries:** `connectionStore` (`src/stores/connection-store.ts`) exposes `'simulated-local'` (`crossDeviceSync: false`, zero sockets, no claim of multi-device sync today) and blocks unimplemented `'local-host'` (`Computer-Hosted Environment`) and `'cloud-host'` (`Cloud Environment`) selections with `CapabilityUnavailableError` and `PrototypeLimitModal` without inventing wire protocols.
   - **Non-OpenAI review:** Architecture & product-correction audit run via read-only Gemini `research` subagent (`6ffb16e5-efe0-4df8-b8c3-aecaf6c58157`); fixes applied for project-isolated VR B14/emulator surfaces, 2D `ExplorerWidgetBody` project switches, SQLite-restored `VERIFIED` promotion, and `reset-demo` `humanTests` cleanup.

## Observed vs Assumed OpenXR Runtime Limits

- **Code/Compiled Behavior (Verified):** C++ queries `xrGetSystemProperties` (`maxLayerCount`, `maxSwapchainImageWidth`, `maxSwapchainImageHeight`, `systemName`), reserves 2 non-window layers (projection + overlay), caps pool allocation at `min(16, maxLayerCount - reserved)` up to `192 MB` swapchain RAM, and surfaces exact runtime counts via `getCapabilities()`.
- **Headset Runtime Limits (Assumed / Pending Live Worn Verification):** Actual Meta Horizon OS `maxLayerCount` (expected up to ~14–16 compositor layers on Quest 3/3S) and real GPU memory/thermal behavior have **not yet been observed live** because user hardware testing is pending and `adb.exe` on `5037` was left untouched.

## Verification Results (Latest Runs After Final Edit)

- `npm run format` & `npm run lint` (ESLint + Prettier): exited `0` (`0` errors, 6 pre-existing warnings in `infie-assets.ts` and `settings-screen.tsx`; Prettier clean).
- `npm run typecheck` (`tsc --noEmit`): exited `0` (`0` errors).
- `npm run test:unit`: **23/23 passed, 0 failed** across `infie-state-machine.test.ts`, `providers-and-quest.test.ts` (including `SimulatedEnvironmentProvider`, `createFutureEnvironmentBoundary`, coherent B14/preview/Human Testing/stage/environment flows, `MultiWindowCompositorController`, `quest-window-surface`, and Experimemo VR surface isolation), `spatial-and-widgets.test.ts`, and `sqlite-and-auth.test.ts`.
- `npm run expo-doctor`: **21/21 checks passed**.
- `npm run mds:doctor:ci`: **score 98/100** (`0` errors, `1` warning for optional static web `sitemap`/`robots`, `17` passed, `2` skipped, including `npm run build:web` pass).
- Headless Chromium E2E against `tools/web/serve-static.mjs` (`dist/` web export): exited `0` (`WEB_E2E_PASS`: `crossOriginIsolated === true`, COOP/COEP headers verified, demo auth wrong-password rejection + login, `Start Tour` -> `Finish` `Lv 2` reward, `Batcave Command` switch, Three.js Infie `canvasCount: 1`, `Experimemo <-> Pet Show` switch, `Oldest first` B14 sort + `E2E shared comment check` shared preview post, `Computer-Hosted` boundary `PrototypeLimit` modal, `0` console errors, `0` page errors).
- `npm run build:android`: exited `0` (`Android Bundled 9155ms`, 2179 modules -> `dist`).
- `npm run build:ios`: exited `0` (`iOS Bundled 8899ms`, 2095 modules -> `dist`).
- `QUEST_BUILD=1` `android/gradlew.bat assembleDebug -I ../tools/quest/short-cmake.gradle`: `BUILD SUCCESSFUL in 26s` (`782` tasks: `19 executed, 763 up-to-date`, `android/app/build/outputs/apk/debug/app-debug.apk` present at `119067602` bytes; note debug APK loads JS dynamically via `expo-dev-client` / Metro when run on device).

## Device Status & Manual Quest Verification Steps (Unresolved Hardware Verification)

- **Physical Headset Verification Pending:** User is not currently available to wear Quest 3S (`3487C10J3706TQ`); worn OpenXR testing and live device installation were not executed in this run.
- **When Ready to Test on Quest 3S:**
  1. Ensure `adb devices -l` lists your Quest 3S cleanly (`adb kill-server && adb start-server` only when safe on your workstation).
  2. Install non-destructively & start Metro for dev-client JS:
     - `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
     - `adb reverse tcp:8081 tcp:8081` alongside `npx expo start --dev-client`, open `com.mrdj.i2companion/.MainActivity`, and tap **Enter Quest 3D Companion** (or `adb shell am start -a android.intent.action.VIEW -d "i2-companion://vr"`).
  3. **Worn-Headset Verification Checklist (Not Yet Evidenced):**
     - Read the command shelf telemetry HUD (`OpenXR Windows: X/Y · READY · Swapchain Z/192 MB`) and confirm `Y` matches the live Quest 3S `maxLayerCount - 2` query with zero dropped compositor layers.
     - Test **Infie + Emulator** (`minimal-infie-emu`): inspect stereo alignment and text sharpness of the 2 OpenXR quad windows alongside 3D Infie; click widgets inside both focused and unfocused windows without moving focus first.
     - Test Move (`MOVE · ...` bar), Resize (`DRAG SIZE ↘`, `Size -/+`), and Depth (`Near/Far`) handles; verify smooth single-session recenter (`Recenter`) and zero handle/hole tearing or border halos at rounded corners.
     - Switch to **Batcave Command** (`batcave-cockpit`): verify all 5 grouped windows (15 panel widgets) render crisply, switch between `Stack` and `Tabs` modes, click `[Pop]` to split a widget into a new OpenXR window, test the explicit hard-limit banner when exceeding `Y` window layers, and save/restore a custom named layout.
     - Verify `i² Environments` (`workspaceEnv`) environment switch (`Pet Show` <-> `Experimemo`), B14 `Oldest 1st` -> shared `Web Preview` / `Android Preview` / `iOS Preview` comment/Like coherence, `Human Testing` -> `VERIFIED` -> `PR OPEN` -> `MERGED` -> `COMPLETE`, and `Host / Cloud?` `PrototypeLimit` OpenXR overlay modal (`B`/`Menu` dismiss).
