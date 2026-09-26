// What each of the backend's seven fixed workspace roles may do, in plain
// language — the read-only "Who can do what" page when a real backend is
// connected.
//
// ── Source ─────────────────────────────────────────────────────────────────
//
// ROLE_CAPABILITIES and PRIVILEGE_CAPABILITIES below are COPIED from
// Lagda-Backend `packages/core/src/authorization/index.ts` (the backend's
// only role → capability policy). The backend re-checks every action on its
// own; this copy only EXPLAINS the policy to people, it never grants
// anything. If the backend's matrix changes, change this copy to match.
//
// `workspace.ownership.transfer` is left out on purpose: the backend has no
// operation behind it yet, and the page shows only what can actually be done.

import type { BackendWorkspaceRole } from "../services/real/workspace-admin.service";

export type WorkspaceCapabilityId =
  | "workspace.view" | "workspace.update"
  | "membership.view" | "membership.role.change" | "membership.remove"
  | "invitation.view" | "invitation.create" | "invitation.resend" | "invitation.revoke"
  | "activity.view"
  | "contact.view" | "contact.create" | "contact.update" | "contact.archive"
  | "document.view" | "document.create" | "document.update" | "document.prepare"
  | "upload-request.create"
  | "signing-request.create" | "signing-request.view" | "signing-request.send" | "signing-request.cancel"
  | "unit.view" | "unit.create" | "unit.update" | "unit.archive" | "unit.member.manage"
  | "template.view" | "template.create" | "template.update" | "template.delete";

const DOCUMENT_WORK: readonly WorkspaceCapabilityId[] = [
  "document.view", "document.create", "document.update", "document.prepare",
  "upload-request.create",
  "signing-request.create", "signing-request.view", "signing-request.send", "signing-request.cancel",
];
const CONTACTS: readonly WorkspaceCapabilityId[] = [
  "contact.view", "contact.create", "contact.update", "contact.archive",
];
const TEMPLATES: readonly WorkspaceCapabilityId[] = [
  "template.view", "template.create", "template.update", "template.delete",
];
const UNITS: readonly WorkspaceCapabilityId[] = [
  "unit.view", "unit.create", "unit.update", "unit.archive", "unit.member.manage",
];
const ADMINISTRATION: readonly WorkspaceCapabilityId[] = [
  "workspace.view", "workspace.update",
  "membership.view", "membership.role.change", "membership.remove",
  "invitation.view", "invitation.create", "invitation.resend", "invitation.revoke",
  "activity.view",
];

/** Copy of the backend's ROLE_CAPABILITIES (see the header). */
export const ROLE_CAPABILITIES: Readonly<Record<BackendWorkspaceRole, readonly WorkspaceCapabilityId[]>> = {
  owner: [...ADMINISTRATION, ...CONTACTS, ...DOCUMENT_WORK, ...UNITS, ...TEMPLATES],
  administrator: [...ADMINISTRATION, ...CONTACTS, ...DOCUMENT_WORK, ...UNITS, ...TEMPLATES],
  member: ["workspace.view", "unit.view"],
  template_administrator: [...TEMPLATES, "workspace.view", ...CONTACTS, ...DOCUMENT_WORK],
  sender: ["template.view", "workspace.view", ...CONTACTS, ...DOCUMENT_WORK],
  reviewer: ["workspace.view", "document.view", "signing-request.view"],
  auditor: ["workspace.view", "document.view", "signing-request.view", "activity.view"],
};

export type WorkspacePrivilegeKey = "requestDocuments" | "assignSigners";

/** Copy of the backend's PRIVILEGE_CAPABILITIES (see the header). */
export const PRIVILEGE_CAPABILITIES: Readonly<Record<WorkspacePrivilegeKey, readonly WorkspaceCapabilityId[]>> = {
  requestDocuments: ["workspace.view", "document.view", "contact.view", "upload-request.create"],
  assignSigners: [
    "workspace.view", "template.view", "contact.view",
    "document.view", "document.create", "document.update", "document.prepare",
    "signing-request.create", "signing-request.view", "signing-request.send", "signing-request.cancel",
  ],
};

export const PRIVILEGE_LABELS: Record<WorkspacePrivilegeKey, string> = {
  requestDocuments: "Request documents from others",
  assignSigners: "Assign someone for document signing",
};

