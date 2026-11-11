# i2 — Animated background glows + full interactive Home→Project→Session prototype

## Context
The user imported three Figma designs (`src/imports/I2Home`, `OpenProject`, `OpenSession`) plus a detailed spec (`src/imports/pasted_text/interactive-prototype-spec.md`) and screenshots (`.figma/attachments/image-0..2.png`). They want two things:

1. **Animated background circles** — the ambient radial-gradient glows should drift/move continuously while the app runs.
2. **A full interactive clickable prototype** — Home → Project Home → Session, where the session **status drives the visible Infie action button**, the user clicks the primary action, reviews a checklist/result, and the session advances to its next status with a new action.

The spec says "bring the existing i2 styles into this prototype", "use the existing i2 layout", "the same reusable Session component", and "feel like the local i2 prototype" — and the user explicitly noted *"instructions may say create when alter is more appropriate."* So this is an **adaptation of the existing `src/app/App.tsx`**, using the imports + screenshots as the visual source of truth — NOT a pixel-render of the three static 3,000-line import files (which are `imports/`-read-only static compositions and would duplicate the existing IDE). The imported glow layer is byte-identical to the glows already hand-built in App.tsx, so we animate those.

Everything is implemented in `src/app/App.tsx` (single-file app). Reuse existing components heavily.

