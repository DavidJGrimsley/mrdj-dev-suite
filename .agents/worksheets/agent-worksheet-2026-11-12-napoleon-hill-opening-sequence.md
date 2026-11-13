# Task Worksheet: Napoleon Hill Handwriting Opening Sequence

- **Status**: COMPLETE
- **Created**: 2026-11-12
- **Updated**: 2026-11-12
- **Worktree**: `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\mrdj-dev-suite-handwriting-quote`
- **Base Commit (`HEAD`)**: `fef519924028c5022a847fd3bd67982ba33c128b`
- **Artifact Directory**: `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\generated\napoleon-hill-opening-sequence`
- **Target App**: `apps/i2-ide-prototype` (`http://127.0.0.1:8444`)

## Continuation Plan (Readability Label)
- **Owner**: Sole writer (Gemini 4 Hydrogen Extra)
- **Scope**: `apps/i2-ide-prototype/src/app/closing/ClosingSequence.tsx`, `apps/i2-ide-prototype/src/app/closing/closing.css`, and `apps/i2-ide-prototype/docs/closing-sequence.md`. Preserve all current user work, untracked assets, timings, signature path/pen motion, and minimal presentation. No staging/commits/push.
- **Changes**:
  - [x] Render exact `Napoleon Hill` text in a small, plain, subdued gray font directly beneath the handwritten signature (`ClosingSequence.tsx`, `closing.css`).
  - [x] Keep the visual label absent during `loading`, `quote`, `pause`, and `signature`, and display it upon signature completion (`hold`, `turning`, and `complete` before sheet hides; immediately on `hold` under `prefers-reduced-motion: reduce`).
  - [x] Swap `.hill-sr-only` for the visual `.hill-signature-label` once shown so `"Napoleon Hill"` is never duplicated in the accessibility tree; reserve `.hill-signature-aid` slot height (`min-height: 1.25em`) so writing never shifts or clips on desktop or mobile.
  - [x] Verify in real Chromium (`1280x800` desktop, `390x844` mobile, `320x568` reduced motion, `/?onboarding=1`, `/?beat=B06`) + inspect screenshots in `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\generated\napoleon-hill-opening-sequence` + run `pnpm build`, `tsc --noEmit`, and `mds doctor --fast`.
- **Continuation Verification Summary**:
  - `verify_readability_label.mjs` (`readability-verification-report.json`):
    - Desktop `1280x800` (`/closing?debug=1` & clean `/closing`): label absent during `loading`/`quote`/`pause`/`signature`; appears immediately at `hold` (`1.028s`) and stays visible through `turning` (`1.153s`, `matrix3d(...)`); `pauseSec: 2.045s`; `sigShiftY: 0`, `quoteShiftY: 0`; `10.38px` clear below lowest `p` ink (`756.34` -> `766.72..783.52`); `rgb(99, 98, 94)` (`#63625e`), `13.44px`, plain system sans-serif, `0` buttons/links/headings/footers/details.
    - Mobile `390x844`: absent during signing, visible during `hold` (`6.4px` clear below ink, `589..604` inside paper bottom `632`, `scrollWidth: 390 === 390`, `0px` shift) and `turning`.
    - Reduced motion (`1280x800` & `320x568`): immediately displayed on `hold` with completed signature and `0` pen; `/?onboarding=1` overlay renders label inside `800px` viewport and transitions `B00` -> `B01`.
  - ARIA snapshot & stroke observer: `1` occurrence of `"Napoleon Hill"` in `.hill-paper` ARIA snapshot during `hold`; `MutationObserver` confirmed strokes `0:0, 0:1, 0:2, 0:3` and travel pairs `0:0->0:1, 0:1->0:2, 0:2->0:3` across `1,542` frames; `/?beat=B06` bypasses overlay.
  - Checks after code edits: `npx pnpm@10.28.1 build` (`exit 0`, built in `2.50s`), `npx tsc --noEmit` (`exit 2`, preexisting errors only in `App.tsx`, `src/imports/stylist-screen.tsx`, `src/imports/stylist.tsx`, `vite.figma.config.ts`; `0` errors in `src/app/closing/*`), `mds doctor --fast apps/i2-ide-prototype` (`exit 0`, `score 65/100 | 0 errors | 7 warnings`).

