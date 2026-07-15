import svgPaths from "./svg-s436tf6da1";
import imgCtaBanner from "./45179322fd42eb635b7b272bdb055e2be5b203a1.png";

function Badge() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">eSignature (LIVE)</p>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[rgba(103,2,59,0.15)] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[rgba(176,18,98,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">LAGDA (Coming Soon)</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Badge />
      <Badge1 />
    </div>
  );
}

function BtnPrimary() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex h-[48px] items-center justify-center px-[22px] relative rounded-[999px] shrink-0" data-name="btn-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">Get Started Free</p>
    </div>
  );
}

function BtnSecondary() {
  return (
    <div className="bg-[#07111f] content-stretch flex h-[48px] items-center justify-center px-[22px] relative rounded-[999px] shrink-0" data-name="btn-secondary">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[15px] whitespace-nowrap">See Industries</p>
    </div>
  );
}

function CtaRow() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0" data-name="cta-row">
      <BtnPrimary />
      <BtnSecondary />
    </div>
  );
}

function HeroCopy() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center relative shrink-0 w-[900px]" data-name="hero-copy">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.1] min-w-full relative shrink-0 text-[64px] text-center text-white w-[min-content]">eSignature for every industry</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#e5e7eb] text-[20px] text-center w-[720px]">Purpose-built document workflows for Philippine legal, business, and institutional needs. Secure, verified, and locally accredited.</p>
      <CtaRow />
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#07111f] h-[600px] relative shrink-0 w-full" data-name="hero">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center justify-center px-[120px] py-[80px] relative size-full">
          <Frame />
          <HeroCopy />
        </div>
      </div>
    </div>
  );
}

function Scale() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="scale">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="scale">
          <path d={svgPaths.pe46c780} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Scale />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame3 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Lawyers and Law Firms</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Engagement letters, client authorizations, retainers, internal approvals.</p>
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Manage legal documents with signer verification and audit history.</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: physical signing delays and fragmented records.</p>
      <Frame7 />
    </div>
  );
}

function TemplatesBadge() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="templates-badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Templates included</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame5 />
      <Frame6 />
      <TemplatesBadge />
    </div>
  );
}

function Frame8() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create lawyer account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_8px_24px_0px_rgba(0,120,212,0.25)]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame2 />
        <Frame4 />
        <Frame8 />
        <Button />
      </div>
    </div>
  );
}

function Briefcase() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="briefcase">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="briefcase">
          <path d={svgPaths.p3a184d40} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame10() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Briefcase />
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame10 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Corporate Legal Teams</p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">NDAs, board resolutions, shareholder agreements.</p>
    </div>
  );
}

function CheckCircle1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle1 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Ordered signing with role-based permissions.</p>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: multi-party approval chaos.</p>
      <Frame14 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame12 />
      <Frame13 />
    </div>
  );
}

function Frame15() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button1() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Start team account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard1() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame9 />
        <Frame11 />
        <Frame15 />
        <Button1 />
      </div>
    </div>
  );
}

function UsersRound() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="users-round">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="users-round">
          <path d={svgPaths.pd1f8a80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame17() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <UsersRound />
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame17 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">HR and Recruitment</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Employment contracts, offer letters, NDAs.</p>
    </div>
  );
}

function CheckCircle2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle2 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Send and collect signatures instantly with status tracking.</p>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: paper contracts across branches.</p>
      <Frame21 />
    </div>
  );
}

function TemplatesBadge1() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="templates-badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Templates included</p>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame19 />
      <Frame20 />
      <TemplatesBadge1 />
    </div>
  );
}

function Frame22() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button2() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create HR account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard2() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame16 />
        <Frame18 />
        <Frame22 />
        <Button2 />
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[24px] h-[480px] items-start relative shrink-0 w-full" data-name="Frame">
      <UseCaseCard />
      <UseCaseCard1 />
      <UseCaseCard2 />
    </div>
  );
}

