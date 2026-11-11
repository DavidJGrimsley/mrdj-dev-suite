# Infie tutorial — round 3 fixes (B03, B06, docked Continue, B12, B14, B17, B18, music widget, B19)

## Goal
Fix the ten issues flagged after the last refinement round, without changing anything else in the tutorial flow. "Done" means every item below behaves as specified in a headless Chromium run at 1280×800 and 1440×900. Normal and reduced motion follow the same order, and a full B00 → COMPLETE run still finishes.

## Decisions already made (from the user)
- **B12 bridge line:** a new turn, “Let me scoot over and make some room.”, plays on its own: line → slide left → ~1s pause → Active Projects + “You can resume projects…”.
- **Docked Continue (Home, Project, Session):** goes in the chat's action-button row, directly above the chat input.
- **B18 Library:** the tutorial opens the header Widgets gallery automatically; the Library tile carries the callout glow.
- **B14 agent question:** “Should new comments show newest first or oldest first?”, with the reply field pre-filled with “Newest first.”
- **Music player in Project/Session:** a bordered panel at the bottom of the **right column**, where My Widgets was. Home keeps the current unboxed lower-left player.
- **My Widgets:** removed from the Session view entirely. Project Home already has none.
- **B19 turn 2 line (verbatim):** “If your project didn't start in i², I'll onboard it for you. Don't worry about what that means as I'll prompt you with a tutorial any time you do something new here. For now, let's head Home. Click i2 in the top left corner.”
- **Unchanged:** the layout before Infie's chat docks (B02–B11). Continue stays directly under the current message, and the “Talk to Infie…” input stays pinned at bottom center.
- **Unchanged:** `tutorial-script.md`, which is user-owned. Deviations go in `AGENT-HANDOFF.md` instead.

## Root causes found in the code
| # | Issue | Cause (file) |
|---|---|---|
| 1 | B06 videos pause on the wrong frame | Videos are 9.0s at 30fps, and the device is fully formed at 4.0s (frames checked with ffmpeg). The code targets `duration/2`, but a fixed **2200ms fallback timer** always fires first, pausing at about 2.2s while Infie is still mid-swirl. A second 2200ms timer also advances the turn before the second half finishes. (`OnboardingStage.tsx` ~300–347, `onTimeUpdate` ~1286) |
| 2 | Infie pops when re-centering after the device array | The array leaves through `AnimatePresence` and is removed after its exit animation. Infie's container (a sibling with `layout`) isn't re-rendered at that moment, so its layout change isn't animated and it jumps. (`OnboardingStage.tsx` ~1253–1378) |
| 3 | Docked Continue and input in the wrong place | Continue is inserted between messages and the action row (Home) or inside the scrolling message list (Project/Session). The Home message area also grows to 480px during the tutorial instead of 360px, so the input moves. (`App.tsx` ~6114, ~6177, ~4804, ~5647) |
| 4 | B12 reveals happen at once | Active Projects reveal at 550ms while the 850ms slide is still running. The slide also starts from a hard-coded `x: 220` and repeats on every Home mount during the tutorial. (`OnboardingStage.tsx` ~490–531, `App.tsx` ~6096) |
| 5 | B14 “teal accent” question; out of order | The copy is hard-coded in `App.tsx` ~4769/4779/4789 and `OnboardingContext.tsx` 332. The question block is rendered after *all* history, so it appears below “Or click the Session name…”. |
| 6 | B17 overlap and repeated messages | B17 is treated as a “floating callout beat”, so a fixed form plus a floating copy of the current line sit over the Session chat, which shows the same line too. (`OnboardingStage.tsx` ~1066, ~2037–2219) |
| 7 | My Widgets reappears in B18 | B18 highlights the Library entry inside Session's My Widgets panel and shows a separate floating “Library” demo widget. (`App.tsx` ~5807–5841; `OnboardingStage.tsx` ~2144–2200) |
| 8 | Music player covers content | `LeekBeatsWidget` is `position: fixed` at bottom-left on every route, with no frame. |
| 9 | B19 line | Copy at `OnboardingStage.tsx` ~1000. |
| 10 | “What a noob.” too brief | `at(500, () => setTurnIndex(2))` (`OnboardingStage.tsx` ~410). |

