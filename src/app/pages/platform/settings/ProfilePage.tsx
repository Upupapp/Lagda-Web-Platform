// /app/settings/profile — Personal profile.
//
// Real against the backend when one is configured: reads GET /me, writes
// PATCH /me/profile, and stores the photo with PUT/DELETE /me/avatar (072).
// Falls back to the mock only when there is no backend, so the demo build
// still renders — there the photo is a preview only, and says so.
//
// ── One Save, everything saved ─────────────────────────────────────────────
//
// Personal information, the sender display name and the photo are saved by
// the SAME button, together. Then the platform session is re-read before the
// success message appears, because the header avatar, the name everywhere
// and the sender line all read that session, not this form — and every OTHER
// open tab is told to re-read it too. So when this page says "Profile
// updated", every place that shows you already shows the new you.
//
// Do not collect passwords, OTPs, government IDs, or identity documents.

import React, { useEffect, useState, useRef } from "react";
// This page is listed in LIVE_SETTINGS_PATHS, so the shell shows it no preview
// note. That listing is the single place the decision is made.
import { SettingsPage, SSection, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY, Skeleton } from "./SettingsShell";
import { mockAccountSettingsService } from "../../../services/mock/settings.service";
import { realAccountSettingsService } from "../../../services/real/account-settings.service";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import { usePlatform, announceProfileChanged } from "../../../context/PlatformContext";
import { initialsOf } from "../../../components/platform/UserAvatar";
import type { UserProfile } from "../../../models/settings";

/** One switch, read once, rather than a conditional at each call site. */
const settingsService = USE_REAL_BACKEND
  ? realAccountSettingsService
  : mockAccountSettingsService;

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
/** What is stored: a square this size, whatever was picked. Small enough to
 *  load instantly in the header, large enough to stay sharp at 2x. */
const AVATAR_SIZE = 256;

/**
 * Crops the picked image to a centred square and scales it to AVATAR_SIZE,
 * as a PNG — the only format the server accepts, because a PNG's shape can
 * be checked from its header without an image library. Returns the base64
 * payload without the `data:` prefix, and a preview URL.
 */
async function toAvatarPng(file: File): Promise<{ base64: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => { resolve(el); };
      el.onerror = () => { reject(new Error("unreadable")); };
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("no canvas");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, AVATAR_SIZE, AVATAR_SIZE,
    );
    const dataUrl = canvas.toDataURL("image/png");
    return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), preview: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** What the photo will be after Save: unchanged, a new one, or none. */
type PhotoChange =
  | { readonly kind: "none" }
  | { readonly kind: "upload"; readonly base64: string; readonly preview: string }
  | { readonly kind: "remove" };

