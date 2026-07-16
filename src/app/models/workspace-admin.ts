// Typed models for Workspace Administration (Command 23).
// Covers workspaces, members, teams, roles, permissions, invitations, and activity.
// Frontend-only demonstration. No backend. No Notary roles. No Burgundy.

// ── Branded IDs ───────────────────────────────────────────────────────────────

export type WorkspaceId           = string & { readonly __brand: "WorkspaceId" };
export type WorkspaceMemberId     = string & { readonly __brand: "WorkspaceMemberId" };
export type WorkspaceInvitationId = string & { readonly __brand: "WorkspaceInvitationId" };
export type WorkspaceTeamId       = string & { readonly __brand: "WorkspaceTeamId" };
export type WorkspaceRoleId       = string & { readonly __brand: "WorkspaceRoleId" };

// ── Status types ──────────────────────────────────────────────────────────────

export type WorkspaceStatus =
  | "active"
  | "suspended"
  | "archived"
  | "pending-verification";

export type WorkspaceMemberStatus =
  | "active"
  | "suspended"
  | "deactivated"
  | "pending-invitation";

export type WorkspaceInvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked"
  | "bounced";

export type WorkspaceTeamStatus  = "active" | "archived";
export type WorkspaceRoleStatus  = "active" | "archived";
export type WorkspaceRoleType    = "system" | "custom";

// ── Permissions ───────────────────────────────────────────────────────────────

export type WorkspacePermissionCategory =
  | "workspace"
  | "members"
  | "teams"
  | "roles"
  | "documents"
  | "templates"
  | "contacts"
  | "settings";

export type WorkspacePermission =
  | "workspace:view"        | "workspace:manage"
  | "members:view"          | "members:invite"    | "members:suspend"
  | "members:deactivate"    | "members:remove"    | "members:transfer-ownership"
  | "teams:view"            | "teams:create"      | "teams:manage"     | "teams:archive"
  | "roles:view"            | "roles:create"      | "roles:manage"     | "roles:archive"
  | "documents:view"        | "documents:prepare" | "documents:send"
  | "templates:view"        | "templates:create"  | "templates:manage" | "templates:delete"
  | "contacts:view"         | "contacts:create"   | "contacts:manage"  | "contacts:delete"
  | "settings:view"         | "settings:manage"   | "settings:billing" | "settings:security";

export interface PermissionDefinition {
  permission:  WorkspacePermission;
  category:    WorkspacePermissionCategory;
  label:       string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { permission: "workspace:view",             category: "workspace", label: "View Workspace",          description: "View workspace overview and basic information" },
  { permission: "workspace:manage",           category: "workspace", label: "Manage Workspace",        description: "Edit workspace name, branding, and configuration" },
  { permission: "members:view",               category: "members",   label: "View Members",            description: "See the member directory and member profiles" },
  { permission: "members:invite",             category: "members",   label: "Invite Members",          description: "Send invitations to join the workspace" },
  { permission: "members:suspend",            category: "members",   label: "Suspend Members",         description: "Temporarily suspend a member's access" },
  { permission: "members:deactivate",         category: "members",   label: "Deactivate Members",      description: "Permanently deactivate a member account" },
  { permission: "members:remove",             category: "members",   label: "Remove Members",          description: "Remove a member from the workspace" },
  { permission: "members:transfer-ownership", category: "members",   label: "Transfer Ownership",      description: "Transfer workspace ownership to another member" },
  { permission: "teams:view",                 category: "teams",     label: "View Teams",              description: "See the teams directory and team details" },
  { permission: "teams:create",               category: "teams",     label: "Create Teams",            description: "Create new workspace teams" },
  { permission: "teams:manage",               category: "teams",     label: "Manage Teams",            description: "Edit team names, descriptions, and membership" },
  { permission: "teams:archive",              category: "teams",     label: "Archive Teams",           description: "Archive and restore teams" },
  { permission: "roles:view",                 category: "roles",     label: "View Roles",              description: "See the roles directory and permission sets" },
  { permission: "roles:create",               category: "roles",     label: "Create Roles",            description: "Create new custom roles with selected permissions" },
  { permission: "roles:manage",               category: "roles",     label: "Manage Roles",            description: "Edit custom role names and permission sets" },
  { permission: "roles:archive",              category: "roles",     label: "Archive Roles",           description: "Archive and restore custom roles" },
  { permission: "documents:view",             category: "documents", label: "View Documents",          description: "View document transactions in the workspace" },
  { permission: "documents:prepare",          category: "documents", label: "Prepare Documents",       description: "Create and configure document signing requests" },
  { permission: "documents:send",             category: "documents", label: "Send Documents",          description: "Send signing requests to recipients" },
  { permission: "templates:view",             category: "templates", label: "View Templates",          description: "Browse and preview workspace templates" },
  { permission: "templates:create",           category: "templates", label: "Create Templates",        description: "Create new signing templates" },
  { permission: "templates:manage",           category: "templates", label: "Manage Templates",        description: "Edit and configure existing templates" },
  { permission: "templates:delete",           category: "templates", label: "Delete Templates",        description: "Delete or archive templates" },
  { permission: "contacts:view",              category: "contacts",  label: "View Contacts",           description: "Browse the workspace contact directory" },
  { permission: "contacts:create",            category: "contacts",  label: "Create Contacts",         description: "Add new contacts to the workspace" },
  { permission: "contacts:manage",            category: "contacts",  label: "Manage Contacts",         description: "Edit and organize contacts and groups" },
  { permission: "contacts:delete",            category: "contacts",  label: "Delete Contacts",         description: "Delete or archive contacts" },
  { permission: "settings:view",              category: "settings",  label: "View Settings",           description: "View workspace settings and configuration" },
  { permission: "settings:manage",            category: "settings",  label: "Manage Settings",         description: "Update workspace settings and preferences" },
  { permission: "settings:billing",           category: "settings",  label: "Manage Billing",          description: "Manage subscription, payments, and billing details" },
  { permission: "settings:security",          category: "settings",  label: "Manage Security",         description: "Configure MFA policies and security settings" },
];

