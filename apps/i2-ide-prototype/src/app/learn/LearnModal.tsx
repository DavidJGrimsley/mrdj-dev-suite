import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, useIsPresent } from "motion/react";
import { BookOpen, GraduationCap, Maximize2, Minimize2, Play, RotateCcw, X } from "lucide-react";
import { restoreFocus, trapTabKey } from "../components/focusTrap";
import { tutorialActionLabel } from "./tutorialCompletion";

/** Modal layers that can sit above Learn. */
const STACKED_LAYER = '[data-testid="prototype-limit-modal"]';

// ─── Learn ──────────────────────────────────────────────────────────────────
// The header's Learn button opens this modal from Home, Project Home or a Session. Tutorials
// lists every tutorial and starts it at its own beginning; Education is a prototype limit.

export type LearnTutorialId = "meet-infie" | "project-session" | "widgets" | "generate" | "import";

export const LEARN_TUTORIALS: ReadonlyArray<{ id: LearnTutorialId; title: string; summary: string }> = [
  {
    id: "meet-infie",
    title: "Meet Infie",
    summary: "Infie, how she works, controls, model setup, the header and i² Home. Ends on Home.",
  },
  {
    id: "project-session",
    title: "Project & Session Flow",
    summary: "The workspace and project files, Project Home, sessions, agents, tasks, review and completion.",
  },
  {
    id: "widgets",
    title: "Widgets & Whatnot",
    summary: "The widget gallery and how to open, arrange, expand, close and restore widgets.",
  },
  {
    id: "generate",
    title: "Generate a new project",
    summary: "Plan a new project with Jenny and follow it into its first Session.",
  },
  {
    id: "import",
    title: "Import project",
    summary: "Onboard an existing project: Infie asks what it's for, then starts the Sessions she finds.",
  },
];

interface LearnContextValue {
  open: () => void;
}

const LearnContext = createContext<LearnContextValue | null>(null);

export const LearnProvider = LearnContext.Provider;

/** Null outside the app shell (the header then falls back to its scope notice). */
export function useLearn(): LearnContextValue | null {
  return useContext(LearnContext);
}

const EMPTY_COMPLETED: ReadonlySet<LearnTutorialId> = new Set();

export function LearnModal({
  onClose,
  onStartTutorial,
  onOpenEducation,
  completedTutorials = EMPTY_COMPLETED,
}: {
  onClose: () => void;
  onStartTutorial: (id: LearnTutorialId) => void;
  onOpenEducation: () => void;
  completedTutorials?: ReadonlySet<LearnTutorialId>;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const firstTutorialRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Whatever opened Learn (the header's Learn button) gets focus back when Learn is dismissed.
  const [trigger] = useState<Element | null>(() =>
    typeof document === "undefined"
      ? null
      : document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : document.querySelector("[data-learn-trigger]"),
  );
  // Stays mounted through its exit animation; it must not keep trapping focus then.
  const isPresent = useIsPresent();

  const dismiss = () => {
    onClose();
    restoreFocus(trigger);
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    firstTutorialRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isPresent) return;
    const handler = (e: KeyboardEvent) => {
      // A layer opened from Learn (the Education prototype limit) owns the keyboard while it is up.
      if (document.querySelector(STACKED_LAYER)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        dismissRef.current();
      } else {
        trapTabKey(dialogRef.current, e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPresent]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="learn-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={dismiss}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-modal-title"
        tabIndex={-1}
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#1a1a1a] border border-white/8 rounded-[10px] shadow-2xl flex flex-col overflow-hidden ${
          fullscreen ? "fixed inset-3" : "w-[860px] max-w-full h-[580px] max-h-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#1d1b20] border-b border-white/5 shrink-0">
          <span id="learn-modal-title" className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white">
            Learn
          </span>
          <div className="flex items-center gap-2">
            {fullscreen ? (
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="text-[#555] hover:text-[#abefa3] transition-colors"
                title="Exit fullscreen"
                aria-label="Exit fullscreen"
              >
                <Minimize2 size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="text-[#555] hover:text-[#abefa3] transition-colors"
                title="Fullscreen"
                aria-label="Fullscreen"
              >
                <Maximize2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close Learn"
              className="text-[#555] hover:text-[#c5c5c5] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          {/* Left selector */}
          <nav
            aria-label="Learn sections"
            className="flex sm:flex-col gap-1 p-2 sm:w-[180px] shrink-0 border-b sm:border-b-0 sm:border-r border-white/5"
          >
            <button
              type="button"
              aria-current="page"
              className="flex items-center gap-2 px-3 py-2 rounded-[7px] text-left bg-[#abefa3]/10 text-[#abefa3] font-['Space_Grotesk',sans-serif] text-[12.5px] font-semibold"
            >
              <BookOpen size={14} />
              Tutorials
            </button>
            <button
              type="button"
              data-testid="learn-education"
              onClick={onOpenEducation}
              className="flex items-center gap-2 px-3 py-2 rounded-[7px] text-left text-[#c5c5c5] hover:bg-white/5 hover:text-white transition-colors font-['Space_Grotesk',sans-serif] text-[12.5px]"
            >
              <GraduationCap size={14} />
              Education
            </button>
          </nav>

          {/* Tutorials */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ul className="flex flex-col gap-2.5">
              {LEARN_TUTORIALS.map((tutorial, idx) => {
                const actionLabel = tutorialActionLabel(tutorial.id, completedTutorials);
                const isReplay = actionLabel === "Replay";
                return (
                <li key={tutorial.id}>
                  <button
                    ref={idx === 0 ? firstTutorialRef : undefined}
                    type="button"
                    data-testid={`learn-tutorial-${tutorial.id}`}
                    data-tutorial-action={actionLabel.toLowerCase()}
                    onClick={() => onStartTutorial(tutorial.id)}
                    className={`group w-full flex items-center gap-3 p-3.5 rounded-[8px] bg-[#252323] border border-white/5 hover:border-[#abefa3]/25 hover:bg-[#2a2828] focus-visible:outline-none focus-visible:ring-2 transition-all text-left ${
                      isReplay ? "focus-visible:ring-[#abefa3]" : "focus-visible:ring-[#2dd4bf]/60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-['Space_Grotesk',sans-serif] text-[13.5px] font-semibold text-white">
                        {tutorial.title}
                      </p>
                      <p className="font-['Rounded_Mplus_1c',sans-serif] text-[11.5px] leading-[1.5] text-white/55 mt-0.5">
                        {tutorial.summary}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-[7px] border font-['Space_Grotesk',sans-serif] text-[11.5px] font-semibold transition-colors ${
                        isReplay
                          ? "border-[#abefa3]/30 bg-[#abefa3]/15 text-[#abefa3] group-hover:bg-[#abefa3]/25 group-focus-visible:bg-[#abefa3]/25"
                          : "border-[#2dd4bf]/35 text-[#2dd4bf] group-hover:bg-[#2dd4bf]/10 group-focus-visible:bg-[#2dd4bf]/10"
                      }`}
                    >
                      {isReplay ? <RotateCcw size={11} /> : <Play size={11} />}
                      {actionLabel}
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
