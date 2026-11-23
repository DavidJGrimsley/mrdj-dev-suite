import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, CircleAlert, CircleDot, FileText, Link2, ListTodo, Sparkles, User } from "lucide-react";
import {
  INFO_CHECKS,
  INFO_LINES,
  INFO_RESTING_STEP,
  INFO_TITLE,
  PROJECT_FILE_NAMES,
  PROJECT_FILE_STEP_MS,
  TODO_EVENTS,
  TODO_ITEMS,
  TODO_RESTING_STEP,
  TODO_SOURCE_LABELS,
  TODO_STEP_COUNT,
  type ProjectFileKind,
  type TodoSource,
} from "./projectFilePreviewData";

// B09 (info.md / todo.md): small, self-running previews in the same floating style as
// StylistPreview. They show what each file does instead of describing it:
//   info.md: Infie checks Session Agent plans against the project's vision and flags one that drifts.
//   todo.md: ideas, GitHub issues and info.md edits land as todos, and finished work gets checked off.
// Reduced motion: no timer, no slide-ins; each preview rests on its most telling, complete state.

const body = "'Rounded Mplus 1c', sans-serif";
const heading = "'Space Grotesk', sans-serif";
const mono = "monospace";
const hairline = "1px solid rgba(255,255,255,0.14)";
const GREEN = "#abefa3";
const TEAL = "#2dd4bf";
const AMBER = "#fbbf24";
const MUTED = "rgba(255,255,255,0.45)";

export type ProjectFilePreviewProps = {
  /** Which canonical project file to preview. */
  file: ProjectFileKind;
  /** Pass the stage's usePrefersReducedMotion() value: stops the cycle and all movement. */
  reducedMotion: boolean;
  /** Optional controlled step (e.g. to sync with narration or freeze for screenshots). Disables the timer. */
  step?: number;
};

export function ProjectFilePreview({ file, reducedMotion, step }: ProjectFilePreviewProps) {
  return file === "info" ? (
    <InfoPreview reducedMotion={reducedMotion} step={step} />
  ) : (
    <TodoPreview reducedMotion={reducedMotion} step={step} />
  );
}

function useStep(count: number, reducedMotion: boolean, controlled: number | undefined, resting: number) {
  const [auto, setAuto] = useState(0);
  const isControlled = controlled !== undefined;
  useEffect(() => {
    if (reducedMotion || isControlled) return;
    const t = window.setInterval(() => setAuto((s) => (s + 1) % count), PROJECT_FILE_STEP_MS);
    return () => window.clearInterval(t);
  }, [reducedMotion, isControlled, count]);
  if (isControlled) return ((Math.trunc(controlled) % count) + count) % count;
  return reducedMotion ? resting : auto;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: body, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
      {children}
    </span>
  );
}

