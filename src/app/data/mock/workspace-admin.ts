// Fictional workspace administration fixture data for LAGDA frontend demos.
// All names, organizations, and emails are invented. Not based on real entities.
// All records are marked demonstrationOnly: true.

import type {
  WorkspaceId,
  WorkspaceMemberId,
  WorkspaceInvitationId,
  WorkspaceTeamId,
  WorkspaceRoleId,
  WorkspaceAdminDetail,
  WorkspaceMember,
  WorkspaceInvitation,
  WorkspaceTeam,
  WorkspaceRole,
  WorkspaceActivityEvent,
  WorkspaceAttentionItem,
  WorkspaceSettings,
} from "../../models/workspace-admin";
import { SYSTEM_ROLE_PERMISSIONS } from "../../models/workspace-admin";

// ── ID constants ──────────────────────────────────────────────────────────────

export const WS_MLS  = "ws_mls_001"  as WorkspaceId;
export const WS_UUT  = "ws_uut_001"  as WorkspaceId;
export const WS_NAV  = "ws_nav_001"  as WorkspaceId;
export const WS_DEMO = "ws_demo_001" as WorkspaceId;

// Role IDs
export const ROLE_OWNER           = "role_owner"           as WorkspaceRoleId;
export const ROLE_ADMIN           = "role_administrator"   as WorkspaceRoleId;
export const ROLE_SENDER          = "role_sender"          as WorkspaceRoleId;
export const ROLE_REVIEWER        = "role_reviewer_auditor"as WorkspaceRoleId;
export const ROLE_MEMBER          = "role_member"          as WorkspaceRoleId;
export const ROLE_BILLING         = "role_billing_admin"   as WorkspaceRoleId;
export const ROLE_SECURITY        = "role_security_admin"  as WorkspaceRoleId;
export const ROLE_TEMPLATE_MGR    = "role_template_manager"as WorkspaceRoleId;
export const ROLE_CONTACT_MGR     = "role_contact_manager" as WorkspaceRoleId;

// Custom role IDs
export const ROLE_DOC_PREPARER    = "role_c_doc_preparer"        as WorkspaceRoleId;
export const ROLE_COMPLIANCE_AUD  = "role_c_compliance_auditor"  as WorkspaceRoleId;
export const ROLE_TMPL_CONTACT    = "role_c_tmpl_contact_mgr"    as WorkspaceRoleId;
export const ROLE_LIMITED_APPROVAL= "role_c_limited_approval_ops"as WorkspaceRoleId;
export const ROLE_INVALID_CUSTOM  = "role_c_invalid_archived"    as WorkspaceRoleId;

// Member IDs
export const MBR_ANA     = "mbr_mls_001" as WorkspaceMemberId;
export const MBR_DANIEL  = "mbr_mls_002" as WorkspaceMemberId;
export const MBR_SOFIA   = "mbr_mls_003" as WorkspaceMemberId;
export const MBR_MARCO   = "mbr_mls_004" as WorkspaceMemberId;
export const MBR_LEA     = "mbr_mls_005" as WorkspaceMemberId;
export const MBR_BILLING = "mbr_mls_006" as WorkspaceMemberId;
export const MBR_SUSPENDED= "mbr_mls_007"as WorkspaceMemberId;
export const MBR_DEACT   = "mbr_mls_008" as WorkspaceMemberId;

// Team IDs
export const TEAM_LEGAL   = "team_mls_001" as WorkspaceTeamId;
export const TEAM_COMPLY  = "team_mls_002" as WorkspaceTeamId;
export const TEAM_HR      = "team_mls_003" as WorkspaceTeamId;
export const TEAM_VENDOR  = "team_mls_004" as WorkspaceTeamId;
export const TEAM_ARCHIVE = "team_mls_005" as WorkspaceTeamId;

// Invitation IDs
export const INV_001 = "inv_mls_001" as WorkspaceInvitationId;
export const INV_002 = "inv_mls_002" as WorkspaceInvitationId;
export const INV_003 = "inv_mls_003" as WorkspaceInvitationId;
export const INV_004 = "inv_mls_004" as WorkspaceInvitationId;

