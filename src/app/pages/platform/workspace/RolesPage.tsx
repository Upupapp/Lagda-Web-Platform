// /app/workspace/roles — Roles directory.
// System roles (read-only) and custom roles (editable). Create new custom role.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceRoleCreateInput, WorkspacePermission } from "../../../models/workspace-admin";
import { ALL_PERMISSIONS } from "../../../models/workspace-admin";
import { Z } from "../../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function CreateRoleModal({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { asyncCreateRole, asyncLoadRoles } = useWorkspaceAdmin();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<Set<WorkspacePermission>>(new Set());
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const togglePerm = (p: WorkspacePermission) => {
    const s = new Set(perms);
    if (s.has(p)) s.delete(p); else s.add(p);
    setPerms(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) { setNameError("Role name is required."); return; }
    setSaving(true);
    await asyncCreateRole({ name: name.trim(), description: description.trim(), permissions: Array.from(perms) });
    await asyncLoadRoles(true);
    setSaving(false);
    onDone();
  };

  const categories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="create-role-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal, overflowY: "auto", padding: "24px" }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 600, width: "100%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="create-role-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 18px" }}>Create custom role</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Role name <span aria-hidden style={{ color: "#DC2626" }}>*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required aria-required="true"
              placeholder="e.g. Document Preparer"
              style={{ ...GF, fontSize: 13, padding: "9px 12px", border: `1.5px solid ${nameError ? "#EF4444" : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
            {nameError && <p role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", margin: "4px 0 0" }}>{nameError}</p>}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this role can do"
              style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              Permissions ({perms.size} selected)
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1.5px solid #E3E8EF", borderRadius: 10, padding: "12px 16px" }}>
              {categories.map(cat => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{cat}</div>
                  {ALL_PERMISSIONS.filter(p => p.category === cat).map(p => (
                    <label key={p.permission} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={perms.has(p.permission)} onChange={() => togglePerm(p.permission)} style={{ marginTop: 2 }} />
                      <div>
                        <span style={{ ...GF, fontSize: 12, fontWeight: 600, color: NAVY }}>{p.label}</span>
                        <span style={{ ...GF, fontSize: 11, color: SLATE, marginLeft: 6 }}>{p.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onCancel}
              style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creating…" : "Create role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleCard({ role, isSystem }: { role: { id: string; name: string; type: string; status: string; memberCount: number; isOwnerRole: boolean }; isSystem: boolean }) {
  return (
    <Link to={`/app/workspace/roles/${role.id}`} style={{ textDecoration: "none" }}>
      <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "border-color 0.15s", opacity: role.status === "archived" ? 0.65 : 1 }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = AZURE)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#E3E8EF")}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY }}>{role.name}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
              <span style={{ ...GM, fontSize: 10, padding: "2px 7px", borderRadius: 999, background: isSystem ? "#EBF4FC" : "#F0FDF4", color: isSystem ? AZURE : "#166534" }}>
                {isSystem ? "System" : "Custom"}
              </span>
              {role.status === "archived" && (
                <span style={{ ...GM, fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
              {role.isOwnerRole && (
                <span style={{ ...GM, fontSize: 10, padding: "2px 7px", borderRadius: 999, background: LIGHT, color: AZURE }}>Owner</span>
              )}
            </div>
          </div>
          <div style={{ ...GM, fontSize: 11, color: AZURE, flexShrink: 0 }}>
            {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
          </div>
        </div>
      </div>
    </Link>
  );
}

function RolesInner() {
  const { state, asyncLoadRoles } = useWorkspaceAdmin();
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { asyncLoadRoles(showArchived); }, [asyncLoadRoles, showArchived]);

  const systemRoles = state.roles.filter(r => r.type === "system");
  const customActive = state.roles.filter(r => r.type === "custom" && r.status === "active");
  const customArchived = state.roles.filter(r => r.type === "custom" && r.status === "archived");

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {showModal && <CreateRoleModal onDone={() => setShowModal(false)} onCancel={() => setShowModal(false)} />}

      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>Roles</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ ...GF, fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>Roles & Permissions</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", ...GF, fontSize: 12, color: SLATE }}>
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <button onClick={() => setShowModal(true)}
              style={{ ...GF, fontSize: 13, fontWeight: 600, background: AZURE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>
              + Create Custom Role
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "24px auto 0", padding: "0 24px" }}>
        {state.rolesLoading ? (
          <div aria-busy="true" style={{ textAlign: "center", padding: "48px", ...GF, fontSize: 13, color: SLATE }}>Loading roles…</div>
        ) : (
          <>
            {/* System roles */}
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>System roles</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {systemRoles.map(r => <RoleCard key={r.id} role={r} isSystem />)}
            </div>

            {/* Custom roles */}
            <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>Custom roles</h2>
            {customActive.length === 0 ? (
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "32px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 10px" }}>No custom roles yet.</p>
                <button onClick={() => setShowModal(true)}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer" }}>
                  Create the first custom role
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: showArchived && customArchived.length > 0 ? 16 : 0 }}>
                {customActive.map(r => <RoleCard key={r.id} role={r} isSystem={false} />)}
              </div>
            )}

            {showArchived && customArchived.length > 0 && (
              <>
                <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 12px" }}>Archived custom roles</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {customArchived.map(r => <RoleCard key={r.id} role={r} isSystem={false} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function RolesPage() {
  return (
    <WorkspaceAdminProvider>
      <RolesInner />
    </WorkspaceAdminProvider>
  );
}
