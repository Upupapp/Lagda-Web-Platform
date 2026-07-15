import svgPaths from "./svg-0fr68gxdxy";

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Sign In</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[32px] items-center relative shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Pricing</p>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Enterprise</p>
      <Button />
    </div>
  );
}

function Nav() {
  return (
    <div className="bg-[#07111f] h-[72px] relative shrink-0 w-full" data-name="nav">
      <div aria-hidden className="absolute border-[#07111f] border-b border-solid inset-0 pointer-events-none" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex items-center justify-between px-[80px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[22px] text-white whitespace-nowrap">LAGDA</p>
          <Frame />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-gradient-to-r from-[#0b2344] relative shrink-0 to-[#0f2a5a] w-full" data-name="hero">
      <div className="flex flex-col items-center size-full">
        <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center not-italic pb-[96px] pt-[120px] px-[80px] relative size-full text-center">
          <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] max-w-[960px] relative shrink-0 text-[64px] text-white w-full">LAGDA FAQ</p>
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.6] max-w-[720px] relative shrink-0 text-[#cbd5e1] text-[18px] w-full">Everything you need to know about LAGDA eSignature and our upcoming LAGDA service.</p>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#0078d4] text-[32px] whitespace-nowrap">eSignature</p>
      <div className="bg-[#0078d4] h-[3px] relative rounded-[2px] shrink-0 w-[40px]" data-name="Rectangle" />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is eSignature legally binding?</p>
    </div>
  );
}

function Minus() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="minus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="minus">
          <path d="M4.166 10H15.834" id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame4 />
      <Minus />
    </div>
  );
}

function FaqItem() {
  return (
    <div className="bg-[#e6f2ff] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Frame3 />
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] not-italic relative shrink-0 text-[#334155] text-[14px] w-full">Yes. eSignatures created through LAGDA are legally recognized under the Electronic Commerce Act (RA 8792) and the Supreme Court Rules on Electronic Evidence. Each signature is backed by a tamper-evident audit trail.</p>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What is a signing request?</p>
    </div>
  );
}

function Plus() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame6 />
      <Plus />
    </div>
  );
}

function FaqItem1() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame5 />
      </div>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is QR Document Verification included in all plans?</p>
    </div>
  );
}

function Plus1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame8 />
      <Plus1 />
    </div>
  );
}

function FaqItem2() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame7 />
      </div>
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is parallel signing available on all plans?</p>
    </div>
  );
}

function Plus2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame10 />
      <Plus2 />
    </div>
  );
}

function FaqItem3() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame9 />
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Can my company add headers and footers to signed documents?</p>
    </div>
  );
}

function Plus3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame12 />
      <Plus3 />
    </div>
  );
}

function FaqItem4() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame11 />
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <FaqItem />
      <FaqItem1 />
      <FaqItem2 />
      <FaqItem3 />
      <FaqItem4 />
    </div>
  );
}

function LeftCol() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px relative" data-name="left-col">
      <Frame1 />
      <Frame2 />
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fce7f3] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Frame">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#0f172a] text-[32px] whitespace-nowrap">LAGDA</p>
      <Badge />
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame14 />
      <div className="bg-[#67023b] h-[3px] relative rounded-[2px] shrink-0 w-[40px]" data-name="Rectangle" />
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fce7f3] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What is LAGDA eNotary?</p>
      <Badge1 />
    </div>
  );
}

function Minus1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="minus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="minus">
          <path d="M4.166 10H15.834" id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame17 />
      <Minus1 />
    </div>
  );
}

function FaqItem5() {
  return (
    <div className="bg-[#f9f1f1] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#67023b] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col gap-[12px] items-start p-[20px] relative size-full">
        <Frame16 />
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[1.6] not-italic relative shrink-0 text-[#334155] text-[14px] w-full">LAGDA eNotary is a future product layer that will allow a Notary Public to notarize documents electronically through a secure, compliant digital process. It is separate from LAGDA eSignature and is not included in current plans.</p>
      </div>
    </div>
  );
}

function Badge2() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fce7f3] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">When will LAGDA eNotary be available?</p>
      <Badge2 />
    </div>
  );
}

function Plus4() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame19 />
      <Plus4 />
    </div>
  );
}

function FaqItem6() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame18 />
      </div>
    </div>
  );
}

