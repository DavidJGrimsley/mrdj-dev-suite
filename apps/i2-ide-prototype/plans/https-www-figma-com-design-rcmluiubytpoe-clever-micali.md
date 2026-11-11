# i2 IDE — Implementation Plan

## Latest Change Request — i2 Welcome/Home Screen Redesign

### Context

The product has been renamed from "Agent IDE" to **i2** (Infinite Intelligence). The user has provided:
1. A comprehensive product spec (`i2-prototype-update.md`) describing the full three-level navigation hierarchy: i2 Home → Project Home → Session
2. A Figma pricing-page design (`Design02/index.tsx`) from an "Ovrall" SaaS product — used purely as a **visual inspiration source**, not to be reproduced literally. The user wants the gradient card aesthetic, glassmorphism, the teal (`#2BFFFF`/`#2dd4bf`) accent on the featured card, and the dark background with subtle dot-grid pattern.

### What to build

Replace the current `WelcomeScreen` with a proper **i2 Home** screen. This is the "no project open" state — the entry point before any project is selected.

### Color palette (derived from user instruction)

- **i2 Green** (primary): `#abefa3` — existing accent used throughout
- **Infie Teal** (secondary, sparingly): `#2dd4bf` — already established as Infie's color
- **Background**: `#0d0d0d` or `#111` (darker than current `#3d3b3b` — closer to the Ovrall design's near-black)
- **Card glass**: `rgba(255,255,255,0.04)` with `backdrop-blur` and subtle border
- **Featured/highlighted element**: teal gradient glow, matching the center "Enterprise" card in Ovrall

### i2 Home screen layout

```
┌──────────────────────────────────────────────────────────┐
│  TopChrome: i2 logo + "i2" wordmark + Infie status dot   │
│             Sessions indicator  │  Settings  │  Account  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   [Left: Infie greeting]     [Right: Project panel]      │
│   "Hey, ready to build?"      Recent Projects (cards)    │
│   Suggested actions           Pinned Projects            │
│   Needs You (cross-project)   [Open Folder]              │
│                               [Open Workspace]           │
│                               [New Project w/ Super Stack]│
│                                                          │
│   ── Feature highlights (3 cards, Ovrall-inspired) ────  │
│   Sessions card  │  Infie card  │  Library card          │
│   (teal glow on Infie card — the "featured" one)         │
│                                                          │
│   ── Recent Sessions (horizontal scroll) ──────────────  │
│   session pill cards with phase badge + project name     │
└──────────────────────────────────────────────────────────┘
```

### Visual language borrowed from Ovrall Design02

From the Figma import, extract:
- **Glassmorphism cards**: `backdrop-blur-[20px]`, `bg-gradient-to-b from-[rgba(43,255,255,0.12)] to-[rgba(43,255,255,0.07)]`, `border border-[rgba(43,255,255,0.32)]` — use this on the Infie card
- **Dot/grid SVG background**: `svgPaths.pd9be8c0` from `Design02/svg-6jz6phto0s.ts` — render as a subtle decorative layer behind the feature cards
- **Large decorative ring**: `svgPaths.p1b46cff0` — very large background circle used as ambient glow element
- **Checkmark icon pattern**: `svgPaths.p1ffa3900` + `svgPaths.p33e1f240` — reuse for feature bullet points on the cards
- **Pill badge**: the "Bring your business to the best scale" style pill — repurpose as "Infinite Intelligence" pill near the top
- **Gradient CTA button**: teal-to-dark `from-[#2bffff] to-[#1a9999]` — use for the primary Infie/Super Stack action
- **Plan card structure**: icon + title/subtitle + price/main-stat + divider + feature list — reuse this layout for the 3 feature highlight cards

### Rename: "Agent IDE" → "i2"

Update every visible label: TopBar, WelcomeScreen header, onboard views, super stack flow, loading view, status bar.

### Font addition

The Ovrall design uses **Space Grotesk**. Add it to `fonts.css` alongside Rounded Mplus 1c. Use Space Grotesk for i2 Home display headings and card titles (the large "i2" wordmark, section headers). Keep Rounded Mplus 1c for IDE-interior UI.

### Files to modify

| File | Change |
|---|---|
| `src/app/App.tsx` | Rename "Agent IDE" → "i2" everywhere; replace `WelcomeScreen` with new `I2HomeScreen` |
| `src/styles/fonts.css` | Add Space Grotesk Google Fonts import |

### i2 Home component structure (in App.tsx)

```tsx
// New imports needed
import svgPaths from "../imports/Design02/svg-6jz6phto0s";
import gradientImg from "../imports/Design02/ca58174126847cf34108f1eb8073feb2f2067ca2.png";

function I2HomeScreen({ onOpenFolder, onOpenWorkspace, onSuperStack, projectType, onProjectTypeChange })
  // Top chrome: i2 logo, sessions indicator, project type selector, settings
  // Hero: "i2" wordmark + Infie greeting + pill badge
  // Feature cards: 3 Ovrall-style glass cards (Sessions, Infie Orchestrator, Library)
  //   - Infie card gets teal gradient glow (the "featured" treatment)
  //   - Each card: icon + name + description + feature bullet list (using checkmark SVG)
  // Recent projects: horizontal scroll of project cards
  // Recent sessions: compact pill list with phase badge
  // CTA row: Open Folder, Open Workspace, Generate with Super Stack
```

### Feature card content (replacing Ovrall pricing tiers)

| Card | Icon accent | Title | Feature bullets |
|---|---|---|---|
| Sessions | green | Sessions | Branch per session · Worktree isolation · PR lifecycle · Task tracking |
| **Infie** (featured/teal) | teal | Infie Orchestrator | Coordinates all agents · Scans project memory · Creates worktrees · Routes review failures |
| Library | purple | Library | Drag-to-add components · MDS source · Live previews · Conflict resolution |

### Verification
1. App title is "i2" everywhere — no remaining "Agent IDE" strings
2. Space Grotesk loads from Google Fonts
3. i2 Home shows: top chrome, hero pill, 3 feature cards, recent projects, recent sessions, CTA row
4. Infie card has the teal glassmorphism treatment from Ovrall Design02
5. Dot-grid SVG background renders behind the feature cards section
6. Gradient ring decorative element visible as ambient glow
7. Clicking Open Folder/Workspace opens the existing scenario picker
8. Clicking Super Stack enters the existing super-stack flow
9. Existing IDE interior (Session view) is unaffected except for "i2" rename

---

# Agent IDE — Dual-Screen Implementation Plan + Workspace System

## Latest Change Request (2026-07-22)

Three changes to the welcome screen and IDE identity:

1. **De-Expo-ify the IDE** — rename "Expo Agent IDE" → "Agent IDE" everywhere. The IDE is project-folder driven and supports many project types, not just Expo.
2. **Project type dropdown** — add a dropdown in the welcome screen's right panel (above the Open CTAs) with a `projectType` state. Default: Expo.
3. **Carousel/menu layout split** — slides: `flex-[2]` (≈ 2/3), right panel: `flex-[1] min-w-[300px] max-w-[420px]` (≈ 1/3 instead of fixed `w-[320px]`).

### Project type dropdown options

```
Expo                          (default)
Bare React Native
Python Backend
── Game Engines ──            (non-clickable separator label)
Unreal Engine
Unity
UEFN (Fortnite Creative)
Godot
──────────────────────        (divider)
Generic / Other
Request Support ↗             (opens GitHub issues in new tab)
```

- Dropdown rendered as a custom `<div>` popover (no `<select>`) to support separator rows and styled items
- "Game engine" entries display a muted note: "Requires connected editor"
- "Request Support" → `window.open("https://github.com/", "_blank")` (placeholder URL)
- `projectType` stored in `localStorage` and read on mount; shown as a small badge in the top chrome of the full IDE

### Files to modify — `src/app/App.tsx` only

| Location | Change |
|---|---|
| ~line 1963 | Rename "Expo Agent IDE" → "Agent IDE" in `WelcomeScreen` header |
| ~line 1967 | Slides container: `flex-1` → `flex-[2]` |
| ~line 1995 | Right panel: `w-[320px] shrink-0` → `flex-[1] min-w-[300px] max-w-[420px] shrink-0` |
| ~line 1997 (inside right panel) | Add `<ProjectTypeSelector>` component above the Open CTAs |
| New component | `ProjectTypeSelector` — dropdown with all option rows |
| `WelcomeScreen` | Add `projectType` / `setProjectType` state, `localStorage` read/write |
| Top chrome (IDE, ~line 2430+) | Show selected project type badge next to IDE name |

### Verification — Welcome / Project Type
1. Welcome screen right panel is visibly wider (≈ 1/3 of screen)
2. Carousel text still reads well at 2/3 width
3. Dropdown opens, separator rows are non-clickable, "Request Support" opens new tab
4. Game engine entries show "Requires connected editor" note
5. Selected type persists after reload (localStorage)
6. IDE top chrome shows the selected project type badge

---

## Library Widget Redesign

### Context

The existing "Components" widget is a basic filtered card grid. The user wants it evolved into a proper **library registry** surface — a near-final product direction for browsing and previewing curated design resources, scoped to MDS (the first source) and others.

### Rename

- `"Components"` → `"Library"` everywhere: `WidgetId`, `ALL_WIDGETS` entry, `WidgetsPicker` label, modal title, fullscreen title, `ComponentsContent` → `LibraryContent`
- Filter label `"All sources"` → `"Source"`

### Layout inside the widget / modal / fullscreen

Three-column layout when expanded (modal or fullscreen):

```
┌──────────┬──────────────────────────┬──────────────────┐
│ Filters  │  Card grid               │  Preview panel   │
│ (sidebar)│  (scrollable)            │  (detail drawer) │
│ 200px    │  flex-1                  │  320px           │
└──────────┴──────────────────────────┴──────────────────┘
```

In the compact widget view (not modal/fullscreen): filters collapse to a horizontal pill row above the grid; no preview panel until a card is clicked (opens modal instead).

### Filter system

```
Source (radio):
  ● MDS  (default selected)
  ○ Expo UI Kit
  ○ Community
  ○ All

Type / Category (radio):
  ○ All
  ○ Onboarding        ← has subtype expansion
  ○ Auth
  ○ Setup
  ○ Legal
  ○ App Shell / Layout
  ○ Navigation
  ○ Feedback / Alerts

Subtype (shows when Type = Onboarding):
  ○ All
  ○ Welcome / Intro
  ○ Step Flow
  ○ Legal Gate
  ○ Permissions / Access
  ○ Completion State
```

Filter sidebar uses `bg-[#1a1818]` panel, small text, muted selection pills. Active selection highlighted with `text-[#a78bfa]` (soft purple) and left border accent.

### Card data (Library items)

```ts
interface LibraryItem {
  id: string;
  title: string;
  source: "MDS" | "Expo UI Kit" | "Community";
  type: "Onboarding" | "Auth" | "Setup" | "Legal" | "App Shell" | "Navigation" | "Feedback";
  subtype?: string;
  description: string;
  hasLivePreview: boolean;      // true for 1-2 items only
  previewComponent?: React.ReactNode;
  color: string;                // accent color for thumbnail placeholder
}
```

Pre-populate ~12 items. Two have `hasLivePreview: true`:
1. **"MDS Onboarding — Welcome Flow"** (source: MDS, type: Onboarding, subtype: Welcome/Intro) — live preview renders a 3-step welcome screen with "Next" button cycling through steps
2. **"MDS Auth — Sign In"** (source: MDS, type: Auth) — live preview renders a minimal dark sign-in form with email + password + CTA

### Card visual

Each card (`≈ 200px × 160px` in grid):
- Dark glass background: `bg-[#1e1c1e] border border-white/8 rounded-xl`
- Top area (100px): colored thumbnail strip with pattern or icon, live badge if preview available
- Bottom area: title (13px, white), source pill (MDS/etc), type label, 1-line description
- Hover: `border-white/20` lift
- Selected: `border-[#a78bfa] ring-1 ring-[#a78bfa]/30`

### Preview panel

- Opens as right drawer (320px) when a card is clicked in modal/fullscreen
- Shows: title, source + type badges, description, live preview iframe-like container (`bg-[#0e0c0e] rounded-xl`) with the preview component centered
- For non-live items: shows a "Preview not available" placeholder with the card's accent color
- Smooth slide-in: `motion.div` with `x: 320 → 0`

### Full-screen expand

- Header of the Library widget/modal gets a `Maximize2` button (already in the widget system)
- In fullscreen, the three-column layout is fully visible
- Fullscreen header: "Library" title + source badge + item count + `Minimize2` to exit

### Accent colors

- Purple/blue palette for Library specifically: `#a78bfa` (violet-400), `#818cf8` (indigo-400)
- These replace the green `#abefa3` accent used elsewhere in the IDE — Library has its own identity
- Filter active state: `text-[#a78bfa]`
- Card selected border: `border-[#a78bfa]`
- Preview panel title: `text-[#a78bfa]`

### Files to modify — `src/app/App.tsx` only

| What | Where |
|---|---|
| Rename `ComponentsContent` → `LibraryContent` | ~line 950–1050 (existing components widget) |
| Rename `"components"` WidgetId → `"library"` | `WidgetId` type + `ALL_WIDGETS` array |
| Add `LibraryItem` type + `LIBRARY_ITEMS` data array | after constants section |
| Rewrite `LibraryContent` with 3-col layout | replace existing `ComponentsContent` body |
| Add `OnboardingPreview` component | inline in App.tsx |
| Add `AuthPreview` component | inline in App.tsx |
| Add filter sidebar component `LibraryFilters` | inline in App.tsx |
| Add preview drawer `LibraryPreviewPanel` | inline in App.tsx |

### Verification — Library
1. Widget shows "Library" everywhere; "Components" string is gone
2. Filter sidebar: Source → MDS first; Type → All/Onboarding/etc; Subtype appears when Onboarding selected
3. All 12 cards render; selected card has purple border
4. Clicking MDS Onboarding Welcome card opens preview panel with live 3-step flow
5. Clicking MDS Auth Sign In card shows working sign-in form preview
6. Other cards show polished "Preview not available" placeholder
7. Fullscreen mode: three columns visible, `Maximize2`/`Minimize2` toggle works
8. Motion: preview drawer slides in smoothly

---

## Context

The user is building a desktop-optimized, dual-monitor IDE for developing Expo cross-platform apps using the "Mr. DJ's Dev Suite" workflow. A Figma design has been imported (`/src/imports/Screen1Example1/index.tsx`) that defines the visual language and layout for Screen 1. The user wants Screen 1 fleshed out with modular/draggable panels, and a full Screen 2 built with mobile/Android/iOS emulator frames. The app should feel like a real tool, not a demo.

## What's Already Done

- Figma import at `src/imports/Screen1Example1/index.tsx` defines:
  - **Workspace** panel: collapsible file tree (src, package.json, README.md, Guidelines.md)
  - **Project Folder** panel: mrdj-style project memory files (Info.md, Todo.md, Style.md, Guidelines.md)
  - **Current Goal** widget: displays active session goal
  - **Chat** panel: center canvas with input area + Start App play button
  - **Session Testing (ToTest)** panel: checklist of things to test this session
- Font: `Rounded Mplus 1c` (Google Fonts, Regular)
- Color palette: dark charcoal `#3d3b3b` bg, `#1d1b20` panel headers, `#d9d9d9` panel bodies, `#373434` chat area, `#abefa3` green accent

## Approach

### Architecture

Build everything in `src/app/App.tsx` as a self-contained React component. No routing needed — use a tab/toggle to switch between Screen 1 and Screen 2, since we're in a browser and can't force dual-monitor. Add a screen switcher in the top chrome so the user can simulate the two-monitor workflow.

### Screen 1 — Workspace (left), Chat (center), Testing + Widgets (right)

**Left Column** (draggable panels, stacked vertically):
1. **Workspace** — collapsible file tree with project files. Mimics the Figma import: folder items for `src/`, `package.json`, `README.md`, `Guidelines.md` with file icons and chevrons.
2. **Project Folder** — the mrdj project memory files: `Info.md`, `Todo.md`, `Style.md`, `Guidelines.md`. Critical to the dev-suite workflow.
3. **Current Goal** — single-line display of the active session goal (editable on click).

**Center Column** — Chat panel:
- Conversation area (scrollable message list with assistant and user bubbles)
- **Smart context buttons** above the input that change based on session phase:
  - *Start phase*: `Start App`, `Start Server`, `New Session`
  - *Active phase*: `Continue`, `Run Doctor`, `Ship Test`
  - *Wrap-up phase*: `Wrap Up`, `Commit`, `Open PR`
  - Phase toggled via a `sessionPhase` state (`start | active | wrapup`)
- Text input area at the bottom (multiline, send on Cmd+Enter)
- The animated green Play triangle from the Figma import, shown as a floating action button

**Right Column** (draggable panels):
1. **Session Testing (ToTest)** — checklist items aligned with session goals. Add/check/delete items. Pulls from current session context.
2. **Blank Widget Slot** — placeholder panel styled consistently, labeled "Add Widget" with a `+` icon. Future-proofed for new functionality.

**Draggable panels**: Use a simple drag-to-reorder within each column using `useState` + mouse event handlers (no heavy library needed). Each panel has a drag handle in its header.

### Screen 2 — Emulators

Three side-by-side frames labeled and styled like device frames:

1. **Mobile Web** — narrow frame (~390px wide in a scaled container), browser chrome at top (URL bar, back/forward), scrollable iframe-style content area. Label: "Web (Mobile)"
2. **Android** — Android device frame shape with status bar, bottom nav bar suggestion, main content area. Slightly wider. Label: "Android"
3. **iOS** — iPhone-style frame with Dynamic Island notch cutout at top, home indicator bar at bottom. Same content area. Label: "iOS"

Each frame has:
- A refresh button
- A URL/deeplink bar
- Placeholder content showing "App running on port 8081" or a "Start the app to preview" empty state
- Connection status indicator (green dot = connected, gray = waiting)

The three frames sit in a dark canvas with subtle device shadows, giving the feel of actual emulator windows.

### Top Chrome (global)

- Thin dark header bar across the full width
- Left: IDE name "Expo Agent IDE" with a lightning bolt icon
- Center: Screen switcher tabs — `Screen 1` | `Screen 2`
- Right: Session phase indicator pill, settings icon, git branch display

### Visual Fidelity to Import

- Carry the exact color palette: `#3d3b3b`, `#1d1b20`, `#d9d9d9`, `#373434`, `#abefa3`
- Font: `Rounded Mplus 1c` from Google Fonts (write import to `fonts.css`)
- Panel headers dark (`#1d1b20`), panel bodies light gray (`#d9d9d9`)
- The animated play polygon from the Figma import (motion.div, rotate animation) used for the Start App button
- SVG paths reused from `src/imports/Screen1Example1/svg-lhqtfjy16g.ts`

## Critical Files

- **Write**: `src/app/App.tsx` — full implementation
- **Write**: `src/styles/fonts.css` — Google Fonts import for Rounded Mplus 1c
- **Update**: `src/styles/theme.css` — update background/foreground tokens to match dark IDE palette
- **Read-only reference**: `src/imports/Screen1Example1/index.tsx` — design source of truth
- **Read-only reference**: `src/imports/Screen1Example1/svg-lhqtfjy16g.ts` — SVG path data to reuse

## State Model

```ts
sessionPhase: 'start' | 'active' | 'wrapup'
activeScreen: 'screen1' | 'screen2'
currentGoal: string
messages: { role: 'user' | 'assistant', content: string }[]
toTestItems: { id: string, text: string, done: boolean }[]
panelOrder: { left: string[], right: string[] }  // for drag reorder
```

---

## Workspace System — Added Plan

### Context

VS Code lets you open a folder or a `.code-workspace` file. Codex/Claude Desktop siloes conversations per folder with no cross-repo awareness. This workspace system fixes that: the IDE has a clear "no project open" state, detects project folders automatically, and runs onboarding flows when they're missing. Sessions become searchable and movable across workspaces — solving the core pain of "I can't find conversation A because it was started in repo B."

### Workspace States

The IDE has a top-level `workspaceState` that gates everything:

```
"none"        → No folder/workspace open yet  (welcome screen)
"loading"     → Scanning opened folder/workspace
"app-found"   → Folder opened, project/ folder found → load normal IDE
"app-onboard" → Folder opened, no project/ folder → show Onboard button
"ws-found"    → Workspace opened, workspace-level project/ found → load IDE
"ws-onboard"  → Workspace opened, no workspace project/ → run workspace onboard flow
```

### Welcome Screen (state: "none")

When `workspaceState === "none"`, App renders a full-screen welcome view instead of the IDE.

**Visual design from Figma imports Desktop1/2/3:**
- Background: `#edf4f3` (the mint-white from the Figma slides)
- Auto-advancing carousel/slide show of the three value-prop frames:
  - Desktop1: "Most agentic IDEs let you use an agent. **This IDE is an agent**" + body copy
  - Desktop2: "The IDE knows your project structure…" + "Less typing → **more building!**" + bullet list
  - Desktop3: Intelligent model switching / built-in emulators / one application
- Slides auto-advance every 5s, dot indicators at bottom, swipeable
- The text from the Figma imports is rendered faithfully: 48px, Rounded Mplus 1c, right-aligned on Desktop2, centered on Desktop3
- **Below slides**: two CTA buttons:
  - `Open Folder` (secondary)
  - `Open Workspace` (secondary)
  - `Generate with Super Stack` (primary, green `#abefa3`)
- **Recent sessions** panel below CTAs: searchable list of past sessions with workspace/folder name, last active timestamp, phase badge

### Folder / Workspace Open Flow (simulated)

Since this is a browser prototype, "opening" is simulated via a modal that lets the user pick one of several preset scenarios:

| Scenario | Label | Outcome |
|---|---|---|
| Expo app with project/ | `expo-photo-share/` | state → `app-found` |
| Expo app without project/ | `my-new-app/` | state → `app-onboard` |
| Workspace with project/ | `portfolio.code-workspace` | state → `ws-found` |
| Workspace without project/ | `monorepo.code-workspace` | state → `ws-onboard` |

### Onboard flow (state: "app-onboard")

- IDE renders but center panel shows an **Onboard CTA** instead of a chat session
- Large card: "No project folder found in `my-new-app/`" with description of what mds onboard does
- "Run `mds onboard`" button starts a simulated onboard conversation in the chat
- Once onboard completes (simulated after a few messages), state → `app-found`

### Workspace onboard flow (state: "ws-onboard")

- Center panel shows a special onboard conversation:
  - IDE "scans" workspace repos one level deep (simulated, shows a loading animation)
  - Presents findings: "Found 3 repos: expo-photo-share, mercury-bank-sdk, shared-ui"
  - Agent starts a conversation: "This workspace spans multiple repos. Let me understand how they connect…"
  - Asks a few questions (answered via the chat input)
  - Creates a workspace `project/` folder
  - State → `ws-found`

### Sessions panel (searchable, movable)

- New "Sessions" widget in the Widgets picker
- Opens as a modal: searchable list of all sessions across all workspaces
- Each session shows: workspace/folder name, conversation title, last active, phase badge
- Sessions can be dragged into the current workspace (simulated)
- This directly addresses the Codex/Claude Desktop cross-folder problem

### Files to create/modify

- **Modify**: `src/app/App.tsx`
  - Add `workspaceState` state + all state machine values
  - Add `WelcomeScreen` component (renders Desktop1/2/3 slides + CTAs + recent sessions)
  - Add `OpenFolderModal` component (scenario picker)
  - Add `OnboardView` component (for `app-onboard` and `ws-onboard` states)
  - Wrap existing IDE render in `workspaceState === "app-found" || "ws-found"` gate
- **New component**: `src/app/components/welcome-screen.tsx` — the full-screen welcome with slides
- **New component**: `src/app/components/sessions-panel.tsx` — cross-workspace session search
- **Read-only reference**: `src/imports/Desktop1/index.tsx`, `Desktop2/index.tsx`, `Desktop3/index.tsx` — text and layout source of truth

### Future Work (noted, not implemented here)
- GitHub Projects integration for multi-repo workspaces (needs investigation)
- Google Drive / Slack integration for non-technical collaborators on project files
- Real filesystem access for project folder detection (requires Electron/VS Code fork)
- Real session persistence across browser reloads

---

## Future Work (cannot be achieved in browser prototype)

- **AI-adaptive layout**: The IDE should automatically rearrange, show, or hide widgets based on what the agent is doing (e.g. automatically surface the Git widget when a commit is happening, show the Doctor widget when errors appear, expand the emulator when a UI change lands). This requires a real AI runtime with session state awareness — it is explicitly wanted by the user but cannot be prototyped in a static React app. Flag this as a first-class feature for the VS Code fork.

## Verification

1. Load the app — top chrome shows screen switcher
2. Screen 1: all three columns render; panels have drag handles; chat input works; smart buttons change when the phase pill is clicked
3. Screen 2: three device frames render side by side with correct shapes (iOS notch, Android nav bar, narrow mobile web)
4. Font "Rounded Mplus 1c" loads correctly from Google Fonts
5. The animated green play button rotates/pulses on Screen 1
6. Panels in left/right columns can be dragged to reorder within their column
