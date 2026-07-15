import svgPaths from "./svg-n3lan3m9y7";
import imgTextureOverlay from "./45c780c9dec747281a01cae91f04284b74c4e924.png";
import imgImage1 from "./ba899de6d42142de64475f5bf0a26e46c21ecd8e.png";

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
      <p className="font-['Geist_Mono:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#38bdf8] text-[9px]">BY UPUP TECHNOLOGIES</p>
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
      <p className="[word-break:break-word] font-['Geist:SemiBold','Noto_Sans_Symbols2:Regular',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Solutions ▾</p>
      <div className="bg-[#0078d4] h-[2px] relative shrink-0 w-[73px]" data-name="underline" />
    </div>
  );
}

function TabPricing() {
  return (
    <a className="content-stretch cursor-pointer flex flex-col items-center justify-center relative shrink-0" data-name="tab-Pricing">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] text-left whitespace-nowrap">Pricing</p>
    </a>
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

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex gap-[10px] h-[44px] items-center justify-center px-[24px] py-[12px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Started</p>
      <ArrowRight />
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-end relative shrink-0" data-name="nav-actions">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap">Sign In</p>
      <Button />
    </div>
  );
}

function Navbar() {
  return (
    <div className="bg-white h-[80px] relative shrink-0 w-full" data-name="navbar">
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

function Tag() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="tag">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Comparison</p>
    </div>
  );
}

function HeroCopy() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="hero-copy">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.1] relative shrink-0 text-[56px] text-white w-full">See how LAGDA compares.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#94a3b8] text-[18px] w-full">Compare LAGDA with traditional paper signing, generic PDF signing, global eSignature tools, and local eSignature platforms across the features that matter most for Philippine legal and business documents.</p>
    </div>
  );
}

function ArrowRight1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function CtaPrimary() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex gap-[10px] h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
      <ArrowRight1 />
    </div>
  );
}

function CtaSecondary() {
  return (
    <div className="content-stretch flex h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-secondary">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">View Pricing</p>
    </div>
  );
}

function HeroCtas() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0" data-name="hero-ctas">
      <CtaPrimary />
      <CtaSecondary />
      <p className="[text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[14px] underline whitespace-nowrap">Explore LAGDA eSignature</p>
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="shield-check">
          <path d={svgPaths.pabb3e00} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="badge-1">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <ShieldCheck1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Philippine Legal Workflows</p>
    </div>
  );
}

function QrCode() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="qr-code">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="qr-code">
          <path d={svgPaths.p26637680} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge2() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="badge-2">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <QrCode />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">QR Document Verification</p>
    </div>
  );
}

function Users() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="users">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="users">
          <path d={svgPaths.p15db900} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge3() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="badge-3">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Users />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Parallel Signing</p>
    </div>
  );
}

function FileText() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="file-text">
          <path d={svgPaths.p3cbc4600} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge4() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="badge-4">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Audit-Ready Records</p>
    </div>
  );
}

function Lock() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge5() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="badge-5">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Lock />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">LAGDA eNotary Roadmap</p>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0 w-full" data-name="trust-badges">
      <Badge1 />
      <Badge2 />
      <Badge3 />
      <Badge4 />
      <Badge5 />
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="hero">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-center px-[120px] py-[96px] relative size-full">
          <div className="absolute right-[-120px] size-[420px] top-[-120px]" data-name="Ellipse">
            <div className="absolute inset-[-23.81%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 620 620">
                <g filter="url(#filter0_f_15_1680)" id="Ellipse" opacity="0.9">
                  <circle cx="310" cy="310" fill="var(--fill-0, #38BDF8)" fillOpacity="0.14902" r="210" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="620" id="filter0_f_15_1680" width="620" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_15_1680" stdDeviation="50" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <div className="absolute bottom-[-140px] left-[-80px] size-[360px]" data-name="Ellipse">
            <div className="absolute inset-[-27.78%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 560 560">
                <g filter="url(#filter0_f_15_1639)" id="Ellipse" opacity="0.18">
                  <circle cx="280" cy="280" fill="var(--fill-0, #67023B)" r="180" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="560" id="filter0_f_15_1639" width="560" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_15_1639" stdDeviation="50" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <Tag />
          <HeroCopy />
          <HeroCtas />
          <TrustBadges />
        </div>
      </div>
    </div>
  );
}

function TextureOverlay() {
  return (
    <div className="absolute inset-0 opacity-6" data-name="texture-overlay">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgTextureOverlay} />
    </div>
  );
}

function StripHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="strip-header">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[24px] whitespace-nowrap">What makes LAGDA different</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#334155] text-[14px] w-[min-content]">A premium set of capabilities designed to support Philippine legal workflows, verification, and future electronic notarization.</p>
    </div>
  );
}

function Flag() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="flag">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="flag">
          <path d={svgPaths.p18708d00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[28px]" data-name="Frame">
      <Flag />
    </div>
  );
}

function Accent() {
  return (
    <div className="bg-[#eaf6ff] relative rounded-[12px] shrink-0 w-full" data-name="accent">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[10px] items-center px-[12px] py-[10px] relative size-full">
          <Frame />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Built for Philippine workflows</p>
        </div>
      </div>
    </div>
  );
}

function CardBuiltForPh() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card-built-for-ph">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Accent />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Designed around local legal, business, and institutional document execution.</p>
      </div>
    </div>
  );
}

