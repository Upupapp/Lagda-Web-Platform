import svgPaths from "./svg-iknf7hdm2r";

function Frame1() {
  return (
    <div className="relative shrink-0 size-[40px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 40 40">
        <g id="Frame">
          <rect fill="var(--fill-0, #0078D4)" height="40" rx="8" width="40" />
          <path d={svgPaths.p78ddf00} id="Vector" stroke="var(--stroke-0, white)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold mb-[-2px] relative shrink-0 text-[20px] text-white">LAGDA</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#0078d4] text-[9px]">BY UPUP TECHNOLOGIES</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Frame">
      <Frame1 />
      <Frame2 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">eSignature</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[40px]" data-name="Rectangle" />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Features</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Solutions</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Pricing</p>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Resources</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="Frame">
      <Frame4 />
      <Frame5 />
      <Frame6 />
      <Frame7 />
      <Frame8 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex items-center justify-center px-[24px] py-[12px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free Account</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Sign In</p>
      <Button />
    </div>
  );
}

function Navbar() {
  return (
    <div className="bg-[#07111f] h-[80px] relative shrink-0 w-full" data-name="navbar">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[80px] relative size-full">
          <Frame />
          <Frame3 />
          <Frame9 />
        </div>
      </div>
    </div>
  );
}

function NavItemCoreWorkflow() {
  return (
    <div className="content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="nav-item-core-workflow">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[13px] whitespace-nowrap">Core Workflow</p>
    </div>
  );
}

function NavItemVerificationAudit() {
  return (
    <div className="content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="nav-item-verification-audit">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">{`Verification & Audit`}</p>
    </div>
  );
}

function NavItemAdvancedCapabilities() {
  return (
    <div className="content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="nav-item-advanced-capabilities">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[13px] whitespace-nowrap">Advanced Capabilities</p>
    </div>
  );
}

function NavItemTemplatesBranding() {
  return (
    <div className="content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="nav-item-templates-branding">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[13px] whitespace-nowrap">{`Templates & Branding`}</p>
    </div>
  );
}

function NavItemTeamEnterprise() {
  return (
    <div className="content-stretch flex h-full items-center justify-center px-[12px] relative shrink-0" data-name="nav-item-team-enterprise">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[13px] whitespace-nowrap">{`Team & Enterprise`}</p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex gap-[32px] h-full items-center relative shrink-0" data-name="Frame">
      <NavItemCoreWorkflow />
      <NavItemVerificationAudit />
      <NavItemAdvancedCapabilities />
      <NavItemTemplatesBranding />
      <NavItemTeamEnterprise />
    </div>
  );
}

function SubNav() {
  return (
    <div className="bg-[#07111f] content-stretch flex h-[56px] items-center justify-center relative shrink-0 w-full" data-name="sub-nav">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.1)] border-b border-solid inset-0 pointer-events-none" />
      <Frame10 />
    </div>
  );
}

function Chip() {
  return (
    <div className="bg-[rgba(0,120,212,0.13)] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-nowrap">VERIFICATION AND AUDIT</p>
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="hero">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center px-[80px] py-[96px] relative size-full">
          <Chip />
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[1.2] max-w-[1080px] min-w-full not-italic relative shrink-0 text-[40px] text-center text-white w-[min-content]">Track every action and verify every completed record.</p>
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] max-w-[760px] min-w-full not-italic relative shrink-0 text-[#334155] text-[16px] text-center w-[min-content]">LAGDA helps users confirm document status, signer activity, verification records, audit trails, and completed document authenticity.</p>
        </div>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">TRACK</p>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-h-px relative w-full" data-name="Frame">
      <Frame14 />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[1.2] min-w-full not-italic overflow-hidden relative shrink-0 text-[#0b2344] text-[40px] text-ellipsis w-[min-content]">Track every document from send to completion.</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] min-w-full not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-[min-content]">See where each document stands, who has viewed it, who has signed, and what action is still pending.</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame17 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Real-time status</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame19 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Viewed/signed/completed</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame21 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Needs my action</p>
    </div>
  );
}

function Frame23() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame23 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Failed delivery</p>
    </div>
  );
}

function Frame25() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame25 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Expiration warning</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-h-px relative w-full" data-name="Frame">
      <Frame16 />
      <Frame18 />
      <Frame20 />
      <Frame22 />
      <Frame24 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] h-full items-start relative shrink-0 w-[520px]" data-name="Frame">
      <Frame13 />
      <Frame15 />
    </div>
  );
}

function FileText() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="file-text">
          <path d={svgPaths.p26ce0680} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="icon">
      <FileText />
    </div>
  );
}

