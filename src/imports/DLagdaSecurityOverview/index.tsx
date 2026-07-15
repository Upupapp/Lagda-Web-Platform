import svgPaths from "./svg-pdebz9p80x";

function EyebrowRow() {
  return (
    <div className="absolute content-stretch flex items-center left-0 top-0 w-[580px]" data-name="Eyebrow Row">
      <div className="bg-[#0078d4] h-[16px] relative shrink-0 w-[2px]" data-name="Azure Border" />
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="check">
          <path d={svgPaths.p221839c0} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function PillESignatureAvailableNow() {
  return (
    <div className="bg-[#0078d4] content-stretch flex gap-[8px] items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="Pill: eSignature Available Now">
      <Check />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">eSignature Available Now</p>
    </div>
  );
}

function PillIdentityAwareSigning() {
  return (
    <div className="bg-[rgba(7,17,31,0)] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="Pill: Identity-Aware Signing">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Identity-Aware Signing</p>
    </div>
  );
}

function PillAuditReadyRecords() {
  return (
    <div className="bg-[rgba(7,17,31,0)] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="Pill: Audit-Ready Records">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Audit-Ready Records</p>
    </div>
  );
}

function PillDocumentVerification() {
  return (
    <div className="bg-[rgba(7,17,31,0)] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0 w-[138px]" data-name="Pill: Document Verification">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-px relative text-[#38bdf8] text-[11px] whitespace-nowrap">Document Verification</p>
    </div>
  );
}

function Lock() {
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

function PillENotaryComingSoon() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="Pill: eNotary Coming Soon">
      <Lock />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-px relative text-[11px] text-white whitespace-nowrap">LAGDA Coming Soon</p>
    </div>
  );
}

function BadgeRow() {
  return (
    <div className="absolute content-start flex flex-wrap gap-[8px] h-[72px] items-start left-0 pt-[24px] top-[318px] w-[580px]" data-name="Badge Row">
      <PillESignatureAvailableNow />
      <PillIdentityAwareSigning />
      <PillAuditReadyRecords />
      <PillDocumentVerification />
      <PillENotaryComingSoon />
    </div>
  );
}

function CtaCreateFreeLagdaAccount() {
  return (
    <div className="absolute bg-[#0078d4] content-stretch flex h-[52px] items-center justify-center left-[-1px] px-[24px] py-[14px] rounded-[10px] top-[438px] w-[258px]" data-name="CTA: Create Free LAGDA Account">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function CtaBookADemo() {
  return (
    <div className="absolute content-stretch flex h-[52px] items-center justify-center left-[280px] px-[24px] py-[14px] rounded-[10px] top-[438px] w-[148px]" data-name="CTA: Book a Demo">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function LeftColumn() {
  return (
    <div className="h-[618px] relative shrink-0 w-[580px]" data-name="Left Column">
      <EyebrowRow />
      <p className="[word-break:break-word] absolute font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] left-px text-[#0078d4] text-[11px] top-[30px] tracking-[1.5px] whitespace-nowrap">SECURITY AND TRUST</p>
      <div className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold h-[185px] leading-[0] left-0 text-[52px] text-white top-[58px] w-[560px]">
        <p className="leading-[55px] mb-0">Security for high-stakes</p>
        <p className="leading-[55px]">legal documents.</p>
      </div>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-0 text-[#94a3b8] text-[18px] top-[225px] w-[540px]">LAGDA combines identity-aware signing, secure document workflows, audit-ready records, and future LAGDA-ready infrastructure for Philippine legal and business transactions. Designed to support audit-ready electronic document workflows for authenticity, integrity, signer accountability, and document verification.</p>
      <BadgeRow />
      <CtaCreateFreeLagdaAccount />
      <CtaBookADemo />
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-[2px] text-[#67023b] text-[14px] top-[528px] w-[540px]">Join LAGDA eNotary Waitlist →</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-0 text-[#94a3b8] text-[13px] top-[546px] w-[540px]">LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation. LAGDA features are not included in current eSignature plans.</p>
    </div>
  );
}

function ChipCompleted() {
  return (
    <div className="bg-[rgba(34,197,94,0.15)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="Chip: Completed">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.4)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#22c55e] text-[12px] whitespace-nowrap">✓ Completed</p>
    </div>
  );
}

function DocRow() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[24px] py-[12px] top-[80px] w-[592px]" data-name="Doc Row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">📄 Service Agreement.pdf</p>
      <ChipCompleted />
    </div>
  );
}

function ChipOtpConfirmed() {
  return (
    <div className="bg-[rgba(34,197,94,0.15)] content-stretch flex items-start px-[10px] py-[3px] relative rounded-[999px] shrink-0" data-name="Chip: OTP Confirmed">
      <div aria-hidden className="absolute border border-[rgba(34,197,94,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-nowrap">OTP Confirmed</p>
    </div>
  );
}

function RowSignerVerification() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[24px] py-[10px] top-[136px] w-[592px]" data-name="Row: Signer Verification">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">🔐 Signer Verification</p>
      <ChipOtpConfirmed />
    </div>
  );
}

function ChipProtected() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[3px] relative rounded-[999px] shrink-0" data-name="Chip: Protected">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Protected</p>
    </div>
  );
}

function RowDocumentIntegrity() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[24px] py-[10px] top-[188px] w-[592px]" data-name="Row: Document Integrity">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">🛡️ Document Integrity</p>
      <ChipProtected />
    </div>
  );
}

function Chip8Events() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[3px] relative rounded-[999px] shrink-0" data-name="Chip: 8 events">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">8 events</p>
    </div>
  );
}

function RowAuditTrail() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[24px] py-[10px] top-[240px] w-[592px]" data-name="Row: Audit Trail">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">📋 Audit Trail</p>
      <Chip8Events />
    </div>
  );
}

function ChipActive() {
  return (
    <div className="bg-[rgba(0,120,212,0.15)] content-stretch flex items-start px-[10px] py-[3px] relative rounded-[999px] shrink-0" data-name="Chip: Active">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.5)] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Active</p>
    </div>
  );
}

function RowVerificationLink() {
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[24px] py-[10px] top-[292px] w-[592px]" data-name="Row: Verification Link">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[13px] whitespace-nowrap">🔗 Verification Link</p>
      <ChipActive />
    </div>
  );
}

function LagdaTrustDashboard() {
  return (
    <div className="absolute bg-[#0b2344] h-[352px] left-0 overflow-clip rounded-[16px] top-[40px] w-[640px]" data-name="LAGDA Trust Dashboard">
      <div className="absolute bg-[#0078d4] h-[4px] left-0 top-0 w-[640px]" data-name="Azure Top Border" />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[18px] text-white top-[20px] whitespace-nowrap">LAGDA Trust Dashboard</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-[24px] text-[#94a3b8] text-[12px] top-[44px] whitespace-nowrap">Document Security Overview</p>
      <div className="absolute bg-[rgba(255,255,255,0.08)] h-px left-[24px] top-[66px] w-[592px]" data-name="Rectangle" />
      <DocRow />
      <div className="absolute bg-[rgba(255,255,255,0.06)] h-px left-[24px] top-[134px] w-[592px]" data-name="Rectangle" />
      <RowSignerVerification />
      <div className="absolute bg-[rgba(255,255,255,0.06)] h-px left-[24px] top-[186px] w-[592px]" data-name="Rectangle" />
      <RowDocumentIntegrity />
      <div className="absolute bg-[rgba(255,255,255,0.06)] h-px left-[24px] top-[238px] w-[592px]" data-name="Rectangle" />
      <RowAuditTrail />
      <div className="absolute bg-[rgba(255,255,255,0.06)] h-px left-[24px] top-[290px] w-[592px]" data-name="Rectangle" />
      <RowVerificationLink />
    </div>
  );
}

function IconRow() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Icon Row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">✅</p>
    </div>
  );
}

function FloatSignerVerified() {
  return (
    <div className="absolute bg-[#0b2344] content-stretch flex flex-col gap-[4px] items-start left-[480px] px-[14px] py-[12px] rounded-[10px] top-[20px]" data-name="Float: Signer Verified">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <IconRow />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Signer Verified</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">Identity confirmed via OTP</p>
    </div>
  );
}

function IconRow1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Icon Row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">📋</p>
    </div>
  );
}

function FloatAuditTrail() {
  return (
    <div className="absolute bg-[#0b2344] content-stretch flex flex-col gap-[4px] items-start left-[24px] px-[14px] py-[12px] rounded-[10px] top-[410px]" data-name="Float: Audit Trail">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <IconRow1 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Audit Trail Generated</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">2 min ago · 8 events</p>
    </div>
  );
}

function IconRow2() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Icon Row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">🔒</p>
    </div>
  );
}

function FloatDocumentStored() {
  return (
    <div className="absolute bg-[#0b2344] content-stretch flex flex-col gap-[4px] items-start left-[236px] px-[14px] py-[12px] rounded-[10px] top-[410px]" data-name="Float: Document Stored">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <IconRow2 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Document Stored</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">Encrypted · AES-256</p>
    </div>
  );
}

function IconRow3() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Icon Row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">⚖️</p>
    </div>
  );
}

function FloatENotaryComingSoon() {
  return (
    <div className="absolute bg-[#0b2344] content-stretch flex flex-col gap-[4px] items-start left-[437px] px-[14px] py-[12px] rounded-[10px] top-[410px]" data-name="Float: eNotary Coming Soon">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <IconRow3 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">LAGDA eNotary</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">Coming Soon 🔒</p>
    </div>
  );
}

function AnnotationDashboardRisesWithFade() {
  return (
    <div className="absolute bg-[rgba(0,120,212,0.1)] content-stretch flex items-start left-[38px] opacity-40 px-[8px] py-[3px] rounded-[4px] top-[503px]" data-name="Annotation: ↑ dashboard rises with fade">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#8099b2] text-[9px] whitespace-nowrap">↑ dashboard rises with fade</p>
    </div>
  );
}

function AnnotationTrustCardsStaggerIn() {
  return (
    <div className="absolute bg-[rgba(0,120,212,0.1)] h-[18px] left-[233px] opacity-40 rounded-[4px] top-[505px] w-[146px]" data-name="Annotation: → trust cards stagger in">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[4px]" />
    </div>
  );
}

