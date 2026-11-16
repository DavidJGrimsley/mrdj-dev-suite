# Task Worksheet: Infie Preferences Widget Implementation

- **Request ID:** INFIE-PREFS-GROK-FIX-HYDROGEN-01 (building on INFIE-PREFS-FINAL-FIX-01)
- **Agent:** Google Gemini 4 Hydrogen (High)
- **Target App Scope:** `/apps/i2-ide-prototype`

## Objective & Requirements
Implement the "Infie Preferences" widget in the prototype IDE and resolve all findings from the final Grok review while preserving all original requirements:
1. **Gallery & Renderer Integration:**
   - Add "Infie Preferences" entry to the existing Widgets gallery (`ALL_WIDGETS`, `WidgetsGalleryModal`).
   - Add renderer support to `WidgetContent` so it renders in both standard modals and docked panels.
   - Do NOT add to any default screen layout (dock remains as-is by default; accessible via gallery).
   - Exclude from default legacy `WidgetsPicker` (`RightPanel`).
2. **Preference Controls (5 total):**
   - **Guidance (5 discrete choices):** Default = 80. Preserved as the 4th of 5 semantic stops (`0, 25, 50, 80, 100`: Ask Every Step → Act on my behalf). Stop 3 (80) is default.
   - **Sassiness (5 discrete choices):** Minimum = None (0), Default = 100 ("Very Sarcastic" / Maximum snark).
   - **Verbosity (5 discrete choices):** Default = 0 (Natural short-and-sweet, progressing toward Caveman compression).
   - **Technical Level (5 discrete choices):** Default = 50 (Experienced, provisional middle).
   - **Text Speed (3 discrete choices):** Slow, Normal, Fast. Default = Normal (provisional middle). Descriptions contain NO numeric timings.
3. **Control Display & Interactions:**
   - Textual minimum/maximum endpoint labels only; NO numeric labels in the UI.
   - Each stop is hoverable with its own explanatory tooltip.
   - Active thumb tooltip with rich current stop description.
   - Drag, click, and keyboard changes update accessible value text (`aria-valuenow`, `aria-valuetext`, `aria-pressed`).
   - Focus indicators and keyboard accessibility via Radix slider primitives.
4. **Shared State & Consumers:**
   - Shared in-memory React state during app lifetime (no `localStorage`, no reload persistence, no backend/API wiring).
   - Speed applies to tutorial and Infie message text reveal, respecting `prefers-reduced-motion` and keeping safety behavior untouched.
   - Other controls remain stateful UI preferences without claiming they alter actual model output.

---

## Grok Final Review Findings & Resolutions (INFIE-PREFS-GROK-FIX-HYDROGEN-01)

### 1. P0: Docked Tutorial Continue Never Arms at Normal Speed & Reduced-Motion First-Paint Flashes
- **Problem:** Stage-level completion in `OnboardingStage.tsx` was only triggered by `RevealingInfieText` during early center-stage beats (`B02`–`B11`). From `B12` onward, `OnboardingStage` returns `null` (or renders `FloatingInfieMessage` in `B18` Turn 3, which held its own unlinked `useTextRevealGate`), leaving stage-level `textComplete` stuck `false` at non-reduced speeds so `dockedChat.showContinue` never armed on Home, Project, and Session. Additionally, local `useReducedMotion`/`usePrefersReducedMotion` hooks in `OnboardingStage.tsx` and `App.tsx` initialized to `false`, `useRevealedText` mutated `prevTextRef` during render, and `RevealingInfieText` reset `skip` in a passive `useEffect` rather than during render.
- **Resolution:**
  - Added `currentMessageId` and `onTextComplete?: (messageId: string) => void` to `DockedTutorialChatState` (`onboardingContextDef.ts`).
  - Wired `handleDockedTextComplete` from `OnboardingStage.tsx` into `dockedChat` and invoked `dockedChat.onTextComplete?.(m.id)` alongside the screen-local gate callbacks in `I2HomeScreen`, `ProjectHomeScreen`, and `SessionScreen` (`App.tsx`).
  - Added `onTextComplete` prop to `FloatingInfieMessage` (`FloatingPrimitives.tsx`) and connected it to `OnboardingStage`'s `handleTextComplete` for `B18` Turn 3 (`isFloatingCallout`), passing `showContinue={isRevealed("continue_button") && Boolean(onContinue)}` so `FloatingInfieMessage` owns its Continue gate cleanly.
  - Replaced `useState(false)` reduced-motion hooks in `OnboardingStage.tsx` and `App.tsx` with the synchronous `usePrefersReducedMotion()` hook from `infiePreferencesContext.tsx`.
  - Updated `useTextRevealGate`, `useRevealedText`, and `RevealingInfieText` in `infiePreferencesContext.tsx` to sync message-change state via React state checks during render (deriving `effectiveComplete` / `currentLength` / `effectiveSkip` synchronously) so reduced motion completes immediately and new messages never flash on first paint.