export function ProfilePage() {
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<Partial<UserProfile>>({});
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);
  // A failed SAVE, kept apart from a failed LOAD — they once shared a state
  // that only rendered on the load-failure screen, so failed saves were silent.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validErr, setValidErr] = useState<Record<string, string>>({});
  const [photo, setPhoto]       = useState<PhotoChange>({ kind: "none" });
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const { user, refreshSessionFromBackend } = usePlatform();
  const fileRef = useRef<HTMLInputElement>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    settingsService.getUserProfile().then(p => {
      setProfile(p);
      setForm({ fullName: p.fullName, displayName: p.displayName, jobTitle: p.jobTitle, department: p.department, preferredSenderName: p.preferredSenderName });
      setLoading(false);
    }).catch(() => { setError("Could not load profile."); setLoading(false); });
    return () => { if (savedTimer.current !== null) window.clearTimeout(savedTimer.current); };
  }, []);

  const touched = () => { setSaved(false); setSaveError(null); };

  const update = (key: keyof UserProfile, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    touched();
    setValidErr(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName?.trim()) errs.fullName = "Full name is required.";
    else if (form.fullName.trim().length < 2) errs.fullName = "Full name must be at least 2 characters.";
    setValidErr(errs);
    return Object.keys(errs).length === 0;
  };

  const hasChanges = dirty || photo.kind !== "none";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (dirty) {
        const updated = await settingsService.updateUserProfile({
          fullName: form.fullName?.trim(),
          displayName: form.displayName?.trim() || form.fullName?.trim(),
          jobTitle: form.jobTitle?.trim() || "",
          department: form.department?.trim() || "",
          preferredSenderName: form.preferredSenderName?.trim() || form.fullName?.trim() || "",
        });
        setProfile(updated);
        setDirty(false);
      }
      if (USE_REAL_BACKEND) {
        if (photo.kind === "upload") await realAccountSettingsService.uploadAvatar(photo.base64);
        if (photo.kind === "remove") await realAccountSettingsService.removeAvatar();
        // AWAITED, before "Profile updated" shows: when the page says it is
        // saved, the header and every other place already show the change.
        await refreshSessionFromBackend();
        announceProfileChanged();
        setPhoto({ kind: "none" });
        if (fileRef.current) fileRef.current.value = "";
      }
      setSaved(true);
      savedTimer.current = window.setTimeout(() => { setSaved(false); }, 2500);
    } catch (err) {
      // The server's own message where there is one: it knows whether a name
      // was too short or an image could not be used.
      const message = err instanceof Error && err.message.trim() !== "" ? err.message : null;
      setSaveError(message ?? "Your changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarErr("Use a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setAvatarErr("That image is larger than 5 MB.");
      return;
    }
    try {
      const { base64, preview } = await toAvatarPng(file);
      setPhoto({ kind: "upload", base64, preview });
      touched();
    } catch {
      setAvatarErr("That image could not be read. Try a different photo.");
    }
  };

  const handleRemoveAvatar = () => {
    setPhoto({ kind: "remove" });
    touched();
    if (fileRef.current) fileRef.current.value = "";
  };

  const discard = () => {
    setForm({ fullName: profile?.fullName, displayName: profile?.displayName, jobTitle: profile?.jobTitle, department: profile?.department, preferredSenderName: profile?.preferredSenderName });
    setDirty(false);
    setValidErr({});
    setPhoto({ kind: "none" });
    setSaveError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // What the photo WILL be after Save. The stored one comes from the session
  // (`avatarUrl` is versioned), the pending one from the crop just made.
  const shownPhoto = photo.kind === "upload"
    ? photo.preview
    : photo.kind === "remove" ? undefined : user?.avatarUrl;
  const initials = initialsOf(form.displayName?.trim() || form.fullName?.trim() || profile?.displayName || "?");

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
      <form onSubmit={handleSave} noValidate>
        {/* Avatar */}
        <SSection title="Profile Photo">
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div aria-hidden style={{ width: 72, height: 72, borderRadius: "50%", background: shownPhoto ? "transparent" : AZURE, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {shownPhoto
                ? <img src={shownPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ ...GF, fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>{initials}</span>
              }
            </div>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label htmlFor="avatar-upload" style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "7px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer", color: NAVY, background: "#FFFFFF" }}>
                  {shownPhoto ? "Change photo" : "Select image"}
                </label>
                <input id="avatar-upload" type="file" ref={fileRef} accept="image/png,image/jpeg,image/webp" onChange={e => { void handleFileSelect(e); }} style={{ display: "none" }} aria-describedby="avatar-help" />
                {shownPhoto && (
                  <button type="button" onClick={handleRemoveAvatar} style={{ ...GF, fontSize: 13, padding: "7px 14px", border: "1.5px solid #FECACA", borderRadius: 8, cursor: "pointer", color: "#991B1B", background: "#FEF2F2" }}>Remove</button>
                )}
              </div>
              <div id="avatar-help" style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>
                {USE_REAL_BACKEND
                  ? "PNG, JPEG or WebP, up to 5 MB. Cropped to a square. Saved with the rest of your profile, and shown wherever your name appears."
                  : "PNG, JPEG or WebP, up to 5 MB. A preview only in this demo — not uploaded or stored."}
              </div>
              {photo.kind !== "none" && (
                <div style={{ ...GF, fontSize: 12, color: AZURE, marginTop: 4 }}>
                  {photo.kind === "upload" ? "New photo — press Save changes to keep it." : "Photo will be removed when you save."}
                </div>
              )}
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

          <SField label="Job title" help="Your role within your organization. Shown under your name in the account menu.">
            <input type="text" autoComplete="organization-title" value={form.jobTitle ?? ""} onChange={e => update("jobTitle", e.target.value)} style={INPUT_STYLE} />
          </SField>

          <SField label="Department" help="Team or department within your organization. Shown under your name in the account menu.">
            <input type="text" autoComplete="organization" value={form.department ?? ""} onChange={e => update("department", e.target.value)} style={INPUT_STYLE} />
          </SField>
        </SSection>

        {/* Sender */}
        <SSection title="Sender Display">
          <SField label="Preferred sender name" help="Shown to recipients when you send documents for signing. Defaults to your full name.">
            <input type="text" value={form.preferredSenderName ?? ""} onChange={e => update("preferredSenderName", e.target.value)} style={INPUT_STYLE} />
          </SField>
        </SSection>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={!hasChanges || saving} style={{ ...BTN_PRIMARY, opacity: (!hasChanges || saving) ? 0.6 : 1, cursor: (!hasChanges || saving) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {hasChanges && !saving && (
            <button type="button" onClick={discard} style={BTN_SECONDARY}>Discard</button>
          )}
          {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Profile updated.</span>}
          {saveError !== null && (
            <span role="alert" style={{ ...GF, fontSize: 13, color: "#DC2626" }}>{saveError}</span>
          )}
          {hasChanges && !saving && <span style={{ ...GF, fontSize: 12, color: SLATE }}>Unsaved changes.</span>}
        </div>
      </form>
    </SettingsPage>
  );
}
