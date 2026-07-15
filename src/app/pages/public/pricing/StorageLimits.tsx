import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading, PricingNotice,
} from "../../../components/pricing/PricingComponents";
import { STORAGE_CATEGORIES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function StorageMockup() {
  const items = [
    { label: "Completed records", pct: 52, color: "#0078D4",  size: "52%" },
    { label: "Draft documents",   pct: 18, color: "#38bdf8",  size: "18%" },
    { label: "Templates",         pct: 15, color: "#22C55E",  size: "15%" },
    { label: "Branding assets",   pct: 8,  color: "#C9960C",  size: "8%"  },
    { label: "Other",             pct: 7,  color: "#334155",  size: "7%"  },
  ];
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 360, width: "100%" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Storage Usage</p>
        <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0" }}>Northbridge Legal · Illustrative example</p>
      </div>
      <div style={{ padding: "16px" }}>
        {/* Bar */}
        <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", marginBottom: 16 }}>
          {items.map(({ label, pct, color }) => (
            <div key={label} style={{ height: "100%", width: `${pct}%`, background: color }} />
          ))}
        </div>
        {items.map(({ label, pct, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ color: "#94a3b8", ...GF, fontSize: 12, flex: 1 }}>{label}</span>
            <span style={{ color: "#475569", ...GM, fontSize: 10 }}>{pct}%</span>
          </div>
        ))}
        <p style={{ color: "#334155", ...GM, fontSize: 9, marginTop: 12, textAlign: "center" }}>ILLUSTRATIVE VALUES — NOT OFFICIAL PLAN LIMITS</p>
      </div>
    </div>
  );
}

export function StorageLimits() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>STORAGE</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            Document storage in your LAGDA workspace.
          </h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Storage covers the documents, records, templates, and workspace assets associated with your account. Storage limits and categories will be confirmed at launch.
          </p>
        </div>
      </section>

      <PricingSection id="categories">
        <div style={{ display: "grid", gap: 32 }} className="sl-grid">
          <div>
            <PricingHeading eyebrow="What uses storage" id="cat-h2" heading="Storage categories." sub="Storage is used by several types of content in your workspace." />
            <div style={{ display: "grid", gap: 10 }} className="cat-grid">
              {STORAGE_CATEGORIES.map(({ icon, label, desc }) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px" }}>
                  <span aria-hidden style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
                    <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <style>{`.cat-grid { grid-template-columns: 1fr; }`}</style>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>STORAGE USAGE EXAMPLE</p>
            <StorageMockup />
            <PricingNotice text="This diagram shows illustrative storage proportions and does not represent official plan limits, total storage sizes, or current billing values." />
          </div>
        </div>
        <style>{`.sl-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 800px) { .sl-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="management" light bordered>
        <PricingHeading eyebrow="Managing storage" id="mgmt-h2" heading="Ways to manage your workspace storage." />
        <div style={{ display: "grid", gap: 12, maxWidth: 720 }} className="mgmt-grid">
          {[
            { icon: "📊", title: "Review usage",        desc: "Understand what's using storage in your workspace administration view." },
            { icon: "📦", title: "Archive completed transactions", desc: "Archive older completed transactions to reduce active workspace footprint." },
            { icon: "🗑️", title: "Delete eligible drafts", desc: "Drafts that are no longer needed can be deleted to free up space." },
            { icon: "💾", title: "Export records",       desc: "Download completed records and audit reports before archiving." },
            { icon: "⬆️", title: "Upgrade your plan",   desc: "Higher plans or custom Enterprise arrangements may include greater storage." },
            { icon: "🏢", title: "Contact sales",        desc: "Organizations with large storage requirements can discuss custom arrangements." },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px" }}>
              <span aria-hidden style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.mgmt-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 640px) { .mgmt-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="cta">
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: 26, fontWeight: 800, marginBottom: 12 }}>View plans and storage options.</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>Storage limits vary by plan. Compare plans to find the right fit.</p>
          <Link to="/pricing" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>View Plans</Link>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
