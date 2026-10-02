// C13 — MFA recovery code entry page.
// With a backend the server checks the code (and burns it). The demo build
// accepts any non-empty code and says so. Never logs the code.

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { usePlatform } from "../../context/PlatformContext";
import { createMockSignInPayload } from "../../context/PlatformContext";
import { delay } from "../../services/mock/delay";
import { USE_REAL_BACKEND } from "../../services/backend-flag";
import { realAuthService } from "../../services/real/auth.service";
import { ApiError } from "../../services/api-client";
import { sanitizeAppReturnTo } from "../../utils/authReturnPath";
import { mfaCeremonyEnded } from "./mfa-ceremony";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

export function RecoveryCodes() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const rawReturnTo = params.get("returnTo");
  const returnTo  = sanitizeAppReturnTo(rawReturnTo);
  // Carried to the sibling pages, so the place the visitor was heading for
  // survives a switch between the authenticator and a recovery code.
  const returnQuery = rawReturnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const platform  = usePlatform();

  const [code,     setCode]    = useState("");
  const [status,   setStatus]  = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg]= useState<string | null>(null);
  // The sign-in attempt is over (expired, or too many wrong codes): no code
  // can work until the password is entered again.
  const [ended,    setEnded]   = useState(false);
  // How many codes are left, once one has just been spent.
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);

    // A real recovery code, checked by the server.
    //
    // This page had no real path at all. On a live deployment it accepted ANY
    // non-empty text as a recovery code and then installed a fixture session
    // — "Ana Reyes" in "Mabini Legal Solutions" — telling somebody half-way
    // through an MFA sign-in that a code they had made up had worked.
    //
    // The server's MFA verification already accepts both a 6-digit
    // authenticator code and a recovery code on the same endpoint, and burns a
    // recovery code once used. So this is the call MfaChallenge makes, and the
    // session afterwards is the one the server says exists.
    if (USE_REAL_BACKEND) {
      try {
        const result = await realAuthService.submitMfaChallenge(trimmed);
        const left = typeof result.recoveryCodesRemaining === "number" ? result.recoveryCodesRemaining : null;
        setRemaining(left);
        setStatus("success");
        await platform.refreshSessionFromBackend();
        // Long enough to read how many codes are left; that count is shown
        // nowhere else on the way in.
        setTimeout(() => { void navigate(returnTo, { replace: true }); }, left === null ? 800 : 2600);
      } catch (err) {
        setStatus("error");
        setEnded(mfaCeremonyEnded(err));
        // The server's own message where it has one. It is deliberately the
        // same for a wrong code and a used one, so neither leaks which.
        setErrorMsg(err instanceof ApiError
          ? err.message
          : "That recovery code was not accepted. Check it and try again.");
      }
      return;
    }

    // Demo build only: any non-empty code works. Never logs the value.
    await delay(500);
    if (trimmed.length > 0) {
      setStatus("success");
      const payload = createMockSignInPayload();
      // The mock fixture always has a current workspace; guard so a missing one
      // never enters the session as an undefined workspace.
      const ws = payload.currentWorkspace ?? payload.workspaces[0];
      if (ws) platform.signIn(payload.user, payload.workspaces, ws, payload.subscription, payload.notifications);
      setTimeout(() => { void navigate(returnTo, { replace: true }); }, 800);
    } else {
      setStatus("error");
      setErrorMsg("Enter a recovery code.");
    }
  }

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#07111F", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Use a recovery code</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          If you have lost access to your authenticator app, enter one of your saved recovery codes.
        </p>
      </div>

      {!USE_REAL_BACKEND && (
        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#334155", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            In this demonstration, any non-empty recovery code is accepted.
          </p>
        </div>
      )}

      {errorMsg && (
        <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
          <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          {ended && (
            <Link to={`/sign-in${returnQuery}`} data-testid="mfa-sign-in-again" style={{ color: "#0078D4", ...GF, fontSize: 13, fontWeight: 700, display: "inline-block", marginTop: 8 }}>Sign in again</Link>
          )}
        </div>
      )}

      {status === "success" && (
        <div role="status" aria-live="polite" style={{ textAlign: "center", marginBottom: 16, color: "#0078D4", ...GF, fontSize: 14 }}>
          Code accepted — signing you in…
          {remaining !== null && (
            <p data-testid="recovery-remaining" style={{ color: remaining <= 2 ? "#B45309" : "#334155", ...GF, fontSize: 13, lineHeight: 1.55, margin: "8px 0 0" }}>
              {remaining === 0
                ? "That was your last recovery code. Set up two-step verification again in Settings to get a new set."
                : `That code is now used up. You have ${remaining} recovery code${remaining === 1 ? "" : "s"} left.`}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="rc-code" style={{ display: "block", color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
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
            disabled={status === "submitting" || status === "success" || ended}
            placeholder={USE_REAL_BACKEND ? "XXXX-XXXX-XXXX" : "DEMO-XXXX-XXXX"}
            maxLength={32}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#ffffff",
              border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 8, color: "#07111F",
              ...GM, fontSize: 15, fontWeight: 600,
              padding: "13px 14px", outline: "none",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}
          />
          <p style={{ color: "#64748B", ...GF, fontSize: 11, margin: "6px 0 0" }}>
            Recovery codes are 14 characters in the format XXXX-XXXX-XXXX.
          </p>
        </div>

        {status !== "success" && !ended && (
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
        {!ended && (
          <>
            <Link to={`/mfa${returnQuery}`} style={{ color: "#0078D4", ...GF, fontSize: 13, textDecoration: "none" }}>Use authenticator app instead</Link>
            <span style={{ color: "#94A3B8", margin: "0 10px" }}>·</span>
          </>
        )}
        <Link to={`/sign-in${returnQuery}`} style={{ color: "#64748B", ...GF, fontSize: 13, textDecoration: "none" }}>Back to Sign In</Link>
      </div>
    </>
  );
}