## Shared constants (new file `src/app/onboarding/onboardingTiming.ts`)
```ts
export const B03_NOOB_TIMER_MS = 1220;          // 220ms entrance + a full 1000ms hold before the auto-follow
export const B06_TRANSFORM_PAUSE_AT_S = 4.0;    // frame 120: device fully formed in all three videos
export const B06_VIDEO_START_WATCHDOG_MS = 3000; // no playback progress by then → PNG fallback
export const B06_RECENTER_MS = 550;
export const B06_BESIDE_GAP_PX = 24;
export const B12_BRIDGE_READ_MS = 700;          // bridge line is readable before the slide starts
export const B12_SLIDE_MS = 850;
export const B12_LANDED_DWELL_MS = 1000;        // pause after landing before Active Projects
export const B18_GALLERY_OPEN_DELAY_MS = 400;
```
Add copy constants to `revealLedger.ts`, next to `B17_EXPLANATIONS`:
`B12_BRIDGE_LINE`, `B14_AGENT_QUESTION = "Should new comments show newest first or oldest first?"`, `B14_AGENT_REPLY_DEFAULT = "Newest first."`, `B19_TURN2_LINE` (the verbatim text above).

## Implementation

### 1. B03 — “What a noob.” holds for a full second
`OnboardingStage.tsx` cue effect, B03 turn 1: `at(B03_NOOB_TIMER_MS, () => setTurnIndex(2), false)`. This is uncompressed, so reduced motion gets the same hold. Nothing else changes.

### 2. B06 — transformation videos pause exactly at 4.0s
In `OnboardingStage.tsx`:
- Rename the phases to `"idle" | "playing_to_mark" | "paused_at_mark" | "playing_to_end" | "failed"`. Remove both 2200ms timers and the `duration/2` `onTimeUpdate` logic.
- **Turn entry (turns 1–3, normal motion):** retire Continue and set the phase to `playing_to_mark`. The muted video autoplays at Infie's position, as it does now.
- **Mark detection:** while in `playing_to_mark`, run a frame loop. Use `video.requestVideoFrameCallback` when available, otherwise `requestAnimationFrame`. Read `metadata.mediaTime` (or `currentTime`) each frame. Compute `pauseAt = Math.min(B06_TRANSFORM_PAUSE_AT_S, duration - 0.1)` once metadata loads. When `t >= pauseAt - 1/60`, call `video.pause()` and set `video.currentTime = pauseAt` so the displayed frame is exactly the 4.0s frame. Then set the phase to `paused_at_mark` and reveal Continue. Cancel the loop on unmount or turn change.
- **Start watchdog:** if the video errors, or no `playing` event arrives within `B06_VIDEO_START_WATCHDOG_MS`, set the phase to `failed`. In that state, hide the video, show live Infie with that turn's PNG beside her (the same as the reduced-motion presentation), and reveal Continue. Continue then advances the turn directly.
- **Continue while paused at the mark:** set the phase to `playing_to_end` and call `video.play()`. On `ended`, set the phase to `idle` and go to the next turn. A completion watchdog of `(duration − pauseAt) × 1000 + 2000` ms (about 7s) advances only if `ended` never fires. If `play()` rejects, advance immediately.
- Reduced motion is unchanged: no video, PNG fade, Continue.

### 3. B06 turn 4 — Infie glides back to center (no pop)
Replace the layout-projection approach with explicit transforms:
- Wrap Infie's 132×132 box in one `motion.div` (“InfieStageGroup”) that stays in normal flow and is centered. Render whatever sits beside her (the reduced-motion single PNG at 112px, the failed-video PNG, or the turn-4 three-device array at 296px = 3×88 + 2×16) in an **absolutely positioned** container at `left: calc(100% + 24px)`, vertically centered. Because it's absolute, it never changes the row's layout.
- The group animates `x: besideVisible ? -(besideWidth + B06_BESIDE_GAP_PX) / 2 : 0`. That is −160px for the array and −68px for one PNG, over `B06_RECENTER_MS` with ease `[0.22, 1, 0.36, 1]`. The beside container fades opacity 0↔1 with `x` 18→0 (0.42s in, 0.25s out).
- **Turn 4 Continue:** set `b06Recentering = true`. The array fades out while the group glides back to `x: 0` at the same time. At `B06_RECENTER_MS + 50` ms, call `advanceBeat("B07")`, after the glide has finished.
- Reduced motion: the transform transitions use duration 0 and only the opacity fades.
- Remove `layout` / `layout="position"` from the stage row and Infie box, so the message stack and form swaps can't cause stray layout animations.

