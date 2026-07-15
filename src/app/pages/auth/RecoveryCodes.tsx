// C13 — MFA recovery code entry page.
// Accepts any non-empty code in demo mode. Never logs the code.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { usePlatform } from "../../context/PlatformContext";
import { createMockSignInPayload } from "../../context/PlatformContext";
import { delay } from "../../services/mock/delay";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

export function RecoveryCodes() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const returnTo  = params.get("returnTo") ?? "/app/dashboard";
  const platform  = usePlatform();

  const [code,     setCode]    = useState("");
  const [status,   setStatus]  = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg]= useState<string | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);

    // Demo: any non-empty code works. Never logs the value.
    await delay(500);
    if (trimmed.length > 0) {
      setStatus("success");
      const payload = createMockSignInPayload();
      platform.signIn(payload.user, payload.workspaces, payload.currentWorkspace, payload.subscription, payload.notifications);
      setTimeout(() => navigate(safeReturnTo(returnTo), { replace: true }), 800);
    } else {
      setStatus("error");
      setErrorMsg("Enter a recovery code.");
    }
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Use a recovery code</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          If you have lost access to your authenticator app, enter one of your saved recovery codes.
        </p>
      </div>

      <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
        <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          In this demonstration, any non-empty recovery code is accepted.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {status === "success" && (
        <div role="status" aria-live="polite" style={{ textAlign: "center", marginBottom: 16, color: "#38BDF8", ...GF, fontSize: 14 }}>
          Code accepted — signing you in…
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="rc-code" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Recovery code <span aria-hidden style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            ref={inputRef}
            id="rc-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            aria-required
            aria-invalid={status === "error"}
            disabled={status === "submitting" || status === "success"}
            placeholder="DEMO-XXXX-XXXX"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              borderRadius: 8, color: "white",
              ...GM, fontSize: 15, fontWeight: 600,
              padding: "13px 14px", outline: "none",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          />
          <p style={{ color: "#475569", ...GF, fontSize: 11, margin: "6px 0 0" }}>
            Recovery codes are 14 characters in the format XXXX-XXXX-XXXX.
          </p>
        </div>

        {status !== "success" && (
          <button
            type="submit"
            disabled={!code.trim() || status === "submitting"}
            aria-busy={status === "submitting"}
            style={{
              background: (!code.trim() || status === "submitting") ? "rgba(0,120,212,0.4)" : AZURE,
              border: "none", borderRadius: 8, color: "white",
              ...GF, fontSize: 15, fontWeight: 700,
              padding: "14px", minHeight: 48,
              cursor: (!code.trim() || status === "submitting") ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {status === "submitting" ? "Verifying…" : "Verify code"}
          </button>
        )}
      </form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link to="/mfa" style={{ color: "#38BDF8", ...GF, fontSize: 13, textDecoration: "none" }}>Use authenticator app instead</Link>
        <span style={{ color: "#334155", margin: "0 10px" }}>·</span>
        <Link to="/sign-in" style={{ color: "#475569", ...GF, fontSize: 13, textDecoration: "none" }}>Back to Sign In</Link>
      </div>
    </>
  );
}

function safeReturnTo(raw: string): string {
  if (raw.startsWith("/app")) return raw;
  return "/app/dashboard";
}
