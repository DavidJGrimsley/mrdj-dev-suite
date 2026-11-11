# Infie Onboarding Tutorial — Phases 5 through 11 Implementation Plan

## 1. Goal & Scope
Complete and verify Phases 5 through 11 of the Infie onboarding tutorial in one continuous sequential run using `tutorial-script.md` (SHA-256 `056fe7136ac303aa96f862ca95661b9df0bf7e5d97f09e18bec35f50ca66dec3`) as the canonical specification and maintaining `AGENT-HANDOFF.md` at the project root after every phase.

All work reuses and builds upon the existing persistent shell (`src/app/App.tsx`), onboarding state machine (`src/app/onboarding/OnboardingContext.tsx`, `src/app/onboarding/onboardingContextDef.ts`, `src/app/onboarding/revealLedger.ts`), floating UI primitives (`src/app/onboarding/FloatingPrimitives.tsx`), music widget (`src/app/onboarding/LeekBeatsWidget.tsx`), and stage orchestrator (`src/app/onboarding/OnboardingStage.tsx`).

---

## 2. Canonical Beat & Form Cycle Reconciliation (`B00`–`B21` → `COMPLETE`)

### 2.1 Semantic Beat Mapping (`src/app/onboarding/revealLedger.ts` & `OnboardingContext.tsx`)
Expand `OnboardingBeat` and `BEAT_ORDER` from `B00..B18` to `B00..B21` plus `COMPLETE`, and lift the `STEP_4_MAX_ENABLED_BEAT = "B08"` cap so `maxEnabledBeat` defaults to `"COMPLETE"`:

| Beat | Canonical Heading | Old Code Mapping | Silent Form (`InfieFormId`) | Asset Path |
| :--- | :--- | :--- | :--- | :--- |
| `B00` | Black (2s pause) | `B00` | *(none)* | *(none)* |
| `B01` | Infie arrives | `B01` | `mist` | `/assets/infie-form-mist.png` |
| `B02` | Hello and identity | `B02` | `glyph` | `/assets/infie-form-glyph.png` |
| `B03` | Level | `B03` | `surge` | `/assets/infie-form-surge.png` |
| `B04` | What do you want to build? | `B04` | `compile` | `/assets/infie-form-compile.png` |
| `B05` | Music | `B05` | `glyph` | `/assets/infie-form-glyph.png` |
| `B06` | Controls | *(new backfill)* | `mist` *(cycle paused)* | `/assets/infie-form-mist.png` |
| `B07` | Working with Infie | old `B06` | `surge` | `/assets/infie-form-surge.png` |
| `B08` | i2 Workspace and project folder | old `B07` | `compile` | `/assets/infie-form-compile.png` |
| `B09` | Four files | old `B08` | `mist` | `/assets/infie-form-mist.png` |
| `B10` | Models | *(new beat)* | `glyph` | `/assets/infie-form-glyph.png` |
| `B11` | The rest of the header bar | split from old `B09` t0 | `surge` | `/assets/infie-form-surge.png` |
| `B12` | Home comes into view | old `B09` | `compile` | `/assets/infie-form-compile.png` |
| `B13` | Project Home | old `B10` | `mist` | `/assets/infie-form-mist.png` |
| `B14` | Sessions and an agent question | old `B11` | `glyph` | `/assets/infie-form-glyph.png` |
| `B15` | Agents and tasks | old `B12` | `surge` | `/assets/infie-form-surge.png` |
| `B16` | Completion pending | old `B13` | `compile` | `/assets/infie-form-compile.png` |
| `B17` | Session completion & Infinite Intelligence | old `B14` | `mist` | `/assets/infie-form-mist.png` |
| `B18` | Widgets and Library | old `B15` | `glyph` | `/assets/infie-form-glyph.png` |
| `B19` | Away from the desk; older projects | old `B16` | `surge` | `/assets/infie-form-surge.png` |
| `B20` | Tutorials and level-up | old `B17` | `compile` | `/assets/infie-form-compile.png` |
| `B21` | Already Home | old `B18` | `mist` | `/assets/infie-form-mist.png` |
| `COMPLETE` | Normal i² Home (Level 1) | `COMPLETE` | `mist` | `/assets/infie-form-mist.png` |

