# Plan: Spotlight-to-Dock UI Introductions (Level, Music Widget, and `i2 / Project / Session` Header Breadcrumbs)

## 1. Goal & Scope
Update how newly introduced UI elements enter during onboarding so they first **fade in larger than normal and centered in the viewport spotlight**, hold briefly so the user can see them clearly, and then **smoothly animate (zoom and glide) into their final docked position**. Apply this pattern to the first three persistent UI introductions and decompose the header reveal so individual header parts are introduced one at a time rather than all at once:

1. **Level Indicator (`Lvl. 0`) in `B03`**:
   - On *"Nice to meet you, {name}. I can see you're level zero."*, `Lvl. 0` fades in larger (`scale: 1.85`) and centered below Infie's message, holds briefly, and then animates up-right into its final top-right header anchor (`top: 15px, right: 24px, scale: 1`).
2. **Music Widget (`LeekBeats`) in `B05`**:
   - On `B05` Turn 0 (*"Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet."*), the widget's Play button fades in larger (`scale: 1.45`) and centered below Infie's message. Infie points and presses toward that centered Play button when clicked.
   - On `B05` Turn 1 (*"Oh yea, that's my jam. Your music player lives right here."* or *"Your music player will be right here when you want it."*), `Prev`, `Next`, and the `LeekBeats` track/playlist label fade in around the Play/Pause button while centered, hold briefly (`~650ms`), and then the complete widget smoothly glides and scales down (`scale: 1`) into its final lower-left anchor (`left: 24px, bottom: 24px`) while audio keeps playing uninterrupted.
3. **Header `i2 / Project / Session` Breadcrumbs in `B07` Turn 1**:
   - After `B07` Turn 0 (*"The key to working with i² is the project folder…"* + the `i2Workspace/  [main/ (worktree)]  [project/]` illustration), clicking `Continue` advances to a new **`B07` Turn 1** with the line:
     **"It's also how the UI is structured here."**
   - After that line appears, **only** the `i2 / Project / Session` breadcrumb group from the header fades in larger (`scale: 1.55`) and centered below the message, holds briefly, and then zooms/glides up-left into its final top-left header position (`top: 15px, left: 24px, scale: 1`).
   - The rest of the header (`Widgets`, `Games SOON`, `Workspace/Emulators`, `Bell/Settings`, and the header bottom border) remains unrevealed.
4. **Stop Point for Review (`B08` Turn 3)**:
   - Clicking `Continue` on `B07` Turn 1 advances to `B08` (Turns 0–3, introducing `info.md`, `todo.md`, `style.md`, `guidelines.md` one at a time on the folder illustration) and withholds `Continue` on `B08` Turn 3 (`MAX_ENABLED_BEAT = "B08"`) so you can review these three spotlight-to-dock introductions before we introduce the remaining header items in `B09`.

---

## 2. Reveal Ledger & State Updates

### 2.1 `src/app/onboarding/revealLedger.ts`
- Add `header_breadcrumbs` to `RevealGroupId` and `REVEAL_LEDGER`:
  - `id`: `"header_breadcrumbs"`
  - `group`: `"Header i2 / Project / Session breadcrumbs"`
  - `firstBeat`: `"B07"` (Turn 1: *"It's also how the UI is structured here."*)
  - `locationAndGate`: `"Spotlight center -> top-left Header anchor; Continue"`
  - `lifetime`: `"persistent"`
  - `componentTarget`: `"Header[data-name='HeaderBreadcrumbs']"`
- Keep `home_header_controls` for the remaining Home header controls (`Widgets`, `Games SOON`, `Workspace/Emulators` toggle, `Bell/Settings` pill, and header border) introduced later.

### 2.2 `src/app/onboarding/OnboardingContext.tsx`
- Set `STEP_4_MAX_ENABLED_BEAT: OnboardingBeat = "B08"` so the flow runs through `B00` → `B07` (Turns 0 & 1) → `B08` (Turns 0–3) and stops at the end of `B08` Turn 3 before `B09`.

---

## 3. Spotlight-to-Dock Animation Architecture

