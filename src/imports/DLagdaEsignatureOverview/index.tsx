import svgPaths from "./svg-875xawemil";
import imgEllipse from "./12d5150c72a9290cfed2768a3ceb69107348961a.png";

function ShieldCheck() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p15833e80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
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
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 text-white whitespace-nowrap" data-name="brand-text">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold mb-[-2px] relative shrink-0 text-[20px]">LAGDA</p>
      <p className="font-['Geist_Mono:SemiBold',sans-serif] font-semibold relative shrink-0 text-[9px]">BY UPUP TECHNOLOGIES</p>
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

function TabESignature() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="tab-eSignature">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">eSignature</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Features</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[60px]" data-name="Rectangle" />
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[72px]" data-name="underline" />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Solutions</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Pricing</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Resources</p>
    </div>
  );
}

function NavTabs() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="nav-tabs">
      <TabESignature />
      <Frame />
      <Frame1 />
      <Frame2 />
      <Frame3 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex h-[44px] items-center justify-center px-[24px] py-[12px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free Account</p>
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="nav-actions">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Sign In</p>
      <Button />
    </div>
  );
}

function Navbar() {
  return (
    <div className="bg-[#07111f] h-[80px] relative shrink-0 w-full" data-name="navbar">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[80px] relative size-full">
          <Brand />
          <NavTabs />
          <NavActions />
        </div>
      </div>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="eyebrow">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] uppercase whitespace-nowrap">LAGDA FEATURES</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0 w-full" data-name="Frame">
      <Eyebrow />
      <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[1.05] min-w-full relative shrink-0 text-[56px] text-white w-[min-content]">Everything you need to send, sign, track, and verify legal documents online.</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[18px] w-[min-content]">LAGDA eSignature gives Philippine professionals and organizations a secure way to prepare documents, verify signers, collect signatures, track status, generate audit records, and store completed documents.</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_6px_8px_rgba(0,120,212,0.2)] flex h-[56px] items-center justify-center px-[28px] py-[14px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[56px] items-center justify-center px-[24px] py-[12px] relative rounded-[10px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border-[1.5px] border-solid border-white inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Frame">
      <Button1 />
      <Button2 />
    </div>
  );
}

function Frame8() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">eSignature Available Now</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Identity-Aware Signing</p>
    </div>
  );
}

function Frame10() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Audit-Ready Records</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Document Verification</p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="bg-[rgba(255,255,255,0.06)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Built for Philippine Workflows</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-start flex flex-wrap gap-[12px] items-start pt-[12px] relative shrink-0 w-full" data-name="Frame">
      <Frame8 />
      <Frame9 />
      <Frame10 />
      <Frame11 />
      <Frame12 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-[620px]" data-name="Frame">
      <Frame5 />
      <Frame6 />
      <Frame7 />
    </div>
  );
}

function MoreHorizontal() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="more-horizontal">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="more-horizontal">
          <g id="Vector">
            <path d={svgPaths.pb01e200} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p3edf7a00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p2505e100} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Frame13() {
  return (
    <div className="relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.06)] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex items-start justify-between p-[20px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">My Documents</p>
        <MoreHorizontal />
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">Completed</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] relative rounded-[10px] shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Service Agreement.pdf</p>
          <Frame16 />
        </div>
      </div>
    </div>
  );
}

function Frame18() {
  return (
    <div className="bg-[rgba(0,120,212,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-nowrap">Sent</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] relative rounded-[10px] shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Engagement Letter.pdf</p>
          <Frame18 />
        </div>
      </div>
    </div>
  );
}

function Frame20() {
  return (
    <div className="bg-[rgba(245,158,11,0.13)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(245,158,11,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#f59e0b] text-[11px] whitespace-nowrap">Pending</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] relative rounded-[10px] shrink-0 w-full" data-name="Frame">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Board Resolution.pdf</p>
          <Frame20 />
        </div>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="relative shrink-0 w-full" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Frame15 />
        <Frame17 />
        <Frame19 />
      </div>
    </div>
  );
}

function MainCard() {
  return (
    <div className="absolute bg-[#0b2344] content-stretch drop-shadow-[0px_24px_30px_rgba(0,0,0,0.2)] flex flex-col h-[380px] items-start left-0 rounded-[20px] top-[40px] w-[500px]" data-name="main-card">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame13 />
      <Frame14 />
    </div>
  );
}

function Frame22() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[12px] text-black">Maria Santos</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[10px]">maria.s@business.ph</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Frame">
      <div className="relative shrink-0 size-[32px]" data-name="Ellipse">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse} width="32" />
      </div>
      <Frame22 />
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

