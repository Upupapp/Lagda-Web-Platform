import svgPaths from "./svg-3abwm3z9rd";

function Frame2() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-start px-[16px] py-[8px] relative rounded-[100px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[12px] uppercase whitespace-nowrap">LAGDA eSignature</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 text-center w-full" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.1] relative shrink-0 text-[52px] text-white w-full">Choose your LAGDA eSignature plan.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#cbd5e1] text-[18px] w-full">Start with QR-verifiable signed documents, audit-ready records, parallel signing, and secure document workflows.</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center relative shrink-0 w-[800px]" data-name="Frame">
      <Frame2 />
      <Frame3 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="h-[24px] relative shrink-0 w-[48px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 24">
        <g id="Frame">
          <rect fill="var(--fill-0, #0078D4)" height="24" rx="12" width="48" />
          <circle cx="36" cy="12" fill="var(--fill-0, white)" id="Ellipse" r="10" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[4px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">SAVE 20%</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] opacity-90 relative shrink-0 text-[#cbd5e1] text-[14px] whitespace-nowrap">Annual</p>
      <Frame7 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] opacity-90 relative shrink-0 text-[#cbd5e1] text-[14px] whitespace-nowrap">Monthly</p>
      <Frame5 />
      <Frame6 />
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[32px] items-center pb-[48px] pt-[120px] px-[80px] relative shrink-0 w-[1440px]" data-name="Frame">
      <Frame1 />
      <Frame4 />
    </div>
  );
}

function Price() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[6px] items-baseline leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="price">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[34px]">Free</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold opacity-75 relative shrink-0 text-[#334155] text-[14px]">/mo</p>
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check />
    </div>
  );
}

function Feat() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame8 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-90 relative text-[#07111f] text-[13px]">1 Sender</p>
    </div>
  );
}

function Check1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check1 />
    </div>
  );
}

function Feat1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame9 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-90 relative text-[#07111f] text-[13px]">5 signing requests/month</p>
    </div>
  );
}

function Check2() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check2 />
    </div>
  );
}

function Feat2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame10 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-90 relative text-[#07111f] text-[13px]">500MB Storage</p>
    </div>
  );
}

function Check3() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check3 />
    </div>
  );
}

function Feat3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame11 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-90 relative text-[#07111f] text-[13px]">3 Starter Templates</p>
    </div>
  );
}

function Features() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="features">
      <Feat />
      <Feat1 />
      <Feat2 />
      <Feat3 />
    </div>
  );
}

function Content() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="content">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] opacity-90 relative shrink-0 text-[#334155] text-[11px] uppercase whitespace-nowrap">Personal</p>
      <Price />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-75 relative shrink-0 text-[#334155] text-[13px] w-[min-content]">Individuals testing eSignature</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 164 1">
            <line id="Line" stroke="var(--stroke-0, #E5E7EB)" x2="164" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Features />
    </div>
  );
}

function BtnGhost() {
  return (
    <div className="bg-white h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="btn-ghost">
      <div aria-hidden className="absolute border border-[#07111f] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap">Try Free</p>
        </div>
      </div>
    </div>
  );
}

function Cta() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="cta">
      <BtnGhost />
    </div>
  );
}

function CardPersonal() {
  return (
    <div className="backdrop-blur-[12px] bg-white drop-shadow-[0px_12px_12px_rgba(0,0,0,0.05)] relative rounded-[16px] self-stretch shrink-0 w-[212px]" data-name="card-personal">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between p-[24px] relative size-full">
        <Content />
        <Cta />
      </div>
    </div>
  );
}

function Price1() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[6px] items-baseline leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="price">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[34px]">PHP 750</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold opacity-75 relative shrink-0 text-[#334155] text-[14px]">/mo</p>
    </div>
  );
}

function Check4() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check4 />
    </div>
  );
}

function Feat4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame12 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">1 Sender</p>
    </div>
  );
}

function Check5() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check5 />
    </div>
  );
}

function Feat5() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame13 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Unlimited signing requests*</p>
    </div>
  );
}

function Check6() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check6 />
    </div>
  );
}

function Feat6() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame14 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">10GB Storage</p>
    </div>
  );
}

function Check7() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check7 />
    </div>
  );
}

function Feat7() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame15 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Basic Templates</p>
    </div>
  );
}

function Check8() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check8 />
    </div>
  );
}

function Feat8() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame16 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Basic personal or workspace footer</p>
    </div>
  );
}

function Check9() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check9 />
    </div>
  );
}

function Feat9() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame17 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">IP and device/browser audit trail</p>
    </div>
  );
}

function Features1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="features">
      <Feat4 />
      <Feat5 />
      <Feat6 />
      <Feat7 />
      <Feat8 />
      <Feat9 />
    </div>
  );
}

