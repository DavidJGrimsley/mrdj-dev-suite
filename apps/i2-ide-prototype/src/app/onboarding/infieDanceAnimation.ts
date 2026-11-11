import { useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";

// ─── Infie Playful Dance Animation ──────────────────────────────────────────
// A lively, rhythmic 5-second bopping animation when music starts or changes track:
// - Playful side-to-side body sway
// - Bouncy vertical head-bobbing / beats
// - Joyful head tilts
// - Energetic squash-and-stretch that smoothly resolves to rest at 5.0s

export const INFIE_DANCE_KEYFRAMES = {
  x: [
    0, -14, 14, -12, 12, -16, 16, -12, 12, -14, 14, -8, 8, -4, 0,
  ],
  y: [
    0, -16, 6, -18, 4, -18, 6, -16, 4, -16, 6, -12, 4, -6, 0,
  ],
  rotate: [
    0, -12, 10, -12, 10, -14, 12, -10, 8, -12, 10, -6, 4, -2, 0,
  ],
  scale: [
    1, 1.12, 0.94, 1.1, 0.95, 1.14, 0.93, 1.08, 0.96, 1.1, 0.95, 1.06, 0.98, 1.02, 1,
  ],
};

export const INFIE_DANCE_TRANSITION = {
  duration: 5.0,
  ease: "easeInOut" as const,
  times: [
    0, 0.08, 0.16, 0.24, 0.32, 0.42, 0.52, 0.6, 0.68, 0.76, 0.84, 0.9, 0.94, 0.97, 1,
  ],
};

/**
 * Reusable hook to trigger and manage Infie's 5-second playful dance.
 * Automatically triggers the 5-second animation when `danceNonce` increments (> 0),
 * and returns whether Infie is currently dancing.
 */
export function useInfieDance(danceNonce = 0, reducedMotion = false) {
  const danceControls = useAnimationControls();
  const [isDancing, setIsDancing] = useState(false);

  useEffect(() => {
    if (danceNonce === 0 || reducedMotion) return;
    setIsDancing(true);

    danceControls.start({
      ...INFIE_DANCE_KEYFRAMES,
      transition: INFIE_DANCE_TRANSITION,
    });

    const timer = window.setTimeout(() => {
      setIsDancing(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [danceNonce, reducedMotion, danceControls]);

  return { danceControls, isDancing };
}