function Titles() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="titles">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[14px]">Verification Dashboard</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px]">Track every document from send to completion</p>
    </div>
  );
}

function Title() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="title">
      <Icon />
      <Titles />
    </div>
  );
}

function Download() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download">
          <path d={svgPaths.pdd92f40} id="Vector" stroke="var(--stroke-0, #64748B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function BtnExport() {
  return (
    <div className="bg-white content-stretch flex gap-[8px] h-[32px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="btn-export">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Download />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Export</p>
    </div>
  );
}

function Share() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="share-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="share-2">
          <path d={svgPaths.p1a8f0a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function BtnShare() {
  return (
    <div className="bg-[#0078d4] content-stretch flex gap-[8px] h-[32px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="btn-share">
      <Share />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">Share</p>
    </div>
  );
}

function Actions() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="actions">
      <BtnExport />
      <BtnShare />
    </div>
  );
}

function Topbar() {
  return (
    <div className="bg-[#f8fafc] h-[56px] relative shrink-0 w-full" data-name="topbar">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[16px] relative size-full">
          <Title />
          <Actions />
        </div>
      </div>
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_2084)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2084">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Chip1() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex gap-[6px] items-center px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <CheckCircle />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[12px] whitespace-nowrap">Completed</p>
    </div>
  );
}

function Row() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="row">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[13px] whitespace-nowrap">Document status</p>
      <Chip1 />
    </div>
  );
}

function Row1() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Signers</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">2 / 2</p>
    </div>
  );
}

function Row2() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] relative shrink-0 text-[13px] w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Last action</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">11:45 AM • Signed</p>
    </div>
  );
}

function Summary() {
  return (
    <div className="bg-[#f8fafc] relative rounded-[14px] shrink-0 w-full" data-name="summary">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[16px] relative size-full">
        <Row />
        <Row1 />
        <Row2 />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="header">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px]">Activity</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#0078d4] text-[12px]">View all</p>
    </div>
  );
}

function Frame27() {
  return <div className="bg-[#22c55e] relative rounded-[5px] shrink-0 size-[10px]" data-name="Frame" />;
}

function Frame28() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Document signed</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:45 AM • Manila, PH</p>
    </div>
  );
}

function Item() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame27 />
      <Frame28 />
    </div>
  );
}

function Frame29() {
  return <div className="bg-[#0078d4] relative rounded-[5px] shrink-0 size-[10px]" data-name="Frame" />;
}

function Frame30() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Email OTP verified</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:02 AM • Makati, PH</p>
    </div>
  );
}

function Item1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame29 />
      <Frame30 />
    </div>
  );
}

function Frame31() {
  return <div className="bg-[#64748b] relative rounded-[5px] shrink-0 size-[10px]" data-name="Frame" />;
}

function Frame32() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Document viewed</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:05 AM • Chrome on Windows</p>
    </div>
  );
}

function Item2() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame31 />
      <Frame32 />
    </div>
  );
}

function Items() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="items">
      <Item />
      <Item1 />
      <Item2 />
    </div>
  );
}

function Activity() {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px relative rounded-[14px] w-full" data-name="activity">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[16px] relative size-full">
        <Header />
        <Items />
      </div>
    </div>
  );
}

function Left() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] h-full items-start min-w-px relative" data-name="left">
      <Summary />
      <Activity />
    </div>
  );
}

function ShieldCheck() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="shield-check">
          <path d={svgPaths.p35cb9570} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[6px] items-center px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="badge">
      <ShieldCheck />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-nowrap">Verified</p>
    </div>
  );
}

function DocHeader() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="doc-header">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-px overflow-hidden relative text-[#0b2344] text-[12px] text-ellipsis whitespace-nowrap">Service Agreement.pdf</p>
      <Badge />
    </div>
  );
}

function FileText1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="file-text">
          <path d={svgPaths.p1b3c2900} id="Vector" stroke="var(--stroke-0, #64748B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[11px] whitespace-nowrap">Page 1</p>
      <FileText1 />
    </div>
  );
}

function Page() {
  return (
    <div className="bg-white flex-[1_0_0] h-[72px] min-w-px relative rounded-[10px]" data-name="page-1">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="content-stretch flex flex-col gap-[6px] items-start p-[10px] relative size-full">
        <Frame33 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[11px] w-full">Terms, definitions, and scope</p>
      </div>
    </div>
  );
}

function Signature() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="signature">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_2063)" id="signature">
          <path d={svgPaths.p879fbb8} id="Vector" stroke="var(--stroke-0, #64748B)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2063">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[11px] whitespace-nowrap">Page 2</p>
      <Signature />
    </div>
  );
}

