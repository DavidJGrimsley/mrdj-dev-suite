import svgPaths from "./svg-7jv8fiwh2h";
import imgImage from "./d9f2b29a94f507fec634bd88b7d6597b7dbe32af.png";

function ProjectIcon({ className }: { className?: string }) {
  return (
    <div className={className || "overflow-clip relative size-[12px]"} data-name="ProjectIcon">
      <div className="absolute inset-[13.24%_8.33%]" data-name="Icon">
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
      <div className="absolute h-[10px] left-[1.59px] top-px w-[8.824px]" data-name="Icon">
        <div className="absolute inset-[-3.5%_-3.97%]">
          <svg className="block size-full" fill="none" height="10.7" preserveAspectRatio="none" viewBox="0 0 9.52364 10.7" width="9.52364">
            <path d={svgPaths.p11ed5c00} id="Icon" stroke="#ABEFA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Container2() {
  return <div className="absolute left-[-200px] rounded-[400px] size-[800px] top-[-250px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 800 800' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -56.569 -56.569 0 400 400)'><stop stop-color='rgba(45,212,191,0.08)' offset='0'/><stop stop-color='rgba(45,212,191,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Container3() {
  return <div className="absolute left-[1155.33px] rounded-[350px] size-[700px] top-[50px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 700 700' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -49.497 -49.497 0 350 350)'><stop stop-color='rgba(74,58,255,0.07)' offset='0'/><stop stop-color='rgba(74,58,255,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Container4() {
  return <div className="absolute left-[596.86px] rounded-[300px] size-[600px] top-[411.33px]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(0 -42.426 -42.426 0 300 300)'><stop stop-color='rgba(171,239,163,0.05)' offset='0'/><stop stop-color='rgba(171,239,163,0)' offset='0.65'/></radialGradient></defs></svg>\")" }} data-name="Container" />;
}

function Image() {
  return (
    <div className="absolute h-[931.333px] left-0 opacity-20 top-0 w-[1705.333px]" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute h-[1023px] left-0 overflow-clip top-0 w-[1440px]" data-name="Container">
      <Container2 />
      <Container3 />
      <Container4 />
      <Image />
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="18" preserveAspectRatio="none" viewBox="0 0 18 18" width="18">
        <g id="Icon">
          <path d={svgPaths.p1a7b80c0} id="Vector" stroke="#061413" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Container7() {
  return (
    <div className="bg-[#abefa3] content-stretch flex gap-[8px] h-[30px] items-center justify-center relative rounded-[9px] shrink-0 w-[57px]" data-name="Container">
      <Icon />
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[#061413] text-[18px] tracking-[-0.54px] whitespace-nowrap">i2</p>
    </div>
  );
}

function Container6() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container7 />
    </div>
  );
}

function Container9() {
  return (
    <div className="bg-[rgba(171,239,163,0.16)] content-stretch flex h-[30px] items-center justify-center relative rounded-[9px] shrink-0 w-[73px]" data-name="Container">
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[18px] text-[rgba(255,255,255,0.3)] tracking-[-0.54px] whitespace-nowrap">Project</p>
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container9 />
    </div>
  );
}

function Container11() {
  return (
    <div className="bg-[rgba(171,239,163,0.16)] content-stretch flex h-[30px] items-center justify-center relative rounded-[9px] shrink-0 w-[73px]" data-name="Container">
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[27px] relative shrink-0 text-[18px] text-[rgba(255,255,255,0.3)] tracking-[-0.54px] whitespace-nowrap">Session</p>
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container11 />
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex gap-[16px] h-[29px] items-center relative shrink-0 w-[423px]" data-name="Container">
      <Container6 />
      <Container8 />
      <Container10 />
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0" data-name="Button">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.4)] text-center whitespace-nowrap">Tutorials</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center px-[12px] py-[4px] relative rounded-[7px] shrink-0" data-name="Button">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[19.5px] relative shrink-0 text-[13px] text-[rgba(255,255,255,0.4)] text-center whitespace-nowrap">Widgets</p>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[10px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="10" preserveAspectRatio="none" viewBox="0 0 10 10" width="10">
        <g clipPath="url(#clip0_0_38)" id="Icon">
          <path d={svgPaths.p31e53b00} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.2" strokeWidth="0.833333" />
        </g>
        <defs>
          <clipPath id="clip0_0_38">
            <rect fill="white" height="10" width="10" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Games</p>
    </div>
  );
}

function Text1() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] content-stretch flex flex-col items-start px-[5px] py-px relative rounded-[3px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[13.5px] relative shrink-0 text-[9px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">SOON</p>
    </div>
  );
}

function Container13() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.06)] border-solid content-stretch flex gap-[6px] items-center px-[10px] py-[3px] relative rounded-[7px] shrink-0" data-name="Container">
      <Icon1 />
      <Text />
      <Text1 />
    </div>
  );
}