function Frame24() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <CheckCircle />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-black whitespace-nowrap">Email Verified</p>
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

function Frame25() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <CheckCircle1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-black whitespace-nowrap">OTP Confirmed</p>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0" data-name="Frame">
      <Frame24 />
      <Frame25 />
    </div>
  );
}

function VerifyCard() {
  return (
    <div className="absolute backdrop-blur-[8px] bg-[rgba(255,255,255,0.9)] content-stretch flex flex-col gap-[12px] items-start left-[320px] p-[16px] rounded-[16px] top-0 w-[240px]" data-name="verify-card">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.5)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_16px_32px_0px_rgba(0,0,0,0.1)]" />
      <Frame21 />
      <Frame23 />
    </div>
  );
}

function Frame28() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[10px] text-black">Document Viewed</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[9px]">11:20 AM</p>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="Frame">
      <div className="bg-[#0078d4] h-[20px] relative shrink-0 w-[2px]" data-name="Rectangle" />
      <Frame28 />
    </div>
  );
}

function Frame30() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[10px] text-black">Signed by Maria</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[9px]">11:45 AM</p>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0" data-name="Frame">
      <div className="bg-[#22c55e] h-[20px] relative shrink-0 w-[2px]" data-name="Rectangle" />
      <Frame30 />
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0" data-name="Frame">
      <Frame27 />
      <Frame29 />
    </div>
  );
}

function AuditTrail() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.95)] content-stretch flex flex-col gap-[12px] items-start left-[360px] p-[16px] rounded-[16px] shadow-[0px_16px_32px_0px_rgba(0,0,0,0.1)] top-[260px] w-[220px]" data-name="audit-trail">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[12px] whitespace-nowrap">Live Audit Trail</p>
      <Frame26 />
    </div>
  );
}

function MockupStack() {
  return (
    <div className="h-[500px] relative shrink-0 w-[640px]" data-name="mockup-stack">
      <MainCard />
      <VerifyCard />
      <AuditTrail />
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="content-stretch flex flex-[1_0_0] h-[600px] items-center justify-end min-w-px relative" data-name="hero-visual">
      <MockupStack />
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="hero">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[48px] items-center px-[80px] py-[96px] relative size-full">
          <Frame4 />
          <HeroVisual />
        </div>
      </div>
    </div>
  );
}

function Frame32() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Core Workflow</p>
    </div>
  );
}

function Frame33() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">{`Verification & Audit`}</p>
    </div>
  );
}

function Frame34() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">Advanced Capabilities</p>
    </div>
  );
}

function Frame35() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">{`Team & Enterprise`}</p>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex gap-[12px] items-start pl-[24px] relative shrink-0" data-name="Frame">
      <Frame32 />
      <Frame33 />
      <Frame34 />
      <Frame35 />
    </div>
  );
}

function JumpNav() {
  return (
    <div className="bg-white h-[72px] relative shrink-0 w-full" data-name="jump-nav">
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center px-[80px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#64748b] text-[13px] whitespace-nowrap">Jump to:</p>
          <Frame31 />
        </div>
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 text-center w-[1120px]" data-name="Frame">
      <p className="font-['Geist:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#0b2344] text-[56px] w-full">Built for the full eSignature workflow.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#334155] text-[18px] w-full">LAGDA eSignature covers every step from document preparation to completed record.</p>
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame40() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck1 />
    </div>
  );
}

function Frame41() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Document Preparation</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Upload PDFs and prepare signing fields with drag-and-drop tools.</p>
    </div>
  );
}

function Frame39() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame40 />
      <Frame41 />
    </div>
  );
}

function ShieldCheck2() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame43() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck2 />
    </div>
  );
}

function Frame44() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Recipient Management</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Add signers, viewers, and approvers with clear professional roles.</p>
    </div>
  );
}

function Frame42() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame43 />
      <Frame44 />
    </div>
  );
}

function ShieldCheck3() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame46() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck3 />
    </div>
  );
}

function Frame47() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Signer Verification</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Multi-factor authentication via unique links, email, and OTP.</p>
    </div>
  );
}

function Frame45() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame46 />
      <Frame47 />
    </div>
  );
}

function ShieldCheck4() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame49() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck4 />
    </div>
  );
}

function Frame50() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Online Signing</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Adopt signatures and complete documents from any modern device.</p>
    </div>
  );
}

function Frame48() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame49 />
      <Frame50 />
    </div>
  );
}

