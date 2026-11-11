# Implementation Plan: Homescreen Revisions and Global To-Do Widget

This plan outlines the changes to modernize the homescreen and integrate an app-wide Global To-Do List widget into the Dual-Screen IDE React + Vite + Tailwind application.

---

## 1. Scope and Objectives

1. **Homescreen Branding Update**: Replace the Infiniti symbol avatar and "Infie" text header on the homescreen with a dedicated floating mascot figure using the transparent Infie PNG (`/assets/infie_hero_transparent.png`) with smooth floating motion and ambient glow.
2. **Framework Underline in Generate Button**: Dynamically underline the active framework name (e.g., `Expo`) inside the primary action segment of `GenerateProjectButton`.
3. **Import Project Button**: Rename the secondary action button on the homescreen from "Open New" to "Import Project" while preserving its folder scenario modal behavior.
4. **Unclickable Projects Cleanup**: Remove all projects marked as `wired: false` (`My Portfolio`, `Task Tracker`, and `Basketball Courts`) from the project registry and homescreen grid so that only active, fully clickable projects (`Pet Show and Tell` and `Not Hotdog`) remain.
5. **Global To-Do List Widget**: Build a cross-project task tracking widget that tracks both project-specific open tasks and ad-hoc ecosystem reminders (such as *"Update SSL certificates on MyWebsite.com"*), with interactive checkboxes, task deletion, new item creation, category filtering, and direct navigation links to projects.
6. **App-wide Widget Access**: Wire the top header "Widgets" button to open a Widgets Gallery modal featuring the Global To-Do widget, make Global To-Do selectable from the Screen 1 IDE widgets picker, and include it in the Project Home widgets panel.

---

## 2. Technical Architecture & File Boundaries

### Key Files Affected
- `src/app/App.tsx`:
  - Homescreen layout (`HomeScreen` component, lines ~5050–5275).
  - `GenerateProjectButton` (lines ~5308–5372).
  - `PROTOTYPE_PROJECTS` array (lines ~3307–3316).
  - Widget types and registry (`WidgetId`, `ALL_WIDGETS`, lines ~61–98).
  - `WidgetContent` dispatcher (lines ~720–785).
  - New `GlobalTodoContent` component and state management.
  - New `FloatingInfieMascot` component for the homescreen.
  - New `WidgetsGalleryModal` component accessible from header controls.
  - `ProjectHomeScreen` widgets grid integration (lines ~3823–3853).

---

## 3. Detailed Implementation Steps

### Step 1: Homescreen Infie Floating Mascot Replacement
- **Location**: `src/app/App.tsx` lines ~5143–5150.
- **Current Implementation**:
  ```tsx
  {/* Avatar + name row */}
  <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full">
    <InfieAvatar size={22} />
    <div className="content-stretch flex flex-col items-start relative shrink-0">
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: "22.5px", whiteSpace: "nowrap" }}>Infie</p>
    </div>
  </div>
  ```
- **Changes**:
  - Create `FloatingInfieMascot`:
    - Dimensions: 72px width and height.
    - Asset source: `/assets/infie_hero_transparent.png`.
    - Motion: `motion.div` with vertical float animation `animate={{ y: [0, -6, 0] }}` with `duration: 3.2, repeat: Infinity, ease: "easeInOut"`.
    - Ambient glow: soft teal/mint radial gradient behind the mascot (`radial-gradient(circle at 50% 50%, rgba(45, 212, 191, 0.28), rgba(171, 239, 163, 0.08) 55%, transparent 75%)`) with 14px blur.
    - Masking: radial gradient mask for smooth bottom blending (`maskImage: "radial-gradient(ellipse 75% 75% at 50% 48%, #000 62%, transparent 100%)"`).
    - Accessibility: respects user `prefers-reduced-motion`.
  - Replace the avatar + "Infie" text row with `<FloatingInfieMascot />` placed right above the conversation card, creating a clean, modern floating assistant appearance without the text label or old Infiniti icon.

### Step 2: Underline Framework in Generate Button
- **Location**: `src/app/App.tsx` lines ~5324–5328 in `GenerateProjectButton`.
- **Current Implementation**:
  ```tsx
  <button onClick={onGenerate}
    className="flex-1 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
    style={{ padding: "14px 18px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#061413" }}>
    <Zap size={16} /> Generate new {PROJECT_TYPE_LABELS[value]} Project
  </button>
  ```
