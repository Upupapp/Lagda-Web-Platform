// /app/workspace/roles/:roleId — Role detail.
// Shows role info, permission matrix, member count, edit/archive for custom roles.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceRoleId, WorkspacePermission } from "../../../models/workspace-admin";
import { ALL_PERMISSIONS, WORKSPACE_ROLE_TYPE_LABELS } from "../../../models/workspace-admin";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function EditRoleModal({ name, description, permissions, onSave, onCancel }: {
  name: string; description: string; permissions: WorkspacePermission[];
  onSave: (name: string, description: string, permissions: WorkspacePermission[]) => void;
  onCancel: () => void;
}) {
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  const [perms, setPerms] = useState<Set<WorkspacePermission>>(new Set(permissions));
  const categories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));

  const togglePerm = (p: WorkspacePermission) => {
    const s = new Set(perms);
    if (s.has(p)) s.delete(p); else s.add(p);
    setPerms(s);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="edit-role-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "24px" }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 600, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="edit-role-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 18px" }}>Edit role</h2>
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Role name</label>
          <input value={n} onChange={e => setN(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Description</label>
          <input value={d} onChange={e => setD(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Permissions ({perms.size} selected)
        </div>
        <div style={{ maxHeight: 280, overflowY: "auto", border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{cat}</div>
              {ALL_PERMISSIONS.filter(p => p.category === cat).map(p => (
                <label key={p.permission} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={perms.has(p.permission)} onChange={() => togglePerm(p.permission)} style={{ marginTop: 2 }} />
                  <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY }}>{p.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>Cancel</button>
          <button onClick={() => onSave(n, d, Array.from(perms))} disabled={!n.trim()}
            style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleDetailInner() {
  const { roleId } = useParams<{ roleId: string }>();
  const { state, asyncLoadRole, clearActiveRole, asyncUpdateRole, asyncArchiveRole, asyncRestoreRole } = useWorkspaceAdmin();
  const [editing, setEditing] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!roleId) return;
    asyncLoadRole(roleId as WorkspaceRoleId);
    return () => clearActiveRole();
  }, [roleId, asyncLoadRole, clearActiveRole]);

  const reload = () => { if (roleId) asyncLoadRole(roleId as WorkspaceRoleId); };

  const handleSaveEdit = async (name: string, description: string, permissions: WorkspacePermission[]) => {
    if (!roleId) return;
    await asyncUpdateRole(roleId as WorkspaceRoleId, { name, description, permissions });
    setEditing(false);
    reload();
  };

  const handleArchiveToggle = async () => {
    if (!roleId || !state.activeRole) return;
    setActing(true);
    if (state.activeRole.status === "archived") {
      await asyncRestoreRole(roleId as WorkspaceRoleId);
    } else {
      await asyncArchiveRole(roleId as WorkspaceRoleId);
    }
    reload();
    setActing(false);
  };

  if (state.roleLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {[60, 200, 300].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (state.roleError || !state.activeRole) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...GF, color: SLATE }}>Role not found. <Link to="/app/workspace/roles" style={{ color: AZURE }}>Back to Roles</Link></p>
      </div>
    );
  }

  const role = state.activeRole;
  const permByCategory = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
    const bucket = acc[p.category] ?? [];
    bucket.push(p);
    acc[p.category] = bucket;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {editing && (
        <EditRoleModal
          name={role.name} description={role.description}
          permissions={role.permissions}
          onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
      )}

      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/app/workspace/roles" style={{ color: AZURE, textDecoration: "none" }}>Roles</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>{role.name}</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>{role.name}</h1>
              <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: role.type === "system" ? "#EBF4FC" : "#F0FDF4", color: role.type === "system" ? AZURE : "#166534" }}>
                {WORKSPACE_ROLE_TYPE_LABELS[role.type]}
              </span>
              {role.status === "archived" && (
                <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
            </div>
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "5px 0 0" }}>{role.description}</p>
          </div>
          {role.isEditable && (
            <div style={{ display: "flex", gap: 8 }}>
              {role.status === "active" && (
                <button onClick={() => setEditing(true)}
                  style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
                  Edit
                </button>
              )}
              <button onClick={handleArchiveToggle} disabled={acting}
                style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: acting ? "not-allowed" : "pointer", color: SLATE }}>
                {acting ? "…" : role.status === "archived" ? "Restore" : "Archive"}
              </button>
            </div>
          )}
          {!role.isEditable && (
            <span style={{ ...GM, fontSize: 11, color: SILVER, padding: "8px 14px", border: "1.5px solid #E3E8EF", borderRadius: 8, background: "#F8FAFC" }}>
              System roles cannot be edited
            </span>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "24px auto 0", padding: "0 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Permission matrix */}
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Permissions ({role.permissions.length} / {ALL_PERMISSIONS.length})
            </h2>
            {Object.entries(permByCategory).map(([cat, defs]) => (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #F0F2F5" }}>
                  {cat}
                </div>
                {defs.map(d => {
                  const has = role.permissions.includes(d.permission);
                  return (
                    <div key={d.permission} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6, opacity: has ? 1 : 0.4 }}>
                      <span style={{ fontSize: 12, color: has ? "#16A34A" : "#CBD5E1", marginTop: 1, flexShrink: 0 }}>{has ? "✓" : "✗"}</span>
                      <div>
                        <span style={{ ...GF, fontSize: 12, fontWeight: has ? 600 : 400, color: NAVY }}>{d.label}</span>
                        <span style={{ ...GF, fontSize: 11, color: SLATE, marginLeft: 6 }}>{d.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        </div>

        {/* Side info */}
        <div style={{ flex: "0 0 220px", minWidth: 200 }}>
          <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px" }}>
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Details</h2>
            <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Type",        value: WORKSPACE_ROLE_TYPE_LABELS[role.type] },
                { label: "Status",      value: role.status.charAt(0).toUpperCase() + role.status.slice(1) },
                { label: "Members",     value: String(role.memberCount) },
                { label: "Editable",    value: role.isEditable ? "Yes" : "No (system)" },
                ...(role.createdAt ? [{ label: "Created", value: new Date(role.createdAt).toLocaleDateString("en-PH") }] : []),
                ...(role.archivedAt ? [{ label: "Archived", value: new Date(role.archivedAt).toLocaleDateString("en-PH") }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
                  <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {role.memberCount > 0 && (
            <div style={{ marginTop: 12, background: LIGHT, border: "1.5px solid #BAD7F5", borderRadius: 10, padding: "12px 16px" }}>
              <p style={{ ...GF, fontSize: 12, color: AZURE, margin: 0 }}>
                {role.memberCount} member{role.memberCount !== 1 ? "s" : ""} assigned this role.
              </p>
              <Link to="/app/workspace/members" style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none", display: "inline-block", marginTop: 6 }}>
                View members →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoleDetailPage() {
  return (
    <WorkspaceAdminProvider>
      <RoleDetailInner />
    </WorkspaceAdminProvider>
  );
}
