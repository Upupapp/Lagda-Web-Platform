import svgPaths from "./svg-961250sovb";

function CtaPrimary() {
  return (
    <div className="bg-[#0078d4] content-stretch flex h-[52px] items-center justify-center px-[28px] relative rounded-[10px] shrink-0 w-[260px]" data-name="cta-primary">
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[15px] text-center text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function CtaSecondary() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex h-[52px] items-center justify-center px-[24px] relative rounded-[10px] shrink-0 w-[148px]" data-name="cta-secondary">
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] text-center text-white whitespace-nowrap">Book a Demo</p>
    </div>
  );
}

function CtaRow() {
  return (
    <div className="absolute content-stretch flex gap-[12px] items-center left-0 top-[301px]" data-name="cta-row">
      <CtaPrimary />
      <CtaSecondary />
    </div>
  );
}

function QuickSendADocument() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center px-[10px] py-[6px] relative rounded-[18px] shrink-0" data-name="quick-Send a Document">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.6)] border-solid inset-0 pointer-events-none rounded-[18px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Send a Document</p>
    </div>
  );
}

function QuickVerifyASigner() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center px-[10px] py-[6px] relative rounded-[18px] shrink-0" data-name="quick-Verify a Signer">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.6)] border-solid inset-0 pointer-events-none rounded-[18px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Verify a Signer</p>
    </div>
  );
}

function QuickViewAuditTrail() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center px-[10px] py-[6px] relative rounded-[18px] shrink-0" data-name="quick-View Audit Trail">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.6)] border-solid inset-0 pointer-events-none rounded-[18px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">View Audit Trail</p>
    </div>
  );
}

function QuickVerifyADocument() {
  return (
    <div className="bg-[rgba(0,120,212,0.1)] content-stretch flex items-center px-[10px] py-[6px] relative rounded-[18px] shrink-0" data-name="quick-Verify a Document">
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.6)] border-solid inset-0 pointer-events-none rounded-[18px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Verify a Document</p>
    </div>
  );
}

function QuickJoinENotaryWaitlist() {
  return (
    <div className="bg-[rgba(103,2,59,0.1)] content-stretch flex items-center px-[10px] py-[6px] relative rounded-[18px] shrink-0" data-name="quick-Join eNotary Waitlist">
      <div aria-hidden className="absolute border border-[rgba(176,18,98,0.6)] border-solid inset-0 pointer-events-none rounded-[18px]" />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#ffb4c8] text-[12px] whitespace-nowrap">Join LAGDA Waitlist</p>
    </div>
  );
}

function QuickActionStrip() {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center left-0 top-[481px]" data-name="quick-action-strip">
      <QuickSendADocument />
      <QuickVerifyASigner />
      <QuickViewAuditTrail />
      <QuickVerifyADocument />
      <QuickJoinENotaryWaitlist />
    </div>
  );
}

function HeroLeft() {
  return (
    <div className="absolute h-[541px] left-[64px] top-[170px] w-[620px]" data-name="hero-left">
      <div className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[0] left-[-2px] text-[52px] text-white top-0 w-[580px]">
        <p className="leading-[normal] mb-0">Sign legal documents</p>
        <p className="leading-[normal]">online with LAGDA.</p>
      </div>
      <div className="[word-break:break-word] absolute font-['Geist:SemiBold',sans-serif] font-semibold leading-[0] left-0 text-[#38bdf8] text-[22px] top-[148px] w-[580px]">
        <p className="leading-[normal] mb-0">Digital signatures today.</p>
        <p className="leading-[normal]">Electronic notarization tomorrow.</p>
      </div>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-0 text-[#e5e7eb] text-[16px] top-[215px] w-[540px]">LAGDA eSignature is available now for secure online signing, verified workflows, and audit-ready records. LAGDA eNotary is coming soon and subject to Supreme Court accreditation.</p>
      <CtaRow />
      <p className="[word-break:break-word] absolute font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] left-0 text-[#67023b] text-[14px] top-[421px] w-[300px]">Join LAGDA eNotary Waitlist →</p>
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-0 text-[#94a3b8] text-[12px] top-[447px] w-[540px]">LAGDA eNotary features are subject to Supreme Court accreditation. Not yet available.</p>
      <QuickActionStrip />
    </div>
  );
}

function BadgeESignatureAvailableNow() {
  return (
    <div className="bg-[#0078d4] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="badge-eSignature - Available Now">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">eSignature - Available Now</p>
    </div>
  );
}

function BadgePhilippineLegalWorkflows() {
  return (
    <div className="bg-[#0b2344] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="badge-Philippine Legal Workflows">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">Philippine Legal Workflows</p>
    </div>
  );
}

function BadgeENotaryComingSoon() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center px-[10px] py-[5px] relative rounded-[20px] shrink-0" data-name="badge-eNotary - Coming Soon">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[11px] text-white whitespace-nowrap">LAGDA - Coming Soon</p>
    </div>
  );
}

function ContextBadges() {
  return (
    <div className="absolute content-stretch flex gap-[8px] items-center left-[64px] top-[126px]" data-name="context-badges">
      <BadgeESignatureAvailableNow />
      <BadgePhilippineLegalWorkflows />
      <BadgeENotaryComingSoon />
    </div>
  );
}

