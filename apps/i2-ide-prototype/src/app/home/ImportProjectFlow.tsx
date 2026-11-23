import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Folder, Send, Sparkles } from "lucide-react";
import { InfieHeroArtwork } from "../onboarding/OnboardingStage";
import { FloatingContinueButton } from "../onboarding/FloatingPrimitives";
import { RevealingInfieText, usePrefersReducedMotion } from "../widgets/infiePreferencesContext";
import {
  IMPORT_EXAMPLE_PURPOSE_ANSWER,
  IMPORT_FLAG_MESSAGE,
  IMPORT_FOLDER_LABEL,
  IMPORT_PROJECT_NAME,
  IMPORT_PURPOSE_QUESTION,
  IMPORT_SCAN_STEPS,
  IMPORT_SIMULATION_LINE,
  IMPORT_START_LINE,
  IMPORT_WORKSPACE_NAME,
  IMPORTED_FOLDERS,
} from "./importedProject";

interface ChatLine {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const POST_PURPOSE_LINES: ReadonlyArray<{ id: string; content: string }> = [
  { id: "simulation", content: IMPORT_SIMULATION_LINE },
  { id: "flag", content: IMPORT_FLAG_MESSAGE },
  { id: "start", content: IMPORT_START_LINE },
];

export function ImportProjectFlow({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"scan" | "chat">("scan");
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState(IMPORT_EXAMPLE_PURPOSE_ANSWER);
  const [locked, setLocked] = useState(false);
  // Index of the next post-purpose assistant line to append (0..POST_PURPOSE_LINES.length)
  const [postIndex, setPostIndex] = useState<number | null>(null);
  const [latestRevealedId, setLatestRevealedId] = useState<string | null>(null);
  const [readyToContinue, setReadyToContinue] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== "scan") return;
    if (step >= IMPORT_SCAN_STEPS.length) {
      const id = window.setTimeout(() => {
        setPhase("chat");
        setDraft(IMPORT_EXAMPLE_PURPOSE_ANSWER);
        setMessages([{ id: "purpose", role: "assistant", content: IMPORT_PURPOSE_QUESTION }]);
      }, reducedMotion ? 120 : 360);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(
      () => setStep((current) => current + 1),
      reducedMotion ? 100 : 380,
    );
    return () => window.clearTimeout(id);
  }, [phase, step, reducedMotion]);

