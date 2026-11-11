# Infie onboarding tutorial — canonical script

This file drives the Figma Make prototype. The spoken lines below are the copy. Stage directions, gates and author notes are not spoken. Latest user direction takes priority over the older tutorial drafts.

## Experience contract

- Start with a completely black viewport for two seconds. No logo, navigation, spinner, captions, hint, button, panel or header appears during that pause.
- Infie arrives, then speaks. Every app element appears only after she introduces it. Introduce meaningful groups together, such as a player's transport controls; do not reveal an entire unintroduced dashboard.
- Use the existing i² Home design and layout. Build the opening on that same persistent app shell. The tutorial gradually reveals it, visits a seeded project/session, and returns to the same Home. No completion page, reload or replacement Home.
- Keep level and the music widget at their actual Home positions from their first appearance. The level is first, at the top right in the header's eventual position. The music widget is next, lower-left by default. Do not reveal an empty header bar or widget frame around them.
- Floating means unboxed. Messages and fields have thin borders and transparent interiors. Buttons have a background and border. No enclosing form card, chat panel, tutorial panel, message list, or outer border/background around a group. Keep text steady. Use negative space instead of adding a backplate.
- Show one current Infie message. It is also her caption; do not duplicate it in a subtitle bar. Keep longer passages in separate turns. Narration is optional; the text always works by itself.
- After identity, Infie introduces a small temporary Continue button. It belongs to the current message and disappears when used. Do not add a standing toolbar, progress tracker or Skip action. Interaction gates require the named action.
- Use natural keyboard focus and button activation. Do not intercept typing, Enter in an email field, or Space on a focused control with a global advance handler. Unrevealed controls cannot receive focus or appear to assistive technology. No first-frame UI flash.
- Respect reduced motion with gentle fades and the same content/order. No microphone permission flow. If audio is unavailable or playback is blocked, continue normally with a paused player and readable dialogue.
- Project/session/form data is local tutorial demo data. Simulate authentication, agent work, PR status and form submission. Do not initiate OAuth, send email, publish feedback or touch real projects.
- Keep real state (profile, level, existing projects, revealed app controls, Home widgets/layout/audio) separate from explicitly tagged tutorial-owned demo records. At final release, remove only the demo records and teaching visuals. Use the existing Home empty state if there are no real projects; never replace Home with a new dashboard.

## Beats

### B00 — Black

**Stage:** Pure black for two seconds. Hide app content before the first paint, not after a loading flash.

**Gate:** Two-second timer.

### B01 — Infie arrives

**Stage:** Teal energy moves into view and resolves into the approved infinity-shaped Infie. The original choreography can briefly write “Infinite Intelligence,” fold it into the i² mark, and absorb it into her arrival. This is animated artwork, not a new UI overlay. Keep it short. A matched lightweight motion proxy is acceptable for this prototype.

**Gate:** Arrival finishes. Reduced motion uses a soft reveal.

### B02 — Hello and identity

**Infie:** “Hi there. I'm Infie. It's nice to meet you. What should I call you?”

**Reveal after the question:** Name, Email, Submit, and Sign in with GitHub. These are independent floating controls with labels. No heading, card or enclosing form outline. Keep the form close to Infie's message without overlapping her.

**Gate:** Submit validates a trimmed name and a plausible email, then stores the profile and advances once. Inline validation belongs beside the relevant field. Sign in with GitHub simulates a returned profile and calls the same successful completion path; typing first is not required. Use a clearly defined mock profile such as Alex / alex@example.com when no valid typed profile exists. The next message uses the resulting name. No additional signup steps.

### B03 — Level

**Infie:** “Nice to meet you, {name}. I can see you're level zero.”

**Reveal on “level zero”:** The actual level indicator, showing 0, at its final top-right Home header anchor. The rest of the header remains absent.

**Infie:** “What a noob. Let's see what we can do about that. Tutorials are one way to level up. You can review any tutorial at a later date, and ask me clarifying questions anytime. But I must get through this tutorial in its entirety before you can freely use this i². Hit Continue when you're ready.”

**Reveal:** A temporary Continue button beside the message. Reuse this pattern for later reading gates.

**Gate:** Continue.

### B04 — What do you want to build?

**Infie:** “I'm going to help you build amazing projects. I hope you're ready. I'll learn a bit about you as we go, to better serve you. Tell me a little about what you like to build and why.”

**Reveal:** One short conversational reply field and Send. Keep this separate from the account form. A reply is welcome; Continue can leave it unanswered.