function LagdaIcon() {
  return (
    <div className="bg-[#0078d4] content-stretch flex flex-col items-center justify-center relative rounded-[8px] shrink-0 size-[28px]" data-name="lagda-icon">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[12px] text-white whitespace-nowrap">L</p>
    </div>
  );
}

function Brand() {
  return (
    <div className="content-stretch flex gap-[8px] h-[28px] items-center relative shrink-0" data-name="brand">
      <LagdaIcon />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">LAGDA</p>
    </div>
  );
}

function Divider() {
  return <div className="bg-[rgba(255,255,255,0.08)] h-[20px] relative shrink-0 w-px" data-name="divider" />;
}

function WindowControls() {
  return (
    <div className="h-[12px] relative shrink-0 w-[48px]" data-name="window-controls">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 12">
        <g clipPath="url(#clip0_1_3520)" id="window-controls">
          <circle cx="6" cy="6" fill="var(--fill-0, #FF6666)" id="Ellipse" r="6" />
          <circle cx="24" cy="6" fill="var(--fill-0, #FFB200)" id="Ellipse_2" r="6" />
          <circle cx="42" cy="6" fill="var(--fill-0, #33CC33)" id="Ellipse_3" r="6" />
        </g>
        <defs>
          <clipPath id="clip0_1_3520">
            <rect fill="white" height="12" width="48" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function WindowControls1() {
  return (
    <div className="h-[12px] relative shrink-0 w-[48px]" data-name="window-controls">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 48 12">
        <g clipPath="url(#clip0_1_3520)" id="window-controls">
          <circle cx="6" cy="6" fill="var(--fill-0, #FF6666)" id="Ellipse" r="6" />
          <circle cx="24" cy="6" fill="var(--fill-0, #FFB200)" id="Ellipse_2" r="6" />
          <circle cx="42" cy="6" fill="var(--fill-0, #33CC33)" id="Ellipse_3" r="6" />
        </g>
        <defs>
          <clipPath id="clip0_1_3520">
            <rect fill="white" height="12" width="48" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function UrlBar() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[28px] relative rounded-[6px] shrink-0" data-name="url-bar">
      <div className="content-stretch flex items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist_Mono:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#94a3b8] text-[11px] whitespace-nowrap">app.lagda.ph/dashboard</p>
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0.3)] content-stretch flex gap-[8px] h-[48px] items-center left-[-1px] overflow-clip px-[20px] top-[-1px]" data-name="dashboard-header">
      <Brand />
      <Divider />
      <WindowControls />
      <WindowControls1 />
      <UrlBar />
    </div>
  );
}

function StatusChip() {
  return (
    <div className="bg-[rgba(52,211,153,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#34d399] text-[10px] whitespace-nowrap">Signed</p>
    </div>
  );
}

function DocRowDeedOfAbsoluteSaleReyes() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-Deed of Absolute Sale - Reyes">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">Deed of Absolute Sale - Reyes</p>
        <StatusChip />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function StatusChip1() {
  return (
    <div className="bg-[rgba(56,189,248,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[10px] whitespace-nowrap">Pending</p>
    </div>
  );
}

function DocRowContractOfLeaseDelaCruz() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-Contract of Lease - Dela Cruz">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">Contract of Lease - Dela Cruz</p>
        <StatusChip1 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function StatusChip2() {
  return (
    <div className="bg-[rgba(52,211,153,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#34d399] text-[10px] whitespace-nowrap">Verified</p>
    </div>
  );
}

function DocRowSpecialPowerOfAttorneyTan() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-Special Power of Attorney - Tan">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">Special Power of Attorney - Tan</p>
        <StatusChip2 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function StatusChip3() {
  return (
    <div className="bg-[rgba(56,189,248,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[10px] whitespace-nowrap">Sent</p>
    </div>
  );
}

function DocRowAffidavitOfLossSantos() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-Affidavit of Loss - Santos">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">Affidavit of Loss - Santos</p>
        <StatusChip3 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function StatusChip4() {
  return (
    <div className="bg-[rgba(148,163,184,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#94a3b8] text-[10px] whitespace-nowrap">Draft</p>
    </div>
  );
}

function DocRowLoanAgreementVillanueva() {
  return (
    <div className="bg-[rgba(255,255,255,0.05)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-Loan Agreement - Villanueva">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#dce6f0] text-[12px] whitespace-nowrap">Loan Agreement - Villanueva</p>
        <StatusChip4 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function StatusChip5() {
  return (
    <div className="bg-[rgba(176,18,98,0.15)] content-stretch flex h-[22px] items-center justify-center overflow-clip relative rounded-[11px] shrink-0" data-name="status-chip">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#b01262] text-[10px] whitespace-nowrap">Locked</p>
    </div>
  );
}

function DocRowENotarySessionComingSoon() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] h-[36px] relative rounded-[8px] shrink-0" data-name="doc-row-eNotary Session - Coming Soon">
      <div className="content-stretch flex items-center justify-between overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#b01262] text-[12px] whitespace-nowrap">LAGDA Session - Coming Soon</p>
        <StatusChip5 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.08)] border-solid inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function DashboardContent() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[12px] items-start left-[-1px] overflow-clip px-[20px] py-[16px] top-[47px] w-[580px]" data-name="dashboard-content">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[13px] text-white whitespace-nowrap">Recent Documents</p>
      <DocRowDeedOfAbsoluteSaleReyes />
      <DocRowContractOfLeaseDelaCruz />
      <DocRowSpecialPowerOfAttorneyTan />
      <DocRowAffidavitOfLossSantos />
      <DocRowLoanAgreementVillanueva />
      <DocRowENotarySessionComingSoon />
    </div>
  );
}

