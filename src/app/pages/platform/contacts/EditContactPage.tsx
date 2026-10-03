// /app/contacts/:contactId/edit — Edit an existing contact.
//
// Two forms, by who the contact is:
//
//   Linked to a LAGDA account (connected, or a member of this workspace):
//     "Edit roles & notes". Name, email, title and organisation come from the
//     person's own profile and are shown read-only — editing them here would
//     only be overwritten by the live values. What is yours to set: the roles
//     they play in your documents, a category, their phone, a private note,
//     and who in the workspace can use the contact.
//   External (no account): every field, since you are the only source.
//
// What a person may DO in the workspace is not a contact's business: role
// and privileges belong to their membership (People › Members).

import { useWorkspaceAllows } from "../../../hooks/usePlans";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactCreateInput, ContactScope, ContactTagId } from "../../../models/contacts";
import { SYSTEM_CONTACT_TAGS, CONTACT_SCOPE_LABELS } from "../../../models/contacts";
import { BadgeCheck, Lock } from "lucide-react";
import { PersonAvatar } from "./contacts-ui";
import { withProcess } from "../../../config/process-screens";
import { useDetailTitle } from "../../../hooks/useDetailTitle";

/** The tags that say what part someone plays in a document; the rest are categories. */
const ROLE_TAGS = new Set<string>(["tag-signer", "tag-approver", "tag-reviewer", "tag-ack"]);

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
  const { state, asyncLoadContact, clearActiveContact, asyncUpdate } = useContacts();
  // The header crumb names the contact, not its id.
  useDetailTitle(state.activeContact?.name);

  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");
  const [org,    setOrg]    = useState("");
  const [title,  setTitle]  = useState("");
  const [scope,  setScope]  = useState<ContactScope>("personal");
  // 093. Sharing a contact with the workspace is part of Business.
  const canShareContacts = useWorkspaceAllows("business") !== false;
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
      await withProcess("contact-update", "", () => asyncUpdate(contactId as ContactId, input));
      void navigate(`/app/contacts/${contactId}`);
    } catch {
      setErrors({ _form: "Could not save changes. Please try again." });
      setSaving(false);
    }
  };

  // Someone with a LAGDA account behind them speaks for their own identity.
  const linked = !!state.activeContact?.account;

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
        <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{linked ? "Edit roles & notes" : "Edit contact"}</h1>
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

          {linked ? (
            <div data-testid="linked-identity" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "14px 16px", background: "#FBFCFE", marginBottom: 22 }}>
              <PersonAvatar name={state.activeContact.name} avatarUrl={state.activeContact.avatarUrl} size={52} />
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ ...GF, fontSize: 15, fontWeight: 800, color: NAVY, overflowWrap: "anywhere" }}>{state.activeContact.name}</div>
                <div style={{ ...GM, fontSize: 12, color: SLATE, overflowWrap: "anywhere" }}>{state.activeContact.email}</div>
                {(state.activeContact.title || state.activeContact.organization) && (
                  <div style={{ ...GF, fontSize: 12.5, color: SLATE, marginTop: 2 }}>{[state.activeContact.title, state.activeContact.organization].filter(Boolean).join(" · ")}</div>
                )}
              </div>
              <p style={{ ...GF, flexBasis: "100%", display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: SLATE, margin: 0 }}>
                <Lock size={13} aria-hidden /> Name, email, title and organisation come from their LAGDA profile, so they stay up to date on their own.
                {state.activeContact.account?.connected && <BadgeCheck size={13} aria-hidden color="#166534" />}
              </p>
            </div>
          ) : (<>
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
          </>)}

          {linked && (
            <FormField label="Phone Number" error={errors.phone} hint="Not part of their LAGDA profile — yours to keep.">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!errors.phone} style={inputStyle(!!errors.phone)} />
            </FormField>
          )}

          <FormField label="Who can use this contact">
            <div style={{ display: "flex", gap: 8 }}>
              {((canShareContacts || scope === "workspace" ? ["personal", "workspace"] : ["personal"]) as ContactScope[]).map(s => (
                <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => setScope(s)}
                  style={{ ...GF, flex: 1, fontSize: 13, padding: "10px 0", borderRadius: 8, cursor: "pointer", fontWeight: scope === s ? 700 : 500, border: `1.5px solid ${scope === s ? AZURE : "#D1D9E0"}`, background: scope === s ? LIGHT : "#FFFFFF", color: scope === s ? AZURE : SLATE }}>
                  {CONTACT_SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Document roles" hint="The parts they usually play when you prepare a document.">
            <TagPicker tags={SYSTEM_CONTACT_TAGS.filter(t => ROLE_TAGS.has(t.id))} selected={tagIds} onToggle={toggleTag} />
          </FormField>

          <FormField label="Category">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SYSTEM_CONTACT_TAGS.filter(t => !ROLE_TAGS.has(t.id)).map(tag => {
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

          <FormField label="Note" hint="Private to this contact record.">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" }} />
          </FormField>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Link to={`/app/contacts/${contactId}`}
              style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "9px 18px", textDecoration: "none", fontWeight: 600 }}>
              Cancel
            </Link>
            <button type="button" onClick={handleSubmit} disabled={saving}
              style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: saving ? SILVER : AZURE, border: "none", borderRadius: 8, padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagPicker({ tags, selected, onToggle }: {
  tags: readonly { id: ContactTagId; label: string; color: string }[]; selected: readonly ContactTagId[]; onToggle: (id: ContactTagId) => void;
}) {
  return (
    <div role="group" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {tags.map(tag => {
        const active = selected.includes(tag.id);
        return (
          <button key={tag.id} type="button" onClick={() => onToggle(tag.id)} aria-pressed={active}
            style={{ ...GF, fontSize: 13, padding: "8px 14px", borderRadius: 10, cursor: "pointer", minHeight: 38,
              background: active ? `${tag.color}18` : "#FFFFFF", color: active ? tag.color : NAVY,
              border: active ? `1.5px solid ${tag.color}` : "1.5px solid #D1D9E0", fontWeight: active ? 700 : 600 }}>
            {active ? "✓ " : ""}{tag.label}
          </button>
        );
      })}
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