// ── Workspaces ────────────────────────────────────────────────────────────────

export const MOCK_WORKSPACE_ADMIN: WorkspaceAdminDetail = {
  id:                 WS_MLS,
  name:               "Mabini Legal Solutions",
  slug:               "mabini-legal-solutions",
  status:             "active",
  plan:               "Professional",
  type:               "team",
  memberCount:        8,
  activeMembers:      6,
  suspendedMembers:   1,
  pendingInvitations: 3,
  teamCount:          4,
  customRoleCount:    4,
  createdAt:          "2024-03-01T08:00:00Z",
  billingEmail:       "billing@mabinilegal.example.com",
  initials:           "ML",
  accentColor:        "#0078D4",
  demonstrationOnly:  true,
};

export const OTHER_WORKSPACES: WorkspaceAdminDetail[] = [
  {
    id: WS_UUT, name: "UpUp Technologies", slug: "upup-technologies",
    status: "active", plan: "Business", type: "team",
    memberCount: 14, activeMembers: 14, suspendedMembers: 0, pendingInvitations: 2,
    teamCount: 3, customRoleCount: 2, createdAt: "2024-01-15T08:00:00Z",
    initials: "UT", accentColor: "#0891B2", demonstrationOnly: true,
  },
  {
    id: WS_NAV, name: "Navarro Holdings", slug: "navarro-holdings",
    status: "active", plan: "Business Plus", type: "enterprise",
    memberCount: 32, activeMembers: 30, suspendedMembers: 1, pendingInvitations: 1,
    teamCount: 8, customRoleCount: 6, createdAt: "2023-09-10T08:00:00Z",
    initials: "NH", accentColor: "#7C3AED", demonstrationOnly: true,
  },
  {
    id: WS_DEMO, name: "New Demo Workspace", slug: "new-demo",
    status: "pending-verification", plan: "Personal", type: "personal",
    memberCount: 1, activeMembers: 1, suspendedMembers: 0, pendingInvitations: 0,
    teamCount: 0, customRoleCount: 0, createdAt: "2026-07-01T08:00:00Z",
    initials: "ND", accentColor: "#475569", demonstrationOnly: true,
  },
];

// ── Members ───────────────────────────────────────────────────────────────────

