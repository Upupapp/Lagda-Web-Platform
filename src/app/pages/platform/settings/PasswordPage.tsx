// /app/settings/security/password — change your password.
//
// With a backend: POST /me/password { currentPassword, newPassword }. A wrong
// current password is a 401 INVALID_CREDENTIALS and a rejected new one a 422
// INVALID_PASSWORD; both are shown against the field they are about. On
// success the backend keeps THIS session and signs out every other one, and
// the page says how many. Demo build: nothing is changed, and it says so.
//
// Values live only in this component's state and are cleared on success,
// on Clear and on unmount. They are never logged or stored.

import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, ListChecks, CircleCheck, Eraser } from "lucide-react";
import { SettingsActions } from "./SettingsActions";
import { SettingsPage, SSection, SField, BTN_PRIMARY, BTN_SECONDARY, INPUT_STYLE, Notice, SET } from "./SettingsShell";
import { securityData, IS_LIVE } from "./settings-data";
import { PASSWORD_MIN_LENGTH } from "../../../services/real/security-settings.service";

const GF = { fontFamily: SET.FONT };

const COMMON_PATTERNS = ["password", "123456", "qwerty", "lagda", "letmein", "welcome"];

function strengthOf(pwd: string): { label: string; color: string; width: number } {
  if (pwd.length === 0) return { label: "", color: "#E2E8F0", width: 0 };
  let score = 0;
  if (pwd.length >= PASSWORD_MIN_LENGTH) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (COMMON_PATTERNS.some(p => pwd.toLowerCase().includes(p))) score = Math.max(0, score - 2);
  if (score <= 1) return { label: "Weak", color: "#B91C1C", width: 25 };
  if (score <= 2) return { label: "Fair", color: "#B45309", width: 50 };
  if (score <= 3) return { label: "Good", color: "#15803D", width: 75 };
  return { label: "Strong", color: "#166534", width: 100 };
}

function PasswordInput({ id, value, onChange, show, onToggle, autoComplete, invalid, describedBy, toggleLabel }: {
  id: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
  autoComplete: string; invalid: boolean; describedBy?: string; toggleLabel: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value}
        onChange={e => { onChange(e.target.value); }} aria-invalid={invalid} aria-describedby={describedBy}
        style={{ ...INPUT_STYLE, paddingRight: 44, borderColor: invalid ? SET.DANGER : "#CBD5E1" }} />
      <button type="button" onClick={onToggle} aria-label={show ? `Hide ${toggleLabel}` : `Show ${toggleLabel}`} aria-pressed={show}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 6, cursor: "pointer", color: SET.SLATE }}>
        {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </div>
  );
}

