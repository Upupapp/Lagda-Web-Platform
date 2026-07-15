import svgPaths from "./svg-ie01aekkua";
import imgTechTexture from "./a6d0549267a6195dcaf5187e9858c948a2f1a593.png";

function TechTexture() {
  return (
    <div className="absolute inset-0 opacity-8" data-name="tech-texture">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgTechTexture} />
    </div>
  );
}

function LabelTag() {
  return (
    <div className="bg-[rgba(56,189,248,0.1)] content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="label-tag">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">Parallel Signing</p>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-full" data-name="header">
      <LabelTag />
      <p className="[word-break:break-word] font-['Archivo:ExtraBold',sans-serif] font-extrabold leading-[1.15] max-w-[980px] min-w-full relative shrink-0 text-[44px] text-center text-white w-[min-content]" style={{ fontVariationSettings: '"wdth" 100' }}>
        Multiple signers can sign at the same time.
      </p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.6] max-w-[920px] min-w-full relative shrink-0 text-[18px] text-[rgba(255,255,255,0.7)] text-center w-[min-content]">Use parallel signing for faster multi-party documents. Use sequential routing when approval order matters.</p>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[rgba(245,158,11,0.1)] content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#f59e0b] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#f59e0b] text-[11px] uppercase whitespace-nowrap">BEST WHEN ORDER MATTERS</p>
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="panel-header">
      <p className="[word-break:break-word] font-['Archivo:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#e2e8f0] text-[18px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Sequential Routing
      </p>
      <Badge />
    </div>
  );
}

function Avatar() {
  return (
    <div className="bg-[#0f1b2d] content-stretch flex flex-col items-center justify-center relative rounded-[28px] shrink-0 size-[56px]" data-name="avatar">
      <div aria-hidden className="absolute border border-[#1e3a5f] border-solid inset-0 pointer-events-none rounded-[28px]" />
      <p className="[word-break:break-word] font-['Archivo:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#e2e8f0] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        1
      </p>
    </div>
  );
}

function Node() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="node-1">
      <Avatar />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e2e8f0] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Atty. Rafael
      </p>
    </div>
  );
}

function Line() {
  return <div className="bg-[#334155] h-[44px] relative rounded-[1px] shrink-0 w-[2px]" data-name="line" />;
}

function ArrowDown() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-down">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-down">
          <path d={svgPaths.p2793be80} id="Vector" stroke="var(--stroke-0, #334155)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Connector() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="connector">
      <Line />
      <ArrowDown />
    </div>
  );
}

function Avatar1() {
  return (
    <div className="bg-[#0f1b2d] content-stretch flex flex-col items-center justify-center relative rounded-[28px] shrink-0 size-[56px]" data-name="avatar">
      <div aria-hidden className="absolute border border-[#1e3a5f] border-solid inset-0 pointer-events-none rounded-[28px]" />
      <p className="[word-break:break-word] font-['Archivo:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#e2e8f0] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        2
      </p>
    </div>
  );
}

function Node1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="node-2">
      <Avatar1 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e2e8f0] text-[13px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Client Maria
      </p>
    </div>
  );
}

function Flow() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="flow">
      <Node />
      <Connector />
      <Node1 />
    </div>
  );
}

function ProgressLabels() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-normal items-center justify-between leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] w-full whitespace-nowrap" data-name="progress-labels">
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0">Step 1 of 2 complete</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] relative shrink-0">50%</p>
    </div>
  );
}

function BarFill() {
  return <div className="bg-[#38bdf8] h-full opacity-25 relative rounded-[999px] shrink-0 w-[220px]" data-name="bar-fill" />;
}

function Bar() {
  return (
    <div className="bg-[#0f1b2d] content-stretch flex h-[8px] items-start overflow-clip relative rounded-[999px] shrink-0 w-full" data-name="bar">
      <BarFill />
    </div>
  );
}

