import type { ReactNode } from "react";
import { Link } from "react-router";
import { APP_CONFIG } from "../config/app.config";

// Minimal shell for authentication routes (/sign-in, /create-account, etc.)
// Deliberately separate from PublicLayout so the marketing nav is never
// shown on auth screens.

const SHIELD_PATH =
  "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07111f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {/* Brand header */}
      <Link
        to="/esignature"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
          marginBottom: "32px",
        }}
      >
        <div style={{ width: 40, height: 40, flexShrink: 0 }}>
          <svg fill="none" viewBox="0 0 40 40" style={{ width: "100%", height: "100%" }}>
            <rect fill="#0078D4" height="40" rx="8" width="40" />
            <path d={SHIELD_PATH} stroke="white" strokeWidth="2" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: "white",
              letterSpacing: "0.12em",
              marginBottom: -2,
              fontFamily: "'Geist', sans-serif",
            }}
          >
            LAGDA
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 9,
              color: "#0078d4",
              letterSpacing: "0.2em",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            BY UPUP TECHNOLOGIES
          </span>
        </div>
      </Link>

      {/* Auth card */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 16,
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
            }}
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
