# Plan: Step 4 — The Project Folder and Home Gradually Emerging (B07–B10)

## 1. Goal & Scope
Implement `tutorial-script.md` beats **B07–B10** on top of the existing persistent app shell, preserving all B00–B06 interactions, the top-right `Lvl. 0` indicator, and the lower-left `LeekBeats` music player widget (including continuous audio playback, track state, and position across screens).

### Scope Summary
- **B06 → B07 handoff**: Enable `Continue` on B06 now that B07 is live (`STEP_4_MAX_ENABLED_BEAT = "B10"`).
- **B07 (The project folder)**: Reveal the small temporary floating `i2Workspace / project/` folder illustration (beside worktrees, with zero file labels initially) after Infie's line, followed by `Continue`.
- **B08 (Four files)**: Introduce `info.md`, `todo.md`, `style.md`, and `guidelines.md` one at a time across four turns with the exact script lines, adding each file pill to the floating folder illustration as its turn begins, then retire the folder illustration when advancing to B09.
- **B09 (Home comes into view)**: Progressively reveal the existing `I2HomeScreen` in three explicit groups after each corresponding line:
  1. `home_header_controls` — existing Home header controls (`i2`, `Project`, `Session` pills, `Widgets`, `Games SOON`, `Workspace/Emulators` toggle, `Bell/Settings` pill, and header border) around the already-present `Lvl. 0` indicator (`Tutorials` remains withheld until B17).
  2. `home_conversation_entry` — existing left-column Infie conversation entry in its exact left-half layout position (using an `aria-hidden` right-half layout spacer so the left column never stretches full-width or jumps when the right column appears).
  3. `home_projects_and_actions` + `tutorial_demo_project` — existing right-column `Active Projects` grid (with the seeded `Tutorial demo` project card isolated from preserved `PROTOTYPE_PROJECTS`) and the `Generate new … Project` / `Open New` action row.
