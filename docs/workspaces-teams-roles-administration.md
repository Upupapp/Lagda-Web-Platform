# Workspaces, Teams, Roles, Permissions, and Administration

Command 23 — Frontend-only demonstration module.

## Routes

| Path | Page | Status |
|------|------|--------|
| `/app/workspace` | WorkspaceOverviewPage | Implemented |
| `/app/workspace/members` | MembersPage | Implemented |
| `/app/workspace/members/:memberId` | MemberDetailPage | Implemented |
| `/app/workspace/invitations` | InvitationsPage | Implemented |
| `/app/workspace/teams` | TeamsPage | Implemented |
| `/app/workspace/teams/:teamId` | TeamDetailPage | Implemented |
| `/app/workspace/roles` | RolesPage | Implemented |
| `/app/workspace/roles/:roleId` | RoleDetailPage | Implemented |
| `/app/workspace/activity` | ActivityPage | Implemented |
| `/app/workspace/settings` | WorkspaceSettingsPage | Implemented |

## Files

| File | Purpose |
|------|---------|
| `src/app/models/workspace-admin.ts` | All branded ID types, interfaces, permission definitions, labels |
| `src/app/data/mock/workspace-admin.ts` | Fixture workspaces, members, invitations, teams, roles, activity |
| `src/app/services/mock/workspace-admin.service.ts` | Session-local mock service with all CRUD operations |
| `src/app/context/WorkspaceAdminContext.tsx` | useReducer context wiring all 10 pages |
| `src/app/pages/platform/workspace/*.tsx` | 10 administration pages |

## System roles

| Role | Description |
|------|-------------|
| Owner | Full workspace control, billing, ownership transfer |
| Administrator | Workspace management, members, teams, templates |
| Sender | Creates and sends document signing requests |
| Reviewer / Auditor | Views documents and audit logs |
| Member | Standard read access to workspace resources |
| Billing Administrator | Billing and subscription management only |
| Security Administrator | Security policy and MFA enforcement |
| Template Manager | Full template and contact management |
| Contact Manager | Contact-only management, no documents |

## Fixture data (Mabini Legal Solutions — ws_mls_001)

- **8 members**: Ana Reyes (owner), Daniel Lim (admin), Sofia Navarro (sender), Marco Santos (reviewer), Lea Cruz (template manager), Ramon Villanueva (billing admin), Jerome Aquino (suspended), Carla Mendoza (deactivated)
- **4 invitations**: 3 pending, 1 expired
- **5 teams**: Legal Operations, Compliance Review, HR & People, Vendor Operations, Special Projects (archived)
- **9 system roles** + **5 custom roles** (4 active, 1 archived)
- **12 activity events**

## Key design decisions

- **No Burgundy** — eSignature only; Burgundy is reserved for eNotary which is not in scope
- **No Notary roles** — workspace administration does not include any eNotary role types
- **Branded IDs** — WorkspaceId, WorkspaceMemberId, WorkspaceInvitationId, WorkspaceTeamId, WorkspaceRoleId
- **SESSION_MUTATIONS pattern** — all mutations are session-local (Maps reset on reload), matching ContactContext pattern
- **demonstrationOnly: true** — all fixture and session records carry this flag
- **Effective permission resolution** — centralized in `mockWorkspaceAdminService.resolveEffectivePermissions(member)`
- **Ownership safeguard** — Owner role has `isOwnerRole: true`; owner member has `isOwner: true`; lifecycle actions are hidden for owner on MemberDetailPage
- **Static routes before parametric** — `/workspace/members`, `/workspace/invitations`, `/workspace/teams`, `/workspace/roles`, `/workspace/activity`, `/workspace/settings` all precede `/workspace/members/:memberId` etc.
