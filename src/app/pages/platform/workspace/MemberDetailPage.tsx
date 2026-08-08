// /app/workspace/members/:memberId — Member detail.
// Shows profile, effective permissions, role/team assignment, lifecycle actions.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceMemberId, WorkspaceMemberStatus, WorkspaceRoleId, WorkspaceTeamId, WorkspacePermission } from "../../../models/workspace-admin";
import { WORKSPACE_MEMBER_STATUS_LABELS, ALL_PERMISSIONS } from "../../../models/workspace-admin";
import { mockWorkspaceAdminService } from "../../../services/mock/workspace-admin.service";
import { Z } from "../../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const GOLD  = "#C9960C";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

const STATUS_BADGE: Record<WorkspaceMemberStatus, { bg: string; color: string }> = {
  "active":             { bg: "#E8F5E9", color: "#1B5E20" },
  "suspended":          { bg: "#FFF3E0", color: "#E65100" },
  "deactivated":        { bg: "#F1F5F9", color: "#475569" },
  "pending-invitation": { bg: "#EBF4FC", color: "#0078D4" },
};

const SYSTEM_ROLES = [
  { id: "role_owner",            name: "Owner" },
  { id: "role_administrator",    name: "Administrator" },
  { id: "role_sender",           name: "Sender" },
  { id: "role_reviewer_auditor", name: "Reviewer / Auditor" },
  { id: "role_member",           name: "Member" },
  { id: "role_billing_admin",    name: "Billing Administrator" },
  { id: "role_security_admin",   name: "Security Administrator" },
  { id: "role_template_manager", name: "Template Manager" },
  { id: "role_contact_manager",  name: "Contact Manager" },
];

function SuspendModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="suspend-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="suspend-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>Suspend member</h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px" }}>
          The member will lose access immediately. You can reactivate them at any time.
        </p>
        <label style={{ ...GM, fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Reason (optional)
        </label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="Describe the reason for suspension…"
          style={{ ...GF, fontSize: 13, width: "100%", border: "1.5px solid #D1D9E0", borderRadius: 8, padding: "10px 12px", marginTop: 6, resize: "vertical", boxSizing: "border-box", outline: "none" }} />
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)}
            style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: "#E65100", color: "#FFFFFF", cursor: "pointer" }}>
            Suspend member
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, confirmColor, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="confirm-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>{title}</h2>
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 20px" }}>{body}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: confirmColor, color: "#FFFFFF", cursor: "pointer" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberDetailInner() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const {
    state, asyncLoadMember, clearActiveMember,
    asyncSuspendMember, asyncReactivateMember, asyncDeactivateMember, asyncRemoveMember,
    asyncUpdateMemberRole, asyncLoadRoles,
  } = useWorkspaceAdmin();

  const [modal, setModal] = useState<"suspend" | "deactivate" | "remove" | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [roleUpdating, setRoleUpdating] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    asyncLoadMember(memberId as WorkspaceMemberId);
    asyncLoadRoles();
    return () => clearActiveMember();
  }, [memberId, asyncLoadMember, asyncLoadRoles, clearActiveMember]);

  useEffect(() => {
    if (state.activeMember) setNewRoleId(state.activeMember.roleId);
  }, [state.activeMember?.roleId]);

  const handleSuspend = async (reason: string) => {
    if (!memberId) return;
    setModal(null);
    await asyncSuspendMember(memberId as WorkspaceMemberId, reason);
    await asyncLoadMember(memberId as WorkspaceMemberId);
  };

  const handleReactivate = async () => {
    if (!memberId) return;
    await asyncReactivateMember(memberId as WorkspaceMemberId);
    await asyncLoadMember(memberId as WorkspaceMemberId);
  };

  const handleDeactivate = async () => {
    if (!memberId) return;
    setModal(null);
    await asyncDeactivateMember(memberId as WorkspaceMemberId);
    await asyncLoadMember(memberId as WorkspaceMemberId);
  };

  const handleRemove = async () => {
    if (!memberId) return;
    setModal(null);
    await asyncRemoveMember(memberId as WorkspaceMemberId);
    navigate("/app/workspace/members");
  };

  const handleRoleChange = async () => {
    if (!memberId || !newRoleId) return;
    setRoleUpdating(true);
    const role = [...SYSTEM_ROLES, ...state.roles.map(r => ({ id: r.id, name: r.name }))].find(r => r.id === newRoleId);
    await asyncUpdateMemberRole(memberId as WorkspaceMemberId, newRoleId as WorkspaceRoleId, role?.name ?? newRoleId);
    await asyncLoadMember(memberId as WorkspaceMemberId);
    setRoleUpdating(false);
  };

  if (state.memberLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {[60, 180, 300].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (state.memberError || !state.activeMember) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...GF, fontSize: 14, color: SLATE }}>
          Member not found. <Link to="/app/workspace/members" style={{ color: AZURE }}>Back to Members</Link>
        </p>
      </div>
    );
  }

  const m = state.activeMember;
  const badge = STATUS_BADGE[m.status] ?? STATUS_BADGE["active"];
  const perms = mockWorkspaceAdminService.resolveEffectivePermissions(m);
  const permByCategory = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
    const bucket = acc[p.category] ?? [];
    bucket.push(p);
    acc[p.category] = bucket;
    return acc;
  }, {});
  const allRoles = [
    ...SYSTEM_ROLES,
    ...state.roles.filter(r => r.type === "custom" && r.status === "active").map(r => ({ id: r.id, name: r.name })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {modal === "suspend" && <SuspendModal onConfirm={handleSuspend} onCancel={() => setModal(null)} />}
      {modal === "deactivate" && (
        <ConfirmModal
          title="Deactivate member"
          body={`${m.displayName}'s account will be permanently deactivated. This cannot be reversed without contacting support.`}
          confirmLabel="Deactivate" confirmColor="#991B1B"
          onConfirm={handleDeactivate} onCancel={() => setModal(null)} />
      )}
      {modal === "remove" && (
        <ConfirmModal
          title="Remove member"
          body={`${m.displayName} will be removed from the workspace and lose access to all resources.`}
          confirmLabel="Remove member" confirmColor="#991B1B"
          onConfirm={handleRemove} onCancel={() => setModal(null)} />
      )}

      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/app/workspace/members" style={{ color: AZURE, textDecoration: "none" }}>Members</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>{m.displayName}</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 16, fontWeight: 700, color: AZURE, border: "1.5px solid #BAD7F5" }}>
              {m.avatarInitials}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>{m.displayName}</h1>
                {m.isOwner && <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: LIGHT, color: AZURE }}>OWNER</span>}
                <span style={{ ...GM, fontSize: 10, padding: "3px 9px", borderRadius: 999, background: badge.bg, color: badge.color }}>
                  {WORKSPACE_MEMBER_STATUS_LABELS[m.status]}
                </span>
              </div>
              <div style={{ ...GM, fontSize: 12, color: SLATE, marginTop: 3 }}>{m.email}</div>
            </div>
          </div>
          {!m.isOwner && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {m.status === "active" && (
                <button onClick={() => setModal("suspend")}
                  style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #FDE68A", borderRadius: 8, background: "#FFFBEB", color: "#92400E", cursor: "pointer" }}>
                  Suspend
                </button>
              )}
              {m.status === "suspended" && (
                <button onClick={handleReactivate}
                  style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #BBF7D0", borderRadius: 8, background: "#F0FDF4", color: "#14532D", cursor: "pointer" }}>
                  Reactivate
                </button>
              )}
              {m.status !== "deactivated" && (
                <>
                  <button onClick={() => setModal("deactivate")}
                    style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: "pointer" }}>
                    Deactivate
                  </button>
                  <button onClick={() => setModal("remove")}
                    style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #FECACA", borderRadius: 8, background: "#FEF2F2", color: "#991B1B", cursor: "pointer" }}>
                    Remove
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "24px auto 0", padding: "0 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Left: role + teams */}
        <div style={{ flex: "1 1 460px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Suspension notice */}
          {m.status === "suspended" && m.suspendedReason && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ ...GF, fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Suspended</div>
              <div style={{ ...GF, fontSize: 12, color: "#78350F" }}>{m.suspendedReason}</div>
              {m.suspendedAt && <div style={{ ...GM, fontSize: 11, color: "#A16207", marginTop: 4 }}>{new Date(m.suspendedAt).toLocaleString("en-PH")}</div>}
            </div>
          )}

          {/* Role assignment */}
          {!m.isOwner && (
            <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "18px 20px" }}>
              <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Role</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <select value={newRoleId} onChange={e => setNewRoleId(e.target.value)}
                    style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", width: "100%", cursor: "pointer" }}>
                    {allRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <button onClick={handleRoleChange} disabled={roleUpdating || newRoleId === m.roleId}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: newRoleId !== m.roleId ? AZURE : "#E2E8F0", color: newRoleId !== m.roleId ? "#FFFFFF" : SLATE, cursor: newRoleId !== m.roleId ? "pointer" : "not-allowed" }}>
                  {roleUpdating ? "Saving…" : "Save role"}
                </button>
              </div>
            </section>
          )}

          {/* Team memberships */}
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Teams</h2>
            {m.teamIds.length === 0 ? (
              <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Not assigned to any teams.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {m.teamIds.map(tid => (
                  <Link key={tid} to={`/app/workspace/teams/${tid}`}
                    style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "4px 12px", background: LIGHT, color: AZURE, borderRadius: 999, textDecoration: "none", border: "1px solid #BAD7F5" }}>
                    {tid}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Member info */}
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Details</h2>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
              {[
                { label: "Joined",        value: new Date(m.joinedAt).toLocaleDateString("en-PH") },
                { label: "Last active",   value: m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString("en-PH") : "—" },
                { label: "Invited by",    value: m.invitedByName ?? "—" },
                { label: "User ID",       value: m.userId },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
                  <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Right: effective permissions */}
        <div style={{ flex: "0 0 300px", minWidth: 240 }}>
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Effective permissions</h2>
            <p style={{ ...GM, fontSize: 11, color: SLATE, margin: "0 0 14px" }}>via {perms.roleName}</p>
            {Object.entries(permByCategory).map(([cat, defs]) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{cat}</div>
                {defs.map(d => {
                  const has = perms.permissions.includes(d.permission);
                  return (
                    <div key={d.permission} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: has ? "#1B5E20" : "#CBD5E1" }}>{has ? "✓" : "—"}</span>
                      <span style={{ ...GF, fontSize: 12, color: has ? NAVY : "#CBD5E1" }}>{d.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

export function MemberDetailPage() {
  return (
    <WorkspaceAdminProvider>
      <MemberDetailInner />
    </WorkspaceAdminProvider>
  );
}