// System role permission sets
export const SYSTEM_ROLE_PERMISSIONS: Record<string, WorkspacePermission[]> = {
  role_owner: [
    "workspace:view","workspace:manage",
    "members:view","members:invite","members:suspend","members:deactivate","members:remove","members:transfer-ownership",
    "teams:view","teams:create","teams:manage","teams:archive",
    "roles:view","roles:create","roles:manage","roles:archive",
    "documents:view","documents:prepare","documents:send",
    "templates:view","templates:create","templates:manage","templates:delete",
    "contacts:view","contacts:create","contacts:manage","contacts:delete",
    "settings:view","settings:manage","settings:billing","settings:security",
  ],
  role_administrator: [
    "workspace:view","workspace:manage",
    "members:view","members:invite","members:suspend","members:deactivate","members:remove",
    "teams:view","teams:create","teams:manage","teams:archive",
    "roles:view","roles:create","roles:manage","roles:archive",
    "documents:view","documents:prepare","documents:send",
    "templates:view","templates:create","templates:manage","templates:delete",
    "contacts:view","contacts:create","contacts:manage","contacts:delete",
    "settings:view","settings:manage","settings:security",
  ],
  role_sender: [
    "workspace:view",
    "members:view",
    "teams:view",
    "documents:view","documents:prepare","documents:send",
    "templates:view",
    "contacts:view","contacts:create","contacts:manage",
    "settings:view",
  ],
  role_reviewer_auditor: [
    "workspace:view",
    "members:view",
    "documents:view",
    "templates:view",
    "settings:view","settings:security",
  ],
  role_member: [
    "workspace:view",
    "members:view",
    "teams:view",
    "documents:view",
    "templates:view",
    "contacts:view",
    "settings:view",
  ],
  role_billing_admin: [
    "workspace:view",
    "documents:view",
    "settings:view","settings:billing",
  ],
  role_security_admin: [
    "workspace:view",
    "members:view","members:suspend",
    "settings:view","settings:manage","settings:security",
  ],
  role_template_manager: [
    "workspace:view",
    "members:view",
    "documents:view","documents:prepare",
    "templates:view","templates:create","templates:manage","templates:delete",
    "contacts:view","contacts:create","contacts:manage","contacts:delete",
    "settings:view",
  ],
  role_contact_manager: [
    "workspace:view",
    "documents:view",
    "contacts:view","contacts:create","contacts:manage","contacts:delete",
    "settings:view",
  ],
};

// ── Core interfaces ───────────────────────────────────────────────────────────

