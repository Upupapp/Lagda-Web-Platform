// /app/workspace/members — Member directory.
// Search, filter by status/role/team, sort, multi-select bulk actions.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceMemberSummary, WorkspaceMemberStatus, WorkspaceRoleId, WorkspaceTeamId } from "../../../models/workspace-admin";
import { WORKSPACE_MEMBER_STATUS_LABELS } from "../../../models/workspace-admin";

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

function MemberRow({ member, selected, onToggle }: { member: WorkspaceMemberSummary; selected: boolean; onToggle: () => void }) {
  const badge = STATUS_BADGE[member.status];
  return (
    <tr style={{ borderBottom: "1px solid #F0F2F5", background: selected ? "#F0F7FF" : undefined }}>
      <td style={{ padding: "10px 12px 10px 16px", width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${member.displayName}`}
          style={{ cursor: "pointer" }} />
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={member.displayName} />
          <div>
            <Link to={`/app/workspace/members/${member.id}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none" }}>
              {member.displayName}
              {member.isOwner && <span style={{ ...GM, fontSize: 10, marginLeft: 6, color: AZURE }}>OWNER</span>}
            </Link>
            <div style={{ ...GM, fontSize: 11, color: SLATE }}>{member.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ ...GM, fontSize: 11, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color }}>
          {WORKSPACE_MEMBER_STATUS_LABELS[member.status]}
        </span>
      </td>
      <td style={{ padding: "10px 12px", ...GF, fontSize: 13, color: SLATE }}>{member.roleName}</td>
      <td style={{ padding: "10px 12px", ...GM, fontSize: 11, color: SILVER }}>
        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-PH") : "—"}
      </td>
      <td style={{ padding: "10px 12px" }}>
        <Link to={`/app/workspace/members/${member.id}`}
          style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none" }}>
          View →
        </Link>
      </td>
    </tr>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [roleId, setRoleId] = useState<string>(searchParams.get("role") ?? "all");
  const [sort, setSort] = useState<string>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 280);

  useEffect(() => {
    asyncLoadMembers({
      search: debouncedSearch || undefined,
      status: status !== "all" ? (status as WorkspaceMemberStatus) : "all",
      roleId: roleId !== "all" ? roleId : undefined,
      sort:   sort as "name",
      dir,
    });
  }, [asyncLoadMembers, debouncedSearch, status, roleId, sort, dir]);

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
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Members</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Member Directory</h1>
          <Link to="/app/workspace/invitations"
            style={{ ...GF, fontSize: 13, fontWeight: 600, background: AZURE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 18px", textDecoration: "none", cursor: "pointer" }}>
            + Invite Member
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1060, margin: "24px auto 0", padding: "0 24px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input type="search" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 14px", border: "1.5px solid #D1D9E0", borderRadius: 8, flex: "1 1 220px", minWidth: 160, outline: "none" }}
            aria-label="Search members" />
          <select value={status} onChange={e => setStatus(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}
            aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <select value={roleId} onChange={e => setRoleId(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "8px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}
            aria-label="Filter by role">
            <option value="all">All roles</option>
            {SYSTEM_ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
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
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table role="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ borderBottom: "2px solid #E3E8EF", background: "#F8FAFC" }}>
                  <tr>
                    <th style={{ padding: "10px 12px 10px 16px", width: 40 }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all members" />
                    </th>
                    {sortHeader("name",       "Member")}
                    {sortHeader("status",     "Status")}
                    {sortHeader("role",       "Role")}
                    {sortHeader("joinedAt",   "Joined")}
                    <th style={{ padding: "10px 12px", width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {state.members.map(m => (
                    <MemberRow key={m.id} member={m} selected={selected.has(m.id)} onToggle={() => toggleOne(m.id)} />
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
      </div>
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
