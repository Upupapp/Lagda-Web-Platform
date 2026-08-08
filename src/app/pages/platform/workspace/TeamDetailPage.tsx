// /app/workspace/teams/:teamId — Team detail.
// Shows team info, member list, add/remove members, archive/restore.
// Frontend-only demonstration. No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import type { WorkspaceTeamId, WorkspaceMemberId } from "../../../models/workspace-admin";
import { Z } from "../../../utils/z-index";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";
const SILVER= "#8A9BAE";
const LIGHT = "#F0F7FF";

function EditTeamModal({ name, description, onSave, onCancel }: {
  name: string; description: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="edit-team-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="edit-team-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 18px" }}>Edit team</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Team name</label>
          <input value={n} onChange={e => setN(e.target.value)}
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Description</label>
          <textarea value={d} onChange={e => setD(e.target.value)} rows={2}
            style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>Cancel</button>
          <button onClick={() => onSave(n, d)} disabled={!n.trim()}
            style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TeamDetailInner() {
  const { teamId } = useParams<{ teamId: string }>();
  const { state, asyncLoadTeam, asyncLoadMembers, clearActiveTeam, asyncArchiveTeam, asyncRestoreTeam, asyncUpdateTeam, asyncRemoveTeamMembers } = useWorkspaceAdmin();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!teamId) return;
    asyncLoadTeam(teamId as WorkspaceTeamId);
    asyncLoadMembers();
    return () => clearActiveTeam();
  }, [teamId, asyncLoadTeam, asyncLoadMembers, clearActiveTeam]);

  const reload = () => { if (teamId) { asyncLoadTeam(teamId as WorkspaceTeamId); asyncLoadMembers(); } };

  const handleArchive = async () => {
    if (!teamId || !state.activeTeam) return;
    setArchiving(true);
    if (state.activeTeam.team.status === "archived") {
      await asyncRestoreTeam(teamId as WorkspaceTeamId);
    } else {
      await asyncArchiveTeam(teamId as WorkspaceTeamId);
    }
    reload();
    setArchiving(false);
  };

  const handleSaveEdit = async (name: string, description: string) => {
    if (!teamId) return;
    await asyncUpdateTeam(teamId as WorkspaceTeamId, { name, description });
    setEditing(false);
    reload();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!teamId) return;
    setRemoving(prev => new Set(prev).add(memberId));
    await asyncRemoveTeamMembers(teamId as WorkspaceTeamId, [memberId as WorkspaceMemberId]);
    reload();
    setRemoving(prev => { const s = new Set(prev); s.delete(memberId); return s; });
  };

  if (state.teamLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "32px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {[60, 200, 300].map((h, i) => <div key={i} style={{ height: h, background: "#E2E8F0", borderRadius: 12, marginBottom: 16 }} />)}
        </div>
      </div>
    );
  }

  if (state.teamError || !state.activeTeam) {
    return (
      <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ ...GF, color: SLATE }}>Team not found. <Link to="/app/workspace/teams" style={{ color: AZURE }}>Back to Teams</Link></p>
      </div>
    );
  }

  const { team, members } = state.activeTeam;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "0 0 48px" }}>
      {editing && (
        <EditTeamModal
          name={team.name} description={team.description ?? ""}
          onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
      )}

      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E3E8EF", padding: "20px 24px" }}>
        <nav aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <ol style={{ display: "flex", gap: 6, listStyle: "none", margin: 0, padding: 0, ...GF, fontSize: 12, color: SILVER }}>
            <li><Link to="/app/workspace" style={{ color: AZURE, textDecoration: "none" }}>Workspace</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/app/workspace/teams" style={{ color: AZURE, textDecoration: "none" }}>Teams</Link></li>
            <li aria-hidden>›</li>
            <li style={{ color: SLATE }}>{team.name}</li>
          </ol>
        </nav>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ ...GF, fontSize: 20, fontWeight: 800, color: NAVY, margin: 0 }}>{team.name}</h1>
              {team.status === "archived" && (
                <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F1F5F9", color: "#475569" }}>Archived</span>
              )}
            </div>
            {team.description && <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "4px 0 0" }}>{team.description}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {team.status === "active" && (
              <button onClick={() => setEditing(true)}
                style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
                Edit
              </button>
            )}
            <button onClick={handleArchive} disabled={archiving}
              style={{ ...GF, fontSize: 13, padding: "8px 16px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: archiving ? "not-allowed" : "pointer", color: SLATE }}>
              {archiving ? "…" : team.status === "archived" ? "Restore" : "Archive"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 24px" }}>
        {/* Members */}
        <section style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F2F5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Members ({members.length})
            </h2>
            <Link to="/app/workspace/members" style={{ ...GF, fontSize: 12, color: AZURE, textDecoration: "none", fontWeight: 600 }}>
              Browse members →
            </Link>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{ ...GF, fontSize: 14, color: SLATE, margin: 0 }}>No members in this team yet.</p>
            </div>
          ) : (
            <ul role="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {members.map(m => (
                <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #F8FAFC" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 11, fontWeight: 700, color: AZURE, flexShrink: 0 }}>
                    {m.avatarInitials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/app/workspace/members/${m.id}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.displayName}
                    </Link>
                    <span style={{ ...GM, fontSize: 11, color: SLATE }}>{m.roleName}</span>
                  </div>
                  {team.status === "active" && (
                    <button onClick={() => handleRemoveMember(m.id)} disabled={removing.has(m.id)} aria-label={`Remove ${m.displayName} from team`}
                      style={{ ...GF, fontSize: 12, color: "#DC2626", background: "none", border: "none", cursor: removing.has(m.id) ? "not-allowed" : "pointer", padding: "4px 8px", borderRadius: 6, opacity: removing.has(m.id) ? 0.5 : 1 }}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Team info */}
        <section style={{ marginTop: 16, background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "16px 20px" }}>
          <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Details</h2>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
            {[
              { label: "Created",    value: new Date(team.createdAt).toLocaleDateString("en-PH") },
              { label: "Created by", value: team.createdByName },
              { label: "Status",     value: team.status.charAt(0).toUpperCase() + team.status.slice(1) },
              { label: "Members",    value: String(members.length) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</dt>
                <dd style={{ ...GF, fontSize: 13, color: NAVY, margin: "2px 0 0" }}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

export function TeamDetailPage() {
  return (
    <WorkspaceAdminProvider>
      <TeamDetailInner />
    </WorkspaceAdminProvider>
  );
}
