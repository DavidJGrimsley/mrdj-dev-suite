import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

// ─── Unboxed Floating UI Primitives ─────────────────────────────────────────
// Experience contract:
// - Floating means unboxed.
// - Messages and fields have thin borders and transparent interiors.
// - Buttons have a background and border.
// - No enclosing form card, chat panel, tutorial panel, message list, or outer
//   border/background around a group.
// - Keep text steady. Use negative space instead of adding a backplate.
// - Natural keyboard focus and button activation. No global key interception.

export interface FloatingInfieMessageProps {
  message: string;
  showContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  className?: string;
}

export function FloatingInfieMessage({
  message,
  showContinue = false,
  onContinue,
  continueLabel = "Continue",
  className = "",
}: FloatingInfieMessageProps) {
  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ background: "transparent", border: "none" }}
    >
      <div
        role="status"
        aria-live="polite"
        className="px-4 py-3 rounded-[12px] max-w-[540px]"
        style={{
          background: "transparent",
          border: "1px solid rgba(45, 212, 191, 0.34)",
          backdropFilter: "blur(6px)",
          color: "rgba(255, 255, 255, 0.92)",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {message}
      </div>
      {showContinue && onContinue && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-3 flex justify-center w-full"
        >
          <FloatingContinueButton onClick={onContinue} label={continueLabel} />
        </motion.div>
      )}
    </div>
  );
}

export function FloatingContinueButton({
  onClick,
  label = "Continue",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60 ${className}`}
      style={{
        background: "rgba(45, 212, 191, 0.14)",
        border: "1px solid rgba(45, 212, 191, 0.45)",
        color: "#2dd4bf",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <ArrowRight size={13} />
    </button>
  );
}

export interface FloatingFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const FloatingField = React.forwardRef<HTMLInputElement, FloatingFieldProps>(function FloatingField(
  {
    id,
    label,
    value,
    onChange,
    error,
    className = "",
    ...rest
  },
  ref
) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div
      className={`flex flex-col gap-1.5 ${className}`}
      style={{ background: "transparent", border: "none" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.72)",
          }}
        >
          {label}
        </label>
        {error && (
          <span
            id={errorId}
            role="alert"
            style={{
              fontFamily: "'Rounded Mplus 1c', sans-serif",
              fontSize: 11,
              color: "#f87171",
            }}
          >
            {error}
          </span>
        )}
      </div>
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="px-3.5 py-2.5 rounded-[10px] text-white placeholder-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50 transition-colors"
        style={{
          background: "transparent",
          border: error
            ? "1px solid rgba(248, 113, 113, 0.65)"
            : "1px solid rgba(255, 255, 255, 0.22)",
          fontFamily: "'Rounded Mplus 1c', sans-serif",
          fontSize: 13,
        }}
        {...rest}
      />
    </div>
  );
});

export interface FloatingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function FloatingButton({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...rest
}: FloatingButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60 ${className}`}
      style={{
        background: isPrimary ? "rgba(45, 212, 191, 0.18)" : "rgba(255, 255, 255, 0.06)",
        border: isPrimary
          ? "1px solid rgba(45, 212, 191, 0.5)"
          : "1px solid rgba(255, 255, 255, 0.2)",
        color: isPrimary ? "#2dd4bf" : "rgba(255, 255, 255, 0.88)",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        fontWeight: 600,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// Unboxed layout-only group helper: positions independent floating controls
// in negative space with zero card border, fill, or backplate.
export function FloatingControlGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-end gap-3 ${className}`}
      style={{ background: "transparent", border: "none", boxShadow: "none" }}
    >
      {children}
    </div>
  );
}