function LagdaDashboard() {
  return (
    <div className="absolute bg-[rgba(11,22,44,0.95)] border border-[rgba(255,255,255,0.12)] border-solid h-[460px] left-[40px] overflow-clip rounded-[16px] shadow-[0px_20px_60px_0px_rgba(0,120,212,0.2),0px_12px_28px_-8px_rgba(0,0,0,0.25)] top-[60px] w-[580px]" data-name="lagda-dashboard">
      <DashboardHeader />
      <DashboardContent />
    </div>
  );
}

function FloatingSendDocument() {
  return (
    <div className="absolute bg-[#0b2344] h-[40px] left-0 rounded-[10px] top-[60px]" data-name="floating-Send Document">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Send Document</p>
      </div>
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_16px_0px_rgba(0,120,212,0.3)]" />
    </div>
  );
}

function FloatingVerifySigner() {
  return (
    <div className="absolute bg-[#0b2344] h-[40px] left-[604px] rounded-[10px] top-[100px] w-[76px]" data-name="floating-Verify Signer">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Verify Signer</p>
      </div>
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_16px_0px_rgba(0,120,212,0.3)]" />
    </div>
  );
}

function FloatingTrackStatus() {
  return (
    <div className="absolute bg-[#0b2344] h-[40px] left-0 rounded-[10px] top-[220px]" data-name="floating-Track Status">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Track Status</p>
      </div>
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_16px_0px_rgba(0,120,212,0.3)]" />
    </div>
  );
}

function FloatingAuditTrail() {
  return (
    <div className="absolute bg-[#0b2344] h-[40px] left-[604px] rounded-[10px] top-[280px] w-[76px]" data-name="floating-Audit Trail">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] whitespace-nowrap">Audit Trail</p>
      </div>
      <div aria-hidden className="absolute border-[#0078d4] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_16px_0px_rgba(0,120,212,0.3)]" />
    </div>
  );
}

function FloatingENotaryComingSoon() {
  return (
    <div className="absolute bg-[#3c051e] h-[40px] left-[40px] rounded-[10px] top-[520px]" data-name="floating-eNotary - Coming Soon">
      <div className="content-stretch flex items-center justify-center overflow-clip px-[12px] relative rounded-[inherit] size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#ffb4c8] text-[12px] whitespace-nowrap">LAGDA - Coming Soon</p>
      </div>
      <div aria-hidden className="absolute border-[#b01262] border-[1.5px] border-solid inset-0 pointer-events-none rounded-[10px] shadow-[0px_4px_16px_0px_rgba(176,18,98,0.3)]" />
    </div>
  );
}

function HeroRight() {
  return (
    <div className="absolute h-[720px] left-[736px] top-[80px] w-[680px]" data-name="hero-right">
      <LagdaDashboard />
      <FloatingSendDocument />
      <FloatingVerifySigner />
      <FloatingTrackStatus />
      <FloatingAuditTrail />
      <FloatingENotaryComingSoon />
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-[#07111f] h-[723px] overflow-clip relative shrink-0 w-[1440px]" data-name="hero">
      <div className="absolute h-[600px] left-0 top-[-150px] w-[900px]" data-name="bg-glow-azure">
        <div className="absolute inset-[-20%_-13.33%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1140 840">
            <g filter="url(#filter0_f_1_3536)" id="bg-glow-azure">
              <ellipse cx="570" cy="420" fill="var(--fill-0, #0078D4)" fillOpacity="0.06" rx="450" ry="300" />
            </g>
            <defs>
              <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="840" id="filter0_f_1_3536" width="1140" x="0" y="0">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_1_3536" stdDeviation="60" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>
      <HeroLeft />
      <ContextBadges />
      <HeroRight />
    </div>
  );
}

function Globe() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="globe">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g clipPath="url(#clip0_1_3508)" id="globe">
          <path d={svgPaths.p16bd2100} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3508">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex gap-[12px] items-center px-[20px] py-[12px] relative rounded-[100px] shrink-0" data-name="badge-1">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <Globe />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] whitespace-nowrap">Philippine Legal Workflows</p>
      <div className="relative shrink-0 size-[4px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
          <circle cx="2" cy="2" fill="var(--fill-0, #67023B)" id="Ellipse" r="2" />
        </svg>
      </div>
    </div>
  );
}

function PenTool() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="pen-tool">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="pen-tool">
          <path d={svgPaths.p3af05100} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge1() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex gap-[12px] items-center px-[20px] py-[12px] relative rounded-[100px] shrink-0" data-name="badge-2">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <PenTool />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] whitespace-nowrap">eSignature-Ready</p>
      <div className="relative shrink-0 size-[4px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
          <circle cx="2" cy="2" fill="var(--fill-0, #67023B)" id="Ellipse" r="2" />
        </svg>
      </div>
    </div>
  );
}