function ContainerMargin() {
  return (
    <div className="content-stretch flex items-start pl-[4px] relative shrink-0" data-name="Container:margin">
      <Container13 />
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex gap-[2px] h-[28px] items-center pl-[16px] relative shrink-0 w-[423.333px]" data-name="Container">
      <Button />
      <Button1 />
      <ContainerMargin />
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#clip0_0_60)" id="Icon">
          <path d={svgPaths.p15f0d100} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d="M4.125 1.375V9.625" id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="clip0_0_60">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#373434] content-stretch drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)] flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="Button">
      <Icon2 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[11px] text-center text-white whitespace-nowrap">Workspace</p>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[11px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="11" preserveAspectRatio="none" viewBox="0 0 11 11" width="11">
        <g clipPath="url(#clip0_0_53)" id="Icon">
          <path d={svgPaths.peca3800} id="Vector" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p1d328980} id="Vector_2" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p1d8bf000} id="Vector_3" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
          <path d={svgPaths.p246cf80} id="Vector_4" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.916667" />
        </g>
        <defs>
          <clipPath id="clip0_0_53">
            <rect fill="white" height="11" width="11" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="content-stretch flex gap-[6px] items-center px-[12px] py-[4px] relative rounded-[4px] shrink-0" data-name="Button">
      <Icon3 />
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Medium',sans-serif] leading-[16.5px] not-italic relative shrink-0 text-[#444] text-[11px] text-center whitespace-nowrap">Emulators</p>
    </div>
  );
}

function Container14() {
  return (
    <div className="bg-[rgba(0,0,0,0.25)] content-stretch flex gap-[2px] items-center p-[2px] relative rounded-[6px] shrink-0" data-name="Container">
      <Button2 />
      <Button3 />
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

function Icon4() {
  return (
    <div className="overflow-clip relative shrink-0 size-[15px]" data-name="Icon">
      <Bell />
    </div>
  );
}

function Button4() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0" data-name="Button">
      <Icon4 />
    </div>
  );
}

function Icon5() {
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

function Button5() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center p-[4px] relative shrink-0" data-name="Button">
      <Icon5 />
    </div>
  );
}

function Container16() {
  return (
    <div className="bg-[rgba(171,239,163,0.07)] border-[0.667px] border-[rgba(171,239,163,0.2)] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[5px] relative rounded-[100px] shrink-0" data-name="Container">
      <Button4 />
      <Button5 />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="Container">
      <Container16 />
    </div>
  );
}

function ContainerAlign() {
  return (
    <div className="content-stretch flex items-start justify-end relative shrink-0 w-[277px]" data-name="Container:align">
      <Container15 />
    </div>
  );
}

function Header() {
  return (
    <div className="absolute border-[rgba(255,255,255,0.06)] border-b-[0.667px] border-solid content-stretch flex h-[59px] items-center justify-between left-0 px-[24px] top-0 w-[1440px]" data-name="Header">
      <Container5 />
      <Container12 />
      <Container14 />
      <ContainerAlign />
    </div>
  );
}