function QrCode1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="qr-code">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="qr-code">
          <path d={svgPaths.p26637680} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[28px]" data-name="Frame">
      <QrCode1 />
    </div>
  );
}

function Accent1() {
  return (
    <div className="bg-[#eaf6ff] relative rounded-[12px] shrink-0 w-full" data-name="accent">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[10px] items-center px-[12px] py-[10px] relative size-full">
          <Frame1 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">QR-verifiable signed PDFs</p>
        </div>
      </div>
    </div>
  );
}

function CardQrVerification() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card-qr-verification">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Accent1 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Completed documents can include a QR code and verification URL.</p>
      </div>
    </div>
  );
}

function Users1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="users">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="users">
          <path d={svgPaths.p15db900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame2() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[28px]" data-name="Frame">
      <Users1 />
    </div>
  );
}

function Accent2() {
  return (
    <div className="bg-[#eaf6ff] relative rounded-[12px] shrink-0 w-full" data-name="accent">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[10px] items-center px-[12px] py-[10px] relative size-full">
          <Frame2 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Parallel signing by default</p>
        </div>
      </div>
    </div>
  );
}

function CardParallelSigning() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card-parallel-signing">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Accent2 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Multiple signers can complete the same document faster.</p>
      </div>
    </div>
  );
}

function Lock1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-[#67023b] content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[28px]" data-name="Frame">
      <Lock1 />
    </div>
  );
}

function Accent3() {
  return (
    <div className="bg-[#fce7f3] relative rounded-[12px] shrink-0 w-full" data-name="accent">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[10px] items-center px-[12px] py-[10px] relative size-full">
          <Frame3 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[14px] whitespace-nowrap">eNotary roadmap</p>
        </div>
      </div>
    </div>
  );
}

function CardEnotaryRoadmap() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="card-enotary-roadmap">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Accent3 />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] relative shrink-0 text-[#334155] text-[14px] w-full">Future electronic notarization layer, subject to Supreme Court accreditation.</p>
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="cards">
      <CardBuiltForPh />
      <CardQrVerification />
      <CardParallelSigning />
      <CardEnotaryRoadmap />
    </div>
  );
}

function AdvantageStrip() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="advantage-strip">
      <StripHeader />
      <Cards />
    </div>
  );
}

function TableHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="table-header">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[36px] whitespace-nowrap">One consolidated comparison</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#64748b] text-[14px] w-[min-content]">Compare capabilities across traditional paper, generic PDF signing, global tools, local platforms, and LAGDA.</p>
    </div>
  );
}

function HCapability() {
  return (
    <div className="bg-[#0b2344] content-stretch flex flex-col items-start p-[16px] relative shrink-0 w-[260px]" data-name="h-capability">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] uppercase whitespace-nowrap">Capability</p>
    </div>
  );
}

function HPaper() {
  return (
    <div className="bg-[#0b2344] content-stretch flex flex-col items-center p-[16px] relative shrink-0 w-[168px]" data-name="h-paper">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] uppercase whitespace-nowrap">Traditional Paper</p>
    </div>
  );
}

function HPdf() {
  return (
    <div className="bg-[#0b2344] content-stretch flex flex-col items-center p-[16px] relative shrink-0 w-[168px]" data-name="h-pdf">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] uppercase whitespace-nowrap">Generic PDF Signing</p>
    </div>
  );
}

function HGlobal() {
  return (
    <div className="[word-break:break-word] bg-[#0b2344] content-stretch flex flex-col gap-[6px] items-center leading-[normal] p-[16px] relative shrink-0 text-[#94a3b8] w-[168px]" data-name="h-global">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[12px] uppercase whitespace-nowrap">Global eSignature Tools</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal min-w-full relative shrink-0 text-[11px] text-center w-[min-content]">Strong global tools, may need local adaptation</p>
    </div>
  );
}

function HLocal() {
  return (
    <div className="[word-break:break-word] bg-[#0b2344] content-stretch flex flex-col gap-[6px] items-center leading-[normal] p-[16px] relative shrink-0 text-[#94a3b8] text-center w-[168px]" data-name="h-local">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[12px] uppercase w-full">Local eSignature Platforms</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[11px] w-full">Local options with varied feature depth</p>
    </div>
  );
}

function Award() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="award">
          <path d={svgPaths.p3c35c300} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-white content-stretch flex gap-[8px] items-center px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="badge">
      <Award />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">Best Fit for PH Workflows</p>
    </div>
  );
}

function HLagda() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col gap-[10px] items-center p-[16px] relative shrink-0 w-[268px]" data-name="h-lagda">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Badge />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[12px] text-white uppercase whitespace-nowrap">LAGDA</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[11px] text-[rgba(255,255,255,0.8)] text-center whitespace-nowrap">Philippine-first eSignature platform</p>
    </div>
  );
}

function TableHeaderRow() {
  return (
    <div className="bg-[#0b2344] content-stretch flex h-[120px] items-start relative shrink-0 w-full" data-name="table-header-row">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <HCapability />
      <HPaper />
      <HPdf />
      <HGlobal />
      <HLocal />
      <HLagda />
    </div>
  );
}

function Zap() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="zap">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_15_1603)" id="zap">
          <path d={svgPaths.p2345fd80} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1603">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-start relative rounded-[3px] shrink-0 size-[6px]" data-name="Frame">
      <Zap />
    </div>
  );
}

