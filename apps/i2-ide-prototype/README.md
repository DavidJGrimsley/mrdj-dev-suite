# i² IDE prototype (iSquared Agentic IDE design)

Standalone Vite + React 18 + Tailwind 4 prototype of the i² dual-screen IDE and the Infie onboarding
tutorial, imported from the Figma Make export `FinalFigmaMake-iSquaredIDE`. It is **not** part of the
root pnpm workspace (`packages/*`) or turbo pipeline; install and run it from this folder.

## Run

Needs Node 22+ and pnpm 10 (the lockfile is v9; see `.mise.toml`, which pins pnpm 10.34.3).

```
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev      # http://localhost:8443 (strict port; override with PORT)
pnpm build    # vite build --config vite.figma.config.ts -> dist/
```

For the portfolio package, run `pnpm build:hosted:archive`. Hosted builds preserve unrelated files
in the output root and replace a previous `web/` build only when its manifest's file inventory
matches. If an older build has no inventory, review it and use a fresh `--out` directory before
rebuilding; the builder will not remove that older output automatically.

Open `/?beat=B06` to jump to the controls beat, `/?onboarding=1` to run the Napoleon Hill handwriting opening sequence followed by the full tutorial from B00, `/closing` (or `?closing=1`) to preview the opening sequence directly over `#000000`, and `/closing?debug=1` for renderer diagnostics.

## Home

With two active projects the right column stays `604px` tall, including during the tutorial, and the home canvas keeps `48px` under Generate / Import. A third project lets that column grow so the Active Projects header rises and the buttons move down. The header opens an expanded or fullscreen list you can scroll. Import offers one i² workspace, Field Notes: Infie asks the app's purpose, says the remaining questions are simulated, points at Generate a new project for the full info.md flow, then flags and starts nine sessions. Field Notes lands on the normal project home; its sessions, files, and simulator stop at the prototype limit. Pricing is Free (limited active sessions), Premium (unlimited sessions and optional Session Completion Forms), Team, and Enterprise. `/?beat=COMPLETE&plan=1` opens the plan overlay without walking the tutorial.

## Napoleon Hill Handwriting Opening Sequence

- **Preview URL**: `http://127.0.0.1:8444/closing` (or `http://127.0.0.1:8444/?onboarding=1` for the live tutorial entry).
- **Entry & Page Turn**: On the straight `#000000` Sign In / Sign Up screen (`AuthScreen`), clicking `Create an account` (or opening `/?onboarding=1`) launches the `#000000` opening sequence directly at `B00` with no upfront plan gate. One second after the signature completes, an event-driven (`onAnimationEnd` + safety deadline) `1250ms` continuous 3D black-on-black page turn reveals `#000000`, followed by the `B01` `"Infinite Intelligence"` -> `"i²"` introduction (with no intermediate still Infie picture), then Infie slowly fading into her normal `STAGE_TOP` position in `B02` (`1.4s` `easeInOut`) ahead of her greeting and identity form (`1.95s`). Once the tutorial finishes `B21` and reaches Home (`COMPLETE`), `PricingOverlay` opens once above Home; choosing a plan or dismissing keeps Home and user/onboarding state intact. `Sign In`, refreshes on `COMPLETE`, and direct beat links (`/?beat=B06`) bypass both overlays.
- **Playback & Pen Behavior**: Quote renders in white (`#ffffff`) uppercase (`NapoleonHillPrint.ttf`) on `#000000` black at `quoteSpeed: 10` (~`15.54s`) with the pen hidden, waits `2.0s` from Tegaki quote completion, then signs white ink (`NapoleonHillSignature.ttf`, `U+E000`, `clipText: 1.25`) at `signatureSpeed: 1` (~`6.46s`) with the brighter vintage turned-wood & brass `dip-pen.svg` following active strokes (`0:0 -> 0:1 -> 0:2 -> 0:3`). A small plain neutral gray (`#8e8e92`) `"Napoleon Hill"` label appears beneath the signature at `50%` of Tegaki's signature timeline (or immediately with the settled signature under reduced motion), remains visible through the `1.0s` hold and page turn (`1250ms` 3D rotation or `450ms` `transform: none` reduced-motion dissolve), and swaps `.hill-sr-only` so the name is announced once. No captions, footer lines, buttons, or settings controls appear in normal view.
- **Key Files**:
  - `src/app/closing/closingConfig.ts`, `ClosingSequence.tsx`, `ClosingOverlay.tsx`, `ClosingPreview.tsx`, `closing.css`, `dipPen.ts`
  - `src/app/onboarding/OnboardingContext.tsx`, `onboardingContextDef.ts`, `src/app/App.tsx`, `src/main.tsx`
  - `public/assets/handwriting/napoleon-hill-signature.strokes.json`, `provenance.json`, `README.md`, `scripts/generate-closing-fonts.py`, `docs/closing-sequence.md`