function Page1() {
  return (
    <div className="bg-white flex-[1_0_0] h-[72px] min-w-px relative rounded-[10px]" data-name="page-2">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="content-stretch flex flex-col gap-[6px] items-start p-[10px] relative size-full">
        <Frame34 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[11px] w-full">Signatures and acknowledgments</p>
      </div>
    </div>
  );
}

function Pages() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="pages">
      <Page />
      <Page1 />
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Verification ID</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0078d4]">LAGDA-VRF-2025-1042</p>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Audit trail</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">4 events</p>
    </div>
  );
}

function Meta() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[6px] items-start leading-[normal] relative shrink-0 text-[11px] w-full whitespace-nowrap" data-name="meta">
      <Frame35 />
      <Frame36 />
    </div>
  );
}

function Preview() {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px relative rounded-[12px] w-full" data-name="preview">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[12px] relative size-full">
        <DocHeader />
        <Pages />
        <Meta />
      </div>
    </div>
  );
}

function Right() {
  return (
    <div className="bg-[#f8fafc] h-full relative rounded-[14px] shrink-0 w-[220px]" data-name="right">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[13px] whitespace-nowrap">Document preview</p>
        <Preview />
      </div>
    </div>
  );
}

function Body() {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px relative w-full" data-name="body">
      <div className="content-stretch flex gap-[16px] items-start p-[16px] relative size-full">
        <Left />
        <Right />
      </div>
    </div>
  );
}

function MockupVerificationDashboard() {
  return (
    <div className="bg-white h-[400px] relative rounded-[16px] shrink-0 w-[640px]" data-name="mockup-verification-dashboard">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Topbar />
        <Body />
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_24px_48px_0px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Frame26() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-[1_0_0] flex-col h-[500px] items-center justify-center min-w-px relative rounded-[32px]" data-name="Frame">
      <MockupVerificationDashboard />
    </div>
  );
}

function Frame11() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[80px] items-center px-[80px] py-[120px] relative size-full">
          <div className="flex flex-row items-center self-stretch">
            <Frame12 />
          </div>
          <Frame26 />
        </div>
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="h-[72px] relative shrink-0 w-[12px]" data-name="Frame">
      <div className="absolute inset-[0_0_-13.89%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 82">
          <g id="Frame">
            <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
            <rect fill="var(--fill-0, #0078D4)" height="72" id="Rectangle" width="2" x="5" y="10" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Frame44() {
  return (
    <div className="bg-[#eaf6ff] flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start px-[12px] py-[6px] relative size-full whitespace-nowrap">
        <p className="font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[13px]">Document Sent</p>
        <p className="font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[9px]">11:00 AM • Quezon City, PH</p>
      </div>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame43 />
      <Frame44 />
    </div>
  );
}

function Frame46() {
  return (
    <div className="h-[72px] relative shrink-0 w-[12px]" data-name="Frame">
      <div className="absolute inset-[0_0_-13.89%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 82">
          <g id="Frame">
            <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
            <rect fill="var(--fill-0, #0078D4)" height="72" id="Rectangle" width="2" x="5" y="10" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Frame47() {
  return (
    <div className="bg-[#eaf6ff] flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start px-[12px] py-[6px] relative size-full whitespace-nowrap">
        <p className="font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[13px]">Email OTP Verified</p>
        <p className="font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[9px]">11:02 AM • Makati, PH</p>
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame46 />
      <Frame47 />
    </div>
  );
}

function Frame49() {
  return (
    <div className="h-[72px] relative shrink-0 w-[12px]" data-name="Frame">
      <div className="absolute inset-[0_0_-13.89%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 82">
          <g id="Frame">
            <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
            <rect fill="var(--fill-0, #0078D4)" height="72" id="Rectangle" width="2" x="5" y="10" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Frame50() {
  return (
    <div className="bg-[#eaf6ff] flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start px-[12px] py-[6px] relative size-full whitespace-nowrap">
        <p className="font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[13px]">Document Viewed</p>
        <p className="font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[9px]">11:05 AM • Chrome on Windows</p>
      </div>
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame49 />
      <Frame50 />
    </div>
  );
}

function Frame52() {
  return (
    <div className="h-[72px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 72">
        <g id="Frame">
          <circle cx="6" cy="5" fill="var(--fill-0, #22C55E)" id="Ellipse" r="5" />
        </g>
      </svg>
    </div>
  );
}

function Frame53() {
  return (
    <div className="bg-[#eaf6ff] flex-[1_0_0] min-w-px relative rounded-[10px]" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[4px] items-start px-[12px] py-[6px] relative size-full whitespace-nowrap">
        <p className="font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[13px]">Document Signed</p>
        <p className="font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[9px]">11:45 AM • Manila, PH</p>
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame52 />
      <Frame53 />
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-h-px relative w-full" data-name="Frame">
      <Frame42 />
      <Frame45 />
      <Frame48 />
      <Frame51 />
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-h-px relative w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Audit Records</p>
      <Frame41 />
    </div>
  );
}

function Frame54() {
  return (
    <div className="bg-[#eaf6ff] relative rounded-[12px] shrink-0 w-full" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-[1.5] p-[16px] relative size-full text-[13px]">
        <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] w-full">Privacy Protection</p>
        <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] w-full">Exact GPS requires explicit signer permission. LAGDA records approximate IP-based location by default.</p>
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="bg-white drop-shadow-[0px_24px_24px_rgba(0,0,0,0.1)] flex-[1_0_0] min-h-px relative rounded-[16px] w-[640px]" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[24px] items-start p-[24px] relative size-full">
        <Frame40 />
        <Frame54 />
      </div>
    </div>
  );
}

function Frame38() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] flex-col h-[500px] items-center justify-center min-w-px relative rounded-[32px]" data-name="Frame">
      <Frame39 />
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">AUDIT TRAIL</p>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-h-px relative w-full" data-name="Frame">
      <Frame57 />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[1.2] min-w-full not-italic overflow-hidden relative shrink-0 text-[#0b2344] text-[40px] text-ellipsis w-[min-content]">Create audit-ready records automatically.</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] min-w-full not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-[min-content]">Every major document event is recorded in an activity trail, giving teams a clear record of who did what and when.</p>
    </div>
  );
}

