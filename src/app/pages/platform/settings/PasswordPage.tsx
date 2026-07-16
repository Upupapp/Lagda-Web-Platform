// /app/settings/security/password — Password-update demonstration.
// Frontend-only. Values are NOT logged, persisted, or validated against a server.
// All values clear on unmount, cancellation, and after successful simulation.

import React, { useEffect, useRef, useState } from "react";
import { SettingsPage, SSection, SField, BTN_PRIMARY, BTN_SECONDARY } from "./SettingsShell";
import { mockSecuritySettingsService } from "../../../services/mock/settings.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const RED   = "#DC2626";

const COMMON_PATTERNS = ["password", "123456", "qwerty", "lagda", "letmein", "welcome"];

function strengthLabel(pwd: string): { label: string; color: string; width: number } {
  if (pwd.length === 0) return { label: "", color: "#E2E8F0", width: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (COMMON_PATTERNS.some(p => pwd.toLowerCase().includes(p))) score = Math.max(0, score - 2);
  if (score <= 1) return { label: "Weak", color: RED, width: 25 };
  if (score <= 2) return { label: "Fair", color: "#D97706", width: 50 };
  if (score <= 3) return { label: "Good", color: "#16A34A", width: 75 };
  return { label: "Strong", color: "#15803D", width: 100 };
}

export function PasswordPage() {
  const [current, setCurrent]     = useState("");
  const [newPwd, setNewPwd]       = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showCurr, setShowCurr]   = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const isMounted = useRef(true);

  // Clear all values on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      setCurrent("");
      setNewPwd("");
      setConfirm("");
    };
  }, []);

  const clear = () => { setCurrent(""); setNewPwd(""); setConfirm(""); setErrors({}); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!current) e.current = "Required.";
    if (newPwd.length < 8) e.newPwd = "Must be at least 8 characters.";
    if (newPwd === current && current) e.newPwd = "New value must differ from current value.";
    if (confirm !== newPwd) e.confirm = "Values do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const result = await mockSecuritySettingsService.validatePasswordUpdateDemonstration(current, newPwd);
    if (!result.valid) {
      if (isMounted.current) { setErrors({ current: result.reason ?? "Demonstration validation failed." }); setSubmitting(false); }
      return;
    }
    await mockSecuritySettingsService.simulatePasswordUpdate();
    if (isMounted.current) {
      clear();
      setDone(true);
      setSubmitting(false);
      setTimeout(() => { if (isMounted.current) setDone(false); }, 4000);
    }
  };

  const strength = strengthLabel(newPwd);

  return (
    <SettingsPage title="Password Settings" breadcrumb="Security › Password">
      {/* Critical warning — always visible */}
      <div role="note" style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 8, padding: "12px 16px", marginBottom: 20, ...GF, fontSize: 13, color: "#991B1B", fontWeight: 600 }}>
        ⚠ Do not enter a real password. This frontend demonstration does not validate or update account credentials.
      </div>

      <SSection title="Update Password Demonstration">
        <form onSubmit={handleSubmit} noValidate>
          <SField label="Current demonstration value" required help="Enter any demonstration value. This is not validated against a real password.">
            <div style={{ position: "relative" }}>
              <input
                id="pwd-current"
                type={showCurr ? "text" : "password"}
                autoComplete="current-password"
                value={current}
                onChange={e => { setCurrent(e.target.value); setErrors(prev => { const n = { ...prev }; delete n.current; return n; }); }}
                style={{ ...{ fontFamily: "'Geist', sans-serif", fontSize: 13, padding: "9px 40px 9px 12px", border: `1.5px solid ${errors.current ? RED : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" as const } }}
                aria-invalid={!!errors.current} aria-describedby={errors.current ? "pwd-curr-err" : "pwd-warn"}
              />
              <button type="button" onClick={() => setShowCurr(!showCurr)} aria-label={showCurr ? "Hide current value" : "Show current value"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: SLATE, ...GF, fontSize: 12 }}>
                {showCurr ? "Hide" : "Show"}
              </button>
            </div>
            {errors.current && <div id="pwd-curr-err" role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>{errors.current}</div>}
            <div id="pwd-warn" style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 4 }}>Do not enter a real password in this field.</div>
          </SField>

          <SField label="New demonstration value" required help="Minimum 8 characters.">
            <div style={{ position: "relative", marginBottom: 6 }}>
              <input
                id="pwd-new"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setErrors(prev => { const n = { ...prev }; delete n.newPwd; return n; }); }}
                style={{ ...{ fontFamily: "'Geist', sans-serif", fontSize: 13, padding: "9px 40px 9px 12px", border: `1.5px solid ${errors.newPwd ? RED : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" as const } }}
                aria-invalid={!!errors.newPwd}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} aria-label={showNew ? "Hide new value" : "Show new value"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: SLATE, ...GF, fontSize: 12 }}>
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            {newPwd.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: "#E2E8F0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${strength.width}%`, background: strength.color, transition: "width 0.2s" }} />
                </div>
                <div style={{ ...GF, fontSize: 11, color: strength.color, marginTop: 3 }}>{strength.label}</div>
              </div>
            )}
            {errors.newPwd && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>{errors.newPwd}</div>}
          </SField>

          <SField label="Confirm new value" required>
            <div style={{ position: "relative" }}>
              <input
                id="pwd-confirm"
                type={showConf ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(prev => { const n = { ...prev }; delete n.confirm; return n; }); }}
                style={{ ...{ fontFamily: "'Geist', sans-serif", fontSize: 13, padding: "9px 40px 9px 12px", border: `1.5px solid ${errors.confirm ? RED : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" as const } }}
                aria-invalid={!!errors.confirm}
              />
              <button type="button" onClick={() => setShowConf(!showConf)} aria-label={showConf ? "Hide confirmation" : "Show confirmation"}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: SLATE, ...GF, fontSize: 12 }}>
                {showConf ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirm && <div role="alert" style={{ ...GF, fontSize: 12, color: RED, marginTop: 4 }}>{errors.confirm}</div>}
          </SField>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 20px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Simulating…" : "Simulate password update"}
            </button>
            <button type="button" onClick={clear} style={BTN_SECONDARY}>Clear</button>
          </div>

          {done && (
            <div role="status" style={{ marginTop: 14, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, ...GF, fontSize: 13, color: "#166534" }}>
              Password update simulated. No real credential was changed.
            </div>
          )}
        </form>
      </SSection>

      <SSection title="Password Requirements">
        <ul style={{ margin: 0, padding: "0 0 0 20px", ...GF, fontSize: 13, color: SLATE, lineHeight: 2 }}>
          <li>At least 8 characters (demonstration minimum)</li>
          <li>Mix of uppercase, lowercase, numbers, and symbols improves strength</li>
          <li>Must differ from current demonstration value</li>
          <li>Avoid common words or patterns</li>
        </ul>
        <p style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 12, fontStyle: "italic" }}>
          These are frontend demonstration requirements only. Production password policies are enforced by backend services.
        </p>
      </SSection>
    </SettingsPage>
  );
}
