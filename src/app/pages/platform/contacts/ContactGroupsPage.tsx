// /app/contacts/groups — Contact groups list.
// Shows active and archived groups with member counts. Create group modal.
// Frontend-only demonstration. No real persistence.
// Burgundy never used. eNotary never referenced.

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import type { ContactGroupSummary, ContactScope } from "../../../models/contacts";
import { CONTACT_SCOPE_LABELS } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const ERROR = "#DC2626";

function inputStyle(): React.CSSProperties {
  return { ...GF, width: "100%", fontSize: 14, color: NAVY, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "10px 12px", outline: "none", boxSizing: "border-box", background: "#FFFFFF" };
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { asyncCreateGroup } = useContacts();
  const [name,   setName]   = useState("");
  const [desc,   setDesc]   = useState("");
  const [scope,  setScope]  = useState<ContactScope>("personal");
  const [nameErr, setNameErr] = useState("");
  const [saving,  setSaving]  = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { setNameErr("Group name is required."); return; }
    setSaving(true);
    await asyncCreateGroup(name.trim(), desc.trim(), scope);
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cg-title" style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h2 id="cg-title" style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 20px" }}>Create Group</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
            Group Name <span style={{ color: ERROR }}>*</span>
          </label>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setNameErr(""); }} autoFocus style={inputStyle()} />
          {nameErr && <span role="alert" style={{ ...GF, fontSize: 11, color: ERROR, marginTop: 3, display: "block" }}>{nameErr}</span>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inputStyle(), resize: "vertical" }} placeholder="Optional description…" />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 8 }}>Visibility</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["personal", "workspace"] as ContactScope[]).map(s => (
              <button key={s} type="button" role="radio" aria-checked={scope === s} onClick={() => setScope(s)}
                style={{ ...GF, flex: 1, fontSize: 13, padding: "9px 0", borderRadius: 8, cursor: "pointer", fontWeight: scope === s ? 700 : 500, border: `1.5px solid ${scope === s ? AZURE : "#D1D9E0"}`, background: scope === s ? LIGHT : "#FFFFFF", color: scope === s ? AZURE : SLATE }}>
                {CONTACT_SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "9px 18px", background: "#FFFFFF", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: saving ? SILVER : AZURE, border: "none", borderRadius: 8, padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: ContactGroupSummary }) {
  return (
    <Link to={`/app/contacts/groups/${group.id}`} style={{ display: "block", textDecoration: "none" }}>
      <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px", transition: "border-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = AZURE)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E3E8EF")}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</p>
            {group.description && <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.description}</p>}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: group.scope === "workspace" ? "#EBF4FC" : "#F8FAFC", color: group.scope === "workspace" ? AZURE : SLATE }}>
                {CONTACT_SCOPE_LABELS[group.scope]}
              </span>
              <span style={{ ...GF, fontSize: 11, color: SILVER }}>
                {group.memberCount} {group.memberCount === 1 ? "contact" : "contacts"}
              </span>
              {group.status === "archived" && (
                <span style={{ ...GM, fontSize: 9, padding: "2px 7px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
            </div>
          </div>
          <span style={{ color: AZURE, fontSize: 18, marginTop: 2 }}>›</span>
        </div>
      </div>
    </Link>
  );
}

function GroupsLibrary() {
  const { state, asyncLoadGroups } = useContacts();
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { void asyncLoadGroups(); }, [asyncLoadGroups]);

  const allGroups = state.groups;
  const active    = allGroups.filter(g => g.status !== "archived");
  const archived  = allGroups.filter(g => g.status === "archived");
  const shown     = showArchived ? allGroups : active;

  return (
    <>
      {showModal && <CreateGroupModal onClose={() => setShowModal(false)} onCreated={() => void asyncLoadGroups()} />}

      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
        <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
            <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
              <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
              <li aria-hidden>›</li>
              <li style={{ color: SLATE }}>Groups</li>
            </ol>
          </nav>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Contact Groups</h1>
              <p style={{ ...GF, fontSize: 13, color: SLATE, marginTop: 4 }}>Organize contacts into groups for quick selection in workflows.</p>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>
              + Create Group
            </button>
          </div>
        </header>

        <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 24px" }}>
          {state.groupsLoading && (
            <div aria-busy="true" style={{ display: "grid", gap: 10 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 90, background: "#E2E8F0", borderRadius: 12 }} />)}
            </div>
          )}

          {!state.groupsLoading && shown.length === 0 && !showArchived && (
            <div style={{ textAlign: "center", padding: "48px 24px", ...GF }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>👥</p>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 6 }}>No groups yet</h2>
              <p style={{ fontSize: 13, color: SLATE, marginBottom: 18 }}>Groups help you quickly select sets of contacts when adding participants.</p>
              <button onClick={() => setShowModal(true)}
                style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: AZURE, border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>
                Create First Group
              </button>
            </div>
          )}

          {!state.groupsLoading && (
            <div style={{ display: "grid", gap: 10 }}>
              {shown.map(g => <GroupCard key={g.id} group={g} />)}
            </div>
          )}

          {archived.length > 0 && (
            <button onClick={() => setShowArchived(v => !v)}
              style={{ ...GF, fontSize: 13, color: SLATE, background: "none", border: "none", cursor: "pointer", marginTop: 16, padding: "6px 0" }}>
              {showArchived ? "Hide archived groups" : `Show ${archived.length} archived group${archived.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function ContactGroupsPage() {
  return (
    <ContactProvider>
      <GroupsLibrary />
    </ContactProvider>
  );
}
