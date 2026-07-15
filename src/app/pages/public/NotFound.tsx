import { Link, useLocation } from "react-router";

// Public 404 page.
// Shows for any URL that doesn't match any defined route.
// Never exposes stack traces, internal paths, or implementation details.

const SHIELD_PATH =
  "M20 9C20.1761 9 20.3347 9.03884 20.4609 9.09766L20.5762 9.16211C23.3215 11.0792 27.2476 12.5996 30.5 12.5996C30.6958 12.5996 30.8502 12.6643 30.9355 12.7324C30.9755 12.7644 30.9926 12.7903 30.998 12.8008C30.9989 12.8024 30.9996 12.8037 31 12.8047V21.1982C31 23.8536 29.8587 25.8341 27.9609 27.3916C26.0274 28.9784 23.3127 30.1167 20.248 30.9717C20.1003 31.0116 19.9352 31.0087 19.791 30.9658L19.7812 30.9629L19.7715 30.9609L19.1992 30.7979C16.3603 29.9677 13.8563 28.8766 12.041 27.3896C10.1418 25.8338 9 23.8536 9 21.1982V12.8047C9.00042 12.8037 9.00111 12.8024 9.00195 12.8008C9.00738 12.7903 9.02447 12.7644 9.06445 12.7324C9.14978 12.6643 9.3042 12.5996 9.5 12.5996C12.7531 12.5996 16.6943 11.0667 19.4238 9.16211C19.561 9.06836 19.7652 9 20 9ZM18.5 21.1162L16.125 19.2168L14.875 20.7793L17.875 23.1787L18.5 23.6777L19.125 23.1787L25.125 18.3789L24.5 17.5986L23.875 16.8174L18.5 21.1162Z";

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
        background: "#07111f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {/* Logo */}
      <Link
        to="/esignature"
        style={{ textDecoration: "none", display: "block", marginBottom: 48 }}
      >
        <svg fill="none" viewBox="0 0 40 40" style={{ width: 40, height: 40 }}>
          <rect fill="#0078D4" height="40" rx="8" width="40" />
          <path d={SHIELD_PATH} stroke="white" strokeWidth="2" />
        </svg>
      </Link>

      {/* Status code */}
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          color: "#0078d4",
          letterSpacing: "0.2em",
          fontWeight: 700,
          marginBottom: 16,
          textTransform: "uppercase",
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
          marginBottom: 12,
        }}
      >
        This page doesn't exist.
      </h1>

      <p
        style={{
          color: "#64748b",
          fontSize: 15,
          textAlign: "center",
          maxWidth: 400,
          lineHeight: 1.6,
          marginBottom: 40,
        }}
      >
        The URL{" "}
        <code
          style={{
            fontFamily: "'Geist Mono', monospace",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          {pathname}
        </code>{" "}
        could not be found. It may have moved, or you may have followed a broken
        link.
      </p>

      {/* Primary CTA */}
      <Link
        to="/esignature"
        style={{
          background: "#0078d4",
          color: "white",
          textDecoration: "none",
          borderRadius: 10,
          padding: "12px 28px",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 32,
          boxShadow: "0 4px 12px rgba(0,120,212,0.25)",
        }}
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
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
