import { useState, useEffect, useRef, useCallback } from "react";
import { HOW_IT_WORKS } from "./content";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };

const AUTO_ADVANCE_MS = 4000;

function StepMockup({ step }: { step: typeof HOW_IT_WORKS[0] }) {
  return (
    <div style={{
      background: "rgba(7,17,31,0.95)",
      border: "1px solid rgba(0,120,212,0.22)",
      borderRadius: 16,
      padding: 24,
      minHeight: 160,
      display: "flex", flexDirection: "column", justifyContent: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }} aria-hidden="true">{step.icon}</span>
        <span style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>
          STEP {step.num} OF 6
        </span>
      </div>
      <p style={{ color: "white", ...GF, fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 4 }}>
        {step.mockLabel}
      </p>
      <p style={{ color: "#64748b", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
        {step.mockSub}
      </p>
    </div>
  );
}

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % HOW_IT_WORKS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(advance, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, advance]);

  const select = (idx: number) => {
    setActive(idx);
    setPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const step = HOW_IT_WORKS[active];
  if (!step) return null;

  return (
    <section
      aria-labelledby="workflow-heading"
      style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p style={{ color: "#38bdf8", ...GM, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
          How it works
        </p>
        <h2 id="workflow-heading" style={{ color: "white", ...GF, fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          Six steps. One seamless workflow.
        </h2>
        <p style={{ color: "#64748b", ...GF, fontSize: 16, lineHeight: 1.65, margin: "12px auto 0", maxWidth: 560 }}>
          From uploading a document to verifying the completed result — every step is designed to be straightforward.
        </p>
      </div>

      <div style={{
        display: "grid",
        gap: 48,
        alignItems: "start" }} className="workflow-grid">
        {/* Left: step list */}
        <div role="tablist" aria-label="Workflow steps" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {HOW_IT_WORKS.map((s, idx) => {
            const isActive = idx === active;
            return (
              <button
                key={s.num}
                role="tab"
                aria-selected={isActive}
                aria-controls={`workflow-panel-${s.num}`}
                id={`workflow-tab-${s.num}`}
                onClick={() => select(idx)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); select((idx + 1) % HOW_IT_WORKS.length); }
                  if (e.key === "ArrowUp") { e.preventDefault(); select((idx - 1 + HOW_IT_WORKS.length) % HOW_IT_WORKS.length); }
                }}
                style={{
                  all: "unset",
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  background: isActive ? "rgba(0,120,212,0.1)" : "transparent",
                  border: `1px solid ${isActive ? "rgba(0,120,212,0.25)" : "transparent"}`,
                  transition: "background 0.2s ease, border-color 0.2s ease",
                  width: "100%", boxSizing: "border-box", textAlign: "left",
                }}
              >
                {/* Number + progress ring */}
                <div style={{ position: "relative", flexShrink: 0, width: 32, height: 32 }}>
                  <svg width="32" height="32" aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    {isActive && !paused && (
                      <circle
                        cx="16" cy="16" r="13" fill="none"
                        stroke="#0078D4" strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 13}`}
                        strokeDashoffset="0"
                        style={{ animation: `workflow-progress ${AUTO_ADVANCE_MS}ms linear forwards` }}
                      />
                    )}
                    {isActive && paused && (
                      <circle cx="16" cy="16" r="13" fill="none" stroke="#0078D4" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 13}`} strokeDashoffset="0" />
                    )}
                  </svg>
                  <span style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isActive ? "white" : "#475569", ...GM, fontSize: 11, fontWeight: 700,
                  }}>
                    {String(s.num).padStart(2, "0")}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isActive ? "white" : "#94a3b8", ...GF, fontSize: 14, fontWeight: 700, margin: 0 }}>
                    {s.title}
                  </p>
                  <p style={{ color: "#475569", ...GF, fontSize: 12, margin: "2px 0 0" }}>
                    {s.short}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: active step detail */}
        <div
          role="tabpanel"
          id={`workflow-panel-${step.num}`}
          aria-labelledby={`workflow-tab-${step.num}`}
          style={{ position: "sticky", top: 96 }}
        >
          <div style={{
            marginBottom: 24,
            transition: "opacity 0.2s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span aria-hidden="true" style={{ fontSize: 32 }}>{step.icon}</span>
              <div>
                <p style={{ color: "#38bdf8", ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
                  STEP {step.num} OF 6
                </p>
                <h3 style={{ color: "white", ...GF, fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  {step.title}
                </h3>
              </div>
            </div>
            <p style={{ color: "#94a3b8", ...GF, fontSize: 15, lineHeight: 1.65, margin: 0, marginBottom: 24 }}>
              {step.desc}
            </p>
            <StepMockup step={step} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes workflow-progress {
          from { stroke-dashoffset: ${2 * Math.PI * 13}; }
          to   { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes workflow-progress { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 0; } }
        }
        .workflow-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 720px) {
          .workflow-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
