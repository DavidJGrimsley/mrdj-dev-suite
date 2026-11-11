import svgPaths from "./svg-j3t7fa831c";
import imgImage from "./d9f2b29a94f507fec634bd88b7d6597b7dbe32af.png";
type StatusChipProps = {
  className?: string;
  status?: "WAITING ON TEST" | "MERGED";
  statusLabel?: string;
};

function StatusChip({ className, status = "WAITING ON TEST", statusLabel = "STATUS" }: StatusChipProps) {
  const isMerged = status === "MERGED";
  return (
    <div className={className || `relative rounded-[6px] ${isMerged ? "bg-[rgba(45,212,191,0.08)]" : "bg-[rgba(251,191,36,0.08)]"}`}>
      <div aria-hidden className={`absolute border border-solid inset-0 pointer-events-none rounded-[6px] ${isMerged ? "border-[rgba(45,212,191,0.2)]" : "border-[rgba(251,191,36,0.2)]"}`} />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[10px] py-[4px] relative size-full">
          {status === "WAITING ON TEST" && <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[11px] uppercase whitespace-nowrap">{statusLabel}</p>}
          {isMerged && <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[11px] uppercase whitespace-nowrap">{statusLabel}</p>}
        </div>
      </div>
    </div>
  );
}

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
  preset?: "Recommendation" | "Attention";
  project?: string;
  projectIcon?: React.ReactNode | null;
  session?: string;
  sessionIcon?: React.ReactNode | null;
  showProject?: boolean;
  state?: "Default";
};

function InfieActionButton({ className, actionLabel = "Action", density = "Compact", message = "", preset = "Recommendation", project = "{project}", projectIcon = null, session = "{session}", sessionIcon = null, showProject = true, state = "Default" }: InfieActionButtonProps) {
  const isAttention = preset === "Attention";
  const isExpanded = density === "Expanded";
  return (
    <div className={className || `relative rounded-[999px] ${isAttention ? "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)]" : "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)]"}`}>
      <div aria-hidden className={`absolute inset-0 pointer-events-none rounded-[999px] ${isAttention ? "bg-[rgba(45,37,15,0.75)]" : "bg-[rgba(17,40,37,0.75)]"}`} />
      <div aria-hidden className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${isAttention ? "border-[rgba(251,191,36,0.5)]" : "border-[rgba(45,212,191,0.5)]"}`} />
      <div className={`flex size-full ${isExpanded ? "content-stretch gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative" : "flex-row items-center"}`}>
        {density === "Compact" && (
          <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
            <p className={`font-medium relative shrink-0 text-[14px] ${isAttention ? 'font-["Inter:Medium",sans-serif] text-[#fbbf24]' : 'font-["Inter:Medium","Noto_Sans_Symbols2:Regular",sans-serif] text-[#2dd4bf]'}`}>{isAttention ? "⚠" : "✦"}</p>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{actionLabel}</p>
          </div>
        )}
        {isExpanded && (
          <>
            <p className={`[word-break:break-word] font-medium leading-[normal] not-italic relative shrink-0 text-[14px] whitespace-nowrap ${isAttention ? 'font-["Inter:Medium",sans-serif] text-[#fbbf24]' : 'font-["Inter:Medium","Noto_Sans_Symbols2:Regular",sans-serif] text-[#2dd4bf]'}`}>{isAttention ? "⚠" : preset === "Recommendation" ? "✦" : ""}</p>
            <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
              <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
                <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">{actionLabel}</p>
                <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
                  {sessionIcon || <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{session}</p>
                {showProject && (
                  <>
                    <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>
                    <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
                      {projectIcon || <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />}
                    </div>
                    <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">{project}</p>
                  </>
                )}
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">{message}</p>
            </div>
          </>
        )}
      </div>
      <div className={`absolute inset-0 pointer-events-none rounded-[inherit] ${isAttention ? "shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" : "shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]"}`} />
    </div>
  );
}

function BranchIcon({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[12px]"} data-name="BranchIcon">
      <div className="absolute bg-[rgba(156,163,175,0.6)] h-[10px] left-[3px] rounded-[1px] top-px w-[1.5px]" data-name="Rectangle" />
      <div className="absolute bg-[rgba(156,163,175,0.6)] h-[1.5px] left-[4.5px] rounded-[1px] top-[4px] w-[5px]" data-name="Rectangle" />
      <div className="absolute left-[9px] size-[3px] top-[2.5px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" height="3" preserveAspectRatio="none" viewBox="0 0 3 3" width="3">
          <circle cx="1.5" cy="1.5" fill="#9CA3AF" fillOpacity="0.6" id="Ellipse" r="1.5" />
        </svg>
      </div>
      <div className="absolute left-[2.25px] size-[3px] top-[9px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" height="3" preserveAspectRatio="none" viewBox="0 0 3 3" width="3">
          <circle cx="1.5" cy="1.5" fill="#9CA3AF" fillOpacity="0.6" id="Ellipse" r="1.5" />
        </svg>
      </div>
    </div>
  );
}
type SessionCardProps = {
  className?: string;
  agents?: string;
  branch?: string;
  project?: string;
  sessionName?: string;
  showProject?: boolean;
  status?: "WAITING ON TEST" | "MERGED";
  tasks?: string;
};

function SessionCard({ className, agents = "2 agents", branch = "feat/branch-name", project = "Project Name", sessionName = "Session Name", showProject = true, status = "WAITING ON TEST", tasks = "4 / 8 tasks" }: SessionCardProps) {
  const isMerged = status === "MERGED";
  return (
    <div className={className || `relative rounded-[12px] w-[410px] ${isMerged ? "drop-shadow-[0px_0px_8px_rgba(45,212,191,0.12)]" : "drop-shadow-[0px_0px_8px_rgba(251,191,36,0.12)]"}`}>
      <div aria-hidden className="absolute bg-[#0b131d] inset-0 pointer-events-none rounded-[12px]" />
      <div aria-hidden className={`absolute border border-solid inset-0 pointer-events-none rounded-[12px] ${isMerged ? "border-[rgba(45,212,191,0.2)]" : "border-[rgba(251,191,36,0.2)]"}`} />
      <div className="content-stretch flex flex-col gap-[16px] items-start pb-[16px] pt-[20px] px-[20px] relative size-full">
        <div className="content-stretch flex items-start justify-between overflow-clip relative shrink-0 w-full" data-name="header">
          <div className="content-stretch flex flex-[1_0_0] gap-[12px] items-start min-w-px overflow-clip relative" data-name="session-info">
            <SessionIcon className="overflow-clip relative shrink-0 size-[40px]" />
            <div className="content-stretch flex flex-[1_0_0] flex-col gap-[3px] items-start min-w-px overflow-clip relative" data-name="text-stack">
              <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f3f4f6] text-[20px] w-full">{sessionName}</p>
              <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0 w-full" data-name="branch-row">
                <BranchIcon className="relative shrink-0 size-[12px]" />
                <p className="[word-break:break-word] flex-[1_0_0] font-['Cousine:Regular',sans-serif] leading-[normal] min-w-px not-italic relative text-[#9ca3af] text-[12px]">{branch}</p>
              </div>
              {showProject && (
                <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0 w-full" data-name="project-row">
                  <ProjectIcon className="overflow-clip relative shrink-0 size-[12px]" />
                  <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[normal] min-w-px not-italic relative text-[11px] text-[rgba(156,163,175,0.7)]">{project}</p>
                </div>
              )}
            </div>
          </div>
          <InfieActionButton actionLabel={isMerged ? "Check Project" : "Test App"} className={`relative rounded-[999px] shrink-0 ${isMerged ? "drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)]" : "drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)]"}`} preset={status === "WAITING ON TEST" ? "Attention" : undefined} />
        </div>
        <div className="bg-[#0b0a15] content-stretch flex gap-[16px] items-center overflow-clip px-[14px] py-[12px] relative rounded-[8px] shrink-0 w-full" data-name="status-bar">
          <StatusChip className={`relative rounded-[6px] shrink-0 ${isMerged ? "bg-[rgba(45,212,191,0.08)]" : "bg-[rgba(251,191,36,0.08)]"}`} status={isMerged ? "MERGED" : undefined} statusLabel={isMerged ? "MERGED" : "WAITING ON TEST"} />
          <div className="flex-[1_0_0] h-px min-w-px relative" data-name="spacer" />
          <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f3f4f6] text-[12px] whitespace-nowrap">{tasks}</p>
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#9ca3af] text-[10px] whitespace-nowrap">·</p>
          <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f3f4f6] text-[12px] whitespace-nowrap">{agents}</p>
        </div>
      </div>
      <div className={`absolute inset-0 pointer-events-none rounded-[inherit] ${isMerged ? "shadow-[inset_0px_0px_12px_0px_rgba(45,212,191,0.06)]" : "shadow-[inset_0px_0px_12px_0px_rgba(251,191,36,0.06)]"}`} />
    </div>
  );
}

function Container1() {
  return <div className="absolute left-[-200px] rounded-[400px] size-[800px] top-[-250px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -56.569 -56.569 0 400 400)'><stop stop-color='rgba(45,212,191,0.08)' offset='0'/><stop stop-color='rgba(45,212,191,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Container2() {
  return <div className="absolute left-[1155.33px] rounded-[350px] size-[700px] top-[50px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 700 700' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -49.497 -49.497 0 350 350)'><stop stop-color='rgba(74,58,255,0.07)' offset='0'/><stop stop-color='rgba(74,58,255,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Container3() {
  return <div className="absolute left-[596.86px] rounded-[300px] size-[600px] top-[411.33px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -42.426 -42.426 0 300 300)'><stop stop-color='rgba(171,239,163,0.05)' offset='0'/><stop stop-color='rgba(171,239,163,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Image() {
  return (
    <div className="absolute h-[931.333px] left-0 opacity-20 top-0 w-[1705.333px]" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Background() {
  return (
    <div className="absolute h-[1023px] left-0 overflow-clip top-0 w-[1440px]" data-name="Background">
      <Container1 />
      <Container2 />
      <Container3 />
      <Image />
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#abefa3] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Project Folder</p>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon />
      <Text />
    </div>
  );
}

function Container5() {
  return (
    <div className="bg-[rgba(171,239,163,0.08)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container6 />
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p17c66200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d={svgPaths.p31eedf00} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M5 4.5H4" id="Vector_3" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 6.5H4" id="Vector_4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 8.5H4" id="Vector_5" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Info.md</p>
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Icon1 />
      <Text1 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p17c66200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d={svgPaths.p31eedf00} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M5 4.5H4" id="Vector_3" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 6.5H4" id="Vector_4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 8.5H4" id="Vector_5" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Todo.md</p>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Icon2 />
      <Text2 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p17c66200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d={svgPaths.p31eedf00} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M5 4.5H4" id="Vector_3" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 6.5H4" id="Vector_4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 8.5H4" id="Vector_5" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function Text3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Style.md</p>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Icon3 />
      <Text3 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p17c66200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d={svgPaths.p31eedf00} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M5 4.5H4" id="Vector_3" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 6.5H4" id="Vector_4" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
          <path d="M8 8.5H4" id="Vector_5" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

function Text4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Guidelines.md</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Icon4 />
      <Text4 />
    </div>
  );
}

function LeftColumn1() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="LeftColumn">
      <Container7 />
      <Container8 />
      <Container9 />
      <Container10 />
    </div>
  );
}

function ProjectFolder() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[146.5px] items-start overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Project Folder">
      <Container5 />
      <LeftColumn1 />
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#abefa3] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Recent Activity</p>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon5 />
      <Text5 />
    </div>
  );
}

function Container11() {
  return (
    <div className="bg-[rgba(171,239,163,0.08)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container12 />
    </div>
  );
}

function Text6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[16px] whitespace-nowrap">add comments</p>
    </div>
  );
}

function Container13() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text6 />
    </div>
  );
}

function Text7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[16px] whitespace-nowrap">fix-reaction-bug</p>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text7 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g id="Icon">
          <path d="M2.08333 5H7.91667" id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Button">
      <Icon6 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[15px] not-italic relative shrink-0 text-[#444] text-[10px] text-center whitespace-nowrap">Add item</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Button />
    </div>
  );
}

function LeftColumn2() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="LeftColumn">
      <Container13 />
      <Container14 />
      <Container15 />
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[118px] items-start overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Recent Activity">
      <Container11 />
      <LeftColumn2 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Agent Tasks</p>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon7 />
      <Text8 />
    </div>
  );
}

function Container16() {
  return (
    <div className="bg-[#1d1b20] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container17 />
    </div>
  );
}

function InfieAvatar() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_246">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_246)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Text9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Infie</p>
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <InfieAvatar />
      <Text9 />
    </div>
  );
}

function Container18() {
  return (
    <div className="bg-[rgba(29,27,32,0.5)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container19 />
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_266)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_266">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon8 />
    </div>
  );
}

function Text10() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] w-[172px]">Create add comments session</p>
    </div>
  );
}

function Container20() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button1 />
      <Text10 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_266)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_266">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon9 />
    </div>
  );
}

function Text11() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] whitespace-nowrap">Create Fix Reaction Bugs session</p>
    </div>
  );
}

function Container21() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button2 />
      <Text11 />
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon10 />
    </div>
  );
}

function Text12() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Open PR for Project folder</p>
    </div>
  );
}

function Container22() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button3 />
      <Text12 />
    </div>
  );
}

function Icon11() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g id="Icon">
          <path d="M2.08333 5H7.91667" id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Button4() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Button">
      <Icon11 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[15px] not-italic relative shrink-0 text-[#444] text-[10px] text-center whitespace-nowrap">Add item</p>
    </div>
  );
}

function Container23() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Button4 />
    </div>
  );
}

function Checklist() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container20 />
      <Container21 />
      <Container22 />
      <Container23 />
    </div>
  );
}

function LeftColumn3() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col h-[131px] items-start overflow-clip relative shrink-0 w-full" data-name="LeftColumn">
      <Checklist />
    </div>
  );
}

function Text13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">add comments</p>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text13 />
    </div>
  );
}

function Container24() {
  return (
    <div className="bg-[rgba(29,27,32,0.5)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container25 />
    </div>
  );
}

function Icon12() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button5() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon12 />
    </div>
  );
}

function Text14() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] w-[172px]">Implement PhotoPicker component</p>
    </div>
  );
}

function Container26() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button5 />
      <Text14 />
    </div>
  );
}

function Icon13() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button6() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon13 />
    </div>
  );
}

function Text15() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] whitespace-nowrap">Wire up usePhotoShare hook</p>
    </div>
  );
}

function Container27() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button6 />
      <Text15 />
    </div>
  );
}

function Icon14() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button7() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon14 />
    </div>
  );
}

function Text16() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Compress images before upload</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button7 />
      <Text16 />
    </div>
  );
}

function Icon15() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g id="Icon">
          <path d="M2.08333 5H7.91667" id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Button8() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Button">
      <Icon15 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[15px] not-italic relative shrink-0 text-[#444] text-[10px] text-center whitespace-nowrap">Add item</p>
    </div>
  );
}

function Container29() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Button8 />
    </div>
  );
}

function Checklist1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container26 />
      <Container27 />
      <Container28 />
      <Container29 />
    </div>
  );
}

function LeftColumn4() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col h-[150px] items-start overflow-clip relative shrink-0 w-full" data-name="LeftColumn">
      <Checklist1 />
    </div>
  );
}

function Text17() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">fix reaction bugs</p>
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text17 />
    </div>
  );
}

function Container30() {
  return (
    <div className="bg-[rgba(29,27,32,0.5)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container31 />
    </div>
  );
}

function Icon16() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button9() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon16 />
    </div>
  );
}

function Text18() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] w-[172px]">Implement PhotoPicker component</p>
    </div>
  );
}

function Container32() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button9 />
      <Text18 />
    </div>
  );
}

function Icon17() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button10() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon17 />
    </div>
  );
}

function Text19() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] whitespace-nowrap">Wire up usePhotoShare hook</p>
    </div>
  );
}

function Container33() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button10 />
      <Text19 />
    </div>
  );
}

function Icon18() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button11() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon18 />
    </div>
  );
}

function Text20() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] whitespace-nowrap">Wire up usePhotoShare hook</p>
    </div>
  );
}

function Container34() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button11 />
      <Text20 />
    </div>
  );
}

function Icon19() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button12() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon19 />
    </div>
  );
}

function Text21() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] w-[172px]">Add friend list query to Supabase</p>
    </div>
  );
}

function Container35() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button12 />
      <Text21 />
    </div>
  );
}

function Icon20() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button13() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon20 />
    </div>
  );
}

function Text22() {
  return (
    <div className="content-stretch flex flex-[171.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Handle photo library permissions</p>
    </div>
  );
}

function Container36() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button13 />
      <Text22 />
    </div>
  );
}

function Icon21() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g id="Icon">
          <path d="M2.08333 5H7.91667" id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Button14() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Button">
      <Icon21 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[15px] not-italic relative shrink-0 text-[#444] text-[10px] text-center whitespace-nowrap">Add item</p>
    </div>
  );
}

function Container37() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Button14 />
    </div>
  );
}

function Checklist2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container32 />
      <Container33 />
      <Container34 />
      <Container35 />
      <Container36 />
      <Container37 />
    </div>
  );
}

function LeftColumn5() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col h-[219px] items-start overflow-clip relative shrink-0 w-full" data-name="LeftColumn">
      <Checklist2 />
    </div>
  );
}

function AgentTasks() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-[308.083_0_0] flex-col items-start min-h-px overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] w-full" data-name="Agent Tasks">
      <Container16 />
      <Container18 />
      <LeftColumn3 />
      <Container24 />
      <LeftColumn4 />
      <Container30 />
      <LeftColumn5 />
    </div>
  );
}

function LeftColumn() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] h-[945px] items-center overflow-clip relative shrink-0 w-[236px]" data-name="LeftColumn">
      <ProjectFolder />
      <RecentActivity />
      <AgentTasks />
    </div>
  );
}

function InfieAvatar1() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_246">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_246)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:ExtraBold',sans-serif] leading-[18px] not-italic relative shrink-0 text-[#2dd4bf] text-[12px] whitespace-nowrap">Infie</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[#555] text-[9px] whitespace-nowrap">{`IDE Orchestrator · coordinates agents, worktrees & project memory`}</p>
    </div>
  );
}

function Container40() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[283.969px]" data-name="Container">
      <Paragraph />
      <Paragraph1 />
    </div>
  );
}

function Container42() {
  return <div className="bg-[#2dd4bf] relative rounded-[22369600px] shrink-0 size-[6px]" data-name="Container" />;
}

function Text23() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[13.5px] not-italic relative shrink-0 text-[#2dd4bf] text-[9px] whitespace-nowrap">Active</p>
    </div>
  );
}

function Container41() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-name="Container">
      <Container42 />
      <Text23 />
    </div>
  );
}

function ContainerAlign() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Container:align">
      <Container41 />
    </div>
  );
}

function Container39() {
  return (
    <div className="bg-[rgba(45,212,191,0.02)] border-[rgba(45,212,191,0.09)] border-b-[0.667px] border-solid content-stretch flex gap-[10px] items-center px-[16px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <InfieAvatar1 />
      <Container40 />
      <ContainerAlign />
    </div>
  );
}

function InfieAvatar2() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_246">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_246)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Container45() {
  return (
    <div className="bg-[rgba(45,212,191,0.05)] border-[0.667px] border-[rgba(45,212,191,0.13)] border-solid content-stretch flex flex-col items-start px-[14px] py-[10px] relative rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] self-stretch shrink-0 w-[726px]" data-name="Container">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[19.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[12px] w-full">Session initialised. Scanning `expo-photo-share/project/Todo.md`… found 3 open tasks, 2 completed.</p>
    </div>
  );
}

function Container44() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Container">
      <InfieAvatar2 />
      <Container45 />
    </div>
  );
}

function InfieAvatar3() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_246">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_246)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Container47() {
  return (
    <div className="bg-[rgba(45,212,191,0.05)] border-[0.667px] border-[rgba(45,212,191,0.13)] border-solid content-stretch flex flex-col items-start px-[14px] py-[10px] relative rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] self-stretch shrink-0 w-[726px]" data-name="Container">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[19.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[12px] w-[471px]">Worktree `feature/photo-share` is active. Claude is working on `PhotoPicker.tsx` and `usePhotoShare.ts`. No conflicts between worktrees detected.</p>
    </div>
  );
}

function Container46() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Container">
      <InfieAvatar3 />
      <Container47 />
    </div>
  );
}

function InfieAvatar4() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_246">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_246)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Container49() {
  return (
    <div className="bg-[rgba(45,212,191,0.05)] border-[0.667px] border-[rgba(45,212,191,0.13)] border-solid content-stretch flex flex-col items-start px-[14px] py-[10px] relative rounded-bl-[10px] rounded-br-[10px] rounded-tl-[3px] rounded-tr-[10px] self-stretch shrink-0 w-[726px]" data-name="Container">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[19.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[12px] w-[471px]">Emulator connected on port 8081. Doctor passed all checks. Handing control to session agent.</p>
    </div>
  );
}

function Container48() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="Container">
      <InfieAvatar4 />
      <Container49 />
    </div>
  );
}

function Container43() {
  return (
    <div className="content-stretch flex flex-[690_0_0] flex-col gap-[16px] items-start min-h-px overflow-clip p-[16px] relative w-full" data-name="Container">
      <Container44 />
      <Container46 />
      <Container48 />
    </div>
  );
}

function SessionIcon1() {
  return (
    <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
      <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />
    </div>
  );
}

function TopRow() {
  return (
    <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">Wrap up</p>
      <SessionIcon1 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">fix-reaction-bug</p>
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
      <TopRow />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">All tasks are complete</p>
    </div>
  );
}

function SessionIcon2() {
  return (
    <div className="overflow-clip relative rounded-[6px] shrink-0 size-[12px]" data-name="Session Icon">
      <SessionIcon className="absolute left-0 overflow-clip size-[12px] top-0" />
    </div>
  );
}

function TopRow1() {
  return (
    <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">Test changes in</p>
      <SessionIcon2 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">Add comments</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">​</p>
    </div>
  );
}

function Content1() {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
      <TopRow1 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">Attempt to add comment and react to it.</p>
    </div>
  );
}

function TextArea() {
  return (
    <div className="content-stretch flex flex-[564_0_0] flex-col h-[19.5px] items-start min-w-px overflow-clip relative" data-name="Text Area">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[19.5px] not-italic relative shrink-0 text-[#444] text-[12px] w-full">Ask Infie to coordinate, scan, or switch agents… (⌘↵)</p>
    </div>
  );
}

function Icon22() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_229)" id="Icon">
          <path d={svgPaths.p2ca29780} id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3f86e380} id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_229">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button15() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[28px]" data-name="Button">
      <Icon22 />
    </div>
  );
}

function Container51() {
  return (
    <div className="bg-[#252323] border-[0.667px] border-[rgba(45,212,191,0.14)] border-solid content-stretch flex gap-[8px] items-end px-[12px] py-[8px] relative rounded-[8px] shrink-0 w-full" data-name="Container">
      <TextArea />
      <Button15 />
    </div>
  );
}

function Container50() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start py-[12px] relative shrink-0 w-full" data-name="Container">
      <Container51 />
    </div>
  );
}

function Container38() {
  return (
    <div className="content-stretch flex flex-[808.167_0_0] flex-col items-start min-h-px overflow-clip relative w-full" data-name="Container">
      <Container39 />
      <Container43 />
      <div className="bg-[rgba(15,15,20,0.3)] relative rounded-[12px] shrink-0 w-full" data-name="InfieActionRow">
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative size-full">
            <div className="drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0" data-name="InfieActionButton">
              <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
              <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
              <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
                <p className="[word-break:break-word] font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#2dd4bf] text-[14px] whitespace-nowrap">✦</p>
                <Content />
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
            </div>
            <div className="drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px] shrink-0" data-name="InfieActionButton">
              <div aria-hidden className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
              <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
              <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
                <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
                <Content1 />
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
            </div>
          </div>
        </div>
      </div>
      <Container50 />
    </div>
  );
}

function Icon23() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text24() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#abefa3] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Sessions</p>
    </div>
  );
}

function Container53() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon23 />
      <Text24 />
    </div>
  );
}

function Container52() {
  return (
    <div className="bg-[rgba(171,239,163,0.08)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container53 />
    </div>
  );
}

function ListOfSessions() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-[1_0_0] gap-[6px] items-center justify-center min-h-px relative w-full" data-name="List of Sessions">
      <SessionCard branch="chore/fix-reaction-bug" className="drop-shadow-[0px_0px_8px_rgba(45,212,191,0.12)] relative rounded-[12px] shrink-0 w-[410px]" project="Pet" sessionName="Fix Reaction Bug" showProject={false} status="MERGED" tasks="8 / 8 Tasks" />
      <SessionCard agents="3 agents" branch="feat/add-comments" className="drop-shadow-[0px_0px_8px_rgba(251,191,36,0.12)] relative rounded-[12px] shrink-0 w-[410px]" sessionName="Add Comments" showProject={false} tasks="4 / 12 tasks" />
    </div>
  );
}

function Sessions() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[320px] items-start overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Sessions">
      <Container52 />
      <ListOfSessions />
    </div>
  );
}

function ChatSection() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-full items-start min-w-px relative" data-name="ChatSection">
      <Container38 />
      <Sessions />
    </div>
  );
}

function Icon24() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text25() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Human Testing 1/4</p>
    </div>
  );
}

function Container55() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon24 />
      <Text25 />
    </div>
  );
}

function Container54() {
  return (
    <div className="bg-[#1d1b20] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container55 />
    </div>
  );
}

function Icon25() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button16() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon25 />
    </div>
  );
}

function Text26() {
  return (
    <div className="content-stretch flex flex-[207.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] w-[208px]">Send button disabled with no photo selected</p>
    </div>
  );
}

function Container56() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button16 />
      <Text26 />
    </div>
  );
}

function Icon26() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button17() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon26 />
    </div>
  );
}

function Text27() {
  return (
    <div className="content-stretch flex flex-[207.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Photo picker opens on iOS and Android</p>
    </div>
  );
}

function Container57() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button17 />
      <Text27 />
    </div>
  );
}

function Checklist3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container56 />
      <Container57 />
    </div>
  );
}

function RightColumn1() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col items-start max-h-[208px] overflow-clip relative shrink-0 w-full" data-name="RightColumn">
      <Checklist3 />
    </div>
  );
}

function Text28() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">add comments</p>
    </div>
  );
}

function Container59() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text28 />
    </div>
  );
}

function Container58() {
  return (
    <div className="bg-[rgba(29,27,32,0.5)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex h-[21px] items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container59 />
    </div>
  );
}

function Icon27() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_161)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p3c156f40} id="Vector_2" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_161">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button18() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon27 />
    </div>
  );
}

function Text29() {
  return (
    <div className="content-stretch flex flex-[207.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[text-decoration-skip-ink:none] [text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] line-through not-italic relative shrink-0 text-[#555] text-[11px] w-[208px]">Send button disabled with no photo selected</p>
    </div>
  );
}

function Container60() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button18 />
      <Text29 />
    </div>
  );
}

function Checklist4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container60 />
    </div>
  );
}

function RightColumn2() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col items-start max-h-[208px] overflow-clip relative shrink-0 w-full" data-name="RightColumn">
      <Checklist4 />
    </div>
  );
}

function Text30() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">add comments</p>
    </div>
  );
}

function Container62() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-3.74%_-4.17%]">
            <svg className="block size-full" fill="none" height="14.3853" preserveAspectRatio="none" viewBox="0 0 13.0002 14.3853" width="13.0002">
              <path d={svgPaths.p3ce02300} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <Text30 />
    </div>
  );
}

function Container61() {
  return (
    <div className="bg-[rgba(29,27,32,0.5)] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex h-[21px] items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container62 />
    </div>
  );
}

function Icon28() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g clipPath="url(#clip0_0_148)" id="Icon">
          <path d={svgPaths.p1d11280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
        <defs>
          <clipPath id="clip0_0_148">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button19() {
  return (
    <div className="content-stretch flex flex-col h-[15px] items-start justify-center pt-[2px] relative shrink-0 w-[13px]" data-name="Button">
      <Icon28 />
    </div>
  );
}

function Text31() {
  return (
    <div className="content-stretch flex flex-[207.667_0_0] flex-col items-start min-w-px relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[17.875px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">Attempt to add comment and react to it</p>
    </div>
  );
}

function Container63() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-start px-[12px] py-[8px] relative shrink-0 w-full" data-name="Container">
      <Button19 />
      <Text31 />
    </div>
  );
}

function Icon29() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g id="Icon">
          <path d="M2.08333 5H7.91667" id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
          <path d="M5 2.08333V7.91667" id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.833333" />
        </g>
      </svg>
    </div>
  );
}

function Button20() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Button">
      <Icon29 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[15px] not-italic relative shrink-0 text-[#444] text-[10px] text-center whitespace-nowrap">Add item</p>
    </div>
  );
}

function Container64() {
  return (
    <div className="border-[rgba(255,255,255,0.05)] border-solid border-t-[0.667px] content-stretch flex flex-col items-start px-[12px] py-[6px] relative shrink-0 w-full" data-name="Container">
      <Button20 />
    </div>
  );
}

function Checklist5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Checklist">
      <Container63 />
      <Container64 />
    </div>
  );
}

function RightColumn3() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-col items-start max-h-[208px] overflow-clip relative shrink-0 w-full" data-name="RightColumn">
      <Checklist5 />
    </div>
  );
}

function HumanTesting() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[277px] items-start overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Human Testing">
      <Container54 />
      <RightColumn1 />
      <Container58 />
      <RightColumn2 />
      <Container61 />
      <RightColumn3 />
    </div>
  );
}

function Icon30() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text32() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">Explorer</p>
    </div>
  );
}

function Container66() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Container">
      <Icon30 />
      <Text32 />
    </div>
  );
}

function Container65() {
  return (
    <div className="bg-[#1d1b20] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex items-center justify-between px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Container66 />
    </div>
  );
}

function Icon31() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M3 4.5L6 7.5L9 4.5" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon32() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p7c0da00} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text33() {
  return (
    <div className="content-stretch flex flex-col items-start overflow-clip relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">pet-show-and-tell-i2Workspace</p>
    </div>
  );
}

function FileRow() {
  return (
    <div className="content-stretch flex gap-[6px] items-center px-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon31 />
      <Icon32 />
      <Text33 />
    </div>
  );
}

function Icon33() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M3 4.5L6 7.5L9 4.5" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon34() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p7c0da00} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[16.5px] items-start min-w-px overflow-clip relative" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">main</p>
    </div>
  );
}

function FileRow1() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon33 />
      <Icon34 />
      <Text34 />
    </div>
  );
}

function Icon35() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M3 4.5L6 7.5L9 4.5" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon36() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p7c0da00} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text35() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[15.625px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">src</p>
    </div>
  );
}

function FileRow2() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[32px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon35 />
      <Icon36 />
      <Text35 />
    </div>
  );
}

function Icon37() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M3 4.5L6 7.5L9 4.5" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon38() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p7c0da00} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text36() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[18.51px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">app</p>
    </div>
  );
}

function FileRow3() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[40px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon37 />
      <Icon38 />
      <Text36 />
    </div>
  );
}

function Icon39() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon40() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text37() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[30.5px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">(tabs)</p>
    </div>
  );
}

function FileRow4() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[48px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon39 />
      <Icon40 />
      <Text37 />
    </div>
  );
}

function Text38() {
  return <div className="h-0 relative shrink-0 w-[12px]" data-name="Text" />;
}

function Icon41() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p2a6a1c00} id="Vector" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d={svgPaths.p238db870} id="Vector_2" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M5.41667 4.875H4.33333" id="Vector_3" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M8.66667 7.04167H4.33333" id="Vector_4" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
          <path d="M8.66667 9.20833H4.33333" id="Vector_5" stroke="#7B9AB5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text39() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[56.583px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">_layout.tsx</p>
    </div>
  );
}

function FileRow5() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[50px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Text38 />
      <Icon41 />
      <Text39 />
    </div>
  );
}

function Icon42() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon43() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text40() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[61.573px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">components</p>
    </div>
  );
}

function FileRow6() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[36px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon42 />
      <Icon43 />
      <Text40 />
    </div>
  );
}

function Icon44() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon45() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text41() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[29.51px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">hooks</p>
    </div>
  );
}

function FileRow7() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[36px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon44 />
      <Icon45 />
      <Text41 />
    </div>
  );
}

function Icon46() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon47() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text42() {
  return (
    <div className="content-stretch flex flex-col h-[16px] items-start overflow-clip relative shrink-0" data-name="Text">
      <div className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] h-[16px] leading-[0] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] w-[119px]">
        <p className="leading-[16.5px] mb-0">feature/add-comments</p>
        <p className="leading-[16.5px]">​</p>
      </div>
    </div>
  );
}

function FileRow8() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon46 />
      <Icon47 />
      <Text42 />
    </div>
  );
}

function Icon48() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon49() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text43() {
  return (
    <div className="content-stretch flex flex-col h-[16px] items-start overflow-clip relative shrink-0" data-name="Text">
      <div className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] h-[16px] leading-[0] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] w-[119px]">
        <p className="leading-[16.5px] mb-0">chore/fix-reaction-bug</p>
        <p className="leading-[16.5px]">​</p>
      </div>
    </div>
  );
}

function FileRow9() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon48 />
      <Icon49 />
      <Text43 />
    </div>
  );
}

function Icon50() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon51() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text44() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0 w-[37.667px]" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">project</p>
    </div>
  );
}

function FileRow10() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon50 />
      <Icon51 />
      <Text44 />
    </div>
  );
}

function Icon52() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon53() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text45() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">temp</p>
    </div>
  );
}

function FileRow11() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon52 />
      <Icon53 />
      <Text45 />
    </div>
  );
}

function Icon54() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d="M4.5 9L7.5 6L4.5 3" id="Vector" stroke="#666666" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Icon55() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="13" preserveAspectRatio="none" viewBox="0 0 13 13" width="13">
        <g id="Icon">
          <path d={svgPaths.p18519200} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.08333" />
        </g>
      </svg>
    </div>
  );
}

function Text46() {
  return (
    <div className="content-stretch flex flex-col h-[16.5px] items-start overflow-clip relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#c5c5c5] text-[11px] whitespace-nowrap">generated</p>
    </div>
  );
}

function FileRow12() {
  return (
    <div className="content-stretch flex gap-[6px] items-center pl-[22px] pr-[8px] py-[3px] relative rounded-[6px] shrink-0 w-full" data-name="FileRow">
      <Icon54 />
      <Icon55 />
      <Text46 />
    </div>
  );
}

function ExplorerContent() {
  return (
    <div className="content-stretch flex flex-col h-[295px] items-start overflow-clip p-[4px] relative shrink-0 w-full" data-name="ExplorerContent">
      <FileRow />
      <FileRow1 />
      <FileRow2 />
      <FileRow3 />
      <FileRow4 />
      <FileRow5 />
      <FileRow6 />
      <FileRow7 />
      <FileRow8 />
      <FileRow9 />
      <FileRow10 />
      <FileRow11 />
      <FileRow12 />
    </div>
  );
}

function LeftColumn6() {
  return (
    <div className="bg-[#252323] content-stretch flex flex-[1_0_0] flex-col items-start min-h-px overflow-clip p-[4px] relative w-full" data-name="LeftColumn">
      <ExplorerContent />
    </div>
  );
}

function Explorer() {
  return (
    <div className="bg-[rgba(255,255,255,0)] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[333px] items-start overflow-clip relative rounded-[6px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Explorer">
      <Container65 />
      <LeftColumn6 />
    </div>
  );
}

function Icon56() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="12" preserveAspectRatio="none" viewBox="0 0 12 12" width="12">
        <g id="Icon">
          <path d={svgPaths.p233bb300} id="Vector" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p358d1c00} id="Vector_2" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p31563d00} id="Vector_3" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p37817400} id="Vector_4" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p14c67980} id="Vector_5" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p1acad500} id="Vector_6" stroke="#2A2A2A" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Text47() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#777] text-[11px] tracking-[0.275px] uppercase whitespace-nowrap">My Widgets</p>
    </div>
  );
}

function Container67() {
  return (
    <div className="bg-[#1d1b20] border-[rgba(255,255,255,0.05)] border-b-[0.667px] border-solid content-stretch flex gap-[8px] items-center px-[12px] py-[7px] relative shrink-0 w-full" data-name="Container">
      <Icon56 />
      <Text47 />
    </div>
  );
}

function Icon57() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.pf6e9500} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 11.0833H11.6667" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text48() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon57 />
    </div>
  );
}

function Button21() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-1 self-stretch shrink-0" data-name="Button">
      <Text48 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Terminal</p>
    </div>
  );
}

function Icon58() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g clipPath="url(#clip0_0_206)" id="Icon">
          <path d={svgPaths.p2f03b200} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1e0c2e80} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p8dd880} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p7d50f00} id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
        <defs>
          <clipPath id="clip0_0_206">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text49() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon58 />
    </div>
  );
}

function Button22() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-1 self-stretch shrink-0" data-name="Button">
      <Text49 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">EAS Build</p>
    </div>
  );
}

function Icon59() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g clipPath="url(#clip0_0_187)" id="Icon">
          <path d={svgPaths.p1ad2ef00} fill="#555555" id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p31d77900} fill="#555555" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p41ae980} fill="#555555" id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p2f386100} fill="#555555" id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p272e2f40} id="Vector_5" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
        <defs>
          <clipPath id="clip0_0_187">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text50() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon59 />
    </div>
  );
}

function Button23() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-3 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-1 self-stretch shrink-0" data-name="Button">
      <Text50 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Stylist</p>
    </div>
  );
}

function Icon60() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d="M6.41667 1.16667V2.33333" id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M2.91667 1.16667V2.33333" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p2faa3500} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p5185540} id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1a5b1f00} id="Vector_5" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text51() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon60 />
    </div>
  );
}

function Button24() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-2 self-stretch shrink-0" data-name="Button">
      <Text51 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Doctor</p>
    </div>
  );
}

function Icon61() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p3ba1200} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 5.25V7.58333" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 9.91667H7.00583" id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text52() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon61 />
    </div>
  );
}

function Button25() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-2 self-stretch shrink-0" data-name="Button">
      <Text52 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Problems</p>
    </div>
  );
}

function Icon62() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p2ebe2e00} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 12.8333V7" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p21a6a770} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M4.375 2.49083L9.625 5.495" id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text53() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon62 />
    </div>
  );
}

function Button26() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-3 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-2 self-stretch shrink-0" data-name="Button">
      <Text53 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Extensions</p>
    </div>
  );
}

function Icon63() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g clipPath="url(#clip0_0_250)" id="Icon">
          <path d={svgPaths.pc012c00} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 3.5V7L9.33333 8.16667" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
        <defs>
          <clipPath id="clip0_0_250">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text54() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon63 />
    </div>
  );
}

function Button27() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-3 self-stretch shrink-0" data-name="Button">
      <Text54 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Timeline</p>
    </div>
  );
}

function Icon64() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p8cdb700} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M12.25 12.25L9.74167 9.74167" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text55() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon64 />
    </div>
  );
}

function Button28() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-3 self-stretch shrink-0" data-name="Button">
      <Text55 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Search</p>
    </div>
  );
}

function Icon65() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d="M12.25 7H7.58333" id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M12.25 3.5H4.66667" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M12.25 10.5H7.58333" id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1a8c4100} id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1fd0e700} id="Vector_5" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text56() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon65 />
    </div>
  );
}

function Button29() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-3 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-3 self-stretch shrink-0" data-name="Button">
      <Text56 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Outline</p>
    </div>
  );
}

function Icon66() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d="M3.5 1.75V8.75" id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1d4d8100} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p2d33bc00} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p1f119680} id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text57() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon66 />
    </div>
  );
}

function Button30() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-4 self-stretch shrink-0" data-name="Button">
      <Text57 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Git</p>
    </div>
  );
}

function Icon67() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p100e7280} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p38a00300} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text58() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon67 />
    </div>
  );
}

function Button31() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-4 self-stretch shrink-0" data-name="Button">
      <Text58 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center w-[60px]">Human Testing</p>
    </div>
  );
}

function Icon68() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g clipPath="url(#clip0_0_173)" id="Icon">
          <path d={svgPaths.pc012c00} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p2913d800} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M1.16667 7H12.8333" id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
        <defs>
          <clipPath id="clip0_0_173">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text59() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon68 />
    </div>
  );
}

function Button32() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-3 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-4 self-stretch shrink-0" data-name="Button">
      <Text59 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Web Preview</p>
    </div>
  );
}

function Icon69() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p94c4b0} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 10.5H7.00583" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text60() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon69 />
    </div>
  );
}

function Button33() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-5 self-stretch shrink-0" data-name="Button">
      <Text60 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Android</p>
    </div>
  );
}

function Icon70() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p94c4b0} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M7 10.5H7.00583" id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text61() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon70 />
    </div>
  );
}

function Button34() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-5 self-stretch shrink-0" data-name="Button">
      <Text61 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">iOS</p>
    </div>
  );
}

function Icon71() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p16dcb0} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p29a9aa00} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p9f2bd80} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p13c0200} id="Vector_4" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text62() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon71 />
    </div>
  );
}

function Button35() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-3 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-5 self-stretch shrink-0" data-name="Button">
      <Text62 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Sessions</p>
    </div>
  );
}

function Icon72() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p33035500} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Text63() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon72 />
    </div>
  );
}

function Button36() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-1 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-6 self-stretch shrink-0" data-name="Button">
      <Text63 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Actions</p>
    </div>
  );
}

function Icon73() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g clipPath="url(#clip0_0_164)" id="Icon">
          <path d={svgPaths.p3b016f00} id="Vector" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p23023200} id="Vector_2" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.pb269580} id="Vector_3" stroke="#555555" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
        <defs>
          <clipPath id="clip0_0_164">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text64() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <Icon73 />
    </div>
  );
}

function Button37() {
  return (
    <div className="bg-[#1d1b20] border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid col-2 content-stretch flex flex-col gap-[6px] items-center justify-self-stretch p-[10px] relative rounded-[6px] row-6 self-stretch shrink-0" data-name="Button">
      <Text64 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[11.25px] not-italic relative shrink-0 text-[#444] text-[9px] text-center whitespace-nowrap">Library</p>
    </div>
  );
}

function Container68() {
  return (
    <div className="bg-[#252323] flex-[256.125_0_0] gap-x-[6px] gap-y-[6px] grid grid-cols-[___80.89px_80.89px_80.90px] grid-rows-[______52.58px_52.58px_52.58px_63.83px_52.58px_52.58px] min-h-px overflow-clip p-[8px] relative w-full" data-name="Container">
      <Button21 />
      <Button22 />
      <Button23 />
      <Button24 />
      <Button25 />
      <Button26 />
      <Button27 />
      <Button28 />
      <Button29 />
      <Button30 />
      <Button31 />
      <Button32 />
      <Button33 />
      <Button34 />
      <Button35 />
      <Button36 />
      <Button37 />
    </div>
  );
}

function MyWidgets() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.05)] border-solid content-stretch flex flex-col h-[285px] items-start overflow-clip relative rounded-[6px] shrink-0 w-full" data-name="My Widgets">
      <Container67 />
      <Container68 />
    </div>
  );
}

function RightColumn() {
  return (
    <div className="content-stretch flex flex-col h-full items-center justify-between overflow-clip relative shrink-0 w-[272px]" data-name="RightColumn">
      <HumanTesting />
      <Explorer />
      <MyWidgets />
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex flex-[1205.333_0_0] gap-[8px] h-[965px] items-center min-w-px overflow-clip p-[10px] relative" data-name="Container">
      <LeftColumn />
      <ChatSection />
      <RightColumn />
    </div>
  );
}

function Main() {
  return (
    <div className="absolute content-stretch flex h-[965px] items-center justify-between left-0 overflow-clip top-[59px] w-[1440px]" data-name="Main">
      <Container4 />
    </div>
  );
}

function Icon74() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="Icon">
          <path d={svgPaths.p1a7b80c0} id="Infiniti" stroke="#061413" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Container71() {
  return (
    <div className="bg-[rgba(171,239,163,0.16)] content-stretch flex gap-[8px] h-[30px] items-center justify-center relative rounded-[9px] shrink-0 w-[57px]" data-name="Container">
      <Icon74 />
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[#061413] text-[18px] tracking-[-0.54px] whitespace-nowrap">i2</p>
    </div>
  );
}

function Container70() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container71 />
    </div>
  );
}

function Container73() {
  return (
    <div className="bg-[#abefa3] content-stretch flex gap-[8px] h-[30px] items-center justify-center px-[8px] relative rounded-[9px] shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Folder">
        <div className="absolute inset-[12.5%_8.33%]" data-name="Icon">
          <div className="absolute inset-[-10%_-9%]">
            <svg className="block size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 19.6667 18" width="19.6667">
              <path d={svgPaths.p34cd6d80} id="Icon" stroke="#061413" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[#061413] text-[18px] tracking-[-0.54px] whitespace-nowrap">Pet Show and Tell</p>
    </div>
  );
}

function Container72() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container73 />
    </div>
  );
}

function Container75() {
  return (
    <div className="bg-[rgba(171,239,163,0.16)] content-stretch flex gap-[8px] items-center justify-center px-[8px] relative rounded-[9px] shrink-0" data-name="Container">
      <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Codesandbox">
        <div className="absolute inset-[8.34%_12.5%_8%_12.5%]" data-name="Icon">
          <div className="absolute inset-[-2.99%_-3.33%]">
            <svg className="block size-full" fill="none" height="17.7316" preserveAspectRatio="none" viewBox="0 0 16.0002 17.7316" width="16.0002">
              <path d={svgPaths.p53bd700} id="Icon" stroke="#F1F1F1" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.3" />
            </svg>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[18px] text-[rgba(241,241,241,0.3)] tracking-[-0.54px] whitespace-nowrap">Session</p>
    </div>
  );
}

function Container74() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container75 />
    </div>
  );
}

function Container69() {
  return (
    <div className="content-stretch flex gap-[16px] h-[29px] items-center relative shrink-0 w-[423px]" data-name="Container">
      <Container70 />
      <Container72 />
      <Container74 />
    </div>
  );
}

function Button38() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0" data-name="Button">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.4)] text-center whitespace-nowrap">Tutorials</p>
    </div>
  );
}

function Button39() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0" data-name="Button">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.4)] text-center whitespace-nowrap">Widgets</p>
    </div>
  );
}

function Icon75() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g clipPath="url(#clip0_0_153)" id="Icon">
          <path d={svgPaths.p31e53b00} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="0.833333" />
        </g>
        <defs>
          <clipPath id="clip0_0_153">
            <rect fill="white" height="10" width="10" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text65() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Games</p>
    </div>
  );
}

function Text66() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] content-stretch flex flex-col items-start px-[5px] py-px relative rounded-[3px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[13.5px] relative shrink-0 text-[9px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">SOON</p>
    </div>
  );
}

function Container77() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.06)] border-solid content-stretch flex gap-[6px] items-center px-[10px] py-[3px] relative rounded-[7px] shrink-0" data-name="Container">
      <Icon75 />
      <Text65 />
      <Text66 />
    </div>
  );
}

function ContainerMargin() {
  return (
    <div className="content-stretch flex items-start pl-[4px] relative shrink-0" data-name="Container:margin">
      <Container77 />
    </div>
  );
}

function Container76() {
  return (
    <div className="content-stretch flex gap-[2px] h-[28px] items-center pl-[16px] relative shrink-0 w-[423.333px]" data-name="Container">
      <Button38 />
      <Button39 />
      <ContainerMargin />
    </div>
  );
}

function Icon76() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#clip0_0_150)" id="Icon">
          <path d={svgPaths.p15f0d100} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M4.125 1.375V9.625" id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="clip0_0_150">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button40() {
  return (
    <div className="bg-[#373434] content-stretch drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)] flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="Button">
      <Icon76 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-center text-white whitespace-nowrap">Workspace</p>
    </div>
  );
}

function Icon77() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#clip0_0_143)" id="Icon">
          <path d={svgPaths.peca3800} id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p1d328980} id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p1d8bf000} id="Vector_3" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p246cf80} id="Vector_4" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="clip0_0_143">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button41() {
  return (
    <div className="content-stretch flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="Button">
      <Icon77 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#444] text-[11px] text-center whitespace-nowrap">Emulators</p>
    </div>
  );
}

function Container78() {
  return (
    <div className="bg-[rgba(0,0,0,0.25)] content-stretch flex gap-[2px] items-center p-[2px] relative rounded-[6px] shrink-0" data-name="Container">
      <Button40 />
      <Button41 />
    </div>
  );
}

function Icon78() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g id="Icon">
          <path d={svgPaths.p20d46b80} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
      </svg>
    </div>
  );
}

function Text67() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#abefa3] text-[11px] text-center whitespace-nowrap">Start App</p>
    </div>
  );
}

function Text68() {
  return (
    <div className="bg-[rgba(171,239,163,0.2)] border-[0.667px] border-[rgba(171,239,163,0.3)] border-solid content-stretch flex flex-col items-center px-[6px] py-[2px] relative rounded-[3px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[9px] not-italic relative shrink-0 text-[#abefa3] text-[9px] text-center whitespace-nowrap">Go</p>
    </div>
  );
}

function TextMargin() {
  return (
    <div className="content-stretch flex items-start pl-[2px] relative shrink-0" data-name="Text:margin">
      <Text68 />
    </div>
  );
}

function Button42() {
  return (
    <div className="bg-[rgba(171,239,163,0.15)] border-[rgba(171,239,163,0.3)] border-b-[0.667px] border-l-[0.667px] border-solid border-t-[0.667px] content-stretch flex gap-[6px] h-[28px] items-center pl-[10px] pr-[8px] relative rounded-bl-[5px] rounded-tl-[5px] shrink-0" data-name="Button">
      <Icon78 />
      <Text67 />
      <TextMargin />
    </div>
  );
}

function Icon79() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g id="Icon">
          <path d={svgPaths.p26a1c040} id="Vector" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
      </svg>
    </div>
  );
}

function Button43() {
  return (
    <div className="bg-[rgba(171,239,163,0.15)] border-[0.667px] border-[rgba(171,239,163,0.3)] border-solid content-stretch flex h-[28px] items-center justify-center px-[6px] relative rounded-br-[5px] rounded-tr-[5px] shrink-0" data-name="Button">
      <Icon79 />
    </div>
  );
}

function AppRunControls() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="AppRunControls">
      <Button42 />
      <Button43 />
    </div>
  );
}

function Bell() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[15px] top-1/2" data-name="bell">
      <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 15 15" width="15">
        <g id="bell">
          <path d={svgPaths.p22c2c180} id="Vector" stroke="white" strokeLinecap="round" strokeOpacity="0.2" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function Icon80() {
  return (
    <div className="overflow-clip relative shrink-0 size-[15px]" data-name="Icon">
      <Bell />
    </div>
  );
}

function Button44() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0" data-name="Button">
      <Icon80 />
    </div>
  );
}

function Icon81() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 15 15" width="15">
        <g id="Icon">
          <path d={svgPaths.pf3df880} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="1.25" />
          <path d={svgPaths.p66e3e00} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function Button45() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0" data-name="Button">
      <Icon81 />
    </div>
  );
}

function Container80() {
  return (
    <div className="bg-[rgba(171,239,163,0.07)] border-[0.667px] border-[rgba(171,239,163,0.2)] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[5px] relative rounded-[100px] shrink-0" data-name="Container">
      <Button44 />
      <Button45 />
    </div>
  );
}

function Container79() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container80 />
    </div>
  );
}

function ContainerAlign1() {
  return (
    <div className="content-stretch flex items-start justify-end relative shrink-0 w-[77px]" data-name="Container:align">
      <Container79 />
    </div>
  );
}

function Header() {
  return (
    <div className="absolute border-[rgba(255,255,255,0.06)] border-b-[0.667px] border-solid content-stretch flex h-[59px] items-center justify-between left-0 px-[24px] top-0 w-[1440px]" data-name="Header">
      <Container69 />
      <Container76 />
      <Container78 />
      <AppRunControls />
      <ContainerAlign1 />
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[#0a0814] h-[1024px] overflow-clip relative shrink-0 w-full" data-name="Container">
      <Background />
      <Main />
      <Header />
    </div>
  );
}

function Body() {
  return (
    <div className="content-stretch flex flex-col h-[1024px] items-start overflow-clip relative shrink-0 w-full" data-name="Body">
      <Container />
    </div>
  );
}

export default function OpenProject() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full" data-name="OpenProject">
      <Body />
    </div>
  );
}