function Home() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="home">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="home">
          <path d={svgPaths.p2b741c00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame25() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Home />
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame25 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Real Estate and Property</p>
    </div>
  );
}

function Frame27() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Lease agreements, purchase agreements, authority to sell.</p>
    </div>
  );
}

function CheckCircle3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle3 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Remote verified signing with complete audit trail.</p>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: in-person signing delays.</p>
      <Frame29 />
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame27 />
      <Frame28 />
    </div>
  );
}

function Frame30() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button3() {
  return (
    <div className="bg-[#67023b] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create real estate account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard3() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame24 />
        <Frame26 />
        <Frame30 />
        <Button3 />
      </div>
    </div>
  );
}

function Landmark() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="landmark">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="landmark">
          <path d={svgPaths.p8d7900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame32() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Landmark />
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame32 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Banks and Financing</p>
    </div>
  );
}

function Frame34() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Loan agreements, authority letters, account forms.</p>
    </div>
  );
}

function CheckCircle4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle4 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Secure verified digital signing with compliance records.</p>
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: branch visits for signatures.</p>
      <Frame36 />
    </div>
  );
}

function TemplatesBadge2() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="templates-badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Templates included</p>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame34 />
      <Frame35 />
      <TemplatesBadge2 />
    </div>
  );
}

function Frame37() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button4() {
  return (
    <div className="bg-[#67023b] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Talk to sales</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard4() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame31 />
        <Frame33 />
        <Frame37 />
        <Button4 />
      </div>
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

function Frame39() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <ShieldCheck />
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame39 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Insurance</p>
    </div>
  );
}

function Frame41() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Policy forms, beneficiary designations, claims.</p>
    </div>
  );
}

function CheckCircle5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle5 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Fast verified signing for policy documents.</p>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: paper-heavy slow processes.</p>
      <Frame43 />
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame41 />
      <Frame42 />
    </div>
  );
}

function Frame44() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button5() {
  return (
    <div className="bg-[#67023b] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Talk to sales</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard5() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame38 />
        <Frame40 />
        <Frame44 />
        <Button5 />
      </div>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex gap-[24px] h-[480px] items-start relative shrink-0 w-full" data-name="Frame">
      <UseCaseCard3 />
      <UseCaseCard4 />
      <UseCaseCard5 />
    </div>
  );
}

function GraduationCap() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="graduation-cap">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="graduation-cap">
          <path d={svgPaths.p14a69520} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame47() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <GraduationCap />
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame47 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Schools and Universities</p>
    </div>
  );
}

function Frame49() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Enrollment forms, contracts, MOUs.</p>
    </div>
  );
}

function CheckCircle6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle6 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Batch send and track institutional documents.</p>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: manual signature collection from multiple parties.</p>
      <Frame51 />
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame49 />
      <Frame50 />
    </div>
  );
}

function Frame52() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button6() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create school account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard6() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame46 />
        <Frame48 />
        <Frame52 />
        <Button6 />
      </div>
    </div>
  );
}

function Building() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="building-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="building-2">
          <path d={svgPaths.p229b5a90} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame54() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Building />
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame54 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Government and LGUs</p>
    </div>
  );
}

function Frame56() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Official authorizations, MOUs, procurement approvals.</p>
    </div>
  );
}

function CheckCircle7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle7 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Verified digital signatures with full audit trail.</p>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: manual routing and paper trail.</p>
      <Frame58 />
    </div>
  );
}

function TemplatesBadge3() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="templates-badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Templates included</p>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame56 />
      <Frame57 />
      <TemplatesBadge3 />
    </div>
  );
}

function Frame59() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button7() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Talk to sales</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard7() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame53 />
        <Frame55 />
        <Frame59 />
        <Button7 />
      </div>
    </div>
  );
}

function ShoppingBag() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shopping-bag">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shopping-bag">
          <path d={svgPaths.p23bcc680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame61() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <ShoppingBag />
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame61 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">SMEs and Professional Services</p>
    </div>
  );
}

