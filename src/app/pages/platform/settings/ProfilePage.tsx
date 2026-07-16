// /app/settings/profile — Personal profile.
// Frontend-only demonstration. No Burgundy. No eNotary.
// Do not collect passwords, OTPs, government IDs, or identity documents.

import React, { useEffect, useState, useRef } from "react";
import { SettingsPage, SSection, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY, Skeleton, DEMO_NOTICE } from "./SettingsShell";
import { mockAccountSettingsService } from "../../../services/mock/settings.service";
import type { UserProfile } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_DEMO_SIZE = 5 * 1024 * 1024; // 5 MB demonstration limit

export function ProfilePage() {
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<Partial<UserProfile>>({});
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [validErr, setValidErr] = useState<Record<string, string>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarObjRef = useRef<string | null>(null);

  useEffect(() => {
    mockAccountSettingsService.getUserProfile().then(p => {
      setProfile(p);
      setForm({ fullName: p.fullName, displayName: p.displayName, jobTitle: p.jobTitle, department: p.department, preferredSenderName: p.preferredSenderName });
      setLoading(false);
    }).catch(() => { setError("Could not load profile."); setLoading(false); });

    // Clear avatar object URL on unmount
    return () => { if (avatarObjRef.current) URL.revokeObjectURL(avatarObjRef.current); };
  }, []);

  const update = (key: keyof UserProfile, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
    setValidErr(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName?.trim()) errs.fullName = "Full name is required.";
    else if (form.fullName.trim().length < 2) errs.fullName = "Full name must be at least 2 characters.";
    setValidErr(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const updated = await mockAccountSettingsService.updateUserProfile({
        fullName: form.fullName?.trim(),
        displayName: form.displayName?.trim() || form.fullName?.trim(),
        jobTitle: form.jobTitle?.trim() || "",
        department: form.department?.trim() || "",
        preferredSenderName: form.preferredSenderName?.trim() || form.fullName?.trim() || "",
      });
      setProfile(updated);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Profile update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarErr("Only PNG and JPEG images are supported for this preview.");
      return;
    }
    if (file.size > MAX_DEMO_SIZE) {
      setAvatarErr("File exceeds the 5 MB demonstration limit.");
      return;
    }
    if (avatarObjRef.current) URL.revokeObjectURL(avatarObjRef.current);
    const url = URL.createObjectURL(file);
    avatarObjRef.current = url;
    setAvatarUrl(url);
  };

  const handleRemoveAvatar = () => {
    if (avatarObjRef.current) URL.revokeObjectURL(avatarObjRef.current);
    avatarObjRef.current = null;
    setAvatarUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const initials = profile?.initials ?? "?";

  if (loading) return <SettingsPage title="Profile" breadcrumb="Profile"><Skeleton h={200} /><Skeleton h={200} /></SettingsPage>;
  if (error && !profile) return (
    <SettingsPage title="Profile" breadcrumb="Profile">
      <div style={{ padding: "32px", textAlign: "center", ...GF, fontSize: 14, color: "#DC2626" }}>
        {error} <button onClick={() => location.reload()} style={{ marginLeft: 8, color: AZURE, background: "none", border: "none", cursor: "pointer", ...GF, fontSize: 14 }}>Retry</button>
      </div>
    </SettingsPage>
  );

  return (
    <SettingsPage title="Profile" breadcrumb="Profile">
      {DEMO_NOTICE}
      <form onSubmit={handleSave} noValidate>
        {/* Avatar */}
        <SSection title="Profile Photo">
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div aria-hidden style={{ width: 72, height: 72, borderRadius: "50%", background: avatarUrl ? "transparent" : AZURE, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ ...GF, fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>{initials}</span>
              }
            </div>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label htmlFor="avatar-upload" style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "7px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer", color: NAVY, background: "#FFFFFF" }}>
                  Select image
                </label>
                <input id="avatar-upload" type="file" ref={fileRef} accept="image/png,image/jpeg" onChange={handleFileSelect} style={{ display: "none" }} aria-describedby="avatar-help" />
                {avatarUrl && (
                  <button type="button" onClick={handleRemoveAvatar} style={{ ...GF, fontSize: 13, padding: "7px 14px", border: "1.5px solid #FECACA", borderRadius: 8, cursor: "pointer", color: "#991B1B", background: "#FEF2F2" }}>Remove</button>
                )}
              </div>
              <div id="avatar-help" style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>
                PNG or JPEG, up to 5 MB. Used for this frontend preview only — not uploaded or stored.
              </div>
              {avatarErr && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>{avatarErr}</div>}
            </div>
          </div>
        </SSection>

        {/* Identity */}
        <SSection title="Personal Information">
          <SField label="Full name" required help="Your legal or preferred name used across the platform.">
            <input id="full-name" type="text" autoComplete="name" value={form.fullName ?? ""} onChange={e => update("fullName", e.target.value)}
              style={{ ...INPUT_STYLE, borderColor: validErr.fullName ? "#DC2626" : "#D1D9E0" }}
              aria-describedby={validErr.fullName ? "full-name-err" : undefined} aria-invalid={!!validErr.fullName} required />
            {validErr.fullName && <div id="full-name-err" role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>{validErr.fullName}</div>}
          </SField>

          <SField label="Display name" help="Shown in notifications and the platform header. Defaults to full name.">
            <input type="text" autoComplete="nickname" value={form.displayName ?? ""} onChange={e => update("displayName", e.target.value)} style={INPUT_STYLE} />
          </SField>

          <SField label="Primary email" help="Read-only. Contact support to change your account email.">
            <input type="email" value={profile?.email ?? ""} readOnly disabled style={{ ...INPUT_STYLE, background: "#F8FAFC", color: SLATE }} />
          </SField>

          <SField label="Job title" help="Your role within your organization.">
            <input type="text" autoComplete="organization-title" value={form.jobTitle ?? ""} onChange={e => update("jobTitle", e.target.value)} style={INPUT_STYLE} />
          </SField>

          <SField label="Department" help="Team or department within your organization.">
            <input type="text" autoComplete="organization" value={form.department ?? ""} onChange={e => update("department", e.target.value)} style={INPUT_STYLE} />
          </SField>
        </SSection>

        {/* Sender */}
        <SSection title="Sender Display">
          <SField label="Preferred sender name" help="Shown to recipients when you send documents for signing.">
            <input type="text" value={form.preferredSenderName ?? ""} onChange={e => update("preferredSenderName", e.target.value)} style={INPUT_STYLE} />
          </SField>
        </SSection>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={!dirty || saving} style={{ ...BTN_PRIMARY, opacity: (!dirty || saving) ? 0.6 : 1, cursor: (!dirty || saving) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {dirty && !saving && (
            <button type="button" onClick={() => { setForm({ fullName: profile?.fullName, displayName: profile?.displayName, jobTitle: profile?.jobTitle, department: profile?.department, preferredSenderName: profile?.preferredSenderName }); setDirty(false); setValidErr({}); }}
              style={BTN_SECONDARY}>Discard</button>
          )}
          {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Profile updated in this frontend demonstration.</span>}
          {dirty && !saving && <span style={{ ...GF, fontSize: 12, color: SLATE }}>Unsaved changes.</span>}
        </div>
      </form>
    </SettingsPage>
  );
}
