import { FeaturesPageShell } from "../../../components/features/FeaturesSubNav";
import {
  PageHero, PageSection, SectionHeading, RelatedPages, PageCTA, LegalNote, AvailBadge,
} from "../../../components/esignature/EsigPageShell";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

function ApiEndpointMockup() {
  const endpoints = [
    { method: "POST", path: "/v1/transactions",      desc: "Create a signing transaction" },
    { method: "GET",  path: "/v1/transactions/{id}", desc: "Get transaction status and events" },
    { method: "POST", path: "/v1/templates/{id}/use", desc: "Start a transaction from a template" },
    { method: "GET",  path: "/v1/audit/{id}",         desc: "Retrieve the full audit trail" },
  ];
  return (
    <div aria-hidden style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden", maxWidth: 440, width: "100%", boxShadow: "0 4px 16px rgba(7,17,31,0.08)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, margin: 0 }}>LAGDA API · PLANNED · NOT BUILT</p>
      </div>
      {endpoints.map((e, i) => (
        <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{
            background: e.method === "POST" ? "rgba(0,120,212,0.1)" : "rgba(34,197,94,0.1)",
            color: e.method === "POST" ? "#0078D4" : "#178A4C",
            border: `1px solid ${e.method === "POST" ? "rgba(0,120,212,0.3)" : "rgba(34,197,94,0.25)"}`,
            ...GM, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, flexShrink: 0, marginTop: 1,
          }}>{e.method}</span>
          <div>
            <p style={{ color: "#07111F", ...GM, fontSize: 11, margin: 0 }}>{e.path}</p>
            <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: "2px 0 0" }}>{e.desc}</p>
          </div>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "#f8fafb" }}>
        <p style={{ color: "#94A3B8", ...GM, fontSize: 9, margin: 0 }}>A sketch of what is planned. These endpoints do not exist.</p>
      </div>
    </div>
  );
}

export function ApiIntegrations() {
  return (
    <FeaturesPageShell>
      <PageHero
        eyebrow="API and Integrations"
        headingId="api-h1"
        heading="Planned: embed LAGDA signing into your own systems."
        sub="An API and webhooks are planned and are not built yet. This page describes the direction so you can tell us what you would need. There is no API to use today, and no keys can be issued."
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 8px" }}>
        <div role="note" data-testid="api-planned-notice" style={{ background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.3)", borderRadius: 12, padding: "14px 18px" }}>
          <p style={{ color: "#8A6508", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 4px" }}>PLANNED — NOT AVAILABLE</p>
          <p style={{ color: "#334155", ...GF, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            LAGDA has no public API and no webhooks today. Everything below is planned work, shown so the direction is clear. Nothing on this page can be bought, enabled or connected yet.
          </p>
        </div>
      </div>

      <PageSection id="overview" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="api-two-col">
          <div>
            <SectionHeading eyebrow="Planned API" id="ea-h2" heading="What the API is planned to do." sub="The intent is to let an organization start and follow signing transactions from its own systems. None of this is built yet." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                "Planned: start signing transactions from your system",
                "Track transaction status and completion programmatically",
                "Planned: webhook events for key transaction milestones",
                "Planned: retrieve the audit trail programmatically",
                "Planned: start a transaction from a saved template",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span aria-hidden style={{ color: "#B45309", fontWeight: 700, flexShrink: 0 }}>○</span>
                  <span style={{ color: "#334155", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              <AvailBadge tier="Planned" />
              <span style={{ color: "#64748B", ...GF, fontSize: 13, marginLeft: 10 }}>Not available on any plan yet. Tell us what you need and we will tell you when it opens.</span>
            </div>
          </div>
          <ApiEndpointMockup />
        </div>
        <style>{`.api-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .api-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="webhooks">
        <SectionHeading eyebrow="Webhooks" id="wh-h2" heading="Real-time event delivery to your endpoint." center />
        <div style={{ display: "grid", gap: 10 }} className="wh-grid">
          {[
            { event: "transaction.created",   desc: "A new signing transaction has been created." },
            { event: "participant.viewed",     desc: "A participant has opened the document." },
            { event: "participant.signed",     desc: "A participant has completed their signature." },
            { event: "participant.declined",   desc: "A participant has declined to sign." },
            { event: "transaction.completed",  desc: "All required participants have acted." },
            { event: "transaction.expired",    desc: "The transaction reached its expiration date without completion." },
          ].map((w) => (
            <div key={w.event} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, padding: "10px 12px", boxShadow: "0 1px 4px rgba(7,17,31,0.06)" }}>
              <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{w.event}</p>
              <p style={{ color: "#64748B", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{w.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.wh-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .wh-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="safeguards" light bordered>
        <SectionHeading eyebrow="Safeguards" id="sg-h2" heading="What this page is not." center />
        <div style={{ display: "grid", gap: 10 }} className="sg-grid">
          {[
            { label: "No credential issuance here",    desc: "There are no API keys or credentials to issue: the API is planned and not built." },
            { label: "No production environment here", desc: "This page describes planned capabilities. It does not connect to any LAGDA signing infrastructure." },
            { label: "No real signing via sandbox",    desc: "The API endpoint examples on this page are illustrative only. They do not trigger real document transactions." },
            { label: "No partner program listed",      desc: "LAGDA does not list specific integration partner names or certifications on this page." },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#9A7208", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.label}</p>
              <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.sg-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .sg-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Storage & Plan Limits",   desc: "What each plan includes today", path: "/features/storage-and-plan-limits" },
        { label: "Team & Enterprise",       desc: "Enterprise workspace and admin features", path: "/esignature/team-and-enterprise" },
        { label: "View Pricing",            desc: "Enterprise plan inquiry", path: "/pricing" },
      ]} />

      <PageCTA
        heading="Tell us what you would connect LAGDA to."
        sub="The API and webhooks are planned, not built. Tell us what you need and we will tell you when they open."
        primaryLabel="Tell us what you need"
        primaryPath="/contact?category=partnership"
        secondaryLabel="View Plans"
        secondaryPath="/pricing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
