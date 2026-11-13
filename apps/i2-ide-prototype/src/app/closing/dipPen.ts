import type { StrokeTime, TegakiFrame, TegakiPaintContext, TegakiPlugin } from "tegaki/core";
import type { ClosingConfig } from "./closingConfig";
import penSvg from "./assets/dip-pen.svg?raw";

export interface PenPoint { x: number; y: number }
export interface PenPosition {
  state: "penDown" | "travel" | "held";
  point: PenPoint;
  from: PenPoint;
  to: PenPoint;
  progress: number;
  lift: number;
  start: number;
  end: number;
  previousStroke: string | null;
  nextStroke: string | null;
}

/** A pen-up flight between actual stroke endpoints; this paints no ink. */
export function penTravel(from: PenPoint, to: PenPoint, progress: number): Pick<PenPosition, "point" | "from" | "to" | "progress" | "lift"> {
  const u = Math.max(0, Math.min(1, progress));
  const ease = u * u * (3 - 2 * u);
  const lift = Math.sin(Math.PI * u) * Math.min(18, Math.hypot(to.x - from.x, to.y - from.y) * 0.07);
  return { point: { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease - lift }, from, to, progress: u, lift };
}

/** Read the same placed/timed paths that Tegaki uses to draw the current ink. */
export function penPosition(frame: TegakiFrame): PenPosition | null {
  const active = frame.active[0];
  if (active) return { state: "penDown", point: active.head, from: active.path.pointAt(0), to: active.path.pointAt(1),
    progress: active.progress, lift: 0, start: active.start, end: active.start + active.duration,
    previousStroke: active.id, nextStroke: active.id };
  let previous: TegakiFrame["strokes"][number] | undefined;
  let next: TegakiFrame["strokes"][number] | undefined;
  for (const stroke of frame.strokes) {
    if (stroke.start + stroke.duration <= frame.time + 1e-9 && (!previous || stroke.start + stroke.duration > previous.start + previous.duration)) previous = stroke;
    if (stroke.start >= frame.time && (!next || stroke.start < next.start)) next = stroke;
  }
  if (previous && next) {
    const start = previous.start + previous.duration;
    const end = next.start;
    return { state: "travel", ...penTravel(previous.path.pointAt(1), next.path.pointAt(0), end > start ? (frame.time - start) / (end - start) : 1),
      start, end, previousStroke: previous.id, nextStroke: next.id };
  }
  const held = previous ?? next;
  if (!held) return null;
  const point = held.path.pointAt(previous ? 1 : 0);
  return { state: "held", point, from: point, to: point, progress: previous ? 1 : 0, lift: 0,
    start: held.start, end: held.start + held.duration, previousStroke: previous?.id ?? null, nextStroke: next?.id ?? null };
}

export function drawDipPen(ctx: CanvasRenderingContext2D, image: HTMLImageElement, appearance: ClosingConfig["pen"], point: PenPoint) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(appearance.angle);
  ctx.scale(appearance.length / 115, appearance.length / 115);
  ctx.drawImage(image, -10, -115, 20, 115);
  ctx.restore();
}

/** The nib's exact drawing tip is local (0, 0); everything else extends upward. */
export function dipPenPlugin(
  appearance: ClosingConfig["pen"],
  observe: (paint: TegakiPaintContext, image: HTMLImageElement | null) => void,
  onError?: (error: Error) => void,
): TegakiPlugin {
  let loadedImage: HTMLImageElement | null = null;
  let retimed: { ids: string[]; strokes: StrokeTime[]; duration: number } | null = null;
  return {
    name: "napoleon-hill-dip-pen",
    timing({ strokes, duration }) {
      if (!strokes.length) return;
      // Reserve real travel in the engine's own timeline. Preserve that first
      // schedule across reflow so resizing never rewinds a partly written word.
      if (retimed && retimed.ids.length === strokes.length && strokes.every((stroke, i) => stroke.id === retimed!.ids[i])) return retimed;
      let previousOldEnd = 0;
      let previousNewEnd = 0;
      const times = strokes.map((stroke, i) => {
        const previous = strokes[i - 1];
        const distance = previous ? Math.hypot(stroke.path.pointAt(0).x - previous.path.pointAt(1).x, stroke.path.pointAt(0).y - previous.path.pointAt(1).y) : 0;
        const gap = previous ? Math.max(stroke.start - previousOldEnd, 0.11, distance / 650) : stroke.start;
        const start = previousNewEnd + gap;
        previousOldEnd = stroke.start + stroke.duration;
        previousNewEnd = start + stroke.duration;
        return { start, duration: stroke.duration };
      });
      retimed = { ids: strokes.map(stroke => stroke.id), strokes: times, duration: previousNewEnd + Math.max(0, duration - previousOldEnd) };
      return retimed;
    },
    attach({ redraw }) {
      if (!appearance.visible) return;
      let live = true;
      let objectUrl: string | null = null;
      const image = new Image();
      const releaseUrl = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      };
      const fail = () => {
        if (!live) return;
        loadedImage = null;
        releaseUrl();
        onError?.(new Error("The pen illustration could not load. Reload to try again."));
      };
      try {
        if (!CSS.supports("color", appearance.barrel) || !CSS.supports("color", appearance.brass)) throw new Error("Invalid pen color");
        // Edit designated attributes on the actual asset, never interpolate
        // configuration into XML. The parsed/serialized SVG is cached per plugin.
        const document = new DOMParser().parseFromString(penSvg, "image/svg+xml");
        if (document.querySelector("parsererror")) throw new Error("Invalid pen SVG");
        document.querySelectorAll("[data-pen-barrel]").forEach(stop => stop.setAttribute("stop-color", appearance.barrel));
        document.querySelectorAll("[data-pen-brass-stop]").forEach(stop => stop.setAttribute("stop-color", appearance.brass));
        document.querySelectorAll("[data-pen-brass-fill]").forEach(shape => shape.setAttribute("fill", appearance.brass));
        const svg = new XMLSerializer().serializeToString(document.documentElement);
        objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        image.onload = () => {
          void image.decode().then(() => {
            if (!live) return;
            loadedImage = image;
            releaseUrl();
            redraw(); // Required even when playback is paused or controlled.
          }, fail);
        };
        image.onerror = fail;
        image.src = objectUrl;
      } catch {
        // Schedule errors after the engine constructor returns, so the host can
        // pause both initialized writers. Disposal cancels this callback too.
        queueMicrotask(fail);
      }
      return () => {
        live = false;
        loadedImage = null;
        image.onload = null;
        image.onerror = null;
        releaseUrl();
        image.removeAttribute("src");
      };
    },
    overlay(paint) {
      // One paper-wide overlay owns the illustration across both text hosts.
      // The ink still stays entirely in Tegaki's original rendering canvases.
      observe(paint, loadedImage);
    },
  };
}
