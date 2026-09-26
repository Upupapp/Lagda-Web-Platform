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

export interface BrandPreviewProps {
  branding: BrandPreviewInput;
  /**
   * "preview" (default) is the Settings mock-up of a signing request;
   * "card" is the full-width Manage → Overview card with a larger logo.
   */
  variant?: "preview" | "card";
  /** The line under the name in the header band. */
  subtitle?: string;
  /** Replaces the mock signing-request body. */
  children?: React.ReactNode;
  /** Shown at the right of the header band (e.g. an "Edit branding" link). */
  headerAside?: React.ReactNode;
  /** Wraps the footer on narrow screens instead of keeping it on one line. */
  compact?: boolean;
  testId?: string;
}

export function BrandPreview({
  branding, variant = "preview", subtitle = "Signing request", children, headerAside, compact = false, testId,
}: BrandPreviewProps) {
  const initials = branding.displayName.split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w)).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const card = variant === "card";
  const logoHeight = card ? (compact ? 36 : 48) : 32;
  return (
    <div data-testid={testId} data-variant={variant}
      style={{ border: "1.5px solid #E3E8EF", borderRadius: card ? 12 : 10, overflow: "hidden", maxWidth: card ? "none" : 420, width: "100%", boxSizing: "border-box", background: "#FFFFFF" }}>
      {/* Header */}
      <div style={{ background: branding.primaryColor, padding: card ? (compact ? "14px 16px" : "18px 24px") : "14px 20px", display: "flex", alignItems: "center", gap: card ? 14 : 12, minWidth: 0 }}>
        {branding.logoPreviewUrl
          ? <img src={branding.logoPreviewUrl} alt={card ? `${branding.displayName} logo` : "Workspace logo preview"} style={{ height: logoHeight, maxWidth: card ? 180 : 140, objectFit: "contain", background: "#FFFFFF", borderRadius: 4, padding: 2, flexShrink: 0 }} />
          : <div aria-hidden={card || undefined} style={{ width: logoHeight + 4, height: logoHeight + 4, borderRadius: card ? 8 : 6, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", ...GF, fontSize: card ? 17 : 15, fontWeight: 800, color: "#FFFFFF", flexShrink: 0 }}>{initials}</div>
        }
        <div style={{ minWidth: 0, flex: 1 }}>
          <div data-testid={testId ? `${testId}-name` : undefined} style={{ ...GF, fontSize: card ? (compact ? 16 : 18) : 14, fontWeight: 700, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branding.displayName}</div>
          <div style={{ ...GF, fontSize: card ? 12 : 11, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>
        </div>
        {headerAside}
      </div>
      {/* Body */}
      {children !== undefined ? (
        <div style={{ padding: card ? (compact ? "14px 16px" : "18px 24px") : "18px 20px", background: "#FFFFFF" }}>{children}</div>
      ) : (
        <div style={{ padding: "18px 20px", background: "#FFFFFF" }}>
          <div style={{ ...GF, fontSize: 13, color: NAVY, marginBottom: 8 }}>Sender: <strong>{branding.senderDisplayName}</strong></div>
          <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, width: "70%", marginBottom: 8 }} />
          <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, width: "50%" }} />
        </div>
      )}
      {/* Footer */}
      <div style={{ background: "#F8FAFC", borderTop: "1px solid #E3E8EF", padding: card ? (compact ? "8px 16px" : "10px 24px") : "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span style={{ ...GF, fontSize: 11, color: SLATE, minWidth: 0, flex: compact ? "1 1 100%" : undefined, overflowWrap: "anywhere" }}>{branding.footerTagline}</span>
        <span style={{ ...GF, fontSize: 11, color: SLATE, marginLeft: "auto" }}>Powered by LAGDA</span>
      </div>
    </div>
  );
}