## Objective
1. Reconstruct a believable left-to-right chronological cursive traversal for Napoleon Hill's HW5 signature without backward jumping across earlier letters, lifting the pen only during the `H` of `Hill` and for the terminal dash (plus verifying the `i` dot / `H` structure in HW5), preserving the authentic signature outline, zero connector ink outside the outline, editable stroke JSON, and truthful inferred provenance.
2. Hide the pen throughout the quote and during the 2-second intermission; run the quote at Quick preview speed (`8`) and the signature at Unhurried speed (`1`), separated by an exact 2.0-second pause derived from Tegaki quote completion.
3. Strip captions (`A thought to take with you.`, `Yours to build.`), footer lines, visible buttons/controls, fixed preview links, and normal-mode settings panels; render only quote + signature on the paper page, keeping accessible `hill-sr-only` text, `prefers-reduced-motion` support, and optional `?debug=1` diagnostics.
4. Move the sequence to the tutorial opening (`B00` / new tutorial start) without disturbing completed users (`COMPLETE` or Sign In) or explicit beat URLs (`/?beat=B06`). One second after signature completion, animate an elegant page-turn revealing the `#000000` black background and the existing tutorial opening (`B00` -> `B01`), with `/closing` exercising the exact same presentation.

## Baseline Checks
- Workspace manifest verified: `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\project\mds.workspace.json`
- Dev server on `http://127.0.0.1:8444` verified to belong to this worktree (PID `57176`).
- `mds doctor --fast apps/i2-ide-prototype` baseline: passed (`score 60/100 | 0 errors | 8 warnings`).
- Existing working tree modifications and untracked handwriting/closing assets preserved cleanly.

## Plan & Checklist
- [x] Analyze `C:\Users\DJLeg\Downloads\napHillHW5.jpg`, `napoleon-hill-signature.svg`, and `napoleon-hill-signature.strokes.json` to map exact cursive letter paths, junctions, and lifts in "Napoleon" and "Hill-".
- [x] Reconstruct chronological left-to-right `napoleon-hill-signature.strokes.json` (4 strokes, 2,119 centerline points) + regenerate bundled signature font data, keeping `NapoleonHillSignature.ttf` outlines unchanged (`advance: 1829`, `originalOutlineCoordinatesExact: true`, `referenceStrokeOrderExact: true`) and updating `provenance.json` / `public/assets/handwriting/README.md` / `scripts/generate-closing-fonts.py` truthfully.
- [x] Visually verify stroke order over time (`0:0 -> 0:1 -> 0:2 -> 0:3`), lift points (`H` spire, detached `i` dot, detached dash `-`), zero backward letter jumps, 100.000% Python TTF mask coverage (`199,813 / 199,813` px) and zero outside connector ink (`clipText: 1.25`, live desktop ratio `0.9981`).
- [x] Update `closingConfig.ts` (`quoteSpeed: 8`, `signatureSpeed: 1`, `signaturePause: 2`, `endHold: 1`), `ClosingSequence.tsx`, `ClosingPreview.tsx`, `ClosingOverlay.tsx`, `dipPen.ts`, and `closing.css` (hidden quote/pause pen, minimal paper-only presentation, 1s hold, `1.15s` 3D page-turn revealing `#000000`, `prefers-reduced-motion`, `?debug=1` diagnostics).
- [x] Integrate sequence into tutorial start (`OnboardingContext.tsx`, `onboardingContextDef.ts`, `App.tsx`, `main.tsx`) and remove fixed `Closing thought preview` link cleanly without disrupting `COMPLETE` / `Sign In` or `/?beat=B06`.
- [x] Run production build, TypeScript check, and full Playwright verification suite across `/closing`, `/closing?debug=1`, desktop/mobile, reduced motion, `/?onboarding=1`, `/?beat=B06`, Sign In, and Sign Up -> Pricing -> Tier Selection, capturing evidence in `F:\SoftwareDev\mrdj-dev-suite-i2Workspace\generated\napoleon-hill-opening-sequence`.
- [x] Update `docs/closing-sequence.md`, `apps/i2-ide-prototype/README.md`, and finalize worksheet + post-edit checks (`pnpm build`, `tsc --noEmit`, `mds doctor --fast`).

