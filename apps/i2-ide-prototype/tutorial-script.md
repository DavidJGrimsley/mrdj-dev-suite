# Infie tutorials — canonical script

This file drives the Figma Make prototype. The spoken lines below are the copy. Stage directions, gates and author notes are not spoken. Latest user direction takes priority over the older tutorial drafts. The split into five tutorials follows `generated/infie-tutorial-split-proposal.md`.

## The tutorials

| Tutorial | Starts | What it teaches | Beats |
| --- | --- | --- | --- |
| **Meet Infie** | On first onboarding or from Learn | Infie, how she works, controls, model setup, the header and i² Home. Ends on Home. | B00–B08 (navigation only), B10–B12, B20, B21 |
| **Project & Session Flow** | From Learn or when opening a project or session, except during Generate or Import | The workspace and project files, Project Home, sessions, agents, tasks, review and completion. | B08 (workspace and project folder), B09, B13–B17, B19 |
| **Widgets & Whatnot** | From Learn or when opening the header Widgets button | The widget gallery and how to open, arrange, expand, close and restore widgets. The music player's introduction stays in Meet Infie. | B18 |
| **Generate a new project** | From Learn or the existing Generate button | The existing Jenny/Experimemo experience. | — |
| **Import project** | From Learn or the existing Import path | The existing import experience. | — |

### Learn and automatic starts

- **Learn** in the header opens a modal with a left selector for **Tutorials** and **Education**. Tutorials lists all five entries above; clicking one takes the user to its start. Education opens the existing Prototype Limit component, with a message that computer science, game development and level-increase lessons belong there. The modal has the same fullscreen and close actions as widget modals.
- Project & Session Flow is offered on the first eligible project or session opening, and Widgets & Whatnot on the first eligible header Widgets opening, with a small offer card (Start tour / Not now). Starting or dismissing an offer uses it up; every tutorial can be replayed from Learn.
- Project & Session Flow never starts during Generate or Import, including navigation performed as those tutorials create or open their projects (Generate counts as running while Jenny is open or its Experimemo walkthrough has not reached cleanup). Opening Widgets during another tutorial never interrupts that tutorial or uses up the Widgets & Whatnot offer.
- If a session is opened directly, the offer starts with the session portion (B15 onward); the project/files portion (B08–B14) is offered when the user next visits Project Home and ends once the agent question is answered. Project & Session Flow uses isolated demo data (the Tutorial demo project and its Add Comments session) for the scripted question, task and completion form, then returns to the user's selected Home, project or session.
- Replay preserves the user's profile, level, selected models, projects, session progress, widget layout and music. A Meet Infie replay snapshots the profile, interest reply, level and model choices and restores them when it ends; its music player stays where the user put it and keeps playing. Generate replayed over an existing Experimemo replays Jenny's conversation and then opens the existing Experimemo instead of resetting it. Import replayed after Field Notes is imported replays the import conversation and opens the existing project without re-importing. The first level and the first-run plan choice are awarded only on the first Meet Infie completion.
- Only the first-run Meet Infie has no exit. A replay or any later tutorial shows a small **Exit tutorial** control; leaving keeps real state and releases the demo records in place.

## Experience guidelines