### 2.2 Surge & Form Artwork Rendering (`InfieHeroArtwork` & `FloatingInfieMascot`)
- Map `surge` to `/assets/infie-form-surge.png` (SHA-256 `1ab7abb19e8ba8697f7ce79613420899cc9110ab2c7a6eb815f13464dd28a8d2`, renamed by the user from `infie-form-surge-clean.png`; also provide a byte-identical `/assets/infie-form-surge-clean.png` alias in `public/assets/` so any reference to either filename resolves cleanly).
- Replace all `infie_hero_transparent.png` references in onboarding and Home mascot rendering with the beat-mapped form still (`getFormAssetForBeat(currentBeat)`).
- **Clean Transparent Loop Openings**:
  - Remove the blurred radial-gradient backing oval (`filter: blur(14px)`) behind `InfieHeroArtwork` in `src/app/onboarding/OnboardingStage.tsx` and behind `FloatingInfieMascot` in `src/app/App.tsx`.
  - Remove the radial `maskImage` / `WebkitMaskImage` and broad CSS `drop-shadow` on the `<img>` so the 2048×2048 RGBA transparent images render directly with clear loop openings behind Surge's eyes and their native narrow energy rim intact.
  - Use `AnimatePresence mode="wait"` (or non-overlapping opacity transition) when switching form stills between beats so a second image is never layered behind the active form.

---

## 3. Sequential Phase Execution Plan (Phases 5–11)

### Phase 5: Reconcile `B01`–`B07`, Backfill `B06` Controls, Wire Silent Form Cycle & Early Deltas
1. **Route Guards & Reveal Ledger Reconciliation**:
   - Update `revealLedger.ts`, `OnboardingContext.tsx`, `OnboardingStage.tsx`, and `App.tsx` to use the canonical `B00`–`B21` beat IDs.
   - Set `maxEnabledBeat = "COMPLETE"` in `OnboardingProvider`.
2. **`B03` Level & Separate Turn Delta**:
   - Turn 0 (`"Nice to meet you, {name}. I can see you're level zero."`): reveals `level_indicator` in spotlight, holds briefly (~1.4s), and **automatically glides** to its top-right Header anchor during Turn 0 (`levelPillDocked` transitions from `false` to `true` after the hold timer in `B03` Turn 0). `Continue` advances to Turn 1.
   - Turn 1 (`"What a noob. Let's see what we can do about that..."`): shown as its own separate message turn with a required `Continue` button before advancing to `B04` (no auto-advance, not merged into Turn 0).
3. **`B04` Send-Only Gate**:
   - Preserve the nonempty reply field + `Send` button gate on Turn 0 (no `Continue` or `Skip` on Turn 0). Submitting docks the chat input bar at the bottom and advances to Turn 1 (`"I actually don't do much coding myself..."`), which has a `Continue` gate to `B05`.
4. **`B05` Music Line & Auto-Glide Delta**:
   - Update the Play-success spoken line in `OnboardingStage.tsx` to exact script copy:
     `"Oh yea, that's my jam. Your music player can live here for now."`
   - Keep the quiet/Continue/blocked fallback line:
     `"Your music player will be right here when you want it."`
   - On Turn 1 (`music_full_player`), assemble `Prev`, `Next`, and `LeekBeats` label around Play in the spotlight, hold briefly (~1.2s), and automatically glide `LeekBeatsWidget` to its lower-left Home anchor (`left: 24px, bottom: 24px`).