**Infie:** “I actually don't do much coding myself. I bet you don't either, or we wouldn't be talking. But if you do, that's cool too. i² helps you focus on the big picture, and it's built for getting your hands dirty. Your ideas and abilities are what make you special and awesome. I'm here to amplify that.”

**Gate:** Send or Continue, then Continue on the next turn. Store a submitted reply locally for the prototype.

### B05 — Music

**Infie:** “Btw… it's kinda quiet. Do you like music? Hit Play, or Continue and we'll keep it quiet.”

**Reveal:** Only the music widget's own Play button, already at its final lower-left Home anchor. No separate Yes/Not now choice. Keep Continue available beside the current message.

**Stage:** Infie points to Play; synchronize her playful button-press animation with the user's click. Attempt playback within that click, before any awaited animation. If a local audio source exists and playback succeeds:

**Infie:** “Oh yea, that's my jam. Your music player lives right here.”

**If Continue, no audio file, or playback is blocked:** “Your music player will be right here when you want it.” Leave it paused; do not falsely indicate playback. Play works when a valid local source exists.

**Reveal on “music player”:** The track/playlist label, previous and next appear around that same Play/Pause control. LeekBeats is the displayed playlist. No enclosing dashboard card. This is a default Home widget, not tutorial-only scenery. Reveal the complete paused widget on the Continue path too.

**Gate:** Continue regardless of audio. Keep the same player, audio clock, volume and playback state through the rest of the experience.

### B06 — Working with Infie

**Infie:** “I'm your orchestrator, coordinator, middle-man, question-answerer, and maybe friend. I take the repetitive, mundane, boring stuff out of building. Focus is key. I'll show you what you need when you need it.”

**Gate:** Continue. Add no app UI in this beat.

### B07 — The project folder

**Infie:** “The key to working with i² is the project folder. It's a magical place. It's an extra Git repository beside your worktrees in i2Workspace, where we keep the bigger picture. The whole team can read and edit these files. I'll keep them updated as we go.”

**Reveal:** A small floating illustration of the project folder. It is a temporary explanation, not a new file manager.

**Gate:** Continue.

### B08 — Four files

Introduce each file separately. Add its label to the small illustration only as its line starts. No full document editors, tab bars or technical settings.

**Infie:** “info.md holds the project's name, purpose, and important details. Jenny asks the questions when we start something new. Teammates can even chat with me about it on the i² website.”

**Infie:** “todo.md is what we want to build, change, or fix. Got an idea? Tell me and we'll add it. We'll pull in GitHub issues too. You can add to it yourself.”

**Infie:** “style.md is the colors, typography, and look we're going for. Jenny starts it. The Stylist helps you preview it. Your designer can use it on the website too.”

**Infie:** “guidelines.md tells me and the other agents how to work. It's the most technical one you're meant to edit. There are extra files too, but I'll take care of those, silly human.”

**Gate:** Continue per turn. Retire the illustration after this explanation.

### B09 — Home comes into view

Reveal the existing Home in meaningful groups, keeping the level and music player in place. Map every existing visible Home group to one of these cues before implementation; do not silently expose unrelated controls or invent a new dashboard.

**Infie:** “Before we open a project, we're in i² Home. Your Home controls live up here.”

**Reveal:** Existing Home identity/navigation/header controls in their current positions, around the already-present level indicator.

**Infie:** “Here you can talk with me about whatever you want, or use our conversation in a project.”

**Reveal:** The existing Home conversation entry control. Keep tutorial speech floating; do not add a second tutorial chat pane.

**Infie:** “Start something new with Jenny, or pick up an existing project. I've filled in some dummy data for this tutorial. Let's open one.”

**Reveal:** Existing new-project action and project list/picker, with one clearly named Tutorial demo project. Preserve other real Home content, if present.

**Gate:** Open Tutorial demo. Existing Home controls already introduced stay in their proper layout.

### B10 — Project Home

**Infie:** “This is Project Home. Click the project name to switch projects, or head back to i² Home. You can switch while work carries on, even across windows. Don't overload your brain. That's what I'm here for.”

**Reveal:** Existing project title/switcher and Home navigation, introduced together. The new view occupies the normal project content area; the persistent player and level stay mounted.

**Infie:** “I handle long-term planning, version control, branches and worktrees, and what to do next. Your roadmap and Sessions live here.”

**Reveal:** The demo project's existing roadmap/session groups. Do not add every possible widget.

**Gate:** Continue.

### B11 — Sessions and an agent question