function AnnotationSignerVerifiedCardAppearsLast() {
  return (
    <div className="absolute bg-[rgba(0,120,212,0.1)] content-stretch flex items-start left-[397px] opacity-40 px-[8px] py-[3px] rounded-[4px] top-[505px]" data-name="Annotation: ✦ signer verified card appears last">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[4px]" />
      <p className="[word-break:break-word] font-['Geist_Mono:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#8099b2] text-[9px] whitespace-nowrap">✦ signer verified card appears last</p>
    </div>
  );
}

function Lock1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lock">
          <path d={svgPaths.p241025a0} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function StatEncryption() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[10px] relative rounded-[10px] shrink-0" data-name="Stat: Encryption">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Lock1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">256-bit AES Encryption</p>
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

function StatTamperEvident() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[10px] relative rounded-[10px] shrink-0" data-name="Stat: Tamper-Evident">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Shield />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Tamper-Evident Records</p>
    </div>
  );
}

function FileText() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="file-text">
          <path d={svgPaths.p3cbc4600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function StatLegalWorkflows() {
  return (
    <div className="bg-[#0b2344] flex-[1_0_0] h-[40px] min-w-px relative rounded-[10px]" data-name="Stat: Legal Workflows">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[8px] items-center px-[12px] py-[10px] relative size-full">
          <FileText />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[11px] text-white">PH Legal Workflows</p>
        </div>
      </div>
    </div>
  );
}

function TrustStatsRow() {
  return (
    <div className="absolute content-stretch flex gap-[12px] h-[40px] items-start left-[43px] pt-[24px] top-[512px] w-[560px]" data-name="Trust Stats Row">
      <StatEncryption />
      <StatTamperEvident />
      <StatLegalWorkflows />
    </div>
  );
}

function RightColumn() {
  return (
    <div className="h-[680px] relative shrink-0 w-[660px]" data-name="Right Column">
      <LagdaTrustDashboard />
      <FloatSignerVerified />
      <FloatAuditTrail />
      <FloatDocumentStored />
      <FloatENotaryComingSoon />
      <AnnotationDashboardRisesWithFade />
      <AnnotationTrustCardsStaggerIn />
      <p className="[word-break:break-word] absolute font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] left-[236px] text-[#8099b2] text-[9px] top-[508px] whitespace-nowrap">→ trust cards stagger in</p>
      <AnnotationSignerVerifiedCardAppearsLast />
      <TrustStatsRow />
    </div>
  );
}

function HeroSecurityTrust() {
  return (
    <div className="bg-[#07111f] h-[745px] relative shrink-0 w-full" data-name="Hero - Security & Trust">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[40px] items-start p-[80px] relative size-full">
          <LeftColumn />
          <RightColumn />
        </div>
      </div>
    </div>
  );
}

function Award() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="award">
          <path d={svgPaths.p3c416e70} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <Award />
    </div>
  );
}

function Frame2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[14px] text-black">SSL Encrypted</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[10px] uppercase">256-bit AES</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[12px] items-center p-[12px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.13)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Frame1 />
      <Frame2 />
    </div>
  );
}

function Award1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="award">
          <path d={svgPaths.p3c416e70} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <Award1 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[14px] text-black">Audit Ready</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[10px] uppercase">Immutable Logs</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center p-[12px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.13)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Frame4 />
      <Frame5 />
    </div>
  );
}

function Award2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="award">
          <path d={svgPaths.p3c416e70} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <Award2 />
    </div>
  );
}

function Frame8() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[14px] text-black">PH Legal Flows</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[10px] uppercase">AJA Compliant</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[12px] items-center p-[12px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.13)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Frame7 />
      <Frame8 />
    </div>
  );
}

function Award3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="award">
          <path d={svgPaths.p3c416e70} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame10() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <Award3 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[14px] text-black">Data Residency</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[10px] uppercase">PH Cloud</p>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex gap-[12px] items-center p-[12px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.13)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Frame10 />
      <Frame11 />
    </div>
  );
}

function Award4() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="award">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="award">
          <path d={svgPaths.p3c416e70} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame13() {
  return (
    <div className="bg-[#eaf6ff] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <Award4 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#e6e6e6] text-[14px]">Tamper Evident</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[10px] uppercase">Digital Seals</p>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex gap-[12px] items-center p-[12px] relative rounded-[12px] shrink-0" data-name="Frame">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.13)] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <Frame13 />
      <Frame14 />
    </div>
  );
}

function TrustBadgesSection() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Trust Badges - Section">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between px-[80px] py-[60px] relative size-full">
          <Frame />
          <Frame3 />
          <Frame6 />
          <Frame9 />
          <Frame12 />
        </div>
      </div>
      <div aria-hidden className="absolute border-[#e5e7eb] border-b border-solid border-t inset-0 pointer-events-none" />
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[12px] items-center justify-center leading-[normal] left-[280px] text-center top-[60px] w-[880px]" data-name="Section Header">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[40px] whitespace-nowrap">Built for trust at every step</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[16px] w-[680px]">Every document signed through LAGDA is backed by a security-first architecture built for Philippine legal and enterprise standards.</p>
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[24px] size-[48px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.p1f337080} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="3" />
          <path d={svgPaths.p284783a0} id="Vector_2" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2.5" />
          <path d={svgPaths.p2ac85f80} id="Vector_3" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2.5" />
          <path d={svgPaths.p1629da00} fill="var(--fill-0, #0078D4)" id="Vector_4" />
        </g>
      </svg>
    </div>
  );
}

function Card1IdentityAwareAccess() {
  return (
    <div className="absolute bg-white h-[280px] left-[80px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[250px] w-[400px]" data-name="Card 1: Identity-Aware Access">
      <div className="absolute bg-[#0078d4] h-[3px] left-0 top-0 w-[400px]" data-name="Accent Line" />
      <Icon />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[#07111f] text-[18px] top-[82px] whitespace-nowrap">Identity-Aware Access</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[24px] text-[#334155] text-[14px] top-[115px] w-[352px]">Secure links, OTP confirmation, signer intent, and optional ID validation help confirm who is signing.</p>
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[24px] size-[48px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.pf636a00} fill="var(--fill-0, #0078D4)" id="Vector" opacity="0.2" />
          <path d={svgPaths.p12477600} fill="var(--fill-0, #0078D4)" id="Vector_2" />
          <path d={svgPaths.p2626b600} fill="var(--fill-0, #0078D4)" id="Vector_3" />
          <path d={svgPaths.p496bef0} fill="var(--fill-0, #0078D4)" id="Vector_4" />
          <path d={svgPaths.p1265a840} fill="var(--fill-0, #0078D4)" id="Vector_5" opacity="0.6" />
          <path d={svgPaths.p2d329d80} fill="var(--fill-0, #0078D4)" id="Vector_6" opacity="0.6" />
          <path d={svgPaths.p207b0000} fill="var(--fill-0, #0078D4)" id="Vector_7" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
}

function Card2AuditReadyRecords() {
  return (
    <div className="absolute bg-white h-[280px] left-[520px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[250px] w-[400px]" data-name="Card 2: Audit-Ready Records">
      <div className="absolute bg-[#0078d4] h-[3px] left-0 top-0 w-[400px]" data-name="Accent Line" />
      <Icon1 />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[#07111f] text-[18px] top-[82px] whitespace-nowrap">Audit-Ready Records</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[24px] text-[#334155] text-[14px] top-[115px] w-[352px]">Every signing action is captured in a timestamped activity trail for clearer transaction history.</p>
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[24px] size-[48px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.pe88f480} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d={svgPaths.p223d3e00} fill="var(--fill-0, #0078D4)" id="Vector_2" />
          <path d={svgPaths.p3a42d600} id="Vector_3" stroke="var(--stroke-0, #0078D4)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Card3DocumentIntegrity() {
  return (
    <div className="absolute bg-white h-[280px] left-[960px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[250px] w-[400px]" data-name="Card 3: Document Integrity">
      <div className="absolute bg-[#0078d4] h-[3px] left-0 top-0 w-[400px]" data-name="Accent Line" />
      <Icon2 />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[#07111f] text-[18px] top-[82px] whitespace-nowrap">Document Integrity</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[24px] text-[#334155] text-[14px] top-[115px] w-[352px]">Completed documents are stored with verification records, completion history, and tamper-evident signals.</p>
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute left-[24px] size-[48px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.p17156af0} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d={svgPaths.p3fc2e500} id="Vector_2" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d="M8 38C8 31.4 12.5 28 18 28" id="Vector_3" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2.5" />
          <path d={svgPaths.p14e2a900} id="Vector_4" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2.5" />
        </g>
      </svg>
    </div>
  );
}

function Card4TeamPermissions() {
  return (
    <div className="absolute bg-white h-[280px] left-[80px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[562px] w-[400px]" data-name="Card 4: Team Permissions">
      <div className="absolute bg-[#0078d4] h-[3px] left-0 top-0 w-[400px]" data-name="Accent Line" />
      <Icon3 />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[#07111f] text-[18px] top-[82px] whitespace-nowrap">Team Permissions</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[24px] text-[#334155] text-[14px] top-[115px] w-[352px]">Role-based access helps law firms and businesses control who can send, view, manage, and verify documents.</p>
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-[24px] size-[48px] top-[24px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.p223f4980} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d={svgPaths.p25435480} fill="var(--fill-0, #0078D4)" id="Vector_2" />
          <path d={svgPaths.p36d95f80} id="Vector_3" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d={svgPaths.p327b4a00} fill="var(--fill-0, #0078D4)" id="Vector_4" />
          <path d={svgPaths.p37ad2600} id="Vector_5" stroke="var(--stroke-0, #0078D4)" strokeWidth="2.5" />
          <path d={svgPaths.p30c12280} fill="var(--fill-0, #0078D4)" id="Vector_6" />
          <path d="M30 34L34 38L42 30" id="Vector_7" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        </g>
      </svg>
    </div>
  );
}

function Card5DocumentVerification() {
  return (
    <div className="absolute bg-white h-[280px] left-[520px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[562px] w-[400px]" data-name="Card 5: Document Verification">
      <div className="absolute bg-[#0078d4] h-[3px] left-0 top-0 w-[400px]" data-name="Accent Line" />
      <Icon4 />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[24px] text-[#07111f] text-[18px] top-[82px] whitespace-nowrap">QR-Based Document Verification</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[24px] text-[#334155] text-[14px] top-[115px] w-[352px]">Every completed signed PDF can include a secure QR code and verification URL so recipients and institutions can confirm document status through LAGDA Document Verification.</p>
    </div>
  );
}

function Icon5() {
  return (
    <div className="absolute left-[22.5px] size-[48px] top-[22.5px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 48">
        <g id="Icon">
          <path d={svgPaths.p1e9473c0} id="Vector" stroke="var(--stroke-0, #67023B)" strokeWidth="2.5" />
          <path d="M14 14H26M14 20H26M14 26H22" id="Vector_2" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
          <path d={svgPaths.p1be33af0} fill="var(--fill-0, #67023B)" id="Vector_3" />
          <path d={svgPaths.p3175f080} fill="var(--fill-0, white)" id="Vector_4" />
          <path d="M32 35H40" id="Vector_5" stroke="var(--stroke-0, white)" strokeWidth="1.5" />
          <path d="M38 30L34 33L30 30" id="Vector_6" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function Badge() {
  return (
    <div className="absolute bg-[#67023b] content-stretch flex items-start left-[22.5px] overflow-clip px-[10px] py-[4px] rounded-[20px] top-[236.5px]" data-name="Badge">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Coming Soon · Subject to Accreditation</p>
    </div>
  );
}

function Card6ENotaryReadyInfrastructure() {
  return (
    <div className="absolute bg-white border-[#67023b] border-[1.5px] border-dashed h-[280px] left-[960px] overflow-clip rounded-[16px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)] top-[562px] w-[400px]" data-name="Card 6: eNotary-Ready Infrastructure">
      <div className="absolute bg-[#67023b] h-[3px] left-[-1.5px] top-[-1.5px] w-[400px]" data-name="Accent Line" />
      <Icon5 />
      <p className="[word-break:break-word] absolute font-['Geist:Bold',sans-serif] font-bold leading-[normal] left-[22.5px] text-[#07111f] text-[18px] top-[80.5px] whitespace-nowrap">LAGDA-Ready Infrastructure</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[22px] left-[22.5px] text-[#334155] text-[14px] top-[113.5px] w-[352px]">Future electronic notarization workflows are being designed around accreditation, secure video, electronic records, and evidence retention.</p>
      <Badge />
    </div>
  );
}

function SecurityFeaturesSection() {
  return (
    <div className="bg-white h-[922px] overflow-clip relative shrink-0 w-full" data-name="Security Features - Section">
      <SectionHeader />
      <Card1IdentityAwareAccess />
      <Card2AuditReadyRecords />
      <Card3DocumentIntegrity />
      <Card4TeamPermissions />
      <Card5DocumentVerification />
      <Card6ENotaryReadyInfrastructure />
    </div>
  );
}

function Header() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Header">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] tracking-[2.5px] uppercase whitespace-nowrap">DOCUMENT VERIFICATION ARCHITECTURE</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] max-w-[960px] min-w-full relative shrink-0 text-[40px] text-center text-white w-[min-content]">Every completed document is verifiable.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[24px] max-w-[920px] min-w-full relative shrink-0 text-[#94a3b8] text-[16px] text-center w-[min-content]">Completed LAGDA eSignature documents generate a unique Verification ID and QR code embedded in the PDF footer. Anyone with the QR code or Verification ID can confirm document status through the public LAGDA Document Verification page without accessing private signer data.</p>
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

function Icon6() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <FileText1 />
    </div>
  );
}

function Text() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Signed PDF</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Completed document with applied signatures</p>
    </div>
  );
}

function ArrowRight() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 1">
      <Icon6 />
      <Text />
      <ArrowRight />
    </div>
  );
}

function Key() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="key">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="key">
          <path d={svgPaths.p5502cf0} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon7() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <Key />
    </div>
  );
}

function Text1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Verification ID generated</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Unique identifier tied to the signed record</p>
    </div>
  );
}

