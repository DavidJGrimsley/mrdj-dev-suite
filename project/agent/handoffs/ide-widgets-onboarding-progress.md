# IDE widgets + onboarding — progress log

Branch `ide-widgets-onboarding`, worktree `mrdj-dev-suite-ide-widgets-onboarding`. All work is in
`apps/i2-ide-prototype`. **Nothing is committed.** Update this file as items move.

Legend: `[x]` done and checked in a browser · `[~]` code written, type-checks, **not yet checked in a
browser** · `[ ]` not started.

## How to run and check

```
cd apps/i2-ide-prototype
pnpm install --frozen-lockfile --ignore-scripts
PORT=8451 pnpm dev          # 8443 is usually taken by another worktree's server
pnpm build                  # vite build
pnpm build:hosted           # also runs the hosted-output verifier; delete dist-hosted/ first if a
                            # previous run failed (it refuses to overwrite a build with no manifest)
pnpm test                   # node tests; tutorial-browser.test.mjs needs build:hosted first
npx tsc --noEmit -p tsconfig.json
```

- `tsc` has ~20 errors that predate this branch (`App.tsx` stylist `mono` property, the
  `OP4MyWidgetsGrid` `id` errors, `src/imports/stylist-screen.tsx`, `vite.figma.config.ts`). Anything
  else is new.
- `simulator-foundation-ui.test.mjs` fails with `Cannot find module 'esbuild'` on this install. It
  failed the same way before any of this work.
- Sign-in screen is a mock: click **Sign In**. `/?beat=B12` starts the tutorial at Home; `?beat=B13`
  and later render blank (also true on `main`), so walk forward from B12.
- `src/app/App.tsx` has CRLF line endings in the working copy (git `autocrlf`). Keep them; the patch
  helper used so far (`patchlib.py`, exact-string replace that preserves endings) lives in the
  session scratchpad and is not in the repo — plain editor edits are fine.

## Where things live

| File | What it is |
|---|---|
| `src/app/widgets/WidgetDock.tsx` | Dock: zones (`column` / `flow`), pointer drag, expand/fullscreen click toggles, delete + restore registry, `DockPanel` + `DockSplitter` (grab bars, collapse), `useDockSizes` |
| `src/app/widgets/workspaceFiles.tsx` | Snapshot loader, `workspaceSpecFor`, file viewer (explorer sidebar, tabs, fullscreen), `WorkspaceExplorer`, `useOpenProjectFile` |
| `src/app/widgets/SessionsPanel.tsx` | Session cards (Status / Agents / Human Tasks / Agent Tasks), compact list mode, 250 ms hover popover |
| `src/app/widgets/simulator.tsx` | Simulator target context, project/session pill pickers, `PET_WEB_PREVIEW` |
| `src/app/widgets/prototypeLimit.tsx` | `usePrototypeLimit()` modal, `TUTORIAL_CHAT_LIMIT`, `notHotdogLimit()` |
| `src/styles/widgets.css` | `.infie-glow` (pulsing ring), `.i2-chat-scale` (zoom on large screens), splitter styles |
| `src/app/onboarding/LeekBeatsWidget.tsx` | Music player; now also renders the library / providers view into a slot |
| `scripts/snapshot-workspace-files.mjs` | Writes `public/workspace-files/<id>.json` from real repos |
| `scripts/lib/local-preview-servers.mjs` | Added `createPetPreviewVitePlugin` (dev: serves the Pet web export at `/iSquared/preview/pet-show-and-tell/`) |
| `src/app/App.tsx` | `ProjectHomeScreen`, `SessionScreen`, `Header`, `EmulatorModal`, `EmulatorScreen`, `WebPreviewWidget`, `useSimPreview`, `musicDockWidget`, shell wiring |

## Round 1 (first request) — done and verified in a browser

- [x] Widgets drag between columns by their header; gallery tiles drag into a column.
- [x] Double-click header = expanded toggle, triple-click = fullscreen toggle (matches the old Figma
  Make export in `Downloads/Dual-Screen IDE DesignAugust-ExpandAndFullScreenWidgets`).
- [x] Explorer / Project Folder / Plan.md open real files from snapshots (Experimemo from
  `test-apps/experimemo-exact-i2Workspace`, Pet from `F:/SoftwareDev/pet-show-and-tell`).