**Infie:** “A Session is a focused piece of work, usually with its own branch and worktree. Big feature, little fix—you get the idea. Sessions come from your todo. You can make one yourself, but I assure you I'll do a better job… just kidding.”

**Reveal:** One seeded Session entry, if its containing list already exists. Add its details only now.

**Infie:** “When an agent has a question, I'll bring it to you here. You can reply without opening the Session. Try it.”

**Reveal:** A floating demo agent question, bordered reply field and Send. No enclosing attention card added for the tutorial. Example: “Ready for you to review the preview. Shall I use the teal accent?”

**Gate:** Send a reply; show a brief acknowledgement.

**Infie:** “Or click the Session name and talk to the agent directly. Let's do that now.”

**Gate:** Open the demo Session. Keep inline reply and opening the Session as distinct actions.

### B12 — Agents and tasks

**Infie:** “Each Session has agents working on it. The model is up to you. Use our ready-made agents, bring your own, or import them. i² gives them a place to work together.”

**Reveal:** Existing Session identity/switcher and compact agent/model control when named; no model catalogue or extra-agent lecture.

**Infie:** “Tasks come in two groups: Agent tasks and Human tasks. You're the human. This one's ready for you to verify.”

**Reveal:** The existing two task groups. Demo Agent tasks are already complete; one Human task asks the user to confirm the preview.

**Gate:** Check the demo Human review task. It must not simulate an automatic real merge.

### B13 — Completion pending

**Infie:** “When the work and checks are ready, I open a pull request. After review and merge, the Session is completion pending. Let's say this one's reviewed and merged. Here's what's left.”

**Reveal:** Seeded review/PR status, then Completion pending. Animate only the demo's status. No network or repository operation.

**Gate:** Continue.

### B14 — Session completion and Infinite Intelligence

**Infie:** “This is the Session Completion Form. I do most of the work. You check the corrections, give feedback, and hit Submit.”

**Reveal:** A short floating form: Infie-prefilled summary, a corrected-action example, a simple rating, optional feedback, and Submit. Fields have borders and transparent interiors; buttons have fill and borders. No outer form card. Example corrected action: “Check the platform before choosing a command.” No codebase content in the example.

**Infie:** “If you're on the free plan, session completion forms are required and users on the paid plans are still welcome to contribute.”

**Infie:** “Either way, the corrected actions are what get sent back to improve iSquared, not your codebase.”

**Infie:** “It's great to contribute to the Infinite Intelligence which drives this experience which was only possible due to the vast open source and free education materials present today.”

**Gate:** Continue between the three short explanation turns; Submit after the final turn. Keep the form visible without revealing new fields. Submission is local demo behavior and marks the demo Session complete. Do not add sharing opt-outs, a consent pitch, account-closure threats or broader data promises.

### B15 — Widgets and Library

**Infie:** “Everything's a widget here. Move it, resize it, close it, bring it back. More screens? Spread out. Try moving the music player.”

**Reveal:** The player's drag/resize affordances now, plus the existing widget controls as they are named. Provide a keyboard-accessible Move option. Let the user try it or Continue. Retain its new position and playback state.

**Infie:** “One of my favorites is the Library: screens, flows, components, and packages that fit your project.”

**Reveal:** The existing Library entry and a small representative Library widget, using the product's own style. Demonstrate close/reopen briefly. Only this tutorial-owned example closes when the beat ends; do not close user widgets.

**Gate:** Continue. Music remains available as the default Home widget.

### B16 — Away from the desk; older projects

**Infie:** “The website lets your teammates join in too. The i² mobile app keeps you connected with notifications, project updates, and chat while you're away.”

**Infie:** “And if your project didn't start in i², I'll walk you through a one-time onboarding. Then we're ready to go. Let's head Home.”

**Reveal:** Use the already-introduced Home navigation as the next target. No install modal, QR code, download claim, extra settings or importer walkthrough.

**Gate:** Return Home with normal in-place navigation. Preserve the existing Home, user content, player and layout. Keep tutorial-owned demo records isolated until final release; do not rebuild Home or clear real state during the outro.

### B17 — Tutorials and level-up

**Infie:** “That's about it to get started. Check out the other tutorials here. I recommend 'Generate a new project' and 'Widgets, widgets, widgets.'”

**Reveal:** The normal Tutorials entry in its final Home position.

**Infie:** “Games unlock at level five, so hop to it. There are computer science and game development tutorials too. There's even a tutorial on how to increase your level, and completing it increases your level. How meta is that?”

**Gate:** Continue.

### B18 — Already Home

**Infie:** “Speaking of… there's your first level. I hope you enjoyed this tutorial, and if you didn't, I don't really care. I got paid either way. Toodles for now.”

