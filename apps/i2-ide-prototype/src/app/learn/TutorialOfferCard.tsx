import React from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { FloatingButton } from "../onboarding/FloatingPrimitives";
import { InfieHeroArtwork } from "../onboarding/OnboardingStage";
import { usePrefersReducedMotion } from "../widgets/infiePreferencesContext";

// First-time tutorial offers (Project & Session Flow, Widgets & Whatnot): a small card just
// under the header's right end, clear of the chat composer and the docked music player.
// Starting or dismissing it uses up the offer; every tutorial stays available from Learn.

export function TutorialOfferCard({
  title,
  onStart,
  onDismiss,
}: {
  title: string;
  onStart: () => void;
  onDismiss: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <motion.div
      role="dialog"
      aria-labelledby="tutorial-offer-title"
      data-testid="tutorial-offer"
      initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="i2-chat-scale fixed right-4 top-[68px] z-[61] flex items-start gap-3 w-[min(380px,calc(100vw-2rem))] px-3.5 py-3 rounded-[14px]"
      style={{
        background: "rgba(10, 8, 20, 0.9)",
        border: "1px solid rgba(45, 212, 191, 0.35)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
      }}
    >
      <InfieHeroArtwork reducedMotion={reducedMotion} size="sm" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p
            id="tutorial-offer-title"
            className="font-['Space_Grotesk',sans-serif] text-[13px] font-bold text-[#2dd4bf]"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss tutorial offer"
            className="p-0.5 text-white/45 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <p className="font-['Rounded_Mplus_1c',sans-serif] text-[12px] leading-[1.45] text-white/80">
          Want the tour? You can also find it in Learn whenever you're ready.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <FloatingButton type="button" variant="primary" onClick={onStart}>
            Start tour
          </FloatingButton>
          <FloatingButton type="button" variant="secondary" onClick={onDismiss}>
            Not now
          </FloatingButton>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Leaves a replay or a later tutorial in place; real state is kept. Top right under the header
 * (top left on narrow screens, clear of modal close buttons).
 */
export function ExitTutorialButton({ onExit }: { onExit: () => void }) {
  return (
    <button
      type="button"
      data-testid="exit-tutorial"
      onClick={onExit}
      className="fixed left-4 sm:left-auto sm:right-4 top-[68px] z-[61] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-['Space_Grotesk',sans-serif] text-[12px] font-semibold text-white/75 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60"
      style={{
        background: "rgba(10, 8, 20, 0.86)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        backdropFilter: "blur(10px)",
      }}
    >
      <X size={12} />
      Exit tutorial
    </button>
  );
}
