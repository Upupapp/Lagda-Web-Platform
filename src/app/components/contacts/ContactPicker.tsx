// ContactPicker — reusable dialog for selecting a contact in Prepare + Template workflows.
// Returns a ContactPickerResult. Does NOT write to Contact state.
// Frontend-only. No real data. No identity verification claims.
// Burgundy (#67023B) never used.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import type { ContactPickerResult, ContactSelectionContext, ContactListItem } from "../../models/contacts";
import { SYSTEM_CONTACT_TAGS, getContactTagById } from "../../models/contacts";
import type { PrepParticipantRole } from "../../models/prepare";
import { PREP_PARTICIPANT_ROLE_LABELS } from "../../models/prepare";
import { mockContactService } from "../../services/mock/contacts.service";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const LIGHT = "#F0F7FF";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  open:             boolean;
  onClose:          () => void;
  onSelect:         (result: ContactPickerResult) => void;
  context:          ContactSelectionContext;
  roleLabel?:       string;            // shown in header (e.g. "Signer")
  suggestedRole?:   PrepParticipantRole;
  excludeEmails?:   string[];          // emails already assigned
}

interface ManualForm {
  name: string;
  email: string;
  org: string;
  saveAsContact: boolean;
}

export function ContactPicker({ open, onClose, onSelect, context, roleLabel, suggestedRole, excludeEmails = [] }: Props) {
  const [tab,        setTab]        = useState<"search" | "recent" | "frequent" | "manual">("search");
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<ContactListItem[]>([]);
  const [recent,     setRecent]     = useState<ContactListItem[]>([]);
  const [frequent,   setFrequent]   = useState<ContactListItem[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [form,       setForm]       = useState<ManualForm>({ name: "", email: "", org: "", saveAsContact: false });
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const searchRef  = useRef<HTMLInputElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);
  const navigate   = useNavigate();

  // Load recent + frequent on open
  useEffect(() => {
    if (!open) return;
    setTimeout(() => searchRef.current?.focus(), 50);
    mockContactService.getRecentContacts(5).then(setRecent).catch(() => {});
    mockContactService.getFrequentContacts(5).then(setFrequent).catch(() => {});
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await mockContactService.searchForPicker(query, 8);
        setResults(r.filter(c => !excludeEmails.map(e => e.toLowerCase()).includes(c.email.toLowerCase())));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, open, excludeEmails]);

  // Trap focus inside dialog
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const el = dialogRef.current;
        if (!el) return;
        const focusables = el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last)  { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  const pickContact = useCallback((c: ContactListItem) => {
    onSelect({
      contactId:        c.id,
      name:             c.name,
      email:            c.email,
      phone:            c.phone,
      organization:     c.organization,
      title:            c.title,
      scope:            c.scope,
      source:           "selected-contact",
      createdNewContact: false,
      usedWithoutSaving: false,
      suggestedRole,
    });
    onClose();
  }, [onSelect, onClose, suggestedRole]);

  const submitManual = useCallback(() => {
    const errs: { name?: string; email?: string } = {};
    if (!form.name.trim())                   errs.name = "Name is required.";
    if (!form.email.trim())                  errs.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "Enter a valid email.";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    onSelect({
      name:             form.name.trim(),
      email:            form.email.trim().toLowerCase(),
      organization:     form.org.trim() || undefined,
      source:           form.saveAsContact ? "new-contact" : "manual-entry",
      createdNewContact: form.saveAsContact,
      usedWithoutSaving: !form.saveAsContact,
      suggestedRole,
    });
    onClose();
  }, [form, onSelect, onClose, suggestedRole]);

  if (!open) return null;

  const filteredRecent   = recent.filter(c => !excludeEmails.map(e => e.toLowerCase()).includes(c.email.toLowerCase()));
  const filteredFrequent = frequent.filter(c => !excludeEmails.map(e => e.toLowerCase()).includes(c.email.toLowerCase()));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={roleLabel ? `Select contact for role: ${roleLabel}` : "Select contact"}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(7,17,31,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, padding: "16px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%", maxWidth: 540,
          maxHeight: "min(90vh, 640px)",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #E3E8EF" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ ...GF, color: NAVY, fontSize: 16, fontWeight: 700, margin: 0 }}>
                {roleLabel ? `Select contact — ${roleLabel}` : "Select contact"}
              </h2>
              {suggestedRole && (
                <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "2px 0 0" }}>
                  Role: {PREP_PARTICIPANT_ROLE_LABELS[suggestedRole]}
                </p>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: SLATE, fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {([["search","Search"],["recent","Recent"],["frequent","Frequent"],["manual","Enter manually"]] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                style={{
                  ...GF, fontSize: 12, fontWeight: tab === t ? 700 : 500,
                  padding: "5px 10px", borderRadius: 8,
                  border: tab === t ? `2px solid ${AZURE}` : "2px solid transparent",
                  background: tab === t ? LIGHT : "transparent",
                  color: tab === t ? AZURE : SLATE, cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {/* Search tab */}
          {tab === "search" && (
            <div>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #F0F2F5" }}>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, or organization…"
                  aria-label="Search contacts"
                  style={{
                    ...GF, width: "100%", fontSize: 14, color: NAVY,
                    border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "8px 12px",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              {searching && <div style={{ ...GF, padding: "16px", color: SLATE, fontSize: 13 }}>Searching…</div>}
              {!searching && query.trim() && results.length === 0 && (
                <div style={{ ...GF, padding: "16px", color: SLATE, fontSize: 13 }}>No contacts found for "{query}".</div>
              )}
              {!searching && results.length > 0 && (
                <ContactResultList items={results} onSelect={pickContact} />
              )}
              {!query.trim() && !searching && (
                <div style={{ ...GF, padding: "16px", color: SLATE, fontSize: 13 }}>Type to search your contacts.</div>
              )}
            </div>
          )}

          {/* Recent tab */}
          {tab === "recent" && (
            <div>
              {filteredRecent.length === 0
                ? <div style={{ ...GF, padding: "16px", color: SLATE, fontSize: 13 }}>No recently used contacts. Contacts used in document workflows appear here.</div>
                : <ContactResultList items={filteredRecent} onSelect={pickContact} badge="Recent" />
              }
            </div>
          )}

          {/* Frequent tab */}
          {tab === "frequent" && (
            <div>
              {filteredFrequent.length === 0
                ? <div style={{ ...GF, padding: "16px", color: SLATE, fontSize: 13 }}>No frequently used contacts based on demonstration data.</div>
                : <ContactResultList items={filteredFrequent} onSelect={pickContact} badge="Frequent" badgeColor={GOLD} />
              }
            </div>
          )}

          {/* Manual entry tab */}
          {tab === "manual" && (
            <div style={{ padding: "16px" }}>
              <p style={{ ...GF, fontSize: 12, color: SLATE, marginBottom: 12 }}>
                Enter participant details directly. You can optionally save them as a contact for future use.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                <Field label="Full name *" error={formErrors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(e => ({ ...e, name: undefined })); }}
                    autoComplete="name"
                    style={inputStyle(!!formErrors.name)}
                    aria-required="true"
                  />
                </Field>
                <Field label="Email address *" error={formErrors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(e => ({ ...e, email: undefined })); }}
                    autoComplete="email"
                    style={inputStyle(!!formErrors.email)}
                    aria-required="true"
                  />
                </Field>
                <Field label="Organization">
                  <input
                    type="text"
                    value={form.org}
                    onChange={e => setForm(f => ({ ...f, org: e.target.value }))}
                    autoComplete="organization"
                    style={inputStyle(false)}
                  />
                </Field>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", ...GF, fontSize: 13, color: NAVY }}>
                  <input
                    type="checkbox"
                    checked={form.saveAsContact}
                    onChange={e => setForm(f => ({ ...f, saveAsContact: e.target.checked }))}
                    style={{ accentColor: AZURE, width: 16, height: 16 }}
                  />
                  Save as a contact for future use
                  <span style={{ ...GF, fontSize: 11, color: SLATE }}>(optional)</span>
                </label>
                <p style={{ ...GF, fontSize: 11, color: SLATE, marginTop: 2 }}>
                  Contact data is used for signing workflow purposes only. Changes are retained in this frontend session only.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #E3E8EF", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => navigate("/app/contacts")}
            style={{ ...GF, fontSize: 12, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: "6px 2px" }}
          >
            Manage contacts →
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnSecondary}>Cancel</button>
            {tab === "manual" && (
              <button onClick={submitManual} style={btnPrimary}>
                {form.saveAsContact ? "Add as Contact & Use" : "Use without Saving"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContactResultList({ items, onSelect, badge, badgeColor }: {
  items: ContactListItem[];
  onSelect: (c: ContactListItem) => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <ul role="listbox" aria-label="Contact results" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map(c => {
        const tags = c.tagIds.slice(0, 2).map(tid => getContactTagById(tid)).filter(Boolean);
        return (
          <li key={c.id} role="option" aria-selected="false">
            <button
              onClick={() => onSelect(c)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "10px 16px",
                border: "none", borderBottom: "1px solid #F0F2F5",
                background: "#FFFFFF", textAlign: "left", cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
              onMouseLeave={e => (e.currentTarget.style.background = "#FFFFFF")}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#EBF4FC",
                display: "flex", alignItems: "center", justifyContent: "center",
                ...GM, fontSize: 11, fontWeight: 700, color: "#0078D4", flexShrink: 0,
              }}>
                {c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...GF, color: "#07111F", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                  {badge && (
                    <span style={{ ...GM, fontSize: 9, fontWeight: 700, marginLeft: 6, padding: "1px 5px", borderRadius: 999, background: badgeColor ? "rgba(201,150,12,0.10)" : "#EBF4FC", color: badgeColor ?? "#0078D4" }}>
                      {badge}
                    </span>
                  )}
                </div>
                <div style={{ ...GM, color: "#64748B", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.email}{c.organization ? ` · ${c.organization}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {tags.map(tag => tag && (
                  <span key={tag.id} style={{ ...GM, fontSize: 9, padding: "2px 6px", borderRadius: 999, background: `${tag.color}18`, color: tag.color }}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...GF, display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{label}</label>
      {children}
      {error && <p role="alert" style={{ ...GF, fontSize: 11, color: "#DC2626", marginTop: 3 }}>{error}</p>}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    fontFamily: "'Geist', sans-serif",
    width: "100%", fontSize: 14, color: "#07111F",
    border: `1.5px solid ${hasError ? "#DC2626" : "#D1D9E0"}`,
    borderRadius: 8, padding: "8px 12px",
    outline: "none", boxSizing: "border-box",
  };
}

const btnPrimary: React.CSSProperties = {
  fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 700,
  background: "#0078D4", color: "#FFFFFF",
  border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  fontFamily: "'Geist', sans-serif", fontSize: 13, fontWeight: 600,
  background: "#FFFFFF", color: "#475569",
  border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "8px 14px", cursor: "pointer",
};