function ArrowRight1() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step1() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 2">
      <Icon7 />
      <Text1 />
      <ArrowRight1 />
    </div>
  );
}

function QrCode() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="qr-code">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="qr-code">
          <path d={svgPaths.p2bf5000} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon8() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <QrCode />
    </div>
  );
}

function Text2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">QR footer embedded</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">PDF footer includes Verification ID and QR code</p>
    </div>
  );
}

function ArrowRight2() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step2() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 3">
      <Icon8 />
      <Text2 />
      <ArrowRight2 />
    </div>
  );
}

function Globe() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="globe">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_3600)" id="globe">
          <path d={svgPaths.p16bd2100} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3600">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Icon9() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <Globe />
    </div>
  );
}

function Text3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Public Verification Available</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Anyone can verify status without signer data</p>
    </div>
  );
}

function ArrowRight3() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step3() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 4">
      <Icon9 />
      <Text3 />
      <ArrowRight3 />
    </div>
  );
}

function Scan() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="scan">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="scan">
          <path d={svgPaths.p35ac0b80} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon10() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <Scan />
    </div>
  );
}

function Text4() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Scan QR</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Use a QR reader to initiate verification</p>
    </div>
  );
}

function ArrowRight4() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step4() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 5">
      <Icon10 />
      <Text4 />
      <ArrowRight4 />
    </div>
  );
}

function CheckCircle() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_3588)" id="check-circle">
          <path d={svgPaths.p14571d48} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3588">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Icon11() {
  return (
    <div className="bg-[rgba(34,197,94,0.15)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <CheckCircle />
    </div>
  );
}

function Text5() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Verification Result</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Status confirmed: valid / invalid / not found</p>
    </div>
  );
}

function Step5() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 6">
      <Icon11 />
      <Text5 />
    </div>
  );
}

function TrustChainDiagram() {
  return (
    <div className="bg-[#07111f] relative rounded-[16px] shrink-0 w-full" data-name="Trust Chain Diagram">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-start p-[24px] relative size-full">
          <Step />
          <Step1 />
          <Step2 />
          <Step3 />
          <Step4 />
          <Step5 />
        </div>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function DocumentVerificationArchitecture() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0 w-full" data-name="Document Verification Architecture">
      <Header />
      <TrustChainDiagram />
    </div>
  );
}

function Header1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Header">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] tracking-[2.5px] uppercase whitespace-nowrap">{`SIGNER ACCOUNTABILITY & AUDIT TRAIL`}</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] max-w-[960px] min-w-full relative shrink-0 text-[40px] text-center text-white w-[min-content]">Every signing event is recorded.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[24px] max-w-[920px] min-w-full relative shrink-0 text-[#94a3b8] text-[16px] text-center w-[min-content]">LAGDA captures timestamped signer activity including authentication method, IP address, device and browser, and approximate IP-based location where available. Exact GPS requires explicit signer permission and is never collected by default.</p>
    </div>
  );
}

function FileText2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="file-text">
          <path d={svgPaths.p1bf52320} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Title() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <FileText2 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Audit Record - Service Agreement.pdf</p>
    </div>
  );
}

function StatusChip() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Completed</p>
    </div>
  );
}

function CardHeader() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="card-header">
      <Title />
      <StatusChip />
    </div>
  );
}

function Row() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Timestamp</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">2025-11-15 09:17 AM PHT</p>
    </div>
  );
}

function Row1() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Authentication</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Email OTP</p>
    </div>
  );
}

function Row2() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">IP Address</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">192.168.1.***</p>
    </div>
  );
}

function Row3() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Browser / Device</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Chrome / macOS</p>
    </div>
  );
}

function Row4() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Approximate Location</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Manila, PH</p>
    </div>
  );
}

function GpsNote() {
  return (
    <div className="bg-[rgba(245,158,11,0.1)] content-stretch flex items-start px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="gps-note">
      <div aria-hidden className="absolute border-[#f59e0b] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#c77300] text-[11px] whitespace-nowrap">Not requested</p>
    </div>
  );
}

function Row5() {
  return (
    <div className="content-stretch flex h-[40px] items-center justify-between relative shrink-0 w-full" data-name="row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">Exact GPS</p>
      <GpsNote />
    </div>
  );
}

function AuditRecordCard() {
  return (
    <div className="bg-[#07111f] relative rounded-[16px] shrink-0 w-full" data-name="Audit Record Card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[14px] items-start p-[24px] relative size-full">
          <CardHeader />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row1 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row2 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row3 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row4 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row5 />
        </div>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function SignerAccountabilityAndAuditTrail() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0 w-full" data-name="Signer Accountability and Audit Trail">
      <Header1 />
      <AuditRecordCard />
    </div>
  );
}

function Header2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Header">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] tracking-[2.5px] uppercase whitespace-nowrap">DOCUMENT INTEGRITY</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] max-w-[960px] min-w-full relative shrink-0 text-[40px] text-center text-white w-[min-content]">Signed documents are protected against tampering.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[24px] max-w-[920px] min-w-full relative shrink-0 text-[#94a3b8] text-[16px] text-center w-[min-content]">Each signed PDF is sealed and stored with a cryptographic record. Any modification to the signed document after completion invalidates the verification record. LAGDA is designed to support audit-ready electronic document workflows for authenticity, integrity, signer accountability, and document verification.</p>
    </div>
  );
}

function Lock2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lock">
          <path d={svgPaths.p3ad10700} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon12() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <Lock2 />
    </div>
  );
}

function Text6() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Signed PDF</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Completed document with applied signatures</p>
    </div>
  );
}

function ArrowRight5() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step6() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 1">
      <Icon12 />
      <Text6 />
      <ArrowRight5 />
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

function Icon13() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <Shield1 />
    </div>
  );
}

function Text7() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Cryptographic record</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Verification record generated and stored</p>
    </div>
  );
}

function ArrowRight6() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step7() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 2">
      <Icon13 />
      <Text7 />
      <ArrowRight6 />
    </div>
  );
}