  // Append post-purpose lines one at a time, waiting for each line's full reveal plus a short
  // readable pause (pausing if the tab is hidden), then show Continue instead of auto-jumping.
  useEffect(() => {
    if (postIndex === null) return;
    const latest = messages[messages.length - 1];
    if (!latest) return;
    const waitingForReveal = latest.role === "assistant" && latestRevealedId !== latest.id;
    if (waitingForReveal) return;

    const pauseMs =
      postIndex === 0
        ? (reducedMotion ? 100 : 320)
        : postIndex < POST_PURPOSE_LINES.length
          ? (reducedMotion ? 160 : 520)
          : (reducedMotion ? 80 : 280);

    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        if (document.hidden) return;
        if (postIndex < POST_PURPOSE_LINES.length) {
          const next = POST_PURPOSE_LINES[postIndex];
          setMessages((lines) =>
            lines.some((line) => line.id === next.id)
              ? lines
              : [...lines, { id: next.id, role: "assistant", content: next.content }],
          );
          setPostIndex(postIndex + 1);
        } else {
          setReadyToContinue(true);
        }
      }, pauseMs);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [postIndex, messages, latestRevealedId, reducedMotion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, phase, step, readyToContinue]);

  const handleMessageRevealComplete = useCallback((id: string) => {
    setLatestRevealedId(id);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text || locked || phase !== "chat") return;
    setLocked(true);
    setDraft("");
    setMessages((lines) => [...lines, { id: "answer", role: "user", content: text }]);
    setPostIndex(0);
  };

  const handleContinue = () => {
    if (finished.current) return;
    finished.current = true;
    onComplete();
  };

  return (
    <div data-testid="import-flow" className="size-full flex flex-col bg-[#0a0814] text-white">
      <div className="flex items-center gap-3 px-5 h-[54px] border-b border-white/10 shrink-0">
        <span className="font-['Space_Grotesk',sans-serif] text-[18px] font-bold tracking-tight">i²</span>
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white/70">Import {IMPORT_FOLDER_LABEL}</span>
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto text-[12px] text-white/60 hover:text-white cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center px-6 py-4 overflow-hidden">
        <div className="i2-chat-scale flex flex-col items-center w-full max-w-[540px] h-full min-h-0 gap-3">
          <div className="shrink-0">
            <InfieHeroArtwork reducedMotion={reducedMotion} size="sm" />
          </div>
          {phase === "scan" ? (
            <div data-testid="import-scan" className="flex flex-col gap-3 w-full">
              <p className="font-['Rounded_Mplus_1c',sans-serif] text-[14px] text-white/90">Infie is learning {IMPORT_PROJECT_NAME}</p>
              <div className="flex flex-col gap-1.5">
                {IMPORT_SCAN_STEPS.map((label, index) => (
                  <div key={label} className={`flex items-center gap-2 ${index <= step ? "opacity-100" : "opacity-25"}`}>
                    {index < step ? <CheckCircle2 size={14} className="text-[#abefa3]" /> : <Circle size={14} className="text-white/30" />}
                    <span className="font-['Rounded_Mplus_1c',sans-serif] text-[13px] text-white/80">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="i2-conversation-scroll flex-1 min-h-0 overflow-y-auto w-full flex flex-col gap-2">
                {messages.map((line, idx) => {
                  const mine = line.role === "user";
                  const isLatestAssistant = !mine && idx === messages.length - 1;
                  return (
                    <div key={line.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        data-testid={`import-message-${line.id}`}
                        className="max-w-[92%] px-3.5 py-2 rounded-[12px] font-['Rounded_Mplus_1c',sans-serif] text-[13px] leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: "transparent",
                          border: mine ? "1px solid rgba(171, 239, 163, 0.55)" : "1px solid rgba(45, 212, 191, 0.45)",
                          color: mine ? "#abefa3" : "rgba(255, 255, 255, 0.95)",
                        }}
                      >
                        {isLatestAssistant ? (
                          <RevealingInfieText
                            text={line.content}
                            live
                            onComplete={() => handleMessageRevealComplete(line.id)}
                          />
                        ) : (
                          line.content
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="w-full shrink-0 flex flex-col gap-2">
                {readyToContinue && (
                  <div className="flex justify-center pb-1">
                    <FloatingContinueButton
                      onClick={handleContinue}
                      label="Continue"
                    />
                  </div>
                )}
                {!locked && (
                  <div className="flex items-center gap-1.5 px-1 text-[11px] font-['Rounded_Mplus_1c',sans-serif] text-[#2dd4bf]/80">
                    <Sparkles size={12} className="shrink-0" />
                    <span>Example answer prefilled — edit or press Send</span>
                  </div>
                )}
                <div className="w-full flex gap-2 items-center">
                  <input
                    data-testid="import-reply"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") send();
                    }}
                    placeholder="Talk to Infie…"
                    disabled={locked}
                    className="flex-1 bg-transparent border border-[rgba(45,212,191,0.35)] rounded-[12px] px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none font-['Rounded_Mplus_1c',sans-serif]"
                  />
                  <button
                    type="button"
                    data-testid="import-send"
                    onClick={send}
                    disabled={locked || !draft.trim()}
                    aria-label="Send import reply"
                    className="w-9 h-9 rounded-full bg-[#abefa3] text-[#1d1b20] flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Explorer stand-in: every folder raises the prototype limit instead of opening a file. */
export function ImportedExplorer({ onOpen }: { onOpen: (what: string) => void }) {
  return (
    <div data-testid="imported-explorer" className="bg-[#252323] flex flex-col p-1 min-h-[120px]">
      <div className="flex items-center gap-2 px-2 py-1">
        <Folder size={12} className="text-[#abefa3]/70" />
        <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] truncate">{IMPORT_WORKSPACE_NAME}</span>
      </div>
      {IMPORTED_FOLDERS.map((folder) => (
        <button
          key={folder}
          type="button"
          data-explorer-folder={folder}
          onClick={() => onOpen(folder)}
          className="flex items-center gap-2 px-3 py-[5px] text-left hover:bg-white/5 cursor-pointer"
        >
          <Folder size={12} className="text-[#abefa3]/70 shrink-0" />
          <span className="font-['Rounded_Mplus_1c',sans-serif] text-[11px] text-[#c5c5c5] truncate">{folder}</span>
        </button>
      ))}
    </div>
  );
}
