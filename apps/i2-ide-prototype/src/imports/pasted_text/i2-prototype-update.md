I want you to UPDATE and EXPAND this existing i2 IDE prototype. Do not throw away the existing design and start over unless something fundamentally conflicts with the product model below. Preserve the strongest existing visual ideas, especially the multi-surface / dual-screen feel, but reorganize the information architecture and interactions to match this product vision.

PRODUCT NAME

Product name: i2
Meaning: Infinite Intelligence
Use `i2` exactly in visible labels and copy. Do not render `i²` or `iSquared`
as the primary product name.

This product evolved from MDS / MrDJ's Dev Suite, but i2 is now the product direction. Do not design this as “MDS plus an IDE.” Design i2 as the IDE/platform itself.

IMPORTANT PRODUCT DEFINITION

i2 is NOT just an AI code editor with a chatbot sidebar.

i2 is a project-agnostic development operating system that coordinates:

- the human developer
- Infie, the main AI coordinator
- Session Agents
- worker/subagents
- local and cloud AI models
- branches and Git worktrees
- tasks
- pull requests and review status
- builds, tests, dev servers and running apps
- project state
- shared Infinite Intelligence knowledge

It must be designed to work with ANY software project, not just Expo, React Native, MDS, or one framework.

The production desktop direction is a Code-OSS fork backed by a separate i2
Core service. This Figma work is a browser prototype of that experience; do not
frame the product as a standalone VS Code extension or as an unresolved
Electron-versus-editor decision.

The UI should make software development feel coordinated and understandable rather than like a collection of terminals, branches, AI chats, ports and browser windows the developer has to mentally track.

CORE UX PRINCIPLE

STATE IS MORE IMPORTANT THAN CHAT.

The user should rarely need to scroll through old AI conversations to figure out what is happening.

The UI should prominently show:

- what is happening now
- what Sessions exist
- what agents are working
- what needs the human developer
- what Tasks are done / active / blocked
- what tests or checks passed/failed
- what PRs are open
- what the next useful action is

Infie conversations can be lightweight and transient. Unimportant spoken/chat messages may visually fade away. Important decisions, Tasks, blockers and state changes should become durable UI elements instead of remaining buried in conversation history.

==================================================
PRIMARY NAVIGATION HIERARCHY
==================================================

There are THREE major levels of i2:

1. i2 HOME
2. PROJECT HOME
3. SESSION

These must feel visually and conceptually distinct.

==================================================
1. i2 HOME
==================================================

This is the state when no project is currently focused.

Purpose:
Manage the developer’s overall i2 environment and choose a project.

Possible content:

- i2 logo / branding
- Infie
- recent projects
- pinned projects
- open project button
- create/import project
- global “Needs You” notifications if appropriate
- model/provider settings
- connected services
- tutorials
- account/profile
- global settings
- Games tab
- feature status indicators

The developer should be able to click a project and enter Project Home.

The currently selected project name should remain easy to access in the IDE chrome. Clicking it should allow switching projects or returning to i2 Home.

Show an open-Session capacity indicator such as `3 of N sessions active`.
The exact limit is configurable product policy, not a hard-coded design rule.

==================================================
2. PROJECT HOME
==================================================

THIS IS ONE OF THE MOST IMPORTANT SCREENS.

Project Home is where the developer and Infie coordinate the ENTIRE PROJECT.

A developer who does not care about manually looking at code or talking directly with individual coding agents should theoretically be able to spend almost 100% of their time here.

Project Home should NOT feel like a conventional code editor.

It should feel like a development command center.

Show high-level project state using clean widgets/cards/panels.

Important Project Home widgets:

PROJECT HEADER
- Project name
- repository / workspace
- current health
- number of active Sessions
- project status
- quick project switcher

INFIE
- Infie is visually present
- small conversational surface
- proactive status summaries
- context-aware suggested actions
- buttons should often be more important than long text responses

SESSIONS
Show all Sessions as a prominent list / board / cards.

Example Session card:

Payments Webhook
RUNNING

Branch:
feat/payments-webhook

Session Agent:
Claude Sonnet

Progress:
6 / 9 Tasks

Status:
Waiting on test / Coding / Reviewing / Blocked / PR Open

Quick actions:
[Open Session]
[View Tasks]
[View PR]

Session state should be obvious through visual status chips.

NEEDS YOU

This should be a FIRST-CLASS widget.

It collects all UserDev attention requests across all Sessions.

Example:

NEEDS YOU — 3

Auth Session
Test Google login on Android
[Open Test]

Payments Session
Stripe signing secret required
[Add Secret]

Settings Session
Agent has a design question
[Answer]

The human should not have to monitor five agent chat windows.

USERDEV TASKS

Master task list for things the HUMAN must do.

Allow:
- All
- Active
- Session filter
- Done

AGENT TASKS

