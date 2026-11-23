import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  B12_BRIDGE_READ_MS,
  B12_RESIZE_HOLD_MS,
  B12_RESIZE_MS,
  B12_SLIDE_MS,
  B12_SLIDE_EASE,
} from "./onboardingTiming";
import { chatScale } from "../widgets/chatScale";

export type SlidePhase = "measure" | "center" | "resize" | "slide" | "rest";

export interface PredockChatBox {
  width: number;
  height: number;
  top: number;
}

// Handed from OnboardingStage (B11) to HomeConversationSlide (B12) so the chat
// starts at its real pre-dock geometry before smoothly resizing into the Home column.
let pendingPredockChatBox: PredockChatBox | null = null;

export function capturePredockChatBox(box: PredockChatBox | null): void {
  pendingPredockChatBox = box;
}

export function consumePredockChatBox(): PredockChatBox | null {
  const captured = pendingPredockChatBox;
  pendingPredockChatBox = null;
  return captured;
}

interface BoxGeometry {
  startW: number;
  startH: number;
  startX: number;
  startY: number;
  targetW: number;
  targetH: number;
  dx: number;
}

const ZERO_GEOMETRY: BoxGeometry = {
  startW: 0,
  startH: 0,
  startX: 0,
  startY: 0,
  targetW: 0,
  targetH: 0,
  dx: 0,
};

function computeGeometry(
  outerRect: DOMRect,
  captured: PredockChatBox | null,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): BoxGeometry {
  const safeScale = scale > 0 ? scale : 1;
  const targetW = Math.max(240, outerRect.width / safeScale);
  const targetH = Math.max(260, outerRect.height / safeScale);
  const dx = Math.round((viewportWidth / 2 - (outerRect.left + outerRect.width / 2)) / safeScale);

  const maxVisibleW = Math.max(240, (viewportWidth - 24) / safeScale);
  const maxVisibleH = Math.max(280, (viewportHeight - 76) / safeScale);
  const fallbackStartW = Math.min(576, maxVisibleW);
  const fallbackStartH = Math.min(maxVisibleH, Math.max(targetH + 64, (viewportHeight * 0.72) / safeScale));

  const startW = Math.min(
    maxVisibleW,
    Math.max(240, captured && captured.width > 120 ? captured.width / safeScale : fallbackStartW),
  );
  const startH = Math.min(
    maxVisibleH,
    Math.max(260, captured && captured.height > 200 ? captured.height / safeScale : fallbackStartH),
  );

  // Center the pre-dock width horizontally in the viewport relative to outerRect.left.
  const startX = Math.round((viewportWidth / 2 - outerRect.left) / safeScale - startW / 2);

  // Start vertically near the pre-dock stage top without pushing the box off-screen.
  const defaultTop = Math.min(32, Math.max(12, viewportHeight * 0.032));
  const desiredTop = captured ? captured.top : defaultTop;
  const rawStartY = (desiredTop - outerRect.top) / safeScale;
  const minY = (12 - outerRect.top) / safeScale;
  const maxY = (viewportHeight - 16 - startH * safeScale - outerRect.top) / safeScale;
  const startY = Math.round(
    minY <= maxY ? Math.max(minY, Math.min(maxY, rawStartY)) : 0,
  );

  return { startW, startH, startX, startY, targetW, targetH, dx };
}