### 2. P0: Undeclared `isLatest` in `TutorialJennyScreen`
- **Problem:** `TutorialJennyScreen.tsx` referenced undeclared `isLatest` inside `messages.map((msg) => ...)` while only `isLatestJenny` was declared in component scope.
- **Resolution:** Updated `messages.map((msg, idx) => ...)` in `TutorialJennyScreen.tsx` to compute `const isLatestMsg = idx === messages.length - 1;` and gate `<RevealingInfieText>` with `isJenny && isLatestJenny && isLatestMsg`, preserving `jennyTextComplete` gating on `sample-answer-button` and `handleAnswerClick`.

### 3. P1: Experimemo `question` and `schema-question` Send Enabled While Infie's Prompt Reveals
- **Problem:** In `ProjectHomeScreen` (`App.tsx`), `InfieComposer` for Experimemo `question` and `schema-question` stages had Send enabled and glowing on first paint before Infie's prompt finished revealing.
- **Resolution:** Added `sendDisabled?: boolean` to `InfieComposer` (`canSend = !disabled && !sendDisabled && value.trim().length > 0`) and passed `sendDisabled={isExperimemoQuestionStage && !experimemoHomeTextComplete}` for `stage === "question" || stage === "schema-question"`. User and other-agent messages in `FlowMessageBubble` remain immediate (`shouldReveal = false`).

### 4. P2: Polite Live Region Screen-Reader Name Mutation
- **Problem:** `RevealingInfieText` placed `role="button"` and `aria-label="Click or press Enter to reveal full text"` on a wrapper span around `<span className="sr-only">{text}</span>` inside `role="status" aria-live="polite"` containers, causing the live region's accessible name to change from the skip instruction to the full text upon completion.
- **Resolution:** Moved `role="status"` and `aria-live="polite"` onto the static `<span className="sr-only">{text}</span>` inside `RevealingInfieText` (activated via `live` prop on the 5 live-region Infie surfaces in `FloatingPrimitives.tsx`, `OnboardingStage.tsx`, and `App.tsx`) and removed `role="button"`/`aria-label` from the text wrapper. Kept pointer click-to-reveal on the `aria-hidden="true"` visual span and rendered a separate `<button type="button">Reveal full text</button>` outside the live-region span for keyboard/AT users.

### 5. P2: B17 Segue & Timed Tutorial Transitions Advancing Before Slow Text Completes
- **Problem:** `OnboardingStage.tsx` B17 segue used a fixed `segueDwellMs(B17_TO_UI_SEGUE, 0.5)` timer (~1540ms) which fired before Slow text reveal (~2394ms) completed; `B03` turn 1, `B11` turn 2, `B12` turn 0, and `B18` segue also used fixed dwell timers without checking `textComplete`. Also resolved TS2448 TDZ in `OnboardingStage.tsx` where `B06`'s `useEffect` referenced `textComplete` before declaration.
- **Resolution:** Moved `currentLine`/`currentMessageId`/`onContinue`/`useTextRevealGate` above effects in `OnboardingStage.tsx` and added `pendingTimedTransition` + `afterDwellAndText` so `B03` turn 1, `B11` turn 2, `B12` turn 0, `B17` segue, and `B18` segue require both the dwell timer and `textComplete` before advancing.