### 4. Docked Continue in the action row; input stays put
**Home (`I2HomeScreen`, `App.tsx` ~6111–6242):**
- Delete the standalone Continue block (~6177–6181).
- Render the existing `HomeInfieActionRow` container when `isTutorialActive || showHomeActionButtons`. Keep its current styles and add `min-h-[54px]` while the tutorial is active, so the row's height is reserved and the input row never shifts when Continue appears or disappears.
- Inside the row: `FloatingContinueButton` first (when `isTutorialActive && dockedChat.showContinue && dockedChat.onContinue`), then the two existing action buttons only when `showHomeActionButtons`. With only Continue, it sits centered by itself. Before B12 turn 5, no Home action buttons appear.
- Set the message-area `maxHeight` back to 360 at all times (drop the tutorial-only 480).

**Project (`ProjectHomeScreen`, ~4826) and Session (`SessionScreen`, ~5675):**
- Delete the in-list Continue blocks (~4804–4808, ~5647–5651).
- Prepend `FloatingContinueButton` as the first item of the existing “Action pills” row when the docked Continue is available. Add `min-h-[54px]` to the row's inner flex during the tutorial, so the row height doesn't change.

**Auto-scroll:** add a bottom sentinel to the tutorial message lists in Project and Session (Session's `bottomRef` effect currently depends only on `messages`). Scroll it into view, smoothly, whenever `dockedChat.history` changes, so the newest line is never hidden.

### 5. B12 — sequenced Home transition
**Turn table in `OnboardingStage.tsx` (each index moves up by 1):**
| Turn | Line | Reveal (cue effect) | Continue |
|---|---|---|---|
| 0 | `B12_BRIDGE_LINE` | none (right side empty) | none; `at(B12_BRIDGE_READ_MS + B12_SLIDE_MS + B12_LANDED_DWELL_MS, () => setTurnIndex(1), false)`, or 1000ms in reduced motion |
| 1 | “You can resume projects…” | `home_resume_projects` immediately (existing 0.55s fade/rise) | `at(650)`, after Active Projects finish animating |
| 2 | “You can also start new projects…” | `home_new_import_buttons` immediately | `at(400)` |
| 3 | “We're now in i² Home.” | — | `at(400)` |
| 4 | “Here you can talk with me…” | — | `at(400)` |
| 5 | “I'll present Action Buttons…” | `home_action_buttons` immediately | `at(400)` |
| 6 | “I've filled in some dummy data…” | `tutorial_demo_project` (glowing cards) | none (open a project) |

Keep the `revealGroup` arrays cumulative, as they are now. Update the `cue` strings in `revealLedger.ts` to match the new turn numbers.

**Slide in `I2HomeScreen` (`HomeConversationEntry`):**
- Split it into a plain outer wrapper (measured) and an inner `motion.div` driven by `useAnimationControls`.
- Slide only when the entry mounts while `isTutorialActive && currentBeat === "B12" && turnIndex === 0`. In `useLayoutEffect`, measure the outer wrapper and compute `dx = innerWidth/2 − (rect.left + rect.width/2)`. Set `{x: dx, opacity: 0}`, fade in over 0.25s, wait `B12_BRIDGE_READ_MS`, then animate `x → 0` over `B12_SLIDE_MS` with ease `[0.22, 1, 0.36, 1]`.
- Every other mount (B19 return Home, post-tutorial) renders at `x: 0` with no slide. This fixes the repeated slide.
- Reduced motion: no translation; a 0.25s fade in place.
- The chat carries over the last two B11 messages plus the bridge line (existing `baseHistory` logic). The Home action row is present but empty, because turn 0 has no Continue.

### 6. B14 — new question, kept in conversation order
- `onboardingContextDef.ts`: history entries gain `kind?: "message" | "agent_question"`.
- `OnboardingStage.tsx` docked-publish effect: when B14 turn 1 is appended, also append `{ id: "B14-agent-question", role: "assistant", kind: "agent_question", text: B14_AGENT_QUESTION }` immediately after `B14-1`. Turn 2 (“Or click the Session name…”) is then appended after it. Keep the existing 3-entry cap: turn 1 shows `[B14-0, B14-1, question]` and turn 2 shows `[B14-1, question, B14-2]`.
- `ProjectHomeScreen`: render history entries in order. Entries with `kind === "agent_question"` render the existing question block (label `Agent question · Add Comments:` plus the question). Delete the separate trailing `showInlineAgentQuestion` block.
- Initialize the reply field's **value** to `B14_AGENT_REPLY_DEFAULT` (editable; placeholder `Newest first…`). If Send is pressed with an empty field, fall back to the default. Use the same fallback in `OnboardingContext.submitAgentQuestionReply`. The acknowledgement stays: “✓ Reply sent to session agent: “Newest first.””, then `setTurnIndex(2)`.
- No “teal accent” text may remain anywhere in `src/`.

### 7. B17 — form inside the Session chat column, each message once
- New `src/app/onboarding/SessionCompletionForm.tsx`: the existing fields (prefilled summary, corrected action, 1–5 star rating, optional feedback) and Submit, with its own field state. Props: `{ submitEnabled: boolean; onSubmit: () => void }`. Keep it unboxed: `FloatingField`s with borders and transparent interiors, and filled/bordered buttons. No outer card, border or background.
- Submit renders only when `submitEnabled`. The form's `onSubmit` always calls `preventDefault`. It calls `onSubmit` only when `submitEnabled`, so Enter in a field never acts as Continue.
- `SessionScreen` renders it between the message list and the Action pills row as a `shrink-0` block (`px-4 pt-2 pb-2`): `isTutorialActive && currentBeat === "B17" && isRevealed("session_completion_form")`, `submitEnabled = turnIndex >= B17_EXPLANATIONS.length - 1`, `onSubmit = () => { setDemoSessionCompleted(true); advanceBeat("B18"); }`. The message list (flex-1, scrolling) shrinks to fit, with auto-scroll from step 4.
- `OnboardingStage.tsx`: B17 is no longer a floating beat. All seven lines go to the docked chat, with Continue in the action row for turns 0–5 and none on turn 6. Remove the floating form, the floating message and avatar for B17, and the B17 form state.

### 8. B18 — header Widgets gallery replaces My Widgets
- **Turn 0** (“Everything's a widget here… Try moving the music player.”): an ordinary docked chat message with Continue in the action row (no longer floating). The music panel (section 9) shows the callout glow: border `#2dd4bf`, a glow shadow, and glowing grip/resize buttons.
- **Turn 1** (“One of my favorites is the Library…”): the only floating callout left after B12.
  - **`PersistentAppShell`:** when the tutorial reaches B18 turn 1, open the gallery after `B18_GALLERY_OPEN_DELAY_MS` and record that the tutorial opened it (a ref). When the beat or turn changes, close it if the tutorial opened it.
  - **`WidgetsGalleryModal`** gets two new props:
    - `highlightWidgetId?: WidgetId`: the Library tile gets the teal border/glow and `data-callout="true"`.
    - `tutorialMode?: boolean`: the overlay aligns to the top (`items-start pt-[6vh]`) and the card is capped at `max-h-[62vh]`, leaving room for the callout. All tiles and the Global To-Do hero become inert (`disabled`, no hover/click). The close X, backdrop click and Esc still work.
  - **`OnboardingStage`:** for B18 turn 1 only, render the floating callout: small Infie (52px) plus `FloatingInfieMessage` with Continue, `fixed`, centered, `bottom: 5vh`, `z-[60]` above the gallery. It fades in at the gallery-open delay. Continue calls `advanceBeat("B19")`, and the shell effect closes the gallery. This line is **not** added to the docked chat, so it never appears twice. If the user closes the gallery early, the callout and Continue stay.
- Remove `TutorialLibraryWidgetDemo`, the “Reopen Library Widget” button and the `libraryDemoOpen` state. Delete the My Widgets panel from `SessionScreen` (~5807–5841). Update the `library_entry_and_example` `componentTarget` in `revealLedger.ts` to “Header Widgets gallery with highlighted Library entry”.

### 9. Music player — bordered panel at the bottom of the right column in Project/Session
**`LeekBeatsWidget.tsx`:**
- New props: `placement: "floating" | "panel"` and `panelSlot: HTMLElement | null`.
- New internal `userMoved` state. It's set when the user starts dragging or turns on keyboard Move. It's reset, along with `position`, in the existing hidden-reset effect, so a restarted tutorial starts fresh.
- **Render modes** (the `<audio>` element always stays at the root, outside any portal, so playback, track, volume and time persist):
  1. `placement === "floating"` (Home): the current unboxed spotlight/dock behavior, unchanged.
  2. `placement === "panel"`, not `userMoved`, `panelSlot` present: render through `createPortal` into the slot as a **framed panel** in the Session panel style:
     - Outer: `border border-[rgba(255,255,255,0.05)] rounded-[6px] overflow-clip shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1)] w-full`.
     - Header: `bg-[#1d1b20] border-b border-[rgba(255,255,255,0.05)] px-3 py-[7px]`, with a lucide `Music2` icon (12px, `#555`) and the label `MUSIC` (Rounded Mplus 1c, 11px, uppercase, tracking 0.275px, `#777`). When `moveResizeRevealed`, the grip/Move and Resize buttons sit at the header's right.
     - Body: `bg-[#252323] px-3 py-2.5`, holding the existing [prev][play/pause][next][LeekBeats / track] slots. It fades in over 0.3s.
  3. `placement === "panel"`, no slot yet (during the route-change cross-fade): render nothing visible. This prevents a one-frame flash at Home's lower-left.
  4. `userMoved`: floating `position: fixed` at the user's `position`. Framed (same frame, 240px wide) when `placement === "panel"`; unboxed on Home.
- **Pop-out:** pressing the grip in panel mode, or turning on keyboard Move, reads the panel's rect. It sets `position = { left: rect.left, bottom: innerHeight − rect.bottom }`, sets `userMoved = true`, and starts the drag or arrow-key move from there, so there's no jump. Clamp uses the actual widget width: `left ≤ innerWidth − width − 12`.
- Add `data-placement` and `data-framed` attributes for verification.

**`App.tsx`:**
- `PersistentAppShell`: `const [musicSlotEl, setMusicSlotEl] = useState<HTMLDivElement | null>(null)`. Pass `placement = wsState === "none" && (route === "project" || route === "session") ? "panel" : "floating"` and `panelSlot = musicSlotEl` to `LeekBeatsWidget`. Pass `musicSlotRef = setMusicSlotEl` to `ProjectHomeScreen` and `SessionScreen`.
- **`ProjectHomeScreen` right column (272px):** always render the column container. Gate its existing panels (Human Testing, Explorer) on `showWidgetsPanel` as now, and append `<div ref={musicSlotRef} data-name="MusicWidgetSlot" className="mt-auto shrink-0 w-full" />`.
- **`SessionScreen` right column (230px):** always render the column container. Gate Human Testing and Explorer on `showTaskGroups` as now, delete My Widgets, and append the same slot div (`mt-auto`).
- Result: the player sits in its own space at the lower right of Project and Session, from the first Project frame (B13) onward, and never overlaps the chat, input or panels. While the tutorial hides the side panels, the right column holds only the player. Post-tutorial layouts already show these columns, so they're unchanged apart from the player and the removed My Widgets.

### 10. B19 line
Turn 2 uses `B19_TURN2_LINE` verbatim. The existing `highlightHomeNav` glow on the header “i2” control for B19 turn 2 stays as the target.

### 11. Docked-chat publishing rules (`OnboardingStage.tsx`)
- Replace `isFloatingCalloutBeat` with `isFloatingCallout = currentBeat === "B18" && turnIndex === 1`. The docked-publish effect skips that turn entirely: no history entry, `showContinue: false`.
- After B11, the floating stage renders only the B18 turn-1 callout. Return `null` otherwise.

## Files touched
- `src/app/onboarding/onboardingTiming.ts` (new)
- `src/app/onboarding/SessionCompletionForm.tsx` (new)
- `src/app/onboarding/OnboardingStage.tsx`
- `src/app/onboarding/LeekBeatsWidget.tsx`
- `src/app/onboarding/onboardingContextDef.ts`
- `src/app/onboarding/OnboardingContext.tsx`
- `src/app/onboarding/revealLedger.ts`
- `src/app/App.tsx`
- `AGENT-HANDOFF.md`: append a dated history entry (status, changed paths, exact checks and results, current checkpoint, open issues) and record the user-directed copy and choreography deviations from `tutorial-script.md`.

## Edge cases and failure modes
- **Muted autoplay blocked or video missing:** the watchdog switches to the `failed` PNG fallback and Continue still appears, so the tutorial never stalls.
- **Window resize mid-slide:** the offset is measured once at mount, and the slide always ends at `x: 0`.
- **Route cross-fades (Home↔Project↔Session):** the player is briefly invisible while the next screen mounts. Audio is unaffected.
- **User moves the player in B18:** the new position is kept across routes (framed in Project/Session, unboxed on Home), and the right-column slot collapses.
- **User closes the gallery early in B18:** the callout and Continue remain, and the beat advances normally.
- **B17 Enter key:** no hidden turn advance; Submit appears and works only on the final turn.
- **Tutorial restart from Pricing:** the player's move state resets with the existing hidden-reset effect.

## Verification
1. `pnpm build` must exit 0.
2. `rg -n "teal accent|My Widgets" src/app` must return no matches.
3. Write a headless Playwright script at `/tmp/pw/verify_round3.mjs`, using `/opt/playwright-mcp/node_modules/playwright` with `executablePath: "/usr/bin/chromium"`, against the already-running dev server (prior runs used `http://localhost:3000`; confirm with `curl -sI` first, and never start a server). Use `?beat=` deep links where the earlier state isn't needed. Assert:
   - **B03:** “What a noob.” is the newest message for ≥1000ms after it's fully visible, and only then does the next message appear.
   - **B06 turns 1–3:** when Continue appears, `video.paused === true` and `|video.currentTime − 4.0| ≤ 0.04`. Screenshot each paused frame and confirm the device is visible. After Continue, the turn doesn't advance before `currentTime ≥ 8.9` / `ended`.
   - **B06 turn 4 Continue:** sample the InfieStageGroup's `getBoundingClientRect().x` every animation frame during the re-center. It must change monotonically through ≥5 intermediate values, with no single-frame jump over 40px, and land centered before B07 begins.
   - **B12:** at turn 0 there's no Active Projects element, and the bridge line is the newest chat message. The conversation entry's x changes over about 850ms. Active Projects appear ≥900ms after the slide ends. Continue appears only after Active Projects reach opacity 1.
   - **Docked Continue (Home B12 turn 1, Project B13, Session B15):** Continue's parent is the action-pill row, its bottom edge is above the input row's top edge (gap < 80px), and the Home input row's y position is identical across B12 turns 1, 2 and 4 (±1px).
   - **B14:** the question text is exact, the reply field's value is “Newest first.”, and DOM order is B14-1 → question → B14-2. After Send, the acknowledgement appears.
   - **B17:** the form is inside the Session center column; its box doesn't overlap any chat message box; no floating Infie message exists; each B17 line appears exactly once in `document.body.innerText`; Submit appears only on turn 7 and leads to B18.
   - **B18:** turn 0 is a chat message with Continue in the action row, and the music panel has the callout glow. At turn 1 the gallery opens by itself, the Library tile has `data-callout="true"`, and the callout box doesn't overlap the gallery card. The text “My Widgets” is absent. Continue closes the gallery and lands in B19.
   - **Music panel:** in Project and Session, `[data-name="LeekBeatsWidget"]` is inside `[data-name="MusicWidgetSlot"]` in the right column, has `data-framed="true"`, and overlaps no other panel or the center column. The same `<audio>` node persists across Home → Project → Session. On Home it's `data-placement="floating"` and unboxed.
   - **B19 turn 2:** the text exactly matches the user's line, and the i2 control glows.
   - **Full run:** B00 → COMPLETE still finishes on normal i² Home at Lvl. 1.
   - **Reduced motion** (`emulateMedia({ reducedMotion: "reduce" })`): B06 uses PNGs only with the same lines and order, B12 has no slide but the same order, and B03 still holds 1s.
4. Capture screenshots at 1280×800 and 1440×900: B06 paused frame, B06 re-center midpoint, B12 mid-slide and post-landing, B14 chat, B17 form, B18 gallery with callout, the Project and Session music panel. Inspect them visually and record the results in `AGENT-HANDOFF.md`.
