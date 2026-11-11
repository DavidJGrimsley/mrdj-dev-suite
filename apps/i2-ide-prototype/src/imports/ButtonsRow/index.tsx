import svgPaths from "./svg-t2wwnl897n";

function HelpCircle() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="help-circle">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_8)" id="help-circle" opacity="0.9">
          <path d={svgPaths.p26423ac2} id="Vector" stroke="white" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_0_8">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function GlassBtnWhatsNext() {
  return (
    <div className="content-stretch flex flex-[1_0_30px] gap-[8px] items-center justify-center min-w-px px-[14px] py-[10px] relative rounded-[21px]" data-name="glass-btn-What's Next?">
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[21px]" style={{ backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 40%, rgba(96, 165, 250, 0.102) 100%), linear-gradient(90deg, rgba(96, 165, 250, 0.12) 0%, rgba(96, 165, 250, 0.12) 100%)" }} />
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[21px] shadow-[0px_4px_14px_0px_#60a5fa]" />
      <HelpCircle />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold h-full leading-[normal] min-w-px overflow-hidden relative text-[13px] text-ellipsis text-white whitespace-nowrap">{`What's Next?`}</p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_white]" />
    </div>
  );
}

function Eye() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="eye">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="eye" opacity="0.9">
          <path d={svgPaths.p23179000} id="Vector" stroke="white" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function GlassBtnLookAtThis() {
  return (
    <div className="content-stretch flex flex-[1_0_30px] gap-[8px] items-center justify-center min-w-px px-[14px] py-[10px] relative rounded-[21px]" data-name="glass-btn-Look at This">
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[21px]" style={{ backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 40%, rgba(251, 191, 36, 0.102) 100%), linear-gradient(90deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.12) 100%)" }} />
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[21px] shadow-[0px_4px_14px_0px_#fbbf24]" />
      <Eye />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold h-full leading-[normal] min-w-px overflow-hidden relative text-[13px] text-ellipsis text-white whitespace-nowrap">{`Test changes in & Add-comments session in # Pet Show and Tell`}</p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_white]" />
    </div>
  );
}

function Archive() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="archive">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="archive" opacity="0.9">
          <path d={svgPaths.p23949a00} id="Vector" stroke="white" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function GlassBtnWrapUp() {
  return (
    <div className="content-stretch flex flex-[1_0_30px] gap-[8px] items-center justify-center min-w-px px-[14px] py-[10px] relative rounded-[21px]" data-name="glass-btn-Wrap Up">
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[21px]" style={{ backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 40%, rgba(5, 150, 105, 0.102) 100%), linear-gradient(90deg, rgba(5, 150, 105, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%)" }} />
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[21px] shadow-[0px_4px_14px_0px_#059669]" />
      <Archive />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold h-full leading-[normal] min-w-px overflow-hidden relative text-[13px] text-ellipsis text-white whitespace-nowrap">{`Wrap Up & Model refinement in # Not hot dog`}</p>
      <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0px_1px_0px_0px_white]" />
    </div>
  );
}

export default function ButtonsRow() {
  return (
    <div className="content-stretch flex gap-[8px] items-end relative size-full" data-name="buttons-row">
      <GlassBtnWhatsNext />
      <GlassBtnLookAtThis />
      <GlassBtnWrapUp />
    </div>
  );
}