function DividerLocalFit() {
  return (
    <div className="bg-[#0b2344] h-[48px] relative shrink-0 w-full" data-name="divider-local-fit">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <Frame4 />
          <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[13px] text-white uppercase whitespace-nowrap">Local fit</p>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Philippine legal workflow focus</p>
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

function Frame6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes, manual</p>
    </div>
  );
}

function AlertTriangle() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function AlertTriangle1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
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

function Frame9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
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

function Frame10() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check2 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - Philippine-first</p>
    </div>
  );
}

function Row() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-1">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame5 />
      <Frame6 />
      <Frame7 />
      <Frame8 />
      <Frame9 />
      <Frame10 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Pricing in Philippine Pesos</p>
    </div>
  );
}

function Check3() {
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

function Frame12() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual cost</p>
    </div>
  );
}

function AlertTriangle2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle2 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Often USD</p>
    </div>
  );
}

function Check4() {
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

function Frame15() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check5() {
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

function Frame16() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check5 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - PHP plans</p>
    </div>
  );
}

function Row1() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-2">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame11 />
      <Frame12 />
      <Frame13 />
      <Frame14 />
      <Frame15 />
      <Frame16 />
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Local legal use cases</p>
    </div>
  );
}

function Check6() {
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

function Frame18() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check6 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes, manual</p>
    </div>
  );
}

function AlertTriangle4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function AlertTriangle5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle5 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function Check7() {
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

function Frame21() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check7 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check8() {
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

function Frame22() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check8 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - legal, business, LGU</p>
    </div>
  );
}

function Row2() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-3">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame17 />
      <Frame18 />
      <Frame19 />
      <Frame20 />
      <Frame21 />
      <Frame22 />
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Government/LGU audit-ready positioning</p>
    </div>
  );
}

function Check9() {
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

function Frame24() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check9 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function AlertTriangle6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle6 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function AlertTriangle7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle7 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle8 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check10() {
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

function Frame28() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check10 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - audit-ready</p>
    </div>
  );
}

function Row3() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-4">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame23 />
      <Frame24 />
      <Frame25 />
      <Frame26 />
      <Frame27 />
      <Frame28 />
    </div>
  );
}

function Edit() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="edit-3">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_15_1674)" id="edit-3">
          <path d={svgPaths.p1920900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1674">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame29() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-start relative rounded-[3px] shrink-0 size-[6px]" data-name="Frame">
      <Edit />
    </div>
  );
}

function DividerSigning() {
  return (
    <div className="bg-[#0b2344] h-[48px] relative shrink-0 w-full" data-name="divider-signing">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <Frame29 />
          <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[13px] text-white uppercase whitespace-nowrap">Signing workflow</p>
        </div>
      </div>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">eSignature available now</p>
    </div>
  );
}

function X() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Check11() {
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

function Frame32() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check11 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check12() {
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

function Frame33() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check12 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check13() {
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

function Frame34() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check13 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check14() {
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

function Frame35() {
  return (
    <div className="bg-[#eaf6ff] flex-[1_0_0] min-w-px relative" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative size-full">
          <Check14 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes</p>
        </div>
      </div>
    </div>
  );
}

function Row4() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-5">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame30 />
      <Frame31 />
      <Frame32 />
      <Frame33 />
      <Frame34 />
      <Frame35 />
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Verified signer workflow</p>
    </div>
  );
}

function AlertTriangle9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle9 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function AlertTriangle10() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle10 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check15() {
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

function Frame39() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check15 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check16() {
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

function Frame40() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check16 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check17() {
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

function Frame41() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check17 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - email, OTP, optional ID</p>
    </div>
  );
}

function Row5() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-6">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame36 />
      <Frame37 />
      <Frame38 />
      <Frame39 />
      <Frame40 />
      <Frame41 />
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Parallel signing by default</p>
    </div>
  );
}

function X1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function X2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X2 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function AlertTriangle11() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle11 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle12() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle12 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check18() {
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

function Frame47() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check18 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - included</p>
    </div>
  );
}

function Row6() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-7">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame42 />
      <Frame43 />
      <Frame44 />
      <Frame45 />
      <Frame46 />
      <Frame47 />
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Sequential signing when needed</p>
    </div>
  );
}

function Check19() {
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

function Frame49() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check19 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function AlertTriangle13() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle13 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check20() {
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

function Frame51() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check20 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check21() {
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

function Frame52() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check21 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check22() {
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

function Frame53() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check22 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - included</p>
    </div>
  );
}

function Row7() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-8">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame48 />
      <Frame49 />
      <Frame50 />
      <Frame51 />
      <Frame52 />
      <Frame53 />
    </div>
  );
}

function Search() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="search">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_15_1656)" id="search">
          <path d={svgPaths.pb810ec0} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1656">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame54() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-start relative rounded-[3px] shrink-0 size-[6px]" data-name="Frame">
      <Search />
    </div>
  );
}

function DividerVerification() {
  return (
    <div className="bg-[#0b2344] h-[48px] relative shrink-0 w-full" data-name="divider-verification">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <Frame54 />
          <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[13px] text-white uppercase whitespace-nowrap">Verification + audit</p>
        </div>
      </div>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Audit trail</p>
    </div>
  );
}

function Check23() {
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

function Frame56() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check23 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function AlertTriangle14() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle14 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check24() {
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

function Frame58() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check24 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check25() {
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

function Frame59() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check25 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check26() {
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

function Frame60() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check26 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - audit-ready</p>
    </div>
  );
}

function Row8() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-9">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame55 />
      <Frame56 />
      <Frame57 />
      <Frame58 />
      <Frame59 />
      <Frame60 />
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">QR verification on completed PDFs</p>
    </div>
  );
}

