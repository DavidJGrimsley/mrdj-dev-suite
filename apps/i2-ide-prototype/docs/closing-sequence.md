# Napoleon Hill opening sequence

Open `/closing` (or `?closing=1`) on this Vite app to preview the standalone sequence directly. `/closing?debug=1` exposes opt-in renderer diagnostics (`data-diagnostics` on `.hill-paper` and a live readout panel). In normal onboarding, signing up (`Create an account`) on the `#000000` auth screen or opening `/?onboarding=1` enters the opening sequence directly at `B00` (`ClosingOverlay.tsx`) with no pre-tutorial pricing gate. After completing `B21` and landing on the Home screen (`COMPLETE`), `PricingOverlay` opens once per newly started tutorial above Home; choosing a plan or dismissing (Close / Back / Escape / backdrop) preserves Home and user/onboarding state without restarting onboarding. Returning/signed-in users (`Sign In`), page refreshes on `COMPLETE`, and direct beat links (`/?beat=B06`, `/?beat=COMPLETE`) skip both the opening sequence and the post-tutorial plan modal.

For local development, use `pnpm@10` with this standalone app, for example `npx pnpm@10.28.1 exec vite --host 127.0.0.1 --config vite.figma.config.ts --port 8444 --strictPort` (or `8443` default). The preview URL must belong to this checkout's worktree server when multiple worktrees are running.

## Authoring, presentation, and timing

`src/app/closing/closingConfig.ts` is the single configuration location:
- **Quote**: exact mixed-case quote converted to uppercase at runtime (`prepareQuote`), validated against the generated print glyphs.
- **Speeds & waits**: `quoteSpeed: 10` (~`15.54s` desktop playback — slightly brisker than the prior `8` Quick preview setting), `signaturePause: 2` seconds wall-clock intermission started strictly from Tegaki's quote-completion callback, `signatureSpeed: 1` (Unhurried speed, ~`6.46s`), and `endHold: 1` second hold after signature completion before the page turn.
- **Ink, surface & pen**: pure `#000000` black canvas and sheet with `#ffffff` handwritten ink (`--hill-ink: #ffffff`), neutral gray attribution label (`--hill-muted: #8e8e92`), and high-contrast vintage dip-pen styling (`dip-pen.svg`, `barrel: "#87613d"`, `brass: "#dcb364"` + warm rim highlight, `angle: 0.52`, viewBox `-10 -115 20 115`, nib tip anchored at `(0, 0)`).

Normal presentation (on both `/?onboarding=1`, `Create an account`, and `/closing`) renders only the `#000000` `.hill-paper` sheet over `#000000` black: no cream/tan paper or texture, no header captions, no footer lines, no fixed preview link, and no visible buttons or controls. Mixed-case quote text remains accessible via `.hill-sr-only`; `"Napoleon Hill"` is provided once via `.hill-sr-only` through the quote, pause, and first half of signature writing, then switches to the visible neutral gray `#8e8e92` `.hill-signature-label` readability aid directly beneath the signature once Tegaki's signature timeline reaches 50% (avoiding duplicate accessible labels and layout shifts).

Phase progression:
1. **Quote (`quote`)**: Tegaki reveals the white uppercase quote stroke-by-stroke at `quoteSpeed: 10` with the pen completely hidden (`0` alpha pixels on `.hill-pen-surface`) and `.hill-signature` hidden (`visibility: hidden`); the visual `"Napoleon Hill"` label is never shown.
2. **Pause (`pause`)**: Derived from Tegaki's quote completion, the sequence holds for `2.0s` (`signaturePause: 2`) with the pen still hidden and the visual label absent.
3. **Signature (`signature`)**: `.hill-signature` reveals and Tegaki plays the 4-stroke reconstructed white signature at `signatureSpeed: 1` while `dipPen.ts` renders the vintage turned-wood & brass SVG nib at `frame.active[0].head` (down) and smooth lift arcs between strokes (pen-up travel). Driven directly from Tegaki's live `frame.time >= signatureDuration * 0.5`, the small plain neutral-gray `"Napoleon Hill"` readability label appears halfway through signing.
4. **Final hold (`hold`), Page turn (`turning` -> `complete`), & Infie arrival (`B00 -> B01 -> B02`)**: The `"Napoleon Hill"` label remains visible beneath the completed signature throughout the `1.0s` (`endHold: 1`) hold (pen hidden) and the continuous event-driven (`onAnimationEnd` + safety deadline) `1250ms` 3D page turn (`hill-page-rotate` / `hill-page-fade`, `rotateY(0deg -> -92deg)` on continuously GPU-composited `#000000` layer with subtle neutral spine hinge and trailing edge highlight, zero tan/white flashes). After the turn completes, `B00` finishes its 2-second black pause, `B01` presents `"Infinite Intelligence"` -> `"i²"` -> fade-out with no intermediate Infie picture, and `B02` fades the real Infie (`InfieArrival`) slowly into her normal `STAGE_TOP` position (`1.4s` `easeInOut`) followed gently by her greeting (`delay: 0.75s`) and identity form (`1.95s`).