Master task list for AI work across the project.

Allow:
- All
- Active
- Blocked
- Done
- Session filter

PULL REQUESTS / REVIEWS

Show:
- PR number/title
- Session
- checks
- reviewer status
- merge readiness

Example:

PR #87 — Payments webhook

✓ Build
✓ Typecheck
✕ Copilot Review: 2 issues
● Session Agent fixing review comments

The UI should make it clear that Infie coordinates review failures back to the Session Agent.

PROJECT TODO

A visible representation of the human-owned project todo.

The user may turn one or more todo items into Sessions.

Do not make the project todo look like hidden AI state. It is human-readable project intent.

RECENT EVENTS / ACTIVITY

Optional compact timeline:

- Session created
- tests passed
- agent requested help
- PR opened
- review failed
- PR merged

Do NOT make this a noisy endless AI transcript.

==================================================
3. SESSION VIEW
==================================================

A Session means:

ONE branch
+
ONE Git worktree
+
ONE focused development effort
+
ONE Session Agent
+
Tasks
+
eventually ONE PR lifecycle

Opening a Session should feel like entering that branch’s own development universe.

The user should never need to mentally remember:

“Which terminal belongs to which branch?”

“Which browser is running which worktree?”

“Which agent was working on this?”

i2 should know.

SESSION HEADER

Show:

- Session name
- status
- branch
- worktree
- Session Agent
- selected model
- progress
- PR status if present

Example:

Add Payments Webhook
RUNNING

feat/payments-webhook

Agent: Claude Sonnet
6 / 9 Tasks

SESSION NAVIGATION / TABS

Include focused tools such as:

[Overview]
[Tasks]
[Agent]
[Files]
[Terminal]
[App]
[Diff]
[Tests]
[PR]
[Events]

These can be tabs, panes, docked surfaces, or a flexible multi-pane system.

The IDE should support multiple screens / monitors and flexible layouts.

The user may keep:
- code on one monitor
- app/emulator on another
- Session Agent / Tasks elsewhere

Do not assume everything must fit into one narrow VS Code-style window.

SESSION TASKS

Only show Tasks belonging to the current Session.

Separate:

AGENT TASKS
and
USERDEV TASKS

Example:

AGENT
✓ Inspect current auth flow
✓ Add persistence adapter
● Add regression tests
○ Run full validation

YOU
! Test login on Android
○ Confirm logout behavior

SESSION AGENT

The Session Agent owns implementation inside this Session.

The UI should make the relationship clear:

Infie = project coordinator

Session Agent = owner of implementation for this branch

Session Agent can:
- write code
- run commands
- run tests
- ask questions
- start servers
- use subagents
- fix review failures

Infie should generally NOT jump in and start rewriting Session code herself.

==================================================
PLAN → ACT → VERIFY
==================================================

Represent the idea that agent work has three important phases:

PLAN
Understand / design / investigate

ACT
Implement / modify / execute

VERIFY
Independently prove the result

This does NOT necessarily need to be a giant wizard.

It can appear through:

- status chips
- progress indicators
- model selectors
- agent details

Example:

PLAN
Claude Sonnet

ACT
Qwen Coder — Local

VERIFY
Tests + Reviewer

Allow different AI models for different roles/phases.

==================================================
MODELS
==================================================

i2 supports BOTH:

LOCAL MODELS
and
CLOUD / FRONTIER MODELS

Examples:

Qwen — Ollama — Local
GPT-OSS — Ollama — Local
Claude
Gemini
OpenAI
other providers

Show model/provider information clearly but do not overwhelm beginners.

Potential UI:

Model
Qwen 3.5 9B
Local • Ollama • $0 API cost

Or:

Model
Claude Sonnet
Cloud • Frontier

The system can eventually automatically select the cheapest capable model.

Allow advanced users to inspect or override model choices.

==================================================
AGENT TEAM
==================================================

The i2 Agent Team can include:

INFIE
Project-level coordinator

SESSION AGENT
Owns a Session

SCOUT / SUBAGENTS
Short-lived agents doing focused research

VERIFIER / REVIEWER
Independent validation

SPECIALISTS
Examples:
Expo
Security
Database
Frontend
etc.

Do NOT make this look like random AI characters floating everywhere.

The developer needs a clear hierarchy.

A useful mental model:

Infie
    ↓
Sessions
    ↓
Session Agent
    ↓
Workers / Scouts

==================================================
PR / REVIEW FLOW
==================================================

Important behavior:

Session Agent reports implementation complete.

Infie verifies Session state.

Human testing happens if required.

Infie opens the PR.

GitHub checks / reviewers run.

Currently GitHub Copilot may automatically review PRs.

If review comments or checks fail:

Infie should NOT personally fix the code.

Infie tells the Session Agent:

“PR review found two issues. Fix them.”

The Session returns to active work.

