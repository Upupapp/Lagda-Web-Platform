import { Link } from "react-router";
import {
  EsigPageShell,
  PageHero,
  PageSection,
  SectionHeading,
  FeatureCard,
  RelatedPages,
  PageCTA,
  LegalNote,
} from "../../../components/esignature/EsigPageShell";
import { OVERVIEW_FEATURES, LIFECYCLE_STEPS, TRANSACTION_STATUSES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Transaction dashboard mockup ──────────────────────────────────────────────
function DashboardMockup() {
  const docs = [
    { name: "Professional Services Agreement", status: "Awaiting Approval", statusColor: "#F59E0B", updated: "Just now" },
    { name: "Engagement Letter — Reyes Family", status: "Completed",         statusColor: "#22C55E", updated: "Yesterday" },
    { name: "Board Resolution No. 12",          status: "Sent",              statusColor: "#0078D4", updated: "2 days ago" },
  ];

  return (
    <div aria-hidden style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.25)",
      borderRadius: 16,
      overflow: "hidden",
      maxWidth: 480,
      width: "100%",
      boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
    }}>
      {/* Header bar */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>My Documents</span>
        <span style={{ background: "rgba(0,120,212,0.15)", color: "#38bdf8", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 999, padding: "2px 10px", ...GM, fontSize: 10, fontWeight: 700 }}>
          3 active
        </span>
      </div>

      {/* Doc rows */}
      {docs.map((doc, i) => (
        <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doc.name}
            </p>
            <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "3px 0 0" }}>{doc.updated}</p>
          </div>
          <span style={{ ...GM, fontSize: 10, fontWeight: 700, color: doc.statusColor, flexShrink: 0, background: `${doc.statusColor}18`, padding: "2px 8px", borderRadius: 999 }}>
            {doc.status}
          </span>
        </div>
      ))}

      {/* Audit event preview */}
      <div style={{ padding: "12px 20px", background: "rgba(0,120,212,0.04)" }}>
        <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>LATEST EVENT</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
          <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>Marco Santos viewed the document</span>
          <span style={{ color: "#334155", ...GM, fontSize: 10, marginLeft: "auto", flexShrink: 0 }}>2m ago</span>
        </div>
      </div>
    </div>
  );
}

// ── Lifecycle steps visual ────────────────────────────────────────────────────
function LifecycleStrip() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 32 }}>
      {LIFECYCLE_STEPS.map((s) => (
        <div key={s.num} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: s.role === "recipient" ? "rgba(201,150,12,0.08)" : "rgba(0,120,212,0.08)",
          border: `1px solid ${s.role === "recipient" ? "rgba(201,150,12,0.2)" : "rgba(0,120,212,0.2)"}`,
          borderRadius: 8, padding: "6px 12px",
        }}>
          <span style={{ color: s.role === "recipient" ? "#C9960C" : "#0078D4", ...GM, fontSize: 10, fontWeight: 700 }}>
            {String(s.num).padStart(2, "0")}
          </span>
          <span style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600 }}>{s.title}</span>
        </div>
      ))}
    </div>
  );
}

// ── Status reference ──────────────────────────────────────────────────────────
function StatusReference() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {TRANSACTION_STATUSES.map((s) => (
        <div key={s.status} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, padding: "6px 12px",
          title: s.desc,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
          <span style={{ color: "#94a3b8", ...GF, fontSize: 12 }}>{s.status}</span>
        </div>
      ))}
    </div>
  );
}