function Frame60() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame60 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Timestamp</p>
    </div>
  );
}

function Frame62() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame62 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Authentication method</p>
    </div>
  );
}

function Frame64() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame64 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">IP address</p>
    </div>
  );
}

function Frame66() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame66 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Device/browser</p>
    </div>
  );
}

function Frame68() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame68 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Approximate IP-based location</p>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-h-px relative w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Evidence Captured:</p>
      <Frame59 />
      <Frame61 />
      <Frame63 />
      <Frame65 />
      <Frame67 />
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] h-full items-start relative shrink-0 w-[520px]" data-name="Frame">
      <Frame56 />
      <Frame58 />
    </div>
  );
}

function Frame37() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[80px] items-center px-[80px] py-[120px] relative size-full">
          <Frame38 />
          <div className="flex flex-row items-center self-stretch">
            <Frame55 />
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame72() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">STORE AND VERIFY</p>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame72 />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[1.2] min-w-full not-italic relative shrink-0 text-[#0b2344] text-[40px] w-[min-content]">Store completed documents and verify records when needed.</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] min-w-full not-italic relative shrink-0 text-[#334155] text-[16px] w-[min-content]">Completed documents can be stored with completion history, audit records, and verification links.</p>
    </div>
  );
}

function Frame75() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame75 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Secure storage</p>
    </div>
  );
}

function Frame77() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame77 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Completed PDF</p>
    </div>
  );
}

function Frame79() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame78() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame79 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Audit trail download</p>
    </div>
  );
}

function Frame81() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame81 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Verification ID</p>
    </div>
  );
}

function Frame83() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame83 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Public verification page</p>
    </div>
  );
}

function Frame85() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Frame">
          <path d={svgPaths.p3c963e00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame85 />
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] whitespace-nowrap">Document history</p>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame74 />
      <Frame76 />
      <Frame78 />
      <Frame80 />
      <Frame82 />
      <Frame84 />
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-[520px]" data-name="Frame">
      <Frame71 />
      <Frame73 />
    </div>
  );
}

function Database() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="database">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="database">
          <path d={svgPaths.p10c45e80} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon1() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="icon">
      <Database />
    </div>
  );
}

function Titles1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="titles">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[14px]">Verification Record</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px]">Completed documents and audit history</p>
    </div>
  );
}

function Title1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="title">
      <Icon1 />
      <Titles1 />
    </div>
  );
}

function Download1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download">
          <path d={svgPaths.pdd92f40} id="Vector" stroke="var(--stroke-0, #64748B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function BtnDownload() {
  return (
    <div className="bg-white content-stretch flex gap-[8px] h-[32px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="btn-download">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Download1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Download</p>
    </div>
  );
}

function Share1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="share-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="share-2">
          <path d={svgPaths.p1a8f0a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function BtnShare1() {
  return (
    <div className="bg-[#0078d4] content-stretch flex gap-[8px] h-[32px] items-center px-[12px] relative rounded-[10px] shrink-0" data-name="btn-share">
      <Share1 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">Share</p>
    </div>
  );
}

function Actions1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="actions">
      <BtnDownload />
      <BtnShare1 />
    </div>
  );
}

