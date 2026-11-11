# Plan: Preserve i² Home and Establish the Onboarding Reveal Foundation (Step 1)

## 1. Goal & Scope
Establish the persistent application shell, onboarding beat state machine, reveal ledger, default lower-left `LeekBeats` music player widget, and reusable floating UI primitives while preserving the existing `I2HomeScreen` design, layout, and content. For the visible first-run experience in this step, implement **B00** only: a completely black viewport (`#000000`) for two seconds with no UI flash, header, spinner, controls, or accessibility nodes, holding at black after the two-second gate until the next implementation step.

---

## 2. Persistent App Shell & State Architecture

### 2.1 First-Run Entry (No Auth/UI Flash)
- Update the root `App` component in `src/app/App.tsx` so first-run launches directly into the persistent app shell with `tutorialBeat = "B00"` instead of `AuthScreen` (`appPhase = "auth"`).
- In `B00`, the root container renders a pure `#000000` background (`w-full h-dvh bg-black overflow-hidden`) from the very first frame. `AnimatedGlows`, `Header`, `I2HomeScreen` content, and all widgets are withheld from the DOM and accessibility tree until their designated reveal cues.
- A `useEffect` timer runs for `2000ms` on `B00` mount and sets `b00GateMet = true`. Per the Step 1 specification (*"Implement B00 only for the visible first-run state... Hold at black until the next implementation step"*), the view remains held on the pure black screen once the 2-second timer completes, ready for Step 2 (`B01` arrival) to advance.

### 2.2 Separation of Real Persistent State vs. Tutorial Demo State
Maintain two cleanly separated state slices in the persistent top-level shell:

1. **Real Persistent App State** (retained across views and after tutorial completion):
   - `onboardingComplete: boolean` (false on first run; becomes `true` at `B18`).
   - `userProfile: { name: string; email: string; buildInterest: string }` (populated in `B02` / `B04`).
   - `userLevel: number` (`0` when revealed in `B03`; increments to `1` in `B18`).
   - `musicPlayer: MusicPlayerState`:
     - `playing: boolean` (default `false`)
     - `playlist: string` (`"LeekBeats"`)
     - `trackIndex: number` (default `0`, cycling through a local track list such as `"01 · Teal Horizon"`, `"02 · Worktree Drift"`, `"03 · Infinite Loop"`)
     - `currentTime: number` & `volume: number`
     - `position: { x: number; y: number } | null` (`null` uses default lower-left anchor `bottom: 24px, left: 24px`)
     - `size: "compact" | "expanded"`
   - `realProjects: ProtoProject[]` (existing `PROTOTYPE_PROJECTS`).

2. **Tutorial-Owned Demo State** (isolated and stripped upon `B18` completion):
   - `beat: TutorialBeat` (`"B00"` | `"B01"` | `"B02"` | `"B03"` | `"B04"` | `"B05"` | `"B06"` | `"B07"` | `"B08"` | `"B09"` | `"B10"` | `"B11"` | `"B12"` | `"B13"` | `"B14"` | `"B15"` | `"B16"` | `"B17"` | `"B18"` | `"DONE"`).
   - `subStep: number` (tracks multi-turn beats such as `B03`, `B04`, `B05`, `B08`, `B09`, `B10`, `B11`, `B12`, `B14`, `B15`, `B16`, `B17`).
   - `b00GateMet: boolean` (tracks completion of the 2-second `B00` timer).
   - `tutorialDemoProject: ProtoProject` & `tutorialDemoSession: ProtoSession` (tagged with `isTutorialDemo: true`, shown starting in `B09`/`B11` and removed at `B18`).

---

## 3. Complete Reveal Ledger & Home Group Mapping

Every existing UI group in `Header`, `I2HomeScreen`, `ProjectHomeScreen`, and `SessionScreen` is mapped to a boolean in a derived `RevealLedger` object. Unrevealed groups are **not mounted in the DOM** (or, where layout anchoring requires a spacer, rendered as an empty `aria-hidden="true"` non-focusable spacer with `pointer-events-none`), ensuring unrevealed UI is completely noninteractive and absent from the accessibility tree.