function Progress() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="progress">
      <ProgressLabels />
      <Bar />
    </div>
  );
}

function TimeIndicator() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="time-indicator">
      <Progress />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] w-full">Linear flow - each signer waits for the previous one.</p>
    </div>
  );
}

function PanelSequential() {
  return (
    <div className="bg-[#0b2344] flex-[1_0_0] min-w-px relative rounded-[20px]" data-name="panel-sequential">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[20px] items-start p-[28px] relative size-full">
          <PanelHeader />
          <Flow />
          <TimeIndicator />
        </div>
      </div>
      <div aria-hidden className="absolute border border-[#1e3a5f] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function VsDivider() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col h-[220px] items-center justify-center relative rounded-[16px] shrink-0 w-[120px]" data-name="vs-divider">
      <div aria-hidden className="absolute border border-[#1e3a5f] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <p className="[word-break:break-word] font-['Archivo:ExtraBold',sans-serif] font-extrabold leading-[normal] opacity-90 relative shrink-0 text-[28px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        VS
      </p>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[rgba(34,197,94,0.1)] content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#22c55e] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] uppercase whitespace-nowrap">FASTER. ALL AT ONCE.</p>
    </div>
  );
}

function PanelHeader1() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="panel-header">
      <p className="[word-break:break-word] font-['Archivo:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[18px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Parallel Signing
      </p>
      <Badge1 />
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="check">
          <path d={svgPaths.pa97d0a0} id="Vector" stroke="var(--stroke-0, #07111F)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Avatar2() {
  return (
    <div className="bg-[#22c55e] content-stretch flex flex-col items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="avatar">
      <Check />
    </div>
  );
}

function ResultNode() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="result-node">
      <Avatar2 />
      <p className="[word-break:break-word] font-['Archivo:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        RESULT: Complete
      </p>
    </div>
  );
}

function Avatar3() {
  return (
    <div className="bg-[#38bdf8] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="avatar">
      <p className="[word-break:break-word] font-['Archivo:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        1
      </p>
    </div>
  );
}

function Signer() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="signer-1">
      <Avatar3 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Signer 1
      </p>
    </div>
  );
}

function Avatar4() {
  return (
    <div className="bg-[#38bdf8] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="avatar">
      <p className="[word-break:break-word] font-['Archivo:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        2
      </p>
    </div>
  );
}

function Signer1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="signer-2">
      <Avatar4 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Signer 2
      </p>
    </div>
  );
}

function Avatar5() {
  return (
    <div className="bg-[#38bdf8] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="avatar">
      <p className="[word-break:break-word] font-['Archivo:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        3
      </p>
    </div>
  );
}

function Signer2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-center relative shrink-0" data-name="signer-3">
      <Avatar5 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Signer 3
      </p>
    </div>
  );
}

function Signers() {
  return (
    <div className="content-stretch flex gap-[24px] items-center relative shrink-0" data-name="signers">
      <Signer />
      <Signer1 />
      <Signer2 />
    </div>
  );
}

function Lines() {
  return (
    <div className="absolute h-[140px] left-0 right-0 top-0" data-name="lines">
      <div className="absolute h-[2px] left-[180px] top-[32px] w-[120px]" data-name="line-1">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g id="line-1" />
        </svg>
      </div>
      <div className="absolute h-[2px] left-[360px] top-[32px] w-[120px]" data-name="line-2">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g id="line-1" />
        </svg>
      </div>
      <div className="absolute h-[2px] left-[540px] top-[32px] w-[120px]" data-name="line-3">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
          <g id="line-1" />
        </svg>
      </div>
    </div>
  );
}

function Flow1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-full" data-name="flow">
      <ResultNode />
      <Signers />
      <Lines />
    </div>
  );
}

function ResultBadge() {
  return (
    <div className="bg-[rgba(34,197,94,0.1)] content-stretch flex items-start px-[10px] py-[6px] relative rounded-[999px] shrink-0" data-name="result-badge">
      <div aria-hidden className="absolute border border-[#22c55e] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] uppercase whitespace-nowrap">RESULT</p>
    </div>
  );
}