- Start with a completely black viewport for two seconds. No logo, navigation, spinner, captions, hint, button, panel or header appears during that pause.
- Infie arrives, then speaks. Every app element appears only after she introduces it. Introduce meaningful groups together, such as a player's transport controls; do not reveal an entire unintroduced dashboard.
- Use the existing i² Home design and layout. Build the opening on that same persistent app shell. Meet Infie gradually reveals it and finishes in place on i² Home. Project & Session Flow visits a seeded project/session and returns the user to where they were. No completion page, reload or replacement Home.
- Keep level and the music widget at their actual Home positions once introduced and docked (their intro spotlight, below, ends there). The level is first, at the top right in the header's eventual position. The music widget is next, lower-left by default. Do not reveal an empty header bar or widget frame around them.
- Introduced elements (level, music widget, the i² / Project / Session navigation group (B08), and the header groups) first appear spotlighted and slightly larger near Infie's message as she introduces them, hold briefly, then dock at their real position, using the cue and timing given in their own beat or the already-built animation (reduced motion: fade straight to the docked position). The level spotlights, holds and glides to its anchor automatically during its introduction (B03). The music player assembles and then glides to its lower-left anchor after its hold (B05). The i² / Project / Session navigation group is revealed with its message and docks when the user continues, as B08 states. The B11 header groups glide when the user continues, as that beat states. The B12 Home reveals appear in their existing Home positions as Infie cues them and finish animating before the next required interaction. Individual beats do not repeat this rule; keep the already-built intro motions.
- Floating means unboxed. Messages and fields have thin borders and transparent interiors. Buttons have a background and border. No new enclosing tutorial card, form card, tutorial panel, message list, or outer border/background around a group; once docked at Home, Infie's own existing chat is the app's normal chat, not a tutorial panel. Keep text steady. Use negative space instead of adding a backplate. Until Infie's conversation docks at Home (B12), her single current message floats unboxed. From B12 on, ordinary messages go in the existing Infie chat—Home, Project and Session alike. A floating message is allowed only when specifically calling out something far from the chat. When a specific callout points at an element, glow that target teal/cyan; the glow is used the same whether the message is in chat or floating; normal first introductions do not glow. The completion form maintains unboxed floating styling without an outer form card.
- Before Infie's conversation docks (B12), show one current Infie message; it is also her caption; do not duplicate it in a subtitle bar. Keep longer passages in separate turns. Narration is optional; the text always works by itself. After docking, messages continue in the existing Infie chat.
- After identity, Infie introduces a small temporary Continue button. It belongs to the current message and disappears when used. Do not add a standing toolbar or progress tracker. Interaction gates require the named action. The first-run Meet Infie has no Skip; replays and later tutorials have only the small Exit tutorial control described above.
- Use natural keyboard focus and button activation. Do not intercept typing, Enter in an email field, or Space on a focused control with a global advance handler. Unrevealed controls cannot receive focus or appear to assistive technology. No first-frame UI flash.
- Respect reduced motion with gentle fades and the same content/order. Voice is shown with a simulated microphone prompt only; both choices advance and no microphone is ever accessed. If audio is unavailable or playback is blocked, continue normally with a paused player and readable dialogue.
- Project/session/form data is local tutorial demo data. Simulate authentication, model provider sign-ins, agent work, PR status and form submission. Simulated sign-in modals are clearly fake (no real OAuth, no network, no real credentials collected, no password fields that submit anywhere). Do not initiate OAuth, send email, publish feedback or touch real projects.
- Keep real state (profile, level, existing projects, revealed app controls, Home widgets/layout/audio) separate from explicitly tagged tutorial-owned demo records. At final release, remove only the demo records and teaching visuals. Use the existing Home empty state if there are no real projects; never replace Home with a new dashboard.

### Form cycle

Infie's form changes silently (no caption, announcement, or labeling; soft cross-fade at the start of the beat; reduced motion uses a gentle fade) each beat in the repeating cycle Mist → Glyph → Surge → Compile; no two adjacent shown beats within a tutorial share a form. B00 Black has no character. B01 arrives as Mist. B05 uses Glyph (Mist is skipped there because B06 Controls is Mist), B06 Controls enters and exits as Mist (the cycle pauses there), then the cycle resumes with Surge at B07 Working with Infie. Within B08 the form stays Compile across all its turns. There is no forms lesson and no form names are spoken. Stills uploaded to Make: `infie-form-mist.png`, `infie-form-glyph.png`, `infie-form-surge-clean.png`, `infie-form-compile.png` (transparent 2048×2048 RGBA matching Infie's framing; use the swap image with a gentle idle-motion proxy).

| Beat | Heading | Form |
| --- | --- | --- |
| B01 | Infie arrives | Mist |
| B02 | Hello and identity | Glyph |
| B03 | Level | Surge |
| B04 | What do you want to build? | Compile |
| B05 | Music | Glyph |
| B06 | Controls | Mist (cycle paused) |
| B07 | Working with Infie | Surge |
| B08 | Navigation (Meet Infie) / i2 Workspace and project folder (Project & Session Flow) | Compile |
| B09 | Four files | Mist |
| B10 | Models | Glyph |
| B11 | The rest of the header bar | Surge |
| B12 | Home comes into view | Compile |
| B13 | Project Home | Surge |
| B14 | Sessions and an agent question | Glyph |
| B15 | Agents and tasks | Surge |
| B16 | Completion pending | Compile |
| B17 | Session completion and Infinite Intelligence | Mist |
| B18 | Widgets & Whatnot | Glyph |
| B19 | Away from the desk; older projects | Surge |
| B20 | Learn, feedback and level-up | Glyph |
| B21 | Already Home | Mist |

## Meet Infie

### B00 — Black

**Stage:** Pure black for two seconds. Hide app content before the first paint, not after a loading flash.

**Gate:** Two-second timer.

### B01 — Infie arrives

**Stage:** Teal energy moves into view and resolves into the approved infinity-shaped Infie (in Mist form). The original choreography can briefly write “Infinite Intelligence,” fold it into the i² mark, and absorb it into her arrival. This is animated artwork, not a new UI overlay. Keep it short. A matched lightweight motion proxy is acceptable for this prototype.

**Gate:** Arrival finishes. Reduced motion uses a soft reveal.

### B02 — Hello and identity

**Infie:** “Hi there. I'm Infie. What should I call you?”