| UI Group | Component / Location in `App.tsx` | Reveal Beat & Cue | Post-Onboarding (`DONE`) |
| :--- | :--- | :--- | :--- |
| **Pure Black Viewport** | Root shell backdrop (`#000000`) | `B00` (0–2s timer, held in Step 1) | Replaced by `#0a0814` + `AnimatedGlows` |
| **Infie Hero & Floating Message** | `public/assets/infie-hero.png` (copied from attachment `4fba3f80`) + `FloatingMessage` | `B01` arrival / `B02` hello | Settles into normal Home `InfieAvatar` |
| **Identity Controls** | Floating `Name`, `Email`, `Submit`, `Sign in with GitHub` | `B02` after question | Retired after `B02` |
| **Level Indicator (`Lvl. 0` → `Lvl. 1`)** | `Header` right-most pill (`data-node-id="200:53"`) at top-right anchor (`top: 15px, right: 24px`) | `B03` on *"level zero"* (`Lvl. 0`) | Persistent (`Lvl. 1`) |
| **Temporary Continue Button** | `FloatingButton` beside current message | `B03` *"Hit Continue"* (and subsequent reading gates) | Retired at `B18` |
| **Project-Interest Reply** | Floating input + `Send` | `B04` question | Retired after `B04` |
| **Music Player: Play Button Only** | `MusicPlayerWidget` lower-left anchor (`bottom: 24px, left: 24px`) | `B05` *"Hit Play, or Continue"* | Upgraded to full player |
| **Music Player: Full Transport (`LeekBeats`)** | `MusicPlayerWidget` (`Previous`, `Play/Pause`, `Next`, track/playlist text) | `B05` on *"music player"* (both Play & Continue paths) | Persistent default Home widget |
| **Project Folder & 4 File Labels** | Temporary floating folder illustration (`info.md`, `todo.md`, `style.md`, `guidelines.md`) | `B07` folder → `B08` one label per turn | Retired after `B08` |
| **Home Header Chrome (except Tutorials)** | `Header` bottom border, `i2`/`Project`/`Session` pills, `Widgets`, `Games SOON`, `Workspace/Emulators` toggle, `Bell/Settings` pill | `B09` *"Your Home controls live up here"* | Persistent |
| **Home Conversation Entry** | `I2HomeScreen` left column (`Infie` header, message area, `InfieActionRow`, `"Talk to Infie…"` input + `Send`) | `B09` *"Here you can talk with me…"* | Persistent |
| **Home Active Projects & CTA Row** | `I2HomeScreen` right column (`Active Projects` grid + `GenerateProjectButton` + `Open New`) + seeded `Tutorial demo` project | `B09` *"Start something new with Jenny…"* | Persistent (demo project removed at `B18`) |
| **Project Home Header & Roadmap/Sessions** | `ProjectHomeScreen` breadcrumbs + left/center/right columns | `B10` turns 1 & 2 | Normal Project Home UI |
| **Seeded Session & Inline Agent Question** | Demo session row + floating agent question/reply in `ProjectHomeScreen` | `B11` turns 1 & 2 | Demo removed at `B18` |
| **Session Controls & Task Groups** | `SessionScreen` header/model meta + `Agent Tasks` & `Human Testing` | `B12` turns 1 & 2 | Normal Session UI |
| **PR Status & Completion Form** | `SessionScreen` PR status (`B13`) + floating `Session Completion Form` (`B14`) | `B13`–`B14` | Demo removed at `B18` |
| **Widget Move/Resize Controls & Library** | `MusicPlayerWidget` move/resize controls + Library widget example | `B15` turns 1 & 2 | Move controls persist; demo Library closes |
| **Header Tutorials Button** | `Header` center `Tutorials` button (`data-node-id="200:17"`) | `B17` *"Check out the other tutorials here"* | Persistent |

### 3.1 Anchoring the Top-Right Level Indicator (`Header` Update)
- Update `Header` in `src/app/App.tsx` to accept optional `revealState?: { showChrome: boolean; showTutorials: boolean; showLevel: boolean }` and `level?: string`.
- When `showLevel` is `false` (e.g. during `B00`–`B02`), `Header` renders `null`.
- When `showLevel` is `true` and `showChrome` is `false` (`B03`–`B08`), `Header` renders its `h-[59px] px-[24px]` positioning container with a transparent border (`border-transparent`) and only mounts the right-aligned `Level` pill (`ml-auto`), ensuring the `Level` pill occupies its exact final top-right pixel coordinates without exposing an empty header bar or any unrevealed controls.
- When `showChrome` is `true` (`B09`+), `Header` renders the full bar; the `Tutorials` button is conditionally rendered only when `showTutorials` is `true` (`B17`+ and post-onboarding).

---

## 4. Default Home Music Player Widget (`LeekBeats`)

Create `MusicPlayerWidget` in `src/app/App.tsx` and mount it in the persistent app shell so its audio element and state survive route changes (`home` ↔ `project` ↔ `session`):
- **Visual Design**:
  - Anchored at lower-left (`fixed bottom-6 left-6 z-30`, or at user-moved `{ x, y }` coordinates when moved in `B15`+).
  - **Unboxed / No Extra Dashboard Card**: Uses a compact, low-profile floating transport layout with thin borders (`border-[rgba(255,255,255,0.12)]`), transparent/subtle glass controls, `Previous` (`SkipBack`), `Play/Pause` (`Play`/`Pause`), `Next` (`SkipForward`), and concise text displaying the playlist (`LeekBeats`) and active track name.