5. **`B06` Controls Backfill (Form: `Mist`, cycle paused)**:
   - **Turn 0 (Voice / Simulated Mic Prompt)**:
     - Line: `"I'm all ears if you want to speak conversationally."`
     - Reveal: Unboxed floating simulated microphone permission prompt with two buttons: `"Allow microphone"` and `"Not now"`.
     - Gate: Clicking either button advances to Turn 1 (`setTurnIndex(1)`). Never calls `navigator.mediaDevices.getUserMedia` or any browser permission API.
   - **Turn 1 (Keyboard & Mouse)**:
     - Line: `"You can control this IDE in a number of ways. Of course you can use the keyboard and mouse."`
     - Stage: Muted transformation video (`/assets/infie-transform-keyboard-mouse.mp4`) plays on the black stage at Infie's position (overlapping cross-fade with live Infie). When `onEnded` fires (or immediately via gentle fade under `prefers-reduced-motion: reduce`), live Infie returns and the transparent floating illustration (`/assets/infie-controls-keyboard-mouse.png`) appears beside her with no card, border, or backplate.
     - Gate: `Continue` advances to Turn 2.
   - **Turn 2 (Gamepad)**:
     - Line: `"Or pick up a gamepad if that's more your groove."`
     - Stage: Muted transformation video (`/assets/infie-transform-gamepad.mp4`) plays at Infie's position and retires into floating `/assets/infie-controls-gamepad.png` beside Infie (reduced motion: gentle fade of PNG).
     - Gate: `Continue` advances to Turn 3.
   - **Turn 3 (Upright Joystick & Programmable Keypad)**:
     - Line: `"Prefer an upright desktop joystick and programmable keypad? You can do that too. Since navigating the UI and executing common actions are mapped to a controller, you can set up any kind of custom scenario you want in settings later. Some games may require a specific input device."`
     - Stage: Muted transformation video (`/assets/infie-transform-joystick-numpad.mp4`) plays at Infie's position and retires into floating `/assets/infie-controls-joystick-numpad.png` beside Infie (reduced motion: gentle fade of PNG).
     - Gate: `Continue` advances to Turn 4.
   - **Turn 4 (All Three Summary)**:
     - Stage: All three transparent floating illustrations (`infie-controls-keyboard-mouse.png`, `infie-controls-gamepad.png`, `infie-controls-joystick-numpad.png`) appear together beside Infie, then retire when advancing.
     - Gate: `Continue` advances to `B07`.
6. **`B07` Working with Infie (Form: `Surge`, 3 turns with `Continue` per turn)**:
   - **Turn 0**: `"I'm your orchestrator, coordinator, middle-man, question-answerer, and maybe friend. I take the repetitive, mundane, boring stuff out of building. Focus is key. I'll show you what you need when you need it."` → `Continue`.
   - **Turn 1**: `"I'm an expert at revision control such as Git, Perforce, Diversion and more. I'm also packed with skills that help me be a great agent team lead. Most importantly, I help you keep track of tasks and projects in a way that makes it easy to jump back in after weeks away or manage multiple large projects at once. Think of me as your double, your partner-in-crime, your right-hand."` → `Continue`.
   - **Turn 2 (Hot-keys help turn)**: `"You can ask me for help with any aspect of the IDE just by holding hot keys and clicking on it. You can even do this for single words or phrases in agent chats to get an explanation catered to you."` (Explanation only; no key combo or help UI invented) → `Continue` advances to `B08`.
7. **Phase 5 Checkpoint**: Update `AGENT-HANDOFF.md` with Phase 5 implementation & verification logs.

---

### Phase 6: `B08` Workspace Tree, Navigation Reveal & Isolated `project/` Folder; `B09` Four Files & Stylist Preview
1. **`B08` — i2 Workspace and project folder (Form: `Compile` across all 4 turns)**:
   - Remove the old horizontal `i2Workspace/  main/ (worktree)  project/` chip row and old `"It's also how the UI is structured here."` line completely.
   - **Turn 0 (Workspace tree)**:
     - Line: `"Here you will work in an i2 Workspace. It has your project in it and is made to keep things neat, transparent, and keep disk usage low."`
     - Reveal (`workspace_tree`): Animated, indented, **vertical** native folder tree (no card/panel backplate, no raster art, no env-files folder):
       - Root: `pet-show-and-tell-i2Workspace/`
       - 6 exact children with folder icons, indentation, and tree connectors (`├──` / `└──`):
         1. `generated/`
         2. `project/` *(green `#abefa3`, sibling of worktrees)*
         3. `temp/`
         4. `pet-show-and-tell/` *(with subtle explanatory label `(main worktree)`)*
         5. `pet-show-and-tell-add-comments/` *(with subtle explanatory label `(session worktree)`)*
         6. `pet-show-and-tell-fix-reactions/` *(with subtle explanatory label `(session worktree)`)*
     - Gate: `Continue` advances to Turn 1.
   - **Turn 1 (UI navigation)**:
     - Line: `"It's also how the UI navigation is structured. Project changes to the name of your current project. A Session is another copy of your project (worktree if Git) that is focused on a feature, bug fix, experimentation, etc. You can start sessions by talking to me but we'll get there. First..."`
     - Reveal (simultaneously with message while `workspace_tree` stays visible): `header_breadcrumbs` (`i2 / Project / Session` navigation group) spotlights near Infie's message (`breadcrumbsDocked = false`).
     - Gate: Clicking `Continue` docks `i2 / Project / Session` to its top-left Header position (`breadcrumbsDocked = true`), fades out `workspace_tree`, and advances to Turn 2.
   - **Turn 2 (The project folder)**:
     - Stage: Show **ONLY** the green `project/` folder (`project_folder_only` — alone, with no `i2Workspace/` root and no `main/` or worktree chips).
     - Line: `"The key to working with i² is the project folder. It's a magical place. It's an extra Git repository beside your worktrees in i2Workspace, where we keep the bigger picture. The whole team can read and edit these files. I'll keep them updated as we go."`
     - Gate: `Continue` advances to Turn 3.
   - **Turn 3 (Separate repo)**:
     - Stage: Green `project/` folder remains visible alone.
     - Line: `"This is a separate repo so we can edit it independently of the many worktrees I will manage for you, including cleaning them up as to not waste your disk space. This repo is also where agent coordination is tracked amongst your own sessions and other team members."`
     - Gate: `Continue` advances to `B09`.