function Topbar1() {
  return (
    <div className="bg-[#f8fafc] h-[56px] relative shrink-0 w-full" data-name="topbar">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[16px] relative size-full">
          <Title1 />
          <Actions1 />
        </div>
      </div>
    </div>
  );
}

function CheckCircle1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_2084)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2084">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Chip2() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex gap-[6px] items-center px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <CheckCircle1 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[12px] whitespace-nowrap">Verified</p>
    </div>
  );
}

function Row3() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="row">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[13px] whitespace-nowrap">Record details</p>
      <Chip2 />
    </div>
  );
}

function Frame87() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Document</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">Service Agreement.pdf</p>
    </div>
  );
}

function Frame88() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Verification ID</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0078d4]">LAGDA-VRF-2025-1042</p>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Completed</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">11:45 AM • Manila, PH</p>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b]">Signers</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344]">2 / 2</p>
    </div>
  );
}

function Kv() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start leading-[normal] relative shrink-0 text-[12px] w-full whitespace-nowrap" data-name="kv">
      <Frame87 />
      <Frame88 />
      <Frame89 />
      <Frame90 />
    </div>
  );
}

function Details() {
  return (
    <div className="bg-[#f8fafc] relative rounded-[14px] shrink-0 w-full" data-name="details">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[16px] relative size-full">
        <Row3 />
        <Kv />
      </div>
    </div>
  );
}

function Clock() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="clock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_2057)" id="clock">
          <path d={svgPaths.p8765900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2057">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Clock />
    </div>
  );
}

function Item3() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame91 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0b2344] text-[13px]">Timestamp</p>
    </div>
  );
}

function Shield() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="shield">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="shield">
          <path d={svgPaths.pae18800} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Shield />
    </div>
  );
}

function Item4() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame92 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0b2344] text-[13px]">Authentication method</p>
    </div>
  );
}

function Globe() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="globe">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_2075)" id="globe">
          <path d={svgPaths.p2284ce80} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2075">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame93() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Globe />
    </div>
  );
}

function Item5() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame93 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0b2344] text-[13px]">IP address</p>
    </div>
  );
}

function Monitor() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="monitor">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="monitor">
          <path d={svgPaths.p2dc44780} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <Monitor />
    </div>
  );
}

function Item6() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame94 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0b2344] text-[13px]">Device/browser</p>
    </div>
  );
}

function MapPin() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="map-pin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="map-pin">
          <path d={svgPaths.p8b99100} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <MapPin />
    </div>
  );
}

function Item7() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full" data-name="item">
      <Frame95 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0b2344] text-[13px]">Approximate IP-based location</p>
    </div>
  );
}

function List() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="list">
      <Item3 />
      <Item4 />
      <Item5 />
      <Item6 />
      <Item7 />
    </div>
  );
}

function Evidence() {
  return (
    <div className="bg-white relative rounded-[14px] shrink-0 w-full" data-name="evidence">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[16px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[13px] whitespace-nowrap">Evidence captured</p>
        <List />
      </div>
    </div>
  );
}

function Left1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] h-full items-start min-w-px relative" data-name="left">
      <Details />
      <Evidence />
    </div>
  );
}

function Frame96() {
  return (
    <div className="h-[110px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 110">
        <g id="Frame">
          <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
          <rect fill="var(--fill-0, #0078D4)" height="100" id="Rectangle" width="2" x="5" y="10" />
        </g>
      </svg>
    </div>
  );
}

function Frame97() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Document sent</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:00 AM • Quezon City, PH</p>
    </div>
  );
}

function Step() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="step">
      <Frame96 />
      <Frame97 />
    </div>
  );
}

function Frame98() {
  return (
    <div className="h-[110px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 110">
        <g id="Frame">
          <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
          <rect fill="var(--fill-0, #0078D4)" height="100" id="Rectangle" width="2" x="5" y="10" />
        </g>
      </svg>
    </div>
  );
}

function Frame99() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Email OTP verified</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:02 AM • Makati, PH</p>
    </div>
  );
}

function Step1() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="step">
      <Frame98 />
      <Frame99 />
    </div>
  );
}

function Frame100() {
  return (
    <div className="h-[110px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 110">
        <g id="Frame">
          <circle cx="6" cy="5" fill="var(--fill-0, #0078D4)" id="Ellipse" r="5" />
          <rect fill="var(--fill-0, #0078D4)" height="100" id="Rectangle" width="2" x="5" y="10" />
        </g>
      </svg>
    </div>
  );
}

function Frame101() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Document viewed</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:05 AM • Chrome on Windows</p>
    </div>
  );
}

function Step2() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="step">
      <Frame100 />
      <Frame101 />
    </div>
  );
}

