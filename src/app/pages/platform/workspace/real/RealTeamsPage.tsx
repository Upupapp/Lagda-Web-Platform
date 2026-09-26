// /app/workspace/teams with a real backend — teams are the backend's
// organization UNITS (departments, offices, branches and so on).
//
// A unit is a container, never a permission: belonging to one grants
// nothing. Archiving is final on the backend (there is no restore), so this
// page offers none; archived teams stay listable as a record.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realOrganizationService } from "../../../../services/real/organization.service";
import {
  ORGANIZATION_UNIT_KINDS, ORGANIZATION_UNIT_KIND_LABELS,
  type OrganizationUnit, type OrganizationUnitKind,
} from "../../../../models/organization";
import { Dialog, ErrorNote } from "../join/join-ui";
import { buttonStyle, inputStyle, labelStyle, hintStyle } from "../join/join-styles";
import { ManagePage, NotAvailable, LoadingBlock, ErrorBlock, GF, GM, NAVY, SLATE, SILVER } from "./manage-ui";
import { cardStyle, sectionHeadingStyle } from "./manage-styles";
import { errorMessage } from "./manage-format";

const UNIT_NAME_MAX = 120;
const CRUMBS = [{ label: "Manage", to: "/app/workspace" }, { label: "Teams" }];

interface TeamRow extends OrganizationUnit { memberCount: number | null }

