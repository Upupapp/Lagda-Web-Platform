// C13 — MFA setup page (onboarding security step opt-in).
// Shows a clearly-fictional TOTP setup with a demo key.
// Setup code: any 6-digit starting with "1" → success (demo rule).
// Never claims real MFA is enrolled. All codes/keys are demonstration values.

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  DEMO_MFA_SETUP_KEY,
  DEMO_MFA_ACCOUNT,
  DEMO_RECOVERY_CODES,
  mockAuthService,
} from "../../services/mock/auth.service";
import { useOnboarding } from "../../context/OnboardingContext";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const AZURE = "#0078D4";

type SetupStep = "intro" | "scan" | "confirm" | "codes";

function KeyBlock({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
      <span style={{ ...GM, fontSize: 12, color: "#94A3B8", wordBreak: "break-all" }}>{value}</span>
      <button onClick={doCopy} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#64748B", ...GF, fontSize: 11, cursor: "pointer", padding: "4px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function MfaSetup() {
  const navigate    = useNavigate();
  const { setMfaSetupDone, updateSecurity } = useOnboarding();
  const [step,      setStep]      = useState<SetupStep>("intro");
  const [code,      setCode]      = useState("");
  const [status,    setStatus]    = useState<"idle"|"submitting"|"success"|"error">("idle");
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const confirmRef  = useRef<HTMLInputElement>(null);
  const codesRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === "confirm") setTimeout(() => confirmRef.current?.focus(), 100);
    if (step === "codes")   setTimeout(() => codesRef.current?.focus(), 100);
  }, [step]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus("submitting");
    setErrorMsg(null);
    const result = await mockAuthService.confirmMfaSetup(code);
    if (result.success) {
      setStatus("success");
      updateSecurity({ mfaEnabled: true });
      setStep("codes");
    } else {
      setStatus("error");
      setErrorMsg("That code is not valid for this demonstration. Try a 6-digit code starting with 1.");
      setCode("");
    }
  }

  function handleDone() {
    setMfaSetupDone(true);
    navigate("/onboarding/notifications");
  }

  function handleCopyAll() {
    navigator.clipboard?.writeText(DEMO_RECOVERY_CODES.join("\n")).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (step === "intro") {
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ color: "white", ...GF, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 6px" }}>Set up two-factor authentication</h1>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
            Add an extra layer of security to your account using an authenticator app.
          </p>
        </div>

        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 4px" }}>FRONTEND DEMONSTRATION</p>
          <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            No real MFA enrollment occurs here. Keys and codes shown are fictional demonstration values.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {[
            { num: "1", text: "Install an authenticator app such as Google Authenticator, Authy, or 1Password." },
            { num: "2", text: "Scan the QR code or enter the setup key provided on the next screen." },
            { num: "3", text: "Enter the 6-digit code from your app to confirm setup." },
            { num: "4", text: "Save your recovery codes in a secure location." },
          ].map(({ num, text }) => (
            <div key={num} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,120,212,0.15)", border: "1px solid rgba(0,120,212,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: AZURE, ...GM, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{num}</div>
              <p style={{ color: "#94A3B8", ...GF, fontSize: 13, margin: 0, lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>

        <button onClick={() => setStep("scan")} style={{ width: "100%", background: AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", minHeight: 48, cursor: "pointer" }}>
          Continue
        </button>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={() => navigate("/onboarding/notifications")} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", ...GF, fontSize: 13 }}>
            Skip for now
          </button>
        </div>
      </>
    );
  }

  // ── Scan ───────────────────────────────────────────────────────────────────

  if (step === "scan") {
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Scan with your app</h1>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
            If your app supports QR scanning, use the key below. Otherwise enter it manually.
          </p>
        </div>

        {/* QR placeholder */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 28, textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 120, height: 120, background: "rgba(255,255,255,0.06)", borderRadius: 8, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 32 }} aria-hidden>▦</span>
            <span style={{ color: "#334155", ...GM, fontSize: 9 }}>DEMO QR</span>
          </div>
          <p style={{ color: "#334155", ...GF, fontSize: 11, margin: 0 }}>This is a non-functional demonstration QR placeholder.</p>
        </div>

        <div>
          <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>Account</p>
          <p style={{ color: "#94A3B8", ...GM, fontSize: 13, margin: "0 0 14px" }}>{DEMO_MFA_ACCOUNT}</p>
          <p style={{ color: "#64748B", ...GF, fontSize: 12, fontWeight: 600, margin: "0 0 0" }}>Setup key</p>
          <KeyBlock value={DEMO_MFA_SETUP_KEY} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={() => setStep("intro")} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: "pointer", minHeight: 44 }}>Back</button>
          <button onClick={() => setStep("confirm")} style={{ flex: 2, background: AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px", cursor: "pointer", minHeight: 44 }}>I've added the account</button>
        </div>
      </>
    );
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  if (step === "confirm") {
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Confirm your code</h1>
          <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
            Enter a 6-digit code from your authenticator app to verify setup.
          </p>
        </div>

        <div style={{ background: "rgba(0,120,212,0.06)", border: "1px solid rgba(0,120,212,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ color: "#475569", ...GF, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: "#C9960C" }}>Demo:</strong> enter any 6-digit code starting with <strong style={{ color: "#94A3B8", ...GM }}>1</strong> to succeed.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ color: "#EF4444", ...GF, fontSize: 13, margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleConfirm} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor="mfa-confirm" style={{ display: "block", color: "#94A3B8", ...GF, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Authenticator code <span aria-hidden style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              ref={confirmRef}
              id="mfa-confirm"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-required
              aria-invalid={status === "error"}
              maxLength={6}
              disabled={status === "submitting"}
              placeholder="000000"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${status === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: 8, color: "white",
                ...GM, fontSize: 24, fontWeight: 700,
                padding: "14px 16px", outline: "none",
                textAlign: "center", letterSpacing: "0.2em",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => setStep("scan")} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: "pointer", minHeight: 44 }}>Back</button>
            <button type="submit" disabled={code.length !== 6 || status === "submitting"} aria-busy={status === "submitting"} style={{ flex: 2, background: code.length !== 6 || status === "submitting" ? "rgba(0,120,212,0.4)" : AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 14, fontWeight: 700, padding: "12px", cursor: code.length !== 6 ? "not-allowed" : "pointer", minHeight: 44 }}>
              {status === "submitting" ? "Verifying…" : "Confirm"}
            </button>
          </div>
        </form>
      </>
    );
  }

  // ── Recovery codes ─────────────────────────────────────────────────────────

  return (
    <div ref={codesRef} tabIndex={-1} style={{ outline: "none" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,120,212,0.12)", border: "1px solid rgba(0,120,212,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 20 }} aria-hidden>✓</div>
        <h1 style={{ color: "white", ...GF, fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>Save your recovery codes</h1>
        <p style={{ color: "#64748B", ...GF, fontSize: 13, lineHeight: 1.6 }}>
          Store these codes in a safe place. Each code can only be used once if you lose access to your authenticator.
        </p>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
        <p style={{ color: "#C9960C", ...GM, fontSize: 9, fontWeight: 700, margin: "0 0 12px" }}>DEMONSTRATION ONLY — THESE CODES ARE NOT FUNCTIONAL</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {DEMO_RECOVERY_CODES.map((c) => (
            <span key={c} style={{ ...GM, fontSize: 12, color: "#94A3B8" }}>{c}</span>
          ))}
        </div>
      </div>

      <button onClick={handleCopyAll} style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#64748B", ...GF, fontSize: 14, fontWeight: 600, padding: "12px", cursor: "pointer", minHeight: 44, marginBottom: 10 }}>
        {copiedAll ? "Copied!" : "Copy all codes"}
      </button>

      <button onClick={handleDone} style={{ width: "100%", background: AZURE, border: "none", borderRadius: 8, color: "white", ...GF, fontSize: 15, fontWeight: 700, padding: "14px", minHeight: 48, cursor: "pointer" }}>
        I've saved my codes — Continue
      </button>
    </div>
  );
}