function InfieAvatar() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="InfieAvatar">
      <svg className="absolute block inset-0 size-full" fill="none" height="22" preserveAspectRatio="none" viewBox="0 0 22 22" width="22">
        <g id="InfieAvatar">
          <mask fill="white" id="path-1-inside-1_0_36">
            <path d={svgPaths.p3d935080} />
          </mask>
          <path d={svgPaths.p3d935080} fill="#2DD4BF" fillOpacity="0.094" />
          <path d={svgPaths.pd00cf00} fill="#2DD4BF" fillOpacity="0.25" mask="url(#path-1-inside-1_0_36)" />
          <path d={svgPaths.p141f87c0} id="Infiniti" stroke="#2DD4BF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.875" />
        </g>
      </svg>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-semibold leading-[22.5px] relative shrink-0 text-[15px] text-white whitespace-nowrap">Infie</p>
    </div>
  );
}

function Container18() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[107.521px]" data-name="Container">
      <Paragraph />
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="Container">
      <InfieAvatar />
      <Container18 />
    </div>
  );
}

function Container22() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid content-stretch flex flex-col items-start px-[13px] py-[9px] relative rounded-[12px] self-stretch shrink-0" data-name="Container">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[20.8px] not-italic relative shrink-0 text-[13px] text-[rgba(255,255,255,0.8)] whitespace-nowrap">Hello, Tony. What would you like to build today?</p>
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Container">
      <Container22 />
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

function ProjectIcon1() {
  return (
    <div className="overflow-clip relative rounded-[3px] shrink-0 size-[12px]" data-name="Project Icon">
      <ProjectIcon className="absolute left-0 overflow-clip size-[12px] top-0" />
    </div>
  );
}

function TopRow() {
  return (
    <div className="content-stretch flex gap-[4px] items-center overflow-clip relative shrink-0" data-name="top-row">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[13px] text-white whitespace-nowrap">Test changes in</p>
      <SessionIcon1 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">Add comments</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.4)] whitespace-nowrap">in</p>
      <ProjectIcon1 />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.6)] whitespace-nowrap">Pet Show and Tell</p>
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start overflow-clip relative shrink-0" data-name="content">
      <TopRow />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[11px] text-[rgba(255,255,255,0.7)] whitespace-nowrap">Attempt to add comment and react to it.</p>
    </div>
  );
}

function Container20() {
  return (
    <div className="content-stretch flex flex-col h-[173px] items-start justify-between max-h-[300px] overflow-clip p-[16px] relative shrink-0 w-full" data-name="Container">
      <Container21 />
      <div className="bg-[rgba(15,15,20,0.3)] relative rounded-[12px] shrink-0 w-full" data-name="InfieActionRow">
        <div className="flex flex-row items-center justify-center size-full">
          <div className="content-stretch flex gap-[8px] items-center justify-center p-[8px] relative size-full">
            <div className="drop-shadow-[0px_0px_6px_rgba(45,212,191,0.35)] relative rounded-[999px] shrink-0" data-name="InfieActionButton">
              <div aria-hidden className="absolute bg-[rgba(17,40,37,0.75)] inset-0 pointer-events-none rounded-[999px]" />
              <div aria-hidden className="absolute border border-[rgba(45,212,191,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
              <div className="flex flex-row items-center size-full">
                <div className="[word-break:break-word] content-stretch flex gap-[8px] items-center leading-[normal] not-italic pl-[12px] pr-[16px] py-[7px] relative size-full whitespace-nowrap">
                  <p className="font-['Inter:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium relative shrink-0 text-[#2dd4bf] text-[14px]">✦</p>
                  <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">{`What's Next`}</p>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(45,212,191,0.25)]" />
            </div>
            <div className="drop-shadow-[0px_0px_6px_rgba(251,191,36,0.35)] relative rounded-[999px] shrink-0" data-name="InfieActionButton">
              <div aria-hidden className="absolute bg-[rgba(45,37,15,0.75)] inset-0 pointer-events-none rounded-[999px]" />
              <div aria-hidden className="absolute border border-[rgba(251,191,36,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
              <div className="content-stretch flex gap-[8px] items-start pl-[12px] pr-[16px] py-[10px] relative size-full">
                <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#fbbf24] text-[14px] whitespace-nowrap">⚠</p>
                <Content />
              </div>
              <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_0px_25px_0px_rgba(251,191,36,0.25)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextInput() {
  return (
    <div className="bg-[rgba(255,255,255,0.04)] border-[0.667px] border-[rgba(255,255,255,0.1)] border-solid content-stretch flex flex-[630.667_0_0] flex-col items-start justify-center min-w-px overflow-clip px-[14px] py-[10px] relative rounded-[10px] self-stretch" data-name="Text Input">
      <p className="[word-break:break-word] font-['Rounded_Mplus_1c:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[13px] text-[rgba(255,255,255,0.25)] w-full">Talk to Infie…</p>
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 15 15" width="15">
        <g clipPath="url(#clip0_0_46)" id="Icon">
          <path d={svgPaths.p3eb2d400} id="Vector" stroke="#06201D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          <path d={svgPaths.p36f85800} id="Vector_2" stroke="#06201D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
        </g>
        <defs>
          <clipPath id="clip0_0_46">
            <rect fill="white" height="15" width="15" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button6() {
  return (
    <div className="bg-[#2dd4bf] content-stretch flex items-center justify-center relative rounded-[10px] shrink-0 size-[40px]" data-name="Button">
      <Icon6 />
    </div>
  );
}

function Container23() {
  return (
    <div className="border-[rgba(255,255,255,0.06)] border-solid border-t-[0.667px] content-stretch flex gap-[8px] items-start p-[12px] relative shrink-0 w-full" data-name="Container">
      <TextInput />
      <Button6 />
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[16px] shrink-0 w-full" data-name="Container">
      <Container20 />
      <Container23 />
    </div>
  );
}

function ContainerMargin2() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0 w-full" data-name="Container:margin">
      <Container19 />
    </div>
  );
}

function InfieConvo() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-name="Infie Convo">
      <Container17 />
      <ContainerMargin2 />
    </div>
  );
}

