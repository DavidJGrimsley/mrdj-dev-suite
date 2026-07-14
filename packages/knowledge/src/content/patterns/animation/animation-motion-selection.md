# Motion Implementation Selection

## Description

Animation work should start with intent, not library preference. This pattern
helps choose between simple platform transitions, Reanimated, Lottie, and
parallax or scroll-linked motion based on what the interface is trying to
communicate and how much performance budget the screen can afford.

It is seeded from layered landing-page motion in `time2pay` plus the
multi-layer scroll examples from the Quantum Jam project, where depth is used
intentionally instead of sprinkling animation across unrelated UI.

## When to Use

**Use this pattern** when:

- The user says an animation feels janky or unsatisfying.
- A screen mixes several animation styles and needs a cleaner implementation
  choice.
- You are deciding whether something should be a fade, a layout transition, a
  Reanimated interaction, a Lottie asset, or a parallax scene.
- A landing page or hero section wants layered depth, pinned scenes, or
  scroll-linked reveals.

## Motion Selection Matrix

### One-shot transition

Use for:
- Small enter/exit fades
- Simple banners, cards, and modals
- Brief route-adjacent transitions with low component count

Prefer:
- Platform or native transitions
- Lightweight Reanimated enter/exit helpers only when already in use nearby

Avoid:
- Rebuilding the whole screen around shared values just to fade a few elements

### Layout transition

Use for:
- Expanding sections
- Reordering compact content
- Small layout shifts that should feel connected

Prefer:
- Reanimated layout transitions when layout coupling is the main problem

Avoid:
- Running the same heavy layout animation on long repeated lists

### Gesture-driven motion

Use for:
- Drag, swipe, sheet, or scroll-coupled controls
- Motion that depends on continuous user input

Prefer:
- Reanimated on the UI thread

Avoid:
- JS-thread animation paths for tight gesture loops

### List-heavy motion

Use for:
- Large repeated rows
- Feed item enter/exit motion
- Repeated cards inside FlatList, FlashList, or mapped collections

Prefer:
- Simple, consistent motion with a clear budget
- Native or lightweight paths when the same animation repeats many times

Avoid:
- Many simultaneous animated rows with custom interpolation logic unless
  measured and justified

### Loading animation

Use for:
- Branded loops
- Focused status moments
- Empty/loading scenes that benefit from illustration

Prefer:
- Lottie for self-contained loops
- Small skeleton or opacity transitions for utilitarian loading states

Avoid:
- Large always-running animations across dense work screens

### Parallax or scroll-linked motion

Use for:
- Hero motion on landing pages
- Layered background depth
- Pinned scenes and product storytelling
- Scroll-linked reveals where depth helps orientation or emphasis

Prefer:
- Reanimated with a small number of meaningful layers
- Scene-level helpers that isolate interpolation logic
- Simpler web fallbacks when the full effect is not essential

Avoid:
- Turning every section into its own parallax rig
- Dense route files packed with many interpolations and animated rows

## Parallax Section

### Layered background motion

- Use a few strong layers with different depth speeds.
- Make sure each layer has a visual reason to exist.
- Keep decorative motion behind core content rather than fighting it.

### Pinned scenes

- Use when a section needs a short storytelling beat during scroll.
- Keep the pinned duration purposeful; long pinned scenes become work for the
  user if the content payoff is weak.

### Staggered depth

- Let foreground, midground, and background move at clearly different rates.
- Favor readable separation over tiny offsets across many elements.

### Budget rules

- Prefer roughly 3-5 layers in a scene before adding more.
- Be cautious when a single file accumulates many `interpolate()` calls or
  several `useAnimatedStyle()` blocks.
- Simplify sooner on web and on dense native screens than on a dedicated mobile
  hero section.
- Add a nearby motion/performance note when a heavy scene is intentional.

## Verification Checklist

- Classify each animation before changing its implementation.
- Verify the release build, not just debug mode.
- Check web fallback behavior if the scene is shared cross-platform.
- Confirm repeated rows are not doing the same expensive motion hundreds of
  times.
- Confirm parallax scenes still feel readable when motion is reduced or
  simplified.

## Related Guidance

- `mds://guides/animation-performance`
- `mds://skills/animation-motion`
- `mds://skills/debugging`
