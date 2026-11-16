import type { TegakiPlugin } from "tegaki/core";

/** Add 200ms of wall-clock breathing room after the quote's first semicolon. */
export function quoteSemicolonPause(speed: number): TegakiPlugin {
  return {
    name: "quote-semicolon-pause",
    timing({ strokes, duration }) {
      const semicolon = strokes.find(stroke => stroke.entry.char === ";");
      if (!semicolon) return;
      // Tegaki's timeline is divided by playback speed, so scale the added gap.
      const pause = 0.2 * speed;
      return {
        strokes: strokes.map(stroke => ({
          start: stroke.start + (stroke.entryIndex > semicolon.entryIndex ? pause : 0),
          duration: stroke.duration,
        })),
        duration: duration + pause,
      };
    },
  };
}