function ShieldCheck5() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame52() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck5 />
    </div>
  );
}

function Frame53() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Status Tracking</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Monitor documents from initial draft to final completion in real-time.</p>
    </div>
  );
}

function Frame51() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame52 />
      <Frame53 />
    </div>
  );
}

function ShieldCheck6() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame55() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck6 />
    </div>
  );
}

function Frame56() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Audit Trail</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Immutable, timestamped records for every event in the document life cycle.</p>
    </div>
  );
}

function Frame54() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame55 />
      <Frame56 />
    </div>
  );
}

function ShieldCheck7() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame58() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck7 />
    </div>
  );
}

function Frame59() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Document Verification</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Public or private verification of completed document authenticity.</p>
    </div>
  );
}

function Frame57() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame58 />
      <Frame59 />
    </div>
  );
}

function ShieldCheck8() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="shield-check">
          <path d={svgPaths.p26f66600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame61() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[14px] shrink-0 size-[56px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <ShieldCheck8 />
    </div>
  );
}

function Frame62() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0b2344] text-[20px] w-full">Team Workspace</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#64748b] text-[14px] w-full">Manage roles, templates, and permissions across your organization.</p>
    </div>
  );
}

function Frame60() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_14px_16px_rgba(0,0,0,0.07),0px_2px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] items-start px-[24px] py-[28px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame61 />
      <Frame62 />
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-start flex flex-wrap gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame39 />
      <Frame42 />
      <Frame45 />
      <Frame48 />
      <Frame51 />
      <Frame54 />
      <Frame57 />
      <Frame60 />
    </div>
  );
}

function Frame36() {
  return (
    <div className="bg-[#eaf6ff] relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[96px] relative size-full">
          <Frame37 />
          <Frame38 />
        </div>
      </div>
    </div>
  );
}

function Eyebrow1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="eyebrow">
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[24px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] uppercase whitespace-nowrap">TEMPLATES</p>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Eyebrow1 />
      <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[#0b2344] text-[56px] whitespace-nowrap">Turn repeat documents into reusable workflows.</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#334155] text-[18px] whitespace-nowrap">Save commonly used documents as templates so your team can send faster.</p>
    </div>
  );
}

function FileText() {
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

function Frame68() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText />
    </div>
  );
}

function Frame69() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">Engagement Letter</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame68 />
      <Frame69 />
    </div>
  );
}

function Frame70() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button3 />
      <Button4 />
    </div>
  );
}

function Frame66() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame67 />
      <Frame70 />
      <Frame71 />
    </div>
  );
}

function FileText1() {
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

function Frame74() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText1 />
    </div>
  );
}

function Frame75() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">Service Agreement</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame74 />
      <Frame75 />
    </div>
  );
}

function Frame76() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button5 />
      <Button6 />
    </div>
  );
}

function Frame72() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame73 />
      <Frame76 />
      <Frame77 />
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

function Frame80() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText2 />
    </div>
  );
}

function Frame81() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">HR Consent Form</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame79() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame80 />
      <Frame81 />
    </div>
  );
}

function Frame82() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button7() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button8() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button7 />
      <Button8 />
    </div>
  );
}

function Frame78() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame79 />
      <Frame82 />
      <Frame83 />
    </div>
  );
}

function FileText3() {
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

function Frame86() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText3 />
    </div>
  );
}

function Frame87() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">Client Authorization</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame85() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame86 />
      <Frame87 />
    </div>
  );
}

function Frame88() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button9() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button10() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame89() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button9 />
      <Button10 />
    </div>
  );
}

function Frame84() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame85 />
      <Frame88 />
      <Frame89 />
    </div>
  );
}

function FileText4() {
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

function Frame92() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText4 />
    </div>
  );
}

function Frame93() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">Real Estate Reservation Form</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame91() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame92 />
      <Frame93 />
    </div>
  );
}

function Frame94() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button11() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button12() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame95() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button11 />
      <Button12 />
    </div>
  );
}

function Frame90() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame91 />
      <Frame94 />
      <Frame95 />
    </div>
  );
}

function FileText5() {
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

function Frame98() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <FileText5 />
    </div>
  );
}

function Frame99() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#0b2344] text-[18px]">Supplier Agreement</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px]">Last used 2 days ago</p>
    </div>
  );
}

function Frame97() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame98 />
      <Frame99 />
    </div>
  );
}

function Frame100() {
  return (
    <div className="bg-[#f0f7ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[10px] uppercase whitespace-nowrap">SHARED WITH TEAM</p>
    </div>
  );
}

