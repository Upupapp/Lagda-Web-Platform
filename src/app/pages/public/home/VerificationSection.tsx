import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { MOCK_VERIFICATION_STATES } from "./content";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

export function VerificationSection() {
  if (USE_REAL_BACKEND) return <RealVerificationSection />;
  return <DemoVerificationSection />;
}

function DemoVerificationSection() {
  const [activeId, setActiveId] = useState<string>("verified");
  const active = MOCK_VERIFICATION_STATES.find((s) => s.id === activeId) ?? MOCK_VERIFICATION_STATES[0];
  if (!active) return null;

  return (
    <section
      aria-labelledby="verification-heading"
      style={{
        background: "#f8fafb",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{
          display: "grid",
          gap: "48px 64px",
          alignItems: "center" }} className="verify-grid">
          {/* Left: copy */}
          <div>
            <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              Document Verification
            </p>
            <h2 id="verification-heading" style={{ color: "#07111F", ...GF, fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: 0, marginBottom: 16, letterSpacing: "-0.02em" }}>
              Anyone can verify a LAGDA document.
            </h2>
            <p style={{ color: "#334155", ...GF, fontSize: 16, lineHeight: 1.65, margin: 0, marginBottom: 20 }}>
              Every completed document receives a unique Verification ID and QR code. Recipients, counterparties, or third parties can verify the document's LAGDA status — no account required.
            </p>
            <p style={{ color: "#334155", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 28 }}>
              LAGDA verification confirms that a document matches a specific transaction record. It does not substitute for legal advice or formal authentication required by law.
            </p>

            {/* State selector */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ color: "#64748B", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
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
                      background: s.id === activeId ? "rgba(0,120,212,0.1)" : "#ffffff",
                      border: `1px solid ${s.id === activeId ? "rgba(0,120,212,0.35)" : "rgba(0,0,0,0.1)"}`,
                      color: s.id === activeId ? "#0078D4" : "#334155",
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
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(7,17,31,0.10), 0 1px 4px rgba(7,17,31,0.05)",
            }}>
              {/* Mock input bar */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{
                  flex: 1, background: "#F8FAFB", border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8, padding: "8px 12px",
                  ...GM, fontSize: 12, color: "#64748B",
                }}>
                  {active.fields[0]?.value ?? "Enter Verification ID"}
                </div>
                <div style={{
                  background: "#07111F", borderRadius: 8, padding: "8px 14px",
                  ...GF, fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
                }}>
                  Verify
                </div>
              </div>

              {/* Status banner */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: active.statusBg }}>
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
                    padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)",
                    gap: 16,
                  }}>
                    <span style={{ color: "#64748B", ...GM, fontSize: 11, flexShrink: 0 }}>{f.label}</span>
                    <span style={{ color: "#07111F", ...(f.mono ? GM : GF), fontSize: 12, fontWeight: f.mono ? 600 : 400, textAlign: "right", wordBreak: "break-word" }}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Legal footer */}
              <div style={{ padding: "12px 20px", background: "#F8FAFB" }}>
                <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
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

// Real mode: no mock results. Submitting an ID goes straight to that record's
// dedicated verification page.
function RealVerificationSection() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = value.trim();
    if (!id) { setError("Enter a Verification ID."); return; }
    void navigate(`/verify/${encodeURIComponent(id)}`);
  }

  return (
    <section aria-labelledby="verification-heading" style={{ background: "#f8fafb", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px, 8vw, 80px) 16px", boxSizing: "border-box" }}>
        <div className="verify-grid" style={{ display: "grid", gap: "32px 64px", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#0078D4", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Document Verification</p>
            <h2 id="verification-heading" style={{ color: "#07111F", ...GF, fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: "-0.02em" }}>
              Anyone can verify a LAGDA document.
            </h2>
            <p style={{ color: "#334155", ...GF, fontSize: 16, lineHeight: 1.65, margin: "0 0 16px" }}>
              Every completed document carries a Verification ID and QR code. Anyone can confirm that LAGDA holds a completed record — no account required.
            </p>
            <p style={{ color: "#334155", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0 }}>
              A found record does not by itself confirm that a particular file matches, and a matching file is not a determination of legal validity.
            </p>
          </div>
          <form onSubmit={submit} noValidate aria-label="Verify a document" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: "clamp(18px, 4vw, 28px)", boxShadow: "0 4px 16px rgba(7,17,31,0.10)", minWidth: 0, boxSizing: "border-box" }}>
            <label htmlFor={inputId} style={{ display: "block", color: "#334155", ...GF, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Verification ID</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <input id={inputId} type="text" value={value} autoComplete="off" spellCheck={false}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-err` : undefined}
                placeholder="Printed on the completed document"
                style={{ flex: "1 1 200px", minWidth: 0, boxSizing: "border-box", minHeight: 46, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 8, ...GM, fontSize: 14, color: "#07111F" }} />
              <button type="submit" style={{ background: "#07111F", color: "#ffffff", border: "none", borderRadius: 8, minHeight: 46, padding: "10px 20px", ...GF, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Verify</button>
            </div>
            {error && <p id={`${inputId}-err`} role="alert" style={{ color: "#B91C1C", ...GF, fontSize: 12, margin: "6px 0 0" }}>{error}</p>}
            <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: "14px 0 0", lineHeight: 1.5 }}>
              Verification confirms LAGDA transaction records only. Electronic signing is not notarization.
            </p>
          </form>
        </div>
      </div>
      <style>{`
        .verify-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 760px) { .verify-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}