function Frame63() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Documents</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] w-[min-content]">Service agreements, SOWs, invoices.</p>
    </div>
  );
}

function CheckCircle8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_4116)" id="check-circle">
          <path d={svgPaths.p39f7ce80} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4116">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <CheckCircle8 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] min-w-px relative text-[#38bdf8] text-[14px]">Professional branded document signing workflow.</p>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-full">Pain: no standardized signing process.</p>
      <Frame65 />
    </div>
  );
}

function TemplatesBadge4() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[100px] shrink-0" data-name="templates-badge">
      <div aria-hidden className="absolute border border-[rgba(56,189,248,0.25)] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Templates included</p>
    </div>
  );
}

function Frame62() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame63 />
      <Frame64 />
      <TemplatesBadge4 />
    </div>
  );
}

function Frame66() {
  return <div className="flex-[1_0_0] min-h-px relative w-full" data-name="Frame" />;
}

function Button8() {
  return (
    <div className="bg-[#0078d4] h-[44px] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[20px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create business account</p>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard8() {
  return (
    <div className="backdrop-blur-[10px] bg-[rgba(11,35,68,0.7)] flex-[1_0_0] h-full min-w-px relative rounded-[16px]" data-name="use-case-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame60 />
        <Frame62 />
        <Frame66 />
        <Button8 />
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex gap-[24px] h-[480px] items-start relative shrink-0 w-full" data-name="Frame">
      <UseCaseCard6 />
      <UseCaseCard7 />
      <UseCaseCard8 />
    </div>
  );
}

function GridContainer() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="grid-container">
      <div className="content-stretch flex flex-col gap-[24px] items-start px-[80px] py-[64px] relative size-full">
        <Frame1 />
        <Frame23 />
        <Frame45 />
      </div>
    </div>
  );
}

function FileUp() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="file-up">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="file-up">
          <path d={svgPaths.p1348d300} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame69() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <FileUp />
    </div>
  );
}

function Frame70() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">STEP 01</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[18px] text-white">Upload Document</p>
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Frame">
      <Frame69 />
      <Frame70 />
    </div>
  );
}

function SeparatorHorizontal() {
  return (
    <div className="h-[2px] relative shrink-0 w-[32px]" data-name="separator-horizontal">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 2">
        <g clipPath="url(#clip0_1_4149)" id="separator-horizontal">
          <rect fill="#0078D4" fillOpacity="0.4" height="2" width="32" />
          <path d={svgPaths.p196aed80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.14902" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4149">
            <rect fill="white" height="2" width="32" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Signature() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="signature">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="signature">
          <path d={svgPaths.p39731f00} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame72() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Signature />
    </div>
  );
}

function Frame73() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">STEP 02</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[18px] text-white">Prepare Fields</p>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Frame">
      <Frame72 />
      <Frame73 />
    </div>
  );
}

function SeparatorHorizontal1() {
  return (
    <div className="h-[2px] relative shrink-0 w-[32px]" data-name="separator-horizontal">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 2">
        <g clipPath="url(#clip0_1_4149)" id="separator-horizontal">
          <rect fill="#0078D4" fillOpacity="0.4" height="2" width="32" />
          <path d={svgPaths.p196aed80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.14902" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4149">
            <rect fill="white" height="2" width="32" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Send() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="send">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="send">
          <path d={svgPaths.p20db6e00} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame75() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <Send />
    </div>
  );
}

function Frame76() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">STEP 03</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[18px] text-white">Send to Signers</p>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Frame">
      <Frame75 />
      <Frame76 />
    </div>
  );
}