### 3.1 Reusable Spotlight-to-Dock Motion for Header Elements (`src/app/App.tsx`)
- Update `Header` to accept `showBreadcrumbs?: boolean` (in addition to `showLevelIndicator`, `showHeaderControls`, `showTutorialsEntry`).
- When `showHeaderControls` is `false` (during `B03`–`B08`), `Header` renders its transparent `h-[59px] px-[24px]` bar with:
  - Left slot: `breadcrumbsGroup` (`i2`, `Project`, `Session` pills, mounted when `showBreadcrumbs || showHeaderControls` is `true`).
  - Right slot: `levelPill` (`Lvl. 0`, mounted when `showLevelIndicator` is `true`).
  - No bottom border, no center `Widgets`/`Games SOON`, no `Workspace/Emulators` toggle, and no `Bell/Settings` pill until `showHeaderControls` is revealed.
- **Single-Node Spotlight-to-Dock Keyframe Animation**:
  - Both `[data-name="Level"]` and `[data-name="HeaderBreadcrumbs"]` measure their own docked bounding box on mount (`useLayoutEffect`) and compute the `(dx, dy)` offset to the center spotlight position (`x = window.innerWidth / 2`, `y = 390px`, below Infie's message).
  - On first reveal during onboarding (`animateIntro = true` and `!reducedMotion`), a `motion.div` wrapper animates through three keyframes:
    1. **Fade in at center spotlight (`0s → 0.35s`)**: `{ opacity: 0, x: dx, y: dy, scale: spotScale }` → `{ opacity: 1, x: dx, y: dy, scale: spotScale }` (`spotScale = 1.85` for `Level`, `1.55` for `i2 / Project / Session`).
    2. **Hold in spotlight (`0.35s → 1.15s`)**: stays steady at `{ opacity: 1, x: dx, y: dy, scale: spotScale }` so the user clearly reads it.
    3. **Zoom/glide to header dock (`1.15s → 1.85s`)**: animates smoothly (`ease: [0.22, 1, 0.36, 1]`) to `{ opacity: 1, x: 0, y: 0, scale: 1 }`.
  - Because the element is the actual `Header` DOM node and ends at `x: 0, y: 0, scale: 1`, it settles into its exact final pixel coordinates with zero DOM swap or jump.
  - Under `prefers-reduced-motion: reduce`, it fades in directly at `{ x: 0, y: 0, scale: 1 }`.

### 3.2 Music Widget Spotlight-to-Dock (`src/app/onboarding/LeekBeatsWidget.tsx`)
- Track a `docked` state inside `LeekBeatsWidget`:
  - If `fullPlayerRevealed` is already `true` on initial reveal (e.g. post-onboarding or Sign In), `docked` starts `true`.
  - During `B05` Turn 0 (`playButtonRevealed && !fullPlayerRevealed`), `docked` is `false`:
    - The widget renders centered in the spotlight below Infie's message (`left: 50vw`, `top: 390px`, `scale: 1.45`), fading in smoothly.
    - Clicking the centered Play button calls `audio.play()` synchronously in the click handler, triggers the pulse ring and Infie's downward press animation, and advances `B05` to Turn 1.
  - On `B05` Turn 1 (`fullPlayerRevealed` becomes `true` on *"Your music player lives right here"* / *"Your music player will be right here when you want it"*):
    - `Prev`, `Next`, and the `LeekBeats` track/playlist label fade in around Play while still in the center spotlight.
    - After a `650ms` hold (so the user sees the assembled player at larger scale), `docked` becomes `true` and the widget smoothly animates (`duration: 0.75s`, `ease: [0.22, 1, 0.36, 1]`) to its final lower-left Home anchor (`left: 24px, bottom: 24px, scale: 1`).
    - The single `<audio>` element stays mounted throughout, so `Night Market` continues playing with zero interruption during the glide.

### 3.3 `B07` Two-Turn Sequence (`src/app/onboarding/OnboardingStage.tsx`)
- Update `B07` in `OnboardingStage.tsx` to have two turns:
  - **Turn 0**:
    - **Line**: *"The key to working with i² is the project folder. It's a magical place. It's an extra Git repository beside your worktrees in i2Workspace, where we keep the bigger picture. The whole team can read and edit these files. I'll keep them updated as we go."*
    - **Reveal (`+450ms`)**: `folder_illustration` (`i2Workspace/  [main/ (worktree)]  [project/]`) + `continue_button` (`+550ms`).
    - **Gate**: `Continue` → sets `turnIndex = 1` (stays in `B07`).
  - **Turn 1**:
    - **Line**: *"It's also how the UI is structured here."*
    - **Reveal (`+400ms`)**: `header_breadcrumbs` (`i2 / Project / Session` fades in centered & larger at `scale: 1.55`, holds, then zooms/glides to top-left header anchor) + `continue_button` (`+1600ms`, right as the breadcrumb group finishes docking into the header). Keep `folder_illustration` visible below so the visual parallel between the workspace structure and the `i2 / Project / Session` UI structure is clear.
    - **Gate**: `Continue` → advances to `B08` Turn 0 (`info.md`).
- Update `B03` Turn 0 reading dwell in `OnboardingStage.tsx` from `3800ms` to `4400ms` so `Lvl. 0` has plenty of time to fade in centered, hold, and finish gliding to the top-right corner (`~1.85s` after the `1.1s` cue) before Turn 1 replaces the message.

---

## 4. Verification Plan (Headless Chromium + Build)

Write and run `/tmp/pw/step4_spotlight.mjs` against `http://localhost:3000/`:
1. **`B03` Level Spotlight → Top-Right Dock**:
   - Sample `[data-name="Level"]` bounding box shortly after reveal (`~1.45s` into `B03` t0): assert its center X is near the horizontal center of the `1280×800` viewport (`|centerX - 640| < 120`) and its height is scaled larger than normal (`height > 42px` vs docked `~30px`).
   - Sample `[data-name="Level"]` bounding box after docking (`~3.3s` into `B03` t0): assert it is docked at top-right (`right edge = 1280 - 24 ± 2px`, `top < 30px`, `height ≈ 30px`).
2. **`B05` Music Widget Spotlight → Lower-Left Dock**:
   - At `B05` Turn 0 (`~0.9s`), assert `[data-name="LeekBeatsWidget"]` Play button is centered horizontally (`|centerX - 640| < 120`) and scaled larger (`width > 50px` vs docked `40px`).
   - Click Play at center; assert real audio playback starts (`audio.paused === false`, `currentTime > 0`) and `Prev`/`Next`/`LeekBeats` label appear around it while centered.
   - Wait `~1.6s` for the dock glide; assert the Play/Pause button is now at its lower-left anchor (`x < 120`, `y > 700`) and audio is still playing continuously on the same `<audio>` node.
3. **`B07` Turn 0 → Turn 1 (`i2 / Project / Session` Spotlight → Top-Left Dock)**:
   - At `B07` Turn 0, assert the folder illustration is visible and `[data-name="HeaderBreadcrumbs"]` is not yet in the DOM.
   - Click `Continue` → assert `B07` Turn 1 message equals *"It's also how the UI is structured here."*
   - Sample `[data-name="HeaderBreadcrumbs"]` shortly after reveal (`~0.75s`): assert it is centered (`|centerX - 640| < 150`) and scaled larger (`height > 40px` vs docked `29px`).
   - Sample `[data-name="HeaderBreadcrumbs"]` after docking (`~2.1s`): assert it is docked at top-left (`left = 24 ± 2px`, `top < 30px`) and that unintroduced header controls (`Widgets`, `Tutorials`, `Workspace`, `Bell`, `Settings`) are still absent from the DOM.
4. **`B08` (Four Files & Stop Point)**:
   - Click `Continue` through `info.md`, `todo.md`, `style.md`, and `guidelines.md`; assert `Continue` is withheld at `B08` Turn 3 (`MAX_ENABLED_BEAT = "B08"`).
5. **Production Build**: Run `mise exec -- npm run build` and confirm exit code `0`.