function Frame() {
  return <div className="h-[100px] relative shrink-0 w-[18px]" />;
}

function Paragraph1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.3)] tracking-[1.1px] uppercase whitespace-nowrap">Active Projects</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[19.5px] relative shrink-0 text-[13px] text-white whitespace-nowrap">My Portfolio</p>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Paragraph2 />
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[18px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.35)] whitespace-nowrap">Personal portfolio site</p>
    </div>
  );
}

function Text2() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex flex-col items-start px-[7px] py-[2px] relative rounded-[4px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[15px] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Generic</p>
    </div>
  );
}

function Text3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">1 session</p>
    </div>
  );
}

function Text4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">5d ago</p>
    </div>
  );
}

function TextAlign() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Text:align">
      <Text4 />
    </div>
  );
}

function Container26() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Text2 />
      <Text3 />
      <TextAlign />
    </div>
  );
}

function ContainerMargin4() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full" data-name="Container:margin">
      <Container26 />
    </div>
  );
}

function Button7() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid col-1 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch max-w-[260px] min-w-[200px] px-[18px] py-[16px] relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Button">
      <Container25 />
      <Paragraph3 />
      <ContainerMargin4 />
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[19.5px] relative shrink-0 text-[13px] text-white whitespace-nowrap">Pet Show and Tell</p>
    </div>
  );
}

function Container28() {
  return <div className="bg-[#abefa3] relative rounded-[3.5px] shrink-0 size-[7px]" data-name="Container" />;
}

function ContainerMargin5() {
  return (
    <div className="content-stretch flex items-start pt-[3px] relative shrink-0" data-name="Container:margin">
      <Container28 />
    </div>
  );
}

function Container27() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Paragraph4 />
      <ContainerMargin5 />
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[18px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.35)] whitespace-nowrap">Pet photo sharing social app</p>
    </div>
  );
}

function Text5() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex flex-col items-start px-[7px] py-[2px] relative rounded-[4px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[15px] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Expo</p>
    </div>
  );
}

function Text6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">2 sessions</p>
    </div>
  );
}

function Text7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">Now</p>
    </div>
  );
}

function TextAlign1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Text:align">
      <Text7 />
    </div>
  );
}

function Container29() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Text5 />
      <Text6 />
      <TextAlign1 />
    </div>
  );
}

function ContainerMargin6() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full" data-name="Container:margin">
      <Container29 />
    </div>
  );
}

