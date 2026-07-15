import { Link, useLocation } from "react-router";
import { APP_CONFIG } from "../../config/app.config";

// Shared development placeholder for routes that are defined in the route
// registry but whose full page has not yet been built.
//
// Rules:
//   - Must clearly indicate this is an in-development page, not a finished product
//   - Must NOT imply backend services are operational
//   - For eNotary routes: must show the required legal disclaimer
//   - Do not show "Coming Soon" for live eSignature features that are merely unbuilt
//   - Never show this component as if it were production content

interface DevPlaceholderProps {
  title: string;
  subtitle?: string;
  isEnotary?: boolean;
  showBack?: boolean;
}

const ENOTARY_DISCLAIMER = APP_CONFIG.legal.enotaryDisclaimer;

export function DevPlaceholder({
  title,
  subtitle,
  isEnotary = false,
  showBack = false,
}: DevPlaceholderProps) {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07111f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {/* Development badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.3)",
          borderRadius: 999,
          padding: "4px 12px",
          marginBottom: 24,
        }}
      >
        <span style={{ color: "#fbbf24", fontSize: 10 }}>●</span>
        <span
          style={{
            color: "#fbbf24",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          IN DEVELOPMENT — {pathname}
        </span>
      </div>

      {/* Title */}
      <h1
        style={{
          color: "white",
          fontSize: 28,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          style={{
            color: "#64748b",
            fontSize: 15,
            textAlign: "center",
            maxWidth: 400,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}

      {/* eNotary disclaimer — required for all eNotary routes */}
      {isEnotary && (
        <div
          style={{
            background: "rgba(103,2,59,0.12)",
            border: "1px solid rgba(176,18,98,0.3)",
            borderRadius: 10,
            padding: "14px 20px",
            maxWidth: 480,
            marginBottom: 32,
          }}
        >
          <p
            style={{
              color: "#b01262",
              fontSize: 12,
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 600,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {ENOTARY_DISCLAIMER}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to="/esignature"
          style={{
            background: "#0078d4",
            color: "white",
            textDecoration: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          eSignature Portal
        </Link>
        {showBack && (
          <button
            onClick={() => window.history.back()}
            style={{
              background: "transparent",
              color: "#64748b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Go Back
          </button>
        )}
      </div>
    </div>
  );
}
