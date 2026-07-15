// Session expired state — shown when the mock session timer fires.
// Offers sign-in again with the current path as returnTo.

import { Link, useLocation } from "react-router";
import { LogIn } from "lucide-react";

const GF = { fontFamily: "'Geist', sans-serif" };

export function SessionExpired() {
  const { pathname } = useLocation();
  const returnTo = encodeURIComponent(pathname.startsWith("/app") ? pathname : "/app/dashboard");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "48px 24px", textAlign: "center", background: "#F8FAFC" }}>
      <div style={{ marginBottom: 20 }}>
        <img
          src="/lagda-white-horizontal.svg"
          alt="LAGDA"
          style={{ height: 32, filter: "brightness(0) saturate(100%) invert(8%) sepia(28%) saturate(2120%) hue-rotate(190deg)" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      <div style={{
        background: "white", border: "1px solid #E2E8F0",
        borderRadius: 16, padding: "40px 36px", maxWidth: 440,
        width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "rgba(201,150,12,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", color: "#C9960C",
        }}>
          <LogIn size={24} aria-hidden />
        </div>

        <h1 style={{ color: "#0F172A", fontFamily: "'Geist', sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
          Your session has expired
        </h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 14, margin: "0 0 24px", lineHeight: 1.65 }}>
          For your security, you've been signed out after a period of inactivity. Sign in again to continue.
        </p>

        <Link
          to={`/sign-in?returnTo=${returnTo}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", background: "#0078D4", color: "white",
            borderRadius: 8, padding: "12px 20px",
            ...GF, fontSize: 14, fontWeight: 700,
            textDecoration: "none", boxSizing: "border-box",
          }}
          className="se-signin-btn"
        >
          <LogIn size={16} aria-hidden />
          Sign in again
        </Link>

        <p role="note" style={{ color: "#94A3B8", ...GF, fontSize: 11, margin: "16px 0 0", lineHeight: 1.6 }}>
          Frontend demonstration — session expiry uses an in-memory timer only, not a real token expiration.
        </p>
      </div>

      <style>{`
        .se-signin-btn:hover { background: #006BBE !important; }
        .se-signin-btn:focus-visible { outline: 2px solid #0078D4; outline-offset: 2px; }
      `}</style>
    </div>
  );
}