function Button13() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Use Template</p>
        </div>
      </div>
    </div>
  );
}

function Button14() {
  return (
    <div className="bg-[#f8fafc] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="button">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Edit</p>
        </div>
      </div>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Button13 />
      <Button14 />
    </div>
  );
}

function Frame96() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_2px_5px_rgba(0,0,0,0.05)] flex flex-col gap-[20px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[410px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame97 />
      <Frame100 />
      <Frame101 />
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-start flex flex-wrap gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame66 />
      <Frame72 />
      <Frame78 />
      <Frame84 />
      <Frame90 />
      <Frame96 />
    </div>
  );
}

function Frame63() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[96px] relative size-full">
          <Frame64 />
          <Frame65 />
        </div>
      </div>
    </div>
  );
}

function Frame103() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-[800px]" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">ENTERPRISE</p>
      <p className="font-['Geist:Black',sans-serif] font-black leading-[1.1] min-w-full relative shrink-0 text-[56px] text-center text-white w-[min-content]">Ready for higher-volume organizations.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#94a3b8] text-[18px] text-center w-[min-content]">LAGDA is designed for businesses and institutions that need team controls, integrations, and scalable document workflows.</p>
    </div>
  );
}

function Frame106() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">LIVE</p>
    </div>
  );
}

function Frame105() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame106 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">API-Ready Architecture</p>
    </div>
  );
}

function Frame108() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">LIVE</p>
    </div>
  );
}

function Frame107() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame108 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Custom Branding</p>
    </div>
  );
}

function Frame110() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">LIVE</p>
    </div>
  );
}

function Frame109() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame110 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Workspace Reports</p>
    </div>
  );
}

function Frame112() {
  return (
    <div className="bg-[rgba(34,197,94,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">LIVE</p>
    </div>
  );
}

function Frame111() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame112 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Admin Controls</p>
    </div>
  );
}

function FeatureRow() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="feature-row-1">
      <Frame105 />
      <Frame107 />
      <Frame109 />
      <Frame111 />
    </div>
  );
}

function Frame114() {
  return (
    <div className="bg-[rgba(245,158,11,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(245,158,11,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#f59e0b] text-[11px] whitespace-nowrap">ROADMAP</p>
    </div>
  );
}

function Frame113() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame114 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Embedded Signing</p>
    </div>
  );
}

function Frame116() {
  return (
    <div className="bg-[rgba(245,158,11,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(245,158,11,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#f59e0b] text-[11px] whitespace-nowrap">ROADMAP</p>
    </div>
  );
}

function Frame115() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame116 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Bulk Workflows</p>
    </div>
  );
}

function Frame118() {
  return (
    <div className="bg-[rgba(0,120,212,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-nowrap">ENTERPRISE</p>
    </div>
  );
}

function Frame117() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame118 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">SSO Login</p>
    </div>
  );
}

function Frame120() {
  return (
    <div className="bg-[rgba(0,120,212,0.13)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.25)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-nowrap">ENTERPRISE</p>
    </div>
  );
}

function Frame119() {
  return (
    <div className="bg-[#0b1220] content-stretch drop-shadow-[0px_12px_14px_rgba(0,0,0,0.25)] flex flex-col gap-[16px] items-start p-[32px] relative rounded-[16px] shrink-0 w-[302px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.1)] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame120 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] min-w-full relative shrink-0 text-[20px] text-white w-[min-content]">Webhooks</p>
    </div>
  );
}

function FeatureRow1() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="feature-row-2">
      <Frame113 />
      <Frame115 />
      <Frame117 />
      <Frame119 />
    </div>
  );
}

function Frame104() {
  return (
    <div className="content-stretch flex flex-col flex-wrap gap-[24px_32px] items-start relative shrink-0 w-full" data-name="Frame">
      <FeatureRow />
      <FeatureRow1 />
    </div>
  );
}

function Button15() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex h-[64px] items-center justify-center px-[32px] py-[16px] relative rounded-[12px] shrink-0 w-[240px]" data-name="button">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Contact Sales</p>
    </div>
  );
}

function Frame102() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[96px] relative size-full">
          <Frame103 />
          <Frame104 />
          <Button15 />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-[#0078d4] relative shrink-0 w-full" data-name="header">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[20px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">Available Now - LAGDA eSignature</p>
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame122() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Upload PDF</p>
    </div>
  );
}

function Check1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check1 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Add recipients</p>
    </div>
  );
}