function SeparatorHorizontal2() {
  return (
    <div className="h-[2px] relative shrink-0 w-[32px]" data-name="separator-horizontal">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 2">
        <g clipPath="url(#clip0_1_4149)" id="separator-horizontal">
          <rect fill="#0078D4" fillOpacity="0.4" height="2" width="32" />
          <path d={svgPaths.p196aed80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeOpacity="0.14902" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_4149">
            <rect fill="white" height="2" width="32" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="shield-check">
          <path d={svgPaths.p3037780} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame78() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <ShieldCheck1 />
    </div>
  );
}

function Frame79() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">STEP 04</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[18px] text-white">{`Verify & Store`}</p>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Frame">
      <Frame78 />
      <Frame79 />
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame68 />
      <SeparatorHorizontal />
      <Frame71 />
      <SeparatorHorizontal1 />
      <Frame74 />
      <SeparatorHorizontal2 />
      <Frame77 />
    </div>
  );
}

function WorkflowStrip() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="workflow-strip">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.15)] border-b border-solid border-t inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start px-[80px] py-[48px] relative size-full">
        <Frame67 />
      </div>
    </div>
  );
}

function TopAccent() {
  return <div className="absolute bg-[#0078d4] h-[4px] left-0 right-0 top-0" data-name="top-accent" />;
}

function Copy() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 text-center w-full" data-name="copy">
      <div className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[0] relative shrink-0 text-[52px] text-white w-full">
        <p className="leading-[1.1] mb-0">Start with eSignature.</p>
        <p className="leading-[1.1]">{`Prepare for what's next.`}</p>
      </div>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#e5e7eb] text-[18px] w-full">Join thousands of Philippine businesses and legal professionals using eSignature today.</p>
    </div>
  );
}

function CtaPrimary() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex items-center justify-center px-[28px] py-[18px] relative rounded-[12px] shrink-0" data-name="cta-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[18px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function CtaSecondary() {
  return (
    <div className="bg-[rgba(255,255,255,0.04)] content-stretch flex items-center justify-center px-[28px] py-[18px] relative rounded-[12px] shrink-0" data-name="cta-secondary">
      <div aria-hidden className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[18px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function CtaTertiary() {
  return (
    <div className="flex-[1_0_0] min-w-px relative" data-name="cta-tertiary">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center p-[18px] relative size-full">
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-px relative text-[#b01262] text-[14px]">Join LAGDA eNotary Waitlist</p>
        </div>
      </div>
    </div>
  );
}

function CtaRow1() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="cta-row">
      <CtaPrimary />
      <CtaSecondary />
      <CtaTertiary />
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="check">
          <path d={svgPaths.p221839c0} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Pill() {
  return (
    <div className="bg-[rgba(255,255,255,0.07)] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="pill">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Check />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">No credit card required</p>
    </div>
  );
}

function Check1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="check">
          <path d={svgPaths.p221839c0} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Pill1() {
  return (
    <div className="bg-[rgba(255,255,255,0.07)] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="pill">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Check1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">Compliant with RA 8792 Electronic Commerce Act</p>
    </div>
  );
}

function Check2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="check">
          <path d={svgPaths.p221839c0} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Pill2() {
  return (
    <div className="bg-[rgba(255,255,255,0.07)] flex-[1_0_0] min-w-px relative rounded-[999px]" data-name="pill">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative size-full">
          <Check2 />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#e5e7eb] text-[13px]">eSignature available now</p>
        </div>
      </div>
    </div>
  );
}

function TrustPills() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="trust-pills">
      <Pill />
      <Pill1 />
      <Pill2 />
    </div>
  );
}

function CtaCard() {
  return (
    <div className="backdrop-blur-[14px] bg-[rgba(7,17,31,0.85)] relative rounded-[16px] shrink-0 w-[800px]" data-name="cta-card">
      <div className="content-stretch flex flex-col gap-[24px] items-center overflow-clip px-[64px] py-[56px] relative rounded-[inherit] size-full">
        <TopAccent />
        <Copy />
        <CtaRow1 />
        <TrustPills />
      </div>
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_28px_64px_-12px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function CtaContent() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center py-[80px] relative shrink-0 w-full" data-name="cta-content">
      <CtaCard />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#e5e7eb] text-[12px] text-center w-[min-content]">LAGDA electronic notarization is coming soon and subject to Supreme Court accreditation.</p>
    </div>
  );
}

function CtaBanner() {
  return (
    <div className="relative shrink-0 w-full" data-name="cta-banner">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <img alt="" className="absolute max-w-none object-cover size-full" src={imgCtaBanner} />
        <div className="absolute bg-[rgba(7,17,31,0.6)] inset-0" />
      </div>
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col items-center px-[80px] py-[120px] relative size-full">
          <CtaContent />
        </div>
      </div>
    </div>
  );
}

function BadgeCheck() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="badge-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="badge-check">
          <path d={svgPaths.pac40080} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Frame">
      <BadgeCheck />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame81() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Frame82 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">{`The Philippines' leading secure eSignature platform. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation.`}</p>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Products</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">eSignature</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">LAGDA (Soon)</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">API</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Security</p>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Industries</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Legal</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Real Estate</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">HR</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Banking</p>
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Company</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">About</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Blog</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Contact</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#e5e7eb]">Careers</p>
    </div>
  );
}

function Frame83() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[80px] items-start leading-[normal] relative shrink-0 text-[14px] whitespace-nowrap" data-name="Frame">
      <Frame84 />
      <Frame85 />
      <Frame86 />
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame81 />
      <Frame83 />
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0" data-name="Frame">
      <p className="opacity-50 relative shrink-0">Privacy Policy</p>
      <p className="opacity-50 relative shrink-0">Terms of Service</p>
    </div>
  );
}