## Final Verification Summary
- **Asset Regeneration**: `generate-closing-fonts.py` exited `0` (`bundle-validation.json`: `print` `45` glyphs / `76` strokes, `signature` `1` glyph / `4` strokes / `2119` reference points / `originalOutlineCoordinatesExact: true`).
- **Playwright Suite** (`generated/napoleon-hill-opening-sequence/verify_opening_sequence.mjs`, `browser-verification-report.json`):
  - `/closing` normal view: `0` buttons/links/headings/footers/settings/diagnostics, black `#000000` backdrop, accessible `.hill-sr-only` text preserved.
  - `/closing?debug=1` desktop (`1280x800`): quote `18.859s` (`maxQuotePenAlpha: 0`), pause `2.027s` (`maxPausePenAlpha: 0`, signature hidden), signature `6.442s` (`sigPenShownCount: 163/163`, ordered traversal `0:0 -> 0:1 -> 0:2 -> 0:3`), hold `0.998s` (`holdPixelCheck` `liveInked: 7369` vs `refInked: 7383`, ratio `0.9981`, `clippedEdge: false`), page turn `1.139s` to `#000000`.
  - Mobile (`390x844`): `/closing` and `/closing?debug=1` verified with `scrollWidth: 390 === innerWidth: 390`, unclipped signature inside paper.
  - Reduced motion (`prefers-reduced-motion: reduce`): immediate settled text & signature, `penVisible: false`, `transform: "none"`, gentle dissolve to `rgb(0, 0, 0)`.
  - Entry flows: `/?onboarding=1` and `Sign Up -> Pricing -> Tier Selection` start overlay at `B00`, turn to `#000000` -> `B01`, zero duplicate restarts; `/?beat=B06` and `Sign In` (`COMPLETE`) bypass opening sequence without overlay.
- **Checks after edits**: `npx pnpm@10.28.1 build` (`exit 0`, built in `2.43s`), `npx tsc --noEmit` (`exit 2`, preexisting errors only in `App.tsx` lines 515 & 4480–4496, `src/imports/stylist-screen.tsx`, `src/imports/stylist.tsx`, `vite.figma.config.ts` line 52), `mds doctor --fast apps/i2-ide-prototype` (`exit 0`, `score 65/100 | 0 errors | 7 warnings`).

## Latest user correction — attribution timing

The user saw the new gray Napoleon Hill label, but it did not stay visible long enough. Show it when the signature writing reaches approximately 50% of its actual Tegaki timeline, then keep it visible through signature completion, hold and page turn. Derive visibility from the signature frame/time and duration, not a fixed wall-clock guess; reduced motion should show it immediately with the completed signature. Preserve accessible labeling and avoid layout shifts. User wants the prior request superseded by this timing.

### Correction Plan & Verification (Superseding Hold-Only Label Timing)
- **Owner**: Sole writer (Gemini 4 Hydrogen Extra)
- **Changes**:
  - [x] Track `signatureHalfway` inside `ClosingSequence.tsx` directly from Tegaki's `signature` engine `frame.time >= signatureDuration * 0.5` inside `renderPen` (invoked on every Tegaki frame, resize, seek, and playback update), shared via `isReadabilityAidVisible(phase, signatureHalfway)`.
  - [x] Guarantee label remains hidden during `loading`, `quote`, `pause`, `error`, and `< 50%` of `signature`, resets `signatureHalfway` cleanly on effect re-runs/remounts, and passes `key={onboardingRunId}` to `ClosingOverlay` in `App.tsx` so new onboarding runs always start fresh.
  - [x] Preserve `closing.css` reserved layout (`min-height: 1.25em`) and gray `#63625e` style, single accessible `"Napoleon Hill"` node (swapping `.hill-sr-only` -> `.hill-signature-label`), reduced-motion immediate display on `hold`, signature strokes/pen motion, and page-turn/onboarding behavior.
  - [x] Update `apps/i2-ide-prototype/docs/closing-sequence.md` and `apps/i2-ide-prototype/README.md`.
