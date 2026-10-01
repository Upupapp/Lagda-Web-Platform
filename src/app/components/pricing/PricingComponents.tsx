import { Link, useLocation } from "react-router";
import { useState } from "react";
import { LAGDA_PLANS, COMPARE_GROUPS, type LagdaPlan } from "../../config/pricing.config";
import { PRICING_SUBNAV } from "../../pages/public/pricing/content";
import {
  LayoutDashboard, Columns3, PenLine, HardDrive, LayoutTemplate, KeyRound, Building2, CircleHelp, Tag,
  type LucideIcon,
} from "lucide-react";
import { SectionTabs } from "../public/SectionTabs";
import { PublicSection, PublicHeading } from "../public/PublicKit";
import type { PublicSectionProps, PublicHeadingProps } from "../public/PublicKit";
import { ON_LIGHT } from "../../utils/on-light";
import { PlanCarousel } from "./PlanCarousel";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Pricing sub-nav ───────────────────────────────────────────────────────────
const PRICING_ICONS: Record<string, LucideIcon> = {
  "/pricing": LayoutDashboard,
  "/pricing/compare": Columns3,
  "/pricing/signing-requests": PenLine,
  "/pricing/storage-limits": HardDrive,
  "/pricing/templates-by-plan": LayoutTemplate,
  "/pricing/authentication-by-plan": KeyRound,
  "/pricing/enterprise": Building2,
  "/pricing/faq": CircleHelp,
};

export function PricingSubNav() {
  const { pathname } = useLocation();
  return (
    <SectionTabs
      label="Pricing navigation"
      tabs={PRICING_SUBNAV.map(({ label, path }) => ({
        key: path,
        label,
        to: path,
        icon: PRICING_ICONS[path] ?? Tag,
        active: pathname === path || (path !== "/pricing" && pathname.startsWith(path + "/")),
      }))}
    />
  );
}

// ── Shell that wraps subnav + content ─────────────────────────────────────────
export function PricingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", color: "#07111F", ...GF }}>
      <PricingSubNav />
      {children}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