**Reveal after the question:** Name, Email, Submit, and Sign in with GitHub (placeholders: `First name` and `you@e.mail`). These are independent floating controls with labels. No heading, card or enclosing form outline. Keep the form close to Infie's message without overlapping her.

**Gate:** Submit validates a trimmed name and a plausible email, then stores the profile and advances once. Inline validation belongs beside the relevant field. Sign in with GitHub simulates a returned profile and calls the same successful completion path; typing first is not required. The GitHub profile always uses `Null` as the name and keeps a plausible typed email when provided, or uses `you@e.mail` otherwise. The next message uses the resulting name. No additional signup steps.

### B03 — Level

**Infie:** “Nice to meet you, {name}. I can see you're level zero.”

**Reveal on “level zero”:** The actual level indicator, showing 0, spotlighted near Infie's message and, after a brief hold, automatically glides to its final top-right Home header anchor (shared Experience guidelines rule). The rest of the header remains absent. A temporary Continue button appears beside the message. Reuse this pattern for later reading gates.

**Infie:** “What a noob.”

**Gate:** The level indicator automatically glides to its top-right anchor during the greeting. “What a noob.” is shown alone as its own current message and holds briefly; Continue on it is required before advancing to B04 (no auto-advance, not merged into the greeting). The old 15-minute warning is removed.

### B04 — What do you want to build?

**Infie:** “Tell me a little about what you like to build and why.”

**Reveal:** One short conversational reply field and Send. Keep this separate from the account form. The reply is required and nonempty, followed by Send only.

**Infie:** “I don't do much coding myself. i² helps you focus on the big picture, but I won't hide your files or make them hard to edit by hand. Your ideas and abilities are what make you special and awesome. I'm here to amplify that.”

**Gate:** A nonempty reply and **Send** only; after Send the next message appears with its own Continue. No Skip and no Continue bypass; Send is the only way forward. Store a submitted reply locally for the prototype. Make already has this gate wired; preserve it.

### B05 — Music

**Infie:** “Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet.”

**Reveal:** Only the music widget's own Play button, starting to the left of Continue. No separate Yes/Not now choice. Keep Continue available beside the current message.

**Stage:** Infie points to Play; synchronize her playful button-press animation with the user's click. Attempt playback within that click, before any awaited animation. If a local audio source exists and playback succeeds:

**Infie:** “Oh yea, that's my jam. Your music player can live here for now. You can also connect a music streaming service later in settings.”

**If Continue, no audio file, or playback is blocked:** “Your music player will be right here when you want it and comes preloaded with some smooth Lo-fi but you can connect a music streaming service later.” Leave it paused; do not falsely indicate playback. Play works when a valid local source exists.

**Reveal on “music player”:** The track/playlist label, previous and next appear around that same Play/Pause control. LeekBeats is the displayed playlist. No enclosing dashboard card. This is a default Home widget, not tutorial-only scenery. Reveal the complete paused widget on the Continue path too (the assembled widget glides automatically to its lower-left Home position after its hold, per the shared Experience guidelines rule).

**Change to the UI:** As soon as the assembled player begins moving to its Home position, it has a normal bounded Music widget frame and header, with its usual actions and song picker. The frame remains visible during the move and afterward. The same player and audio state continue throughout the app. (Owned by the music-player work; see the implementation notes.)

**Gate:** Continue regardless of audio. Keep the same player, audio clock, volume and playback state through the rest of the experience. A Meet Infie replay leaves the player in place and playing.

**Replay with music already playing:** B05 follows the real audio rather than assuming silence. While the music is playing, Infie does not point at Play (the control shows Pause) and says:

**Infie:** “Btw… you've already got music going. Nice. Continue when you're ready, or hit Pause if you'd rather keep it quiet.”

Continue then leads to the “that's my jam” line and the music keeps playing. Pressing Pause does not advance: the line returns to the “kinda quiet” line above, and Continue then leads to the quiet line with the music left paused. Play (from paused) advances to the “that's my jam” line, as on a first run.

### B06 — Controls

*Note on controls and voice:* Keyboard, mouse, gamepad, joystick, number pad, and voice describe the product vision; the prototype shows illustrations and one continuous controls video only. Voice is shown with a simulated microphone prompt only; both choices advance and no microphone is ever accessed. Infie enters and exits this beat in Mist form; the form cycle is paused here and resumes afterward. There is no forms lesson.

**Infie:** “I'm all ears if you want to speak conversationally. The built-in music will automatically turn down while either of us is talking, but you can configure push-to-talk later in settings.”

**Reveal:** A simulated microphone permission prompt (a small unboxed prompt with two choices: “Allow microphone” and “Not now”).

**Gate:** Simulated microphone choice: either “Allow microphone” or “Not now” advances to the next line. It is simulation only: the prototype never calls `getUserMedia` or any microphone/permission API and never accesses a microphone.