function Badge3() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fce7f3] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What is Supreme Court accreditation?</p>
      <Badge3 />
    </div>
  );
}

function Plus5() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame21 />
      <Plus5 />
    </div>
  );
}

function FaqItem7() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame20 />
      </div>
    </div>
  );
}

function Badge4() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fce7f3] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#67023b] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is LAGDA eNotary included in current eSignature plans?</p>
      <Badge4 />
    </div>
  );
}

function Plus6() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame23 />
      <Plus6 />
    </div>
  );
}

function FaqItem8() {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame22 />
      </div>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Frame">
      <FaqItem5 />
      <FaqItem6 />
      <FaqItem7 />
      <FaqItem8 />
    </div>
  );
}

function RightCol() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[16px] items-start min-w-px relative" data-name="right-col">
      <Frame13 />
      <Frame15 />
    </div>
  );
}

function FaqRow() {
  return (
    <div className="content-stretch flex gap-[32px] items-start relative shrink-0 w-full" data-name="faq-row-1">
      <LeftCol />
      <RightCol />
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="section-header">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[1.2] min-w-full not-italic relative shrink-0 text-[#0078d4] text-[32px] w-[min-content]">QR Verification, Signing Requests, Templates, and Storage</p>
      <div className="bg-[#0078d4] h-[3px] relative rounded-[2px] shrink-0 w-[40px]" data-name="Rectangle" />
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What is a signing request?</p>
    </div>
  );
}

function Plus7() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame24() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame25 />
      <Plus7 />
    </div>
  );
}

function FaqItem9() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame24 />
      </div>
    </div>
  );
}

function Frame27() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Does one document with multiple signers count as one request?</p>
    </div>
  );
}

function Plus8() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame26() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame27 />
      <Plus8 />
    </div>
  );
}

function FaqItem10() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame26 />
      </div>
    </div>
  );
}

function Frame29() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Are reminders counted as separate requests?</p>
    </div>
  );
}

function Plus9() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame28() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame29 />
      <Plus9 />
    </div>
  );
}

function FaqItem11() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame28 />
      </div>
    </div>
  );
}

function Frame31() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Does every completed signed PDF include QR verification?</p>
    </div>
  );
}

function Plus10() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame31 />
      <Plus10 />
    </div>
  );
}

function FaqItem12() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame30 />
      </div>
    </div>
  );
}

function Frame33() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What happens when someone scans the QR code?</p>
    </div>
  );
}

function Plus11() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame32() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame33 />
      <Plus11 />
    </div>
  );
}

function FaqItem13() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame32 />
      </div>
    </div>
  );
}

function Frame35() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What information is visible on the public verification page?</p>
    </div>
  );
}

function Plus12() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame34() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame35 />
      <Plus12 />
    </div>
  );
}

function FaqItem14() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame34 />
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Can signer details be hidden or masked?</p>
    </div>
  );
}

function Plus13() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame36() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame37 />
      <Plus13 />
    </div>
  );
}

function FaqItem15() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame36 />
      </div>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Can my company add standard headers and footers?</p>
    </div>
  );
}

function Plus14() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame39 />
      <Plus14 />
    </div>
  );
}

function FaqItem16() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame38 />
      </div>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Can branding be switched off per document?</p>
    </div>
  );
}

function Plus15() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame41 />
      <Plus15 />
    </div>
  );
}

function FaqItem17() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame40 />
      </div>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What if my document already has a header or footer?</p>
    </div>
  );
}

function Plus16() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame43 />
      <Plus16 />
    </div>
  );
}

function FaqItem18() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame42 />
      </div>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What is the difference between Basic, Advanced, and Featured Templates?</p>
    </div>
  );
}

function Plus17() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame45 />
      <Plus17 />
    </div>
  );
}

function FaqItem19() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame44 />
      </div>
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What storage is included in each plan?</p>
    </div>
  );
}

function Plus18() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame47 />
      <Plus18 />
    </div>
  );
}

function FaqItem20() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame46 />
      </div>
    </div>
  );
}

function Frame49() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">What happens if I reach my storage limit?</p>
    </div>
  );
}

function Plus19() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame48() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame49 />
      <Plus19 />
    </div>
  );
}

function FaqItem21() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame48 />
      </div>
    </div>
  );
}

function Frame51() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Does LAGDA capture GPS location?</p>
    </div>
  );
}