- **B09 → B10 gate**: Open `Tutorial demo` through its `ProjectCard` in `I2HomeScreen` (in-place route change to `ProjectHomeScreen` with no reload and uninterrupted `LeekBeats` playback).
- **B10 (Project Home)**:
  - Turn 0: Reveal `project_navigation` (Project Home header with active green project pill, interactive project switcher dropdown on the project name pill, and `i2` Home breadcrumb) after Infie's line, plus `Continue`.
  - Turn 1: Reveal `project_roadmap_sessions` (the project's roadmap/folder/agent-task groups and `Sessions` group container, without prematurely exposing unintroduced `My Widgets` or `B11` inline agent questions). Stop at the end of B10 Turn 1 with `Continue` withheld until Step 5 (`B11`) is built.

---

## 2. Reveal Timing & Gate Matrix (B06–B10)

All reveals are driven by the cue-timed effect in `OnboardingStage.tsx` (`~450–500ms` after the spoken line appears, or `~120ms` under `prefers-reduced-motion: reduce`), with `Continue` retired at every turn boundary before re-appearing for reading gates.

| Beat / Turn | Spoken Line (Verbatim) | Revealed UI Group(s) & Timing | Gate to Advance |
| :--- | :--- | :--- | :--- |
| **B06** | *"I'm your orchestrator, coordinator, middle-man, question-answerer, and maybe friend. I take the repetitive, mundane, boring stuff out of building. Focus is key. I'll show you what you need when you need it."* | `continue_button` (`+500ms`) | Click `Continue` → **B07** |
| **B07** | *"The key to working with i² is the project folder. It's a magical place. It's an extra Git repository beside your worktrees in i2Workspace, where we keep the bigger picture. The whole team can read and edit these files. I'll keep them updated as we go."* | `folder_illustration` (`+450ms`, showing `i2Workspace/` with `main/` worktree + highlighted `project/` repo, 0 file labels) + `continue_button` (`+550ms`) | Click `Continue` → **B08 t0** |
| **B08 t0** | *"info.md holds the project's name, purpose, and important details. Jenny asks the questions when we start something new. Teammates can even chat with me about it on the i² website."* | `info.md` label added to folder illustration + `continue_button` (`+450ms`) | Click `Continue` → **B08 t1** |
| **B08 t1** | *"todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself."* | `todo.md` label added (`info.md`, `todo.md`) + `continue_button` (`+450ms`) | Click `Continue` → **B08 t2** |
| **B08 t2** | *"style.md is the colors, typography, and look we're going for. Jenny starts it. The Stylist helps you preview it. Your designer can use it on the website too."* | `style.md` label added (`info.md`, `todo.md`, `style.md`) + `continue_button` (`+450ms`) | Click `Continue` → **B08 t3** |
| **B08 t3** | *"guidelines.md tells me and the other agents how to work. It's the most technical one you're meant to edit. There are extra files too, but I'll take care of those, silly human."* | `guidelines.md` label added (all 4 files visible) + `continue_button` (`+450ms`) | Click `Continue` → retires `folder_illustration`, advances to **B09 t0** |
| **B09 t0** | *"Before we open a project, we're in i² Home. Your Home controls live up here."* | `home_header_controls` (`+450ms`, around existing `Lvl. 0`; `Tutorials` still hidden) + `continue_button` (`+550ms`) | Click `Continue` → **B09 t1** |
| **B09 t1** | *"Here you can talk with me about whatever you want, or use our conversation in a project."* | `home_conversation_entry` (`+450ms`, left column in `I2HomeScreen`) + `continue_button` (`+550ms`) | Click `Continue` → **B09 t2** |
| **B09 t2** | *"Start something new with Jenny, or pick up an existing project. I've filled in some dummy data for this tutorial. Let's open one."* | `home_projects_and_actions` + `tutorial_demo_project` (`+450ms`, right column `Active Projects` with `Tutorial demo` + `Generate`/`Open New` CTAs; no `Continue`) | Click `Tutorial demo` card → opens `ProjectHomeScreen` and advances to **B10 t0** |
| **B10 t0** | *"This is Project Home. Click the project name to switch projects, or head back to i² Home. You can switch while work carries on, even across windows. Don't overload your brain. That's what I'm here for."* | `project_navigation` (`+350ms`, Project Home header with interactive project switcher on the project pill + `i2` Home button) + `continue_button` (`+500ms`) | Click `Continue` → **B10 t1** |
| **B10 t1** | *"I handle long-term planning, version control, branches and worktrees, and what to do next. Your roadmap and Sessions live here."* | `project_roadmap_sessions` (`+450ms`, Project Folder, Recent Activity, Agent Tasks roadmap, and Sessions group; `Continue` withheld at Step 4 cap) | Stop point for Step 4 (B11 enabled in Step 5) |

---

## 3. Component & Data-Flow Changes

### 3.1 `src/app/onboarding/OnboardingContext.tsx`
- Raise `STEP_3_MAX_ENABLED_BEAT` to `STEP_4_MAX_ENABLED_BEAT: OnboardingBeat = "B10"`.
- Remove the immediate beat-entry reveal branches for `B07`, `B08`, `B09`, and `B10` from the context `useEffect` so `OnboardingStage.tsx` controls the cue-timed reveals after each line. Keep the cleanup/retire rules (`retireGroup("folder_illustration")` when entering `B09`).

### 3.2 `src/app/onboarding/OnboardingStage.tsx`
- **Cue-timed reveals for B06–B10**:
  - `B06`: `at(500, () => revealGroup("continue_button"))`.
  - `B07`: `at(450, () => revealGroup("folder_illustration"))`, `at(550, () => revealGroup("continue_button"))`.
  - `B08`: Ensure `folder_illustration` remains revealed; `at(450, () => revealGroup("continue_button"))` on each turn `0..3`.
  - `B09`:
    - `turnIndex === 0`: `retireGroup("folder_illustration")`, `at(450, () => revealGroup("home_header_controls"))`, `at(550, () => revealGroup("continue_button"))`.
    - `turnIndex === 1`: `at(450, () => revealGroup(["home_header_controls", "home_conversation_entry"]))`, `at(550, () => revealGroup("continue_button"))`.
    - `turnIndex === 2`: `at(450, () => revealGroup(["home_header_controls", "home_conversation_entry", "home_projects_and_actions", "tutorial_demo_project"]))` (no `continue_button`; user opens `Tutorial demo`).
  - `B10`:
    - `turnIndex === 0`: `at(350, () => revealGroup("project_navigation"))`, `at(500, () => revealGroup("continue_button"))`.
    - `turnIndex === 1`: `at(450, () => revealGroup(["project_navigation", "project_roadmap_sessions"]))` (withhold `continue_button` while `maxEnabledBeat === "B10"` so there is no dead button at the Step 4 stop point).
- **B07–B08 Floating Folder Illustration**:
  - Keep unboxed (`background: transparent`, thin borders). Show `i2Workspace/` containing a muted `main/` worktree pill beside the highlighted `project/` Git repo pill, and render the 4 file pills (`info.md`, `todo.md`, `style.md`, `guidelines.md`) below `project/` one by one as `turnIndex` advances in `B08`.
- **B09–B10 Floating Infie Placement**:
  - Position Infie and her unboxed `FloatingInfieMessage` cleanly in top-center usable negative space (just below the 59px header at `top: 72px`) so she never covers the lower-left `LeekBeats` widget, the left-column conversation input, the right-column `Tutorial demo` card, or the `Sessions` panel in `ProjectHomeScreen`.

### 3.3 `src/app/App.tsx` (`Header`, `I2HomeScreen`, `ProjectHomeScreen`)
- **`Header` Project Switcher & Level Stability**:
  - Add an optional `projects?: ProtoProject[]` and `onSelectProject?: (p: ProtoProject) => void` to `Header`. When `activeLevel === "project"`, clicking the active Project pill opens a compact dropdown allowing the user to switch between `Tutorial demo` and wired projects in place, fulfilling *"Click the project name to switch projects, or head back to i² Home."*
  - During `B10` (if the user clicks `i2` to visit i² Home and then clicks `Tutorial demo` or the Project pill in `Header` to return to Project Home), preserve the current `B10` beat and turn without re-triggering or resetting anything.
- **`I2HomeScreen` Progressive Group Reveal without Layout Jump**:
  - In `I2HomeScreen`, when `showConversationEntry` is `true` and `showProjectsAndActions` is `false` (`B09` Turn 1), render an empty `aria-hidden="true"` spacer (`w-[18px]`) and right-column placeholder (`flex-[1_0_0] h-[604px] min-w-px pointer-events-none`) so the left `Infie Convo` column renders at its exact final left-half width and position and does not shift when the right column fades in at `B09` Turn 2.
  - During active tutorial beats (`B09`), keep the `Test changes in Add comments` shortcut pill in `I2HomeScreen`'s conversation card from jumping directly to `SessionScreen` before `B12`.
- **`ProjectHomeScreen` Granular Reveal (`B10`)**:
  - Pass `showNavigation={isRevealed("project_navigation")}` and `showRoadmapSessions={isRevealed("project_roadmap_sessions")}` and `showWidgetsPanel={isRevealed("widget_move_resize") || isRevealed("library_entry_and_example")}` to `ProjectHomeScreen`:
    - In `B10` Turn 0 (`showNavigation && !showRoadmapSessions`), only the `Header` (with `Tutorial demo` active green pill, project switcher, `i2` Home button, and `Lvl. 0`) is visible above the dark canvas (plus `LeekBeats` at lower-left).
    - In `B10` Turn 1 (`showRoadmapSessions === true`), reveal the Project Folder, Recent Activity, Agent Tasks roadmap, and Sessions panel, while keeping `My Widgets` hidden until `B15`.

---

## 4. Verification Strategy (Headless Chromium + Build)

Extend the Playwright verification script in `/tmp/pw` against `http://localhost:3000/` to test the full B06 → B10 flow:
1. **B06 → B07**: Verify `Continue` appears on `B06` and advances to `B07`; verify the floating `i2Workspace / project/` illustration appears after the line with `0` file labels.
2. **B08 (4 turns)**: Verify `info.md`, `todo.md`, `style.md`, and `guidelines.md` appear one at a time on turns 0, 1, 2, 3 with their exact spoken lines, and that `folder_illustration` is removed from the DOM on advancing to `B09`.
3. **B09 (3 turns, Home emerging)**:
   - Turn 0: Verify `[data-name=Header]` controls appear around `Lvl. 0`, `Tutorials` button is still absent from the DOM, and neither the left conversation column nor the right projects column is in the DOM yet. Verify `Lvl. 0` bounding box right edge remains `24px` from viewport right.
   - Turn 1: Verify the left `Infie` conversation column appears after the line, the right `Active Projects` column is still absent from the DOM/AX tree, and record the left column's bounding box.
   - Turn 2: Verify the right `Active Projects` grid (with `Tutorial demo` card alongside existing projects) and `Generate` / `Open New` buttons appear after the line, `Continue` is absent, and the left column's bounding box did not shift.
4. **B09 → B10 Navigation & Audio Continuity**:
   - With `LeekBeats` playing, click the `Tutorial demo` card; verify in-place transition to `ProjectHomeScreen` (`Tutorial demo` active pill in `Header`), same `<audio>` element instance, `paused === false`, and `currentTime` continuing monotonically without restart.
5. **B10 (Project Home)**:
   - Turn 0: Verify `Header` is visible before the 3-column body, project switcher opens on clicking the project pill, and `i2` Home navigation works and can return to `Tutorial demo`.
   - Turn 1: Click `Continue`; verify `Project Folder`, `Agent Tasks`, and `Sessions` panels appear after the line, `My Widgets` is not revealed prematurely, and `Continue` is withheld at the B10 stop point.
6. **Build**: Run `mise exec -- npm run build` and confirm exit code `0`.