### Additional Layout Fix Discovered During Verification
- Adding `infiePreferences` to `devTools` in `WidgetsGalleryModal` (`App.tsx`) pushed `devTools` to a 4th row in `grid-cols-3`, pushing `Device Emulators` (`emuWeb`) below the `max-h-[85vh]` fold and causing `widget-sizing.test.mjs` drag-from-gallery to fail. Updated `WidgetsGalleryCard` (`max-w-[760px]`) and `Developer Tools` (`grid-cols-2 sm:grid-cols-4`) so `devTools` fits cleanly in 3 rows and `widget-sizing.test.mjs` passes.

---

## Verification Checklist
- [x] **TypeScript (`npx tsc --noEmit`):** Zero errors in `infiePreferencesContext.tsx`, `InfiePreferencesWidget.tsx`, `FloatingPrimitives.tsx`, `OnboardingStage.tsx`, `onboardingContextDef.ts`, `TutorialJennyScreen.tsx`, `SupportNewFrameworkModal.tsx`, and zero new errors in `App.tsx` (only pre-existing errors remain elsewhere in `App.tsx`, `src/imports/`, and `vite.figma.config.ts`).
- [x] **`pnpm build`:** Passed cleanly (`dist/` built in 3.38s).
- [x] **`pnpm build:hosted`:** Passed cleanly (`dist-hosted/web`, 38 files, verification passed).
- [x] **`pnpm test` (`node --test "scripts/__tests__/*.test.mjs"`):** 71/83 passed (all unit/contract tests and `widget-sizing.test.mjs` 4/4, `dock-presentation.test.mjs`, `home-import-pricing.test.mjs`, `flow.test.mjs`, `hosted-build.test.mjs`, `jenny.test.mjs`, `review-followup.test.mjs`, `simulator-foundation-ui.test.mjs`, `source-asset-urls.test.mjs`, `tutorial.test.mjs` passed).
- [ ] **`tutorial-browser.test.mjs` (12 failing cases within the single browser acceptance suite):** `completeJenny` passed in Chromium, then line 265 failed because `p.innerText()` includes `.sr-only` full text + partial `aria-hidden` reveal + `Reveal full text` button, and line 355 failed because `m.textContent` matches `.sr-only` on frame 0 while `composer-send` is gated (`data-glow="false"`) until reveal completes per Finding 3 (cascading into the subsequent sequential subtests). `tutorial-browser.test.mjs` was left unmodified.

---

## Exact Changed Paths (within `apps/i2-ide-prototype`)
1. `src/app/widgets/infiePreferencesContext.tsx`
2. `src/app/widgets/InfiePreferencesWidget.tsx`
3. `src/app/onboarding/FloatingPrimitives.tsx`
4. `src/app/onboarding/onboardingContextDef.ts`
5. `src/app/onboarding/OnboardingStage.tsx`
6. `src/app/App.tsx`
7. `src/app/components/SupportNewFrameworkModal.tsx`
8. `src/app/components/ui/tooltip.tsx`
9. `src/tutorial/TutorialJennyScreen.tsx`
10. `.agents/worksheets/task-infie-preferences.md`

## Direct completion pass — 2026-11-16

- User canceled delegation and explicitly authorized direct implementation.
- Canceled INFIE-PREFS-BROWSER-FIX-01 and verified no matching native agent process remained.
- Added explicit reveal-state/visual-text attributes; browser assertions now wait for completed visible text and enabled actions without weakening content checks.
- Fixed the docked current-message identity when a later agent-question entry follows Infie, so B14 can release Continue.
- Kept active slider tooltips open during pointer drags/value changes; simplified prototype copy.
- Browser artifacts now stay under this app's .agents/verification directory.
- Production build and hosted build passed; 66 unit/contract checks passed. Full browser walkthrough is running with new slider and B14/reduced-motion regression coverage.
- Full TypeScript checking still reports existing errors in App.tsx, imports, and Vite config; no errors reported for the new preferences modules or modified tutorial modules.