function AlertTriangle() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-triangle">
          <path d={svgPaths.p29d83900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon14() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <AlertTriangle />
    </div>
  );
}

function Text8() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Tamper detection</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Modification invalidates verification record</p>
    </div>
  );
}

function ArrowRight7() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="arrow-right">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="arrow-right">
          <path d={svgPaths.p394a7400} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Step8() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 3">
      <Icon14 />
      <Text8 />
      <ArrowRight7 />
    </div>
  );
}

function CheckCircle1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="check-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_3588)" id="check-circle">
          <path d={svgPaths.p14571d48} id="Vector" stroke="var(--stroke-0, #22C55E)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3588">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Icon15() {
  return (
    <div className="bg-[rgba(34,197,94,0.15)] content-stretch flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[44px]" data-name="icon">
      <CheckCircle1 />
    </div>
  );
}

function Text9() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="text">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[15px] text-white w-full">Audit-ready record</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[13px] w-full">Supports authenticity, integrity, and verification</p>
    </div>
  );
}

function Step9() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="Step 4">
      <Icon15 />
      <Text9 />
    </div>
  );
}

function IntegrityDiagram() {
  return (
    <div className="bg-[#07111f] relative rounded-[16px] shrink-0 w-full" data-name="Integrity Diagram">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-start p-[24px] relative size-full">
          <Step6 />
          <Step7 />
          <Step8 />
          <Step9 />
        </div>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function DocumentIntegrity() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0 w-full" data-name="Document Integrity">
      <Header2 />
      <IntegrityDiagram />
    </div>
  );
}

function Header3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-center relative shrink-0 w-full" data-name="Header">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] tracking-[2.5px] uppercase whitespace-nowrap">COMPANY BRANDING CONTROLS</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] max-w-[960px] min-w-full relative shrink-0 text-[40px] text-center text-white w-[min-content]">Branding is controlled, not automatic.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[24px] max-w-[920px] min-w-full relative shrink-0 text-[#94a3b8] text-[16px] text-center w-[min-content]">Company headers and footers can be configured at the account level and toggled on or off per document. This prevents accidental overlay of existing document headers or footers and maintains document integrity.</p>
    </div>
  );
}

function Row6() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Account-level branding</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Configurable</p>
    </div>
  );
}

function Row7() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Per-document toggle</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">On / Off</p>
    </div>
  );
}

function Row8() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Header/footer overlay</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Prevented</p>
    </div>
  );
}

function Row9() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Integrity goal</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[13px] text-white">Preserved</p>
    </div>
  );
}

function BrandingControlsCard() {
  return (
    <div className="bg-[#07111f] relative rounded-[16px] shrink-0 w-full" data-name="Branding Controls Card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-start p-[24px] relative size-full">
          <Row6 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row7 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row8 />
          <div className="bg-[rgba(255,255,255,0.08)] h-px relative shrink-0 w-full" data-name="Rectangle" />
          <Row9 />
        </div>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function CompanyBrandingControls() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0 w-full" data-name="Company Branding Controls">
      <Header3 />
      <BrandingControlsCard />
    </div>
  );
}

function TrustArchitectureNew() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="Trust Architecture - New">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[64px] items-center px-[80px] py-[96px] relative size-full">
          <DocumentVerificationArchitecture />
          <SignerAccountabilityAndAuditTrail />
          <DocumentIntegrity />
          <CompanyBrandingControls />
        </div>
      </div>
    </div>
  );
}

function HeaderBlock() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-name="Header Block">
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[12px] tracking-[2.5px] whitespace-nowrap">IDENTITY VERIFICATION</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] relative shrink-0 text-[#07111f] text-[40px] whitespace-nowrap">Know exactly who signed.</p>
      <div className="font-['Geist:Regular',sans-serif] font-normal leading-[0] min-w-full relative shrink-0 text-[#334155] text-[16px] w-[min-content]">
        <p className="leading-[24px] mb-0">Every signature can be supported by identity-aware verification,</p>
        <p className="leading-[24px]">secure access controls, and audit-ready activity records.</p>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-center justify-center relative rounded-[32px] shrink-0 size-[64px]" data-name="Avatar">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">MS</p>
    </div>
  );
}

function NameEmail() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start leading-[normal] min-w-px relative" data-name="Name + Email">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#07111f] text-[16px] w-full">Maria Santos</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#64748b] text-[14px] w-full">maria@lagda.ph</p>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <div className="[word-break:break-word] absolute bg-[#22c55e] content-stretch flex font-extrabold gap-[6px] h-[28px] items-center leading-[normal] px-[10px] py-[6px] right-0 rounded-[14px] text-white top-0 whitespace-nowrap" data-name="Verified Badge">
      <p className="font-['Geist:ExtraBold','Noto_Sans_Symbols2:Regular',sans-serif] relative shrink-0 text-[14px]">✓</p>
      <p className="font-['Geist:ExtraBold',sans-serif] relative shrink-0 text-[12px]">Verified</p>
    </div>
  );
}

function AvatarRow() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="Avatar Row">
      <Avatar />
      <NameEmail />
      <VerifiedBadge />
    </div>
  );
}

function Mail() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="mail">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="mail">
          <path d={svgPaths.pd3d5900} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon16() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[18px] shrink-0 size-[36px]" data-name="Icon">
      <Mail />
    </div>
  );
}

function ChipVerified() {
  return (
    <div className="bg-[#22c55e] content-stretch flex h-[24px] items-center px-[10px] py-[4px] relative rounded-[12px] shrink-0" data-name="Chip - Verified">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">Verified</p>
    </div>
  );
}

function RowEmailVerified() {
  return (
    <div className="content-stretch flex gap-[12px] h-[36px] items-center relative shrink-0 w-full" data-name="Row - Email Verified">
      <Icon16 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-px relative text-[#07111f] text-[14px]">Email Verified</p>
      <ChipVerified />
    </div>
  );
}

function Smartphone() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="smartphone">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="smartphone">
          <path d={svgPaths.p257caf80} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon17() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[18px] shrink-0 size-[36px]" data-name="Icon">
      <Smartphone />
    </div>
  );
}

function ChipConfirmed() {
  return (
    <div className="bg-[#22c55e] content-stretch flex h-[24px] items-center px-[10px] py-[4px] relative rounded-[12px] shrink-0" data-name="Chip - Confirmed">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">Confirmed</p>
    </div>
  );
}

function RowOtpConfirmed() {
  return (
    <div className="content-stretch flex gap-[12px] h-[36px] items-center relative shrink-0 w-full" data-name="Row - OTP Confirmed">
      <Icon17 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-px relative text-[#07111f] text-[14px]">OTP Confirmed</p>
      <ChipConfirmed />
    </div>
  );
}

function IdCard() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="id-card">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g id="id-card">
          <path d={svgPaths.p1b219000} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Icon18() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[18px] shrink-0 size-[36px]" data-name="Icon">
      <IdCard />
    </div>
  );
}

function ChipAvailable() {
  return (
    <div className="bg-[#f59e0b] content-stretch flex h-[24px] items-center px-[10px] py-[4px] relative rounded-[12px] shrink-0" data-name="Chip - Available">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#07111f] text-[12px] whitespace-nowrap">Available</p>
    </div>
  );
}

function RowIdValidation() {
  return (
    <div className="content-stretch flex gap-[12px] h-[36px] items-center relative shrink-0 w-full" data-name="Row - ID Validation">
      <Icon18 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-px relative text-[#07111f] text-[14px]">ID Validation</p>
      <ChipAvailable />
    </div>
  );
}

function Clock() {
  return (
    <div className="relative shrink-0 size-[18px]" data-name="clock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 18">
        <g clipPath="url(#clip0_1_3564)" id="clock">
          <path d={svgPaths.p3e73ac00} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3564">
            <rect fill="white" height="18" width="18" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Icon19() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex flex-col items-center justify-center relative rounded-[18px] shrink-0 size-[36px]" data-name="Icon">
      <Clock />
    </div>
  );
}

function RowAuditLogged() {
  return (
    <div className="content-stretch flex gap-[12px] h-[36px] items-center relative shrink-0 w-full" data-name="Row - Audit Logged">
      <Icon19 />
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-px relative text-[#07111f] text-[14px]">Audit Logged</p>
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">8 events</p>
    </div>
  );
}

function StatusRows() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="Status Rows">
      <RowEmailVerified />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowOtpConfirmed />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowIdValidation />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowAuditLogged />
    </div>
  );
}

function SignerCard() {
  return (
    <div className="bg-white content-stretch drop-shadow-[0px_10px_12px_rgba(0,0,0,0.08)] flex flex-col gap-[16px] items-start p-[20px] relative rounded-[16px] shrink-0 w-[420px]" data-name="Signer Card">
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="absolute bg-[#0078d4] bottom-0 left-0 top-0 w-[4px]" data-name="Accent Stripe" />
      <AvatarRow />
      <StatusRows />
    </div>
  );
}

function PillEmailVerified() {
  return (
    <div className="bg-white flex-[1_0_0] h-[32px] min-w-px relative rounded-[20px]" data-name="Pill: Email verified">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[10px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Email verified</p>
        </div>
      </div>
    </div>
  );
}

function PillOtpConfirmed() {
  return (
    <div className="bg-white flex-[1_0_0] h-[32px] min-w-px relative rounded-[20px]" data-name="Pill: OTP confirmed">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[10px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">OTP confirmed</p>
        </div>
      </div>
    </div>
  );
}

function PillsRow() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Pills Row 1">
      <PillEmailVerified />
      <PillOtpConfirmed />
    </div>
  );
}

function PillIdValidationAvailable() {
  return (
    <div className="bg-white flex-[1_0_0] h-[32px] min-w-px relative rounded-[20px]" data-name="Pill: ID validation available">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[10px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">ID validation available</p>
        </div>
      </div>
    </div>
  );
}

function PillAuditLogged() {
  return (
    <div className="bg-white flex-[1_0_0] h-[32px] min-w-px relative rounded-[20px]" data-name="Pill: Audit logged">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[10px] py-[6px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">Audit logged</p>
        </div>
      </div>
    </div>
  );
}

function PillsRow1() {
  return (
    <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-name="Pills Row 2">
      <PillIdValidationAvailable />
      <PillAuditLogged />
    </div>
  );
}

function PillsGrid() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-name="Pills Grid">
      <PillsRow />
      <PillsRow1 />
    </div>
  );
}

