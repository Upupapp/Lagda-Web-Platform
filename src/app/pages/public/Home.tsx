import { Link } from "react-router";
import { HeroSection } from "./home/HeroSection";
import { WorkflowSection } from "./home/WorkflowSection";
import { VerificationSection } from "./home/VerificationSection";
import {
  CAPABILITIES,
  SOLUTIONS,
  TRUST_LAYERS,
  PRICING_PLANS,
  RESOURCES,
} from "./home/content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ─────────────────────────────────────────────────────────────────────────────
// Shared section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  id,
  children,
  bg,
  bordered,
}: {
  id?: string;
  children: React.ReactNode;
  bg?: string;
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        background: bg ?? "transparent",
        borderTop: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined,
        borderBottom: bordered ? "1px solid rgba(255,255,255,0.06)" : undefined,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        {children}
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  headingId,
  heading,
  sub,
  center = false,
}: {
  eyebrow: string;
  headingId: string;
  heading: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div style={{ marginBottom: 48, textAlign: center ? "center" : undefined }}>
      <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
        {eyebrow}
      </p>
      <h2 id={headingId} style={{ color: "white", ...GF, fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: 0, marginBottom: sub ? 12 : 0, letterSpacing: "-0.02em" }}>
        {heading}
      </h2>
      {sub && (
        <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65, margin: center ? "0 auto" : 0, maxWidth: 600 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Capabilities grid
// ─────────────────────────────────────────────────────────────────────────────
function CapabilitiesSection() {
  return (
    <Section id="capabilities" bordered bg="rgba(255,255,255,0.015)">
      <SectionHeader
        eyebrow="What you can do"
        headingId="cap-heading"
        heading="Every capability you need, designed for Philippine workflows."
        sub="LAGDA eSignature covers the full lifecycle: from preparing a document to verifying the result."
        center
      />
      <div className="cap-grid" style={{ display: "grid", gap: 16 }}>
        {CAPABILITIES.map((cap) => (
          <Link
            key={cap.title}
            to={cap.path}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "20px 20px 18px",
              height: "100%",
              transition: "border-color 0.15s ease, background 0.15s ease",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.4)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(0,120,212,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
            >
              <span aria-hidden="true" style={{ fontSize: 24, display: "block", marginBottom: 12 }}>{cap.icon}</span>
              <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 6 }}>{cap.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{cap.desc}</p>
            </div>
          </Link>
        ))}
      </div>
      <style>{`
        .cap-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 1024px) { .cap-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px)  { .cap-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity-aware signing
// ─────────────────────────────────────────────────────────────────────────────
function SigningSection() {
  const AUTH_METHODS = [
    { label: "Secure Link", desc: "A unique one-time link sent to the participant's email. Accessible without passwords." },
    { label: "Email OTP", desc: "A one-time passcode delivered to the participant's registered email address." },
    { label: "SMS OTP", desc: "A one-time passcode delivered via SMS to the participant's phone number." },
    { label: "Authenticator App", desc: "TOTP-based verification through the participant's authenticator application." },
    { label: "Enterprise SSO", desc: "Authentication through the organization's existing Single Sign-On identity provider." },
  ];

  return (
    <Section id="identity-aware-signing">
      <div style={{ display: "grid", gap: "48px 64px", alignItems: "center" }} className="signing-grid">
        <div>
          <SectionHeader
            eyebrow="Signer authentication"
            headingId="signing-heading"
            heading="Know who signed. Every time."
            sub="LAGDA confirms participant identity at the moment of signing using the authentication method you configure for each person."
          />
          <Link
            to="/features/signer-authentication"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#0078D4", ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#38bdf8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#0078D4"; }}
          >
            Learn about authentication →
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AUTH_METHODS.map((m) => (
            <div key={m.label} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "12px 16px",
              display: "flex", gap: 12, alignItems: "flex-start",
            }}>
              <span style={{ color: "#0078D4", ...GM, fontSize: 10, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>✓</span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 2 }}>{m.label}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .signing-grid { grid-template-columns: 1fr 1fr; }
        .signing-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 760px) { .signing-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow types
// ─────────────────────────────────────────────────────────────────────────────
function WorkflowTypesSection() {
  const TYPES = [
    {
      title: "Sequential",
      icon: "→",
      desc: "Participants act one after another, in defined order. Each step only opens when the previous one is complete.",
    },
    {
      title: "Parallel",
      icon: "⇉",
      desc: "All participants can sign or approve simultaneously. Completion requires all to respond.",
    },
    {
      title: "Mixed",
      icon: "⇌",
      desc: "Combine ordered groups — some participants sign together, then the result proceeds to the next group.",
    },
  ];

  return (
    <Section id="workflow-types" bordered bg="rgba(255,255,255,0.015)">
      <SectionHeader
        eyebrow="Routing"
        headingId="workflow-types-heading"
        heading="Your workflow, your order."
        sub="LAGDA supports the way your documents actually need to move — in sequence, all at once, or in combinations."
        center
      />
      <div style={{ display: "grid", gap: 20 }} className="wt-grid">
        {TYPES.map((t) => (
          <div key={t.title} style={{
            background: "rgba(7,17,31,0.95)",
            border: "1px solid rgba(0,120,212,0.18)",
            borderRadius: 16, padding: "28px 24px",
            textAlign: "center",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(0,120,212,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, margin: "0 auto 16px", color: "#38bdf8",
              ...GM,
            }}>
              {t.icon}
            </div>
            <p style={{ color: "white", ...GF, fontSize: 16, fontWeight: 800, margin: 0, marginBottom: 10 }}>{t.title}</p>
            <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
          </div>
        ))}
      </div>
      <style>{`
        .wt-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 720px) { .wt-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit trail
// ─────────────────────────────────────────────────────────────────────────────
function AuditSection() {
  const EVENTS = [
    { time: "14 Jul · 2:00 PM", event: "Transaction created", by: "Mabini Legal Solutions", color: "#38bdf8" },
    { time: "14 Jul · 2:01 PM", event: "Invitation sent", by: "Ana Reyes · ana@example.ph", color: "#64748b" },
    { time: "14 Jul · 2:14 PM", event: "Document viewed", by: "Ana Reyes · IP ··· .42", color: "#64748b" },
    { time: "14 Jul · 2:15 PM", event: "Email OTP verified", by: "Ana Reyes", color: "#22C55E" },
    { time: "14 Jul · 2:16 PM", event: "Signed", by: "Ana Reyes · signature adopted", color: "#0078D4" },
    { time: "14 Jul · 2:16 PM", event: "Approval request sent", by: "Marco Santos · marco@example.ph", color: "#64748b" },
  ];

  return (
    <Section id="audit-trail">
      <div style={{ display: "grid", gap: "48px 64px", alignItems: "center" }} className="audit-grid">
        {/* Mock audit panel */}
        <div style={{
          background: "rgba(7,17,31,0.95)",
          border: "1px solid rgba(0,120,212,0.2)",
          borderRadius: 16, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700 }}>Activity Log</span>
            <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>6 EVENTS</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {EVENTS.map((ev, i) => (
              <div key={i} style={{ padding: "10px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "white", ...GF, fontSize: 12, fontWeight: 600, margin: 0 }}>{ev.event}</p>
                  <p style={{ color: "#475569", ...GM, fontSize: 10, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.by}</p>
                </div>
                <span style={{ color: "#334155", ...GM, fontSize: 10, flexShrink: 0 }}>{ev.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Copy */}
        <div>
          <SectionHeader
            eyebrow="Audit trail"
            headingId="audit-heading"
            heading="Every action. Recorded."
          />
          <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 16 }}>
            LAGDA records a timestamped, detailed activity log for every transaction — from invitation to completion. Each event includes who performed the action and contextual evidence.
          </p>
          <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.65, margin: 0, marginBottom: 24 }}>
            The audit trail supports transparency and accountability. For situations requiring formal legal evidence, consult applicable requirements for what records must be produced.
          </p>
          <Link
            to="/esignature/verification-and-audit"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#0078D4", ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}
          >
            Learn about audit trails →
          </Link>
        </div>
      </div>
      <style>{`
        .audit-grid { grid-template-columns: 1fr 1fr; }
        .audit-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 760px) { .audit-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Solutions
// ─────────────────────────────────────────────────────────────────────────────
function SolutionsSection() {
  return (
    <Section id="solutions" bordered bg="rgba(255,255,255,0.015)">
      <SectionHeader
        eyebrow="Who uses LAGDA"
        headingId="solutions-heading"
        heading="Built for Philippine professionals and organizations."
        center
      />
      <div style={{ display: "grid", gap: 16 }} className="solutions-grid">
        {SOLUTIONS.map((s) => (
          <Link key={s.id} to={s.path} style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "20px 20px",
              transition: "border-color 0.15s ease",
              height: "100%",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.35)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <p style={{ color: "white", ...GF, fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 8 }}>{s.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0, marginBottom: s.note ? 8 : 0 }}>{s.desc}</p>
              {s.note && (
                <p style={{ color: "#334155", ...GF, fontSize: 11, lineHeight: 1.5, margin: 0, marginTop: 6, fontStyle: "italic" }}>{s.note}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
      <style>{`
        .solutions-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .solutions-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .solutions-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Security layers
// ─────────────────────────────────────────────────────────────────────────────
function SecuritySection() {
  return (
    <Section id="security">
      <div style={{ display: "grid", gap: "48px 64px", alignItems: "start" }} className="security-grid">
        <div>
          <SectionHeader
            eyebrow="Trust architecture"
            headingId="security-heading"
            heading="Six layers of transaction confidence."
            sub="LAGDA is designed with multiple overlapping controls so that confidence in a transaction is never dependent on a single mechanism."
          />
          <Link to="/security" style={{ color: "#0078D4", ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            View the Trust Center →
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TRUST_LAYERS.map((layer) => (
            <div key={layer.num} style={{
              display: "flex", gap: 16, alignItems: "flex-start",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <span style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>
                {layer.num}
              </span>
              <div>
                <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{layer.title}</p>
                <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.55, margin: 0 }}>{layer.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .security-grid { grid-template-columns: 1fr 1fr; }
        .security-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 760px) { .security-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing preview
// ─────────────────────────────────────────────────────────────────────────────
function PricingPreviewSection() {
  return (
    <Section id="pricing" bordered bg="rgba(255,255,255,0.015)">
      <SectionHeader
        eyebrow="Pricing"
        headingId="pricing-heading"
        heading="Start free. Scale when you're ready."
        sub="LAGDA offers plans for individuals, teams, and enterprise organizations. All plans include the full audit trail and document verification."
        center
      />
      <div style={{ display: "grid", gap: 20 }} className="pricing-grid">
        {PRICING_PLANS.map((plan) => (
          <div key={plan.tier} style={{
            background: plan.highlight ? "rgba(0,120,212,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${plan.highlight ? "rgba(0,120,212,0.35)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 16, padding: "28px 24px",
            position: "relative", display: "flex", flexDirection: "column",
          }}>
            {plan.badge && (
              <span style={{
                position: "absolute", top: -1, right: 20,
                background: "#0078D4", color: "white",
                ...GM, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                padding: "4px 10px", borderRadius: "0 0 8px 8px",
              }}>
                {plan.badge.toUpperCase()}
              </span>
            )}
            <p style={{ color: "white", ...GF, fontSize: 18, fontWeight: 800, margin: 0, marginBottom: 4 }}>{plan.tier}</p>
            <p style={{ color: "#64748b", ...GF, fontSize: 13, margin: 0, marginBottom: 20 }}>{plan.for}</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, marginBottom: 24 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ color: "#22C55E", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>✓</span>
                  <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to={plan.ctaPath}
              style={{
                display: "block", textAlign: "center",
                background: plan.highlight ? "#0078D4" : "rgba(255,255,255,0.06)",
                color: "white", padding: "12px 20px", borderRadius: 10,
                ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none",
                border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.12)",
                transition: "filter 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link to="/pricing" style={{ color: "#64748b", ...GF, fontSize: 14, textDecoration: "none", transition: "color 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "white"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
        >
          View full pricing details →
        </Link>
      </div>
      <style>{`
        .pricing-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px) { .pricing-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resources
// ─────────────────────────────────────────────────────────────────────────────
function ResourcesSection() {
  return (
    <Section id="resources">
      <SectionHeader
        eyebrow="Resources"
        headingId="resources-heading"
        heading="Learn before you send."
        sub="Guides and references to help you understand how LAGDA works and what to expect from each step."
        center
      />
      <div style={{ display: "grid", gap: 20 }} className="resources-grid">
        {RESOURCES.map((r) => (
          <Link key={r.title} to={r.path} style={{ textDecoration: "none" }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "20px 20px",
              height: "100%", display: "flex", flexDirection: "column", gap: 10,
              transition: "border-color 0.15s ease",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,120,212,0.35)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden="true" style={{ fontSize: 20 }}>{r.icon}</span>
                <span style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{r.tag}</span>
              </div>
              <p style={{ color: "white", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>{r.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 13, lineHeight: 1.55, margin: 0, flex: 1 }}>{r.desc}</p>
              <span style={{ color: "#0078D4", ...GF, fontSize: 13, fontWeight: 600 }}>Read →</span>
            </div>
          </Link>
        ))}
      </div>
      <style>{`
        .resources-grid { grid-template-columns: repeat(3, 1fr); }
        .resources-grid { grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 760px) { .resources-grid { grid-template-columns: 1fr; } }
      `}</style>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// eNotary coming soon
// ─────────────────────────────────────────────────────────────────────────────
function ENotarySection() {
  return (
    <section
      id="enotary"
      aria-labelledby="enotary-heading"
      style={{
        background: "rgba(103,2,59,0.06)",
        borderTop: "1px solid rgba(103,2,59,0.25)",
        borderBottom: "1px solid rgba(103,2,59,0.25)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(103,2,59,0.2)", color: "#fce7f3",
            border: "1px solid rgba(176,18,98,0.35)", borderRadius: 999,
            padding: "4px 14px", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            marginBottom: 20,
          }}>
            Coming Soon
          </span>
          <h2 id="enotary-heading" style={{ color: "white", ...GF, fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, margin: 0, marginBottom: 14, letterSpacing: "-0.02em" }}>
            LAGDA eNotary
          </h2>
          <p style={{ color: "#94a3b8", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
            LAGDA eNotary will bring digital notarization capabilities to Philippine online document workflows — designed for the way notaries and their clients actually work.
          </p>

          {/* Required compliance notice — VERBATIM and mandatory */}
          <div style={{
            background: "rgba(103,2,59,0.15)",
            border: "1px solid rgba(176,18,98,0.3)",
            borderRadius: 12, padding: "16px 20px",
            marginBottom: 24,
          }}>
            <p style={{ color: "#fce7f3", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
              LAGDA eNotary is Coming Soon and Subject to Supreme Court Accreditation and applicable rules.
            </p>
          </div>

          <p style={{ color: "#64748b", ...GF, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            eNotary is a separate product from LAGDA eSignature. It is not currently available, not purchasable, and not included in any eSignature plan.
          </p>

          <div style={{ marginTop: 28 }}>
            <Link
              to="/enotary"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(103,2,59,0.2)", color: "#fce7f3",
                border: "1px solid rgba(176,18,98,0.3)",
                padding: "12px 24px", borderRadius: 10,
                ...GF, fontSize: 14, fontWeight: 700, textDecoration: "none",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(103,2,59,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(103,2,59,0.2)"; }}
            >
              Learn about eNotary
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" style={{ overflow: "hidden", position: "relative" }}>
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 80% at 50% 100%, rgba(0,120,212,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 720, margin: "0 auto", padding: "80px 24px 100px",
        textAlign: "center",
      }}>
        <h2 id="final-cta-heading" style={{ color: "white", ...GF, fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, margin: 0, marginBottom: 14, letterSpacing: "-0.02em" }}>
          Ready to send your first document?
        </h2>
        <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0, marginBottom: 32 }}>
          Create a free LAGDA account and send your first document today. No credit card required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/create-account"
            style={{
              background: "#0078D4", color: "white",
              padding: "14px 32px", borderRadius: 12,
              ...GF, fontSize: 16, fontWeight: 700, textDecoration: "none",
              display: "inline-flex", alignItems: "center",
              boxShadow: "0 4px 16px rgba(0,120,212,0.35)",
              transition: "filter 0.15s ease, transform 0.15s ease",
              minHeight: 48,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}
          >
            Create Free Account
          </Link>
          <Link
            to="/contact"
            style={{
              background: "rgba(255,255,255,0.06)", color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "14px 28px", borderRadius: 12,
              ...GF, fontSize: 16, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center",
              transition: "background 0.15s ease",
              minHeight: 48,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            Talk to Sales
          </Link>
        </div>
        <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.5, margin: "24px auto 0", maxWidth: 500 }}>
          Some documents may require wet signatures, notarization, or other formal steps. Users are responsible for determining the formality requirements applicable to their transactions.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home page orchestrator
// ─────────────────────────────────────────────────────────────────────────────
// ── Reusable workflows ────────────────────────────────────────────────────────
// The homepage already covers routing ORDER within one document
// (WorkflowTypesSection: sequential, parallel, mixed). This is the other thing:
// a process designed once and started many times, each start independent. They
// sit next to each other deliberately — a visitor who reads "workflow" on this
// page should not have to guess which of the two is meant.
function ReusableWorkflowSection() {
  return (
    <Section id="reusable-workflows">
      <SectionHeader
        eyebrow="Document workflows"
        headingId="reusable-workflows-heading"
        heading="Design a process once. Run it as many times as you need."
        sub="Stages for review, approval, signature and verification, with the right people on each. Every run keeps its own documents, progress and audit trail."
        center
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 28 }}>
        {[
          { t: "One design",        d: "Build the stages and the roles each one needs. Edit it whenever the process changes." },
          { t: "Many runs at once", d: "Start it for one client or a hundred. Runs never interfere with each other." },
          { t: "Visible progress",  d: "See which stage a document is in, who is holding it up, and what is already done." },
        ].map((x) => (
          <div key={x.t} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 22,
          }}>
            <h3 style={{ color: "white", ...GF, fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{x.t}</h3>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>{x.d}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <Link to="/workflow" style={{
          ...GF, display: "inline-flex", alignItems: "center", minHeight: 48, padding: "0 24px",
          borderRadius: 10, border: "1px solid rgba(0,120,212,0.4)", background: "rgba(0,120,212,0.1)",
          color: "#38bdf8", fontSize: 15, fontWeight: 700, textDecoration: "none",
        }}>
          How document workflows work
        </Link>
      </div>
    </Section>
  );
}

export function Home() {
  return (
    <>
      <HeroSection />
      <CapabilitiesSection />
      <WorkflowSection />
      <SigningSection />
      <WorkflowTypesSection />
      <ReusableWorkflowSection />
      <AuditSection />
      <VerificationSection />
      <SolutionsSection />
      <SecuritySection />
      <PricingPreviewSection />
      <ResourcesSection />
      <ENotarySection />
      <FinalCTA />
    </>
  );
}
