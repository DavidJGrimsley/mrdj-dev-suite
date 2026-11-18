import { GitPullRequest } from "lucide-react";
import { PET_REPLAY_BRANCH, PET_WRAP_UP_STEPS, type PetReplayState } from "./petSessionData";

// Pet's simulated Wrap up checks (Doctor, todo/commit, CI, review threads), styled like the
// Experimemo PR Review widget's check grid. Shown in the session chat column after Open PR.
export function PetWrapUpChecks({ state }: { state: PetReplayState }) {
  const phase = state.status === "PR OPEN" ? state.wrapUpPhase : "green";
  const statusLabel =
    state.status !== "PR OPEN"
      ? "Merged to test (simulated)"
      : phase === "green"
        ? "Checks green · ready to merge"
        : phase === "polling"
          ? "Wrapping up…"
          : "Ready for Wrap up";
  const statusTone =
    state.status !== "PR OPEN"
      ? "text-[#c084fc] border-[rgba(192,132,252,0.4)] bg-[rgba(192,132,252,0.12)]"
      : phase === "green"
        ? "text-[#abefa3] border-[rgba(171,239,163,0.4)] bg-[rgba(171,239,163,0.12)]"
        : phase === "polling"
          ? "text-[#2dd4bf] border-[rgba(45,212,191,0.4)] bg-[rgba(45,212,191,0.12)]"
          : "text-[#60a5fa] border-[rgba(96,165,250,0.4)] bg-[rgba(96,165,250,0.12)]";

  return (
    <div
      data-testid="pet-wrapup-checks"
      data-wrapup-phase={phase}
      className="mx-3 mt-2 shrink-0 rounded-[8px] border border-[rgba(96,165,250,0.28)] bg-[#141318] p-3 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GitPullRequest size={14} className="text-[#60a5fa] shrink-0" />
          <p className="font-['Inter',sans-serif] font-semibold text-[12px] text-white truncate">
            Wrap up · <span className="font-mono text-[11px] text-[#94a3b8]">{PET_REPLAY_BRANCH} → test</span>
          </p>
        </div>
        <span
          data-testid="pet-wrapup-status"
          className={`px-2 py-0.5 rounded-[5px] border font-mono text-[10px] uppercase tracking-wide shrink-0 ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        {PET_WRAP_UP_STEPS.map((step, idx) => {
          const done = phase === "green" || idx < state.wrapUpStep;
          const running = phase === "polling" && idx === state.wrapUpStep;
          return (
            <div
              key={step.check}
              data-testid={`pet-wrapup-check-${step.check}`}
              data-check-state={done ? "done" : running ? "running" : "queued"}
              className="bg-[#121118] border border-white/5 rounded-[6px] p-2"
            >
              <p className="font-mono text-[10px] text-[#71717a] uppercase">{step.label}</p>
              <p
                className={`font-semibold mt-0.5 ${
                  done ? "text-[#abefa3]" : running ? "text-[#fbbf24]" : "text-[#a1a1aa]"
                }`}
              >
                {done ? step.done : running ? step.pending : "queued"}
              </p>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10px] text-[#71717a]">
        Simulated wrap-up · no real Doctor run, PR, CI, merge, or network request
      </p>
    </div>
  );
}
