import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { FolderOpen } from "lucide-react";
import FigmaInfieActionButton from "../../imports/InfieActionButton";
import {
  WHATS_NEXT_DISSOLVE_MS,
  WHATS_NEXT_REDUCED_SCAN_MS,
  WHATS_NEXT_SCAN_MS,
  WHATS_NEXT_SCANNING_MESSAGE,
  WHATS_NEXT_USER_MESSAGE,
  whatsNextSummary,
  type WhatsNextDestination,
  type WhatsNextRecommendation,
  type WhatsNextScan,
} from "./whatsNext";

export type WhatsNextPhase = "idle" | "dissolving" | "scanning" | "proposed";

/**
 * Home What's Next: dissolve the idle buttons, Infie says she's scanning, then proposes.
 * Every scheduled step is tied to one run; unmounting, disabling, or a new run cancels the
 * old timers so a late callback can never bring back an earlier scan.
 */
export function useWhatsNextDiscovery({
  scan,
  enabled,
  reducedMotion,
  append,
}: {
  scan: WhatsNextScan;
  enabled: boolean;
  reducedMotion: boolean;
  append: (role: "user" | "assistant", content: string) => void;
}) {
  const [phase, setPhase] = useState<WhatsNextPhase>("idle");
  const scanRef = useRef(scan);
  scanRef.current = scan;
  const appendRef = useRef(append);
  appendRef.current = append;
  const runRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const cancel = useCallback(() => {
    runRef.current += 1;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => cancel, [cancel]);
  useEffect(() => {
    if (enabled) return;
    cancel();
    setPhase("idle");
  }, [enabled, cancel]);

  const start = useCallback(() => {
    if (!enabled || phase === "dissolving" || phase === "scanning") return;
    cancel();
    const run = runRef.current;
    const later = (ms: number, fn: () => void) => {
      timersRef.current.push(
        window.setTimeout(() => {
          if (runRef.current === run) fn();
        }, ms),
      );
    };
    setPhase("dissolving");
    appendRef.current("user", WHATS_NEXT_USER_MESSAGE);
    later(reducedMotion ? 0 : WHATS_NEXT_DISSOLVE_MS, () => {
      appendRef.current("assistant", WHATS_NEXT_SCANNING_MESSAGE);
      setPhase("scanning");
      later(reducedMotion ? WHATS_NEXT_REDUCED_SCAN_MS : WHATS_NEXT_SCAN_MS, () => {
        // Read the state as it is now, not as it was when What's Next was clicked.
        const result = scanRef.current;
        for (const line of result.lines) appendRef.current("assistant", line);
        appendRef.current("assistant", whatsNextSummary(result));
        setPhase("proposed");
      });
    });
  }, [enabled, phase, reducedMotion, cancel]);

  return { phase, start };
}

export function whatsNextDissolve(reducedMotion: boolean) {
  return reducedMotion
    ? { exit: { opacity: 0 }, transition: { duration: 0 } }
    : {
        exit: { opacity: 0, scale: 0.94, filter: "blur(6px)" },
        transition: { duration: WHATS_NEXT_DISSOLVE_MS / 1000, ease: "easeOut" as const },
      };
}

export function WhatsNextScanning({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.span
      key="whats-next-scanning"
      role="status"
      data-testid="home-whats-next-scanning"
      initial={{ opacity: 0 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
      exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.15, repeat: 0 } }}
      transition={reducedMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      className="inline-flex items-center gap-[6px] rounded-[999px] border border-[rgba(45,212,191,0.35)] bg-[rgba(17,40,37,0.75)] px-[14px] py-[8px] font-['Inter',sans-serif] text-[12px] font-semibold text-[#2dd4bf]"
    >
      ✦ Scanning open projects…
    </motion.span>
  );
}

function recommendationAriaLabel(r: WhatsNextRecommendation): string {
  const where = r.session ? `${r.session} in ${r.project}` : `${r.project} project home`;
  return `${r.actionLabel}: open ${where}. ${r.message}`;
}

export function WhatsNextProposals({
  recommendations,
  reducedMotion,
  onOpen,
}: {
  recommendations: WhatsNextRecommendation[];
  reducedMotion: boolean;
  onOpen: (destination: WhatsNextDestination) => void;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // The What's Next button that had focus dissolved; hand focus to the first suggestion.
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (!active || active === document.body) firstRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      key="whats-next-proposals"
      role="group"
      aria-label="Infie's suggestions"
      data-testid="home-whats-next-proposals"
      data-recommendation-count={recommendations.length}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
      className="flex flex-wrap gap-[8px] items-center justify-center"
    >
      {recommendations.map((r, i) => (
        <button
          key={r.id}
          ref={i === 0 ? firstRef : undefined}
          type="button"
          data-testid="home-recommendation"
          data-recommendation-id={r.id}
          data-destination-kind={r.destination.kind}
          data-destination-id={r.destination.kind === "session" ? r.destination.sessionId : r.destination.projectId}
          aria-label={recommendationAriaLabel(r)}
          onClick={() => onOpen(r.destination)}
          className="rounded-[999px] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2dd4bf]"
        >
          {r.session ? (
            <FigmaInfieActionButton
              preset={r.preset}
              density="Expanded"
              actionLabel={r.actionLabel}
              session={r.session}
              project={r.project}
              message={r.message}
              showProject={true}
            />
          ) : (
            <FigmaInfieActionButton
              preset={r.preset}
              density="Expanded"
              actionLabel={r.actionLabel}
              session={r.project}
              sessionIcon={<FolderOpen size={12} color="#ABEFA3" />}
              message={r.message}
              showProject={false}
            />
          )}
        </button>
      ))}
    </motion.div>
  );
}