**Stage:** On the final acknowledgement, mark onboarding complete and change level 0 to level 1 with a small flourish. This is the prototype's completion reward, not a verified backend leveling rule. Retire the final message and its temporary Continue control. Release the tutorial interaction gate in place. Infie settles into her normal Home presence. The user is already using i² Home; do not navigate to an end screen.

**Final state:** Existing Home design, introduced normal controls, retained profile and Home content, level 1, Tutorials entry, and the default music widget at its current location and playback position. No tutorial demo project/session, ephemeral explanation, final splash, leftover restriction or duplicate player.

## Reveal ledger

Map these groups to the actual current Home/Project/Session components before implementing. A visible group without a matching cue must receive a concise introduction or stay hidden; final release never silently exposes new controls. “Persistent” means retained app state, not visible on every project/session screen.

| Group | First cue / beat | Location and gate | Lifetime |
| --- | --- | --- | --- |
| Infie and current message | B01 arrival / B02 hello | Floating in usable negative space | Infie persists; one message at a time |
| Identity controls | B02 name question | Beside message; Submit or GitHub | Temporary |
| Level | B03 “level zero” | Actual top-right Home header anchor | Persistent |
| Continue | B03 “Hit Continue” | Beside current message | Temporary per turn |
| Project-interest reply | B04 question | Beside message; Send or Continue | Temporary |
| Play → music player | B05 music question → “music player” | Actual lower-left Home widget anchor; Play or Continue | Persistent; user can later move it |
| Folder and four file labels | B07–B08 matching line | Small floating illustration; Continue per turn | Temporary |
| Home header/identity/navigation | B09 “Home controls live up here” | Existing Home positions | Persistent app controls |
| Home conversation entry | B09 “talk with me” | Existing Home position | Persistent app control |
| New project and project picker | B09 “Start something new… existing project” | Existing Home positions | Persistent app controls |
| Tutorial demo project record | B09 “dummy data” | Inside existing picker; open it | Tutorial-owned data |
| Project title/switcher/Home navigation | B10 first line | Existing project positions | Normal project UI |
| Roadmap/Session groups | B10 “roadmap and Sessions” | Existing Project Home content | Normal project UI; demo records |
| Demo Session and inline question | B11 Session/question line | Project Home; reply, then open Session | Tutorial-owned data |
| Session/agent/model controls | B12 first line | Existing Session positions | Normal Session UI |
| Agent/Human task groups | B12 “Tasks come in two groups” | Existing Session content; human review action | Normal UI; demo records |
| PR/review/completion status | B13 PR explanation | Existing status position | Tutorial-owned data |
| Completion form | B14 “Session Completion Form” | Floating controls; Submit after explanation | Temporary demo |
| Widget move/resize controls | B15 “Move it, resize it” | On/near music widget | Normal widget controls |
| Library entry and example | B15 “the Library” | Existing widget entry/location | Entry persists; example temporary |
| Tutorials entry | B17 “other tutorials here” | Actual final Home position | Persistent app control |

## Implementation and asset notes — not spoken

- Use the attached transparent Infie hero and existing idle as identity references. Keep the infinity silhouette, separate expressive eyes, teal/white energy and tapered tail. The arrival/lettering choreography is new work. A simple matched motion proxy is preferable to an unrelated new mascot.
- Existing assets implement Mist and the controller performance. They do not provide the new entrance or finished Compile/Glyph/Surge looks. Do not add a forms/material-state lesson or a controller/voice/keyboard chapter.
- The GLB needs its timing/runtime effects for the full existing transformation. Figma Make need not load Blender or rebuild a technical asset editor.
- Music uses a supplied local sample if available. Do not depend on external streaming or add a music login. The player/audio element and level widget persist across tutorial navigation.
- Keep a reveal ledger with each Home/project/session UI group, its introducing line, and whether it persists or is temporary. Existing navigation and native widget surfaces may appear after introduction; do not invent enclosing tutorial surfaces.
- Questions may pause the current turn through an introduced reply affordance and return to it; keep required gates intact. A small canned prototype response is enough. No unrestricted assistant backend is required.
- The Tutorials entry opens the existing Tutorials list if available; otherwise it is a visual entry for this pass. New replay behavior is out of scope. Clicking it must never reset the user's identity, level, layout or audio.
- Mobile, game unlocks, rewards, and shared-learning behavior here express the user's product vision. The prototype does not verify release availability or implement data handling. Keep this note out of the user's tutorial dialogue.
