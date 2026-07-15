// C13 — Generic link-error page.
// Driven by ?type= query param. Covers all expired/used/invalid link scenarios.

import { Link, useSearchParams } from "react-router";
import type { LinkErrorType } from "../../models/auth";

const GF = { fontFamily: "'Geist', sans-serif" };

type Config = {
  icon:   string;
  title:  string;
  body:   string;
  cta:    { label: string; to: string };
  secondary?: { label: string; to: string };
};

function getConfig(type: LinkErrorType): Config {
  switch (type) {
    case "expired-verification":
      return {
        icon: "⏱", title: "Verification link expired",
        body: "Email verification links expire after a period of time for your security. You can request a new verification code from the sign-in page.",
        cta: { label: "Go to Sign In", to: "/sign-in" },
      };
    case "used-verification":
      return {
        icon: "✓", title: "Already verified",
        body: "This verification link has already been used. Your email address has been verified.",
        cta: { label: "Sign In", to: "/sign-in" },
      };
    case "invalid-verification":
      return {
        icon: "✕", title: "Invalid verification link",
        body: "This verification link is not valid. It may be malformed or from an outdated email.",
        cta: { label: "Go to Sign In", to: "/sign-in" },
      };
    case "expired-reset":
      return {
        icon: "⏱", title: "Reset link expired",
        body: "Password reset links expire after a limited time for your security. Please request a new one.",
        cta: { label: "Request new link", to: "/forgot-password" },
        secondary: { label: "Back to Sign In", to: "/sign-in" },
      };
    case "used-reset":
      return {
        icon: "✓", title: "Reset link already used",
        body: "This password reset link has already been used. If you need to reset your password again, please request a new link.",
        cta: { label: "Request new link", to: "/forgot-password" },
        secondary: { label: "Back to Sign In", to: "/sign-in" },
      };
    case "invalid-reset":
      return {
        icon: "✕", title: "Invalid reset link",
        body: "This password reset link is not valid. Please request a new one.",
        cta: { label: "Request new link", to: "/forgot-password" },
        secondary: { label: "Back to Sign In", to: "/sign-in" },
      };
    case "expired-invitation":
      return {
        icon: "⏱", title: "Invitation expired",
        body: "This workspace invitation has expired. Ask the person who invited you to send a new invitation.",
        cta: { label: "Back to Sign In", to: "/sign-in" },
      };
    case "revoked-invitation":
      return {
        icon: "✕", title: "Invitation revoked",
        body: "This workspace invitation has been revoked. Contact the workspace administrator if you believe this is a mistake.",
        cta: { label: "Back to Sign In", to: "/sign-in" },
      };
    case "accepted-invitation":
      return {
        icon: "✓", title: "Invitation already accepted",
        body: "This workspace invitation has already been accepted. Sign in to access your workspace.",
        cta: { label: "Sign In", to: "/sign-in" },
      };
    default:
      return {
        icon: "⚠", title: "Link not valid",
        body: "This link is not valid or has expired. Please return to the sign-in page.",
        cta: { label: "Back to Sign In", to: "/sign-in" },
      };
  }
}

function validLinkErrorType(raw: string | null): LinkErrorType {
  const valid: LinkErrorType[] = [
    "expired-verification","used-verification","invalid-verification",
    "expired-reset","used-reset","invalid-reset",
    "expired-invitation","revoked-invitation","accepted-invitation","unknown",
  ];
  if (valid.includes(raw as LinkErrorType)) return raw as LinkErrorType;
  return "unknown";
}

export function LinkError() {
  const [params] = useSearchParams();
  const type     = validLinkErrorType(params.get("type"));
  const cfg      = getConfig(type);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "rgba(201,150,12,0.08)", border: "1px solid rgba(201,150,12,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", fontSize: 22,
      }} aria-hidden>{cfg.icon}</div>

      <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
        {cfg.title}
      </h1>
      <p style={{ color: "#64748B", ...GF, fontSize: 14, lineHeight: 1.7, margin: "0 0 28px", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
        {cfg.body}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link
          to={cfg.cta.to}
          style={{ display: "block", background: "#0078D4", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", textDecoration: "none", minHeight: 48, lineHeight: "20px" }}
        >
          {cfg.cta.label}
        </Link>
        {cfg.secondary && (
          <Link
            to={cfg.secondary.to}
            style={{ display: "block", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "13px", textDecoration: "none", minHeight: 44, lineHeight: "18px" }}
          >
            {cfg.secondary.label}
          </Link>
        )}
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
