// /app/workspace/members — Member directory.
// Search, filter by status/role/team, sort, multi-select bulk actions.
//
// 078: owners and administrators can edit a member's role title and
// privileges, and see a short summary of join requests and join links that
// leads to their own pages (/app/workspace/join-requests, /join-links). An
// approved person with no title shows as "New Comer".
//
// With a real backend there is no suspend or deactivate (a membership exists
// or it does not), no bulk action, and the role filter speaks the backend's
// seven roles. No Burgundy. No eNotary.

import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import { usePlatform } from "../../../context/PlatformContext";
import { useViewport } from "../../../hooks/useViewport";
import { USE_REAL_BACKEND } from "../../../services/backend-flag";
import type { WorkspaceMemberSummary, WorkspaceMemberStatus } from "../../../models/workspace-admin";
import {
  WORKSPACE_MEMBER_STATUS_LABELS, memberRoleLabel, effectivePrivileges, isOwnerOrAdministratorRole,
} from "../../../models/workspace-admin";
import { updateMemberAccess, listJoinRequests, JoinActionError } from "../../../services/real/workspace-join.service";
import { REAL_WORKSPACE_ROLES, REAL_ROLE_LABELS } from "../../../services/real/workspace-admin.service";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { AccessEditor, Dialog, ErrorNote, PrivilegeChips, type AccessDraft } from "./join/join-ui";
import { buttonStyle } from "./join/join-styles";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function useDebounce<T>(value: T, ms: number) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return d;
}

const STATUS_BADGE: Record<WorkspaceMemberStatus, { bg: string; color: string }> = {
  "active":             { bg: "#E8F5E9", color: "#1B5E20" },
  "suspended":          { bg: "#FFF3E0", color: "#E65100" },
  "deactivated":        { bg: "#F1F5F9", color: "#475569" },
  "pending-invitation": { bg: "#EBF4FC", color: "#0078D4" },
};

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0, userSelect: "none" }}>
      {initials}
    </div>
  );
}

function RoleCell({ member }: { member: WorkspaceMemberSummary }) {
  const privileges = effectivePrivileges(member);
  return (
    <div data-testid={`member-access-${member.id}`}>
      <span data-testid={`member-role-${member.id}`} style={{ ...GF, fontSize: 13, color: SLATE, overflowWrap: "anywhere" }}>
        {memberRoleLabel(member)}
      </span>
      <PrivilegeChips privileges={privileges} inherent={privileges.inherent} />
    </div>
  );
}