function Frame102() {
  return (
    <div className="h-[10px] relative shrink-0 w-[12px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 10">
        <g id="Frame">
          <circle cx="6" cy="5" fill="var(--fill-0, #22C55E)" id="Ellipse" r="5" />
        </g>
      </svg>
    </div>
  );
}

function Frame103() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[13px] w-full">Document signed</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[12px] w-full">11:45 AM • Manila, PH</p>
    </div>
  );
}

function Step3() {
  return (
    <div className="content-stretch flex gap-[10px] items-start relative shrink-0 w-full" data-name="step">
      <Frame102 />
      <Frame103 />
    </div>
  );
}

function Timeline() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="timeline">
      <Step />
      <Step1 />
      <Step2 />
      <Step3 />
    </div>
  );
}

function Right1() {
  return (
    <div className="bg-[#f8fafc] h-full relative rounded-[14px] shrink-0 w-[220px]" data-name="right">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[13px] whitespace-nowrap">Timeline</p>
        <Timeline />
      </div>
    </div>
  );
}

function Body1() {
  return (
    <div className="bg-white flex-[1_0_0] min-h-px relative w-full" data-name="body">
      <div className="content-stretch flex gap-[16px] items-start p-[16px] relative size-full">
        <Left1 />
        <Right1 />
      </div>
    </div>
  );
}

function MockupVerificationRecord() {
  return (
    <div className="bg-white h-[400px] relative rounded-[16px] shrink-0 w-[640px]" data-name="mockup-verification-record">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Topbar1 />
        <Body1 />
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_24px_48px_0px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Frame86() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-[1_0_0] flex-col h-[500px] items-center justify-center min-w-px relative rounded-[32px]" data-name="Frame">
      <MockupVerificationRecord />
    </div>
  );
}

function Frame69() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[80px] items-center px-[80px] py-[120px] relative size-full">
          <Frame70 />
          <Frame86 />
        </div>
      </div>
    </div>
  );
}

function Frame108() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[#0b2344] text-[15px] w-full">LAGDA Document Verification</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold leading-[1.4] relative shrink-0 text-[#64748b] text-[11px] w-full">Scan to verify • lagda.com/verify</p>
    </div>
  );
}

function Frame110() {
  return (
    <div className="relative shrink-0 size-[72px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 72 72">
        <g id="Frame">
          <rect fill="var(--fill-0, white)" height="71" rx="7.5" width="71" x="0.5" y="0.5" />
          <rect height="71" rx="7.5" stroke="var(--stroke-0, #E5E7EB)" width="71" x="0.5" y="0.5" />
          <path d={svgPaths.p1f20e800} id="Vector" stroke="var(--stroke-0, #0B2344)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-end relative shrink-0 w-[220px]" data-name="Frame">
      <Frame110 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-full not-italic relative shrink-0 text-[#0078d4] text-[11px] text-center w-[min-content]">LAGDA-VRF-2025-1042</p>
    </div>
  );
}

function Frame107() {
  return (
    <div className="bg-[#eaf6ff] relative rounded-[12px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[16px] relative size-full">
          <Frame108 />
          <Frame109 />
        </div>
      </div>
    </div>
  );
}

function Frame112() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[1.5] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#0b2344] text-[15px] w-full">Service Agreement.pdf</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[13px] w-full">Completed • 2 signers</p>
    </div>
  );
}

function Frame113() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">Verified</p>
    </div>
  );
}

function Frame111() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] relative rounded-[16px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[16px] relative size-full">
          <Frame112 />
          <Frame113 />
        </div>
      </div>
    </div>
  );
}

function Frame106() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_18px_20px_rgba(0,0,0,0.08),0px_2px_4px_rgba(0,0,0,0.05)] flex flex-col gap-[16px] items-start p-[24px] relative rounded-[16px] shrink-0 w-[640px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame107 />
      <Frame111 />
    </div>
  );
}

function Frame105() {
  return (
    <div className="bg-white content-stretch flex flex-[1_0_0] flex-col h-[520px] items-center justify-center min-w-px relative rounded-[32px]" data-name="Frame">
      <Frame106 />
    </div>
  );
}

function Frame116() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Frame">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">QR VERIFICATION</p>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame116 />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[1.15] not-italic relative shrink-0 text-[#0b2344] text-[44px] w-full">Every signed document can verify itself.</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] not-italic relative shrink-0 text-[#334155] text-[16px] w-full">Completed LAGDA PDFs include a QR code and clickable verification URL. Scanning opens the LAGDA Document Verification page with public metadata and document status.</p>
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[520px]" data-name="Frame">
      <Frame115 />
    </div>
  );
}

