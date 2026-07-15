import svgPaths from "./svg-dher4ivoqh";
import imgFeaturedCard from "./2fac86074a3307fe137573059ead5415464b474b.png";

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
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold mb-[-2px] relative shrink-0 text-[#4d4d59] text-[20px]">LAGDA</p>
      <p className="font-['Geist_Mono:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#0078d4] text-[9px]">BY LAGDA</p>
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
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Pricing">
      <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Pricing</p>
    </div>
  );
}

function TabResources() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center justify-center relative shrink-0" data-name="tab-Resources">
      <p className="[word-break:break-word] font-['Geist:SemiBold','Noto_Sans:SemiBold','Noto_Sans_Math:Regular','Noto_Sans_Symbols:SemiBold','Noto_Sans_Symbols2:Regular',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Resources ▾</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[80px]" data-name="underline" />
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
    <div className="bg-white content-stretch flex h-[80px] items-center justify-between px-[80px] relative shrink-0 w-[1440px]" data-name="navbar">
      <Brand />
      <NavTabs />
      <NavActions />
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[11px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">{`RESOURCES & EDUCATION`}</p>
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#0b2344] content-stretch flex flex-col gap-[16px] items-center pb-[64px] pt-[80px] px-[80px] relative shrink-0 w-[1440px]" data-name="hero">
      <Badge />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[1.1] not-italic relative shrink-0 text-[40px] text-center text-white w-[800px]">Learn about eSignature and LAGDA</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic relative shrink-0 text-[#bfc7d1] text-[16px] text-center w-[600px]">Guides, resources, and updates for Philippine legal and business professionals navigating digital transformation.</p>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">FEATURED GUIDE</p>
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

function Button1() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_6px_8px_rgba(0,120,212,0.2)] flex gap-[10px] items-center justify-center px-[32px] py-[16px] relative rounded-[10px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Download Guide</p>
      <ArrowRight1 />
    </div>
  );
}

function Frame() {
  return (
    <div className="flex-[1_0_0] h-full min-w-px relative" data-name="Frame">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col gap-[24px] items-start justify-center p-[64px] relative size-full">
          <Badge1 />
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[1.2] not-italic relative shrink-0 text-[32px] text-white w-[600px]">Free Guide: Moving from Paper Signing to Secure eSignature</p>
          <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] not-italic opacity-90 relative shrink-0 text-[16px] text-white w-[580px]">Learn how Philippine businesses and law firms can adopt digital signing workflows that are secure, compliant, and ready for the future.</p>
          <Button1 />
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex h-[400px] items-start opacity-90 relative rounded-[24px] w-[300px]" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <div className="bg-[rgba(255,255,255,0.05)] flex-[1_0_0] h-full min-w-px opacity-10 relative rounded-[24px]" data-name="Rectangle">
        <div aria-hidden className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[24px]" />
      </div>
    </div>
  );
}

function FeaturedCard() {
  return (
    <div className="h-[400px] relative rounded-[24px] shrink-0 w-full" data-name="featured-card">
      <div aria-hidden className="absolute inset-0 pointer-events-none rounded-[24px]">
        <div className="absolute bg-[rgba(7,17,31,0.65)] inset-0 rounded-[24px]" />
        <img alt="" className="absolute max-w-none object-cover rounded-[24px] size-full" src={imgFeaturedCard} />
      </div>
      <div className="content-stretch flex items-start overflow-clip relative rounded-[inherit] size-full">
        <Frame />
        <div className="-translate-y-1/2 absolute flex h-[464.016px] items-center justify-center right-[-93.31px] top-[calc(50%-45.64px)] w-[393.305px]">
          <div className="-rotate-15 flex-none">
            <Frame1 />
          </div>
        </div>
      </div>
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-[-2px] pointer-events-none rounded-[26px] shadow-[0px_12px_32px_0px_rgba(0,0,0,0.15)]" />
    </div>
  );
}

function FeaturedSection() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start px-[80px] py-[48px] relative shrink-0 w-[1440px]" data-name="featured-section">
      <FeaturedCard />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#07111f] text-[40px] whitespace-nowrap">Explore All Resources</p>
      <div className="h-0 relative shrink-0 w-[60px]" data-name="Line">
        <div className="absolute inset-[-4px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 60 4">
            <line id="Line" stroke="var(--stroke-0, #0078D4)" strokeWidth="4" x2="60" y1="2" y2="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">What you will learn</p>
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 341 1">
            <line id="Line" opacity="0.3" stroke="var(--stroke-0, #0078D4)" x2="341" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_19_593)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_19_593">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Frame">
      <CheckCircle />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[14px] text-white">Legal validity under E-Commerce Act</p>
    </div>
  );
}