function SpeedRow() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="speed-row">
      <ResultBadge />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">3 signers · Simultaneous</p>
    </div>
  );
}

function SpeedIndicator() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full" data-name="speed-indicator">
      <SpeedRow />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[12px] w-full">All signers receive the document at the same time.</p>
    </div>
  );
}

function Zap() {
  return (
    <div className="absolute left-0 size-[120px] top-0" data-name="zap">
      <div className="absolute inset-[-4.18%_0]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 120.024 130.032">
          <g filter="url(#filter0_d_27_1443)" id="zap" opacity="0.35">
            <path d={svgPaths.p1f1c0600} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="148" id="filter0_d_27_1443" width="148" x="-13.988" y="-8.984">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset />
              <feGaussianBlur stdDeviation="7" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.219608 0 0 0 0 0.741176 0 0 0 0 0.972549 0 0 0 0.4 0" />
              <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow_27_1443" />
              <feBlend in="SourceGraphic" in2="effect1_dropShadow_27_1443" mode="normal" result="shape" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function SpeedStreak() {
  return (
    <div className="absolute right-[18px] size-[120px] top-[18px]" data-name="speed-streak">
      <Zap />
    </div>
  );
}

function PanelParallel() {
  return (
    <div className="bg-[#07111f] flex-[1_0_0] min-w-px relative rounded-[20px]" data-name="panel-parallel">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[20px] items-start p-[28px] relative size-full">
          <PanelHeader1 />
          <Flow1 />
          <SpeedIndicator />
          <SpeedStreak />
        </div>
      </div>
      <div aria-hidden className="absolute border-2 border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[20px] shadow-[0px_10px_24px_-10px_rgba(0,0,0,0.4),0px_18px_44px_-12px_rgba(56,189,248,0.2)]" />
    </div>
  );
}

function Comparison() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="comparison">
      <PanelSequential />
      <VsDivider />
      <PanelParallel />
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

function Chip() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Board Resolutions
      </p>
    </div>
  );
}

function FileText1() {
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

function Chip1() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText1 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Settlement Agreements
      </p>
    </div>
  );
}

function FileText2() {
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

function Chip2() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText2 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Waivers
      </p>
    </div>
  );
}

function FileText3() {
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

function Chip3() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText3 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Client Authorizations
      </p>
    </div>
  );
}

function FileText4() {
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

function Chip4() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText4 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Multi-party Service Agreements
      </p>
    </div>
  );
}

function FileText5() {
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

function Chip5() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText5 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Partner Approvals
      </p>
    </div>
  );
}

function FileText6() {
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

function Chip6() {
  return (
    <div className="bg-[#07111f] content-stretch flex gap-[8px] items-center px-[14px] py-[10px] relative rounded-[999px] shrink-0" data-name="chip">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <FileText6 />
      <p className="[word-break:break-word] font-['Archivo:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap" style={{ fontVariationSettings: '"wdth" 100' }}>
        Witness Acknowledgments
      </p>
    </div>
  );
}

function Chips() {
  return (
    <div className="content-center flex flex-wrap gap-[12px] items-center justify-center relative shrink-0 w-full" data-name="chips">
      <Chip />
      <Chip1 />
      <Chip2 />
      <Chip3 />
      <Chip4 />
      <Chip5 />
      <Chip6 />
    </div>
  );
}

export default function ParallelSigningTechyComparison() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[56px] items-start px-[80px] py-[96px] relative size-full" data-name="Parallel Signing - Techy Comparison">
      <TechTexture />
      <Header />
      <Comparison />
      <Chips />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[13px] text-[rgba(255,255,255,0.4)] text-center w-[min-content]">Parallel signing by default. Sequential routing when order matters.</p>
    </div>
  );
}