function X3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame62() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function X4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame63() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function AlertTriangle15() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame64() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle15 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle16() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame65() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle16 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check27() {
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

function Frame66() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check27 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - included</p>
    </div>
  );
}

function Row9() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-10">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame61 />
      <Frame62 />
      <Frame63 />
      <Frame64 />
      <Frame65 />
      <Frame66 />
    </div>
  );
}

function Frame67() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Public Document Verification page</p>
    </div>
  );
}

function X5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame68() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X5 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function X6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame69() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X6 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function AlertTriangle17() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame70() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle17 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle18() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame71() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle18 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check28() {
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

function Frame72() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check28 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - included</p>
    </div>
  );
}

function Row10() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-11">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame67 />
      <Frame68 />
      <Frame69 />
      <Frame70 />
      <Frame71 />
      <Frame72 />
    </div>
  );
}

function Frame73() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Audit trail with IP/device/approx. location</p>
    </div>
  );
}

function X7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame74() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X7 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function X8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame75() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X8 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function AlertTriangle19() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame76() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle19 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle20() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame77() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle20 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check29() {
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

function Frame78() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check29 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - with privacy controls</p>
    </div>
  );
}

function Row11() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-12">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame73 />
      <Frame74 />
      <Frame75 />
      <Frame76 />
      <Frame77 />
      <Frame78 />
    </div>
  );
}

function FileText1() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="file-text">
          <path d={svgPaths.p1b3c2900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame79() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-start relative rounded-[3px] shrink-0 size-[6px]" data-name="Frame">
      <FileText1 />
    </div>
  );
}

function DividerDocs() {
  return (
    <div className="bg-[#0b2344] h-[48px] relative shrink-0 w-full" data-name="divider-docs">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <Frame79 />
          <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[13px] text-white uppercase whitespace-nowrap">Document operations</p>
        </div>
      </div>
    </div>
  );
}

function Frame80() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Optional company branding</p>
    </div>
  );
}

function Check30() {
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

function Frame81() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check30 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function X9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x">
          <path d="M12 4L4 12M4 4L12 12" id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame82() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <X9 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function AlertTriangle21() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame83() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle21 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Paid tier</p>
    </div>
  );
}

function AlertTriangle22() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame84() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle22 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check31() {
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

function Frame85() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check31 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Plan-based (Professional and up)</p>
    </div>
  );
}

function Row12() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-13">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame80 />
      <Frame81 />
      <Frame82 />
      <Frame83 />
      <Frame84 />
      <Frame85 />
    </div>
  );
}

function Frame86() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Document templates by plan</p>
    </div>
  );
}

function Check32() {
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

function Frame87() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check32 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function Check33() {
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

function Frame88() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check33 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Basic</p>
    </div>
  );
}

function Check34() {
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

function Frame89() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check34 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Basic / paid</p>
    </div>
  );
}

function AlertTriangle23() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame90() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle23 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check35() {
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

function Frame91() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check35 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Basic to Full + Featured</p>
    </div>
  );
}

function Row13() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-14">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame86 />
      <Frame87 />
      <Frame88 />
      <Frame89 />
      <Frame90 />
      <Frame91 />
    </div>
  );
}

function Frame92() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Team workspaces</p>
    </div>
  );
}

function Check36() {
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

function Frame93() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check36 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Manual</p>
    </div>
  );
}

function AlertTriangle24() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame94() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle24 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check37() {
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

function Frame95() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check37 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check38() {
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

function Frame96() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check38 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Check39() {
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

function Frame97() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check39 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes</p>
    </div>
  );
}

function Row14() {
  return (
    <div className="bg-white content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-15">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame92 />
      <Frame93 />
      <Frame94 />
      <Frame95 />
      <Frame96 />
      <Frame97 />
    </div>
  );
}

function Frame98() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0f172a] text-[14px] w-full">Storage and plan-limit transparency</p>
    </div>
  );
}

function Check40() {
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

function Frame99() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Check40 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Physical</p>
    </div>
  );
}

function AlertTriangle25() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame100() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle25 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle26() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame101() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle26 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Depends</p>
    </div>
  );
}

function AlertTriangle27() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="alert-triangle">
          <path d={svgPaths.p3818dc00} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame102() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <AlertTriangle27 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Check41() {
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

function Frame103() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[268px]" data-name="Frame">
      <div aria-hidden className="absolute border-[#0078d4] border-l-2 border-solid inset-0 pointer-events-none" />
      <Check41 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Yes - clear by plan</p>
    </div>
  );
}

function Row15() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-16">
      <div aria-hidden className="absolute border-[#0b2344] border-b border-solid inset-0 pointer-events-none" />
      <Frame98 />
      <Frame99 />
      <Frame100 />
      <Frame101 />
      <Frame102 />
      <Frame103 />
    </div>
  );
}

function Lock2() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[14px] top-1/2" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_15_1630)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1630">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame104() {
  return (
    <div className="bg-[#67023b] content-stretch flex flex-col items-start relative rounded-[3px] shrink-0 size-[6px]" data-name="Frame">
      <Lock2 />
    </div>
  );
}

