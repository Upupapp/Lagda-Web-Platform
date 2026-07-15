// Step 2 of 7: Participants — add, edit, remove, and reorder participants.
// PRIVACY: participant names and email addresses exist only in React context memory.
// They are never written to localStorage, sessionStorage, or cookies.
// Burgundy (#67023B) is NEVER used. eNotary is NEVER mentioned.

import React, { useEffect, useCallback, useState } from "react";
import { usePrepare } from "../../../context/PrepareContext";
import {
  PREP_PARTICIPANT_ROLE_LABELS,
  PREP_PARTICIPANT_ROLE_DESCRIPTIONS,
  PREP_ROLE_IS_BLOCKING,
  VALID_PREP_PARTICIPANT_ROLES,
  EMPTY_PARTICIPANT,
} from "../../../models/prepare";
import type { PrepParticipant, PrepParticipantRole, PrepPaxId } from "../../../models/prepare";

const GF     = { fontFamily: "'Geist', sans-serif" };
const NAVY   = "#07111F";
const AZURE  = "#0078D4";
const SILVER = "#8A9BAE";
const GOLD   = "#C9960C";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generatePaxId(): string {
  return `pax_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function roleBadgeStyle(role: PrepParticipantRole): { bg: string; color: string } {
  switch (role) {
    case "signer":               return { bg: "#EBF4FC", color: AZURE };
    case "approver":             return { bg: "#FFF3CD", color: "#856404" };
    case "reviewer":             return { bg: "#F0EEF8", color: "#6C4BA8" };
    case "acknowledgment-recipient": return { bg: "#E8F5E9", color: "#2E7D32" };
    case "viewer":               return { bg: "#F5F7FA", color: SILVER };
    case "carbon-copy":          return { bg: "#F5F7FA", color: SILVER };
    default:                     return { bg: "#F5F7FA", color: SILVER };
  }
}

// ── Inline participant editor ─────────────────────────────────────────────────

function ParticipantEditor({
  participant,
  allEmails,
  contacts,
  onSave,
  onCancel,
}: {
  participant: Partial<PrepParticipant> & { id: string };
  allEmails: string[];
  contacts: { id: string; name: string; email: string; organization: string }[];
  onSave: (updated: PrepParticipant) => void;
  onCancel: () => void;
}) {
  const [name,  setName]  = useState(participant.name  ?? "");
  const [email, setEmail] = useState(participant.email ?? "");
  const [role,  setRole]  = useState<PrepParticipantRole>(participant.role ?? "signer");
  const [org,   setOrg]   = useState(participant.organization ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [contactFilter, setContactFilter] = useState("");
  const [showContacts, setShowContacts] = useState(false);

  const filteredContacts = contacts.filter(c => {
    const q = contactFilter.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  }).slice(0, 5);

  const applyContact = (c: { name: string; email: string; organization: string }) => {
    setName(c.name);
    setEmail(c.email);
    setOrg(c.organization);
    setShowContacts(false);
    setContactFilter("");
    setErrors({});
  };

  const handleSave = () => {
    const newErrors: { name?: string; email?: string } = {};
    if (!name.trim()) newErrors.name = "Name is required.";
    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!EMAIL_RE.test(email.trim())) {
      newErrors.email = "Enter a valid email address.";
    } else {
      const otherEmails = allEmails.filter(e => e !== participant.email);
      if (otherEmails.includes(email.trim().toLowerCase())) {
        newErrors.email = "This email is already assigned to another participant.";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave({
      id:                 participant.id,
      name:               name.trim(),
      email:              email.trim().toLowerCase(),
      role,
      organization:       org.trim(),
      isRequired:         PREP_ROLE_IS_BLOCKING[role],
      routingGroupId:     participant.routingGroupId ?? null,
      authMethodOverride: participant.authMethodOverride ?? null,
    });
  };

  return (
    <div
      style={{
        border: `2px solid ${AZURE}`,
        borderRadius: 12,
        padding: "20px",
        background: "#F0F7FF",
      }}
    >
      {/* Contact lookup */}
      {contacts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowContacts(v => !v)}
            style={{
              ...GF,
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${AZURE}`,
              background: "#FFFFFF",
              color: AZURE,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showContacts ? "Hide contacts" : "Add from contacts"}
          </button>
          {showContacts && (
            <div style={{ marginTop: 10, background: "#FFFFFF", borderRadius: 8, border: "1px solid #D1D9E0", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #E3E8EF" }}>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={contactFilter}
                  onChange={e => setContactFilter(e.target.value)}
                  autoFocus
                  style={{
                    ...GF,
                    width: "100%",
                    padding: "6px 0",
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    color: NAVY,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {filteredContacts.length === 0 && (
                <div style={{ ...GF, padding: "12px", fontSize: 13, color: SILVER }}>No contacts found</div>
              )}
              {filteredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => applyContact(c)}
                  style={{
                    ...GF,
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: "1px solid #F0F2F5",
                    background: "#FFFFFF",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 13,
                    color: NAVY,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: SILVER, fontSize: 12 }}>{c.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>
            Full name <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: undefined })); }}
            placeholder="Juan dela Cruz"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "pax-name-err" : undefined}
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: `1px solid ${errors.name ? "#F5C6CB" : "#D1D9E0"}`,
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              boxSizing: "border-box",
            }}
          />
          {errors.name && (
            <div id="pax-name-err" role="alert" style={{ ...GF, fontSize: 11, color: "#C0392B", marginTop: 3 }}>
              {errors.name}
            </div>
          )}
        </div>

        <div>
          <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>
            Email address <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: undefined })); }}
            placeholder="juan@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "pax-email-err" : undefined}
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: `1px solid ${errors.email ? "#F5C6CB" : "#D1D9E0"}`,
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              boxSizing: "border-box",
            }}
          />
          {errors.email && (
            <div id="pax-email-err" role="alert" style={{ ...GF, fontSize: 11, color: "#C0392B", marginTop: 3 }}>
              {errors.email}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>
            Role <span style={{ color: "#C0392B" }}>*</span>
          </label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as PrepParticipantRole)}
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #D1D9E0",
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
            }}
          >
            {VALID_PREP_PARTICIPANT_ROLES.map(r => (
              <option key={r} value={r}>{PREP_PARTICIPANT_ROLE_LABELS[r]}</option>
            ))}
          </select>
          <div style={{ ...GF, fontSize: 11, color: SILVER, marginTop: 4 }}>
            {PREP_PARTICIPANT_ROLE_DESCRIPTIONS[role]}
          </div>
        </div>

        <div>
          <label style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY, display: "block", marginBottom: 4 }}>
            Organization <span style={{ color: SILVER, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={org}
            onChange={e => setOrg(e.target.value)}
            placeholder="Acme Corp."
            style={{
              ...GF,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 7,
              border: "1px solid #D1D9E0",
              background: "#FFFFFF",
              fontSize: 13,
              color: NAVY,
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            ...GF,
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid #D1D9E0",
            background: "#FFFFFF",
            color: NAVY,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            ...GF,
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: AZURE,
            color: "#FFFFFF",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save participant
        </button>
      </div>
    </div>
  );
}

// ── Participant card ──────────────────────────────────────────────────────────

function ParticipantCard({
  participant,
  index,
  total,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  participant: PrepParticipant;
  index: number;
  total: number;
  onEdit: (id: PrepPaxId) => void;
  onMoveUp: (id: PrepPaxId) => void;
  onMoveDown: (id: PrepPaxId) => void;
  onRemove: (id: PrepPaxId) => void;
}) {
  const badge = roleBadgeStyle(participant.role);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid #E3E8EF",
        background: "#FAFBFC",
      }}
    >
      {/* Order */}
      <span style={{ ...GF, fontSize: 11, fontWeight: 700, color: SILVER, minWidth: 18, textAlign: "center" }}>
        {index + 1}
      </span>

      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#E3E8EF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 700,
          color: NAVY,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {participant.name.charAt(0).toUpperCase() || "?"}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 3 }}>
          {participant.name}
        </div>
        <div style={{ ...GF, fontSize: 12, color: SILVER, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {participant.email}
          {participant.organization && ` · ${participant.organization}`}
        </div>
      </div>

      {/* Role badge */}
      <span
        style={{
          ...GF,
          fontSize: 11,
          fontWeight: 700,
          background: badge.bg,
          color: badge.color,
          padding: "3px 10px",
          borderRadius: 20,
          flexShrink: 0,
        }}
      >
        {PREP_PARTICIPANT_ROLE_LABELS[participant.role]}
      </span>

      {/* Reorder */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onMoveUp(participant.id)}
          disabled={index === 0}
          aria-label={`Move ${participant.name} up`}
          style={{
            ...GF,
            width: 28, height: 28,
            border: "1px solid #D1D9E0",
            borderRadius: 6,
            background: index === 0 ? "#F5F7FA" : "#FFFFFF",
            color: index === 0 ? "#D1D9E0" : NAVY,
            cursor: index === 0 ? "not-allowed" : "pointer",
            fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >↑</button>
        <button
          onClick={() => onMoveDown(participant.id)}
          disabled={index === total - 1}
          aria-label={`Move ${participant.name} down`}
          style={{
            ...GF,
            width: 28, height: 28,
            border: "1px solid #D1D9E0",
            borderRadius: 6,
            background: index === total - 1 ? "#F5F7FA" : "#FFFFFF",
            color: index === total - 1 ? "#D1D9E0" : NAVY,
            cursor: index === total - 1 ? "not-allowed" : "pointer",
            fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >↓</button>
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(participant.id)}
        aria-label={`Edit ${participant.name}`}
        style={{
          ...GF,
          width: 28, height: 28,
          border: "1px solid #D1D9E0",
          borderRadius: 6,
          background: "#FFFFFF",
          color: AZURE,
          cursor: "pointer",
          fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >✎</button>

      {/* Remove */}
      <button
        onClick={() => onRemove(participant.id)}
        aria-label={`Remove ${participant.name}`}
        style={{
          ...GF,
          width: 28, height: 28,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: "#C0392B",
          cursor: "pointer",
          fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

// ── Main step component ───────────────────────────────────────────────────────

export function ParticipantsStep() {
  const {
    draft,
    updateParticipants,
    loadContacts,
    contacts,
    setStep,
    validate,
  } = usePrepare();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    setStep("participants");
    loadContacts();
  }, [setStep, loadContacts]);

  const participants = draft?.participants ?? [];
  const validation   = draft ? validate() : null;
  const paxErrors    = validation?.errors.filter(e => e.stepId === "participants") ?? [];
  const paxWarnings  = validation?.warnings.filter(e => e.stepId === "participants") ?? [];

  const allEmails = participants.map(p => p.email);

  const handleSave = (updated: PrepParticipant) => {
    const idx = participants.findIndex(p => p.id === updated.id);
    if (idx >= 0) {
      const next = [...participants];
      next[idx] = updated;
      updateParticipants(next);
    } else {
      updateParticipants([...participants, updated]);
    }
    setEditingId(null);
    setAddingNew(false);
  };

  const handleMoveUp = (id: PrepPaxId) => {
    const idx = participants.findIndex(p => p.id === id);
    if (idx <= 0) return;
    const next = [...participants];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    updateParticipants(next);
  };

  const handleMoveDown = (id: PrepPaxId) => {
    const idx = participants.findIndex(p => p.id === id);
    if (idx < 0 || idx >= participants.length - 1) return;
    const next = [...participants];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    updateParticipants(next);
  };

  const handleRemove = (id: PrepPaxId) => {
    updateParticipants(participants.filter(p => p.id !== id));
  };

  const hasBlockingRole = participants.some(p => PREP_ROLE_IS_BLOCKING[p.role]);

  return (
    <div style={{ ...GF, maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: NAVY, margin: "0 0 6px" }}>
          Participants
        </h2>
        <p style={{ fontSize: 13, color: SILVER, margin: 0, lineHeight: 1.6 }}>
          Add the people who will interact with this document. At least one signer, approver,
          reviewer, or acknowledgment recipient is required.
        </p>
      </div>

      {/* Validation notices */}
      {paxErrors.length > 0 && (
        <ul aria-live="polite" style={{ ...GF, listStyle: "none", margin: "0 0 16px", padding: "10px 14px", borderRadius: 8, border: "1px solid #F5C6CB", background: "#FFF5F5", fontSize: 13, color: "#C0392B" }}>
          {paxErrors.map(e => <li key={e.id}>• {e.message}</li>)}
        </ul>
      )}
      {paxWarnings.length > 0 && (
        <ul style={{ ...GF, listStyle: "none", margin: "0 0 16px", padding: "10px 14px", borderRadius: 8, border: "1px solid #F0D07A", background: "#FEF9EC", fontSize: 13, color: GOLD }}>
          {paxWarnings.map(e => <li key={e.id}>• {e.message}</li>)}
        </ul>
      )}

      {/* Participant list */}
      {participants.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {participants.map((p, idx) =>
            editingId === p.id ? (
              <ParticipantEditor
                key={p.id}
                participant={p}
                allEmails={allEmails}
                contacts={contacts}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ParticipantCard
                key={p.id}
                participant={p}
                index={idx}
                total={participants.length}
                onEdit={id => { setEditingId(id); setAddingNew(false); }}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onRemove={handleRemove}
              />
            )
          )}
        </div>
      )}

      {/* Add new inline editor */}
      {addingNew && !editingId && (
        <div style={{ marginBottom: 16 }}>
          <ParticipantEditor
            participant={{ id: generatePaxId(), ...EMPTY_PARTICIPANT }}
            allEmails={allEmails}
            contacts={contacts}
            onSave={handleSave}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}

      {/* Add button */}
      {!addingNew && !editingId && (
        <button
          onClick={() => setAddingNew(true)}
          style={{
            ...GF,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 8,
            border: `1px dashed ${AZURE}`,
            background: "#F0F7FF",
            color: AZURE,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          + Add participant
        </button>
      )}

      {/* Privacy notice */}
      <div style={{ ...GF, marginTop: 24, padding: "12px 14px", borderRadius: 8, background: "#F5F7FA", border: "1px solid #E3E8EF", fontSize: 12, color: SILVER, lineHeight: 1.6 }}>
        <strong style={{ color: "#4B5E70" }}>Privacy notice</strong>
        <br />
        Participant names and email addresses are stored only in this browser session and are not
        transmitted to any server in this frontend demonstration. No invitations are sent from
        this screen.
      </div>
    </div>
  );
}