function Button8() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid col-2 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch max-w-[260px] min-w-[200px] px-[18px] py-[16px] relative rounded-[14px] row-1 self-stretch shrink-0" data-name="Button">
      <Container27 />
      <Paragraph5 />
      <ContainerMargin6 />
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[19.5px] relative shrink-0 text-[13px] text-white whitespace-nowrap">Task Tracker</p>
    </div>
  );
}

function Container30() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Paragraph6 />
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[18px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.35)] whitespace-nowrap">Track your chores</p>
    </div>
  );
}

function Text8() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex flex-col items-start px-[7px] py-[2px] relative rounded-[4px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[15px] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Generic</p>
    </div>
  );
}

function Text9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">1 session</p>
    </div>
  );
}

function Text10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">2w ago</p>
    </div>
  );
}

function TextAlign2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Text:align">
      <Text10 />
    </div>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Text8 />
      <Text9 />
      <TextAlign2 />
    </div>
  );
}

function ContainerMargin7() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full" data-name="Container:margin">
      <Container31 />
    </div>
  );
}

function Button9() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid col-1 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch max-w-[260px] min-w-[200px] px-[18px] py-[16px] relative rounded-[14px] row-2 self-stretch shrink-0" data-name="Button">
      <Container30 />
      <Paragraph7 />
      <ContainerMargin7 />
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[19.5px] relative shrink-0 text-[13px] text-white whitespace-nowrap">Basketball Courts</p>
    </div>
  );
}

function Container33() {
  return <div className="bg-[#abefa3] relative rounded-[3.5px] shrink-0 size-[7px]" data-name="Container" />;
}

function ContainerMargin8() {
  return (
    <div className="content-stretch flex items-start pt-[3px] relative shrink-0" data-name="Container:margin">
      <Container33 />
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="Container">
      <Paragraph8 />
      <ContainerMargin8 />
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[18px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.35)] whitespace-nowrap">Find your closest basketball court</p>
    </div>
  );
}

function Text11() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex flex-col items-start px-[7px] py-[2px] relative rounded-[4px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[15px] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Workspace</p>
    </div>
  );
}

function Text12() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">1 session</p>
    </div>
  );
}

function Text13() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">1d ago</p>
    </div>
  );
}

function TextAlign3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Text:align">
      <Text13 />
    </div>
  );
}

function Container34() {
  return (
    <div className="content-stretch flex gap-[8px] h-[24.333px] items-center pt-[4px] relative shrink-0 w-[179px]" data-name="Container">
      <Text11 />
      <Text12 />
      <TextAlign3 />
    </div>
  );
}

function Button10() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid col-2 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch max-w-[260px] min-w-[200px] px-[18px] py-[16px] relative rounded-[14px] row-2 self-stretch shrink-0" data-name="Button">
      <Container32 />
      <Paragraph9 />
      <Container34 />
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[19.5px] relative shrink-0 text-[13px] text-white whitespace-nowrap">Not hot dog</p>
    </div>
  );
}

function Container35() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Container">
      <Paragraph10 />
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Paragraph">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[18px] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.35)] whitespace-nowrap">Image classification app</p>
    </div>
  );
}

function Text14() {
  return (
    <div className="border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex flex-col items-start px-[7px] py-[2px] relative rounded-[4px] shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[15px] relative shrink-0 text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">Expo</p>
    </div>
  );
}

function Text15() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">1 session</p>
    </div>
  );
}

function Text16() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Text">
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[16.5px] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.2)] whitespace-nowrap">1w ago</p>
    </div>
  );
}

function TextAlign4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-end min-w-px relative" data-name="Text:align">
      <Text16 />
    </div>
  );
}

function Container36() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Container">
      <Text14 />
      <Text15 />
      <TextAlign4 />
    </div>
  );
}

function ContainerMargin9() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[4px] relative shrink-0 w-full" data-name="Container:margin">
      <Container36 />
    </div>
  );
}