**Stage — one continuous transparent chain:** A single muted video, `infie-controls-chain-alpha.webm` (VP9 with true alpha, 1080×1080, 30 fps, 16.000 s, no audio), plays once at Infie's position with no black box, card, panel or backplate; the stage background shows through it. When the video starts, Infie grows to 2x while the three messages appear and the chat animates sliding down to make room, then returns to normal size as the video ends. It replaces the live Infie while it plays: Infie (Mist) transforms into the keyboard and mouse, then into the gamepad, then into the upright joystick and separate number pad, and the final devices hold until the video ends. There is no Mist between devices and the video is not restarted between messages. Video time: 0–1 s Mist, 1–4 s Infie → keyboard and mouse, 4–6 s hold, 6–9 s → gamepad, 9–11 s hold, 11–14 s → joystick and number pad, 14–16 s hold.

**Message cues (tied to video time, not wall-clock timers; each message appears when the video's current time reaches its cue and none is a Continue gate):**

| Video time | Message shown |
|---|---|
| 0 s (video start) | Keyboard and mouse |
| 6 s | Gamepad |
| 11 s | Joystick and programmable keypad |
| 16 s (video ends) | Closing message, with all three illustrations |

**Infie (at 0 s):** “You can control this IDE in a number of ways. Of course you can use the keyboard and mouse.”

**Infie (at 6 s):** “Or pick up a gamepad if that's more your groove.”

**Infie (at 11 s):** “Prefer a joystick and programmable keypad? You can do that too.”

**Gate:** None between these three messages: each follows the video's clock. The messages stack as the existing rolling message stack does.

**Infie (when the video ends):** “Since navigating the UI and executing common actions are mapped to a controller, you can set up any kind of custom scenario you want in settings later. Some games may require a specific input device.”

**Stage:** The video fades out as it ends and the live Infie returns. All three transparent floating illustrations (`infie-controls-keyboard-mouse.png`, `infie-controls-gamepad.png`, `infie-controls-joystick-numpad.png`) appear together beside Infie (no card, panel, border, or backplate), then retire when Continue is pressed.

**Gate:** Continue.

**Stage notes:**
- Persistent elements (level indicator at top right and music widget at its Home position) remain steady and visible.
- Audio: The video has no sound; leave the music widget playing or paused exactly as it was.
- Transformation staging: While the chain plays it replaces the live Infie at her position; the live Infie returns when it ends and the illustrations float beside her. The video fades in and out with a slight overlap so there is no visible seam. It is composited by the browser from its own alpha channel (no keying).
- Reduced motion: Do not play the video. Show gentle fades of the three still PNGs, one beside Infie per message, with the exact same spoken lines and presentation order; each still stays up for a reading dwell (at least 2.6 s) before the next message, then the closing message and all three illustrations follow as above.
- Failure fallback: If the video errors, does not start within 3 s, stalls for 4 s while the tab is visible, or the browser cannot decode VP9, use the reduced-motion still presentation for the rest of the beat (the video is not retried or restarted). If it fails midway, the still for the message currently showing takes over and the remaining messages follow after their reading dwell.
- Scope: Keyboard, mouse, gamepad, joystick, number pad, and voice describe the product vision; the prototype presents illustrations and the one controls video only. Voice is shown with a simulated microphone prompt only; both choices advance and no microphone is accessed.

### B07 — Working with Infie

**Infie:** “I'm your orchestrator, coordinator, question-answerer, and maybe friend. I take the boring stuff out of building and show you what you need when you need it.”

**Infie:** “I help manage your tasks and projects, even after weeks away. I know version control like Git, Perforce and Diversion, but you don't need it to use i². Think of me as your partner-in-crime, your right hand.”

**Reveal:** The existing hotkey guide, showing Alt-click, Shift-click and Ctrl-click.

**Infie:** “You can ask me for help with any part of the IDE just by holding the hotkeys and clicking it. Even individual words or phrases in Session Agent chats! I'll explain things in a way that makes sense to you.”

**Stage note:** The spoken line stays as written. A short card centered in the empty area to the right of the chat lists the combinations: Alt+click asks a question (voice or text, then a follow-up); Shift+click reports a problem (confirm or ask, then a todo or an in-branch fix); Ctrl+click opens links, go-to-symbol, and import, or a quick summary. The card footer reads “Alt = question · Shift = problem.” This is a margin card only. Do not add a new help backend.

**Gate:** Continue per turn.

### B08 — Navigation

**Reveal:** The `i² / Project / Session` navigation group appears together near Infie (existing spotlight motion) and docks in the header on Continue.

**Infie:** “Here's how navigation works: i² takes you Home, Project shows your current project, and a Session is a space for a feature, fix, or experiment. If you use Git, I'll manage separate worktrees. If not, no problem! You can start Sessions just by talking to me.”

**Gate:** Continue docks the navigation group. The detailed workspace tree and `project/` folder lesson are in Project & Session Flow.

### B10 — Models

**Stage:** Let the user configure the models they will use for their Session Agents.

**Infie:** “I am run by an open-weight LLM plus a decision model, like Jev, on iSquared's server which is included in your plan. I also have a set of deterministic actions to control the UI and state of projects when appropriate, so that I stay consistent. If you want to give me an upgrade with a local or frontier model, you can do so later in settings, so long as the model meets the minimum requirements I need.”

**Reveal:** An array of faux sign-in buttons to sign in with: Claude, ChatGPT, Grok, Gemini, Cline, plus a simulated local-model choice (“Use local models”). Each opens a simulated sign-in modal (clearly fake: no real OAuth, no network, no real credentials collected, no password fields that submit anywhere; completing it marks that provider “connected” in demo state).

**Infie:** “You can use any combination of models for your Session Agents, those are the ones to whom I pass off your requests to get the coding work done. I manage them as a team but more on that later. For now just configure your choices and you can always adjust later in settings.”

**Gate:** At least one completed choice is required before Continue is enabled; the user may complete more. Never initiate real OAuth or collect real credentials.

**After the first completed choice:** The instruction line above is replaced in place by the developer environment message while the provider choices stay visible and Continue becomes enabled. This is copy only; no environment updates actually run.

**Infie:** “Checking your developer environment... Node.js and Python could use updates. I can update them and all your agent skills now, and keep them updated nightly if you'd like.”

**Gate:** Continue retires the provider choices and advances to B11. The Preference Sliders explanation and Speed slider preview are in Widgets & Whatnot.

### B11 — Header: Learn, Widgets and Games; notifications and settings

**Reveal:** Learn, Widgets and Games appear as a group near Infie and dock in their header positions on Continue.

**Infie:** “Click Learn for tutorials and lessons, and Widgets to customize your workspace. Games unlock at level five, take your level into account and pause when I need you to review something. They're a fun way to wait for Session Agents. You can submit a tutorial, widget or game to the Infinite Intelligence too!”

**Reveal:** The notification bell and Settings appear together and dock in the header on Continue.

**Infie:** “Your alerts, notifications and settings live here. I'll also help you manage the Global To-Do list.”

**Gate:** Continue per turn; each Continue sends the header group just introduced to its docked position (it spotlights and holds first, per the shared Experience guidelines rule).

### B12 — i² Home

**Reveal:** Infie's conversation slides into its normal Home chat position. The Workspace/Emulators controls appear in the header. From here on, ordinary messages appear in the docked Infie chat; floating messages are reserved for specific callouts far from the chat. Do not silently expose unrelated controls or invent a new dashboard.

**Infie:** “Let me scoot over and make some room.”

**Infie:** “This is i² Home. The Workspace and Emulators controls switch between your work and your previews.”

**Reveal:** The Active Projects area. These cards are not clickable during Meet Infie.

**Infie:** “You can resume projects that are already onboarded to iSquared.”

**Reveal:** Generate a new project and Import project.

**Infie:** “You can also start new projects or onboard existing ones to iSquared.”

**Infie:** “Here you can talk with me about whatever you want, or use our conversation in a project. I can also help you manage our Global To-Do list: it includes open project tasks and reminders like ‘Update SSL certificates on MyWebsite.com.’”

**Reveal:** The action buttons in Infie's chat (greyed out and inert during the tutorial).

**Infie:** “I'll present Action Buttons specific to the next steps of your projects to save you time typing.”

**Gate:** Continue per turn. Meet Infie does not ask the user to open a demo project.

### B20 — Learn, feedback and level-up

**Infie:** “Learn has the other tutorials whenever you're ready. You can also give me feedback, and I'll send it to the right place and give you a ticket to follow up. Now go build cool shit.”

**Reveal:** Learn glows in the header while this line is up.

**Gate:** Continue.

### B21 — Already Home

**Stage:** Level-up animation: Lvl. indicator floats from its place to the middle of the screen while growing to take up around 20% of the screen. Then the view shakes and glows increasingly, 0 rolls to 1 rolodex-style, glows Infie teal for a moment, then everything returns to normal and the level indicator returns to its docked destination.

**Infie:** “Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now.”

**Stage:** On the final acknowledgement, mark Meet Infie complete in place on i² Home (the level already changed from 0 to 1 during the level-up animation above). This is the prototype's completion reward, not a verified backend leveling rule. Retire the final message and its temporary Continue control. Release the tutorial interaction gate in place. Infie settles into her normal Home presence. Do not navigate to an end screen. Award the first level and show the existing plan choice only on the first completion; a replay restores the user's real level, profile and model choices instead.

**Final state:** Existing Home design, introduced normal controls, retained profile and Home content, level 1, Learn entry, and the default music widget at its current location and playback position. No demo project/session, ephemeral explanation, final splash, leftover restriction or duplicate player.

## Project & Session Flow

Runs on the Tutorial demo project and its Add Comments session, then returns the user to where they were. The full tour runs B08 → B09 → B13 → B14 → B15 → B16 → B17 → B19; the session portion alone starts at B15. The workspace and project-folder lesson (B08, B09) plays over a scrim on the live shell, in the same unboxed center-stage style as Meet Infie; from B13 on, messages are in the docked Infie chat.

### B08 — i2 Workspace and project folder

**Turn 1 — workspace tree:**
**Infie:** “Here you'll work in an i² Workspace. It keeps your project, Sessions, and supporting files organized, transparent, and light on disk. Whether you use version control or not, I've got you covered.”

**Reveal:** An animated, indented, VERTICAL folder tree built from native elements (no raster art, no file-explorer UI, no card/panel), modeled on a real workspace folder listing but renamed:

```text
pet-show-and-tell-i2Workspace/
├── generated/
├── project/                              ← green
├── temp/
├── pet-show-and-tell/                     (main worktree)
├── pet-show-and-tell-add-comments/        (session worktree)
└── pet-show-and-tell-fix-reactions/       (session worktree)
```

Render folder icons, indentation and subtle tree connectors. The annotations are explanatory labels, not parts of the folder names. `project/` is green and is a sibling of the worktrees, never a child of one.

Exactly these six children; no environment-file folder. The tree animates in and holds.

**Gate:** Continue.

**Gate:** Continue fades the entire workspace tree. (The navigation group was introduced in Meet Infie.)

**Turn 2 — the project folder:**
**Stage:** After the tree has faded, show ONLY the green `project/` folder (alone — no i2Workspace root and no main/worktree chips or labels).

**Infie:** “The key to working with i² is the project folder. It's a magical place! It holds the bigger picture: what we're building, our plans, design choices, and guidelines. These files help every Session Agent understand the whole application, not just their current task.”

**Gate:** Continue.

**Turn 3 — canonical files:**
**Infie:** “It's my job to keep these canonical files updated, in sync, and free of contradictions. They keep the Session Agents on track and everyone working toward the same vision. The project folder is separate from your Sessions, so nothing gets lost in the shuffle.”

**Stage:** The same green `project/` folder remains visible alone.

**Gate:** Continue.

**Turn 4 — i² Core & i² Sync:**
**Infie:** “Behind the scenes, i² Core helps me coordinate our tasks, Sessions, and Session Agents. And with optional i² Sync, your team can contribute through the website, even without Git or the IDE. Your project stays yours, and you're in control of what gets shared!”

**Stage:** The same green `project/` folder remains visible alone.

**Implementation note (not spoken):** Stale horizontal chips and the old short message “It's also how the UI is structured here.” are replaced by this beat; there is no other i2Workspace/main/project chip row anywhere.

**Gate:** Continue. (Gate summary: order is workspace tree → Continue fades tree → green project/ folder → B09 file tour.)

### B09 — Four files

Introduce each file separately. The four file labels (info.md, todo.md, style.md, guidelines.md) appear as an indented vertical list under the green `project/` folder only as each line starts (no i2Workspace root, no main chip, no horizontal chips). No full document editors, tab bars or technical settings.

**Infie:** “info.md holds the project's name, purpose, and important details. An agent asks the questions when we start something new or you can start with a basic rundown of the idea or fill out the template. Teammates can even chat with me about it on the i² website. This is used by me to keep the Session Agents in check to make sure your vision is always in mind.”

**Infie:** “todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself. When anyone edits project Info, I add project Todo items so the app reflects the changes in the grand design. You can view this and keep me in check.”

**Reveal:** A static preview of the Stylist centered in the empty area to the right of the chat, outside the scrolling message stack.

**Infie:** “style.md is the colors, typography, and look we're going for and The Stylist is an interactive theme setter that helps you preview it. Your designer can use it on the website too.”

**Stage:** Fade/retire the static preview of the Stylist before guidelines.md.

**Infie:** “guidelines.md tells me, you, your teammates, and the Session Agents how to work. It's the most technical one you're meant to edit. There are extra agent handoff files there too, but I'll take care of those, silly human.”

**Gate:** Continue per turn. Retire the green `project/` folder and its file list after this explanation; Project Home (B13) follows.

### B13 — Project Home

**Infie:** “This is Project Home. Click the project name to switch projects, or head back to i² Home. Right-click a project in that dropdown to open it in a new window, so different projects can live on different screens. You can switch while work carries on. Don't overload your brain. That's what I'm here for.”

**Reveal:** Existing project title/switcher and Home navigation, introduced together. The new view occupies the normal project content area; the persistent player and level stay mounted.

**Infie:** “I can work with multiple projects at once. If a feature in Project A needs a new feature in Project B, and you want both in play, I'll create a worktree for each, a master plan, a plan for each project, and a special session that shows up in both. The agent team and I can use that session to find errors before you test.”

**Gate:** Continue.

**Infie:** “I help handle long-term planning, version control, branches and worktrees, and what to do next. I also help with research to make sure you are getting the most up to date and in-depth plan when you need it. Your roadmap and Sessions live here.”

**Reveal:** The demo project's existing roadmap/session groups. Do not add every possible widget.

**Gate:** Continue.

### B14 — Sessions and an agent question

**Infie:** “A Session is a focused piece of work, usually with its own branch and worktree. Big feature, little fix—you get the idea. Sessions come from your todo. You can make one yourself, but I assure you I'll do a better job… just kidding.”

**Reveal:** One seeded Session entry, if its containing list already exists. Add its details only now.

**Infie:** “When a Session Agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it.”

**Reveal:** The demo agent question arrives as an ordinary message in the Infie chat with its bordered reply field and Send (unless calling out something far from the chat). No enclosing attention card added for the tutorial. Example: “Ready for you to review the preview. Shall I use the teal accent?”

**Gate:** Send a reply; show a brief acknowledgement.

**Infie:** “Or click the Session name and talk to the Session Agent directly. Let's do that now.”

**Gate:** Open the demo Session. Keep inline reply and opening the Session as distinct actions. When only the project/files portion runs (its session portion already ran), the tutorial ends a moment after the reply, before this line.

### B15 — Agents and tasks

**Infie:** “Each Session has Session Agents working on it. The model is up to you. Use our ready-made agents, bring your own, or import them. i² gives them a place to work together.”

**Reveal:** Existing Session identity/switcher and compact agent/model control when named; no model catalogue or extra-agent lecture.

**Infie:** “Me, the Session Agents, and any other agents you bring in all work through the iSquared MCP and tools. They're there to prevent dangerous mistakes in your codebase, steer around common pitfalls, and put best practices into practice.”

**Infie:** “Simulators are built in, too. Session Agents use them to check their own work, and you can use them to see it for yourself.”

**Stage note:** These two turns add explanation only (Continue per turn). No MCP settings, tool list or simulator is opened during this beat.

**Infie:** “Tasks come in two groups: Session Agent tasks and Human tasks. You're the human. This one's ready for you to verify. Click on all open tasks to mark them complete.”

**Reveal:** The existing two task groups. Demo Session Agent tasks are already complete; the open Human tasks are ready for the user to verify.

**Gate:** Check all open demo Human review tasks. It must not simulate an automatic real merge.

### B16 — Completion pending

**Infie:** “When the work and checks are ready, I open a pull request. After review and merge, the Session is completion pending. Let's say this one's reviewed and merged. Here's what's left.”

**Reveal:** Seeded review/PR status, then Completion pending. Animate only the demo's status. No network or repository operation.

**Gate:** Continue.

### B17 — Session completion and Infinite Intelligence

**Infie:** “Here's the Session Completion Form. I've filled in most of it; check the corrections, add feedback, and hit Submit. Free-plan users need to submit one; paid users are welcome to contribute too. You can turn on auto-submit on merge in Settings, and that still counts.”

**Reveal:** A short floating form: Infie-prefilled summary, a corrected-action example, a simple rating, optional feedback, and Submit. Fields have borders and transparent interiors; buttons have fill and borders. No outer form card. Example corrected action: “Check the platform before choosing a command.” No codebase content in the example.

**Infie:** “These forms boost your level while you work. The corrected actions are sent back to improve iSquared—not your codebase—so we can avoid the same mistakes. The number of open Sessions without submitted forms depends on your level and plan.”

**Infie:** “We're also exploring quantum machine learning alongside the regular analysis. It's research; nothing you build depends on it. Completion forms, donors and paid users help keep i² running, and my creator is grateful to the open-source and free-education communities that made it possible.”

**Gate:** Continue between every explanation turn but the last (two Continues for the three turns above); Submit appears and enables only after the final explanation turn. Implementations must derive the number of turns from the explanation list, not hard-coded constants. Keep the form visible throughout without revealing new fields. Auto-submit-on-merge is mentioned only: no settings walkthrough, no new toggle, and no UI is added in the tutorial. The tutorial demonstrates manual Submit and must not bypass Submit or auto-submit this demo session on its already-completed (demo) merge; auto-submit satisfies required completion forms for future sessions only. Submission is local demo behavior and marks the demo Session complete. Do not add sharing opt-outs, a consent pitch, account-closure threats or broader data promises.

**Infie:** “Submitted. Next I close the session: its branches are merged and cleaned up, both locally and on the remote, barring your approval.”

**Gate:** Continue (to B19). The simulated submission does not send real data.

### B19 — Away from the desk; older projects

**Infie:** “The website lets even your non-technical teammates join in too without downloading the desktop app or codebase. The i² mobile app keeps you connected with notifications, project updates, and chat while you're away. You can also get into your i² project environments through the mobile apps, the website, and apps in your VR headset for a truly immersive experience.”

**Gate:** Continue.

**Infie:** “If your project didn't start in i², I'll onboard it for you. I'll offer a tutorial when you do something new here.”

**Reveal:** No install modal, QR code, download claim, extra settings or importer walkthrough.

**Gate:** Continue finishes Project & Session Flow in the session view: the demo records are released and the user returns to their selected Home, project or session. Preserve the existing Home, user content, player and layout.

## Widgets & Whatnot

A floating Infie callout (small Infie and her current message, lifted off the bottom edge) over the live screen. The screens beneath keep the user's real projects, sessions and layout; nothing asks the user to move their music player.

### B18 — Widgets, Preference Sliders and Library

**Infie:** “Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want, and iSquared supports fullscreen multiple-screen layout saves. Let's try it with a widget.”

**Reveal:** A small sample layout above the message in which a sample Explorer widget moves from the right column to the bottom panel and back (reduced motion: both placements side by side). The user's own widgets and music player do not move.

**Gate:** Continue.

**Infie:** “You can drag panel edges to resize them or collapse a panel completely. Double-click my chat header or tab bar anytime to collapse all panels and focus on our conversation, then double-click again to bring them back.”

**Gate:** Continue.

**Reveal:** A small preview with only slider names and tracks: Guidance, Sassiness, Verbosity, Technical Level, Speed, Effort. These are shared by every model and conversation.

**Infie:** “Preference Sliders apply to all models in all conversations. Find them in Widgets any time. How fast would you like the text? Try the Speed slider—even while I'm talking.”

**Gate:** Speed changes apply immediately, including to the current line. Continue. Keep this preview compact. Reduced motion still shows text immediately.

**Infie:** “Click Widgets in the header to see everything else you can add to your workspace.”

**Reveal:** Highlight `Widgets` in the header. No Continue button; clicking `Widgets` opens the Widgets gallery and advances to the Library callout. Skipped when the tour started from the Widgets button and the gallery is already open.

**Infie:** “One of my favorites is the Library: screens, flows, components, and packages that fit your project.”

**Reveal:** The existing Library entry highlighted in the open Widgets gallery, with the callout below the gallery. Show a single Continue control.

**Gate:** Continue ends the tutorial. A gallery the tour opened closes; a gallery the user opened stays open.

## Implementation and asset notes — not spoken

- Use the attached transparent Infie hero and existing idle as identity references. Keep the infinity silhouette, separate expressive eyes, teal/white energy and tapered tail. The arrival/lettering choreography is new work. A simple matched motion proxy is preferable to an unrelated new mascot.
- The four form stills (`infie-form-mist.png`, `infie-form-glyph.png`, `infie-form-surge-clean.png`, `infie-form-compile.png`) exist now as transparent 2048×2048 RGBA images matching Infie's framing. Use the swap image with a gentle idle-motion proxy. The full 3D assets stay outside Make. Do not add a forms lesson or speak form names.
- The GLB needs its timing/runtime effects for the full existing transformation. Figma Make need not load Blender or rebuild a technical asset editor.
- Music uses a supplied local sample if available. Do not depend on external streaming or add a music login. The player/audio element and level widget persist across tutorial navigation.
- Questions may pause the current turn through an introduced reply affordance and return to it; keep required gates intact. A small canned prototype response is enough. No unrestricted assistant backend is required.
- The Learn entry opens the Learn modal. Starting or replaying a tutorial from it must never reset the user's identity, level, layout or audio (see Learn and automatic starts).
- Music integration contract (music-player work, `LeekBeatsWidget.tsx`): the shell keeps passing `playButtonRevealed`, `fullPlayerRevealed`, `docked` (undefined during the first-run B05 hold, then true), `animateIntro` (true only for the first-run Meet Infie) and `placement`. The bounded Music widget frame, header, actions and song picker must be present from the moment the assembled player starts its move to Home (when `fullPlayerRevealed` is true and docking begins) and stay afterwards. During a Meet Infie replay the shell keeps all three music groups revealed and `docked` true from the start, so the player must not reset its position, user-moved state or audio.
- The quantum line describes exploratory research (see the deferred "Quantum Upgrade" roadmap section and the quantum hardware strategy note); it must stay worded as exploration, never as a shipped or performance feature. The MCP/tools, simulator, and VR/mobile/website lines likewise express product direction.
- Mobile, game unlocks, rewards, and shared-learning behavior here express the user's product vision. The prototype does not verify release availability or implement data handling. Keep this note out of the user's tutorial dialogue.