function UserCheck() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="user-check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="user-check">
          <path d={svgPaths.p1653d300} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge2() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex gap-[12px] items-center px-[20px] py-[12px] relative rounded-[100px] shrink-0" data-name="badge-3">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <UserCheck />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] whitespace-nowrap">Identity-Aware Signing</p>
      <div className="relative shrink-0 size-[4px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
          <circle cx="2" cy="2" fill="var(--fill-0, #67023B)" id="Ellipse" r="2" />
        </svg>
      </div>
    </div>
  );
}

function FileText() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="file-text">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="file-text">
          <path d={svgPaths.p27efcb00} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge3() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex gap-[12px] items-center px-[20px] py-[12px] relative rounded-[100px] shrink-0" data-name="badge-4">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <FileText />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] whitespace-nowrap">{`Audit Trail & Verification`}</p>
      <div className="relative shrink-0 size-[4px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
          <circle cx="2" cy="2" fill="var(--fill-0, #67023B)" id="Ellipse" r="2" />
        </svg>
      </div>
    </div>
  );
}

function Shield() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="shield">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="shield">
          <path d={svgPaths.p6147300} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Badge4() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex gap-[12px] items-center px-[20px] py-[12px] relative rounded-[100px] shrink-0" data-name="badge-5">
      <div aria-hidden className="absolute border border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[100px]" />
      <Shield />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] whitespace-nowrap">LAGDA Roadmap</p>
      <div className="relative shrink-0 size-[4px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
          <circle cx="2" cy="2" fill="var(--fill-0, #67023B)" id="Ellipse" r="2" />
        </svg>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="bg-[#0d1b2e] content-stretch flex items-center justify-between px-[120px] py-[48px] relative shrink-0 w-[1440px]" data-name="trust-strip">
      <div aria-hidden className="absolute border-[#1e3a5f] border-b border-solid inset-0 pointer-events-none" />
      <Badge />
      <Badge1 />
      <Badge2 />
      <Badge3 />
      <Badge4 />
    </div>
  );
}

function Header() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center leading-[normal] relative shrink-0 w-[800px]" data-name="header">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[#38bdf8] text-[14px] uppercase whitespace-nowrap">The Challenge</p>
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold min-w-full relative shrink-0 text-[48px] text-center text-white w-[min-content]">Paperwork still slows down legal and business transactions</p>
    </div>
  );
}

function AlertTriangle() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-triangle">
          <path d={svgPaths.p29d83900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <AlertTriangle />
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Manual Logistics</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-70 relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">Printing, signing, scanning, and emailing still waste significant operational hours and resources.</p>
    </div>
  );
}

function GlassCard() {
  return (
    <div className="backdrop-blur-[16px] bg-[#0d1b2e] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="glass-card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[24px] relative size-full">
          <Frame />
        </div>
      </div>
      <div aria-hidden className="absolute border border-[rgba(157,92,129,0.28)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function AlertTriangle1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-triangle">
          <path d={svgPaths.p29d83900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <AlertTriangle1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame3 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Siloed Audits</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-70 relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">Legal teams lack a unified, secure repository for document status, signing orders, and detailed audit trails.</p>
    </div>
  );
}

function GlassCard1() {
  return (
    <div className="backdrop-blur-[16px] bg-[#0d1b2e] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="glass-card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[24px] relative size-full">
          <Frame2 />
        </div>
      </div>
      <div aria-hidden className="absolute border border-[rgba(157,92,129,0.28)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Row() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="row-1">
      <GlassCard />
      <GlassCard1 />
    </div>
  );
}

function AlertTriangle2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-triangle">
          <path d={svgPaths.p29d83900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame5() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <AlertTriangle2 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame5 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Fragmented Verification</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-70 relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">Identity checks are fragmented across email, chat, and manual review, increasing fraud and compliance risk.</p>
    </div>
  );
}

function GlassCard2() {
  return (
    <div className="backdrop-blur-[16px] bg-[#0d1b2e] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="glass-card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[24px] relative size-full">
          <Frame4 />
        </div>
      </div>
      <div aria-hidden className="absolute border border-[rgba(157,92,129,0.28)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function AlertTriangle3() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="alert-triangle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-triangle">
          <path d={svgPaths.p29d83900} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center justify-center relative rounded-[8px] shrink-0 size-[40px]" data-name="Frame">
      <AlertTriangle3 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start relative shrink-0 w-full" data-name="Frame">
      <Frame7 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[16px] text-white w-[min-content]">Compliance Gaps</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[1.5] min-w-full opacity-70 relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">Electronic notarization is emerging but requires specialized, Supreme Court-accredited infrastructure.</p>
    </div>
  );
}

function GlassCard3() {
  return (
    <div className="backdrop-blur-[16px] bg-[#0d1b2e] flex-[1_0_0] min-w-px relative rounded-[16px]" data-name="glass-card">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start p-[24px] relative size-full">
          <Frame6 />
        </div>
      </div>
      <div aria-hidden className="absolute border border-[rgba(157,92,129,0.28)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function Row1() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-name="row-2">
      <GlassCard2 />
      <GlassCard3 />
    </div>
  );
}

function CardsGrid() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full" data-name="cards-grid">
      <Row />
      <Row1 />
    </div>
  );
}