- **Changes**:
  - Modify the button label to:
    ```tsx
    <Zap size={16} /> Generate new <span className="underline decoration-1.5 underline-offset-4 decoration-[#061413]/70 font-bold">{PROJECT_TYPE_LABELS[value]}</span> Project
    ```
  - Adds visual affordance indicating the selected framework is configurable while maintaining the high-contrast teal gradient aesthetic.

### Step 3: Rename 'Open New' to 'Import Project'
- **Location**: `src/app/App.tsx` lines ~5256–5260.
- **Current Implementation**:
  ```tsx
  <button onClick={onOpenProject}
    className="bg-[rgba(255,255,255,0.04)] border-[0.667px] border-[rgba(255,255,255,0.08)] content-stretch flex gap-[8px] h-full items-center justify-center px-[20px] py-[14px] relative rounded-[12px] shrink-0 whitespace-nowrap hover:bg-white/[0.07] transition-colors"
    style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" }}>
    <FolderOpen size={16} strokeOpacity={0.7} /> Open New
  </button>
  ```
- **Changes**:
  - Update text to:
    ```tsx
    <FolderOpen size={16} strokeOpacity={0.7} /> Import Project
    ```
  - Retain click handler `onOpenProject` to open the workspace scenario picker modal.

### Step 4: Remove Unclickable Projects
- **Location**: `src/app/App.tsx` lines ~3309–3316.
- **Current Implementation**:
  ```tsx
  const PROTOTYPE_PROJECTS: ProtoProject[] = [
    { id: "portfolio", name: "My Portfolio", desc: "Personal portfolio site", framework: "Generic", sessions: 1, ago: "5d ago", wired: false },
    { id: "pet", name: "Pet Show and Tell", desc: "Pet photo sharing social app", framework: "Expo", sessions: 2, ago: "Now", active: true, wired: true },
    { id: "tasks", name: "Task Tracker", desc: "Track your chores", framework: "Generic", sessions: 1, ago: "2w ago", wired: false },
    { id: "courts", name: "Basketball Courts", desc: "Find your closest basketball court", framework: "Workspace", sessions: 1, ago: "1d ago", active: true, wired: false },
    { id: "nothotdog", name: "Not Hotdog", desc: "Image classification app", framework: "Expo", sessions: 1, ago: "1w ago", wired: true },
  ];
  ```
- **Changes**:
  - Remove `portfolio`, `tasks`, and `courts`.
  - New `PROTOTYPE_PROJECTS`:
    ```tsx
    const PROTOTYPE_PROJECTS: ProtoProject[] = [
      { id: "pet", name: "Pet Show and Tell", desc: "Pet photo sharing social app", framework: "Expo", sessions: 2, ago: "Now", active: true, wired: true },
      { id: "nothotdog", name: "Not Hotdog", desc: "Image classification app", framework: "Expo", sessions: 1, ago: "1w ago", wired: true },
    ];
    ```
  - In `HomeScreen`:
    - Project cards now directly call `onSelectProject(p)` on click.
    - Grid layout adjusts to 2 columns for a balanced, centered presentation without empty placeholder rows.

### Step 5: Global To-Do List Widget Design & Data Model

#### Data Types
```tsx
interface GlobalTodoItem {
  id: string;
  text: string;
  done: boolean;
  category: "project" | "general";
  projectId?: string;
  projectName?: string;
  sessionId?: string;
}
```

#### Default Data Set
```tsx
const INIT_GLOBAL_TODOS: GlobalTodoItem[] = [
  // Active Projects: Pet Show and Tell
  { id: "gt-1", text: "Implement PhotoPicker component", done: true, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-2", text: "Add friend list query to Supabase", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-3", text: "Handle photo library permissions", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },
  { id: "gt-4", text: "Compress images before upload", done: false, category: "project", projectId: "pet", projectName: "Pet Show and Tell", sessionId: "add-comments" },

  // Active Projects: Not Hotdog
  { id: "gt-5", text: "Add edge-case image examples to test set", done: false, category: "project", projectId: "nothotdog", projectName: "Not Hotdog", sessionId: "not-hotdog" },
  { id: "gt-6", text: "Retrain confidence score classifier", done: false, category: "project", projectId: "nothotdog", projectName: "Not Hotdog", sessionId: "not-hotdog" },

  // General / Ecosystem & Dev Ops
  { id: "gt-7", text: "Update SSL certificates on MyWebsite.com", done: false, category: "general" },
  { id: "gt-8", text: "Renew Apple Developer distribution certificates", done: false, category: "general" },
  { id: "gt-9", text: "Configure Sentry alerts for production crashes", done: false, category: "general" },
  { id: "gt-10", text: "Audit Supabase row level security policies", done: true, category: "general" },
];
```

