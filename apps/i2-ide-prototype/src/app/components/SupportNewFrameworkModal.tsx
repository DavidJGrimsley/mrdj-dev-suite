import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, X, Terminal, Send, Check } from "lucide-react";
import { PrototypeLimit } from "./PrototypeLimit";

export interface SupportNewFrameworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INFIE_SRC = "/assets/infie-form-mist.png";

const POPULAR_SUGGESTIONS = [
  "SvelteKit",
  "Flutter",
  "Astro",
  "Tauri",
  "SolidJS",
  "Qwik",
  "Ruby on Rails",
];

export function SupportNewFrameworkModal({
  isOpen,
  onClose,
}: SupportNewFrameworkModalProps) {
  const [step, setStep] = useState<"chat" | "limit">("chat");
  const [framework, setFramework] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("chat");
      setFramework("");
      const t = window.setTimeout(() => inputRef.current?.focus(), 150);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    const chosen = framework.trim() || "Custom framework";
    setFramework(chosen);
    setStep("limit");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {step === "chat" ? (
        <motion.div
          key="chat-step"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] text-left"
            style={{
              background:
                "linear-gradient(175deg, rgba(28, 25, 34, 0.96) 0%, rgba(14, 12, 18, 0.98) 100%)",
              border: "1px solid rgba(45, 212, 191, 0.35)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 36px rgba(45, 212, 191, 0.12)",
              backdropFilter: "blur(18px)",
            }}
          >
            {/* Ambient decorative aura */}
            <div
              aria-hidden="true"
              className="absolute -top-20 -left-20 size-48 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(45, 212, 191, 0.25) 0%, transparent 70%)",
                filter: "blur(32px)",
              }}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]"
                  style={{
                    background: "rgba(171, 239, 163, 0.12)",
                    border: "1px solid rgba(171, 239, 163, 0.4)",
                    color: "#abefa3",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <Sparkles size={12} />
                  <span>Infie · Framework Support</span>
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 rounded-[6px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Infie Chat Body */}
            <form onSubmit={handleContinue} className="p-6 flex flex-col gap-5">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 flex items-center justify-center size-14 rounded-[14px] bg-white/[0.04] border border-[#2dd4bf]/30">
                  <div
                    aria-hidden="true"
                    className="absolute inset-1 rounded-full pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, transparent 70%)",
                      filter: "blur(6px)",
                    }}
                  />
                  <img
                    src={INFIE_SRC}
                    alt="Infie"
                    className="relative z-10 size-11 object-contain select-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#2dd4bf",
                    }}
                  >
                    Infie
                  </span>
                  <div
                    className="px-4 py-3 rounded-[12px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(45, 212, 191, 0.35)",
                      backdropFilter: "blur(8px)",
                      color: "rgba(255, 255, 255, 0.94)",
                      fontFamily: "'Rounded Mplus 1c', sans-serif",
                      fontSize: 13.5,
                      lineHeight: 1.6,
                    }}
                  >
                    What framework would you like to use? We can optimize it as we go and submit
                    it to the Infinite Intelligence for a huge XP reward.
                  </div>
                </div>
              </div>

              {/* Framework input field */}
              <div className="flex flex-col gap-2 pt-1">
                <label
                  htmlFor="framework-name-input"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.7)",
                  }}
                >
                  Framework name
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="framework-name-input"
                    type="text"
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    placeholder="e.g. SvelteKit, Flutter, Astro, Tauri…"
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2dd4bf]/60 transition-colors text-sm"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.16)",
                      fontFamily: "'Rounded Mplus 1c', sans-serif",
                    }}
                  />
                </div>

                {/* Quick suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 11,
                      color: "rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    Suggestions:
                  </span>
                  {POPULAR_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setFramework(sug)}
                      className="px-2 py-0.5 rounded-[6px] transition-colors hover:bg-white/10 active:scale-95"
                      style={{
                        background:
                          framework.toLowerCase() === sug.toLowerCase()
                            ? "rgba(45, 212, 191, 0.2)"
                            : "rgba(255, 255, 255, 0.04)",
                        border:
                          framework.toLowerCase() === sug.toLowerCase()
                            ? "1px solid rgba(45, 212, 191, 0.5)"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                        color:
                          framework.toLowerCase() === sug.toLowerCase()
                            ? "#2dd4bf"
                            : "rgba(255, 255, 255, 0.7)",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 11,
                      }}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer action */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-white/50 hover:text-white/80 transition-colors"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] transition-all hover:opacity-90 active:scale-95"
                  style={{
                    background: "#2dd4bf",
                    color: "#06201d",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)",
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : (
        <PrototypeLimit
          key="limit-step"
          title="Prototype Limit"
          subtitle="Framework Optimizer Boundary"
          featureName={framework || "Custom Framework"}
          description={
            <span>
              Optimizing and training new framework support for{" "}
              <strong className="text-[#2dd4bf] font-semibold">
                {framework || "your requested framework"}
              </strong>{" "}
              requires a live workspace orchestrator daemon, native toolchain compilers, and the
              cloud training pipeline, which cannot run in this client-side prototype.
            </span>
          }
          rewardNote="You'll get a massive XP boost for contributing framework support to the Infinite Intelligence."
          environmentNote="Simulated browser sandbox · Local compiler orchestrator offline"
          primaryAction={{
            label: "Back to i² Home",
            onClick: onClose,
          }}
          secondaryAction={{
            label: "Try another framework",
            onClick: () => setStep("chat"),
          }}
          onClose={onClose}
          variant="modal"
        />
      )}
    </AnimatePresence>
  );
}