function Shell({
  file,
  name,
  tag,
  icon,
  label,
  step,
  reducedMotion,
  children,
}: {
  file: ProjectFileKind;
  name: string;
  tag: string;
  icon: ReactNode;
  label: string;
  step: number;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      key={`b09-${file}-preview`}
      data-name={name}
      data-file={PROJECT_FILE_NAMES[file]}
      data-step={step}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      role="figure"
      aria-label={label}
      initial={{ opacity: 0, x: reducedMotion ? 0 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.32 }}
      className="flex flex-col gap-3 px-4 py-3.5 rounded-[12px] w-full min-w-0 max-w-[350px] shrink-0 text-left"
      style={{ background: "transparent", border: "1px solid rgba(171, 239, 163, 0.38)", backdropFilter: "blur(6px)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span style={{ fontFamily: heading, fontSize: 12.5, fontWeight: 700, color: GREEN }}>{PROJECT_FILE_NAMES[file]}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: MUTED }}>{tag}</span>
      </div>
      {children}
    </motion.div>
  );
}

/** The markdown "page": a hairline pane with a `# Title` line, like the file open in the editor. */
function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-[10px] min-w-0" style={{ border: hairline, background: "transparent" }}>
      <span className="break-words" style={{ fontFamily: heading, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
        <span aria-hidden="true" style={{ fontFamily: mono, color: MUTED, fontWeight: 400, marginRight: 6 }}>
          #
        </span>
        {title}
      </span>
      {children}
    </div>
  );
}

// ── info.md ──────────────────────────────────────────────────────────────────────────────

function InfoPreview({ reducedMotion, step: controlled }: { reducedMotion: boolean; step?: number }) {
  const step = useStep(INFO_CHECKS.length, reducedMotion, controlled, INFO_RESTING_STEP);
  const current = INFO_CHECKS[step];
  const ease = { duration: reducedMotion ? 0 : 0.45, ease: "easeInOut" as const };
  const accent = current.verdict === "flag" ? AMBER : TEAL;

  return (
    <Shell
      file="info"
      name="ProjectInfoPreview"
      tag="Infie reads this"
      icon={<FileText size={14} className="text-[#abefa3]" />}
      label={`Example info.md for ${INFO_TITLE}. Infie checks each Session Agent's plan against it and flags ones that drift from the vision.`}
      step={step}
      reducedMotion={reducedMotion}
    >
      <Page title={INFO_TITLE}>
        {INFO_LINES.map((line) => {
          const active = line.id === current.line;
          return (
            <motion.div
              key={line.id}
              data-info-line={line.id}
              data-active={active ? "true" : "false"}
              animate={{
                borderColor: active ? accent : "rgba(255,255,255,0)",
                backgroundColor: active ? (current.verdict === "flag" ? "rgba(251,191,36,0.08)" : "rgba(45,212,191,0.08)") : "rgba(0,0,0,0)",
              }}
              transition={ease}
              className="flex flex-wrap items-baseline gap-x-1.5 px-1.5 py-[3px] rounded-[6px] min-w-0"
              style={{ border: "1px solid rgba(255,255,255,0)" }}
            >
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: active ? accent : GREEN }}>{line.label}:</span>
              <span className="min-w-0 break-words" style={{ fontFamily: body, fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
                {line.text}
              </span>
            </motion.div>
          );
        })}
      </Page>

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Session check</SectionLabel>
        {INFO_CHECKS.map((check, idx) => {
          const active = idx === step;
          const flag = check.verdict === "flag";
          return (
            <motion.div
              key={check.session}
              data-session-check={check.session}
              data-verdict={check.verdict}
              animate={{ opacity: reducedMotion || active ? 1 : 0.38 }}
              transition={ease}
              className="flex items-start gap-1.5 min-w-0"
            >
              {flag ? (
                <CircleAlert size={13} className="shrink-0 mt-[1px]" style={{ color: AMBER }} aria-label="flagged" />
              ) : (
                <Check size={13} className="shrink-0 mt-[1px]" style={{ color: GREEN }} aria-label="fits" />
              )}
              <span className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
                <span className="break-all" style={{ fontFamily: mono, fontSize: 10.5, color: "#ffffff" }}>
                  session/{check.session}
                </span>
                <span style={{ fontFamily: body, fontSize: 10, color: flag ? AMBER : "rgba(255,255,255,0.62)" }}>{check.note}</span>
              </span>
            </motion.div>
          );
        })}
      </div>

      <InfieLine text={current.infie} reducedMotion={reducedMotion} />
    </Shell>
  );
}

// ── todo.md ──────────────────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<TodoSource, string> = {
  you: "rgba(255,255,255,0.78)",
  github: "#7b9ab5",
  info: TEAL,
  infie: GREEN,
};

function SourceIcon({ source, size = 10 }: { source: TodoSource; size?: number }) {
  const props = { size, "aria-hidden": true, className: "shrink-0" } as const;
  if (source === "you") return <User {...props} />;
  if (source === "github") return <CircleDot {...props} />;
  if (source === "info") return <Link2 {...props} />;
  return <Sparkles {...props} />;
}

function TodoPreview({ reducedMotion, step: controlled }: { reducedMotion: boolean; step?: number }) {
  const step = useStep(TODO_STEP_COUNT, reducedMotion, controlled, TODO_RESTING_STEP);
  const event = TODO_EVENTS[step];
  const ease = { duration: reducedMotion ? 0 : 0.4, ease: "easeInOut" as const };

  return (
    <Shell
      file="todo"
      name="ProjectTodoPreview"
      tag="build · change · fix"
      icon={<ListTodo size={14} className="text-[#abefa3]" />}
      label="Example todo.md. Ideas from you, GitHub issues, and info.md edits become todos, and finished Session work gets checked off."
      step={step}
      reducedMotion={reducedMotion}
    >
      <Page title="Todo">
        {TODO_ITEMS.map((item) => {
          const visible = step >= item.appearsAt;
          const done = item.doneAt !== undefined && step >= item.doneAt;
          const fresh = visible && step > 0 && (item.appearsAt === step || item.doneAt === step);
          const color = SOURCE_COLORS[item.source];
          return (
            <motion.div
              key={item.id}
              data-todo={item.id}
              data-visible={visible ? "true" : "false"}
              data-done={done ? "true" : "false"}
              aria-hidden={visible ? undefined : true}
              initial={false}
              animate={{
                opacity: visible ? 1 : 0,
                x: visible || reducedMotion ? 0 : -6,
                borderColor: fresh ? "rgba(45,212,191,0.65)" : "rgba(255,255,255,0)",
              }}
              transition={ease}
              className="flex items-start gap-2 px-1.5 py-[3px] rounded-[6px] min-w-0"
              style={{ border: "1px solid rgba(255,255,255,0)" }}
            >
              <motion.span
                aria-label={done ? "done" : "to do"}
                role="img"
                animate={{ backgroundColor: done ? GREEN : "rgba(0,0,0,0)" }}
                transition={ease}
                className="size-[13px] rounded-[4px] shrink-0 mt-[2px] flex items-center justify-center"
                style={{ border: done ? `1px solid ${GREEN}` : "1px solid rgba(255,255,255,0.4)" }}
              >
                {done && <Check size={10} strokeWidth={3} color="#06201d" aria-hidden="true" />}
              </motion.span>
              <span
                className="flex-1 min-w-0 break-words"
                style={{
                  fontFamily: body,
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: done ? MUTED : "rgba(255,255,255,0.88)",
                  textDecoration: done ? "line-through" : undefined,
                }}
              >
                {item.text}
              </span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full shrink-0 mt-[1px]"
                style={{ fontFamily: mono, fontSize: 9.5, color, border: `1px solid ${color}` }}
              >
                <SourceIcon source={item.source} />
                {TODO_SOURCE_LABELS[item.source]}
              </span>
            </motion.div>
          );
        })}
      </Page>

      <div className="flex flex-col gap-1.5">
        <SectionLabel>Just now</SectionLabel>
        <motion.div
          key={reducedMotion ? "todo-event" : `todo-event-${step}`}
          data-todo-event={event.source}
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ease}
          className="flex items-start gap-1.5 min-w-0"
          style={{ color: SOURCE_COLORS[event.source] }}
        >
          <span className="mt-[2px]">
            <SourceIcon source={event.source} size={12} />
          </span>
          <span className="min-w-0 break-words" style={{ fontFamily: body, fontSize: 11, lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
            {event.text}
          </span>
        </motion.div>
      </div>
    </Shell>
  );
}

function InfieLine({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  return (
    <motion.div
      key={reducedMotion ? "infie-line" : text}
      data-infie-line
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35 }}
      className="flex items-start gap-1.5 min-w-0"
    >
      <Sparkles size={12} className="shrink-0 mt-[2px]" style={{ color: GREEN }} aria-hidden="true" />
      <span className="min-w-0 break-words" style={{ fontFamily: body, fontSize: 11, lineHeight: 1.4, color: "rgba(255,255,255,0.85)" }}>
        <span style={{ color: GREEN, fontWeight: 700 }}>Infie:</span> {text}
      </span>
    </motion.div>
  );
}
