# Plan: Step 3 — Level first, then music (B03–B06)

## 1. Goal and scope
Implement `tutorial-script.md` B03–B06 on top of the existing shell, character, profile and Home layout. Reveal order must read **identity → level → music**. Stop after the B06 line (Continue is withheld there; see section 7).

Out of scope: B07+ (folder, Home reveal, project/session), header chrome beyond the level pill, widget move/resize (B15), any change to the Auth/Pricing/B00–B02 flow, `I2HomeScreen` layout.

## 2. What exists today (and what is wrong with it)
Grounded in the repo:
- Beats B03–B06 text and gating already live in `OnboardingStage.tsx`; reveal groups are driven by a context effect in `OnboardingContext.tsx`. `STEP_2_MAX_ENABLED_BEAT = "B03"` blocks everything after the handoff.
- `LeekBeatsWidget.tsx` is mounted at the shell root (good: survives route changes) but has these gaps:
  1. **Layout shift**: Play lives in a flex row, so revealing Prev before it pushes Play to the right. The script requires Play to already be at its final anchor.
  2. **Placeholder tracks, no `src`**: playback can never start. No audio files in `public/`.
  3. **State not derived from the audio element**: `src` swaps can silently pause while the UI says "playing".
  4. No Infie "press" sync; `pointingToPlay` only nudges Infie.
- Reveals fire the instant a beat starts, not after the question/phrase ("level zero", the reply field, Play, "music player").
- The early-beat stage is vertically centered, so Infie and the message **jump** as fields/Continue appear. That violates "keep text steady".
- The level pill currently shows on beat entry, not on "level zero".

## 3. Audio assets and playlist data
- Copy attachments to `public/assets/music/`:
  - `night-market.mp3` (1:52, attachment `dc0c219c…`)
  - `costco-dates.mp3` (3:16, attachment `81aba641…`)
- New `src/app/onboarding/leekBeatsPlaylist.ts`:
  ```ts
  export interface Track { id: string; title: string; artist: string; src: string }
  export const PLAYLIST_NAME = "LeekBeats";
  export const LEEKBEATS_TRACKS: Track[] = [
    { id: "night-market", title: "Night Market", artist: "Leek Beats", src: `${import.meta.env.BASE_URL}assets/music/night-market.mp3` },
    { id: "costco-dates", title: "Costco Dates", artist: "Leek Beats", src: `${import.meta.env.BASE_URL}assets/music/costco-dates.mp3` },
  ];
  ```
  Adding other artists later = append entries; the widget reads `artist` per track.
- `<audio preload="none">`; no external stream, no login.

## 4. Reveal timing model (the core change)
Replace the "reveal on beat entry" effect for B03–B05 with stage-driven timed reveals, using a small `useRevealAfter(group, delayMs, deps)` helper in the stage. Delays are a reading beat, opacity fade only. Reduced motion uses ~120 ms with the same order and content.

| Beat/turn | Line shows | Then reveals | Delay |
| --- | --- | --- | --- |
| B03 t0 | "Nice to meet you, {name}. I can see you're level zero." | **Level pill only** (`Lvl. 0`), header otherwise absent | ~1.1 s |
| B03 t0→t1 | line replaced (one message at a time) | — | ~2.6 s after level appears |
| B03 t1 | "What a noob… Hit Continue when you're ready." | **Continue** beside the message (introduced by the line itself) | ~0.5 s |
| B04 t0 | "I'm going to help you build…" | **One reply field + Send**; Continue beside message | ~0.5 s |
| B04 t1 | "I actually don't do much coding…" | Continue only (field retired) | — |
| B05 t0 | "Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet." | **Widget's own Play button only**, plus Continue | ~0.6 s |
| B05 t1 | "Oh yea, that's my jam. Your music player lives right here." (only if playback truly started) **or** "Your music player will be right here when you want it." | **Track/playlist text, Prev, Next** around the same Play/Pause | ~0.5 s |
| B06 | "I'm your orchestrator, coordinator, middle-man…" | nothing (no app UI) | — |

Script wording is kept verbatim (already in the stage). The level indicator keeps the existing "Lvl. N" format, since it is the actual header indicator.

## 5. Component changes

### 5.1 `OnboardingContext.tsx`
- `STEP_3_MAX_ENABLED_BEAT = "B06"` (replaces the B03 cap; `advanceBeat` blocks B07+).
- Remove the B03/B04/B05 reveal effect branches (the stage now drives timing). Keep retire logic: identity retired at B03; `project_interest_reply` retired at B04 t1.
- Persist profile and project-interest reply to `localStorage` under an `i2.onboarding.*` namespace (real state, separate from tutorial demo records). `startOnboarding` clears only tutorial-owned state, not these.

### 5.2 `OnboardingStage.tsx`
- Fix stage layout: top-anchored column (fixed top offset, ~16vh) so Infie + message never move; the reply field and Continue grow **downward** only. No text animation (message is static; only an opacity fade on appear).
- Continue stays inside `FloatingInfieMessage` (beside the current message, per turn, removed on use). No toolbar/progress/skip.
- B04 field: single-line `FloatingField` + Send; Enter in the field submits natively (form `onSubmit`, no global key handler). Send and Continue both advance to t1 once; reply stored if non-empty.
- B05 Infie performance:
  - t0: Infie leans toward the lower-left player (soft beckon loop; static pose under reduced motion).
  - `onPressStart` from the widget fires synchronously in the click handler, which bumps `pressNonce`. Infie does one press beat (lean + squash ~120 ms) while the Play button shows a one-shot pulse ring. Reduced motion: highlight only.
