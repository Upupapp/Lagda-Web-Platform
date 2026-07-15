import type { ReactNode } from "react";
import { Link } from "react-router";
import { LagdaLogo } from "../components/brand/LagdaLogo";
import { APP_CONFIG } from "../config/app.config";

// Minimal shell for authentication routes (/sign-in, /create-account, etc.)
// Uses the deep navy background with the white-horizontal logo variant.
// Deliberately separate from PublicLayout so the marketing nav is never
// shown on auth screens.

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--lagda-navy, #07111F)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Geist', 'Inter', sans-serif",
      }}
    >
      {/* Brand header — white-horizontal variant for dark background */}
      <Link
        to="/esignature"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          marginBottom: 32,
          borderRadius: 8,
          padding: "4px 8px",
          margin: "0 -8px 32px",
          outline: "none",
        }}
        aria-label="LAGDA — Go to homepage"
      >
        <LagdaLogo variant="white-horizontal" size="md" decorative />
      </Link>

      {/* Auth card */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "var(--lagda-radius-dialog, 16px)",
          padding: "40px 32px",
        }}
      >
        {children}
      </div>

      {/* Footer links */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          { label: "Privacy Policy", to: "/legal/privacy" },
          { label: "Terms of Service", to: "/legal/terms" },
          { label: "Help Center", to: "/help" },
        ].map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            style={{
              color: "#475569",
              fontSize: 12,
              textDecoration: "none",
              fontFamily: "'Geist', sans-serif",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#64748B")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
          >
            {label}
          </Link>
        ))}
      </div>

      <p
        style={{
          marginTop: 16,
          color: "#334155",
          fontSize: 11,
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        © {new Date().getFullYear()} {APP_CONFIG.company}. All rights reserved.
      </p>
    </div>
  );
}