function CreateTeamDialog({ workspaceId, units, onClose, onCreated }: {
  workspaceId: string; units: OrganizationUnit[]; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<OrganizationUnitKind>("team");
  const [parent, setParent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed === "") { setError("Enter a name for the team."); return; }
    if (trimmed.length > UNIT_NAME_MAX) { setError(`Keep the name under ${String(UNIT_NAME_MAX)} characters.`); return; }
    setBusy(true);
    setError(null);
    try {
      await realOrganizationService.createUnit(workspaceId, {
        name: trimmed, kind, ...(parent !== "" ? { parentUnitId: parent } : {}),
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "We couldn't create this team. Please try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog title="Create team" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} style={buttonStyle("primary", busy)}>
          {busy ? "Creating…" : "Create team"}
        </button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="team-name" style={labelStyle}>Name</label>
          <input id="team-name" value={name} onChange={e => setName(e.target.value)} maxLength={UNIT_NAME_MAX}
            placeholder="e.g. Finance" style={inputStyle(error !== null && name.trim() === "")} />
        </div>
        <div>
          <label htmlFor="team-kind" style={labelStyle}>Kind</label>
          <select id="team-kind" value={kind} onChange={e => setKind(e.target.value as OrganizationUnitKind)} style={inputStyle()}>
            {ORGANIZATION_UNIT_KINDS.map(k => <option key={k} value={k}>{ORGANIZATION_UNIT_KIND_LABELS[k]}</option>)}
          </select>
        </div>
        {units.length > 0 && (
          <div>
            <label htmlFor="team-parent" style={labelStyle}>Part of (optional)</label>
            <select id="team-parent" value={parent} onChange={e => setParent(e.target.value)} style={inputStyle()}>
              <option value="">Nothing — a top-level team</option>
              {units.map(u => <option key={u.unitId} value={u.unitId}>{u.name}</option>)}
            </select>
            <p style={hintStyle}>For example, a team inside a department.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function TeamCard({ team, parentName }: { team: TeamRow; parentName: string | null }) {
  const archived = team.archivedAt !== null;
  return (
    <Link to={`/app/workspace/teams/${encodeURIComponent(team.unitId)}`} data-testid={`team-${team.unitId}`}
      style={{ textDecoration: "none", minWidth: 0 }}>
      <div style={{ ...cardStyle, padding: "16px 18px", height: "100%", opacity: archived ? 0.75 : 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY, overflowWrap: "anywhere" }}>{team.name}</div>
            <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3 }}>
              {ORGANIZATION_UNIT_KIND_LABELS[team.kind] ?? team.kind}
              {parentName && <> · in {parentName}</>}
            </div>
          </div>
          {archived && (
            <span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#F1F5F9", color: "#475569", flexShrink: 0 }}>Archived</span>
          )}
        </div>
        <div style={{ marginTop: 10, ...GF, fontSize: 12, color: SILVER }}>
          {team.memberCount === null ? "Members: —" : `${String(team.memberCount)} ${team.memberCount === 1 ? "member" : "members"}`}
        </div>
      </div>
    </Link>
  );
}

export function RealTeamsPage({ workspaceId }: { workspaceId: string }) {
  const access = useWorkspaceAccess();
  const [teams, setTeams] = useState<TeamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const canView = access.can("unit.view");
  const canCreate = access.can("unit.create");

  const load = useCallback(async () => {
    setError(null);
    try {
      const units = await realOrganizationService.listUnits(workspaceId);
      // One small request per team for its headcount. A workspace's org
      // chart is a handful of rows, and the backend has no count route.
      const counts = await Promise.all(units.map(u =>
        realOrganizationService.listMembers(workspaceId, u.unitId).then(m => m.length).catch(() => null)));
      setTeams(units.map((u, i) => ({ ...u, memberCount: counts[i] ?? null })));
    } catch (err) {
      setError(errorMessage(err, "We couldn't load the teams."));
    }
  }, [workspaceId]);

  useEffect(() => { if (canView) void load(); }, [load, canView]);

  if (!canView) {
    return <NotAvailable crumbs={CRUMBS} title="Teams" message="Your role does not include seeing this workspace's teams." />;
  }

  const byId = new Map((teams ?? []).map(t => [t.unitId, t.name]));
  const active = (teams ?? []).filter(t => t.archivedAt === null).sort((a, b) => a.name.localeCompare(b.name));
  const archived = (teams ?? []).filter(t => t.archivedAt !== null).sort((a, b) => a.name.localeCompare(b.name));
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", gap: 14 } as const;

  return (
    <ManagePage crumbs={CRUMBS} title="Teams" maxWidth={900}
      actions={<>
        {archived.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", ...GF, fontSize: 12, color: SLATE, minHeight: 36 }}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        )}
        {canCreate && (
          <button type="button" onClick={() => setCreating(true)} style={buttonStyle("primary")}>+ Create team</button>
        )}
      </>}>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 16px", lineHeight: 1.6 }}>
        Teams show how your people are organised: departments, offices, branches and other groups.
        Being in a team does not change what someone can do; their role does that.
      </p>
      {error ? <ErrorBlock message={error} onRetry={() => void load()} />
        : teams === null ? <LoadingBlock label="Loading teams…" />
        : active.length === 0 && archived.length === 0 ? (
          <div style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ ...GF, fontSize: 15, color: SLATE, margin: 0 }}>No teams yet.</p>
            {canCreate && (
              <button type="button" onClick={() => setCreating(true)} style={{ ...buttonStyle("link"), marginTop: 8 }}>Create the first team</button>
            )}
          </div>
        ) : (
          <>
            {active.length === 0
              ? <p style={{ ...GF, fontSize: 14, color: SLATE }}>No active teams.</p>
              : <div style={grid}>{active.map(t => <TeamCard key={t.unitId} team={t} parentName={t.parentUnitId ? byId.get(t.parentUnitId) ?? null : null} />)}</div>}
            {showArchived && archived.length > 0 && (
              <>
                <h2 style={{ ...sectionHeadingStyle, margin: "24px 0 12px" }}>Archived</h2>
                <div style={grid}>{archived.map(t => <TeamCard key={t.unitId} team={t} parentName={t.parentUnitId ? byId.get(t.parentUnitId) ?? null : null} />)}</div>
              </>
            )}
          </>
        )}
      {creating && (
        <CreateTeamDialog workspaceId={workspaceId} units={active} onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); void load(); }} />
      )}
      {canCreate && (
        <p style={{ ...GF, fontSize: 12, color: SILVER, marginTop: 20 }}>
          Archived teams stay on record and cannot be reopened.
        </p>
      )}
    </ManagePage>
  );
}