## Final outcome — COMPLETE

- Direct completion fixed B14 current-message identity and gated the real agent-reply Send on Infie's reveal completion.
- Slider thumb tips now remain visible during value changes and pointer drags. Browser coverage confirms five sliders, correct defaults/stop counts, keyboard endpoints, active tooltip, reset, and session retention.
- Browser assertions now check completed visual text and wait for gated controls, preserving exact message/flow checks. Screenshots stay within the app folder.
- All 66 unit/contract checks passed (.agents/verification-unit.log).
- All 17 other browser walkthrough cases passed, including the full planning/coding/review/merge/cleanup sequence, mobile viewport, alternate merge path, unavailable preview recovery, and existing projects/onboarding (.agents/verification-browser-complete.log). That run's only failure was the newly added B14 regression check incorrectly expecting Continue at a reply-only step.
- Corrected the new B14 check to use the real reply Send; its focused rerun passed, also confirming B12 normal-motion Continue (.agents/verification-docked.log). All 18 browser cases have now passed across the final walkthrough and focused follow-up.
- Final production and hosted builds passed. git diff --check passed.
- Full TypeScript checking remains blocked by existing App.tsx/import/Vite configuration errors; do not claim a full clean typecheck.
- No commits or staging. No external agent remains assigned to this task. Changes by this direct completion pass stay within apps/i2-ide-prototype.

## Opening chat position correction — 2026-11-16
Removed mt-auto from OnboardingMessageScroller so messages begin directly below Infie. Updated the source regression check. Live browser measurements at desktop and mobile widths confirm an 8px gap below the artwork row; focused review-followup tests pass (2/2).

## Preference Sliders tutorial refinement — 2026-11-16

- User requested no scrollbar flash, the title Preference Sliders, global model/conversation scope, and a brief compact preview with speed selection after B10.
- Rolling conversation scrollers hide scrollbar chrome while retaining wheel/touch/keyboard scrolling; exiting messages leave layout immediately.
- Preference Sliders is the title in the gallery and widget. Text speed also applies to the latest provider messages, with shared application context across conversations.
- B10 now ends with turn 2: a short introduction, five compact named sliders, and an immediate speed choice before continuing to B11. Existing model connection gate remains required before this turn.
- Live browser walkthrough confirmed model connection -> preview -> Fast selection -> B11. Preview fits 390px mobile viewport. Another walkthrough confirmed the three-message stack has scrollbar-width none and WebKit scrollbar display none. Gallery title and five controls verified.
- Production build passed; 34 focused tutorial/flow/Jenny/review checks passed. No browser errors on the preview walkthrough.

## Follow newest message during tree reveals — 2026-11-16

Replaced delayed one-shot scrolling with a layout observer on both the message viewport and its contents. Viewport shrink (trees, media, window resize) and typewriter text growth now follow the newest text on the next animation frame. Observer and frame clean up on turn changes/unmount. Live browser checks confirmed bottom gaps under 1px for initial workspace tree, subsequent tree message, viewport shrink, and the next mobile folder message. Production build and 12 focused checks passed.

## MDS Wrap Up — 2026-11-16

- User confirmed omission of generated screenshots and inclusion of source, tests, docs, and this worksheet.
- User explicitly requested merge, including the existing main-target PR #91.
- Doctor CI passed with --timeout-ms 600000: 0 blocking errors, 8 warning categories; all 86 tests passed and production build passed. Default 120000ms check had timed out during the browser walkthrough; no test was skipped to resolve it.
- Hosted build passed before Doctor so browser acceptance used the latest assets.
- React Doctor remains a warning (41 diagnostic errors and 323 warnings). Full TypeScript baseline errors remain; missing lint/typecheck package scripts are disclosed warnings.
- Existing PR #91 review threads were all resolved before publishing this update.
- Files outside apps/i2-ide-prototype and generated screenshots are excluded from staging as instructed. Project todo is outside this app scope and was preserved.
