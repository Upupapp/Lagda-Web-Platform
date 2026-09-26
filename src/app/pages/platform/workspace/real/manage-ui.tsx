// Shared layout pieces for the Manage pages' real-backend views. Same look
// as the demo pages (white header, breadcrumb, 12px-radius cards) so a real
// account and the demo read as one product.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { useViewport } from "../../../../hooks/useViewport";
import { buttonStyle, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "../join/join-styles";
import { cardStyle } from "./manage-styles";

export { GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER };

export interface Crumb { label: string; to?: string }

export function ManagePage({ crumbs, title, badge, actions, children, maxWidth = 960 }: {
  crumbs: Crumb[]; title: string; badge?: ReactNode; actions?: ReactNode; children: ReactNode; maxWidth?: number;
}) {
  const { isNarrow } = useViewport();
  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px", overflowX: "hidden" }}>
      <header style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}`, padding: isNarrow ? "16px" : "20px 24px" }}>
        <div style={{ maxWidth, margin: "0 auto" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
            <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, flexWrap: "wrap", ...GF, fontSize: 12, color: SILVER }}>
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${String(i)}`} style={{ display: "flex", gap: 6, minWidth: 0 }}>
                  {i > 0 && <span aria-hidden>›</span>}
                  {c.to
                    ? <Link to={c.to} style={{ color: AZURE, textDecoration: "none" }}>{c.label}</Link>
                    : <span style={{ color: SLATE, overflowWrap: "anywhere" }}>{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
              <h1 style={{ ...GF, fontSize: isNarrow ? 20 : 22, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{title}</h1>
              {badge}
            </div>
            {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
          </div>
        </div>
      </header>
      <div style={{ maxWidth, margin: "24px auto 0", padding: isNarrow ? "0 16px" : "0 24px", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  const palette = tone === "error"
    ? { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" }
    : { bg: "#EBF4FC", border: "#BAD7F5", color: "#0B4F8A" };
  return (
    <div role={tone === "error" ? "alert" : undefined}
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 10, padding: "12px 16px", ...GF, fontSize: 13, color: palette.color, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div aria-busy="true" style={{ ...cardStyle, padding: 32, textAlign: "center", ...GF, fontSize: 13, color: SLATE }}>{label}</div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" style={{ ...cardStyle, padding: "28px 20px", textAlign: "center" }}>
      <p style={{ ...GF, fontSize: 14, color: "#991B1B", margin: "0 0 12px" }}>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} style={buttonStyle("secondary")}>Try again</button>}
    </div>
  );
}

/** For a page this person's role does not reach. Says so plainly. */
export function NotAvailable({ crumbs, title, message }: { crumbs: Crumb[]; title: string; message: string }) {
  return (
    <ManagePage crumbs={crumbs} title={title}>
      <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
        <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 12px", lineHeight: 1.6 }}>{message}</p>
        <Link to="/app/workspace" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none" }}>Back to Manage</Link>
      </div>
    </ManagePage>
  );
}
