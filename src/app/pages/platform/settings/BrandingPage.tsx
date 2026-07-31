// /app/settings/branding — Workspace branding and recipient-facing presentation.
// Frontend-only. Logo stays in memory, not uploaded. No Burgundy. No eNotary.

import React, { useEffect, useRef, useState } from "react";
import { SettingsPage, SSection, SField, INPUT_STYLE, BTN_PRIMARY, BTN_SECONDARY, Skeleton, DEMO_NOTICE, StatusBadge } from "./SettingsShell";
import { mockBrandingSettingsService } from "../../../services/mock/settings.service";
import type { WorkspaceBranding } from "../../../models/settings";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const GOLD  = "#C9960C";

const SAFE_BRAND_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const digits = /^#([A-Fa-f0-9]{6})$/.exec(hex)?.[1];
  if (!digits) return null;
  return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(hex: string): { ratio: number; onWhite: number; warning: boolean } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { ratio: 0, onWhite: 0, warning: false };
  const L = relativeLuminance(rgb);
  const onWhite = (1 + 0.05) / (L + 0.05);
  const warning = onWhite < 3;
  return { ratio: onWhite, onWhite, warning };
}

function BrandPreview({ branding }: { branding: WorkspaceBranding }) {
  const initials = branding.displayName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ border: "1.5px solid #E3E8EF", borderRadius: 10, overflow: "hidden", maxWidth: 420 }}>
      {/* Header */}
      <div style={{ background: branding.primaryColor, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {branding.logoPreviewUrl
          ? <img src={branding.logoPreviewUrl} alt="Workspace logo preview" style={{ height: 32, objectFit: "contain" }} />
          : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{initials}</div>
        }
        <div>
          <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>{branding.displayName}</div>
          <div style={{ ...GF, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Signing request</div>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: "18px 20px", background: "#FFFFFF" }}>
        <div style={{ ...GF, fontSize: 13, color: NAVY, marginBottom: 8 }}>Sender: <strong>{branding.senderDisplayName}</strong></div>
        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, width: "70%", marginBottom: 8 }} />
        <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, width: "50%" }} />
      </div>
      {/* Footer */}
      <div style={{ background: "#F8FAFC", borderTop: "1px solid #E3E8EF", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...GF, fontSize: 11, color: SLATE }}>{branding.footerTagline}</span>
        <span style={{ ...GF, fontSize: 11, color: SLATE }}>Powered by LAGDA</span>
      </div>
    </div>
  );
}

export function BrandingPage() {
  const [branding, setBranding] = useState<WorkspaceBranding | null>(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<Partial<WorkspaceBranding>>({});
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [logoErr, setLogoErr]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objRef  = useRef<string | null>(null);

  useEffect(() => {
    mockBrandingSettingsService.getWorkspaceBranding().then(b => { setBranding(b); setForm({ ...b }); setLoading(false); });
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
    setSaving(false);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = async () => {
    if (!confirm("Reset branding to defaults? This is a demonstration only.")) return;
    const reset = await mockBrandingSettingsService.resetBrandingDemonstration();
    setBranding(reset);
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
      {DEMO_NOTICE}

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
          {saved && <span role="status" style={{ ...GF, fontSize: 13, color: "#16A34A" }}>Branding updated in this frontend demonstration.</span>}
        </div>
      </form>
    </SettingsPage>
  );
}