function ChallengeSection() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[64px] items-center p-[120px] relative shrink-0 w-[1440px]" data-name="challenge-section">
      <Header />
      <CardsGrid />
    </div>
  );
}

function Pill() {
  return (
    <div className="bg-[rgba(56,189,248,0.2)] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="pill">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase whitespace-nowrap">How It Works</p>
    </div>
  );
}

function BridgeContent() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0" data-name="bridge-content">
      <div className="bg-[#38bdf8] h-px opacity-35 relative shrink-0 w-[120px]" data-name="left-rule" />
      <Pill />
      <div className="bg-[#38bdf8] h-px opacity-35 relative shrink-0 w-[120px]" data-name="right-rule" />
    </div>
  );
}

function HowItWorksBridge() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-center justify-center px-[120px] py-[40px] relative shrink-0 w-[1440px]" data-name="how-it-works-bridge">
      <BridgeContent />
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="[word-break:break-word] bg-[#07111f] content-stretch flex flex-col gap-[12px] items-center pt-[80px] px-[120px] relative shrink-0 text-center w-[1440px] whitespace-nowrap" data-name="section-header">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#38bdf8] text-[12px] uppercase">LAGDA TRUST WORKFLOW</p>
      <p className="font-['Geist:Bold',sans-serif] font-bold leading-[normal] max-w-[680px] relative shrink-0 text-[48px] text-white">From document upload to verified legal record.</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.5] max-w-[720px] relative shrink-0 text-[#e5e7eb] text-[16px]">LAGDA guides every document through a secure eSignature workflow today, while preparing the future LAGDA layer for accreditation-ready digital notarization.</p>
    </div>
  );
}

function BadgeAvailable() {
  return (
    <div className="bg-[#22c55e] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="badge-available">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[11px] text-white uppercase whitespace-nowrap">AVAILABLE NOW</p>
    </div>
  );
}

function LaneHeader() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="lane-header">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[18px] text-white whitespace-nowrap">LAGDA eSignature Workflow</p>
      <BadgeAvailable />
    </div>
  );
}

function Upload() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="upload">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="upload">
          <path d={svgPaths.p2ecbcb00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">1</p>
      <Upload />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-1">
      <Node />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Upload Document</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Add your PDF securely</p>
    </div>
  );
}

function Line() {
  return <div className="bg-[#0078d4] h-[2px] opacity-90 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-1">
      <Line />
    </div>
  );
}

function Users() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="users">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="users">
          <path d={svgPaths.pa7b9c80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node1() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">2</p>
      <Users />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-2">
      <Node1 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Add Signers</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Invite recipients and roles</p>
    </div>
  );
}

function Line1() {
  return <div className="bg-[#0078d4] h-[2px] opacity-90 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-2">
      <Line1 />
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

function Node2() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">3</p>
      <ShieldCheck />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-3">
      <Node2 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Verify Identity</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Email, OTP, optional ID</p>
    </div>
  );
}

function Line2() {
  return <div className="bg-[#0078d4] h-[2px] opacity-90 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-3">
      <Line2 />
    </div>
  );
}

function PenTool1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="pen-tool">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="pen-tool">
          <path d={svgPaths.p1fd5a800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node3() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">4</p>
      <PenTool1 />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-4">
      <Node3 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Sign Online</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Capture signer intent</p>
    </div>
  );
}

function Line3() {
  return <div className="bg-[#0078d4] h-[2px] opacity-90 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-4">
      <Line3 />
    </div>
  );
}

function Activity() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="activity">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="activity">
          <path d={svgPaths.p12703400} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node4() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">5</p>
      <Activity />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-5">
      <Node4 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Track Status</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Monitor every action</p>
    </div>
  );
}

function Line4() {
  return <div className="bg-[#0078d4] h-[2px] opacity-90 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-5">
      <Line4 />
    </div>
  );
}

function Database() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="database">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="database">
          <path d={svgPaths.p37d79c40} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node5() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_8px_rgba(56,189,248,0.4)] flex flex-col items-center justify-center relative rounded-[36px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-2 border-[#0078d4] border-solid inset-0 pointer-events-none rounded-[36px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#38bdf8] text-[11px] top-[10px] whitespace-nowrap">6</p>
      <Database />
      <div className="absolute bottom-[10px] right-[10px] size-[8px]" data-name="Ellipse">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 8">
          <circle cx="4" cy="4" fill="var(--fill-0, #22C55E)" id="Ellipse" r="4" />
        </svg>
      </div>
    </div>
  );
}

function Step5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="step-6">
      <Node5 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[13px] text-center text-white w-[min-content]">Secure Storage</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Save final records</p>
    </div>
  );
}

function StepsRow() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="steps-row">
      <Step />
      <Connector />
      <Step1 />
      <Connector1 />
      <Step2 />
      <Connector2 />
      <Step3 />
      <Connector3 />
      <Step4 />
      <Connector4 />
      <Step5 />
    </div>
  );
}

function Check() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="check">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="check">
          <path d={svgPaths.p221839c0} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function MiniCardA() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="mini-card-a">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Check />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Audit trail generated</p>
    </div>
  );
}