function DividerEnotary() {
  return (
    <div className="bg-[#fce7f3] h-[48px] relative shrink-0 w-full" data-name="divider-enotary">
      <div aria-hidden className="absolute border-[#b01262] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center px-[16px] py-[14px] relative size-full">
          <Frame104 />
          <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[13px] uppercase whitespace-nowrap">Future eNotary roadmap</p>
        </div>
      </div>
    </div>
  );
}

function Frame105() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-full">Future LAGDA eNotary roadmap</p>
    </div>
  );
}

function Lock3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame106() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame107() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame108() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock5 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame109() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock6 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">Limited</p>
    </div>
  );
}

function Lock7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame110() {
  return (
    <div className="bg-[#fce7f3] flex-[1_0_0] min-w-px relative" data-name="Frame">
      <div aria-hidden className="absolute border-[#b01262] border-l border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative size-full">
          <Lock7 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[13px] whitespace-nowrap">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

function Row16() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-17">
      <div aria-hidden className="absolute border-[#b01262] border-b border-solid inset-0 pointer-events-none" />
      <Frame105 />
      <Frame106 />
      <Frame107 />
      <Frame108 />
      <Frame109 />
      <Frame110 />
    </div>
  );
}

function Frame111() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-full">Future secure video appearance</p>
    </div>
  );
}

function Lock8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame112() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock8 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame113() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock9 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock10() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame114() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock10 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock11() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame115() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock11 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock12() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame116() {
  return (
    <div className="bg-[#fce7f3] flex-[1_0_0] min-w-px relative" data-name="Frame">
      <div aria-hidden className="absolute border-[#b01262] border-l border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative size-full">
          <Lock12 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[13px] whitespace-nowrap">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

function Row17() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-18">
      <div aria-hidden className="absolute border-[#b01262] border-b border-solid inset-0 pointer-events-none" />
      <Frame111 />
      <Frame112 />
      <Frame113 />
      <Frame114 />
      <Frame115 />
      <Frame116 />
    </div>
  );
}

function Frame117() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-full">Future Electronic Notarial Book</p>
    </div>
  );
}

function Lock13() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame118() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock13 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock14() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame119() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock14 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock15() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame120() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock15 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock16() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame121() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock16 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock17() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame122() {
  return (
    <div className="bg-[#fce7f3] flex-[1_0_0] min-w-px relative" data-name="Frame">
      <div aria-hidden className="absolute border-[#b01262] border-l border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative size-full">
          <Lock17 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[13px] whitespace-nowrap">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}

function Row18() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-19">
      <div aria-hidden className="absolute border-[#b01262] border-b border-solid inset-0 pointer-events-none" />
      <Frame117 />
      <Frame118 />
      <Frame119 />
      <Frame120 />
      <Frame121 />
      <Frame122 />
    </div>
  );
}

function Frame123() {
  return (
    <div className="content-stretch flex flex-col items-start px-[16px] py-[14px] relative shrink-0 w-[260px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] w-full">Future ENF accreditation pathway</p>
    </div>
  );
}

function Lock18() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame124() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock18 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock19() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame125() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock19 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock20() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame126() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock20 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock21() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame127() {
  return (
    <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative shrink-0 w-[168px]" data-name="Frame">
      <Lock21 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[13px] whitespace-nowrap">No</p>
    </div>
  );
}

function Lock22() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame128() {
  return (
    <div className="bg-[#fce7f3] flex-[1_0_0] min-w-px relative" data-name="Frame">
      <div aria-hidden className="absolute border-[#b01262] border-l border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[16px] py-[14px] relative size-full">
          <Lock22 />
          <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#67023b] text-[13px] whitespace-nowrap">Subject to Accreditation</p>
        </div>
      </div>
    </div>
  );
}

function Row19() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex h-[60px] items-start relative shrink-0 w-full" data-name="row-20">
      <div aria-hidden className="absolute border-0 border-[#b01262] border-solid inset-0 pointer-events-none" />
      <Frame123 />
      <Frame124 />
      <Frame125 />
      <Frame126 />
      <Frame127 />
      <Frame128 />
    </div>
  );
}

function TableWrapper() {
  return (
    <div className="bg-[#07111f] relative rounded-[20px] shrink-0 w-[1200px]" data-name="table-wrapper">
      <div className="content-stretch flex flex-col items-center overflow-clip relative rounded-[inherit] size-full">
        <TableHeaderRow />
        <DividerLocalFit />
        <Row />
        <Row1 />
        <Row2 />
        <Row3 />
        <DividerSigning />
        <Row4 />
        <Row5 />
        <Row6 />
        <Row7 />
        <DividerVerification />
        <Row8 />
        <Row9 />
        <Row10 />
        <Row11 />
        <DividerDocs />
        <Row12 />
        <Row13 />
        <Row14 />
        <Row15 />
        <DividerEnotary />
        <Row16 />
        <Row17 />
        <Row18 />
        <Row19 />
      </div>
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[20px] shadow-[0px_6px_16px_-8px_rgba(0,0,0,0.08),0px_18px_40px_-14px_rgba(0,0,0,0.15)]" />
    </div>
  );
}

function TableSection() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-full" data-name="table-section">
      <TableHeader />
      <TableWrapper />
    </div>
  );
}

function Check42() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="check">
          <path d={svgPaths.p3901e500} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame129() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Check42 />
    </div>
  );
}

