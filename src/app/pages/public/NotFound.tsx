import { Link, useLocation } from "react-router";
import { LagdaLogo } from "../../components/brand/LagdaLogo";

// Public 404 page — LAGDA branded, dark background.
// Never exposes stack traces, internal paths, or implementation details.

const NAV_LINKS = [
  { label: "eSignature", to: "/esignature" },
  { label: "Pricing", to: "/pricing" },
  { label: "Security", to: "/security" },
  { label: "Resources", to: "/resources" },
];

export function NotFound() {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--lagda-navy, #07111F)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "'Geist', 'Inter', sans-serif",
      }}
    >
      {/* Logo — icon-only at compact size */}
      <Link
        to="/esignature"
        style={{ textDecoration: "none", display: "block", marginBottom: 48 }}
        aria-label="LAGDA — Go to homepage"
      >
        <LagdaLogo variant="colored-icon" size="lg" decorative />
      </Link>

      {/* Status code */}
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          color: "var(--lagda-azure, #0078D4)",
          letterSpacing: "0.2em",
          fontWeight: 700,
          marginBottom: 16,
          textTransform: "uppercase",
          margin: "0 0 16px",
        }}
      >
        404 — Page Not Found
      </p>

      {/* Heading */}
      <h1
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textAlign: "center",
          margin: "0 0 12px",
        }}
      >
        This page doesn't exist.
      </h1>

      <p
        style={{
          color: "#64748B",
          fontSize: 15,
          textAlign: "center",
          maxWidth: 420,
          lineHeight: 1.6,
          margin: "0 0 40px",
        }}
      >
        The URL{" "}
        <code
          style={{
            fontFamily: "'Geist Mono', monospace",
            color: "#94A3B8",
            fontSize: 13,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            padding: "1px 6px",
          }}
        >
          {pathname}
        </code>{" "}
        could not be found. It may have moved, or you may have followed a broken link.
      </p>

      {/* Primary CTA */}
      <Link
        to="/esignature"
        style={{
          background: "var(--lagda-azure, #0078D4)",
          color: "white",
          textDecoration: "none",
          borderRadius: "var(--lagda-radius-md, 8px)",
          padding: "12px 28px",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 32,
          boxShadow: "var(--lagda-shadow-azure-glow, 0 4px 20px rgba(0,120,212,0.22))",
          display: "inline-block",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#006CC1")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#0078D4")}
      >
        Go to LAGDA eSignature
      </Link>

      {/* Secondary nav */}
      <nav aria-label="Useful links" style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {NAV_LINKS.map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            style={{
              color: "#475569",
              textDecoration: "none",
              fontSize: 13,
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94A3B8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