Show this visually.

Possible Session state:

REVIEW FIXES REQUIRED

Copilot Review
2 unresolved comments

[Open Review]
[View Agent Progress]

==================================================
SESSION COMPLETION
==================================================

A Session is NOT considered completely finished immediately when the PR merges.

Flow:

PR MERGED
↓
SESSION COMPLETION FORM
↓
COMPLETE

The Completion Form is fundamental to Infinite Intelligence.

It should be pre-filled.

Show:

- Session
- PR
- problem solved
- environment/framework versions
- Tasks completed
- tests
- what worked
- what failed
- relevant learning

The developer verifies the information.

==================================================
INFINITE INTELLIGENCE / CONTRIBUTION
==================================================

There is ONE GLOBAL i2 knowledge system.

DO NOT create separate “knowledge bases” for every project.

Projects have:

- context
- repo files
- project todo
- guidelines
- state
- Sessions

But i2 Knowledge is global.

Approved learning from many developers contributes to Infinite Intelligence.

FREE / COOPERATIVE USERS

The structured completion form is required. Show the sanitized contribution
payload, then require one final explicit approval before contributing it. Never
contribute in the background or from raw repository/conversation data.

PAID / PRIVATE USERS

May choose to keep Session learning private.

Completion UI should be very transparent.

Example:

SESSION COMPLETE

Infie learned:

✓ Expo SDK version
✓ Problem category
✓ Failed approaches
✓ Successful solution
✓ Test results

Will not be shared:

✓ API keys
✓ secrets
✓ unrelated private data

[Preview Contribution]

Free user:
[Review Contribution]
[Contribute & Complete]

Paid private user additionally gets:
[Keep Private & Complete]

==================================================
PROJECT CONTEXT
==================================================

Do not call project-specific information its own “Infinite Intelligence knowledge.”

Project-specific context may include:

guidelines.md
project todo
framework information
versions
decisions
repo state

This helps Infie understand the project.

The shared knowledge system is i2-wide.

==================================================
PROCESS / SERVER MANAGEMENT
==================================================

i2 should automatically understand which processes belong to which Session.

The user should not have to manage ports manually.

Example internally:

Session A
Web: 8081
API: 3000

Session B
Web: 8084
API: 3001

The UI should instead use human-friendly concepts.

Example:

Payments Session

Web App
RUNNING
[Open App]
[Restart]
[Logs]

API
RUNNING
[Logs]

Potentially use stable friendly local addresses such as:

payments.session.localhost

instead of showing raw ports prominently.

Raw port information can exist in advanced/details UI.

==================================================
OBSERVATION / ISSUE CAPTURE
==================================================

Add a future interaction concept:

While viewing an app, emulator, or built-in browser, the developer can Ctrl+click an area and ask Infie about it.

Infie appears and asks:

“What’s wrong with this spot?”

The developer can:

- type
- speak
- click additional elements
- demonstrate a broken flow

i2 can capture contextual evidence and either:

- add a Task to the current Session
- create a new project todo
- fix something if it is clearly within current Session scope

Represent this concept visually somewhere in the prototype.

==================================================
INFIE
==================================================

Infie should feel like a CHARACTER and a PRODUCT INTERFACE.

Traits:

- cute
- slightly sassy
- helpful
- informative
- playful
- confident without being annoying

Visual inspiration:
A small magical / digital creature with a cute default form.

Infie can eventually:

- move around the UI
- point toward important areas
- animate when an agent needs help
- shapeshift for functions or jokes
- notify the developer
- appear on top of other applications

Do not literally copy Mew or any copyrighted Pokémon design.

Create an ORIGINAL mascot with a similarly small, expressive, magical-tech companion feeling.

Infie should not permanently occupy a huge chat panel.

Her conversational UI can be compact.

When something important happens, she may surface:

“Payments is ready for you to test.”

[Open Test]

or:

“Your agent needs the Stripe signing secret.”

[Add Secret]

The ideal Infie experience is often:
ONE useful sentence
+
ONE obvious action

==================================================
INFIE MODES
==================================================

Include mode selection.

ASSISTANT
Infie acts when asked.

GUIDED
Infie watches the project and recommends actions. It asks before applying a
plan, merging, publishing, or sharing learning data. Once deterministic task
and validation gates pass, Infie opens the pull request automatically; creating
a PR is not a separate approval gate.

COMPLETE
Infie actively orchestrates the experience. It still respects approval
boundaries for merges, publishing, and learning sharing.

Complete Mode may initially be:

COMING SOON

Show feature maturity badges.

==================================================
FEATURE MATURITY SYSTEM
==================================================

Support statuses such as:

COMING SOON
ALPHA
BETA
STABLE

Use them tastefully.

Examples:

Complete Mode
COMING SOON

Games
COMING SOON

Experimental Agent Teams
ALPHA