function LegendCheck() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="legend-check">
      <Frame129 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[13px] whitespace-nowrap">Available or included</p>
    </div>
  );
}

function AlertTriangle28() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="alert-triangle">
          <path d={svgPaths.p174ecec0} id="Vector" stroke="var(--stroke-0, #F59E0B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame130() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#b01262] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <AlertTriangle28 />
    </div>
  );
}

function LegendAmber() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="legend-amber">
      <Frame130 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[13px] whitespace-nowrap">Limited, depends, or paid tier</p>
    </div>
  );
}

function X10() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="x">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="x">
          <path d={svgPaths.p2e4a7880} id="Vector" stroke="var(--stroke-0, #DC2626)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame131() {
  return (
    <div className="bg-[#f9fafb] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <X10 />
    </div>
  );
}

function LegendX() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="legend-x">
      <Frame131 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[13px] whitespace-nowrap">Not typically available</p>
    </div>
  );
}

function Lock23() {
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

function Frame132() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#b01262] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Lock23 />
    </div>
  );
}

function LegendLock() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="legend-lock">
      <Frame132 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[13px] whitespace-nowrap">Coming soon / subject to accreditation</p>
    </div>
  );
}

function LegendItems() {
  return (
    <div className="content-stretch flex gap-[16px] items-center justify-center relative shrink-0 w-full" data-name="legend-items">
      <LegendCheck />
      <LegendAmber />
      <LegendX />
      <LegendLock />
    </div>
  );
}

function Legend() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="legend">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap">Legend</p>
      <LegendItems />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full opacity-70 relative shrink-0 text-[#334155] text-[12px] w-[min-content]">Competitor availability can vary by plan, provider, region, and implementation. This comparison is intended to explain LAGDA positioning, not to make legal or certification claims.</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#334155] text-[12px] w-[min-content]">LAGDA is designed to support audit-ready electronic document workflows. Do not interpret this as COA approval, Supreme Court approval, or ENF accreditation.</p>
    </div>
  );
}

function WhyHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="why-header">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[28px] whitespace-nowrap">Why LAGDA stands out</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#334155] text-[14px] w-[min-content]">Built for real workflows, with verification, parallel signing, and audit-ready records-plus a future regulated layer.</p>
    </div>
  );
}

function QrCode2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="qr-code">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="qr-code">
          <path d={svgPaths.p17439270} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame133() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[36px]" data-name="Frame">
      <QrCode2 />
    </div>
  );
}

function WhyCard() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="why-card-1">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[20px] relative size-full">
        <Frame133 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[#07111f] text-[14px] w-[min-content]">QR verification is built into the signed document experience.</p>
      </div>
    </div>
  );
}

function Users2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="users">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="users">
          <path d={svgPaths.p4264400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame134() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[36px]" data-name="Frame">
      <Users2 />
    </div>
  );
}

function WhyCard1() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="why-card-2">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[20px] relative size-full">
        <Frame134 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[#07111f] text-[14px] w-[min-content]">Parallel signing helps teams finish multi-signer documents faster.</p>
      </div>
    </div>
  );
}

function FileText2() {
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

function Frame135() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[36px]" data-name="Frame">
      <FileText2 />
    </div>
  );
}

function WhyCard2() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="why-card-3">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[20px] relative size-full">
        <Frame135 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[#07111f] text-[14px] w-[min-content]">Audit records include signer activity, authentication, IP/device, and approximate location where available.</p>
      </div>
    </div>
  );
}

function LayoutTemplate() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="layout-template">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="layout-template">
          <g id="Vector">
            <path d={svgPaths.p2cd86400} stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p3f33cb80} stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p15dde980} stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Frame136() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[36px]" data-name="Frame">
      <LayoutTemplate />
    </div>
  );
}

function WhyCard3() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="why-card-4">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[20px] relative size-full">
        <Frame136 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[#07111f] text-[14px] w-[min-content]">Templates and company branding are built for real business workflows.</p>
      </div>
    </div>
  );
}

function Lock24() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="lock">
          <path d={svgPaths.p3faee280} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame137() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[36px]" data-name="Frame">
      <Lock24 />
    </div>
  );
}

function WhyCard4() {
  return (
    <div className="bg-white drop-shadow-[0px_10px_12px_rgba(0,0,0,0.04)] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="why-card-5">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="content-stretch flex flex-col gap-[10px] items-start p-[20px] relative size-full">
        <Frame137 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[#07111f] text-[14px] w-[min-content]">LAGDA eNotary is planned as a future regulated layer after accreditation.</p>
      </div>
    </div>
  );
}

function WhyCards() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="why-cards">
      <WhyCard />
      <WhyCard1 />
      <WhyCard2 />
      <WhyCard3 />
      <WhyCard4 />
    </div>
  );
}

function ArrowRight2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function CtaPrimary1() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex gap-[10px] h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
      <ArrowRight2 />
    </div>
  );
}

function CtaGhost() {
  return (
    <div className="content-stretch flex h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-ghost-1">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">View Pricing</p>
    </div>
  );
}

function CtaGhost1() {
  return (
    <div className="content-stretch flex h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-ghost-2">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function WhyCtas() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0" data-name="why-ctas">
      <CtaPrimary1 />
      <CtaGhost />
      <CtaGhost1 />
    </div>
  );
}

function WhyLagda() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0 w-full" data-name="why-lagda">
      <WhyHeader />
      <WhyCards />
      <WhyCtas />
    </div>
  );
}

