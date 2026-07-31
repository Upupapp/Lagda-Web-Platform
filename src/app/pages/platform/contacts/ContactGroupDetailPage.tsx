// /app/contacts/groups/:groupId — Contact group detail.
// Shows group info, member list, add/remove contacts. Archive/restore group.
// Frontend-only demonstration. No real persistence.
// Burgundy never used. eNotary never referenced.

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ContactProvider, useContacts } from "../../../context/ContactContext";
import { mockContactService } from "../../../services/mock/contacts.service";
import type { ContactGroup, ContactGroupId, ContactListItem } from "../../../models/contacts";
import { CONTACT_SCOPE_LABELS } from "../../../models/contacts";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function InitialsAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0, userSelect: "none" }}>
      {initials}
    </div>
  );
}

function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { state, asyncLoadGroups, asyncAddContactsToGroup, asyncRemoveContactsFromGroup, asyncArchiveGroup, asyncRestoreGroup } = useContacts();
  // getGroup returns the lighter list projection, not full Contact records.
  const [groupData, setGroupData] = useState<{ group: ContactGroup; members: ContactListItem[] } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [removing,  setRemoving]  = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    mockContactService.getGroup(groupId as ContactGroupId).then(res => {
      setGroupData(res);
      setLoading(false);
    });
  }, [groupId]);

  // Reload after mutation
  const reload = async () => {
    if (!groupId) return;
    const res = await mockContactService.getGroup(groupId as ContactGroupId);
    setGroupData(res);
  };

  const handleRemove = async (contactId: string) => {
    if (!groupId) return;
    setRemoving(prev => new Set(prev).add(contactId));
    await asyncRemoveContactsFromGroup(groupId as ContactGroupId, [contactId as ContactId]);
    await reload();
    setRemoving(prev => { const s = new Set(prev); s.delete(contactId); return s; });
  };

  const handleArchiveToggle = async () => {
    if (!groupId || !groupData) return;
    setArchiving(true);
    if (groupData.group.status === "archived") {
      await asyncRestoreGroup(groupId as ContactGroupId);
    } else {
      await asyncArchiveGroup(groupId as ContactGroupId);
    }
    await reload();
    setArchiving(false);
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
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>{group.name}</h1>
              <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: group.scope === "workspace" ? "#EBF4FC" : "#F8FAFC", color: group.scope === "workspace" ? AZURE : SLATE }}>
                {CONTACT_SCOPE_LABELS[group.scope]}
              </span>
              {group.status === "archived" && (
                <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
            </div>
            {group.description && <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>{group.description}</p>}
          </div>
          <button onClick={handleArchiveToggle} disabled={archiving}
            style={{ ...GF, fontSize: 13, color: SLATE, border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "8px 16px", background: "#FFFFFF", cursor: archiving ? "not-allowed" : "pointer" }}>
            {archiving ? "…" : group.status === "archived" ? "Restore Group" : "Archive Group"}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 24px" }}>
        {/* Members */}
        <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F2F5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Members ({members.length})
            </h2>
            <Link to={`/app/contacts?group=${groupId}`}
              style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none", fontWeight: 600 }}>
              Add contacts →
            </Link>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 14, color: SLATE }}>No members yet.</p>
              <Link to="/app/contacts" style={{ ...GF, fontSize: 13, color: AZURE, textDecoration: "none", fontWeight: 600 }}>Browse contacts</Link>
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
                  </div>
                  <button onClick={() => handleRemove(c.id)} disabled={removing.has(c.id)} aria-label={`Remove ${c.name} from group`}
                    style={{ ...GF, fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: removing.has(c.id) ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: 6, opacity: removing.has(c.id) ? 0.5 : 1 }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function ContactGroupDetailPage() {
  return (
    <ContactProvider>
      <GroupDetail />
    </ContactProvider>
  );
}

type ContactId = import("../../../models/contacts").ContactId;