function Content1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="content">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">PROFESSIONAL</p>
      <Price1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-85 relative shrink-0 text-[#334155] text-[13px] w-[min-content]">Lawyers, consultants, and independent professionals</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 164 1">
            <line id="Line" stroke="var(--stroke-0, #E5E7EB)" x2="164" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Features1 />
    </div>
  );
}

function BtnPrimary() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_10px_12px_rgba(7,17,31,0.1)] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="btn-primary">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Professional</p>
        </div>
      </div>
    </div>
  );
}

function Cta1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="cta">
      <BtnPrimary />
    </div>
  );
}

function CardProfessional() {
  return (
    <div className="backdrop-blur-[12px] bg-white drop-shadow-[0px_12px_12px_rgba(0,0,0,0.05)] relative rounded-[16px] self-stretch shrink-0 w-[212px]" data-name="card-professional">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between p-[24px] relative size-full">
        <Content1 />
        <Cta1 />
      </div>
    </div>
  );
}

function BadgeRecommended() {
  return (
    <div className="bg-[#0078d4] content-stretch flex h-[24px] items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="badge-recommended">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white uppercase whitespace-nowrap">Recommended</p>
    </div>
  );
}

function Top() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="top">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] uppercase whitespace-nowrap">Business Plus</p>
      <BadgeRecommended />
    </div>
  );
}

function Price2() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[8px] items-baseline relative shrink-0 w-full" data-name="price">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.1] relative shrink-0 text-[30px] text-white whitespace-nowrap">PHP 3,750</p>
      <p className="flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-px opacity-75 relative text-[#cbd5e1] text-[14px]">/mo</p>
    </div>
  );
}

function Check10() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check10 />
    </div>
  );
}

function Feat10() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame18 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">10 Senders</p>
    </div>
  );
}

function Check11() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check11 />
    </div>
  );
}

function Feat11() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame19 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">Unlimited signing requests</p>
    </div>
  );
}

function Check12() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check12 />
    </div>
  );
}

function Feat12() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame20 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">200GB shared storage</p>
    </div>
  );
}

function Check13() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check13 />
    </div>
  );
}

function Feat13() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame21 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">{`Advanced templates & custom fields`}</p>
    </div>
  );
}

function Check14() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check14 />
    </div>
  );
}

function Feat14() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame22 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">Company header/footer branding</p>
    </div>
  );
}

function Check15() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check15 />
    </div>
  );
}

function Feat15() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame23 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#e2e8f0] text-[13px]">{`Role permissions & team roles`}</p>
    </div>
  );
}

function Features2() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="features">
      <Feat10 />
      <Feat11 />
      <Feat12 />
      <Feat13 />
      <Feat14 />
      <Feat15 />
    </div>
  );
}

function Content2() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="content">
      <Top />
      <Price2 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] opacity-90 overflow-hidden relative shrink-0 text-[#cbd5e1] text-[13px] text-ellipsis w-full">Advanced workflows for growing teams and organizations</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 192 1">
            <line id="Line" opacity="0.12" stroke="var(--stroke-0, white)" x2="192" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Features2 />
    </div>
  );
}

function BtnPrimary1() {
  return (
    <div className="bg-[#0078d4] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="btn-primary">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Start Business Plus</p>
        </div>
      </div>
    </div>
  );
}

function Cta2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="cta">
      <BtnPrimary1 />
    </div>
  );
}

function CardBusinessPlusFeatured() {
  return (
    <div className="backdrop-blur-[12px] bg-[#07111f] relative rounded-[16px] self-stretch shrink-0 w-[240px]" data-name="card-business-plus-featured">
      <div aria-hidden className="absolute border-3 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_16px_40px_0px_rgba(7,17,31,0.2),0px_12px_24px_0px_rgba(0,0,0,0.05)]" />
      <div className="content-stretch flex flex-col items-start justify-between p-[24px] relative size-full">
        <Content2 />
        <Cta2 />
      </div>
    </div>
  );
}

function Price3() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[8px] items-end leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="price">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[28px]">PHP 4,500</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold opacity-75 relative shrink-0 text-[#334155] text-[14px]">/mo</p>
    </div>
  );
}

function Check16() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check16 />
    </div>
  );
}

function Feat16() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame24 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">6 Senders</p>
    </div>
  );
}

function Check17() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check17 />
    </div>
  );
}

function Feat17() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame25 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Unlimited signing requests*</p>
    </div>
  );
}

function Check18() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check18 />
    </div>
  );
}

function Feat18() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame26 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">100GB shared storage</p>
    </div>
  );
}

function Check19() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check19 />
    </div>
  );
}

function Feat19() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame27 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Full + Featured Templates</p>
    </div>
  );
}

function Check20() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check20 />
    </div>
  );
}

function Feat20() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame28 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Advanced branding controls</p>
    </div>
  );
}

function Features3() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="features">
      <Feat16 />
      <Feat17 />
      <Feat18 />
      <Feat19 />
      <Feat20 />
    </div>
  );
}