- **Known Limitations**: Signature stroke timing and lift order are plausibly inferred from static HW5 photo geometry (`2,119` centerline points across `4` physical ink components), not recorded historical pen telemetry. Preexisting `tsc --noEmit` errors remain in unrelated sections of `App.tsx` and `src/imports/stylist-screen.tsx`. See [docs/closing-sequence.md](docs/closing-sequence.md) for full details and verified check results.

## Widgets: move, expand, delete, flow zone, and real files

The Project Home and Session side panels are dockable widgets (src/app/widgets/WidgetDock.tsx).

- **Move:** drag a widget by its header into the other column (or to a new spot in the same one).
  Widgets in a column share its height and resize as widgets arrive or leave. Tiles in the
  header's Widgets gallery can be dragged onto a column; docked widgets have a remove button.
  Layouts are kept per project/session for the page's lifetime (not persisted).
- **Delete / restore:** each docked widget has a remove button; deleted widgets go to a restore
  registry so they can be brought back.
- **Expand / fullscreen:** double-click a widget header to toggle expanded view, triple-click to
  toggle fullscreen. Both work from any state (expanded + double-click returns to normal,
  expanded + triple-click goes fullscreen, fullscreen + double-click drops to expanded). Escape
  or the backdrop returns to normal. Web Preview keeps its own enlarge modal.
- **Bottom flow zone:** the panel below the chat takes other widgets, arranged in a flow grid
  that fills the top row first and stacks smaller widgets. Invisible grab bars to the right,
  left and bottom of the chat stretch/shrink it; dragging a bar all the way to an edge collapses
  that panel (even with widgets in it), and a background border remains to grab and bring it back.
- **Sessions widget:** session cards show Human Tasks and Agent Tasks counts (not the model).
  When compacted (more sessions, or moved to a side bar) they become a simpler list (session icon,
  name, status); hovering ~250 ms pops up the full card as an overlay.
- **Music widget:** a normal dock widget on project/session screens; expanded view picks a song and
  artist, fullscreen shows music provider options. On the home screen and during tutorial it has
  special behavior.
- **Real files:** Explorer, Project Folder and the Session's Plan.md open a read-only viewer
  (src/app/widgets/workspaceFiles.tsx) with an explorer sidebar, multiple file tabs, and a
  fullscreen button (also triple-click). Contents are snapshots of git-tracked files written to
  public/workspace-files/<id>.json by scripts/snapshot-workspace-files.mjs; nothing is invented.
  Where no source has been snapshotted (Not Hotdog, the demo sessions' worktrees and Plan.md),
  the viewer says so. Experimemo's Plan.md is rendered from the plan synthesized in the walkthrough.
## What differs from the original Figma Make export

- B06 controls: the three per-device MP4s (`infie-transform-*.mp4`) are replaced by one continuous
  transparent recording, `public/assets/infie-controls-chain-alpha.webm` (VP9 + alpha, 1080x1080,
  30 fps, 16 s, no audio). It is a plain `<video>`; the old canvas luma key (`LumaKeyedVideo.tsx`)
  is no longer used by B06 and is left in place. Cues follow the video's media time: keyboard at 0 s,
  gamepad at 6 s, joystick at 11 s, all three devices when it ends. Reduced motion and any video
  failure (error, no start, stall, no VP9 support) still use the device PNG stills.
- `pnpm-workspace.yaml`: `supportedArchitectures` also lists `current` so installs work on the
  developer's own OS (the export only listed linux).
- The export's `.gitattributes` (Git LFS rules for binary types) is not imported; decide on LFS for
  this repo separately.

The Figma-Make-specific files (`.figma/`, `AGENT-HANDOFF.md`, `plans/`, and the tutorial scripts)
are retained. The current `tutorial-script.md` reflects the new B06 sequence; historical documents
may still describe the original three MP4s.

## Attribution

See `ATTRIBUTIONS.md`: shadcn/ui components used under the MIT license
(https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) and Unsplash photos used under the Unsplash
license (https://unsplash.com/license).

## Known limitation

VP9-with-alpha WebM is honored by Chromium-based browsers (verified in Chrome 156 and Edge 157).
A decoder that drops alpha would show an opaque black square for the B06 video; Safari and Firefox
were not tested.
