// Style tokens and small helpers for the Members page's join-link surfaces
// (078). Kept out of join-ui.tsx so Fast Refresh keeps working on it.

import type { CSSProperties } from "react";

export const GF = { fontFamily: "'Geist', sans-serif" };
export const GM = { fontFamily: "'Geist Mono', monospace" };
export const NAVY = "#07111F";
export const AZURE = "#0078D4";
export const SLATE = "#64748B";
export const SILVER = "#8A9BAE";
export const BORDER = "#E3E8EF";
export const DANGER = "#B42318";

export const inputStyle = (invalid = false): CSSProperties => ({
  ...GF, fontSize: 14, width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: `1.5px solid ${invalid ? DANGER : "#D1D9E0"}`, borderRadius: 8, outline: "none",
  background: "#FFFFFF", color: NAVY, minHeight: 40,
});

export const labelStyle: CSSProperties = {
  ...GF, fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 6,
};

export const hintStyle: CSSProperties = { ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0", lineHeight: 1.5 };

type Tone = "primary" | "secondary" | "danger" | "link";

export function buttonStyle(tone: Tone, disabled = false): CSSProperties {
  const base: CSSProperties = {
    ...GF, fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "8px 14px", minHeight: 36,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap",
  };
  switch (tone) {
    case "primary": return { ...base, background: AZURE, color: "#FFFFFF", border: "none" };
    case "danger": return { ...base, background: DANGER, color: "#FFFFFF", border: "none" };
    case "link": return { ...base, background: "none", color: AZURE, border: "none", padding: "8px 6px" };
    default: return { ...base, background: "#FFFFFF", color: NAVY, border: "1.5px solid #D1D9E0" };
  }
}

export function formatWhen(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export interface Privileges {
  canRequestDocuments: boolean;
  canAssignSigners: boolean;
}

export const PRIVILEGE_OPTIONS: { key: keyof Privileges; label: string; chip: string }[] = [
  { key: "canRequestDocuments", label: "Request documents from others", chip: "Requests documents" },
  { key: "canAssignSigners", label: "Assign someone for document signing", chip: "Assigns signers" },
];
