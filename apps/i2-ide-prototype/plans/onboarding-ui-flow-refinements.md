# Plan: Onboarding UI Flow Refinements (Message Stack, Button Placement, Floating Chat Dock, and Play Button Positioning)

## 1. Overview & Objectives
Refine the onboarding reveal presentation based on user feedback and screenshots:
1. **Button Placement**: Position all buttons (including `Continue`, `Submit`, and `Sign in with GitHub`) directly **under** Infie's text (in between the last message and any input field/illustration), eliminating side-placement.
2. **B04 Gate**: Remove the temporary `Continue` button from `B04` Turn 0 (*"Tell me a little about what you like to build and why"*). The user advances by typing and hitting `Send`.
3. **Floating Chat Input Dock**: After hitting `Send` in `B04`, animate the input field smoothly downward to dock near the bottom of the screen as an empty field + `Send` button (placeholder *"Talk to Infie…"*) to establish ongoing conversation capability.
4. **Message History Stack (Max 3 Messages)**: Display consecutive Infie messages stacked vertically under one another. When a 4th message arrives, animate the stack upward with the top (oldest) message sliding up and fading out into nothing.
5. **B05 Play Button Placement**: Adjust the initial spotlight position of the `Play` button to start to the **left** of the message stack rather than below it, completely preventing overlap with the message box.

---

## 2. Component-by-Component Specifications

### 2.1 Message History Stack & Button Placement (`src/app/onboarding/OnboardingStage.tsx` & `src/app/onboarding/FloatingPrimitives.tsx`)
- **Message Stack State**:
  - Maintain an array of messages `messageStack: Array<{ id: string; text: string }>` in `OnboardingStage`.
  - When `currentLine` updates (on turn or beat change), append `{ id: uid(), text: currentLine }` if it differs from the last message.
  - Restrict the displayed window to the latest 3 messages (`visibleMessages = messageStack.slice(-3)`).
- **Smooth Upward Slide Animation**:
  - Wrap the message list in a Framer Motion container with `layout` enabled.
  - Each message item renders as an unboxed bordered bubble (`1px solid rgba(45, 212, 191, 0.34)` with `backdrop-blur`).
  - When the 4th message arrives, the exiting 1st message animates out with:
    `exit={{ opacity: 0, y: -24, height: 0, marginTop: 0, transition: { duration: 0.35 } }}`.
  - Existing messages smoothly slide upward via `layout`, and the new message enters from below:
    `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}`.
- **Button Placement Below Messages**:
  - In `FloatingPrimitives.tsx`, update `FloatingInfieMessage` so `showContinue` renders the `FloatingContinueButton` **under** the message text (e.g. `mt-3 flex justify-center w-full`) instead of `sm:absolute sm:left-full`.
  - In `OnboardingStage.tsx`, ensure all action buttons (e.g. `Continue`, B02 `Submit` & `Sign in with GitHub`) are placed immediately below the message stack and above any active input field or illustration.

---

### 2.2 B04 Project Interest & Floating Chat Input Dock
- **Remove Continue on B04 Turn 0**:
  - In `OnboardingStage.tsx` (the cue-timed effect for `B04`):
    - `turnIndex === 0`: reveal only `project_interest_reply`. Do NOT reveal `continue_button`.
    - `turnIndex === 1`: reveal `continue_button` under the new message (*"I actually don't do much coding myself..."*).
- **Docking Animation to Bottom**:
  - In `OnboardingStage.tsx`, track `chatDocked: boolean` (starts `false`).
  - When the user submits their project interest (hits `Send` or presses `Enter` in `B04` Turn 0):
    1. Store the trimmed interest in `localStorage` (`i2.onboarding.interest`).
    2. Set `chatDocked = true`.
    3. Clear the input draft so the field becomes empty.
    4. Advance `turnIndex = 1`.
  - The chat input container animates with Framer Motion:
    - **Undocked (`chatDocked === false`)**: renders in the stage flow under the message/buttons.
    - **Docked (`chatDocked === true`)**: renders fixed near the bottom (`fixed bottom-7 inset-x-0 mx-auto w-full max-w-xl z-40 px-4`), with smooth layout/position transition (`transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] }`).
    - Placeholder changes to *"Talk to Infie…"*, allowing the user to see that an interactive conversation field is now available at the bottom of the screen.

---

### 2.3 B05 Music Play Button Spotlight Placement (`src/app/onboarding/LeekBeatsWidget.tsx`)
- **Initial Spotlight Position (To the Left of Messages)**:
  - Currently: `spotlightLeft = vw / 2 - 62`, which centers the button directly under the message box and overlaps its bottom border.
  - New formula:
    - Message box has `max-w-[540px]` (half-width = `270px`).
    - Place the Play button to the left of the message box:
      `spotlightLeft = Math.round(vw / 2 - 270 - 75)` (e.g. `left: ~295px` on a 1280px screen).
      `spotlightBottom = Math.max(180, Math.round(vh - 380))`.
    - At this position, the Play button sits completely to the left of the message box with zero vertical or horizontal overlap!
- **Infie Gesture Direction**:
  - In `OnboardingStage.tsx`, during `B05` Turn 0 (`pointingToPlay`), Infie tilts and gestures leftward toward the Play button (`x: -36, y: 10, rotate: -10`).
- **Turn 1 Assembly & Docking**:
  - Clicking Play starts real audio synchronously.
  - On Turn 1 (*"Oh yea, that's my jam. Your music player lives right here"*), `Prev`, `Next`, and `LeekBeats` label assemble around Play at the left-spotlight position, hold for `750ms`, and then smoothly glide down-left into the corner dock (`left: 24px, bottom: 24px`).

---

## 3. Verification Strategy

We will update the Playwright test suite in `/tmp/pw/refinements_test.mjs` running against `http://localhost:3000/`:
1. **Button Placement**:
   - Check that the `Continue` button at `B03` Turn 1 has its Y coordinate greater than the message box bottom (`btn.y >= msgBox.y + msgBox.height`).
2. **B04 Turn 0 No Continue**:
   - Verify that during `B04` Turn 0, `getByRole("button", { name: "Continue" })` has `count() === 0`.
3. **Chat Input Docking**:
   - In `B04` Turn 0, type *"Mobile games"* and click `Send`.
   - Verify the input field glides down and its Y coordinate is near the viewport bottom (`y > 700px` on an 800px viewport).
   - Verify the input becomes empty with placeholder *"Talk to Infie…"*.
4. **Message Stack (Max 3 with Upward Slide)**:
   - Progress through B01 → B02 → B03 (2 messages) → B04 (2 messages).
   - Assert that exactly 3 message bubbles are visible in the DOM at any time once 3+ lines have been spoken.
   - Assert that when the 4th message arrives, the oldest message slides upward and exits via opacity fade.
5. **Play Button Non-Overlap**:
   - In `B05` Turn 0, sample the bounding boxes of the message box and the `Play` button.
   - Assert `playBox.x + playBox.width <= msgBox.x - 10` (strictly to the left, zero overlap).
   - Click Play; verify audio starts and glides to `left: 24px, bottom: 24px`.
6. **Build**: Run `mise exec -- npm run build` and ensure exit code `0`.