- B05 outcome resolution uses a `b05ResolvedRef` so the first of {playback resolved/rejected, Continue} wins exactly once; later clicks (pause/play) never change the line or re-advance.
- B06: show the line; **no Continue** (see section 7). `advanceBeat` to B07 stays blocked by the cap.

### 5.3 `LeekBeatsWidget.tsx`
- Layout: fixed slots so **Play never moves**: `[prev slot][PLAY][next slot][label slot]`. Unrevealed slots are empty spacers (nothing in the DOM/AX tree). Final anchor lower-left (`left:24, bottom:24`), `z-50`.
- Audio is the single source of truth: drive `isPlaying` only from audio events (`playing`, `pause`, `ended`, `error`, `emptied`). Never set playing optimistically.
- Click handler order: (1) call `audio.play()` synchronously (gesture-valid, before any animation/await), (2) fire `onPressStart`, (3) await the promise, then `onPlayAttempt("played" | "blocked")`. Missing/failed source (404, decode error, `NotAllowedError`) → paused, `"blocked"`.
- Prev/Next change `src`; if it was playing, call `play()` again in the same handler; `ended` auto-advances to the next track and continues.
- Label: `LeekBeats` plus current `title`; `aria-label`s on Play/Pause, Prev, Next.
- Keep the same `<audio>` instance, `currentTime`, volume and position in shell-level state across Home/Project/Session navigation (the widget stays mounted outside `AnimatePresence`). Move/resize controls remain unrevealed until B15.

### 5.4 `App.tsx`
- Pass `onPressStart` through to the stage (small shared callback in the shell).
- Raise the widget z-index above the stage; no other layout edits. The minimal Header variant is reused as-is (right-aligned level pill, no border/background, same right/vertical position as the eventual full header).

## 6. Edge cases and failure modes
- Playback blocked/404/unsupported: stays paused, line becomes "Your music player will be right here…", full widget still revealed, onboarding continues.
- Continue at B05 t0: no audio attempt; full widget revealed **paused**.
- Double-click Play, or Play then Continue quickly: one resolution, one advance.
- Pause/Play, Prev/Next after reveal never re-trigger onboarding lines.
- Reduced motion: same order/content, fades only, no lean/pulse.
- Reload mid-tutorial restarts from the Auth/Pricing flow (unchanged; tutorial beat is not persisted).
- Auth "Sign In" shortcut still lands on normal Home; the widget appears at the same anchor with the full player.

## 7. B06 stop behavior (decided)
Show the B06 line and **withhold Continue** until B07 is built, so no dead gate exists. The next step enables it by raising the cap.

## 8. Verification (real browser, not just build)
Extend the headless Chromium harness in `/tmp/pw` (playwright-core, `/usr/bin/chromium`, dev server `:3000`):
1. Reveal-order assertions at each stage via DOM queries: identity → `[data-name=Level]` only (no header chrome, no player) → Play only → full player. Assert nothing else (no tutorial panel/toolbar/empty chrome).
2. Level pill right edge sits 24 px from the viewport edge, and the minimal header has no border/background.
3. Continue appears only on B03 t1 and is removed after click; Continue absent at B06.
4. B04: field appears after the question; Enter submits; Continue without text works; reply in `localStorage`.
5. B05 audio: click Play → `audio.paused === false`, `currentTime` advances, line says "that's my jam". Block path: `page.route('**/*.mp3', abort)` → still paused, other line, flow continues. Continue path → full widget paused.
6. Play button bounding box identical before/after the "music player" reveal (no shift).
7. Persistence: assert the same `<audio>` node and monotonic `currentTime` across forced shell re-renders now; the full cross-route check lands in the B09+ step when routes become reachable.
8. Stability: Infie and message bounding boxes unchanged as fields/Continue appear.
9. No duplicate advancement; no console/page errors; reduced-motion run (`emulateMedia({reducedMotion:'reduce'})`).
10. `npm run build` via `mise exec`.

## 9. Files
- Add: `src/app/onboarding/leekBeatsPlaylist.ts`, `public/assets/music/night-market.mp3`, `public/assets/music/costco-dates.mp3`.
- Edit: `OnboardingContext.tsx`, `OnboardingStage.tsx`, `LeekBeatsWidget.tsx`, `App.tsx`.

## 10. Acceptance criteria
- After B02: the level pill appears at top-right on "level zero" with nothing else of the header; Continue arrives with the "Hit Continue" line.
- B04 conversation and the single reply field behave per script; Send or Continue both work.
- B05 shows only the widget's Play first at the lower-left anchor; real playback of Night Market starts from that click, Infie presses in sync, "that's my jam" only on real playback; the Continue/blocked path shows the paused full widget with the other line.
- The "music player" line reveals label, Prev, Next around the unmoved Play/Pause.
- B06 line displays with no added UI and no Continue.
- Text and Infie never shift position as controls appear; no panels, toolbars or empty chrome.
