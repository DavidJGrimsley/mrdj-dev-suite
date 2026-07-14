# Animation Performance Guide

Source: Expo blog, "The real cost of React Native animations: benchmarking
every approach" by App & Flow:
https://expo.dev/blog/the-real-cost-of-react-native-animations-benchmarking-every-approach

## Practical Guidance

- Measure animation cost in release builds before changing libraries. Debug
  builds can exaggerate overhead, especially for Reanimated.
- Library choice matters most for long-running animations, large animated lists,
  low-end Android devices, and screens with many simultaneously animated views.
- Library choice matters less for short one-shot transitions where animation
  work ends quickly and the component count is low.
- Prefer native/platform-driven animation paths for large repeated animations
  when the interaction does not require gesture coupling or complex shared
  values.
- Keep Reanimated for gesture-driven interactions, layout-sensitive motion, and
  complex UI-thread coordination.
- Animated view count is a budget. A single animated card is different from 100
  animated rows.
- Treat parallax as its own motion class, not just "fancier Reanimated". Use it
  when scroll depth supports a story: hero scenes, layered landing sections,
  pinned product reveals, or depth cues that help orientation.
- Keep parallax light when possible. A few clearly separated layers usually read
  better than many tiny offsets that all compete for attention.
- Scroll-linked scenes should simplify as they get denser:
  - Native mobile hero/marketing sections can afford a handful of animated
    layers when the screen is focused on that scene.
  - Dense content screens and long lists should prefer simpler fades,
    translations, or sticky section behavior over many interpolated layers.
  - Web should degrade earlier than native when the effect depends on frequent
    scroll interpolation across large sections.
- Large layered motion should have explicit budget notes nearby when it is
  intentional: what is animating, why parallax is worth it, and how it should
  simplify if performance drops.

## Parallax Budget Rules

- Prefer roughly 3-5 meaningful animated depth layers per scene before adding
  more complexity.
- Be cautious once a single file stacks many `interpolate()` calls, multiple
  `useAnimatedStyle()` blocks, or repeated scroll-linked rows.
- Do not combine heavy parallax, repeated list item motion, and broad layout
  transitions in the same screen unless you have measured the release build and
  confirmed it holds up.
- If web shares the same component tree, provide a simpler fallback when the
  full depth effect is not essential to comprehension.

## Doctor And Onboarding Rules

- Warn when route or list files animate many repeated items without an explicit
  performance note.
- Warn when parallax or scroll-linked scenes pile on many interpolation layers
  without a nearby motion/performance note.
- Warn when benchmark claims are based only on debug builds.
- Ask during onboarding whether the app has long-running, list-heavy, or
  gesture-heavy animation requirements.
- Ask whether hero sections or landing pages need parallax, pinned scenes, or
  layered depth effects so the implementation path is chosen intentionally.
