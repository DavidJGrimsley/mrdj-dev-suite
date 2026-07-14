# Skill: Animation Motion

Use when reviewing, designing, or refactoring app motion, especially when the
user talks about smoothness, jank, Reanimated, Lottie, layout transitions,
scroll-linked motion, or parallax.

## Main rule

Classify the motion before changing the implementation. Always load the MDS
`animation-performance` guide before broad motion edits.

## Required classification

Classify each motion issue as one of:

- One-shot transition
- Layout transition
- Gesture-driven motion
- List-heavy motion
- Loading animation
- Parallax or scroll-linked motion

Call out parallax explicitly when it is present. Do not flatten it into generic
"animation".

## Checks

- Pull `get_guide animation-performance` before choosing libraries or rewriting
  motion across a screen.
- Identify whether the complaint is about timing/easing, too many animated
  elements, scroll coupling, layout churn, or web/native mismatch.
- Count the moving parts: repeated animated rows, multiple interpolated layers,
  pinned scenes, long-running loaders, and route-level layout transitions.
- Look for performance notes near heavy motion. If there is no note, assume the
  budget may be accidental.
- Prefer the smallest refactor that improves smoothness without resetting the
  whole visual language.

## Preferred structure

- Use native or platform transitions for simple large-scale repeated motion.
- Use Reanimated for gesture-driven work, layout-sensitive coordination, and
  intentional parallax or scroll-linked scenes.
- Use Lottie for self-contained branded loops or illustrations, not for every
  screen transition.
- Keep parallax focused on scenes that benefit from depth: hero sections,
  layered storytelling, pinned reveals, or orientation cues.
- Simplify motion on web or dense content screens sooner than on native
  marketing scenes.

## Example fix

- Problem: A landing page feels janky because multiple sections all run
  scroll-linked interpolations and repeated item fades from one large route
  file.
- Fix: Classify hero sections as parallax, simplify repeated rows to lighter
  transitions, move dense interpolation logic into focused helpers, and verify
  the release build before expanding the effect.

## Agent behavior

- Pull official Expo or React Native guidance for framework primitives when
  needed, then use MDS classification and performance rules to choose the
  implementation path.
- Output a motion inventory, the recommended implementation class for each
  animation, the likely jank source, and a short verification checklist.
- Treat parallax as a first-class motion decision with explicit budget and
  fallback thinking.