2. **`B09` — Four files (Form: `Mist`)**:
   - Green `project/` folder stays visible alone, and the four file labels (`info.md`, `todo.md`, `style.md`, `guidelines.md`) appear sequentially as an **indented vertical list under the green `project/` folder** as each turn begins:
   - **Turn 0 (`info.md`)**:
     - Line: `"info.md holds the project's name, purpose, and important details. An agent asks the questions when we start something new or you can start with a basic rundown of the idea or fill out the template. Teammates can even chat with me about it on the i² website."`
     - Vertical list under `project/`: `info.md`.
     - Gate: `Continue` → Turn 1.
   - **Turn 1 (`todo.md`)**:
     - Line: `"todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself."`
     - Vertical list under `project/`: `info.md`, `todo.md`.
     - Gate: `Continue` → Turn 2.
   - **Turn 2 (`style.md` + Stylist static preview)**:
     - Line: `"style.md is the colors, typography, and look we're going for and The Stylist is an interactive theme setter that helps you preview it. Your designer can use it on the website too."`
     - Vertical list under `project/`: `info.md`, `todo.md`, `style.md`.
     - Reveal (`stylist_preview`): Static preview of The Stylist positioned to the right of the messages.
     - Gate: `Continue` retires `stylist_preview` and advances to Turn 3.
   - **Turn 3 (`guidelines.md`)**:
     - Stage: `stylist_preview` is retired before `guidelines.md`.
     - Line: `"guidelines.md tells me and the other agents how to work. It's the most technical one you're meant to edit. There are extra files too, but I'll take care of those, silly human."`
     - Vertical list under `project/`: `info.md`, `todo.md`, `style.md`, `guidelines.md`.
     - Gate: `Continue` retires the green `project/` folder and file list (`project_folder_only` / `folder_illustration`) and advances to `B10`.
3. **Phase 6 Checkpoint**: Update `AGENT-HANDOFF.md`.

---

### Phase 7: `B10` Models Configuration & `B11` Header Groups
1. **`B10` — Models (Form: `Glyph`)**:
   - Store `connectedModels: string[]` in onboarding context/state.
   - **Turn 0**:
     - Line: `"I am run by an open-weight model on iSquared's server which is included in your plan. If you want to give me an upgrade with a local or frontier model, you can do so later in settings, so long as the model meets the minimum requirements I need."`
     - Reveal (`model_signin_buttons`): Unboxed array of faux sign-in buttons: `Claude`, `ChatGPT`, `Grok`, `Gemini`, `Cline`, plus `"Use local models"`.
     - Gate: `Continue` advances to Turn 1 (any model connected during Turn 0 persists into Turn 1).
   - **Turn 1**:
     - Line: `"You can use any combination of models for your Session Agents, those are the ones to whom I pass off your requests to get the coding work done. I manage them as a team but more on that later. For now just configure your choices and you can always adjust later in settings."`
     - Interactive Faux Sign-In Modal: Clicking any provider button (`Claude`, `ChatGPT`, `Grok`, `Gemini`, `Cline`, or `Use local models`) opens a clearly simulated modal (explicitly labeled simulated demo sign-in, no real OAuth, no network, no real credentials or password fields; clicking `"Connect <Provider> (Simulated)"` marks that provider connected with a checkmark badge).
     - Gate: At least one connected model (`connectedModels.length >= 1`) is required before `Continue` is enabled. Clicking `Continue` retires `model_signin_buttons` and advances to `B11`.
