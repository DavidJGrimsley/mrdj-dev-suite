import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Palette } from "lucide-react";

// B09 (style.md): a small, self-running preview of The Stylist. It shows what the real widget
// does: pick a color role, change its color, and watch the app preview restyle. It cycles the
// primary color on its own so the cause and effect are visible without any interaction.
// Floating tutorial styling: thin borders, transparent interiors, no backplate.

const ROLES = [
  { key: "background", color: "#1a1a1a", text: "#e5e5e5" },
  { key: "surface", color: "#252323", text: "#e5e5e5" },
  { key: "text", color: "#e5e5e5", text: "#1a1a1a" },
  { key: "primary", color: "", text: "#06201d" },
  { key: "secondary", color: "#7b9ab5", text: "#0b1620" },
  { key: "success", color: "#4ade80", text: "#06200f" },
  { key: "warning", color: "#fbbf24", text: "#2a1c00" },
] as const;

/** Primary colors the preview steps through (the first is the Stylist's default green). */
const PRIMARY_STEPS = ["#10b981", "#6366f1", "#f59e0b", "#ec4899"] as const;
const SWATCHES = ["#abefa3", "#6366f1", "#ef4444", "#f59e0b", "#a855f7", "#38bdf8", "#10b981", "#ec4899"] as const;
const STEP_MS = 1900;

const body = "'Rounded Mplus 1c', sans-serif";
const heading = "'Space Grotesk', sans-serif";
const hairline = "1px solid rgba(255,255,255,0.14)";

export function StylistPreview({ reducedMotion }: { reducedMotion: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % PRIMARY_STEPS.length), STEP_MS);
    return () => window.clearInterval(t);
  }, [reducedMotion]);
  const primary = PRIMARY_STEPS[step];
  const ease = { duration: reducedMotion ? 0 : 0.5, ease: "easeInOut" as const };

  return (
    <motion.div
      key="b09-stylist-preview"
      data-name="StylistStaticPreview"
      data-primary={primary}
      initial={{ opacity: 0, x: reducedMotion ? 0 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32 }}
      className="flex flex-col gap-3 px-4 py-3.5 rounded-[12px] w-full max-w-[350px] shrink-0 text-left"
      style={{ background: "transparent", border: "1px solid rgba(171, 239, 163, 0.38)", backdropFilter: "blur(6px)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Palette size={14} className="text-[#abefa3]" />
          <span style={{ fontFamily: heading, fontSize: 12.5, fontWeight: 700, color: "#abefa3" }}>The Stylist</span>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>writes style.md</span>
      </div>

      {/* Color roles */}
      <div className="flex flex-col gap-1.5">
        <span style={{ fontFamily: body, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Colors</span>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => {
            const isPrimary = r.key === "primary";
            return (
              <motion.span
                key={r.key}
                animate={{ backgroundColor: isPrimary ? primary : r.color }}
                transition={ease}
                className="px-2 py-[3px] rounded-[6px]"
                style={{
                  fontFamily: body,
                  fontSize: 10,
                  color: r.text,
                  border: isPrimary ? "1.5px solid #ffffff" : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: isPrimary ? "0 0 0 2px rgba(255,255,255,0.12)" : undefined,
                }}
              >
                {r.key}
              </motion.span>
            );
          })}
        </div>
      </div>

      {/* Selected role: swatch, hex and quick picks */}
      <div className="flex items-center gap-2.5">
        <motion.span animate={{ backgroundColor: primary }} transition={ease} className="size-9 rounded-[8px] shrink-0" style={{ border: hairline }} />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span style={{ fontFamily: "monospace", fontSize: 9.5, color: "rgba(255,255,255,0.45)" }}>primary · hex</span>
          <span className="px-2 py-1 rounded-[6px]" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#ffffff", border: hairline }}>
            {primary}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {SWATCHES.map((c) => (
          <span
            key={c}
            className="size-[18px] rounded-[5px] shrink-0 transition-shadow duration-300"
            style={{ backgroundColor: c, boxShadow: c === primary ? "0 0 0 2px #0a0814, 0 0 0 3.5px #ffffff" : undefined }}
          />
        ))}
      </div>

      {/* Live app preview restyled by the chosen colors */}
      <div className="flex flex-col gap-1.5">
        <span style={{ fontFamily: body, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Preview</span>
        <motion.div
          animate={{ borderColor: primary }}
          transition={ease}
          className="flex flex-col gap-1.5 px-3 py-2.5 rounded-[10px]"
          style={{ border: "1px solid", background: "transparent" }}
        >
          <span style={{ fontFamily: heading, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Display headline</span>
          <span style={{ fontFamily: body, fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.45 }}>
            Readable body copy for product screens, onboarding, and settings.
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <motion.span animate={{ backgroundColor: primary }} transition={ease} className="px-2.5 py-[3px] rounded-full" style={{ fontFamily: body, fontSize: 10, fontWeight: 700, color: "#06201d" }}>
              primary
            </motion.span>
            {ROLES.filter((r) => ["secondary", "success", "warning"].includes(r.key)).map((r) => (
              <span key={r.key} className="px-2.5 py-[3px] rounded-full" style={{ fontFamily: body, fontSize: 10, fontWeight: 700, backgroundColor: r.color, color: r.text }}>
                {r.key}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span style={{ fontFamily: body, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Typography</span>
        <span className="px-2 py-[3px] rounded-[6px]" style={{ fontFamily: body, fontSize: 11, color: "rgba(255,255,255,0.85)", border: hairline }}>Rounded Mplus 1c</span>
      </div>
    </motion.div>
  );
}
