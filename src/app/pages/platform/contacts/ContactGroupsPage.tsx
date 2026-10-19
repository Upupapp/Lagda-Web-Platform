// /app/contacts/groups — Contact groups list.
// Shows active and archived groups with member counts. Create group modal.
// A workspace's groups are kept on the server and shared as their visibility says
// (personal to their owner, or the workspace's); with no workspace open, groups
// live only for the session.
// Burgundy never used. eNotary never referenced.

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import { usePlatform } from "../../../context/PlatformContext";
import { listContacts } from "../../../services/contacts-source";
import type { ContactGroupSummary, ContactId, ContactListItem, ContactScope } from "../../../models/contacts";
import { CONTACT_SCOPE_LABELS, DEFAULT_CONTACT_QUERY } from "../../../models/contacts";
import { Z } from "../../../utils/z-index";

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
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const [people, setPeople] = useState<ContactListItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [find, setFind] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    listContacts(workspaceId, { ...DEFAULT_CONTACT_QUERY, statusFilter: "active", perPage: 100 })
      .then(result => { if (alive) setPeople(result.items); })
      .catch(() => { if (alive) { setPeople([]); setLoadFailed(true); } });
    return () => { alive = false; };
  }, [workspaceId]);

  // A workspace group holds only contacts the whole workspace can see.
  const eligible = useMemo(() => (people ?? []).filter(c => scope === "personal" || c.scope === "workspace"), [people, scope]);
  const accepted = eligible.filter(c => c.account?.connected === true);
  const shown = eligible.filter(c => {
    const q = find.trim().toLocaleLowerCase();
    return q === "" || c.name.toLocaleLowerCase().includes(q) || c.email.toLocaleLowerCase().includes(q)
      || (c.organization ?? "").toLocaleLowerCase().includes(q);
  });
  // Picks that stopped being eligible (visibility changed) fall away.
  const chosen = [...picked].filter(id => eligible.some(c => String(c.id) === id));
  const toggle = (id: string) => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allAccepted = accepted.length > 0 && accepted.every(c => picked.has(String(c.id)));
  const pickAccepted = () => setPicked(prev => {
    const next = new Set(prev);
    for (const c of accepted) { if (allAccepted) next.delete(String(c.id)); else next.add(String(c.id)); }
    return next;
  });

  const handleCreate = async () => {
    if (!name.trim()) { setNameErr("Group name is required."); return; }
    setSaving(true);
    await asyncCreateGroup(name.trim(), desc.trim(), scope, chosen as ContactId[]);
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cg-title" style={{ position: "fixed", inset: 0, zIndex: Z.modal, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 14, padding: "28px 28px 24px", maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <h2 id="cg-title" style={{ ...GF, fontSize: 17, fontWeight: 800, color: NAVY, margin: "0 0 20px" }}>Create Group</h2>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cg-name" style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
            Group Name <span style={{ color: ERROR }}>*</span>
          </label>
          <input id="cg-name" type="text" value={name} maxLength={120} onChange={e => { setName(e.target.value); setNameErr(""); }} autoFocus style={inputStyle()} />
          {nameErr && <span role="alert" style={{ ...GF, fontSize: 11, color: ERROR, marginTop: 3, display: "block" }}>{nameErr}</span>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cg-desc" style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>Description</label>
          <textarea id="cg-desc" value={desc} maxLength={500} onChange={e => setDesc(e.target.value)} rows={2} style={{ ...inputStyle(), resize: "vertical" }} placeholder="Optional description…" />
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

        <div data-testid="create-group-members" style={{ marginBottom: 20 }}>
          <label htmlFor="cg-find" style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, display: "block", marginBottom: 5 }}>
            Add contacts now <span style={{ ...GF, fontWeight: 500, color: SLATE }}>(optional)</span>
          </label>
          {people === null && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading your contacts…</p>}
          {loadFailed && <p role="alert" style={{ ...GF, fontSize: 12.5, color: ERROR, margin: "0 0 8px" }}>Your contacts could not be loaded. You can still create the group and add them later.</p>}
          {people !== null && eligible.length === 0 && !loadFailed && (
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
              {scope === "workspace" ? "No workspace-visible contacts to add yet." : "You have no contacts to add yet."} You can add people to the group later.
            </p>
          )}
          {eligible.length > 0 && (
            <>
              {accepted.length > 0 && (
                <button type="button" onClick={pickAccepted} data-testid="pick-accepted"
                  style={{ ...GF, fontSize: 13, fontWeight: 700, color: AZURE, background: LIGHT, border: "1.5px solid #BAD7F5", borderRadius: 8, padding: "8px 12px", minHeight: 40, cursor: "pointer", marginBottom: 8, width: "100%" }}>
                  {allAccepted ? "Unselect" : "Select"} everyone who accepted my request ({accepted.length})
                </button>
              )}
              <input id="cg-find" type="search" value={find} onChange={e => setFind(e.target.value)} placeholder="Search name, email or organization" style={{ ...inputStyle(), marginBottom: 8 }} />
              <ul role="list" aria-label="Contacts to add" style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: 220, overflowY: "auto", border: "1px solid #E3E8EF", borderRadius: 8 }}>
                {shown.length === 0 && <li style={{ ...GF, fontSize: 13, color: SLATE, padding: 10 }}>No contacts match that search.</li>}
                {shown.map(c => (
                  <li key={String(c.id)} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", minHeight: 44, cursor: "pointer" }}>
                      <input type="checkbox" checked={picked.has(String(c.id))} onChange={() => toggle(String(c.id))} style={{ width: 18, height: 18 }} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                        <span style={{ ...GM, fontSize: 11, color: SLATE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.email}</span>
                      </span>
                      {c.account?.connected === true && (
                        <span style={{ ...GM, fontSize: 9, padding: "2px 7px", borderRadius: 999, background: "#E6F4EA", color: "#17703C", whiteSpace: "nowrap" }}>Accepted</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
              <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0" }} aria-live="polite">{chosen.length} selected</p>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "9px 18px", background: "#FFFFFF", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={saving}
            style={{ ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: saving ? SILVER : AZURE, border: "none", borderRadius: 8, padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Creating…" : chosen.length > 0 ? `Create Group with ${String(chosen.length)}` : "Create Group"}
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