export function PasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [done, setDone] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const clear = () => { setCurrent(""); setNext(""); setConfirm(""); setErrors({}); };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!current) e.current = "Enter your current password.";
    if (next.length < PASSWORD_MIN_LENGTH) e.next = `Use at least ${String(PASSWORD_MIN_LENGTH)} characters.`;
    else if (next === current) e.next = "Choose a password different from your current one.";
    if (confirm !== next) e.confirm = "The passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDone(null);
    if (!validate()) return;
    setSubmitting(true);
    const result = await securityData.changePassword(current, next);
    if (!mounted.current) return;
    setSubmitting(false);
    if (result.ok) {
      clear();
      const others = result.otherSessionsRevoked;
      setDone(IS_LIVE
        ? `Password changed. ${others === 0 ? "You stay signed in here." : `You stay signed in here, and ${String(others)} other session${others === 1 ? " was" : "s were"} signed out.`}`
        : "Demo build — no password was changed.");
    } else if (result.field === "current") {
      setErrors({ current: result.message });
    } else if (result.field === "new") {
      setErrors({ next: result.message });
    } else {
      setErrors({ form: result.message });
    }
  };

  const strength = strengthOf(next);

  return (
    <SettingsPage title="Password" breadcrumb="Security › Password" description="Change the password you use to sign in to LAGDA.">
      {done && <Notice tone="success" icon={CircleCheck} role="status">{done}</Notice>}
      {errors.form && <Notice tone="danger" role="alert">{errors.form}</Notice>}

      <SSection title="Change password" icon={KeyRound}
        description={IS_LIVE ? "You stay signed in on this device. Every other session is signed out." : "Demo build — use any values; nothing is changed."}>
        <form onSubmit={e => { void handleSubmit(e); }} noValidate>
          <SField label="Current password" htmlFor="pwd-current" required>
            <PasswordInput id="pwd-current" value={current} onChange={v => { setCurrent(v); setErrors(p => ({ ...p, current: undefined, form: undefined })); }}
              show={show.current} onToggle={() => { setShow(s => ({ ...s, current: !s.current })); }} autoComplete="current-password"
              invalid={!!errors.current} describedBy={errors.current ? "pwd-current-err" : undefined} toggleLabel="current password" />
            {errors.current && <div id="pwd-current-err" role="alert" style={{ ...GF, fontSize: 12.5, color: SET.DANGER, marginTop: 5 }}>{errors.current}</div>}
          </SField>

          <SField label="New password" htmlFor="pwd-new" required help={`At least ${String(PASSWORD_MIN_LENGTH)} characters.`}>
            <PasswordInput id="pwd-new" value={next} onChange={v => { setNext(v); setErrors(p => ({ ...p, next: undefined, form: undefined })); }}
              show={show.next} onToggle={() => { setShow(s => ({ ...s, next: !s.next })); }} autoComplete="new-password"
              invalid={!!errors.next} describedBy={errors.next ? "pwd-new-err" : "pwd-strength"} toggleLabel="new password" />
            {next.length > 0 && (
              <div id="pwd-strength" style={{ marginTop: 7 }}>
                <div style={{ height: 5, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${String(strength.width)}%`, background: strength.color, transition: "width 0.2s" }} />
                </div>
                <div style={{ ...GF, fontSize: 12, fontWeight: 600, color: strength.color, marginTop: 4 }}>Strength: {strength.label}</div>
              </div>
            )}
            {errors.next && <div id="pwd-new-err" role="alert" style={{ ...GF, fontSize: 12.5, color: SET.DANGER, marginTop: 5 }}>{errors.next}</div>}
          </SField>

          <SField label="Confirm new password" htmlFor="pwd-confirm" required>
            <PasswordInput id="pwd-confirm" value={confirm} onChange={v => { setConfirm(v); setErrors(p => ({ ...p, confirm: undefined })); }}
              show={show.confirm} onToggle={() => { setShow(s => ({ ...s, confirm: !s.confirm })); }} autoComplete="new-password"
              invalid={!!errors.confirm} describedBy={errors.confirm ? "pwd-confirm-err" : undefined} toggleLabel="confirmation" />
            {errors.confirm && <div id="pwd-confirm-err" role="alert" style={{ ...GF, fontSize: 12.5, color: SET.DANGER, marginTop: 5 }}>{errors.confirm}</div>}
          </SField>

          <SettingsActions>
            <button type="button" onClick={clear} style={BTN_SECONDARY}><Eraser size={15} aria-hidden /> Clear</button>
            <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              <KeyRound size={15} aria-hidden /> {submitting ? "Changing…" : "Change password"}
            </button>
          </SettingsActions>
        </form>
      </SSection>

      <SSection title="A good password" icon={ListChecks}>
        <ul style={{ margin: 0, padding: "0 0 0 20px", ...GF, fontSize: 13.5, color: SET.SLATE, lineHeight: 1.9 }}>
          <li>At least {PASSWORD_MIN_LENGTH} characters — longer is stronger</li>
          <li>A mix of upper and lower case letters, numbers and symbols</li>
          <li>Not used for any other account</li>
          <li>No common words or patterns such as “password” or “123456”</li>
        </ul>
      </SSection>
    </SettingsPage>
  );
}
