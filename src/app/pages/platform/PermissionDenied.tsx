// Permission denied state for authenticated users who lack access to a specific route.

import { Link, useLocation } from "react-router";
import { ShieldOff } from "lucide-react";
import { usePlatform } from "../../context/PlatformContext";

const GF = { fontFamily: "'Geist', sans-serif" };

export function PermissionDenied() {
  const { user } = usePlatform();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: "48px 24px", textAlign: "center" }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "rgba(239,68,68,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, color: "#EF4444",
      }}>
        <ShieldOff size={28} aria-hidden />
      </div>

      <p style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        403 — Access Denied
      </p>
      <h1 style={{ color: "#0F172A", ...GF, fontSize: 24, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.03em" }}>
        You don't have access to this page
      </h1>
      <p style={{ color: "#64748B", ...GF, fontSize: 15, margin: "0 0 28px", lineHeight: 1.65, maxWidth: 440 }}>
        Your current role{user ? ` (${user.role})` : ""} doesn't include permission to view this section. Contact your workspace owner if you need access.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to="/app/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#0078D4", color: "white",
            borderRadius: 8, padding: "10px 20px",
            ...GF, fontSize: 14, fontWeight: 700,
            textDecoration: "none",
          }}
          className="pd-primary-btn"
        >
          Back to Dashboard
        </Link>
        <Link
          to="/help"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#F1F5F9", color: "#334155",
            borderRadius: 8, padding: "10px 20px",
            ...GF, fontSize: 14, fontWeight: 600,
            textDecoration: "none", border: "1px solid #E2E8F0",
          }}
          className="pd-secondary-btn"
        >
          Get Help
        </Link>
      </div>

      <style>{`
        .pd-primary-btn:hover { background: #006BBE !important; }
        .pd-primary-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
        .pd-secondary-btn:hover { background: #E2E8F0 !important; }
        .pd-secondary-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