function Content3() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="content">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#334155] text-[11px] uppercase whitespace-nowrap">Business</p>
      <Price3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-85 relative shrink-0 text-[#334155] text-[13px] w-[min-content]">Larger teams and document-heavy organizations</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 164 1">
            <line id="Line" stroke="var(--stroke-0, #E5E7EB)" x2="164" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Features3 />
    </div>
  );
}

function BtnPrimary2() {
  return (
    <div className="bg-[#0078d4] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="btn-primary">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Start Business Plan</p>
        </div>
      </div>
    </div>
  );
}

function Cta3() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="cta">
      <BtnPrimary2 />
    </div>
  );
}

function CardBusiness() {
  return (
    <div className="backdrop-blur-[12px] bg-white drop-shadow-[0px_12px_12px_rgba(0,0,0,0.05)] relative rounded-[16px] self-stretch shrink-0 w-[212px]" data-name="card-business">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between p-[24px] relative size-full">
        <Content3 />
        <Cta3 />
      </div>
    </div>
  );
}

function Price4() {
  return (
    <div className="content-stretch flex items-baseline relative shrink-0 w-full" data-name="price">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[34px] whitespace-nowrap">Custom</p>
    </div>
  );
}

function Check21() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check21 />
    </div>
  );
}

function Feat21() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame29 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Custom senders</p>
    </div>
  );
}

function Check22() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check22 />
    </div>
  );
}

function Feat22() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame30 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Custom / high-volume signing requests</p>
    </div>
  );
}

function Check23() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check23 />
    </div>
  );
}

function Feat23() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame31 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Custom storage (recommended 250GB-1TB+)</p>
    </div>
  );
}

function Check24() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check24 />
    </div>
  );
}

function Feat24() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame32 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Full + featured + custom onboarding templates</p>
    </div>
  );
}

function Check25() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="check">
          <path d={svgPaths.p27200700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <Check25 />
    </div>
  );
}

function Feat25() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="feat">
      <Frame33 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px opacity-95 relative text-[#07111f] text-[13px]">Custom branding, workflows, API</p>
    </div>
  );
}

function Features4() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="features">
      <Feat21 />
      <Feat22 />
      <Feat23 />
      <Feat24 />
      <Feat25 />
    </div>
  );
}

function Content4() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="content">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[11px] uppercase whitespace-nowrap">Enterprise</p>
      <Price4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-85 relative shrink-0 text-[#334155] text-[13px] w-[min-content]">Government, banks, real estate, insurance, high-volume institutions, and enterprise legal workflows</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 164 1">
            <line id="Line" stroke="var(--stroke-0, #E5E7EB)" x2="164" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Features4 />
    </div>
  );
}

function BtnMidnight() {
  return (
    <div className="bg-[#0b2344] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="btn-midnight">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[16px] relative size-full">
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-px relative text-[14px] text-center text-white">Contact Sales</p>
        </div>
      </div>
    </div>
  );
}

function Cta4() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="cta">
      <BtnMidnight />
    </div>
  );
}

function CardEnterprise() {
  return (
    <div className="backdrop-blur-[12px] bg-[#f8fbff] drop-shadow-[0px_16px_18px_rgba(0,0,0,0.08)] opacity-90 relative rounded-[16px] self-stretch shrink-0 w-[212px]" data-name="card-enterprise">
      <div aria-hidden className="absolute border border-[#0b2344] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col items-start justify-between p-[24px] relative size-full">
        <Content4 />
        <Cta4 />
      </div>
    </div>
  );
}

function PricingGrid() {
  return (
    <div className="content-stretch flex gap-[24px] h-[629px] items-start py-[48px] relative shrink-0 w-full" data-name="pricing-grid">
      <CardPersonal />
      <CardProfessional />
      <CardBusinessPlusFeatured />
      <CardBusiness />
      <CardEnterprise />
    </div>
  );
}

function Info() {
  return (
    <div className="relative shrink-0 size-[28.8px]" data-name="info">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28.8 28.8">
        <g id="info">
          <path d={svgPaths.p1b6e0f00} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[32px]" data-name="Frame">
      <Info />
    </div>
  );
}

function Frame37() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[16px] text-white whitespace-nowrap">LAGDA eNotary - Coming Soon</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal min-w-full relative shrink-0 text-[14px] text-[rgba(229,229,229,0.9)] w-[min-content]">Electronic notarization is not included in standard eSignature plans and will be offered separately only after Supreme Court accreditation and operational readiness.</p>
    </div>
  );
}

function Frame35() {
  return (
    <div className="bg-[#1a0010] relative rounded-[12px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[20px] items-center p-[24px] relative size-full">
          <Frame36 />
          <Frame37 />
        </div>
      </div>
    </div>
  );
}