2. **`B11` — The rest of the header bar (Form: `Surge`)**:
   - In `Header` (`src/app/App.tsx`), remove the `"SOON"` badge from `Games` so it renders `Tutorials`, `Widgets`, `Games` cleanly.
   - Wrap the `Tutorials / Widgets / Games` center header group and the `Notification / Settings` right header group in `SpotlightToDock` containers controlled by `B11` turn state:
   - **Turn 0**:
     - Reveal (`header_tutorials_widgets_games`): `Tutorials, Widgets, Games` group appears spotlighted and slightly larger near Infie's message (`headerCenterDocked = false`).
     - Line: `"Whenever you want to visit more tutorials you can click this in the header. Your music player is a widget and there are tons more for you to customize your experience. Games take your iSquared level into account when playing and pause automatically when I have something for you to review. It's a great way to spend time while waiting for agents. You are welcome to submit a tutorial, widget or game to the Infinite Intelligence and there will be tutorials on how to do just that!"`
     - Gate: `Continue` docks `Tutorials, Widgets, Games` into the header (`headerCenterDocked = true`) and advances to Turn 1.
   - **Turn 1**:
     - Reveal (`header_notifications_settings`): `Notification/Settings` header pill appears spotlighted and holds (`headerRightDocked = false`).
     - Line: `"A combined list of alerts for your review and other notifications live here as well as settings."`
     - Gate: `Continue` docks `Notification/Settings` into its top-right header slot (`headerRightDocked = true`) and advances to `B12`.
3. **Phase 7 Checkpoint**: Update `AGENT-HANDOFF.md`.

---

### Phase 8: `B12` Home Comes Into View (Docked Chat & Two Glowing Projects)
1. **Conversation Slides & Docks into Home Chat (`B12` — Form: `Compile`)**:
   - Upon entering `B12`, Infie and her conversation slide/dock into the existing `I2HomeScreen` left-column Infie chat (`home_conversation_entry`).
   - From `B12` onward, ordinary tutorial messages appear inside the existing Infie chat (`I2HomeScreen`, `ProjectHomeScreen`, and `SessionScreen`), with the temporary `Continue` button rendered inside/below the active chat message. Floating messages are reserved exclusively for distant callouts (`B17` completion form, `B18` widget/library callout).
   - Remove the 3rd `TUTORIAL_DEMO_PROJECT` (`"Tutorial demo"`) card from `I2HomeScreen` so only the two canonical seeded projects (`"Pet Show and Tell"` and `"Not Hotdog"`) appear.
2. **Six-Turn Progressive Home Reveal (`B12` Turns 0–5)**:
   - **Turn 0**:
     - Reveal: `home_conversation_entry` + `home_resume_projects` (`Active Projects` section showing `"Pet Show and Tell"` and `"Not Hotdog"`, disabled/non-clickable until Turn 5). Do not show `Generate new` / `Import Project` or chat `Action Buttons` yet.
     - Line: `"You can resume projects that are already onboarded to iSquared."` → `Continue`.
   - **Turn 1**:
     - Reveal: `home_new_import_buttons` (`Generate new Expo Project` and `Import Project` buttons, non-clickable during tutorial gate).
     - Line: `"You can also start new projects or onboard existing ones to iSquared."` → `Continue`.
   - **Turn 2**:
     - Line: `"We're now in i² Home."` → `Continue`.
   - **Turn 3**:
     - Line: `"Here you can talk with me about whatever you want, or use our conversation in a project. You can do a lot from here and then get deeper as needed. I can also help you manage our global todo list which includes your projects that have open todo items or random todo things you want to track like 'Update SSL certificates on MyWebsite.com'"` → `Continue`.
   - **Turn 4**:
     - Reveal: `home_action_buttons` (Action buttons row inside the Home chat card).
     - Line: `"I'll present Action Buttons specific to the next steps of your projects to save you time typing."` → `Continue`.
   - **Turn 5 (Project Selection Gate)**:
     - Line: `"I've filled in some dummy data for this tutorial. Let's open one."`
     - Reveal: `"Pet Show and Tell"` and `"Not Hotdog"` project cards become interactive and display the teal/cyan callout glow (`border-[#2dd4bf]`, `shadow-[0_0_22px_rgba(45,212,191,0.45)]`). No `Continue` button is shown.
     - Gate: Clicking either `"Pet Show and Tell"` or `"Not Hotdog"` opens `ProjectHomeScreen` for that project and advances to `B13`.
