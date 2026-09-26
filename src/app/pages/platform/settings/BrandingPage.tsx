// /app/settings/branding — Workspace branding and recipient-facing presentation.
// Real backend (082): RealBrandingPage, saved to the current workspace.
// Demo build: the mock below — logo stays in memory, nothing is stored.

import React, { useEffect, useRef, useState } from "react";
import { SettingsPage, SSection, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY, Skeleton, StatusBadge, PreviewSaved } from "./SettingsShell";
import { mockBrandingSettingsService } from "../../../services/mock/settings.service";
import { useConfirm } from "../../../components/platform/ConfirmDialog";
import type { WorkspaceBranding } from "../../../models/settings";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { RealBrandingPage } from "./RealBrandingPage";
import { BrandPreview, contrastRatio } from "./branding-preview";
import { publishDemoBranding } from "../../../hooks/workspace-branding-store";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const SLATE = "#64748B";
const GOLD  = "#C9960C";

const SAFE_BRAND_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

function DemoBrandingPage() {
  const [branding, setBranding] = useState<WorkspaceBranding | null>(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<Partial<WorkspaceBranding>>({});
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const [logoErr, setLogoErr]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objRef  = useRef<string | null>(null);

  useEffect(() => {
    void mockBrandingSettingsService.getWorkspaceBranding().then(b => { setBranding(b); setForm({ ...b }); setLoading(false); });
    return () => { if (objRef.current) URL.revokeObjectURL(objRef.current); };
  }, []);

  const update = <K extends keyof WorkspaceBranding>(key: K, value: WorkspaceBranding[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!SAFE_BRAND_TYPES.includes(file.type)) { setLogoErr("Only PNG and JPEG files are accepted for this preview."); return; }
    if (file.size > MAX_LOGO_SIZE) { setLogoErr("File exceeds the 2 MB demonstration limit."); return; }
    if (objRef.current) URL.revokeObjectURL(objRef.current);
    const url = URL.createObjectURL(file);
    objRef.current = url;
    const updated = mockBrandingSettingsService.applyLocalLogoPreview(url);
    setBranding(updated);
    setForm(prev => ({ ...prev, logoPreviewUrl: url, logoStatus: "local-preview" }));
    setDirty(true);
    setSaved(false);
  };

  const handleRemoveLogo = () => {
    if (objRef.current) URL.revokeObjectURL(objRef.current);
    objRef.current = null;
    const updated = mockBrandingSettingsService.applyLocalLogoPreview(null);
    setBranding(updated);
    setForm(prev => ({ ...prev, logoPreviewUrl: null, logoStatus: "default" }));
    if (fileRef.current) fileRef.current.value = "";
    setDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = await mockBrandingSettingsService.updateWorkspaceBranding({
      displayName:       form.displayName,
      primaryColor:      form.primaryColor,
      senderDisplayName: form.senderDisplayName,
      footerTagline:     form.footerTagline,
    });
    setBranding(updated);
    publishDemoBranding(updated);
    setSaving(false);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    confirm({
      title: "Reset branding to defaults?",
      body: "Your workspace logo, colours and sender name go back to the LAGDA defaults. Anything you have typed but not saved is discarded. In this frontend demonstration no real branding is changed.",
      confirmLabel: "Reset branding",
      destructive: true,
      onConfirm: performReset,
    });
  };

  const performReset = async () => {
    const reset = await mockBrandingSettingsService.resetBrandingDemonstration();
    setBranding(reset);
    publishDemoBranding(reset);
    setForm({ ...reset });
    if (objRef.current) { URL.revokeObjectURL(objRef.current); objRef.current = null; }
    if (fileRef.current) fileRef.current.value = "";
    setDirty(false);
    setSaved(false);
  };

  if (loading) return <SettingsPage title="Workspace Branding" breadcrumb="Branding"><Skeleton h={160} mb={16} /><Skeleton h={200} /></SettingsPage>;

  const colorContrast = form.primaryColor ? contrastRatio(form.primaryColor) : null;
  const previewBranding = branding ? { ...branding, ...form, lagdaAttribution: true as const, demonstrationOnly: true as const } : null;

  return (
    <SettingsPage title="Workspace Branding" breadcrumb="Branding">
      {confirmDialog}

      <div style={{ marginBottom: 16 }}>
        <StatusBadge label="Business Plan Feature" color={GOLD} />
        <span style={{ ...GF, fontSize: 12, color: SLATE, marginLeft: 10 }}>Custom branding is available on Business and higher plans.</span>
      </div>

      <form onSubmit={handleSave} noValidate>
        <SSection title="Workspace Identity">
          <SField label="Workspace display name" help="Shown to recipients in signing requests and emails.">
            <input type="text" value={form.displayName ?? ""} onChange={e => update("displayName", e.target.value)} style={INPUT_STYLE} />
          </SField>
          <SField label="Sender display name" help="Appears as the sender in recipient-facing communications.">
            <input type="text" value={form.senderDisplayName ?? ""} onChange={e => update("senderDisplayName", e.target.value)} style={INPUT_STYLE} />
          </SField>
          <SField label="Footer tagline" help="Short description shown at the bottom of recipient screens.">
            <input type="text" value={form.footerTagline ?? ""} onChange={e => update("footerTagline", e.target.value)} style={INPUT_STYLE} />
          </SField>
        </SSection>

        <SSection title="Workspace Logo">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ width: 72, height: 72, border: "1.5px dashed #D1D9E0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", overflow: "hidden", flexShrink: 0 }}>
              {form.logoPreviewUrl
                ? <img src={form.logoPreviewUrl} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <span style={{ ...GF, fontSize: 11, color: SLATE }}>No logo</span>
              }
            </div>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label htmlFor="logo-upload" style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "7px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, cursor: "pointer", color: NAVY, background: "#FFFFFF" }}>
                  Select logo
                </label>
                <input id="logo-upload" type="file" ref={fileRef} accept="image/png,image/jpeg" onChange={handleLogoSelect} style={{ display: "none" }} />
                {form.logoPreviewUrl && (
                  <button type="button" onClick={handleRemoveLogo} style={{ ...GF, fontSize: 13, padding: "7px 14px", border: "1.5px solid #FECACA", borderRadius: 8, cursor: "pointer", color: "#991B1B", background: "#FEF2F2" }}>Remove</button>
                )}
              </div>
              <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 6 }}>PNG or JPEG, up to 2 MB. Used for frontend preview only — not uploaded or stored.</div>
              {logoErr && <div role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", marginTop: 4 }}>{logoErr}</div>}
            </div>
          </div>
        </SSection>

        <SSection title="Brand Color">
          <SField label="Primary color" help="Used in signing request headers and recipient-facing screens.">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={form.primaryColor ?? "#0078D4"} onChange={e => update("primaryColor", e.target.value)}
                style={{ width: 44, height: 40, border: "1.5px solid #D1D9E0", borderRadius: 6, cursor: "pointer", padding: 2 }}
                aria-label="Brand color picker" />
              <input type="text" value={form.primaryColor ?? "#0078D4"} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) update("primaryColor", e.target.value); }}
                maxLength={7} style={{ ...INPUT_STYLE, width: 110 }} aria-label="Brand color hex value" />
            </div>
            {colorContrast && colorContrast.warning && (
              <div role="alert" style={{ ...GF, fontSize: 12, color: "#D97706", marginTop: 6 }}>
                ⚠ Contrast ratio {colorContrast.onWhite.toFixed(1)}:1 against white — below the 3:1 minimum for large text. Consider a darker color.
              </div>
            )}
          </SField>
        </SSection>

        <SSection title="Recipient Request Preview">
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 14px", fontStyle: "italic" }}>
            Preview only — changes are not applied to any live signing request.
          </p>
          {previewBranding && <BrandPreview branding={previewBranding} />}
        </SSection>

        <div style={{ background: "#F8FAFC", border: "1px solid #E3E8EF", borderRadius: 8, padding: "10px 14px", marginBottom: 16, ...GF, fontSize: 12, color: SLATE }}>
          The official LAGDA attribution ("Powered by LAGDA") is required and cannot be removed.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="submit" disabled={!dirty || saving} style={{ ...BTN_PRIMARY, opacity: (!dirty || saving) ? 0.6 : 1, cursor: (!dirty || saving) ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save branding"}
          </button>
          {dirty && !saving && <button type="button" onClick={() => { setForm({ ...branding }); setDirty(false); }} style={BTN_SECONDARY}>Discard</button>}
          <button type="button" onClick={handleReset} style={{ ...GF, fontSize: 13, padding: "9px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", color: SLATE, cursor: "pointer" }}>Reset to defaults</button>
          {saved && <PreviewSaved />}
        </div>
      </form>
    </SettingsPage>
  );
}

/** The real page for a real workspace; the demonstration otherwise. */
export function BrandingPage() {
  const { isReal, workspaceId } = useWorkspaceMode();
  if (isReal && workspaceId !== null) return <RealBrandingPage key={workspaceId} workspaceId={workspaceId} />;
  return <DemoBrandingPage />;
}
