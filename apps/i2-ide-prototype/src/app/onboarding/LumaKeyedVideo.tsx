import React, { useCallback, useEffect, useRef } from "react";

// The B06 transformation MP4s have a baked-in black background. Now that the stage
// background fades in beat by beat, that black would show as a box, so each frame is
// drawn to a canvas and black is keyed out: pixels at or below LO become transparent,
// pixels at or above HI stay fully opaque, and the soft glow in between is
// un-premultiplied so it keeps its brightness over any background.
const LO = 6;
const HI = 56;

export interface LumaKeyedVideoProps
  extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "className" | "style"> {
  /** Square display size in CSS px. */
  size: number;
  /** Receives the underlying <video> element (playback, events and timing stay on it). */
  videoRef?: (el: HTMLVideoElement | null) => void;
  className?: string;
  style?: React.CSSProperties;
  [dataAttr: `data-${string}`]: string | undefined;
}

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

export function LumaKeyedVideo({ size, videoRef, className = "", style, ...videoProps }: LumaKeyedVideoProps) {
  const videoElRef = useRef<FrameCallbackVideo | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElRef.current = el as FrameCallbackVideo | null;
      videoRef?.(el);
    },
    [videoRef]
  );

  useEffect(() => {
    const video = videoElRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(size * dpr));
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let stopped = false;
    let rafId = 0;
    let vfcId = 0;
    const span = HI - LO;

    const draw = () => {
      if (video.readyState < 2) return;
      ctx.clearRect(0, 0, px, px);
      ctx.drawImage(video, 0, 0, px, px);
      const frame = ctx.getImageData(0, 0, px, px);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const m = r > g ? (r > b ? r : b) : g > b ? g : b;
        if (m <= LO) {
          d[i + 3] = 0;
        } else if (m < HI) {
          const a = (m - LO) / span;
          d[i] = Math.min(255, r / a);
          d[i + 1] = Math.min(255, g / a);
          d[i + 2] = Math.min(255, b / a);
          d[i + 3] = a * 255;
        }
      }
      ctx.putImageData(frame, 0, 0);
    };

    const useFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const onFrame = () => {
      if (stopped) return;
      draw();
      if (useFrameCallback) vfcId = video.requestVideoFrameCallback!(onFrame);
      else rafId = window.requestAnimationFrame(onFrame);
    };
    if (useFrameCallback) vfcId = video.requestVideoFrameCallback!(onFrame);
    else rafId = window.requestAnimationFrame(onFrame);

    // Paint the first/settled frame even when no new frame callback fires.
    const paintNow = () => draw();
    video.addEventListener("loadeddata", paintNow);
    video.addEventListener("seeked", paintNow);
    video.addEventListener("ended", paintNow);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(rafId);
      if (useFrameCallback) video.cancelVideoFrameCallback?.(vfcId);
      video.removeEventListener("loadeddata", paintNow);
      video.removeEventListener("seeked", paintNow);
      video.removeEventListener("ended", paintNow);
    };
  }, [size]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, ...style }}>
      {/* The real video keeps playing (and stays in view for autoplay policies) but is not painted. */}
      <video
        ref={setVideo}
        {...videoProps}
        className="absolute inset-0 size-full object-contain pointer-events-none select-none"
        style={{ opacity: 0 }}
      />
      <canvas
        ref={canvasRef}
        data-name="KeyedVideoCanvas"
        aria-hidden="true"
        className="absolute inset-0 size-full pointer-events-none select-none"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
