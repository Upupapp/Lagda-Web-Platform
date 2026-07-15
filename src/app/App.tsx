import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";

// ── URL ↔ State synchronization ───────────────────────────────────────────────
//
// Maps between browser URL paths and App's internal (section, tab) state.
// This is the only coupling between the router and the existing state machine.
// All existing navigation callbacks, dropdown behavior, and animations are
// unchanged — the URL is just kept in sync as a side effect.

type UrlState = {
  section: Section;
  esigTab?: EsigTab;
  securityTab?: SecurityTab;
  pricingTab?: PricingTab;
  resourcesTab?: ResourcesTab;
  solutionsTab?: SolutionsTab;
};

function pathToState(pathname: string): UrlState | null {
  const p = pathname.replace(/\/$/, "") || "/esignature";
  if (p === "/esignature" || p === "/")      return { section: "esignature", esigTab: "overview" };
  if (p === "/esignature/core-workflow")     return { section: "esignature", esigTab: "core-workflow" };
  if (p === "/esignature/verification-and-audit") return { section: "esignature", esigTab: "verification-audit" };
  if (p === "/esignature/advanced-capabilities")  return { section: "esignature", esigTab: "advanced-capabilities" };
  if (p === "/esignature/templates-and-branding") return { section: "esignature", esigTab: "templates-branding" };
  if (p === "/esignature/team-and-enterprise")    return { section: "esignature", esigTab: "team-enterprise" };
  if (p === "/security" || p === "/security/security-overview") return { section: "security", securityTab: "security-overview" };
  if (p === "/security/trust-center")        return { section: "security", securityTab: "trust-center" };
  if (p === "/solutions")                    return { section: "solutions", solutionsTab: "all" };
  if (p === "/solutions/lawyers")            return { section: "solutions", solutionsTab: "lawyers" };
  if (p === "/pricing")                      return { section: "pricing", pricingTab: "pricing-main" };
  if (p === "/pricing/compare")              return { section: "pricing", pricingTab: "compare-plans" };
  if (p === "/resources" || p === "/resources/guides") return { section: "resources", resourcesTab: "guides" };
  if (p === "/resources/faq")                return { section: "resources", resourcesTab: "faq" };
  return null;
}

function stateToPath(
  section: Section,
  esigTab: EsigTab,
  securityTab: SecurityTab,
  pricingTab: PricingTab,
  resourcesTab: ResourcesTab,
  solutionsTab: SolutionsTab
): string {
  if (section === "esignature") {
    if (esigTab === "overview")                  return "/esignature";
    if (esigTab === "core-workflow")             return "/esignature/core-workflow";
    if (esigTab === "verification-audit")        return "/esignature/verification-and-audit";
    if (esigTab === "advanced-capabilities")     return "/esignature/advanced-capabilities";
    if (esigTab === "templates-branding")        return "/esignature/templates-and-branding";
    if (esigTab === "team-enterprise")           return "/esignature/team-and-enterprise";
  }
  if (section === "security") {
    if (securityTab === "security-overview")     return "/security";
    if (securityTab === "trust-center")          return "/security/trust-center";
  }
  if (section === "solutions") {
    if (solutionsTab === "all")                  return "/solutions";
    if (solutionsTab === "lawyers")              return "/solutions/lawyers";
  }
  if (section === "pricing") {
    if (pricingTab === "pricing-main")           return "/pricing";
    if (pricingTab === "compare-plans")          return "/pricing/compare";
  }
  if (section === "resources") {
    if (resourcesTab === "guides")               return "/resources";
    if (resourcesTab === "faq")                  return "/resources/faq";
  }
  return "/esignature";
}

// Derive initial state from the current URL (avoids state→URL effect
// firing with defaults before URL→state effect can correct them).
function initialStateFromUrl(): {
  section: Section;
  esigTab: EsigTab;
  securityTab: SecurityTab;
  pricingTab: PricingTab;
  resourcesTab: ResourcesTab;
  solutionsTab: SolutionsTab;
} {
  const parsed = pathToState(window.location.pathname);
  return {
    section:      (parsed?.section      ?? "esignature") as Section,
    esigTab:      (parsed?.esigTab      ?? "overview")   as EsigTab,
    securityTab:  (parsed?.securityTab  ?? "security-overview") as SecurityTab,
    pricingTab:   (parsed?.pricingTab   ?? "pricing-main") as PricingTab,
    resourcesTab: (parsed?.resourcesTab ?? "guides")     as ResourcesTab,
    solutionsTab: (parsed?.solutionsTab ?? "all")        as SolutionsTab,
  };
}

// ─── Haptic feedback — mobile only, silently skipped on desktop ───────────────
function haptic(type: "light" | "selection" | "success" | "warning" | "error") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return;
  const patterns: Record<string, number[]> = {
    light:     [8],
    selection: [12],
    success:   [8, 40, 8],
    warning:   [25, 15, 25],
    error:     [40, 20, 40],
  };
  navigator.vibrate(patterns[type] ?? [10]);
}
import DLagdaEsignatureOverview from "@/imports/DLagdaEsignatureOverview/index";
import DLagdaEsignatureCoreWorkflow from "@/imports/DLagdaEsignatureCoreWorkflow/index";
import DLagdaEsignatureVerificationAudit from "@/imports/DLagdaEsignatureVerificationAudit/index";
import DLagdaEsignatureAdvancedCapabilities from "@/imports/DLagdaEsignatureAdvancedCapabilities/index";
import DLagdaEsignatureTemplatesBranding from "@/imports/DLagdaEsignatureTemplatesBranding/index";
import DLagdaEsignatureTeamEnterprise from "@/imports/DLagdaEsignatureTeamEnterprise/index";
import DLagdaSecurityOverview from "@/imports/DLagdaSecurityOverview/index";
import DLagdaSecurityTrustCenter from "@/imports/DLagdaSecurityTrustCenter/index";
import DLagdaSolutionsAll from "@/imports/DLagdaSolutionsAll/index";
import DLagdaPricingMainPage from "@/imports/DLagdaPricingMainPage/index";
import DLagdaPricingComparePlans from "@/imports/DLagdaPricingComparePlans/index";
import DLagdaResourcesGuides from "@/imports/DLagdaResourcesGuides/index";
import DLagdaResourcesFaq from "@/imports/DLagdaResourcesFaq/index";
import DLagdaSolutionsLawyers from "@/imports/DLagdaSolutionsLawyers/index";

type Section = "esignature" | "security" | "solutions" | "pricing" | "resources";
type EsigTab = "overview" | "core-workflow" | "verification-audit" | "advanced-capabilities" | "templates-branding" | "team-enterprise";
type SecurityTab = "security-overview" | "trust-center";
type PricingTab = "pricing-main" | "compare-plans";
type ResourcesTab = "guides" | "faq";
type SolutionsTab = "all" | "lawyers";