function CheckCircle1() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_19_593)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_19_593">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Frame">
      <CheckCircle1 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[14px] text-white">Differentiation from wet-ink signs</p>
    </div>
  );
}

function CheckCircle2() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_19_593)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_19_593">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Frame">
      <CheckCircle2 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[14px] text-white">Secure storage protocols</p>
    </div>
  );
}

function CheckCircle3() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_19_593)" id="check-circle">
          <path d={svgPaths.p124a78c0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_19_593">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-name="Frame">
      <CheckCircle3 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[14px] text-white">Audit trail requirements</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame7 />
      <Frame8 />
      <Frame9 />
      <Frame10 />
    </div>
  );
}

function Redo() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="redo-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="redo-2">
          <path d={svgPaths.p2ca25400} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex gap-[8px] items-center pt-[12px] relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[14px] whitespace-nowrap">Flip Back</p>
      <Redo />
    </div>
  );
}

function ResourceCardFlipped() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.15)] flex flex-col gap-[24px] h-[320px] items-start p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card-flipped">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame5 />
      <Frame6 />
      <Frame11 />
    </div>
  );
}

function Badge2() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">TECH GUIDE</p>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge2 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame13 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">Electronic signature vs digital signature</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">Understanding the technical and security differences between simple eSignatures and PKI-based digital signs.</p>
    </div>
  );
}

function ArrowRight2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight2 />
    </div>
  );
}

function ResourceCard() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame12 />
      <Frame14 />
    </div>
  );
}

function Badge3() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Frame">
      <div className="relative shrink-0 size-[6px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill="var(--fill-0, #67023B)" id="Ellipse" r="3" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[10px] whitespace-nowrap">COMING SOON</p>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge3 />
      <Frame17 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame16 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">What is electronic notarization</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">How remote online notarization (RON) works and its implications for modern legal practice.</p>
    </div>
  );
}

function ArrowRight3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight3 />
    </div>
  );
}

function ResourceCard1() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame15 />
      <Frame18 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <ResourceCardFlipped />
      <ResourceCard />
      <ResourceCard1 />
    </div>
  );
}

function Badge4() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">ANNOUNCEMENT</p>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Frame">
      <div className="relative shrink-0 size-[6px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill="var(--fill-0, #67023B)" id="Ellipse" r="3" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[10px] whitespace-nowrap">COMING SOON</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge4 />
      <Frame22 />
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame21 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">Why LAGDA is Coming Soon</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">The timeline and requirements for Supreme Court accreditation of LAGDA providers in the Philippines.</p>
    </div>
  );
}

function ArrowRight4() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight4 />
    </div>
  );
}

function ResourceCard2() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame20 />
      <Frame23 />
    </div>
  );
}

function Badge5() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">LAW FIRMS</p>
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge5 />
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame25 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">How law firms can prepare for digital legal workflows</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">A roadmap for modernizing your practice before electronic notarization becomes standard.</p>
    </div>
  );
}

function ArrowRight5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight5 />
    </div>
  );
}

function ResourceCard3() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame24 />
      <Frame26 />
    </div>
  );
}

function Badge6() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">BUSINESS</p>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge6 />
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame28 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">How businesses can use eSignatures today</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">{`Practical applications for HR, sales, and procurement teams using LAGDA's live eSignature platform.`}</p>
    </div>
  );
}

function ArrowRight6() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight6 />
    </div>
  );
}

function ResourceCard4() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame27 />
      <Frame29 />
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <ResourceCard2 />
      <ResourceCard3 />
      <ResourceCard4 />
    </div>
  );
}

function Badge7() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">PREPARATION</p>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0" data-name="Frame">
      <div className="relative shrink-0 size-[6px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
          <circle cx="3" cy="3" fill="var(--fill-0, #67023B)" id="Ellipse" r="3" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[10px] whitespace-nowrap">COMING SOON</p>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge7 />
      <Frame33 />
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame32 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">What to prepare before future electronic notarization</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">Checklist of digital IDs and document standards required for upcoming LAGDA services.</p>
    </div>
  );
}