function Plus20() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame50() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame51 />
      <Plus20 />
    </div>
  );
}

function FaqItem22() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame50 />
      </div>
    </div>
  );
}

function Frame53() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is approximate location based on IP address?</p>
    </div>
  );
}

function Plus21() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame52() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame53 />
      <Plus21 />
    </div>
  );
}

function FaqItem23() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame52 />
      </div>
    </div>
  );
}

function Frame55() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is parallel signing included?</p>
    </div>
  );
}

function Plus22() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame54() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame55 />
      <Plus22 />
    </div>
  );
}

function FaqItem24() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame54 />
      </div>
    </div>
  );
}

function Frame57() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Can I still require sequential signing?</p>
    </div>
  );
}

function Plus23() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame56() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame57 />
      <Plus23 />
    </div>
  );
}

function FaqItem25() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame56 />
      </div>
    </div>
  );
}

function Badge5() {
  return (
    <div className="bg-[#f9f1f1] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[6px] shrink-0" data-name="badge">
      <div aria-hidden className="absolute border border-[#fecaca] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#800020] text-[11px] uppercase whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function Frame59() {
  return (
    <div className="content-stretch flex flex-[1_0_0] gap-[8px] items-center min-w-px relative" data-name="Frame">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] min-w-px not-italic relative text-[#0f172a] text-[16px]">Is LAGDA eNotary included in my plan?</p>
      <Badge5 />
    </div>
  );
}

function Plus24() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="plus">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="plus">
          <path d={svgPaths.p3e11a380} id="Vector" stroke="var(--stroke-0, #94A3B8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame58() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame59 />
      <Plus24 />
    </div>
  );
}

function FaqItem26() {
  return (
    <div className="bg-white drop-shadow-[0px_2px_5px_rgba(15,23,42,0.04)] relative rounded-[12px] shrink-0 w-full" data-name="faq-item">
      <div aria-hidden className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="content-stretch flex flex-col items-start p-[20px] relative size-full">
        <Frame58 />
      </div>
    </div>
  );
}

function FaqList() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="faq-list">
      <FaqItem9 />
      <FaqItem10 />
      <FaqItem11 />
      <FaqItem12 />
      <FaqItem13 />
      <FaqItem14 />
      <FaqItem15 />
      <FaqItem16 />
      <FaqItem17 />
      <FaqItem18 />
      <FaqItem19 />
      <FaqItem20 />
      <FaqItem21 />
      <FaqItem22 />
      <FaqItem23 />
      <FaqItem24 />
      <FaqItem25 />
      <FaqItem26 />
    </div>
  );
}

function LeftCol1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[24px] items-start min-w-px relative" data-name="left-col">
      <SectionHeader />
      <FaqList />
    </div>
  );
}

function FaqRow1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="faq-row-2">
      <LeftCol1 />
    </div>
  );
}

function FaqContent() {
  return (
    <div className="relative shrink-0 w-full" data-name="faq-content">
      <div className="content-stretch flex flex-col gap-[40px] items-start pb-[120px] px-[80px] relative size-full">
        <FaqRow />
        <FaqRow1 />
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Contact Sales</p>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_10px_12px_rgba(0,120,212,0.2)] flex items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function Frame60() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="Frame">
      <Button1 />
      <Button2 />
    </div>
  );
}

function CtaFooter() {
  return (
    <div className="bg-[#e6f2ff] relative rounded-tl-[24px] rounded-tr-[24px] shrink-0 w-full" data-name="cta-footer">
      <div aria-hidden className="absolute border-[#e2e8f0] border-solid border-t inset-0 pointer-events-none rounded-tl-[24px] rounded-tr-[24px]" />
      <div className="flex flex-col items-center size-full">
        <div className="content-stretch flex flex-col gap-[32px] items-center p-[80px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[1.2] not-italic relative shrink-0 text-[#0f172a] text-[40px] whitespace-nowrap">Still have questions?</p>
          <Frame60 />
        </div>
      </div>
    </div>
  );
}

export default function DLagdaResourcesFaq() {
  return (
    <div className="bg-[#f8fafc] content-stretch flex flex-col items-center relative size-full" data-name="d-lagda-resources-faq">
      <Nav />
      <Hero />
      <FaqContent />
      <CtaFooter />
    </div>
  );
}