function LeftColumn1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-center relative shrink-0 w-[520px]" data-name="Left Column">
      <SignerCard />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[15px] text-center whitespace-nowrap">Verified Signer</p>
      <PillsGrid />
      <p className="[word-break:break-word] font-['Geist:Regular','Noto_Sans_Math:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[14px] opacity-60 relative shrink-0 text-[10px] text-[rgba(0,120,212,0.55)] text-center whitespace-nowrap">↻ Ring animates 0-100% • ✓ Badge pops in • Shield pulses</p>
    </div>
  );
}

function Icon20() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center justify-center overflow-clip relative rounded-[20px] shrink-0 size-[40px]" data-name="Icon">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#0078d4] text-[20px] whitespace-nowrap">✉</p>
    </div>
  );
}

function Text10() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip relative" data-name="Text">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[15px] w-full">Email Verification</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#334155] text-[13px] w-full">Ensure recipients access documents via unique, secure links.</p>
    </div>
  );
}

function RowEmailVerification() {
  return (
    <div className="content-stretch flex gap-[18px] h-[90px] items-center overflow-clip py-[20px] relative shrink-0 w-full" data-name="Row: Email Verification">
      <Icon20 />
      <Text10 />
    </div>
  );
}

function Icon21() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center justify-center overflow-clip relative rounded-[20px] shrink-0 size-[40px]" data-name="Icon">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#0078d4] text-[20px] whitespace-nowrap">◻</p>
    </div>
  );
}

function Text11() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip relative" data-name="Text">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[15px] w-full">OTP Confirmation</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#334155] text-[13px] w-full">Add a second layer of security with SMS or email OTP.</p>
    </div>
  );
}

function RowOtpConfirmation() {
  return (
    <div className="content-stretch flex gap-[18px] h-[90px] items-center overflow-clip py-[20px] relative shrink-0 w-full" data-name="Row: OTP Confirmation">
      <Icon21 />
      <Text11 />
    </div>
  );
}

function Icon22() {
  return (
    <div className="bg-[rgba(245,158,11,0.1)] relative rounded-[20px] shrink-0 size-[40px]" data-name="Icon">
      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#f59e0b] text-[20px] whitespace-nowrap">▣</p>
      </div>
      <div aria-hidden className="absolute border-[#f59e0b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function Text12() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip relative" data-name="Text">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[15px] w-full">Optional ID Validation</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#334155] text-[13px] w-full">Available for high-value contracts and sensitive documents.</p>
    </div>
  );
}

function RowOptionalIdValidation() {
  return (
    <div className="content-stretch flex gap-[18px] h-[90px] items-center overflow-clip py-[20px] relative shrink-0 w-full" data-name="Row: Optional ID Validation">
      <Icon22 />
      <Text12 />
    </div>
  );
}

function Icon23() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center justify-center overflow-clip relative rounded-[20px] shrink-0 size-[40px]" data-name="Icon">
      <p className="[word-break:break-word] font-['Geist:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#0078d4] text-[20px] whitespace-nowrap">◷</p>
    </div>
  );
}

function Text13() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px overflow-clip relative" data-name="Text">
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[15px] w-full">Signer Audit Trail</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[#334155] text-[13px] w-full">Complete history of all signer activity and timestamps.</p>
    </div>
  );
}

function RowSignerAuditTrail() {
  return (
    <div className="content-stretch flex gap-[18px] h-[90px] items-center overflow-clip py-[20px] relative shrink-0 w-full" data-name="Row: Signer Audit Trail">
      <Icon23 />
      <Text13 />
    </div>
  );
}

function RightColumn1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[660px]" data-name="Right Column">
      <RowEmailVerification />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowOtpConfirmation />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowOptionalIdValidation />
      <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="Divider" />
      <RowSignerAuditTrail />
    </div>
  );
}

function TwoColumnLayout() {
  return (
    <div className="content-stretch flex gap-[40px] items-start relative shrink-0 w-full" data-name="Two Column Layout">
      <LeftColumn1 />
      <RightColumn1 />
    </div>
  );
}

function IdentityVerification() {
  return (
    <div className="bg-[#eaf6ff] h-[720px] relative shrink-0 w-full" data-name="Identity Verification">
      <div className="flex flex-col items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[32px] items-center px-[80px] py-[64px] relative size-full">
          <HeaderBlock />
          <TwoColumnLayout />
        </div>
      </div>
    </div>
  );
}

function SectionHeader1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start overflow-clip relative shrink-0 w-full" data-name="Section Header">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] tracking-[2px] uppercase whitespace-nowrap">AUDIT TRAIL</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[48px] min-w-full relative shrink-0 text-[#07111f] text-[40px] w-[min-content]">Every action leaves a record.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[24px] min-w-full relative shrink-0 text-[#64748b] text-[16px] w-[min-content]">LAGDA captures the following events in every document audit trail: timestamp, signer, authentication method, IP address, device/browser, and approximate IP-based location (Business plan and higher). Exact GPS location requires explicit signer permission and is optional.</p>
    </div>
  );
}

function FileText3() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="file-text">
          <path d={svgPaths.p3cbc4600} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Title1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="title">
      <FileText3 />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Audit Trail - Service Agreement.pdf</p>
    </div>
  );
}

function StatusChip1() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Completed</p>
    </div>
  );
}

function CardHeader1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="card-header">
      <Title1 />
      <StatusChip1 />
    </div>
  );
}

function TimelineCol() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Document uploaded</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:02 AM</p>
    </div>
  );
}

function StatusChip2() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">Completed</p>
    </div>
  );
}

function EventRow() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol />
      <Content />
      <StatusChip2 />
    </div>
  );
}

function TimelineCol1() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Signer invited</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:05 AM</p>
    </div>
  );
}

function StatusChip3() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">In-progress</p>
    </div>
  );
}

function EventRow1() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol1 />
      <Content1 />
      <StatusChip3 />
    </div>
  );
}

function TimelineCol2() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Secure link opened</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:10 AM</p>
    </div>
  );
}

function StatusChip4() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">In-progress</p>
    </div>
  );
}

function EventRow2() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol2 />
      <Content2 />
      <StatusChip4 />
    </div>
  );
}

function TimelineCol3() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">OTP confirmed</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:12 AM</p>
    </div>
  );
}

function StatusChip5() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">Completed</p>
    </div>
  );
}

function EventRow3() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol3 />
      <Content3 />
      <StatusChip5 />
    </div>
  );
}

function TimelineCol4() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content4() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Document viewed</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:13 AM</p>
    </div>
  );
}

function StatusChip6() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">In-progress</p>
    </div>
  );
}

function EventRow4() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol4 />
      <Content4 />
      <StatusChip6 />
    </div>
  );
}

function TimelineCol5() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content5() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Signature applied</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:16 AM</p>
    </div>
  );
}

function StatusChip7() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">Signed</p>
    </div>
  );
}

function EventRow5() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol5 />
      <Content5 />
      <StatusChip7 />
    </div>
  );
}

function TimelineCol6() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
      <div className="bg-[rgba(0,120,212,0.3)] flex-[1_0_0] min-h-px relative w-[2px]" data-name="Rectangle" />
    </div>
  );
}

function Content6() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Document completed</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:17 AM</p>
    </div>
  );
}

function StatusChip8() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">Completed</p>
    </div>
  );
}

function EventRow6() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol6 />
      <Content6 />
      <StatusChip8 />
    </div>
  );
}

function TimelineCol7() {
  return (
    <div className="content-stretch flex flex-col h-full items-center relative shrink-0 w-[12px]" data-name="timeline-col">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #0078D4)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Content7() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-[1_0_0] flex-col gap-[2px] items-start leading-[normal] min-w-px relative" data-name="content">
      <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[13px] text-white w-full">Verification link generated</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[10px] w-full">2025-11-15 09:18 AM</p>
    </div>
  );
}

function StatusChip9() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center px-[10px] py-[4px] relative rounded-[999px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[10px] text-white whitespace-nowrap">Active</p>
    </div>
  );
}

function EventRow7() {
  return (
    <div className="content-stretch flex gap-[12px] h-[44px] items-center relative shrink-0 w-full" data-name="event-row">
      <TimelineCol7 />
      <Content7 />
      <StatusChip9 />
    </div>
  );
}

function Timeline() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-name="timeline">
      <EventRow />
      <EventRow1 />
      <EventRow2 />
      <EventRow3 />
      <EventRow4 />
      <EventRow5 />
      <EventRow6 />
      <EventRow7 />
    </div>
  );
}

function PremiumAuditTrailCard() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[16px] h-[430px] items-start overflow-clip p-[24px] relative rounded-[16px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.12)] shrink-0 w-[620px]" data-name="Premium Audit Trail Card">
      <CardHeader1 />
      <Timeline />
    </div>
  );
}

function Logo() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-center justify-center relative rounded-[6px] shrink-0 size-[28px]" data-name="logo">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">L</p>
    </div>
  );
}

function VerifiedBadge1() {
  return (
    <div className="bg-[#22c55e] content-stretch flex gap-[6px] items-center px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="verified-badge">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, white)" id="Ellipse" r="4" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Verified</p>
    </div>
  );
}

function TitleRow() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="title-row">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[16px] whitespace-nowrap">Completion Certificate</p>
      <VerifiedBadge1 />
    </div>
  );
}

function Header4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full" data-name="header">
      <Logo />
      <TitleRow />
    </div>
  );
}

function Row10() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Signer Name</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[13px]">Maria Santos</p>
    </div>
  );
}

function Row11() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Email</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[13px]">maria@lagda.ph</p>
    </div>
  );
}

function Row12() {
  return (
    <div className="[word-break:break-word] content-stretch flex h-[40px] items-center justify-between leading-[normal] relative shrink-0 w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#94a3b8] text-[11px]">Date and Time</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[13px]">Nov 15, 2025 · 09:17 AM PHT</p>
    </div>
  );
}