function Frame34() {
  return (
    <div className="bg-[#fff1f5] content-stretch flex flex-col items-start px-[80px] py-[64px] relative shrink-0 w-[1440px]" data-name="Frame">
      <Frame35 />
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative text-center" data-name="Frame">
      <p className="flex-[1_0_0] min-w-px relative">Personal</p>
      <p className="flex-[1_0_0] min-w-px relative">Professional</p>
      <p className="flex-[1_0_0] min-w-px relative">Business</p>
      <p className="flex-[1_0_0] min-w-px relative">Business Plus</p>
      <p className="flex-[1_0_0] min-w-px relative">Enterprise</p>
    </div>
  );
}

function Frame40() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex font-['Geist:Bold',sans-serif] font-bold items-start leading-[normal] px-[24px] py-[20px] relative size-full text-[14px] text-white">
        <p className="relative shrink-0 w-[300px]">Feature Overview</p>
        <Frame41 />
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">1</p>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">1</p>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">3</p>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">6</p>
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Custom</p>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame44 />
      <Frame45 />
      <Frame46 />
      <Frame47 />
      <Frame48 />
    </div>
  );
}

function Frame42() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Senders Included</p>
          <Frame43 />
        </div>
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">5/month</p>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Unlimited*</p>
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Unlimited*</p>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Unlimited*</p>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Custom / high-volume</p>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame51 />
      <Frame52 />
      <Frame53 />
      <Frame54 />
      <Frame55 />
    </div>
  );
}

function Frame49() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Signing Requests</p>
          <Frame50 />
        </div>
      </div>
    </div>
  );
}

function Check26() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check26 />
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame59 />
    </div>
  );
}

function Check27() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check27 />
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame61 />
    </div>
  );
}

function Check28() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check28 />
    </div>
  );
}

function Frame62() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame63 />
    </div>
  );
}

function Check29() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check29 />
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame65 />
    </div>
  );
}

function Check30() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check30 />
    </div>
  );
}

function Frame66() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame67 />
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame58 />
      <Frame60 />
      <Frame62 />
      <Frame64 />
      <Frame66 />
    </div>
  );
}

function Frame56() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">QR Document Verification Footer</p>
          <Frame57 />
        </div>
      </div>
    </div>
  );
}

function Check31() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check31 />
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame71 />
    </div>
  );
}

function Check33() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check33 />
    </div>
  );
}

function Check32() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="check">
      <Frame72 />
    </div>
  );
}

function Check35() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check35 />
    </div>
  );
}

function Check34() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="check">
      <Frame73 />
    </div>
  );
}

function Check37() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check37 />
    </div>
  );
}

function Check36() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="check">
      <Frame74 />
    </div>
  );
}

function Check38() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check38 />
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame76 />
    </div>
  );
}

function Frame69() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame70 />
      <Check32 />
      <Check34 />
      <Check36 />
      <Frame75 />
    </div>
  );
}

function Frame68() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Parallel Signing</p>
          <Frame69 />
        </div>
      </div>
    </div>
  );
}

function Check39() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check39 />
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame80 />
    </div>
  );
}

function Check40() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check40 />
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame82 />
    </div>
  );
}

function Check41() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check41 />
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame84 />
    </div>
  );
}

function Check42() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check42 />
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame86 />
    </div>
  );
}

function Check44() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check44 />
    </div>
  );
}

function Check43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="check">
      <Frame87 />
    </div>
  );
}

function Frame78() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame79 />
      <Frame81 />
      <Frame83 />
      <Frame85 />
      <Check43 />
    </div>
  );
}

function Frame77() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Sequential Signing</p>
          <Frame78 />
        </div>
      </div>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">3 Starter</p>
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Basic</p>
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Full</p>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Full + Featured</p>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Full + Featured + Custom</p>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame90 />
      <Frame91 />
      <Frame92 />
      <Frame93 />
      <Frame94 />
    </div>
  );
}

function Frame88() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Document Templates</p>
          <Frame89 />
        </div>
      </div>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">500MB</p>
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">10GB</p>
    </div>
  );
}

function Frame99() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">50GB shared</p>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">100GB shared</p>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Custom</p>
    </div>
  );
}

function Frame96() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame97 />
      <Frame98 />
      <Frame99 />
      <Frame100 />
      <Frame101 />
    </div>
  );
}

function Frame95() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Storage</p>
          <Frame96 />
        </div>
      </div>
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] whitespace-nowrap">-</p>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Basic Footer</p>
    </div>
  );
}

function Check45() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check45 />
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame107 />
    </div>
  );
}

function Check46() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check46 />
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame109 />
    </div>
  );
}

function Check47() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check47 />
    </div>
  );
}

function Frame110() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame111 />
    </div>
  );
}

function Frame103() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame104 />
      <Frame105 />
      <Frame106 />
      <Frame108 />
      <Frame110 />
    </div>
  );
}

