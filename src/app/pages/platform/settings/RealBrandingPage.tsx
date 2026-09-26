// /app/settings/branding, real backend (082).
//
// Loads the CURRENT workspace's branding, previews edits as they are typed,
// and saves them to the workspace: the display name renames the workspace;
// sender name, tagline and colour are stored with it; the logo is converted
// to a PNG in the browser and uploaded on Save. A successful save is applied
// to the sidebar badge at once and broadcast to this browser's other tabs;
// other members see it when their window regains focus or within a minute.

import React, { useEffect, useRef, useState } from "react";
import { SettingsPage, SSection, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY, Skeleton } from "./SettingsShell";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import { usePlatform } from "../../../context/PlatformContext";
import {
  realWorkspaceBrandingService, workspaceLogoUrl, type RealWorkspaceBranding,
} from "../../../services/real/workspace-branding.service";
import { publishWorkspaceBranding } from "../../../hooks/useWorkspaceBrandingSync";
import { toLogoPng, LogoConversionError } from "../../../utils/brandingLogo";
import { BrandPreview, contrastRatio } from "./branding-preview";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const SLATE = "#64748B";
const DEFAULT_COLOR = "#0078D4";
const HEX = /^#[0-9A-Fa-f]{6}$/;

interface FormState {
  displayName: string;
  senderDisplayName: string;
  footerTagline: string;
  primaryColor: string;
}

/** What the logo will be after Save. */
type LogoChange =
  | { kind: "unchanged" }
  | { kind: "new"; base64: string; preview: string }
  | { kind: "remove" };

function formOf(b: RealWorkspaceBranding): FormState {
  return {
    displayName: b.displayName,
    senderDisplayName: b.senderDisplayName ?? "",
    footerTagline: b.footerTagline ?? "",
    primaryColor: b.primaryColor ?? DEFAULT_COLOR,
  };
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof LogoConversionError) return error.message;
  if (error instanceof Error && error.message && !/^\s*\d{3}\b/.test(error.message)) return error.message;
  return fallback;
}