function Check2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame124() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check2 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Field placement</p>
    </div>
  );
}

function Check3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check3 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Email verification</p>
    </div>
  );
}

function Check4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check4 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">OTP option</p>
    </div>
  );
}

function Check5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check5 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Online signing</p>
    </div>
  );
}

function Check6() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame128() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check6 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Status tracking</p>
    </div>
  );
}

function Check7() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame129() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check7 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Audit trail</p>
    </div>
  );
}

function Check8() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame130() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check8 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Document verification</p>
    </div>
  );
}

function Check9() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame131() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check9 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Templates</p>
    </div>
  );
}

function Check10() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame132() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check10 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Team workspace</p>
    </div>
  );
}

function Check11() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame133() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Check11 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[15px] text-white">Billing plans</p>
    </div>
  );
}

function Checklist() {
  return (
    <div className="relative shrink-0 w-full" data-name="checklist">
      <div className="content-stretch flex flex-col gap-[14px] items-start p-[32px] relative size-full">
        <Frame122 />
        <Frame123 />
        <Frame124 />
        <Frame125 />
        <Frame126 />
        <Frame127 />
        <Frame128 />
        <Frame129 />
        <Frame130 />
        <Frame131 />
        <Frame132 />
        <Frame133 />
      </div>
    </div>
  );
}

function CardAvailable() {
  return (
    <div className="bg-[#0078d4] flex-[1_0_0] min-w-px relative rounded-[28px]" data-name="card-available">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Header />
        <Checklist />
      </div>
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[28px] shadow-[0px_10px_24px_-8px_rgba(0,0,0,0.08)]" />
    </div>
  );
}

function Header1() {
  return (
    <div className="bg-[#67023b] relative shrink-0 w-full" data-name="header">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[20px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">Coming Soon - LAGDA eNotary</p>
        </div>
      </div>
    </div>
  );
}

function Lock() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame134() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">Secure video appearance</p>
    </div>
  );
}

function Lock1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame135() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock1 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">Electronic Notarial Book</p>
    </div>
  );
}

function Lock2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame136() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock2 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">Evidence package</p>
    </div>
  );
}

function Lock3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame137() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock3 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">Digital seal/certificate</p>
    </div>
  );
}

function Lock4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame138() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock4 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">Regulatory reporting</p>
    </div>
  );
}

function Lock5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <Lock5 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[15px]">ENP workflow</p>
    </div>
  );
}

function LockList() {
  return (
    <div className="relative shrink-0 w-full" data-name="lock-list">
      <div className="content-stretch flex flex-col gap-[14px] items-start p-[32px] relative size-full">
        <Frame134 />
        <Frame135 />
        <Frame136 />
        <Frame137 />
        <Frame138 />
        <Frame139 />
      </div>
    </div>
  );
}

function CardComingSoon() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative rounded-[28px]" data-name="card-coming-soon">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Header1 />
        <LockList />
      </div>
      <div aria-hidden className="absolute border-2 border-[#67023b] border-dashed inset-0 pointer-events-none rounded-[28px] shadow-[0px_10px_24px_-10px_rgba(0,0,0,0.06)]" />
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <CardAvailable />
      <CardComingSoon />
    </div>
  );
}

function WhatCanYouUseTodayComparison() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="What can you use today? - Comparison">
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[40px] items-center px-[80px] py-[96px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[1.1] relative shrink-0 text-[#0b2344] text-[56px] whitespace-nowrap">What can you use today?</p>
          <Frame121 />
        </div>
      </div>
    </div>
  );
}

function Glow() {
  return <div className="-translate-x-1/2 absolute bg-[#0078d4] blur-[50px] left-1/2 opacity-10 rounded-[500px] size-[1000px] top-[-400px]" data-name="glow" />;
}

function Frame141() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center relative shrink-0 text-center w-[800px]" data-name="Frame">
      <p className="font-['Geist:Black',sans-serif] font-black leading-[1.1] relative shrink-0 text-[72px] text-white w-full">Start with LAGDA eSignature today.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#94a3b8] text-[20px] w-full">Create a free account, send your first document, and build a secure digital legal-document workflow for your team.</p>
    </div>
  );
}

function Button16() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex h-[56px] items-center justify-center px-[32px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function Button17() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[56px] items-center justify-center px-[32px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border-[1.5px] border-solid border-white inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function Frame142() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Button16 />
      <Button17 />
    </div>
  );
}