// ── Plain-language abilities ────────────────────────────────────────────────

export interface WorkspaceAbility {
  id: string;
  label: string;
  /** Held only when EVERY one of these capabilities is held. */
  requires: readonly WorkspaceCapabilityId[];
}

export interface WorkspaceAbilityGroup {
  id: string;
  label: string;
  abilities: WorkspaceAbility[];
}

export const ABILITY_GROUPS: WorkspaceAbilityGroup[] = [
  {
    id: "documents", label: "Documents",
    abilities: [
      { id: "view-documents", label: "View documents", requires: ["document.view", "signing-request.view"] },
      { id: "send-documents", label: "Prepare and send documents for signing", requires: ["document.prepare", "signing-request.send"] },
      { id: "request-documents", label: "Request documents from others", requires: ["upload-request.create"] },
    ],
  },
  {
    id: "contacts-templates", label: "Contacts and templates",
    abilities: [
      { id: "view-contacts", label: "Look up contacts", requires: ["contact.view"] },
      { id: "edit-contacts", label: "Add and edit contacts", requires: ["contact.create", "contact.update", "contact.archive"] },
      { id: "use-templates", label: "Use templates", requires: ["template.view"] },
      { id: "manage-templates", label: "Create and edit templates", requires: ["template.create", "template.update", "template.delete"] },
    ],
  },
  {
    id: "people", label: "People and teams",
    abilities: [
      { id: "view-teams", label: "See teams", requires: ["unit.view"] },
      { id: "manage-teams", label: "Create and manage teams", requires: ["unit.create", "unit.update", "unit.archive", "unit.member.manage"] },
      { id: "view-members", label: "See the member list", requires: ["membership.view"] },
      { id: "invite", label: "Invite people and send join links", requires: ["invitation.view", "invitation.create"] },
      { id: "manage-members", label: "Approve join requests, change roles and remove members", requires: ["membership.role.change", "membership.remove"] },
    ],
  },
  {
    id: "workspace", label: "Workspace",
    abilities: [
      { id: "rename-workspace", label: "Rename the workspace", requires: ["workspace.update"] },
      { id: "view-activity", label: "Read the activity log", requires: ["activity.view"] },
    ],
  },
];

export const ALL_ABILITIES: WorkspaceAbility[] = ABILITY_GROUPS.flatMap(g => g.abilities);

export function holdsAbility(capabilities: readonly string[], ability: WorkspaceAbility): boolean {
  return ability.requires.every(c => capabilities.includes(c));
}

export function roleHoldsAbility(role: BackendWorkspaceRole, ability: WorkspaceAbility): boolean {
  return holdsAbility(ROLE_CAPABILITIES[role], ability);
}

/** Abilities a privilege adds for someone whose role does not already have them. */
export function abilitiesAddedByPrivilege(role: BackendWorkspaceRole, privilege: WorkspacePrivilegeKey): WorkspaceAbility[] {
  const combined = [...ROLE_CAPABILITIES[role], ...PRIVILEGE_CAPABILITIES[privilege]];
  return ALL_ABILITIES.filter(a => !roleHoldsAbility(role, a) && holdsAbility(combined, a));
}

/** One sentence per role, for the role cards and the role page. */
export const ROLE_SUMMARIES: Record<BackendWorkspaceRole, string> = {
  owner: "Runs the workspace. Can do everything, including managing administrators. There is exactly one owner.",
  administrator: "Runs the workspace day to day: people, teams, templates, documents and settings.",
  template_administrator: "Maintains templates and the address book, and prepares and sends documents.",
  sender: "Prepares and sends documents for signing, and uses the address book and templates.",
  reviewer: "Reads documents and their signing progress. Changes nothing.",
  auditor: "Reads documents and the activity log, to review what happened. Changes nothing.",
  member: "Newly approved people. Can see the workspace and its teams until given a title, privileges or another role.",
};

/** The seven roles in reading order, most authority first. */
export const ROLE_ORDER: readonly BackendWorkspaceRole[] = [
  "owner", "administrator", "template_administrator", "sender", "reviewer", "auditor", "member",
];

export function isBackendWorkspaceRole(value: string | undefined): value is BackendWorkspaceRole {
  return value !== undefined && (ROLE_ORDER as readonly string[]).includes(value);
}