export const FIXTURE_MEMBERS: WorkspaceMember[] = [
  {
    id: MBR_ANA, workspaceId: WS_MLS, userId: "usr_mls_001",
    displayName: "Ana Reyes", email: "ana.reyes@example.com", avatarInitials: "AR",
    status: "active", roleId: ROLE_OWNER, roleName: "Owner",
    teamIds: [TEAM_LEGAL, TEAM_COMPLY],
    joinedAt: "2024-03-01T08:00:00Z", lastActiveAt: "2026-07-15T14:30:00Z",
    isOwner: true, demonstrationOnly: true,
  },
  {
    id: MBR_DANIEL, workspaceId: WS_MLS, userId: "usr_mls_002",
    displayName: "Daniel Lim", email: "daniel.lim@example.com", avatarInitials: "DL",
    status: "active", roleId: ROLE_ADMIN, roleName: "Administrator",
    teamIds: [TEAM_LEGAL],
    joinedAt: "2024-03-05T10:00:00Z", lastActiveAt: "2026-07-14T09:15:00Z",
    invitedByName: "Ana Reyes",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_SOFIA, workspaceId: WS_MLS, userId: "usr_mls_003",
    displayName: "Sofia Navarro", email: "sofia.navarro@example.com", avatarInitials: "SN",
    status: "active", roleId: ROLE_SENDER, roleName: "Sender",
    teamIds: [TEAM_LEGAL, TEAM_HR],
    joinedAt: "2024-04-10T09:00:00Z", lastActiveAt: "2026-07-13T16:45:00Z",
    invitedByName: "Daniel Lim",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_MARCO, workspaceId: WS_MLS, userId: "usr_mls_004",
    displayName: "Marco Santos", email: "marco.santos@example.com", avatarInitials: "MS",
    status: "active", roleId: ROLE_REVIEWER, roleName: "Reviewer / Auditor",
    teamIds: [TEAM_COMPLY],
    joinedAt: "2024-05-20T11:00:00Z", lastActiveAt: "2026-07-12T08:00:00Z",
    invitedByName: "Ana Reyes",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_LEA, workspaceId: WS_MLS, userId: "usr_mls_005",
    displayName: "Lea Cruz", email: "lea.cruz@example.com", avatarInitials: "LC",
    status: "active", roleId: ROLE_TEMPLATE_MGR, roleName: "Template Manager",
    teamIds: [TEAM_HR, TEAM_VENDOR],
    joinedAt: "2024-06-01T08:00:00Z", lastActiveAt: "2026-07-10T13:20:00Z",
    invitedByName: "Daniel Lim",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_BILLING, workspaceId: WS_MLS, userId: "usr_mls_006",
    displayName: "Ramon Villanueva", email: "r.villanueva@example.com", avatarInitials: "RV",
    status: "active", roleId: ROLE_BILLING, roleName: "Billing Administrator",
    teamIds: [],
    joinedAt: "2024-06-15T08:00:00Z", lastActiveAt: "2026-06-30T10:00:00Z",
    invitedByName: "Ana Reyes",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_SUSPENDED, workspaceId: WS_MLS, userId: "usr_mls_007",
    displayName: "Jerome Aquino", email: "j.aquino@example.com", avatarInitials: "JA",
    status: "suspended", roleId: ROLE_MEMBER, roleName: "Member",
    teamIds: [TEAM_VENDOR],
    joinedAt: "2024-08-01T08:00:00Z",
    invitedByName: "Daniel Lim",
    suspendedAt: "2026-06-01T10:00:00Z",
    suspendedReason: "Under security review pending IT audit completion.",
    isOwner: false, demonstrationOnly: true,
  },
  {
    id: MBR_DEACT, workspaceId: WS_MLS, userId: "usr_mls_008",
    displayName: "Carla Mendoza", email: "c.mendoza@example.com", avatarInitials: "CM",
    status: "deactivated", roleId: ROLE_SENDER, roleName: "Sender",
    teamIds: [],
    joinedAt: "2024-02-01T08:00:00Z",
    invitedByName: "Ana Reyes",
    deactivatedAt: "2025-12-15T08:00:00Z",
    isOwner: false, demonstrationOnly: true,
  },
];

// ── Invitations ───────────────────────────────────────────────────────────────

export const FIXTURE_INVITATIONS: WorkspaceInvitation[] = [
  {
    id: INV_001, workspaceId: WS_MLS,
    email: "b.ramos@example.com", roleId: ROLE_SENDER, roleName: "Sender",
    status: "pending",
    sentAt: "2026-07-10T09:00:00Z", expiresAt: "2026-07-17T09:00:00Z",
    invitedByName: "Daniel Lim",
    demonstrationOnly: true,
  },
  {
    id: INV_002, workspaceId: WS_MLS,
    email: "e.soriano@example.com", roleId: ROLE_MEMBER, roleName: "Member",
    status: "pending",
    sentAt: "2026-07-08T14:00:00Z", expiresAt: "2026-07-15T14:00:00Z",
    invitedByName: "Ana Reyes",
    demonstrationOnly: true,
  },
  {
    id: INV_003, workspaceId: WS_MLS,
    email: "k.tan@example.com", roleId: ROLE_REVIEWER, roleName: "Reviewer / Auditor",
    status: "pending",
    sentAt: "2026-07-05T10:00:00Z", expiresAt: "2026-07-12T10:00:00Z",
    invitedByName: "Ana Reyes",
    demonstrationOnly: true,
  },
  {
    id: INV_004, workspaceId: WS_MLS,
    email: "m.garcia@example.com", roleId: ROLE_SENDER, roleName: "Sender",
    status: "expired",
    sentAt: "2026-06-20T08:00:00Z", expiresAt: "2026-06-27T08:00:00Z",
    invitedByName: "Daniel Lim",
    demonstrationOnly: true,
  },
];