function Frame143() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-center leading-[normal] relative shrink-0 text-[#94a3b8] whitespace-nowrap" data-name="Frame">
      <p className="[text-underline-position:from-font] decoration-from-font decoration-solid relative shrink-0 text-[14px] underline">View Pricing</p>
      <p className="relative shrink-0 text-[13px]">LAGDA eNotary is coming soon and subject to Supreme Court accreditation.</p>
    </div>
  );
}

function Frame140() {
  return (
    <div className="relative shrink-0 w-full" style={{ backgroundImage: "linear-gradient(157.211deg, rgb(7, 17, 31) 25%, rgb(11, 35, 68) 75%)" }} data-name="Frame">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[40px] items-center px-[80px] py-[96px] relative size-full">
          <Glow />
          <Frame141 />
          <Frame142 />
          <Frame143 />
        </div>
      </div>
    </div>
  );
}

function Frame148() {
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

function Frame147() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <Frame148 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame146() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Frame147 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[14px] w-[min-content]">{`The Philippines' leading infrastructure for secure, compliant, and modern document execution.`}</p>
    </div>
  );
}

function Frame151() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#94a3b8]" data-name="Frame">
      <p className="relative shrink-0">eSignature</p>
      <p className="relative shrink-0">Features</p>
      <p className="relative shrink-0">Pricing</p>
      <p className="relative shrink-0">Document Verification</p>
      <p className="relative shrink-0">API</p>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Product</p>
      <Frame151 />
    </div>
  );
}

function Frame153() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#94a3b8]" data-name="Frame">
      <p className="relative shrink-0">LAGDA eNotary Coming Soon</p>
      <p className="relative shrink-0">Accreditation Roadmap</p>
      <p className="relative shrink-0">Join Waitlist</p>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">LAGDA</p>
      <Frame153 />
    </div>
  );
}

function Frame155() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#94a3b8]" data-name="Frame">
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

function Frame154() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Solutions</p>
      <Frame155 />
    </div>
  );
}

function Frame157() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#94a3b8]" data-name="Frame">
      <p className="relative shrink-0">Identity Verification</p>
      <p className="relative shrink-0">Audit Trail</p>
      <p className="relative shrink-0">Secure Storage</p>
      <p className="relative shrink-0">Permissions</p>
      <p className="relative shrink-0">Trust Center</p>
    </div>
  );
}

function Frame156() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Security</p>
      <Frame157 />
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#94a3b8]" data-name="Frame">
      <p className="relative shrink-0">Guides</p>
      <p className="relative shrink-0">FAQ</p>
      <p className="relative shrink-0">Legal Framework</p>
      <p className="relative shrink-0">Help Center</p>
      <p className="relative shrink-0">Contact</p>
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white">Resources</p>
      <Frame159 />
    </div>
  );
}

function Frame149() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[64px] items-start leading-[normal] relative shrink-0 text-[14px] whitespace-nowrap" data-name="Frame">
      <Frame150 />
      <Frame152 />
      <Frame154 />
      <Frame156 />
      <Frame158 />
    </div>
  );
}

function Frame145() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame146 />
      <Frame149 />
    </div>
  );
}

function Frame162() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular',sans-serif] font-normal gap-[24px] items-start leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap" data-name="Frame">
      <p className="relative shrink-0">Terms of Service</p>
      <p className="relative shrink-0">Privacy Policy</p>
      <p className="relative shrink-0">Data Processing</p>
      <p className="relative shrink-0">Security Policy</p>
    </div>
  );
}

function Frame163() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[6px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#fdb8d4] text-[11px] whitespace-nowrap">LAGDA eNotary status: Coming Soon — Subject to SC Accreditation</p>
    </div>
  );
}

function Frame161() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame162 />
      <Frame163 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#64748b] text-[14px] whitespace-nowrap">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
    </div>
  );
}

function Frame160() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1280 1">
            <line id="Line" stroke="var(--stroke-0, white)" strokeOpacity="0.101961" x2="1280" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame161 />
    </div>
  );
}

function Frame144() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[64px] items-start p-[80px] relative size-full">
        <Frame145 />
        <Frame160 />
      </div>
    </div>
  );
}

export default function DLagdaEsignatureOverview() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" style={{ backgroundImage: "linear-gradient(105.073deg, rgb(7, 17, 31) 25%, rgb(11, 35, 68) 75%)" }} data-name="d-lagda-esignature-overview">
      <Navbar />
      <Hero />
      <JumpNav />
      <Frame36 />
      <Frame63 />
      <Frame102 />
      <WhatCanYouUseTodayComparison />
      <Frame140 />
      <Frame144 />
    </div>
  );
}