function ArrowRight7() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#67023b] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight7 />
    </div>
  );
}

function ResourceCard5() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame31 />
      <Frame34 />
    </div>
  );
}

function Badge8() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[4px] shrink-0" data-name="badge">
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] uppercase whitespace-nowrap">SECURITY</p>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Badge8 />
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame36 />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.3] not-italic relative shrink-0 text-[#07111f] text-[20px] w-full">Security checklist for online document signing</p>
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.5] not-italic overflow-hidden relative shrink-0 text-[#334155] text-[16px] text-ellipsis w-full">Best practices for ensuring your digital signatures are tamper-proof and legally defensible.</p>
    </div>
  );
}

function ArrowRight8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="arrow-right">
          <path d={svgPaths.p3bfa7a00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Read More</p>
      <ArrowRight8 />
    </div>
  );
}

function ResourceCard6() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_4px_8px_rgba(0,0,0,0.08)] flex flex-col h-[320px] items-start justify-between p-[32px] relative rounded-[20px] shrink-0 w-[405px]" data-name="resource-card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <Frame35 />
      <Frame37 />
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <ResourceCard5 />
      <ResourceCard6 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame4 />
      <Frame19 />
      <Frame30 />
    </div>
  );
}

function GridSection() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[64px] items-start p-[80px] relative shrink-0 w-[1440px]" data-name="grid-section">
      <Frame2 />
      <Frame3 />
    </div>
  );
}

function Frame38() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center leading-[normal] not-italic relative shrink-0 text-center text-white" data-name="Frame">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[36px] whitespace-nowrap">Get eSignature and LAGDA updates</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal opacity-70 relative shrink-0 text-[16px] w-[500px]">Join 5,000+ professionals receiving the latest on Philippine legal-tech and accreditation news.</p>
    </div>
  );
}

function Frame42() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] drop-shadow-[0px_0px_0px_rgba(0,120,212,0.2)] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="content-stretch flex items-start p-[12px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-50 relative shrink-0 text-[14px] text-white whitespace-nowrap">Enter your email</p>
      </div>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[8px] items-start min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Email Address</p>
      <Frame42 />
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Frame">
      <Frame41 />
    </div>
  );
}

function ChevronDown() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="chevron-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="chevron-down">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame44() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] drop-shadow-[0px_0px_0px_rgba(0,120,212,0.2)] h-[48px] relative rounded-[8px] shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between p-[12px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Individual Lawyer</p>
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Organization Type</p>
      <Frame44 />
    </div>
  );
}

function ArrowRight9() {
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

function Button2() {
  return (
    <div className="bg-[#0078d4] drop-shadow-[0px_6px_8px_rgba(0,120,212,0.2)] relative rounded-[10px] shrink-0 w-full" data-name="button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[10px] items-center justify-center px-[32px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Subscribe Now</p>
          <ArrowRight9 />
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[12px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="check">
          <path d={svgPaths.p2a580400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame46() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center justify-center relative rounded-[10px] shrink-0 size-[20px]" data-name="Frame">
      <Check />
    </div>
  );
}

function SuccessToast() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_8px_12px_rgba(0,0,0,0.25)] flex gap-[10px] items-center px-[16px] py-[12px] relative rounded-[8px] shrink-0" data-name="success-toast">
      <Frame46 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0b2344] text-[14px] whitespace-nowrap">Subscribed successfully!</p>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-full" data-name="Frame">
      <Button2 />
      <SuccessToast />
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[500px]" data-name="Frame">
      <Frame40 />
      <Frame43 />
      <Frame45 />
    </div>
  );
}

function Newsletter() {
  return (
    <div className="bg-[#0b2344] content-stretch flex flex-col gap-[48px] items-center px-[80px] py-[100px] relative shrink-0 w-[1440px]" data-name="newsletter">
      <Frame38 />
      <Frame39 />
    </div>
  );
}

function Frame47() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start leading-[normal] not-italic relative shrink-0 text-white w-[600px]" data-name="Frame">
      <p className="font-['Inter:Bold',sans-serif] font-bold relative shrink-0 text-[36px] whitespace-nowrap">Learn by doing</p>
      <p className="font-['Inter:Regular',sans-serif] font-normal min-w-full opacity-90 relative shrink-0 text-[16px] w-[min-content]">Experience the security and ease of digital signing today. eSignature is available for all Philippine professionals.</p>
    </div>
  );
}

