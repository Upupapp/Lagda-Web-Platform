// Small shared pieces for the document-sharing surfaces: status chips, the
// notice box, a labelled text field and a compact action button. Colours are
// chosen for WCAG AA contrast on their own backgrounds.

import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { modalButtonStyle } from "../contact-requests/ModalFrame";

export const GF = { fontFamily: "'Geist', sans-serif" } as const;
export const NAVY = "#07111F";
export const SLATE = "#475569";
export const BORDER = "#E2E8F0";
export const RED = "#B91C1C";

export type ChipTone = "success" | "warning" | "neutral" | "danger" | "info";

const CHIP: Record<ChipTone, { bg: string; fg: string; border: string }> = {
  success: { bg: "#DCFCE7", fg: "#166534", border: "#BBF7D0" },
  warning: { bg: "#FEF3C7", fg: "#92400E", border: "#FDE68A" },
  neutral: { bg: "#F1F5F9", fg: "#334155", border: "#E2E8F0" },
  danger: { bg: "#FEE2E2", fg: "#991B1B", border: "#FECACA" },
  info: { bg: "#E0F2FE", fg: "#075985", border: "#BAE6FD" },
};

export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  const c = CHIP[tone];
  return (
    <span style={{
      ...GF, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
      background: c.bg, color: c.fg, border: `1px solid ${c.border}`, whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>{children}</span>
  );
}

export function SharingNotice({ tone, children }: { tone: "error" | "info" | "success"; children: ReactNode }) {
  const palette = {
    error: { bg: "#FEF2F2", border: "#FECACA", color: "#991B1B" },
    info: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
    success: { bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
  }[tone];
  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 8, padding: "10px 12px",
      color: palette.color, ...GF, fontSize: 13, lineHeight: 1.55, overflowWrap: "anywhere",
    }}>{children}</div>
  );
}

export function TextField({ label, value, onChange, type = "text", required = false, error, hint, autoComplete, autoFocus, maxLength, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void;
  type?: "text" | "email"; required?: boolean; error?: string | null; hint?: string;
  autoComplete?: string; autoFocus?: boolean; maxLength?: number; multiline?: boolean;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const style: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", minHeight: 42, padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${error ? "#DC2626" : "#94A3B8"}`, color: NAVY, background: "#FFFFFF", ...GF, fontSize: 14,
    resize: multiline ? "vertical" : undefined,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <label htmlFor={id} style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#334155" }}>
        {label}{required ? <span aria-hidden style={{ color: RED }}> *</span> : <span style={{ color: SLATE, fontWeight: 400 }}> (optional)</span>}
      </label>
      {multiline ? (
        <textarea id={id} value={value} rows={3} maxLength={maxLength} data-autofocus={autoFocus ? "" : undefined}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy} aria-required={required || undefined}
          onChange={e => onChange(e.target.value)} style={style} />
      ) : (
        <input id={id} type={type} value={value} autoComplete={autoComplete} maxLength={maxLength}
          inputMode={type === "email" ? "email" : undefined} data-autofocus={autoFocus ? "" : undefined}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy} aria-required={required || undefined}
          onChange={e => onChange(e.target.value)} style={style} />
      )}
      {hint && <p id={`${id}-hint`} style={{ ...GF, fontSize: 12, color: SLATE, margin: 0 }}>{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" style={{ ...GF, fontSize: 12, color: RED, margin: 0 }}>{error}</p>}
    </div>
  );
}

export function SmallButton({ icon: Icon, label, onClick, variant = "secondary", disabled = false, ariaLabel, type = "button" }: {
  icon?: LucideIcon; label: string; onClick?: () => void;
  variant?: "primary" | "secondary" | "danger"; disabled?: boolean; ariaLabel?: string; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className="sharing-btn"
      style={{ ...modalButtonStyle(variant, disabled), minHeight: 36, fontSize: 13, padding: "0 12px", whiteSpace: "nowrap" }}>
      {Icon && <Icon size={14} aria-hidden />} {label}
    </button>
  );
}

/** Visually hidden, still announced. */
export const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
};
