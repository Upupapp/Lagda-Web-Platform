// Turning a team's people into the levels of its hierarchy diagram.
//
// Levels follow WORKSPACE role, highest first:
//   owner → administrator → template administrator → sender → reviewer →
//   auditor → member ("New Comer").
// The demo build's role ids (role_owner, role_billing_admin, …) map onto the
// same ladder, so both builds draw the same shape.
//
// When the caller cannot read the workspace's roles (only owners and
// administrators can list members with roles), everyone sits on one
// "Members" level and the diagram shows unit titles only — never a guessed
// role.

import { REAL_ROLE_LABELS, type BackendWorkspaceRole } from "../../../../services/real/workspace-admin.service";

export const ROLE_LADDER: readonly BackendWorkspaceRole[] = [
  "owner", "administrator", "template_administrator", "sender", "reviewer", "auditor", "member",
];

const LEVEL_TITLES: Record<BackendWorkspaceRole, { one: string; many: string }> = {
  owner: { one: "Owner", many: "Owners" },
  administrator: { one: "Administrator", many: "Administrators" },
  template_administrator: { one: "Template Administrator", many: "Template Administrators" },
  sender: { one: "Sender", many: "Senders" },
  reviewer: { one: "Reviewer", many: "Reviewers" },
  auditor: { one: "Auditor", many: "Auditors" },
  member: { one: "New Comer", many: "New Comers" },
};

/** A real role, or a demo role id, placed on the ladder. Unknown → member. */
export function ladderRole(roleId: string | null | undefined): BackendWorkspaceRole {
  if (roleId === null || roleId === undefined) return "member";
  const id = roleId.replace(/^role_(c_)?/, "");
  if ((ROLE_LADDER as readonly string[]).includes(id)) return id as BackendWorkspaceRole;
  if (id === "billing_admin" || id === "security_admin" || id === "admin") return "administrator";
  if (id === "template_manager") return "template_administrator";
  if (id === "doc_preparer" || id === "contact_manager") return "sender";
  if (id === "reviewer_auditor") return "reviewer";
  if (id === "compliance_auditor") return "auditor";
  return "member";
}

export interface HierarchyPerson {
  id: string;
  name: string;
  /** Workspace role, or null when the caller cannot see roles. */
  role: BackendWorkspaceRole | null;
  /** The role as the directory names it ("Billing Admin" in the demo). */
  roleName?: string | null;
  /** A typed role title (078), e.g. "Paralegal". */
  roleTitle?: string | null;
  /** The title held in THIS team (061), e.g. "Department Head". */
  unitTitle?: string | null;
  href?: string | null;
}

export interface HierarchySubTeam {
  id: string;
  name: string;
  kindLabel: string;
  memberCount: number | null;
  href: string;
  archived: boolean;
  children: HierarchySubTeam[];
}

export interface HierarchyLevel {
  key: string;
  title: string;
  people: HierarchyPerson[];
}

/** The line under a person's name: their role, or their typed title. */
export function personRoleLine(p: HierarchyPerson): string | null {
  if (p.role === null) return p.roleTitle ?? null;
  // A New Comer with a typed title is shown by that title (078's own rule).
  if (p.role === "member") return p.roleTitle ?? REAL_ROLE_LABELS.member;
  const label = p.roleName ?? REAL_ROLE_LABELS[p.role];
  return p.roleTitle ? `${label} · ${p.roleTitle}` : label;
}

export function buildLevels(people: HierarchyPerson[]): HierarchyLevel[] {
  const byName = (a: HierarchyPerson, b: HierarchyPerson) =>
    // Someone holding a title in this team leads their level.
    Number(!a.unitTitle) - Number(!b.unitTitle) || a.name.localeCompare(b.name);
  if (people.every(p => p.role === null)) {
    return people.length === 0 ? [] : [{ key: "members", title: "Members", people: [...people].sort(byName) }];
  }
  const levels: HierarchyLevel[] = [];
  for (const role of ROLE_LADDER) {
    const onLevel = people.filter(p => (p.role ?? "member") === role).sort(byName);
    if (onLevel.length === 0) continue;
    levels.push({ key: role, title: onLevel.length === 1 ? LEVEL_TITLES[role].one : LEVEL_TITLES[role].many, people: onLevel });
  }
  return levels;
}

export function initialsOfName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

/** Units whose parent is `parentId`, recursively, archived last. */
export function subTeamTree<T extends { unitId: string; parentUnitId: string | null; name: string; archivedAt: number | null }>(
  units: readonly T[], parentId: string, toNode: (unit: T, children: HierarchySubTeam[]) => HierarchySubTeam, seen = new Set<string>(),
): HierarchySubTeam[] {
  seen.add(parentId);
  return units
    .filter(u => u.parentUnitId === parentId && !seen.has(u.unitId))
    .sort((a, b) => Number(a.archivedAt !== null) - Number(b.archivedAt !== null) || a.name.localeCompare(b.name))
    .map(u => toNode(u, subTeamTree(units, u.unitId, toNode, seen)));
}