function Frame102() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Company Header/Footer Branding</p>
          <Frame103 />
        </div>
      </div>
    </div>
  );
}

function Check48() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check48 />
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame115 />
    </div>
  );
}

function Check49() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame117() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check49 />
    </div>
  );
}

function Frame116() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame117 />
    </div>
  );
}

function Check50() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame119() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check50 />
    </div>
  );
}

function Frame118() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame119 />
    </div>
  );
}

function Check51() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check51 />
    </div>
  );
}

function Frame120() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame121 />
    </div>
  );
}

function Check52() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check52 />
    </div>
  );
}

function Frame122() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame123 />
    </div>
  );
}

function Frame113() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame114 />
      <Frame116 />
      <Frame118 />
      <Frame120 />
      <Frame122 />
    </div>
  );
}

function Frame112() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Audit Trail</p>
          <Frame113 />
        </div>
      </div>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[20px] items-center justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999] text-[14px] whitespace-nowrap">–</p>
    </div>
  );
}

function Check53() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check53 />
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame128 />
    </div>
  );
}

function Check54() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame130() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check54 />
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame130 />
    </div>
  );
}

function Check55() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame132() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check55 />
    </div>
  );
}

function Frame131() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame132 />
    </div>
  );
}

function Check56() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame134() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check56 />
    </div>
  );
}

function Frame133() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame134 />
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame126 />
      <Frame127 />
      <Frame129 />
      <Frame131 />
      <Frame133 />
    </div>
  );
}

function Frame124() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">{`IP & Device Logging`}</p>
          <Frame125 />
        </div>
      </div>
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[20px] items-center justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999] text-[14px] whitespace-nowrap">–</p>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[20px] items-center justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#999] text-[14px] whitespace-nowrap">–</p>
    </div>
  );
}

function Check57() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check57 />
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame140 />
    </div>
  );
}

function Check58() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check58 />
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame142 />
    </div>
  );
}

function Check59() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame144() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check59 />
    </div>
  );
}

function Frame143() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame144 />
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame137 />
      <Frame138 />
      <Frame139 />
      <Frame141 />
      <Frame143 />
    </div>
  );
}

function Frame135() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Approximate Location (IP-based)</p>
          <Frame136 />
        </div>
      </div>
    </div>
  );
}

function Check60() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame148() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check60 />
    </div>
  );
}

function Frame147() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame148 />
    </div>
  );
}

function Check61() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check61 />
    </div>
  );
}

function Frame149() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame150 />
    </div>
  );
}

function Check62() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check62 />
    </div>
  );
}

function Frame151() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame152 />
    </div>
  );
}

function Check63() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame154() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check63 />
    </div>
  );
}

function Frame153() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame154 />
    </div>
  );
}

function Check64() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame156() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check64 />
    </div>
  );
}

function Frame155() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame156 />
    </div>
  );
}

function Frame146() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame147 />
      <Frame149 />
      <Frame151 />
      <Frame153 />
      <Frame155 />
    </div>
  );
}

function Frame145() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Exact GPS (Requires Signer Permission)</p>
          <Frame146 />
        </div>
      </div>
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] whitespace-nowrap">-</p>
    </div>
  );
}

function Frame160() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] whitespace-nowrap">-</p>
    </div>
  );
}

function Check65() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame162() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check65 />
    </div>
  );
}

function Frame161() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame162 />
    </div>
  );
}

function Check66() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame164() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check66 />
    </div>
  );
}

function Frame163() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame164 />
    </div>
  );
}

function Check67() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame166() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check67 />
    </div>
  );
}

function Frame165() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame166 />
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame159 />
      <Frame160 />
      <Frame161 />
      <Frame163 />
      <Frame165 />
    </div>
  );
}

function Frame157() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Shared Workspace</p>
          <Frame158 />
        </div>
      </div>
    </div>
  );
}

function Frame169() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] whitespace-nowrap">-</p>
    </div>
  );
}

function Frame170() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[18px] whitespace-nowrap">-</p>
    </div>
  );
}

function Check68() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame172() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check68 />
    </div>
  );
}

function Frame171() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame172 />
    </div>
  );
}

function Check69() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame174() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check69 />
    </div>
  );
}

function Frame173() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame174 />
    </div>
  );
}

function Check70() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame176() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check70 />
    </div>
  );
}

function Frame175() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame176 />
    </div>
  );
}

function Frame168() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame169 />
      <Frame170 />
      <Frame171 />
      <Frame173 />
      <Frame175 />
    </div>
  );
}

function Frame167() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Role Permissions</p>
          <Frame168 />
        </div>
      </div>
    </div>
  );
}

function Frame179() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Not included</p>
    </div>
  );
}

function Frame180() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Not included</p>
    </div>
  );
}

function Check71() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame182() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check71 />
    </div>
  );
}