// ── Teams ─────────────────────────────────────────────────────────────────────

export const FIXTURE_TEAMS: WorkspaceTeam[] = [
  {
    id: TEAM_LEGAL, workspaceId: WS_MLS,
    name: "Legal Operations", description: "Core legal document preparation and client signing workflows.",
    status: "active",
    memberIds: [MBR_ANA, MBR_DANIEL, MBR_SOFIA],
    memberCount: 3,
    createdAt: "2024-03-05T09:00:00Z", createdByName: "Ana Reyes",
    demonstrationOnly: true,
  },
  {
    id: TEAM_COMPLY, workspaceId: WS_MLS,
    name: "Compliance Review", description: "Internal compliance review and document audit functions.",
    status: "active",
    memberIds: [MBR_ANA, MBR_MARCO],
    memberCount: 2,
    createdAt: "2024-04-01T09:00:00Z", createdByName: "Ana Reyes",
    demonstrationOnly: true,
  },
  {
    id: TEAM_HR, workspaceId: WS_MLS,
    name: "HR & People", description: "Employment contracts, onboarding documents, and HR signing workflows.",
    status: "active",
    memberIds: [MBR_SOFIA, MBR_LEA],
    memberCount: 2,
    createdAt: "2024-05-01T09:00:00Z", createdByName: "Daniel Lim",
    demonstrationOnly: true,
  },
  {
    id: TEAM_VENDOR, workspaceId: WS_MLS,
    name: "Vendor Operations", description: "Supplier contracts and procurement document workflows.",
    status: "active",
    memberIds: [MBR_LEA, MBR_SUSPENDED],
    memberCount: 2,
    createdAt: "2024-07-15T09:00:00Z", createdByName: "Daniel Lim",
    demonstrationOnly: true,
  },
  {
    id: TEAM_ARCHIVE, workspaceId: WS_MLS,
    name: "Special Projects (Archived)", description: "Archived team from a completed project engagement.",
    status: "archived",
    memberIds: [],
    memberCount: 0,
    createdAt: "2024-09-01T09:00:00Z", createdByName: "Ana Reyes",
    archivedAt: "2025-02-28T12:00:00Z",
    demonstrationOnly: true,
  },
];

// ── Roles ─────────────────────────────────────────────────────────────────────

