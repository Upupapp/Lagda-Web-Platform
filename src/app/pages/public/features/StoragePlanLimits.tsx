import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { AccountPageCTA } from "../../../components/shell/AccountPageCTA";
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
            <div key={c.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "14px 14px", display: "flex", gap: 12 }}>
              <span aria-hidden style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
              <div>
                <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{c.title}</p>
                <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
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
            { title: "After completion",          desc: "Completed documents and their audit trails stay available on every plan, including Free. Download them at any time." },
            { title: "Archived transactions",    desc: "Archived transactions are removed from active views." },
          ].map((s) => (
            <div key={s.title} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "14px 14px" }}>
              <p style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.title}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.ds-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 700px) { .ds-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="upgrade" light bordered>
        <SectionHeading eyebrow="Approaching limits" id="al-h2" heading="What happens when you near or reach a plan limit." center />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 640, margin: "0 auto" }}>
          {[
            { trigger: "Sending limit reached",            behavior: "On Free, sending pauses after your one document until you choose Personal or Business. Your drafts are kept, and signing what others send you is never limited." },
            { trigger: "Storage",                          behavior: "500 MB on Free, 5 GB on Personal and 50 GB shared on Business. A larger plan is chosen in My Settings › Plan & Billing." },
            { trigger: "People in a workspace",            behavior: "Free and Personal are for one person. A Business workspace holds up to 50 people." },
            { trigger: "Signer authentication",            behavior: "Every plan has the same signer authentication: a secure invitation link and an email code, or signing from a LAGDA account. SMS OTP is planned and not available yet." },
          ].map((r) => (
            <div key={r.trigger} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 3 }}>{r.trigger}</p>
                <p style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{r.behavior}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, margin: 0 }}>
            The documents you can send each month and the storage on each plan are on the{" "}
            <a href="/pricing" style={{ color: "#0078D4", textDecoration: "underline" }}>Pricing page</a>.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Pricing",           desc: "Documents and storage by plan", path: "/pricing" },
        { label: "Team Workspaces",   desc: "Seat and role structure", path: "/features/team-workspaces" },
        { label: "API & Integrations", desc: "Planned — not built yet", path: "/features/api-and-integrations" },
      ]} />

      <AccountPageCTA
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
