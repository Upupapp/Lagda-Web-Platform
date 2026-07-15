import { Link } from "react-router";

// Minimal Sign In stub — frontend-only, no real auth.
// Full implementation (form, validation, mock auth service) will be built
// in a later command. This confirms the auth layout and route are wired.

export function SignIn() {
  return (
    <div style={{ fontFamily: "'Geist', sans-serif" }}>
      <h1
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        Sign in to LAGDA
      </h1>
      <p
        style={{
          color: "#64748b",
          fontSize: 13,
          textAlign: "center",
          marginBottom: 28,
        }}
      >
        Welcome back. Sign in to access your documents and workspace.
      </p>

      {/* Dev notice */}
      <div
        style={{
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            color: "#fbbf24",
            fontSize: 11,
            fontFamily: "'Geist Mono', monospace",
            textAlign: "center",
          }}
        >
          DEV STUB — Sign-in form coming in a later command
        </p>
      </div>

      {/* Placeholder form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          placeholder="Email address"
          disabled
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "12px 14px",
            color: "#94a3b8",
            fontSize: 14,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          disabled
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "12px 14px",
            color: "#94a3b8",
            fontSize: 14,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        <button
          disabled
          style={{
            background: "#0078d4",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "not-allowed",
            opacity: 0.6,
            width: "100%",
          }}
        >
          Sign In
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ color: "#64748b", fontSize: 13 }}>
          Don't have an account?{" "}
        </span>
        <Link
          to="/create-account"
          style={{ color: "#38bdf8", fontSize: 13, textDecoration: "none" }}
        >
          Create one free
        </Link>
      </div>
    </div>
  );
}
