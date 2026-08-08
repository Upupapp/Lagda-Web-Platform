import { useState } from "react";
import { MOCK_VERIFICATION_STATES } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function VerificationSection() {
  const [activeId, setActiveId] = useState<string>("verified");
  const active = MOCK_VERIFICATION_STATES.find((s) => s.id === activeId) ?? MOCK_VERIFICATION_STATES[0];
  if (!active) return null;

  return (
    <section
      aria-labelledby="verification-heading"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{
          display: "grid",
          gap: "48px 64px",
          alignItems: "center" }} className="verify-grid">
          {/* Left: copy */}
          <div>
            <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              Document Verification
            </p>
            <h2 id="verification-heading" style={{ color: "white", ...GF, fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: 0, marginBottom: 16, letterSpacing: "-0.02em" }}>
              Anyone can verify a LAGDA document.
            </h2>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
              Every completed document receives a unique Verification ID and QR code. Recipients, counterparties, or third parties can verify the document's LAGDA status — no account required.
            </p>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 28 }}>
              LAGDA verification confirms that a document matches a specific transaction record. It does not substitute for legal advice or formal authentication required by law.
            </p>

            {/* State selector */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ color: "#475569", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
                EXPLORE VERIFICATION STATES
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MOCK_VERIFICATION_STATES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    aria-pressed={s.id === activeId}
                    style={{
                      all: "unset",
                      padding: "6px 14px", borderRadius: 999,
                      background: s.id === activeId ? "rgba(0,120,212,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${s.id === activeId ? "rgba(0,120,212,0.4)" : "rgba(255,255,255,0.1)"}`,
                      color: s.id === activeId ? "#38bdf8" : "#64748b",
                      ...GF, fontSize: 13, fontWeight: s.id === activeId ? 700 : 500,
                      cursor: "pointer", transition: "all 0.15s ease",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: mock verification result */}
          <div>
            <div style={{
              background: "rgba(7,17,31,0.95)",
              border: "1px solid rgba(0,120,212,0.2)",
              borderRadius: 16,
              overflow: "hidden",
            }}>
              {/* Mock input bar */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{
                  flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "8px 12px",
                  ...GM, fontSize: 12, color: "#64748b",
                }}>
                  {active.fields[0]?.value ?? "Enter Verification ID"}
                </div>
                <div style={{
                  background: "#0078D4", borderRadius: 8, padding: "8px 14px",
                  ...GF, fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
                }}>
                  Verify
                </div>
              </div>

              {/* Status banner */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: active.statusBg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: active.statusColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {active.icon}
                  </span>
                  <span style={{ color: active.statusColor, ...GM, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {active.statusText}
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div style={{ padding: "16px 20px" }}>
                {active.fields.map((f) => (
                  <div key={f.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: 16,
                  }}>
                    <span style={{ color: "#475569", ...GM, fontSize: 11, flexShrink: 0 }}>{f.label}</span>
                    <span style={{ color: "white", ...(f.mono ? GM : GF), fontSize: 12, fontWeight: f.mono ? 600 : 400, textAlign: "right", wordBreak: "break-word" }}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Legal footer */}
              <div style={{ padding: "12px 20px", background: "rgba(0,0,0,0.2)" }}>
                <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  Verification confirms LAGDA transaction records only. For legal authentication or notarization, consult applicable requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .verify-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 760px) {
          .verify-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