// B12: Infie's conversation appears centered at its pre-dock size, animates resizing to its
// Home chat dimensions while centered, holds briefly while the bridge line is read, then slides
// left to its Home chat position. The outer wrapper keeps the real layout box (measured
// untransformed); only the inner element resizes and moves. Reduced motion skips straight to rest.
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
  const capturedRef = useRef<PredockChatBox | null | undefined>(undefined);
  const shouldSlide = slide && !reducedMotion;
  const [phase, setPhase] = useState<SlidePhase>(shouldSlide ? "measure" : "rest");
  const [geo, setGeo] = useState<BoxGeometry>(ZERO_GEOMETRY);

  // If reduced motion is enabled mid-animation, finish immediately in place.
  useEffect(() => {
    if (reducedMotion && phase !== "rest") {
      setPhase("rest");
    }
  }, [reducedMotion, phase]);

  useLayoutEffect(() => {
    if (!shouldSlide) {
      setPhase("rest");
      return;
    }
    if (capturedRef.current === undefined) {
      capturedRef.current = consumePredockChatBox();
    }
    const r = outerRef.current?.getBoundingClientRect();
    if (!r) {
      setPhase("rest");
      return;
    }
    setGeo(computeGeometry(r, capturedRef.current, window.innerWidth, window.innerHeight, chatScale()));
    setPhase("center");
    // Measure once on mount for the initial choreography; resize listener keeps it responsive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-measure target Home geometry if the viewport resizes before landing at rest.
  useEffect(() => {
    if (!shouldSlide || phase === "rest" || phase === "measure") return;
    const onResize = () => {
      const r = outerRef.current?.getBoundingClientRect();
      if (!r) return;
      setGeo(computeGeometry(r, capturedRef.current ?? null, window.innerWidth, window.innerHeight, chatScale()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [shouldSlide, phase]);

  // Phase progression: center -> resize (centered) -> slide (to x: 0) -> rest (responsive CSS).
  useEffect(() => {
    if (!shouldSlide) return;
    if (phase === "center") {
      const t = window.setTimeout(() => setPhase("resize"), B12_RESIZE_HOLD_MS);
      return () => window.clearTimeout(t);
    }
    if (phase === "resize") {
      const remainingBeforeSlide = Math.max(B12_RESIZE_MS, B12_BRIDGE_READ_MS - B12_RESIZE_HOLD_MS);
      const t = window.setTimeout(() => setPhase("slide"), remainingBeforeSlide);
      return () => window.clearTimeout(t);
    }
    if (phase === "slide") {
      const t = window.setTimeout(() => setPhase("rest"), B12_SLIDE_MS);
      return () => window.clearTimeout(t);
    }
  }, [shouldSlide, phase]);

  const animatingBox = phase === "center" || phase === "resize" || phase === "slide";
  const animate =
    phase === "measure"
      ? { opacity: 0, x: 0, y: 0 }
      : phase === "center"
      ? { opacity: 1, x: geo.startX, y: geo.startY, width: geo.startW, height: geo.startH }
      : phase === "resize"
      ? { opacity: 1, x: geo.dx, y: 0, width: geo.targetW, height: geo.targetH }
      : phase === "slide"
      ? { opacity: 1, x: 0, y: 0, width: geo.targetW, height: geo.targetH }
      : { opacity: 1, x: 0, y: 0, width: "100%", height: "auto" };

  const resizeEase = [0.22, 1, 0.36, 1] as const;
  const resizeSec = B12_RESIZE_MS / 1000;
  const transition =
    phase === "center"
      ? {
          x: { duration: 0 },
          y: { duration: 0 },
          width: { duration: 0 },
          height: { duration: 0 },
          opacity: { duration: 0.2, ease: "easeOut" as const },
        }
      : phase === "resize"
      ? {
          x: { duration: resizeSec, ease: resizeEase },
          y: { duration: resizeSec, ease: resizeEase },
          width: { duration: resizeSec, ease: resizeEase },
          height: { duration: resizeSec, ease: resizeEase },
          opacity: { duration: 0.2 },
        }
      : phase === "slide"
      ? {
          x: { duration: B12_SLIDE_MS / 1000, ease: B12_SLIDE_EASE },
          y: { duration: 0.2 },
          width: { duration: 0.2 },
          height: { duration: 0.2 },
          opacity: { duration: 0.2 },
        }
      : { duration: reducedMotion ? 0.15 : 0.25, ease: "easeOut" as const };

  return (
    <div
      ref={outerRef}
      data-name="HomeConversationEntry"
      data-slide-phase={phase}
      data-chat-resizing={phase === "resize" ? "true" : "false"}
      data-animating-box={animatingBox ? "true" : "false"}
      className={className}
      style={style}
    >
      <motion.div
        initial={shouldSlide ? { opacity: 0, x: 0, y: 0 } : false}
        animate={animate}
        transition={transition}
        className={innerClassName}
        style={animatingBox ? { overflow: "hidden" } : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}