function Frame104() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[64px] items-center px-[80px] py-[96px] relative size-full">
          <Frame105 />
          <Frame114 />
        </div>
      </div>
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="shield-check">
          <path d={svgPaths.p35cb9570} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <ShieldCheck1 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Verification Standards</p>
    </div>
  );
}

function Header1() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center max-w-[900px] relative shrink-0 w-full" data-name="header">
      <Badge1 />
      <p className="[word-break:break-word] font-['Inter:Extra_Bold',sans-serif] font-extrabold leading-[1.1] max-w-[900px] min-w-full not-italic overflow-hidden relative shrink-0 text-[36px] text-center text-ellipsis text-white w-[min-content]">Built for compliance, accountability, and audit-ready workflows.</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] max-w-[760px] min-w-full not-italic overflow-hidden relative shrink-0 text-[16px] text-[rgba(255,255,255,0.7)] text-center text-ellipsis w-[min-content]">LAGDA supports secure document execution with clear evidence capture, tamper-evident audit trails, and verification controls designed for regulated environments.</p>
    </div>
  );
}

function Clock1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="clock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_2100)" id="clock">
          <path d={svgPaths.p1dbb2580} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_2100">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Icon2() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Clock1 />
    </div>
  );
}

function Text() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="text">
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.3] not-italic relative shrink-0 text-[#0b2344] text-[16px] w-full">Timestamped audit trail</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] overflow-hidden relative shrink-0 text-[#64748b] text-[13px] text-ellipsis w-full">Every major event is recorded with a timestamp, actor, and evidence metadata.</p>
    </div>
  );
}

function Top() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="top">
      <Icon2 />
      <Text />
    </div>
  );
}

function Frame117() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Immutable</p>
    </div>
  );
}

function Frame118() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Exportable</p>
    </div>
  );
}

function Tags() {
  return (
    <div className="content-start flex flex-wrap gap-[8px] items-start relative shrink-0 w-full" data-name="tags">
      <Frame117 />
      <Frame118 />
    </div>
  );
}

function Card() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Top />
        <Tags />
      </div>
    </div>
  );
}

function Shield1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="shield">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="shield">
          <path d={svgPaths.p6147300} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon3() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <Shield1 />
    </div>
  );
}

function Text1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="text">
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.3] not-italic relative shrink-0 text-[#0b2344] text-[16px] w-full">Authentication evidence</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] overflow-hidden relative shrink-0 text-[#64748b] text-[13px] text-ellipsis w-full">Capture authentication methods, IP, device, and location data for signer accountability.</p>
    </div>
  );
}

function Top1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="top">
      <Icon3 />
      <Text1 />
    </div>
  );
}

function Frame119() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">OTP</p>
    </div>
  );
}

function Frame120() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">IP</p>
    </div>
  );
}

function Frame121() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Device</p>
    </div>
  );
}

function Tags1() {
  return (
    <div className="content-start flex flex-wrap gap-[8px] items-start relative shrink-0 w-full" data-name="tags">
      <Frame119 />
      <Frame120 />
      <Frame121 />
    </div>
  );
}

function Card1() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Top1 />
        <Tags1 />
      </div>
    </div>
  );
}

function FileText2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="file-text">
          <path d={svgPaths.p27efcb00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon4() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[40px]" data-name="icon">
      <FileText2 />
    </div>
  );
}

function Text2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px relative" data-name="text">
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.3] not-italic relative shrink-0 text-[#0b2344] text-[16px] w-full">Secure document storage</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] overflow-hidden relative shrink-0 text-[#64748b] text-[13px] text-ellipsis w-full">Store completed documents with completion history, audit records, and verification links.</p>
    </div>
  );
}

function Top2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="top">
      <Icon4 />
      <Text2 />
    </div>
  );
}

function Frame122() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">PDF</p>
    </div>
  );
}

function Frame123() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Audit trail</p>
    </div>
  );
}

function Frame124() {
  return (
    <div className="bg-white content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Verification ID</p>
    </div>
  );
}

function Tags2() {
  return (
    <div className="content-start flex flex-wrap gap-[8px] items-start relative shrink-0 w-full" data-name="tags">
      <Frame122 />
      <Frame123 />
      <Frame124 />
    </div>
  );
}

function Card2() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Top2 />
        <Tags2 />
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="cards">
      <Card />
      <Card1 />
      <Card2 />
    </div>
  );
}

function SectionVerificationStandards() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="section-verification-standards">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center px-[80px] py-[96px] relative size-full">
          <Header1 />
          <Cards />
        </div>
      </div>
    </div>
  );
}

