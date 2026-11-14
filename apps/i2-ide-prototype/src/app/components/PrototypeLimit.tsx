import React, { useEffect } from "react";
import { assetUrl } from "../assetUrl";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Compass,
  Sparkles,
  X,
  ArrowRight,
  Terminal,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export interface PrototypeLimitAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}

export interface PrototypeLimitProps {
  /** Primary headline for the limitation. Default: "Prototype Limit" */
  title?: string;
  /** Short context badge or subtitle */
  subtitle?: string;
  /** Specific feature name that triggered this boundary */
  featureName?: string;
  /** Detailed description or explanation */
  description?: React.ReactNode;
  /** Technical or environmental reason explaining why this doesn't run */
  environmentNote?: string;
  /** Primary button action. Default: "Back to i² Home" (if onClose is given) */
  primaryAction?: PrototypeLimitAction;
  /** Optional secondary button action */
  secondaryAction?: PrototypeLimitAction;
  /** List of suggested wired alternatives the user can explore */
  suggestedActions?: PrototypeLimitAction[];
  /** Close or dismiss callback */
  onClose?: () => void;
  /** Presentation style: "modal" overlay or "inline" card. Default: "modal" */
  variant?: "modal" | "inline";
  /** Custom container class */
  className?: string;
  /** Whether to show the reassuring Infie mascot. Default: true */
  showInfie?: boolean;
  /** Optional XP or rewards highlight note */
  rewardNote?: string;
}

const INFIE_SRC = assetUrl("/assets/infie-form-mist.png");

export function PrototypeLimit({
  title = "Prototype Limit",
  subtitle = "Interactive Prototype Boundary",
  featureName,
  description = "You've reached a capability that requires a live workspace daemon, local file system bindings, or backend services not available in this browser prototype.",
  environmentNote = "Simulated browser environment · Live compilers & workspace daemons offline",
  primaryAction,
  secondaryAction,
  suggestedActions,
  onClose,
  variant = "modal",
  className = "",
  showInfie = true,
  rewardNote,
}: PrototypeLimitProps) {
  // Handle ESC key to dismiss if modal
  useEffect(() => {
    if (variant !== "modal" || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [variant, onClose]);

  const defaultPrimary: PrototypeLimitAction = primaryAction ?? {
    label: onClose ? "Back to i² Home" : "Understood",
    onClick: () => onClose?.(),
    variant: "primary",
  };

  const content = (
    <div
      data-name="PrototypeLimitCard"
      className={`relative w-full max-w-[500px] overflow-hidden rounded-[18px] text-left ${className}`}
      style={{
        background: "linear-gradient(175deg, rgba(26, 24, 30, 0.96) 0%, rgba(14, 12, 18, 0.98) 100%)",
        border: "1px solid rgba(45, 212, 191, 0.28)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), 0 0 32px rgba(45, 212, 191, 0.08)",
        backdropFilter: "blur(16px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Ambient decorative aura */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 size-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(45, 212, 191, 0.22) 0%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]"
            style={{
              background: "rgba(45, 212, 191, 0.12)",
              border: "1px solid rgba(45, 212, 191, 0.4)",
              color: "#2dd4bf",
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <Compass size={12} />
            <span>Prototype Limit</span>
          </span>
          {featureName && (
            <span
              className="text-white/45 text-xs truncate max-w-[200px]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              · {featureName}
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-[6px] text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Body content */}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {showInfie && (
            <div className="relative shrink-0 flex items-center justify-center size-14 rounded-[14px] bg-white/[0.03] border border-white/10">
              <div
                aria-hidden="true"
                className="absolute inset-1 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, transparent 70%)",
                  filter: "blur(6px)",
                }}
              />
              <img
                src={INFIE_SRC}
                alt="Infie mascot"
                className="relative z-10 size-11 object-contain select-none"
              />
            </div>
          )}
          <div className="flex flex-col gap-1 flex-1">
            <h3
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 12,
                  color: "#abefa3",
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: "'Rounded Mplus 1c', sans-serif",
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(255, 255, 255, 0.82)",
          }}
        >
          {typeof description === "string" ? <p>{description}</p> : description}
        </div>

        {/* Environment / Technical Notice */}
        {environmentNote && (
          <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-[10px]"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Terminal size={14} className="text-[#2dd4bf] shrink-0" />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.55)",
              }}
            >
              {environmentNote}
            </span>
          </div>
        )}

        {/* Reward or XP contribution note if provided */}
        {rewardNote && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[10px]"
            style={{
              background: "rgba(171, 239, 163, 0.08)",
              border: "1px solid rgba(171, 239, 163, 0.35)",
            }}
          >
            <Sparkles size={15} className="text-[#abefa3] shrink-0 mt-0.5" />
            <p
              style={{
                fontFamily: "'Rounded Mplus 1c', sans-serif",
                fontSize: 12,
                lineHeight: 1.5,
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {rewardNote}
            </p>
          </div>
        )}

        {/* Suggested actions (e.g. wired demo alternatives) */}
        {suggestedActions && suggestedActions.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.45)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Wired Prototype Experiences:
            </span>
            <div className="flex flex-col gap-1.5">
              {suggestedActions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center justify-between px-3 py-2 rounded-[8px] transition-colors hover:bg-white/[0.06] text-left"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <span
                    className="flex items-center gap-2 text-white/80 hover:text-white"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  <ArrowRight size={13} className="text-white/40" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-6 pb-6 pt-1 flex items-center justify-end gap-2.5">
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="px-4 py-2.5 rounded-[10px] transition-colors text-white/70 hover:text-white hover:bg-white/[0.06]"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {secondaryAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={defaultPrimary.onClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "#2dd4bf",
            color: "#06201d",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 0 20px rgba(45, 212, 191, 0.3)",
          }}
        >
          {defaultPrimary.icon}
          <span>{defaultPrimary.label}</span>
        </button>
      </div>
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}