function ArrowRight10() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="arrow-right">
          <path d={svgPaths.p332df900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame48() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_8px_12px_rgba(0,0,0,0.12)] flex gap-[24px] items-center p-[40px] relative rounded-[16px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#0078d4] text-[24px] whitespace-nowrap">Create Free LAGDA Account</p>
      <ArrowRight10 />
    </div>
  );
}

function CtaBanner() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-between p-[80px] relative shrink-0 w-[1440px]" data-name="cta-banner">
      <Frame47 />
      <Frame48 />
    </div>
  );
}

function ShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="shield-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="shield-check">
          <path d={svgPaths.p95db000} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame52() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center relative rounded-[6px] shrink-0 size-[32px]" data-name="Frame">
      <ShieldCheck1 />
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Frame">
      <Frame52 />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[320px]" data-name="Frame">
      <Frame51 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full opacity-60 relative shrink-0 text-[#bfc7d1] text-[14px] w-[min-content]">Philippine legal-tech solution for secure eSignatures and accredited electronic notarization.</p>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#bfc7d1] text-[14px]" data-name="Frame">
      <p className="opacity-80 relative shrink-0">eSignature</p>
      <p className="opacity-80 relative shrink-0">LAGDA</p>
      <p className="opacity-80 relative shrink-0">Security</p>
      <p className="opacity-80 relative shrink-0">Pricing</p>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">Product</p>
      <Frame55 />
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#bfc7d1] text-[14px]" data-name="Frame">
      <p className="opacity-80 relative shrink-0">Legal Guides</p>
      <p className="opacity-80 relative shrink-0">Case Studies</p>
      <p className="opacity-80 relative shrink-0">API Docs</p>
      <p className="opacity-80 relative shrink-0">Accreditation</p>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">Resources</p>
      <Frame57 />
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[12px] items-start relative shrink-0 text-[#bfc7d1] text-[14px]" data-name="Frame">
      <p className="opacity-80 relative shrink-0">About LAGDA</p>
      <p className="opacity-80 relative shrink-0">Careers</p>
      <p className="opacity-80 relative shrink-0">Contact</p>
      <p className="opacity-80 relative shrink-0">Privacy Policy</p>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px]">Company</p>
      <Frame59 />
    </div>
  );
}

function Frame53() {
  return (
    <div className="[word-break:break-word] content-stretch flex gap-[80px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <Frame54 />
      <Frame56 />
      <Frame58 />
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame50 />
      <Frame53 />
    </div>
  );
}

function Facebook() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="facebook">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="facebook">
          <path d={svgPaths.p304d6600} fill="var(--fill-0, #BFC7D1)" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Linkedin() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="linkedin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="linkedin">
          <g id="Vector">
            <path d={svgPaths.p19a5ee80} fill="var(--fill-0, #BFC7D1)" />
            <path d={svgPaths.p104b6a40} fill="var(--fill-0, #BFC7D1)" />
            <path d={svgPaths.p376a7880} fill="var(--fill-0, #BFC7D1)" />
            <path d={svgPaths.p19a5ee80} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p104b6a40} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
            <path d={svgPaths.p376a7880} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Twitter() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="twitter">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g clipPath="url(#clip0_19_558)" id="twitter">
          <path d={svgPaths.p1f55bdf0} fill="var(--fill-0, #BFC7D1)" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_19_558">
            <rect fill="white" height="18" width="18" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Frame62() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Frame">
      <Facebook />
      <Linkedin />
      <Twitter />
    </div>
  );
}

function Frame61() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-50 relative shrink-0 text-[#bfc7d1] text-[12px] whitespace-nowrap">© 2026 LAGDA by UpUp Technologies. All rights reserved. LAGDA services are pending Supreme Court accreditation.</p>
      <Frame62 />
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="Frame">
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1280 1">
            <line id="Line" opacity="0.1" stroke="var(--stroke-0, #33404D)" x2="1280" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame61 />
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[64px] items-start pb-[40px] pt-[80px] px-[80px] relative shrink-0 w-[1440px]" data-name="footer">
      <Frame49 />
      <Frame60 />
    </div>
  );
}

export default function DLagdaResourcesGuides() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full" data-name="d-lagda-resources-guides">
      <Navbar />
      <Hero />
      <FeaturedSection />
      <GridSection />
      <Newsletter />
      <CtaBanner />
      <Footer />
    </div>
  );
}