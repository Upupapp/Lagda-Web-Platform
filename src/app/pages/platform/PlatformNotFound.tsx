// Platform-specific 404 state — shown for unknown /app/* routes.

import { Link } from "react-router";
import { LayoutDashboard } from "lucide-react";

const GF = { fontFamily: "'Geist', sans-serif" };

export function PlatformNotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: "48px 24px", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "#F1F5F9",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, color: "#94A3B8",
      }}>
        <LayoutDashboard size={28} aria-hidden />
      </div>

      <p style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        404 — Not Found
      </p>
      <h1 style={{ color: "#0F172A", ...GF, fontSize: 24, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.03em" }}>
        Page not found
      </h1>
      <p style={{ color: "#64748B", ...GF, fontSize: 15, margin: "0 0 28px", lineHeight: 1.65, maxWidth: 400 }}>
        The page you're looking for doesn't exist or may have moved.
      </p>

      <Link
        to="/app/dashboard"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#0078D4", color: "white",
          borderRadius: 8, padding: "10px 20px",
          ...GF, fontSize: 14, fontWeight: 700,
          textDecoration: "none",
        }}
        className="pnf-back-btn"
      >
        Back to Dashboard
      </Link>

      <style>{`.pnf-back-btn:hover { background: #006BBE !important; } .pnf-back-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }`}</style>
    </div>
  );
}