export const FIXTURE_ROLES: WorkspaceRole[] = [
  // System roles
  {
    id: ROLE_OWNER, workspaceId: WS_MLS, name: "Owner", type: "system", status: "active",
    description: "Full control of the workspace. Can transfer ownership, manage billing, and access all features.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_owner,
    memberCount: 1, isOwnerRole: true, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_ADMIN, workspaceId: WS_MLS, name: "Administrator", type: "system", status: "active",
    description: "Manages workspace settings, members, teams, templates, and contacts. No billing access.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_administrator,
    memberCount: 1, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_SENDER, workspaceId: WS_MLS, name: "Sender", type: "system", status: "active",
    description: "Creates and sends document signing requests. Manages own contacts.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_sender,
    memberCount: 2, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_REVIEWER, workspaceId: WS_MLS, name: "Reviewer / Auditor", type: "system", status: "active",
    description: "Reviews documents, views audit logs, and performs document verification.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_reviewer_auditor,
    memberCount: 1, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_MEMBER, workspaceId: WS_MLS, name: "Member", type: "system", status: "active",
    description: "Standard access to workspace resources. Can view documents, templates, and contacts.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_member,
    memberCount: 1, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_BILLING, workspaceId: WS_MLS, name: "Billing Administrator", type: "system", status: "active",
    description: "Manages subscription, payments, and billing details. Limited document access.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_billing_admin,
    memberCount: 1, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_SECURITY, workspaceId: WS_MLS, name: "Security Administrator", type: "system", status: "active",
    description: "Manages MFA policies, security settings, and audit logs.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_security_admin,
    memberCount: 0, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_TEMPLATE_MGR, workspaceId: WS_MLS, name: "Template Manager", type: "system", status: "active",
    description: "Creates, edits, and manages document templates. Can manage contacts.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_template_manager,
    memberCount: 1, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  {
    id: ROLE_CONTACT_MGR, workspaceId: WS_MLS, name: "Contact Manager", type: "system", status: "active",
    description: "Manages workspace contacts and groups. Cannot prepare or send documents.",
    permissions: SYSTEM_ROLE_PERMISSIONS.role_contact_manager,
    memberCount: 0, isOwnerRole: false, isEditable: false,
    demonstrationOnly: true,
  },
  // Custom roles
  {
    id: ROLE_DOC_PREPARER, workspaceId: WS_MLS, name: "Document Preparer", type: "custom", status: "active",
    description: "Prepares documents for review but cannot send them independently.",
    permissions: ["workspace:view","members:view","documents:view","documents:prepare","templates:view","contacts:view","contacts:create","settings:view"],
    memberCount: 0, isOwnerRole: false, isEditable: true,
    createdAt: "2024-08-01T10:00:00Z",
    demonstrationOnly: true,
  },
  {
    id: ROLE_COMPLIANCE_AUD, workspaceId: WS_MLS, name: "Compliance Auditor", type: "custom", status: "active",
    description: "Enhanced audit access for external compliance review. Read-only on all resources.",
    permissions: ["workspace:view","members:view","teams:view","roles:view","documents:view","templates:view","contacts:view","settings:view","settings:security"],
    memberCount: 0, isOwnerRole: false, isEditable: true,
    createdAt: "2024-09-15T10:00:00Z",
    demonstrationOnly: true,
  },
  {
    id: ROLE_TMPL_CONTACT, workspaceId: WS_MLS, name: "Template & Contact Manager", type: "custom", status: "active",
    description: "Combined template and contact management without document sending.",
    permissions: ["workspace:view","members:view","documents:view","templates:view","templates:create","templates:manage","contacts:view","contacts:create","contacts:manage","contacts:delete","settings:view"],
    memberCount: 0, isOwnerRole: false, isEditable: true,
    createdAt: "2025-01-10T10:00:00Z",
    demonstrationOnly: true,
  },
  {
    id: ROLE_LIMITED_APPROVAL, workspaceId: WS_MLS, name: "Limited Approval Ops", type: "custom", status: "active",
    description: "Can send documents for approval workflows but cannot prepare or create templates.",
    permissions: ["workspace:view","members:view","documents:view","documents:send","templates:view","contacts:view","settings:view"],
    memberCount: 0, isOwnerRole: false, isEditable: true,
    createdAt: "2025-03-20T10:00:00Z",
    demonstrationOnly: true,
  },
  {
    id: ROLE_INVALID_CUSTOM, workspaceId: WS_MLS, name: "Archived Pilot Role", type: "custom", status: "archived",
    description: "Pilot role from a past engagement. Archived after project completion.",
    permissions: ["workspace:view","documents:view"],
    memberCount: 0, isOwnerRole: false, isEditable: true,
    createdAt: "2024-06-01T10:00:00Z",
    archivedAt: "2025-01-01T10:00:00Z",
    demonstrationOnly: true,
  },
];

// ── Activity log ──────────────────────────────────────────────────────────────

export const FIXTURE_ACTIVITY: WorkspaceActivityEvent[] = [
  {
    id: "act_001", workspaceId: WS_MLS, eventType: "member-invited",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "inv_mls_001", targetName: "b.ramos@example.com",
    metadata: { role: "Sender" },
    occurredAt: "2026-07-10T09:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_002", workspaceId: WS_MLS, eventType: "member-role-changed",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "mbr_mls_005", targetName: "Lea Cruz",
    metadata: { from: "Sender", to: "Template Manager" },
    occurredAt: "2026-07-08T10:30:00Z", demonstrationOnly: true,
  },
  {
    id: "act_003", workspaceId: WS_MLS, eventType: "team-created",
    actorId: "usr_mls_002", actorName: "Daniel Lim",
    targetId: "team_mls_004", targetName: "Vendor Operations",
    occurredAt: "2026-07-07T14:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_004", workspaceId: WS_MLS, eventType: "member-suspended",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "mbr_mls_007", targetName: "Jerome Aquino",
    metadata: { reason: "Under security review pending IT audit completion." },
    occurredAt: "2026-06-01T10:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_005", workspaceId: WS_MLS, eventType: "role-created",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "role_c_limited_approval_ops", targetName: "Limited Approval Ops",
    occurredAt: "2025-03-20T10:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_006", workspaceId: WS_MLS, eventType: "invitation-sent",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "inv_mls_002", targetName: "e.soriano@example.com",
    metadata: { role: "Member" },
    occurredAt: "2026-07-08T14:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_007", workspaceId: WS_MLS, eventType: "team-member-added",
    actorId: "usr_mls_002", actorName: "Daniel Lim",
    targetId: "team_mls_003", targetName: "HR & People",
    metadata: { member: "Lea Cruz" },
    occurredAt: "2026-06-28T09:15:00Z", demonstrationOnly: true,
  },
  {
    id: "act_008", workspaceId: WS_MLS, eventType: "workspace-settings-updated",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    metadata: { changed: "requireMfaForAdmins" },
    occurredAt: "2026-06-15T11:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_009", workspaceId: WS_MLS, eventType: "member-joined",
    actorId: "usr_mls_005", actorName: "Lea Cruz",
    occurredAt: "2024-06-01T08:05:00Z", demonstrationOnly: true,
  },
  {
    id: "act_010", workspaceId: WS_MLS, eventType: "invitation-expired",
    actorId: "system", actorName: "System",
    targetId: "inv_mls_004", targetName: "m.garcia@example.com",
    occurredAt: "2026-06-27T08:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_011", workspaceId: WS_MLS, eventType: "role-archived",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "role_c_invalid_archived", targetName: "Archived Pilot Role",
    occurredAt: "2025-01-01T10:00:00Z", demonstrationOnly: true,
  },
  {
    id: "act_012", workspaceId: WS_MLS, eventType: "team-archived",
    actorId: "usr_mls_001", actorName: "Ana Reyes",
    targetId: "team_mls_005", targetName: "Special Projects (Archived)",
    occurredAt: "2025-02-28T12:00:00Z", demonstrationOnly: true,
  },
];

// ── Attention items ───────────────────────────────────────────────────────────

export const FIXTURE_ATTENTION_ITEMS: WorkspaceAttentionItem[] = [
  {
    id: "attn_001",
    type: "invitation-expiring",
    severity: "warning",
    title: "3 pending invitations",
    description: "2 invitations expire within 48 hours. Resend to ensure they are accepted.",
    actionLabel: "Manage invitations",
    actionPath: "/app/workspace/invitations",
  },
  {
    id: "attn_002",
    type: "member-suspended",
    severity: "warning",
    title: "1 member suspended",
    description: "Jerome Aquino has been suspended since June 1, 2026. Review and reactivate if cleared.",
    actionLabel: "View member",
    actionPath: "/app/workspace/members/mbr_mls_007",
  },
];

// ── Workspace settings ────────────────────────────────────────────────────────

export const FIXTURE_WORKSPACE_SETTINGS: WorkspaceSettings = {
  workspaceId:           WS_MLS,
  name:                  "Mabini Legal Solutions",
  slug:                  "mabini-legal-solutions",
  billingEmail:          "billing@mabinilegal.example.com",
  defaultMemberRoleId:   ROLE_MEMBER,
  defaultMemberRoleName: "Member",
  requireMfaForAdmins:   true,
  allowMemberInvites:    false,
  sessionTimeoutMinutes: 480,
  demonstrationOnly:     true,
};
