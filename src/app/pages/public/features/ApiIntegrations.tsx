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
    <div aria-hidden style={{ background: "rgba(7,17,31,0.95)", border: "1px solid rgba(0,120,212,0.22)", borderRadius: 14, overflow: "hidden", maxWidth: 440, width: "100%" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0 }}>LAGDA API · v1 · Enterprise</p>
      </div>
      {endpoints.map((e, i) => (
        <div key={i} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{
            background: e.method === "POST" ? "rgba(0,120,212,0.15)" : "rgba(34,197,94,0.1)",
            color: e.method === "POST" ? "#38bdf8" : "#22C55E",
            border: `1px solid ${e.method === "POST" ? "rgba(0,120,212,0.3)" : "rgba(34,197,94,0.25)"}`,
            ...GM, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, flexShrink: 0, marginTop: 1,
          }}>{e.method}</span>
          <div>
            <p style={{ color: "#e2e8f0", ...GM, fontSize: 11, margin: 0 }}>{e.path}</p>
            <p style={{ color: "#475569", ...GF, fontSize: 11, margin: "2px 0 0" }}>{e.desc}</p>
          </div>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)" }}>
        <p style={{ color: "#334155", ...GM, fontSize: 9, margin: 0 }}>Representative endpoint shapes — not production documentation. API access is Enterprise.</p>
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
        heading="Embed LAGDA signing into your own systems and workflows."
        sub="Enterprise API access allows organizations to initiate transactions, track status, and receive webhooks programmatically. This page describes the integration direction — not production API documentation."
      />

      <PageSection id="overview" light bordered>
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="api-two-col">
          <div>
            <SectionHeading eyebrow="Enterprise API" id="ea-h2" heading="Trigger signing transactions from your own applications." sub="The LAGDA API is designed for enterprise and developer integrations where document workflows need to be embedded in an existing system." />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {[
                "Initiate signing transactions via API",
                "Track transaction status and completion programmatically",
                "Receive real-time webhook events for key transaction milestones",
                "Retrieve full audit trails via API",
                "Launch workflows from saved templates",
              ].map((item) => (
                <div key={item} style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div>
              <AvailBadge tier="Enterprise" />
              <span style={{ color: "#475569", ...GF, fontSize: 13, marginLeft: 10 }}>API access is available on Enterprise plans. Contact Sales for details.</span>
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
            <div key={w.event} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{w.event}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{w.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.wh-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .wh-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <PageSection id="safeguards" light bordered>
        <SectionHeading eyebrow="Safeguards" id="sg-h2" heading="What API integrations do not do." center />
        <div style={{ display: "grid", gap: 10 }} className="sg-grid">
          {[
            { label: "No credential issuance here",    desc: "API keys and credentials are issued through your account settings after contacting Sales — not via a self-serve mechanism on this page." },
            { label: "No production environment here", desc: "This page describes integration capabilities. It does not connect to any LAGDA signing infrastructure." },
            { label: "No real signing via sandbox",    desc: "The API endpoint examples on this page are illustrative only. They do not trigger real document transactions." },
            { label: "No partner program listed",      desc: "LAGDA does not list specific integration partner names or certifications on this page." },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, margin: 0, marginBottom: 4 }}>{s.label}</p>
              <p style={{ color: "#94a3b8", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.sg-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 600px) { .sg-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      <RelatedPages links={[
        { label: "Storage & Plan Limits",   desc: "API access by plan tier", path: "/features/storage-and-plan-limits" },
        { label: "Team & Enterprise",       desc: "Enterprise workspace and admin features", path: "/esignature/team-and-enterprise" },
        { label: "View Pricing",            desc: "Enterprise plan inquiry", path: "/pricing" },
      ]} />

      <PageCTA
        heading="Contact Sales to discuss Enterprise API access."
        sub="LAGDA's Enterprise plan includes API access, webhooks, and dedicated support. Reach out to start a conversation."
        primaryLabel="Contact Sales"
        primaryPath="/contact"
        secondaryLabel="View Plans"
        secondaryPath="/pricing"
      />
      <LegalNote />
    </FeaturesPageShell>
  );
}