- [x] Tutorial turns added: B15 MCP/tools + simulators, B17 quantum (worded as research), B19
  mobile/website/VR. `tutorial-script.md` updated.
- [x] At that point: `pnpm build`, `pnpm build:hosted`, and the 17-step Experimemo browser test passed.

Round 2 below has since changed those same screens, so the browser test must be re-run.

## Round 2 (second request) — status per item

Widgets and layout
- [~] Recent Activity widget removed (Project Home). **Test to update:**
  `scripts/__tests__/tutorial-browser.test.mjs` line ~899 asserts `/Recent Activity/` is present.
- [~] Every widget has a remove (×) button on hover; removed built-ins are listed under "Removed from
  this screen" in the Widgets gallery with a restore button (`useRemovedWidgets`).
- [~] Sessions is a dock widget in a new **bottom zone** (flow grid: fills the top row first, short
  widgets flagged `small` pair up in one cell). Session screen has the same bottom zone, empty and
  closed until something is dropped in.
- [~] Grab bars left / right / bottom of the chat (`DockSplitter`). Dragging under ~70 px collapses
  the panel to 0; the bar stays for dragging back; double-click toggles. Empty panels auto-collapse
  and reopen as drop targets while a widget is being dragged.
- [~] Session cards: Model and Progress replaced by Human Tasks x/y and Agent Tasks x/y; counts come
  from `DEMO_SESSION_TASKS` (same rows the Agent Tasks / Human Testing widgets list). Compact list +
  hover popover when crowded or in a side column.
- [~] Music is a normal dock widget on Project/Session outside the tutorial (`musicDockWidget`);
  during the tutorial it keeps its old fixed slot. Expanded = song/artist picker, fullscreen =
  provider list (Connect raises the prototype limit). Only the two real LeekBeats tracks are listed.
- [~] Pet Show and Tell layout changed to match Experimemo: Explorer bottom-left, right column
  336 px with Human Testing + Web Preview (+ Music).

Files
- [~] File viewer: Explorer sidebar, multiple tabs, fullscreen by triple-clicking the title bar or
  the new header button.
- [~] Not Hotdog: Explorer clicks, project files and Plan.md raise the Prototype Limit modal with an
  "Open Pet Show and Tell" action. **Not wired yet:** `useRegisterPrototypeLimitNav(openPet)` is
  never called in `PersistentAppShell`, so that action button does not appear. Add
  `useRegisterPrototypeLimitNav(() => openProjectHome(PROTOTYPE_PROJECTS.find(p => p.id === "pet")!))`.

