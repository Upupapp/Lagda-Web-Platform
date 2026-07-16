// /app/contacts/new — Create a new contact.
// Full validation, duplicate warning, inline field errors.
// Frontend-only demonstration. No real persistence, sync, or identity verification.
// Burgundy never used. eNotary never referenced.

import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactCreateInput, ContactScope, ContactTagId, ContactGroupId, ContactDuplicateCandidate } from "../../../models/contacts";
import { SYSTEM_CONTACT_TAGS, CONTACT_SCOPE_LABELS, getContactTagById } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const ERROR = "#DC2626";

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = React.useState(value);
  React.useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span role="alert" style={{ ...GF, fontSize: 11, color: ERROR, display: "block", marginTop: 3 }}>{msg}</span>;
}

function FormField({ label, required, children, error, hint }: { label: string; required?: boolean; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
        {label} {required && <span style={{ color: ERROR }} aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ ...GF, fontSize: 11, color: SILVER, display: "block", marginTop: 3 }}>{hint}</span>}
      <FieldError msg={error} />
    </div>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    ...GF, width: "100%", fontSize: 14, color: NAVY,
    border: `1.5px solid ${hasError ? ERROR : "#D1D9E0"}`,
    borderRadius: 8, padding: "10px 12px", outline: "none",
    boxSizing: "border-box", background: "#FFFFFF",
  };
}

// ── Duplicate warning modal ───────────────────────────────────────────────────

