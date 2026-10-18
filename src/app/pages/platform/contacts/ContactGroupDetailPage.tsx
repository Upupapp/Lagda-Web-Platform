// /app/contacts/groups/:groupId — Contact group detail.
// The group's name and description, its members, adding and removing contacts, and
// archiving or restoring it. A workspace's own groups are real (they are kept on the
// server); with no workspace open the page shows the demonstration data instead.
// Burgundy never used. eNotary never referenced.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { usePlatform } from "../../../context/PlatformContext";
import {
  getGroup, updateGroup, archiveGroup, restoreGroup, addContactsToGroup, removeContactsFromGroup,
  listContacts, realContactsAvailable,
} from "../../../services/contacts-source";
import type { ContactGroup, ContactGroupId, ContactId, ContactListItem } from "../../../models/contacts";
import { CONTACT_SCOPE_LABELS, DEFAULT_CONTACT_QUERY } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";
const ERROR = "#DC2626";

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0, userSelect: "none" }}>
      {initials}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  ...GF, width: "100%", boxSizing: "border-box", fontSize: 14, color: NAVY, border: "1.5px solid #D1D9E0",
  borderRadius: 8, padding: "9px 12px", background: "#FFFFFF",
};
const outlineButton = (disabled = false): React.CSSProperties => ({
  ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "8px 16px", background: "#FFFFFF",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, minHeight: 36,
});
const primaryButton = (disabled = false): React.CSSProperties => ({
  ...GF, fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: disabled ? SILVER : AZURE, border: "none",
  borderRadius: 8, padding: "8px 18px", cursor: disabled ? "not-allowed" : "pointer", minHeight: 36,
});