==================================================
GAMES
==================================================

Add a Games tab to the navigation.

Initially:

COMING SOON

Do not design the entire game system yet.

Show enough structure that it is obviously a planned major feature.

Future concept:

Developers can play small games while builds/tests are running.

Infie can pause or interrupt the game when developer attention is needed.

==================================================
TUTORIALS
==================================================

Include Tutorials as an important product area.

Categories:

ONBOARDING
Interactive mandatory first-use experience.

i2 TUTORIALS
Teach i2 features.

EDUCATIONAL TUTORIALS
Teach programming/development concepts using interactive projects, code, emulators and Infie.

Infie should guide tutorial experiences visually.

==================================================
MULTI-MONITOR / MULTI-SURFACE DESIGN
==================================================

This is important.

Do not design i2 like everything must live inside one narrow editor window.

The final product is intended to deeply support multiple displays.

Examples:

Monitor 1:
Code / Files

Monitor 2:
App / Emulator

Monitor 3:
Project Home / Tasks / Agent status

Or:

Name surfaces by role rather than “Screen 1” and “Screen 2.” For example:

Workspace:
Session code

Application / Project Home:
Infie + app + Tasks

Create layout concepts showing how panels can:

- dock
- undock
- move between screens
- focus a Session
- preserve Session-specific context

==================================================
DESIGN LANGUAGE
==================================================

The product should feel:

- futuristic
- intelligent
- playful
- developer-focused
- approachable to beginners
- powerful enough for advanced developers

Avoid making it look like:

- a generic enterprise dashboard
- a plain VS Code clone
- “ChatGPT with a file tree”
- a wall of AI chat bubbles
- an overly childish game UI

Use strong information hierarchy.

State should be readable at a glance.

Use clear status chips:

RUNNING
NEEDS YOU
BLOCKED
VERIFYING
PR OPEN
REVIEW FIXES
COMPLETE

Use cards/widgets where useful, especially for:

- Sessions
- UserDev Tasks
- Agent Tasks
- Needs You
- PRs
- running apps
- agent team state

==================================================
BEGINNER FRIENDLINESS
==================================================

i2 should not assume the developer understands every technical concept.

Advanced information such as:

- ports
- process IDs
- worktree paths
- model context size
- detailed Git state

can be available through details/advanced views.

Default UI should use meaningful concepts:

“Payments Session”

rather than:

“F:\Repo\.worktrees\feat-payments-webhook”

“App Running”

rather than:

“PID 19842 :8084”

==================================================
IMPORTANT PROTOTYPE SCREENS TO CREATE / UPDATE
==================================================

Please create a coherent clickable prototype covering at minimum:

1. i2 Home
2. Project Home
3. Project switcher
4. Session view
5. Session Tasks
6. Session Agent view
7. Files/code surface
8. App / emulator surface
9. Diff / verification view
10. PR / review state
11. Needs You interaction
12. UserDev Task interaction
13. Agent Team / model details
14. Session Completion Form
15. Contribution Preview
16. Tutorials
17. Settings / models/providers
18. Games — Coming Soon
19. Complete Mode — Coming Soon
20. Example multi-monitor workspace

==================================================
IMPORTANT DEMO STORY
==================================================

Design the prototype so it can demonstrate this end-to-end story:

The developer opens i2.

They choose a project.

They arrive at Project Home.

Infie shows that several Sessions are active.

One Session needs human attention.

The developer opens it.

The Session represents a specific branch/worktree.

The Session Agent has finished implementation.

The developer sees Tasks, code, app and verification.

The developer manually tests the feature.

They mark the UserDev testing Task complete.

Infie recognizes that all required Tasks and validation are complete.

A Wrap Up action becomes available.

Infie opens a pull request.

GitHub checks/review run.

A reviewer finds an issue.

The Session becomes active again.

Infie routes that issue to the Session Agent.

The agent fixes it.

Verification passes.

The PR is merged.

The Session Completion Form appears.

The developer reviews the learning contribution.

The Session becomes COMPLETE.

Project Home updates automatically.

This flow should feel like the developer is coordinating software development with a living intelligent system rather than manually managing Git branches, agents, terminals and browser windows.

==================================================
FINAL INSTRUCTION
==================================================

Use the current prototype as the visual starting point, but restructure it around:

i2 Home
→ Project Home
→ Session

and around the central concepts:

Infie
Sessions
Tasks
Needs You
Session Agents
Plan / Act / Verify
Models
PR/review lifecycle
Session Completion
Infinite Intelligence

Do not over-focus on implementation details or backend architecture in the visual prototype.

The prototype's job is to make the PRODUCT EXPERIENCE understandable and exciting enough to:

- communicate the vision
- test the UX
- show potential contributors
- show potential grant funders
- generate interest/buzz
- guide the eventual engineering implementation
