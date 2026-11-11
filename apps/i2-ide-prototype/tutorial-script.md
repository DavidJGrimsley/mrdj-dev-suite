# Infie onboarding tutorial — canonical script

This file drives the Figma Make prototype. The spoken lines below are the copy. Stage directions, gates and author notes are not spoken. Latest user direction takes priority over the older tutorial drafts.

## Experience guidelines

- Start with a completely black viewport for two seconds. No logo, navigation, spinner, captions, hint, button, panel or header appears during that pause.
- Infie arrives, then speaks. Every app element appears only after she introduces it. Introduce meaningful groups together, such as a player's transport controls; do not reveal an entire unintroduced dashboard.
- Use the existing i² Home design and layout. Build the opening on that same persistent app shell. The tutorial gradually reveals it, visits a seeded project/session, and returns to the same Home. No completion page, reload or replacement Home.
- Keep level and the music widget at their actual Home positions once introduced and docked (their intro spotlight, below, ends there). The level is first, at the top right in the header's eventual position. The music widget is next, lower-left by default. Do not reveal an empty header bar or widget frame around them.
- Introduced elements (level, music widget, the i² / Project / Session navigation group (B08), and the header groups) first appear spotlighted and slightly larger near Infie's message as she introduces them, hold briefly, then dock at their real position, using the cue and timing given in their own beat or the already-built animation (reduced motion: fade straight to the docked position). The level spotlights, holds and glides to its anchor automatically during its introduction (B03). The music player assembles and then glides to its lower-left anchor after its hold (B05). The i² / Project / Session navigation group is revealed with its message and docks when the user continues, as B08 states. The B11 header groups glide when the user continues, as that beat states. The B12 Home reveals appear in their existing Home positions as Infie cues them and finish animating before the next required interaction. Individual beats do not repeat this rule; keep the already-built intro motions.
- Floating means unboxed. Messages and fields have thin borders and transparent interiors. Buttons have a background and border. No new enclosing tutorial card, form card, tutorial panel, message list, or outer border/background around a group; once docked at Home, Infie's own existing chat is the app's normal chat, not a tutorial panel. Keep text steady. Use negative space instead of adding a backplate. Until Infie's conversation docks at Home (B12), her single current message floats unboxed. From B12 on, ordinary messages go in the existing Infie chat—Home, Project and Session alike. A floating message is allowed only when specifically calling out something far from the chat. When a specific callout points at an element, glow that target teal/cyan; the glow is used the same whether the message is in chat or floating; normal first introductions do not glow. The completion form maintains unboxed floating styling without an outer form card.
- Before Infie's conversation docks (B12), show one current Infie message; it is also her caption; do not duplicate it in a subtitle bar. Keep longer passages in separate turns. Narration is optional; the text always works by itself. After docking, messages continue in the existing Infie chat.
- After identity, Infie introduces a small temporary Continue button. It belongs to the current message and disappears when used. Do not add a standing toolbar, progress tracker or Skip action. Interaction gates require the named action.
- Use natural keyboard focus and button activation. Do not intercept typing, Enter in an email field, or Space on a focused control with a global advance handler. Unrevealed controls cannot receive focus or appear to assistive technology. No first-frame UI flash.
- Respect reduced motion with gentle fades and the same content/order. Voice is shown with a simulated microphone prompt only; both choices advance and no microphone is ever accessed. If audio is unavailable or playback is blocked, continue normally with a paused player and readable dialogue.
- Project/session/form data is local tutorial demo data. Simulate authentication, model provider sign-ins, agent work, PR status and form submission. Simulated sign-in modals are clearly fake (no real OAuth, no network, no real credentials collected, no password fields that submit anywhere). Do not initiate OAuth, send email, publish feedback or touch real projects.
- Keep real state (profile, level, existing projects, revealed app controls, Home widgets/layout/audio) separate from explicitly tagged tutorial-owned demo records. At final release, remove only the demo records and teaching visuals. Use the existing Home empty state if there are no real projects; never replace Home with a new dashboard.