function Row13() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-normal h-[40px] items-center justify-between leading-[normal] relative shrink-0 text-[11px] w-full whitespace-nowrap" data-name="row">
      <p className="font-['Geist:Regular',sans-serif] relative shrink-0 text-[#94a3b8]">Transaction ID</p>
      <p className="font-['Geist_Mono:Regular',sans-serif] relative shrink-0 text-[#64748b]">TXN-2024-001</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0" data-name="Frame">
      <div className="relative shrink-0 size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#22c55e] text-[13px] whitespace-nowrap">Verified</p>
    </div>
  );
}

function Row14() {
  return (
    <div className="content-stretch flex h-[40px] items-center justify-between relative shrink-0 w-full" data-name="row">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">Verification Status</p>
      <Frame15 />
    </div>
  );
}

function Rows() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-name="rows">
      <Row10 />
      <Row11 />
      <Row12 />
      <Row13 />
      <Row14 />
    </div>
  );
}

function Download1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download">
          <path d={svgPaths.pdd92f40} id="Vector" stroke="var(--stroke-0, #0078D4)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Download() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="download">
      <Download1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[13px] whitespace-nowrap">Download Certificate</p>
    </div>
  );
}

function CompletionCertificate() {
  return (
    <div className="bg-white h-[430px] relative rounded-[16px] shrink-0 w-[520px]" data-name="Completion Certificate">
      <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip p-[24px] relative rounded-[inherit] size-full">
        <div className="absolute bg-[#0078d4] h-[430px] left-0 top-0 w-[4px]" data-name="accent-stripe" />
        <Header4 />
        <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="divider" />
        <Rows />
        <div className="bg-[#e5e7eb] h-px relative shrink-0 w-full" data-name="divider" />
        <Download />
        <p className="[word-break:break-word] font-['Geist_Mono:Regular','Noto_Sans_Symbols2:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[10px] w-[min-content]">✦ Entries fade in sequentially · Certificate slides in from right</p>
      </div>
      <div aria-hidden className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.12)]" />
    </div>
  );
}

function TwoColumns() {
  return (
    <div className="content-stretch flex gap-[40px] items-center overflow-clip relative shrink-0 w-full" data-name="Two Columns">
      <PremiumAuditTrailCard />
      <CompletionCertificate />
    </div>
  );
}

function AuditTrailSection() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[40px] h-[700px] items-center overflow-clip px-[80px] py-[96px] relative shrink-0 w-[1440px]" data-name="Audit Trail - Section">
      <SectionHeader1 />
      <TwoColumns />
    </div>
  );
}

function SectionHeaderBlock() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center leading-[normal] overflow-clip relative shrink-0 text-center whitespace-nowrap" data-name="Section Header Block">
      <p className="font-['Geist_Mono:Medium',sans-serif] font-medium relative shrink-0 text-[#0078d4] text-[13px] tracking-[2.5px]">DOCUMENT VERIFICATION</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold relative shrink-0 text-[#07111f] text-[48px]">Verify completed documents with confidence.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[18px]">Give recipients and institutions a secure way to confirm document records, signing status, and completion history.</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="bg-[#f7faff] h-[48px] relative rounded-[8px] shrink-0 w-[284px]" data-name="Frame">
      <div className="content-stretch flex items-start overflow-clip px-[14px] py-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#99a6b8] text-[13px] whitespace-nowrap">Enter verification code or document ID</p>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-[rgba(0,120,212,0.4)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Frame18() {
  return (
    <div className="bg-[#edf7ff] h-[110px] relative rounded-[8px] shrink-0 w-[284px]" data-name="Frame">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-center justify-center leading-[normal] overflow-clip px-[16px] py-[24px] relative rounded-[inherit] size-full text-center whitespace-nowrap">
        <p className="font-['Geist:Medium',sans-serif] font-medium relative shrink-0 text-[#0078d4] text-[14px]">Upload signed document</p>
        <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">PDF, DOCX, or PNG</p>
      </div>
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Frame19() {
  return (
    <div className="bg-[#e5e7eb] h-[6px] overflow-clip relative rounded-[3px] shrink-0 w-[284px]" data-name="Frame">
      <div className="absolute bg-[#0078d4] h-[6px] left-0 rounded-[3px] top-0 w-[160px]" data-name="Rectangle" />
    </div>
  );
}

function Frame20() {
  return (
    <div className="bg-[#0078d4] content-stretch flex h-[48px] items-center justify-center overflow-clip px-[24px] py-[14px] relative rounded-[8px] shrink-0 w-[284px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-center text-white whitespace-nowrap">Verify Document</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="bg-[#f0faff] relative rounded-[6px] shrink-0 w-full" data-name="Frame">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-start px-[10px] py-[7px] relative size-full">
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#0078d4] text-[10px]">Motion: code activates, progress runs, result appears</p>
        </div>
      </div>
    </div>
  );
}

function Frame16() {
  return (
    <div className="bg-white h-[500px] relative rounded-[16px] shrink-0 w-[340px]" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip p-[28px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#07111f] text-[20px] whitespace-nowrap">Verify Document</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#334155] text-[13px] whitespace-nowrap">Enter a code or upload a signed document.</p>
        <Frame17 />
        <Frame18 />
        <Frame19 />
        <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#0078d4] text-[11px] whitespace-pre">{`Verifying...  58%`}</p>
        <Frame20 />
        <Frame21 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.18)] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_8px_32px_0px_rgba(0,120,212,0.1)]" />
    </div>
  );
}

function Frame24() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center justify-center overflow-clip relative rounded-[28px] shrink-0 size-[56px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold','Noto_Sans_Symbols2:Regular',sans-serif] font-bold leading-[normal] relative shrink-0 text-[26px] text-center text-white whitespace-nowrap">✓</p>
    </div>
  );
}

function Frame25() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Document name</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">LAGDA-NDA-2026-001.pdf</p>
    </div>
  );
}

function Frame26() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Completion date</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">June 23, 2026</p>
    </div>
  );
}

function Frame27() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Signer verified</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">Juan dela Cruz</p>
    </div>
  );
}

function Frame28() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Audit trail</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">Available</p>
    </div>
  );
}

function Frame29() {
  return (
    <div className="bg-[#dcfce7] content-stretch flex items-start overflow-clip px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist_Mono:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#22c55e] text-[11px] whitespace-pre">{`VALID  eSignature AVAILABLE NOW`}</p>
    </div>
  );
}

function Frame23() {
  return (
    <div className="bg-white h-[500px] relative shrink-0 w-[335px]" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[14px] items-start overflow-clip p-[28px] relative rounded-[inherit] size-full">
        <Frame24 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#22c55e] text-[22px] whitespace-nowrap">Document Verified</p>
        <div className="bg-[#e5e7eb] h-px relative shrink-0 w-[279px]" data-name="Rectangle" />
        <Frame25 />
        <Frame26 />
        <Frame27 />
        <Frame28 />
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">View Audit Trail</p>
        <Frame29 />
        <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#218c47] text-[11px] whitespace-nowrap">Confirmation haptic on mobile</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(33,196,94,0.2)] border-solid inset-0 pointer-events-none shadow-[0px_8px_32px_0px_rgba(33,196,94,0.12)]" />
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex items-start overflow-clip relative rounded-[16px] shrink-0" data-name="Frame">
      <div className="bg-[#22c55e] h-[500px] relative shrink-0 w-[5px]" data-name="Rectangle" />
      <Frame23 />
    </div>
  );
}

function Frame32() {
  return (
    <div className="bg-[#f59e0b] content-stretch flex items-center justify-center overflow-clip relative rounded-[28px] shrink-0 size-[56px]" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[28px] text-center text-white whitespace-nowrap">!</p>
    </div>
  );
}

function Frame33() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Issue</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">Document not found in records</p>
    </div>
  );
}

function Frame34() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[2px] items-start leading-[normal] overflow-clip relative shrink-0 whitespace-nowrap" data-name="Frame">
      <p className="font-['Geist:Regular',sans-serif] font-normal relative shrink-0 text-[#334155] text-[12px]">Next step</p>
      <p className="font-['Geist:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#07111f] text-[15px]">Check code or contact the sender</p>
    </div>
  );
}

function Frame35() {
  return (
    <div className="bg-[#fbf3db] content-stretch flex items-start overflow-clip px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Frame">
      <p className="[word-break:break-word] font-['Geist_Mono:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#c77300] text-[11px] whitespace-nowrap">NOT FOUND</p>
    </div>
  );
}

function Frame31() {
  return (
    <div className="bg-white h-[500px] relative shrink-0 w-[335px]" data-name="Frame">
      <div className="content-stretch flex flex-col gap-[14px] items-start overflow-clip p-[28px] relative rounded-[inherit] size-full">
        <Frame32 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#c77300] text-[22px] whitespace-nowrap">Verification Not Found</p>
        <div className="bg-[#e5e7eb] h-px relative shrink-0 w-[279px]" data-name="Rectangle" />
        <Frame33 />
        <Frame34 />
        <Frame35 />
        <div className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[#334155] text-[12px] whitespace-nowrap">
          <p className="leading-[normal] mb-0">Note: Verification results should be supported</p>
          <p className="leading-[normal]">by audit records and document history.</p>
        </div>
        <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#b2801a] text-[11px] whitespace-nowrap">Warning haptic on mobile</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(245,158,10,0.25)] border-solid inset-0 pointer-events-none shadow-[0px_8px_32px_0px_rgba(245,158,10,0.12)]" />
    </div>
  );
}

function Frame30() {
  return (
    <div className="content-stretch flex items-start overflow-clip relative rounded-[16px] shrink-0" data-name="Frame">
      <div className="bg-[#f59e0b] h-[500px] relative shrink-0 w-[5px]" data-name="Rectangle" />
      <Frame31 />
    </div>
  );
}

function ComplianceCardsGrid() {
  return (
    <div className="content-stretch flex gap-[24px] items-start overflow-clip relative shrink-0" data-name="Compliance Cards Grid">
      <Frame16 />
      <Frame22 />
      <Frame30 />
    </div>
  );
}

function ComplianceStandardsSection() {
  return (
    <div className="bg-[#eaf6ff] h-[900px] relative shrink-0 w-full" data-name="Compliance Standards - Section">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[48px] items-center justify-center p-[80px] relative size-full">
          <SectionHeaderBlock />
          <ComplianceCardsGrid />
        </div>
      </div>
    </div>
  );
}

function Lock3() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_3652)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3652">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function EyebrowBadge() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[12px] py-[6px] relative rounded-[20px] shrink-0" data-name="Eyebrow Badge">
      <Lock3 />
      <p className="[word-break:break-word] font-['Geist_Mono:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white tracking-[2.5px] whitespace-nowrap">LAGDA eNOTARY - COMING SOON</p>
    </div>
  );
}

