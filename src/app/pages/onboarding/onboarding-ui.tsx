// Small form building blocks shared by the four onboarding steps.
//
// Inline styles, like the rest of onboarding. Inputs are 16px so iOS Safari
// does not zoom the page on focus, and every control is at least 44px tall.

import type { CSSProperties, ReactNode } from "react";
import { GF, AZURE, NAVY } from "./onboarding-form";

const LABEL_STYLE: CSSProperties = {
  display: "block",
  color: "#334155",
  ...GF,
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" style={{ color: "#B42318", ...GF, fontSize: 13, margin: "6px 0 0", lineHeight: 1.45 }}>
      {children}
    </p>
  );
}

export function Field({
  id, label, required = false, optional = false, hint, error, children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} style={LABEL_STYLE}>
        {label}
        {required && <span aria-hidden style={{ color: AZURE }}> *</span>}
        {optional && <span style={{ color: "#64748B", fontWeight: 400 }}> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} style={{ color: "#64748B", ...GF, fontSize: 12, margin: "6px 0 0", lineHeight: 1.45 }}>
          {hint}
        </p>
      )}
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

/**
 * A native radio inside a card-sized label. Native, so arrow keys, screen
 * readers and form semantics all work without re-implementing them.
 */
export function RadioCard({
  name, value, checked, onChange, title, description, compact = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex", gap: 12, alignItems: description ? "flex-start" : "center",
        minHeight: 44, boxSizing: "border-box",
        padding: compact ? "10px 14px" : "14px 16px",
        borderRadius: 10, cursor: "pointer",
        background: checked ? "#EAF6FF" : "#FFFFFF",
        border: `1px solid ${checked ? "#76BDF2" : "#E2E8F0"}`,
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        style={{ width: 18, height: 18, margin: description ? "2px 0 0" : 0, accentColor: AZURE, flexShrink: 0 }}
      />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", color: NAVY, ...GF, fontSize: 15, fontWeight: 700 }}>{title}</span>
        {description && (
          <span style={{ display: "block", color: "#475569", ...GF, fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

type NoticeTone = "success" | "error" | "info" | "warn";

const NOTICE_TONES: Record<NoticeTone, { bg: string; border: string; color: string }> = {
  success: { bg: "#EAF7EF", border: "#A8D5B5", color: "#1E6B41" },
  error:   { bg: "#FEF2F2", border: "#F5C2C0", color: "#B42318" },
  info:    { bg: "#F0F7FF", border: "#BAE0FA", color: "#1F4E79" },
  warn:    { bg: "#FFF8E6", border: "#F0D07A", color: "#7A5A00" },
};

export function Notice({
  tone, children, live = false,
}: { tone: NoticeTone; children: ReactNode; live?: boolean }) {
  const t = NOTICE_TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : live ? "status" : undefined}
      style={{
        ...GF, fontSize: 14, lineHeight: 1.5,
        padding: "12px 14px", borderRadius: 10,
        background: t.bg, border: `1px solid ${t.border}`, color: t.color,
      }}
    >
      {children}
    </div>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>{children}</div>;
}
