// /app/settings/security/mfa — Multi-factor authentication overview and demonstration.
// No real TOTP secrets, no QR codes, no real OTP delivery.
// All codes clear immediately on submit, cancel, or unmount.

import React, { useEffect, useRef, useState } from "react";
import { SettingsPage, SSection, SCard, StatusBadge } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";
import type { SecurityMethodSummary } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const GREEN = "#16A34A";
const AMBER = "#D97706";

type EnrollStep = "idle" | "setup" | "verify" | "done";

function MethodStatus(s: string): string {
  if (s === "demonstration-enabled") return "Enabled (Demo)";
  if (s === "enabled")               return "Enabled";
  if (s === "not-enabled")           return "Not Enabled";
  return "Not Available";
}

function MethodColor(s: string): string {
  if (s.includes("enabled")) return GREEN;
  if (s === "not-enabled")   return AMBER;
  return SLATE;
}

export function MfaPage() {
  const [methods, setMethods] = useState<SecurityMethodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollStep, setEnrollStep] = useState<EnrollStep>("idle");
  const [enrollMethod, setEnrollMethod] = useState<string | null>(null);
  const [setupLabel, setSetupLabel] = useState("");
  const [code, setCode]             = useState("");
  const [codeErr, setCodeErr]       = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);
  const [result, setResult]         = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    mockSecuritySettingsService.listMfaMethods().then(m => { setMethods(m); setLoading(false); });
    return () => { isMounted.current = false; };
  }, []);

  const clearCode = () => setCode("");

  const handleBeginEnroll = async (methodId: string) => {
    setBusy(true);
    const res = await mockSecuritySettingsService.beginMfaEnrollmentDemonstration(methodId);
    if (!isMounted.current) return;
    setSetupLabel(res.setupLabel);
    setEnrollMethod(methodId);
    setEnrollStep("setup");
    setBusy(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setCodeErr("Enter a demonstration code."); return; }
    setBusy(true);
    await mockSecuritySettingsService.confirmMfaEnrollmentDemonstration(code);
    clearCode();
    if (!isMounted.current) return;
    setEnrollStep("done");
    setResult("Authenticator setup simulated in frontend state.");
    setBusy(false);
    const updated = await mockSecuritySettingsService.listMfaMethods();
    if (isMounted.current) setMethods(updated);
  };

  const handleDisable = async (methodId: string) => {
    if (!confirm("Disable this demonstration MFA method?")) return;
    await mockSecuritySettingsService.disableMfaDemonstration();
    const updated = await mockSecuritySettingsService.listMfaMethods();
    if (isMounted.current) { setMethods(updated); setResult("MFA demonstration disabled."); }
  };

  const cancelEnroll = () => { clearCode(); setEnrollStep("idle"); setEnrollMethod(null); setCodeErr(null); };

  return (
    <SettingsPage title="Multi-Factor Authentication" breadcrumb="Security › Multi-Factor Auth">
      <div role="note" style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 16px", marginBottom: 18, ...GF, fontSize: 12, color: "#92400E" }}>
        This is a frontend demonstration. No real authenticator codes are generated, delivered, or validated.
      </div>

      {result && (
        <div role="status" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 13, color: "#166534" }}>
          {result}
        </div>
      )}

      {/* Method list */}
      <SSection title="Authentication Methods">
        {loading ? <div style={{ ...GF, fontSize: 13, color: SLATE }}>Loading…</div> : (
          methods.map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F0F2F5", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{m.label}</div>
                <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 2 }}>{m.description}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusBadge label={MethodStatus(m.status)} color={MethodColor(m.status)} />
                {m.status === "not-enabled" && m.id === "totp" && (
                  <button onClick={() => handleBeginEnroll(m.id)} disabled={busy || enrollStep !== "idle"} style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "5px 12px", border: `1.5px solid ${AZURE}`, borderRadius: 6, background: "#FFFFFF", color: AZURE, cursor: "pointer" }}>
                    Set up →
                  </button>
                )}
                {m.status === "demonstration-enabled" && (
                  <button onClick={() => handleDisable(m.id)} style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "5px 12px", border: "1.5px solid #FECACA", borderRadius: 6, background: "#FEF2F2", color: "#991B1B", cursor: "pointer" }}>
                    Disable (Demo)
                  </button>
                )}
                {m.status === "not-available" && (
                  <span style={{ ...GF, fontSize: 12, color: SLATE, fontStyle: "italic" }}>Planned</span>
                )}
              </div>
            </div>
          ))
        )}
      </SSection>

      {/* Authenticator enrollment flow */}
      {enrollStep !== "idle" && enrollMethod === "totp" && (
        <SCard style={{ border: "1.5px solid #BAE0FD" }}>
          <h2 style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, margin: "0 0 12px" }}>Set Up Authenticator App (Demonstration)</h2>
          {enrollStep === "setup" && (
            <>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
                In a real setup, you would scan a QR code with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator). This demonstration does not generate a real TOTP secret or QR code.
              </p>
              <div style={{ background: "#F8FAFC", border: "1.5px dashed #CBD5E1", borderRadius: 8, padding: "20px", marginBottom: 14, textAlign: "center" }}>
                <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: SLATE }}>QR Code Placeholder</div>
                <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>Setup key (demonstration only): <strong style={{ fontFamily: "'Geist Mono', monospace" }}>{setupLabel}</strong></div>
                <div style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 4, fontStyle: "italic" }}>This is not a real TOTP secret. Do not enter it into an authenticator app.</div>
              </div>
              <button onClick={() => setEnrollStep("verify")} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>
                Continue to verification
              </button>
              <button onClick={cancelEnroll} style={{ ...GF, fontSize: 13, padding: "9px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer", marginLeft: 10 }}>Cancel</button>
            </>
          )}
          {enrollStep === "verify" && (
            <form onSubmit={handleVerify} noValidate>
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
                Enter any 6-digit code for this demonstration. No real code is verified.
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setCodeErr(null); }}
                    onBlur={() => void 0}
                    placeholder="000000" aria-label="Demonstration code" aria-invalid={!!codeErr}
                    style={{ ...GF, fontSize: 18, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.2em", padding: "10px 14px", border: `1.5px solid ${codeErr ? "#DC2626" : "#D1D9E0"}`, borderRadius: 8, width: 140, outline: "none" }}
                  />
                  {codeErr && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>{codeErr}</div>}
                </div>
                <button type="submit" disabled={busy} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "10px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
                  {busy ? "Verifying…" : "Confirm (Demo)"}
                </button>
                <button type="button" onClick={cancelEnroll} style={{ ...GF, fontSize: 13, padding: "10px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          )}
          {enrollStep === "done" && (
            <div style={{ ...GF, fontSize: 13, color: "#166534" }}>
              ✓ Authenticator setup simulated in frontend state. MFA is not actually enabled on any real account.
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { setEnrollStep("idle"); setResult(null); }} style={{ ...GF, fontSize: 13, padding: "7px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>Done</button>
              </div>
            </div>
          )}
        </SCard>
      )}

      {/* Recovery direction */}
      <SSection title="Recovery Direction">
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 10px" }}>
          If you lose access to your authentication methods, account recovery requires backend identity verification and support assistance. Production recovery codes are not generated in this demonstration.
        </p>
        <ul style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, padding: "0 0 0 20px", lineHeight: 2 }}>
          <li>Set up a recovery email address (production feature)</li>
          <li>Generate recovery codes when MFA is enabled (production feature)</li>
          <li>Contact Workspace Owner or Administrator for access restoration</li>
          <li>Contact LAGDA support for account recovery assistance</li>
        </ul>
      </SSection>
    </SettingsPage>
  );
}
