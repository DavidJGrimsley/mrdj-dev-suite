import svgPaths from "./svg-nts2y2gu0m";

function ProjectIcon({ className }: { className?: string }) {
  return (
    <div className={className || "overflow-clip relative size-[12px]"} data-name="ProjectIcon">
      <div className="absolute inset-[1.59px_1px]" data-name="Icon">
        <div className="absolute inset-[-8.5%_-7.5%]">
          <svg className="block size-full" fill="none" height="10.3235" preserveAspectRatio="none" viewBox="0 0 11.5 10.3235" width="11.5">
            <path d={svgPaths.p1f8b0b00} id="Icon" stroke="#252323" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SessionIcon({ className }: { className?: string }) {
  return (
    <div className={className || "overflow-clip relative size-[12px]"} data-name="SessionIcon">
      <div className="absolute inset-[5.54%_11.13%]" data-name="Icon">
        <div className="absolute inset-[-4.69%_-5.36%]">
          <svg className="block size-full" fill="none" height="11.67" preserveAspectRatio="none" viewBox="0 0 10.3302 11.67" width="10.3302">
            <path d={svgPaths.p31c13780} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
type InfieActionButtonProps = {
  className?: string;
  actionLabel?: string;
  density?: "Compact" | "Expanded";
  message?: string;
  preset?: "Recommendation" | "Inspect" | "Active" | "Attention" | "Blocked" | "Disabled";
  project?: string;
  projectIcon?: React.ReactNode | null;
  session?: string;
  sessionIcon?: React.ReactNode | null;
  showProject?: boolean;
  state?: "Default" | "Hover" | "Pressed" | "Focus" | "Disabled";
};

export default function InfieActionButton({ className, actionLabel = "Action", density = "Compact", message = "", preset = "Recommendation", project = "{project}", projectIcon = null, session = "{session}", sessionIcon = null, showProject = true, state = "Default" }: InfieActionButtonProps) {
  if (preset === "Recommendation" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(45,212,191,0.5)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(20,57,52,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Recommendation, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(15,31,29,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(45,212,191,0.35)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(18,48,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(45,212,191,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(17,40,37,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Recommendation, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(45,212,191,0.5)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(20,57,52,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Recommendation, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(15,31,29,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(45,212,191,0.35)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(18,48,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(45,212,191,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
      </div>
    );
  }
  if (preset === "Recommendation" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(17,40,37,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Recommendation, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Inspect" && density === "Compact" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(167,139,250,0.35)] relative rounded-[999px]"} data-name="preset=Inspect, density=Compact, state=Default">
        <div aria-hidden className="absolute bg-[rgba(34,30,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#a78bfa] text-[14px]">◎</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(167,139,250,0.5)] relative rounded-[999px]"} data-name="preset=Inspect, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(47,41,65,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#a78bfa] text-[14px]">◎</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(167,139,250,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Inspect, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(27,24,35,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#a78bfa] text-[14px]">◎</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(167,139,250,0.35)] relative rounded-[999px]"} data-name="preset=Inspect, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(40,35,55,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(167,139,250,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#a78bfa] text-[14px]">◎</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(34,30,45,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Inspect, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#a78bfa] text-[14px]">◎</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Inspect" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(167,139,250,0.35)] relative rounded-[999px]"} data-name="preset=Inspect, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(34,30,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a78bfa] text-[14px] whitespace-nowrap">◎</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(167,139,250,0.5)] relative rounded-[999px]"} data-name="preset=Inspect, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(47,41,65,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a78bfa] text-[14px] whitespace-nowrap">◎</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(167,139,250,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Inspect, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(27,24,35,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a78bfa] text-[14px] whitespace-nowrap">◎</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(167,139,250,0.35)] relative rounded-[999px]"} data-name="preset=Inspect, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(40,35,55,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(167,139,250,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a78bfa] text-[14px] whitespace-nowrap">◎</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(167,139,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Inspect" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(34,30,45,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Inspect, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(167,139,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a78bfa] text-[14px] whitespace-nowrap">◎</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Active" && density === "Compact" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(96,165,250,0.35)] relative rounded-[999px]"} data-name="preset=Active, density=Compact, state=Default">
        <div aria-hidden className="absolute bg-[rgba(24,33,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#60a5fa] text-[14px]">↻</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(96,165,250,0.5)] relative rounded-[999px]"} data-name="preset=Active, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(31,47,65,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#60a5fa] text-[14px]">↻</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(96,165,250,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Active, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(20,27,35,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#60a5fa] text-[14px]">↻</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(96,165,250,0.35)] relative rounded-[999px]"} data-name="preset=Active, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(27,40,55,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(96,165,250,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#60a5fa] text-[14px]">↻</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(24,33,45,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Active, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#60a5fa] text-[14px]">↻</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Active" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(96,165,250,0.35)] relative rounded-[999px]"} data-name="preset=Active, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(24,33,45,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[14px] whitespace-nowrap">↻</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(96,165,250,0.5)] relative rounded-[999px]"} data-name="preset=Active, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(31,47,65,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[14px] whitespace-nowrap">↻</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(96,165,250,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Active, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(20,27,35,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[14px] whitespace-nowrap">↻</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(96,165,250,0.35)] relative rounded-[999px]"} data-name="preset=Active, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(27,40,55,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(96,165,250,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[14px] whitespace-nowrap">↻</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(96,165,250,0.25)]" />
      </div>
    );
  }
  if (preset === "Active" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(24,33,45,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Active, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(96,165,250,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[14px] whitespace-nowrap">↻</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Attention" && density === "Compact" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px]"} data-name="preset=Attention, density=Compact, state=Default">
        <div aria-hidden className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#fbbf24] text-[14px]">⚠</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(251,191,36,0.5)] relative rounded-[999px]"} data-name="preset=Attention, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(65,52,18,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#fbbf24] text-[14px]">⚠</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Attention, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(35,29,14,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#fbbf24] text-[14px]">⚠</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(251,191,36,0.35)] relative rounded-[999px]"} data-name="preset=Attention, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(55,45,17,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(251,191,36,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#fbbf24] text-[14px]">⚠</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(45,37,15,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Attention, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium',sans-serif] font-medium relative shrink-0 text-[#fbbf24] text-[14px]">⚠</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Attention" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px]"} data-name="preset=Attention, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(251,191,36,0.5)] relative rounded-[999px]"} data-name="preset=Attention, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(65,52,18,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Attention, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(35,29,14,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(251,191,36,0.35)] relative rounded-[999px]"} data-name="preset=Attention, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(55,45,17,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(251,191,36,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
      </div>
    );
  }
  if (preset === "Attention" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(45,37,15,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Attention, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Blocked" && density === "Compact" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(248,113,113,0.35)] relative rounded-[999px]"} data-name="preset=Blocked, density=Compact, state=Default">
        <div aria-hidden className="absolute bg-[rgba(45,26,26,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#f87171] text-[14px]">✕</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(248,113,113,0.5)] relative rounded-[999px]"} data-name="preset=Blocked, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(65,35,35,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#f87171] text-[14px]">✕</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(248,113,113,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Blocked, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(35,22,22,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#f87171] text-[14px]">✕</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(248,113,113,0.35)] relative rounded-[999px]"} data-name="preset=Blocked, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(55,31,31,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(248,113,113,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#f87171] text-[14px]">✕</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(45,26,26,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Blocked, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#f87171] text-[14px]">✕</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Blocked" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(248,113,113,0.35)] relative rounded-[999px]"} data-name="preset=Blocked, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(45,26,26,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f87171] text-[14px] whitespace-nowrap">✕</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(248,113,113,0.5)] relative rounded-[999px]"} data-name="preset=Blocked, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(65,35,35,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f87171] text-[14px] whitespace-nowrap">✕</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(248,113,113,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Blocked, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(35,22,22,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f87171] text-[14px] whitespace-nowrap">✕</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(248,113,113,0.35)] relative rounded-[999px]"} data-name="preset=Blocked, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(55,31,31,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(248,113,113,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f87171] text-[14px] whitespace-nowrap">✕</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(248,113,113,0.25)]" />
      </div>
    );
  }
  if (preset === "Blocked" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(45,26,26,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Blocked, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(248,113,113,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f87171] text-[14px] whitespace-nowrap">✕</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Disabled" && density === "Compact" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(156,163,175,0.35)] relative rounded-[999px]"} data-name="preset=Disabled, density=Compact, state=Default">
        <div aria-hidden className="absolute bg-[rgba(32,33,35,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#9ca3af] text-[14px]">⋯</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Compact" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(156,163,175,0.5)] relative rounded-[999px]"} data-name="preset=Disabled, density=Compact, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(45,46,49,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#9ca3af] text-[14px]">⋯</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Compact" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(156,163,175,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Disabled, density=Compact, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(26,27,28,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#9ca3af] text-[14px]">⋯</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Compact" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(156,163,175,0.35)] relative rounded-[999px]"} data-name="preset=Disabled, density=Compact, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(38,40,42,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(156,163,175,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#9ca3af] text-[14px]">⋯</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Compact" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(32,33,35,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Disabled, density=Compact, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="flex flex-row items-center size-full">
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#9ca3af] text-[14px]">⋯</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        </div>
      </div>
    );
  }
  if (preset === "Disabled" && density === "Expanded" && state === "Default") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(156,163,175,0.35)] relative rounded-[999px]"} data-name="preset=Disabled, density=Expanded, state=Default">
        <div aria-hidden className="absolute bg-[rgba(32,33,35,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[14px] whitespace-nowrap">⋯</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Expanded" && state === "Hover") {
    return (
      <div className={className || "drop-shadow-[0px_0px_9px_rgba(156,163,175,0.5)] relative rounded-[999px]"} data-name="preset=Disabled, density=Expanded, state=Hover">
        <div aria-hidden className="absolute bg-[rgba(45,46,49,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[14px] whitespace-nowrap">⋯</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Expanded" && state === "Pressed") {
    return (
      <div className={className || "drop-shadow-[0px_0px_6px_rgba(156,163,175,0.35)] opacity-90 relative rounded-[999px]"} data-name="preset=Disabled, density=Expanded, state=Pressed">
        <div aria-hidden className="absolute bg-[rgba(26,27,28,0.85)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[14px] whitespace-nowrap">⋯</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Expanded" && state === "Focus") {
    return (
      <div className={className || "drop-shadow-[0px_0px_7px_rgba(156,163,175,0.35)] relative rounded-[999px]"} data-name="preset=Disabled, density=Expanded, state=Focus">
        <div aria-hidden className="absolute bg-[rgba(38,40,42,0.75)] inset-0 pointer-events-none rounded-[999px]" />
        <div aria-hidden className="absolute border-2 border-[rgba(156,163,175,0.8)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[14px] whitespace-nowrap">⋯</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(156,163,175,0.25)]" />
      </div>
    );
  }
  if (preset === "Disabled" && density === "Expanded" && state === "Disabled") {
    return (
      <div className={className || "bg-[rgba(32,33,35,0.75)] opacity-40 relative rounded-[999px]"} data-name="preset=Disabled, density=Expanded, state=Disabled">
        <div aria-hidden className="absolute border border-[rgba(156,163,175,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
        <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[14px] whitespace-nowrap">⋯</p>
          <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
            <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
              <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>}
              {showProject && (
                <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                  {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
              )}
              {showProject && <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>}
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={className || "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px]"} data-name="preset=Recommendation, density=Compact, state=Default">
      <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
      <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <div className="flex flex-row items-center size-full">
        <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
          <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
    </div>
  );
}