function HeaderBlock1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center justify-center relative shrink-0 text-center w-full" data-name="Header Block">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] max-w-[960px] relative shrink-0 text-[48px] text-white w-full">Designed for future electronic notarization.</p>
      <div className="font-['Geist:Regular',sans-serif] font-normal leading-[0] max-w-[760px] relative shrink-0 text-[#94a3b8] text-[18px] w-full">
        <p className="leading-[28px] mb-0">LAGDA eNotary is being designed for future electronic notarization workflows</p>
        <p className="leading-[28px]">after required accreditation and operational readiness.</p>
      </div>
    </div>
  );
}

function Video() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="video">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="video">
          <path d={svgPaths.p15236e00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconCircle() {
  return (
    <div className="bg-[#b01262] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="icon-circle">
      <Video />
    </div>
  );
}

function Spacer() {
  return <div className="flex-[1_0_0] min-h-px opacity-0 relative w-full" data-name="spacer" />;
}

function Lock4() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_3652)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3652">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[10px] py-[4px] relative rounded-[20px] shrink-0" data-name="Coming Soon Badge">
      <Lock4 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#fce7f3] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function BadgeRow1() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="badge-row">
      <ComingSoonBadge />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#b01262] text-[11px] w-[min-content]">Subject to Accreditation</p>
    </div>
  );
}

function CardSecureVideoAppearance() {
  return (
    <div className="bg-[#0b2344] h-[220px] relative rounded-[16px] shrink-0 w-[320px]" data-name="Card: Secure Video Appearance">
      <div className="content-stretch flex flex-col gap-[12px] items-start overflow-clip pb-[16px] pt-[20px] px-[20px] relative rounded-[inherit] size-full">
        <IconCircle />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Secure Video Appearance</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] min-w-full relative shrink-0 text-[#94a3b8] text-[13px] w-[min-content]">Future secure video sessions for electronic notarization.</p>
        <Spacer />
        <BadgeRow1 />
      </div>
      <div aria-hidden className="absolute border border-[#67023b] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_4px_16px_0px_rgba(176,18,98,0.15)]" />
    </div>
  );
}

function BookOpen() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="book-open">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="book-open">
          <path d={svgPaths.p36698480} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconCircle1() {
  return (
    <div className="bg-[#b01262] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="icon-circle">
      <BookOpen />
    </div>
  );
}

function Spacer1() {
  return <div className="flex-[1_0_0] min-h-px opacity-0 relative w-full" data-name="spacer" />;
}

function Lock5() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_3652)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3652">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ComingSoonBadge1() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[10px] py-[4px] relative rounded-[20px] shrink-0" data-name="Coming Soon Badge">
      <Lock5 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#fce7f3] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function BadgeRow2() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="badge-row">
      <ComingSoonBadge1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#b01262] text-[11px] w-[min-content]">Subject to Accreditation</p>
    </div>
  );
}

function CardElectronicNotarialBook() {
  return (
    <div className="bg-[#0b2344] h-[220px] relative rounded-[16px] shrink-0 w-[320px]" data-name="Card: Electronic Notarial Book">
      <div className="content-stretch flex flex-col gap-[12px] items-start overflow-clip pb-[16px] pt-[20px] px-[20px] relative rounded-[inherit] size-full">
        <IconCircle1 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Electronic Notarial Book</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] min-w-full relative shrink-0 text-[#94a3b8] text-[13px] w-[min-content]">Future digital record of notarial acts and sessions.</p>
        <Spacer1 />
        <BadgeRow2 />
      </div>
      <div aria-hidden className="absolute border border-[#67023b] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_4px_16px_0px_rgba(176,18,98,0.15)]" />
    </div>
  );
}

function CardsRow() {
  return (
    <div className="content-stretch flex gap-[24px] items-center justify-center relative shrink-0 w-full" data-name="Cards Row 1">
      <CardSecureVideoAppearance />
      <CardElectronicNotarialBook />
    </div>
  );
}

function Folder() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="folder">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="folder">
          <path d={svgPaths.p1bea7200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconCircle2() {
  return (
    <div className="bg-[#b01262] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="icon-circle">
      <Folder />
    </div>
  );
}

function Spacer2() {
  return <div className="flex-[1_0_0] min-h-px opacity-0 relative w-full" data-name="spacer" />;
}

function Lock6() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_3652)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3652">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ComingSoonBadge2() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[10px] py-[4px] relative rounded-[20px] shrink-0" data-name="Coming Soon Badge">
      <Lock6 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#fce7f3] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function BadgeRow3() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="badge-row">
      <ComingSoonBadge2 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#b01262] text-[11px] w-[min-content]">Subject to Accreditation</p>
    </div>
  );
}

function CardEvidencePackage() {
  return (
    <div className="bg-[#0b2344] h-[220px] relative rounded-[16px] shrink-0 w-[320px]" data-name="Card: Evidence Package">
      <div className="content-stretch flex flex-col gap-[12px] items-start overflow-clip pb-[16px] pt-[20px] px-[20px] relative rounded-[inherit] size-full">
        <IconCircle2 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Evidence Package</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] min-w-full relative shrink-0 text-[#94a3b8] text-[13px] w-[min-content]">Future retention of session recordings, documents, and certificates.</p>
        <Spacer2 />
        <BadgeRow3 />
      </div>
      <div aria-hidden className="absolute border border-[#67023b] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_4px_16px_0px_rgba(176,18,98,0.15)]" />
    </div>
  );
}

function BarChart() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="bar-chart-2">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="bar-chart-2">
          <path d={svgPaths.p2b501800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function IconCircle3() {
  return (
    <div className="bg-[#b01262] content-stretch flex flex-col items-center justify-center relative rounded-[24px] shrink-0 size-[48px]" data-name="icon-circle">
      <BarChart />
    </div>
  );
}

function Spacer3() {
  return <div className="flex-[1_0_0] min-h-px opacity-0 relative w-full" data-name="spacer" />;
}

function Lock7() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_3652)" id="lock">
          <path d={svgPaths.p28fe0540} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3652">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function ComingSoonBadge3() {
  return (
    <div className="bg-[#67023b] content-stretch flex gap-[8px] items-center px-[10px] py-[4px] relative rounded-[20px] shrink-0" data-name="Coming Soon Badge">
      <Lock7 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#fce7f3] text-[11px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function BadgeRow4() {
  return (
    <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-name="badge-row">
      <ComingSoonBadge3 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#b01262] text-[11px] w-[min-content]">Subject to Accreditation</p>
    </div>
  );
}

function CardRegulatoryReporting() {
  return (
    <div className="bg-[#0b2344] h-[220px] relative rounded-[16px] shrink-0 w-[320px]" data-name="Card: Regulatory Reporting">
      <div className="content-stretch flex flex-col gap-[12px] items-start overflow-clip pb-[16px] pt-[20px] px-[20px] relative rounded-[inherit] size-full">
        <IconCircle3 />
        <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Regulatory Reporting</p>
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] min-w-full relative shrink-0 text-[#94a3b8] text-[13px] w-[min-content]">Future compliance reporting to regulatory authorities.</p>
        <Spacer3 />
        <BadgeRow4 />
      </div>
      <div aria-hidden className="absolute border border-[#67023b] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_4px_16px_0px_rgba(176,18,98,0.15)]" />
    </div>
  );
}

function CardsRow1() {
  return (
    <div className="content-stretch flex gap-[24px] items-center justify-center relative shrink-0 w-full" data-name="Cards Row 2">
      <CardEvidencePackage />
      <CardRegulatoryReporting />
    </div>
  );
}

function CardsGrid() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center justify-center relative shrink-0 w-full" data-name="Cards Grid">
      <CardsRow />
      <CardsRow1 />
    </div>
  );
}

function ComplianceDisclaimer() {
  return (
    <div className="bg-[#fce7f3] content-stretch flex gap-[12px] items-center overflow-clip px-[24px] py-[16px] relative rounded-[40px] shrink-0 w-[1200px]" data-name="Compliance Disclaimer">
      <div className="relative shrink-0 size-[10px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 10">
          <circle cx="5" cy="5" fill="var(--fill-0, #F59E0B)" id="Ellipse" r="5" />
        </svg>
      </div>
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#67023b] text-[13px]">LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation. LAGDA features are not included in current eSignature plans.</p>
    </div>
  );
}

function CtaJoinWaitlist() {
  return (
    <div className="bg-[#67023b] content-stretch drop-shadow-[0px_4px_6px_rgba(176,18,98,0.35)] flex h-[48px] items-center justify-center relative rounded-[12px] shrink-0 w-[220px]" data-name="CTA: Join Waitlist">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">Join LAGDA eNotary Waitlist</p>
    </div>
  );
}

function CtaUseESignatureNow() {
  return (
    <div className="bg-[#0078d4] content-stretch flex h-[48px] items-center justify-center relative rounded-[12px] shrink-0 w-[220px]" data-name="CTA: Use eSignature Now">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-white whitespace-nowrap">Use LAGDA eSignature Now</p>
    </div>
  );
}

function CtaRow() {
  return (
    <div className="content-stretch flex gap-[16px] items-center justify-center relative shrink-0 w-full" data-name="CTA Row">
      <CtaJoinWaitlist />
      <CtaUseESignatureNow />
    </div>
  );
}

