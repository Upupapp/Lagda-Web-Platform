import { Outlet, Link, useLocation } from "react-router";
import { APP_CONFIG } from "../config/app.config";

// Stub shell for the authenticated customer platform (/app/...).
// Intentionally minimal — the full platform nav and sidebar will be built
// in a later command. This shell ensures platform routes are clearly
// isolated from the public portal and auth layouts.

export function PlatformLayout() {
  const { pathname } = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07111f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      {/* Minimal platform header stub */}
      <header
        style={{
          height: 56,
          background: "rgba(7,17,31,0.98)",
          borderBottom: "1px solid rgba(0,120,212,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <Link
          to="/esignature"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "white",
              letterSpacing: "0.08em",
            }}
          >
            LAGDA
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#475569",
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            Platform
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontSize: 11,
              color: "#475569",
              fontFamily: "'Geist Mono', monospace",
              background: "rgba(0,120,212,0.08)",
              border: "1px solid rgba(0,120,212,0.2)",
              borderRadius: 6,
              padding: "3px 8px",
            }}
          >
            DEV STUB — Platform shell coming soon
          </span>
          <Link
            to="/sign-in"
            style={{
              fontSize: 12,
              color: "#64748b",
              textDecoration: "none",
            }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Route indicator */}
      <div
        style={{
          padding: "8px 24px",
          background: "rgba(0,120,212,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#334155",
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          {APP_CONFIG.name} Platform › {pathname}
        </span>
      </div>

      {/* Platform page content */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
