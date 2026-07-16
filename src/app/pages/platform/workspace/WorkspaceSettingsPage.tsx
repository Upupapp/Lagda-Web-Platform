// /app/workspace/settings — Workspace settings.
// Workspace identity, default role, security settings, session policy.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceSettings } from "../../../models/workspace-admin";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
      <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
      <div style={{ flex: "0 0 220px", minWidth: 160 }}>
        <div style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY }}>{label}</div>
        {help && <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>{help}</div>}
      </div>
      <div style={{ flex: "1 1 280px", minWidth: 180 }}>{children}</div>
    </div>
  );
}

const DEFAULT_ROLES = [
  { id: "role_member",           name: "Member" },
  { id: "role_sender",           name: "Sender" },
  { id: "role_reviewer_auditor", name: "Reviewer / Auditor" },
];

const SESSION_TIMEOUT_OPTIONS = [
  { value: 60,   label: "1 hour" },
  { value: 240,  label: "4 hours" },
  { value: 480,  label: "8 hours" },
  { value: 1440, label: "24 hours" },
];

function SettingsInner() {
  const { state, asyncLoadSettings, asyncUpdateSettings } = useWorkspaceAdmin();
  const [form, setForm] = useState<Partial<WorkspaceSettings>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { asyncLoadSettings(); }, [asyncLoadSettings]);

  useEffect(() => {
    if (state.settings && Object.keys(form).length === 0) {
      setForm({
        name:                  state.settings.name,
        slug:                  state.settings.slug,
        billingEmail:          state.settings.billingEmail,
        defaultMemberRoleId:   state.settings.defaultMemberRoleId,
        requireMfaForAdmins:   state.settings.requireMfaForAdmins,
        allowMemberInvites:    state.settings.allowMemberInvites,
        sessionTimeoutMinutes: state.settings.sessionTimeoutMinutes,
      });
    }
  }, [state.settings]);

  const update = (key: keyof WorkspaceSettings, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await asyncUpdateSettings(form);
    setSaving(false);
    setDirty(false);
    setSaved(true);
    await asyncLoadSettings();
    setTimeout(() => setSaved(false), 2500);
  };

  if (state.settingsLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {[60, 200, 200].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  const inputStyle = { ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" as const };
  const toggleStyle = (on: boolean) => ({
    display: "inline-flex", alignItems: "center", width: 44, height: 24, borderRadius: 999,
    background: on ? AZURE : "#CBD5E1", cursor: "pointer", padding: "2px", transition: "background 0.2s",
    border: "none", flexShrink: 0 as const,
  });
  const thumbStyle = (on: boolean) => ({
    width: 20, height: 20, borderRadius: "50%", background: "#FFFFFF",
    transform: on ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Settings</li>
          </ol>
        </nav>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Workspace Settings</h1>
      </header>

      <div style={{ maxWidth: 700, margin: "24px auto 0", padding: "0 24px" }}>
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 16px", marginBottom: 18, ...GF, fontSize: 12, color: "#92400E" }}>
          Demonstration mode — all changes are session-local and reset on page reload. No real data is updated.
        </div>

        <form onSubmit={handleSave}>
          {/* Identity */}
          <SettingsSection title="Workspace identity">
            <Field label="Workspace name" help="Used across the platform and in email notifications.">
              <input type="text" value={form.name ?? ""} onChange={e => update("name", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Slug" help="URL identifier for this workspace. Changing affects all deep links.">
              <input type="text" value={form.slug ?? ""} onChange={e => update("slug", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Billing email" help="Where billing receipts and payment notifications are sent.">
              <input type="email" value={form.billingEmail ?? ""} onChange={e => update("billingEmail", e.target.value)} style={inputStyle} />
            </Field>
          </SettingsSection>

          {/* Membership */}
          <SettingsSection title="Membership">
            <Field label="Default member role" help="Role automatically assigned to new members after accepting an invitation.">
              <select value={form.defaultMemberRoleId ?? ""} onChange={e => update("defaultMemberRoleId", e.target.value)}
                style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", width: "100%", cursor: "pointer" }}>
                {DEFAULT_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Allow member invites" help="When enabled, all members (not just admins) can invite others.">
              <button type="button" role="switch" aria-checked={form.allowMemberInvites ?? false}
                onClick={() => update("allowMemberInvites", !form.allowMemberInvites)}
                style={toggleStyle(form.allowMemberInvites ?? false)}>
                <span style={thumbStyle(form.allowMemberInvites ?? false)} />
                <span className="sr-only">{form.allowMemberInvites ? "Enabled" : "Disabled"}</span>
              </button>
              <span style={{ ...GF, fontSize: 12, color: SLATE, marginLeft: 10 }}>
                {form.allowMemberInvites ? "Enabled" : "Disabled (only admins and owners)"}
              </span>
            </Field>
          </SettingsSection>

          {/* Security */}
          <SettingsSection title="Security">
            <Field label="Require MFA for admins" help="Owners and Administrators must have multi-factor authentication enabled.">
              <button type="button" role="switch" aria-checked={form.requireMfaForAdmins ?? false}
                onClick={() => update("requireMfaForAdmins", !form.requireMfaForAdmins)}
                style={toggleStyle(form.requireMfaForAdmins ?? false)}>
                <span style={thumbStyle(form.requireMfaForAdmins ?? false)} />
                <span className="sr-only">{form.requireMfaForAdmins ? "Enabled" : "Disabled"}</span>
              </button>
              <span style={{ ...GF, fontSize: 12, color: SLATE, marginLeft: 10 }}>
                {form.requireMfaForAdmins ? "Required" : "Not required"}
              </span>
            </Field>
            <Field label="Session timeout" help="Members will be signed out after this period of inactivity.">
              <select value={form.sessionTimeoutMinutes ?? 480} onChange={e => update("sessionTimeoutMinutes", Number(e.target.value))}
                style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", minWidth: 180 }}>
                {SESSION_TIMEOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </SettingsSection>

          {/* Save */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" disabled={!dirty || saving}
              style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "10px 24px", border: "none", borderRadius: 8,
                background: dirty ? AZURE : "#E2E8F0", color: dirty ? "#FFFFFF" : SLATE,
                cursor: dirty ? "pointer" : "not-allowed", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Settings saved.</span>}
            {dirty && !saving && <span style={{ ...GF, fontSize: 12, color: SLATE }}>You have unsaved changes.</span>}
          </div>
        </form>

        {/* Danger zone */}
        <div style={{ marginTop: 32, background: "#FFFFFF", border: "1.5px solid #FECACA", borderRadius: 12, padding: "20px 24px" }}>
          <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Ownership transfer</h2>
          <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 14px" }}>
            Transfer workspace ownership to another active member. You will become an Administrator.
            This action requires you to re-enter your password.
          </p>
          <button disabled
            style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: "not-allowed", opacity: 0.7 }}>
            Transfer ownership (demonstration only)
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceSettingsPage() {
  return (
    <WorkspaceAdminProvider>
      <SettingsInner />
    </WorkspaceAdminProvider>
  );
}
