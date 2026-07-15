import { Link } from "react-router";
import { APP_CONFIG } from "../../config/app.config";

// Minimal platform landing stub.
// Full dashboard will be built in a later command.
// This stub confirms the /app route works and the platform layout is wired.

export function PlatformIndex() {
  return (
    <div
      style={{
        padding: "64px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Geist', sans-serif",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(0,120,212,0.08)",
          border: "1px solid rgba(0,120,212,0.2)",
          borderRadius: 999,
          padding: "4px 12px",
          marginBottom: 24,
        }}
      >
        <span
          style={{
            color: "#38bdf8",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          PLATFORM ARCHITECTURE STUB
        </span>
      </div>

      <h1
        style={{
          color: "white",
          fontSize: 26,
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        {APP_CONFIG.name} Customer Platform
      </h1>

      <p
        style={{
          color: "#64748b",
          fontSize: 14,
          textAlign: "center",
          maxWidth: 480,
          lineHeight: 1.7,
          marginBottom: 36,
        }}
      >
        The authenticated customer platform is planned for a future command. This
        stub confirms that the <code style={{ fontFamily: "'Geist Mono', monospace", color: "#94a3b8" }}>/app</code>{" "}
        route boundary, layout isolation, and router wiring are working correctly.
      </p>

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
          View Public Portal
        </Link>
        <Link
          to="/sign-in"
          style={{
            background: "transparent",
            color: "#64748b",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "10px 20px",
            fontSize: 13,
          }}
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
