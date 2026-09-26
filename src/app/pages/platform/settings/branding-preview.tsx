// The branding preview and colour-contrast check, shared by the demo page and
// the real one (082).

import React from "react";

const GF    = { fontFamily: "'Geist', sans-serif" };
const NAVY  = "#07111F";
const SLATE = "#64748B";

export interface BrandPreviewInput {
  displayName: string;
  primaryColor: string;
  logoPreviewUrl: string | null;
  senderDisplayName: string;
  footerTagline: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const digits = /^#([A-Fa-f0-9]{6})$/.exec(hex)?.[1];
  if (!digits) return null;
  return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16), b: parseInt(digits.slice(4, 6), 16) };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(hex: string): { ratio: number; onWhite: number; warning: boolean } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { ratio: 0, onWhite: 0, warning: false };
  const L = relativeLuminance(rgb);
  const onWhite = (1 + 0.05) / (L + 0.05);
  const warning = onWhite < 3;
  return { ratio: onWhite, onWhite, warning };
}

export function BrandPreview({ branding }: { branding: BrandPreviewInput }) {
  const initials = branding.displayName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ border: "1.5px solid #E3E8EF", borderRadius: 10, overflow: "hidden", maxWidth: 420, width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ background: branding.primaryColor, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        {branding.logoPreviewUrl
          ? <img src={branding.logoPreviewUrl} alt="Workspace logo preview" style={{ height: 32, maxWidth: 140, objectFit: "contain", background: "#FFFFFF", borderRadius: 4, padding: 2 }} />
          : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{initials}</div>
        }
        <div style={{ minWidth: 0 }}>
          <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branding.displayName}</div>
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
      <div style={{ background: "#F8FAFC", borderTop: "1px solid #E3E8EF", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...GF, fontSize: 11, color: SLATE, minWidth: 0, overflowWrap: "anywhere" }}>{branding.footerTagline}</span>
        <span style={{ ...GF, fontSize: 11, color: SLATE }}>Powered by LAGDA</span>
      </div>
    </div>
  );
}