function Link() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="link">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_3496)" id="link">
          <path d={svgPaths.p33e4c380} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3496">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function MiniCardB() {
  return (
    <div className="bg-[#0b2344] content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[999px] shrink-0" data-name="mini-card-b">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[999px]" />
      <Link />
      <p className="[word-break:break-word] font-['Geist:Bold',sans-serif] font-bold leading-[normal] relative shrink-0 text-[#38bdf8] text-[11px] whitespace-nowrap">Verification link ready</p>
    </div>
  );
}

function MiniCardsRow() {
  return (
    <div className="content-stretch flex gap-[12px] items-start justify-center relative shrink-0 w-full" data-name="mini-cards-row">
      <MiniCardA />
      <MiniCardB />
    </div>
  );
}

function Layer() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0 w-full" data-name="layer-1">
      <LaneHeader />
      <StepsRow />
      <MiniCardsRow />
    </div>
  );
}

function Divider1() {
  return <div className="bg-[#1e3a5f] h-px relative shrink-0 w-full" data-name="divider-1" />;
}

function Divider2() {
  return <div className="bg-[#1e3a5f] h-px relative shrink-0 w-full" data-name="divider-2" />;
}

function BadgeComingSoon() {
  return (
    <div className="bg-[#67023b] content-stretch flex items-center px-[12px] py-[6px] relative rounded-[999px] shrink-0" data-name="badge-coming-soon">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[11px] text-white uppercase whitespace-nowrap">COMING SOON - SUBJECT TO ACCREDITATION</p>
    </div>
  );
}

function LaneHeader1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-name="lane-header">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#e5e7eb] text-[18px] whitespace-nowrap">Future LAGDA eNotary Layer</p>
      <BadgeComingSoon />
    </div>
  );
}

function Lock() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node6() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">1</p>
      <Lock />
    </div>
  );
}

function ComingSoonPill() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-1">
      <Node6 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Schedule Session</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future appointment flow</p>
      <ComingSoonPill />
    </div>
  );
}

function Line5() {
  return <div className="bg-[#67023b] h-[1.5px] opacity-50 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-1">
      <Line5 />
    </div>
  );
}

function Lock1() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node7() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">2</p>
      <Lock1 />
    </div>
  );
}

function ComingSoonPill1() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-2">
      <Node7 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Video Appearance</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future secure session</p>
      <ComingSoonPill1 />
    </div>
  );
}

function Line6() {
  return <div className="bg-[#67023b] h-[1.5px] opacity-50 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-2">
      <Line6 />
    </div>
  );
}

function Lock2() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node8() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">3</p>
      <Lock2 />
    </div>
  );
}

function ComingSoonPill2() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-3">
      <Node8 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Electronic Notarial Book</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future electronic record</p>
      <ComingSoonPill2 />
    </div>
  );
}

function Line7() {
  return <div className="bg-[#67023b] h-[1.5px] opacity-50 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-3">
      <Line7 />
    </div>
  );
}

function Lock3() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node9() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">4</p>
      <Lock3 />
    </div>
  );
}

function ComingSoonPill3() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-4">
      <Node9 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Digital Seal</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future notarial certificate</p>
      <ComingSoonPill3 />
    </div>
  );
}

function Line8() {
  return <div className="bg-[#67023b] h-[1.5px] opacity-50 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector8() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-4">
      <Line8 />
    </div>
  );
}

function Lock4() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node10() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">5</p>
      <Lock4 />
    </div>
  );
}

function ComingSoonPill4() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-5">
      <Node10 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Evidence Package</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future session evidence</p>
      <ComingSoonPill4 />
    </div>
  );
}

function Line9() {
  return <div className="bg-[#67023b] h-[1.5px] opacity-50 relative rounded-[1px] shrink-0 w-full" data-name="line" />;
}

function Connector9() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col h-[72px] items-start justify-center min-w-px relative" data-name="connector-5">
      <Line9 />
    </div>
  );
}

function Lock5() {
  return (
    <div className="relative shrink-0 size-[22px]" data-name="lock">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22 22">
        <g id="lock">
          <path d={svgPaths.p1e8f2a80} id="Vector" stroke="var(--stroke-0, #67023B)" strokeLinecap="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Node11() {
  return (
    <div className="bg-[#0b2344] content-stretch drop-shadow-[0px_0px_6px_rgba(103,2,59,0.3)] flex flex-col items-center justify-center relative rounded-[12px] shrink-0 size-[72px]" data-name="node">
      <div aria-hidden className="absolute border-[#67023b] border-[1.5px] border-dashed inset-0 pointer-events-none rounded-[12px]" />
      <p className="[word-break:break-word] absolute font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] left-[10px] text-[#b01262] text-[11px] top-[10px] whitespace-nowrap">6</p>
      <Lock5 />
    </div>
  );
}

function ComingSoonPill5() {
  return (
    <div className="bg-[rgba(103,2,59,0.2)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[999px] shrink-0" data-name="coming-soon-pill">
      <p className="[word-break:break-word] font-['Geist:ExtraBold',sans-serif] font-extrabold leading-[normal] relative shrink-0 text-[#67023b] text-[9px] whitespace-nowrap">Coming Soon</p>
    </div>
  );
}

function RoadmapStep5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[10px] items-center min-w-px relative" data-name="roadmap-step-6">
      <Node11 />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#e5e7eb] text-[13px] text-center w-[min-content]">Supreme Court Report</p>
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#94a3b8] text-[11px] text-center w-[min-content]">Future compliance reporting</p>
      <ComingSoonPill5 />
    </div>
  );
}