function MemberRow({ member, selected, onToggle, onEditAccess }: {
  member: WorkspaceMemberSummary; selected: boolean; onToggle?: () => void; onEditAccess?: () => void;
}) {
  const badge = STATUS_BADGE[member.status];
  return (
    <tr style={{ borderBottom: "1px solid #F0F2F5", background: selected ? "#F0F7FF" : undefined }}>
      {onToggle && (
        <td style={{ padding: "10px 12px 10px 16px", width: 40 }}>
          <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${member.displayName}`}
            style={{ cursor: "pointer" }} />
        </td>
      )}
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={member.displayName} />
          <div style={{ minWidth: 0 }}>
            <Link to={`/app/workspace/members/${member.id}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none" }}>
              {member.displayName}
              {member.isOwner && <span style={{ ...GM, fontSize: 10, marginLeft: 6, color: AZURE }}>OWNER</span>}
            </Link>
            <div style={{ ...GM, fontSize: 11, color: SLATE, overflowWrap: "anywhere" }}>{member.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ ...GM, fontSize: 11, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
          {WORKSPACE_MEMBER_STATUS_LABELS[member.status]}
        </span>
      </td>
      <td style={{ padding: "10px 12px", maxWidth: 240 }}><RoleCell member={member} /></td>
      <td style={{ padding: "10px 12px", ...GM, fontSize: 11, color: SILVER, whiteSpace: "nowrap" }}>
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-PH") : "—"}
      </td>
      <td style={{ padding: "10px 12px", whiteSpace: "nowrap", textAlign: "right" }}>
        {onEditAccess && (
          <button type="button" onClick={onEditAccess} aria-label={`Edit access for ${member.displayName}`}
            style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
            Edit access
          </button>
        )}
        <Link to={`/app/workspace/members/${member.id}`}
          style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", padding: "4px 0 4px 8px" }}>
          View →
        </Link>
      </td>
    </tr>
  );
}

function MemberCard({ member, onEditAccess }: { member: WorkspaceMemberSummary; onEditAccess?: () => void }) {
  const badge = STATUS_BADGE[member.status];
  return (
    <li style={{ borderBottom: "1px solid #F0F2F5", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar name={member.displayName} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link to={`/app/workspace/members/${member.id}`} style={{ ...GF, fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: "none", overflowWrap: "anywhere" }}>
            {member.displayName}
            {member.isOwner && <span style={{ ...GM, fontSize: 10, marginLeft: 6, color: AZURE }}>OWNER</span>}
          </Link>
          <div style={{ ...GM, fontSize: 11, color: SLATE, overflowWrap: "anywhere" }}>{member.email}</div>
        </div>
        <span style={{ ...GM, fontSize: 10, padding: "3px 8px", borderRadius: 999, background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}>
          {WORKSPACE_MEMBER_STATUS_LABELS[member.status]}
        </span>
      </div>
      <RoleCell member={member} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {onEditAccess && (
          <button type="button" onClick={onEditAccess} aria-label={`Edit access for ${member.displayName}`} style={buttonStyle("secondary")}>
            Edit access
          </button>
        )}
        <Link to={`/app/workspace/members/${member.id}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none", padding: "8px 4px" }}>
          View →
        </Link>
      </div>
    </li>
  );
}

function EditAccessDialog({ member, workspaceId, onClose, onSaved }: {
  member: WorkspaceMemberSummary; workspaceId: string; onClose: () => void; onSaved: () => void;
}) {
  const inherent = isOwnerOrAdministratorRole(member.roleId);
  const [draft, setDraft] = useState<AccessDraft>({
    roleTitle: member.roleTitle ?? "",
    canRequestDocuments: member.canRequestDocuments === true,
    canAssignSigners: member.canAssignSigners === true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateMemberAccess(workspaceId, member.id, inherent
        ? { roleTitle: draft.roleTitle }
        : { roleTitle: draft.roleTitle, canRequestDocuments: draft.canRequestDocuments, canAssignSigners: draft.canAssignSigners });
      onSaved();
    } catch (err) {
      setError(err instanceof JoinActionError ? err.message : "We couldn't update this member's access.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Edit access — ${member.displayName}`} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void save()} disabled={busy} style={buttonStyle("primary", busy)}>
          {busy ? "Saving…" : "Save"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <AccessEditor value={draft} onChange={setDraft} privilegesInherent={inherent} />
    </Dialog>
  );
}

/** Owner / administrator: how many people are waiting, and where to act. */
function JoinSummaryCard({ workspaceId, onPendingCount }: { workspaceId: string; onPendingCount: (n: number) => void }) {
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    listJoinRequests(workspaceId, "pending")
      .then(list => {
        if (cancelled) return;
        const n = list.filter(r => r.state === "pending").length;
        setPending(n);
        onPendingCount(n);
      })
      .catch(() => { if (!cancelled) setPending(null); });
    return () => { cancelled = true; };
  }, [workspaceId, onPendingCount]);

  const link = { ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none", padding: "8px 0", display: "inline-block" } as const;
  let summary = "People join by a single-use join link or an email invitation, and only after you approve them.";
  if (pending === 0) summary = "No one is waiting for approval.";
  else if (pending !== null) summary = `${String(pending)} ${pending === 1 ? "person is" : "people are"} waiting for approval.`;
  return (
    <section aria-labelledby="joining-heading" data-testid="join-summary"
      style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, marginTop: 24, padding: "16px 20px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ flex: "1 1 240px", minWidth: 0 }}>
        <h2 id="joining-heading" style={{ ...GF, fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Joining this workspace</h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "4px 0 0", lineHeight: 1.5 }}>{summary}</p>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link to="/app/workspace/join-requests" style={link}>Review join requests →</Link>
        <Link to="/app/workspace/join-links" style={link}>Join links →</Link>
      </div>
    </section>
  );
}

const SYSTEM_ROLES = [
  { id: "role_owner",            name: "Owner" },
  { id: "role_administrator",    name: "Administrator" },
  { id: "role_sender",           name: "Sender" },
  { id: "role_reviewer_auditor", name: "Reviewer / Auditor" },
  { id: "role_member",           name: "Member" },
  { id: "role_billing_admin",    name: "Billing Admin" },
  { id: "role_security_admin",   name: "Security Admin" },
  { id: "role_template_manager", name: "Template Manager" },
  { id: "role_contact_manager",  name: "Contact Manager" },
];

function MembersInner() {
  const { state, asyncLoadMembers } = useWorkspaceAdmin();
  const platform = usePlatform();
  const { isNarrow } = useViewport();
  const { isReal } = useWorkspaceMode();
  const roleOptions = isReal
    ? REAL_WORKSPACE_ROLES.map(id => ({ id, name: REAL_ROLE_LABELS[id] }))
    : SYSTEM_ROLES;
  // Join links, join requests and member access are for owners and
  // administrators only; the backend refuses everyone else regardless.
  const canManageJoin = platform.role === "owner" || platform.role === "administrator";
  // The demo build has no real workspace id; its join service ignores it.
  const workspaceId = platform.currentWorkspace?.id ?? (USE_REAL_BACKEND ? null : "demo");
  const [editing, setEditing] = useState<WorkspaceMemberSummary | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  // A real membership is always active: no suspended or deactivated filter.
  const [status, setStatus] = useState<string>(isReal ? "all" : searchParams.get("status") ?? "all");
  const [roleId, setRoleId] = useState<string>(searchParams.get("role") ?? "all");
  const [sort, setSort] = useState<string>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 280);

  useEffect(() => {
    void asyncLoadMembers({
      search: debouncedSearch || undefined,
      status: status !== "all" ? (status as WorkspaceMemberStatus) : "all",
      roleId: roleId !== "all" ? roleId : undefined,
      sort:   sort as "name",
      dir,
    });
  }, [asyncLoadMembers, debouncedSearch, status, roleId, sort, dir]);

  const reloadMembers = useCallback(() => {
    void asyncLoadMembers(state.memberQuery);
  }, [asyncLoadMembers, state.memberQuery]);
  const editAccessFor = (m: WorkspaceMemberSummary) =>
    canManageJoin && workspaceId !== null && !m.isOwner ? () => setEditing(m) : undefined;

  const allIds = state.members.map(m => m.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };
  const toggleOne = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const sortHeader = (field: string, label: string) => (
    <th style={{ padding: "10px 12px", ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", whiteSpace: "nowrap", textAlign: "left" }}
      onClick={() => { if (sort === field) setDir(d => d === "asc" ? "desc" : "asc"); else { setSort(field); setDir("asc"); } }}>
      {label}{sort === field ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: isNarrow ? "16px" : "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Members</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Member Directory</h1>
            {canManageJoin && pendingCount > 0 && (
              <Link to="/app/workspace/join-requests" data-testid="pending-requests-badge"
                style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#8A5A00", background: "#FFF8E1", border: "1px solid #F5D98B", borderRadius: 999, padding: "3px 10px", textDecoration: "none" }}>
                {pendingCount} pending request{pendingCount === 1 ? "" : "s"}
              </Link>
            )}
          </div>
          <Link to="/app/workspace/invitations"
            style={{ ...GF, fontSize: 13, fontWeight: 600, background: AZURE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 18px", textDecoration: "none", cursor: "pointer" }}>
            + Invite Member
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1060, margin: "24px auto 0", padding: isNarrow ? "0 16px" : "0 24px", boxSizing: "border-box" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input type="search" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, flex: "1 1 220px", minWidth: 160, outline: "none" }}
            aria-label="Search members" />
          {!isReal && (
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}
              aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          )}
          <select value={roleId} onChange={e => setRoleId(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}
            aria-label="Filter by role">
            <option value="all">All roles</option>
            {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Bulk bar */}
        {!isReal && selected.size > 0 && (
          <div role="toolbar" aria-label="Bulk actions" style={{ background: NAVY, borderRadius: 10, padding: "10px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ ...GF, fontSize: 13, color: "#FFFFFF", fontWeight: 600 }}>{selected.size} selected</span>
            <span style={{ ...GF, fontSize: 12, color: "#94A3B8", cursor: "pointer" }} onClick={() => setSelected(new Set())}>Clear</span>
            <div style={{ flex: 1 }} />
            <span style={{ ...GF, fontSize: 12, color: "#94A3B8" }}>Bulk actions on selected members (demonstration)</span>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          {state.membersLoading ? (
            <div aria-busy="true" style={{ padding: "32px", textAlign: "center", ...GF, fontSize: 13, color: SLATE }}>Loading members…</div>
          ) : state.members.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 15, color: SLATE, margin: 0 }}>No members match your search.</p>
              <button onClick={() => { setSearch(""); setStatus("all"); setRoleId("all"); }}
                style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer", marginTop: 10 }}>
                Clear filters
              </button>
            </div>
          ) : isNarrow ? (
            <ul aria-label="Members" style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {state.members.map(m => <MemberCard key={m.id} member={m} onEditAccess={editAccessFor(m)} />)}
            </ul>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table role="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ borderBottom: "2px solid #E3E8EF", background: "#F8FAFC" }}>
                  <tr>
                    {!isReal && (
                      <th style={{ padding: "10px 12px 10px 16px", width: 40 }}>
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all members" />
                      </th>
                    )}
                    {sortHeader("name",       "Member")}
                    {sortHeader("status",     "Status")}
                    {sortHeader("role",       "Role")}
                    {sortHeader("joinedAt",   "Joined")}
                    <th style={{ padding: "10px 12px", width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {state.members.map(m => (
                    <MemberRow key={m.id} member={m} selected={selected.has(m.id)} onToggle={isReal ? undefined : () => toggleOne(m.id)}
                      onEditAccess={editAccessFor(m)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!state.membersLoading && state.members.length > 0 && (
          <p style={{ ...GM, fontSize: 11, color: SILVER, marginTop: 10, textAlign: "right" }}>
            {state.members.length} member{state.members.length !== 1 ? "s" : ""}
          </p>
        )}

        {canManageJoin && workspaceId !== null && (
          <JoinSummaryCard workspaceId={workspaceId} onPendingCount={setPendingCount} />
        )}
      </div>

      {editing && workspaceId !== null && (
        <EditAccessDialog member={editing} workspaceId={workspaceId}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reloadMembers(); }} />
      )}
    </div>
  );
}

export function MembersPage() {
  return (
    <WorkspaceAdminProvider>
      <MembersInner />
    </WorkspaceAdminProvider>
  );
}