export interface WorkspaceAdminDetail {
  id:                 WorkspaceId;
  name:               string;
  slug:               string;
  status:             WorkspaceStatus;
  plan:               string;
  type:               "personal" | "team" | "enterprise";
  memberCount:        number;
  activeMembers:      number;
  suspendedMembers:   number;
  pendingInvitations: number;
  teamCount:          number;
  customRoleCount:    number;
  createdAt:          string;
  billingEmail?:      string;
  initials:           string;
  accentColor:        string;
  demonstrationOnly:  true;
}

export interface WorkspaceMember {
  id:               WorkspaceMemberId;
  workspaceId:      WorkspaceId;
  userId:           string;
  displayName:      string;
  email:            string;
  avatarInitials:   string;
  status:           WorkspaceMemberStatus;
  roleId:           WorkspaceRoleId;
  roleName:         string;
  teamIds:          WorkspaceTeamId[];
  joinedAt:         string;
  lastActiveAt?:    string;
  invitedByName?:   string;
  suspendedAt?:     string;
  suspendedReason?: string;
  deactivatedAt?:   string;
  isOwner:          boolean;
  demonstrationOnly: true;
}

export interface WorkspaceMemberSummary {
  id:             WorkspaceMemberId;
  displayName:    string;
  email:          string;
  avatarInitials: string;
  status:         WorkspaceMemberStatus;
  roleId:         WorkspaceRoleId;
  roleName:       string;
  isOwner:        boolean;
  joinedAt:       string;
  lastActiveAt?:  string;
  demonstrationOnly: true;
}

export interface WorkspaceInvitation {
  id:              WorkspaceInvitationId;
  workspaceId:     WorkspaceId;
  email:           string;
  roleId:          WorkspaceRoleId;
  roleName:        string;
  status:          WorkspaceInvitationStatus;
  sentAt:          string;
  expiresAt:       string;
  invitedByName:   string;
  acceptedAt?:     string;
  revokedAt?:      string;
  demonstrationOnly: true;
}

export interface WorkspaceTeam {
  id:             WorkspaceTeamId;
  workspaceId:    WorkspaceId;
  name:           string;
  description?:   string;
  status:         WorkspaceTeamStatus;
  memberIds:      WorkspaceMemberId[];
  memberCount:    number;
  createdAt:      string;
  createdByName:  string;
  archivedAt?:    string;
  demonstrationOnly: true;
}

export interface WorkspaceTeamSummary {
  id:           WorkspaceTeamId;
  name:         string;
  description?: string;
  status:       WorkspaceTeamStatus;
  memberCount:  number;
  demonstrationOnly: true;
}

export interface WorkspaceRole {
  id:           WorkspaceRoleId;
  workspaceId:  WorkspaceId;
  name:         string;
  description:  string;
  type:         WorkspaceRoleType;
  status:       WorkspaceRoleStatus;
  permissions:  WorkspacePermission[];
  memberCount:  number;
  isOwnerRole:  boolean;
  isEditable:   boolean;
  createdAt?:   string;
  archivedAt?:  string;
  demonstrationOnly: true;
}

export interface WorkspaceRoleSummary {
  id:          WorkspaceRoleId;
  name:        string;
  type:        WorkspaceRoleType;
  status:      WorkspaceRoleStatus;
  memberCount: number;
  isOwnerRole: boolean;
  demonstrationOnly: true;
}

export interface EffectivePermissionSet {
  memberId:    WorkspaceMemberId;
  roleId:      WorkspaceRoleId;
  roleName:    string;
  permissions: WorkspacePermission[];
  resolvedAt:  string;
}

// ── Activity log ──────────────────────────────────────────────────────────────

export type WorkspaceActivityEventType =
  | "member-invited"       | "member-joined"         | "member-role-changed"
  | "member-suspended"     | "member-reactivated"    | "member-deactivated"     | "member-removed"
  | "team-created"         | "team-updated"          | "team-archived"          | "team-restored"
  | "team-member-added"    | "team-member-removed"
  | "role-created"         | "role-updated"          | "role-archived"          | "role-restored"
  | "invitation-sent"      | "invitation-resent"     | "invitation-revoked"     | "invitation-accepted" | "invitation-expired"
  | "workspace-settings-updated"                     | "ownership-transferred";