#### Widget Definition in `ALL_WIDGETS`
```tsx
{
  id: "globalTodo",
  label: "Global To-Do",
  icon: <CheckSquare size={14} />,
  description: "Cross-project tasks & reminders",
}
```

#### `GlobalTodoContent` Component Features
1. **Top Summary Bar**:
   - Total open count pill (e.g., `6 open`) and completed count.
   - Progress percentage bar with mint accent (`#abefa3`).
   - Quick filter tabs: `All` | `Projects` | `General / Ops` | `Open Only`.
2. **Grouped Sections**:
   - **Project Sections**:
     - Grouped by project (`Pet Show and Tell`, `Not Hotdog`) with project glyph, framework tag, and an action button: *"Jump to Project →"* (calls `onNavigateProject(projectId)`).
   - **General Section**:
     - Labeled *"General & Infrastructure"*, featuring tasks like *"Update SSL certificates on MyWebsite.com"*.
3. **Interactivity**:
   - Toggle task completion: checkbox with animated checkmark, strikethrough, and muted text.
   - Delete task: subtle hover "×" button.
   - Quick Add: inline form at bottom with:
     - Text input (`placeholder="Add a new task or reminder..."`).
     - Scope selector dropdown / pill: `General` | `Pet Show and Tell` | `Not Hotdog`.
     - Add button / Enter key listener.

### Step 6: Widgets Gallery Modal & App-wide Wiring
- **Header Widgets Action**:
  - In `Header`, replace the `"Widgets gallery coming soon!"` scope notice with opening a new `WidgetsGalleryModal`.
  - The gallery modal showcases all available IDE widgets:
    - **Featured**: `Global To-Do` (prominently highlighted with live open task counter badge).
    - **Developer Tools**: `Terminal`, `EAS Build`, `Git`, `Search`, `Stylist`, `Extensions`.
    - **Diagnostics**: `Doctor`, `Problems`, `Timeline`, `Human Testing`.
    - **Emulators**: `Web Preview`, `Android`, `iOS`.
  - Clicking any widget opens its modal or dedicated view immediately.
- **Screen 1 IDE**:
  - `Global To-Do` automatically appears in `WidgetsPicker` via `ALL_WIDGETS`.
  - Selecting it opens the `WidgetModal` displaying `GlobalTodoContent`.
- **Project Home Screen**:
  - Add `Global To-Do` to `OP4MyWidgetsGrid` in `ProjectHomeScreen`.
  - Clicking it triggers `openModal("globalTodo", "Global To-Do")`.

---

## 4. Edge Cases & Failure Modes

- **No projects remaining edge case**: Only clickable projects (`pet` and `nothotdog`) are listed. If in tutorial demo mode, `tutorial-demo` is prepended as expected.
- **Task deletion handling**: Deleting all tasks in a category leaves a clean empty state with a *"No open items in this section"* notice and quick-add button.
- **Reduced Motion**: Mascot floating animation and progress transitions are disabled when `prefers-reduced-motion` is active.
- **Keyboard accessibility**: Modal can be closed via `Escape`, tasks can be added via `Enter`.

---

## 5. Verification Strategy

1. **Compilation Check**: Run `pnpm build` to verify clean TypeScript compilation and Vite bundling with zero errors.
2. **Homescreen UI Verification**:
   - Confirm mascot renders with floating animation and soft ambient glow.
   - Confirm Infiniti SVG symbol and "Infie" text are gone.
   - Confirm "Generate new Expo Project" has "Expo" underlined with proper offset.
   - Confirm button label is "Import Project" and opens the folder picker modal.
   - Confirm only "Pet Show and Tell" and "Not Hotdog" appear in the projects grid and are directly clickable.
3. **Widget Functionality Verification**:
   - Click "Widgets" in header → opens Widgets Gallery modal.
   - Click "Global To-Do" → opens Global To-Do widget modal.
   - Confirm items include "Update SSL certificates on MyWebsite.com" and project tasks for Pet Show and Tell / Not Hotdog.
   - Toggle items done/undone and observe counts updating.
   - Add a new custom task and verify it persists and updates the active count.
   - Click "Jump to Project →" and confirm navigation to project screen.
   - Open Screen 1 → verify "Global To-Do" is available in the right sidebar widgets picker.
   - Open Project Home → verify "Global To-Do" is present in the widgets grid.
*** End Patch
