// Sessions widget body. Shows full session cards while they fit; when there are more sessions
// than fit side by side, or the widget sits in a narrow side column, it switches to a list of
// simple cards (icon, name, status) that reveal the full card on hover.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";

export interface SessionCardData {
  id: string;
  name: string;
  branch: string;
  /** Status chip as shown in the full card. */
  status: ReactNode;
  agents: number;
  humanTasks: { done: number; total: number };
  agentTasks: { done: number; total: number };
  action?: { label: string; tone: "teal" | "amber"; testId?: string };
  onOpen: () => void;
  /** Tutorial callout. */
  highlight?: boolean;
  dataName?: string;
  testId?: string;
  statusTestId?: string;
}

const FULL_CARD_MIN_WIDTH = 290;
const FULL_CARD_MIN_HEIGHT = 168;
const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 140;
const POPOVER_WIDTH = 340;

function Stat({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="bg-[#0b0a15] flex flex-1 min-w-0 flex-col gap-[4px] px-[10px] py-[8px] rounded-[8px]">
      <p className="font-['Inter',sans-serif] font-semibold text-[#9ca3af] text-[9px] uppercase tracking-wide truncate">{label}</p>
      <div data-testid={testId} className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[13px] leading-tight min-w-0">{children}</div>
    </div>
  );
}