export interface WorkspaceActivityEvent {
  id:            string;
  workspaceId:   WorkspaceId;
  eventType:     WorkspaceActivityEventType;
  actorId:       string;
  actorName:     string;
  targetId?:     string;
  targetName?:   string;
  metadata?:     Record<string, string>;
  occurredAt:    string;
  demonstrationOnly: true;
}

// ── Attention items ───────────────────────────────────────────────────────────

export interface WorkspaceAttentionItem {
  id:           string;
  type:         "invitation-expiring" | "member-suspended" | "pending-review" | "security-alert";
  severity:     "info" | "warning" | "critical";
  title:        string;
  description:  string;
  actionLabel?: string;
  actionPath?:  string;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface WorkspaceSettings {
  workspaceId:             WorkspaceId;
  name:                    string;
  slug:                    string;
  billingEmail:            string;
  defaultMemberRoleId:     WorkspaceRoleId;
  defaultMemberRoleName:   string;
  requireMfaForAdmins:     boolean;
  allowMemberInvites:      boolean;
  sessionTimeoutMinutes:   number;
  demonstrationOnly:       true;
}

// ── Query types ───────────────────────────────────────────────────────────────

export interface WorkspaceMemberQuery {
  search?:  string;
  status?:  WorkspaceMemberStatus | "all";
  roleId?:  string;
  teamId?:  string;
  sort?:    "name" | "email" | "joinedAt" | "lastActive" | "role" | "status";
  dir?:     "asc" | "desc";
}

export interface WorkspaceActivityQuery {
  search?:    string;
  eventType?: WorkspaceActivityEventType | "all";
  actorId?:   string;
  dateFrom?:  string;
  dateTo?:    string;
}

// ── Display labels ────────────────────────────────────────────────────────────

export const WORKSPACE_STATUS_LABELS: Record<WorkspaceStatus, string> = {
  "active":               "Active",
  "suspended":            "Suspended",
  "archived":             "Archived",
  "pending-verification": "Pending Verification",
};

export const WORKSPACE_MEMBER_STATUS_LABELS: Record<WorkspaceMemberStatus, string> = {
  "active":             "Active",
  "suspended":          "Suspended",
  "deactivated":        "Deactivated",
  "pending-invitation": "Invitation Pending",
};

export const WORKSPACE_INVITATION_STATUS_LABELS: Record<WorkspaceInvitationStatus, string> = {
  "pending":  "Pending",
  "accepted": "Accepted",
  "expired":  "Expired",
  "revoked":  "Revoked",
  "bounced":  "Bounced",
};

export const WORKSPACE_ROLE_TYPE_LABELS: Record<WorkspaceRoleType, string> = {
  "system": "System Role",
  "custom": "Custom Role",
};

export const WORKSPACE_ACTIVITY_EVENT_LABELS: Record<WorkspaceActivityEventType, string> = {
  "member-invited":             "Member Invited",
  "member-joined":              "Member Joined",
  "member-role-changed":        "Role Changed",
  "member-suspended":           "Member Suspended",
  "member-reactivated":         "Member Reactivated",
  "member-deactivated":         "Member Deactivated",
  "member-removed":             "Member Removed",
  "team-created":               "Team Created",
  "team-updated":               "Team Updated",
  "team-archived":              "Team Archived",
  "team-restored":              "Team Restored",
  "team-member-added":          "Member Added to Team",
  "team-member-removed":        "Member Removed from Team",
  "role-created":               "Role Created",
  "role-updated":               "Role Updated",
  "role-archived":              "Role Archived",
  "role-restored":              "Role Restored",
  "invitation-sent":            "Invitation Sent",
  "invitation-resent":          "Invitation Resent",
  "invitation-revoked":         "Invitation Revoked",
  "invitation-accepted":        "Invitation Accepted",
  "invitation-expired":         "Invitation Expired",
  "workspace-settings-updated": "Settings Updated",
  "ownership-transferred":      "Ownership Transferred",
};

// ── Create/update inputs ──────────────────────────────────────────────────────

export interface WorkspaceInviteInput {
  email:   string;
  roleId:  WorkspaceRoleId;
  message?: string;
}

export interface WorkspaceTeamCreateInput {
  name:         string;
  description?: string;
}

export interface WorkspaceRoleCreateInput {
  name:        string;
  description: string;
  permissions: WorkspacePermission[];
}
