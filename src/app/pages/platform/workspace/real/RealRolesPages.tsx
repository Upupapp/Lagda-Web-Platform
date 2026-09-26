// "Who can do what" with a real backend — READ-ONLY.
//
// The backend has exactly seven fixed roles and two grantable privileges.
// Nothing here can be created, edited or archived; roles are assigned to
// people on the Members page. The abilities shown are derived from the
// backend's own role → capability policy (models/workspace-role-policy.ts).

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useViewport } from "../../../../hooks/useViewport";
import { useWorkspaceAccess } from "../../../../hooks/useWorkspaceAccess";
import { realWorkspaceAdminService, REAL_ROLE_LABELS, type BackendWorkspaceRole } from "../../../../services/real/workspace-admin.service";
import { memberRoleLabel, type WorkspaceMemberSummary } from "../../../../models/workspace-admin";
import {
  ABILITY_GROUPS, ALL_ABILITIES, PRIVILEGE_LABELS, ROLE_ORDER, ROLE_SUMMARIES,
  abilitiesAddedByPrivilege, isBackendWorkspaceRole, roleHoldsAbility, type WorkspacePrivilegeKey,
} from "../../../../models/workspace-role-policy";
import { ManagePage, LoadingBlock, GF, GM, NAVY, AZURE, SLATE, SILVER, BORDER } from "./manage-ui";
import { cardStyle, sectionHeadingStyle, LIGHT } from "./manage-styles";

const PRIVILEGES: WorkspacePrivilegeKey[] = ["requestDocuments", "assignSigners"];

function Yes() {
  return <span aria-label="Yes" style={{ color: "#15803D", fontWeight: 700 }}>✓</span>;
}
function No() {
  return <span aria-label="No" style={{ color: "#CBD5E1" }}>—</span>;
}

/** The roster, when this person's role may read it; null otherwise. */
function useRoster(workspaceId: string): WorkspaceMemberSummary[] | null | "loading" {
  const access = useWorkspaceAccess();
  const allowed = access.can("membership.view");
  const [roster, setRoster] = useState<WorkspaceMemberSummary[] | null | "loading">(allowed ? "loading" : null);
  useEffect(() => {
    if (!allowed) { setRoster(null); return; }
    let cancelled = false;
    setRoster("loading");
    realWorkspaceAdminService.listMembers(workspaceId)
      .then(list => { if (!cancelled) setRoster(list); })
      .catch(() => { if (!cancelled) setRoster(null); });
    return () => { cancelled = true; };
  }, [workspaceId, allowed]);
  return roster;
}

function countFor(roster: WorkspaceMemberSummary[] | null | "loading", role: BackendWorkspaceRole): number | null {
  return Array.isArray(roster) ? roster.filter(m => m.roleId === role).length : null;
}

