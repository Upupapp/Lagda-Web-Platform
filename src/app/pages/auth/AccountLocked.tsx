// C13 — Account locked state page.
// No automated unlock — guidance only.

import { Link } from "react-router";

const GF = { fontFamily: "'Geist', sans-serif" };

export function AccountLocked() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", fontSize: 24,
      }} aria-hidden>🔒</div>

      <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
        Account temporarily locked
      </h1>

      <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
        For your security, access to this account has been temporarily suspended after multiple failed sign-in attempts.
      </p>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px", textAlign: "left", marginBottom: 28 }}>
        <h2 style={{ color: "#94A3B8", ...GF, fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>What you can do</h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Wait a few minutes and try again.",
            "Use the password reset flow if you may have forgotten your password.",
            "Contact support if you believe this is an error.",
          ].map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.5 }}>
              <span aria-hidden style={{ color: "#334155", marginTop: 2 }}>•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link
          to="/forgot-password"
          style={{ display: "block", background: "#0078D4", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}
        >
          Reset password
        </Link>
        <Link
          to="/sign-in"
          style={{ display: "block", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "13px", textDecoration: "none", minHeight: 44, lineHeight: "18px" }}
        >
          Try signing in again
        </Link>
        <Link
          to="/help"
          style={{ display: "block", color: "#475569", ...GF, fontSize: 13, textDecoration: "none", padding: "8px" }}
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