3. **Phase 8 Checkpoint**: Update `AGENT-HANDOFF.md`.

---

### Phase 9: `B13` Project Home, `B14` Inline Agent Question & Session Click, `B15` Tasks, `B16` Completion Pending
1. **`B13` — Project Home (Form: `Mist`)**:
   - Ordinary Infie messages render in `ProjectHomeScreen`'s center Infie chat column (with Infie's avatar using the current beat's form still).
   - **Turn 0**:
     - Reveal: `project_navigation` (Project title/switcher and Home navigation in Header). Roadmap/Sessions columns remain hidden on Turn 0 while the center Infie chat is visible.
     - Line: `"This is Project Home. Click the project name to switch projects, or head back to i² Home. You can switch while work carries on, even across windows. Don't overload your brain. That's what I'm here for."` → `Continue`.
   - **Turn 1**:
     - Reveal: `project_roadmap_sessions` (Left roadmap/folder/tasks column and bottom `Sessions` panel). Right widgets/explorer column remains hidden until `B18`.
     - Line: `"I handle long-term planning, version control, branches and worktrees, and what to do next. Your roadmap and Sessions live here."` → `Continue` advances to `B14`.
2. **`B14` — Sessions and an agent question (Form: `Glyph`)**:
   - **Turn 0**:
     - Reveal: `demo_session_and_question` (Seeded Session entry details in the `Sessions` panel).
     - Line: `"A Session is a focused piece of work, usually with its own branch and worktree. Big feature, little fix—you get the idea. Sessions come from your todo. You can make one yourself, but I assure you I'll do a better job… just kidding."` → `Continue` advances to Turn 1.
   - **Turn 1 (Inline Agent Question in Infie Chat)**:
     - Line: `"When an agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it."`
     - Reveal: The demo agent question (`"Ready for you to review the preview. Shall I use the teal accent?"`) arrives as an **ordinary message in the docked Project Home Infie chat** accompanied by an unboxed bordered reply input and `Send` button inside the chat flow (no separate floating attention card).
     - Gate: Submitting a reply displays a brief acknowledgement in chat and advances to Turn 2.
   - **Turn 2 (Open Demo Session Gate)**:
     - Line: `"Or click the Session name and talk to the agent directly. Let's do that now."`
     - Reveal: The seeded Session card (`"Add Comments"` / `"Improve Not Hotdog Classifier"`) in the `Sessions` panel glows teal/cyan (`#2dd4bf`).
     - Gate: Clicking the Session card/name opens `SessionScreen` and advances to `B15`.
3. **`B15` — Agents and tasks (Form: `Surge`)**:
   - Ordinary Infie messages render in `SessionScreen`'s center Infie chat tab.
   - **Turn 0**:
     - Reveal: `session_agent_controls` (Session identity/switcher in Header and compact agent/model indicator).
     - Line: `"Each Session has agents working on it. The model is up to you. Use our ready-made agents, bring your own, or import them. i² gives them a place to work together."` → `Continue` advances to Turn 1.
   - **Turn 1 (Human Review Task Check Gate)**:
     - Reveal: `session_task_groups` (`Agent Tasks` panel with demo agent tasks already marked complete `[x]`, and `Human Testing` panel with one unchecked Human review task `"Confirm the preview in session worktree"` glowing teal/cyan).
     - Line: `"Tasks come in two groups: Agent tasks and Human tasks. You're the human. This one's ready for you to verify."`
     - Gate: Checking the demo Human review task marks it done and advances to `B16` (without triggering an automatic merge).
