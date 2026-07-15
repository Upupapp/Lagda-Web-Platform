import { Link } from "react-router";
import {
  PricingPageShell, PricingSection, PricingHeading, PricingNotice,
} from "../../../components/pricing/PricingComponents";
import { SIGNING_REQUEST_NOTES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function SigningRequestMockup() {
  const txns = [
    { id: "TXN-001", title: "Retainer Agreement — Juan dela Cruz",  status: "COMPLETED",   date: "15 Jul", counted: true },
    { id: "TXN-002", title: "NDA — Northbridge Capital Partners",   status: "IN PROGRESS",  date: "15 Jul", counted: true },
    { id: "TXN-003", title: "Service Agreement — Sofia Navarro",     status: "DRAFT",        date: "14 Jul", counted: false },
    { id: "TXN-004", title: "Employment Contract — Marco Santos",    status: "SENT",         date: "13 Jul", counted: true },
  ];
  const counts = { used: 3, available: null };
  return (
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 440, width: "100%" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700, margin: 0 }}>Signing Requests — July 2026</p>
          <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0" }}>Northbridge Legal · Professional</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 18, fontWeight: 800, margin: 0 }}>{counts.used}</p>
          <p style={{ color: "#475569", ...GM, fontSize: 9, margin: 0 }}>SENT THIS PERIOD</p>
        </div>
      </div>
      {txns.map((t, i) => (
        <div key={t.id} style={{ padding: "10px 16px", borderBottom: i < txns.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: t.status === "DRAFT" ? "#475569" : "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
            <p style={{ color: "#334155", ...GM, fontSize: 9, margin: "2px 0 0" }}>{t.date}</p>
          </div>
          <span style={{ color: t.status === "COMPLETED" ? "#22C55E" : t.status === "DRAFT" ? "#475569" : "#0078D4", ...GM, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{t.status}</span>
          <span style={{ color: t.counted ? "#475569" : "#334155", ...GM, fontSize: 9, flexShrink: 0 }}>{t.counted ? "COUNTED" : "NOT COUNTED"}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#334155", ...GM, fontSize: 9 }}>Drafts are not counted until sent</span>
        <span style={{ color: "#38bdf8", ...GM, fontSize: 9, fontWeight: 700 }}>3 REQUESTS SENT</span>
      </div>
    </div>
  );
}

export function SigningRequests() {
  return (
    <PricingPageShell>
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>SIGNING REQUESTS</p>
          <h1 style={{ color: "white", ...GF, fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", margin: "0 0 16px" }}>
            How signing requests are counted.
          </h1>
          <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65 }}>
            Understanding what counts toward your plan allowance helps you manage your LAGDA workspace effectively.
          </p>
        </div>
      </section>

      <PricingSection id="notes">
        <div style={{ display: "grid", gap: 32 }} className="sr-grid">
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {SIGNING_REQUEST_NOTES.map(({ icon, title, body }) => (
                <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 14 }}>
                  <span aria-hidden style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
                    <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>SIGNING REQUEST EXAMPLE</p>
            <SigningRequestMockup />
            <PricingNotice text="This mockup shows illustrative data. Actual signing-request counting rules, allowances, and limit behavior will be confirmed in plan terms before launch." />
          </div>
        </div>
        <style>{`.sr-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 800px) { .sr-grid { grid-template-columns: 1fr; } }`}</style>
      </PricingSection>

      <PricingSection id="cta" light bordered>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: "white", ...GF, fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Ready to compare plans?</h2>
          <p style={{ color: "#64748b", ...GF, fontSize: 15, lineHeight: 1.65, marginBottom: 24 }}>See how signing-request allowances and limits vary across Personal, Business, and Enterprise.</p>
          <Link to="/pricing/compare" style={{ background: "#0078D4", color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px 28px", borderRadius: 8, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Compare Plans</Link>
        </div>
      </PricingSection>
    </PricingPageShell>
  );
}
