import React, { useEffect, useRef, useState } from "react";
import type { GenerationPlan, HostExecutionEvent, ProjectCreationHost, ValidationResult, ProjectMemoryFiles } from "./types.ts";
import { defaultHost, planDigest } from "./host.ts";
interface Props { plan: GenerationPlan; host?: ProjectCreationHost; onClose: () => void; onReturnHome: () => void }
export function GenerationModal({ plan, host = defaultHost, onClose, onReturnHome }: Props) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [digest, setDigest] = useState("");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<HostExecutionEvent[]>([]);
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [tab, setTab] = useState<keyof ProjectMemoryFiles>("infoMd");
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = () => { controller.current?.abort(); onClose(); };
  useEffect(() => {
    let live = true;
    setValidation(null); setDigest(""); setError(""); setCompleted(false); setEvents([]);
    Promise.all([host.validatePlan(plan), planDigest(plan)]).then(([v, d]) => { if (live) { setValidation(v); setDigest(d); } }).catch(e => { if (live) setError(String(e)); });
    return () => { live = false; controller.current?.abort(); };
  }, [plan, host]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, []);
  const approve = async () => {
    if (executing || !validation?.valid || !digest || !plan.executable || !host.capabilities.executionAvailable) return;
    const abort = new AbortController(); controller.current = abort; setExecuting(true); setError("");
    try {
      if (await planDigest(plan) !== digest) throw new Error("Plan changed after review. Reopen the review.");
      const checked = await host.validatePlan(plan);
      if (!checked.valid) { setValidation(checked); throw new Error(checked.errors.join(" ")); }
      abort.signal.throwIfAborted();
      const result = await host.executePlan(plan, e => { if (!abort.signal.aborted) setEvents(prev => [...prev, e]); }, { digest, signal: abort.signal });
      if (!abort.signal.aborted) {
        if (!result.success) throw new Error(result.reason || "Host rejected generation.");
        setCompleted(true);
      }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e)); }
    finally { if (!abort.signal.aborted) setExecuting(false); }
  };
  const exportDraft = () => {
    const blob = new Blob([JSON.stringify({ kind: "blueprint-draft", plan }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "jenny-blueprint-draft.json"; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="plan-title" tabIndex={-1}
      onKeyDown={e => {
        if (e.key === "Escape") { e.stopPropagation(); close(); }
        if (e.key === "Tab") {
          const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], select, textarea, input');
          if (!controls?.length) return;
          const first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }} className="w-full max-w-3xl max-h-[90vh] bg-[#161420] border border-white/10 rounded-xl text-white flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between"><h2 id="plan-title">{plan.projectName} · Review blueprint</h2><button aria-label="Close plan review" onClick={close}>×</button></div>
      <div className="p-5 overflow-auto space-y-4 text-sm">
        <p>{host.capabilities.message}</p>
        <p>{plan.frameworkName} · Template: {plan.template} · Platforms: {plan.platforms.join(", ")}</p>
        {!validation && !error && <p role="status">Validating review…</p>}
        {validation && <div><p>{validation.valid ? "Host validation passed. Review every field before approving." : "Generation is unavailable or the plan was rejected."}</p>{validation.errors.map((e, i) => <p key={i} role="alert" className="text-rose-300">{e}</p>)}{validation.warnings.map((w,i) => <p key={i} className="text-amber-300">{w}</p>)}</div>}
        {error && <p role="alert" className="text-rose-300">{error}</p>}
        {plan.executable && <><p>Destination: {plan.destinationPath}</p><pre className="whitespace-pre-wrap">{plan.commandPreview}</pre><ul>{plan.generatedFiles.map(f => <li key={f.path}>{f.path}: {f.summary}</li>)}</ul></>}
        <h3>Project memory drafts · Unconfirmed choices retain their status</h3>
        <div className="flex flex-wrap gap-2">{(["infoMd", "styleMd", "guidelinesMd", "todoMd"] as const).map(t => <button key={t} aria-pressed={t === tab} onClick={() => setTab(t)} className="p-2 bg-white/10 rounded">{t.replace("Md", ".md")}</button>)}</div>
        <pre className="whitespace-pre-wrap text-xs bg-black/30 p-3 select-text">{plan.projectMemory[tab]}</pre>
        {events.map((e,i) => <p key={i} role="status">{e.type}: {e.message}</p>)}
        {completed && <p role="status">Host reported generation complete.</p>}
      </div>
      <div className="p-4 border-t border-white/10 flex flex-wrap gap-3 justify-between">
        <button onClick={exportDraft}>Export blueprint draft</button>
        <button onClick={close}>{executing ? "Cancel generation and close" : "Back to blueprint"}</button>
        {completed ? <button onClick={onReturnHome}>Return home</button> : <button disabled={!validation?.valid || !digest || !plan.executable || !host.capabilities.executionAvailable || executing} onClick={approve} className="rounded bg-[#abefa3] text-black p-2 disabled:opacity-40">{executing ? "Generating…" : "Approve and generate"}</button>}
      </div>
    </div>
  </div>;
}