Under `prefers-reduced-motion: reduce`, both quote and signature render immediately settled (`time: "100%"`) on `#000000` with `#ffffff` ink and the `#8e8e92` `"Napoleon Hill"` readability aid immediately visible beneath the signature, the pen stays hidden (skipping SVG load), 3D rotation is disabled (`transform: none`), and the sheet gently dissolves in `450ms` (`hill-page-reduced-fade`, `cubic-bezier(0.4, 0, 0.2, 1)`) after `endHold`. Afterward, `B01` still preserves `"Infinite Intelligence"` -> `"i²"` via opacity crossfades (no scale transforms or intermediate Infie flash), and `B02` dissolves Infie in at opacity-only (`0.75s` `easeInOut`) before revealing her greeting (`delay: 0.35s`) and form (`950ms`).

## Actual strokes and authentic outlines

The renderer uses the installed `tegaki@1.1.0` core engine (`ClosingSequence.tsx`):
- **Print quote**: Generated from `public/assets/handwriting/NapoleonHillPrint.ttf` (`45` glyphs, `76` strokes) with `quality.clipText: 2.5`.
- **Signature**: Pairs the authentic photographic autograph outline in `public/assets/handwriting/NapoleonHillSignature.ttf` (`U+E000`, `1000` units/em, ascender `790`, descender `-243`, advance `1829`) with independently generated centerlines from `public/assets/handwriting/napoleon-hill-signature.strokes.json` and `quality.clipText: 1.25` (preventing adjacent `l`-stroke ink bleeding prematurely into the `i` dot).

The prior 12-stroke machine centerline extraction could backtrack across earlier letters in `Napoleon` after reaching `Hill`. The reconstructed `napoleon-hill-signature.strokes.json` contains **4 strokes (`2,119` centerline points)** matching the four physical connected components of HW5 in left-to-right cursive order:
- `0:0` (`1,631` pts): Continuous left-to-right cursive `Napoleon` connected through the left stem and diagonal up-bar of `H`.
- `0:1` (`477` pts): Pen lift within `H` to its upper spire, continuing smoothly through the eyelet and `i-l-l` (no backtracking into `Napoleon`).
- `0:2` (`6` pts): Pen lift to the physically detached `i` dot.
- `0:3` (`5` pts): Pen lift to the physically detached terminal dash (`-`).

## Regeneration

Run in this verified i² workspace from `apps/i2-ide-prototype`:

```powershell
../../../generated/napoleon-hill-handwriting/.venv/Scripts/python.exe scripts/generate-closing-fonts.py --vendor ../../../generated/napoleon-hill-handwriting/vendor/tegaki --artifacts ../../../generated/napoleon-hill-closing-sequence
npx pnpm@10.28.1 build
```

`generate-closing-fonts.py` verifies exact TTF outline preservation (`originalOutlineCoordinatesExact: true`), `strokes: 4`, `referencePointsExact: 2119`, `referenceStrokeOrderExact: true`, and `advance: 1829`, writing runtime bundles to `src/app/closing/fonts/`.

## Material limits and checks