- **Verification Results (`http://127.0.0.1:8444`)**:
  - `verify_readability_label.mjs` (`readability-verification-report.json`):
    - Desktop `1280x800` (`/closing?debug=1` normal speed): absent through `quote`/`pause` and up to `0.4973` (`3.2083s / 6.4514s`), appeared at `0.5025` (`3.2417s / 6.4514s`), stayed visible through completion, `hold` (`1.028s`, `10.38px` below ink, `rgb(99, 98, 94)`, `13.44px`), and `turning` (`1.140s`, `matrix3d(...)`); `sigShiftAfter50Y: 0`, `quoteShiftAfter50Y: 0`, `sigShiftHoldY: 0`, `quoteShiftHoldY: 0`; ARIA snapshot `"Napoleon Hill"` count `1` (`before50`, `after50`, `hold`).
    - Clean `/closing`: `0` buttons/links/headings/footers/details, hidden early in signature, shown during late signature and `hold` with `srOnlyInAttr: 0`.
    - Mobile `390x844` + responsive resize: hidden at `0.4429`, visible at `0.5640`, `hold` (`6.4px` clear below ink, `scrollWidth: 390`), and `turning`; mid-signature resize `1280x800 -> 390x844 -> 1280x800` stayed hidden at `0.2332` and appeared at `0.5206`.
    - Reduced motion (`1280x800` & `320x568`): immediately settled on `hold` with completed signature, visible label, `0` pen, no clipping/overflow.
    - Onboarding (`/?onboarding=1&debug=1` & `Sign Up -> Pricing -> Tier Selection`): absent in `quote` and early signature (`0.1686`), visible at `0.5354`, completes `B00` -> `B01`, and resets cleanly on new onboarding run.
  - `verify_speed_pause_reset.mjs` (`speed-pause-reset-report.json`):
    - `signatureSpeed: 3`: hidden at `0.4883` (`869ms`), visible at `0.5018` (`898ms`).
    - `signatureSpeed: 0.4` + `4.5s` RAF pause at `0.242`: stayed hidden (`labelCount: 0`) across entire `4500ms` pause, visible after resume at `0.5008` (`12.548s`).
    - Remount reset: immediately `labelCount: 0` in `quote` and `0.0607` signature, visible past `50%`.
  - `verify_opening_sequence.mjs` (`browser-verification-report.json`): all 6 regression tests passed (`quoteSec: 18.906`, `pauseSec: 2.027`, `sigSec: 6.440`, `holdSec: 0.997`, `turnSec: 1.157`, `inkRatioVsRef: 0.9981`, `B06` & `Sign In` bypass, `Sign Up -> Pricing` triggers `B00`).
  - Final checks: `npx pnpm@10.28.1 build` (`exit 0`, built in `2.81s`), `npx tsc --noEmit` (`0` errors in `closing/*`, `onboarding/*`, `main.tsx`, or our `App.tsx` line; preexisting errors only in `App.tsx` lines 515 & 4480–4496, `stylist-screen.tsx`, `stylist.tsx`, `vite.figma.config.ts`), `mds doctor --fast apps/i2-ide-prototype` (`exit 0`, `score 65/100 | 0 errors | 7 warnings | 4 passed | 9 skipped`).

## Latest user updates — black opening, smooth turn, black sign-in, post-Home choose-plan

- **Owner**: Sole writer (Gemini 4 Hydrogen Extra)
- **Status**: COMPLETE
- **Preserved work**: Retained all existing Napoleon Hill quote/signature outlines (`NapoleonHillPrint.ttf`, `NapoleonHillSignature.ttf`), 4-stroke reconstructed path (`2,119` pts), hidden quote/pause pen, `2.0s` pause, `signatureSpeed: 1`, halfway gray `"Napoleon Hill"` label (`frame.time >= signatureDuration * 0.5`), `1.0s` post-signature hold, single accessible text, and `prefers-reduced-motion` semantics.
- **Checklist**:
  - [x] **Smooth page-turn & event-driven completion (`ClosingSequence.tsx`, `closing.css`)**: Kept `1.0s` hold (`endHold: 1`); removed start-of-turn flash and multi-segment pop via continuously GPU-composited `#000000` `.hill-paper` (`translateZ(0) rotateY(0deg)`), continuous ease-in-out `rotateY(0deg -> -92deg)` over `1250ms`, smooth opacity/edge gradients, `450ms` `cubic-bezier(0.4, 0, 0.2, 1)` reduced-motion dissolve (`transform: none`), and `onAnimationEnd` + deadline completion.
  - [x] **Black opening, white ink, gray halfway label, visible vintage pen (`closingConfig.ts`, `closing.css`, `dip-pen.svg`)**: Replaced tan paper/texture/debug surfaces with pure `#000000` black; set ink to `#ffffff`; set `.hill-signature-label` to neutral `#8e8e92`; brightened `dip-pen.svg` + `closingConfig.ts` wood/brass (`#87613d` / `#dcb364` + rim highlight) so the vintage dip pen reads clearly over `#000000`; black-on-black page turn shows moving white ink and subtle neutral spine/edge rim with zero tan/white flashes.
  - [x] **Black sign-in screen (`App.tsx`)**: Styled `AuthScreen` on straight `#000000` black with readable contrast and preserved Sign In / Create an account behavior.
  - [x] **Move choose-plan UI from pre-onboarding to post-tutorial Home overlay (`App.tsx`)**: Signing up (`Create an account`) launches the handwriting opening and tutorial directly without a pricing gate; reaching `COMPLETE` on Home after a newly started tutorial opens `PricingOverlay` once as an accessible overlay above Home (`role="dialog"`, `aria-modal="true"`, `inert` sibling handling, Escape/Back/backdrop dismiss to Home, responsive mobile layout); choosing a plan or dismissing preserves Home (`Lvl. 1`) without restarting onboarding and never triggers for `Sign In`, direct `?beat=` previews, rerenders, refreshes, or ordinary navigation.


