import { Link } from "react-router";
import type { WorkflowStep } from "../../pages/public/solutions/content";
import { LEGAL_NOTE, ENOTARY_NOTE } from "../../pages/public/solutions/content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

// ── Document example list ──────────────────────────────────────────────────────
export function DocExampleList({ docs, qualifier }: {
  docs: string[];
  qualifier?: string;
}) {
  return (
    <div>
      {qualifier && (
        <p style={{ color: "#C9960C", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
          {qualifier}
        </p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }} className="doc-ex-grid">
        {docs.map((d) => (
          <div key={d} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "#0078D4", flexShrink: 0, fontSize: 12, marginTop: 2 }}>·</span>
            <span style={{ color: "#94a3b8", fontFamily: "'Geist', sans-serif", fontSize: 13, lineHeight: 1.45 }}>{d}</span>
          </div>
        ))}
      </div>
      <style>{`.doc-ex-grid { grid-template-columns: 1fr 1fr; } @media (max-width: 520px) { .doc-ex-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Workflow steps ─────────────────────────────────────────────────────────────
export function WorkflowSteps({ steps, title }: { steps: WorkflowStep[]; title?: string }) {
  return (
    <div>
      {title && <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 16 }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: i < steps.length - 1 ? 20 : 0 }}>
            {i < steps.length - 1 && (
              <div style={{ position: "absolute", left: 18, top: 38, width: 1, height: "calc(100% - 18px)", background: "rgba(255,255,255,0.07)" }} />
            )}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,120,212,0.12)", border: "2px solid rgba(0,120,212,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, zIndex: 1,
            }}>
              <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700 }}>{s.num}</span>
            </div>
            <div style={{ paddingTop: 7 }}>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 2 }}>{s.label}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Challenge cards ────────────────────────────────────────────────────────────
export function ChallengeCards({ challenges }: {
  challenges: { icon: string; title: string; desc: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }} className="ch-cards-grid">
      {challenges.map((c) => (
        <div key={c.title} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "14px 14px",
        }}>
          <span aria-hidden style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{c.icon}</span>
          <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 3 }}>{c.title}</p>
          <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{c.desc}</p>
        </div>
      ))}
      <style>{`.ch-cards-grid { grid-template-columns: repeat(3, 1fr); } @media (max-width: 720px) { .ch-cards-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Capability link grid ───────────────────────────────────────────────────────
export function CapabilityLinks({ items }: {
  items: { icon: string; title: string; desc: string; path: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="cap-links-grid">
      {items.map((item) => (
        <Link key={item.path} to={item.path} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "12px 14px",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <span aria-hidden style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
            <div>
              <p style={{ color: "#0078D4", ...GF, fontSize: 13, fontWeight: 700, margin: 0, marginBottom: 2 }}>{item.title}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, lineHeight: 1.45, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        </Link>
      ))}
      <style>{`.cap-links-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .cap-links-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}

// ── Notice box (for legal / policy warnings) ──────────────────────────────────
export function NoticeBox({ label, text, color = "#C9960C" }: { label: string; text: string; color?: string }) {
  const bg = color === "#C9960C" ? "rgba(201,150,12,0.06)" :
             color === "#ef4444" ? "rgba(239,68,68,0.06)" :
             color === "#7B2D3E" ? "rgba(123,45,62,0.06)" :
             "rgba(255,255,255,0.03)";
  const border = color === "#C9960C" ? "rgba(201,150,12,0.2)" :
                 color === "#ef4444" ? "rgba(239,68,68,0.2)" :
                 color === "#7B2D3E" ? "rgba(123,45,62,0.2)" :
                 "rgba(255,255,255,0.07)";
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ color, ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>{label}</p>
      <p style={{ color: "#94a3b8", ...GF, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── eNotary separation notice ──────────────────────────────────────────────────
export function EnotaryNotice() {
  return (
    <div style={{ background: "rgba(123,45,62,0.06)", border: "1px solid rgba(123,45,62,0.2)", borderRadius: 12, padding: "14px 20px" }}>
      <p style={{ color: "#7B2D3E", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6 }}>
        LAGDA eNOTARY — SEPARATE AND COMING SOON
      </p>
      <p style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        {ENOTARY_NOTE} It is not part of LAGDA eSignature and does not affect the eSignature features described on this page.
      </p>
    </div>
  );
}

// ── Legal footer note ──────────────────────────────────────────────────────────
export function SolLegalNote({ extra }: { extra?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)",
      padding: "20px 24px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ color: "#334155", ...GF, fontSize: 12, lineHeight: 1.6, margin: 0, marginBottom: extra ? 6 : 0 }}>
          {LEGAL_NOTE}
        </p>
        {extra && (
          <p style={{ color: "#475569", ...GF, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            {extra}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Inline participant role list ──────────────────────────────────────────────
export function ParticipantRoles({ roles }: {
  roles: { role: string; desc: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {roles.map((r) => (
        <div key={r.role} style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, padding: "10px 14px", display: "flex", gap: 12,
        }}>
          <span style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, minWidth: 140, flexShrink: 0 }}>{r.role.toUpperCase()}</span>
          <span style={{ color: "#94a3b8", ...GF, fontSize: 13, lineHeight: 1.45 }}>{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

// ── Related solutions links ───────────────────────────────────────────────────
export function RelatedSolutions({ paths }: {
  paths: { label: string; desc: string; path: string }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="rel-sol-grid">
      {paths.map((p) => (
        <Link key={p.path} to={p.path} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10, padding: "14px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <p style={{ color: "white", ...GF, fontSize: 13, fontWeight: 700, margin: 0 }}>{p.label}</p>
              <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, marginTop: 2 }}>{p.desc}</p>
            </div>
            <span style={{ color: "#0078D4", fontSize: 16, flexShrink: 0, marginLeft: 12 }}>→</span>
          </div>
        </Link>
      ))}
      <style>{`.rel-sol-grid { grid-template-columns: repeat(2, 1fr); } @media (max-width: 560px) { .rel-sol-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  );
}
