// Which build a simulator shows: a project (only choosable from i² Home) and, inside it,
// `main`, `test` or one of the project's sessions. The choice is shared by the inline preview
// widget, the Emulators screen and the enlarged simulator so they always agree.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GitBranch } from "lucide-react";

/** "main", "test", or a session id. */
export type SimTarget = string;

interface SimContextValue {
  targets: Record<string, SimTarget>;
  setTarget: (projectId: string, target: SimTarget) => void;
  /** Project picked in a simulator opened from i² Home. */
  homeProjectId: string | null;
  setHomeProjectId: (id: string) => void;
}

const SimContext = createContext<SimContextValue | null>(null);

export function SimulatorTargetProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<Record<string, SimTarget>>({});
  const [homeProjectId, setHomeProjectId] = useState<string | null>(null);
  const setTarget = useCallback((projectId: string, target: SimTarget) => {
    setTargets((all) => ({ ...all, [projectId]: target }));
  }, []);
  const value = useMemo(() => ({ targets, setTarget, homeProjectId, setHomeProjectId }), [targets, setTarget, homeProjectId]);
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSimulatorTargets(): SimContextValue {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("SimulatorTargetProvider is missing");
  return ctx;
}

/** Pet Show and Tell's web export is built for this path and served beside the prototype. */
export const PET_WEB_PREVIEW = {
  url: "/iSquared/preview/pet-show-and-tell/",
  probe: "/iSquared/preview/pet-show-and-tell/metadata.json",
  label: "Pet Show and Tell web preview",
} as const;

export interface SimOption {
  id: string;
  label: string;
  /** Sessions show the session glyph; branches (main/test) show a branch mark. */
  kind: "branch" | "session";
}

function PillSelect({
  value,
  options,
  onChange,
  ariaLabel,
  sessionIcon,
  leading,
  disabled = false,
  testId,
}: {
  value: string;
  options: SimOption[];
  onChange: (id: string) => void;
  ariaLabel: string;
  sessionIcon?: ReactNode;
  leading?: ReactNode;
  disabled?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  const current = options.find((o) => o.id === value) ?? options[0];
  const glyph = (o: SimOption | undefined, color: string) =>
    leading ?? (o?.kind === "session" ? sessionIcon : <GitBranch size={12} color={color} />);
  return (
    <div ref={ref} className="relative shrink-0 min-w-0">
      <button
        type="button"
        data-testid={testId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-[6px] h-[26px] px-[10px] rounded-[9px] max-w-[220px] transition-colors bg-[rgba(171,239,163,0.16)] text-[rgba(255,255,255,0.85)] ${disabled ? "cursor-default" : "hover:bg-[rgba(171,239,163,0.25)] cursor-pointer"}`}
      >
        <span className="shrink-0 flex items-center">{glyph(current, "rgba(255,255,255,0.7)")}</span>
        <span className="font-['Space_Grotesk',sans-serif] font-bold text-[13px] tracking-[-0.3px] truncate">{current?.label}</span>
        {!disabled && <ChevronDown size={12} className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div role="listbox" aria-label={ariaLabel} className="absolute left-0 top-full mt-1.5 z-[60] min-w-[200px] max-h-[300px] overflow-y-auto rounded-[10px] border border-white/10 bg-[#1a1818] py-1 shadow-2xl">
          {options.map((o) => {
            const isCurrent = o.id === current?.id;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                data-sim-option={o.id}
                onClick={() => { setOpen(false); onChange(o.id); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] font-['Space_Grotesk',sans-serif] transition-colors ${isCurrent ? "text-[#abefa3] bg-[#abefa3]/10 font-semibold" : "text-[#c5c5c5] hover:bg-white/5 hover:text-white"}`}
              >
                <span className="shrink-0 flex items-center">{glyph(o, isCurrent ? "#abefa3" : "rgba(255,255,255,0.5)")}</span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Project and session pickers for a simulator. The project picker only appears where no project
 * is implied (i² Home); the session picker is fixed to the current session on a Session screen.
 * They wrap onto their own row when the toolbar is narrow.
 */
export function SimulatorTargetPicker({
  projects,
  projectId,
  onProjectChange,
  options,
  value,
  onChange,
  locked = false,
  sessionIcon,
  projectIcon,
  className = "",
}: {
  /** Pass to show the project picker. */
  projects?: { id: string; name: string }[];
  projectId: string | null;
  onProjectChange?: (id: string) => void;
  options: SimOption[];
  value: SimTarget;
  onChange: (target: SimTarget) => void;
  /** Session screen: show the current session, no choice. */
  locked?: boolean;
  sessionIcon: ReactNode;
  projectIcon?: ReactNode;
  className?: string;
}) {
  return (
    <div data-testid="simulator-target-picker" className={`flex flex-wrap items-center gap-1.5 min-w-0 ${className}`}>
      {projects && projects.length > 0 && onProjectChange && (
        <PillSelect
          testId="simulator-project-select"
          ariaLabel="Project to simulate"
          value={projectId ?? projects[0].id}
          options={projects.map((p) => ({ id: p.id, label: p.name, kind: "branch" as const }))}
          onChange={onProjectChange}
          leading={projectIcon}
        />
      )}
      {options.length > 0 && (
        <PillSelect
          testId="simulator-session-select"
          ariaLabel={locked ? "Simulated session" : "Branch or session to simulate"}
          value={value}
          options={options}
          onChange={onChange}
          sessionIcon={sessionIcon}
          disabled={locked}
        />
      )}
    </div>
  );
}