function ArrowRight3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function CtaPrimary2() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex gap-[10px] h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
      <ArrowRight3 />
    </div>
  );
}

function CtaGhost2() {
  return (
    <div className="content-stretch flex h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-ghost-1">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function CtaGhost3() {
  return (
    <div className="content-stretch flex h-[56px] items-center px-[24px] py-[16px] relative rounded-[12px] shrink-0" data-name="cta-ghost-2">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">View Pricing</p>
    </div>
  );
}

function FinalCtas() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0" data-name="final-ctas">
      <CtaPrimary2 />
      <CtaGhost2 />
      <CtaGhost3 />
    </div>
  );
}

function FinalCtaContent() {
  return (
    <div className="relative shrink-0 w-full" data-name="final-cta-content">
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[48px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.2] min-w-full relative shrink-0 text-[32px] text-white w-[min-content]">Choose the platform built for Philippine legal-document workflows.</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[16px] w-[min-content]">Start with LAGDA eSignature today and prepare your organization for future electronic notarization after accreditation.</p>
        <FinalCtas />
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[12px] w-[min-content]">LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation.</p>
      </div>
    </div>
  );
}

function FinalCta() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-center overflow-clip pt-[64px] relative rounded-[24px] shrink-0 w-full" data-name="final-cta">
      <FinalCtaContent />
    </div>
  );
}

function ComparisonContent() {
  return (
    <div className="bg-[#f9fafb] content-stretch flex flex-col gap-[64px] items-center overflow-clip relative shrink-0 w-full" data-name="comparison-content">
      <TextureOverlay />
      <AdvantageStrip />
      <TableSection />
      <Legend />
      <WhyLagda />
      <FinalCta />
    </div>
  );
}

function Frame141() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="Frame">
      <div className="bg-white h-px opacity-30 relative shrink-0 w-[40px]" data-name="Rectangle" />
      <p className="[word-break:break-word] font-['Geist_Mono:Medium',sans-serif] font-medium leading-[normal] opacity-60 relative shrink-0 text-[14px] text-white uppercase whitespace-nowrap">LAGDA Product Vision</p>
    </div>
  );
}

function Frame140() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[32px] items-start min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[1.2] min-w-full relative shrink-0 text-[48px] text-white w-[min-content]">{`"LAGDA is not just a signature button. It is being designed as a Philippine legal-document operating system."`}</p>
      <Frame141 />
    </div>
  );
}

function Frame139() {
  return (
    <div className="content-stretch flex gap-[48px] items-center relative shrink-0 w-[1000px]" data-name="Frame">
      <div className="bg-[#0078d4] h-[180px] relative rounded-[4px] shrink-0 w-[8px]" data-name="Rectangle" />
      <Frame140 />
    </div>
  );
}

function Frame138() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="Frame">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center px-[120px] py-[140px] relative size-full">
          <div className="absolute left-0 size-[600px] top-[-200px]" data-name="Ellipse">
            <div className="absolute inset-[-16.67%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 800">
                <g filter="url(#filter0_f_15_1601)" id="Ellipse" opacity="0.1">
                  <circle cx="400" cy="400" fill="var(--fill-0, #38BDF8)" fillOpacity="0.15" r="300" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="800" id="filter0_f_15_1601" width="800" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_15_1601" stdDeviation="50" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <div className="absolute bottom-[-100px] h-[400px] right-0 w-[300px]" data-name="Ellipse">
            <div className="absolute inset-[-25%_-33.33%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 500 600">
                <g filter="url(#filter0_f_15_1590)" id="Ellipse" opacity="0.3">
                  <ellipse cx="250" cy="300" fill="var(--fill-0, #67023B)" rx="150" ry="200" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="600" id="filter0_f_15_1590" width="500" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                    <feGaussianBlur result="effect1_foregroundBlur_15_1590" stdDeviation="50" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <Frame139 />
        </div>
      </div>
    </div>
  );
}

function Smartphone() {
  return (
    <div className="relative shrink-0 size-[19.2px]" data-name="smartphone">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.2 19.2">
        <g id="smartphone">
          <path d={svgPaths.p3b98cb50} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame145() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[24px]" data-name="Frame">
      <Smartphone />
    </div>
  );
}

function Frame144() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[12px] shrink-0 size-[48px]" data-name="Frame">
      <Frame145 />
    </div>
  );
}

function Frame146() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Responsive Comparison</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal min-w-full relative shrink-0 text-[#334155] text-[14px] w-[min-content]">On mobile, the comparison becomes swipeable plan cards for easier browsing.</p>
    </div>
  );
}

function ChevronRight() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="chevron-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="chevron-right">
          <path d="M6 12L10 8L6 4" id="Vector" stroke="var(--stroke-0, #E5E7EB)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame147() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[20px]" data-name="Frame">
      <ChevronRight />
    </div>
  );
}

function Frame143() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex gap-[20px] items-center p-[24px] relative rounded-[16px] shrink-0 w-[520px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e8eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <Frame144 />
      <Frame146 />
      <Frame147 />
    </div>
  );
}

function Frame142() {
  return (
    <div className="bg-white content-stretch flex flex-col items-center py-[80px] relative shrink-0 w-full" data-name="Frame">
      <Frame143 />
    </div>
  );
}

function Frame149() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center leading-[normal] relative shrink-0 text-center" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[40px] whitespace-nowrap">Ready to modernize your legal workflows?</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[18px] w-[600px]">Start for free with eSignatures today. Your transition to full electronic notarization will be seamless when the SC accreditation goes live.</p>
    </div>
  );
}