function LagdaENotaryComingSoon() {
  return (
    <div className="bg-[#07111f] min-h-[900px] relative shrink-0 w-full" data-name="LAGDA eNotary - Coming Soon">
      <div className="flex flex-col items-center justify-center min-h-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[40px] items-center justify-center min-h-[inherit] px-[80px] py-[96px] relative size-full">
          <EyebrowBadge />
          <HeaderBlock1 />
          <CardsGrid />
          <ComplianceDisclaimer />
          <CtaRow />
        </div>
      </div>
    </div>
  );
}

function BadgeSslEncrypted() {
  return (
    <div className="bg-[rgba(255,255,255,0.08)] relative rounded-[20px] shrink-0" data-name="Badge / SSL Encrypted">
      <div className="[word-break:break-word] content-stretch flex font-['Geist:Medium',sans-serif] font-medium gap-[6px] items-center justify-center leading-[normal] overflow-clip px-[14px] py-[8px] relative rounded-[inherit] size-full whitespace-nowrap">
        <p className="relative shrink-0 text-[#38bdf8] text-[10px]">SSL</p>
        <p className="relative shrink-0 text-[12px] text-white">SSL Encrypted</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function BadgeAuditReady() {
  return (
    <div className="bg-[rgba(255,255,255,0.08)] relative rounded-[20px] shrink-0" data-name="Badge / Audit Ready">
      <div className="[word-break:break-word] content-stretch flex font-['Geist:Medium',sans-serif] font-medium gap-[6px] items-center justify-center leading-[normal] overflow-clip px-[14px] py-[8px] relative rounded-[inherit] size-full whitespace-nowrap">
        <p className="relative shrink-0 text-[#38bdf8] text-[10px]">AUD</p>
        <p className="relative shrink-0 text-[12px] text-white">Audit Ready</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function BadgePhilippineLegalWorkflows() {
  return (
    <div className="bg-[rgba(255,255,255,0.08)] relative rounded-[20px] shrink-0" data-name="Badge / Philippine Legal Workflows">
      <div className="[word-break:break-word] content-stretch flex font-['Geist:Medium',sans-serif] font-medium gap-[6px] items-center justify-center leading-[normal] overflow-clip px-[14px] py-[8px] relative rounded-[inherit] size-full whitespace-nowrap">
        <p className="relative shrink-0 text-[#38bdf8] text-[10px]">PHL</p>
        <p className="relative shrink-0 text-[12px] text-white">Philippine Legal Workflows</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.15)] border-solid inset-0 pointer-events-none rounded-[20px]" />
    </div>
  );
}

function TrustBadgesRow() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center overflow-clip relative shrink-0" data-name="Trust Badges Row">
      <BadgeSslEncrypted />
      <BadgeAuditReady />
      <BadgePhilippineLegalWorkflows />
    </div>
  );
}

function ButtonPrimaryCreateFreeLagdaAccount() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center justify-center overflow-clip px-[28px] py-[16px] relative rounded-[8px] shadow-[0px_4px_16px_0px_rgba(0,120,212,0.4)] shrink-0" data-name="Button / Primary — Create Free LAGDA Account">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function ButtonGhostBookADemo() {
  return (
    <div className="bg-[rgba(255,255,255,0)] relative rounded-[8px] shrink-0" data-name="Button / Ghost — Book a Demo">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[28px] py-[16px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Book a Demo</p>
      </div>
      <div aria-hidden className="absolute border-[1.5px] border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function LinkENotaryWaitlist() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip px-[8px] py-[16px] relative shrink-0" data-name="Link / eNotary Waitlist">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[16px] whitespace-nowrap">Join LAGDA eNotary Waitlist →</p>
    </div>
  );
}

function CtaRow1() {
  return (
    <div className="content-stretch flex gap-[16px] items-center justify-center overflow-clip relative shrink-0" data-name="CTA Row">
      <ButtonPrimaryCreateFreeLagdaAccount />
      <ButtonGhostBookADemo />
      <LinkENotaryWaitlist />
    </div>
  );
}

function CtaInner() {
  return (
    <div className="content-stretch flex flex-col gap-[28px] items-center justify-center overflow-clip relative shrink-0" data-name="CTA / Inner">
      <TrustBadgesRow />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[56px] relative shrink-0 text-[48px] text-center text-white whitespace-nowrap">Start with secure eSignature today</p>
      <div className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[#9ca3af] text-[18px] text-center whitespace-nowrap">
        <p className="leading-[28px] mb-0">Create a LAGDA account to send documents, verify signer activity,</p>
        <p className="leading-[28px]">and build your organization’s digital legal-document workflow.</p>
      </div>
      <CtaRow1 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-70 relative shrink-0 text-[#9ca3af] text-[12px] text-center whitespace-nowrap">LAGDA eSignature is available now. · LAGDA eNotary is coming soon and subject to accreditation.</p>
    </div>
  );
}

function CtaSection() {
  return (
    <div className="bg-gradient-to-b from-[#07111f] h-[560px] relative shrink-0 to-[#0b2344] w-full" data-name="CTA Section">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center px-[160px] py-[96px] relative size-full">
          <div className="absolute h-[360px] left-[320px] top-[100px] w-[800px]" data-name="Glow / Azure Radial">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 360">
              <ellipse cx="400" cy="180" fill="url(#paint0_radial_1_3545)" id="Glow / Azure Radial" rx="400" ry="180" />
              <defs>
                <radialGradient cx="0" cy="0" gradientTransform="scale(800 360)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_3545" r="1">
                  <stop stopColor="#0078D4" stopOpacity="0.2" />
                  <stop offset="1" stopColor="#0078D4" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <CtaInner />
        </div>
      </div>
    </div>
  );
}

function Frame37() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[24px] text-white whitespace-nowrap">LAGDA</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal min-w-full relative shrink-0 text-[14px] text-[rgba(255,255,255,0.5)] w-[min-content]">{`The Philippines' leading infrastructure for secure, compliant, and modern document execution.`}</p>
    </div>
  );
}

function Frame40() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)]" data-name="Frame">
      <p className="relative shrink-0">Link 1</p>
      <p className="relative shrink-0">Link 2</p>
      <p className="relative shrink-0">Link 3</p>
    </div>
  );
}

function Frame39() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px] uppercase">Product</p>
      <Frame40 />
    </div>
  );
}

function Frame42() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)]" data-name="Frame">
      <p className="relative shrink-0">Link 1</p>
      <p className="relative shrink-0">Link 2</p>
      <p className="relative shrink-0">Link 3</p>
    </div>
  );
}

function Frame41() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px] uppercase">Security</p>
      <Frame42 />
    </div>
  );
}

function Frame44() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)]" data-name="Frame">
      <p className="relative shrink-0">Link 1</p>
      <p className="relative shrink-0">Link 2</p>
      <p className="relative shrink-0">Link 3</p>
    </div>
  );
}

function Frame43() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px] uppercase">Legal</p>
      <Frame44 />
    </div>
  );
}

function Frame46() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[14px] text-[rgba(255,255,255,0.8)]" data-name="Frame">
      <p className="relative shrink-0">Link 1</p>
      <p className="relative shrink-0">Link 2</p>
      <p className="relative shrink-0">Link 3</p>
    </div>
  );
}

function Frame45() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist_Mono:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[12px] uppercase">Company</p>
      <Frame46 />
    </div>
  );
}

function Frame38() {
  return (
    <div className="content-stretch flex gap-[80px] items-start relative shrink-0 whitespace-nowrap" data-name="Frame">
      <Frame39 />
      <Frame41 />
      <Frame43 />
      <Frame45 />
    </div>
  );
}

function Frame36() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-start justify-between leading-[normal] relative shrink-0 w-full" data-name="Frame">
      <Frame37 />
      <Frame38 />
    </div>
  );
}

function Frame47() {
  return (
    <div className="content-stretch flex items-start justify-between pt-[40px] relative shrink-0 w-full" data-name="Frame">
      <div aria-hidden className="absolute border-[rgba(255,255,255,0.13)] border-solid border-t inset-0 pointer-events-none" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[12px] text-[rgba(255,255,255,0.5)] whitespace-nowrap">© 2025 LAGDA by UpUp Technologies. All rights reserved.</p>
      <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#b01262] text-[12px] whitespace-nowrap">LAGDA status: Waiting for Accreditation</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#0b2344] relative shrink-0 w-full" data-name="Footer">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[60px] items-start px-[80px] py-[60px] relative size-full">
          <Frame36 />
          <Frame47 />
        </div>
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

function Spacer4() {
  return <div className="flex-[1_0_0] h-px min-w-px relative" data-name="spacer" />;
}

function TabFeatures() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center justify-center relative shrink-0" data-name="tab-features">
      <p className="[word-break:break-word] font-['Geist:SemiBold','Noto_Sans_Symbols2:Regular',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Features ▾</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[68px]" data-name="underline" />
    </div>
  );
}

function TabSolutions() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="tab-Solutions">
      <p className="[word-break:break-word] font-['Geist:Medium','Noto_Sans_Symbols2:Regular',sans-serif] font-medium leading-[normal] relative shrink-0 text-[#334155] text-[14px] whitespace-nowrap">Solutions ▾</p>
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

function Spacer5() {
  return <div className="flex-[1_0_0] h-px min-w-px relative" data-name="spacer" />;
}

function ArrowRight8() {
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
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Started</p>
      <ArrowRight8 />
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
    <div className="absolute content-stretch flex h-[80px] items-center left-0 px-[80px] top-0 w-[1440px]" data-name="navbar">
      <Brand />
      <Spacer4 />
      <NavTabs />
      <Spacer5 />
      <NavActions />
    </div>
  );
}

export default function DLagdaSecurityOverview() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-start relative size-full" data-name="d-lagda-security-overview">
      <HeroSecurityTrust />
      <TrustBadgesSection />
      <SecurityFeaturesSection />
      <TrustArchitectureNew />
      <IdentityVerification />
      <AuditTrailSection />
      <ComplianceStandardsSection />
      <LagdaENotaryComingSoon />
      <CtaSection />
      <Footer />
      <Navbar />
    </div>
  );
}