function Frame88() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular',sans-serif] font-normal items-center justify-between leading-[normal] relative shrink-0 text-[#e5e7eb] text-[12px] w-full whitespace-nowrap" data-name="Frame">
      <p className="opacity-50 relative shrink-0">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
      <Frame89 />
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1280 1">
            <line id="Line" stroke="var(--stroke-0, white)" strokeOpacity="0.14902" x2="1280" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame88 />
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="footer">
      <div className="content-stretch flex flex-col gap-[64px] items-start pb-[48px] pt-[64px] px-[80px] relative size-full">
        <Frame80 />
        <Frame87 />
      </div>
    </div>
  );
}

function ShieldCheck2() {
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
      <ShieldCheck2 />
    </div>
  );
}

function BrandText() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 text-white whitespace-nowrap" data-name="brand-text">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold mb-[-2px] relative shrink-0 text-[20px]">LAGDA</p>
      <p className="font-['Geist_Mono:SemiBold',sans-serif] font-semibold relative shrink-0 text-[9px]">BY LAGDA</p>
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
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Features ▾</p>
    </div>
  );
}

function TabSolutions() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center justify-center relative shrink-0" data-name="tab-Solutions">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-[-2px] pointer-events-none" />
      <p className="[word-break:break-word] font-['Geist:SemiBold','Noto_Sans_Symbols2:Regular',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Solutions ▾</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[73px]" data-name="underline" />
    </div>
  );
}

function TabPricing() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Pricing">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Pricing</p>
    </div>
  );
}

function TabResources() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Resources">
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Resources ▾</p>
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

function Button9() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex gap-[10px] h-[44px] items-center justify-center px-[20px] py-[10px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Started</p>
      <ArrowRight />
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="nav-actions">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Sign In</p>
      <Button9 />
    </div>
  );
}

function Navbar() {
  return (
    <div className="absolute content-stretch flex h-[80px] items-center justify-between left-0 px-[80px] top-0 w-[1440px]" data-name="navbar">
      <Brand />
      <NavTabs />
      <NavActions />
    </div>
  );
}

export default function DLagdaSolutionsAll() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-start relative size-full" data-name="d-lagda-solutions-all">
      <Hero />
      <GridContainer />
      <WorkflowStrip />
      <CtaBanner />
      <Footer />
      <Navbar />
    </div>
  );
}