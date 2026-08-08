import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { PLAN_LIMIT_CATEGORIES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function StoragePlanLimits() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="Storage and Plan Limits"
        headingId="spl-h1"
        heading="Understand what each plan includes — before you need it."
        sub="LAGDA plans define capacity across signing volume, workspace seats, storage, templates, and feature access. This page explains the categories to look for when choosing or upgrading a plan."
      />

      <PageSection id="categories" light bordered>
        <SectionHeading eyebrow="Limit categories" id="lc-h2" heading="Every dimension that varies by plan." sub="Exact figures are shown on the Pricing page. This page explains what each category means and why it matters." center />
        <div style={{ display: "grid", gap: 10 }} className="lc-grid">
          {PLAN_LIMIT_CATEGORIES.map((c) => (
            <div key={c.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{c.title}</p>
                <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <style>{`.lc-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 660px) { .lc-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="storage">
        <SectionHeading eyebrow="Document storage" id="ds-h2" heading="Where documents are stored and for how long." center />
        <div style={{ display: "grid", gap: 10 }} className="ds-grid">
          {[
            { title: "During the transaction",   desc: "Documents are retained during the active signing workflow until completed, declined, cancelled, or expired." },
            { title: "After completion",          desc: "Completed transaction records are retained according to the plan's retention period. Download and export at any time." },
            { title: "Archived transactions",    desc: "Archived transactions are removed from active views. Storage implications and retention may vary by plan." },
          ].map((s) => (
            <div key={s.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 14px" }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.title}</p>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ds-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 700px) { .ds-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="upgrade" light bordered>
        <SectionHeading eyebrow="Approaching limits" id="al-h2" heading="What happens when you near or reach a plan limit." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640, margin: "0 auto" }}>
          {[
            { trigger: "Signing requests near limit",      behavior: "You are notified before the limit is reached. Outstanding transactions are not interrupted." },
            { trigger: "Storage approaching capacity",     behavior: "A notification prompts you to review storage or consider a plan upgrade." },
            { trigger: "Seat limit reached",               behavior: "New member invitations may be blocked until the seat count is increased." },
            { trigger: "Authentication method gating",     behavior: "Advanced methods like SMS OTP may require a plan that includes them. Existing transactions are not disrupted." },
          ].map((r) => (
            <div key={r.trigger} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 3 }}>{r.trigger}</p>
                <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{r.behavior}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <p style={{ color: "#8A9BAE", ...GF, fontSize: 13, margin: 0 }}>
            Exact limits, upgrade flows, and overage behavior are on the{" "}
            <a href="/pricing" style={{ color: "#38BDF8", textDecoration: "underline" }}>Pricing page</a>.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Pricing",           desc: "Exact limits by plan tier", path: "/pricing" },
        { label: "Team Workspaces",   desc: "Seat and role structure", path: "/features/team-workspaces" },
        { label: "API & Integrations", desc: "Enterprise volume access", path: "/features/api-and-integrations" },
      ]} />

      <PageCTA
        heading="See exact plan details on the Pricing page."
        sub="LAGDA plans are designed to grow with your team. Compare what's included before you start."
        primaryLabel="View Pricing"
        primaryPath="/pricing"
        secondaryLabel="Create Free Account"
        secondaryPath="/create-account"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