### Form cycle

Infie's form changes silently (no caption, announcement, or labeling; soft cross-fade at the start of the beat; reduced motion uses a gentle fade) each beat in the repeating cycle Mist → Glyph → Surge → Compile; no two adjacent shown beats share a form. B00 Black has no character. B01 arrives as Mist. B05 uses Glyph (Mist is skipped there because B06 Controls is Mist), B06 Controls enters and exits as Mist (the cycle pauses there), then the cycle resumes with Surge at B07 Working with Infie. Within B08 the form stays Compile across all its turns. There is no forms lesson and no form names are spoken. Stills uploaded to Make: `infie-form-mist.png`, `infie-form-glyph.png`, `infie-form-surge-clean.png`, `infie-form-compile.png` (transparent 2048×2048 RGBA matching Infie's framing; use the swap image with a gentle idle-motion proxy).

| Beat | Heading | Form |
| --- | --- | --- |
| B01 | Infie arrives | Mist |
| B02 | Hello and identity | Glyph |
| B03 | Level | Surge |
| B04 | What do you want to build? | Compile |
| B05 | Music | Glyph |
| B06 | Controls | Mist (cycle paused) |
| B07 | Working with Infie | Surge |
| B08 | i2 Workspace and project folder | Compile |
| B09 | Four files | Mist |
| B10 | Models | Glyph |
| B11 | The rest of the header bar | Surge |
| B12 | Home comes into view | Compile |
| B13 | Project Home | Mist |
| B14 | Sessions and an agent question | Glyph |
| B15 | Agents and tasks | Surge |
| B16 | Completion pending | Compile |
| B17 | Session completion and Infinite Intelligence | Mist |
| B18 | Widgets and Library | Glyph |
| B19 | Away from the desk; older projects | Surge |
| B20 | Tutorials and level-up | Compile |
| B21 | Already Home | Mist |

## Beats

### B00 — Black

**Stage:** Pure black for two seconds. Hide app content before the first paint, not after a loading flash.

**Gate:** Two-second timer.

### B01 — Infie arrives

**Stage:** Teal energy moves into view and resolves into the approved infinity-shaped Infie (in Mist form). The original choreography can briefly write “Infinite Intelligence,” fold it into the i² mark, and absorb it into her arrival. This is animated artwork, not a new UI overlay. Keep it short. A matched lightweight motion proxy is acceptable for this prototype.

**Gate:** Arrival finishes. Reduced motion uses a soft reveal.

### B02 — Hello and identity

**Infie:** “Hi there. I'm Infie. It's nice to meet you. What should I call you?”

**Reveal after the question:** Name, Email, Submit, and Sign in with GitHub. These are independent floating controls with labels. No heading, card or enclosing form outline. Keep the form close to Infie's message without overlapping her.

**Gate:** Submit validates a trimmed name and a plausible email, then stores the profile and advances once. Inline validation belongs beside the relevant field. Sign in with GitHub simulates a returned profile and calls the same successful completion path; typing first is not required. Use a clearly defined mock profile such as Alex / alex@example.com when no valid typed profile exists. The next message uses the resulting name. No additional signup steps.

### B03 — Level

**Infie:** “Nice to meet you, {name}. I can see you're level zero.”

**Reveal on “level zero”:** The actual level indicator, showing 0, spotlighted near Infie's message and, after a brief hold, automatically glides to its final top-right Home header anchor (shared Experience guidelines rule). The rest of the header remains absent.

**Infie:** “What a noob. Let's see what we can do about that. Tutorials are one way to level up. You can review any tutorial at a later date, and ask me clarifying questions anytime. But I must get through this tutorial in its entirety before you can freely use this i². Hit Continue when you're ready.”

**Reveal:** A temporary Continue button beside the message. Reuse this pattern for later reading gates.

**Gate:** The level indicator automatically glides to its top-right anchor during the greeting. The second message (“What a noob. …”) is shown alone as its own current message; Continue on that second message is required before advancing to B04 (no timer, no auto-advance, not merged into the greeting).

