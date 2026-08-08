import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  RelatedPages,
  PageCTA,
  LegalNote,
  AvailBadge,
} from "../../../components/esignature/EsigPageShell";
import { ADVANCED_CAPS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Parallel vs sequential visual ─────────────────────────────────────────────
function ParallelSequentialComparison() {
  return (
    <div style={{ display: "grid", gap: 16 }} className="ps-grid">
      {/* Parallel */}
      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 14, padding: "20px 18px" }}>
        <p style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>PARALLEL SIGNING</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {["Ana Reyes · Signer", "Marco Santos · Signer"].map((p) => (
            <div key={p} style={{ background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 8, padding: "7px 12px", ...GF, fontSize: 12, fontWeight: 600, color: "white" }}>
              {p}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(0,120,212,0.25)", marginBottom: 12 }} />
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, padding: "7px 12px", ...GF, fontSize: 12, fontWeight: 600, color: "#22C55E", display: "inline-flex" }}>
          Complete when both sign
        </div>
        <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5, margin: "14px 0 0" }}>
          All participants act at the same time. Useful when signing order does not matter.
        </p>
      </div>

      {/* Sequential */}
      <div style={{ background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.2)", borderRadius: 14, padding: "20px 18px" }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14 }}>SEQUENTIAL SIGNING</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {["Manager approves first →", "Signatory signs second →", "Completed"].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < 2 ? "1px dashed rgba(201,150,12,0.2)" : "none" }}>
              <span style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ color: i === 2 ? "#22C55E" : "#94a3b8", ...GF, fontSize: 12 }}>{step}</span>
            </div>
          ))}
        </div>
        <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.5, margin: "14px 0 0" }}>
          Each participant acts only after the previous one completes. Useful when authority or approval depends on sequence.
        </p>
      </div>
      <style>{`.ps-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 640px) { .ps-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Reminders mockup ──────────────────────────────────────────────────────────
function RemindersMockup() {
  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.2)",
      borderRadius: 14, overflow: "hidden",
      maxWidth: 360, width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 700 }}>Reminder Settings</span>
      </div>
      {[
        { label: "First reminder",       value: "After 3 days" },
        { label: "Follow-up reminders",  value: "Every 2 days" },
        { label: "Completion deadline",  value: "21 July 2026" },
        { label: "After expiry",         value: "Transaction locked, record retained" },
      ].map((row) => (
        <div key={row.label} style={{ padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 12 }}>
          <span style={{ color: "#475569", ...GM, fontSize: 10, flexShrink: 0, minWidth: 120 }}>{row.label}</span>
          <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{row.value}</span>
        </div>
      ))}
      <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.2)" }}>
        <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0 }}>
          Reminder delivery is not guaranteed. LAGDA dispatches reminders but cannot control email delivery.
        </p>
      </div>
    </div>
  );
}

// ── Capabilities table ────────────────────────────────────────────────────────
function CapabilitiesTable() {
  const tiers = ["Core", "Advanced", "Enterprise"] as const;
  const tierColors = { Core: "#22C55E", Advanced: "#38bdf8", Enterprise: "#C9960C" };

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        {tiers.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: tierColors[t] }} />
            <span style={{ color: "#64748b", ...GF, fontSize: 13 }}>
              {t === "Core" ? "Available" : t === "Advanced" ? "Plan dependent" : "Enterprise"}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }} className="cap-table-grid">
        {ADVANCED_CAPS.map((cap) => (
          <div key={cap.title} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "12px 14px",
          }}>
            <span style={{ color: tierColors[cap.tier as keyof typeof tierColors], fontSize: 14, flexShrink: 0, paddingTop: 1 }}>
              {cap.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>{cap.title}</span>
                <AvailBadge tier={cap.tier as "Core" | "Advanced" | "Enterprise"} />
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{cap.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`.cap-table-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 720px) { .cap-table-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigAdvancedCapabilities() {
  return (
    <EsigPageShell>
      <PageHero
        eyebrow="Advanced Capabilities"
        headingId="ac-h1"
        heading="Advanced tools for faster, clearer signing workflows."
        sub="Beyond the basic signing journey — LAGDA supports parallel and sequential routing, reminders, expiration, organization features, and enterprise-scale capabilities as the platform expands."
      />

      {/* Routing comparison */}
      <PageSection id="routing" light bordered>
        <SectionHeading eyebrow="Routing" id="ac-routing-heading" heading="Multiple signers can sign at the same time — or in a defined order." sub="Choose parallel or sequential routing for each transaction, or combine both in a mixed workflow." />
        <ParallelSequentialComparison />
        <div style={{ marginTop: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>MIXED ROUTING EXAMPLE</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Two authorized representatives sign simultaneously in Step 1. Only after both complete does the final signatory receive their invitation in Step 2. LAGDA supports grouping participants into steps to match complex organizational routing requirements.
          </p>
        </div>
      </PageSection>

      {/* Reminders and expiration */}
      <PageSection id="reminders">
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="ac-two-col">
          <div>
            <SectionHeading eyebrow="Reminders & expiration" id="remind-heading" heading="Know when, how, and where signing happened." sub="Configure automated reminders for pending participants and set a completion deadline to keep transactions moving." />
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {[
                "Set a first-reminder delay (e.g., after 3 days)",
                "Configure follow-up reminder frequency",
                "Send a manual reminder to a specific participant at any time",
                "Set an expiration date for the transaction",
                "Transactions can be extended where permitted",
                "Expired transactions are locked; records are retained",
              ].map((item) => (
                <li key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ color: "#0078D4", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
            <p style={{ color: "#475569", ...GF, fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
              Reminder delivery is not guaranteed. LAGDA dispatches reminders but cannot control email or SMS delivery.
            </p>
          </div>
          <RemindersMockup />
        </div>
        <style>{`.ac-two-col { grid-template-columns: 1fr 1fr; } @media (max-width: 760px) { .ac-two-col { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Organization features */}
      <PageSection id="organization" light bordered>
        <SectionHeading eyebrow="Organization" id="org-heading" heading="Find and manage your documents at scale." sub="LAGDA includes tools to organize, search, and navigate a growing set of transactions." />
        <div style={{ display: "grid", gap: 12 }} className="org-grid">
          {[
            { title: "Search",             desc: "Find transactions by document name, participant, or keyword." },
            { title: "Status filters",     desc: "Filter by status — pending, completed, expired, or declined." },
            { title: "Folder organization",desc: "Group transactions into folders by project, client, or document type.", tier: "Advanced" },
            { title: "Tags",               desc: "Apply custom tags to categorize and filter transactions.", tier: "Advanced" },
            { title: "Contacts",           desc: "Save and reuse participant email addresses and profile information." },
            { title: "Failed delivery",    desc: "Identify when an invitation could not be delivered and take action." },
          ].map((f) => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>{f.title}</span>
                {f.tier && <AvailBadge tier="Advanced" />}
              </div>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <style>{`.org-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .org-grid { grid-template-columns: 1fr; } }`}</style>
      </PageSection>

      {/* Full capabilities list */}
      <PageSection id="all-capabilities">
        <SectionHeading eyebrow="All capabilities" id="all-cap-heading" heading="Everything LAGDA eSignature supports." sub="Current, plan-dependent, and planned capabilities — clearly labeled." />
        <CapabilitiesTable />
        <div style={{ marginTop: 24, background: "rgba(201,150,12,0.06)", border: "1px solid rgba(201,150,12,0.15)", borderRadius: 12, padding: "16px 18px" }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>ENTERPRISE AND PLANNED CAPABILITIES</p>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            LAGDA's architecture is intended to support advanced delivery models such as bulk workflows, embedded signing, web forms, APIs, and webhooks as the platform expands. These are not currently available to all users. Contact Sales to discuss enterprise requirements.
          </p>
        </div>
      </PageSection>

      <RelatedPages links={[
        { label: "Templates & Branding", desc: "Reusable workflows and company branding", path: "/esignature/templates-and-branding" },
        { label: "Team & Enterprise",    desc: "Shared workspaces and organization administration", path: "/esignature/team-and-enterprise" },
      ]} />

      <PageCTA
        heading="Start with LAGDA eSignature today."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Contact Sales"
        secondaryPath="/contact"
      />

      <LegalNote />
    </EsigPageShell>
  );
}
