// Shared "formal banner with icon" header for each /app/prepare/* step page,
// and the two-column wide-screen shell that steps render their content into.
// Kept in one place so Documents/Participants/Routing/Authentication/
// Settings/Review read the same visual language instead of six near-copies.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { PrepValidationIssue } from "../../models/prepare";

const GF = { fontFamily: "'Geist', sans-serif" };
const GM = { fontFamily: "'Geist Mono', monospace" };
const NAVY = "#07111F";
const AZURE = "#0078D4";
const SILVER = "#8A9BAE";

export function StepBanner({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional right-aligned status content — e.g. "3 files · 2 participants". */
  meta?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        background: "linear-gradient(135deg, #F0F7FF 0%, #F8FAFB 100%)",
        border: "1px solid rgba(0,120,212,0.14)",
        borderRadius: 14,
        padding: "20px 24px",
        marginBottom: 28,
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: AZURE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0,120,212,0.28)",
          }}
        >
          <Icon size={22} color="#FFFFFF" strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: AZURE, margin: "2px 0 4px" }}>
            {eyebrow}
          </p>
          <h2 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: "-0.01em" }}>
            {title}
          </h2>
          {description && (
            <p style={{ ...GF, fontSize: 13, color: "#4B5E70", lineHeight: 1.6, margin: "6px 0 0", maxWidth: 560 }}>
              {description}
            </p>
          )}
        </div>
      </div>
      {meta && (
        <div style={{ ...GF, fontSize: 12, color: SILVER, flexShrink: 0, paddingTop: 4 }}>
          {meta}
        </div>
      )}
    </div>
  );
}

/**
 * Wide-screen side-by-side shell: `main` (the form/controls) beside `rail`
 * (a live preview/summary panel). Collapses to a single top-to-bottom column
 * below the breakpoint — side-by-side stacking reads as clutter at narrow
 * widths, so it becomes `main` then `rail`, not a squeezed two-up grid.
 */
export function StepTwoColumn({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="step-two-col">
      <div className="step-two-col-main">{main}</div>
      <div className="step-two-col-rail">{rail}</div>
      <style>{`
        .step-two-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 28px;
          align-items: start;
        }
        @media (min-width: 1180px) {
          .step-two-col {
            grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          }
          .step-two-col-rail {
            position: sticky;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}

/** A card used inside `rail` — the live preview/summary panel. */
export function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
        boxShadow: "0 1px 4px rgba(7,17,31,0.06)",
      }}
    >
      <p style={{ ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SILVER, margin: "0 0 12px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * A step's inline errors/warnings list. Errors ("Needs attention") stay the
 * amber reminder treatment used throughout the wizard; warnings ("Worth
 * knowing") are visibly quieter — a flat list with no box, no icon, no loud
 * background — so a real blocker and a piece of optional advice never read
 * as equally urgent. Renders nothing if `issues` is empty.
 */
export function StepIssueList({ issues, severity }: { issues: PrepValidationIssue[]; severity: "error" | "warning" }) {
  if (issues.length === 0) return null;

  if (severity === "error") {
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          marginBottom: 16, padding: "10px 14px", borderRadius: 8,
          border: "1px solid #F0D07A", background: "#FEF9EC",
        }}
      >
        <p style={{ ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#C9960C", margin: "0 0 6px" }}>
          Needs attention
        </p>
        <ul style={{ ...GF, listStyle: "none", margin: 0, padding: 0, fontSize: 13, color: "#8A6A16" }}>
          {issues.map(i => <li key={i.id} style={{ marginBottom: 2 }}>• {i.message}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16, paddingLeft: 2 }}>
      <p style={{ ...GM, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: SILVER, margin: "0 0 4px" }}>
        Worth knowing
      </p>
      <ul style={{ ...GF, listStyle: "none", margin: 0, padding: 0, fontSize: 12.5, color: "#64748B", lineHeight: 1.6 }}>
        {issues.map(i => <li key={i.id}>· {i.message}</li>)}
      </ul>
    </div>
  );
}