//
// Free shows its ₱0; Personal and Business say their price is confirmed at
// launch; Enterprise is Coming Soon — dimmed, with its own badge, so it never
// competes with the plans people can choose today.
export function PlanCard({ plan }: { plan: LagdaPlan }) {
  const soon = plan.comingSoon;
  return (
    <div data-testid={`public-plan-${plan.id}`} style={{
      background: soon ? "#F8FAFC" : plan.featured ? "rgba(0,120,212,0.05)" : "#ffffff",
      border: soon ? "1px dashed rgba(7,17,31,0.22)" : plan.featured ? "1.5px solid rgba(0,120,212,0.35)" : "1px solid rgba(0,0,0,0.08)",
      borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 0,
      position: "relative", height: "100%", boxSizing: "border-box",
      boxShadow: soon ? "none" : plan.featured ? "0 8px 24px rgba(0,120,212,0.14)" : "0 1px 4px rgba(7,17,31,0.07)",
    }}>
      {(plan.featured || soon) && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: soon ? "linear-gradient(135deg, #FDE68A, #F5C542)" : "#0078D4", color: soon ? "#3B2A00" : "white",
          ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", padding: "3px 12px", borderRadius: 999, whiteSpace: "nowrap",
        }}>{soon ? "COMING SOON" : "RECOMMENDED FOR TEAMS"}</div>
      )}
      <p style={{ color: soon ? ON_LIGHT.slate : ON_LIGHT.azure, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
        {plan.name.toUpperCase()}
      </p>
      <p style={{ color: "#07111F", ...GF, fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>{plan.name}</p>
      <p style={{ color: ON_LIGHT.slate, ...GF, fontSize: 13, lineHeight: 1.5, marginBottom: 20, minHeight: "2.9em" }}>{plan.tagline}</p>

      {/* Price */}
      <div style={{ marginBottom: 20, padding: "14px 0", borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)", minHeight: 52 }}>
        {plan.freeForever ? (
          <>
            <p style={{ color: "#07111F", ...GF, fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1 }}>₱0</p>
            <p style={{ color: ON_LIGHT.slate, ...GF, fontSize: 13, margin: "4px 0 0" }}>Free, always</p>
          </>
        ) : soon ? (
          <>
            <p style={{ color: "#07111F", ...GF, fontSize: 18, fontWeight: 700, margin: 0 }}>Coming soon</p>
            <p style={{ color: ON_LIGHT.slate, ...GF, fontSize: 13, margin: "4px 0 0" }}>Priced for your organization</p>
          </>
        ) : (
          <>
            <p style={{ color: ON_LIGHT.slate, ...GM, fontSize: 11, margin: "0 0 4px" }}>MONTHLY PRICING</p>
            <p style={{ color: ON_LIGHT.slate, ...GF, fontSize: 13, margin: 0 }}>To be confirmed at launch</p>
          </>
        )}
      </div>

      {/* Highlights */}
      <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.highlights.map((h) => (
          <li key={h} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: soon ? ON_LIGHT.slate : ON_LIGHT.success, flexShrink: 0, fontSize: 12, marginTop: 2 }}>✓</span>
            <span style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.45 }}>{h}</span>
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <Link to={plan.ctaPath} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: plan.featured ? "#0078D4" : "#ffffff",
          color: plan.featured ? "white" : "#07111F", borderRadius: 8, padding: "11px 20px", textDecoration: "none",
          ...GF, fontSize: 14, fontWeight: 700, minHeight: 44,
          border: plan.featured ? "none" : "1px solid rgba(0,0,0,0.14)",
          transition: "filter 0.15s ease",
        }}>{plan.ctaLabel}</Link>
        {plan.secondaryCtaLabel && plan.secondaryCtaPath && (
          <Link to={plan.secondaryCtaPath} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            color: ON_LIGHT.slate, borderRadius: 8, padding: "10px 20px", textDecoration: "none",
            ...GF, fontSize: 13, fontWeight: 500, minHeight: 44,
          }}>{plan.secondaryCtaLabel}</Link>
        )}
      </div>
      {plan.note && (
        <p style={{ color: ON_LIGHT.muted, ...GM, fontSize: 9, marginTop: 12, lineHeight: 1.5, textAlign: "center" }}>{plan.note}</p>
      )}
    </div>
  );
}

