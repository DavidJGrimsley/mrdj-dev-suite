import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { GripHorizontal } from "lucide-react";

// Widgets & Whatnot: arranging is demonstrated on a small sample layout, so the user's own
// widgets (and their music player) never move. A sample widget travels from the right
// column to the bottom panel and back; reduced motion shows the two placements side by side.

const MOVE_INTERVAL_MS = 2200;

type Slot = "right" | "bottom";

function SampleWidget({ label, highlight = false }: { label: string; highlight?: boolean }) {
  return (
    <div
      className="flex flex-col w-full h-full rounded-[5px] overflow-hidden"
      style={{
        background: highlight ? "rgba(45, 212, 191, 0.14)" : "rgba(255, 255, 255, 0.04)",
        border: highlight ? "1px solid rgba(45, 212, 191, 0.7)" : "1px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <div
        className="flex items-center gap-1 px-1.5 py-[3px] shrink-0"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
      >
        <GripHorizontal size={9} className={highlight ? "text-[#2dd4bf]" : "text-white/35"} />
        <span
          style={{
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            fontSize: 8.5,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: highlight ? "#2dd4bf" : "rgba(255, 255, 255, 0.55)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function SampleLayout({ slot, animate }: { slot: Slot; animate: boolean }) {
  const moving = (
    <motion.div
      key="moving"
      layout={animate}
      layoutId={animate ? "widget-arrange-demo-moving" : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="w-full h-full"
    >
      <SampleWidget label="Explorer" highlight />
    </motion.div>
  );
  return (
    <div
      className="grid gap-1.5 w-[min(220px,38vw)] h-[124px] p-1.5 rounded-[8px] shrink-0"
      style={{
        gridTemplateColumns: "1fr 1.6fr 1fr",
        gridTemplateRows: "1fr 0.62fr",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "rgba(0, 0, 0, 0.2)",
      }}
    >
      <div style={{ gridColumn: 1, gridRow: "1 / span 2" }}>
        <SampleWidget label="Tasks" />
      </div>
      <div
        className="flex items-center justify-center rounded-[5px]"
        style={{ gridColumn: 2, gridRow: 1, border: "1px dashed rgba(45, 212, 191, 0.3)" }}
      >
        <span style={{ fontFamily: "'Rounded Mplus 1c', sans-serif", fontSize: 8.5, color: "rgba(255,255,255,0.45)" }}>
          Chat
        </span>
      </div>
      <div style={{ gridColumn: 3, gridRow: 1 }}>{slot === "right" ? moving : null}</div>
      <div style={{ gridColumn: "2 / span 2", gridRow: 2 }}>{slot === "bottom" ? moving : null}</div>
    </div>
  );
}

export function WidgetArrangeDemo({ reducedMotion }: { reducedMotion: boolean }) {
  const [slot, setSlot] = useState<Slot>("right");

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => setSlot((s) => (s === "right" ? "bottom" : "right")), MOVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return (
    <div
      data-name="WidgetArrangeDemo"
      role="img"
      aria-label="A sample Explorer widget moving from the right column to the bottom panel"
      className="flex items-center gap-2"
    >
      {reducedMotion ? (
        <>
          <SampleLayout slot="right" animate={false} />
          <span aria-hidden="true" className="text-[#2dd4bf] text-[16px]">→</span>
          <SampleLayout slot="bottom" animate={false} />
        </>
      ) : (
        <SampleLayout slot={slot} animate />
      )}
    </div>
  );
}