## Design reference (from screenshots + spec)
- **image-0 / I2Home**: Infie conversation on the LEFT (avatar + "Hello, Tony…" greeting, a "What's Next" teal pill + an amber "Test changes in Add comments" action, text input), "Active Projects" 2-col grid on the RIGHT (My Portfolio, Pet Show and Tell, Task Tracker, Basketball Courts, Not hot dog), CTA row bottom-right ("Generate new Expo Project" split button + "Open New"). Top chrome: infinity+i2 logo, Project/Session breadcrumb pills, Tutorials/Widgets/Games, Workspace/Emulators toggle.
- **image-1 / OpenSession (Add Comments)**: 3-column IDE — left sidebar (Project Folder files, Current Diffs, Current Goal & Plan, Agent Tasks), center Infie conversation with a dynamic action row (What's Next / Test changes / Action) + input, right column (Human Testing checklist, Explorer tree, My Widgets grid). Header shows project pill "Pet Show and Tell", session pill "Add Comments", status, Start App.
- **image-2 / OpenProject (Project Home)**: same shell, center shows Infie coordination + an action row, and a **SESSIONS** panel at the bottom with session cards ("Fix Reaction Bug" CODING, "Add Comments" WAITING ON TEST with a "Test now" pill) each showing STATUS / MODEL / PROGRESS / AGENTS.

## Part 1 — Animated background glows
- Extract the three radial-gradient glow divs + noise overlay (currently duplicated in `I2HomeScreen` ~line 2694 and `I2Canvas` ~line 3232) into one reusable `AnimatedGlows` component.
- Wrap each glow in `motion.div` (motion is already imported) with a slow, continuous drift: animate `x`, `y`, and `scale` (e.g. ±40–80px, scale 1→1.15) on each circle with different `duration` (18–30s), staggered, `repeat: Infinity`, `repeatType: "mirror"`, `ease: "easeInOut"`. Keep the noise PNG static.
- Use `AnimatedGlows` on every dark-canvas screen: Home, Auth, Pricing, Project Home, Session (via the shared `I2Canvas`). Honor `prefers-reduced-motion` by falling back to static positions.

## Part 2 — Data model & status state machine
Add near the top of App.tsx (by the existing types ~line 20):
- `type SessionStatus = "READY" | "CODING" | "WAITING ON TEST" | "NEEDS YOU" | "REVIEW FIXES" | "FIXING" | "VERIFIED" | "PR OPEN" | "MERGED" | "COMPLETE" | "BLOCKED" | "PAUSED"`.
- `STATUS_META: Record<SessionStatus, { chipColor; label }>` — uppercase labels, colors per spec (teal=recommended, purple=inspect, blue=in-progress, amber=needs-attention, red=blocked, gray=disabled).
- `type ActionPreset = "teal" | "purple" | "blue" | "amber" | "red" | "gray"` with a `PRESET_STYLE` map encoding the glowing-glass style (dark translucent surface, 1px colored stroke @50%, outer glow, inner shadow same color @25%/25px blur, white title, leading icon).
- **Prototype data**: `PROTOTYPE_PROJECTS` (5 cards; `wired: true` only for Pet Show and Tell + Not Hotdog) and `PROTOTYPE_SESSIONS` keyed by id, each with `{ projectId, name, branch, model, agents, tasksDone, tasksTotal, status, wired, flow }`.
  - `add-comments` (Pet Show and Tell): starts `WAITING ON TEST`, 4/12, 3 agents.
  - `fix-reaction-bug` (Pet Show and Tell): `MERGED`, 6/8, 2 agents, `wired: false` → scope notice.
  - `not-hotdog` (Not Hotdog): starts `READY`, 0/7, 1 agent.
- **Flow config** — a `SESSION_FLOW: Record<SessionStatus, { primary: { label; preset; next: SessionStatus }; secondaries?: [...]; infie: string }>` (per-session Infie messages from the spec). Linear path: `READY→CODING→WAITING ON TEST→NEEDS YOU→VERIFIED→PR OPEN→MERGED→COMPLETE`; primary labels: Start Session / Continue / Test App / Record Testing / Open PR / Review Changes / Check Project / What's Next?. The `NEEDS YOU → VERIFIED` transition is **gated** by the human-testing checklist (advance only when required items are checked). Optional failure path: `REVIEW FIXES →(Fix Problems)→ FIXING →(Continue)→ VERIFIED`.

## Part 3 — Reusable components (build in App.tsx, reuse existing where noted)
- `StatusChip({ status })` — uppercase colored pill from `STATUS_META`.
- `InfieModeChip()` — the teal **GUIDED** badge; visually distinct from status chips (spec: GUIDED is a *mode*, not a status).
- `SessionMeta({ session })` — branch/worktree + task progress + agent count row.
- `InfieActionButton({ actionLabel, preset, density, icon, message?, onClick })` — the glowing-glass pill, `Compact`/`Expanded` variants; title case labels.
- `InfieActionRow({ primary, secondaries })` — one primary + up to 3 secondaries, 8px gap; horizontal.
- `SessionStatusCard({ session, onOpen })` — project-home session card (title, session/branch, StatusChip, primary InfieActionButton, PROGRESS + AGENTS grid) matching image-2.
- `HumanTestingChecklist` — reuse the existing `CheckItem` list pattern + `humanTests` state (App.tsx ~lines 102, 3457); checking required items drives the gate.
- `PrototypeScopeNotice({ message, onOpenPet, onOpenNotHotdog, onClose })` — modal styled like existing `OpenPickerModal` (~line 2863) with the exact spec copy and the three buttons.
- `StatusPlayground()` — a panel listing every `SessionStatus` with its StatusChip + primary action, for reuse/QA (reachable from a small Home/dev link).

Reuse as-is: `InfieAvatar` (~2090), `ChatSection`/left+right columns (~1845/1910/2189), `EmulatorCanvas`, `StatusBar`, `TopBar`, existing checklist toggles in `AppContext`.

## Part 4 — Navigation & screens
Add a prototype router in `App` alongside the existing `appPhase` gate (auth/pricing already exist ~line 3421). After sign-in (`appPhase === "app"`), drive a `route` state: `"home" | "project" | "session"` with `activeProjectId` / `activeSessionId`.

1. **i2 Home** — rework existing `I2HomeScreen` (~line 2669) to the two-column layout from image-0: Infie convo LEFT (greeting + `InfieActionRow` with "What's Next" + the amber "Test changes in Add Comments" shortcut that deep-links into that session; existing interactive input kept), **Active Projects** grid RIGHT from `PROTOTYPE_PROJECTS`. Clicking Pet Show and Tell / Not Hotdog → `route="project"`; clicking My Portfolio / Task Tracker / Basketball Courts → `PrototypeScopeNotice`. Keep the "Generate new ‹Framework› Project" split button + add "Open New". Keep animated glows.
2. **Project Home** (new `ProjectHomeScreen`) — from image-2: header with project pill, Infie coordination line, and a SESSIONS list rendered with `SessionStatusCard`. Pet Show and Tell → Add Comments (wired) + Fix Reactions Bug (→ scope notice); Not Hotdog → Improve Not Hotdog Classifier (wired). Wired card / its primary action → `route="session"`.
3. **Session Detail** (adapt the existing IDE render, App.tsx `ide` ~line 3540) into `SessionScreen` driven by session status: reuse LeftColumn/ChatSection/RightColumn/EmulatorCanvas/StatusBar; replace the old `actionStage` action buttons with the status-driven `InfieActionRow` (primary from `SESSION_FLOW[status]`), show `StatusChip` + `InfieModeChip` + `SessionMeta` in the conversation header, and render `HumanTestingChecklist`. Clicking primary → optional simulated loading → advance status, swap Infie message + action; `NEEDS YOU→VERIFIED` gated by checklist. Keep project + session always visible in the header. Both sessions use this one component with data from `PROTOTYPE_SESSIONS`.
4. Header breadcrumb **Project / Session** pills reflect and navigate the current route.

## Files
- `src/app/App.tsx` — all changes (types, data, components, router, animated glows).
- No edits to `imports/` (read-only). Reuse the existing noise texture already imported (`imgNoiseTexture`, ~line 15). No new fonts/theme tokens.

## Verification
Run `npm run build` (vite) to typecheck/compile. Then click through:
1. Sign in → Home: confirm the three background circles visibly drift/move; Infie chat on left, 5 project cards on right.
2. Click My Portfolio → scope-notice modal with "Open Pet Show and Tell / Open Not Hotdog / Close"; buttons navigate correctly.
3. Click Pet Show and Tell → Project Home shows Add Comments (WAITING ON TEST) + Fix Reactions Bug (MERGED). Fix Reactions Bug → scope notice (does NOT open Add Comments).
4. Open Add Comments → Session detail at WAITING ON TEST, action "Test App". Click through the flow: Test App → NEEDS YOU → Record Testing → check the required human-testing items → status becomes VERIFIED → Open PR → PR OPEN → Review Changes → MERGED → Check Project → COMPLETE → What's Next?. Confirm the Infie message + StatusChip + primary action update at each step, and GUIDED badge stays constant.
5. From Home/Not Hotdog → Not Hotdog Project Home → Improve Not Hotdog Classifier at READY → Start Session → CODING → Continue → … → COMPLETE, with the spec's per-status Infie messages.
6. Open Status Playground: every status renders with its chip + correct primary action.
7. Confirm no literal `&`/`#` placeholders render (session/project icons used), status chips are UPPERCASE, action labels Title Case, and action rows have ≤3 secondaries with 8px gaps.