// ── Plan cards: one carousel on every screen ──────────────────────────────────
export function PlanCards() {
  return (
    <PlanCarousel label="LAGDA plans" testId="public-plan-carousel">
      {LAGDA_PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
    </PlanCarousel>
  );
}

// ── Avail cell ────────────────────────────────────────────────────────────────
//
// Every colour here comes from ON_LIGHT. This one function produced the
// largest single block of contrast failures on the public site — the compare
// table repeats it once per feature per plan, so a 2.79:1 tick became
// sixty-eight failing nodes on /pricing alone. The table's own background is
// #ffffff and rgba(0,120,212,0.04) over it, both light; the values it used
// were the navy ramp's.
function AvailCell({ value }: { value: string }) {
  if (value === "included")     return <span style={{ color: ON_LIGHT.success, fontSize: 15 }} title="Included">✓ <span style={{ ...GF, fontSize: 11, color: ON_LIGHT.success }}>Included</span></span>;
  if (value === "not-included") return <span style={{ color: ON_LIGHT.muted, fontSize: 15 }} title="Not included">— <span style={{ ...GF, fontSize: 11, color: ON_LIGHT.muted }}>Not included</span></span>;
  if (value === "enterprise")   return <span style={{ color: ON_LIGHT.azure, ...GM, fontSize: 10, fontWeight: 700 }}>Enterprise</span>;
  if (value === "pending")      return <span style={{ color: ON_LIGHT.gold, ...GM, fontSize: 10 }}>Planned</span>;
  if (value === "varies")       return <span style={{ color: ON_LIGHT.slate, ...GF, fontSize: 12 }}>Varies by plan</span>;
  if (value === "coming-soon")  return <span style={{ color: ON_LIGHT.gold, ...GM, fontSize: 10 }}>Coming soon</span>;
  return <span style={{ color: ON_LIGHT.slate, ...GF, fontSize: 12 }}>{value}</span>;
}

// ── Compare table (desktop) ────────────────────────────────────────────────────
export function CompareTable() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(COMPARE_GROUPS.map(g => g.id)));
  const toggle = (id: string) => setOpenGroups(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }} aria-label="LAGDA plan comparison">
        <caption style={{ ...GM, fontSize: 10, color: ON_LIGHT.slate, textAlign: "left", padding: "0 0 12px", letterSpacing: "0.08em" }}>
          LAGDA ESIGNATURE PLAN COMPARISON · LAGDA ENOTARY IS A SEPARATE FUTURE PRODUCT NOT INCLUDED IN ANY PLAN
        </caption>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
            <th style={{ textAlign: "left", padding: "12px 16px 12px 0", color: ON_LIGHT.slate, ...GF, fontSize: 13, fontWeight: 600, width: "32%" }}>Feature</th>
            {LAGDA_PLANS.map(p => (
              <th key={p.id} style={{ textAlign: "center", padding: "12px 16px", color: p.featured ? ON_LIGHT.azure : p.comingSoon ? ON_LIGHT.slate : "#07111F", ...GF, fontSize: 13, fontWeight: 700 }}>
                {p.name}
                {p.comingSoon && (
                  <span style={{ display: "block", marginTop: 4, ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#9A6B00" }}>COMING SOON</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_GROUPS.map(group => (
            <>
              <tr key={group.id + "-header"}>
                <td colSpan={5} style={{ padding: "12px 16px 8px 0" }}>
                  <button
                    onClick={() => toggle(group.id)}
                    aria-expanded={openGroups.has(group.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      color: ON_LIGHT.azure, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    }}
                  >
                    <span style={{ fontSize: 10, transform: openGroups.has(group.id) ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
                    {group.title.toUpperCase()}
                  </button>
                </td>
              </tr>
              {openGroups.has(group.id) && group.rows.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: "10px 16px 10px 16px", color: "#334155", ...GF, fontSize: 13 }}>{row.label}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}><AvailCell value={row.free} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}><AvailCell value={row.personal} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "center", background: "rgba(0,120,212,0.04)" }}><AvailCell value={row.business} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "center", background: "#F8FAFC", opacity: 0.75 }}><AvailCell value={row.enterprise} /></td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── FAQ accordion ─────────────────────────────────────────────────────────────
// FaqAccordion now comes from the shared kit; it was character-identical to
// the copy in ResourceComponents.
export { FaqAccordion } from "../public/PublicKit";

export function PricingSection(props: PublicSectionProps) {
  return <PublicSection {...props} />;
}

export function PricingHeading(props: PublicHeadingProps) {
  return <PublicHeading {...props} />;
}

export function PricingHero({ heading, sub }: { heading: string; sub: string }) {
  return (
    <section style={{ padding: "80px 24px 64px", textAlign: "center", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: ON_LIGHT.azure, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>LAGDA ESIGNATURE</p>
        <h1 style={{ color: "#07111F", ...GF, fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>{heading}</h1>
        <p style={{ color: ON_LIGHT.slate, ...GF, fontSize: 17, lineHeight: 1.65, margin: "0 auto" }}>{sub}</p>
      </div>
    </section>
  );
}

export function PricingNotice({ text }: { text: string }) {
  return (
    <div style={{ background: "rgba(0,120,212,0.05)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
      <p style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export function EnotarySeparationNote() {
  return (
    <div style={{ background: "rgba(103,2,59,0.04)", border: "1px solid rgba(103,2,59,0.2)", borderRadius: 10, padding: "14px 18px" }}>
      <p style={{ color: "#67023B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>LAGDA ENOTARY — SEPARATE FUTURE PRODUCT</p>
      <p style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        LAGDA eNotary is not included in any current eSignature plan. It is a separate future regulated product — Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
      </p>
    </div>
  );
}