function FullCard({ s, icon, popover = false }: { s: SessionCardData; icon: ReactNode; popover?: boolean }) {
  const tone = s.action?.tone === "amber"
    ? "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)] text-[#f59e0b]"
    : "bg-[#2dd4bf] border-[#2dd4bf] text-[#061413]";
  return (
    <div
      data-name={popover ? undefined : s.dataName}
      data-testid={popover ? undefined : s.testId}
      data-session-card={s.id}
      role="button"
      tabIndex={0}
      onClick={s.onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") s.onOpen(); }}
      className={`relative bg-[#0b131d] flex flex-col gap-[12px] p-[14px] rounded-[12px] border cursor-pointer text-left hover:brightness-110 transition-all min-w-0 ${popover ? "w-full" : "flex-1 h-full"} ${s.highlight ? "infie-glow border-[#2dd4bf]" : "border-[rgba(255,255,255,0.1)]"}`}
    >
      <div className="flex items-center gap-[8px] w-full min-w-0">
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-['Inter',sans-serif] font-bold text-[#f3f4f6] text-[16px] leading-tight truncate">{s.name}</p>
          <p className="font-['Cousine',monospace] text-[#9ca3af] text-[11px] truncate">{"⊣"} {s.branch}</p>
        </div>
        {s.action && (
          <button
            type="button"
            data-testid={popover ? undefined : s.action.testId}
            onClick={(e) => { e.stopPropagation(); s.onOpen(); }}
            className={`flex gap-[6px] items-center px-[10px] py-[6px] rounded-[8px] border font-['Inter',sans-serif] font-semibold text-[11px] whitespace-nowrap hover:brightness-110 shrink-0 ${tone}`}
          >
            <Play size={11} fill="currentColor" />
            <span>{s.action.label}</span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-[6px] w-full">
        <div className="flex gap-[6px]">
          <Stat label="Status" testId={popover ? undefined : s.statusTestId}>{s.status}</Stat>
          <Stat label="Agents">{s.agents}</Stat>
        </div>
        <div className="flex gap-[6px]">
          <Stat label="Human Tasks">{s.humanTasks.done} / {s.humanTasks.total}</Stat>
          <Stat label="Agent Tasks">{s.agentTasks.done} / {s.agentTasks.total}</Stat>
        </div>
      </div>
    </div>
  );
}

export function SessionsPanel({
  sessions,
  icon,
  smallIcon,
  empty,
}: {
  sessions: SessionCardData[];
  /** Session glyph for the full card and the compact row. */
  icon: ReactNode;
  smallIcon: ReactNode;
  /** Shown when there are no sessions. */
  empty: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<{ id: string; rect: DOMRect } | null>(null);
  const timers = useRef<{ open: number; close: number }>({ open: 0, close: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => { window.clearTimeout(timers.current.open); window.clearTimeout(timers.current.close); }, []);

  const count = sessions.length;
  const gaps = Math.max(0, count - 1) * 6 + 20;
  // Before the first measurement assume the roomy layout so nothing flashes compact.
  const full = box.w === 0 || (box.w >= count * FULL_CARD_MIN_WIDTH + gaps && box.h >= FULL_CARD_MIN_HEIGHT);

  const scheduleOpen = (id: string, el: HTMLElement) => {
    window.clearTimeout(timers.current.close);
    window.clearTimeout(timers.current.open);
    timers.current.open = window.setTimeout(() => setHovered({ id, rect: el.getBoundingClientRect() }), HOVER_OPEN_MS);
  };
  const scheduleClose = () => {
    window.clearTimeout(timers.current.open);
    window.clearTimeout(timers.current.close);
    timers.current.close = window.setTimeout(() => setHovered(null), HOVER_CLOSE_MS);
  };
  const keepOpen = () => window.clearTimeout(timers.current.close);

  const hoveredSession = hovered ? sessions.find((s) => s.id === hovered.id) : undefined;
  let popoverStyle: React.CSSProperties | undefined;
  if (hovered) {
    const { rect } = hovered;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitsRight = rect.right + 8 + POPOVER_WIDTH <= vw - 8;
    const fitsLeft = rect.left - 8 - POPOVER_WIDTH >= 8;
    const left = fitsRight ? rect.right + 8 : fitsLeft ? rect.left - 8 - POPOVER_WIDTH : Math.max(8, Math.min(rect.left, vw - POPOVER_WIDTH - 8));
    // Beside the row when there is room, otherwise just above it.
    const top = fitsRight || fitsLeft ? Math.max(8, Math.min(rect.top - 20, vh - 230)) : Math.max(8, rect.top - 216);
    popoverStyle = { left, top, width: POPOVER_WIDTH };
  }

  return (
    <div
      ref={boxRef}
      data-sessions-layout={full ? "cards" : "compact"}
      className={`bg-[#252323] flex-1 min-h-0 min-w-0 p-[10px] ${full ? "flex gap-[6px] items-stretch justify-center" : "overflow-y-auto"}`}
      style={{ scrollbarWidth: "thin" }}
    >
      {count === 0 ? (
        <div className="size-full grid place-items-center">{empty}</div>
      ) : full ? (
        sessions.map((s) => <FullCard key={s.id} s={s} icon={icon} />)
      ) : (
        <div className="grid gap-[6px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))" }}>
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              data-name={s.dataName}
              data-testid={s.testId}
              data-session-card={s.id}
              data-compact="true"
              onClick={s.onOpen}
              onPointerEnter={(e) => { if (e.pointerType !== "touch") scheduleOpen(s.id, e.currentTarget); }}
              onPointerLeave={scheduleClose}
              onFocus={(e) => scheduleOpen(s.id, e.currentTarget)}
              onBlur={scheduleClose}
              className={`flex items-center gap-[8px] px-[10px] py-[8px] rounded-[9px] bg-[#0b131d] border text-left hover:brightness-125 transition-all min-w-0 ${s.highlight ? "infie-glow border-[#2dd4bf]" : "border-[rgba(255,255,255,0.1)]"}`}
            >
              <span className="shrink-0">{smallIcon}</span>
              <span className="flex-1 min-w-0 font-['Inter',sans-serif] font-semibold text-[#f3f4f6] text-[12px] truncate">{s.name}</span>
              <span data-testid={s.statusTestId} className="shrink-0 scale-[0.86] origin-right">{s.status}</span>
            </button>
          ))}
        </div>
      )}
      {hoveredSession && popoverStyle &&
        createPortal(
          <div
            data-session-popover={hoveredSession.id}
            className="fixed z-[60] rounded-[12px] shadow-[0_18px_50px_rgba(0,0,0,0.65)]"
            style={popoverStyle}
            onPointerEnter={keepOpen}
            onPointerLeave={scheduleClose}
          >
            <FullCard s={hoveredSession} icon={icon} popover />
          </div>,
          document.body,
        )}
    </div>
  );
}