// ── Sender vs recipient ───────────────────────────────────────────────────────
function SenderRecipientSection() {
  const SENDER = ["Prepare documents", "Add participants and roles", "Configure signing order", "Set authentication requirements", "Place fields", "Send and track progress"];
  const RECIPIENT = ["Receive secure invitation", "Authenticate identity", "Review the document", "Complete required fields", "Sign or approve", "Download or verify when complete"];

  return (
    <PageSection id="sender-recipient" bordered>
      <SectionHeading eyebrow="Two experiences" id="sr-heading" heading="Designed differently for senders and recipients." sub="The sender configures and tracks. The recipient signs in a clean, guided experience — no LAGDA account required." center />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="sr-grid">
        {[{ title: "Sender", color: "#0078D4", bg: "rgba(0,120,212,0.08)", border: "rgba(0,120,212,0.2)", steps: SENDER },
          { title: "Recipient", color: "#C9960C", bg: "rgba(201,150,12,0.08)", border: "rgba(201,150,12,0.2)", steps: RECIPIENT }].map((col) => (
          <div key={col.title} style={{
            background: col.bg, border: `1px solid ${col.border}`,
            borderRadius: 14, padding: "24px 20px",
          }}>
            <p style={{ color: col.color, ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>
              {col.title.toUpperCase()} EXPERIENCE
            </p>
            {col.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < col.steps.length - 1 ? 10 : 0 }}>
                <span style={{ color: col.color, ...GM, fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <style>{`
        .sr-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .sr-grid { grid-template-columns: 1fr; } }
      `}</style>
    </PageSection>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function EsigOverview() {
  return (
    <EsigPageShell>
      {/* Hero */}
      <PageHero
        eyebrow="LAGDA eSignature — Available Now"
        headingId="overview-h1"
        heading="Everything you need to send, sign, track, and verify documents online."
        sub="LAGDA eSignature helps Philippine professionals and organizations prepare documents, verify signers, collect signatures, track status, generate audit records, and confirm completed transactions."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <Link to="/create-account" style={{
            background: "#0078D4", color: "white", padding: "13px 28px", borderRadius: 12,
            ...GF, fontSize: 15, fontWeight: 700, textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            boxShadow: "0 4px 16px rgba(0,120,212,0.3)", transition: "filter 0.15s ease",
            minHeight: 44,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
          >
            Create Free Account
          </Link>
          <Link to="/esignature/core-workflow" style={{
            background: "rgba(255,255,255,0.06)", color: "white",
            border: "1px solid rgba(255,255,255,0.18)", padding: "13px 22px", borderRadius: 12,
            ...GF, fontSize: 15, fontWeight: 600, textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            transition: "background 0.15s ease", minHeight: 44,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            See How It Works
          </Link>
          <Link to="/verify" style={{ color: "#64748b", padding: "13px 8px", ...GF, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", transition: "color 0.15s ease", minHeight: 44 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
          >
            Verify a Document →
          </Link>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["eSignature Available Now", "Identity-Aware Signing", "Audit-Ready Records", "Document Verification", "Built for Philippine Workflows"].map((badge) => (
            <span key={badge} style={{
              background: "rgba(0,120,212,0.1)", color: "#38bdf8",
              border: "1px solid rgba(0,120,212,0.2)", borderRadius: 999,
              padding: "3px 10px", ...GM, fontSize: 10, fontWeight: 700,
            }}>
              {badge}
            </span>
          ))}
        </div>
      </PageHero>

      {/* Dashboard mockup + lifecycle strip */}
      <PageSection id="overview-mockup" light bordered>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "32px 48px", alignItems: "start" }} className="overview-mock-grid">
          <div>
            <SectionHeading eyebrow="Full lifecycle" id="lifecycle-heading" heading="Built for the full eSignature workflow." sub="LAGDA covers every step — from preparing a document to verifying the completed record." />
            <LifecycleStrip />
            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0078D4", marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: "#64748b", ...GF, fontSize: 13 }}>Blue = Sender actions</span>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9960C", marginTop: 2, flexShrink: 0, marginLeft: 12 }} />
              <span style={{ color: "#64748b", ...GF, fontSize: 13 }}>Gold = Recipient actions</span>
            </div>
          </div>
          <div className="overview-mockup-col">
            <DashboardMockup />
          </div>
        </div>
        <style>{`
          .overview-mock-grid { grid-template-columns: 1fr auto; }
          .overview-mockup-col { display: block; }
          @media (max-width: 860px) {
            .overview-mock-grid { grid-template-columns: 1fr; }
            .overview-mockup-col { display: none; }
          }
        `}</style>
      </PageSection>

      {/* Capabilities grid */}
      <PageSection id="capabilities">
        <SectionHeading eyebrow="Capabilities" id="cap-heading" heading="Every capability in one eSignature platform." center />
        <div style={{ display: "grid", gap: 14 }} className="overview-cap-grid">
          {OVERVIEW_FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
        <style>{`
          .overview-cap-grid { grid-template-columns: repeat(4, 1fr); }
          @media (max-width: 1024px) { .overview-cap-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 560px)  { .overview-cap-grid { grid-template-columns: 1fr; } }
        `}</style>
      </PageSection>

      {/* Sender vs recipient */}
      <SenderRecipientSection />

      {/* Transaction statuses */}
      <PageSection id="statuses">
        <SectionHeading eyebrow="Transaction states" id="status-heading" heading="Know exactly where every document stands." sub="LAGDA tracks your documents through every stage — from draft to completed and verified." />
        <StatusReference />
      </PageSection>

      <RelatedPages links={[
        { label: "Core Workflow",        desc: "Step-by-step sender and recipient journey", path: "/esignature/core-workflow" },
        { label: "Verification & Audit", desc: "Evidence, audit trail, and public verification", path: "/esignature/verification-and-audit" },
        { label: "Advanced Capabilities", desc: "Routing, reminders, and enterprise features", path: "/esignature/advanced-capabilities" },
        { label: "Templates & Branding", desc: "Reusable workflows and company branding", path: "/esignature/templates-and-branding" },
      ]} />

      <PageCTA
        heading="Ready to send your first document?"
        sub="Create a free LAGDA account and send your first document today."
        primaryLabel="Create Free Account"
        primaryPath="/create-account"
        secondaryLabel="Book a Demo"
        secondaryPath="/contact"
      />

      <LegalNote showEnotary />
    </EsigPageShell>
  );
}
