import { useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import { FileText, PenLine, ShieldCheck, Clock, QrCode } from "lucide-react";
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
import lagdaLogoFull from "../../../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor.svg";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Interactive hero logo ────────────────────────────────────────────────────
// A mouse-tilt "3D card" effect: the logo tilts toward the cursor within a
// bounded perspective, springs back on mouse-leave, and idles with a slow
// float + glow pulse so it still reads as alive when the pointer never comes
// near it (touch devices, keyboard users). The tilt and the float run on two
// nested elements so the JS-driven transform (tilt) and the CSS-keyframe
// transform (float) never fight over the same `transform` property.
// Small badges orbiting the mark, each naming one thing the product actually
// does (prepare, sign, verify, track) rather than generic decoration — the
// hero should read as "here is what LAGDA is for" at a glance, not just a
// logo floating in space. `depth` scales how far a badge drifts opposite the
// cursor: badges "closer to the viewer" (higher depth) move more, giving the
// cluster a layered parallax feel instead of moving as one flat sheet.
const ORBIT_ICONS: {
  Icon: typeof FileText;
  label: string;
  top: string;
  left: string;
  color: string;
  bg: string;
  border: string;
  depth: number;
  floatDelay: string;
  floatDuration: string;
}[] = [
  { Icon: FileText,   label: "Prepare",  top: "4%",  left: "-6%", color: "#07111F", bg: "#ffffff", border: "rgba(7,17,31,0.1)",   depth: 14, floatDelay: "0s",    floatDuration: "4.5s" },
  { Icon: PenLine,    label: "Sign",     top: "-8%", left: "58%", color: "#0078D4", bg: "#ffffff", border: "rgba(0,120,212,0.22)", depth: 20, floatDelay: "0.6s",  floatDuration: "5.2s" },
  { Icon: ShieldCheck,label: "Verify",   top: "62%", left: "70%", color: "#16A34A", bg: "#ffffff", border: "rgba(22,163,74,0.22)", depth: 16, floatDelay: "1.1s",  floatDuration: "4.8s" },
  { Icon: Clock,      label: "Track",    top: "74%", left: "-4%", color: "#C9960C", bg: "#ffffff", border: "rgba(201,150,12,0.25)",depth: 12, floatDelay: "0.3s",  floatDuration: "5.6s" },
  { Icon: QrCode,     label: "Verification ID", top: "22%", left: "84%", color: "#0078D4", bg: "#ffffff", border: "rgba(0,120,212,0.22)", depth: 18, floatDelay: "1.6s", floatDuration: "5s" },
];

function InteractiveLogo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [pointer, setPointer] = useState({ dx: 0, dy: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ ry: (px - 0.5) * 20, rx: (0.5 - py) * 20 });
    setPointer({ dx: px - 0.5, dy: py - 0.5 });
  }, []);

  const handleLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0 });
    setPointer({ dx: 0, dy: 0 });
    setHovering(false);
  }, []);

  return (
    <div
      ref={frameRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={handleLeave}
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 340,
        maxWidth: "100%",
        padding: 24,
        perspective: 1000,
      }}
      className="esig-hero-logo-frame"
    >
      {/* Ambient glow — brightens and widens slightly on hover */}
      <div
        className="esig-hero-logo-glow"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,120,212,0.22) 0%, rgba(0,120,212,0) 70%)",
          opacity: hovering ? 1 : 0.7,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      />

      {/* Orbiting feature badges — each on its own idle float, plus a
          cursor-parallax nudge layered on top via a wrapper transform so it
          never collides with the float keyframe's own transform. */}
      {ORBIT_ICONS.map(({ Icon, label, top, left, color, bg, border, depth, floatDelay, floatDuration }) => (
        <div
          key={label}
          className="esig-hero-orbit-float"
          style={{
            position: "absolute",
            top, left,
            animationDelay: floatDelay,
            animationDuration: floatDuration,
            transform: `translate(${pointer.dx * -depth}px, ${pointer.dy * -depth}px)`,
            transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
            pointerEvents: "none",
          }}
        >
          <div
            title={label}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: bg, border: `1px solid ${border}`,
              borderRadius: 999, padding: "7px 12px 7px 8px",
              boxShadow: "0 10px 24px rgba(7,17,31,0.12), 0 2px 6px rgba(7,17,31,0.06)",
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `${color}1A`, color,
            }}>
              <Icon size={12} strokeWidth={2.4} aria-hidden />
            </span>
            <span style={{ ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "#334155", whiteSpace: "nowrap" }}>
              {label}
            </span>
          </div>
        </div>
      ))}

      {/* Float layer — idle vertical drift, CSS keyframes only */}
      <div className="esig-hero-logo-float">
        {/* Tilt layer — JS-driven 3D rotation toward the cursor */}
        <div
          className="esig-hero-logo-tilt"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(${hovering ? 1.05 : 1},${hovering ? 1.05 : 1},1)`,
          }}
        >
          <img
            src={lagdaLogoFull}
            alt="LAGDA"
            style={{
              display: "block",
              width: 300,
              maxWidth: "100%",
              height: "auto",
              filter: hovering
                ? "drop-shadow(0 28px 44px rgba(0,120,212,0.28))"
                : "drop-shadow(0 18px 30px rgba(7,17,31,0.14))",
              transition: "filter 0.3s ease",
            }}
          />
        </div>
      </div>
      <style>{`
        .esig-hero-logo-frame { position: relative; }
        .esig-hero-logo-float {
          animation: esig-logo-float 5s ease-in-out infinite;
        }
        .esig-hero-logo-tilt {
          transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-style: preserve-3d;
          will-change: transform;
        }
        .esig-hero-orbit-float {
          animation-name: esig-orbit-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes esig-logo-float {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes esig-orbit-float {
          0%, 100% { margin-top: 0px; }
          50%      { margin-top: -8px; }
        }
        @media (max-width: 860px) {
          .esig-hero-orbit-float { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .esig-hero-logo-float, .esig-hero-orbit-float { animation: none; }
          .esig-hero-logo-tilt { transition: none; }
        }
      `}</style>
    </div>
  );
}

// ── Transaction dashboard mockup ──────────────────────────────────────────────
function DashboardMockup() {
  const docs = [
    { name: "Professional Services Agreement", status: "Awaiting Approval", statusColor: "#F59E0B", updated: "Just now" },
    { name: "Engagement Letter — Reyes Family", status: "Completed",         statusColor: "#22C55E", updated: "Yesterday" },
    { name: "Board Resolution No. 12",          status: "Sent",              statusColor: "#0078D4", updated: "2 days ago" },
  ];

  return (
    <div aria-hidden style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 16,
      overflow: "hidden",
      maxWidth: 480,
      width: "100%",
      boxShadow: "0 24px 64px rgba(7,17,31,0.12), 0 4px 16px rgba(7,17,31,0.08)",
    }}>
      {/* Header bar */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#07111F", ...GF, fontSize: 13, fontWeight: 700 }}>My Documents</span>
        <span style={{ background: "rgba(0,120,212,0.1)", color: "#0078D4", border: "1px solid rgba(0,120,212,0.25)", borderRadius: 999, padding: "2px 10px", ...GM, fontSize: 10, fontWeight: 700 }}>
          3 active
        </span>
      </div>

      {/* Doc rows */}
      {docs.map((doc, i) => (
        <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {doc.name}
            </p>
            <p style={{ color: "#64748B", ...GM, fontSize: 10, margin: "3px 0 0" }}>{doc.updated}</p>
          </div>
          <span style={{ ...GM, fontSize: 10, fontWeight: 700, color: doc.statusColor, flexShrink: 0, background: `${doc.statusColor}18`, padding: "2px 8px", borderRadius: 999 }}>
            {doc.status}
          </span>
        </div>
      ))}

      {/* Audit event preview */}
      <div style={{ padding: "12px 20px", background: "rgba(0,120,212,0.04)" }}>
        <p style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>LATEST EVENT</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B", flexShrink: 0 }} />
          <span style={{ color: "#334155", ...GF, fontSize: 12 }}>Marco Santos viewed the document</span>
          <span style={{ color: "#94A3B8", ...GM, fontSize: 10, marginLeft: "auto", flexShrink: 0 }}>2m ago</span>
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
          <span style={{ color: s.role === "recipient" ? "#9A7208" : "#0078D4", ...GM, fontSize: 10, fontWeight: 700 }}>
            {String(s.num).padStart(2, "0")}
          </span>
          <span style={{ color: "#07111F", ...GF, fontSize: 12, fontWeight: 600 }}>{s.title}</span>
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
        <div key={s.status} title={s.desc} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8, padding: "6px 12px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
          <span style={{ color: "#334155", ...GF, fontSize: 12 }}>{s.status}</span>
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
      <div style={{ display: "grid", gap: 24 }} className="sr-grid">
        {[{ title: "Sender", color: "#0078D4", bg: "rgba(0,120,212,0.06)", border: "rgba(0,120,212,0.2)", steps: SENDER },
          { title: "Recipient", color: "#9A7208", bg: "rgba(201,150,12,0.06)", border: "rgba(201,150,12,0.2)", steps: RECIPIENT }].map((col) => (
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
                <span style={{ color: "#334155", ...GF, fontSize: 13, lineHeight: 1.5 }}>{step}</span>
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
        visual={<InteractiveLogo />}
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
            background: "#ffffff", color: "#07111F",
            border: "1px solid rgba(0,0,0,0.12)", padding: "13px 22px", borderRadius: 12,
            ...GF, fontSize: 15, fontWeight: 600, textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            transition: "background 0.15s ease, border-color 0.15s ease", minHeight: 44,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafb"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; }}
          >
            See How It Works
          </Link>
          <Link to="/verify" style={{ color: "#64748B", padding: "13px 8px", ...GF, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", transition: "color 0.15s ease", minHeight: 44 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#07111F"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
          >
            Verify a Document →
          </Link>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["eSignature Available Now", "Identity-Aware Signing", "Audit-Ready Records", "Document Verification", "Built for Philippine Workflows"].map((badge) => (
            <span key={badge} style={{
              background: "rgba(0,120,212,0.1)", color: "#0078D4",
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
        <div style={{ display: "grid", gap: "32px 48px", alignItems: "start" }} className="overview-mock-grid">
          <div>
            <SectionHeading eyebrow="Full lifecycle" id="lifecycle-heading" heading="Built for the full eSignature workflow." sub="LAGDA covers every step — from preparing a document to verifying the completed record." />
            <LifecycleStrip />
            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0078D4", marginTop: 2, flexShrink: 0 }} />
              <span style={{ color: "#64748B", ...GF, fontSize: 13 }}>Blue = Sender actions</span>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#C9960C", marginTop: 2, flexShrink: 0, marginLeft: 12 }} />
              <span style={{ color: "#64748B", ...GF, fontSize: 13 }}>Gold = Recipient actions</span>
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
        secondaryPath="/book-a-demo"
      />

      <LegalNote showEnotary />
    </EsigPageShell>
  );
}
