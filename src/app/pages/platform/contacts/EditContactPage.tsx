// /app/contacts/:contactId/edit — Edit an existing contact.
// Reuses same form fields as Create, pre-populated. Historical participant separation notice.
// Frontend-only demonstration. No real persistence.
// Burgundy never used. eNotary never referenced.

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactCreateInput, ContactScope, ContactTagId, Contact } from "../../../models/contacts";
import { SYSTEM_CONTACT_TAGS, CONTACT_SCOPE_LABELS, getContactTagById } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const ERROR = "#DC2626";

function inputStyle(hasError?: boolean): React.CSSProperties {
  return { ...GF, width: "100%", fontSize: 14, color: NAVY, border: `1.5px solid ${hasError ? ERROR : "#D1D9E0"}`, borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box", background: "#FFFFFF" };
}

function FormField({ label, required, children, error, hint }: { label: string; required?: boolean; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: ERROR }} aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <span style={{ ...GF, fontSize: 11, color: SILVER, display: "block", marginTop: 3 }}>{hint}</span>}
      {error && <span role="alert" style={{ ...GF, fontSize: 11, color: ERROR, display: "block", marginTop: 3 }}>{error}</span>}
    </div>
  );
}

function EditForm() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { state, asyncLoadContact, clearActiveContact, asyncUpdate, asyncValidate } = useContacts();

  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [org,    setOrg]    = useState("");
  const [title,  setTitle]  = useState("");
  const [scope,  setScope]  = useState<ContactScope>("personal");
  const [note,   setNote]   = useState("");
  const [tagIds,  setTagIds] = useState<ContactTagId[]>([]);
  const [errors,  setErrors] = useState<Record<string, string>>({});
  const [saving,  setSaving] = useState(false);
  const [loaded,  setLoaded] = useState(false);

  useEffect(() => {
    if (contactId) void asyncLoadContact(contactId as ContactId);
    return () => clearActiveContact();
  }, [contactId, asyncLoadContact, clearActiveContact]);

  // Populate form once contact loads
  useEffect(() => {
    if (state.activeContact && !loaded) {
      const c = state.activeContact;
      setName(c.name);
      setEmail(c.email);
      setPhone(c.phone ?? "");
      setOrg(c.organization ?? "");
      setTitle(c.title ?? "");
      setScope(c.scope);
      setNote(c.note ?? "");
      setTagIds([...c.tagIds]);
      setLoaded(true);
    }
  }, [state.activeContact, loaded]);

  const toggleTag = (id: ContactTagId) =>
    setTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!email.trim()) errs.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (phone && !/^[0-9+\-\s().]{7,20}$/.test(phone.trim())) errs.phone = "Enter a valid phone number.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, email, phone]);

  const handleSubmit = async () => {
    if (!validate() || !contactId) return;
    setSaving(true);
    try {
      const input: ContactCreateInput = {
        name: name.trim(), email: email.trim(), phone: phone.trim() || undefined,
        organization: org.trim() || undefined, title: title.trim() || undefined,
        scope, tagIds, groupIds: state.activeContact?.groupIds ?? [], note: note.trim() || undefined,
      };
      await asyncUpdate(contactId as ContactId, input);
      navigate(`/app/contacts/${contactId}`);
    } catch {
      setErrors({ _form: "Could not save changes. Please try again." });
      setSaving(false);
    }
  };

  if (state.activeLoading || !loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div aria-busy="true" style={{ maxWidth: 600, margin: "0 auto" }}>
          {[50, 320, 80].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (state.activeError || !state.activeContact) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...GF, color: SLATE }}>Contact not found. <Link to="/app/contacts" style={{ color: AZURE }}>Back to Contacts</Link></p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
            <li aria-hidden>›</li>
            <li><Link to={`/app/contacts/${contactId}`} style={{ color: AZURE, textDecoration: "none" }}>{state.activeContact.name}</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Edit</li>
          </ol>
        </nav>
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Edit Contact</h1>
      </header>

      <div style={{ maxWidth: 600, margin: "32px auto 0", padding: "0 24px" }}>
        {/* Historical separation notice */}
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <p style={{ ...GF, fontSize: 12, color: "#92400E", margin: 0 }}>
            <strong>Note:</strong> Editing this contact's details does not update historical participant records in existing transactions. Those records represent the information captured at signing time.
          </p>
        </div>

        <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", border: "1.5px solid #E3E8EF" }}>
          {errors._form && (
            <div role="alert" style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 14px", ...GF, fontSize: 13, color: "#991B1B", marginBottom: 20 }}>
              {errors._form}
            </div>
          )}

          <FormField label="Full Name" required error={errors.name}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} aria-required="true" aria-invalid={!!errors.name} style={inputStyle(!!errors.name)} />
          </FormField>

          <FormField label="Email Address" required error={errors.email}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} aria-required="true" aria-invalid={!!errors.email} style={inputStyle(!!errors.email)} />
          </FormField>

          <FormField label="Phone Number" error={errors.phone}>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!errors.phone} style={inputStyle(!!errors.phone)} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Organization">
              <input type="text" value={org} onChange={e => setOrg(e.target.value)} style={inputStyle()} />
            </FormField>
            <FormField label="Title / Role">
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle()} />
            </FormField>
          </div>

          <FormField label="Visibility">
            <div style={{ display: "flex", gap: 8 }}>
              {(["personal", "workspace"] as ContactScope[]).map(s => (
                <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => setScope(s)}
                  style={{ ...GF, flex: 1, fontSize: 13, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: scope === s ? 700 : 500, border: `1.5px solid ${scope === s ? AZURE : "#D1D9E0"}`, background: scope === s ? LIGHT : "#FFFFFF", color: scope === s ? AZURE : SLATE }}>
                  {CONTACT_SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Tags">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SYSTEM_CONTACT_TAGS.map(tag => {
                const active = tagIds.includes(tag.id);
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} aria-pressed={active}
                    style={{ ...GM, fontSize: 10, padding: "4px 10px", borderRadius: 999, cursor: "pointer", background: active ? `${tag.color}20` : "#F8FAFC", color: active ? tag.color : SLATE, border: active ? `1.5px solid ${tag.color}` : "1.5px solid #E3E8EF", fontWeight: active ? 700 : 500 }}>
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </FormField>

          <FormField label="Note">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
          </FormField>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link to={`/app/contacts/${contactId}`}
              style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "9px 18px", textDecoration: "none", fontWeight: 600 }}>
              Cancel
            </Link>
            <button type="button" onClick={handleSubmit} disabled={saving}
              style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: saving ? SILVER : AZURE, border: "none", borderRadius: 8, padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditContactPage() {
  return (
    <ContactProvider>
      <EditForm />
    </ContactProvider>
  );
}

type ContactId = import("../../../models/contacts").ContactId;