function Frame181() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame182 />
    </div>
  );
}

function BadgeComingSoon() {
  return (
    <div className="bg-[#7f1d1d] content-stretch flex items-center justify-center px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="badge-coming-soon">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[11px] text-white uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame183() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <BadgeComingSoon />
    </div>
  );
}

function Check72() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame185() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check72 />
    </div>
  );
}

function Frame184() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame185 />
    </div>
  );
}

function Frame178() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame179 />
      <Frame180 />
      <Frame181 />
      <Frame183 />
      <Frame184 />
    </div>
  );
}

function Frame177() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">API-Ready</p>
          <Frame178 />
        </div>
      </div>
    </div>
  );
}

function Frame188() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Not included</p>
    </div>
  );
}

function Frame189() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Not included</p>
    </div>
  );
}

function Frame190() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#475569] text-[14px] whitespace-nowrap">Not included</p>
    </div>
  );
}

function Check73() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame192() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check73 />
    </div>
  );
}

function Frame191() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame192 />
    </div>
  );
}

function Check74() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame194() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Check74 />
    </div>
  );
}

function Frame193() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <Frame194 />
    </div>
  );
}

function Frame187() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame188 />
      <Frame189 />
      <Frame190 />
      <Frame191 />
      <Frame193 />
    </div>
  );
}

function Frame186() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">Bulk Sending</p>
          <Frame187 />
        </div>
      </div>
    </div>
  );
}

function Frame197() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame198() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame199() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame200() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame201() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start justify-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame196() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-start min-w-px relative" data-name="Frame">
      <Frame197 />
      <Frame198 />
      <Frame199 />
      <Frame200 />
      <Frame201 />
    </div>
  );
}

function Frame195() {
  return (
    <div className="bg-[#f9fafb] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-[300px]">{`LAGDA eNotary `}</p>
          <Frame196 />
        </div>
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="relative rounded-[16px] shrink-0 w-full" data-name="Frame">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Frame40 />
        <Frame42 />
        <Frame49 />
        <Frame56 />
        <Frame68 />
        <Frame77 />
        <Frame88 />
        <Frame95 />
        <Frame102 />
        <Frame112 />
        <Frame124 />
        <Frame135 />
        <Frame145 />
        <Frame157 />
        <Frame167 />
        <Frame177 />
        <Frame186 />
        <Frame195 />
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Examples() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[10px] items-start leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full" data-name="examples">
      <p className="relative shrink-0 w-full">• 1 PDF sent to 1 signer = 1 signing request</p>
      <p className="relative shrink-0 w-full">• 1 PDF sent to 5 signers in parallel = 1 signing request</p>
      <p className="relative shrink-0 w-full">• 1 PDF sent to 5 signers sequentially = 1 signing request</p>
      <p className="relative shrink-0 w-full">• A reminder for the same pending document = 0 additional signing requests</p>
      <p className="relative shrink-0 w-full">• A draft saved but not sent = 0 signing requests</p>
      <p className="relative shrink-0 w-full">• Resending the same PDF as a new transaction = 1 new signing request</p>
    </div>
  );
}

function SigningRequestDefinition() {
  return (
    <div className="bg-white relative rounded-[16px] shrink-0 w-full" data-name="signing-request-definition">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[18px] w-full">What counts as a signing request?</p>
        <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">A signing request is one document transaction sent for signature through LAGDA. It may include one or multiple signers and may use parallel or sequential signing.</p>
        <Examples />
      </div>
    </div>
  );
}

function SigningRequestFootnotes() {
  return (
    <div className="bg-[#f8fafc] relative rounded-[16px] shrink-0 w-full" data-name="signing-request-footnotes">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start leading-[1.6] p-[24px] relative size-full text-[14px]">
        <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f] w-full">Signing request definition</p>
        <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] w-full">A signing request is one sent document transaction, even if it has multiple signers. Reminders do not count as new requests.</p>
        <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#b01262] w-full">LAGDA eNotary is coming soon and is not included in any current eSignature plan. It will be subject to Supreme Court accreditation.</p>
      </div>
    </div>
  );
}

function Frame38() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[32px] items-start px-[80px] py-[64px] relative shrink-0 w-[1440px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[32px] whitespace-nowrap">Compare Plan Features</p>
      <Frame39 />
      <SigningRequestDefinition />
      <SigningRequestFootnotes />
    </div>
  );
}

function Frame203() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-[800px] whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[36px]">Frequently Asked Questions</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[16px]">Everything you need to know about our legal-tech solutions.</p>
    </div>
  );
}

function ChevronDown() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame207() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown />
    </div>
  );
}

function Frame206() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">What is a signing request?</p>
      <Frame207 />
    </div>
  );
}

function Frame205() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame206 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">A signing request is one document transaction sent for signature through LAGDA. It may include one or multiple signers and may use parallel or sequential signing.</p>
      </div>
    </div>
  );
}