function RoadmapRow() {
  return (
    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full" data-name="roadmap-row">
      <RoadmapStep />
      <Connector5 />
      <RoadmapStep1 />
      <Connector6 />
      <RoadmapStep2 />
      <Connector7 />
      <RoadmapStep3 />
      <Connector8 />
      <RoadmapStep4 />
      <Connector9 />
      <RoadmapStep5 />
    </div>
  );
}

function Layer1() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start opacity-50 relative shrink-0 w-full" data-name="layer-2">
      <LaneHeader1 />
      <RoadmapRow />
    </div>
  );
}

function Sparkles() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="sparkles">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_3490)" id="sparkles">
          <path d={svgPaths.p39ddd080} id="Vector" stroke="var(--stroke-0, #38BDF8)" strokeLinecap="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_3490">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function MotionAnnotation() {
  return (
    <div className="bg-[#0b2344] relative rounded-[12px] shrink-0 w-full" data-name="motion-annotation">
      <div aria-hidden className="absolute border border-[#38bdf8] border-solid inset-0 pointer-events-none rounded-[12px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[10px] items-center px-[12px] py-[10px] relative size-full">
          <Sparkles />
          <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:Regular',sans-serif] font-normal leading-[normal] min-w-px relative text-[#94a3b8] text-[11px]">↓ Motion: eSignature line draws 700-900ms → steps activate with 120ms stagger → LAGDA fades in → lock icons pulse once (300ms)</p>
        </div>
      </div>
    </div>
  );
}

function TrustEngineContainer() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[32px] items-start pb-[80px] px-[120px] relative shrink-0 w-[1440px]" data-name="trust-engine-container">
      <Layer />
      <Divider1 />
      <Divider2 />
      <Layer1 />
      <MotionAnnotation />
    </div>
  );
}

function Frame9() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[16px] items-center leading-[normal] relative shrink-0 text-center w-full" data-name="Frame">
      <p className="font-['Geist:ExtraBold',sans-serif] font-extrabold min-w-full relative shrink-0 text-[56px] text-white w-[min-content]">Start with eSignature today</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal opacity-70 relative shrink-0 text-[#e5e7eb] text-[18px] w-[640px]">Create an account, send your first document, and prepare your team for the future of digital legal workflows.</p>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.25)] flex items-center justify-center px-[32px] py-[16px] relative rounded-[8px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">Create Free LAGDA Account</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[rgba(0,0,0,0)] content-stretch flex items-center justify-center px-[32px] py-[16px] relative rounded-[8px] shrink-0" data-name="button">
      <div aria-hidden className="absolute border border-[rgba(255,255,255,0.13)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[16px] text-white whitespace-nowrap">See Business Plans</p>
    </div>
  );
}

function Frame11() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="Frame">
      <Button />
      <Button1 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-center relative shrink-0" data-name="Frame">
      <Frame11 />
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[normal] opacity-50 relative shrink-0 text-[#e5e7eb] text-[12px] whitespace-nowrap">No credit card required for the free account.</p>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-center relative shrink-0 w-full" data-name="Frame">
      <Frame9 />
      <Frame10 />
    </div>
  );
}

function GlassCard4() {
  return (
    <div className="backdrop-blur-[16px] bg-[rgba(11,35,68,0.85)] relative rounded-[16px] shrink-0 w-[800px]" data-name="glass-card">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[64px] relative rounded-[inherit] size-full">
        <Frame8 />
      </div>
      <div aria-hidden className="absolute border border-[rgba(0,120,212,0.3)] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}

function CtaSection() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-center px-[120px] py-[100px] relative shrink-0 w-[1440px]" data-name="cta-section">
      <GlassCard4 />
    </div>
  );
}

function Logo() {
  return (
    <div className="content-stretch flex flex-col gap-[2px] items-start leading-[normal] relative shrink-0 whitespace-nowrap" data-name="logo">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-[28px] text-white">LAGDA</p>
      <p className="font-['Geist:Regular',sans-serif] font-normal opacity-60 relative shrink-0 text-[#e5e7eb] text-[13px] uppercase">by LAGDA</p>
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-[300px]" data-name="Frame">
      <Logo />
      <p className="font-['Geist:Regular',sans-serif] font-normal leading-[1.6] min-w-full opacity-60 relative shrink-0 text-[#e5e7eb] text-[14px] w-[min-content]">Philippine legal-tech infrastructure building the future of digital identity and electronic notarization.</p>
    </div>
  );
}

function Frame16() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[#e5e7eb]" data-name="Frame">
      <p className="opacity-60 relative shrink-0">eSignature</p>
      <p className="opacity-60 relative shrink-0">LAGDA</p>
      <p className="opacity-60 relative shrink-0">API</p>
      <p className="opacity-60 relative shrink-0">Mobile App</p>
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Product</p>
      <Frame16 />
    </div>
  );
}

function Frame18() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[#e5e7eb]" data-name="Frame">
      <p className="opacity-60 relative shrink-0">Legal Firms</p>
      <p className="opacity-60 relative shrink-0">Real Estate</p>
      <p className="opacity-60 relative shrink-0">Banking</p>
      <p className="opacity-60 relative shrink-0">HR Teams</p>
    </div>
  );
}

