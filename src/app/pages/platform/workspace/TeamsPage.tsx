// /app/workspace/teams — Teams directory.
// List active/archived teams, create team, quick stats.
// Demo build: the fictional teams below. With a real backend, teams are the
// backend's organization units — see real/RealTeamsPage.tsx.
// No Burgundy. No eNotary.

import React, { useEffect, useState } from "react";
import { WorkspaceAdminProvider, useWorkspaceAdmin } from "../../../context/WorkspaceAdminContext";
import { Z } from "../../../utils/z-index";
import { useWorkspaceMode } from "../../../hooks/useWorkspaceAccess";
import { RealTeamsPage } from "./real/RealTeamsPage";
import { ManagePage } from "./real/manage-ui";
import { TeamBrandCard, TEAM_CARD_STYLES } from "./real/TeamBrandCard";
import { useDocumentCardBranding, type CardBranding } from "../documents/CompletedDocumentCards";

const GF    = { fontFamily: "'Geist', sans-serif" };
const GM    = { fontFamily: "'Geist Mono', monospace" };
const NAVY  = "#07111F";
const AZURE = "#0078D4";
const SLATE = "#64748B";

function CreateTeamModal({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { asyncCreateTeam, asyncLoadTeams } = useWorkspaceAdmin();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    if (!name.trim()) { setNameError("Team name is required."); return; }
    setSaving(true);
    await asyncCreateTeam({ name: name.trim(), description: description.trim() || undefined });
    await asyncLoadTeams(true);
    setSaving(false);
    onDone();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="create-team-title"
      style={{ position: "fixed", inset: 0, background: "rgba(7,17,31,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.modal }}>
      <div style={{ background: "#FFFFFF", borderRadius: 14, padding: "28px 32px", maxWidth: 440, width: "90%", boxShadow: "0 20px 60px rgba(7,17,31,0.22)" }}>
        <h2 id="create-team-title" style={{ ...GF, fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 20px" }}>Create team</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>
              Team name <span aria-hidden style={{ color: "#DC2626" }}>*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Legal Operations"
              required aria-required="true"
              style={{ ...GF, fontSize: 13, padding: "9px 12px", border: `1.5px solid ${nameError ? "#EF4444" : "#D1D9E0"}`, borderRadius: 8, width: "100%", outline: "none", boxSizing: "border-box" }} />
            {nameError && <p role="alert" style={{ ...GF, fontSize: 12, color: "#DC2626", margin: "4px 0 0" }}>{nameError}</p>}
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of this team's purpose"
              style={{ ...GF, fontSize: 13, padding: "9px 12px", border: "1.5px solid #D1D9E0", borderRadius: 8, width: "100%", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onCancel}
              style={{ ...GF, fontSize: 13, padding: "9px 18px", border: "1.5px solid #D1D9E0", borderRadius: 8, background: "#FFFFFF", cursor: "pointer", color: SLATE }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ ...GF, fontSize: 13, fontWeight: 600, padding: "9px 18px", border: "none", borderRadius: 8, background: AZURE, color: "#FFFFFF", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creating…" : "Create team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamCard({ team, branding }: { team: { id: string; name: string; description?: string; status: string; memberCount: number }; branding: CardBranding }) {
  return (
    <TeamBrandCard to={`/app/workspace/teams/${team.id}`} testId={`team-${team.id}`} name={team.name} kind="Team"
      parentName={null} archived={team.status === "archived"} description={team.description ?? null}
      membersLabel={`${String(team.memberCount)} ${team.memberCount === 1 ? "member" : "members"}`}
      initials={[]} extraCount={0} subCount={0} branding={branding} />
  );
}

function TeamsInner() {
  const { state, asyncLoadTeams } = useWorkspaceAdmin();
  const branding = useDocumentCardBranding();
  const [showArchived, setShowArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { void asyncLoadTeams(showArchived); }, [asyncLoadTeams, showArchived]);

  const active   = state.teams.filter(t => t.status === "active");
  const archived = state.teams.filter(t => t.status === "archived");

  return (
    <ManagePage crumbs={[{ label: "Manage", to: "/app/workspace" }, { label: "Teams" }]} title="Teams" maxWidth={1180}
      actions={
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", ...GF, fontSize: 12, color: SLATE }}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          <button onClick={() => setShowModal(true)}
            style={{ ...GF, fontSize: 13, fontWeight: 600, background: AZURE, color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>
            + Create Team
          </button>
        </>
      }>
      <style>{TEAM_CARD_STYLES}</style>
      {showModal && <CreateTeamModal onDone={() => setShowModal(false)} onCancel={() => setShowModal(false)} />}
        {state.teamsLoading ? (
          <div aria-busy="true" style={{ textAlign: "center", padding: "48px", ...GF, fontSize: 13, color: SLATE }}>Loading teams…</div>
        ) : (
          <>
            {active.length === 0 && !showArchived ? (
              <div style={{ background: "#FFFFFF", border: "1.5px solid #E3E8EF", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
                <p style={{ ...GF, fontSize: 15, color: SLATE, margin: "0 0 12px" }}>No active teams yet.</p>
                <button onClick={() => setShowModal(true)}
                  style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, background: "none", border: "none", cursor: "pointer" }}>
                  Create the first team
                </button>
              </div>
            ) : (
              <>
                <ul className="team-grid" aria-label="Teams">
                  {active.map(t => <TeamCard key={t.id} team={t} branding={branding} />)}
                </ul>
                {showArchived && archived.length > 0 && (
                  <>
                    <h2 style={{ ...GF, fontSize: 12, fontWeight: 700, color: SLATE, textTransform: "uppercase", letterSpacing: "0.06em", margin: "24px 0 12px" }}>Archived</h2>
                    <ul className="team-grid" aria-label="Archived teams">
                      {archived.map(t => <TeamCard key={t.id} team={t} branding={branding} />)}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
    </ManagePage>
  );
}

export function TeamsPage() {
  const { isReal, workspaceId } = useWorkspaceMode();
  if (isReal && workspaceId !== null) return <RealTeamsPage key={workspaceId} workspaceId={workspaceId} />;
  return (
    <WorkspaceAdminProvider>
      <TeamsInner />
    </WorkspaceAdminProvider>
  );
}