/** Contacts that can be added: active, not already in the group, found by name or address. */
function AddContactsPanel({
  workspaceId, group, members, onAdded, onClose,
}: {
  workspaceId: string | undefined; group: ContactGroup; members: ContactListItem[];
  onAdded: () => Promise<void>; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<ContactListItem[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const seq = useRef(0);
  const memberIds = new Set(members.map(m => String(m.id)));

  useEffect(() => {
    const mine = ++seq.current;
    const timer = window.setTimeout(() => {
      listContacts(workspaceId, { ...DEFAULT_CONTACT_QUERY, search, statusFilter: "active", perPage: 25 })
        .then(result => { if (mine === seq.current) setFound(result.items); })
        .catch(() => { if (mine === seq.current) { setFound([]); setProblem("Contacts could not be loaded. Please try again."); } });
    }, 200);
    return () => { window.clearTimeout(timer); };
  }, [search, workspaceId]);

  // A workspace group holds only contacts the whole workspace can see.
  const eligible = (found ?? []).filter(c => !memberIds.has(String(c.id)) && (group.scope === "personal" || c.scope === "workspace"));

  const toggle = (id: string) => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const add = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await addContactsToGroup(workspaceId, group.id, [...picked] as ContactId[]);
      setPicked(new Set());
      await onAdded();
      onClose();
    } catch {
      setProblem("Those contacts could not be added. A workspace group holds only contacts everybody in the workspace can see, and archived contacts cannot be added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="add-contacts-panel" aria-label="Add contacts to this group"
      style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
      <label htmlFor="group-add-search" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
        Find contacts to add
      </label>
      <input id="group-add-search" type="search" value={search} onChange={e => { setSearch(e.target.value); }}
        placeholder="Name, email, organization" style={fieldStyle} autoFocus />
      {problem !== null && <p role="alert" style={{ ...GF, fontSize: 12.5, color: ERROR, margin: "8px 0 0" }}>{problem}</p>}
      <div style={{ marginTop: 10, maxHeight: 280, overflowY: "auto" }}>
        {found === null && <p role="status" style={{ ...GF, fontSize: 13, color: SLATE }}>Loading contacts…</p>}
        {found !== null && eligible.length === 0 && (
          <p data-testid="add-contacts-empty" style={{ ...GF, fontSize: 13, color: SLATE }}>
            {search.trim() === "" ? "Every active contact you can add is already in this group." : "No contacts match that search."}
          </p>
        )}
        <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {eligible.map(c => (
            <li key={c.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 2px", minHeight: 44, cursor: "pointer" }}>
                <input type="checkbox" checked={picked.has(String(c.id))} onChange={() => { toggle(String(c.id)); }} style={{ width: 18, height: 18 }} />
                <InitialsAvatar name={c.name} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...GF, display: "block", fontSize: 13, fontWeight: 600, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  <span style={{ ...GM, fontSize: 11, color: SLATE }}>{c.email}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button type="button" onClick={onClose} style={outlineButton()}>Cancel</button>
        <button type="button" onClick={() => { void add(); }} disabled={busy || picked.size === 0} style={primaryButton(busy || picked.size === 0)}>
          {busy ? "Adding…" : picked.size === 0 ? "Add contacts" : `Add ${String(picked.size)} ${picked.size === 1 ? "contact" : "contacts"}`}
        </button>
      </div>
    </section>
  );
}

function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const platform = usePlatform();
  const workspaceId = platform.currentWorkspace?.id;
  const real = realContactsAvailable(workspaceId);
  // getGroup returns the lighter list projection, not full Contact records.
  const [groupData, setGroupData] = useState<{ group: ContactGroup; members: ContactListItem[] } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [removing,  setRemoving]  = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [name,      setName]      = useState("");
  const [description, setDescription] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [problem,   setProblem]   = useState<string | null>(null);
  const [said,      setSaid]      = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!groupId) return;
    const res = await getGroup(workspaceId, groupId as ContactGroupId);
    setGroupData(res);
  }, [groupId, workspaceId]);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    void getGroup(workspaceId, groupId as ContactGroupId).then(res => {
      setGroupData(res);
      setLoading(false);
    });
  }, [groupId, workspaceId]);

  const handleRemove = async (contactId: string) => {
    if (!groupId) return;
    setRemoving(prev => new Set(prev).add(contactId));
    setProblem(null);
    try {
      await removeContactsFromGroup(workspaceId, groupId as ContactGroupId, [contactId as ContactId]);
      await reload();
    } catch {
      setProblem("That contact could not be removed. Please try again.");
    }
    setRemoving(prev => { const s = new Set(prev); s.delete(contactId); return s; });
  };

  const handleArchiveToggle = async () => {
    if (!groupId || !groupData) return;
    setArchiving(true);
    setProblem(null);
    try {
      if (groupData.group.status === "archived") await restoreGroup(workspaceId, groupId as ContactGroupId);
      else await archiveGroup(workspaceId, groupId as ContactGroupId);
      await reload();
    } catch {
      setProblem("That could not be done right now. Please try again.");
    }
    setArchiving(false);
  };

  const startEdit = () => {
    if (!groupData) return;
    setName(groupData.group.name);
    setDescription(groupData.group.description);
    setProblem(null);
    setSaid(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!groupId) return;
    if (name.trim() === "") { setProblem("Give the group a name."); return; }
    setSaving(true);
    setProblem(null);
    try {
      await updateGroup(workspaceId, groupId as ContactGroupId, name.trim(), description.trim());
      await reload();
      setEditing(false);
      setSaid("The group was updated.");
    } catch {
      setProblem("The group could not be updated. Please try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div aria-busy="true" style={{ maxWidth: 720, margin: "0 auto" }}>
          {[50, 100, 300].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...GF, color: SLATE }}>Group not found. <Link to="/app/contacts/groups" style={{ color: AZURE }}>Back to Groups</Link></p>
      </div>
    );
  }

  const { group, members } = groupData;
  const archived = group.status === "archived";

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/contacts" style={{ color: AZURE, textDecoration: "none" }}>Contacts</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/app/contacts/groups" style={{ color: AZURE, textDecoration: "none" }}>Groups</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>{group.name}</li>
          </ol>
        </nav>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0, overflowWrap: "anywhere" }}>{group.name}</h1>
              <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: group.scope === "workspace" ? "#EBF4FC" : "#F8FAFC", color: group.scope === "workspace" ? AZURE : SLATE }}>
                {CONTACT_SCOPE_LABELS[group.scope]}
              </span>
              {archived && (
                <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
            </div>
            {group.description && <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0, overflowWrap: "anywhere" }}>{group.description}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!archived && <button type="button" onClick={startEdit} disabled={editing} style={outlineButton(editing)}>Rename</button>}
            <button onClick={() => { void handleArchiveToggle(); }} disabled={archiving} style={outlineButton(archiving)}>
              {archiving ? "…" : archived ? "Restore Group" : "Archive Group"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 24px" }}>
        {said !== null && <p role="status" style={{ ...GF, fontSize: 13, fontWeight: 600, color: "#15803D", margin: "0 0 12px" }}>{said}</p>}
        {problem !== null && <p role="alert" style={{ ...GF, fontSize: 13, color: ERROR, margin: "0 0 12px" }}>{problem}</p>}

        {editing && (
          <section aria-label="Rename this group" style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <label htmlFor="group-name" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 }}>Group name</label>
            <input id="group-name" value={name} maxLength={120} onChange={e => { setName(e.target.value); }} style={fieldStyle} />
            <label htmlFor="group-description" style={{ ...GF, display: "block", fontSize: 13, fontWeight: 700, color: NAVY, margin: "12px 0 6px" }}>Description</label>
            <textarea id="group-description" value={description} maxLength={500} rows={2} onChange={e => { setDescription(e.target.value); }} style={{ ...fieldStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" onClick={() => { setEditing(false); setProblem(null); }} style={outlineButton()}>Cancel</button>
              <button type="button" onClick={() => { void saveEdit(); }} disabled={saving} style={primaryButton(saving)}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </section>
        )}

        {adding && !archived && (
          <AddContactsPanel workspaceId={workspaceId} group={group} members={members}
            onAdded={async () => { await reload(); setSaid("The contacts were added."); }} onClose={() => { setAdding(false); }} />
        )}

        {/* Members */}
        <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F2F5", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Members ({members.length})
            </h2>
            {!archived && !adding && (
              <button type="button" onClick={() => { setAdding(true); setSaid(null); setProblem(null); }}
                style={{ ...GF, fontSize: 13, color: AZURE, background: "none", border: "none", cursor: "pointer", fontWeight: 600, minHeight: 36, padding: "0 4px" }}>
                Add contacts
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 14, color: SLATE }}>No members yet.</p>
              {!archived && <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Use <strong>Add contacts</strong> to put people in this group.</p>}
              {archived && <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Restore the group to change who is in it.</p>}
            </div>
          ) : (
            <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {members.map(c => (
                <li key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
                  <InitialsAvatar name={c.name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/app/contacts/${c.id}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </Link>
                    <span style={{ ...GM, fontSize: 11, color: SLATE }}>{c.email}</span>
                    {c.organization && <span style={{ ...GF, fontSize: 11, color: SILVER, marginLeft: 8 }}>{c.organization}</span>}
                    {c.status === "archived" && <span style={{ ...GM, fontSize: 10, marginLeft: 8, color: "#475569" }}>Archived</span>}
                  </div>
                  {!archived && (
                    <button onClick={() => { void handleRemove(c.id); }} disabled={removing.has(c.id)} aria-label={`Remove ${c.name} from group`}
                      style={{ ...GF, fontSize: 12, color: ERROR, background: "none", border: "none", cursor: removing.has(c.id) ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: 6, opacity: removing.has(c.id) ? 0.5 : 1, minHeight: 36 }}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        {real && (
          <p style={{ ...GF, fontSize: 12, color: SILVER, margin: "12px 2px 0" }}>
            {group.scope === "workspace"
              ? "A workspace group is seen by everyone in the workspace, so it holds only contacts they can all see."
              : "A personal group is seen only by you."}
          </p>
        )}
      </div>
    </div>
  );
}

export function ContactGroupDetailPage() {
  return <GroupDetail />;
}
