import { Link, useLocation } from "react-router";
import { useState } from "react";
import { LAGDA_PLANS, COMPARE_GROUPS, type LagdaPlan, type AvailValue } from "../../config/pricing.config";
import { PRICING_SUBNAV } from "../../pages/public/pricing/content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Pricing sub-nav ───────────────────────────────────────────────────────────
export function PricingSubNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Pricing navigation" style={{
      position: "sticky", top: 72, zIndex: 40,
      background: "rgba(7,17,31,0.95)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        display: "flex", gap: 0, overflowX: "auto",
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {PRICING_SUBNAV.map(({ label, path }) => {
          const active = pathname === path || (path !== "/pricing" && pathname.startsWith(path + "/"));
          return (
            <Link key={path} to={path} aria-current={active ? "page" : undefined} style={{
              textDecoration: "none", flexShrink: 0,
              display: "flex", alignItems: "center", padding: "14px 16px",
              borderBottom: active ? "2px solid #0078D4" : "2px solid transparent",
              transition: "border-color 0.15s ease",
            }}>
              <span style={{ ...GF, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "white" : "#64748b", whiteSpace: "nowrap", transition: "color 0.15s ease" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <style>{`.pricing-subnav a:hover span { color: #e2e8f0 !important; }`}</style>
    </nav>
  );
}

// ── Shell that wraps subnav + content ─────────────────────────────────────────
export function PricingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#07111F", minHeight: "100vh", color: "white", ...GF }}>
      <PricingSubNav />
      {children}
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
export function PlanCard({ plan }: { plan: LagdaPlan }) {
  return (
    <div style={{
      background: plan.featured ? "rgba(0,120,212,0.08)" : "rgba(255,255,255,0.03)",
      border: plan.featured ? "1.5px solid rgba(0,120,212,0.4)" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 0,
      position: "relative",
    }}>
      {plan.featured && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "#0078D4", color: "white", ...GM, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.1em", padding: "3px 12px", borderRadius: 999, whiteSpace: "nowrap",
        }}>RECOMMENDED FOR TEAMS</div>
      )}
      <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>
        {plan.name.toUpperCase()}
      </p>
      <p style={{ color: "white", ...GF, fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>{plan.name}</p>
      <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>{plan.tagline}</p>

      {/* Price */}
      <div style={{ marginBottom: 20, padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {plan.contactSales ? (
          <p style={{ color: "white", ...GF, fontSize: 18, fontWeight: 700, margin: 0 }}>Contact Sales</p>
        ) : (
          <>
            <p style={{ color: "#475569", ...GM, fontSize: 11, margin: "0 0 4px" }}>PRICING</p>
            <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0 }}>To be confirmed at launch</p>
          </>
        )}
      </div>

      {/* Highlights */}
      <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {plan.highlights.map((h) => (
          <li key={h} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "#22C55E", flexShrink: 0, fontSize: 12, marginTop: 2 }}>✓</span>
            <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.45 }}>{h}</span>
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <Link to={plan.ctaPath} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: plan.featured ? "#0078D4" : "rgba(255,255,255,0.07)",
          color: "white", borderRadius: 8, padding: "11px 20px", textDecoration: "none",
          ...GF, fontSize: 14, fontWeight: 700, minHeight: 44,
          border: plan.featured ? "none" : "1px solid rgba(255,255,255,0.12)",
          transition: "background 0.15s ease",
        }}>{plan.ctaLabel}</Link>
        {plan.secondaryCtaLabel && plan.secondaryCtaPath && (
          <Link to={plan.secondaryCtaPath} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#64748b", borderRadius: 8, padding: "10px 20px", textDecoration: "none",
            ...GF, fontSize: 13, fontWeight: 500, minHeight: 44,
          }}>{plan.secondaryCtaLabel}</Link>
        )}
      </div>
      {plan.note && (
        <p style={{ color: "#334155", ...GM, fontSize: 9, marginTop: 12, lineHeight: 1.5, textAlign: "center" }}>{plan.note}</p>
      )}
    </div>
  );
}