function ChevronDown1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame210() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown1 />
    </div>
  );
}

function Frame209() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Does one document sent to multiple signers count as one request?</p>
      <Frame210 />
    </div>
  );
}

function Frame208() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame209 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Yes. Whether you send one document to 1 signer or 10 signers in parallel or sequential order, it counts as a single signing request.</p>
      </div>
    </div>
  );
}

function ChevronDown2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame213() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown2 />
    </div>
  );
}

function Frame212() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Are reminders counted as additional signing requests?</p>
      <Frame213 />
    </div>
  );
}

function Frame211() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame212 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">No. Sending a reminder for a pending document does not create a new signing request. Only a new document transaction counts as a signing request.</p>
      </div>
    </div>
  );
}

function ChevronDown3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame216() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown3 />
    </div>
  );
}

function Frame215() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Is QR Document Verification included in all plans?</p>
      <Frame216 />
    </div>
  );
}

function Frame214() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame215 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Yes. Every completed signed PDF includes a QR code and a clickable verification URL that opens the LAGDA Document Verification page - included in all plans at no extra cost.</p>
      </div>
    </div>
  );
}

function Frame204() {
  return (
    <div className="relative rounded-[16px] shrink-0 w-full" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative rounded-[inherit] size-full">
        <Frame205 />
        <Frame208 />
        <Frame211 />
        <Frame214 />
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function ChevronDown4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame219() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown4 />
    </div>
  );
}

function Frame218() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Is parallel signing available on all plans?</p>
      <Frame219 />
    </div>
  );
}

function Frame217() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame218 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Yes. LAGDA allows multiple signatories to sign the same document at the same time. Sequential signing is also available when a strict signing order is required.</p>
      </div>
    </div>
  );
}

function ChevronDown5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame222() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown5 />
    </div>
  );
}

function Frame221() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Can my company add headers and footers to signed documents?</p>
      <Frame222 />
    </div>
  );
}

function Frame220() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame221 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Yes. Branding availability depends on your plan. Professional includes a basic footer. Business includes company header/footer branding. Business Plus offers advanced branding controls. Enterprise includes fully custom branding and workflows.</p>
      </div>
    </div>
  );
}

function ChevronDown6() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame225() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown6 />
    </div>
  );
}

function Frame224() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Can header/footer branding be switched off per document?</p>
      <Frame225 />
    </div>
  );
}

function Frame223() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame224 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Yes. Account owners can configure header/footer branding and switch it on or off per document to avoid overlaying documents that already include existing headers or footers.</p>
      </div>
    </div>
  );
}

function ChevronDown7() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame228() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown7 />
    </div>
  );
}

function Frame227() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Is LAGDA eNotary included in these plans?</p>
      <Frame228 />
    </div>
  );
}

function Frame226() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame227 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">No. LAGDA eNotary is a separate future product layer. It is Coming Soon and Subject to Supreme Court Accreditation. Electronic notarization is not included in any current standard eSignature plan.</p>
      </div>
    </div>
  );
}

function ChevronDown8() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame231() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown8 />
    </div>
  );
}

function Frame230() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Does LAGDA capture GPS location?</p>
      <Frame231 />
    </div>
  );
}

function Frame229() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame230 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Approximate location is based on IP address and is included in Business and higher plans. Exact GPS location requires explicit signer permission and may be denied by the signer device or browser. LAGDA does not force GPS capture.</p>
      </div>
    </div>
  );
}

function ChevronDown9() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="chevron-down">
          <path d="M4.5 6.75L9 11.25L13.5 6.75" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame234() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronDown9 />
    </div>
  );
}

function Frame233() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">How much storage is included per plan?</p>
      <Frame234 />
    </div>
  );
}

function Frame232() {
  return (
    <div className="bg-[#f8fafc] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col gap-[16px] items-start p-[32px] relative size-full">
        <Frame233 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Personal: 500MB. Professional: 10GB. Business: 50GB shared. Business Plus: 100GB shared. Enterprise: Custom. Storage covers completed documents, audit records, templates, QR verification files, and workspace records.</p>
      </div>
    </div>
  );
}

function Frame202() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex flex-col gap-[40px] items-center p-[80px] relative shrink-0 w-[1440px]" data-name="Frame">
      <Frame203 />
      <Frame204 />
      <Frame217 />
      <Frame220 />
      <Frame223 />
      <Frame226 />
      <Frame229 />
      <Frame232 />
    </div>
  );
}

function Frame237() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 text-center w-[700px]" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.1] relative shrink-0 text-[44px] text-white w-full">Start with LAGDA eSignature today.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#38bdf8] text-[16px] w-full">Every signed PDF includes QR verification. Parallel signing included. Audit-ready records for every transaction.</p>
    </div>
  );
}