4. **`B16` — Completion pending (Form: `Compile`)**:
   - **Turn 0**:
     - Reveal: `session_pr_status` (Seeded PR/review status and `COMPLETION PENDING` badge in `SessionScreen`).
     - Line: `"When the work and checks are ready, I open a pull request. After review and merge, the Session is completion pending. Let's say this one's reviewed and merged. Here's what's left."`
     - Gate: `Continue` advances to `B17`.
5. **Phase 9 Checkpoint**: Update `AGENT-HANDOFF.md`.

---

### Phase 10: `B17` Unboxed Session Completion Form & 7-Turn Derived Gate
1. **Unboxed Floating Form Styling (`session_completion_form` — Form: `Mist`)**:
   - Render the Session Completion Form with **no outer card border or opaque card background** (`background: "transparent"`, `border: "none"` on the form wrapper; individual `FloatingField` inputs have thin borders and transparent interiors; rating buttons and `Submit` have fills and borders).
   - Keep all form fields visible throughout all 7 turns:
     - `Infie-prefilled summary` (`"Implemented comment sheet & verified preview in session worktree."`)
     - `Corrected action` (`"Check the platform before choosing a command."` — no codebase content)
     - `Session rating` (1–5 star buttons)
     - `Optional feedback`
2. **Seven Explanation Turns (`B17_EXPLANATIONS` array, length = 7)**:
   - Define `B17_EXPLANATIONS` as a constant array of the 7 exact lines from `tutorial-script.md`:
     1. `"This is the Session Completion Form. I do most of the work. You check the corrections, give feedback, and hit Submit."`
     2. `"They're quick and easy, and I've already filled in most of it."`
     3. `"If you're on the free plan, session completion forms are required and users on the paid plans are still welcome to contribute."`
     4. `"You can also turn on auto-submit on merge in Settings for future sessions. An auto-submitted form still counts as your completion form."`
     5. `"Either way, the corrected actions are what get sent back to improve iSquared, not your codebase."`
     6. `"Session Completion Forms, donors, and paid users are what keep this experience running."`
     7. `"It's great to contribute to the Infinite Intelligence which drives this experience which was only possible due to the vast open source and free education materials present today."`
3. **Derived Gate (`turnIndex < B17_EXPLANATIONS.length - 1`)**:
   - Derive the final turn index dynamically from `B17_EXPLANATIONS.length - 1` (never hard-code `3`).
   - For turns `0` through `5` (`turnIndex < B17_EXPLANATIONS.length - 1`): show `Continue` to advance `turnIndex`; withhold `Submit`.
   - On turn `6` (`turnIndex === B17_EXPLANATIONS.length - 1`): retire `Continue`; reveal and enable `Submit` (with teal/cyan glow).
   - Clicking `Submit` manually submits the local demo form, marks the demo session complete, retires `session_completion_form`, and advances to `B18`. (Never auto-submit the demo session; no Settings UI added.)
4. **Phase 10 Checkpoint**: Update `AGENT-HANDOFF.md`.

---

### Phase 11: `B18` Widgets & Library, `B19` Return Home, `B20` Tutorials, `B21` Level-Up Animation & Final Release
1. **`B18` — Widgets and Library (Form: `Glyph`)**:
   - **Turn 0**:
     - Line: `"Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want and iSquared supports fullscreen multiple screen layout saves. Try moving the music player."`
     - Reveal: `widget_move_resize` on `LeekBeatsWidget` (drag handle, keyboard-accessible `Move` button, and `Resize +/-` button, highlighted with teal/cyan callout glow) plus the `My Widgets` panel.
     - Gate: User can move/resize the player (preserving new coordinates and audio state) and click `Continue` → Turn 1.
   - **Turn 1**:
     - Line: `"One of my favorites is the Library: screens, flows, components, and packages that fit your project."`
     - Reveal: `library_entry_and_example` (highlights the `Library` entry in `My Widgets` and opens the representative tutorial-owned Library widget with close `X` and `Reopen Library Widget` demonstration).
     - Gate: `Continue` closes only the tutorial-owned Library example widget and advances to `B19`.