### B04 — What do you want to build?

**Infie:** “I'm going to help you build amazing projects. I hope you're ready. I'll learn a bit about you as we go, to better serve you. Tell me a little about what you like to build and why.”

**Reveal:** One short conversational reply field and Send. Keep this separate from the account form. The reply is required and nonempty, followed by Send only.

**Infie:** “I actually don't do much coding myself. I bet you don't either, or we wouldn't be talking. But if you do, that's cool too. i² helps you focus on the big picture, and it's built for getting your hands dirty. Your ideas and abilities are what make you special and awesome. I'm here to amplify that.”

**Gate:** A nonempty reply and **Send** only; after Send the next message appears with its own Continue. No Skip and no Continue bypass; Send is the only way forward. Store a submitted reply locally for the prototype. Make already has this gate wired; preserve it.

### B05 — Music

**Infie:** “Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet.”

**Reveal:** Only the music widget's own Play button. No separate Yes/Not now choice. Keep Continue available beside the current message.

**Stage:** Infie points to Play; synchronize her playful button-press animation with the user's click. Attempt playback within that click, before any awaited animation. If a local audio source exists and playback succeeds:

**Infie:** “Oh yea, that's my jam. Your music player can live here for now.”

**If Continue, no audio file, or playback is blocked:** “Your music player will be right here when you want it.” Leave it paused; do not falsely indicate playback. Play works when a valid local source exists.

**Reveal on “music player”:** The track/playlist label, previous and next appear around that same Play/Pause control. LeekBeats is the displayed playlist. No enclosing dashboard card. This is a default Home widget, not tutorial-only scenery. Reveal the complete paused widget on the Continue path too (the assembled widget glides automatically to its lower-left Home position after its hold, per the shared Experience guidelines rule).

**Gate:** Continue regardless of audio. Keep the same player, audio clock, volume and playback state through the rest of the experience.

### B06 — Controls

*Note on controls and voice:* Keyboard, mouse, gamepad, joystick, number pad, and voice describe the product vision; the prototype shows illustrations and one continuous controls video only. Voice is shown with a simulated microphone prompt only; both choices advance and no microphone is ever accessed. Infie enters and exits this beat in Mist form; the form cycle is paused here and resumes afterward. There is no forms lesson.

**Infie:** “I'm all ears if you want to speak conversationally.”

**Reveal:** A simulated microphone permission prompt (a small unboxed prompt with two choices: “Allow microphone” and “Not now”).

**Gate:** Simulated microphone choice: either “Allow microphone” or “Not now” advances to the next line. It is simulation only: the prototype never calls `getUserMedia` or any microphone/permission API and never accesses a microphone.

**Stage — one continuous transparent chain:** A single muted video, `infie-controls-chain-alpha.webm` (VP9 with true alpha, 1080×1080, 30 fps, 16.000 s, no audio), plays once at Infie's position with no black box, card, panel or backplate; the stage background shows through it. It replaces the live Infie while it plays: Infie (Mist) transforms into the keyboard and mouse, then into the gamepad, then into the upright joystick and separate number pad, and the final devices hold until the video ends. There is no Mist between devices and the video is not restarted between messages. Video time: 0–1 s Mist, 1–4 s Infie → keyboard and mouse, 4–6 s hold, 6–9 s → gamepad, 9–11 s hold, 11–14 s → joystick and number pad, 14–16 s hold.

