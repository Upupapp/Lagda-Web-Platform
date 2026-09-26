// The Member detail page's real-backend sections: which teams (organization
// units) the person is in, with add/remove for owners and administrators,
// and what their role and privileges let them do.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realOrganizationService } from "../../../../services/real/organization.service";
import { ORGANIZATION_UNIT_KIND_LABELS, type OrganizationUnit } from "../../../../models/organization";
import {
  ABILITY_GROUPS, PRIVILEGE_CAPABILITIES, ROLE_CAPABILITIES, holdsAbility, isBackendWorkspaceRole,
} from "../../../../models/workspace-role-policy";
import { Dialog, ErrorNote } from "../join/join-ui";
import { buttonStyle } from "../join/join-styles";
import { GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle, LIGHT } from "./manage-styles";
import { errorMessage } from "./manage-format";

const headingStyle = { ...GF, fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" } as const;

interface UnitWithMembership { unit: OrganizationUnit; isMember: boolean }

function EditTeamsDialog({ rows, onClose, onSave }: {
  rows: UnitWithMembership[]; onClose: () => void; onSave: (next: Set<string>) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(rows.filter(r => r.isMember).map(r => r.unit.unitId)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function submit() {
    setBusy(true);
    setError(null);
    try { await onSave(selected); } catch (err) {
      setError(errorMessage(err, "Some team changes could not be saved. Please try again."));
      setBusy(false);
    }
  }
  return (
    <Dialog title="Teams" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={buttonStyle("secondary")}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} style={buttonStyle("primary", busy)}>{busy ? "Saving…" : "Save teams"}</button>
      </>}>
      {error && <ErrorNote>{error}</ErrorNote>}
      <fieldset style={{ border: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <legend style={{ ...GF, fontSize: 13, color: SLATE, marginBottom: 8 }}>Choose the teams this person belongs to.</legend>
        {rows.map(r => (
          <label key={r.unit.unitId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", minHeight: 40 }}>
            <input type="checkbox" checked={selected.has(r.unit.unitId)} onChange={() => toggle(r.unit.unitId)} />
            <span style={{ ...GF, fontSize: 14, color: NAVY, overflowWrap: "anywhere" }}>{r.unit.name}</span>
            <span style={{ ...GF, fontSize: 12, color: SILVER, marginLeft: "auto" }}>{ORGANIZATION_UNIT_KIND_LABELS[r.unit.kind] ?? r.unit.kind}</span>
          </label>
        ))}
      </fieldset>
    </Dialog>
  );
}

export function RealMemberTeams({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const access = useWorkspaceAccess();
  const canView = access.can("unit.view");
  const canManage = access.can("unit.member.manage");
  const [rows, setRows] = useState<UnitWithMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const units = (await realOrganizationService.listUnits(workspaceId)).filter(u => u.archivedAt === null);
      const memberships = await Promise.all(units.map(u => realOrganizationService.listMembers(workspaceId, u.unitId)));
      setRows(units.map((unit, i) => ({ unit, isMember: (memberships[i] ?? []).some(m => m.userId === userId) }))
        .sort((a, b) => a.unit.name.localeCompare(b.unit.name)));
    } catch (err) {
      setError(errorMessage(err, "We couldn't load this person's teams."));
    }
  }, [workspaceId, userId]);

  useEffect(() => { if (canView && userId !== "") void load(); }, [load, canView, userId]);

  if (!canView || userId === "") return null;

  const mine = (rows ?? []).filter(r => r.isMember);

  async function save(next: Set<string>) {
    const current = new Set(mine.map(r => r.unit.unitId));
    const adds = [...next].filter(id => !current.has(id));
    const removes = [...current].filter(id => !next.has(id));
    await Promise.all([
      ...adds.map(id => realOrganizationService.addMember(workspaceId, id, { userId })),
      ...removes.map(id => realOrganizationService.removeMember(workspaceId, id, userId)),
    ]);
    setEditing(false);
    await load();
  }

  return (
    <section data-testid="member-teams" style={{ ...cardStyle, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={headingStyle}>Teams</h2>
        {canManage && rows !== null && rows.length > 0 && (
          <button type="button" onClick={() => setEditing(true)} style={buttonStyle("secondary")}>Change teams</button>
        )}
      </div>
      {error ? (
        <p role="alert" style={{ ...GF, fontSize: 13, color: "#991B1B", margin: 0 }}>{error}</p>
      ) : rows === null ? (
        <p aria-busy="true" style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Loading teams…</p>
      ) : mine.length === 0 ? (
        <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>
          Not in any team.{rows.length === 0 && canManage && <> <Link to="/app/workspace/teams" style={{ color: AZURE }}>Create a team</Link> first.</>}
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {mine.map(r => (
            <Link key={r.unit.unitId} to={`/app/workspace/teams/${encodeURIComponent(r.unit.unitId)}`}
              style={{ ...GF, fontSize: 12, fontWeight: 600, padding: "4px 12px", background: LIGHT, color: AZURE, borderRadius: 999, textDecoration: "none", border: "1px solid #BAD7F5" }}>
              {r.unit.name}
            </Link>
          ))}
        </div>
      )}
      {editing && rows !== null && <EditTeamsDialog rows={rows} onClose={() => setEditing(false)} onSave={save} />}
    </section>
  );
}

/** What this person's role and granted privileges let them do. */
export function RealMemberAbilities({ roleId, canRequestDocuments, canAssignSigners }: {
  roleId: string; canRequestDocuments: boolean; canAssignSigners: boolean;
}) {
  if (!isBackendWorkspaceRole(roleId)) return null;
  const caps = [
    ...ROLE_CAPABILITIES[roleId],
    ...(canRequestDocuments ? PRIVILEGE_CAPABILITIES.requestDocuments : []),
    ...(canAssignSigners ? PRIVILEGE_CAPABILITIES.assignSigners : []),
  ];
  return (
    <section data-testid="member-abilities" style={{ ...cardStyle, padding: "18px 20px" }}>
      <h2 style={{ ...headingStyle, marginBottom: 4 }}>What they can do</h2>
      <p style={{ ...GM, fontSize: 11, color: SLATE, margin: "0 0 12px" }}>From their role and privileges</p>
      {ABILITY_GROUPS.map(g => (
        <div key={g.id} style={{ marginBottom: 12 }}>
          <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{g.label}</div>
          {g.abilities.map(a => {
            const has = holdsAbility(caps, a);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 4 }}>
                <span aria-label={has ? "Yes" : "No"} style={{ fontSize: 11, color: has ? "#15803D" : "#CBD5E1" }}>{has ? "✓" : "—"}</span>
                <span style={{ ...GF, fontSize: 12, color: has ? NAVY : "#94A3B8" }}>{a.label}</span>
              </div>
            );
          })}
        </div>
      ))}
      <Link to={`/app/workspace/roles/${roleId}`} style={{ ...GF, fontSize: 12, fontWeight: 600, color: AZURE, textDecoration: "none" }}>About this role →</Link>
    </section>
  );
}