2. **`B19` — Away from the desk; older projects (Form: `Surge`)**:
   - **Turn 0**:
     - Line: `"The website lets even your non-technical teammates join in too without downloading the desktop app or codebase. The i² mobile app keeps you connected with notifications, project updates, and chat while you're away."` → `Continue` advances to Turn 1.
   - **Turn 1 (Return Home Gate)**:
     - Line: `"And if your project didn't start in i², I'll walk you through a one-time onboarding. Then we're ready to go. Let's head Home."`
     - Reveal: Enable the `i2` Home button in `HeaderBreadcrumbs` and apply the teal/cyan callout glow to it. No `Continue` button.
     - Gate: Clicking `i2` Home in the header navigates in-place to `I2HomeScreen` (`route = "home"`) and advances to `B20`.
3. **`B20` — Tutorials and level-up (Form: `Compile`, 3 turns in Home Infie chat)**:
   - **Turn 0**:
     - Reveal: `tutorials_entry` (`Tutorials` button in Header, with teal/cyan glow on Turn 0).
     - Line: `"That's about it to get started. Check out the other tutorials. I recommend 'Generate a new project' and 'Widgets, widgets, widgets.' There are tutorials for every aspect of this experience so you can continue to learn as you please or revisit old ones. You can also just ask me a question about how to do something at any time. I'm completely plugged into this IDE to make your life easy so you can concentrate on what you're here for: building cool shit."` → `Continue` advances to Turn 1.
   - **Turn 1**:
     - Line: `"Games unlock at level five, so hop to it. There are computer science and game development tutorials too. There's even a tutorial on how to increase your level, and completing it increases your level. How meta is that?"` → `Continue` advances to Turn 2.
   - **Turn 2**:
     - Line: `"The number of open sessions without submitted Completion Reports will be limited based on your level and plan. I hope this gives you everything you could need but please submit feedback directly to me at any time and I'll make sure it goes to the proper channel and give you a ticket to follow-up."` → `Continue` advances to `B21`.
4. **`B21` — Already Home & Center-Screen Level-Up Animation (Form: `Mist`)**:
   - **Stage at `B21` Entry**:
     - Trigger the dramatic center-screen level-up choreography on the `Level` indicator:
       1. The `Lvl.` pill floats from its top-right Header anchor to the center of the viewport (`50vw, 42vh`), scaling up to occupy ~20% of the screen width (`min-w-[240px]` / `scale ~ 3.2`).
       2. The viewport/pill shakes with increasing intensity and builds a bright teal glow (`#2dd4bf`).
       3. The digit `0` rolls vertically out (`y: -100%`) while `1` rolls in (`y: 100% -> 0%`) rolodex-style, updating `level` from `0` to `1`.
       4. Holds briefly with an Infie teal (`#2dd4bf`) radial glow burst, then smoothly glides and scales back to its top-right Header dock as `Lvl. 1`.
       5. Under `prefers-reduced-motion: reduce`, skip screen shake and use a gentle fade/glow transition from `Lvl. 0` to `Lvl. 1`.
   - **Infie Final Line**:
     - `"Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now."`
   - **Final Gate (`Continue` → `completeOnboarding()`)**:
     - Marks `isTutorialComplete = true`, `currentBeat = "COMPLETE"`, `level = 1`.
     - Purges `tutorialRecords` and resets temporary tutorial teaching visuals while keeping real user state (`userProfile`, `level = 1`, revealed Header & Home controls, `Tutorials` entry, and `LeekBeatsWidget` at its current position and audio playback state).
     - Leaves the user directly on the normal `I2HomeScreen` at `Lvl. 1`.
5. **Phase 11 Checkpoint**: Update `AGENT-HANDOFF.md` with final implementation and verification logs.

---

## 4. Verification & Handoff Ledger Strategy
- After **each** phase (Phases 5, 6, 7, 8, 9, 10, and 11), update `AGENT-HANDOFF.md` at the project root, preserving all prior history entries and updating the phase status table, current tutorial checkpoint, changed files, and exact check commands/results.
- Run `pnpm build` (`vite build --config vite.figma.config.ts`) and automated verification checks where available; record exact results or `NOT RUN` honestly if a live browser preview check is unavailable in the sandbox.