const SHIELD_PATH = "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

const ESIG_SUB_TABS: { id: EsigTab; label: string }[] = [
  { id: "core-workflow", label: "Core Workflow" },
  { id: "verification-audit", label: "Verification & Audit" },
  { id: "advanced-capabilities", label: "Advanced Capabilities" },
  { id: "templates-branding", label: "Templates & Branding" },
  { id: "team-enterprise", label: "Team & Enterprise" },
];

const SECURITY_SUB_TABS: { id: SecurityTab; label: string }[] = [
  { id: "security-overview", label: "Security Overview" },
  { id: "trust-center", label: "Trust Center" },
];

const PRICING_SUB_TABS: { id: PricingTab; label: string }[] = [
  { id: "pricing-main", label: "Pricing" },
  { id: "compare-plans", label: "Compare Plans" },
];

function Brand() {
  return (
    <div className="flex gap-[10px] items-center shrink-0">
      <div className="shrink-0 size-[40px] relative">
        <svg fill="none" viewBox="0 0 40 40" className="size-full">
          <rect fill="#0078D4" height="40" rx="8" width="40" />
          <path d={SHIELD_PATH} stroke="white" strokeWidth="2" />
        </svg>
      </div>
      <div className="flex flex-col items-start leading-none">
        <p className="font-extrabold text-[20px] text-white mb-[-2px] tracking-widest" style={{ fontFamily: "'Geist', sans-serif" }}>LAGDA</p>
        <p className="font-semibold text-[9px] text-[#0078d4] tracking-[0.2em]" style={{ fontFamily: "'Geist Mono', monospace" }}>BY UPUP TECHNOLOGIES</p>
      </div>
    </div>
  );
}

// ─── Nav dropdown data ─────────────────────────────────────────────────────
type DropdownItem = {
  label: string; desc: string; isComingSoon?: boolean;
  esigTabId?: EsigTab; securityTabId?: SecurityTab; pricingTabId?: PricingTab;
  resourcesTabId?: ResourcesTab; solutionsTabId?: SolutionsTab;
};
type DropdownDef = {
  title: string; desc: string; accent: "azure" | "burgundy";
  items: DropdownItem[]; cta: string; note?: string;
};
type NavDef = { id: string; label: string; section?: Section; badge?: string; dropdown?: DropdownDef };

const NAV_DEFS: NavDef[] = [
  {
    id: "esignature", label: "eSignature", section: "esignature",
    dropdown: {
      title: "LAGDA eSignature", desc: "Send, sign, track, and verify documents online.", accent: "azure",
      cta: "Explore eSignature",
      // Items mirror the page-level sub-nav tabs exactly
      items: [
        { label: "Core Workflow",          desc: "Prepare, send, verify, and sign documents.",             esigTabId: "core-workflow" },
        { label: "Verification & Audit",   desc: "Audit trails, QR verification, and signing records.",    esigTabId: "verification-audit" },
        { label: "Advanced Capabilities",  desc: "Parallel signing, storage, and advanced workflows.",     esigTabId: "advanced-capabilities" },
        { label: "Templates & Branding",   desc: "Reusable templates and company branding controls.",      esigTabId: "templates-branding" },
        { label: "Team & Enterprise",      desc: "Workspaces, roles, reports, and enterprise controls.",   esigTabId: "team-enterprise" },
      ],
    },
  },
  {
    id: "solutions", label: "Solutions", section: "solutions",
    dropdown: {
      title: "Solutions", desc: "Use LAGDA across legal, business, and institutional workflows.", accent: "azure",
      cta: "Find Your Use Case",
      items: [
        { label: "Lawyers", desc: "Individual legal practitioners and solo attorneys.", solutionsTabId: "lawyers" },
        { label: "Law Firms", desc: "Multi-lawyer practices and full-service firms." },
        { label: "Business Teams", desc: "Internal approvals, contracts, and HR documents." },
        { label: "Government / LGU", desc: "Official documents and public sector workflows." },
        { label: "Real Estate", desc: "Property contracts, deeds, and broker agreements." },
        { label: "HR & Recruitment", desc: "Employment contracts, NDAs, and onboarding." },
        { label: "Finance", desc: "Loan agreements, term sheets, and compliance docs." },
        { label: "Procurement", desc: "Supplier contracts and purchase agreements." },
      ],
    },
  },
  {
    id: "pricing", label: "Pricing", section: "pricing",
    dropdown: {
      title: "Pricing", desc: "Understand plans, limits, templates, storage, and enterprise options.", accent: "azure",
      cta: "View Pricing",
      note: "Personal starts free. Business is recommended for teams.",
      items: [
        { label: "Plans",            desc: "Personal, Professional, Business, Business Plus, Enterprise.", pricingTabId: "pricing-main" },
        { label: "Compare Plans",    desc: "Side-by-side feature and limit comparison.",                   pricingTabId: "compare-plans" },
        { label: "Signing Requests", desc: "How sending limits work across plans." },
        { label: "Storage Limits",   desc: "Document storage per plan tier." },
        { label: "Templates by Plan",desc: "Which templates are available on each plan." },
        { label: "Enterprise",       desc: "Custom pricing and dedicated onboarding." },
        { label: "FAQ",              desc: "Common questions about billing and limits." },
      ],
    },
  },
  {
    id: "security", label: "Security", section: "security",
    dropdown: {
      title: "Security & Trust", desc: "Understand identity, audit, verification, and document protection.", accent: "azure",
      cta: "Explore Security",
      items: [
        { label: "Security Overview",              desc: "High-level overview of the LAGDA security model.",      securityTabId: "security-overview" },
        { label: "Trust Center",                   desc: "Compliance posture, policies, and legal framework.",    securityTabId: "trust-center" },
        { label: "Identity Verification",          desc: "Know exactly who signed and how." },
        { label: "Audit Trail",                    desc: "Every action recorded with timestamp and evidence." },
        { label: "Document Verification",          desc: "Verify completed documents via QR or Verification ID." },
        { label: "IP / Device / Location Evidence",desc: "Signing evidence captured at each event." },
        { label: "Secure Storage",                 desc: "Encrypted document storage and retention." },
      ],
    },
  },
  {
    id: "resources", label: "Resources", section: "resources",
    dropdown: {
      title: "Resources", desc: "Guides, legal framework, FAQ, and support.", accent: "azure",
      cta: "Visit Resources",
      items: [
        { label: "Guides",             desc: "Step-by-step guides for every LAGDA workflow.",          resourcesTabId: "guides" },
        { label: "FAQ",                desc: "Answers to the most common LAGDA questions.",             resourcesTabId: "faq" },
        { label: "Legal Framework",    desc: "Philippine legal context for electronic signatures." },
        { label: "Document Verification", desc: "How to verify a signed LAGDA document." },
        { label: "Help Center",        desc: "Detailed product documentation and support." },
        { label: "Contact",            desc: "Reach the LAGDA team directly." },
      ],
    },
  },
  {
    id: "enotary", label: "eNotary", badge: "Coming Soon",
    dropdown: {
      title: "LAGDA eNotary", desc: "Future electronic notarization — subject to Supreme Court accreditation.", accent: "burgundy",
      cta: "Join Waitlist",
      items: [
        { label: "Overview", desc: "The future eNotary layer for Philippine legal documents.", isComingSoon: true },
        { label: "Future Features", desc: "Secure video, electronic notarial book, digital seals.", isComingSoon: true },
        { label: "Accreditation Roadmap", desc: "Milestones toward Supreme Court accreditation.", isComingSoon: true },
        { label: "Waitlist", desc: "Register interest for LAGDA eNotary when available.", isComingSoon: true },
        { label: "FAQ", desc: "Common questions about LAGDA eNotary and accreditation.", isComingSoon: true },
      ],
    },
  },
];