// ── Plan cards grid ───────────────────────────────────────────────────────────
export function PlanCards() {
  return (
    <div>
      <div style={{ display: "grid", gap: 20 }} className="plan-cards-grid">
        {LAGDA_PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
      </div>
      <style>{`
        .plan-cards-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .plan-cards-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; } }
      `}</style>
    </div>
  );
}

// ── Avail cell ────────────────────────────────────────────────────────────────
function AvailCell({ value }: { value: AvailValue | string }) {
  if (value === "included")     return <span style={{ color: "#22C55E", fontSize: 15 }} title="Included">✓ <span style={{ ...GF, fontSize: 11, color: "#22C55E" }}>Included</span></span>;
  if (value === "not-included") return <span style={{ color: "#334155", fontSize: 15 }} title="Not included">— <span style={{ ...GF, fontSize: 11, color: "#475569" }}>Not included</span></span>;
  if (value === "enterprise")   return <span style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700 }}>Enterprise</span>;
  if (value === "pending")      return <span style={{ color: "#C9960C", ...GM, fontSize: 10 }}>Planned</span>;
  if (value === "varies")       return <span style={{ color: "#64748b", ...GF, fontSize: 12 }}>Varies by plan</span>;
  return <span style={{ color: "#64748b", ...GF, fontSize: 12 }}>{value}</span>;
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
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }} aria-label="LAGDA plan comparison">
        <caption style={{ ...GM, fontSize: 10, color: "#475569", textAlign: "left", padding: "0 0 12px", letterSpacing: "0.08em" }}>
          LAGDA ESIGNATURE PLAN COMPARISON · LAGDA ENOTARY IS A SEPARATE FUTURE PRODUCT NOT INCLUDED IN ANY PLAN
        </caption>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th style={{ textAlign: "left", padding: "12px 16px 12px 0", color: "#475569", ...GF, fontSize: 13, fontWeight: 600, width: "40%" }}>Feature</th>
            {LAGDA_PLANS.map(p => (
              <th key={p.id} style={{ textAlign: "center", padding: "12px 16px", color: p.featured ? "#38bdf8" : "white", ...GF, fontSize: 13, fontWeight: 700 }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_GROUPS.map(group => (
            <>
              <tr key={group.id + "-header"}>
                <td colSpan={4} style={{ padding: "12px 16px 8px 0" }}>
                  <button
                    onClick={() => toggle(group.id)}
                    aria-expanded={openGroups.has(group.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    }}
                  >
                    <span style={{ fontSize: 10, transform: openGroups.has(group.id) ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
                    {group.title.toUpperCase()}
                  </button>
                </td>
              </tr>
              {openGroups.has(group.id) && group.rows.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 16px 10px 16px", color: "#94a3b8", ...GF, fontSize: 13 }}>{row.label}</td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}><AvailCell value={row.personal} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "center", background: "rgba(0,120,212,0.04)" }}><AvailCell value={row.business} /></td>
                  <td style={{ padding: "10px 16px", textAlign: "center" }}><AvailCell value={row.enterprise} /></td>
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
export function FaqAccordion({ items }: { items: { id: string; q: string; a: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map(({ id, q, a }) => (
        <div key={id} id={id} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <button
            aria-expanded={open === id}
            aria-controls={`${id}-answer`}
            onClick={() => setOpen(open === id ? null : id)}
            style={{
              width: "100%", textAlign: "left", background: "none", border: "none",
              cursor: "pointer", padding: "16px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
            }}
          >
            <span style={{ color: "white", ...GF, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{q}</span>
            <span style={{ color: "#64748b", flexShrink: 0, fontSize: 14, transition: "transform 0.2s", transform: open === id ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
          </button>
          <div id={`${id}-answer`} hidden={open !== id} style={{ padding: open === id ? "0 20px 16px" : "0 20px 0" }}>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0 }}>{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section wrapper (same as EsigPageShell's PageSection) ─────────────────────
export function PricingSection({ id, children, light, bordered }: { id?: string; children: React.ReactNode; light?: boolean; bordered?: boolean }) {
  return (
    <section id={id} style={{ background: light ? "rgba(255,255,255,0.02)" : "transparent", borderTop: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined, borderBottom: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px" }}>{children}</div>
    </section>
  );
}

export function PricingHeading({ eyebrow, id, heading, sub, center }: { eyebrow: string; id: string; heading: string; sub?: string; center?: boolean }) {
  return (
    <div style={{ marginBottom: 40, textAlign: center ? "center" : undefined }}>
      <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{eyebrow}</p>
      <h2 id={id} style={{ color: "white", ...GF, fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 800, margin: 0, marginBottom: sub ? 12 : 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{heading}</h2>
      {sub && <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65, margin: center ? "0 auto" : 0, maxWidth: 640 }}>{sub}</p>}
    </div>
  );
}

export function PricingHero({ heading, sub }: { heading: string; sub: string }) {
  return (
    <section style={{ padding: "80px 24px 64px", textAlign: "center", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,120,212,0.12) 0%, transparent 70%)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>LAGDA ESIGNATURE</p>
        <h1 style={{ color: "white", ...GF, fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 20px" }}>{heading}</h1>
        <p style={{ color: "#64748b", ...GF, fontSize: 17, lineHeight: 1.65, margin: "0 auto" }}>{sub}</p>
      </div>
    </section>
  );
}

export function PricingNotice({ text }: { text: string }) {
  return (
    <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
      <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export function EnotarySeparationNote() {
  return (
    <div style={{ background: "rgba(103,2,59,0.08)", border: "1px solid rgba(103,2,59,0.25)", borderRadius: 10, padding: "14px 18px" }}>
      <p style={{ color: "#c084fc", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>LAGDA ENOTARY — SEPARATE FUTURE PRODUCT</p>
      <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        LAGDA eNotary is not included in any current eSignature plan. It is a separate future regulated product — Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
      </p>
    </div>
  );
}