## New user steering — quote speed and Infie arrival

- **Owner**: Sole writer (Gemini 4 Hydrogen Extra)
- **Status**: COMPLETE
- **Plan & Changes**:
  - [x] Slightly increased `quoteSpeed` in `closingConfig.ts` from `8` to `10` (gentle increase from ~`18.9s` to ~`15.54s`, avoiding abrupt rush while keeping pause/signature/hold timings exact).
  - [x] In `OnboardingStage.tsx`, preserved `B01` `"Infinite Intelligence"` -> `"i²"` introduction (with `"outro"` fade before `B02`; opacity-only transitions under reduced motion), removed the brief intermediate `"infie"` still picture from `B01`, faded the real Infie (`InfieArrival`) slowly into her normal `STAGE_TOP` position in `B02` (`1.4s` `easeInOut`, `0.75s` opacity-only in reduced motion), staggered the `B02-0` greeting (`delay: 0.75s` / `0.35s` reduced) via `<AnimatePresence initial={currentBeat === "B02"}>`, and delayed the identity form reveal (`identity_controls` at `1950ms` normal / `950ms` reduced). Left `B03..B21` and direct `/?beat=B06` untouched.
- **Final Post-Edit Verification Summary (`http://127.0.0.1:8444`)**:
  - `verify_black_opening_and_plan_flow.mjs` (`final-verification-report.json`): Parts A–E all passed (`paperBg: rgb(0, 0, 0)`, `paperColor: rgb(255, 255, 255)`, `penWarmPixels: 863`, `pauseSec: 2.033`, `holdSec: 1.024`, `turnSec: 1.249`, `maxWarmDuringHoldAndTurn: 0`, mobile `390x844` `warmTanPixels: 0` & `noOverflow: true`, reduced motion `transform: none` & `warmTanPixels: 0`, full `/` -> `#000000` AuthScreen -> `Create an account` -> `B00` -> `B21` -> `COMPLETE` Home -> `PricingOverlay` Personal/Business/mobile `390x844` & `320x568` -> `Choose Premium` -> Home retained, `Sign In` / `?beat=COMPLETE` / `?beat=B06` non-trigger, Escape dismiss, reload auth).
  - `verify_steering_quote_speed_and_infie_arrival.mjs` (`steering-verification-report.json`):
    - Quote speed: `quoteSec: 15.541`, `pauseSec: 2.003`, `sigSec: 6.462`, `holdSec: 1.035`, `turnSec: 1.23`.
    - Desktop `1280x800` (`/ -> Create an account`): `sawLettering: true`, `sawMark: true`, `b01InfieArtworkCount: 0`, `firstInfieOpacity: 0`, `midSample` (`694ms`) `arrivalOpacity: 0.4998` & `msgOpacity: 0`, `settledInfieOpacity: 1`, `firstFormVisibleMs: 1988`.
    - Mobile `390x844`: `sawLettering: true`, `sawMark: true`, `b01InfieArtworkCount: 0`, `firstInfieOpacity: 0`, `midSample` (`698ms`) `arrivalOpacity: 0.5197`, `firstFormVisibleMs: 1975`, `scrollWidth: 390`.
    - Reduced motion `1280x800`: `sawLettering: true`, `sawMark: true`, `b01InfieArtworkCount: 0`, `firstInfieOpacity: 0.004`, `midSample` (`373ms`) `arrivalOpacity: 0.5653`, `artworkTransform: none`, `infieTopSpreadPx: 0`, `firstFormVisibleMs: 963`.
    - Unchanged beat check (`/?beat=B06`): `infieArrivalOpacity: 1`.