function Frame239() {
  return (
    <div className="bg-[#0078d4] content-stretch flex h-[48px] items-center justify-center px-[24px] relative rounded-[12px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function Frame240() {
  return (
    <div className="bg-[rgba(255,255,255,0.08)] content-stretch flex h-[48px] items-center justify-center px-[24px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(255,255,255,0.4)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function Frame238() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0" data-name="Frame">
      <Frame239 />
      <Frame240 />
    </div>
  );
}

function Frame236() {
  return (
    <div className="bg-[#0b2344] relative rounded-[32px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center px-[64px] py-[72px] relative size-full">
          <Frame237 />
          <Frame238 />
        </div>
      </div>
    </div>
  );
}

function Frame235() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-start pb-[80px] px-[80px] relative shrink-0 w-[1440px]" data-name="Frame">
      <Frame236 />
    </div>
  );
}

function CircleX() {
  return (
    <div className="relative shrink-0 size-[25.2px]" data-name="circle-x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25.2 25.2">
        <g id="circle-x">
          <path d={svgPaths.p2c2cf000} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame245() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[28px]" data-name="Frame">
      <CircleX />
    </div>
  );
}

function Frame244() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame245 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame243() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Frame244 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[14px] w-[min-content]">Philippine-first legal-tech solutions for secure eSignatures and accredited electronic notarization.</p>
    </div>
  );
}

function Frame247() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Product</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Pricing</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">eSignature</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-white">LAGDA</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">API</p>
    </div>
  );
}

function Frame248() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Company</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">About Us</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Compliance</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Security</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Contact</p>
    </div>
  );
}

function Frame249() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Resources</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Guides</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">SC Rules</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8]">Support Center</p>
    </div>
  );
}

function Frame246() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[80px] items-start leading-[normal] relative shrink-0 text-[14px] whitespace-nowrap" data-name="Frame">
      <Frame247 />
      <Frame248 />
      <Frame249 />
    </div>
  );
}

function Frame242() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame243 />
      <Frame246 />
    </div>
  );
}

function Frame251() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular',sans-serif] font-normal gap-[24px] items-start leading-[normal] relative shrink-0 text-[#64748b] text-[12px] whitespace-nowrap" data-name="Frame">
      <p className="relative shrink-0">Privacy Policy</p>
      <p className="relative shrink-0">Terms of Service</p>
      <p className="relative shrink-0">Legal Disclaimer</p>
    </div>
  );
}

function Frame250() {
  return (
    <div className="content-stretch flex items-center justify-between pt-[32px] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[#1e3a5f] border-solid border-t inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[12px] whitespace-nowrap">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
      <Frame251 />
    </div>
  );
}

function Frame241() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[64px] items-start p-[80px] relative shrink-0 w-[1440px]" data-name="Frame">
      <Frame242 />
      <Frame250 />
    </div>
  );
}

function ShieldCheck() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function ShieldIcon() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="shield-icon">
      <ShieldCheck />
    </div>
  );
}

function BrandText() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="brand-text">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold mb-[-2px] relative shrink-0 text-[#07111f] text-[20px]">LAGDA</p>
      <p className="font-['Geist_Mono:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#0078d4] text-[9px]">BY UPUP TECHNOLOGIES</p>
    </div>
  );
}

function Brand() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="brand">
      <ShieldIcon />
      <BrandText />
    </div>
  );
}

function TabFeatures() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Features">
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Features ▾</p>
    </div>
  );
}

function TabSolutions() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Solutions">
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Solutions ▾</p>
    </div>
  );
}

function TabPricing() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center justify-center relative shrink-0" data-name="tab-Pricing">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Pricing</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[47px]" data-name="underline" />
    </div>
  );
}

function TabResources() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Resources">
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans:Medium','Noto_Sans_Math:Regular','Noto_Sans_Symbols:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Resources ▾</p>
    </div>
  );
}

function NavTabs() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="nav-tabs">
      <TabFeatures />
      <TabSolutions />
      <TabPricing />
      <TabResources />
    </div>
  );
}

function ArrowRight() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Started</p>
      <ArrowRight />
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="nav-actions">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap">Sign In</p>
      <Button />
    </div>
  );
}

function Navbar() {
  return (
    <div className="absolute bg-white content-stretch flex h-[80px] items-center justify-between left-0 px-[80px] top-0 w-[1440px]" data-name="navbar">
      <Brand />
      <NavTabs />
      <NavActions />
    </div>
  );
}

export default function DLagdaPricingMainPage() {
  return (
    <div className="bg-[#f0f4f8] content-stretch flex flex-col gap-[24px] items-center px-[80px] py-[64px] relative size-full" data-name="d-lagda-pricing-main page">
      <Frame />
      <PricingGrid />
      <Frame34 />
      <Frame38 />
      <Frame202 />
      <Frame235 />
      <Frame241 />
      <Navbar />
    </div>
  );
}