- **Provenance**: `napoleon-hill-signature.strokes.json` is an inferred chronological traversal derived from static photograph HW5 (`C:\Users\DJLeg\Downloads\napHillHW5.jpg`) and its TTF glyph skeleton, **not** recorded historical handwriting telemetry (velocity/pressure/exact timing cannot be known from a static image).
- **Verified checks (current post-steering runs in `generated/napoleon-hill-opening-sequence/`)**:
  - Production build (`npx pnpm@10.28.1 build`) passed (`exit 0`). Preexisting global `tsc --noEmit` errors (`exit 2`) in `src/app/App.tsx` (lines 515, 4480–4496), `src/imports/stylist-screen.tsx`, `src/imports/stylist.tsx`, and `vite.figma.config.ts` (line 52) predate this work; `closing/*`, `onboarding/*`, `main.tsx`, and opening-sequence integration edits have zero TypeScript errors.
  - `verify_black_opening_and_plan_flow.mjs` (`final-verification-report.json`) against `http://127.0.0.1:8444`:
    - **Part A (Desktop `/closing?debug=1` & clean `/closing`)**: pure `rgb(0, 0, 0)` paper & preview backdrop (`backgroundImage: none`), white `rgb(255, 255, 255)` quote & signature ink, `#8e8e92` label hidden before 50% signature and visible at `>=50%` through hold & turn, visible vintage dip pen (`penWarmPixels: 863`, `maxPenLuma: 226.3`), `pauseSec: 2.033`, `holdSec: 1.024`, `turnSec: 1.249` across 11 sampled turn filmstrip frames with `maxWarmDuringHoldAndTurn: 0` / `totalWarmTanPixels: 0`.
    - **Part B (Mobile `390x844`)**: `paperBg: rgb(0, 0, 0)`, label visible, `noOverflow: true`, quote & signature contained, `warmTanPixels: 0` during page turn.
    - **Part C (Reduced motion `1280x800`)**: immediate settled `hold` on `#000000` (`penVisible: false`, `labelOpacity: 1`, `transform: none`), `450ms` dissolve (`warmTanPixels: 0`).
    - **Part D (Full desktop & mobile flow `/ -> Create an account -> B00 -> B01..B21 -> Home COMPLETE -> PricingOverlay -> Choose Premium`)**: `#000000` `AuthScreen` (`glowCount: 0`), `Create an account` enters `#000000` opening without pricing gate, completes `B01..B21` to Home (`Lvl. 1`), opens accessible `Choose your plan` modal (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="choose-plan-heading"`, `inert` siblings), supports Personal & Business toggles + mobile `390x844` & `320x568` without horizontal overflow, selecting `Choose Premium` dismisses modal with `selectedPlan: "Premium"` and retains Home (`Lvl. 1`) + navigation without reopening or restarting onboarding.
    - **Part E (Non-trigger & dismiss checks)**: `Sign In`, `/?beat=COMPLETE`, and `/?beat=B06` never open `ClosingOverlay` or `PricingOverlay`; Escape dismisses `PricingOverlay` cleanly in reduced motion while preserving Home (`Lvl. 1`); browser reload returns cleanly to `#000000` `AuthScreen`.
  - `verify_steering_quote_speed_and_infie_arrival.mjs` (`steering-verification-report.json`) against `http://127.0.0.1:8444`:
    - **Quote speed**: `quoteSpeed: 10` measured `quoteSec: 15.541`, `pauseSec: 2.003`, `sigSec: 6.462`, `holdSec: 1.035`, `turnSec: 1.23`.
    - **Desktop `1280x800` (`/ -> Create an account`)**: `B01` preserved `"Infinite Intelligence"` and `"i²"` with `b01InfieArtworkCount: 0`; `B02` faded real `InfieArrival` into her normal `STAGE_TOP` position (`opacity` `0` at `0ms`, `0.4998` at `694ms`, `1` settled) before revealing the greeting (`msgOpacity: 0` at `694ms`) and identity form (`firstFormVisibleMs: 1988`).
    - **Mobile `390x844`**: `B01` preserved lettering + `i²` with `b01InfieArtworkCount: 0` and `scrollWidth: 390`; `B02` faded real Infie in (`0` at `0ms`, `0.5197` at `698ms`, `1` settled) and revealed the form at `1975ms` (`scrollWidth: 390`).
    - **Reduced motion `1280x800`**: `B01` preserved lettering + `i²` with `b01InfieArtworkCount: 0`; `B02` dissolved `InfieArrival` at opacity-only (`0.004` at `0ms`, `0.5653` at `373ms`, `1` settled, `transform: none`, `infieTopSpreadPx: 0`) and revealed the form at `963ms`. Direct `/?beat=B06` opened with `infieArrivalOpacity: 1`.