function MatrixTable() {
  return (
    <div style={{ ...cardStyle, overflowX: "auto" }}>
      <table data-testid="roles-matrix" style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>What each role can do</caption>
        <thead style={{ background: "#F8FAFC", borderBottom: `2px solid ${BORDER}` }}>
          <tr>
            <th scope="col" style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", padding: "10px 16px" }}>Ability</th>
            {ROLE_ORDER.map(r => (
              <th key={r} scope="col" style={{ ...GF, fontSize: 12, fontWeight: 700, color: NAVY, padding: "10px 6px", textAlign: "center" }}>
                <Link to={`/app/workspace/roles/${r}`} style={{ color: NAVY, textDecoration: "none" }}>{REAL_ROLE_LABELS[r]}</Link>
              </th>
            ))}
          </tr>
        </thead>
        {ABILITY_GROUPS.map(g => (
          <tbody key={g.id}>
            <tr>
              <th scope="colgroup" colSpan={ROLE_ORDER.length + 1} style={{ ...GM, fontSize: 10, color: SLATE, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", padding: "12px 16px 6px", background: "#FFFFFF" }}>{g.label}</th>
            </tr>
            {g.abilities.map(a => (
              <tr key={a.id} style={{ borderTop: "1px solid #F0F2F5" }}>
                <th scope="row" style={{ ...GF, fontSize: 13, fontWeight: 500, color: NAVY, textAlign: "left", padding: "9px 16px" }}>{a.label}</th>
                {ROLE_ORDER.map(r => (
                  <td key={r} style={{ textAlign: "center", padding: "9px 6px", ...GF, fontSize: 13 }}>{roleHoldsAbility(r, a) ? <Yes /> : <No />}</td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function RoleCard({ role, count }: { role: BackendWorkspaceRole; count: number | null }) {
  const held = ALL_ABILITIES.filter(a => roleHoldsAbility(role, a));
  return (
    <li data-testid={`role-card-${role}`} style={{ ...cardStyle, padding: "16px 18px", listStyle: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <Link to={`/app/workspace/roles/${role}`} style={{ ...GF, fontSize: 15, fontWeight: 700, color: NAVY, textDecoration: "none" }}>{REAL_ROLE_LABELS[role]}</Link>
        {count !== null && <span style={{ ...GM, fontSize: 11, color: AZURE }}>{count} {count === 1 ? "member" : "members"}</span>}
      </div>
      <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "4px 0 10px", lineHeight: 1.5 }}>{ROLE_SUMMARIES[role]}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {held.map(a => (
          <li key={a.id} style={{ ...GF, fontSize: 13, color: NAVY, display: "flex", gap: 8 }}><Yes /><span>{a.label}</span></li>
        ))}
        {held.length === 0 && <li style={{ ...GF, fontSize: 13, color: SLATE }}>Can open the workspace only.</li>}
      </ul>
    </li>
  );
}

function PrivilegesSection() {
  return (
    <section aria-labelledby="privileges-heading" style={{ ...cardStyle, padding: "16px 20px", marginTop: 24 }}>
      <h2 id="privileges-heading" style={sectionHeadingStyle}>Privileges</h2>
      <p style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 12px", lineHeight: 1.6 }}>
        Owners and administrators can give any member either privilege on top of their role, from the Members page.
        Owners and administrators already hold both.
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {PRIVILEGES.map(p => (
          <li key={p} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ ...GF, fontSize: 14, fontWeight: 700, color: NAVY }}>{PRIVILEGE_LABELS[p]}</div>
            <div style={{ ...GF, fontSize: 12, color: SLATE, marginTop: 3, lineHeight: 1.5 }}>
              For a New Comer this adds: {abilitiesAddedByPrivilege("member", p).map(a => a.label.toLowerCase()).join(", ")}.
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RealRolesPage({ workspaceId }: { workspaceId: string }) {
  const { isNarrow, isMedium } = useViewport();
  const roster = useRoster(workspaceId);
  return (
    <ManagePage crumbs={[{ label: "Manage", to: "/app/workspace" }, { label: "Who can do what" }]} title="Who can do what" maxWidth={1060}>
      <p data-testid="roles-read-only" style={{ ...GF, fontSize: 13, color: SLATE, margin: "0 0 18px", lineHeight: 1.6, maxWidth: 720 }}>
        Every workspace has the same seven roles. They cannot be created or changed. An owner or administrator
        gives each person a role from the Members page, and can add either of two privileges.
      </p>
      {!(isNarrow || isMedium) && <MatrixTable />}
      <h2 style={{ ...sectionHeadingStyle, margin: isNarrow || isMedium ? "0 0 12px" : "28px 0 12px" }}>The roles</h2>
      <ul style={{ margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
        {ROLE_ORDER.map(r => <RoleCard key={r} role={r} count={countFor(roster, r)} />)}
      </ul>
      <PrivilegesSection />
    </ManagePage>
  );
}

export function RealRoleDetailPage({ workspaceId, roleId }: { workspaceId: string; roleId: string }) {
  const { isNarrow } = useViewport();
  const roster = useRoster(workspaceId);
  const crumbsBase = [{ label: "Manage", to: "/app/workspace" }, { label: "Who can do what", to: "/app/workspace/roles" }];

  if (!isBackendWorkspaceRole(roleId)) {
    return (
      <ManagePage crumbs={[...crumbsBase, { label: "Role" }]} title="Role not found">
        <div style={{ ...cardStyle, padding: 28, textAlign: "center" }}>
          <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 10px" }}>There is no such role in this workspace.</p>
          <Link to="/app/workspace/roles" style={{ ...GF, fontSize: 13, fontWeight: 600, color: AZURE, textDecoration: "none" }}>See all roles</Link>
        </div>
      </ManagePage>
    );
  }

  const role = roleId;
  const holders = Array.isArray(roster) ? roster.filter(m => m.roleId === role).sort((a, b) => a.displayName.localeCompare(b.displayName)) : null;
  const inherent = role === "owner" || role === "administrator";

  return (
    <ManagePage crumbs={[...crumbsBase, { label: REAL_ROLE_LABELS[role] }]} title={REAL_ROLE_LABELS[role]} maxWidth={860}
      badge={<span style={{ ...GM, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#EBF4FC", color: AZURE }}>Fixed role</span>}>
      <p style={{ ...GF, fontSize: 14, color: SLATE, margin: "0 0 18px", lineHeight: 1.6 }}>{ROLE_SUMMARIES[role]}</p>
      <div style={{ display: "flex", gap: 20, flexDirection: isNarrow ? "column" : "row", alignItems: "flex-start" }}>
        <section data-testid="role-abilities" aria-labelledby="role-abilities-heading" style={{ ...cardStyle, padding: "16px 20px", flex: "1 1 0", width: isNarrow ? "100%" : undefined }}>
          <h2 id="role-abilities-heading" style={sectionHeadingStyle}>What this role can do</h2>
          {ABILITY_GROUPS.map(g => (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ ...GM, fontSize: 10, color: SILVER, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #F0F2F5" }}>{g.label}</div>
              {g.abilities.map(a => {
                const has = roleHoldsAbility(role, a);
                return (
                  <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 5, opacity: has ? 1 : 0.55 }}>
                    {has ? <Yes /> : <No />}
                    <span style={{ ...GF, fontSize: 13, color: NAVY, fontWeight: has ? 600 : 400 }}>{a.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
          <p style={{ ...GF, fontSize: 12, color: SLATE, margin: "6px 0 0", lineHeight: 1.5 }}>
            {inherent
              ? "Both privileges come with this role."
              : "An owner or administrator can add the privileges “Request documents from others” and “Assign someone for document signing” to anyone with this role."}
          </p>
        </section>

        <aside style={{ ...cardStyle, padding: "16px 20px", flex: isNarrow ? "1 1 auto" : "0 0 280px", width: isNarrow ? "100%" : 280 }}>
          <h2 style={sectionHeadingStyle}>Who has this role</h2>
          {roster === null ? (
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>Only owners and administrators can see the member list.</p>
          ) : roster === "loading" ? (
            <LoadingBlock label="Loading members…" />
          ) : holders && holders.length === 0 ? (
            <p style={{ ...GF, fontSize: 13, color: SLATE, margin: 0 }}>No one has this role.</p>
          ) : (
            <ul data-testid="role-holders" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {(holders ?? []).map(m => (
                <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", ...GM, fontSize: 10, fontWeight: 700, color: AZURE, flexShrink: 0 }}>{m.avatarInitials}</div>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/app/workspace/members/${encodeURIComponent(m.id)}`} style={{ ...GF, fontSize: 13, fontWeight: 600, color: NAVY, textDecoration: "none", overflowWrap: "anywhere" }}>{m.displayName}</Link>
                    {m.roleTitle && <div style={{ ...GF, fontSize: 11, color: SLATE }}>{memberRoleLabel(m)}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </ManagePage>
  );
}