function DuplicateWarningModal({ candidates, onContinue, onReview, onCancel }: {
  candidates: ContactDuplicateCandidate[];
  onContinue: () => void;
  onReview:   () => void;
  onCancel:   () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dup-title" style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>⚠️</span>
          <div>
            <h2 id="dup-title" style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>Potential duplicate detected</h2>
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
              {candidates.length === 1
                ? "A contact with a similar email or name already exists."
                : `${candidates.length} contacts with similar details already exist.`}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {candidates.slice(0, 3).map(c => (
            <div key={c.existingContactId} style={{ border: "1.5px solid #F0F2F5", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
              <p style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 2px" }}>{c.existingName}</p>
              <p style={{ ...GM, fontSize: 11, color: SLATE, margin: "0 0 6px" }}>{c.existingEmail}</p>
              {c.existingOrg && <p style={{ ...GF, fontSize: 11, color: SILVER, margin: "0 0 4px" }}>{c.existingOrg}</p>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {c.reasons.map((r, i) => (
                  <span key={i} style={{ ...GM, fontSize: 9, padding: "2px 7px", borderRadius: 999, background: "#FEF3C7", color: "#92400E" }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ ...GF, fontSize: 12, color: SILVER, marginBottom: 20 }}>
          Creating a duplicate contact may cause confusion when adding participants to documents. You can review the existing contact or continue creating a new one.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={onCancel} style={{ ...GF, fontSize: 13, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #D1D9E0", background: "#FFFFFF", color: NAVY, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onReview} style={{ ...GF, fontSize: 13, padding: "9px 16px", borderRadius: 8, border: `1.5px solid ${AZURE}`, background: "#FFFFFF", color: AZURE, cursor: "pointer", fontWeight: 600 }}>
            Review existing
          </button>
          <button onClick={onContinue} style={{ ...GF, fontSize: 13, padding: "9px 16px", borderRadius: 8, border: "none", background: AZURE, color: "#FFFFFF", cursor: "pointer", fontWeight: 700 }}>
            Create anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form inner ────────────────────────────────────────────────────────────────

function CreateContactForm() {
  const navigate = useNavigate();
  const { asyncCreate, asyncFindDuplicates } = useContacts();

  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [org,    setOrg]    = useState("");
  const [title,  setTitle]  = useState("");
  const [scope,  setScope]  = useState<ContactScope>("personal");
  const [note,   setNote]   = useState("");
  const [tagIds,    setTagIds]    = useState<ContactTagId[]>([]);
  const [groupIds,  setGroupIds]  = useState<ContactGroupId[]>([]);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [dupCandidates, setDupCandidates] = useState<ContactDuplicateCandidate[] | null>(null);
  const [dupChecked,    setDupChecked]    = useState(false);

  const debouncedEmail = useDebounce(email, 350);
  const debouncedName  = useDebounce(name,  500);

  // Trigger duplicate check when name/email stabilise
  React.useEffect(() => {
    if (!debouncedEmail && !debouncedName) return;
    asyncFindDuplicates(debouncedName, debouncedEmail).then(res => setDupCandidates(res.length ? res : null));
  }, [debouncedEmail, debouncedName, asyncFindDuplicates]);

  const toggleTag = (id: ContactTagId) =>
    setTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required.";
    else if (name.trim().length < 2) errs.name = "Name must be at least 2 characters.";
    if (!email.trim()) errs.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (phone && !/^[0-9+\-\s().]{7,20}$/.test(phone.trim())) errs.phone = "Enter a valid phone number.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, email, phone]);

  const handleSubmit = async (skipDupCheck = false) => {
    if (!validate()) return;

    if (!skipDupCheck && dupCandidates && dupCandidates.length > 0 && !dupChecked) {
      setDupChecked(true); // triggers modal via state — modal is rendered below
      return;
    }

    setSaving(true);
    try {
      const input: ContactCreateInput = {
        name: name.trim(), email: email.trim(), phone: phone.trim() || undefined,
        organization: org.trim() || undefined, title: title.trim() || undefined,
        scope, tagIds, groupIds, note: note.trim() || undefined,
      };
      const contact = await asyncCreate(input);
      navigate(`/app/contacts/${contact.id}`);
    } catch {
      setErrors({ _form: "Could not create contact. Please try again." });
      setSaving(false);
    }
  };

  const showDupModal = dupChecked && dupCandidates && dupCandidates.length > 0;

  return (
    <>
      {showDupModal && (
        <DuplicateWarningModal
          candidates={dupCandidates!}
          onContinue={() => { setDupChecked(false); void handleSubmit(true); }}
          onReview={() => { navigate(`/app/contacts/${dupCandidates![0].existingContactId}`); }}
          onCancel={() => setDupChecked(false)}
        />
      )}

      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
        {/* Page header */}
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
            <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
              <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
              <li aria-hidden>›</li>
              <li style={{ color: SLATE }}>Add Contact</li>
            </ol>
          </nav>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Add Contact</h1>
          <p style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4 }}>
            Contact details are reused when adding participants to document workflows.
          </p>
        </header>

        <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 24px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", border: "1.5px solid #E3E8EF" }}>

            {errors._form && (
              <div role="alert" style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", ...GF, fontSize: 13, color: "#991B1B", marginBottom: 20 }}>
                {errors._form}
              </div>
            )}

            {/* Duplicate pre-warning (inline, not blocking) */}
            {dupCandidates && !dupChecked && (
              <div role="status" style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div style={{ ...GF, fontSize: 12, color: "#92400E" }}>
                  <strong>Possible duplicate:</strong> A contact with similar name or email may already exist.{" "}
                  <Link to={`/app/contacts/${dupCandidates[0].existingContactId}`} style={{ color: "#B45309", fontWeight: 700 }}>
                    Review existing contact
                  </Link>
                </div>
              </div>
            )}

            <FormField label="Full Name" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
                aria-required="true"
                aria-describedby={errors.name ? "name-err" : undefined}
                aria-invalid={!!errors.name}
                style={inputStyle(!!errors.name)}
                autoFocus
              />
            </FormField>

            <FormField label="Email Address" required error={errors.email} hint="Used to identify participants in documents.">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. maria.santos@example.com"
                aria-required="true"
                aria-invalid={!!errors.email}
                style={inputStyle(!!errors.email)}
              />
            </FormField>

            <FormField label="Phone Number" error={errors.phone} hint="Optional. Country code recommended.">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +63 917 555 0123"
                aria-invalid={!!errors.phone}
                style={inputStyle(!!errors.phone)}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormField label="Organization" error={errors.org}>
                <input type="text" value={org} onChange={e => setOrg(e.target.value)} placeholder="Company / Agency" style={inputStyle(!!errors.org)} />
              </FormField>
              <FormField label="Title / Role" error={errors.title} hint="Job title or role.">
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Legal Counsel" style={inputStyle(!!errors.title)} />
              </FormField>
            </div>

            <FormField label="Visibility" hint="Workspace contacts may be shared with permitted team members.">
              <div style={{ display: "flex", gap: 8 }}>
                {(["personal", "workspace"] as ContactScope[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={scope === s}
                    onClick={() => setScope(s)}
                    style={{
                      ...GF, flex: 1, fontSize: 13, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: scope === s ? 700 : 500,
                      border: `1.5px solid ${scope === s ? AZURE : "#D1D9E0"}`,
                      background: scope === s ? LIGHT : "#FFFFFF", color: scope === s ? AZURE : SLATE,
                    }}
                  >
                    {CONTACT_SCOPE_LABELS[s]}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Tags" hint="Tags help organize and filter contacts.">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SYSTEM_CONTACT_TAGS.map(tag => {
                  const active = tagIds.includes(tag.id);
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} aria-pressed={active}
                      style={{
                        ...GM, fontSize: 10, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                        background: active ? `${tag.color}20` : "#F8FAFC",
                        color: active ? tag.color : SLATE,
                        border: active ? `1.5px solid ${tag.color}` : "1.5px solid #E3E8EF",
                        fontWeight: active ? 700 : 500,
                      }}>
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Note" hint="Optional internal note visible only to you.">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Optional notes about this contact…"
                style={{ ...inputStyle(), resize: "vertical" }}
              />
            </FormField>

            {/* Privacy notice */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", marginBottom: 22 }}>
              <p style={{ ...GF, fontSize: 11, color: SLATE, margin: 0 }}>
                <strong>Privacy note:</strong> Contact information is not verified against external identity systems. This record represents your reusable participant profile for document workflows only — it does not constitute a verified identity or legal identity claim.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Link to="/app/contacts" style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "9px 18px", textDecoration: "none", fontWeight: 600 }}>
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={saving}
                aria-busy={saving}
                style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: saving ? SILVER : AZURE, border: "none", borderRadius: 8, padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Creating…" : "Create Contact"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function CreateContactPage() {
  return (
    <ContactProvider>
      <CreateContactForm />
    </ContactProvider>
  );
}