function Button11() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] border-[0.667px] border-[rgba(255,255,255,0.07)] border-solid col-1 content-stretch flex flex-col gap-[8px] items-start justify-self-stretch max-w-[260px] min-w-[200px] px-[18px] py-[16px] relative rounded-[14px] row-3 self-stretch shrink-0" data-name="Button">
      <Container35 />
      <Paragraph11 />
      <ContainerMargin9 />
    </div>
  );
}

function Container24() {
  return (
    <div className="gap-x-[20px] gap-y-[28px] grid grid-cols-[repeat(2,minmax(0,1fr))] grid-rows-[repeat(3,fit-content(100%))] relative shrink-0 w-full" data-name="Container">
      <Button7 />
      <Button8 />
      <Button9 />
      <Button10 />
      <Button11 />
    </div>
  );
}

function ContainerMargin3() {
  return (
    <div className="content-stretch flex flex-col items-start pt-[16px] relative shrink-0 w-full" data-name="Container:margin">
      <Container24 />
    </div>
  );
}

function RecentProjects() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[558px]" data-name="Recent Projects">
      <Paragraph1 />
      <ContainerMargin3 />
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="Icon">
          <path d={svgPaths.p1d59db00} id="Vector" stroke="#061413" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button12() {
  return (
    <div className="content-stretch flex flex-[349.729_0_0] gap-[8px] h-full items-center justify-center min-w-px px-[18px] py-[14px] relative" data-name="Button">
      <Icon7 />
      <p className="[word-break:break-word] font-['Space_Grotesk:Bold',sans-serif] font-semibold leading-[21px] relative shrink-0 text-[#061413] text-[14px] text-center whitespace-nowrap">Generate new Expo Project</p>
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="Icon">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="#061413" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button13() {
  return (
    <div className="border-[rgba(6,20,19,0.25)] border-l-[0.667px] border-solid content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="Button">
      <Icon8 />
    </div>
  );
}

function Container37() {
  return (
    <div className="content-stretch flex h-full items-start overflow-clip relative rounded-[12px] shrink-0 w-[272px]" style={{ backgroundImage: "linear-gradient(175.56209635338064deg, rgb(140, 255, 255) 12.637%, rgb(26, 153, 153) 80.72%)" }} data-name="Container">
      <Button12 />
      <Button13 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="Icon">
          <path d={svgPaths.p1975cc00} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Button14() {
  return (
    <div className="bg-[rgba(255,255,255,0.04)] border-[0.667px] border-[rgba(255,255,255,0.08)] border-solid content-stretch flex gap-[8px] h-full items-center justify-center px-[20px] py-[14px] relative rounded-[12px] shrink-0 w-[119px]" data-name="Button">
      <Icon9 />
      <p className="[word-break:break-word] font-['Space_Grotesk:Medium',sans-serif] font-medium leading-[21px] relative shrink-0 text-[14px] text-[rgba(255,255,255,0.7)] text-center whitespace-nowrap">Open New</p>
    </div>
  );
}

function New() {
  return (
    <div className="content-stretch flex gap-[12px] h-[58px] items-center justify-center relative shrink-0 w-[511px]" data-name="New">
      <Container37 />
      <Button14 />
    </div>
  );
}

function RightSide() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[72px] h-[604px] items-center justify-center min-w-px relative" data-name="Right side">
      <RecentProjects />
      <New />
    </div>
  );
}

function MainContent() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[32px] items-center justify-center max-w-[1261px] min-h-px pb-[48px] pt-[40px] px-[32px] relative w-full" data-name="Main Content">
      <InfieConvo />
      <Frame />
      <RightSide />
    </div>
  );
}

function ContainerMargin1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col items-center min-h-px relative w-full" data-name="Container:margin">
      <MainContent />
    </div>
  );
}

function Main() {
  return (
    <div className="absolute content-stretch flex flex-col h-[964px] items-start left-0 overflow-clip top-[59px] w-[1440px]" data-name="Main">
      <ContainerMargin1 />
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[#0a0814] h-[1024px] overflow-clip relative shrink-0 w-full" data-name="Container">
      <Container1 />
      <Header />
      <Main />
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

export default function I2Home() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full" data-name="i2 Home">
      <Body />
    </div>
  );
}