function ArrowRight4() {
  return (
    <div className="relative shrink-0 size-[12.8px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.8 12.8">
        <g id="arrow-right">
          <path d={svgPaths.p3c05bce0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame152() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[16px]" data-name="Frame">
      <ArrowRight4 />
    </div>
  );
}

function Frame151() {
  return (
    <div className="bg-[#0078d4] content-stretch flex gap-[10px] h-[56px] items-center px-[32px] py-[16px] relative rounded-[10px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
      <Frame152 />
    </div>
  );
}

function Frame153() {
  return (
    <div className="content-stretch flex h-[56px] items-start px-[32px] py-[16px] relative rounded-[10px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[16px] whitespace-nowrap">Book a Product Demo</p>
    </div>
  );
}

function Frame150() {
  return (
    <div className="content-stretch flex gap-[16px] items-center justify-center relative shrink-0" data-name="Frame">
      <Frame151 />
      <Frame153 />
    </div>
  );
}

function CircleHelp() {
  return (
    <div className="relative shrink-0 size-[11.2px]" data-name="circle-help">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.2 11.2">
        <g clipPath="url(#clip0_15_1662)" id="circle-help">
          <path d={svgPaths.p13bc1d80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1662">
            <rect fill="white" height="11.2" width="11.2" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame155() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[14px]" data-name="Frame">
      <CircleHelp />
    </div>
  );
}

function Frame154() {
  return (
    <div className="content-stretch flex gap-[8px] items-center opacity-60 relative shrink-0" data-name="Frame">
      <Frame155 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[12px] whitespace-nowrap">LAGDA eSignature is available now. LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation.</p>
    </div>
  );
}

function Frame148() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex flex-col gap-[48px] items-center py-[120px] relative shrink-0 w-full" data-name="Frame">
      <Frame149 />
      <Frame150 />
      <Frame154 />
    </div>
  );
}

function Frame160() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center relative rounded-[4px] shrink-0 size-[24px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Black',sans-serif] font-black leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">U</p>
    </div>
  );
}

function Frame159() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <Frame160 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame158() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Frame159 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full relative shrink-0 text-[#94a3b8] text-[14px] w-[min-content]">LAGDA is the leading legal-tech provider in the Philippines, committed to digitalizing justice.</p>
    </div>
  );
}

function Frame162() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f]">Platform</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">eSignature</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">LAGDA (Soon)</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Templates</p>
    </div>
  );
}

function Frame163() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f]">Resources</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Compliance Guide</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Privacy Policy</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Term of Service</p>
    </div>
  );
}

function Frame164() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f]">Contact</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Help Center</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Book a Demo</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155]">Sales</p>
    </div>
  );
}

function Frame161() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[80px] items-start leading-[normal] relative shrink-0 text-[14px] whitespace-nowrap" data-name="Frame">
      <Frame162 />
      <Frame163 />
      <Frame164 />
    </div>
  );
}

function Frame157() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame158 />
      <Frame161 />
    </div>
  );
}

function Linkedin() {
  return (
    <div className="relative shrink-0 size-[14.4px]" data-name="linkedin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.4 14.4">
        <g clipPath="url(#clip0_15_1578)" id="linkedin">
          <g id="Vector">
            <path d={svgPaths.p21fb5a00} stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p1139ac00} stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p27af3580} stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_15_1578">
            <rect fill="white" height="14.4" width="14.4" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame167() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="Frame">
      <Linkedin />
    </div>
  );
}

function Facebook() {
  return (
    <div className="relative shrink-0 size-[14.4px]" data-name="facebook">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.4 14.4">
        <g clipPath="url(#clip0_15_1581)" id="facebook">
          <path d={svgPaths.p6da9d80} id="Vector" stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1581">
            <rect fill="white" height="14.4" width="14.4" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame168() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="Frame">
      <Facebook />
    </div>
  );
}

function Twitter() {
  return (
    <div className="relative shrink-0 size-[14.4px]" data-name="twitter">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.4 14.4">
        <g clipPath="url(#clip0_15_1650)" id="twitter">
          <path d={svgPaths.p2718bd00} id="Vector" stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_15_1650">
            <rect fill="white" height="14.4" width="14.4" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame169() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 size-[18px]" data-name="Frame">
      <Twitter />
    </div>
  );
}

function Frame166() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Frame">
      <Frame167 />
      <Frame168 />
      <Frame169 />
    </div>
  );
}

function Frame165() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-50 relative shrink-0 text-[#64748b] text-[12px] whitespace-nowrap">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
      <Frame166 />
    </div>
  );
}

function Frame156() {
  return (
    <div className="bg-[#07111f] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[64px] relative size-full">
          <Frame157 />
          <Frame165 />
        </div>
      </div>
    </div>
  );
}

export default function DLagdaPricingComparePlans() {
  return (
    <div className="bg-[#f9fafb] content-stretch flex flex-col gap-[64px] items-center pb-[96px] pt-[64px] px-[120px] relative size-full" data-name="d-lagda-pricing-compare-plans">
      <Navbar />
      <Hero />
      <ComparisonContent />
      <Frame138 />
      <Frame142 />
      <Frame148 />
      <Frame156 />
      <div className="h-[297.5px] relative shrink-0 w-[1162.5px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
      </div>
    </div>
  );
}