function Frame17() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Solutions</p>
      <Frame18 />
    </div>
  );
}

function Frame20() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[#e5e7eb]" data-name="Frame">
      <p className="opacity-60 relative shrink-0">Data Sovereignty</p>
      <p className="opacity-60 relative shrink-0">Encryption</p>
      <p className="opacity-60 relative shrink-0">Identity</p>
      <p className="opacity-60 relative shrink-0">Accreditation</p>
    </div>
  );
}

function Frame19() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Security</p>
      <Frame20 />
    </div>
  );
}

function Frame22() {
  return (
    <div className="content-stretch flex flex-col font-['Geist:Regular',sans-serif] font-normal gap-[8px] items-start relative shrink-0 text-[#e5e7eb]" data-name="Frame">
      <p className="opacity-60 relative shrink-0">About LAGDA</p>
      <p className="opacity-60 relative shrink-0">Careers</p>
      <p className="opacity-60 relative shrink-0">Press</p>
      <p className="opacity-60 relative shrink-0">Contact</p>
    </div>
  );
}

function Frame21() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0" data-name="Frame">
      <p className="font-['Geist:Bold',sans-serif] font-bold relative shrink-0 text-white uppercase">Company</p>
      <Frame22 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex gap-[80px] items-start leading-[normal] relative shrink-0 text-[13px] whitespace-nowrap" data-name="Frame">
      <Frame15 />
      <Frame17 />
      <Frame19 />
      <Frame21 />
    </div>
  );
}

function Frame12() {
  return (
    <div className="[word-break:break-word] content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Frame">
      <Frame13 />
      <Frame14 />
    </div>
  );
}

function Frame25() {
  return (
    <div className="content-stretch flex gap-[24px] items-start relative shrink-0" data-name="Frame">
      <p className="opacity-40 relative shrink-0">Terms of Service</p>
      <p className="opacity-40 relative shrink-0">Privacy Policy</p>
      <p className="opacity-40 relative shrink-0">Cookie Policy</p>
    </div>
  );
}

function Frame24() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Geist:Regular',sans-serif] font-normal items-center justify-between leading-[normal] relative shrink-0 text-[#e5e7eb] text-[14px] w-full whitespace-nowrap" data-name="Frame">
      <p className="opacity-40 relative shrink-0">© 2026 LAGDA. All rights reserved.</p>
      <Frame25 />
    </div>
  );
}

function Frame23() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start relative shrink-0 w-full" data-name="Frame">
      <div className="h-0 relative shrink-0 w-full" data-name="Line">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1200 1">
            <line id="Line" opacity="0.1" stroke="var(--stroke-0, white)" x2="1200" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
      <Frame24 />
    </div>
  );
}

function Footer() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col gap-[64px] items-start pb-[40px] pt-[80px] px-[120px] relative shrink-0 w-[1440px]" data-name="footer">
      <Frame12 />
      <Frame23 />
    </div>
  );
}

function ShieldCheck1() {
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
      <ShieldCheck1 />
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

function Brand1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="brand">
      <ShieldIcon />
      <BrandText />
    </div>
  );
}

function Spacer() {
  return <div className="flex-[1_0_0] h-px min-w-px relative" data-name="spacer" />;
}

function TabFeatures() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center justify-center relative shrink-0" data-name="tab-features">
      <p className="[word-break:break-word] font-['Geist:SemiBold','Noto_Sans:SemiBold','Noto_Sans_Math:Regular','Noto_Sans_Symbols:SemiBold','Noto_Sans_Symbols2:Regular',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#0078d4] text-[14px] whitespace-nowrap">Features ▾</p>
      <div className="bg-[#0078d4] h-[2px] relative rounded-[1px] shrink-0 w-[68px]" data-name="underline" />
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

function Spacer1() {
  return <div className="flex-[1_0_0] h-px min-w-px relative" data-name="spacer" />;
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

function Button2() {
  return (
    <div className="bg-[#0078d4] content-stretch drop-shadow-[0px_4px_6px_rgba(0,120,212,0.2)] flex gap-[10px] items-center justify-center px-[24px] py-[12px] relative rounded-[8px] shrink-0" data-name="button">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Get Started</p>
      <ArrowRight />
    </div>
  );
}

function NavActions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0" data-name="nav-actions">
      <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[14px] text-white whitespace-nowrap">Sign In</p>
      <Button2 />
    </div>
  );
}

function Navbar() {
  return (
    <div className="absolute content-stretch flex h-[80px] items-center left-0 px-[80px] top-0 w-[1440px]" data-name="navbar">
      <Brand1 />
      <Spacer />
      <NavTabs />
      <Spacer1 />
      <NavActions />
    </div>
  );
}

export default function DLagdaSecurityTrustCenter() {
  return (
    <div className="bg-[#07111f] content-stretch flex flex-col items-center relative size-full" data-name="d-lagda-security-trust-center">
      <Hero />
      <TrustStrip />
      <ChallengeSection />
      <HowItWorksBridge />
      <SectionHeader />
      <TrustEngineContainer />
      <CtaSection />
      <Footer />
      <Navbar />
    </div>
  );
}