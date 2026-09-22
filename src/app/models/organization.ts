// Organization units — the routing/reporting layer between a workspace and
// its people (Lagda-Backend migration 039, titles added in 061).
//
// A unit is a container, never a permission. Belonging to one grants
// nothing on its own — the backend's own module header states this, and the
// frontend inherits the same rule: nothing here should read as "this
// person can act because they're in this department."
//
// Real-backend only. There is no fixture catalogue for an org chart the way
// templates or documents have one — see services/real/organization.service.ts.

export type OrganizationUnitId = string;

/** Mirrors the backend's closed vocabulary exactly (ORGANIZATION_UNIT_KINDS). */
export const ORGANIZATION_UNIT_KINDS = [
  "department", "office", "division", "branch", "team", "committee", "project_group",
] as const;
export type OrganizationUnitKind = (typeof ORGANIZATION_UNIT_KINDS)[number];

export const ORGANIZATION_UNIT_KIND_LABELS: Record<OrganizationUnitKind, string> = {
  department: "Department",
  office: "Office",
  division: "Division",
  branch: "Branch",
  team: "Team",
  committee: "Committee",
  project_group: "Project Group",
};

export interface OrganizationUnit {
  unitId: OrganizationUnitId;
  parentUnitId: OrganizationUnitId | null;
  kind: OrganizationUnitKind;
  name: string;
  createdAt: number;
  /** `null` means live. Archived units are shown, not hidden — 039's own
   *  reasoning: "this department was dissolved" is information, and hiding
   *  the row would let a placement look valid against a tree that no
   *  longer exists. */
  archivedAt: number | null;
}

/**
 * One person's place in a unit, joined to their workspace directory entry.
 *
 * `title: null` is the ordinary case — most members hold no distinguished
 * role. A title (061) names something like "Department Head": who
 * currently occupies that position, never an authorization grant.
 */
export interface OrganizationUnitMember {
  userId: string;
  title: string | null;
  displayName: string;
  email: string;
}

/** A workspace member, for the "add to unit" picker — not everyone in the
 *  workspace directory is necessarily IN a given unit yet. */
export interface WorkspaceMemberOption {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}