- **Reveal Modes**:
  - `mode === "hidden"`: Returns `null` (absent from DOM and accessibility tree).
  - `mode === "play-only"` (`B05` initial prompt): Renders only the `Play` button at the exact lower-left anchor position.
  - `mode === "full"` (`B05` *"music player"* reveal and ordinary Home): Renders `Previous`, `Play/Pause`, `Next`, and the `LeekBeats` track/playlist label around the same Play/Pause button.
  - `showMoveControls` (`B15`+ and ordinary Home): Adds drag-to-move pointer handling plus a keyboard-accessible `Move` button (arrow keys / preset nudge with live position state) and compact/expand resize toggle.
- **Audio Playback Behavior**:
  - Attempts playback synchronously inside the user's click handler (`onPlayClick`).
  - If a local audio file is unavailable or playback is blocked/rejected, cleanly keeps `playing = false` so the UI never falsely indicates active playback, while still allowing track switching (`Previous`/`Next`) and state persistence across screens.

---

## 5. Reusable Floating UI Primitives (Unboxed)

Create a dedicated set of reusable floating tutorial components in `src/app/App.tsx` (used from `B01` onward, defined now as part of the Step 1 foundation):
- **`FloatingGroup`**: Pure flex layout container (`bg-transparent border-none p-0 shadow-none`) with zero enclosing card, border, backplate, or chat shell.
- **`FloatingMessage`**: Renders the single active Infie message (which doubles as her caption) with a thin border (`1px solid rgba(45,212,191,0.3)`), transparent interior (`background: transparent`), steady `Rounded Mplus 1c` / `Space Grotesk` typography (`#f1f5f9`), and no outer chat container.
- **`FloatingField`**: Labeled `<input>` or `<textarea>` with a thin border (`1px solid rgba(255,255,255,0.18)`, focus `rgba(45,212,191,0.55)`), `background: transparent`, natural keyboard focus (never intercepted by a global keydown listener), and an inline validation message slot beside the field.
- **`FloatingButton`**: Action button with a filled interior and border (e.g., teal fill `rgba(45,212,191,0.16)` + border `1px solid rgba(45,212,191,0.45)` for primary actions like temporary `Continue`, `Submit`, `Send`; subtle neutral fill `rgba(255,255,255,0.06)` + border `1px solid rgba(255,255,255,0.18)` for secondary actions like `Sign in with GitHub`).
- **No Progress Bar or Permanent Next/Skip Strip**: No standing tutorial toolbar, skip button, or step counter is created.

---

## 6. Asset Installation & File Changes

1. **`public/assets/infie-hero.png`**:
   - Copy `/tmp/attachments/4fba3f80_infie_hero_transparent.png` to `public/assets/infie-hero.png` so the transparent Infie hero artwork is installed locally.
2. **`src/app/App.tsx`**:
   - Add `TutorialBeat`, `RevealLedger`, `MusicPlayerState`, and `getRevealLedger(beat, subStep, onboardingComplete)` helper.
   - Add reusable floating primitives: `FloatingGroup`, `FloatingMessage`, `FloatingField`, `FloatingButton`.
   - Add `MusicPlayerWidget` (`LeekBeats` playlist, `Previous`/`Play-Pause`/`Next`, persistent audio/state, keyboard-accessible move affordance when enabled) and wire it into the persistent app shell.
   - Update `Header` and `I2HomeScreen` to respect `RevealLedger` flags while preserving 100% of existing `I2HomeScreen` layout and content when revealed, with `MusicPlayerWidget` included as a default lower-left Home widget.
   - Configure initial app state to start in first-run onboarding at `beat = "B00"` (pure black `#000000` for 2 seconds, held at black with zero rendered/accessible UI until Step 2).

---

## 7. Verification Strategy
- **Build & Type Check**: Run `pnpm build` to confirm zero TypeScript or bundling errors.
- **First-Run B00 Check**: Verify that initial load renders a completely empty `#000000` black viewport for 2 seconds and holds at black with no header, spinner, logo, or focusable/accessible DOM controls.
- **Ordinary Home Preservation Check**: Verify that when `onboardingComplete` is `true` (or when `B09`/`B18` reveal flags are active), `I2HomeScreen` renders its exact existing layout, header (with `Lvl. 1` at top-right), conversation box, and project cards, plus the new default lower-left `LeekBeats` music player widget.
