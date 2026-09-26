// Shared pieces for the Members page's join-link surfaces (078): the dialog
// shell (a centred modal on wide screens, a bottom sheet on phones), buttons,
// the privileges multi-select, and the role title + privileges editor used
// both when approving a request and later from the member list.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Z } from "../../../../utils/z-index";
import { useViewport } from "../../../../hooks/useViewport";
import { JOIN_ROLE_TITLE_MAX, NEW_COMER_LABEL } from "../../../../services/real/workspace-join.service";
import {
  GF, GM, NAVY, AZURE, SLATE, BORDER, DANGER, PRIVILEGE_OPTIONS, inputStyle, labelStyle, hintStyle,
  type Privileges,
} from "./join-styles";

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ ...GF, fontSize: 13, color: DANGER, background: "#FEF3F2", border: "1px solid #FECDCA", borderRadius: 8, padding: "8px 12px", margin: "0 0 12px" }}>
      {children}
    </p>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────────

export function Dialog({ title, onClose, children, footer, describedBy }: {
  title: string; onClose: () => void; children: ReactNode; footer: ReactNode; describedBy?: string;
}) {
  const { isNarrow } = useViewport();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>("input, textarea, button, [tabindex]");
    first?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
    // Focus once on open; onClose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", zIndex: Z.modal,
        display: "flex", justifyContent: "center", alignItems: isNarrow ? "flex-end" : "center",
      }}
    >
      <div
        ref={panelRef}
        role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={describedBy}
        style={{
          background: "#FFFFFF", width: isNarrow ? "100%" : "min(480px, calc(100vw - 32px))",
          maxHeight: isNarrow ? "90dvh" : "calc(100dvh - 48px)", overflowY: "auto", boxSizing: "border-box",
          borderRadius: isNarrow ? "16px 16px 0 0" : 14, padding: isNarrow ? "20px 16px 16px" : "24px 28px",
          boxShadow: "0 20px 60px rgba(7,17,31,0.22)",
        }}
      >
        <h2 id={titleId} style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 12px" }}>{title}</h2>
        {children}
        <div style={{
          display: "flex", gap: 10, marginTop: 20,
          flexDirection: isNarrow ? "column-reverse" : "row", justifyContent: "flex-end",
        }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// ── Privileges multi-select ──────────────────────────────────────────────────

export function PrivilegeChips({ privileges, inherent = false }: { privileges: Privileges; inherent?: boolean }) {
  const on = PRIVILEGE_OPTIONS.filter(o => privileges[o.key]);
  if (on.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {on.map(o => (
        <span key={o.key} title={inherent ? "Included with this role" : undefined}
          style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#EBF4FC", color: AZURE, whiteSpace: "nowrap" }}>
          {o.chip}
        </span>
      ))}
    </div>
  );
}

export function PrivilegesDropdown({ id, value, onChange, disabled = false }: {
  id: string; value: Privileges; onChange: (next: Privileges) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = PRIVILEGE_OPTIONS.filter(o => value[o.key]);
  const summary = selected.length === 0 ? "No privileges"
    : selected.length === PRIVILEGE_OPTIONS.length ? "Both privileges"
    : selected[0]!.label;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    };
    // "click", not "mousedown": collapsing the panel on mousedown moved the
    // dialog's buttons before the mouseup, so a click on them was lost.
    document.addEventListener("click", onDown);
    wrapRef.current?.addEventListener("keydown", onKey);
    const node = wrapRef.current;
    return () => {
      document.removeEventListener("click", onDown);
      node?.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        id={id} type="button" disabled={disabled}
        aria-haspopup="true" aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle(), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        <span aria-hidden style={{ color: SLATE, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div id={`${id}-panel`} role="group" aria-label="Privileges"
          // In flow, not floating: inside a dialog (or a phone's bottom
          // sheet) a floating panel covered the dialog's own buttons.
          style={{
            marginTop: 4,
            background: "#FFFFFF", border: `1.5px solid ${BORDER}`, borderRadius: 10,
            boxShadow: "0 10px 30px rgba(7,17,31,0.12)", padding: 6,
          }}>
          {PRIVILEGE_OPTIONS.map(o => (
            <label key={o.key} style={{ ...GF, fontSize: 14, color: NAVY, display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8, cursor: "pointer", minHeight: 24 }}>
              <input type="checkbox" checked={value[o.key]}
                onChange={(e) => onChange({ ...value, [o.key]: e.target.checked })}
                style={{ width: 16, height: 16, flexShrink: 0 }} />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role title + privileges editor ───────────────────────────────────────────

export interface AccessDraft extends Privileges {
  roleTitle: string;
}

export function AccessEditor({ value, onChange, privilegesInherent = false }: {
  value: AccessDraft; onChange: (next: AccessDraft) => void; privilegesInherent?: boolean;
}) {
  const titleId = useId();
  const privId = useId();
  const tooLong = value.roleTitle.length > JOIN_ROLE_TITLE_MAX;
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor={titleId} style={labelStyle}>
          Role title <span style={{ fontWeight: 400, color: SLATE }}>(optional)</span>
        </label>
        <input
          id={titleId} type="text" value={value.roleTitle} maxLength={JOIN_ROLE_TITLE_MAX}
          placeholder={NEW_COMER_LABEL}
          onChange={(e) => onChange({ ...value, roleTitle: e.target.value })}
          aria-describedby={`${titleId}-hint`} aria-invalid={tooLong}
          style={inputStyle(tooLong)}
        />
        <p id={`${titleId}-hint`} style={hintStyle}>
          For example, "Finance Associate". Without a title, they appear as "{NEW_COMER_LABEL}".
          <span style={{ float: "right", ...GM, fontSize: 11 }}>{value.roleTitle.length}/{JOIN_ROLE_TITLE_MAX}</span>
        </p>
      </div>
      <div>
        <label htmlFor={privId} style={labelStyle}>Privileges</label>
        <PrivilegesDropdown
          id={privId}
          value={privilegesInherent ? { canRequestDocuments: true, canAssignSigners: true } : value}
          disabled={privilegesInherent}
          onChange={(p) => onChange({ ...value, ...p })}
        />
        <p style={hintStyle}>
          {privilegesInherent
            ? "Owners and administrators always have both privileges."
            : "Only owners and administrators can grant these. You can change them at any time."}
        </p>
      </div>
    </>
  );
}