function Copy() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center max-w-[760px] not-italic relative shrink-0 text-center w-full" data-name="copy">
      <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[40px] text-white w-full">Track, verify, and secure every signing workflow.</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[18px] text-[rgba(255,255,255,0.7)] w-full">Verify documents instantly, explore security features, or create an account to get started.</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex items-center justify-center px-[24px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Verify a Document</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center px-[24px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border-[1.5px] border-solid border-white inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">View Security Features</p>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center px-[24px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border-[1.5px] border-solid border-white inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free Account</p>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex gap-[24px] items-center justify-center relative shrink-0 w-full" data-name="Frame">
      <Button1 />
      <Button2 />
      <Button3 />
    </div>
  );
}

function Frame125() {
  return (
    <div className="bg-gradient-to-r from-[#07111f] relative shrink-0 to-[#0b1b3a] w-full" data-name="Frame">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[120px] relative size-full">
          <Copy />
          <Frame126 />
        </div>
      </div>
    </div>
  );
}

function Frame130() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="Frame">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Frame">
          <rect fill="var(--fill-0, #0078D4)" height="32" rx="6" width="32" />
          <path d={svgPaths.p32470800} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame130 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Frame129 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#64748b] text-[15px] w-[min-content]">{`The Philippines' leading infrastructure for secure, compliant, and modern document execution.`}</p>
    </div>
  );
}

function Frame133() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#64748b]" data-name="Frame">
      <p className="relative shrink-0">eSignature</p>
      <p className="relative shrink-0">Features</p>
      <p className="relative shrink-0">Pricing</p>
      <p className="relative shrink-0">Verification</p>
      <p className="relative shrink-0">API</p>
      <p className="relative shrink-0">LAGDA eNotary</p>
    </div>
  );
}

function Frame132() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Product</p>
      <Frame133 />
    </div>
  );
}

function Frame135() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#64748b]" data-name="Frame">
      <p className="relative shrink-0">Lawyers</p>
      <p className="relative shrink-0">Law Firms</p>
      <p className="relative shrink-0">Business Teams</p>
      <p className="relative shrink-0">Government</p>
      <p className="relative shrink-0">Real Estate</p>
      <p className="relative shrink-0">HR</p>
      <p className="relative shrink-0">Finance</p>
    </div>
  );
}

function Frame134() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Solutions</p>
      <Frame135 />
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#64748b]" data-name="Frame">
      <p className="relative shrink-0">Identity Verification</p>
      <p className="relative shrink-0">Audit Trail</p>
      <p className="relative shrink-0">Secure Storage</p>
      <p className="relative shrink-0">Permissions</p>
      <p className="relative shrink-0">Trust Center</p>
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Security</p>
      <Frame137 />
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#64748b]" data-name="Frame">
      <p className="relative shrink-0">Guides</p>
      <p className="relative shrink-0">FAQ</p>
      <p className="relative shrink-0">Legal Framework</p>
      <p className="relative shrink-0">Help Center</p>
      <p className="relative shrink-0">Contact</p>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Resources</p>
      <Frame139 />
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#64748b]" data-name="Frame">
      <p className="relative shrink-0">Terms of Service</p>
      <p className="relative shrink-0">Privacy Policy</p>
      <p className="relative shrink-0">Data Processing</p>
      <p className="relative shrink-0">Security Policy</p>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Legal</p>
      <Frame141 />
    </div>
  );
}

function Frame131() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[64px] items-start leading-[1.5] relative shrink-0 text-[15px] whitespace-nowrap" data-name="Frame">
      <Frame132 />
      <Frame134 />
      <Frame136 />
      <Frame138 />
      <Frame140 />
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame128 />
      <Frame131 />
    </div>
  );
}

function Frame144() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(103,2,59,0.4)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#fdb8d4] text-[11px] whitespace-nowrap">LAGDA eNotary status: Coming Soon - Subject to SC Accreditation</p>
    </div>
  );
}

function Frame143() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[15px] whitespace-nowrap">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
      <Frame144 />
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1280 1">
            <line id="Line" stroke="var(--stroke-0, white)" strokeOpacity="0.101961" x2="1280" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame143 />
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="footer">
      <div className="content-stretch flex flex-col gap-[80px] items-start p-[80px] relative size-full">
        <Frame127 />
        <Frame142 />
      </div>
    </div>
  );
}

export default function DLagdaEsignatureVerificationAudit() {
  return (
    <div className="bg-white relative rounded-[24px] size-full" data-name="d-lagda-esignature-verification-audit">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Navbar />
        <SubNav />
        <Hero />
        <Frame11 />
        <Frame37 />
        <Frame69 />
        <Frame104 />
        <SectionVerificationStandards />
        <Frame125 />
        <Footer />
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[24px]" />
    </div>
  );
}