**Message cues (tied to video time, not wall-clock timers; each message appears when the video's current time reaches its cue and none is a Continue gate):**

| Video time | Message shown |
|---|---|
| 0 s (video start) | Keyboard and mouse |
| 6 s | Gamepad |
| 11 s | Joystick and programmable keypad |
| 16 s (video ends) | Closing message, with all three illustrations |

**Infie (at 0 s):** “You can control this IDE in a number of ways. Of course you can use the keyboard and mouse.”

**Infie (at 6 s):** “Or pick up a gamepad if that's more your groove.”

**Infie (at 11 s):** “Prefer an upright desktop joystick and programmable keypad? You can do that too.”

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

**Infie:** “I'm your orchestrator, coordinator, middle-man, question-answerer, and maybe friend. I take the repetitive, mundane, boring stuff out of building. Focus is key. I'll show you what you need when you need it.”

**Infie:** “I'm an expert at revision control such as Git, Perforce, Diversion and more. I'm also packed with skills that help me be a great agent team lead. Most importantly, I help you keep track of tasks and projects in a way that makes it easy to jump back in after weeks away or manage multiple large projects at once. Think of me as your double, your partner-in-crime, your right-hand.”

**Infie:** “You can ask me for help with any aspect of the IDE just by holding hot keys and clicking on it. You can even do this for single words or phrases in agent chats to get an explanation catered to you.”

**Stage note:** This turn adds the explanation only. Do not invent a specific key combination or add a new help interface during this beat.

**Gate:** Continue per turn.

### B08 — i2 Workspace and project folder

**Turn 1 — workspace tree:**
**Infie:** “Here you will work in an i2 Workspace. It has your project in it and is made to keep things neat, transparent, and keep disk usage low.”

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

**Turn 2 — UI navigation:**
**Infie:** “It's also how the UI navigation is structured. Project changes to the name of your current project. A Session is another copy of your project (worktree if Git) that is focused on a feature, bug fix, experimentation, etc. You can start sessions by talking to me but we'll get there. First...”

**Reveal (simultaneously with this message, tree stays visible):** The `i2 / Project / Session` navigation group (existing spotlight-then-dock motion).

**Gate:** Continue docks the navigation group to its header position and fades the entire workspace tree.

**Turn 3 — the project folder:**
**Stage:** After the tree has faded, show ONLY the green `project/` folder (alone — no i2Workspace root and no main/worktree chips or labels).

**Infie:** “The key to working with i² is the project folder. It's a magical place. It's an extra Git repository beside your worktrees in i2Workspace, where we keep the bigger picture. The whole team can read and edit these files. I'll keep them updated as we go.”

**Gate:** Continue.

**Turn 4 — separate repo:**
**Infie:** “This is a separate repo so we can edit it independently of the many worktrees I will manage for you, including cleaning them up as to not waste your disk space. This repo is also where agent coordination is tracked amongst your own sessions and other team members.”

**Stage:** The same green `project/` folder remains visible alone.

**Implementation note (not spoken):** Stale horizontal chips and the old short message “It's also how the UI is structured here.” are replaced by this beat; there is no other i2Workspace/main/project chip row anywhere.

**Gate:** Continue. (Gate summary: order is workspace tree → navigation group → Continue docks nav + fades tree → green project/ folder → B09 file tour. Preserve the existing automatic level/music timing and the explicit header Continue timing in B11.)

### B09 — Four files

Introduce each file separately. The four file labels (info.md, todo.md, style.md, guidelines.md) appear as an indented vertical list under the green `project/` folder only as each line starts (no i2Workspace root, no main chip, no horizontal chips). No full document editors, tab bars or technical settings.

**Infie:** “info.md holds the project's name, purpose, and important details. An agent asks the questions when we start something new or you can start with a basic rundown of the idea or fill out the template. Teammates can even chat with me about it on the i² website.”

**Infie:** “todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself.”

**Reveal:** A static preview of the Stylist to the right of the messages.

**Infie:** “style.md is the colors, typography, and look we're going for and The Stylist is an interactive theme setter that helps you preview it. Your designer can use it on the website too.”

**Stage:** Fade/retire the static preview of the Stylist before guidelines.md.

**Infie:** “guidelines.md tells me and the other agents how to work. It's the most technical one you're meant to edit. There are extra files too, but I'll take care of those, silly human.”

**Gate:** Continue per turn. Retire the green `project/` folder and its file list after this explanation.

### B10 — Models

**Stage:** Let the user configure the models they will use for their Session Agents.

**Infie:** “I am run by an open-weight model on iSquared's server which is included in your plan. If you want to give me an upgrade with a local or frontier model, you can do so later in settings, so long as the model meets the minimum requirements I need.”

**Reveal:** An array of faux sign-in buttons to sign in with: Claude, ChatGPT, Grok, Gemini, Cline, plus a simulated local-model choice (“Use local models”). Each opens a simulated sign-in modal (clearly fake: no real OAuth, no network, no real credentials collected, no password fields that submit anywhere; completing it marks that provider “connected” in demo state).

**Infie:** “You can use any combination of models for your Session Agents, those are the ones to whom I pass off your requests to get the coding work done. I manage them as a team but more on that later. For now just configure your choices and you can always adjust later in settings.”

**Gate:** At least one completed choice is required before Continue is enabled; the user may complete more. Never initiate real OAuth or collect real credentials.

### B11 — The rest of the header bar

**Reveal:** The `Tutorials, Widgets, Games` part of the header (remove “coming soon” from Games if it's still present).

**Infie:** “Whenever you want to visit more tutorials you can click this in the header. Your music player is a widget and there are tons more for you to customize your experience. Games take your iSquared level into account when playing and pause automatically when I have something for you to review. It's a great way to spend time while waiting for agents. You are welcome to submit a tutorial, widget or game to the Infinite Intelligence and there will be tutorials on how to do just that!”

**Reveal:** The `Notification/Settings` part of the header.

**Infie:** “A combined list of alerts for your review and other notifications live here as well as settings.”

**Gate:** Continue per turn; each Continue sends the header group just introduced to its docked position (it spotlights and holds first, per the shared Experience guidelines rule).

### B12 — Home comes into view

**Stage:** The Infie conversation from the tutorial slides animated to the left to land at its destination for the Home screen chat. From here on, ordinary messages appear in the docked Infie chat; floating messages are reserved for specific callouts far from the chat. Don't add the extra action buttons present on the Home screen yet. Do not silently expose unrelated controls or invent a new dashboard.

**Reveal:** Resume projects section. These buttons should not be clickable yet.

**Infie:** “You can resume projects that are already onboarded to iSquared.”

**Reveal:** Generate new project button and import new.

**Infie:** “You can also start new projects or onboard existing ones to iSquared.”

**Infie:** “We're now in i² Home.”

**Infie:** “Here you can talk with me about whatever you want, or use our conversation in a project. You can do a lot from here and then get deeper as needed. I can also help you manage our global todo list which includes your projects that have open todo items or random todo things you want to track like 'Update SSL certificates on MyWebsite.com'”

**Reveal:** Action buttons associated with dummy data.

**Infie:** “I'll present Action Buttons specific to the next steps of your projects to save you time typing.”

**Infie:** “I've filled in some dummy data for this tutorial. Let's open one.”

**Reveal:** Exactly two project choices: “Pet Show and Tell” and “Not Hotdog”, carrying the callout glow (teal/cyan) per the callout rule. No Continue button. The user must select one of the two existing projects. Safe tutorial-owned demo state (Session/tasks/question/review records) is isolated to these seeded projects.

**Gate:** Open Project (user selects either “Pet Show and Tell” or “Not Hotdog”). Existing Home controls already introduced stay in their proper layout.

### B13 — Project Home

**Infie:** “This is Project Home. Click the project name to switch projects, or head back to i² Home. You can switch while work carries on, even across windows. Don't overload your brain. That's what I'm here for.”

**Reveal:** Existing project title/switcher and Home navigation, introduced together. The new view occupies the normal project content area; the persistent player and level stay mounted.

**Infie:** “I handle long-term planning, version control, branches and worktrees, and what to do next. Your roadmap and Sessions live here.”

**Reveal:** The demo project's existing roadmap/session groups. Do not add every possible widget.

**Gate:** Continue.

### B14 — Sessions and an agent question

**Infie:** “A Session is a focused piece of work, usually with its own branch and worktree. Big feature, little fix—you get the idea. Sessions come from your todo. You can make one yourself, but I assure you I'll do a better job… just kidding.”

**Reveal:** One seeded Session entry, if its containing list already exists. Add its details only now.

**Infie:** “When an agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it.”

**Reveal:** The demo agent question arrives as an ordinary message in the Infie chat with its bordered reply field and Send (unless calling out something far from the chat). No enclosing attention card added for the tutorial. Example: “Ready for you to review the preview. Shall I use the teal accent?”

**Gate:** Send a reply; show a brief acknowledgement.

**Infie:** “Or click the Session name and talk to the agent directly. Let's do that now.”

**Gate:** Open the demo Session. Keep inline reply and opening the Session as distinct actions.

### B15 — Agents and tasks

**Infie:** “Each Session has agents working on it. The model is up to you. Use our ready-made agents, bring your own, or import them. i² gives them a place to work together.”

**Reveal:** Existing Session identity/switcher and compact agent/model control when named; no model catalogue or extra-agent lecture.

**Infie:** “Tasks come in two groups: Agent tasks and Human tasks. You're the human. This one's ready for you to verify.”

**Reveal:** The existing two task groups. Demo Agent tasks are already complete; one Human task asks the user to confirm the preview.

**Gate:** Check the demo Human review task. It must not simulate an automatic real merge.

### B16 — Completion pending

**Infie:** “When the work and checks are ready, I open a pull request. After review and merge, the Session is completion pending. Let's say this one's reviewed and merged. Here's what's left.”

**Reveal:** Seeded review/PR status, then Completion pending. Animate only the demo's status. No network or repository operation.

**Gate:** Continue.

### B17 — Session completion and Infinite Intelligence

**Infie:** “This is the Session Completion Form. I do most of the work. You check the corrections, give feedback, and hit Submit.”

**Reveal:** A short floating form: Infie-prefilled summary, a corrected-action example, a simple rating, optional feedback, and Submit. Fields have borders and transparent interiors; buttons have fill and borders. No outer form card. Example corrected action: “Check the platform before choosing a command.” No codebase content in the example.

**Infie:** “They're quick and easy, and I've already filled in most of it.”

**Infie:** “If you're on the free plan, session completion forms are required and users on the paid plans are still welcome to contribute.”

**Infie:** “You can also turn on auto-submit on merge in Settings for future sessions. An auto-submitted form still counts as your completion form.”

**Infie:** “Either way, the corrected actions are what get sent back to improve iSquared, not your codebase.”

**Infie:** “Session Completion Forms, donors, and paid users are what keep this experience running.”

**Infie:** “It's great to contribute to the Infinite Intelligence which drives this experience which was only possible due to the vast open source and free education materials present today.”

**Gate:** Continue between turns 1–6 (six Continues); Submit appears and enables only after the final explanation turn (turn 7). Implementations must derive the number of turns from the explanation list, not hard-coded constants. Keep the form visible throughout without revealing new fields. Auto-submit-on-merge is mentioned only: no settings walkthrough, no new toggle, and no UI is added in the tutorial. The tutorial demonstrates manual Submit and must not bypass Submit or auto-submit this demo session on its already-completed (demo) merge; auto-submit satisfies required completion forms for future sessions only. Submission is local demo behavior and marks the demo Session complete. Do not add sharing opt-outs, a consent pitch, account-closure threats or broader data promises.

### B18 — Widgets and Library

**Infie:** “Everything's a widget here. Move it, resize it, close it, bring it back. More screens or a VR headset? Spread out. You can have as many windows as you want and iSquared supports fullscreen multiple screen layout saves. Try moving the music player.”

**Reveal:** The player's drag/resize affordances now, plus the existing widget controls as they are named. Provide a keyboard-accessible Move option. Let the user try it or Continue. Retain its new position and playback state.

**Infie:** “One of my favorites is the Library: screens, flows, components, and packages that fit your project.”

**Reveal:** The existing Library entry and a small representative Library widget, using the product's own style. Demonstrate close/reopen briefly. Only this tutorial-owned example closes when the beat ends; do not close user widgets.

**Gate:** Continue. Music remains available as the default Home widget.

### B19 — Away from the desk; older projects

**Infie:** “The website lets even your non-technical teammates join in too without downloading the desktop app or codebase. The i² mobile app keeps you connected with notifications, project updates, and chat while you're away.”

**Infie:** “And if your project didn't start in i², I'll walk you through a one-time onboarding. Then we're ready to go. Let's head Home.”

**Reveal:** Use the already-introduced Home navigation as the next target. No install modal, QR code, download claim, extra settings or importer walkthrough.

**Gate:** Return Home with normal in-place navigation. Preserve the existing Home, user content, player and layout. Keep tutorial-owned demo records isolated until final release; do not rebuild Home or clear real state during the outro.

### B20 — Tutorials and level-up

**Infie:** “That's about it to get started. Check out the other tutorials. I recommend 'Generate a new project' and 'Widgets, widgets, widgets.' There are tutorials for every aspect of this experience so you can continue to learn as you please or revisit old ones. You can also just ask me a question about how to do something at any time. I'm completely plugged into this IDE to make your life easy so you can concentrate on what you're here for: building cool shit.”

**Infie:** “Games unlock at level five, so hop to it. There are computer science and game development tutorials too. There's even a tutorial on how to increase your level, and completing it increases your level. How meta is that?”

**Infie:** “The number of open sessions without submitted Completion Reports will be limited based on your level and plan. I hope this gives you everything you could need but please submit feedback directly to me at any time and I'll make sure it goes to the proper channel and give you a ticket to follow-up.”

**Gate:** Continue.

### B21 — Already Home

**Stage:** Level-up animation: Lvl. indicator floats from its place to the middle of the screen while growing to take up around 20% of the screen. Then the view shakes and glows increasingly, 0 rolls to 1 rolodex-style, glows Infie teal for a moment, then everything returns to normal and the level indicator returns to its docked destination.

**Infie:** “Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now.”

**Stage:** On the final acknowledgement, mark onboarding complete (the level already changed from 0 to 1 during the level-up animation above). This is the prototype's completion reward, not a verified backend leveling rule. Retire the final message and its temporary Continue control. Release the tutorial interaction gate in place. Infie settles into her normal Home presence. The user is already using i² Home; do not navigate to an end screen.

**Final state:** Existing Home design, introduced normal controls, retained profile and Home content, level 1, Tutorials entry, and the default music widget at its current location and playback position. No demo project/session, ephemeral explanation, final splash, leftover restriction or duplicate player.

## Implementation and asset notes — not spoken

- Use the attached transparent Infie hero and existing idle as identity references. Keep the infinity silhouette, separate expressive eyes, teal/white energy and tapered tail. The arrival/lettering choreography is new work. A simple matched motion proxy is preferable to an unrelated new mascot.
- The four form stills (`infie-form-mist.png`, `infie-form-glyph.png`, `infie-form-surge-clean.png`, `infie-form-compile.png`) exist now as transparent 2048×2048 RGBA images matching Infie's framing. Use the swap image with a gentle idle-motion proxy. The full 3D assets stay outside Make. Do not add a forms lesson or speak form names.
- The GLB needs its timing/runtime effects for the full existing transformation. Figma Make need not load Blender or rebuild a technical asset editor.
- Music uses a supplied local sample if available. Do not depend on external streaming or add a music login. The player/audio element and level widget persist across tutorial navigation.
- Questions may pause the current turn through an introduced reply affordance and return to it; keep required gates intact. A small canned prototype response is enough. No unrestricted assistant backend is required.
- The Tutorials entry opens the existing Tutorials list if available; otherwise it is a visual entry for this pass. New replay behavior is out of scope. Clicking it must never reset the user's identity, level, layout or audio.
- Mobile, game unlocks, rewards, and shared-learning behavior here express the user's product vision. The prototype does not verify release availability or implement data handling. Keep this note out of the user's tutorial dialogue.