// Chevron icon
function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Mega dropdown panel
function MegaDropdown({ def, onItemClick, onCtaClick }: {
  def: DropdownDef;
  onItemClick: (item: DropdownItem) => void;
  onCtaClick: () => void;
}) {
  const isAzure = def.accent === "azure";
  const accentColor = isAzure ? "#0078d4" : "#67023b";
  const accentBg = isAzure ? "rgba(0,120,212,0.06)" : "rgba(103,2,59,0.06)";
  const accentBorder = isAzure ? "rgba(0,120,212,0.18)" : "rgba(103,2,59,0.25)";

  return (
    <div
      role="menu"
      style={{
        background: "rgba(10,20,36,0.97)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${accentBorder}`,
        borderRadius: "20px",
        padding: "24px",
        boxShadow: `0 24px 64px rgba(0,0,0,0.48), 0 0 0 1px ${accentBorder}`,
        minWidth: "720px",
        maxWidth: "880px",
        animation: "dropdownEnter 0.2s ease-out both",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ color: "white", fontFamily: "'Geist', sans-serif", fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>{def.title}</p>
            <p style={{ color: "#64748b", fontFamily: "'Geist', sans-serif", fontSize: "13px" }}>{def.desc}</p>
          </div>
          <button
            role="menuitem"
            onClick={onCtaClick}
            style={{
              background: accentColor, color: "white", border: "none", borderRadius: "8px",
              padding: "8px 16px", fontSize: "13px", fontWeight: 600, fontFamily: "'Geist', sans-serif",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              transition: "filter 0.15s ease, transform 0.15s ease",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.filter = "brightness(1.12)"; (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.filter = "brightness(1)"; (e.target as HTMLElement).style.transform = "translateY(0)"; }}
          >
            {def.cta} →
          </button>
        </div>
        {def.note && (
          <p style={{ color: "#94a3b8", fontFamily: "'Geist Mono', monospace", fontSize: "11px", marginTop: "8px" }}>
            {def.note}
          </p>
        )}
      </div>

      {/* Items grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px" }}>
        {def.items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            onClick={() => onItemClick(item)}
            style={{
              display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px",
              borderRadius: "10px", border: "none", background: "transparent",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = accentBg)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, marginTop: "7px",
              background: item.isComingSoon ? "#b01262" : accentColor,
            }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "white", fontFamily: "'Geist', sans-serif", fontSize: "13px", fontWeight: 600 }}>
                  {item.label}
                </span>
                {item.isComingSoon && (
                  <span style={{
                    background: "rgba(103,2,59,0.25)", color: "#fce7f3", border: "1px solid rgba(176,18,98,0.4)",
                    borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontWeight: 600,
                    fontFamily: "'Geist', sans-serif",
                  }}>Coming Soon</span>
                )}
              </div>
              <p style={{ color: "#64748b", fontFamily: "'Geist', sans-serif", fontSize: "12px", marginTop: "2px" }}>
                {item.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Mobile menu
function MobileMenu({ section, onNavigate, onClose }: {
  section: Section;
  onNavigate: (id: string, item?: DropdownItem) => void;
  onClose: () => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleSection = (id: string) => {
    haptic("selection");
    setOpenSection(prev => prev === id ? null : id);
  };

  const navDefs = NAV_DEFS.filter(n => n.id !== "home");

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(7,17,31,0.7)", zIndex: 998,
        backdropFilter: "blur(4px)", animation: "fadeIn 0.22s ease",
      }} aria-hidden />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)",
        background: "#07111f", zIndex: 999, overflowY: "auto",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.5)",
        animation: "slideInRight 0.25s ease-out",
      }}
        role="dialog" aria-modal="true" aria-label="Navigation menu"
      >
        {/* Top */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand />
          <button onClick={() => { haptic("selection"); onClose(); }} aria-label="Close menu"
            style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "8px", fontSize: "20px", lineHeight: 1 }}>✕</button>
        </div>
        {/* CTAs */}
        <div style={{ padding: "16px 24px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => { haptic("light"); onClose(); }}
            style={{ background: "#0078d4", color: "white", border: "none", borderRadius: "10px", padding: "14px 20px", fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>
            Create Free Account
          </button>
          <button onClick={() => { onClose(); }}
            style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "12px 20px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>
            Sign In
          </button>
        </div>
        {/* Accordion nav */}
        <div style={{ padding: "8px 0" }}>
          {navDefs.map((nav) => {
            const isOpen = openSection === nav.id;
            const isEnotary = nav.id === "enotary";
            const accentColor = isEnotary ? "#b01262" : "#0078d4";
            return (
              <div key={nav.id}>
                <button
                  onClick={() => nav.dropdown ? toggleSection(nav.id) : (() => { haptic("selection"); onNavigate(nav.id); onClose(); })()}
                  aria-expanded={nav.dropdown ? isOpen : undefined}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "14px 24px", background: "transparent", border: "none",
                    cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: "white", fontFamily: "'Geist', sans-serif", fontSize: "14px", fontWeight: 600 }}>
                      {nav.label}
                    </span>
                    {nav.badge && (
                      <span style={{ background: "rgba(103,2,59,0.3)", color: "#fce7f3", border: "1px solid rgba(176,18,98,0.4)", borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontWeight: 600, fontFamily: "'Geist', sans-serif" }}>
                        {nav.badge}
                      </span>
                    )}
                  </div>
                  {nav.dropdown && <Chevron open={isOpen} />}
                </button>
                {/* Accordion content */}
                {nav.dropdown && isOpen && (
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px 0 8px" }}>
                    {nav.dropdown.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { haptic("selection"); onNavigate(nav.id, item); onClose(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px", width: "100%",
                          padding: "11px 24px 11px 36px", background: "transparent", border: "none",
                          cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: item.isComingSoon ? "#b01262" : accentColor, flexShrink: 0 }} />
                        <span style={{ color: item.isComingSoon ? "#94a3b8" : "#e2e8f0", fontFamily: "'Geist', sans-serif", fontSize: "13px" }}>
                          {item.label}
                        </span>
                        {item.isComingSoon && (
                          <span style={{ color: "#b01262", fontFamily: "'Geist', sans-serif", fontSize: "11px" }}>Coming Soon</span>
                        )}
                      </button>
                    ))}
                    {/* CTA */}
                    <button
                      onClick={() => { haptic("light"); onNavigate(nav.id); onClose(); }}
                      style={{
                        margin: "8px 24px 0", padding: "10px 16px", background: isEnotary ? "rgba(103,2,59,0.25)" : "rgba(0,120,212,0.15)",
                        color: isEnotary ? "#fce7f3" : "#38bdf8", border: `1px solid ${isEnotary ? "rgba(176,18,98,0.3)" : "rgba(0,120,212,0.3)"}`,
                        borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif",
                        display: "block", width: "calc(100% - 48px)",
                      }}>
                      {nav.dropdown.cta} →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Bottom quick links */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
          <button onClick={() => { onClose(); }} style={{ background: "transparent", border: "none", color: "#64748b", fontFamily: "'Geist', sans-serif", fontSize: "13px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>📄 Verify Document</button>
          <button onClick={() => { onClose(); }} style={{ background: "transparent", border: "none", color: "#64748b", fontFamily: "'Geist', sans-serif", fontSize: "13px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>📅 Book a Demo</button>
          <button onClick={() => { onClose(); }} style={{ background: "transparent", border: "none", color: "#64748b", fontFamily: "'Geist', sans-serif", fontSize: "13px", cursor: "pointer", textAlign: "left", padding: "4px 0" }}>💼 Contact Sales</button>
          <div style={{ background: "rgba(103,2,59,0.15)", border: "1px solid rgba(176,18,98,0.25)", borderRadius: "8px", padding: "8px 12px", marginTop: "4px" }}>
            <p style={{ color: "#b01262", fontFamily: "'Geist Mono', monospace", fontSize: "10px", fontWeight: 600 }}>LAGDA eNotary status: Coming Soon — Subject to Supreme Court Accreditation</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Nav ──────────────────────────────────────────────────────────────────
function MainNav({ section, onSectionChange, onEsigTabChange, onSecurityTabChange, onPricingTabChange, onResourcesTabChange, onSolutionsTabChange, scrolled }: {
  section: Section;
  onSectionChange: (s: Section) => void;
  onEsigTabChange: (tab: EsigTab) => void;
  onSecurityTabChange: (tab: SecurityTab) => void;
  onPricingTabChange: (tab: PricingTab) => void;
  onResourcesTabChange: (tab: ResourcesTab) => void;
  onSolutionsTabChange: (tab: SolutionsTab) => void;
  scrolled: boolean;
}) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navRef = useRef<HTMLElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenDropdown(null); setMobileOpen(false); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close on route change
  useEffect(() => { setOpenDropdown(null); setMobileOpen(false); }, [section]);

  // Close on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  function startOpen(id: string) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpenDropdown(id), 420);
  }
  function startClose() {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 240);
  }
  function cancelClose() { clearTimeout(closeTimer.current); }

  function handleItemClick(nav: NavDef, item: DropdownItem) {
    setOpenDropdown(null);
    if (nav.section) onSectionChange(nav.section);
    if (item.esigTabId)      onEsigTabChange(item.esigTabId);
    if (item.securityTabId)  onSecurityTabChange(item.securityTabId);
    if (item.pricingTabId)   onPricingTabChange(item.pricingTabId);
    if (item.resourcesTabId)  onResourcesTabChange(item.resourcesTabId);
    if (item.solutionsTabId)  onSolutionsTabChange(item.solutionsTabId);
  }

  function handleMobileNavigate(navId: string, item?: DropdownItem) {
    const nav = NAV_DEFS.find(n => n.id === navId);
    if (!nav) return;
    if (nav.section) onSectionChange(nav.section);
  }

  const activeNavId = section === "esignature" ? "esignature"
    : section === "solutions" ? "solutions"
    : section === "security" ? "security"
    : section === "pricing" ? "pricing"
    : null;

  const GF = { fontFamily: "'Geist', sans-serif" };

  return (
    <nav ref={navRef} aria-label="Main navigation" style={{ position: "relative" }}>
      <div
        className="h-[72px] w-full shrink-0 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(7,17,31,0.88)" : "rgba(7,17,31,1)",
          backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          borderBottom: scrolled ? "1px solid rgba(0,120,212,0.18)" : "1px solid rgba(255,255,255,0.08)",
          boxShadow: scrolled ? "0 2px 32px rgba(0,120,212,0.08)" : "none",
        }}
      >
        <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 48px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          {/* Brand */}
          <Brand />

          {/* Desktop nav */}
          <div className="hidden lg:flex" style={{ gap: "4px", alignItems: "center" }}>
            {NAV_DEFS.map((nav) => {
              const isActive = nav.id === activeNavId || (nav.id === "home" && section === "esignature");
              const isEnotary = nav.id === "enotary";
              const isOpen = openDropdown === nav.id;
              const accentColor = isEnotary ? "#b01262" : "#0078d4";

              return (
                <div
                  key={nav.id}
                  style={{ position: "relative" }}
                  onMouseEnter={() => { if (nav.dropdown) startOpen(nav.id); }}
                  onMouseLeave={() => startClose()}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {/* Nav label — navigates */}
                    <button
                      aria-current={isActive ? "page" : undefined}
                      aria-expanded={nav.dropdown ? isOpen : undefined}
                      aria-haspopup={nav.dropdown ? "menu" : undefined}
                      onClick={() => {
                        if (nav.section) { onSectionChange(nav.section); setOpenDropdown(null); }
                        else if (nav.dropdown) { setOpenDropdown(isOpen ? null : nav.id); }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && nav.dropdown) {
                          e.preventDefault(); setOpenDropdown(nav.id);
                        }
                      }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "8px 10px 8px 12px", display: "flex", alignItems: "center", gap: "4px",
                        color: isActive ? accentColor : "#94a3b8",
                        fontSize: "13px", fontWeight: isActive ? 600 : 500, ...GF,
                        transition: "color 0.18s ease",
                        borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "white"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                    >
                      {nav.label}
                      {nav.badge && (
                        <span style={{
                          background: "rgba(103,2,59,0.3)", color: "#fce7f3",
                          border: "1px solid rgba(176,18,98,0.4)", borderRadius: "999px",
                          padding: "1px 6px", fontSize: "9px", fontWeight: 700, marginLeft: "2px",
                        }}>{nav.badge}</span>
                      )}
                      {nav.dropdown && (
                        <span style={{ marginLeft: "2px", opacity: 0.6 }}>
                          <Chevron open={isOpen} />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Dropdown */}
                  {nav.dropdown && isOpen && (
                    <div
                      style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 100 }}
                      onMouseEnter={cancelClose}
                      onMouseLeave={() => startClose()}
                    >
                      <MegaDropdown
                        def={nav.dropdown}
                        onItemClick={(item) => handleItemClick(nav, item)}
                        onCtaClick={() => { if (nav.section) onSectionChange(nav.section); setOpenDropdown(null); }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            {/* Sign In — desktop only */}
            <button className="hidden lg:block"
              style={{ background: "none", border: "none", color: "white", fontSize: "13px", fontWeight: 600, ...GF, cursor: "pointer", padding: "8px", transition: "color 0.18s ease" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#38bdf8")}
              onMouseLeave={e => (e.currentTarget.style.color = "white")}
            >Sign In</button>

            {/* Create Account — desktop only */}
            <button className="hidden lg:flex"
              onClick={() => haptic("light")}
              style={{
                background: "#0078d4", color: "white", border: "none", borderRadius: "10px",
                padding: "10px 20px", fontSize: "13px", fontWeight: 700, ...GF,
                cursor: "pointer", whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,120,212,0.25)",
                transition: "filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLElement; b.style.filter = "brightness(1.1)"; b.style.transform = "translateY(-1px)"; b.style.boxShadow = "0 6px 20px rgba(0,120,212,0.4)"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLElement; b.style.filter = "brightness(1)"; b.style.transform = "translateY(0)"; b.style.boxShadow = "0 4px 12px rgba(0,120,212,0.25)"; }}
            >Create Free Account</button>

            {/* Hamburger — mobile/tablet */}
            <button className="lg:hidden"
              onClick={() => { haptic("selection"); setMobileOpen(true); }}
              aria-label="Open navigation menu"
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 10px", cursor: "pointer", color: "white" }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
                <path d="M0 1h18M0 7h18M0 13h18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu portal */}
      {mobileOpen && (
        <MobileMenu section={section} onNavigate={handleMobileNavigate} onClose={() => { haptic("selection"); setMobileOpen(false); }} />
      )}
    </nav>
  );
}

function SubNav<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  accent = "azure",
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  accent?: "azure" | "burgundy";
}) {
  const activeColor = accent === "burgundy" ? "#67023b" : "#0078d4";
  const activeBg   = accent === "burgundy" ? "#67023b" : "#0078d4";

  return (
    /* Outer bar — dark glass strip that anchors the pill */
    <div
      style={{
        width: "100%",
        background: "rgba(7,17,31,0.92)",
        backdropFilter: "blur(16px) saturate(150%)",
        WebkitBackdropFilter: "blur(16px) saturate(150%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 0",
        flexShrink: 0,
      }}
    >
      {/* Pill / segmented control container */}
      <div
        role="tablist"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "999px",
          padding: "3px",
          overflowX: "auto",
          maxWidth: "min(1280px, 100vw - 96px)",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: "6px 18px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 500,
                fontFamily: "'Geist', sans-serif",
                lineHeight: 1,
                transition: "background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                background: isActive ? activeBg : "transparent",
                color: isActive ? "#ffffff" : "#94a3b8",
                boxShadow: isActive
                  ? `0 2px 10px ${accent === "burgundy" ? "rgba(103,2,59,0.4)" : "rgba(0,120,212,0.35)"}`
                  : "none",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// CSS overrides applied globally to fix alignment issues in read-only imports.
// 1. Hide embedded navs/jump-nav that would double-render on top of our interactive nav.
// 2. Fix two-column content section in Advanced Capabilities that uses items-start
//    instead of items-center, causing columns to top-align instead of vertically centering.
// 3. Fix the Security Overview footer section column alignment.
// 4. Ensure root component containers stretch their children to full width
//    (overrides items-start on root flex-col wrappers).
const globalOverrides = `
  /* ── LOCKED NAV BEHAVIOR ────────────────────────────────────────────────────
     The interactive MainNav (App.tsx) is the single source of truth for
     navigation across the entire prototype.

     Rule 1 — Hide every imported screen's embedded navbar universally.
     Any Figma import that ships a [data-name="navbar"] element will have it
     suppressed. Our MainNav always sits above at z-50, so no import's nav
     should ever be visible.

     Rule 2 — Hide the eSignature "Jump to:" section nav bar that some
     imported screens include as an in-page anchor strip.

     When adding a new imported screen:
       • Its [data-name="navbar"] is automatically hidden by Rule 1 — no extra
         CSS needed.
       • Add a new Section type and a contentPullUp value matching the screen's
         original navbar height (80px block-flow → pullUp 80, absolute → 0).
       • The MainNav dropdown items and MobileMenu handle all routing.
  ────────────────────────────────────────────────────────────────────────── */

  /* Rule 1: universal navbar suppression for all imported screens.
     Some imports use variant names — add them here as discovered. */
  [data-name="navbar"],
  [data-name="main-nav"] {
    display: none !important;
  }

  /* DLagdaSolutionsLawyers also has a solutions sub-nav strip below its main nav */
  [data-name="d-lagda-solutions-lawyers"] [data-name="sub-nav"] {
    display: none !important;
  }

  /* Hide the "RESOURCES & EDUCATION" eyebrow badge in the Guides hero —
     redundant since the nav already communicates the section context. */
  [data-name="d-lagda-resources-guides"] [data-name="hero"] [data-name="badge"] {
    display: none !important;
  }

  /* Parallel signing section (white, gap-48) has px-[80px] but no pt — heading
     starts flush with no breathing room. Add top padding to match the section rhythm. */
  [data-name="d-lagda-solutions-lawyers"] [class*="gap-\\[48px\\]"][class*="bg-white"] {
    padding-top: 80px !important;
  }

  /* OTP input row (6 × 36px + gaps = 256px) overflows its card container.
     Reduce box width and gap so all 6 fit within the card width. */
  [data-name="d-lagda-solutions-lawyers"] [class*="eaf6ff"] > div > [data-name="Frame"] {
    gap: 5px !important;
    flex-wrap: nowrap;
    max-width: 100%;
  }
  [data-name="d-lagda-solutions-lawyers"] [class*="eaf6ff"] > div > [data-name="Frame"] > [data-name="Rectangle"] {
    width: 26px !important;
    flex-shrink: 1 !important;
  }

  /* Rule 2: in-page anchor nav present on some eSignature imports */
  [data-name="jump-nav"] {
    display: none !important;
  }

  /* PricingMainPage has a white absolute navbar whose 64px top-padding
     shows as a visible bar — remove it (navbar suppressed by Rule 1). */
  [data-name="d-lagda-pricing-main page"] {
    padding-top: 0 !important;
  }

  /* Root page containers: stretch children to full width instead of items-start */
  [data-name="d-lagda-esignature-core-workflow"],
  [data-name="d-lagda-esignature-team-enterprise"],
  [data-name="d-lagda-esignature-advanced-capabilities"],
  [data-name="d-lagda-esignature-templates-branding"],
  [data-name="d-lagda-esignature-overview"],
  [data-name="d-lagda-security-overview"],
  [data-name="d-lagda-solutions-all"],
  [data-name="d-lagda-resources-guides"],
  [data-name="d-lagda-resources-faq"] {
    align-items: stretch !important;
  }

  /* ResourcesFaq: two-column FAQ row uses items-start — vertically center columns */
  [data-name="faq-row-1"] {
    align-items: center !important;
  }

  /* ResourcesGuides: FeaturedSection is flex-col items-start with a fixed-width child
     — center the card within the padded container */
  [data-name="featured-section"] {
    align-items: center !important;
  }

  /* SolutionsAll: WorkflowStrip inner content div uses flex-col items-start
     — center its single child (Frame67) */
  [data-name="workflow-strip"] > div:not([aria-hidden]) {
    align-items: center !important;
  }

  /* Verification Audit has a nested items-start wrapper — stretch that too */
  [data-name="d-lagda-esignature-verification-audit"] > div:first-child {
    align-items: stretch !important;
  }

  /* Advanced Capabilities: two-column content section uses items-start,
     should vertically center both columns like all other two-column sections */
  [data-name="d-lagda-esignature-advanced-capabilities"] .bg-\\[\\#eaf6ff\\].relative.shrink-0.w-full > div {
    align-items: center !important;
  }

  /* Security Overview footer: center the nav-column block within the padded footer */
  [data-name="d-lagda-security-overview"] [data-name="Footer"] > div > div {
    align-items: center !important;
  }

  /* "Tamper Evident" title uses text-[#e6e6e6] (near-white) while every other
     trust badge title uses text-black. Fix it to match the section. */
  [data-name="Trust Badges - Section"] [class*="e6e6e6"] {
    color: black !important;
  }

  /* Move "SECURITY AND TRUST" label beside the blue bar (currently top-[30px],
     should be horizontally inline with the bar at top-0). */
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > p:nth-child(2) {
    top: 2px !important;
    left: 8px !important;
  }

  /* ─── Security Overview hero: heading line-spacing fix ────────────────────
     The heading paragraphs use leading-[55px] at 52px font (only 3px leading).
     The text wraps to 3 lines, overrunning the h-[185px] container and
     colliding with the description at top-[225px]. Fix:
       1. Raise line-height to 64px so lines breathe.
       2. Let the heading container grow to fit (height: auto).
       3. Shift every subsequent absolutely-positioned element down by +45px
          so nothing overlaps the taller heading.               */
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > div:nth-child(3) {
    height: auto !important;
  }
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > div:nth-child(3) p {
    line-height: 64px !important;
  }
  /* description: 225 → 270 */
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > p:nth-child(4) {
    top: 270px !important;
  }
  /* badge pills row: 318 → 423 (clear 18px gap after description text) */
  [data-name="Hero - Security & Trust"] [data-name="Badge Row"] {
    top: 423px !important;
  }
  /* CTA buttons: 438 → 543 */
  [data-name="Hero - Security & Trust"] [data-name="CTA: Create Free LAGDA Account"] {
    top: 543px !important;
  }
  [data-name="Hero - Security & Trust"] [data-name="CTA: Book a Demo"] {
    top: 543px !important;
  }
  /* waitlist link & disclaimer: 528/546 → 633/651 */
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > p:nth-child(8) {
    top: 633px !important;
  }
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] > p:nth-child(9) {
    top: 651px !important;
  }
  /* Expand LeftColumn to hold the shifted content */
  [data-name="Hero - Security & Trust"] [data-name="Left Column"] {
    height: 723px !important;
  }

  /* Audit Trail section: fixed h-[700px] + overflow-clip cuts off the bottom
     py-[96px] padding (content needs ~742px). Remove the cap so the full
     bottom padding renders and there is proper space after the mockup cards. */
  [data-name="Audit Trail - Section"] {
    height: auto !important;
  }

  /* Identity Verification right column: shorten dividers to 50% and center
     all row elements within the column. */
  [data-name="Identity Verification"] [data-name="Right Column"] {
    align-items: center !important;
  }
  [data-name="Identity Verification"] [data-name="Right Column"] [data-name="Divider"] {
    width: 50% !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* Identity Verification section: two-column layout uses items-start which
     top-aligns the signer card column and the feature-list column. The two
     columns have different heights, so centering them vertically looks correct. */
  [data-name="Two Column Layout"] {
    align-items: center !important;
  }

  /* Right column rows each have a fixed h-[90px] with overflow-clip — make sure
     text is never clipped if it wraps on narrower renders */
  [data-name^="Row:"] {
    height: auto !important;
    min-height: 90px;
  }

  /* ─── Coming Soon cards (Security Overview – eNotary section) ──────────────
     Fix 1: Remove fixed h-[220px] so content never clips via overflow-hidden.
     Fix 2: Grow cards to fill the row width (was 320px fixed in a 1280px row,
             leaving 616px of dead space). Each card now takes equal share.
     Fix 3: Equal-height rows — align-items:stretch so the shorter card in a
             row always matches the taller one's height.                        */

  [data-name^="Card:"] {
    height: auto !important;
    min-height: 220px;
    flex: 1 1 auto !important;
    width: auto !important;
    max-width: 600px;
  }

  /* Inner flex column must also be auto-height so the spacer+badge don't clip */
  [data-name^="Card:"] > div:not([aria-hidden]) {
    height: auto !important;
    min-height: inherit;
  }

  /* Row containers: stretch so both cards in a row share the same height */
  [data-name="Cards Row 1"],
  [data-name="Cards Row 2"] {
    align-items: stretch !important;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     PREMIUM INTERACTIVE ENHANCEMENTS
     ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Dropdown / mobile animations ──────────────────────────────────────── */
  @keyframes dropdownEnter {
    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Reduce lg: class for desktop-only elements ─────────────────────────── */
  @media (min-width: 1024px) {
    .hidden.lg\\:block { display: block !important; }
    .hidden.lg\\:flex  { display: flex !important; }
    .lg\\:hidden       { display: none !important; }
  }

  /* ── Page entry transition ─────────────────────────────────────────────── */
  @keyframes lagdaPageEnter {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lagda-page-enter {
    animation: lagdaPageEnter 0.28s ease-out both;
  }

  /* ── Card microinteractions ─────────────────────────────────────────────── */
  /* Feature / trust / pricing cards — lift on hover */
  [data-name="Frame"].relative.rounded-\\[16px\\],
  [data-name^="Card:"],
  [data-name="Trust Badges - Section"] [data-name="Frame"],
  .lagda-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    will-change: transform;
  }
  [data-name="Frame"].relative.rounded-\\[16px\\]:hover,
  [data-name^="Card:"]:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
  }
  /* Available-now cards: Azure border glow on hover */
  [data-name^="Card:"]:not([class*="\\#67023b"]):hover,
  [data-name="Trust Badges - Section"] [data-name="Frame"]:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 0 0 1.5px rgba(0,120,212,0.35) !important;
  }
  /* eNotary locked cards: Burgundy glow */
  [data-name^="Card:"][class*="\\#67023b"]:hover,
  [class*="\\#67023b"][data-name^="Card:"]:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 0 0 1.5px rgba(176,18,98,0.35) !important;
  }

  /* ── Button interactions ────────────────────────────────────────────────── */
  /* Primary Azure CTAs */
  [data-name^="CTA:"],
  [data-name="button"],
  [data-name="cta-primary"],
  [data-name="cta-secondary"] {
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease !important;
    cursor: pointer;
  }
  [data-name^="CTA:"]:hover,
  [data-name="button"]:hover,
  [data-name="cta-primary"]:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(0,120,212,0.32) !important;
    filter: brightness(1.08);
  }
  [data-name^="CTA:"]:active,
  [data-name="button"]:active,
  [data-name="cta-primary"]:active {
    transform: translateY(1px) !important;
    box-shadow: none !important;
  }
  /* Burgundy waitlist CTAs */
  [data-name="CTA: Join Waitlist"]:hover,
  [data-name="CtaJoinWaitlist"]:hover {
    box-shadow: 0 6px 20px rgba(176,18,98,0.4) !important;
    filter: brightness(1.1);
  }

  /* ── Nav item hover underline animation ────────────────────────────────── */
  .lagda-nav-item {
    position: relative;
  }
  .lagda-nav-item::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    width: 0;
    height: 2px;
    background: #0078d4;
    border-radius: 1px;
    transition: width 0.2s ease, left 0.2s ease;
  }
  .lagda-nav-item:hover::after {
    width: 100%;
    left: 0;
  }

  /* ── Sub-nav tab active indicator smooth slide ─────────────────────────── */
  .lagda-subnav-tab {
    transition: color 0.18s ease !important;
  }

  /* ── Footer link hovers ────────────────────────────────────────────────── */
  [data-name="footer"] a,
  [data-name="Footer"] a,
  [data-name="footer"] p,
  [data-name="Footer"] p {
    transition: color 0.18s ease !important;
  }
  [data-name="footer"] p:hover,
  [data-name="Footer"] p:hover {
    color: #38bdf8 !important;
  }

  /* ── Focus ring for accessibility ──────────────────────────────────────── */
  button:focus-visible,
  a:focus-visible,
  [role="button"]:focus-visible {
    outline: 2px solid #0078d4 !important;
    outline-offset: 3px !important;
    border-radius: 4px;
  }

  /* ── Pricing card recommended glow ─────────────────────────────────────── */
  [data-name*="Business"][data-name*="Plan"],
  [data-name*="Recommended"] {
    box-shadow: 0 0 0 1.5px rgba(0,120,212,0.4), 0 8px 32px rgba(0,120,212,0.12) !important;
  }

  /* ── Comparison table row hover ─────────────────────────────────────────── */
  tr:hover,
  [data-name*="row"]:hover,
  [data-name*="Row"]:hover {
    background: rgba(0,120,212,0.04) !important;
    transition: background 0.15s ease !important;
  }

  /* ── Visual polish: subtle section dividers ────────────────────────────── */
  [data-name$="-Section"] + [data-name$="-Section"]::before {
    content: '';
    display: block;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,120,212,0.12), transparent);
  }

  /* ── Smooth image/icon hover lift ──────────────────────────────────────── */
  [data-name="icon-circle"],
  [data-name="Frame"][class*="rounded-\\[14px\\]"],
  [data-name="Icon"] {
    transition: transform 0.2s ease !important;
  }
  [data-name^="Card:"]:hover [data-name="icon-circle"],
  [data-name^="Card:"]:hover [data-name="Icon"] {
    transform: translateY(-2px) !important;
  }

  /* ── Reduced motion: disable all transitions/animations ────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .lagda-page-enter { animation: none !important; }
    [data-name^="Card:"],
    [data-name^="CTA:"],
    [data-name="button"],
    [data-name="cta-primary"],
    .lagda-nav-item::after,
    [data-name="footer"] p,
    [data-name="icon-circle"],
    [data-name="Icon"] {
      transition: none !important;
      animation: none !important;
    }
    [data-name^="Card:"]:hover,
    [data-name^="CTA:"]:hover,
    [data-name="button"]:hover {
      transform: none !important;
    }
  }
`;

export default function App() {
  // ── URL-aware state initialization ──────────────────────────────────────────
  // State is derived from the URL on first mount so that deep links, refreshes,
  // and browser back/forward all restore the correct page without a flash.
  const initState = initialStateFromUrl();
  const [section, setSection] = useState<Section>(initState.section);
  const [esigTab, setEsigTab] = useState<EsigTab>(initState.esigTab);
  const [securityTab, setSecurityTab] = useState<SecurityTab>(initState.securityTab);
  const [pricingTab, setPricingTab] = useState<PricingTab>(initState.pricingTab);
  const [resourcesTab, setResourcesTab] = useState<ResourcesTab>(initState.resourcesTab);
  const [solutionsTab, setSolutionsTab] = useState<SolutionsTab>(initState.solutionsTab);

  const navigate = useNavigate();
  const location = useLocation();

  // ── State → URL: keep the URL in sync when user navigates via the nav UI ────
  useEffect(() => {
    const targetPath = stateToPath(section, esigTab, securityTab, pricingTab, resourcesTab, solutionsTab);
    if (targetPath !== location.pathname) {
      navigate(targetPath, { replace: false });
    }
  }, [section, esigTab, securityTab, pricingTab, resourcesTab, solutionsTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL → State: respond to browser back/forward and direct links ────────────
  useEffect(() => {
    const parsed = pathToState(location.pathname);
    if (!parsed) return;
    // Only update what changed to avoid spurious re-renders
    if (parsed.section      !== section)      setSection(parsed.section);
    if (parsed.esigTab      && parsed.esigTab      !== esigTab)      setEsigTab(parsed.esigTab);
    if (parsed.securityTab  && parsed.securityTab  !== securityTab)  setSecurityTab(parsed.securityTab);
    if (parsed.pricingTab   && parsed.pricingTab   !== pricingTab)   setPricingTab(parsed.pricingTab);
    if (parsed.resourcesTab && parsed.resourcesTab !== resourcesTab) setResourcesTab(parsed.resourcesTab);
    if (parsed.solutionsTab && parsed.solutionsTab !== solutionsTab) setSolutionsTab(parsed.solutionsTab);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navbar scroll detection ─────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Page transition key — increments on every navigation to trigger CSS anim
  const pageKey = useRef(0);
  const prevNav = useRef({ section, esigTab, securityTab, pricingTab });
  const nav = { section, esigTab, securityTab, pricingTab };
  if (JSON.stringify(nav) !== JSON.stringify(prevNav.current)) {
    pageKey.current += 1;
    prevNav.current = nav;
  }

  // ── Scroll-reveal via IntersectionObserver ──────────────────────────────────
  const revealObserver = useRef<IntersectionObserver | null>(null);
  const attachReveal = useCallback(() => {
    revealObserver.current?.disconnect();
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    revealObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            revealObserver.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.07, rootMargin: "0px 0px -32px 0px" }
    );

    const sectionSelectors = [
      // named sections in imported screens
      '[data-name$="-Section"]',
      '[data-name="Identity Verification"]',
      '[data-name="Trust Badges - Section"]',
      '[data-name="LAGDA eNotary - Coming Soon"]',
      '[data-name="Audit Trail - Section"]',
      '[data-name="Two Columns"]',
      '[data-name="Document Verification Architecture"]',
      '[data-name="Signer Accountability and Audit Trail"]',
    ];

    const seen = new Set<Element>();
    sectionSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const rect = el.getBoundingClientRect();
        // Only animate sections that are below the initial viewport
        if (rect.top > window.innerHeight * 0.85) {
          (el as HTMLElement).style.opacity = "0";
          (el as HTMLElement).style.transform = "translateY(12px)";
          (el as HTMLElement).style.transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
          revealObserver.current?.observe(el);
        }
      });
    });
  }, []);

  useEffect(() => {
    // Re-run after a tick so the new screen's DOM is rendered
    const id = setTimeout(attachReveal, 80);
    return () => {
      clearTimeout(id);
      revealObserver.current?.disconnect();
    };
  }, [section, esigTab, securityTab, pricingTab, attachReveal]);

  // Fixed chrome is always just the 72px main nav — no sub-nav bar.
  const myNavHeight = 72;

  // eSignature sub-tabs have a block-flow 80px nav + 56px sub-nav = 136px in imports.
  // Now that we hide both with CSS, we only need to pull up by 80px (just the main nav).
  // ComparePlans has a block-flow 80px nav; PricingMainPage's nav is absolute.
  const pricingPullUp = pricingTab === "compare-plans" ? 80 : 0;
  // SolutionsAll has an absolute navbar (pull-up 0).
  // Lawyers has block-flow main-nav (80px) + sub-nav (64px) = 144px total.
  const solutionsPullUp = solutionsTab === "lawyers" ? 144 : 0;
  // Guides has 80px block-flow nav; FAQ has 72px block-flow nav.
  const resourcesPullUp = resourcesTab === "faq" ? 72 : 80;
  const contentPullUp = section === "esignature" ? (esigTab === "overview" ? 80 : 136)
    : section === "pricing"   ? pricingPullUp
    : section === "resources" ? resourcesPullUp
    : section === "solutions" ? solutionsPullUp
    : 0;
  const contentPaddingTop = myNavHeight;

  function handleSectionChange(s: Section) {
    haptic("selection");
    window.scrollTo({ top: 0, behavior: "instant" });
    setSection(s);
    if (s === "esignature") setEsigTab("overview");
    if (s === "security") setSecurityTab("security-overview");
    if (s === "pricing")   setPricingTab("pricing-main");
    if (s === "resources") setResourcesTab("guides");
    if (s === "solutions") setSolutionsTab("all");
  }

  return (
    // overflow-x-auto allows horizontal scroll for the 1440px-wide prototype
    // on narrower viewports. The inner w-[1440px] block always occupies exactly
    // 1440px and is centered via mx-auto.
    <div className="bg-[#07111f] min-h-screen overflow-x-auto">
      <style>{globalOverrides}</style>

      {/* Fixed interactive nav stack — background spans full viewport,
          content is constrained to 1440px centered (handled inside each bar).
          Hovering anywhere in this area cancels the auto-hide timer. */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        <MainNav section={section} onSectionChange={handleSectionChange} onEsigTabChange={setEsigTab} onSecurityTabChange={setSecurityTab} onPricingTabChange={setPricingTab} onResourcesTabChange={setResourcesTab} onSolutionsTabChange={setSolutionsTab} scrolled={scrolled} />
      </div>

      {/* Page content — always 1440px wide and centered in the viewport */}
      <div style={{ paddingTop: contentPaddingTop }}>
        <div style={{ marginTop: -contentPullUp }}>
          {/* key forces remount on navigation, triggering the CSS entry animation */}
          <div key={pageKey.current} className="lagda-page-enter" style={{ width: 1440, minWidth: 1440, marginLeft: "auto", marginRight: "auto" }}>
            {section === "esignature" && esigTab === "overview" && <DLagdaEsignatureOverview />}
            {section === "esignature" && esigTab === "core-workflow" && <DLagdaEsignatureCoreWorkflow />}
            {section === "esignature" && esigTab === "verification-audit" && <DLagdaEsignatureVerificationAudit />}
            {section === "esignature" && esigTab === "advanced-capabilities" && <DLagdaEsignatureAdvancedCapabilities />}
            {section === "esignature" && esigTab === "templates-branding" && <DLagdaEsignatureTemplatesBranding />}
            {section === "esignature" && esigTab === "team-enterprise" && <DLagdaEsignatureTeamEnterprise />}
            {section === "security" && securityTab === "security-overview" && <DLagdaSecurityOverview />}
            {section === "security" && securityTab === "trust-center" && <DLagdaSecurityTrustCenter />}
            {section === "solutions" && solutionsTab === "all"     && <DLagdaSolutionsAll />}
            {section === "solutions" && solutionsTab === "lawyers" && <DLagdaSolutionsLawyers />}
            {section === "resources" && resourcesTab === "guides" && <DLagdaResourcesGuides />}
            {section === "resources" && resourcesTab === "faq"    && <DLagdaResourcesFaq />}
            {section === "pricing" && pricingTab === "pricing-main" && <DLagdaPricingMainPage />}
            {section === "pricing" && pricingTab === "compare-plans" && <DLagdaPricingComparePlans />}
          </div>
        </div>
      </div>
    </div>
  );
}
