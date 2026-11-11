import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { B12_BRIDGE_READ_MS, B12_SLIDE_MS, B12_SLIDE_EASE } from "./onboardingTiming";

type SlidePhase = "measure" | "center" | "slide" | "rest";

// B12: Infie's conversation appears centered (where the floating tutorial stack
// was), holds while the bridge line is read, then slides left to its Home chat
// position. The outer wrapper keeps the real layout box (measured untransformed);
// only the inner element moves. Every other mount renders in place, no slide.
export function HomeConversationSlide({
  slide,
  reducedMotion,
  className = "",
  innerClassName = "",
  style,
  children,
}: {
  slide: boolean;
  reducedMotion: boolean;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const shouldSlide = slide && !reducedMotion;
  const [phase, setPhase] = useState<SlidePhase>(shouldSlide ? "measure" : "rest");
  const [dx, setDx] = useState(0);

  useLayoutEffect(() => {
    if (!shouldSlide) return;
    const r = outerRef.current?.getBoundingClientRect();
    setDx(r ? Math.round(window.innerWidth / 2 - (r.left + r.width / 2)) : 0);
    setPhase("center");
    // Measure once on mount; the slide always ends at x: 0 even if the window resizes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "center") return;
    const t = window.setTimeout(() => setPhase("slide"), B12_BRIDGE_READ_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const animate =
    phase === "measure"
      ? { opacity: 0, x: 0 }
      : phase === "center"
      ? { opacity: 1, x: dx }
      : { opacity: 1, x: 0 };
  const transition =
    phase === "center"
      ? { x: { duration: 0 }, opacity: { duration: 0.45, ease: "easeOut" as const } }
      : phase === "slide"
      ? { x: { duration: B12_SLIDE_MS / 1000, ease: B12_SLIDE_EASE }, opacity: { duration: 0.2 } }
      : { duration: 0.25, ease: "easeOut" as const };

  return (
    <div ref={outerRef} data-name="HomeConversationEntry" data-slide-phase={phase} className={className} style={style}>
      <motion.div
        initial={slide ? { opacity: 0, x: 0 } : false}
        animate={animate}
        transition={transition}
        className={innerClassName}
      >
        {children}
      </motion.div>
    </div>
  );
}
