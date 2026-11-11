Use the existing i2 Designs file and attached screenshots as the visual source of truth. Bring the existing i2 Home, Project Home, Session, StatusChip, Session Card, InfieActionButton, and glowing-glass styles into this prototype.

Create a highly interactive clickable prototype, not a static mockup and not a production backend.

Core behavior:

The session status must drive the visible Infie action button. The user should be able to click the current primary action, review a checklist or result, and then see the session move to its next status with a new action button.

Use reusable Figma components and variants instead of drawing separate screens manually.

Required reusable components:

- SessionStatusCard
- StatusChip
- InfieModeChip
- SessionMeta
- InfieActionButton
- InfieActionRow
- HumanTestingChecklist
- PrototypeScopeNotice

Keep these concepts separate:

- Session status: READY, CODING, WAITING ON TEST, NEEDS YOU, REVIEW FIXES, FIXING, VERIFIED, PR OPEN, MERGED, COMPLETE, BLOCKED, PAUSED
- Infie mode: GUIDED
- Project name
- Session name
- Branch/worktree
- Task progress
- Agent count
- Current action

The `GUIDED` badge is Infie’s mode and must not be treated as a session status.

Use the existing glowing-glass action style:

- Dark translucent surface
- Rounded pill shape
- 1px colored stroke at 50% opacity
- Outer glow using the preset color
- Inner shadow using the same color at 25% opacity and 25px blur
- White title text
- Small leading icon
- Compact and Expanded variants
- 8px gap between buttons in horizontal action rows

Use these action colors:

- Teal: Infie’s recommended action
- Purple: read-only / inspect
- Blue: in progress / active
- Amber: needs attention / approval
- Red: blocked / failed
- Gray: disabled / unavailable

Use these runtime placeholders:

- `&` represents the session icon slot
- `#` represents the project icon slot
- `{session}` represents the live session name or branch
- `{project}` represents the live project name
- `{message}` represents an Infie-generated explanation or request
- `{status}` represents progress or current state

Do not render literal ampersand or hash characters in the final UI. Replace them with session and project icons.

Create these screens and routes:

1. i2 Home

Show active project cards for:

- My Portfolio
- Pet Show and Tell
- Task Tracker
- Basketball Courts
- Not Hotdog

Pet Show and Tell and Not Hotdog should be clickable and lead to their project screens.

The other project cards should not navigate to the same session screen. Clicking My Portfolio, Task Tracker, or Basketball Courts should show a clear modal or toast:

“This project is not wired into this prototype yet. Choose Pet Show and Tell or Not Hotdog to continue.”

Include buttons in that notice for:

- Open Pet Show and Tell
- Open Not Hotdog
- Close

2. Pet Show and Tell Project Home

Use the project name:

Pet Show and Tell

Show two session cards:

- Add Comments
  - Session: Add-comments
  - Status: WAITING ON TEST
  - Primary action: Test App
  - Progress: 4 / 12 tasks
  - Agents: 3

- Fix Reactions Bug
  - Session: fix-reaction-bug
  - Status: MERGED
  - Primary action: Check Project
  - Progress: 6 / 8 tasks
  - Agents: 2

Only Add Comments is a fully functional session route.

Clicking Fix Reactions Bug should show:

“This session is represented in the project view, but its detail flow is not part of this prototype yet. Choose Add Comments or Not Hotdog.”

Do not route Fix Reactions Bug to the Add Comments screen.

3. Add Comments Session

Create a full session screen using the existing i2 layout:

- Project sidebar
- Infie/session conversation area
- Agent tasks
- Human testing checklist
- Git/diff area
- Widgets/tools area
- Session metadata
- Status chip
- Infie GUIDED mode badge
- Dynamic action row

Initial state:

- Project: Pet Show and Tell
- Session: Add Comments
- Status: WAITING ON TEST
- Primary action: Test App
- Infie message: “Test the changes and add one more comment if you find an edge case.”

Use this transition flow:

WAITING ON TEST
→ click Test App
→ show preview/testing state

NEEDS YOU
→ click Record Testing
→ show human-testing checklist

VERIFIED
→ appears after the required checklist items are completed
→ primary action becomes Open PR

PR OPEN
→ click Review Changes
→ show pull request review state

MERGED
→ click Check Project
→ show post-merge validation state

COMPLETE
→ click What’s Next?
→ show completion message and suggested next work

Allow the user to check off human-testing items. The status should update only when the required items are complete.

Also include an optional failure path:

REVIEW FIXES
→ click Fix Problems
→ FIXING
→ click Continue
→ VERIFIED

4. Not Hotdog Project Home

Use the project name:

Not Hotdog

Create one functional session:

- Session: Improve Not Hotdog Classifier
- Description: Make the classifier better at edge cases.
- Initial status: READY
- Primary action: Start Session
- Progress: 0 / 7 tasks
- Agents: 1

Use the Silicon Valley “Not Hotdog” idea, but keep the UI professional and consistent with the rest of i2.

5. Not Hotdog Session

Create a full session detail screen using the same reusable Session component as Add Comments, but with different content.

Use this status/action flow:

READY
→ Start Session

CODING
→ Continue

WAITING ON TEST
→ Test App

NEEDS YOU
→ Record Testing

VERIFIED
→ Open PR

PR OPEN
→ Review Changes

MERGED
→ Check Project

COMPLETE
→ What’s Next?

The visible Infie messages should change with the state. Example messages:

READY:
“Ready to start improving the classifier.”

CODING:
“I’m adding edge-case image examples and updating the evaluation set.”

WAITING ON TEST:
“Test the classifier with a few images that are clearly not hot dogs.”

NEEDS YOU:
“Show and Tell: try three edge cases and record what the app predicts.”

VERIFIED:
“Verification passed. The classifier changes are ready for a pull request.”

PR OPEN:
“The pull request is open. Review the evaluation results before merging.”

MERGED:
“The classifier update merged. Run one final project check.”

COMPLETE:
“Not Hotdog classifier session complete. What would you like to improve next?”

Make the primary action button update after each click. Show a short simulated loading state when appropriate, then reveal the next status and action.

Prototype interaction rules:

- Clicking the primary action advances the functional session state.
- Secondary actions may open the relevant panel, checklist, diff, or simulated preview.
- Use local Figma prototype state or component variants. No backend is required.
- Do not send every session card to the same detail screen.
- Clearly mark nonfunctional cards with the prototype-scope notice.
- Keep the current project and session visible in every session detail screen.
- Preserve the glowing button style and use the correct session/project icons.
- Make status chips uppercase and action labels title case.
- Keep action rows compact, with one primary action and up to three secondary actions.

Create a small “Status Playground” area showing all status variants and their corresponding primary actions so the component can be reused later.

The final result should feel like the local i2 prototype: Infie observes the current state, presents one obvious next action, and the user can keep clicking through the work until the session reaches COMPLETE.