export function RealBrandingPage({ workspaceId }: { workspaceId: string }) {
  const platform = usePlatform();
  const { confirm, confirmDialog } = useConfirm();
  const [branding, setBranding] = useState<RealWorkspaceBranding | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [logo, setLogo] = useState<LogoChange>({ kind: "unchanged" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setBranding(null);
    setForm(null);
    setLoadError(null);
    realWorkspaceBrandingService.get(workspaceId)
      .then(b => { if (!cancelled) { setBranding(b); setForm(formOf(b)); } })
      .catch(() => { if (!cancelled) setLoadError("Branding could not be loaded. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const applySaved = (saved: RealWorkspaceBranding) => {
    setBranding(saved);
    setForm(formOf(saved));
    setLogo({ kind: "unchanged" });
    if (fileRef.current) fileRef.current.value = "";
    publishWorkspaceBranding(workspaceId, saved, platform);
  };

  if (loadError !== null) {
    return (
      <SettingsPage title="Workspace Branding" breadcrumb="Branding">
        <div role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 14px" }}>
          {loadError}{" "}
          <button type="button" onClick={() => { window.location.reload(); }} style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#991B1B", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 0 }}>
            Reload
          </button>
        </div>
      </SettingsPage>
    );
  }
  if (branding === null || form === null) {
    return <SettingsPage title="Workspace Branding" breadcrumb="Branding"><Skeleton h={160} mb={16} /><Skeleton h={200} /></SettingsPage>;
  }

  const canEdit = branding.canEdit;
  const saved = formOf(branding);
  const textDirty = (Object.keys(saved) as (keyof FormState)[]).some(k => saved[k] !== form[k]);
  const dirty = textDirty || logo.kind !== "unchanged";
  const colorValid = HEX.test(form.primaryColor);
  const nameValid = form.displayName.trim().length > 0;

  const currentLogoUrl = logo.kind === "new" ? logo.preview
    : logo.kind === "remove" ? null
    : branding.logo === null ? null : workspaceLogoUrl(workspaceId, branding.logo.version);

  const update = (key: keyof FormState, value: string) => {
    setForm(prev => (prev === null ? prev : { ...prev, [key]: value }));
    setStatus(null);
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const png = await toLogoPng(file);
      setLogo({ kind: "new", base64: png.base64, preview: png.preview });
      setStatus(null);
    } catch (error) {
      setLogoError(messageOf(error, "This image could not be used. Choose a PNG or JPEG logo."));
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || !colorValid || !nameValid) return;
    setSaving(true);
    setStatus(null);
    try {
      let result = branding;
      if (textDirty) {
        result = await realWorkspaceBrandingService.update(workspaceId, {
          ...(form.displayName !== saved.displayName ? { displayName: form.displayName.trim() } : {}),
          ...(form.senderDisplayName !== saved.senderDisplayName ? { senderDisplayName: form.senderDisplayName.trim() || null } : {}),
          ...(form.footerTagline !== saved.footerTagline ? { footerTagline: form.footerTagline.trim() || null } : {}),
          ...(form.primaryColor !== saved.primaryColor ? { primaryColor: form.primaryColor.toUpperCase() } : {}),
        });
      }
      if (logo.kind === "new") result = await realWorkspaceBrandingService.uploadLogo(workspaceId, logo.base64);
      if (logo.kind === "remove") result = await realWorkspaceBrandingService.removeLogo(workspaceId);
      applySaved(result);
      setStatus({ tone: "ok", text: "Branding saved to this workspace." });
    } catch (error) {
      setStatus({ tone: "error", text: messageOf(error, "Branding could not be saved. Try again.") });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    confirm({
      title: "Reset branding to defaults?",
      body: "The sender name, footer tagline, brand colour and logo go back to the LAGDA defaults for everyone in this workspace. The workspace name is kept.",
      confirmLabel: "Reset branding",
      destructive: true,
      onConfirm: async () => {
        try {
          applySaved(await realWorkspaceBrandingService.reset(workspaceId));
          setStatus({ tone: "ok", text: "Branding reset to the defaults." });
        } catch (error) {
          setStatus({ tone: "error", text: messageOf(error, "Branding could not be reset. Try again.") });
        }
      },
    });
  };

  const colorContrast = colorValid ? contrastRatio(form.primaryColor) : null;
  const disabledStyle = canEdit ? {} : { background: "#F5F7FA", color: SLATE, cursor: "not-allowed" };

  return (
    <SettingsPage title="Workspace Branding" breadcrumb="Branding">
      {confirmDialog}

      <div style={{ background: "#F0F7FF", border: "1px solid #BAD7F5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 12, color: NAVY }}>
        Branding is saved to <strong>{branding.displayName}</strong> and shown on its badge across LAGDA for every member.
        {" "}Signing pages and emails sent to recipients do not use custom branding yet.
        {!canEdit && <><br /><strong>Only owners and administrators can change branding.</strong></>}
      </div>

      <form onSubmit={e => { void handleSave(e); }} noValidate>
        <SSection title="Workspace Identity">
          <SField label="Workspace display name" help="This is the workspace name. Changing it renames the workspace for everyone.">
            <input type="text" value={form.displayName} maxLength={200} disabled={!canEdit}
              onChange={e => { update("displayName", e.target.value); }} style={{ ...INPUT_STYLE, ...disabledStyle }}
              aria-invalid={!nameValid} />
            {!nameValid && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>The workspace needs a name.</div>}
          </SField>
          <SField label="Sender display name" help="The name to show as the sender. Leave blank to use each sender's own name.">
            <input type="text" value={form.senderDisplayName} maxLength={120} disabled={!canEdit}
              onChange={e => { update("senderDisplayName", e.target.value); }} style={{ ...INPUT_STYLE, ...disabledStyle }} />
          </SField>
          <SField label="Footer tagline" help="A short line about your organisation, up to 160 characters.">
            <input type="text" value={form.footerTagline} maxLength={160} disabled={!canEdit}
              onChange={e => { update("footerTagline", e.target.value); }} style={{ ...INPUT_STYLE, ...disabledStyle }} />
          </SField>
        </SSection>

        <SSection title="Workspace Logo">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ width: 96, height: 72, border: "1.5px dashed #D1D9E0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", overflow: "hidden", flexShrink: 0 }}>
              {currentLogoUrl
                ? <img src={currentLogoUrl} alt="Workspace logo" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
                : <span style={{ ...GF, fontSize: 11, color: SLATE }}>No logo</span>}
            </div>
            <div style={{ minWidth: 0, flex: "1 1 200px" }}>
              {canEdit && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label htmlFor="logo-upload" style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "7px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer", color: NAVY, background: "#FFFFFF" }}>
                    {currentLogoUrl ? "Replace logo" : "Select logo"}
                  </label>
                  <input id="logo-upload" type="file" ref={fileRef} accept="image/png,image/jpeg" onChange={e => { void handleLogoSelect(e); }} style={{ display: "none" }} />
                  {currentLogoUrl && (
                    <button type="button" onClick={() => { setLogo(branding.logo === null ? { kind: "unchanged" } : { kind: "remove" }); if (fileRef.current) fileRef.current.value = ""; setStatus(null); }}
                      style={{ ...GF, fontSize: 13, padding: "7px 14px", border: "1.5px solid #FECACA", borderRadius: 8, cursor: "pointer", color: "#991B1B", background: "#FEF2F2" }}>
                      Remove
                    </button>
                  )}
                </div>
              )}
              <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>
                PNG or JPEG, up to 5 MB. It is resized to fit 800 × 400 and saved when you press Save.
                {logo.kind === "new" && " New logo selected — not saved yet."}
                {logo.kind === "remove" && " The logo will be removed when you save."}
              </div>
              {logoError && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>{logoError}</div>}
            </div>
          </div>
        </SSection>

        <SSection title="Brand Color">
          <SField label="Primary color" help="Used for this workspace's badge and branded headers.">
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="color" value={colorValid ? form.primaryColor : DEFAULT_COLOR} disabled={!canEdit}
                onChange={e => { update("primaryColor", e.target.value.toUpperCase()); }}
                style={{ width: 44, height: 40, border: "1.5px solid #D1D9E0", borderRadius: 6, cursor: canEdit ? "pointer" : "not-allowed", padding: 2 }}
                aria-label="Brand color picker" />
              <input type="text" value={form.primaryColor} maxLength={7} disabled={!canEdit}
                onChange={e => {
                  // Empty and partial values are allowed while typing; Save waits for a full #RRGGBB.
                  const typed = e.target.value.trim();
                  if (/^#?[0-9A-Fa-f]{0,6}$/.test(typed)) {
                    update("primaryColor", typed === "" ? "" : `#${typed.replace(/^#/, "").toUpperCase()}`);
                  }
                }}
                style={{ ...INPUT_STYLE, width: 110, ...disabledStyle }} aria-label="Brand color hex value" aria-invalid={!colorValid} />
            </div>
            {!colorValid && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 6 }}>Enter a colour as # followed by six hex digits.</div>}
            {colorContrast && colorContrast.warning && (
              <div role="alert" style={{ ...GF, fontSize: 12, color: "#D97706", marginTop: 6 }}>
                Contrast ratio {colorContrast.onWhite.toFixed(1)}:1 against white — below the 3:1 minimum for large text. Consider a darker colour.
              </div>
            )}
          </SField>
        </SSection>

        <SSection title="Preview">
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 14px" }}>
            Updates as you type. Saved branding appears on the workspace badge straight away.
          </p>
          <BrandPreview branding={{
            displayName: form.displayName || branding.displayName,
            primaryColor: colorValid ? form.primaryColor : DEFAULT_COLOR,
            logoPreviewUrl: currentLogoUrl,
            senderDisplayName: form.senderDisplayName || "Your name",
            footerTagline: form.footerTagline,
          }} />
        </SSection>

        <div style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 12, color: SLATE }}>
          The official LAGDA attribution ("Powered by LAGDA") is required and cannot be removed.
        </div>

        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={!dirty || saving || !colorValid || !nameValid}
              style={{ ...BTN_PRIMARY, opacity: (!dirty || saving || !colorValid || !nameValid) ? 0.6 : 1, cursor: (!dirty || saving) ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save branding"}
            </button>
            {dirty && !saving && (
              <button type="button" onClick={() => { setForm(formOf(branding)); setLogo({ kind: "unchanged" }); setLogoError(null); if (fileRef.current) fileRef.current.value = ""; }} style={BTN_SECONDARY}>
                Discard
              </button>
            )}
            <button type="button" onClick={handleReset} style={{ ...GF, fontSize: 13, padding: "9px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>
              Reset to defaults
            </button>
          </div>
        )}
        {status && (
          <div role={status.tone === "error" ? "alert" : "status"} style={{ ...GF, fontSize: 12, marginTop: 10, color: status.tone === "error" ? "#DC2626" : "#1B5E20" }}>
            {status.text}
          </div>
        )}
      </form>
    </SettingsPage>
  );
}