Simulators / header
- [~] Pet web preview: `WebPreviewWidget` on Project Home and Session, real iframe from
  `/iSquared/preview/pet-show-and-tell/` (the export's own `basePath`). Dev server serves it from
  `../../../../pet-show-and-tell/dist-web/web` (override with `ISQUARED_PET_PREVIEW_DIR`). **Hosted:**
  the export must be deployed at that path beside the prototype; `build:hosted` does not copy it.
- [~] Session picker on simulators (inline widget, enlarged modal, Emulators screen): `main`, `test`
  (Pet only), and the project's sessions; locked to the current session on a Session screen;
  project picker when opened from i² Home. Pet has one real build, so non-main targets show a note
  saying it is main.
- [~] Emulators tab works on Project and Session (`EmulatorScreen`); Home uses the same component.
- [~] "Screen 1" / "Screen 2" labels above Workspace / Emulators.
- [~] Header "Tutorials" → "Learn" (button text only; tutorial copy still says "tutorials", see below).
- [~] Home header no longer keeps a project name in the Project pill.

Other
- [~] Actions widget: i² actions only, no group bar, "Clear Start", no "MDS" text. EAS + Expo Dev
  actions moved into the EAS widget (`EasContent`).
- [~] Generate button defaults to no framework ("Generate New Project"); Exact added at the top of
  the list. Storage key bumped to `agentide-project-type-v2` so the new default applies.
- [~] `.infie-glow` applied to header nav highlights, session panels, web preview, gallery tile,
  demo session card, music callout.
- [~] Chat composer on Home / Project / Session raises the Prototype Limit when sending during the
  tutorial.
- [~] B14: "Newest first." sits read-only in the real composer with a glowing Send; the inline reply
  form is gone.

## Session 3 update (latest)

Checked in a browser at 1440x900 on Pet Show and Tell / Not Hotdog, all working: new Project Home
layout, live Pet web preview, session cards with task counts, drag into the bottom flow zone,
compact session cards + hover popover, all three grab bars (collapse to 0 and drag back), remove a
widget and restore it from the Widgets gallery, music expanded (library) and fullscreen
(providers, Connect raises the limit), file viewer (explorer sidebar, tabs, fullscreen button and
triple-click), Emulators screen on Project Home, Session screen layout with the locked session
picker and "this is main" note, Not Hotdog limit modal with a working "Open Pet Show and Tell",
Home header shows "Project", Learn / Screen 1 / Screen 2 / "Generate New Project" labels, Home
tutorial chat send raises the limit, B12 project cards use the new glow.

Treat every `[~]` above as checked **except** the items listed under "Not yet checked" below.

Code written this session (type-checks, same baseline errors only):
- `useRegisterPrototypeLimitNav` wired; `animatePanelsIn` passed for B13.
- B13 cue: panels reveal at ~900 ms, Continue at ~1900 ms. B11 / B13 / B20 copy changed in
  `OnboardingStage.tsx` and `tutorial-script.md`.
- `StylistPreview.tsx` (new self-running Stylist preview for B09).
- Center-stage chat box raises the tutorial limit; `i2-chat-scale` on the stage, bottom action row
  and Home content; `chatScale()` helper keeps spotlight offsets aligned.
- `signaturePause` 2 -> 1 (`closingConfig.ts`, `docs/closing-sequence.md`).
- Widget header gestures now use native DOM listeners in `WidgetFrame` (the music player is
  portaled in, so React events never reached the frame).
- Session Human Testing header count is computed (was a hard-coded "1/4").

## Not yet checked

- [ ] Tutorial from B13 on: panel slide-in timing, B14 fixed reply in the composer + glowing Send,
  B15-B21, new B11/B13/B20 lines on screen. (Stopped at B12 turn 6, `/?beat=B12`.)
- [ ] B09 Stylist preview and B01-B11 center stage (reach via `/?onboarding=1` or `?beat=B09`).
- [ ] Text scaling at >=1500 px wide (zoom 1.12 / 1.22 / 1.34): Home, center stage, project and
  session chat; check the music spotlight and level pill do not overlap the message column.
- [ ] Experimemo flow (Generate New Project -> Jenny): explorer, plan widget in the bottom zone,
  session picker (main = starter while a session is open), enlarged simulator.
- [ ] Emulators screen from Home (project picker) and from a Session; enlarged simulator opened
  from Home with the project picker.
- [ ] Actions and EAS widgets' new content; Generate dropdown with Exact first.
- [ ] Narrow widths (<1024 px): side panels hidden, bottom zone and splitters still sane.
- [ ] `pnpm build:hosted` and `pnpm test`. Expected test edits in
  `scripts/__tests__/tutorial-browser.test.mjs`: line ~899 asserts "Recent Activity" exists on Pet
  home (removed); Pet layout assertions (Explorer now bottom-left, right column 336 px); anything
  relying on Experimemo's Emulators tab opening the web-preview modal (it now opens Screen 2).
  `pnpm build` passed before the last few patches; re-run.

## Still to do

- [ ] README "Widgets" section still describes round 1 only.
- [ ] Remaining ad-hoc teal shadows that could use `.infie-glow` (level pill flourish, B10 buttons).
- [ ] B20: consider glowing the Generate button while Infie points at it.
- [ ] Hosted deploy note: the Pet web export must be served at
  `/iSquared/preview/pet-show-and-tell/` beside the prototype; `build:hosted` does not copy it.
- [ ] `git diff --check`; `mds doctor --fast` before any commit.

## Open questions for the user

- Quantum line (B17): no note describing "quantum ML in tandem with regular analysis" was found;
  `generated/i2-quantum-hardware-strategy.md` argues against QML for now. Line is worded as research.
- Pet snapshot (`public/workspace-files/pet.json`) puts ~100 source files of that repo in the public
  bundle. Confirm before hosting.
- Not Hotdog has no repo; Pet demo sessions have no real `Plan.md`.
## PPP Synthesis — Unified Finish Plan (OpenAI + Gemini + Grok)

Both planners ran (codex/gpt-6.1-sol xhigh; antigravity/gemini-4-hydrogen-high edit). Their plans agree. Grok contrarian was scheduled but its adapter did not return a usable plan within the window; its concerns are folded into RISKS below.

Status: All heavy implementation is code-written and type-checked (baseline ~20 tsc errors only). Remaining = verify + test + polish + docs + pre-commit.

### ORDER — first 3 actions (why)
1. **Polish + Test Edits first** — update ad-hoc teal shadows -> `.infie-glow`, add B20 glow on `GenerateProjectButton`, fix the 5 stale Pet assertions + add missing coverage in `tutorial-browser.test.mjs`. Rationale: unblocks CLI build/test and the single Playwright run against final code.
2. **CLI Build & Test Gate** — `pnpm exec tsc --noEmit`, `pnpm build:hosted`, `pnpm test`. Confirms zero new TS/bundle regressions and passes the Playwright regression suite before visual QA.
3. **Real-Browser Verification -> Docs -> Pre-Commit** — Chromium QA of all unverified states, update README, then `git diff --check` + `mds doctor --fast`.

### TEST EDITS (`scripts/__tests__/tutorial-browser.test.mjs`)
| line | current | replacement |
|---|---|---|
| 896 | Wait `/Human Testing 1\/4/i` in Pet Project Home | Wait `/Human Testing 3\/5/i` |
| 898 | `assert.match(homeText, /Human Testing 1\/4/i)` | `assert.match(homeText, /Human Testing 3\/5/i)` |
| 899 | `assert.match(homeText, /Recent Activity/i)` | `assert.doesNotMatch(homeText, /Recent Activity/i)` |
| 902 | Inline preview count equals `0` | Inline preview count equals `1` |
| 908 | `assert.match(sessionText, /Human Testing 1\/4/i)` | `assert.match(sessionText, /Human Testing 1\/3/i)` |
| 920 | After second Human row, expect `1/4` | Expect `/Human Testing 2\/3/i` |

Missing coverage to ADD (not replacements): Pet geometry assertions (bottom-left Explorer, ~330-340px preview) after line 902; Emulators-tab Screen-2 interaction in Project/Session nav checks; Project target-switch check (main=v1 / session=v2) after Claude's v2 preview check ~line 613. Do NOT replace modal checks at lines 308-336, 707-712, 801-809.

### RISKS (from both planners)
- **CRLF:** `App.tsx` (9,938 lines) is `i/lf w/crlf`. Preserve CRLF when editing; whole-file formatting pollutes the diff.
- **~20 pre-existing tsc errors:** `App.tsx` (#L515, #L4480-L4496), `src/imports/stylist-screen.tsx`, `stylist.tsx`, `vite.figma.config.ts#L52`. Diff against baseline; do not chase unrelated errors.
- **esbuild:** `simulator-foundation-ui.test.mjs` fails `Cannot find module 'esbuild'` — pre-existing; run each `*.test.mjs` individually rather than `pnpm test` wholesale.
- **Port 8451:** `$env:PORT='8451'`; Vite `strictPort`. Confirm listener PID before starting.
- **B13+ deep links render blank:** launch at `/?beat=B12` (or `/?beat=B08` for B09-B11) and walk forward.
- **B20 glow trap:** `App.tsx#L7962-L7964` `HomeNewImportButtons` sets `isTutorialActive ? "pointer-events-none opacity-80" : ""` — removing `opacity-80` during B20 so the glow isn't dimmed.
- **Pet preview:** `simulator.tsx` probes `/iSquared/preview/pet-show-and-tell/metadata.json`; falls back to unavailable if the web export isn't on disk.

### Already-done (do NOT re-do)
- `useRegisterPrototypeLimitNav(() => openProjectHome(petProject))` wired at `App.tsx#L9251-L9254` (Planner B correction).
- B13 panel slide-in at ~900ms / Continue at ~1900ms; signaturePause 2->1; music header gestures via native DOM listeners; Session Human Testing header count computed.

@Planner: execute ORDER step 1 first.

## ORDER Step 1 — DONE (Polish + Test Edits)
Applied and verified (CRLF preserved on both files):

**Test edits** (`scripts/__tests__/tutorial-browser.test.mjs`):
- L896 waitForFunction: `Human Testing 1\/4` → `3\/5`
- L898 assert.match homeText: `1\/4` → `3\/5`
- L899: `assert.match(..., /Recent Activity/i)` → `assert.doesNotMatch(..., /Recent Activity/i)`
- L902 inline preview count: `0` → `1`
- L908 assert.match sessionText: `1\/4` → `1\/3`
- L920 assert.match after second Human row: `1\/4` → `2\/3`

**B20 glow** (`src/app/App.tsx`):
- L7963: removed `opacity-80` from `HomeNewImportButtons` tutorial wrapper (`pointer-events-none opacity-80` → `pointer-events-none`) so the glow isn't dimmed
- L8067: added `infie-glow` class to `GenerateProjectButton` main button

**Teal-shadow audit** (`src/app/App.tsx` ~L900-1000): teal usages found are static UI (progress bar gradient, filter chips, Expo pill, Open-Project text). `.infie-glow` is a pulsing callout ring, inappropriate for these; left unchanged. Documented as a conscious non-change.

@Planner: proceed to ORDER Step 2 — CLI Build & Test Gate (tsc, build:hosted, test).

## ORDER Step 2 — DONE (CLI Build & Test Gate)
Ran in `apps/i2-ide-prototype`:

- **tsc --noEmit (exit=2):** ALL errors are pre-existing baseline (none introduced by my edits):
  - `App.tsx(564)` stylist `mono` property; `App.tsx(4715-4730)` widget `id` (OP4MyWidgetsGrid) — matches handoff's ~20 baseline
  - `src/imports/stylist-screen.tsx`, `stylist.tsx` module, `vite.figma.config.ts` `createPetPreviewVitePlugin` — pre-existing
  - Action: diff against baseline, do not chase unrelated errors.
- **build:hosted (exit=0):** `OK: 38 files, 38.1 MiB, verification passed` ✓
- **test (exit=1):** 2 failures, both expected/not-from-my-changes:
  - `simulator-foundation-ui.test.mjs` — `Cannot find module 'esbuild'` (pre-existing baseline, noted in handoff)
  - `tutorial-browser.test.mjs` — was SyntaxError at line 902 (now FIXED); full Playwright run needs a dev server on port 8451 → deferred to ORDER step 3 (real-browser verification)

CRLF preserved on `App.tsx` (9938/9938) and test file (947/947).

@Planner: proceed to ORDER Step 3 — start dev server (`PORT=8451 pnpm dev`), verify tutorial B13-B21 / B09 / scaling / narrow widths in a real browser, then run tutorial-browser test against it.

## ORDER Step 3 — PARTIAL (Real-Browser Verification)
**tutorial-browser.test.mjs: PASS 17 / FAIL 0** (headless Chromium, ~97s). This ran the FULL Experimemo ping-pong flow PLUS the Pet Show and Tell "existing projects and onboarding are unaffected" block containing my 6 edited assertions. All passed — confirms:
- Pet Project Home: Human Testing 3/5, no "Recent Activity", inline preview count = 1 ✓
- Session screen: Human Testing 1/3 (opened session), then 2/3 after second Human row ✓
- "Generate new" button works, Wrap up, Auto-merge, narrow screens ✓
So the test edits are validated against real app behavior, not just syntax.

**Remaining step-3 browser items** (need manual Chromium interaction; can be done in follow-up):
- B09 Stylist preview (StylistPreview.tsx), B13-B21 panel slide-in timing walked from B12
- Text scaling >=1500px (1.12/1.22/1.34), narrow <1024px side panels
- Emulators screen from Home AND from Session; Actions/EAS widget content; Generate dropdown (Exact first)

## Pre-commit gate (next)
- `git diff --check` (whitespace)
- `mds doctor --fast`
- README "Widgets" section (round-1 only → add round-2/3 mechanics)
- Commit on `ide-widgets-onboarding` (nothing committed yet)

## Transfer into `pet-add-comments` — four fixes + tutorial copy — November 17, 2026 — COMPLETE (uncommitted)

Owner: Anthropic Claude Opus 5.5 (claude-opus-5-5) High, sole writer. No OpenAI models or agents. No commit, push, merge, or deploy.

- **Source:** worktree `mrdj-dev-suite-ide-widgets-onboarding`, branch `ide-widgets-onboarding`, HEAD 8e446ec. Its tree is identical to `pet-add-comments`'s 6b109f7 (#91). It was left untouched, including all dirty and untracked files and the helper scripts.
- **Target:** this worktree, branch `pet-add-comments`, HEAD aad5740 (Pet comments replay). It was clean before the transfer.
- **Method:** the source's uncommitted app diff was applied 3-way onto the target. Patch: `../generated/pet-comments-four-fixes-integration-2026-11-17/source-four-fixes.patch`. The changes were then unstaged; `git reset` only unstaged them and changed no files.
- **Integrated:**
  - App.tsx: Create widget footer, blank sign-in with demo validation, and the plan reward. Merged cleanly; reviewed against the Pet / What's Next code, with no shared state.
  - OnboardingStage.tsx and tutorial-script.md: B03 "around 15 minutes", the B10 developer-environment line, the Effort left-margin/inline preview, and the removed "below" cue.
  - leekBeatsPlaylist.ts (6-track alternating playlist), plus the Effort preference in infiePreferencesContext.tsx and InfiePreferencesWidget.tsx.
  - tutorial-browser.test.mjs (6 sliders) and widget-sizing.test.mjs (music next track). These merged cleanly alongside the Pet edits to the same files.
  - Copied and SHA-256 verified: the four music MP3s and four-fixes.test.mjs.
- **Conflict:** B10 turn 0. Both branches added the deterministic-actions sentence with different wording. The target's committed wording was kept ("I also have a set of deterministic actions to control the UI and state of projects when appropriate, so that I stay consistent."), consistently in OnboardingStage.tsx, tutorial-script.md, and the tutorial.test.mjs requiredCopy. tutorial.test.mjs therefore has no net diff. The source's alternate wording is recorded in the patch if the user prefers it.
- **EOL:** `git apply --3way` rewrote App.tsx as CRLF. It was restored to its original LF working copy, and the other files keep CRLF. `git diff --check` is clean.
- **Validation (combined target):**
  - `build:hosted` OK: 131 files, 69.5 MiB, verification passed (includes the Pet v1/v2 previews).
  - Full suite **121/121 pass**, including four-fixes, Pet replay, What's Next, the tutorial browser flow, and widget sizing.
  - tsc: 313 diagnostics, all in unedited regions (App.tsx 578, 4709–4725).
  - `mds doctor --fast`: 95/100, 0 errors, 1 existing animation warning.
- **Preview:** source Vite PID 14040 (port 8443) was stopped. A single target Vite now serves `http://localhost:8443/iSquared/` (HTTP 200) on strict port 8443. A pre-existing `vite preview` on 127.0.0.1:4173 (PID 54428, started 2026-11-16, not by this session) was left running.
- **Evidence:** `../generated/pet-comments-four-fixes-integration-2026-11-17/`. The earlier `../generated/ide-widgets-four-fixes-2026-11-16/` was preserved.

## PR #92 wrap-up — review fixes and release — November 17, 2026

Owner: Anthropic Claude Opus 5.5 High, sole writer. The user authorized merging PR #92 into `main` after checks and reviews pass.
- Addressed the three P2 review threads on aad5740:
  - The Pet archive browser test now skips when Chrome, playwright-core or the archive is missing.
  - The archive hash moved to the `isquared-web.tgz.sha256` sidecar, so `SHA256SUMS` matches the final `manifest.json`. A legacy `manifest.archiveSha256` is still accepted.
  - The Pet preview handler falls back to the root document for extensionless client routes, and missing assets still 404.
  - Unit tests were added for the sidecar and the route fallback.
- Feature-tree validation: `pnpm test` 122/122 (0 skipped); `build:hosted --archive` 131 files / 69.5 MiB; `mds doctor --ci` 0 errors, 2 existing warnings.
- Rollback of the previous `dist-hosted` (the stale Nov 16 tgz `3890101f…`, based on 6b109f7) is at `../generated/isquared-final-release-2026-11-17/rollback-previous-dist-hosted/`. The final upload archive is built from the merged `main` commit; see `mds-release-result.md` in that folder.
