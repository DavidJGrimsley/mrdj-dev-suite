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

## Doctor And Onboarding Rules

- Warn when route or list files animate many repeated items without an explicit
  performance note.
- Warn when benchmark claims are based only on debug builds.
- Ask during onboarding whether the app has long-running, list-heavy, or
  gesture-heavy animation requirements.

